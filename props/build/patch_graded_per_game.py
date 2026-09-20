"""A game has stats when that game has been graded, not when its week has.

renderGame asked S.actuals[week], which is written the moment any one game in the week is
graded. Week 2 holds stat rows for one game -- Thursday night -- and on that basis every
other game in the week claimed to have stats too. So a game still being played showed
"did not play" against every player on both rosters, which is not merely unhelpful: it
says something false about a man who is at that moment on the field.

The app already tracks this exactly, per game: S.processedGames[id] is set by ingestStats
when that game is folded in. renderGame uses it now.

The knock-on is the point of the change: a game that is not graded yet is one the live
box score can speak for, so the Sunday-afternoon game in a week whose Thursday game is
already settled now shows live numbers instead of a wrong "did not play".
"""
import io

p='part3.js'
s=io.open(p,encoding='utf-8').read()
old="  const locked=gameStarted(g), fin=gameFinal(g), haveStats=!!(S.actuals&&S.actuals[String(g.w)]);"
new=("  const locked=gameStarted(g), fin=gameFinal(g);\n"
     "  /* this game's stats, not its week's: one graded game used to make the whole week claim\n"
     "     stats it did not have, and every other game in it said \"did not play\" */\n"
     "  const haveStats=!!(S.processedGames&&S.processedGames[g.id]&&S.actuals&&S.actuals[String(g.w)]);")
assert s.count(old)==1
io.open(p,'w',encoding='utf-8').write(s.replace(old,new))
print('renderGame is per game now')
