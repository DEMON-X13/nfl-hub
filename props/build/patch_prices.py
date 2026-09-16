"""Weekly Update: the price sheet goes, a record of the last credit pull takes its place.

The Thursday and Saturday builds pull prices from the odds API, so downloading a
blank sheet and typing odds in by hand no longer has a job to do for the markets
that pull covers. What was missing was any way to see when credits were last
spent, so the sheet controls are replaced by that, and the manual refresh link
now asks before it opens the page where credits can be spent.

  * part1.html  price-sheet controls -> a "Sportsbook prices" panel (#pricePull)
  * part3.js    the sheet/upload/clear handlers and oddsTemplate() go; ingestOdds
                stays, because the baked prices come in through it
  * weekly.py   records each real price pull in data/pricepull.json and bakes it in
  * publish.js  "Refresh site now" confirms first, and says what does and does not
                cost credits
"""
import re
from pathlib import Path

HERE = Path(__file__).parent
H = HERE / 'part1.html'
J = HERE / 'part3.js'
W = HERE / 'weekly.py'
P = HERE / 'publish.js'


def sub1(s, old, new):
    assert s.count(old) == 1, (s.count(old), old[:90])
    return s.replace(old, new)


def block(lines, start_needle, end_needle, new_lines):
    """replace the inclusive run of lines from the first anchor to the second"""
    a = next(i for i, l in enumerate(lines) if start_needle in l)
    b = next(i for i, l in enumerate(lines) if end_needle in l and i >= a)
    return lines[:a] + new_lines + lines[b + 1:]


# ---------------------------------------------------------------- part1.html
h = H.read_text(encoding='utf-8')
assert 'Prices for the 10+' in h, 'part1.html already patched'
lines = h.split('\n')

NEW = [
    '    <h3 style="margin:18px 0 6px">Sportsbook prices</h3>',
    '    <p class="muted" style="margin:0 0 10px">Prices arrive with the Thursday and Saturday builds, and they are the only thing on this page that spends odds-API credits. Passing, rushing and receiving yards come in with a real price on the main line and on every X+ rung, along with anytime touchdown. Receptions, attempts, completions, passing touchdowns, interceptions and carries are not in that pull, so those rungs keep the model&rsquo;s own estimate and are labelled <b>est.</b></p>',
    '    <div id="pricePull" class="log" style="margin-top:0"></div>',
]
lines = block(lines, '>Prices for the 10+, 20+, 30+ lines<',
              '"Just my parlay" is the practical one', NEW)
h = '\n'.join(lines)

h = sub1(h,
         '      <li><b>Price sheet</b> is optional. Columns are <code>game_id, player, market, threshold, odds</code>, with odds in American form like -115 or +260. The threshold matches the numbers on the game pages, so a row reading <code>250, -120</code> means your book pays -120 on 250 or more. Open it in Excel or Numbers, fill the odds column, save as CSV.</li>\n',
         '      <li><b>Prices</b> are not on this list because nothing here fetches them. They come from the odds API on the Thursday and Saturday builds, and the panel above says when credits were last spent on them.</li>\n')

H.write_text(h, encoding='utf-8', newline='\n')

# ----------------------------------------------------------------- part3.js
j = J.read_text(encoding='utf-8')
assert "function oddsTemplate" in j, 'part3.js already patched'

# the second week dropdown is gone
j = sub1(j, "  for(const id of ['weekSel','oddsWeekSel']){", "  for(const id of ['weekSel']){")

# oddsTemplate built the blank sheet; nothing calls it now
a = j.index('function oddsTemplate(legsOnly){')
b = j.index('function ingestOdds(rows,week,quiet){')
j = j[:a] + j[b:]

# ingestOdds is still how baked prices land, but it is never interactive now
j = sub1(j, "  const w=week||(+$('oddsWeekSel').value||currentWeek());",
         "  const w=week||currentWeek();")
a = j.index("  let msg=n?`Loaded ${n} price")
b = j.index("  return {n,week:w,missName:missName.size};\n}", a)
j = j[:a] + "  /* no interactive upload any more: the only caller is applyBaked */\n" + j[b:]

# the sheet, upload and clear controls
a = j.index("$('oddsTemplate').addEventListener('click',()=>oddsTemplate(false));")
b = j.index("});", j.index("$('oddsClear').addEventListener('click',()=>{")) + len("});\n")
j = j[:a] + j[b:]

# the panel that replaces them
PANEL = """/* when credits were last spent, and on what. PAY.price_pull is written by the
   build that actually pulled; older builds only recorded the date on the main lines. */
function renderPricePull(){
  const el=$('pricePull'); if(!el) return;
  const pp=PAY.price_pull, meta=PAY.mkt_meta||{}, all=PAY.prices||{};
  const weeks=Object.keys(all).sort((a,b)=>a-b);
  const counts=weeks.length?weeks.map(w=>`week ${w}: ${all[w].length.toLocaleString()} price${all[w].length===1?'':'s'}`).join(', '):'no prices in this build';
  const fmt=t=>{ const d=new Date(/Z|[+-]\\d\\d:?\\d\\d$/.test(t)?t:t+'Z');
    return isFinite(d)?d.toLocaleString(undefined,{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):t; };
  let head, sub;
  if(pp&&pp.at){
    head=`Last credit pull: <b>${fmt(pp.at)}</b>, for week ${pp.week}.`;
    sub=counts+(pp.credits_left!=null?` \\u00b7 ${pp.credits_left} credit${pp.credits_left===1?'':'s'} left this month`:'');
  } else {
    const w=Object.keys(meta).sort((a,b)=>b-a)[0];
    head=(w&&meta[w].asof)?`Last credit pull: <b>${meta[w].asof}</b>, for week ${w}.`:'No credit pull recorded in this build.';
    sub=counts+' \\u00b7 this build recorded the date only; later builds record the time and the credits left';
  }
  el.innerHTML=`<div>${head}</div><div class="muted">${sub}</div>`;
}
"""
j = sub1(j, "function renderAll(){", PANEL + "function renderAll(){")
j = sub1(j, "function renderAll(){ buildNorm(); renderWeekOptions(); renderSlate(); renderParlay(); renderModel(); renderTrack();",
         "function renderAll(){ buildNorm(); renderWeekOptions(); renderSlate(); renderParlay(); renderModel(); renderTrack(); renderPricePull();")
J.write_text(j, encoding='utf-8', newline='\n')

# ----------------------------------------------------------------- weekly.py
w = W.read_text(encoding='utf-8')
assert 'pricepull.json' not in w, 'weekly.py already patched'
w = sub1(w, """        if rc==0 and os.path.exists(os.path.join(DATA,f'wk{week}_lines.csv')):""",
         """        if rc==0:
            # what the app shows on the Weekly Update tab: when credits were last spent
            left=re.findall(r'remaining (\\d+)',out)
            json.dump({'at':datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M'),
                       'week':week,'credits_left':int(left[-1]) if left else None},
                      open(os.path.join(DATA,'pricepull.json'),'w',encoding='utf-8'))
        if rc==0 and os.path.exists(os.path.join(DATA,f'wk{week}_lines.csv')):""")
w = sub1(w, """        pp=os.path.join(DATA,'payload.json'); pay=json.load(open(pp,encoding='utf-8'))""",
         """        pp=os.path.join(DATA,'payload.json'); pay=json.load(open(pp,encoding='utf-8'))
        # survives builds that skip the price pull, so the tab keeps showing the real last pull
        try: pay['price_pull']=json.load(open(os.path.join(DATA,'pricepull.json'),encoding='utf-8'))
        except Exception: pass""")
W.write_text(w, encoding='utf-8', newline='\n')

# ----------------------------------------------------------------- publish.js
p = P.read_text(encoding='utf-8')
assert 'confirm(' not in p, 'publish.js already patched'
p = sub1(p, """  a.textContent='Refresh site now \\u2197'; a.style.marginLeft='14px'; a.style.whiteSpace='nowrap';""",
         """  a.textContent='Refresh site now \\u2197'; a.style.marginLeft='14px'; a.style.whiteSpace='nowrap';
  a.addEventListener('click',e=>{
    if(!confirm('Refresh site now \\\\u2014 this is the page where credits get spent.\\\\n\\\\n'
      +'The run itself costs nothing by default: \\"Skip the price pull\\" is ticked, and a skipped run only re-downloads the free nflverse files.\\\\n\\\\n'
      +'UNTICKING that box pulls fresh odds at about 7 credits a game \\\\u2014 roughly 112 for a full 16-game week, out of 500 free a month.\\\\n\\\\n'
      +'Open the Run workflow page?')) e.preventDefault();
  });""")
P.write_text(p, encoding='utf-8', newline='\n')

print('patched part1.html, part3.js, weekly.py, publish.js')
