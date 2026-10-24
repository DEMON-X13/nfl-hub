"""app v133: Suggested Parlays' sections no longer fold.

The owner's call of 24 October 2026, on app v132's folding sections: "actually can you not make it able to minimize. the
layout looks weird". Record, Day games and Night games are plain sections again, each its heading (h3.sp-sech, in the
order and with the record app v132 gave them) and no summary, arrow or fold: `SP_FOLD`, its toggle listener and the
`.sp-sum` styles are gone.
"""
import io
FILES = {'p1': 'part1.html', 'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'SP_FOLD' in T['p3'], 'patch_sp_nofold.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v132 \\u00b7 2026-10-23';", "const APP_BUILD='app v133 \\u00b7 2026-10-24';", 'APP_BUILD')
sub1('p3', "/* the sections a visitor folded this page load */\nconst SP_FOLD=new Set();\n", "", 'SP_FOLD')
sub1('p3', "const spSecHtml=(sec,body)=>`<details class=\"sp-sec\" data-sp-sec=\"${sec}\"${SP_FOLD.has(sec)?'':' open'}><summary class=\"sp-sum\"><h3 class=\"sp-sech\" id=\"spsec-${sec}\">${SP_SEC[sec].name}</h3></summary>${sec==='all'?spRecHtml(sec):''}${body}</details>`;\n"
     "if(typeof document!=='undefined') document.addEventListener('toggle',e=>{ const d=e.target;\n"
     "  if(d&&d.matches&&d.matches('details.sp-sec[data-sp-sec]')){ const s=d.dataset.spSec; if(d.open) SP_FOLD.delete(s); else SP_FOLD.add(s); } },true);",
     "/* (app v133) a plain section, no fold */\n"
     "const spSecHtml=(sec,body)=>`<section class=\"sp-sec\" data-sp-sec=\"${sec}\" aria-labelledby=\"spsec-${sec}\"><h3 class=\"sp-sech\" id=\"spsec-${sec}\">${SP_SEC[sec].name}</h3>${sec==='all'?spRecHtml(sec):''}${body}</section>`;",
     'spSecHtml: a plain section')
sub1('p1', ".sp-sum{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:8px;list-style:none}\n"
     ".sp-sum::-webkit-details-marker{display:none}\n"
     ".sp-sum::before{content:'\\25BE';font-size:14px;color:var(--ink-2);transition:transform .15s}\n"
     "details.sp-sec:not([open])>.sp-sum::before{transform:rotate(-90deg)}\n", "", 'part1: no fold styles')
for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v133, no folding sections')
