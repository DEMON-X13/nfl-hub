"""app v77: a Show stats button beside every player's name in a game.

The owner wanted a player's week-by-week numbers a click away while picking legs. Beside the
name on each player's row in a game's page there is now a small Show stats button; it opens a
table under the row of every game he has played this season, a row a week with the opponent,
and the stats that matter for his position, with his per-game average underneath:

    QB   completions/attempts, passing yards, passing TDs, interceptions, rushing yards
    RB   carries, rushing yards, catches, receiving yards, touchdowns
    WR/TE  targets, catches, receiving yards, touchdowns
    K    field goals made/attempted, extra points, kicking points

It reads S.actuals, the season's settled stats the job bakes in, so it costs nothing and is
the same numbers the legs are graded on. The button sits inside the row, so the row's own
click handler tells the two apart; opening the stats does not open the props and the other
way round, and several players' stats can be open at once (S.ui.stats, kept like S.ui.open).

The audit opens a game, shows the first player's stats, checks one row per week he has
stats for plus the average, and hides them again.

Every edit is made in memory and asserted to match exactly once; nothing is written unless
all of them land.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'), ('audit', 'audit.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', "const APP_BUILD='app v76 \\u00b7 2026-10-05';", "const APP_BUILD='app v77 \\u00b7 2026-10-05';")

# the button beside the name, and the table under the row
sub1('p3', """      const open=!!S.ui.open[x.pl.id];
      html+=`<button class="plrbtn" data-open="${x.pl.id}" aria-expanded="${open}">
        <div class="who">${esc(x.pl.n)}<span>${depthLabel(x.pl)||x.pl.pos}${x.starter?'':' \\u00b7 backup'}${x.gp<3?' \\u00b7 thin history':''}</span></div>""", """      const open=!!S.ui.open[x.pl.id], stOpen=!!(S.ui.stats&&S.ui.stats[x.pl.id]);
      html+=`<button class="plrbtn" data-open="${x.pl.id}" aria-expanded="${open}">
        <div class="who">${esc(x.pl.n)}<span>${depthLabel(x.pl)||x.pl.pos}${x.starter?'':' \\u00b7 backup'}${x.gp<3?' \\u00b7 thin history':''}</span><span class="stbtn${stOpen?' on':''}" role="button" tabindex="0" data-stats="${x.pl.id}" aria-pressed="${stOpen}">${stOpen?'Hide stats':'Show stats'}</span></div>""")
sub1('p3', """        <div class="arrow">${open?'\\u2303':'\\u2304'}</div></button>`;
      if(!open) continue;""", """        <div class="arrow">${open?'\\u2303':'\\u2304'}</div></button>`;
      if(stOpen) html+=weekStats(x.pl);
      if(!open) continue;""")

# the click: the stats button toggles the table, anywhere else on the row opens the props
sub1('p3', """  $('gameView').querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.open;""", """  $('gameView').querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',e=>{
    const st=e.target.closest&&e.target.closest('[data-stats]');
    if(st){ const sid=st.dataset.stats, U=(S.ui.stats??={});
      if(U[sid]) delete U[sid]; else U[sid]=true;
      renderGame.anchor=sid; save(); renderGame(); return; }
    const id=b.dataset.open;""")

# the table
sub1('p3', """/* ---------- one game ---------- */""", """/* ---------- a player's season, week by week (the Show stats button) ---------- */
const WEEK_COLS={
  QB:[['C/Att',a=>`${a.completions}/${a.attempts}`,null],['Pass yds','passing_yards'],['Pass TD','passing_tds'],['INT','passing_interceptions'],['Rush yds','rushing_yards']],
  RB:[['Car','carries'],['Rush yds','rushing_yards'],['Rec','receptions'],['Rec yds','receiving_yards'],['TD','tds']],
  WR:[['Tgt','targets'],['Rec','receptions'],['Rec yds','receiving_yards'],['TD','tds']],
  TE:[['Tgt','targets'],['Rec','receptions'],['Rec yds','receiving_yards'],['TD','tds']],
  K:[['FG',a=>`${a.fg_made}/${a.fg_att}`,null],['XP','pat_made'],['Pts','kick_pts']]};
function weekStats(pl){
  const cols=WEEK_COLS[pl.grp]||WEEK_COLS.WR;
  const wks=Object.keys(S.actuals||{}).map(Number).filter(w=>actualFor(w,pl.id)).sort((a,b)=>a-b);
  if(!wks.length) return '<div class="wkstats"><p class="muted" style="margin:0">No games with stats this season yet.</p></div>';
  const cell=(a,c)=>typeof c[1]==='function'?c[1](a):num(a[c[1]]||0,0);
  const rows=wks.map(w=>{ const a=actualFor(w,pl.id);
    return `<tr><td>Wk ${w}</td><td>${a.opp?tag(a.opp):''}</td>${cols.map(c=>`<td class="num">${cell(a,c)}</td>`).join('')}</tr>`; }).join('');
  /* the average a game, for the columns that are a single number */
  const avg=cols.map(c=>{ if(typeof c[1]==='function') return '<td class="num muted">\\u2013</td>';
    const s=wks.reduce((t,w)=>t+(actualFor(w,pl.id)[c[1]]||0),0)/wks.length;
    return `<td class="num"><b>${num(s,s<10?1:0)}</b></td>`; }).join('');
  return `<div class="wkstats"><table><thead><tr><th>Week</th><th>Opp</th>${cols.map(c=>`<th class="num">${c[0]}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><td colspan="2">Per game (${wks.length})</td>${avg}</tr></tfoot></table></div>`;
}

/* ---------- one game ---------- */""")

sub1('p1', """.plrbtn .sum{font-size:12px;color:var(--ink-2);text-align:right;line-height:1.4}""", """.plrbtn .sum{font-size:12px;color:var(--ink-2);text-align:right;line-height:1.4}
.plrbtn .who .stbtn{display:inline-block;margin-left:10px;padding:3px 9px;border:1px solid var(--line);border-radius:999px;font-size:11px;font-weight:600;color:var(--ink-2);background:var(--bg);cursor:pointer;vertical-align:2px;line-height:1.3}
.plrbtn .who .stbtn:hover{border-color:var(--ink-2);color:var(--ink)}
.plrbtn .who .stbtn.on{background:var(--ink);border-color:var(--ink);color:var(--panel)}
.wkstats{background:var(--panel);border:1px solid var(--line);border-radius:var(--r-md);padding:10px 14px;margin:-2px 0 10px;overflow-x:auto}
.wkstats table{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}
.wkstats th{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);text-align:left;padding:4px 8px;border-bottom:1px solid var(--line)}
.wkstats td{padding:5px 8px;border-bottom:1px solid var(--line)}
.wkstats .num{text-align:right}
.wkstats tfoot td{border-bottom:0;color:var(--ink-2)}""")

sub1('audit', """  console.log(`G. state flow: ingest ok, week stays on""", """  /* ---- G5. Show stats: a player's season week by week, under his row, without opening his props ---- */
  { openUpcoming(); const b=d.querySelector('#gameView [data-stats]'); chk(!!b,'no Show stats button beside a player');
    if(b){ const pid=b.dataset.stats; b.click();
      const box=d.querySelector('#gameView .wkstats'), wks=Object.keys(S.actuals||{}).filter(w=>F('actualFor')(w,pid));
      chk(!!box&&box.querySelectorAll('tbody tr').length===wks.length&&(wks.length===0||!!box.querySelector('tfoot')),'Show stats did not list one row per week he has stats for');
      chk(!S.ui.open[pid],'Show stats opened the props as well');
      const b2=d.querySelector(`#gameView [data-stats="${pid}"]`); chk(/Hide stats/.test(b2.textContent),'the button does not offer to hide the stats');
      b2.click(); chk(!d.querySelector('#gameView .wkstats'),'Hide stats did not close the table');
      console.log(`G5. show stats: ${wks.length} week(s) listed for ${pid}, the props stayed shut, hides again`); }
    d.getElementById('backBtn').click(); }

  console.log(`G. state flow: ingest ok, week stays on""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8', newline='\n')
print('app v77: Show stats beside every player, his season week by week')
