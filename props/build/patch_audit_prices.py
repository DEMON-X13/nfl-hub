"""Audit section N: the credit-pull panel replaced the price sheet."""
from pathlib import Path

A = Path(__file__).with_name('audit.js')
s = A.read_text(encoding='utf-8')
assert 'N. credit pull' not in s, 'already patched'

ANCHOR = "\n  /* ---- H. week-2 projections still sane after update ---- */"
NEW = """
  /* ---- N. the credit-pull panel, in place of the old price sheet ---- */
  { const box=d.getElementById('pricePull');
    chk(!!box,'the Weekly Update tab has no credit-pull panel');
    for(const id of ['oddsLegs','oddsTemplate','oddsUpload','oddsClear','oddsWeekSel','oddsFile','oddsStatus'])
      chk(d.getElementById(id)===null,`price sheet control still on the page: ${id}`);
    for(const id of ['fetchGames','statsLink','rosLink','injLink','dcLink','upAll','allFiles'])
      chk(d.getElementById(id)!==null,`free download/upload control went missing: ${id}`);
    /* no build record: falls back to the date the main lines were priced */
    const meta=PAY.mkt_meta||{}; const lastW=Object.keys(meta).sort((a,b)=>b-a)[0];
    F('renderPricePull')();
    chk(/Last credit pull/.test(box.textContent),'panel does not say when credits were last spent');
    if(lastW&&meta[lastW].asof) chk(box.textContent.includes(meta[lastW].asof),'panel does not carry the priced-on date');
    for(const wk of Object.keys(PAY.prices||{}))
      chk(box.textContent.includes(`week ${wk}: ${PAY.prices[wk].length.toLocaleString()}`),`panel does not count week ${wk}'s prices`);
    /* a build that did pull: the time and what is left of the month's credits */
    const keep=PAY.price_pull;
    PAY.price_pull={at:'2026-09-17T14:03',week:2,credits_left:389};
    F('renderPricePull')();
    chk(/for week 2\\./.test(box.textContent),'panel ignores the recorded pull week');
    chk(box.textContent.includes('389 credits left this month'),'panel does not show the credits left');
    chk(!/date only/.test(box.textContent),'panel still claims it only has a date');
    PAY.price_pull={at:'2026-09-17T14:03',week:2,credits_left:1};
    F('renderPricePull')();
    chk(box.textContent.includes('1 credit left'),'credits left is not singular at one');
    PAY.price_pull=keep; F('renderPricePull')();
    console.log(`N. credit pull: panel present, ${Object.keys(PAY.prices||{}).length} week(s) of prices counted, sheet controls gone`); }

  /* ---- H. week-2 projections still sane after update ---- */"""
assert s.count(ANCHOR) == 1
A.write_text(s.replace(ANCHOR, NEW), encoding='utf-8', newline='\n')
print('audit section N added')
