"""One suggested parlay on each game page, kept to a few lines.

The Parlay Builder's suggestions look across the whole week. Opening a single game
now shows the same idea scoped to that game: one Medium-confidence parlay, at most
three legs, with the chance every leg lands and what the combined price pays. No
tiers, no grid, no buttons -- a strip under the game bets card.

suggestCandidates() gains a games argument so the per-game version reuses exactly
the same filter as the week-wide one: a real sportsbook price, the model between
45% and 97%, and at least three points of edge over the price. Results are cached
per game, because the overlay re-renders every time a player is expanded.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
H = HERE / 'part1.html'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- 1. the candidate scan takes a list of games ----
sub1(J, """function suggestCandidates(){
  const w=currentWeek(); const out=[];
  for(const g of gamesIn(w)){
    if(gameStarted(g)) continue;""",
     """function suggestCandidates(games){
  const w=currentWeek(); const out=[];
  for(const g of (games||gamesIn(w))){
    if(gameStarted(g)) continue;""")

# ---- 2. one Medium parlay for a single game ----
sub1(J, "function getSuggestions(){",
     """/* the same engine as the week-wide tiers, narrowed to one game and one tier.
   Three legs at most: this sits on the game page and must stay short. */
const GAME_SUGGEST_FLOOR=0.30, GAME_SUGGEST_CAP=3;
let GAME_SUGGEST_CACHE={};
function gameSuggestion(g){
  const sig=[g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}).length,PAY.baked_at||'',S.margin||''].join('|');
  const hit=GAME_SUGGEST_CACHE[g.id];
  if(hit&&hit.sig===sig) return hit.val;
  const cands=suggestCandidates([g]);
  const dec=legs=>legs.reduce((a,l)=>a*(mlToDec(l.price)||1),1);
  let cur=[];
  while(cur.length<GAME_SUGGEST_CAP){
    let best=null;
    for(const c of cands){
      if(cur.some(l=>l.key===c.key)) continue;
      if(c.grp==='TEAM'&&cur.some(l=>l.grp==='TEAM')) continue;   /* one team bet per game */
      const next=[...cur,c], p=parlayProb(next,3000).corr;
      const forced=next.length<2;                                  /* a parlay needs two legs */
      if(!forced&&p<GAME_SUGGEST_FLOOR) continue;
      const score=p*dec(next);
      if(!best||score>best.score) best={c,score};
    }
    if(!best) break;
    cur=[...cur,best.c];
  }
  const val=cur.length<2?{legs:[],candidates:cands.length}
    :{legs:cur,candidates:cands.length,corr:parlayProb(cur,20000).corr,dec:dec(cur)};
  GAME_SUGGEST_CACHE[g.id]={sig,val};
  return val;
}
function gameSuggestCard(g,locked){
  if(locked) return '';
  const s=gameSuggestion(g);
  if(!s.legs.length) return `<div class="card gsugg"><div class="gsugg-hd"><h2>Suggested parlay</h2></div>
    <p class="muted" style="margin:0">Nothing here clears the bar yet: a suggestion needs two legs with a real sportsbook price that the model rates at least three points above that price${s.candidates===1?', and only one qualifies':''}. Player prices arrive with the Thursday and Saturday pulls.</p></div>`;
  const stake=Math.max(0,+S.stake||0), ml=decToML(s.dec);
  return `<div class="card gsugg"><div class="gsugg-hd">
      <h2>Suggested parlay</h2><span class="conf med">Medium</span><span class="grow"></span>
      <span class="gsugg-nums"><b>${(s.corr*100).toFixed(0)}%</b> to land <span class="muted">\\u00b7</span> <b>${fmtML(ml)}</b>${stake?` <span class="muted">pays $${(stake*s.dec).toFixed(2)}</span>`:''}</span>
    </div>
    <ul class="gsugg-legs">${s.legs.map(l=>`<li><span class="nm">${esc(l.name)}<small>${esc(l.label)}</small></span><span class="pr">${fmtML(l.price)}<em>${(l.p*100).toFixed(0)}%</em></span></li>`).join('')}</ul>
    <p class="muted gsugg-ft">Chance that every leg lands, correlations included. Tick the lines yourself in the Parlay Builder to stake it.</p></div>`;
}
function getSuggestions(){""")

# ---- 3. on the game page, under the game bets ----
sub1(J, "  html+=gameBetsCard(g,locked);", "  html+=gameBetsCard(g,locked);\n  html+=gameSuggestCard(g,locked);")

# ---- 4. compact styles ----
sub1(H, ".sugg-nums{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
     """.gsugg .gsugg-hd{display:flex;align-items:center;gap:10px;margin:0 0 10px;flex-wrap:wrap}
.gsugg .gsugg-hd h2{margin:0}
.gsugg .grow{flex:1}
.gsugg-nums{font-size:13px;color:var(--ink-2);white-space:nowrap}
.gsugg-nums b{font-family:var(--display);font-size:16px;color:var(--ink);font-variant-numeric:tabular-nums}
.gsugg-legs{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.gsugg-legs li{display:flex;align-items:baseline;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:14px}
.gsugg-legs .nm{flex:1;min-width:0}
.gsugg-legs .nm small{display:block;color:var(--ink-2);font-size:12px}
.gsugg-legs .pr{font-family:var(--display);font-variant-numeric:tabular-nums;white-space:nowrap}
.gsugg-legs .pr em{font-style:normal;color:var(--ink-2);font-size:12px;margin-left:7px}
.gsugg-ft{margin:8px 0 0;font-size:12px}
.sugg-nums{display:grid;grid-template-columns:1fr 1fr;gap:8px}""")

# ---- 5. audit ----
sub1(A, "  /* ---- N. the credit-pull panel, in place of the old price sheet ---- */",
     """  /* ---- O. one suggested parlay on the game page ---- */
  { const g=openUpcoming(); const card=d.querySelector('.gsugg');
    chk(!!card,'the game page has no suggested parlay section');
    const s=F('gameSuggestion')(g);
    chk(s.legs.length===0||s.legs.length<=3,`a game suggestion ran to ${s.legs.length} legs`);
    chk(s.legs.every(l=>l.src==='real'),'a game suggestion used a line with no real price');
    chk(s.legs.every(l=>l.gid===g.id),'a game suggestion pulled in another game');
    chk(s.legs.filter(l=>l.grp==='TEAM').length<=1,'a game suggestion stacked two team bets');
    if(s.legs.length){
      chk(s.corr>0&&s.corr<1,'the game suggestion has a nonsense chance');
      chk([...card.querySelectorAll('.gsugg-legs li')].length===s.legs.length,'the card shows a different number of legs');
      chk(new RegExp(`${Math.round(s.corr*100)}% to land`).test(card.textContent.replace(/\\s+/g,' ')),'the card does not show the chance');
    } else chk(/Nothing here clears the bar/.test(card.textContent),'an empty suggestion says nothing useful');
    /* the overlay re-renders whenever a player is expanded: that must not rebuild it */
    const before=F('gameSuggestion')(g); chk(before===s,'the game suggestion is not cached between renders');
    console.log(`O. game suggestion: ${s.legs.length} leg(s) from ${s.candidates} qualifying line(s)`); }

  /* ---- N. the credit-pull panel, in place of the old price sheet ---- */""")

print('game suggestion added to the game page')
