"""app v46: the defects a full review of the site turned up.

  1. A player ruled Out stayed hidden for the rest of the season. ingestInjuries only
     cleared a stored record when its week equalled the current week, so week 2's
     "Out" was still filtering him out of every projection in week 3 even with a clean
     week-3 report. Weekly records that are not from this week are now dropped; the
     season-long ones (IR, PUP) are left alone.
  2. The backup age reset to "No backup saved yet", in red, whenever a build bumped
     the roster hash: lastBackup was not among the keys carried across a rebuild.
  3. The threshold-ladder checkbox and the suggestions Minimize state were saved and
     then wiped at boot, because S.ui was replaced wholesale.
  4. $('buildTag') was addressed without a guard, and publish.js removes that element
     from the public page. A slower storage read would have blanked the public page.
  5. A game's suggested parlay was cached against the baked file and the loaded odds,
     neither of which changes when "Pull in scores and schedule" rewrites the spread,
     so the page kept serving the pre-pull suggestion.
  6. On a phone the Suggested parlays header did not wrap, pushing Minimize 60px off
     the screen and scrolling the whole page sideways.

Also: the text on both pages said the reader uploads the week's data, which the
GitHub job has done since the site went up. The wording is now the same on both
pages, which lets publish.js drop PUBLIC_TEXT, five exact prose strings that would
have failed the publish step if anyone reworded them.
"""
from pathlib import Path

HERE = Path(__file__).parent


def sub1(p, old, new=""):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


p1, p2, p3 = HERE / 'part1.html', HERE / 'part2.js', HERE / 'part3.js'

# 1. an Out from an earlier week is not this week's news
sub1(p3, """function ingestInjuries(rows){
  const w=currentWeek(); let out=0;""",
     """function ingestInjuries(rows){
  const w=currentWeek(); let out=0;
  /* last week's Out is not this week's: drop every weekly record from another week.
     'season' records (IR, PUP, suspended) are not weekly and stay until the roster clears them. */
  for(const id of Object.keys(S.inactive)){ const r=S.inactive[id]; if(r&&r.week!=='season'&&r.week!==w) delete S.inactive[id]; }""")

# 2. the backup age survives a rebuild
sub1(p3, "for(const k of ['parlay','saved','odds','stake','bookPrice','margin','gamesFetched'])",
     "for(const k of ['parlay','saved','odds','stake','bookPrice','margin','gamesFetched','lastBackup'])")

# 3. the two toggles the user set are theirs to keep
sub1(p3, "  S.ui={game:null,open:{},showAll:false};\n",
     "  /* the view resets, but a toggle the reader set is theirs */\n"
     "  S.ui={game:null,open:{},showAll:false,showRungs:!!(saved&&saved.ui&&saved.ui.showRungs),suggestMin:!!(saved&&saved.ui&&saved.ui.suggestMin)};\n")

# 4. the public page has no build tag
sub1(p3, "  $('buildTag').textContent=`${MODEL_BUILD} \\u00b7 ${APP_BUILD}`;",
     "  { const bt=$('buildTag'); if(bt) bt.textContent=`${MODEL_BUILD} \\u00b7 ${APP_BUILD}`; }")

# 5. a suggestion has to notice the line it was built from moving
sub1(p3, "  const sig=[g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}).length,PAY.baked_at||'',S.margin||''].join('|');",
     "  const sig=[g.id,gameStarted(g),JSON.stringify(S.odds[g.id]||{}),g.sp,g.tot,g.mlh,g.mla,PAY.baked_at||'',S.margin||''].join('|');")

# 6. the header wraps on a phone
sub1(p1, ".sugg-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px}",
     ".sugg-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}")

# tidy: a statement written twice, and three locals that go nowhere
sub1(p3, "S.headlines=S.headlines||{}; S.headlines=S.headlines||{};", "S.headlines=S.headlines||{};")
sub1(p3, "  const lastWk=Object.keys(S.processed).length;\n")
sub1(p3, "  const indepML=probToAmerican(pr.indep);\n")
sub1(p3, "  const ev=(realPrice||estPrice)?stake*(pr.corr*useDec-1):null;\n")

# the wording, the same on both pages
for old, new in [
    ("Prices come from the sheet you upload on the Weekly Update tab. Anything you haven't priced is shown at the model's own fair odds instead.",
     "Prices are pulled from the odds market twice a week. Anything without a market price is shown at the model's own fair odds instead."),
    ("so pull scores and lines on the Weekly Update tab before kickoff.",
     "and they are refreshed twice a week."),
    ("Pull them again on the Weekly Update tab before kickoff; expected points are the biggest single input to every projection.",
     "They are refreshed twice a week; expected points are the biggest single input to every projection."),
    ("Load a roster and depth chart on the Weekly Update tab.",
     "Rosters and depth charts are refreshed twice a week."),
    (" Pull in scores on the Weekly Update tab for the final score.",
     " The final score appears after the next refresh."),
    ("This fills in on its own each time you upload a week.",
     "This fills in on its own as each week is graded."),
    ("Once a week\\u2019s player stats are uploaded, every projection from that week is scored here.",
     "Once a week\\u2019s player stats are in, every projection from that week is scored here."),
    ("the main lines built in for the week, plus any sheet you uploaded.",
     "the main lines built in for the week."),
]:
    for f in (p1, p3):
        s = f.read_text(encoding='utf-8')
        if old in s:
            f.write_text(s.replace(old, new), encoding='utf-8', newline='\n')
            break
    else:
        raise AssertionError('wording not found: ' + old[:60])

sub1(p1, "Fills in on its own each time you upload a week.", "Fills in on its own as each week is graded.")
for old, new in [("Your parlays, stake and any prices you uploaded were kept", "Your parlays, stake and prices were kept")]:
    s = p3.read_text(encoding='utf-8')
    assert s.count(old) == 2, s.count(old)
    p3.write_text(s.replace(old, new), encoding='utf-8', newline='\n')

# publish.js: no prose rewrites left to break
pub = HERE / 'publish.js'
s = pub.read_text(encoding='utf-8')
i = s.index("// wording on the public page")
j = s.index("let pub = html.replace('</body>', TRIM + '</body>');", i)
s = s[:i] + s[j:]
s = s.replace("""let pub = html.replace('</body>', TRIM + '</body>');
for (const [from, to] of PUBLIC_TEXT) { if (!pub.includes(from)) throw new Error('public text not found: ' + from.slice(0, 40)); pub = pub.split(from).join(to); }""",
              """const pub = html.replace('</body>', TRIM + '</body>');""")
pub.write_text(s, encoding='utf-8', newline='\n')

sub1(p2, "const APP_BUILD='app v45 \\u00b7 2026-09-19';", "const APP_BUILD='app v46 \\u00b7 2026-09-19';")
print('app v46: injury expiry, backup age, kept toggles, build-tag guard, suggestion cache, phone header, one wording for both pages')
