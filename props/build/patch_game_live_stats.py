"""Live player stats in the game modal, on a button, and the same refresh everywhere.

The Games tab got the scoreboard last change; this is the half that matters while a game
is on. Open a game during it and every player read "projected" and nothing else, because
the only stats the app had were nflverse's, which arrive hours after the whistle. ESPN's
box score carries the same numbers live and costs nothing -- the app has parsed them for
parlay legs since live tracking went in -- so the modal reads them too.

Each player's row shows what he has actually done against what was projected, the same
shape the settled line uses once nflverse posts, and says plainly which of the two it is
looking at. Nothing settles on it: S.actuals is still written only by the job, and the
Track Record still grades the frozen pre-game numbers against nflverse. This is a window
onto someone else's scoreboard, and it stays outside S like the rest of LIVE.

A Refresh stats button sits in the status card of a game in progress, which is the one
place you are looking when you want it, with the time of the last read beside it. One
scoreboard call and one box score for the game on screen: nothing else is fetched, and a
game that has not kicked off is not asked about at all.
"""
import io

def sub1(path, old, new):
    s = io.open(path, encoding='utf-8').read()
    n = s.count(old)
    assert n == 1, '%s: expected 1, found %d of %r' % (path, n, old[:70])
    io.open(path, 'w', encoding='utf-8').write(s.replace(old, new))

# ---- actualSummary takes a stat block, so the live one can use it unchanged
sub1('part3.js',
"""function actualSummary(x,lines,week){
  const a=actualFor(week,x.pl.id); if(!a) return '<span class="muted">did not play</span>';""",
"""function actualSummary(x,lines,week,src){
  /* src is a live box-score block when nflverse has not posted yet; the shape is the same,
     which is the whole reason espnStats was written to match */
  const a=src||actualFor(week,x.pl.id);
  if(!a) return src===null?'<span class="muted">nothing on the sheet yet</span>':'<span class="muted">did not play</span>';""")

# ---- the live block for one player, from the box score already in LIVE
sub1('part3.js',
"""/* what to show against one leg of a saved parlay, live */""",
"""/* one player's live line, out of the box score for the game on screen. null means the
   sheet has him but with nothing on it yet; undefined means there is no sheet to read. */
function liveStatsFor(gid,team,name){
  const sum=LIVE.box[gid]; if(!sum) return undefined;
  return espnStats(sum,team,name);
}
/* the scoreboard and one box score, for the game being looked at and nothing else */
async function refreshGameStats(g){
  if(LIVE.busy) return;
  LIVE.busy=true; LIVE.err=null; gameStatsBtn('reading\\u2026');
  try{
    const sb=await liveGet(`${ESPN_SB}?seasontype=2&week=${g.w}&dates=${SEASON}`);
    LIVE.games=Object.assign({},LIVE.games,espnGames(sb,S.sched));
    const s=LIVE.games[g.id];
    if(s&&s.state!=='pre'){
      const box=await liveGet(ESPN_SUM+s.eid);
      LIVE.box=Object.assign({},LIVE.box,{[g.id]:box});
    }
    LIVE.at=Date.now();
  }catch(e){ LIVE.err=String(e&&e.message||e); }
  finally{ LIVE.busy=false; }
  if(S.ui.game===g.id) renderGame();
}
function gameStatsBtn(txt){ const b=$('gameStatsNow'); if(b) b.textContent=txt; }

/* what to show against one leg of a saved parlay, live */""")

# ---- the status card carries the button, and says which stats are on screen
sub1('part3.js',
"""  if(locked) html+=`<div class="card" style="border-left:4px solid ${fin?'var(--pick)':'var(--gold)'}"><b>${hasScore(g)?`Final: ${g.a} ${g.as}, ${g.h} ${g.hs}.`:(fin?'Final.':'In progress.')}</b> <span class="muted">${haveStats?'Each player below shows what the model projected against what he actually did.':'Player stats come out some hours after the final whistle and appear with the next update; until then each player shows only what was projected.'}${hasScore(g)?'':' The final score appears after the next refresh.'}</span></div>`;""",
"""  /* a live score and stats, when the scoreboard has been read for this game */
  const lg=LIVE.games[g.id], lbox=!!LIVE.box[g.id];
  const liveOn=!haveStats&&lbox;
  if(locked) html+=`<div class="card" style="border-left:4px solid ${fin?'var(--pick)':'var(--gold)'}">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <b>${hasScore(g)?`Final: ${g.a} ${g.as}, ${g.h} ${g.hs}.`
        :(lg&&lg.as!=null?`${g.a} ${num(lg.as,0)}, ${g.h} ${num(lg.hs,0)}${lg.clock?' \\u00b7 '+esc(lg.clock):''}.`
          :(fin?'Final.':'In progress.'))}</b>
      <span class="grow"></span>
      ${LIVE.at?`<span class="muted" style="font-size:12px">${LIVE.err?'stats not loading':'read '+new Date(LIVE.at).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'})}</span>`:''}
      <button class="btn quiet small" id="gameStatsNow" title="Read the score and the box score for this game from ESPN. Free: no odds-API credits, no job.">Refresh stats</button>
    </div>
    <span class="muted">${haveStats?'Each player below shows what the model projected against what he actually did.'
      :(liveOn?'Each player below shows what he has done so far, live from the scoreboard, against what was projected. These are not the settled numbers: the season\\u2019s stats arrive with the next update and the Track Record still grades those.'
        :'Player stats come out some hours after the final whistle and appear with the next update. Press Refresh stats to read them live from the scoreboard in the meantime.')}${hasScore(g)||lg?'':' The final score appears after the next refresh.'}</span></div>`;""")

# ---- each player's row: the live line where there is no settled one
sub1('part3.js',
"""        <div class="sum">${locked?`<span class="finchip${fin?'':' live'}">${fin?'FINAL':'LIVE'}</span>`:''}${(locked&&haveStats)?actualSummary(x,lines,g.w):(locked?'<span class="muted">projected</span> '+summaryOf(x,lines):summaryOf(x,lines))}</div>""",
"""        <div class="sum">${locked?`<span class="finchip${fin?'':' live'}">${fin?'FINAL':'LIVE'}</span>`:''}${
          (locked&&haveStats)?actualSummary(x,lines,g.w)
          :(locked&&liveOn?actualSummary(x,lines,g.w,liveStatsFor(g.id,team,x.pl.n))
          :(locked?'<span class="muted">projected</span> '+summaryOf(x,lines):summaryOf(x,lines)))}</div>""")

# ---- wire the button beside Close
sub1('part3.js',
"""  $('backBtn').addEventListener('click',closeGame);""",
"""  $('backBtn').addEventListener('click',closeGame);
  $('gameStatsNow')?.addEventListener('click',()=>refreshGameStats(g));""")

print('patched part3.js')
