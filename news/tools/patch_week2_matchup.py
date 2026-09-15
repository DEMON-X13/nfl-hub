"""Week 2 Matchup preview: the first bullet says something only about that team.

The bold spread sentence stays. The detail after it used to restate the same market fact from
both sides (the total, or the book's line), and Las Vegas and the Chargers were word for word
the same. Each team now gets one line from its own numbers: the clearest Deep Dive edge it has
in this game, or where it stands in the power rankings, with every rank computed here from
data/units2026.js and data/ranks2026.js, not typed.

Also fixes three Week 1 location errors: Kansas City beat Denver at home, and Baltimore won at
Indianapolis. (Denver's loss is written "at Kansas City" to match.)
"""
import json
import re
from pathlib import Path

NEWS = Path(__file__).resolve().parent.parent


def load(rel, name):
    t = (NEWS / rel).read_text(encoding="utf-8")
    i = t.index(f"const {name} = ") + len(f"const {name} = ")
    return json.loads(t[i:t.index(";\n", i)])


U = load("data/units2026.js", "UNITS26")
RK = load("data/ranks2026.js", "RANKS26")
P = NEWS / "data/week2.js"
s = P.read_text(encoding="utf-8")
w = json.loads(s[s.index("{"):s.rindex("}") + 1])

PLACE = {"ARI": "Arizona", "ATL": "Atlanta", "BAL": "Baltimore", "BUF": "Buffalo", "CAR": "Carolina", "CHI": "Chicago", "CIN": "Cincinnati",
         "CLE": "Cleveland", "DAL": "Dallas", "DEN": "Denver", "DET": "Detroit", "GB": "Green Bay", "HOU": "Houston", "IND": "Indianapolis",
         "JAX": "Jacksonville", "KC": "Kansas City", "LV": "Las Vegas", "LAC": "Chargers", "LAR": "Rams", "MIA": "Miami", "MIN": "Minnesota",
         "NE": "New England", "NO": "New Orleans", "NYG": "Giants", "NYJ": "Jets", "PHI": "Philadelphia", "PIT": "Pittsburgh", "SF": "San Francisco",
         "SEA": "Seattle", "TB": "Tampa Bay", "TEN": "Tennessee", "WAS": "Washington"}
THE = {"LAC", "LAR", "NYG", "NYJ"}   # "the Jets", "the Chargers"


def who(t, cap=False, poss=False):
    n = PLACE[t]
    if t in THE:
        n = ("The " if cap else "the ") + n
    if poss:
        n += "'" if n.endswith("s") else "'s"
    return n


def opp_adj(t):
    return PLACE[t] if t not in THE else PLACE[t]   # "a Chargers offensive line", "a Jets secondary"


def ordn(n):
    return f"{n}{'th' if 11 <= n % 100 <= 13 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def faces(me, op):
    o = U[op]
    return dict(qb=o["vs"]["passD"], ol=o["front"]["rank"], rb=o["vs"]["runD"], rec=o["db"]["rank"], front=o["ol"]["rank"], db=o["rec"]["rank"])


UNIT = {
    "qb": ("through the air", "a passing offense ranked {m}", "against a {o} pass defense ranked {v}"),
    "ol": ("up front", "an offensive line ranked {m}", "against a {o} pass and run rush ranked {v}"),
    "rb": ("on the ground", "a run game ranked {m}", "against a {o} run defense ranked {v}"),
    "rec": ("at receiver", "a receiver group ranked {m}", "against a {o} secondary ranked {v}"),
    "front": ("the pass rush", "a front seven ranked {m}", "against a {o} offensive line ranked {v}"),
    "db": ("in coverage", "a secondary ranked {m}", "against {o} receivers ranked {v}"),
}


def pron(t, kind):
    """the bold sentence already names the team, so the detail uses a pronoun"""
    plural = t in THE
    return {"subj": "They" if plural else "It", "poss": "Their" if plural else "Its", "sits": "sit" if plural else "sits"}[kind]


def art(word):
    return "an" if word[:1].upper() in "AEIO" else "a"


def fill(template, o, v):
    """put the opponent in, with a or an to match"""
    out = template.format(o=o, v=v)
    return out.replace(f"a {o}", f"{art(o)} {o}")


def edge(me, op, u):
    where, mine, vs = UNIT[u]
    m, v = ordn(U[me][u]["rank"]), ordn(faces(me, op)[u])
    return f"{pron(me, 'poss')} clearest edge is {where}, {mine.format(m=m)} {fill(vs, opp_adj(op), v)}."


def power(me, op, tail):
    a, b = RK[me]["rank"], RK[op]["rank"]
    gap = abs(a - b)
    rel = f"{gap} spot{'s' if gap != 1 else ''} {'above' if a < b else 'below'} {who(op)}"
    return f"{pron(me, 'subj')} {pron(me, 'sits')} {ordn(a)} in the power rankings, {rel}{tail}"


def unit_rank(t, u):
    return ordn(U[t][u]["rank"])


def detail(me, op):
    f = faces(me, op)
    custom = {
        "MIN": lambda: power("MIN", op, ", so the line reflects the quarterback injury more than the roster."),
        "TEN": lambda: f"It sits {ordn(RK['TEN']['rank'])} in the power rankings, and its receivers, ranked {unit_rank('TEN', 'rec')}, face a Philadelphia secondary ranked {ordn(f['rec'])}.",
        "NE": lambda: power("NE", op, f", but its offensive line ranks {unit_rank('NE', 'ol')} against a Pittsburgh front seven ranked {ordn(f['ol'])}."),
        "NYJ": lambda: f"They sit {ordn(RK['NYJ']['rank'])} in the power rankings, and their secondary, ranked {unit_rank('NYJ', 'db')}, draws Green Bay receivers ranked {ordn(f['db'])}.",
        "NO": lambda: f"Its run game ranks {unit_rank('NO', 'rb')} against a Baltimore run defense ranked {ordn(f['rb'])}, so the offense rests on <strong>Tyler Shough</strong>'s arm.",
        "CIN": lambda: power("CIN", op, ", which is why a 1-0 team is getting points."),
        "JAX": lambda: f"It sits {ordn(RK['JAX']['rank'])} in the power rankings, and its secondary ranks {unit_rank('JAX', 'db')} against Denver receivers ranked {ordn(f['db'])}.",
        "LAC": lambda: f"Their clearest edge is also the pass rush, a front seven ranked {unit_rank('LAC', 'front')} against a Las Vegas offensive line ranked {ordn(f['front'])}.",
        "ARI": lambda: power("ARI", op, ", despite a 1-0 start."),
        "SEA": lambda: f"It sits {ordn(RK['SEA']['rank'])} in the power rankings, and its secondary ranks {unit_rank('SEA', 'db')} against Arizona receivers ranked {ordn(f['db'])}.",
        "MIA": lambda: f"Its one clear edge is at receiver, a group ranked {unit_rank('MIA', 'rec')} against a San Francisco secondary ranked {ordn(f['rec'])}.",
        "IND": lambda: f"Its secondary ranks {unit_rank('IND', 'db')} and draws Kansas City receivers ranked {ordn(f['db'])}.",
        "KC": lambda: power("KC", op, f", with a front seven ranked {unit_rank('KC', 'front')} facing a Colts offensive line ranked {ordn(f['front'])}."),
    }
    if me in custom:
        return custom[me]()
    pick = {"DET": "ol", "BUF": "rb", "CAR": "rb", "ATL": "rec", "CHI": "db", "PHI": "db", "PIT": "front", "GB": "rec", "CLE": "front",
            "TB": "rec", "BAL": "db", "HOU": "db", "DEN": "front", "LV": "front", "WAS": "rb", "DAL": "qb", "SF": "qb", "NYG": "rb", "LAR": "ol"}[me]
    return edge(me, op, pick)


changed = 0
for g in w["games"]:
    for me, op in ((g["away"], g["home"]), (g["home"], g["away"])):
        old = w["teams"][me]["matchup"][0]
        m = re.match(r"(<strong>.*?</strong>)\s*(.*)", old, re.S)
        assert m, (me, old[:60])
        new = f"{m.group(1)} {detail(me, op)}"
        enc_old, enc_new = json.dumps(old, ensure_ascii=False), json.dumps(new, ensure_ascii=False)
        assert s.count(enc_old) == 1, (me, s.count(enc_old))
        s = s.replace(enc_old, enc_new)
        changed += 1
        print(f"{me}: {re.sub(r'<[^>]+>', '', new)}")
        assert "a Atlanta" not in new and "a Arizona" not in new and "a Indianapolis" not in new

for old, new in [
    ("The opener was a 31-10 win at Denver.", "The opener was a 31-10 win over Denver."),
    ("The opener was a 41-23 loss at Baltimore.", "The opener was a 41-23 home loss to Baltimore."),
    ("The opener was a 41-23 win over Indianapolis.", "The opener was a 41-23 win at Indianapolis."),
    ("The opener was a 31-10 loss to Kansas City.", "The opener was a 31-10 loss at Kansas City."),
]:
    assert s.count(old) == 1, old
    s = s.replace(old, new)

P.write_text(s, encoding="utf-8", newline="\n")
print(f"{changed} first bullets rewritten, 4 location phrases corrected")
