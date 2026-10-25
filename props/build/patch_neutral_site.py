"""app v137: a neutral site takes the home field out of a team bet's chance, as the betting app's own equation does.

The owner's call of 25 October 2026 ("do the neutral site fix"), after the check of every number the day before. The team
model (modelMargin, on PAY.grid) is the betting app's equation, Elo gap, rest, neutral and net EPA, and it passed neutral 0
on every game: the payload's schedule carried no neutral flag. So at a game played abroad the listed home side kept the
whole home field, 1.743 points (the equation's intercept) on the margin and half of it, 0.87, on the chance a team bet is
priced on once the margin is pulled halfway to the posted spread (gameMu). PIT at NO at the Stade de France read NO's chance
to win 40.6% where the app's own equation, which Alpha's calls run on, gives 38.1%; its margin with neutral read is -5.153,
Alpha's frozen pre-kickoff margin for that game to the third place (state.json's atKickoff, -5.153211). Where no line is
posted (weeks 9 to 11's Madrid, Munich and Mexico City games when this landed) the whole 1.743 moved, and with it the
implied points and spread the player projections read in a game with no line (gameCtx's model path).

Three parts, the first two outside this patch: props/data/grid_model.json's neutral coefficient is the app's MODEL.pure,
-1.7430521789557656 (minus the intercept, so a neutral site takes the home field out exactly), where the file had carried
the app's unused market variant, +0.4214, which would have added 0.42 had the flag ever been read; props/build/payload.py
writes each game's neu, 1 at a neutral site (games.csv's location, with betting/neutral_sites.json turning a 'Home' row
played abroad 'Neutral', the rule the betting job, the Joker and the betting smoke read); and here, modelMargin reads it
(neutral 1 on a game whose neu is 1, 0 on any other or on a payload baked before the flag), and applyBaked copies it from
the payload into the saved schedule.

Left as they are, on purpose: the player model's home input (gameCtx's home, the listed home side 1): it was fitted that
way (props/research/features.py codes nflverse's listed home team 1 and reads no location; 283 of the 34,666 rows of
2019-2024 were a listed home side at a neutral site), and the neutral games of 2019-2025 cannot tell 1 from 0.5 or 0 (each
stat's standard error 4 to 60 times its home coefficient), so re-coding it would be a guess made at the page alone;
modelPoints' home term (pts_model.json, the no-line total and the model's points shown on a game's page), whose fit is not
in this repo; and rest, passed as 0 as before (a change of its own). The audit's TN works the margin out on its own from
PAY.grid at every game, neutral or not, and on a planted neutral copy of a game, blocking."""
import io
FILES = {'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert "neutral:g&&g.neu===1?1:0" not in T['p2'], 'patch_neutral_site.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v136 \\u00b7 2026-10-25';", "const APP_BUILD='app v137 \\u00b7 2026-10-25';", 'APP_BUILD')

sub1('p2', """/* the team model from the other project: predicted winning margin, home side */
function modelMargin(g){
  const G=PAY.grid; if(!G) return 0;
  const h=G.teams[g.h], a=G.teams[g.a]; if(!h||!a) return 0;
  const net=(h.off_epa-h.d_off_epa)-(a.off_epa-a.d_off_epa);
  const f={elo_diff:h.elo-a.elo, rest:0, neutral:0, net_epa:net};""",
     """/* the team model from the other project: predicted winning margin, home side. A neutral site (the payload's neu,
   app v137) is read as the betting app's own equation reads it: grid_model.json's neutral coefficient is the app's
   MODEL.pure, minus the intercept, so the home field comes out exactly (PIT at NO at the Stade de France, -5.153, Alpha's
   own frozen margin); a payload baked before the flag reads every game as a home game, as before */
function modelMargin(g){
  const G=PAY.grid; if(!G) return 0;
  const h=G.teams[g.h], a=G.teams[g.a]; if(!h||!a) return 0;
  const net=(h.off_epa-h.d_off_epa)-(a.off_epa-a.d_off_epa);
  const f={elo_diff:h.elo-a.elo, rest:0, neutral:g&&g.neu===1?1:0, net_epa:net};""", 'modelMargin: the neutral flag')

sub1('p2', """  return {home:isHome?1:0, sprd:clip(teamSpread/7,-3,3), implied, src,""",
     """  /* home is the listed home side even at a neutral site: the player model was fitted on nflverse's listed home team,
     which reads no location, and the margin above already takes a neutral site's home field out of a game with no line */
  return {home:isHome?1:0, sprd:clip(teamSpread/7,-3,3), implied, src,""", 'gameCtx: home as fitted')

sub1('p3', """    for(const k of ['d','t','sp','tot','hs','as','mla','mlh','spa','sph','tov','tou']) if(p[k]!=null&&g[k]!==p[k]){ g[k]=p[k]; done.sched++; } }""",
     """    for(const k of ['d','t','sp','tot','hs','as','mla','mlh','spa','sph','tov','tou','neu']) if(p[k]!=null&&g[k]!==p[k]){ g[k]=p[k]; done.sched++; } }""",
     'applyBaked: neu')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v137, a neutral site takes the home field out of the team model')
