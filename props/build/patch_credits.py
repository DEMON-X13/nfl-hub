"""The odds-API balance, on every build and on the page.

/v4/sports carries the quota headers and does not count against the quota, so
data/credits.py can read the balance for nothing. weekly.py now runs it on every
build, price pull or not, and bakes the result in beside the price-pull record.
The Weekly Update panel shows both: when credits were last spent, and what is
left of the month.

Also records how many credits a pull actually used, not just what was left after.
"""
from pathlib import Path

HERE = Path(__file__).parent
W = HERE / 'weekly.py'
J = HERE / 'part3.js'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ------------------------------------------------------------------ weekly.py
sub1(W, """            left=re.findall(r'remaining (\\d+)',out)
            json.dump({'at':datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M'),
                       'week':week,'credits_left':int(left[-1]) if left else None},
                      open(os.path.join(DATA,'pricepull.json'),'w',encoding='utf-8'))""",
      """            left=re.findall(r'remaining (\\d+)',out); used=re.findall(r'credits used (\\d+)',out)
            spent=(int(used[-1])-int(used[0])) if len(used)>1 else None
            json.dump({'at':datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M'),
                       'week':week,'credits_left':int(left[-1]) if left else None,'credits_spent':spent},
                      open(os.path.join(DATA,'pricepull.json'),'w',encoding='utf-8'))""")

# the balance check is free, so it runs on every build, before the bake
sub1(W, """    # 4. payload + bake""",
      """    # 3b. the odds-API balance. /v4/sports does not count against the quota, so this
    #     runs whether or not prices were pulled and costs nothing either way.
    rc,out=run([PY,'credits.py'],DATA,'credits')
    say('  '+(out.strip().splitlines()[-1] if out.strip() else 'balance not checked'))
    # 4. payload + bake""")

sub1(W, """        try: pay['price_pull']=json.load(open(os.path.join(DATA,'pricepull.json'),encoding='utf-8'))
        except Exception: pass""",
      """        for k,fn in (('price_pull','pricepull.json'),('credits','credits.json')):
            try: pay[k]=json.load(open(os.path.join(DATA,fn),encoding='utf-8'))
            except Exception: pass""")

# ------------------------------------------------------------------- part3.js
sub1(J, """  let head, sub;
  if(pp&&pp.at){
    head=`Last credit pull: <b>${fmt(pp.at)}</b>, for week ${pp.week}.`;
    sub=counts+(pp.credits_left!=null?` \\u00b7 ${pp.credits_left} credit${pp.credits_left===1?'':'s'} left this month`:'');
  } else {
    const w=Object.keys(meta).sort((a,b)=>b-a)[0];
    head=(w&&meta[w].asof)?`Last credit pull: <b>${meta[w].asof}</b>, for week ${w}.`:'No credit pull recorded in this build.';
    sub=counts+' \\u00b7 this build recorded the date only; later builds record the time and the credits left';
  }
  el.innerHTML=`<div>${head}</div><div class="muted">${sub}</div>`;""",
      """  let head, sub;
  if(pp&&pp.at){
    head=`Last credit pull: <b>${fmt(pp.at)}</b>, for week ${pp.week}`
        +(pp.credits_spent!=null?`, ${pp.credits_spent} credit${pp.credits_spent===1?'':'s'} spent`:'')+'.';
    sub=counts;
  } else {
    const w=Object.keys(meta).sort((a,b)=>b-a)[0];
    head=(w&&meta[w].asof)?`Last credit pull: <b>${meta[w].asof}</b>, for week ${w}.`:'No credit pull recorded in this build.';
    sub=counts+' \\u00b7 this build recorded the date only; later builds record the time and the credits left';
  }
  /* the balance is read on every build from an endpoint that costs nothing */
  const c=PAY.credits; let bal='';
  if(c&&c.left!=null){
    const total=c.used!=null?c.used+c.left:null;
    const low=total?c.left/total<0.2:false;
    bal=`<div${low?' class="warn"':''}><b>${c.left.toLocaleString()}</b> credit${c.left===1?'':'s'} left`
       +(total?` of ${total.toLocaleString()} this month`:'')
       +(c.used!=null?`, ${c.used.toLocaleString()} used`:'')
       +(c.at?` <span class="muted">\\u00b7 checked ${fmt(c.at)}</span>`:'')+'</div>';
  }
  el.innerHTML=`<div>${head}</div><div class="muted">${sub}</div>${bal}`;""")

# -------------------------------------------------------------------- audit.js
sub1(A, """    PAY.price_pull=keep; F('renderPricePull')();""",
      """    PAY.price_pull=keep;
    /* the balance, read free on every build */
    const kc=PAY.credits;
    PAY.credits={at:'2026-09-17T14:05',used:131,left:369}; F('renderPricePull')();
    chk(/369 credits left of 500 this month, 131 used/.test(box.textContent.replace(/\\s+/g,' ')),'panel does not report the balance');
    chk(!/class="warn"/.test(box.innerHTML),'a comfortable balance should not be flagged');
    PAY.credits={at:'2026-09-17T14:05',used:451,left:49}; F('renderPricePull')();
    chk(/class="warn"/.test(box.innerHTML),'a balance under a fifth of the month is not flagged');
    PAY.credits={at:'2026-09-17T14:05',used:499,left:1}; F('renderPricePull')();
    chk(/1 credit left/.test(box.textContent),'credits left is not singular at one');
    PAY.credits=null; F('renderPricePull')();
    chk(!/credits left/.test(box.textContent),'panel invents a balance when none was read');
    PAY.credits=kc; F('renderPricePull')();""")
sub1(A, """    PAY.price_pull={at:'2026-09-17T14:03',week:2,credits_left:1};
    F('renderPricePull')();
    chk(box.textContent.includes('1 credit left'),'credits left is not singular at one');
""", """    PAY.price_pull={at:'2026-09-17T14:03',week:2,credits_left:389,credits_spent:112};
    F('renderPricePull')();
    chk(box.textContent.includes('112 credits spent'),'panel does not say what the pull cost');
""")
sub1(A, """    chk(box.textContent.includes('389 credits left this month'),'panel does not show the credits left');
    chk(!/date only/.test(box.textContent),'panel still claims it only has a date');""",
      """    chk(!/date only/.test(box.textContent),'panel still claims it only has a date');""")

print('credits wired into weekly.py, the panel and the audit')
