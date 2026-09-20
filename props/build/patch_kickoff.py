"""espnGames carries the kickoff time (app v54).

The scoreboard mapper kept the score, the state and the clock but threw the kickoff away,
so anything reading it had no way to put games in the order they are played. The live
tracker wants exactly that: a parlay whose games kick off at one o'clock should sit above
one that does not start until the night game.

One field, straight off the event, and null when the feed does not carry it.
"""
from pathlib import Path

HERE = Path(__file__).parent
J2 = HERE / 'part2.js'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


sub1(J2, """    out[g.id]={eid:String(e.id),home:h,away:a,hs:espnNum(home.score),as:espnNum(away.score),
      state:st.state==='post'?'post':(st.state==='in'?'live':'pre'),clock:String(st.shortDetail||st.detail||'')};""",
     """    /* the kickoff, so a reader can put games in the order they are played */
    const when=Date.parse(String(e.date||c.date||''));
    out[g.id]={eid:String(e.id),home:h,away:a,hs:espnNum(home.score),as:espnNum(away.score),
      state:st.state==='post'?'post':(st.state==='in'?'live':'pre'),clock:String(st.shortDetail||st.detail||''),
      kick:isFinite(when)?when:null};""")

sub1(A, """      chk(mp['2026_02_CAR_ATL'].state==='live'&&mp['2026_02_CAR_ATL'].eid==='401','the state or the event id is wrong');""",
     """      chk(mp['2026_02_CAR_ATL'].state==='live'&&mp['2026_02_CAR_ATL'].eid==='401','the state or the event id is wrong');
      chk(mp['2026_02_CAR_ATL'].kick===null,'a scoreboard with no date should leave the kickoff null, not NaN');
      { const SBD=JSON.parse(JSON.stringify(SB)); SBD.events[0].date='2026-09-20T17:00Z';
        const k=espnGames(SBD,[{id:'2026_02_CAR_ATL',h:'ATL',a:'CAR',w:2}])['2026_02_CAR_ATL'].kick;
        chk(k===Date.parse('2026-09-20T17:00Z'),'the kickoff time did not come through'); }""")

sub1(J2, "const APP_BUILD='app v53 \\u00b7 2026-09-20';", "const APP_BUILD='app v54 \\u00b7 2026-09-20';")

print('espnGames carries the kickoff; app v54')
