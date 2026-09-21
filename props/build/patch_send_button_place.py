# -*- coding: utf-8 -*-
"""The send button moves down beside Clear saved parlays, and the live page gets its own link.

The first cut put a full-sized green button in the card's heading, where it was the
biggest thing on a card that is mostly numbers, and its label counted what was left to
send -- a number nobody asked for and one that moved under the reader.

It sits in the footer bar now, to the left of Clear saved parlays, at the size of the
buttons beside it, and it says one thing: Send to Live Parlays. It sends whatever is in
the section; the ones already over there are skipped as they always were, and the log
says how many actually went. Which parlays are on the live page is still marked on each
card.

The link moves to the top right of the heading, reads "Live tracking", and is gold
rather than green so it does not read as a second button. The spacer that pushes it
there carries its own flex, because .grow only means anything inside a .bar and the
heading is not one -- which is why the Live checkbox never sat right either.
"""
import io
p='part3.js'
s=io.open(p,encoding='utf-8').read()

# the heading: no button, no count, a gold link at the right
start="  /* which of these the live page is watching, so the button can count rather than guess */"
end="""  let html=`<div class="card" id="savedCard"><h2 style="display:flex;align-items:center;gap:10px">Saved parlays <span class="pill">${list.length}</span>${sendBtn}${lvBar}</h2>`;"""
assert s.count(start)==1 and s.count(end)==1
a=s.index(start); b=s.index(end)+len(end)
new = """  /* which of these the live page is watching: the mark on each card below */
  const watch=liveWatch();
  /* gold, not green: it goes somewhere, it does not do something */
  const lvLink=`<a href="../liveparlays/" target="_blank" rel="noopener" style="color:#8A5E05;font-size:12px;font-weight:600;text-decoration:none;border-bottom:1px solid rgba(138,94,5,.4)">Live tracking ↗</a>`;
  let html=`<div class="card" id="savedCard"><h2 style="display:flex;align-items:center;gap:10px">Saved parlays <span class="pill">${list.length}</span><span class="grow" style="flex:1"></span>${lvBar}${lvLink}</h2>`;"""
s=s[:a]+new+s[b:]

# lvBar carried the spacer that pushed it right; the heading owns that now, so the link
# sits at the end whether or not anything is live
old="""  const lvBar=!anyLive?'':`<span class="grow"></span>
    <label class="muted sp-live">"""
new="""  const lvBar=!anyLive?'':`<label class="muted sp-live">"""
assert s.count(old)==1
s=s.replace(old,new)

old="""  html+=`<div class="bar" style="margin:12px 0 0"><span class="grow"></span><button class="btn danger" id="savedClear">Clear saved parlays</button></div></div>`;"""
new="""  html+=`<div class="bar" style="margin:12px 0 0"><span class="grow"></span>
    <button class="btn go" id="sendLive" style="padding:6px 12px;font-size:13px" title="Put the parlays in this section on the live page, where they are followed while the games are on">Send to Live Parlays</button>
    <button class="btn danger" id="savedClear">Clear saved parlays</button></div></div>`;"""
assert s.count(old)==1
s=s.replace(old,new)
io.open(p,'w',encoding='utf-8').write(s)

p2='part2.js'
s=io.open(p2,encoding='utf-8').read()
old="const APP_BUILD='app v61 \\u00b7 2026-09-21';"
new="const APP_BUILD='app v62 \\u00b7 2026-09-21';"
assert s.count(old)==1
io.open(p2,'w',encoding='utf-8').write(s.replace(old,new))
print('send button beside Clear, Live tracking link top right; app v62')
