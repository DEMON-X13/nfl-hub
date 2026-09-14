"""app v30: a "scores two or more" touchdown line.
  * Each RB/WR/TE touchdown block gains a second row, 2+ touchdowns. The chance
    comes from the model's own any-time chance p: touchdowns are treated as
    Poisson with rate lam = -ln(1-p), so P(2+) = 1 - e^-lam (1 + lam). That is an
    assumption (no separate multi-TD model). Priced at the model's estimate; the
    odds pull carries no 2+ market.
  * One touchdown line per player: ticking 2+ replaces 1+, like the rungs.
  * Settles on the actual touchdown count. Stats ingested before this version
    kept only a yes/no flag, so a 2+ row on those games shows a dash.
"""
from pathlib import Path

HERE = Path(__file__).parent


def edit(path, pairs):
    p = HERE / path
    s = p.read_text(encoding="utf-8")
    for old, new in pairs:
        assert s.count(old) == 1, (path, s.count(old), old[:80])
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8", newline="\n")
    print("patched", path)


edit("part2.js", [
    ("function isGameLeg(l){",
     "/* chance of k or more touchdowns from the any-time chance p, touchdowns treated as Poisson */\n"
     "function tdPlus(p,k){ const lam=-Math.log(Math.max(1e-9,1-Math.min(p,1-1e-9))); let s=0,t=1; for(let i=0;i<k;i++){ s+=t; t*=lam/(i+1); } return Math.max(0,Math.min(1,1-Math.exp(-lam)*s)); }\n"
     "function isGameLeg(l){"),
    ("  if(l.stat==='any_td') return v>=1?'win':'loss';\n  if(l.main){",
     "  if(l.stat==='any_td'){ const k=l.k||1; if(k>=2){ if(a.tds==null) return null; return a.tds>=k?'win':'loss'; } return v>=1?'win':'loss'; }\n  if(l.main){"),
    ("const APP_BUILD='app v29 \\u00b7 2026-09-14';", "const APP_BUILD='app v30 \\u00b7 2026-09-14';"),
])

TD_OLD = """          const tk=legKey(g.id,x.pl.id,'any_td'), ton=!!S.parlay[tk];
          const tod=oddsFor(g.id,x.pl.id,'any_td',1);
          html+=`<div class="statblk"><h4>Touchdown</h4>
            <table class="rungs"><tr class="${ton?'on':''}">
            <td class="pick">${locked?(()=>{const a=(haveStats?actualFor(g.w,x.pl.id):null); return a?(a.any_td>=1?'<span class="res win">\\u2713</span>':'<span class="res loss">\\u2717</span>'):'<span class="res">\\u2013</span>';})():`<input type="checkbox" ${ton?'checked':''} data-leg="${tk}" data-k="1" data-side="over" aria-label="Add ${esc(x.pl.n)} to score a touchdown">`}</td>
            <td class="thr">Scores one</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${(l.p*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(l.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
            <td class="num est">${fmtML(bookPrice(l.p))}<em>est.</em></td>
            <td class="num book real">${tod!=null?fmtML(tod):''}</td></tr></table></div>`;
          continue;"""
TD_NEW = """          const tk=legKey(g.id,x.pl.id,'any_td'), tcur=S.parlay[tk]; const ton=!!tcur&&(tcur.k||1)<2, ton2=!!tcur&&tcur.k===2;
          const tod=oddsFor(g.id,x.pl.id,'any_td',1);
          const p2=tdPlus(l.p,2), [c2,lbl2]=confTier(p2);
          const ta=(locked&&haveStats)?actualFor(g.w,x.pl.id):null;
          const tmark=hit=>hit==null?'<span class="res">\\u2013</span>':(hit?'<span class="res win">\\u2713</span>':'<span class="res loss">\\u2717</span>');
          html+=`<div class="statblk"><h4>Touchdown</h4>
            <table class="rungs"><tr class="${ton?'on':''}">
            <td class="pick">${locked?tmark(ta?ta.any_td>=1:null):`<input type="checkbox" ${ton?'checked':''} data-leg="${tk}" data-k="1" data-side="over" aria-label="Add ${esc(x.pl.n)} to score a touchdown">`}</td>
            <td class="thr">Scores one</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${c}" style="width:${(l.p*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(l.p*100).toFixed(0)}%</td><td><span class="conf ${c}">${lbl}</span></td>
            <td class="num est">${fmtML(bookPrice(l.p))}<em>est.</em></td>
            <td class="num book real">${tod!=null?fmtML(tod):''}</td></tr>
            <tr class="${ton2?'on':''}">
            <td class="pick">${locked?tmark(ta&&ta.tds!=null?ta.tds>=2:null):`<input type="checkbox" ${ton2?'checked':''} data-leg="${tk}" data-k="2" data-side="over" aria-label="Add ${esc(x.pl.n)} to score two or more touchdowns">`}</td>
            <td class="thr">Scores two or more</td>
            <td class="barcell"><div class="bar-track"><div class="bar-fill ${c2}" style="width:${Math.max(2,p2*100).toFixed(0)}%"></div></div></td>
            <td class="pct">${(p2*100).toFixed(0)}%</td><td><span class="conf ${c2}">${lbl2}</span></td>
            <td class="num est">${fmtML(bookPrice(p2))}<em>est.</em></td>
            <td class="num book real"></td></tr></table></div>`;
          continue;"""

edit("part3.js", [
    (TD_OLD, TD_NEW),
    ("  if(m.prob){ p=pr.p; label='Scores a touchdown'; price=bookPrice(p); }",
     "  if(m.prob){ const kk=k>=2?k:1; p=kk>=2?tdPlus(pr.p,kk):pr.p; label=kk>=2?`Scores ${kk}+ touchdowns`:'Scores a touchdown'; price=bookPrice(p); k=kk; }"),
    ("  o.any_td=(o.rushing_tds+o.receiving_tds)>=1?1:0;",
     "  o.tds=o.rushing_tds+o.receiving_tds;   /* count, for the 2+ line */\n  o.any_td=o.tds>=1?1:0;"),
])

edit("audit.js", [
    ("'legRho','gameBet','settleLeg','gameMu'].map(F);",
     "'legRho','gameBet','settleLeg','gameMu','tdPlus'].map(F);"),
    ("  const [gameCtx,rosterFor,statLines,project,pOver,fairLine,rungView,marketLine,marketMu,devigOver,bookImplied,bookPrice,probToAmerican,mlToDec,parlayProb,modelMargin,modelPoints,legRho,gameBet,settleLeg,gameMu]=",
     "  const [gameCtx,rosterFor,statLines,project,pOver,fairLine,rungView,marketLine,marketMu,devigOver,bookImplied,bookPrice,probToAmerican,mlToDec,parlayProb,modelMargin,modelPoints,legRho,gameBet,settleLeg,gameMu,tdPlus]="),
    ("  /* ---- G. state flow: upload, grade, rollover, backup round trip ---- */",
     "  /* ---- K. two or more touchdowns ---- */\n"
     "  { const lam=-Math.log(0.5); chk(Math.abs(tdPlus(0.5,2)-(1-Math.exp(-lam)*(1+lam)))<1e-12&&Math.abs(tdPlus(0.5,1)-0.5)<1e-12,'tdPlus formula wrong');\n"
     "    chk(tdPlus(0.6,2)<0.6&&tdPlus(0.6,3)<tdPlus(0.6,2)&&tdPlus(0.01,2)<0.001,'tdPlus not decreasing in k');\n"
     "    const wk=Object.keys(S.actuals||{})[0]; const pid=wk?Object.keys(S.actuals[wk])[0]:null;\n"
     "    if(pid){ const a=S.actuals[wk][pid]; const keep={...a}; a.tds=2; a.any_td=1;\n"
     "      chk(settleLeg({week:+wk,pid,stat:'any_td',k:2})==='win'&&settleLeg({week:+wk,pid,stat:'any_td',k:3})==='loss'&&settleLeg({week:+wk,pid,stat:'any_td',k:1})==='win','2+ touchdown settlement wrong');\n"
     "      delete a.tds; chk(settleLeg({week:+wk,pid,stat:'any_td',k:2})===null,'2+ on a yes/no-only stat line should stay pending'); Object.assign(a,keep); }\n"
     "    const gk=S.sched.find(x=>x.w===1&&!F('gameStarted')(x)); d.querySelector('[data-game=\"'+gk.id+'\"]').click();\n"
     "    const rb=[...d.querySelectorAll('.plrbtn')].find(b=>/RB1|WR1/.test(b.textContent)); rb.click();\n"
     "    const c2=d.querySelector('.plrbody [data-leg$=\"|any_td\"][data-k=\"2\"]'); chk(!!c2,'no 2+ touchdown checkbox');\n"
     "    if(c2){ c2.checked=true; c2.dispatchEvent(new w.Event('change')); const L=Object.values(S.parlay).find(l=>l.stat==='any_td'); chk(!!L&&L.k===2&&/2\\+ touchdowns/.test(L.label)&&L.p<0.5,'2+ leg did not land');\n"
     "      const c1=d.querySelector('.plrbody [data-leg$=\"|any_td\"][data-k=\"1\"]'); c1.checked=true; c1.dispatchEvent(new w.Event('change')); const L1=Object.values(S.parlay).filter(l=>l.stat==='any_td'); chk(L1.length===1&&L1[0].k===1,'ticking 1+ should replace 2+, not add');\n"
     "      c1.checked=false; c1.dispatchEvent(new w.Event('change')); }\n"
     "    d.getElementById('backBtn').click();\n"
     "    console.log(`K. touchdowns: P(2+|p=0.5)=${(tdPlus(0.5,2)*100).toFixed(1)}%, settlement and toggling ok`); }\n\n"
     "  /* ---- G. state flow: upload, grade, rollover, backup round trip ---- */"),
])
print("done")
