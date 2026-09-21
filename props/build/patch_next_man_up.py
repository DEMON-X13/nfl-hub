"""When a depth-chart starter is ruled out, the next man on the chart steps up.

rosterFor() sorts each position by depth-chart rank and keeps the players whose rank is
inside the slots the position gets (one quarterback, three backs, four receivers, two
tight ends). A player ruled out is dropped before that, but the ranks stay as the chart
printed them: with Kyler Murray out, Carson Wentz was still QB2 and still outside the
one quarterback slot, and Max Brosmer, on no depth chart at all, walked in through the
other door -- an unranked player is kept on projected usage alone, and eleven projected
attempts clears that floor. So the Vikings' game showed Brosmer at quarterback the week
Wentz started, with Wentz nowhere on the page.

The rank used for the cut is now the player's place among the ranked players who are
still available: Wentz becomes the first quarterback the moment Murray is out. The chart's
own rank is kept for the label, so he still reads QB2, which is what the chart says.
"""
import io
p='part2.js'
s=io.open(p,encoding='utf-8').read()
old="""      const cut=pool.filter(x=>x.gp>=3&&(x.rank!=null?x.rank<=DEPTH[grp]:x.use>=USE_FLOOR[grp]))
                    .slice(0,DEPTH[grp]);"""
new="""      /* a ruled-out starter is gone from the pool already, so the chart's ranks are re-counted
         over who is left: the next man up takes the slot rather than an unranked player with
         enough projected usage to walk in on his own */
      let place=0; for(const x of pool) x.eff=x.rank!=null?++place:null;
      const cut=pool.filter(x=>x.gp>=3&&(x.eff!=null?x.eff<=DEPTH[grp]:x.use>=USE_FLOOR[grp]))
                    .slice(0,DEPTH[grp]);"""
assert s.count(old)==1
s=s.replace(old,new)
old2="const APP_BUILD='app v58 \\u00b7 2026-09-21';"
new2="const APP_BUILD='app v59 \\u00b7 2026-09-21';"
assert s.count(old2)==1
io.open(p,'w',encoding='utf-8').write(s.replace(old2,new2))
print('next man up; app v59')
