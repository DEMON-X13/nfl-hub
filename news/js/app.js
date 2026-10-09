/* The page shows one week at a time: the last entry in WEEKS (data/weeks.js). */

/* ============================ helpers ============================ */
const T = {}; TEAMS.forEach(t => T[t.ab] = t);
const esc  = s => String(s).replace(/<[^>]+>/g,"").replace(/"/g,"");
const li   = a => a.map(x=>`<li>${x}</li>`).join("");
const txt  = c => { const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16); return (r*299+g*587+b*114)/1000 > 140 ? "#332E29" : "#fff"; };
const ORD  = n => { const s=["th","st","nd","rd"], v=n%100; return n + "<sup>" + (s[(v-20)%10]||s[v]||s[0]) + "</sup>"; };
function kickOf(g){
  const done = g.awayScore != null && g.homeScore != null;
  if (done) return { day: g.day, time: "Final" };
  if (!g.kick) return { day: g.day, time: g.time };
  const dt = new Date(g.kick);
  if (isNaN(dt.getTime())) return { day: g.day, time: g.time };
  try {
    return {
      day: new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric"}).format(dt),
      time: new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(dt)
    };
  } catch(e){ return { day: g.day, time: g.time }; }
}

/* ============================ positions ============================ */
/* "(QB)" after a player's name, from data/players2026.js. A name one roster holds, or several
   rosters at the same position, is tagged wherever it appears. A name two rosters hold at different
   positions takes the position of the team the words just before it name ("the Rams' Byron Young",
   "Philadelphia's Byron Young"); with no team named, the position he has on whichever of the game's
   two teams has him; otherwise none. (Until 2026-10-09 the game's teams won even over a named team,
   which wrote "the Rams' Byron Young (DT)" in Philadelphia's game, the Eagles' Byron Young being the
   tackle.) A name already followed by "(" is left alone, and a possessive keeps its 's: "Josh Allen's (QB)". */
let POS_SCOPE;
const TEAM_REF = (() => {
  /* each team's nickname, abbreviation, and city where no other team shares it */
  const refs = {}, city = {};
  TEAMS.forEach(t => { const nick = t.name.split(" ").pop(), c = t.name.slice(0, -nick.length - 1); (city[c] ??= []).push(t.ab); refs[nick] = t.ab; refs[t.ab] = t.ab; });
  Object.entries(city).forEach(([c, abs]) => { if (abs.length === 1 && c) refs[c] = abs[0]; });
  const alt = Object.keys(refs).sort((a, b) => b.length - a.length).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return { refs, rx: new RegExp("(?:^|[^\\w])(" + alt + ")(?:['’]s?)?\\s+(?:[a-z][\\w-]*\\s+){0,3}$") };
})();
function posScope(){
  if (POS_SCOPE !== undefined) return POS_SCOPE;
  if (typeof PLAYERS26 === "undefined") return (POS_SCOPE = null);
  const byName = {};
  Object.keys(PLAYERS26).forEach(t => Object.entries(PLAYERS26[t] || {}).forEach(([n, p]) => { (byName[n] ??= {})[t] = p; }));
  const one = {}, clash = {};
  Object.entries(byName).forEach(([n, at]) => { const ps = new Set(Object.values(at)); if (ps.size === 1) one[n] = [...ps][0]; else clash[n] = at; });
  const names = Object.keys(byName).sort((a, b) => b.length - a.length);
  if (!names.length) return (POS_SCOPE = null);
  const alt = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const rx = new RegExp("(?<![\\w'.\\-])(" + alt + ")(?![\\w\\-])(?!(?:</strong>)?(?:['’]s)?\\s*\\()((?:</strong>)?)((?:['’]s(?!\\w))?)", "g");
  return (POS_SCOPE = { rx, one, clash });
}
function posFor(s, name, before, teams){
  if (s.one[name]) return s.one[name];
  const at = s.clash[name]; if (!at) return null;
  const m = before.replace(/<[^>]+>/g, "").slice(-60).match(TEAM_REF.rx);
  const t = m && TEAM_REF.refs[m[1]];
  if (t) return at[t] || null;
  const mine = (teams || []).filter(x => at[x]);
  return mine.length === 1 ? at[mine[0]] : null;
}
function withPos(html, teams){
  const s = posScope(); if (!s || !html) return html;
  return String(html).replace(s.rx, (m, name, close, poss, at, str) => {
    const p = posFor(s, name, str.slice(0, at), teams);
    return p ? `${name}${close}${poss} (${p})` : m;
  });
}

/* ============================ rank chip ============================ */
/* The team's place on X NFL Bets' Team Rankings tab, the team Elo of this season's results
   (data/ranks2026.js, read from elo/data/model.json), falling back to teams.js. Until 2026-10-09 it
   was the Alpha Model's own Elo, called "power rank", which no page shows as a ranking. */
const shortDay = d => { try { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z")); } catch (e) { return d; } };
function powerRank(ab){
  const r = (typeof RANKS26 !== "undefined" && RANKS26[ab]) ? RANKS26[ab] : null;
  const asof = typeof RANKS26_ASOF !== "undefined" && RANKS26_ASOF ? `, games through ${shortDay(RANKS26_ASOF)}` : "";
  if (r && typeof RANKS26_SRC === "undefined") return { rank: r.rank, title: `Alpha Model team Elo (${r.elo})${asof}`, label: "Elo rank" };
  return r ? { rank: r.rank, title: `Rank on X NFL Bets' Team Rankings, by team Elo (${r.elo})${asof}`, label: "Elo rank" }
           : { rank: T[ab].rank, title: "Preseason rank", label: "rank" };
}

/* ============================ deep dive ============================ */
/* Six units from data/units2026.js. Each faces the opposing unit it plays against, rated on the
   same numbers from both sides (tools/context.js), each rating in league standard deviations.
   The tag is the edge: this unit's rating minus the one it faces. 1.5 or more is Easy, 0.5 or more
   Favorable, within 0.5 Even, and the same the other way. (Until 2026-10-08 it was the gap between
   two ranks of different stats, which put the receivers against the coverage on unlike numbers.) */
function difficulty(edge){
  if (edge == null || !isFinite(edge)) return ["even", "Even"];
  if (edge >= 1.5)  return ["easy", "Easy"];
  if (edge >= 0.5)  return ["fav", "Favorable"];
  if (edge > -0.5)  return ["even", "Even"];
  if (edge > -1.5)  return ["tough", "Tough"];
  return ["vtough", "Very tough"];
}
function deepDive(ab, opp, row){
  if (typeof UNITS26 === "undefined" || !UNITS26[ab] || !UNITS26[opp]) return `<div class="tbsec empty ${row}"></div>`;
  const U = UNITS26[ab], O = UNITS26[opp];
  const names = list => (list || []).map(p => `${p.n} (${p.pos}${p.q ? ", " + p.q : ""})`).join(", ");
  /* who is not playing: the quarterback row says who starts instead, the others list them */
  const missing = (u, isQB) => {
    const out = u.out || [];
    if (!out.length) return "";
    if (isQB && u.who && u.who[0]) return `<div class="ddout">${u.who[0].n} starts; ${out.map(p => `${p.n} is ${p.why}`).join(", ")}.</div>`;
    return `<div class="ddout">Not playing: ${out.map(p => `${p.n} (${p.pos}), ${p.why}`).join("; ")}.</div>`;
  };
  /* a quarterback in doubt: who is next on the chart */
  const nextQB = u => u.next && u.who && u.who[0] ? `<div class="ddout">${u.who[0].n} may not start (${u.who[0].q || "in doubt"}); next on the chart: ${u.next.n}.</div>` : "";
  const nums = st => (st || []).map(([label, v, r, unit]) => v == null ? "" : `${v}${unit || ""} ${label} (${ORD(r)})`).filter(Boolean).join(" &middot; ");
  const units = [
    ["Quarterback", "Passing offense", U.qb, `${opp} pass defense`, O.vs.passD, true],
    ["Offensive line", "Pass protection", U.ol, `${opp} pass rush`, O.front],
    ["Running backs", "Run game", U.rb, `${opp} run defense`, O.vs.runD],
    ["Receivers", "Receivers", U.rec, `${opp} coverage`, O.db],
    ["Pass rush", "Pass rush", U.front, `${opp} pass protection`, O.ol],
    ["Defensive backs", "Coverage", U.db, `${opp} receivers`, O.rec],
  ];
  const sd = v => (v >= 0 ? "+" : "\u2212") + Math.abs(v).toFixed(1);
  const rows = units.map(([label, mine, u, vs, v, isQB]) => {
    const edge = u.z != null && v.z != null ? u.z - v.z : null;
    const [cls, tag] = difficulty(edge);
    return `<div class="ddrow">
      <div class="ddtop"><span class="ddunit">${label}</span><span class="dtag ${cls}"${edge == null ? "" : ` title="Edge ${sd(edge)}: this unit's rating minus the one it faces, in league standard deviations"`}>${tag}</span></div>
      <div class="ddvs">${mine} <b>${ORD(u.rank)}</b> vs ${vs} <b>${ORD(v.rank)}</b>${edge == null ? "" : `<span class="ddedge">edge ${sd(edge)}</span>`}</div>
      ${u.who && u.who.length ? `<div class="ddwho">${names(u.who)}</div>` : ""}
      ${missing(u, isQB)}${isQB ? nextQB(u) : ""}
      <div class="ddnum">${nums(u.stats)}</div>
      ${u.note ? `<div class="ddnote">${u.note}</div>` : ""}
    </div>`;
  }).join("");
  /* the sample is this team's own: a team that has played the week's Thursday game has one more */
  const g26 = n => `${n} game${n === 1 ? "" : "s"}`;
  const basis = (typeof UNITS26_BASIS !== "undefined" ? UNITS26_BASIS : "") + (U.g26 != null ? `, plus ${ab}'s ${g26(U.g26)} of 2026${O.g26 != null && O.g26 !== U.g26 ? ` (${opp}'s ${g26(O.g26)})` : ""}` : "");
  const lineups = typeof UNITS26_LINEUPS !== "undefined" ? ` ${UNITS26_LINEUPS}.` : "";
  return `<details class="tbsec dd ${row}"><summary><span class="ddlbl">Deep Dive</span><span class="ddhint">6 matchups</span></summary>
    <p class="ddbasis">League ranks from team stats, ${basis}. Each row rates a unit and the unit it faces on the same numbers. The tag is this unit's edge, its rating minus the other's in league standard deviations: Easy is 1.5 or more, Favorable 0.5 or more, Even within 0.5, Tough and Very tough the same the other way.${lineups}</p>
    ${rows}</details>`;
}

/* 2026 record from every played game in WEEKS. 0-0 until a team has a result. */
function record(ab){
  let w = 0, l = 0, t = 0;
  WEEKS.forEach(wk => (wk.games||[]).forEach(g => {
    if (g.awayScore == null || g.homeScore == null) return;
    if (g.away !== ab && g.home !== ab) return;
    const home = g.home === ab, mine = home ? g.homeScore : g.awayScore, theirs = home ? g.awayScore : g.homeScore;
    if (mine > theirs) w++; else if (mine < theirs) l++; else t++;
  }));
  return w + "-" + l + (t ? "-" + t : "");
}

/* Final scores from data/results.js flow into the week files at load, so records and Final labels
   stay current without editing a week. Keys are "wk<n>:AWAY-HOME". */
function applyResultsAgain(){ applyResults(); }
function applyResults(){
  if (typeof RESULTS === "undefined") return;
  WEEKS.forEach(wk => (wk.games||[]).forEach(g => {
    const r = RESULTS[wk.id + ":" + g.away + "-" + g.home];
    if (r && g.awayScore == null && g.homeScore == null) { g.awayScore = r[0]; g.homeScore = r[1]; }
  }));
}
applyResults();

/* ============================ state ============================ */
let ACTIVE = WEEKS[WEEKS.length-1].id;
function currentWeek(){ return WEEKS.find(x=>x.id===ACTIVE) || WEEKS[WEEKS.length-1]; }
function show(id){ ACTIVE = id; render(); }
function render(){
  const w = currentWeek();
  const bw = document.getElementById("barweek");
  if (bw) bw.innerHTML = `<b>${w.label}</b><span>${w.dates}</span>`;
  document.getElementById("view").innerHTML = renderWeek(w);
}

/* ============================ the page: one week, the slate ============================ */
function renderWeek(w){
  /* the page is the slate: the week's label and dates are in the app bar, and the headline
     and intro a week file carries are kept in the file but not shown */
  return `
  ${w.status==="sample" ? `<section class="pagehead"><p class="sampleflag"><strong>Sample data.</strong> Nothing on this tab is real. It exists to show what a played week looks like before one has been played.</p></section>` : ""}

  <section class="sec">
    <div class="slate">
      ${w.games.map(g=>{
        const a=T[g.away], h=T[g.home], k=kickOf(g);
        const done = g.awayScore!=null && g.homeScore!=null;
        const sc = done ? `<span class="score">${g.awayScore}<em>-</em>${g.homeScore}</span>` : "";
        return `<button class="slot" type="button" data-game="${g.away}-${g.home}" aria-label="Open ${a.name} at ${h.name}">
          <div class="when">${k.day} &middot; ${k.time}</div>
          <div class="vs"><i style="background:${a.color}"></i>${a.ab}<em>at</em><i style="background:${h.color}"></i>${h.ab}${sc}</div>
          <div class="note">${g.tv} &middot; ${g.venue}</div>
          ${g.note ? `<div class="hook">${withPos(g.note, [g.away, g.home])}</div>` : ""}
          <div class="more">Full breakdown<span aria-hidden="true">&rsaquo;</span></div>
        </button>`;
      }).join("")}
    </div>
  </section>

  ${FOOTER()}`;
}

/* ============================ the line ============================ */
/* The overlay's line is the schedule's (data/results.js LINES, from nflverse), with its date; once a
   game is played it is the closing line. Where it has moved from the line the week was written
   against (the week file's), that one is shown too, so the narrative's numbers can be read against it.
   Without LINES, the week file's line, said so. (Until 2026-10-09 the header showed the draft-day
   line bare, up to 2 points off by kickoff.) */
function lineOf(w, g, done){
  const L = typeof LINES !== "undefined" ? LINES[w.id + ":" + g.away + "-" + g.home] : null;
  const posted = g.line ? `${g.line} when the week was posted` : "";
  if (L) return `${L} (${done ? "closing line" : "line " + (typeof LINES_ASOF !== "undefined" && LINES_ASOF ? shortDay(LINES_ASOF) : "now")}${posted && g.line !== L ? "; " + posted : ""})`;
  return posted ? `${g.line} (line when the week was posted${w.updated ? ", " + w.updated : ""})` : "";
}

/* ============================ game overlay ============================ */
/* Everything about one matchup: both teams in full with keys to victory, then the stat breakdown.
   The two team blocks share one grid so matching sections sit on the same row and have equal height. */
function openGame(key){
  const w = currentWeek(); if(!w) return;
  const g = (w.games||[]).find(x=>x.away+"-"+x.home===key); if(!g) return;
  const a = T[g.away], hm = T[g.home], k = kickOf(g);
  const done = g.awayScore!=null && g.homeScore!=null;
  const meta = [done ? `Final ${g.awayScore}-${g.homeScore}` : "", k.day, done ? "" : k.time, g.tv, g.venue, lineOf(w, g, done)].filter(Boolean).join(" &middot; ");

  const teamBlock = (ab, col) => {
    const t = T[ab], e = (w.teams||{})[ab] || {};
    const home = g.home===ab;
    const headline = e.headline || (home ? "Home" : "Away");
    const block = (row, label, tone, items) => (!items || !items.length)
      ? `<div class="tbsec empty ${row}"></div>`
      : `<div class="tbsec ${tone} ${row}"><h5>${label}</h5><ul>${li(items.map(x => withPos(x, [g.away, g.home])))}</ul></div>`;
    const nothing = !(e.matchup||[]).length && !(e.strengths||[]).length && !(e.weaknesses||[]).length;
    return `<div class="tb ${col}" style="--tc:${t.color}">
      <div class="tbhd r1">
        <div class="badge" style="background:${t.color};color:${txt(t.color)}">${t.ab}</div>
        <div class="who"><h4>${t.name}</h4><div class="sub" title="${esc(headline)}">${headline}</div></div>
        <div class="chips"><span class="pill big" title="${powerRank(ab).title}"><b>${ORD(powerRank(ab).rank)}</b>${powerRank(ab).label}</span><span class="pill"><b>${record(ab)}</b>2026</span></div>
      </div>
      ${block("r2", "Matchup preview", "n", e.matchup)}
      ${block("r3", "Positives", "up", nothing ? ["Nothing loaded for this team yet."] : e.strengths)}
      ${block("r4", "Negatives", "down", e.weaknesses)}
      ${block("r5", "Keys to victory", "info", e.keys)}
      ${deepDive(ab, home ? g.away : g.home, "r6")}
    </div>`;
  };

  /* stat breakdown, 2026 season only. A week's own per-team "stats" wins, then data/stats2026.js.
     A team with no games yet shows zeros. */
  const ZERO = {ppg:0, pa:0, ypp:0, yppa:0, to:0, sk:0, ska:0, third:0, rz:0, expl:0};
  const s26 = ab => (typeof STATS26 !== "undefined" && STATS26[ab]) ? STATS26[ab] : null;
  /* a team with 2026 numbers shows a dash for any stat its sources left blank; a team with none shows zeros */
  const BLANK = {ppg:null, pa:null, ypp:null, yppa:null, to:null, sk:null, ska:null, third:null, rz:null, expl:null};
  const statsOf = ab => Object.assign({}, s26(ab) ? BLANK : ZERO, s26(ab) || {}, ((w.teams||{})[ab]||{}).stats || {});
  const sa = statsOf(g.away), sh = statsOf(g.home);
  /* each team's own game count where the file has it: the Thursday teams have one more than the rest */
  const through = (typeof STATS26_THROUGH !== "undefined" && STATS26_THROUGH) ? " through " + STATS26_THROUGH : "";
  const counts = [[g.away, s26(g.away)], [g.home, s26(g.home)]].filter(([, s]) => s && s.g != null).map(([t, s]) => `${t} ${s.g} game${s.g === 1 ? "" : "s"}`);
  const basis = "2026 season" + through + (counts.length ? ": " + counts.join(", ") : "");
  const r1 = v => (v == null || isNaN(v)) ? null : Math.round(v*10)/10;
  const rows = [
    {label:"Point differential", a:(sa.ppg==null||sa.pa==null)?null:r1(sa.ppg - sa.pa), h:(sh.ppg==null||sh.pa==null)?null:r1(sh.ppg - sh.pa), hi:"a", sign:true, note:"per game"},
    {label:"Points per game", a:sa.ppg, h:sh.ppg, hi:"a"},
    {label:"Points allowed", a:sa.pa, h:sh.pa, hi:"lo"},
    {label:"Yards per play", a:sa.ypp, h:sh.ypp, hi:"a"},
    {label:"Yards per play allowed", a:sa.yppa, h:sh.yppa, hi:"lo"},
    {label:"Turnover margin", a:sa.to, h:sh.to, hi:"a", sign:true, note:"per game"},
    {label:"Sacks", a:sa.sk, h:sh.sk, hi:"a"},
    {label:"Sacks allowed", a:sa.ska, h:sh.ska, hi:"lo"},
    {label:"Third down rate", a:sa.third, h:sh.third, hi:"a", pct:true},
    {label:"Red zone TD rate", a:sa.rz, h:sh.rz, hi:"a", pct:true},
    {label:"Explosive plays", a:sa.expl, h:sh.expl, hi:"a", note:"20+ yards"}
  ].concat(g.rows||[]);
  const bar = r => {
    const x = parseFloat(r.a), y = parseFloat(r.h);
    let pa = 0, ph = 0;
    if (!isNaN(x) && !isNaN(y) && !(x === 0 && y === 0)){
      if (r.hi === "lo"){ const ix = 1/Math.max(x,.01), iy = 1/Math.max(y,.01); pa = ix/(ix+iy)*100; }
      else { const lo = Math.min(x,y,0), sx = x-lo, sy = y-lo; pa = (sx+sy)===0 ? 50 : sx/(sx+sy)*100; }
      ph = 100-pa;
    }
    const aw = !isNaN(x)&&!isNaN(y)&&x!==y ? (r.hi==="lo" ? x<y : x>y) : false;
    const hw = !isNaN(x)&&!isNaN(y)&&x!==y ? (r.hi==="lo" ? y<x : y>x) : false;
    const fmt = v => (v == null || (typeof v === "number" && isNaN(v))) ? "&ndash;"
      : (r.pct ? v + "%" : (r.sign && typeof v === "number" && v > 0) ? "+" + v : v);
    return `<div class="sbar">
      <div class="sv ${aw?"win":""}">${fmt(r.a)}</div>
      <div class="mid"><span class="lb">${r.label}${r.note?`<small>${r.note}</small>`:""}</span>
        <span class="track"><span class="half l"><i style="width:${pa}%;background:${a.color}"></i></span><span class="half r"><i style="width:${ph}%;background:${hm.color}"></i></span></span></div>
      <div class="sv ${hw?"win":""}">${fmt(r.h)}</div>
    </div>`;
  };

  document.getElementById("ovbox").innerHTML = `
    <div class="ovhd">
      <div>
        <h3 id="ovtitle"><i style="background:${a.color}"></i>${a.name}<em>at</em><i style="background:${hm.color}"></i>${hm.name}</h3>
        <div class="sub">${meta}</div>
      </div>
      <button class="x" id="ovx" aria-label="Close">&times;</button>
    </div>
    <div class="ovbody game">
      ${g.note ? `<p class="ovnote">${withPos(g.note, [g.away, g.home])}</p>` : ""}
      <div class="duo2">${teamBlock(g.away, "c1")}${teamBlock(g.home, "c2")}</div>
      <div class="ovsec n">Full stat breakdown<span class="ovsub">${basis}</span></div>
      <div class="ovlegend">
        <span><i style="background:${a.color}"></i>${a.name}</span>
        <span><i style="background:${hm.color}"></i>${hm.name}</span>
        <span>Green marks the better number</span>
      </div>
      ${rows.map(bar).join("")}
    </div>`;
  const ov = document.getElementById("ov");
  /* the two Deep Dives open and close together so they stay side by side */
  const dds = [...document.querySelectorAll("#ovbox details.dd")];
  dds.forEach(d => d.addEventListener("toggle", () => dds.forEach(x => { if (x !== d && x.open !== d.open) x.open = d.open; })));
  ov.classList.add("on"); ov.scrollTop = 0;
  document.body.style.overflow = "hidden";
  document.getElementById("ovx").addEventListener("click", closeOv);
}
function closeOv(){
  document.getElementById("ov").classList.remove("on");
  document.body.style.overflow = "";
}

/* ============================ footer ============================ */
/* After week 18 there is no next week: the tracker does not cover the playoffs, and says so.
   The regular season is over when the job says so (UNITS26_META.phase), or the week on screen is
   Week 18 with every game final. */
function seasonOver(){
  const w = currentWeek();
  if (typeof UNITS26_META !== "undefined" && UNITS26_META && UNITS26_META.phase && UNITS26_META.phase !== "regular" && w.id === "wk" + UNITS26_META.week) return true;
  return w.id === "wk18" && (w.games || []).length > 0 && w.games.every(g => g.awayScore != null && g.homeScore != null);
}
const FOOTER = () => `<footer>
  <p style="font-weight:600;color:var(--ink-2);margin-bottom:14px">Last updated ${currentWeek().updated || "September 13, 2026"}. ${seasonOver() ? "The regular season is complete; the tracker does not cover the playoffs." : "New week posted each Wednesday."}</p>
</footer>`;

/* ============================ boot ============================ */
document.getElementById("view").addEventListener("click", e=>{
  const s = e.target.closest(".slot"); if (s) openGame(s.dataset.game);
});
document.getElementById("ov").addEventListener("click", e=>{ if (e.target.id==="ov") closeOv(); });
document.addEventListener("keydown", e=>{ if (e.key==="Escape") closeOv(); });
document.getElementById("top").addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
render();
