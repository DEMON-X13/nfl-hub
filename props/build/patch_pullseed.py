"""Seed the credit-pull record for the pull that is already in this build.

Week 1's prices came in with the build committed as "props: refresh 2026-09-14
23:31 UTC", so that is the time of the last real pull. Recording it means the
panel shows a time straight away instead of waiting for the next Thursday build,
and from then on weekly.py keeps the file current.

Also tightens audit section N, which read the fallback branch only because
nothing had been recorded yet.
"""
import json
from pathlib import Path

DATA = Path(__file__).parent.parent / 'data'
AUDIT = Path(__file__).with_name('audit.js')

REC = {'at': '2026-09-14T23:31', 'week': 1, 'credits_left': None}
(DATA / 'pricepull.json').write_text(json.dumps(REC, indent=1) + '\n', encoding='utf-8')

pay = json.loads((DATA / 'payload.json').read_text(encoding='utf-8'))
pay['price_pull'] = REC
(DATA / 'payload.json').write_text(json.dumps(pay, separators=(',', ':')), encoding='utf-8')
print(f"payload carries price_pull {REC['at']} for week {REC['week']}")

s = AUDIT.read_text(encoding='utf-8')
OLD = """    /* no build record: falls back to the date the main lines were priced */
    const meta=PAY.mkt_meta||{}; const lastW=Object.keys(meta).sort((a,b)=>b-a)[0];
    F('renderPricePull')();
    chk(/Last credit pull/.test(box.textContent),'panel does not say when credits were last spent');
    if(lastW&&meta[lastW].asof) chk(box.textContent.includes(meta[lastW].asof),'panel does not carry the priced-on date');
    for(const wk of Object.keys(PAY.prices||{}))
      chk(box.textContent.includes(`week ${wk}: ${PAY.prices[wk].length.toLocaleString()}`),`panel does not count week ${wk}'s prices`);
    /* a build that did pull: the time and what is left of the month's credits */
    const keep=PAY.price_pull;
"""
NEW = """    const keep=PAY.price_pull;
    /* what this build actually carries: a recorded pull, with a time */
    chk(keep&&keep.at,'no credit pull recorded in the payload');
    F('renderPricePull')();
    chk(/Last credit pull/.test(box.textContent),'panel does not say when credits were last spent');
    chk(/\\d{1,2}:\\d\\d/.test(box.textContent),'panel shows no time of day for the pull');
    for(const wk of Object.keys(PAY.prices||{}))
      chk(box.textContent.includes(`week ${wk}: ${PAY.prices[wk].length.toLocaleString()}`),`panel does not count week ${wk}'s prices`);
    /* no record at all: falls back to the date the main lines were priced */
    const meta=PAY.mkt_meta||{}; const lastW=Object.keys(meta).sort((a,b)=>b-a)[0];
    PAY.price_pull=null; F('renderPricePull')();
    if(lastW&&meta[lastW].asof) chk(box.textContent.includes(meta[lastW].asof),'fallback does not carry the priced-on date');
    chk(/date only/.test(box.textContent),'fallback does not say it has the date alone');
"""
assert s.count(OLD) == 1
s = s.replace(OLD, NEW)
OLD2 = "    console.log(`N. credit pull: panel present, ${Object.keys(PAY.prices||{}).length} week(s) of prices counted, sheet controls gone`); }"
NEW2 = "    console.log(`N. credit pull: ${keep&&keep.at} for week ${keep&&keep.week}, ${Object.keys(PAY.prices||{}).length} week(s) of prices counted, sheet controls gone`); }"
assert s.count(OLD2) == 1
AUDIT.write_text(s.replace(OLD2, NEW2), encoding='utf-8', newline='\n')
print('audit section N now reads the recorded pull first')
