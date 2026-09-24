"""app v65: kickoff times in the viewer's own time zone.
  * The schedule's times are US Eastern, and the game list printed them as they came,
    "1:00pm ET", which left everyone outside the East doing the sum in their head. The
    list now turns each kickoff into an instant (kickoff(), the same one the lock uses)
    and prints it in the browser's zone with the zone's short name, "10:00 AM PDT". The
    day comes from the same instant, so a late game that crosses midnight somewhere is
    dated where the viewer is.
  * A game with no time keeps its date as the schedule gives it.
"""
from pathlib import Path

HERE = Path(__file__).parent


def edit(path, pairs):
    p = HERE / path
    s = p.read_text(encoding="utf-8")
    for old, new in pairs:
        assert s.count(old) == 1, (path, s.count(old), old[:80])
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8", newline="\n")
    print("patched", path)


edit("part3.js", [
    ("""function fmtDate(g){ if(!g.d) return {day:'',t:''};
  const dt=new Date(g.d+'T12:00:00');
  const day=dt.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  let t=''; if(g.t){ const [H,M]=g.t.split(':').map(Number);
    const h=((H+11)%12)+1, ap=H<12?'am':'pm'; t=`${h}:${String(M).padStart(2,'0')}${ap} ET`; }
  return {day,t}; }""",
     """/* the schedule's times are US Eastern; they are shown in the viewer's own zone */
function fmtDate(g){ if(!g.d) return {day:'',t:''};
  const k=g.t?kickoff(g):null, dt=k||new Date(g.d+'T12:00:00');
  const day=dt.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  const t=k?k.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'';
  return {day,t}; }"""),
])
edit("part2.js", [
    ("const APP_BUILD='app v64 \\u00b7 2026-09-22';", "const APP_BUILD='app v65 \\u00b7 2026-09-24';"),
])
