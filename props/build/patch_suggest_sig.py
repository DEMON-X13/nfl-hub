"""The week's suggested parlays kept the answer from before the stats arrived.

getSuggestions() caches buildSuggestions() under a signature -- week, games kicked off,
the size of the price table, the payload build, the schedule length -- and rebuilds only
when that changes. The candidates it ranks are filtered on games played (a player needs
three), which comes from the stats that have been counted, and the signature said nothing
about those. So when stats landed after the first draw, or when a week's suggestions had
been drawn with no stats and the stats then applied, the card went on showing the answer
from before, "No suggestions for week 2 yet", while buildSuggestions() itself found a tier.

The audit caught it the day every week 2 game but one had kicked off: with no team legs
left to change the signature on their own, the stale card was all that was left, the save
button it looked for was not there, and the props job would have refused to commit.

The signature now carries the count of games whose stats have been counted and the margin
setting, which the same-game engine's signature already carried. The cost is one rebuild
when stats arrive, which is exactly when the answer changes.
"""
import io, re
p='part3.js'
s=io.open(p,encoding='utf-8').read()
old="  const sig=[w,started,JSON.stringify(S.odds||{}).length,PAY.baked_at||'',S.sched.length].join('|');"
new=("  /* everything the candidates are filtered and priced on: a player needs three games played,\n"
     "     which is the stats that have been counted, so those are part of it */\n"
     "  const sig=[w,started,JSON.stringify(S.odds||{}).length,PAY.baked_at||'',S.sched.length,\n"
     "    Object.keys(S.processedGames||{}).length,S.margin||''].join('|');")
assert s.count(old)==1
io.open(p,'w',encoding='utf-8').write(s.replace(old,new))
p2='part2.js'
s2=io.open(p2,encoding='utf-8').read()
old2="const APP_BUILD='app v57 \\u00b7 2026-09-20';"
new2="const APP_BUILD='app v58 \\u00b7 2026-09-21';"
assert s2.count(old2)==1
io.open(p2,'w',encoding='utf-8').write(s2.replace(old2,new2))
print('suggestion cache follows the stats; app v58')
