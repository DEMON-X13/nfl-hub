"""DraftKings' lines for free: the player lines (with no prices) and the game lines (with prices) read
from ESPN's free feed before each kickoff (the owner, 15 October 2026: "if we can get free odd pulls
without the prices and have you come up with a formula that gives the closest of what your best guess
would be of that money price, that would be fine"). The feed needs no key and costs no credit. The page
prices each leg the paid pull has no price for from the line read here (part2.js estPrice, marked est.),
and a real DraftKings price from the paid pull always wins for its leg; nothing in the model changes.

    python3 espn_lines.py --week 6        (from props/build) read week 6, write data/espn_wk6.json

weekly.py runs it on every run of the props job, scheduled or catch-up, priced or not and with --no-odds
too, after payload.py (it reads the schedule and the roster) and before the bake, which reads the file
(weekly.py --offline bakes the file on disk and reads nothing). It is soft: it never refuses a run, and
the last good read stands for any game it could not read.

What it reads, for the week the job is on:
  * the scoreboard (site.api.espn.com): each event's id, kickoff and clubs, and DraftKings' moneylines,
    spread and total with their prices (real prices, not estimates), whose bet links carry DraftKings'
    event id and outcome ids. An event is matched to a game by games.csv's espn column, else by the
    unordered pair of clubs within the week: never by home and away, which ESPN can write either way at
    a neutral site; the game lines are written by club for the same reason;
  * each event's player lines (sports.core.api.espn.com, provider 100, DraftKings), every page to its
    pageCount at limit=1000 (anything larger silently becomes 25 a page), with a cache-buster (without
    one Varnish serves a copy up to about 15 minutes old). A 404 there is DraftKings having posted no
    player lines for the game yet (ESPN says "No propBets found"), not a failure.
Every request goes through lib/netfetch.py (three waits of 5, 15 and 30 seconds, out of a retry budget of
three minutes for this process), the read stops after DEADLINE seconds, and two games in a row that do
not answer end it: an outage costs the run a few minutes, never its timeout.

A game is read only while its kickoff is to come: the feed changes until about three minutes after
kickoff, partly with in-play values, then freezes and drops the ladders. The kickoff is the earlier of
ESPN's and the schedule's, and a read whose last answer (the server's Date header, or the runner's clock
if later) is at or after it is thrown away. ESPN's lastUpdated is never used for timing: it is labelled Z
but has run three hours ahead of UTC, and the offset may move when daylight saving ends. A game's read
time is the Date header of its last answer.

From each item: type.id, the athlete's ESPN id (the number after /athletes/) and current.target.value
(the line); the feed carries no price and no side. Main lines (MAIN) come as two identical items, the
Over and the Under, and keep their one value (two different values for one player and stat take the
latest lastUpdated, a relative order only, and are logged); milestones (MILE) are the ladder rungs, k
meaning k+; type 31 is the anytime touchdown, offered with no target. Everything else is counted and
ignored. An athlete is placed by nflverse's roster espn_id -> gsis_id (the payload's pid), never by club
(ESPN can list a traded player in his new club's game); one the roster has no id for is looked up once
for his name (at most NAME_MAX a run) and placed with names.Pool within the game's two clubs, the price
rows' own rule; one still unplaced goes in the game's unmatched list and the report.

The file, data/espn_wk{W}.json (indent 1, written whole or not at all, and committed with props/data):
  games[gid] = {event, dk_event, kickoff (ESPN's), read_at, frozen, lines {pid: {stat: L}},
                open {pid: {stat: the opening line where it differs}}, rungs {pid: {stat: [k, ...]}},
                td [pid, ...], game {mla, mlh, sp, spa, sph, tot, tov, tou, at, ids}, unmatched, counts}
  The game block is in the payload's own terms: sp is games.csv's spread_line (positive when the home
  side is favoured), and ids are keyed as the payload's dk is ('team:SEA|ml', 'team:DEN|ats|2.5',
  'game|total|over|40.5'). Each game stands on its own: one read on this run replaces its entry, one not
  read keeps it, and once its kickoff has passed it is frozen and never rewritten, so the last read
  before kickoff stands. read_at is null for a game DraftKings has posted no player lines for yet.
  last_ok is the last run that read everything it tried; run says what this run did.

A read is treated as failed, and the last entry kept, on a network error after netfetch's tries, a body
that is not JSON or has no items and pageCount, a page size that is not the limit asked for (the limit
rule changed), fewer than MAP_SHARE of a game's athletes placed by id, or no main line at all across
every game within NEAR_H hours of kickoff. Those four, and a junk body, say ESPN's feed has changed:
each is a problem (red after the commit, never a refusal). One run that cannot reach ESPN is logged
only; weekly.py's ESPN step turns no good read for STALE_H hours with a game within SOON_H hours to come
into a problem (stale_problem).

The bake (weekly.py) reads: every espn_wk*.json of the season for the game lines (game_rows: DraftKings
rows dated by their read, beside the paid pull's gamelines_wk*.csv rows, the fresher winning, so a week
already played keeps the line its games were graded on); the current week's for PAY.espn and
PAY.espn_meta (payload_block); and ESPN's DraftKings event and game-line ids for the games still to come
where the paid pull has none (dk_fill), so the parlay card can open those games on DraftKings. At a
rollover weekly.py's archive_other_seasons() moves these files with the week's price files.
test_espn.py holds all of it to its cases on a local server with recorded answers."""
import argparse
import csv
import datetime
import email.utils
import json
import os
import re
import shutil
import sys
import tempfile
import time
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
RAW = os.path.join(PKG, 'raw')
DATA = os.path.join(PKG, 'data')
ROOT = os.path.dirname(PKG)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, 'lib'))
import netfetch  # noqa: E402  lib/netfetch.py: the download rule the NFL jobs share
from season import SEASON, GAMES, STATS, ROSTER  # noqa: E402

SITE = 'https://site.api.espn.com'
CORE = 'https://sports.core.api.espn.com'
HEADERS = {'User-Agent': 'prop-model-weekly/1.0'}
DK = '100'                  # ESPN's provider id for DraftKings
LIMIT = 1000                # items a page; anything above 1000 silently becomes 25
MAX_PAGES = 5               # a week-6 event needed two; more says the limit has changed
WAITS = (5, 15, 30)         # netfetch's waits for one request
TIMEOUT = 60                # seconds of silence before a try is given up
RETRY_BUDGET = 180          # seconds of retry waits for the whole read
DEADLINE = 480              # seconds; the read stops asking after this, and unread games keep their entry
FAIL_STOP = 2               # games in a row that do not answer end the read
NAME_MAX = 30               # athlete look-ups a run, for ids the roster does not have
MAP_SHARE = 0.8             # the share of a game's athletes the roster's espn_id must place
MAP_MIN = 10                # ... judged on a game with at least this many athletes
NEAR_H = 36                 # a game this close to kickoff has DraftKings' main lines up
STALE_H = 24                # no good read for this long ...
SOON_H = 48                 # ... with a game this close to come is a problem
ESPN_AB = {'WSH': 'WAS', 'LAR': 'LA', 'JAC': 'JAX'}      # ESPN's code -> ours, where they differ (part2.js ESPN_AB)
HOW = ("DraftKings' player lines (no prices) and game lines (with prices) read from ESPN's free feed before "
       "each kickoff; written by props/build/espn_lines.py, never by hand")

# ESPN's type ids -> the page's stats
MAIN = {'8': 'passing_yards', '9': 'completions', '10': 'passing_tds', '11': 'carries', '12': 'rushing_yards',
        '13': 'receiving_yards', '14': 'receptions', '15': 'passing_interceptions', '16': 'attempts',
        '20': 'scrim_yards', '22': 'kick_pts', '24': 'fg_made'}
MILE = {'194': 'passing_yards', '207': 'completions', '198': 'passing_tds', '201': 'carries', '196': 'rushing_yards',
        '195': 'receiving_yards', '202': 'receptions', '199': 'passing_interceptions', '200': 'attempts',
        '197': 'scrim_yards', '203': 'kick_pts', '205': 'fg_made'}
ANY_TD = '31'


class Junk(ValueError):
    """an answer that is not the JSON asked for"""


class Stop(Exception):
    """the read has run out of time, or ESPN has stopped answering"""


def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


def stamp(t):
    return t.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ') if t else None


def parse_stamp(s):
    try:
        t = datetime.datetime.fromisoformat(str(s or '').strip().replace('Z', '+00:00'))
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=datetime.timezone.utc)


def http_date(s):
    try:
        t = email.utils.parsedate_to_datetime(s) if s else None
    except (TypeError, ValueError):
        return None
    if t is not None and t.tzinfo is None:
        t = t.replace(tzinfo=datetime.timezone.utc)
    return t


def num(v):
    """a line as the file writes it: 25 for 25.0, 220.5; None for anything that is not a finite number"""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if f != f or f in (float('inf'), float('-inf')):
        return None
    return int(f) if f.is_integer() else f


def dk_point(x):
    """a point as JavaScript's String(number) writes it (weekly.py dk_point): 79.5, 80, -3"""
    f = float(x)
    return str(int(f)) if f.is_integer() else repr(f)


def american(s):
    """'+120', '-142', 'EVEN' -> 120, -142, 100; None otherwise"""
    t = str(s if s is not None else '').strip().upper()
    if t in ('EVEN', 'EV'):
        return 100
    try:
        v = int(float(t))
    except ValueError:
        return None
    return v if abs(v) >= 100 else None


def line_num(s):
    """'+2.5', '-2.5', 'o40.5', 'u40.5', 'PK' -> 2.5, -2.5, 40.5, 40.5, 0"""
    t = str(s if s is not None else '').strip().lower().lstrip('ou')
    if t in ('pk', 'pick', 'even'):
        return 0
    return num(t)


def club(abbr):
    u = str(abbr or '').strip().upper()
    return ESPN_AB.get(u, u)


def espn_id(v):
    s = str(v or '').strip()
    if s.endswith('.0'):
        s = s[:-2]
    return s if s.isdigit() else ''


def athlete_of(item):
    m = re.search(r'/athletes/(\d+)', str(((item or {}).get('athlete') or {}).get('$ref') or ''))
    return m.group(1) if m else None


def guard_ko(espn_ko, sched_ko):
    """the earlier of ESPN's kickoff and the schedule's (either may be None)"""
    ks = [k for k in (espn_ko, sched_ko) if k]
    return min(ks) if ks else None


# ---- the requests -------------------------------------------------------------------------------

def scoreboard_url(season, week):
    return f'{SITE}/apis/site/v2/sports/football/nfl/scoreboard?dates={season}&seasontype=2&week={week}'


def props_url(event, page):
    return (f'{CORE}/v2/sports/football/leagues/nfl/events/{event}/competitions/{event}/odds/{DK}/propBets'
            f'?lang=en&region=us&limit={LIMIT}&page={page}&_={int(time.time() * 1000)}')


def athlete_url(season, aid):
    # built from the id, never by following a URL the answer carries
    return f'{CORE}/v2/sports/football/leagues/nfl/seasons/{season}/athletes/{aid}?lang=en&region=us'


class Ctx:
    """one read's requests: through netfetch to a scratch file, the answer parsed as JSON, dated by its
    Date header; the deadline and the count of requests and bytes kept here"""

    def __init__(self, clock, log, tmp=None, deadline=None):
        self.clock, self.log = clock, log
        self.tmp = tmp or tempfile.mkdtemp(prefix='espn_')
        self.own_tmp = tmp is None
        self.deadline = time.monotonic() + (DEADLINE if deadline is None else deadline)
        self.requests = self.bytes = 0
        self.stop = None
        self.fails_in_row = 0

    def get(self, url):
        if self.stop:
            raise Stop(self.stop)
        if time.monotonic() > self.deadline:
            self.stop = f'the read ran past its {DEADLINE // 60} minutes'
            raise Stop(self.stop)
        dest = os.path.join(self.tmp, f'r{self.requests}.json')
        info = {}
        self.requests += 1
        try:
            netfetch.download(url, dest, timeout=TIMEOUT, min_bytes=2, headers=HEADERS, waits=WAITS,
                              log=lambda m: self.log('  ' + m.strip()), info=info)
            body = open(dest, 'rb').read()
        finally:
            if os.path.exists(dest):
                os.remove(dest)
        self.bytes += len(body)
        try:
            data = json.loads(body)
        except ValueError:
            raise Junk(f'an answer that is not JSON ({len(body)} bytes: {body[:60]!r})')
        return data, http_date(info.get('date'))

    def close(self):
        if self.own_tmp:
            shutil.rmtree(self.tmp, ignore_errors=True)


def read_props(ctx, event):
    """{status: ok | none | failed | shape | skipped, items, date, pages, why} for one event's player lines"""
    items, date, pages, page = [], None, 1, 1
    try:
        while page <= pages:
            try:
                d, date = ctx.get(props_url(event, page))
            except netfetch.FetchError as e:
                if e.code == 404 and page == 1:
                    ctx.fails_in_row = 0
                    return {'status': 'none', 'items': [], 'date': None, 'pages': 0,
                            'why': 'DraftKings has posted no player lines for it yet'}
                raise
            if not isinstance(d, dict) or not isinstance(d.get('items'), list) or not isinstance(d.get('pageCount'), int):
                return {'status': 'shape', 'why': f'page {page} has no items and pageCount (keys: {sorted(d)[:8] if isinstance(d, dict) else type(d).__name__})'}
            if page == 1:
                pages = d['pageCount']
                size = d.get('pageSize')
                if size is not None and size != LIMIT:
                    return {'status': 'shape', 'why': f'asked for {LIMIT} items a page and was given pages of {size}: the limit rule has changed'}
                if pages > MAX_PAGES:
                    return {'status': 'shape', 'why': f'{pages} pages, more than {MAX_PAGES}: the limit rule has changed'}
            if page < pages and len(d['items']) != LIMIT:
                return {'status': 'shape', 'why': f"page {page} of {pages} has {len(d['items'])} items, not {LIMIT}: the limit rule has changed"}
            items += d['items']
            page += 1
    except Junk as e:
        return {'status': 'shape', 'why': str(e)}
    except Stop as e:
        return {'status': 'skipped', 'why': str(e)}
    except netfetch.FetchError as e:
        ctx.fails_in_row += 1
        if ctx.fails_in_row >= FAIL_STOP:
            ctx.stop = f'ESPN did not answer for {FAIL_STOP} games in a row'
        return {'status': 'failed', 'why': str(e)}
    ctx.fails_in_row = 0
    return {'status': 'ok', 'items': items, 'date': date, 'pages': max(pages, 1)}


# ---- what an answer holds -----------------------------------------------------------------------

def parse_items(items):
    """(per athlete {aid: {lines: {stat: (L, lastUpdated, open)}, rungs: {stat: set}, td: bool}},
    counts, clashes) from one event's items"""
    per, clashes = {}, []
    c = {'items': len(items), 'main': 0, 'rungs': 0, 'td': 0, 'ignored': 0}
    for it in items:
        if not isinstance(it, dict):
            c['ignored'] += 1
            continue
        tid = str((it.get('type') or {}).get('id') or '')
        aid = athlete_of(it)
        kind = 'main' if tid in MAIN else 'rung' if tid in MILE else 'td' if tid == ANY_TD else None
        if not kind or not aid:
            c['ignored'] += 1
            continue
        a = per.setdefault(aid, {'lines': {}, 'rungs': {}, 'td': False})
        if kind == 'td':
            a['td'] = True
            continue
        L = num(((it.get('current') or {}).get('target') or {}).get('value'))
        if L is None:
            c['ignored'] += 1
            continue
        if kind == 'rung':
            a['rungs'].setdefault(MILE[tid], set()).add(L)
            continue
        stat, lu = MAIN[tid], str(it.get('lastUpdated') or '')
        op = num(((it.get('open') or {}).get('target') or {}).get('value'))
        had = a['lines'].get(stat)
        if had and had[0] != L:
            # never seen before kickoff (week 6: none of 531 pairs); the latest lastUpdated wins, an order
            # among the items, never a time
            clashes.append((aid, stat, had[0], L))
            if lu <= had[1]:
                continue
        a['lines'][stat] = (L, lu, op)
    for a in per.values():
        c['main'] += len(a['lines'])
        c['rungs'] += sum(len(v) for v in a['rungs'].values())
        c['td'] += a['td']
    return per, c, clashes


def odds_block(ev, g, at):
    """DraftKings' game lines for one scoreboard event, in the payload's own terms and by club: mla/mlh
    the away and home clubs' moneylines of the schedule (whichever ESPN calls home), sp the schedule's
    spread_line (positive when its home club is favoured), spa/sph their prices, tot/tov/tou the total and
    its over and under prices; ids DraftKings' outcome ids keyed as the payload's dk is. None where the
    event carries no DraftKings odds, or names other clubs"""
    try:
        c = ev['competitions'][0]
        side = {x['homeAway']: club(x['team']['abbreviation']) for x in c['competitors']}
    except (KeyError, IndexError, TypeError):
        return None, None
    if sorted(side.values()) != sorted([g['a'], g['h']]) or len(side) != 2:
        return None, None
    o = next((o for o in (c.get('odds') or []) if str((o.get('provider') or {}).get('id')) == DK), None)
    if not isinstance(o, dict):
        return None, None
    out, ids, events = {}, {}, set()

    def close(*path):
        x = o
        for p in path:
            x = x.get(p) if isinstance(x, dict) else None
        return x if isinstance(x, dict) else {}

    def link(cl):
        href = str(((cl.get('link') or {}).get('href')) or '')
        q = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
        pre = (q.get('preurl') or [''])[0] or href
        u = urllib.parse.urlparse(pre)
        m = re.search(r'/event/(\d+)', u.path)
        if m:
            events.add(m.group(1))
        oc = (urllib.parse.parse_qs(u.query).get('outcomes') or [''])[0].strip()
        return oc or None

    for s, team in side.items():
        cl = close('moneyline', s, 'close')
        p = american(cl.get('odds'))
        if p is not None:
            out['mla' if team == g['a'] else 'mlh'] = p
            sid = link(cl)
            if sid:
                ids[f'team:{team}|ml'] = sid
        cl = close('pointSpread', s, 'close')
        L, p = line_num(cl.get('line')), american(cl.get('odds'))
        if L is not None:
            out['sp'] = L if team == g['a'] else -L       # spread_line: the away club's own handicap
            if p is not None:
                out['spa' if team == g['a'] else 'sph'] = p
            sid = link(cl)
            if sid:
                ids[f'team:{team}|ats|{dk_point(L)}'] = sid
    for s in ('over', 'under'):
        cl = close('total', s, 'close')
        L, p = line_num(cl.get('line')), american(cl.get('odds'))
        if L is not None:
            out['tot'] = L
            if p is not None:
                out['tov' if s == 'over' else 'tou'] = p
            sid = link(cl)
            if sid:
                ids[f'game|total|{s}|{dk_point(L)}'] = sid
    link(o)
    if not out:
        return None, (sorted(events)[0] if len(events) == 1 else None)
    out['at'] = stamp(at)
    if ids:
        out['ids'] = ids
    return out, (sorted(events)[0] if len(events) == 1 else None)


# ---- one week -----------------------------------------------------------------------------------

def read_week(season, week, games, roster_rows, prev, clock=None, log=None, pool_fn=None, tmp=None, deadline=None):
    """(the new file, report lines, problems) for one week.

    games: the week's regular-season games, [{id, espn, a, h, ko}] (ko the schedule's kickoff, an aware
    UTC datetime, or None). roster_rows: the season's roster file. prev: the file as it stands (None, or
    another season's or week's, is a fresh start). pool_fn: builds names.Pool for the name look-ups, only
    when one is needed. clock: now, for tests."""
    clock = clock or utcnow
    log = log or (lambda m: print(m, flush=True))
    now = clock()
    rep, probs, shape = [], [], []
    same = isinstance(prev, dict) and prev.get('season') == season and prev.get('week') == week
    entries = {k: dict(v) for k, v in ((prev or {}).get('games') or {}).items() if isinstance(v, dict)} if same else {}
    names_seen = dict((prev or {}).get('athletes') or {}) if same else {}
    byid = {g['id']: g for g in games}
    byespn = {str(g['espn']): g for g in games if g.get('espn')}
    bypair = {frozenset((g['a'], g['h'])): g for g in games}

    def freeze():
        n = 0
        for gid, e in entries.items():
            ko = guard_ko(parse_stamp(e.get('kickoff')), (byid.get(gid) or {}).get('ko'))
            if ko and ko <= clock() and not e.get('frozen'):
                e['frozen'] = True
                n += 1
        return n

    frozen_now = freeze()
    to_come = [g for g in games if (g.get('ko') is None or g['ko'] > now) and not (entries.get(g['id']) or {}).get('frozen')]
    out = {'how': HOW, 'season': season, 'week': week, 'last_ok': (prev or {}).get('last_ok') if same else None}
    run = {'at': stamp(now), 'ok': True, 'read': 0, 'not_posted': 0, 'failed': 0, 'carried': 0, 'requests': 0}

    def finish(note):
        freeze()
        run['carried'] = sum(1 for gid, e in entries.items() if not e.get('frozen') and e.get('read_at') and gid not in done)
        run['note'] = note
        if run['ok'] and run['requests']:
            out['last_ok'] = run['at']
        out['run'] = run
        out['athletes'] = dict(sorted(names_seen.items()))
        out['games'] = dict(sorted(entries.items()))
        if shape:
            probs.append("ESPN's feed looks changed, so the read was treated as failed and the last read's lines stand: " + '; '.join(shape))
        return out, rep, probs

    done = set()
    if not to_come:
        rep.append(f'week {week}: no game still to come, nothing read' + (f' ({frozen_now} frozen at kickoff)' if frozen_now else ''))
        return finish('no game of the week still to come')

    ctx = Ctx(clock, log, tmp, deadline)
    try:
        try:
            sb, sb_date = ctx.get(scoreboard_url(season, week))
            if not isinstance(sb, dict) or not isinstance(sb.get('events'), list):
                raise Junk(f"a scoreboard with no events (keys: {sorted(sb)[:8] if isinstance(sb, dict) else type(sb).__name__})")
        except Junk as e:
            run['ok'] = False
            run['requests'] = ctx.requests
            shape.append(f'the scoreboard: {e}')
            rep.append(f'week {week}: the scoreboard could not be read ({e}); every game keeps its last read')
            return finish('the scoreboard could not be read')
        except (netfetch.FetchError, Stop) as e:
            run['ok'] = False
            run['requests'] = ctx.requests
            rep.append(f'week {week}: ESPN could not be reached ({e}); every game keeps its last read')
            return finish('ESPN could not be reached')
        sb_t = max([t for t in (sb_date, clock()) if t])
        reads, unknown = [], []
        for ev in sb['events']:
            if not isinstance(ev, dict):
                continue
            eid = str(ev.get('id') or '')
            g = byespn.get(eid)
            if not g:
                try:
                    cl = frozenset(club(x['team']['abbreviation']) for x in ev['competitions'][0]['competitors'])
                except (KeyError, IndexError, TypeError):
                    cl = frozenset()
                g = bypair.get(cl) if len(cl) == 2 else None
            if not g:
                unknown.append(eid or '?')
                continue
            ko = guard_ko(parse_stamp(ev.get('date')), g.get('ko'))
            if g not in to_come or (ko and ko <= sb_t):
                continue
            block, dk_event = odds_block(ev, g, sb_date or sb_t)
            reads.append({'g': g, 'eid': eid, 'ko': ko, 'espn_ko': parse_stamp(ev.get('date')), 'block': block, 'dk_event': dk_event})
        if unknown:
            rep.append(f"week {week}: {len(unknown)} scoreboard event(s) match no game of the schedule ({', '.join(unknown[:5])})")
        missing = [g['id'] for g in to_come if g['id'] not in {r['g']['id'] for r in reads}]
        if missing:
            rep.append(f"week {week}: not on ESPN's scoreboard, so not read: {', '.join(missing)}")

        # the player lines, game by game, each read only before its kickoff
        emap, amb = {}, set()
        for r_ in roster_rows:
            e, gs = espn_id(r_.get('espn_id')), (r_.get('gsis_id') or '').strip()
            if e and gs:
                if emap.get(e, gs) != gs:
                    amb.add(e)
                emap[e] = gs
        for e in amb:
            emap.pop(e, None)
        for r in reads:
            if r['ko'] and clock() >= r['ko']:
                r.update(status='kicked', why='kicked off before its turn came')
                continue
            r.update(read_props(ctx, r['eid']))
            if r['status'] == 'ok':
                t = r.get('date') or clock()
                if r['ko'] and max(t, clock()) >= r['ko']:
                    r.update(status='kicked', why='kicked off while it was being read')
                    continue
                r['at'] = t
                per, counts, clashes = parse_items(r['items'])
                r['per'], r['counts'], r['clashes'] = per, counts, clashes
                byid_n = sum(1 for a in per if a in emap)
                counts.update(athletes=len(per), mapped=byid_n)
                if len(per) >= MAP_MIN and byid_n < MAP_SHARE * len(per):
                    r.update(status='shape', why=f"{byid_n} of its {len(per)} athletes placed by the roster's espn_id, under {MAP_SHARE:.0%}")
            if r['status'] == 'shape':
                shape.append(f"{r['g']['id']}: {r['why']}")
        near = [r for r in reads if r['status'] in ('ok', 'none') and r['ko'] and (r['ko'] - now).total_seconds() <= NEAR_H * 3600]
        if near and not sum(r['counts']['main'] if r['status'] == 'ok' else 0 for r in near):
            why = f"no main line on any of the {len(near)} game(s) within {NEAR_H}h of kickoff"
            shape.append(why)
            for r in reads:
                if r['status'] in ('ok', 'none'):
                    r.update(status='shape', why=why)

        # athletes the roster has no espn_id for: looked up once for a name, placed by names.Pool within the game
        pool, looked = None, 0
        for r in reads:
            if r['status'] != 'ok':
                continue
            r['placed'], r['unmatched'] = {}, []
            for aid, a in r['per'].items():
                if aid in emap:
                    r['placed'][aid] = (emap[aid], 'id')
                    continue
                nm = names_seen.get(aid)
                if nm is None and looked < NAME_MAX:
                    try:
                        d, _ = ctx.get(athlete_url(season, aid))
                        nm = str((d or {}).get('fullName') or (d or {}).get('displayName') or '').strip() or None
                        looked += 1
                        if nm:
                            names_seen[aid] = nm
                    except (netfetch.FetchError, Junk, Stop) as e:
                        log(f'  athlete {aid}: not looked up ({e})')
                pid = None
                if nm:
                    if pool is None and pool_fn:
                        pool = pool_fn()
                    if pool is not None:
                        pid, _how = pool.match(nm, int(week), r['g']['id'])
                if pid:
                    r['placed'][aid] = (pid, 'name')
                else:
                    kinds = sorted(set(a['lines']) | {s + '+' for s in a['rungs']} | ({'any_td'} if a['td'] else set()))
                    r['unmatched'].append({'espn_id': aid, 'name': nm, 'kinds': kinds})

        # the entries
        for r in reads:
            g, gid, st = r['g'], r['g']['id'], r['status']
            e = entries.get(gid)
            if e and e.get('frozen'):
                continue
            if e is None:
                e = entries[gid] = {'event': r['eid'], 'dk_event': r['dk_event'], 'kickoff': stamp(r['espn_ko'] or g.get('ko')),
                                    'read_at': None, 'frozen': False, 'lines': {}, 'open': {}, 'rungs': {}, 'td': [],
                                    'game': None, 'unmatched': [], 'counts': {}}
            e['event'], e['kickoff'] = r['eid'], stamp(r['espn_ko'] or g.get('ko'))
            if r['dk_event']:
                e['dk_event'] = r['dk_event']
            if r['block']:
                e['game'] = r['block']           # the scoreboard was read before kickoff, whatever the player lines did
            if st == 'ok':
                lines, opn, rungs, td, seen = {}, {}, {}, set(), {}
                for aid, (pid, how) in sorted(r['placed'].items()):
                    if pid in seen:
                        log(f"  {gid}: ESPN ids {seen[pid]} and {aid} both place on {pid}; the first is kept")
                        continue
                    seen[pid] = aid
                    a = r['per'][aid]
                    if a['lines']:
                        lines[pid] = {s: v[0] for s, v in sorted(a['lines'].items())}
                        o = {s: v[2] for s, v in sorted(a['lines'].items()) if v[2] is not None and v[2] != v[0]}
                        if o:
                            opn[pid] = o
                    if a['rungs']:
                        rungs[pid] = {s: sorted(v) for s, v in sorted(a['rungs'].items())}
                    if a['td']:
                        td.add(pid)
                c = dict(r['counts'])
                c['named'] = sum(1 for _p, how in r['placed'].values() if how == 'name')
                e.update(read_at=stamp(r['at']), lines=lines, open=opn, rungs=rungs, td=sorted(td),
                         unmatched=sorted(r['unmatched'], key=lambda u: u['espn_id']), counts=c)
                done.add(gid)
                run['read'] += 1
                for aid, stat, a1, a2 in r['clashes']:
                    log(f'  {gid}: ESPN athlete {aid} has two {stat} lines, {a1} and {a2}; the latest is kept')
            elif st == 'none':
                run['not_posted'] += 1
                if not e.get('read_at'):
                    e['counts'] = {'items': 0}
            elif st in ('failed', 'shape', 'skipped'):
                run['failed'] += 1
                run['ok'] = False
                rep.append(f"{gid}: not read ({r['why']}); " + ('its last read stands' if e.get('read_at') else 'no read of it yet'))
            elif st == 'kicked':
                rep.append(f"{gid}: {r['why']}, so its read was thrown away" + ('; its last read before kickoff stands' if e.get('read_at') else ''))
        run['requests'] = ctx.requests
        ok_reads = [r for r in reads if r['status'] == 'ok']
        n_main = sum(r['counts']['main'] for r in ok_reads)
        n_rung = sum(r['counts']['rungs'] for r in ok_reads)
        n_td = sum(r['counts']['td'] for r in ok_reads)
        n_ath = sum(r['counts']['athletes'] for r in ok_reads)
        n_id = sum(r['counts']['mapped'] for r in ok_reads)
        n_name = sum(1 for r in ok_reads for _p, how in r['placed'].values() if how == 'name')
        unm = [f"{u['name'] or 'ESPN id ' + u['espn_id']} ({r['g']['id']})" for r in ok_reads for u in r['unmatched']]
        rep.insert(0, f"week {week}: DraftKings' lines read for {run['read']} of {len(to_come)} game(s) still to come"
                      + (f", {run['not_posted']} with no player lines posted yet" if run['not_posted'] else '')
                      + (f", {run['failed']} not read" if run['failed'] else '')
                      + f" ({ctx.requests} requests, {ctx.bytes / 1e6:.1f} MB): {n_main} main lines, {n_rung} rungs, {n_td} touchdown players; "
                      + f"{n_id + n_name} of {n_ath} athletes placed ({n_id} by ESPN id, {n_name} by name), "
                      + (f"{len(unm)} unmatched: {'; '.join(unm[:8])}{'...' if len(unm) > 8 else ''}" if unm else 'none unmatched')
                      + f"; game lines on {sum(1 for r in reads if r['block'])}")
        note = (f"read {run['read']} game(s)" + (f", {run['failed']} not read" if run['failed'] else '')
                + (f", {run['not_posted']} with no player lines yet" if run['not_posted'] else ''))
        return finish(note)
    finally:
        ctx.close()


# ---- the file -----------------------------------------------------------------------------------

def load_file(path):
    try:
        d = json.load(open(path, encoding='utf-8'))
    except (OSError, ValueError):
        return None
    return d if isinstance(d, dict) and isinstance(d.get('games'), dict) else None


def write_file(path, d):
    """whole or not at all: to a scratch file beside it, then moved into place"""
    text = json.dumps(d, indent=1, ensure_ascii=False) + '\n'
    fd, tmp = tempfile.mkstemp(prefix='.espn_', suffix='.part', dir=os.path.dirname(path) or '.')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(text)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def freeze_file(f, games, now):
    """freeze, in place, every entry of a file whose kickoff (ESPN's or the schedule's, the earlier) has
    passed; True when one was"""
    ko_of = {g['id']: g.get('ko') for g in games}
    n = 0
    for gid, e in (f.get('games') or {}).items():
        ko = guard_ko(parse_stamp(e.get('kickoff')), ko_of.get(gid)) if isinstance(e, dict) else None
        if ko and ko <= now and not e.get('frozen'):
            e['frozen'] = True
            n += 1
    return n > 0


def file_path(data, week):
    return os.path.join(data, f'espn_wk{int(week)}.json')


def load_all(data, season):
    """{week: file} for every espn_wk{W}.json in data that is of the season"""
    out = {}
    try:
        fns = os.listdir(data)
    except OSError:
        return out
    for fn in sorted(fns):
        m = re.match(r'espn_wk(\d+)\.json$', fn)
        if not m:
            continue
        d = load_file(os.path.join(data, fn))
        if d and d.get('season') == season and int(d.get('week') or 0) == int(m.group(1)):
            out[int(m.group(1))] = d
    return out


# ---- the bake (weekly.py) -----------------------------------------------------------------------

ROW_COLS = (('away_moneyline', 'mla'), ('home_moneyline', 'mlh'), ('spread_line', 'sp'), ('away_spread_odds', 'spa'),
            ('home_spread_odds', 'sph'), ('total_line', 'tot'), ('over_odds', 'tov'), ('under_odds', 'tou'))


def game_rows(files):
    """ESPN's DraftKings game lines as rows in gamelines_wk{W}.csv's shape, each dated by its read
    (pulled_at), for the bake to set beside the paid pull's: every week of the season, so a week already
    played keeps the line it was graded on"""
    rows = []
    for _w, f in sorted(files.items()):
        for gid, e in sorted((f.get('games') or {}).items()):
            b = e.get('game') if isinstance(e, dict) else None
            if not isinstance(b, dict) or not parse_stamp(b.get('at')):
                continue
            r = {'game_id': gid, 'pulled_at': b['at'], 'src': 'espn'}
            for col, k in ROW_COLS:
                v = num(b.get(k))
                r[col] = '' if v is None else str(v)
            rows.append(r)
    return rows


def payload_block(files, week, byid, now=None, kickoff=None):
    """(PAY.espn, PAY.espn_meta): the current week's games with a read of their player lines, both those
    to come and those played (frozen), {week: {gid: {at, frozen, lines, rungs, td}}}; and what the read
    last did, {at: the last good read, ok, games_read, games_carried, note}. The page reads only these.
    A game whose kickoff has passed is frozen here even if no read has run since (now, kickoff: the bake's
    clock and weekly.kickoff)"""
    f = files.get(int(week)) if week is not None else None
    games = {}
    for gid, e in sorted(((f or {}).get('games') or {}).items()):
        if gid not in byid or not isinstance(e, dict) or not e.get('read_at'):
            continue
        ko = guard_ko(parse_stamp(e.get('kickoff')), kickoff(byid[gid]) if kickoff else None)
        played = bool(now and ko and ko <= now)
        games[gid] = {'at': e['read_at'], 'frozen': bool(e.get('frozen')) or played, 'lines': e.get('lines') or {},
                      'rungs': e.get('rungs') or {}, 'td': e.get('td') or []}
    run = (f or {}).get('run') or {}
    meta = {'at': (f or {}).get('last_ok'), 'ok': bool(run.get('ok')) if f else False,
            'games_read': int(run.get('read') or 0), 'games_carried': int(run.get('carried') or 0),
            'note': run.get('note') or ('not read yet' if not f else '')}
    return ({str(int(week)): games} if games else {}), meta


def dk_fill(dk, files, byid, to_come):
    """ESPN's DraftKings event id and game-line outcome ids into the payload's dk for the games still to
    come, where the paid pull has none of its own: the same ids DraftKings gives the paid pull (0ML..._1,
    0HC...P250_1), so the parlay card can open those games on DraftKings. A game's glat (when its game
    lines were read) becomes the later of the two reads when ESPN adds an id. Returns how many were added"""
    n = 0
    for _w, f in sorted(files.items()):
        for gid, e in sorted((f.get('games') or {}).items()):
            g = byid.get(gid)
            if not g or gid not in to_come or not isinstance(e, dict) or e.get('frozen'):
                continue
            b = e.get('game') if isinstance(e.get('game'), dict) else {}
            add = dict(b.get('ids') or {})
            if e.get('dk_event'):
                add['event'] = str(e['dk_event'])
            w = str(int(g['w']))
            new = {k: str(v) for k, v in add.items() if v and k not in ((dk.get(w) or {}).get(gid) or {})}
            if not new:
                continue
            D = dk.setdefault(w, {}).setdefault(gid, {})
            D.update(new)
            n += len(new)
            at = parse_stamp(b.get('at'))
            had = parse_stamp(D.get('glat'))
            if at and (not had or at > had):
                D['glat'] = stamp(at)
    return n


def stale_problem(files, week, sched, now, kickoff):
    """a problem when no good read has been had for STALE_H hours while a game of the week kicks off
    within SOON_H; None otherwise. sched: games with w, d and t; kickoff weekly.kickoff"""
    soon = [g for g in sched if int(g.get('w') or 0) == int(week) and kickoff(g) and now < kickoff(g) <= now + datetime.timedelta(hours=SOON_H)]
    if not soon:
        return None
    f = files.get(int(week))
    last = parse_stamp((f or {}).get('last_ok'))
    if last and (now - last).total_seconds() <= STALE_H * 3600:
        return None
    since = f"since {stamp(last)} ({(now - last).total_seconds() / 3600:.0f}h)" if last else 'yet this week'
    return (f"no good read of DraftKings' lines from ESPN {since}, with {len(soon)} game(s) kicking off within {SOON_H}h: "
            f"their estimated prices rest on the last read, or on the model alone")


# ---- run from weekly.py -------------------------------------------------------------------------

def sched_games(season, week, rows):
    """the week's regular-season games from games.csv's rows: {id, espn, a, h, ko}"""
    from weekly import kickoff          # here, not at the top: weekly.py imports this module
    out = []
    for r in rows:
        if r.get('season') != str(season) or r.get('game_type') != 'REG':
            continue
        try:
            if int(float(r.get('week') or 0)) != int(week):
                continue
        except ValueError:
            continue
        out.append({'id': r['game_id'], 'espn': espn_id(r.get('espn')), 'a': r['away_team'], 'h': r['home_team'],
                    'w': int(week), 'ko': kickoff({'d': r.get('gameday'), 't': r.get('gametime')})})
    return out


def read_csv(path):
    if not os.path.exists(path):
        return []
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def main(argv=None):
    ap = argparse.ArgumentParser(description='read DraftKings\' lines from ESPN for one week into data/espn_wk{W}.json')
    ap.add_argument('--week', type=int, required=True)
    ap.add_argument('--now', help='pretend it is this UTC time (ISO), for tests')
    a = ap.parse_args(argv)
    fixed = parse_stamp(a.now) if a.now else None
    netfetch._budget['left'] = min(netfetch._budget['left'], RETRY_BUDGET)
    rows = read_csv(os.path.join(RAW, GAMES))
    games = sched_games(SEASON, a.week, rows)
    if not games:
        print(f'ESPN: week {a.week}: no game of the season on the schedule, nothing read')
        return 0
    roster = read_csv(os.path.join(RAW, ROSTER))

    def pool_fn():
        import names
        stats = [r for r in read_csv(os.path.join(RAW, STATS)) if r.get('season') == str(SEASON) and r.get('season_type') == 'REG']
        return names.Pool(roster, stats, games)
    # an earlier week's file whose last games kicked off after its last read (Monday night, read before
    # the week moved on) has them frozen now, with no request
    for w, f in sorted(load_all(DATA, SEASON).items()):
        if w < a.week and freeze_file(f, sched_games(SEASON, w, rows), fixed or utcnow()):
            write_file(file_path(DATA, w), f)
    path = file_path(DATA, a.week)
    out, rep, probs = read_week(SEASON, a.week, games, roster, load_file(path), pool_fn=pool_fn,
                                clock=(lambda: fixed) if fixed else None)
    write_file(path, out)
    for line in rep:
        print('ESPN: ' + line)
    for p in probs:
        print('ESPN PROBLEM: ' + p)
    return 0


if __name__ == '__main__':
    sys.exit(main())
