"""app v132: Suggested Parlays' record in a section of its own, Day games over Night games, each section folding, no
Extreme level shown, and Day games gone on a Sunday from 4pm Eastern.

The owner's call of 23 October 2026: "I think it doesnt make sense to split up night games and day game records. can
you combine them and put them in their own section? also lets get rid of the extreme parlays. Please put day games
above night games, make the sections able to minimize. when its after 4PM please remove the day games so only the night
games come up on Sundays."

The tab is three sections, each a <details> open to start whose summary is its heading: Record (`SP_SEC.all`, both of
the suggestions record's maps, prime and slot, each unit and level once, the backtest's weeks counted as ever), then
Day games (the Sunday slot's set), then Night games; the two set sections carry no record of their own. A section a
visitor folds stays folded through every redraw of that page load (`SP_FOLD`, outside S, never saved). Extreme is
taken off the tab, not out of the engine: `SP_SHOW` is the levels drawn (Safe, Medium, Aggressive), so a set's cards
and its Elo picks draw no Extreme card and the record counts no Extreme level, while the props job still takes, locks
and grades all four, so the ledger's shape and its guard are untouched. On a Sunday from 4:00 pm Eastern (`spDayOff`,
through Intl's America/New_York) the Day games section is not drawn; Monday morning it is back with next week's wait.
"""
import io
FILES = {'p1': 'part1.html', 'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'SP_SHOW=' not in T['p3'], 'patch_sp_record_top.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v131 \\u00b7 2026-10-23';", "const APP_BUILD='app v132 \\u00b7 2026-10-23';", 'APP_BUILD')
sub1('p3', "const SP_SEC={night:{maps:['prime'],name:'Night games'},slot:{maps:['slot'],name:'Day games'}};",
     "const SP_SEC={night:{maps:['prime'],name:'Night games'},slot:{maps:['slot'],name:'Day games'},all:{maps:['prime','slot'],name:'Record'}};\n"
     "/* (app v132) the levels the tab draws and counts: Extreme off the tab (the job still takes and grades it) */\n"
     "const SP_SHOW=['safe','med','aggr'];\n"
     "const spShowT=list=>Array.isArray(list)?list.filter(t=>t&&SP_SHOW.includes(String(t.id).replace(/^elo-/,''))):list;\n"
     "/* the sections a visitor folded this page load */\n"
     "const SP_FOLD=new Set();\n"
     "/* (app v132) Day games off on a Sunday from 4pm Eastern */\n"
     "function spDayOff(now){ const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',hourCycle:'h23'}).formatToParts(new Date(now==null?Date.now():now)).map(x=>[x.type,x.value]));\n"
     "  return p.weekday==='Sun'&&+p.hour>=16; }", 'SP_SEC')
sub1('p3', "  const out=PB_TIERS.map(([id,label])=>({id:pre+id,label,graded:0,won:0,lost:0,push:0,fair:0,fairN:0,model:0,units:0,bt:0}));",
     "  const out=PB_TIERS.filter(([id])=>SP_SHOW.includes(id)).map(([id,label])=>({id:pre+id,label,graded:0,won:0,lost:0,push:0,fair:0,fairN:0,model:0,units:0,bt:0}));",
     'spRecSum: the levels shown')
sub1('p3', "  sec=SP_SEC[sec]?sec:'night'; kind=SP_KIND[kind]?kind:'model';",
     "  sec=SP_SEC[sec]?sec:'all'; kind=SP_KIND[kind]?kind:'model';", 'spRecSum: default all')
sub1('p3', "const spSecHtml=(sec,body)=>`<section class=\"sp-sec\" data-sp-sec=\"${sec}\" aria-labelledby=\"spsec-${sec}\"><h3 class=\"sp-sech\" id=\"spsec-${sec}\">${SP_SEC[sec].name}</h3>${spRecHtml(sec)}${body}</section>`;",
     "const spSecHtml=(sec,body)=>`<details class=\"sp-sec\" data-sp-sec=\"${sec}\"${SP_FOLD.has(sec)?'':' open'}><summary class=\"sp-sum\"><h3 class=\"sp-sech\" id=\"spsec-${sec}\">${SP_SEC[sec].name}</h3></summary>${sec==='all'?spRecHtml(sec):''}${body}</details>`;\n"
     "if(typeof document!=='undefined') document.addEventListener('toggle',e=>{ const d=e.target;\n"
     "  if(d&&d.matches&&d.matches('details.sp-sec[data-sp-sec]')){ const s=d.dataset.spSec; if(d.open) SP_FOLD.delete(s); else SP_FOLD.add(s); } },true);",
     'spSecHtml: folding, the record in its own section')
sub1('p3', "function spSetsHtml(on){ return spSecHtml('night',spNightHtml(on))+spSecHtml('slot',spSlotHtml(on)); }",
     "function spSetsHtml(on){ return spSecHtml('all','')+(spDayOff()?'':spSecHtml('slot',spSlotHtml(on)))+spSecHtml('night',spNightHtml(on)); }",
     'spSetsHtml: record, Day games, Night games')
sub1('p3', "<div class=\"pb-tiers\" data-sp-kind=\"model\">${v.tiers.map(",
     "<div class=\"pb-tiers\" data-sp-kind=\"model\">${spShowT(v.tiers).map(", 'spGameHtml: no Extreme card')
sub1('p3', "<div class=\"pb-tiers\" data-sp-kind=\"elo\">${v.elo.map(",
     "<div class=\"pb-tiers\" data-sp-kind=\"elo\">${spShowT(v.elo).map(", 'spGameHtml: no Extreme Elo pick')
sub1('p3', "Object.assign(window,{spPrime,", "Object.assign(window,{spDayOff,SP_SHOW,spPrime,", 'window')
sub1('p1', ".sp-sech{margin:0;",
     ".sp-sum{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:8px;list-style:none}\n"
     ".sp-sum::-webkit-details-marker{display:none}\n"
     ".sp-sum::before{content:'\\25BE';font-size:14px;color:var(--ink-2);transition:transform .15s}\n"
     "details.sp-sec:not([open])>.sp-sum::before{transform:rotate(-90deg)}\n"
     ".sp-sech{margin:0;", 'part1: the fold styles')
for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v132, the record on its own, Day games first, folding, no Extreme, Day games off Sunday 4pm')
