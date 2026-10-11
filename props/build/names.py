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
for that week. The book's name has to be one of the player's names (names_of: his full name,
his football name with his surname, and his own first name with his surname, which is how
DraftKings prints Zonovan Knight, whom the roster calls Bam Knight), or differ from one only in a
short first name (Cam for Cameron, Kenny for Kenneth: one starts the other, or they share four
letters; or a nickname in nicknames.json: Drew for Andrew, which is how DraftKings prints Andrew
Ogletree), or be a two-word name with its words swapped (DraftKings prints Jordan James of the
49ers as James Jordan; nobody of that name is in the league). Every week of 2026 from week 2
priced those three and none of their rows was placed. An exact name is taken first; a short,
nickname or swapped one only when no name in the game is exactly the book's. One player matches
or none does: two is ambiguous, and an ambiguous name is never guessed at (weekly.py reports it).

The audit applies the same rule (nameRule in audit.js, reading the same nicknames.json) to every
line and price the payload carries, so a looser rule here that the audit lacks fails the audit.
"""
import csv, json, os, re, unicodedata
from collections import defaultdict

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
    """every name a roster row gives the player, his full name first, each once: the football name
    with his surname where the football name is not his first name, and his first name with his
    surname where that is not his full name. weekly.py writes the others into the payload's roster
    entry, where the audit reads them."""
    full = (r.get('full_name') or '').strip()
    first, last = (r.get('first_name') or '').strip(), (r.get('last_name') or '').strip()
    fb = (r.get('football_name') or '').strip()
    out, seen = [], set()
    for n in (full, f"{fb} {last}".strip() if fb and fb != first else '', f"{first} {last}" if first and last else ''):
        k = norm(n)
        if k and k not in seen: seen.add(k); out.append(n)
    return out


def name_rule(book, full, alias=None):
    """'exact', 'short', 'swapped' or None: is this book name this player? alias is another of
    his names, or a list of them"""
    others = alias if isinstance(alias, (list, tuple)) else ([alias] if alias else [])
    return _rule(norm(book), tuple(norm(n) for n in [full, *others] if n))


def _rule(b, names):
    """b and names already normalised: the closest way b is one of the names, or None"""
    if not b: return None
    if b in names: return 'exact'
    bp = b.split()
    if len(bp) < 2: return None
    split = [f.split() for f in names]
    if any(len(pp) >= 2 and bp[1:] == pp[1:] and _short_form(bp[0], pp[0]) for pp in split): return 'short'
    if len(bp) == 2 and any(pp == bp[::-1] for pp in split): return 'swapped'
    return None


class Pool:
    """who could be behind a name in a given game.

    roster: rows of the season's roster file. stats: rows of the season's weekly player stats.
    sched: the payload's schedule (id, w, a, h)."""

    def __init__(self, roster, stats, sched):
        self.who = {}                       # gsis -> [his names (names_of), roster team]
        for r in roster:
            g = (r.get('gsis_id') or '').strip()
            if not g: continue
            self.who[g] = [names_of(r), (r.get('team') or '').strip()]
        self.played = {}                    # (week, gsis) -> team he played for that week
        for r in stats:
            g = (r.get('player_id') or '').strip()
            try: w = int(float(r.get('week') or 0))
            except ValueError: continue
            if not g or not w: continue
            self.played[(w, g)] = (r.get('team') or '').strip()
            if g not in self.who: self.who[g] = [[(r.get('player_display_name') or '').strip()], (r.get('team') or '').strip()]
        self.games = {g['id']: g for g in sched}
        self._cands = {}
        self.week_teams = defaultdict(set)
        for g in sched: self.week_teams[int(g['w'])] |= {g['a'], g['h']}

    def team_in(self, week, gsis):
        return self.played.get((week, gsis)) or self.who.get(gsis, [None, None])[1]

    def candidates(self, week, teams):
        key = (week, tuple(sorted(teams)))
        if key not in self._cands:
            self._cands[key] = [(g, tuple(norm(n) for n in v[0])) for g, v in self.who.items() if self.team_in(week, g) in teams]
        return self._cands[key]

    def match(self, book, week, gid=None):
        """(gsis, how) or (None, 'unmatched' | 'ambiguous'). how is 'exact', 'short' (a short
        first name or a nickname) or 'swapped'. 'unmatched' is nobody in the game by any rule (a
        player the pool has no row for there, such as a signing the roster file has not caught up
        with, or a name no rule reaches); 'ambiguous' is two or more players the name could be.
        Without the game only an exact name among the week's players will do."""
        g = self.games.get(gid) if gid else None
        teams = {g['a'], g['h']} if g else self.week_teams.get(week, set())
        cands, b = self.candidates(week, teams), norm(book)
        if not g:
            # a line from before the lines carried their game: the whole week's players, and
            # where a name is shared, or is a short form, only the ones who played that week
            cands = [c for c in cands if _rule(b, c[1])]
            played = [c for c in cands if (week, c[0]) in self.played]
            for pool, kinds in ((cands, ('exact',)), (played, ('exact',)), (played, ('exact', 'short'))):
                hit = {c[0] for c in pool if _rule(b, c[1]) in kinds}
                if len(hit) == 1: return hit.pop(), kinds[-1]
            return None, ('ambiguous' if len({c[0] for c in cands}) > 1 else 'unmatched')
        how = defaultdict(set)
        for c in cands:
            k = _rule(b, c[1])
            if k: how[k].add(c[0])
        if len(how['exact']) == 1: return next(iter(how['exact'])), 'exact'
        if how['exact']: return None, 'ambiguous'
        loose = how['short'] | how['swapped']
        if len(loose) == 1:
            pid = next(iter(loose))
            return pid, ('short' if pid in how['short'] else 'swapped')
        return None, ('ambiguous' if loose else 'unmatched')


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
