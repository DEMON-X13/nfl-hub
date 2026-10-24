"""app v134: a player's card in the matchup bubble, and a search box on a game's page.

The owner's call of 24 October 2026: "I want a make a change where anytime a player name is mentioned you are able to
click that for more information. I want it to show what the attachment shows [his week-by-week game log, the Show stats
table] ALSO what their projections are for next game. In that window that opens I also want it to have button: opens
the prop leg for that particular player. also when clicking into a particular game, have a search box at the top to find
a player".

`playerCard(pid, gid)` (on `window`) draws, for a player of that game, the prop model's projection for it (every stat
`statLines` gives him, the mean, or the touchdown's chance) and his season week by week, the very table the game page's
Show stats draws (`weekStats`); the matchup bubble (`glance.js`), which every player's name on the Parlay Builder and
Suggested Parlays already opens, sets it under his matchup, with an "Open prop leg" button that opens the game's page with
his row open (`pkBoard.openOnProps`). A game's page has a search box at its top (`#gameSearch`, type search): what is typed
hides every player row whose name does not hold it, with its open body and stats, and a team header with no row left
(`gameSearchApply`, in place, so the focus stays in the box); what is typed is kept for that game while the page is open
(`GAME_Q`, outside `S`, never saved) and cleared when another game opens.
"""
import io
FILES = {'p2': 'part2.js', 'p3': 'part3.js', 'p1': 'part1.html'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function playerCard(' not in T['p3'], 'patch_player_card.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v133 \\u00b7 2026-10-24';", "const APP_BUILD='app v134 \\u00b7 2026-10-24';", 'APP_BUILD')
sub1('p3', "/* ---------- one game ---------- */", r"""/* (app v134) a player's card: his projection for the game and his season week by week (the matchup bubble's) */
function playerCard(pid,gid){
  const g=S&&S.sched&&S.sched.find(x=>x.id===gid); if(!g) return '';
  let x=null;
  try{ const R=rosterFor(g,true); for(const t of [g.a,g.h]){ const f=((R[t]&&R[t].players)||[]).find(p=>p.pl&&p.pl.id===pid); if(f){ x=f; break; } } }catch(e){ x=null; }
  if(!x) return '';
  let lines=[]; try{ lines=statLines(x); }catch(e){ lines=[]; }
  const vs=`${x.opp?(x.pl.team===g.h?'vs ':'at ')+esc(x.opp):''}`;
  const proj=lines.length?`<table class="pc-proj"><thead><tr><th>Stat</th><th class="num">Projected</th></tr></thead><tbody>${lines.map(l=>`<tr data-pcard-stat="${esc(l.stat)}"><td>${esc(l.prob?(x.pl.grp==='QB'?'Rush or rec TD':'Touchdown'):l.m.lbl)}</td><td class="num"><b>${l.prob?Math.round(l.p*100)+'%':num(l.mu,l.mu<10?1:0)}</b></td></tr>`).join('')}</tbody></table>`
    :'<p class="muted pc-none">No projections.</p>';
  return `<div class="pcard" data-pcard="${esc(pid)}"><h4 class="pc-h">Projected${vs?' '+vs:''}</h4>${proj}<h4 class="pc-h">This season</h4>${weekStats(x.pl)}</div>`;
}
window.playerCard=playerCard;
/* (app v134) the game page's player search: what is typed, kept for that game while the page is open */
let GAME_Q={gid:null,q:''};
function gameSearchHtml(g){ if(GAME_Q.gid!==g.id) GAME_Q={gid:g.id,q:''};
  return `<div class="gsearch"><input type="search" id="gameSearch" placeholder="Find a player" aria-label="Find a player in this game" autocomplete="off" value="${esc(GAME_Q.q)}"></div>`; }
function gameSearchApply(){
  const v=$('gameView'); if(!v) return; const q=GAME_Q.q.trim().toLowerCase();
  let hdr=null, shown=0;
  const flush=()=>{ if(hdr) hdr.hidden=!!q&&!shown; };
  let hide=false;
  for(const el of [...v.children]){
    if(el.classList.contains('teamhdr')){ flush(); hdr=el; shown=0; hide=false; continue; }
    if(el.matches('[data-open],[data-nohist]')){ const w=el.querySelector('.who'), tn=w&&[...w.childNodes].find(c=>c.nodeType===3&&c.textContent.trim()), n=((tn&&tn.textContent)||'').toLowerCase();
      hide=!!q&&!n.includes(q); el.hidden=hide; if(!hide) shown++; continue; }
    if(el.matches('.plrbody,.wkstats')){ el.hidden=hide; continue; }
    if(hdr&&el.matches('p.muted,.empty')){ el.hidden=!!q; continue; }
    hide=false;
  }
  flush();
}
window.gameSearchApply=gameSearchApply;

/* ---------- one game ---------- */""", 'playerCard and the search')
sub1('p3', """    <label class="muted"><input type="checkbox" id="allCb" ${showAll?'checked':''}> Include backups</label>
  </div>`;""", """    <label class="muted"><input type="checkbox" id="allCb" ${showAll?'checked':''}> Include backups</label>
  </div>`;
  html+=gameSearchHtml(g);""", 'renderGame: the search box')
sub1('p3', "  $('allCb').addEventListener('change',e=>{ S.ui.showAll=e.target.checked; save(); renderGame(); });",
     "  $('allCb').addEventListener('change',e=>{ S.ui.showAll=e.target.checked; save(); renderGame(); });\n"
     "  $('gameSearch')?.addEventListener('input',e=>{ GAME_Q.q=e.target.value; gameSearchApply(); });\n"
     "  gameSearchApply();", 'renderGame: the search wired')
sub1('p1', ".sp-sech{margin:0;", ".gsearch{margin:0 0 12px}.gsearch input{width:100%;box-sizing:border-box;min-height:44px;padding:8px 12px;border:1px solid var(--line-2);border-radius:10px;background:var(--panel);color:var(--ink);font:inherit;font-size:15px}\n"
     ".pcard .pc-h{margin:12px 0 4px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}.pcard .pc-proj{width:100%;border-collapse:collapse;font-size:12.5px}.pcard .pc-proj td,.pcard .pc-proj th{padding:4px 6px;border-top:1px solid var(--line);text-align:left}.pcard .pc-proj .num{text-align:right}.pcard .wkstats{overflow-x:auto}.pcard .wkstats table{font-size:12px;min-width:100%}\n"
     ".sp-sech{margin:0;", 'part1: styles')
for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v134, the player card and the game search')
