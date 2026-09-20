"""app v47: the dead weight left by the retired tabs, swept up.

Nothing on screen changes. What goes:

  * renderModel(), the How It Works renderer retired in v45. It had no caller and
    would have thrown if it got one: it writes to #modelValidation and #modelSeason,
    which no longer exist. Its four data tables (VALIDATION, CALIB, WALK, SEASONCAL,
    about 2KB) were injected into every published page by assemble.py and read only
    by it.
  * The edge chain that fed the retired price sheet: propsForGame, countEdges,
    picksForGame, betPhrase and edgeThreshold (which read S.ui.edge, a key nothing
    ever wrote), plus the orphans devig (devigOver is the live one), kelly, distFor
    (cdfBlend replaced it) and probToML (byte-identical to probToAmerican).
    fairLine stays, audit.js checks it; S.accuracy stays, audit.js checks that too.
  * part2's copies of fmtML and mlToDec. part3 declares both again, so after
    assemble.py concatenates the two the part3 copy wins and the part2 one is
    unreachable: editing it would have changed nothing.
  * CSS with no markup left: .stat and the tile strip (the games list uses .statblk),
    th.sortable, .edgecount, .bkline, .dist, .totrow, .two, .rungs .fairodds.
  * e10.js, a dev script that reads a sandbox path that does not exist in this repo.

Also: weekly.py ran assemble and audit but never publish.js, so a manual run left
props/index.html and props/admin.html stale while committing a fresh app page. It
now publishes, like the workflow does.

The part2 functions are removed by line range, each checked against its first and
last line, because brace counting trips over apostrophes in the comments and a
"cut to the next thing that looks like the end" pass ate playersFor on the first
attempt. Every step skips what is already gone, so the patch can be replayed.
"""
from pathlib import Path

HERE = Path(__file__).parent
p1, p2, p3 = HERE / 'part1.html', HERE / 'part2.js', HERE / 'part3.js'


def sub1(p, old, new=""):
    s = p.read_text(encoding='utf-8')
    if not s.count(old):
        return
    assert s.count(old) == 1, (p.name, s.count(old), old[:90])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


def cut_block(p, start_line, stop_line):
    s = p.read_text(encoding='utf-8')
    if not s.count(start_line):
        return
    assert s.count(start_line) == 1 and s.count(stop_line) == 1, (p.name, start_line[:60])
    i = s.index(start_line); j = s.index(stop_line, i)
    p.write_text(s[:i] + s[j:], encoding='utf-8', newline='\n')


# ---------- the retired How It Works renderer, and its four tables ----------
cut_block(p3, "/* ---------- how it works ---------- */", "/* ---------- track record tab ---------- */")
asm = HERE / 'assemble.py'
s = asm.read_text(encoding='utf-8')
if "VALID=[[" in s:
    i = s.index("VALID=[["); j = s.index("js = (")
    s = s[:i] + s[j:]
    s = s.replace("""js = ("const PAY=%s;\\n" % pay) + \\
     ("const WALK=%s;\\n" % json.dumps(WALK)) + \\
     ("const SEASONCAL=%s;\\n" % json.dumps(SEASONCAL)) + \\
     ("const VALIDATION=%s;\\n" % json.dumps(VALID)) + \\
     ("const CALIB=%s;\\n" % json.dumps(CALIB)) + \\
     open('part2.js').read()""",
                  """js = ("const PAY=%s;\\n" % pay) + \\
     open('part2.js').read()""")
    asm.write_text(s, encoding='utf-8', newline='\n')

# ---------- the dead functions, by line range ----------
BLOCKS = [
    ('function distFor(grp,stat,mu){', '}'),
    ('function mlToDec(ml){', None),            # one-liner
    ('function fmtML(ml){', None),              # one-liner
    ('function devig(o,u){', '}'),
    ('function kelly(p,ml,frac){', '  const f=(p*b-(1-p))/b; return Math.max(0,f)*frac; }'),
    ('function propsForGame(g){', '}'),
    ('function edgeThreshold(){', None),        # one-liner
    ('function countEdges(g){', '}'),
    ('function probToML(p){', None),            # one-liner
    ('function picksForGame(g){', '}'),
    ('function betPhrase(l){', '}'),
]
lines = p2.read_text(encoding='utf-8').split('\n')
out, i, removed = [], 0, []
while i < len(lines):
    hit = next((b for b in BLOCKS if lines[i].startswith(b[0])), None)
    if not hit:
        out.append(lines[i]); i += 1; continue
    start, last = hit
    if last is None:
        removed.append((start, 1)); i += 1; continue
    j = i + 1
    while j < len(lines) and lines[j] != last:
        assert not lines[j].startswith('function '), 'ran into %r while removing %s' % (lines[j][:40], start)
        j += 1
    assert j < len(lines), start
    removed.append((start, j - i + 1)); i = j + 1
if removed:
    p2.write_text('\n'.join(out), encoding='utf-8', newline='\n')
    for name, n in removed:
        print('%-34s %2d lines' % (name, n))

# ---------- CSS with no markup ----------
s = p1.read_text(encoding='utf-8')
before = len(s)
DEAD_CSS = ['.stat-strip{', '  .stat-strip{', '.stat{', '.stat::before{', '.stat b{', '.stat span{',
            'th.sortable{', 'th.sortable:hover{', '.edgecount{', '.edgecount small{', '.bkline{',
            '.dist{', '.totrow td{', '.two{', '.rungs .fairodds{', '.rungs .fairodds em{',
            '@media(max-width:760px){ .rungs .fairodds em{']
kept = [l for l in s.split('\n') if not any(l.startswith(d) for d in DEAD_CSS)]
s = '\n'.join(kept)
p1.write_text(s, encoding='utf-8', newline='\n')
if before != len(s):
    print('part1.html: %d bytes of dead CSS removed' % (before - len(s)))

# ---------- the dev script ----------
e10 = HERE / 'e10.js'
if e10.exists():
    e10.unlink(); print('e10.js removed')

# ---------- a manual weekly run publishes too ----------
wk = HERE / 'weekly.py'
s = wk.read_text(encoding='utf-8')
old = "    rc,out=run(['node','audit.js'],HERE,'audit')"
if 'publish.js' not in s:
    assert s.count(old) == 1
    wk.write_text(s.replace(old, old + "\n    rc,out2=run(['node','publish.js'],HERE,'publish')   # the workflow publishes too; a manual run must not leave the site stale"),
                  encoding='utf-8', newline='\n')

sub1(p2, "const APP_BUILD='app v46 \\u00b7 2026-09-19';", "const APP_BUILD='app v47 \\u00b7 2026-09-19';")
print('app v47: dead renderer, dead edge chain, duplicate declarations, dead CSS, e10.js; weekly.py publishes')
