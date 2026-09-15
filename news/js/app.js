/* The page shows one week at a time: the last entry in WEEKS (data/weeks.js). */

/* ============================ helpers ============================ */
const T = {}; TEAMS.forEach(t => T[t.ab] = t);
const esc  = s => String(s).replace(/<[^>]+>/g,"").replace(/"/g,"");
const li   = a => a.map(x=>`<li>${x}</li>`).join("");
const txt  = c => { const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16); return (r*299+g*587+b*114)/1000 > 140 ? "#332E29" : "#fff"; };
const ORD  = n => { const s=["th","st","nd","rd"], v=n%100; return n + "<sup>" + (s[(v-20)%10]||s[v]||s[0]) + "</sup>"; };
const TZFMT = (()=>{ try { return new Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch(e){ return ""; } })();
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
/* "(QB)" after a player's name, from data/players2026.js. The two teams in the game take
   priority; any other player is matched league wide unless two rosters share the name. A name
   already followed by "(" is left alone, and a possessive keeps its 's: "Josh Allen's (QB)". */
const POS_RX = {};
function posScope(teams){
  const key = teams.join(",");
  if (key in POS_RX) return POS_RX[key];
  if (typeof PLAYERS26 === "undefined") return (POS_RX[key] = null);
  /* league wide first, dropping any name two players share; then the teams in play win */
  const map = {};
  Object.keys(PLAYERS26).forEach(t => Object.entries(PLAYERS26[t] || {}).forEach(([n, p]) => {
    if (!(n in map)) map[n] = p; else if (map[n] !== p) map[n] = null;
  }));
  teams.forEach(t => Object.entries(PLAYERS26[t] || {}).forEach(([n, p]) => { map[n] = p; }));
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

/* ============================ ranks ============================ */
/* Preseason fallbacks computed from TEAMS. A week's own "ranks" block overrides these. */
const BASE = (()=>{
  const rankBy = (arr, key, desc) => {
    const s = [...arr].sort((a,b)=> desc ? b[key]-a[key] : a[key]-b[key]);
    const m = {}; s.forEach((t,i)=> m[t.ab] = i+1); return m;
  };
  const off = rankBy(TEAMS,"pf",true);      // most points scored in 2025
  const def = rankBy(TEAMS,"pa",false);     // fewest points allowed in 2025
  const ppg = rankBy(TEAMS,"pf",true);      // points per game, 2025
  const tom = rankBy(TEAMS,"to",true);      // turnover differential, 2025
  const m = {}; TEAMS.forEach(t => m[t.ab] = {off:off[t.ab], def:def[t.ab], ppg:ppg[t.ab], tom:tom[t.ab], ppgv:Math.round(t.pf/17*10)/10, tov:t.to});
  return m;
})();
function rk(ab, w){
  const t = T[ab], b = BASE[ab];
  const entry = (w.teams||{})[ab] || {};
  const g = entry.ranks || {};
  return {
    overall: g.overall || {rank:powerRank(ab).rank},
    offense: g.offense || {rank:b.off},
    defense: g.defense || {rank:b.def},
    ppg:     g.ppg     || {rank:b.ppg, val:b.ppgv},
    turnover:g.turnover|| {rank:b.tom, val:(b.tov>0?"+":"")+b.tov}
  };
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
  const recap = w.type === "recap";
  return `
  <section class="pagehead">
    <div class="eyebrow ${w.status==="sample"?"sample":""}"><i></i>${w.dates}</div>
    <h2>${w.headline}</h2>
    <p>${withPos(w.intro, [])}</p>
    ${w.status==="sample" ? `<p class="sampleflag"><strong>Sample data.</strong> Nothing on this tab is real. It exists to show what a played week looks like before one has been played.</p>` : ""}
  </section>

  <section class="sec">
    <div class="sec-head"><h3>${recap ? "Results" : "The slate"}</h3><p>${w.games.length} games. Click one for the full breakdown. Kickoffs show in your local time${TZFMT?" ("+TZFMT+")":""}.</p></div>
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

/* ============================ game overlay ============================ */
/* Everything about one matchup: both teams in full with keys to victory, then the stat breakdown.
   The two team blocks share one grid so matching sections sit on the same row and have equal height. */
function openGame(key){
  const w = currentWeek(); if(!w) return;
  const g = (w.games||[]).find(x=>x.away+"-"+x.home===key); if(!g) return;
  const a = T[g.away], hm = T[g.home], k = kickOf(g);
  const done = g.awayScore!=null && g.homeScore!=null;
  const meta = [done ? `Final ${g.awayScore}-${g.homeScore}` : "", k.day, done ? "" : k.time, g.tv, g.venue, g.line||""].filter(Boolean).join(" &middot; ");

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
  const statsOf = ab => Object.assign({}, ZERO, s26(ab) || {}, ((w.teams||{})[ab]||{}).stats || {});
  const sa = statsOf(g.away), sh = statsOf(g.home);
  const through = (typeof STATS26_THROUGH !== "undefined" && STATS26_THROUGH) ? " through " + STATS26_THROUGH : "";
  const basis = "2026 season" + through + ", per game";
  const r1 = v => (v == null || isNaN(v)) ? null : Math.round(v*10)/10;
  const rows = [
    {label:"Point differential", a:r1(sa.ppg - sa.pa), h:r1(sh.ppg - sh.pa), hi:"a", sign:true, note:"per game"},
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
const FOOTER = () => `<footer>
  <p style="font-weight:600;color:var(--ink-2);margin-bottom:14px">Last updated ${currentWeek().updated || "September 13, 2026"}. New week posted each Wednesday.</p>
</footer>`;

/* ============================ boot ============================ */
document.getElementById("view").addEventListener("click", e=>{
  const s = e.target.closest(".slot"); if (s) openGame(s.dataset.game);
});
document.getElementById("ov").addEventListener("click", e=>{ if (e.target.id==="ov") closeOv(); });
document.addEventListener("keydown", e=>{ if (e.key==="Escape") closeOv(); });
document.getElementById("top").addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
render();
