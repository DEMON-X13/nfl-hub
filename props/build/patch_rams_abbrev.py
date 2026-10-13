"""The Rams never matched: ESPN_AB mapped our own code away instead of ESPN's.

ESPN_AB exists to turn ESPN's abbreviation into the one our schedules use. Two of its three
entries do that -- WSH becomes WAS, JAC becomes JAX -- and the third did the opposite: it
turned LA into LAR. Both schedules, props and betting, call the Rams LA, so the mapped code
matched no game and every Rams fixture came back with no scoreboard entry at all. No error,
no blank where a score should be: the game simply was not in the map, so the live parlays
page, the props Games tab and the betting board each quietly showed nothing for it.

LAR now becomes LA, which is the direction the other two go. LA already passed through
untouched, so whichever of the two ESPN sends, it lands on ours.

Found by driving the betting board against a stubbed scoreboard built from our own schedule:
15 games with no result, 14 of them painted.
"""
import io
p='part2.js'
s=io.open(p,encoding='utf-8').read()
old="const ESPN_AB={WSH:'WAS',LA:'LAR',JAC:'JAX'};          /* where ESPN's abbreviations differ */"
new=("const ESPN_AB={WSH:'WAS',LAR:'LA',JAC:'JAX'};          /* ESPN's abbreviation -> ours, where they differ */")
assert s.count(old)==1
io.open(p,'w',encoding='utf-8').write(s.replace(old,new))
print('LAR -> LA')
