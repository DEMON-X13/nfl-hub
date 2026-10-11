"""A sportsbook's player name onto an nflverse player id, one game at a time.

The book prints a name; the page keys a player by his gsis id. mktbuild.py used to look the
name up among the payload's players, who are last season's, and when it found nobody it took
anyone in the league with the same surname and first initial. So Tampa's rookie Jalon Daniels,
who is in no 2025 table, became Jayden Daniels of Washington: his 184.5 passing yards sat on
Jayden's page and built three suggested parlays on the Commanders' game, and Jeremiyah Love's
rushing lines were graded as Jordan Love's in the Track Record.

Now a name is looked for only among the players of the game the line belongs to, in a table
built from this season's roster file (rookies included, and every status, so a line from a
past week finds a player since released) and, for a past week, the team he actually played
for that week. The names a player has (names_of) are of two kinds. His printed names are the
ones he plays under: his full name, and his football name with his surname. His legal form is
his own first name with his surname where that is neither, which is how DraftKings prints
Zonovan Knight, whom the roster calls Bam Knight. The legal form is a weaker claim than a printed
name: the Rams' Mike Thomas of 2019 is a Michael too, and the book's "Michael Thomas" that week
was the Saints' Michael Thomas, never him. So the book's name is tried in tiers, each taken only
when the tier before found nobody in the game:
  exact    one of a player's printed names;
  first    his legal form;
  short    one of his names with only a short first name (Cam for Cameron, Kenny for Kenneth:
           one starts the other, or they share four letters; or a nickname in nicknames.json:
           Drew for Andrew, which is how DraftKings prints Andrew Ogletree), or
  swapped  a two-word name with its words swapped (DraftKings prints Jordan James of the 49ers
           as James Jordan; nobody of that name is in the league).
Every week of 2026 from week 2 priced those three and none of their rows was placed. In a tier,
one player matches or none does. Two are ambiguous, unless exactly one of them plays a position
the book prices (season.SKILL, by the roster's position or the stats'): the roster file keeps a
released player's row all season, so Carolina's defensive back Devonta Smith stood beside the
Eagles' receiver DeVonta Smith in every Panthers-Eagles game, and the book does not price a
defensive back. Otherwise an ambiguous name is never guessed at (weekly.py reports it). Only
the exact tier looks at every player in the game; first, short and swapped look only at players
the book prices. When the player behind a name is missing from the roster file (a signing it has
not caught up with), a nickname would otherwise land his prices and main lines on a defensive back
or lineman who shares his surname, with nothing reported: the 2021 Bengals carried both the
receiver Mike Thomas and the defensive back Michael Thomas.

The audit applies the same rule (nameRule in audit.js, reading the same nicknames.json, with
each player's printed names and legal form kept apart) to every line and price the payload
carries, so a looser rule here that the audit lacks fails the audit.
"""
import csv, json, os, re, unicodedata
from collections import defaultdict
from season import SKILL

_SUFFIX = re.compile(r'\s+(jr|sr|ii|iii|iv|v)$')
_HERE = os.path.dirname(os.path.abspath(__file__))


def _nicknames():
    """first name -> the first names that are the same name by nicknames.json, both ways"""
    with open(os.path.join(_HERE, 'nicknames.json'), encoding='utf-8') as f: table = json.load(f)
    out = defaultdict(set)
    for given, nicks in table.items():
        if given.startswith('_'): continue
        for n in nicks: out[given].add(n); out[n].add(given)
    return out


NICK = _nicknames()


def norm(s):
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r"[.'`-]", '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return _SUFFIX.sub('', s).strip()


def _short_form(a, b):
    """two first names that are one name: one starts the other, four letters in common, or one
    is a nickname of the other (nicknames.json)"""
    if not a or not b: return False
    lo, hi = sorted((a, b), key=len)
    return (len(lo) >= 3 and hi.startswith(lo)) or len(os.path.commonprefix([a, b])) >= 4 or b in NICK.get(a, ())


def names_of(r):
    """(printed, legal) for a roster row: his printed names, the full name first and then his
    football name with his surname where the football name is not his first name, each once; and
    his legal form, his first name with his surname, where that is none of them ('' otherwise).
    weekly.py writes the others into the payload's roster entry, where the audit reads them."""
    full = (r.get('full_name') or '').strip()
    first, last = (r.get('first_name') or '').strip(), (r.get('last_name') or '').strip()
    fb = (r.get('football_name') or '').strip()
    printed, seen = [], set()
    for n in (full, f"{fb} {last}".strip() if fb and fb != first else ''):
        k = norm(n)
        if k and k not in seen: seen.add(k); printed.append(n)
    legal = f"{first} {last}" if first and last else ''
    return printed, ('' if norm(legal) in seen else legal)


def name_rule(book, full, alias=None, legal=None):
    """'exact', 'first', 'short', 'swapped' or None: is this book name this player, and how? alias
    is another of his printed names, or a list of them; legal is his legal form (names_of)"""
    others = alias if isinstance(alias, (list, tuple)) else ([alias] if alias else [])
    return _rule(norm(book), tuple(norm(n) for n in [full, *others] if n), norm(legal))


def _rule(b, printed, legal=''):
    """b, the printed names and the legal form already normalised: the closest way b is one of
    the player's names, or None"""
    if not b: return None
    if b in printed: return 'exact'
    if legal and b == legal: return 'first'
    bp = b.split()
    if len(bp) < 2: return None
    split = [f.split() for f in (*printed, legal) if f]
    if any(len(pp) >= 2 and bp[1:] == pp[1:] and _short_form(bp[0], pp[0]) for pp in split): return 'short'
    if len(bp) == 2 and any(pp == bp[::-1] for pp in split): return 'swapped'
    return None


class Pool:
    """who could be behind a name in a given game.

    roster: rows of the season's roster file. stats: rows of the season's weekly player stats.
    sched: the payload's schedule (id, w, a, h)."""

    def __init__(self, roster, stats, sched):
        self.who = {}                       # gsis -> [his printed names, roster team, his legal form]
        self.skill = set()                  # who plays a position the book prices, by the roster or the stats
        for r in roster:
            g = (r.get('gsis_id') or '').strip()
            if not g: continue
            printed, legal = names_of(r)
            self.who[g] = [printed, (r.get('team') or '').strip(), legal]
            if (r.get('position') or '').strip().upper() in SKILL: self.skill.add(g)
        self.played = {}                    # (week, gsis) -> team he played for that week
        for r in stats:
            g = (r.get('player_id') or '').strip()
            try: w = int(float(r.get('week') or 0))
            except ValueError: continue
            if not g or not w: continue
            self.played[(w, g)] = (r.get('team') or '').strip()
            if g not in self.who: self.who[g] = [[(r.get('player_display_name') or '').strip()], (r.get('team') or '').strip(), '']
            if (r.get('position') or '').strip().upper() in SKILL: self.skill.add(g)
        self.games = {g['id']: g for g in sched}
        self._cands = {}
        self.week_teams = defaultdict(set)
        for g in sched: self.week_teams[int(g['w'])] |= {g['a'], g['h']}
        self.by_position = {}               # (book, week, game) -> (the one taken, the others): see _one

    def team_in(self, week, gsis):
        return self.played.get((week, gsis)) or self.who.get(gsis, [None, None])[1]

    def candidates(self, week, teams):
        key = (week, tuple(sorted(teams)))
        if key not in self._cands:
            self._cands[key] = [(g, tuple(norm(n) for n in v[0]), norm(v[2])) for g, v in self.who.items() if self.team_in(week, g) in teams]
        return self._cands[key]

    def _one(self, key, *sets):
        """the one player of the first of sets (each narrower than the one before) that has just
        one; else the one player of a set at a position the book prices (a receiver beside a
        defensive back of the same name); else None: ambiguous. A tie broken by position is kept
        in by_position for the run's log."""
        for ids in sets:
            if len(ids) == 1: return next(iter(ids))
        for ids in sets:
            skill = sorted(ids & self.skill)
            if len(skill) == 1:
                self.by_position[key] = (skill[0], sorted(ids - {skill[0]}))
                return skill[0]
        return None

    def match(self, book, week, gid=None):
        """(gsis, how) or (None, 'unmatched' | 'ambiguous'). how is the tier the name was found in:
        'exact' (a printed name), 'first' (his legal form), 'short' (a short first name or a
        nickname) or 'swapped'; each tier is tried only when the one before found nobody.
        'unmatched' is nobody in the game by any rule (a player the pool has no row for there, such
        as a signing the roster file has not caught up with, or a name no rule reaches);
        'ambiguous' is two or more players in the first tier that has any, none or several of them
        at a position the book prices. Only a printed name may land on a player at a position the
        book never prices: the looser tiers look only at players it does (a signing missing from
        the roster file is never put on a defensive back or a lineman who shares his surname). Without the game only an exact or legal name among the
        week's players will do, or a short one among those who played that week."""
        g = self.games.get(gid) if gid else None
        teams = {g['a'], g['h']} if g else self.week_teams.get(week, set())
        cands, b, key = self.candidates(week, teams), norm(book), (book, week, gid)
        hit = {}
        for c in cands:
            k = _rule(b, c[1], c[2])
            if k: hit[c[0]] = k
        if not g:
            # a line from before the lines carried their game: the whole week's players, and
            # where a name is shared, or is a short form, only the ones who played that week
            played = {p for p in hit if (week, p) in self.played}
            for tier, among in (('exact', None), ('first', None), ('short', played)):
                ids = {p for p, k in hit.items() if k == tier and (among is None or p in among) and (tier == 'exact' or p in self.skill)}
                if not ids: continue
                pid = self._one(key, ids, ids & played)
                return (pid, tier) if pid else (None, 'ambiguous')
            return None, ('ambiguous' if len(hit) > 1 else 'unmatched')
        for tier in (('exact',), ('first',), ('short', 'swapped')):
            ids = {p for p, k in hit.items() if k in tier and (tier == ('exact',) or p in self.skill)}
            if not ids: continue
            pid = self._one(key, ids)
            return (pid, hit[pid]) if pid else (None, 'ambiguous')
        return None, 'unmatched'


_TEAM_ROW = re.compile(r'(d/st|defen[cs]e)$', re.I)


def is_team_row(book):
    """a team defence's touchdown price ("Denver Broncos D/ST"): not a player, nothing to match"""
    return bool(_TEAM_ROW.search(str(book or '').strip()))


def read_csv(path):
    if not os.path.exists(path): return []
    with open(path, newline='', encoding='utf-8') as f: return list(csv.DictReader(f))


def game_of(prices_rows):
    """a book name -> the one game the same pull priced him in, for a lines file written before
    the lines carried their game"""
    seen = defaultdict(set)
    for r in prices_rows:
        if r.get('player') and r.get('game_id'): seen[r['player']].add(r['game_id'])
    return {n: next(iter(gs)) for n, gs in seen.items() if len(gs) == 1}
