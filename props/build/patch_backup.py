"""The Backup tab covers only what lives in this browser (app v44).

Every week's stats, rosters, injuries and prices now arrive baked into the page from
the GitHub job, so a wiped browser gets the season back on the next load. What it
does not get back is the owner's own: saved parlays, the parlay builder and the stake.

  * "Export backup" becomes "Save backup now", green, as on the betting model.
  * "Reset to preseason" goes. It was for rebuilding after a bad hand upload; the
    baked season makes it pointless and it could only throw away saved parlays.
  * The card says what a backup is for, and a note under the buttons gives the age of
    the last one, red once it is more than a week old (none yet reads red too, once
    a parlay has been saved).
"""
from pathlib import Path

HERE = Path(__file__).parent


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(HERE / 'part1.html', """    <h2>Backup and reset</h2>
    <p id="buildNote" class="muted" style="margin:0 0 10px"></p>
    <div class="bar" style="margin:0">
      <button class="btn quiet" id="exportBtn">Export backup</button>
      <button class="btn quiet" id="importBtn">Import backup</button>
      <input type="file" id="importInput" accept=".json" hidden>
      <span class="grow"></span>
      <button class="btn danger" id="resetBtn">Reset to preseason</button>
    </div>
    <ul>
      <li><b>Export backup</b> saves everything to a file: player form, team numbers and every week you've loaded. It otherwise lives only in this browser, so clearing site data would wipe it.</li>
      <li><b>Import backup</b> restores one of those, or moves your season to another computer.</li>
      <li><b>Reset to preseason</b> throws away every week you've uploaded and rebuilds from the 2025 baseline.</li>
    </ul>""",
     """    <h2>Backup</h2>
    <p id="buildNote" class="muted" style="margin:0 0 10px"></p>
    <div class="bar" style="margin:0">
      <button class="btn go" id="exportBtn">Save backup now</button>
      <button class="btn quiet" id="importBtn">Import backup</button>
      <input type="file" id="importInput" accept=".json" hidden>
    </div>
    <p id="backupState" class="muted" style="margin:12px 0 0"></p>
    <ul>
      <li><b>Save backup now</b> writes a file with <b>your saved parlays, the parlay builder and your stake</b>. Those live only in this browser: clearing site data or switching computers loses them, and nothing backs them up automatically.</li>
      <li><b>Import backup</b> restores one of those files, or moves your parlays to another computer.</li>
      <li>Stats, rosters, injuries and prices are not your data to lose: the GitHub job bakes them into the page and every load picks them up.</li>
    </ul>
    <p class="muted" style="margin:10px 0 0">The note above turns red once your last backup is more than a week old. Backups land in your Downloads folder.</p>""")

p3 = HERE / 'part3.js'
sub1(p3, """$('exportBtn').addEventListener('click',()=>downloadText(`prop_model_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(S)));""",
     """$('exportBtn').addEventListener('click',()=>{ S.lastBackup=Date.now(); downloadText(`prop_model_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(S)); save(); renderBackupState(); });
/* how old the last backup is; red once it passes a week, or when there is something to lose and no backup */
function renderBackupState(){
  const el=$('backupState'); if(!el) return;
  const mine=(S.saved||[]).length+Object.keys(S.parlay||{}).length;
  if(!S.lastBackup){ el.className=mine?'err':'muted';
    el.innerHTML=mine?'<b>No backup saved yet.</b> Your saved parlays live only in this browser.':'No backup saved yet. Nothing to lose until you save a parlay.'; return; }
  const age=(Date.now()-S.lastBackup)/86400000, d=Math.floor(age);
  el.className=age>7?'err':'ok';
  el.innerHTML=`Last backup <b>${d===0?'today':d===1?'yesterday':d+' days ago'}</b>.`+(age>7?' That is getting old, save a fresh one.':'');
}""")
sub1(p3, """$('resetBtn').addEventListener('click',()=>{
  const n=Object.keys(S.processed).length;
  if(!confirm(`Reset to preseason?\\n\\nThis clears ${n} uploaded week${n===1?'':'s'} and rebuilds every projection from the 2025 baseline. Export a backup first if you are unsure.`)) return;
  S=freshState(); S.ui={game:null,open:{},showAll:false}; save(); renderAll(); });
""", "")
sub1(p3, "function renderAll(){ buildNorm(); renderWeekOptions(); renderSlate(); renderParlay(); renderModel(); renderTrack(); renderPricePull();",
     "function renderAll(){ buildNorm(); renderWeekOptions(); renderSlate(); renderParlay(); renderModel(); renderTrack(); renderPricePull(); renderBackupState();")

sub1(HERE / 'part1.html', ".log .ok{color:var(--pick)}",
     "#backupState.ok{color:var(--pick)} #backupState.err{color:var(--miss)}\n.log .ok{color:var(--pick)}")
sub1(HERE / 'part2.js', "const APP_BUILD='app v43 \\u00b7 2026-09-18';", "const APP_BUILD='app v44 \\u00b7 2026-09-19';")
print('Backup tab: Save backup now (green), no reset, last-backup note; app v44')
