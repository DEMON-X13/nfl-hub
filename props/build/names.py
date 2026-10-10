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
for that week. The book's name has to be the player's, or his football name with his surname,
or differ only in a short first name (Cam for Cameron, Kenny for Kenneth: one starts the other,
or they share four letters). One player matches or none does: two is ambiguous, and both
unmatched and ambiguous names go to the run's problems instead of a guess.

The audit applies the same rule (nameRule in audit.js) to every line the payload carries.
"""
import csv, os, re, unicodedata
from collections import defaultdict

_SUFFIX = re.compile(r'\s+(jr|sr|ii|iii|iv|v)$')


def norm(s):
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r"[.'`-]", '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return _SUFFIX.sub('', s).strip()


def _short_form(a, b):
    """two first names that are one name: one starts the other, or four letters in common"""
    if not a or not b: return False
    lo, hi = sorted((a, b), key=len)
    return (len(lo) >= 3 and hi.startswith(lo)) or len(os.path.commonprefix([a, b])) >= 4


def name_rule(book, full, alias=None):
    """'exact', 'short' or None: is this book name this player?"""
    return _rule(norm(book), norm(full), norm(alias) if alias else None)


def _rule(b, f, a):
    if not b: return None
    if b == f or (a and b == a): return 'exact'
    bp, pp = b.split(), f.split()
    if len(bp) < 2 or len(pp) < 2 or bp[1:] != pp[1:]: return None
    return 'short' if _short_form(bp[0], pp[0]) else None


class Pool:
    """who could be behind a name in a given game.

    roster: rows of the season's roster file. stats: rows of the season's weekly player stats.
    sched: the payload's schedule (id, w, a, h)."""

    def __init__(self, roster, stats, sched):
        self.who = {}                       # gsis -> [full name, football alias, roster team]
        for r in roster:
            g = (r.get('gsis_id') or '').strip()
            if not g: continue
            full = (r.get('full_name') or '').strip()
            fb = (r.get('football_name') or '').strip()
            alias = f"{fb} {r.get('last_name') or ''}".strip() if fb and fb != (r.get('first_name') or '').strip() else None
            self.who[g] = [full, alias, (r.get('team') or '').strip()]
        self.played = {}                    # (week, gsis) -> team he played for that week
        for r in stats:
            g = (r.get('player_id') or '').strip()
            try: w = int(float(r.get('week') or 0))
            except ValueError: continue
            if not g or not w: continue
            self.played[(w, g)] = (r.get('team') or '').strip()
            if g not in self.who: self.who[g] = [(r.get('player_display_name') or '').strip(), None, (r.get('team') or '').strip()]
        self.games = {g['id']: g for g in sched}
        self._cands = {}
        self.week_teams = defaultdict(set)
        for g in sched: self.week_teams[int(g['w'])] |= {g['a'], g['h']}

    def team_in(self, week, gsis):
        return self.played.get((week, gsis)) or self.who.get(gsis, [None, None, None])[2]

    def candidates(self, week, teams):
        key = (week, tuple(sorted(teams)))
        if key not in self._cands:
            self._cands[key] = [(g, norm(v[0]), norm(v[1]) if v[1] else None)
                                for g, v in self.who.items() if self.team_in(week, g) in teams]
        return self._cands[key]

    def match(self, book, week, gid=None):
        """(gsis, how) or (None, 'unmatched' | 'ambiguous'). Without the game only an exact
        name among the week's players will do."""
        g = self.games.get(gid) if gid else None
        teams = {g['a'], g['h']} if g else self.week_teams.get(week, set())
        cands, b = self.candidates(week, teams), norm(book)
        if not g:
            # a line from before the lines carried their game: the whole week's players, and
            # where a name is shared, or is a short form, only the ones who played that week
            cands = [c for c in cands if _rule(b, c[1], c[2])]
            played = [c for c in cands if (week, c[0]) in self.played]
            for pool, kinds in ((cands, ('exact',)), (played, ('exact',)), (played, ('exact', 'short'))):
                hit = {c[0] for c in pool if _rule(b, c[1], c[2]) in kinds}
                if len(hit) == 1: return hit.pop(), kinds[-1]
            return None, ('ambiguous' if len({c[0] for c in cands}) > 1 else 'unmatched')
        exact = {c[0] for c in cands if _rule(b, c[1], c[2]) == 'exact'}
        if len(exact) == 1: return exact.pop(), 'exact'
        if exact: return None, 'ambiguous'
        short = {c[0] for c in cands if _rule(b, c[1], c[2]) == 'short'}
        if len(short) == 1: return short.pop(), 'short'
        return None, ('ambiguous' if short else 'unmatched')


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
