"""app v99: the Parlay Builder's panel ends on a record of its own suggestions.

The review of Sunday 11 October's parlays found the model over-confident against DraftKings and the
suggested parlays collecting its mistakes; app v98 leads every suggestion with the book's fair chance
and leaves out the legs far off the market. The third change the owner approved ("okay go for it") is a
record of the suggestions themselves, so how they do is read off the page over the weeks rather than
remembered from a bad Sunday.

The record is kept by the props job (props/build/suggest_ledger.js, run by weekly.py once the audit is
clean): the panel's four levels under its default choices (All, every game still to come, the default
Bet amount), taken from the published page as the job last saw it before each wave of kickoffs, frozen
at that kickoff and graded as a book settles them, in props/data/suggest_ledger.json. This patch draws
it. The page reads the file beside the payload (DATA_URL's folder) once on every load, with no-store as
it reads the payload, and keeps it outside S (PB_REC), so it is never saved in a browser; a file that is
not there, or not a ledger, draws nothing. At the foot of the panel, after the Elo picks, a small
"Suggestions record": per level the parlays graded (won or lost; a push, every leg a push or a void, is
counted apart), how many won, the wins expected by the book's fair chance and by the model's (the sums
of the chances the panel showed), and the units on $1 a parlay; with a line saying it starts on 12
October 2026, Monday night's Bills at Rams the first wave, and that each entry is the default panel
frozen at kickoff. It is worked from the entries' own grades (pbRecSum), not from the summary the file
also carries, and drawn whether or not a game is left to build from.

Every edit is made in memory and asserted to match exactly once; nothing is written unless all of
them land, and a second run refuses.
"""
from pathlib import Path

HERE = Path(__file__).parent
FILES = {k: HERE / f for k, f in (('p1', 'part1.html'), ('p2', 'part2.js'), ('p3', 'part3.js'))}
T = {k: p.read_text(encoding='utf-8') for k, p in FILES.items()}
assert 'function pbRecHtml(' not in T['p3'], 'patch_suggest_record.py has already been applied'


def sub1(k, old, new=''):
    s = T[k]
    assert s.count(old) == 1, (k, s.count(old), old[:90])
    T[k] = s.replace(old, new)


sub1('p2', r"const APP_BUILD='app v98 \u00b7 2026-10-12';", r"const APP_BUILD='app v99 \u00b7 2026-10-12';")

# ---- the styles: a small table at the panel's foot ----
sub1('p1', """.pb-note{margin:-4px 0 12px;font-size:12.5px;color:var(--ink-2)}""",
     """.pb-note{margin:-4px 0 12px;font-size:12.5px;color:var(--ink-2)}
.pb-rec{margin:16px 0 0;padding:12px 0 0;border-top:1px solid var(--line)}
.pb-rec h3{margin:0 0 4px;font-family:var(--display);font-size:15px;font-weight:700;letter-spacing:-.2px}
.pb-rec p{margin:0 0 8px;font-size:12px;line-height:1.45}
.pb-rec-wrap{overflow-x:auto}
.pb-rec table{width:100%;border-collapse:collapse;font-size:12.5px}
.pb-rec th,.pb-rec td{padding:6px 7px;white-space:normal}
.pb-rec thead th{font-size:10px;line-height:1.25;vertical-align:bottom}
.pb-rec tbody th{font-weight:700;color:var(--ink);background:transparent;font-size:12.5px;letter-spacing:0;text-transform:none}
.pb-rec td.up{color:var(--pick);font-weight:700}
.pb-rec td.down{color:var(--miss);font-weight:700}""")

# ---- the record: fetched once a load, kept outside S, drawn from the entries' grades ----
sub1('p3', """/* the tiers for the picks as they stand, from the cache when nothing they stand on has moved */
function getPbTiers(){""",
     """/* ---------- the suggestions record (props/data/suggest_ledger.json) ----------
   The props job's record of this panel (props/build/suggest_ledger.js): its four levels on the default
   choices (All, every game still to come, the default Bet amount), as the job last saw them before each
   wave of kickoffs, frozen at that kickoff and graded as a book settles them. Read beside the payload
   with no-store on every load, and kept outside S so it is never saved; a file that is not there, or
   not a ledger, draws nothing. Drawn at the panel's foot from the entries' own grades (the summary the
   file carries is for people reading it): per level the parlays graded won or lost (a push, the stake
   back, is counted apart), won, the wins expected by the book's fair chance and by the model's (the
   sums of the chances the panel showed; a parlay a push shortened counts on its full chance), and the
   units on $1 a parlay. */
let PB_REC=null;
const PB_REC_URL=DATA_URL.replace(/payload\\.json$/,'suggest_ledger.json');
async function pbRecLoad(){
  let L=null;
  try{ const r=await fetch(PB_REC_URL+'?t='+Date.now(),{cache:'no-store'}); if(r.ok) L=await r.json(); }catch(e){ L=null; }
  PB_REC=L&&typeof L==='object'&&L.entries&&typeof L.entries==='object'&&!Array.isArray(L.entries)?L:null;
  const el=$('pbRec'); if(el) el.outerHTML=pbRecHtml();
}
window.pbRecLoad=pbRecLoad;
function pbRecSum(L){
  const out=PB_TIERS.map(([id,label])=>({id,label,graded:0,won:0,push:0,fair:0,fairN:0,model:0,units:0}));
  let pending=0, entries=0;
  for(const e of Object.values((L&&L.entries)||{})){ if(!e||!Array.isArray(e.tiers)) continue; entries++;
    for(const t of e.tiers){ const g=e.grade&&e.grade[t&&t.id], s=out.find(x=>t&&x.id===t.id); if(!g||!s||!Array.isArray(t.legs)) continue;
      if(g.result==='pending'){ pending++; continue; }
      if(g.result==='push'){ s.push++; continue; }
      if(g.result!=='won'&&g.result!=='lost') continue;
      s.graded++; if(g.result==='won') s.won++;
      s.model+=isFinite(+t.p)?+t.p:0; if(t.fair!=null&&isFinite(+t.fair)){ s.fair+=+t.fair; s.fairN++; }
      s.units+=(g.result==='won'&&isFinite(+g.payout)?+g.payout:0)-1; } }
  return {tiers:out,pending,entries};
}
function pbRecHtml(){
  if(!PB_REC) return '<div id="pbRec" class="pb-rec" hidden></div>';
  const R=pbRecSum(PB_REC), any=R.tiers.some(s=>s.graded), push=R.tiers.reduce((a,s)=>a+s.push,0), noFair=R.tiers.some(s=>s.fairN<s.graded);
  const f1=v=>v.toFixed(1), un=v=>(v>0.0005?'+':v<-0.0005?'\\u2212':'')+Math.abs(v).toFixed(2);
  const rows=R.tiers.map(s=>`<tr data-pb-rec="${s.id}"><th scope="row">${esc(s.label)}</th><td class="num">${s.graded}</td><td class="num">${s.won}</td>`
    +`<td class="num">${s.graded?f1(s.fair)+(s.fairN<s.graded?'*':''):'\\u2013'}</td><td class="num">${s.graded?f1(s.model):'\\u2013'}</td>`
    +`<td class="num${s.units>0.0005?' up':s.units<-0.0005?' down':''}">${s.graded||s.push?un(s.units):'\\u2013'}</td></tr>`).join('');
  const notes=[];
  if(R.pending) notes.push(`${R.pending} parlay${R.pending===1?' is':'s are'} waiting on ${R.pending===1?'its':'their'} games or stats.`);
  if(push) notes.push(`${push} push${push===1?'':'es'} (every leg a push or a void, the stake back) ${push===1?'is':'are'} counted apart.`);
  if(noFair) notes.push('* Not every parlay graded had a fair chance (a leg with no book price): those are left out of that sum.');
  return `<div id="pbRec" class="pb-rec"><h3>Suggestions record</h3>
    <p class="muted">It starts on 12 October 2026, Monday night’s Bills at Rams the first: each entry is this panel on its default choices (All, every game still to come, ${pbAmt(STAKE_DEFAULT)}) as the job last saw it before a wave of kickoffs, frozen at kickoff and graded as a book settles it (a push or a void leg drops out). Expected is the sum of the chances shown, by the book’s fair chance and by the model’s; units are on $1 a parlay.</p>
    ${any?`<div class="pb-rec-wrap"><table><thead><tr><th scope="col">Level</th><th scope="col" class="num">Graded</th><th scope="col" class="num">Won</th><th scope="col" class="num">Expected, fair chance</th><th scope="col" class="num">Expected, model</th><th scope="col" class="num">Units on $1</th></tr></thead><tbody>${rows}</tbody></table></div>`
      :`<p class="pb-rec-none">No suggested parlay has been graded yet.</p>`}
    ${notes.map(t=>`<p class="muted pb-rec-note">${t}</p>`).join('')}</div>`;
}
/* the tiers for the picks as they stand, from the cache when nothing they stand on has moved */
function getPbTiers(){""")
sub1('p3', """    <p class="pb-none">${seasonOver()?`The ${SEASON} regular season is over: no game is left to build a parlay from.`:`Every week ${w} game has kicked off, so there is nothing left to build from. Week ${w+1} opens once they are final.`}</p></div>`;""",
     """    <p class="pb-none">${seasonOver()?`The ${SEASON} regular season is over: no game is left to build a parlay from.`:`Every week ${w} game has kicked off, so there is nothing left to build from. Week ${w+1} opens once they are final.`}</p>${pbRecHtml()}</div>`;""")
sub1('p3', """    <div id="pbElo" class="pb-elo"></div></div>`;""", """    <div id="pbElo" class="pb-elo"></div>${pbRecHtml()}</div>`;""")
sub1('p3', """  renderAll(); pbWatch();""", """  renderAll(); pbWatch(); pbRecLoad();""")

for k, p in FILES.items():
    p.write_text(T[k], encoding='utf-8')
print('patch_suggest_record: app v99 written to part1.html, part2.js and part3.js')
