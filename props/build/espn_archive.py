"""The archive of DraftKings' player lines on ESPN: every game of the season, its open and its close, kept in the repo.

Why (27 October 2026). DraftKings' player prop lines on ESPN's free feed (the core API's propBets of provider 100, the
very feed the page's Refresh odds and the props job's read come from) are the one free source of historical prop lines
there is, and ESPN keeps them for played games only while their season is in play: every 2025 game now answers 404.
The props job publishes only the current week's read (PAY.espn, worked out again on every run) and the main lines kept
at kickoff for grading (espn_close), so a played game's lines were gone with its season. Any future props model needs a
durable history of DraftKings' opening and closing lines to be validated against, so this keeps them: research data,
held out, never fitted on while its season is the season in play (CLAUDE.md, "The archive of DraftKings' lines"), and
never read by the page or the audit.

What it reads. One game at a time, every page of
`<core>/events/<espn>/competitions/<espn>/odds/100/propBets?limit=1000&page=<n>` to its pageCount (the page's own
rules: pages of 1000, at most 5, every page but the last full), the ESPN event id games.csv's `espn`. Each item is a
market (`type`, its name and id), an athlete (`athlete.$ref`), ESPN's own opening line (`open.target.value`), the line
as it stands (`current.target.value`, frozen at kickoff: on the 94 games played by 27 October 2026 no item's
lastUpdated was more than five minutes past its kickoff) and `lastUpdated` (ESPN's label, kept as written: it says Z
and has run three hours ahead of UTC). Kept: the twelve main over/under markets the page reads (MARKETS, by ESPN's
market name, held to its id: an item whose name and id name two different markets is left out, and one with no name
goes by its id) under the page's own stat names, and the anytime touchdown scorer list (its athletes alone: it has no
line). A main line comes as two items, its Over and its Under; twins (the same athlete and market with the same open
and the same current) are kept once, and an athlete and market with two different numbers (80 of 4,945 on those 94
games) are kept as they came, in the game's `conflict`, never guessed between. An athlete is his nflverse gsis id
through the season's roster (raw/roster_<season>.csv, its espn_id beside its gsis_id; an ESPN id the roster gives two
players is mapped to neither), else `espn:<ESPN id>`; a game not yet frozen whose `espn:` key the roster maps since is
moved onto the gsis id at its next read.

When (the props job, weekly.py's step 5b, through run()). Each run reads every game of the earliest week with a game
still to come, and every game played in the last RECENT_DAYS days not yet frozen. A game is played once games.csv has
its score or OVER_H hours have passed since its kickoff; between its kickoff and then it is not read (the feed's
values are the closing ones, but nothing is gained by reading in play). A game still to come is read again on every
run, its close the latest current seen and its open ESPN's own; the first run once it has been played reads it one
more time and marks it `final`, and a final game is never read or written again. Every read merges into what is kept,
never replaces it with less: a failure, a 404 (DraftKings has posted none yet, or ESPN no longer serves the game) or a
read with nothing of these markets leaves the game exactly as it was, and an entry a later read lacks (a line
DraftKings withdrew when a player was ruled out) is kept with its last numbers and listed in the game's `gone`. A game
played more than OVER_DUE_H hours ago and still not frozen is a problem (the run goes red after its commit: ESPN stopped
serving played games, or the archive is broken), every other failure a note. --backfill (by hand) reads every played
game of the season not yet frozen, whatever its age, and the week's games to come. --offline reads nothing. Only games
of the file's own season, regular season and playoffs, that games.csv lists with an ESPN id are read or written.

Downloads go through lib/netfetch.py, the one download rule (a plain User-Agent first, then another on a 403, as the
page's reader does; a 5xx or timeout tried again after 2 and 5 seconds; a 404 at once). The file is
props/data/espn_lines_<season>.json, written whole or not at all, one game's head a line and one player's lines a line
(so a re-read game moves a line or two, never the file): `how` in it says the shape. test_espn_archive.py holds it.

    python3 espn_archive.py              the job's reads (from props/build: raw/games.csv, raw/roster_<season>.csv)
    python3 espn_archive.py --backfill   every played game of the season not yet final, and the week's to come
      --season N, --games F, --roster F, --out F, --now <ISO time>, --offline
"""
import argparse, csv, datetime, json, os, re, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
ROOT = os.path.dirname(PKG)
RAW = os.path.join(PKG, 'raw')
DATA = os.path.join(PKG, 'data')
sys.path.insert(0, os.path.join(ROOT, 'lib'))
import netfetch  # noqa: E402  lib/netfetch.py: the download rule the NFL jobs share

CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'
DK = '100'
LIMIT, MAX_PAGES = 1000, 5
# the twelve main over/under markets, ESPN's name -> (its market id, the page's stat name: ESPN_MAIN in part3.js)
MARKETS = {
    'Total Passing Yards (incl. overtime)': ('8', 'passing_yards'),
    'Total Pass Completions (incl. overtime)': ('9', 'completions'),
    'Total Passing Touchdowns (incl. overtime)': ('10', 'passing_tds'),
    'Total Carries (incl. overtime)': ('11', 'carries'),
    'Total Rushing Yards (incl. overtime)': ('12', 'rushing_yards'),
    'Total Receiving Yards (incl. overtime)': ('13', 'receiving_yards'),
    'Total Receptions (incl. overtime)': ('14', 'receptions'),
    'Total Passing Interceptions (incl. overtime)': ('15', 'passing_interceptions'),
    'Total Passing Attempts (incl. overtime)': ('16', 'attempts'),
    'Total Rushing Plus Receiving Yards (incl. overtime)': ('20', 'scrim_yards'),
    'Total Kicking Points (incl. overtime)': ('22', 'kick_pts'),
    'Total Field Goals Made (incl. overtime)': ('24', 'fg_made'),
}
ANY_TD = ('Anytime Touchdown Scorer', '31')
BY_ID = {i: st for i, st in MARKETS.values()}
BY_ID[ANY_TD[1]] = 'any_td'
BY_NAME = {n: st for n, (_i, st) in MARKETS.items()}
BY_NAME[ANY_TD[0]] = 'any_td'
TYPES = ('REG', 'WC', 'DIV', 'CON', 'SB')       # games.csv's regular season and playoffs
RECENT_DAYS = 8      # the job reads a played game not yet frozen only within this many days of its kickoff
OVER_H = 4           # hours after its kickoff a game with no score in games.csv counts as played
OVER_DUE_H = 30      # a game played (kicked off) this many hours ago and not frozen is a problem
HEADERS = ({'User-Agent': 'nfl-hub-props/1.0 (+https://github.com/DEMON-X13/nfl-hub)', 'Accept': 'application/json'},
           {'Accept': 'application/json'})     # the second: urllib's own User-Agent, tried on a 403
WAITS = (2, 5)
HOW = ("DraftKings' player lines on ESPN's free feed (core API propBets, provider 100), one entry a game, written by "
       "props/build/espn_archive.py (the props job, weekly.py step 5b; --backfill by hand); research data for a future "
       "props model, held out and never fitted on while its season is in play. games[game id] = {w: week, kickoff: UTC, "
       "espn: ESPN event id, first_read and last_read: UTC times of the reads that found lines, final: read once more "
       "after the game and never again, td: the anytime touchdown scorer list's players (no line), conflict: "
       "[player, stat, [[open, close, lastUpdated], ...]] for one player and market listed at two different numbers, "
       "gone: [player, stat] kept from an earlier read that the latest read lacked, lines: {player: {stat: [open, "
       "close, lastUpdated]}}}. A player is his nflverse gsis id, else espn:<ESPN athlete id>. open is ESPN's own "
       "opening line; close the line at the latest read (frozen at kickoff, so a final game's is the closing line); "
       "lastUpdated ESPN's label as written (it says Z and has run three hours ahead of UTC). Stats are the page's "
       "names: passing_yards, completions, passing_tds, carries, rushing_yards, receiving_yards, receptions, "
       "passing_interceptions, attempts, scrim_yards (rushing plus receiving yards), kick_pts, fg_made.")


def iso(t):
    return t.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def kickoff(gameday, gametime):
    """games.csv's US Eastern date and time as a UTC instant, by weekly.py's kickoff() rule (daylight time from the
    second Sunday of March to the first Sunday of November; no zoneinfo), or None"""
    try:
        t = datetime.datetime.fromisoformat(f"{gameday}T{gametime or '13:00'}")
    except (TypeError, ValueError):
        return None

    def sunday(month, nth):
        first = datetime.date(t.year, month, 1).weekday()
        return 1 + (6 - first) % 7 + 7 * (nth - 1)
    dst = (3 < t.month < 11) or (t.month == 3 and t.day >= sunday(3, 2)) or (t.month == 11 and t.day < sunday(11, 1))
    return (t + datetime.timedelta(hours=4 if dst else 5)).replace(tzinfo=datetime.timezone.utc)


def season_games(rows, season):
    """{game id: {w, ko, espn, scored}} for the season's regular-season and playoff games games.csv lists with an
    ESPN event id and a kickoff; nothing of another season"""
    out = {}
    for r in rows:
        gid = (r.get('game_id') or '').strip()
        if str(r.get('season') or '').strip() != str(season) or not gid.startswith(f'{season}_'):
            continue
        if (r.get('game_type') or '').strip() not in TYPES:
            continue
        e = str(r.get('espn') or '').strip()
        if e.endswith('.0'):
            e = e[:-2]
        ko = kickoff((r.get('gameday') or '').strip(), (r.get('gametime') or '').strip())
        if not e.isdigit() or ko is None:
            continue
        try:
            w = int(float(r.get('week')))
        except (TypeError, ValueError):
            continue
        out[gid] = {'w': w, 'ko': ko, 'espn': e, 'scored': bool(str(r.get('home_score') or '').strip())}
    return out


def roster_map(rows):
    """{ESPN athlete id: gsis id} from nflverse's roster; an ESPN id the roster gives two players is left out"""
    out, amb = {}, set()
    for r in rows:
        e = str(r.get('espn_id') or '').strip()
        g = str(r.get('gsis_id') or '').strip()
        if e.endswith('.0'):
            e = e[:-2]
        if not (e.isdigit() and g):
            continue
        if out.get(e, g) != g:
            amb.add(e)
        out[e] = g
    for e in amb:
        out.pop(e, None)
    return out


def num(x):
    if isinstance(x, bool):
        return None
    if isinstance(x, (int, float)):
        v = float(x)
    elif isinstance(x, str):
        try:
            v = float(x)
        except ValueError:
            return None
    else:
        return None
    if v != v or v in (float('inf'), float('-inf')):
        return None
    return int(v) if v.is_integer() and isinstance(x, int) else v


def market(it):
    """the stat an item is ('any_td' for the touchdown list), or None: by ESPN's market name where it has one (and
    then never where its id names another of these markets), else by its id"""
    t = it.get('type') if isinstance(it.get('type'), dict) else {}
    name = t.get('name')
    tid = str(t.get('id')) if t.get('id') is not None else ''
    if isinstance(name, str) and name.strip():
        st = BY_NAME.get(name.strip())
        if st and tid in BY_ID and BY_ID[tid] != st:
            return None
        return st
    return BY_ID.get(tid)


def athlete(it):
    a = it.get('athlete') if isinstance(it.get('athlete'), dict) else {}
    m = re.search(r'/athletes/(\d+)', str(a.get('$ref') or ''))
    return m.group(1) if m else None


def target(it, k):
    v = it.get(k)
    v = v.get('target') if isinstance(v, dict) else None
    return num(v.get('value')) if isinstance(v, dict) else None


def parse(items, idmap):
    """one game's items -> {lines: {pid: {stat: [open, close, lu]}}, conflict: {(pid, stat): [[o, c, lu], ...]},
    td: set, unmapped: set of ESPN ids, counts}"""
    per, td, unmapped = {}, set(), set()
    c = {'items': 0, 'kept': 0, 'ignored': 0}
    for it in items if isinstance(items, list) else []:
        c['items'] += 1
        if not isinstance(it, dict):
            c['ignored'] += 1
            continue
        st, aid = market(it), athlete(it)
        if not st or not aid:
            c['ignored'] += 1
            continue
        close = target(it, 'current')
        if st != 'any_td' and (close is None or close <= 0):
            c['ignored'] += 1
            continue
        pid = idmap.get(aid)
        if not pid:
            pid = 'espn:' + aid
            unmapped.add(aid)
        c['kept'] += 1
        if st == 'any_td':
            td.add(pid)
            continue
        op = target(it, 'open')
        lu = it.get('lastUpdated') if isinstance(it.get('lastUpdated'), str) else None
        seen = per.setdefault((pid, st), {})
        k = (op, close)
        if k not in seen or (lu or '') > (seen[k] or ''):
            seen[k] = lu        # twins (the same numbers): kept once, at the later lastUpdated
    lines, conflict = {}, {}
    for (pid, st), seen in per.items():
        if len(seen) > 1:
            conflict[(pid, st)] = [[o, cl, lu] for (o, cl), lu in
                                   sorted(seen.items(), key=lambda kv: (kv[0][0] is None, kv[0][0] or 0, kv[0][1]))]
        else:
            (o, cl), lu = next(iter(seen.items()))
            lines.setdefault(pid, {})[st] = [o, cl, lu]
    c['lines'] = sum(len(m) for m in lines.values())
    c['conflict'] = len(conflict)
    c['td'] = len(td)
    return {'lines': lines, 'conflict': conflict, 'td': td, 'unmapped': unmapped, 'counts': c}


def net_fetch(url):
    """(200, the JSON) or (404, None) for one address, through lib/netfetch.py; anything else raises"""
    with tempfile.TemporaryDirectory() as d:
        dest = os.path.join(d, 'answer.json')
        for i, h in enumerate(HEADERS):
            try:
                netfetch.download(url, dest, timeout=30, min_bytes=2, headers=h, waits=WAITS, log=lambda m: None)
            except netfetch.FetchError as e:
                if e.code == 404:
                    return 404, None
                if e.code == 403 and i + 1 < len(HEADERS):
                    continue
                raise
            with open(dest, encoding='utf-8') as f:
                return 200, json.load(f)
    raise netfetch.FetchError('no answer', None)


def read_game(espn, fetch, stamp):
    """{st: 'ok', items} | {st: 'none'} (a 404: none posted, or no longer served) | {st: 'failed', why}"""
    items, pages, p = [], 1, 1
    while p <= pages:
        url = (f'{CORE}/events/{espn}/competitions/{espn}/odds/{DK}/propBets?lang=en&region=us'
               f'&limit={LIMIT}&page={p}&_={stamp}')
        try:
            code, d = fetch(url)
        except Exception as e:
            return {'st': 'failed', 'why': f'{type(e).__name__}: {e}'[:200]}
        if code == 404 and p == 1:
            return {'st': 'none'}
        if code != 200:
            return {'st': 'failed', 'why': f'HTTP {code} on page {p}'}
        if not isinstance(d, dict) or not isinstance(d.get('items'), list) or not isinstance(d.get('pageCount'), int):
            return {'st': 'failed', 'why': f'page {p} is not a page of items with a pageCount'}
        if p == 1:
            pages = d['pageCount']
            if d.get('pageSize') is not None and d.get('pageSize') != LIMIT:
                return {'st': 'failed', 'why': f"pages of {d.get('pageSize')}, not {LIMIT}: the limit rule has changed"}
            if pages > MAX_PAGES:
                return {'st': 'failed', 'why': f'{pages} pages: the limit rule has changed'}
        if p < pages and len(d['items']) != LIMIT:
            return {'st': 'failed', 'why': f"page {p} of {pages} has {len(d['items'])} items, not {LIMIT}"}
        items += d['items']
        p += 1
    return {'st': 'ok', 'items': items}


def rekey(pid, idmap):
    if pid.startswith('espn:'):
        return idmap.get(pid[5:], pid)
    return pid


def merge(old, P, meta, now, final, idmap):
    """the game as kept after a read P (parse()'s) that found something: P's entries over the kept ones, a kept
    entry P lacks kept and listed in gone, the touchdown list the union"""
    old = old or {}
    lines = {}
    for pid, m in (old.get('lines') or {}).items():
        lines.setdefault(rekey(pid, idmap), {}).update({s: list(v) for s, v in m.items()})
    conflict = {(rekey(x[0], idmap), x[1]): x[2] for x in old.get('conflict') or [] if isinstance(x, list) and len(x) == 3}
    old_td = {rekey(p, idmap) for p in old.get('td') or []}
    seen = {(pid, st) for pid, m in P['lines'].items() for st in m} | set(P['conflict'])
    gone = set()
    keep_lines = {}
    for pid, m in lines.items():
        for st, v in m.items():
            if (pid, st) not in seen:
                keep_lines.setdefault(pid, {})[st] = v
                gone.add((pid, st))
    for pid, m in P['lines'].items():
        keep_lines.setdefault(pid, {}).update({st: list(v) for st, v in m.items()})
    keep_conf = {k: v for k, v in conflict.items() if k not in seen}
    gone |= set(keep_conf)
    keep_conf.update(P['conflict'])
    for pid, st in keep_conf:
        (keep_lines.get(pid) or {}).pop(st, None)      # never both a line and a conflict for one player and stat
    td = set(P['td'])
    gone |= {(p, 'any_td') for p in old_td - td}
    g = {'w': meta['w'], 'kickoff': iso(meta['ko']), 'espn': meta['espn'],
         'first_read': old.get('first_read') or iso(now), 'last_read': iso(now), 'final': bool(final),
         'td': sorted(td | old_td),
         'conflict': [[p, s, keep_conf[(p, s)]] for p, s in sorted(keep_conf)],
         'gone': [[p, s] for p, s in sorted(gone)],
         'lines': {p: dict(sorted(m.items())) for p, m in sorted(keep_lines.items()) if m}}
    return g


def played(meta, now):
    return meta['scored'] or now >= meta['ko'] + datetime.timedelta(hours=OVER_H)


def choose(games, arc, now, backfill=False):
    """(the games to read, each with whether its read freezes it): every game of the earliest week with a game still
    to come, and every played game not yet final (within RECENT_DAYS of its kickoff, or any age with backfill). A game
    kicked off and not yet played, and a final one, are never read"""
    kept = arc['games']
    final = {gid for gid, g in kept.items() if g.get('final')}
    to_come = {gid: m for gid, m in games.items() if m['ko'] > now and not m['scored']}
    out = []
    if to_come:
        w0 = min(m['w'] for m in to_come.values())
        out += [(gid, False) for gid, m in to_come.items() if m['w'] == w0 and gid not in final]
    for gid, m in games.items():
        if gid in to_come or gid in final or not played(m, now):
            continue
        if backfill or m['ko'] >= now - datetime.timedelta(days=RECENT_DAYS):
            out.append((gid, True))
    return sorted(out, key=lambda x: (games[x[0]]['ko'], x[0]))


def overdue(games, arc, now):
    """each game kicked off OVER_DUE_H hours ago or more (within RECENT_DAYS) that the archive has not frozen"""
    late = []
    for gid, m in sorted(games.items(), key=lambda x: (x[1]['ko'], x[0])):
        if (arc['games'].get(gid) or {}).get('final'):
            continue
        h = (now - m['ko']).total_seconds() / 3600
        if OVER_DUE_H <= h <= RECENT_DAYS * 24:
            late.append(f'{gid} ({h:.0f}h after kickoff)')
    return late


def update(arc, games, idmap, now, fetch, backfill=False):
    """read the chosen games into the archive (in place): (whether a game changed, notes for the report)"""
    stamp = int(now.timestamp() * 1000)
    tally = {'ok': 0, 'final': 0, 'none': [], 'failed': [], 'empty': [], 'lines': 0, 'conflict': 0, 'unmapped': set()}
    changed = False
    for gid, freeze in choose(games, arc, now, backfill):
        if (arc['games'].get(gid) or {}).get('final'):
            continue            # a final game is never read or written again
        m = games[gid]
        r = read_game(m['espn'], fetch, stamp)
        if r['st'] == 'none':
            tally['none'].append(gid)
            continue
        if r['st'] != 'ok':
            tally['failed'].append(f"{gid} ({r['why']})")
            continue
        P = parse(r['items'], idmap)
        if not P['lines'] and not P['conflict'] and not P['td']:
            tally['empty'].append(gid)
            continue
        arc['games'][gid] = merge(arc['games'].get(gid), P, m, now, freeze, idmap)
        changed = True
        tally['ok'] += 1
        tally['final'] += freeze
        tally['lines'] += P['counts']['lines']
        tally['conflict'] += P['counts']['conflict']
        tally['unmapped'] |= P['unmapped']
    notes = []
    n_read = tally['ok'] + len(tally['none']) + len(tally['failed']) + len(tally['empty'])
    notes.append(f"ESPN archive: {n_read} game(s) read, {tally['ok']} with lines or a touchdown list ({tally['final']} frozen as final), "
                 f"{tally['lines']} main lines, {tally['conflict']} at two numbers, {len(tally['unmapped'])} athlete(s) "
                 f"the roster has no gsis id for (kept by ESPN id)")
    if tally['none']:
        notes.append(f"ESPN archive: no player lines on ESPN (404) for {len(tally['none'])} game(s), kept as they were: "
                     f"{', '.join(tally['none'][:8])}{'...' if len(tally['none']) > 8 else ''}")
    if tally['empty']:
        notes.append(f"ESPN archive: nothing of the kept markets for {len(tally['empty'])} game(s), kept as they were: "
                     f"{', '.join(tally['empty'][:8])}{'...' if len(tally['empty']) > 8 else ''}")
    if tally['failed']:
        notes.append(f"ESPN archive: the read failed for {len(tally['failed'])} game(s), kept as they were: "
                     f"{'; '.join(tally['failed'][:6])}{'...' if len(tally['failed']) > 6 else ''}")
    return changed, notes


def new_archive(season):
    return {'v': 1, 'season': season, 'how': HOW, 'games': {}}


def load(path, season):
    """(the archive, None), a new one where there is no file, or (None, why) where the file will not read or is not
    this season's: the caller then leaves it as it is. A game of another season in it is dropped"""
    if not os.path.exists(path):
        return new_archive(season), None
    try:
        x = json.load(open(path, encoding='utf-8'))
    except (OSError, ValueError) as e:
        return None, f'{os.path.basename(path)} will not read ({e})'
    if not isinstance(x, dict) or x.get('v') != 1 or not isinstance(x.get('games'), dict):
        return None, f'{os.path.basename(path)} is not an archive (v 1)'
    if x.get('season') != season:
        return None, f"{os.path.basename(path)} is of season {x.get('season')}, not {season}"
    arc = new_archive(season)
    arc['games'] = {gid: g for gid, g in x['games'].items() if isinstance(g, dict) and gid.startswith(f'{season}_')}
    return arc, None


def dumps(arc):
    """the archive as text: valid JSON, a game's head on a line and each player's lines on a line, sorted"""
    J = lambda x: json.dumps(x, separators=(',', ':'), ensure_ascii=False)
    out = ['{"v":1,"season":%d,' % arc['season'], '"how":%s,' % J(arc['how']),
           '"updated":%s,' % J(arc.get('updated')), '"games":{']
    gids = sorted(arc['games'])
    for i, gid in enumerate(gids):
        g = arc['games'][gid]
        end = ',' if i < len(gids) - 1 else ''
        head = {k: g[k] for k in ('w', 'kickoff', 'espn', 'first_read', 'last_read', 'final', 'td', 'conflict', 'gone')
                if k in g}
        head.update({k: v for k, v in g.items() if k not in head and k != 'lines'})
        lines = g.get('lines') or {}
        start = J(gid) + ':' + J(head)[:-1] + ',"lines":{'
        if not lines:
            out.append(start + '}}' + end)
            continue
        out.append(start)
        pids = sorted(lines)
        for j, pid in enumerate(pids):
            out.append(J(pid) + ':' + J(dict(sorted(lines[pid].items()))) + (',' if j < len(pids) - 1 else ''))
        out.append('}}' + end)
    out.append('}}')
    return '\n'.join(out) + '\n'


def save(arc, path):
    text = dumps(arc)
    json.loads(text)        # never write a file that will not read
    d = os.path.dirname(path) or '.'
    fd, tmp = tempfile.mkstemp(dir=d, prefix='.espn_lines.', suffix='.part')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(text)
        os.chmod(tmp, 0o644)        # mkstemp's 0600 is no file of the repo's
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def read_csv(path):
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def archive_path(season, data=DATA):
    return os.path.join(data, f'espn_lines_{season}.json')


def run(season, now, *, games_csv=None, roster_csv=None, out=None, offline=False, backfill=False, fetch=None):
    """(notes, problems): the archive brought up to date for the season (the job's reads, or with backfill every
    played game not yet final). Writes the file only where a game changed. offline reads nothing. The caller makes a
    problem of an exception; a file that will not read is left as it is and said"""
    out = out or archive_path(season)
    if offline:
        return [f'ESPN archive skipped: --offline reads nothing from ESPN ({os.path.basename(out)} stays as it was)'], []
    games_csv = games_csv or os.path.join(RAW, 'games.csv')
    roster_csv = roster_csv or os.path.join(RAW, f'roster_{season}.csv')
    arc, why = load(out, season)
    if arc is None:
        return [], [f'ESPN archive: {why}, so it was not updated and stays as it was']
    games = season_games(read_csv(games_csv), season)
    try:
        idmap = roster_map(read_csv(roster_csv))
        notes = []
    except OSError as e:
        idmap = {}
        notes = [f'ESPN archive: no roster ({e}), so every athlete is kept by his ESPN id']
    changed, more = update(arc, games, idmap, now, fetch or net_fetch, backfill)
    notes += more
    if changed:
        arc['updated'] = iso(now)
        save(arc, out)
        notes.append(f"ESPN archive: {os.path.basename(out)}, {len(arc['games'])} game(s), "
                     f"{sum(1 for g in arc['games'].values() if g.get('final'))} final, "
                     f"{sum(len(m) for g in arc['games'].values() for m in (g.get('lines') or {}).values())} lines")
    probs = []
    late = overdue(games, arc, now)
    if late:
        probs.append(f"ESPN archive: {len(late)} game(s) played {OVER_DUE_H}h or more ago are not archived final "
                     f"(ESPN did not serve their player lines, or the archive could not be written): "
                     f"{', '.join(late[:8])}{'...' if len(late) > 8 else ''}")
    return notes, probs


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--backfill', action='store_true', help='every played game of the season not yet final, any age')
    ap.add_argument('--season', type=int)
    ap.add_argument('--games')
    ap.add_argument('--roster')
    ap.add_argument('--out')
    ap.add_argument('--now', help='an ISO time to run as if it were then (UTC where it carries no offset)')
    ap.add_argument('--offline', action='store_true')
    a = ap.parse_args(argv)
    if a.season is None:
        sys.path.insert(0, HERE)
        from season import SEASON
        a.season = SEASON
    now = datetime.datetime.now(datetime.timezone.utc)
    if a.now:
        now = datetime.datetime.fromisoformat(a.now.replace('Z', '+00:00'))
        now = now if now.tzinfo else now.replace(tzinfo=datetime.timezone.utc)
    notes, probs = run(a.season, now, games_csv=a.games, roster_csv=a.roster, out=a.out, offline=a.offline,
                       backfill=a.backfill)
    for n in notes:
        print(n)
    for p in probs:
        print('PROBLEM: ' + p)
    return 1 if probs else 0


if __name__ == '__main__':
    sys.exit(main())
