# -*- coding: utf-8 -*-
"""The Send to Live Parlays step goes: a saved parlay is watched the moment it is saved.

The live page is a section of the Parlay Builders tab now, standing where the Saved
parlays card stood, so the list of what is saved and the view of how it is doing are one
card. Nothing has to be sent from one to the other any more, and the button that did the
sending, the mark that said a parlay had been sent, the link to the page and the writer
behind them all come out. What stays of that card is drawn by the section.

The prop model's admin page keeps the old card for a manual run or a backup, without the
button.
"""
import io
p3='part3.js'
s=io.open(p3,encoding='utf-8').read()
def sub1(old,new,what):
    global s
    assert s.count(old)==1, what+': found '+str(s.count(old))
    s=s.replace(old,new)
sub1("""  /* which of these the live page is watching: the mark on each card below */
  const watch=liveWatch();
  /* gold, not green: it goes somewhere, it does not do something */
  const lvLink=`<a href="../liveparlays/" target="_blank" rel="noopener" style="color:#8A5E05;font-size:12px;font-weight:600;text-decoration:none;border-bottom:1px solid rgba(138,94,5,.4)">Live tracking ↗</a>`;
  let html=`<div class="card" id="savedCard"><h2 style="display:flex;align-items:center;gap:10px">Saved parlays <span class="pill">${list.length}</span><span class="grow" style="flex:1"></span>${lvBar}${lvLink}</h2>`;""",
"""  let html=`<div class="card" id="savedCard"><h2 style="display:flex;align-items:center;gap:10px">Saved parlays <span class="pill">${list.length}</span><span class="grow" style="flex:1"></span>${lvBar}</h2>`;""",'saved heading')
sub1("""        ${liveHas(p,watch)?'<span class="pill">sent</span>':''}
""",'','sent mark')
sub1("""    <button class="btn" id="sendLive" style="background:linear-gradient(180deg,#8B5CF6,#6D28D9)" title="Put the parlays in this section on the live page, where they are followed while the games are on">Send to Live Parlays</button>
""",'','send button')
sub1("""  $('sendLive')?.addEventListener('click',()=>{
    const n=sendToLive(S.saved||[]);
    if(n<0) log('This browser would not let anything be stored, so nothing was sent.','err');
    else log(n?`${n} parlay${n===1?'':'s'} sent to the live page.`:'Those parlays are already on the live page.','ok');
    renderParlay(); });
""",'','send wiring')
io.open(p3,'w',encoding='utf-8').write(s)

p2='part2.js'
s=io.open(p2,encoding='utf-8').read()
a=s.index("/* ---------- the live page's watchlist, written across ----------")
b=s.index("/* ---------- live tracking: ESPN's public feeds ----------")
assert 0<a<b
s=s[:a]+s[b:]
old="const APP_BUILD='app v63 \\u00b7 2026-09-21';"
new="const APP_BUILD='app v64 \\u00b7 2026-09-22';"
assert s.count(old)==1
io.open(p2,'w',encoding='utf-8').write(s.replace(old,new))
print('saved is live; app v64')
