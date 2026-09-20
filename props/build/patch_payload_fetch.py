"""The payload stops being baked into the page and is fetched beside it instead.

props/index.html was 1.2MB because all 942KB of payload.json sat inside it as
`const PAY = {...}`. Every scheduled run rewrote the whole file, so a browser holding
the page held the data with it: until it re-downloaded the lot, every number on the
screen was whatever the build before last had said. That is the worst of the three
sites for staleness and the only one that bakes its data in -- the betting model has
fetched its state.json at runtime all along.

So the page keeps the app and the payload moves back out to the file it was built
from. The page becomes ~260KB and changes only when the code changes; the data is
fetched with no-store on every load, so it is never a stale copy.

Only one line in 2,300 read PAY at the top level (DATA_BUILD), which is why this is
a small change rather than a rewrite: everything else reads it inside a function, and
boot() was already async. It now fetches first and assigns PAY before anything runs.

The path differs per page -- the app sits in props/app/ and the published pages sit in
props/ -- so assemble.py writes the app's path and publish.js rewrites it for the two
it publishes, asserting it appears exactly once in each.

A failed fetch used to be impossible and now is not, so it says so on the page instead
of leaving a blank one.
"""
import io, re, sys

def sub1(path, old, new):
    s = io.open(path, encoding='utf-8').read()
    n = s.count(old)
    assert n == 1, '%s: expected 1 occurrence, found %d of %r' % (path, n, old[:60])
    io.open(path, 'w', encoding='utf-8').write(s.replace(old, new))

# ---- part2: DATA_BUILD cannot be read before the payload arrives
sub1('part2.js',
  "const DATA_BUILD=PAY.build||'baseline';",
  "let DATA_BUILD='baseline';   /* set by boot() once the payload is in; see loadPayload */")

# ---- part3: boot fetches the payload before it does anything else
sub1('part3.js',
  "async function boot(){\n  const saved=await store.get();",
  """/* The payload is fetched, not baked in. The page and the data are separate files so a
   data refresh does not rewrite the page, and a browser holding the page never holds
   stale numbers with it: this is asked for with no-store every single load. */
async function loadPayload(){
  const r=await fetch(DATA_URL+'?t='+Date.now(),{cache:'no-store'});
  if(!r.ok) throw new Error(DATA_URL+' returned HTTP '+r.status);
  const p=await r.json();
  if(!p||!Array.isArray(p.sched)||!Array.isArray(p.players)) throw new Error(DATA_URL+' is not a payload');
  return p;
}
function payloadFailed(e){
  const m=document.createElement('div');
  m.style.cssText='margin:18px;padding:16px 18px;border-radius:12px;background:#FAE1DE;color:#7A241A;line-height:1.6;font:15px/1.6 system-ui,sans-serif';
  m.innerHTML='<b>The season data could not be loaded.</b><br>'+String(e&&e.message||e)
    +'<br><br>This page holds no data of its own \\u2014 it reads <code>data/payload.json</code> beside it every time it opens, so that it can never show you a stale number. Reload to try again.';
  const main=document.querySelector('main')||document.body;
  main.insertBefore(m,main.firstChild);
}
async function boot(){
  try{ PAY=await loadPayload(); }catch(e){ console.error(e); payloadFailed(e); return; }
  DATA_BUILD=PAY.build||'baseline';
  const saved=await store.get();""")

# ---- part3: say when the app is up, for anything appended after it
sub1('part3.js',
  "boot();\n",
  "boot().then(()=>document.dispatchEvent(new Event('app-ready')));\n")

print('patched part2.js and part3.js')
