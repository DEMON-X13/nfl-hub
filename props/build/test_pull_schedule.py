"""The price pulls' schedule, held to the season's schedule, offline: no credit is spent.

The props job buys player prices in four pulls a week (PULL_SLOTS in weekly.py, the "17 " crons
in .github/workflows/props.yml), each pricing every game that kicks off before the next slot plus
LATE hours, because GitHub starts this repo's scheduled runs hours late (2 to 9.4 seen in October
2026). The "7 " crons are catch-ups: once a slot is CATCH_UP_WAIT hours gone they price any game
up to the next pull that has no prices and has not kicked off, and nothing otherwise.

In October 2026 the owner asked for the Sunday slate's prices by Saturday morning Pacific ("i
think id rather have all day saturday to look at potential bets instead of scrambling"), so the
Saturday 08:17 pull (Saturday's games) and the 23:17 one (Sunday's) became one pull at 05:17 UTC,
with Saturday catch-ups at 16:07 and 23:07 for a dropped one. This test replays the season with
the job's own code, weekly.current_week, weekly.pull_window (hours_to_next_pull and the catch-up
wait) and oddsfetch.choose (the games a pull buys), on a clock set to each run's start, over every
game of the season's schedule as an odds-API event at its kickoff, and holds the schedule to:

  (a) every Sunday game is priced by the Saturday pull, landed on the site by 9am Pacific on the
      Saturday before (PDT until 1 November, PST after) at every lateness up to 9.4 hours
  (b) no game is priced twice by the regular pulls, but Thanksgiving's early game, which the
      Wednesday and Thursday pulls both price by design (a day apart, the fresher prices are worth
      the credits); the schedule it replaced priced the same games twice, and more
  (c) every game is priced, and on the site, before its kickoff, at every lateness
  (d) the credits a week are no more than the old schedule's: each game is still bought once, and
      a week with a Saturday game saves the second pull's game-lines call (3 credits)
  and that the catch-ups spend nothing when every pull ran, that a dropped Saturday pull is made
  up on Saturday (Pacific) with every Sunday game priced once before kickoff, and that with all
  of Saturday's daytime runs dropped (GitHub can drop a scheduled run; 23:07 is the backstop) the
  23:07 catch-up still prices the Sunday slate before London's kickoff.

Lateness is 0, 3, 6, 9 and 9.4 hours for every run, then every combination of those for the four
pulls, then random lateness for every run, then the drops. The schedule is the published
payload's (props/data/payload.json, nflverse's games.csv as the job reads it), plus the same
season with week 18 flexed to three Saturday games and a Sunday night game (nflverse lists week 18
at 1pm Sunday until the league sets it). The week of the 1 November time change and the weeks with
Saturday games are listed game by game.

    python3 props/build/test_pull_schedule.py                    must end "0 failures"
    python3 props/build/test_pull_schedule.py -v                 every week's pulls game by game
    python3 props/build/test_pull_schedule.py --games FILE       on a games.csv instead of the payload
"""
import os, sys, re, csv, json, random, bisect, argparse, datetime, itertools, contextlib, collections
HERE = os.path.dirname(os.path.abspath(__file__)); PKG = os.path.dirname(HERE); ROOT = os.path.dirname(PKG)
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(PKG, 'data'))
import weekly, oddsfetch

UTC = datetime.timezone.utc
H = datetime.timedelta(hours=1)
WORKFLOW = os.path.join(ROOT, '.github', 'workflows', 'props.yml')
LATENESS = (0, 3, 6, 9, 9.4)          # hours: the task's grid and the worst GitHub has shown this repo
RUN = datetime.timedelta(minutes=10)  # a run's start to its commit on the site: ~2 minutes measured, Pages after
SCORED = 4 * H                        # a game has its score in games.csv this long after kickoff (current_week)
GAME_LINES = 3                        # oddsfetch's one /odds call for the slate: h2h, spreads, totals
DAYS = 'Mon Tue Wed Thu Fri Sat Sun'.split()

# The schedule this replaced (props.yml before October 2026's change), for (b) and (d).
OLD_PULLS = [(0, 8, 17), (2, 8, 17), (3, 8, 17), (5, 8, 17), (5, 23, 17)]
OLD_CATCHUPS = [(4, 6, 7), (6, 23, 7), (0, 2, 7), (0, 6, 7), (1, 6, 7), (4, 16, 7), (0, 16, 7), (1, 16, 7)] + [(d, 12, 7) for d in range(7)]

checks = 0; fails = []
def check(ok, what):
    global checks
    checks += 1
    if not ok: fails.append(what)
    return ok

# ---------------------------------------------------------------- the crons and the slot table
def read_crons(path=WORKFLOW):
    """[(cron string, weekday Monday 0, hour, minute)] from the workflow's schedule"""
    text = open(path, encoding='utf-8').read()
    out = []
    for c in re.findall(r'^\s*-\s*cron:\s*"([^"]+)"', text, re.M):
        m, h, dom, mon, dow = c.split()
        assert dom == '*' and mon == '*', f'{c}: only weekday crons are read here'
        for d in (range(7) if dow == '*' else [int(x) for x in dow.split(',')]):
            out.append((c, (d - 1) % 7, int(h), int(m)))     # cron's Sunday is 0 (or 7)
    return text, out

def slot_name(s): return f'{DAYS[s[0]]} {s[1]:02d}:{s[2]:02d}'

# ---------------------------------------------------------------- time zones, by the US rule
def nth_sunday(year, month, n):
    first = datetime.date(year, month, 1).weekday()
    return datetime.date(year, month, 1 + (6 - first) % 7 + 7 * (n - 1))

def pacific_offset(t):
    """hours behind UTC in Pacific time at instant t: 7 from 2am on the second Sunday of March to
    2am on the first Sunday of November, 8 otherwise (no zoneinfo, as kickoff() has none)"""
    on = datetime.datetime.combine(nth_sunday(t.year, 3, 2), datetime.time(10), UTC)
    off = datetime.datetime.combine(nth_sunday(t.year, 11, 1), datetime.time(9), UTC)
    return 7 if on <= t < off else 8

def pacific(t):
    o = pacific_offset(t)
    return f"{(t - o * H):%a %H:%M} {'PDT' if o == 7 else 'PST'}"

def eastern_day(g): return datetime.date.fromisoformat(g['d']).weekday()   # the schedule's own date

def saturday_9am_pacific(g):
    """9am Pacific on the Saturday before a Sunday game, as a UTC instant"""
    sat = datetime.date.fromisoformat(g['d']) - datetime.timedelta(days=1)
    t = datetime.datetime.combine(sat, datetime.time(9), UTC)
    return t + pacific_offset(t + 8 * H) * H

# ---------------------------------------------------------------- the schedule as the API lists it
def load_schedule(games=None):
    if games:
        rows = [r for r in csv.DictReader(open(games, encoding='utf-8'))
                if r['season'] == str(weekly.SEASON) and r['game_type'] == 'REG']
        return [{'id': r['game_id'], 'w': int(r['week']), 'd': r['gameday'], 't': r['gametime'],
                 'a': r['away_team'], 'h': r['home_team']} for r in rows], os.path.basename(games)
    pay = json.load(open(os.path.join(PKG, 'data', 'payload.json'), encoding='utf-8'))
    return [{k: g[k] for k in ('id', 'w', 'd', 't', 'a', 'h')} for g in pay['sched']], 'props/data/payload.json'

def flexed_week18(sched):
    """the season with week 18 as the league sets it late in December: three Saturday games
    (1pm, 4:30pm and 8pm Eastern, the earliest a Saturday game has been) and a Sunday night game"""
    w18 = sorted((g for g in sched if g['w'] == 18), key=lambda g: g['id'])
    if len(w18) < 6: return None
    sun = w18[0]['d']; sat = (datetime.date.fromisoformat(sun) - datetime.timedelta(days=1)).isoformat()
    moved = {w18[0]['id']: (sat, '13:00'), w18[1]['id']: (sat, '16:30'), w18[2]['id']: (sat, '20:00'),
             w18[3]['id']: (sun, '16:25'), w18[4]['id']: (sun, '16:25'), w18[5]['id']: (sun, '20:20')}
    return [dict(g, d=moved[g['id']][0], t=moved[g['id']][1]) if g['id'] in moved else dict(g) for g in sched]

TEAM_NAME = {v: k for k, v in oddsfetch.TEAMS.items()}
def as_events(sched):
    return [{'id': g['id'], 'away_team': TEAM_NAME[g['a']], 'home_team': TEAM_NAME[g['h']],
             'commence_time': weekly.kickoff(g).strftime('%Y-%m-%dT%H:%M:%SZ')} for g in sched]

# ---------------------------------------------------------------- the season, replayed
Run = collections.namedtuple('Run', 'kind slot at start')    # kind 'pull' or 'catch-up'; at: the cron time

@contextlib.contextmanager
def pull_slots(slots):
    old = weekly.PULL_SLOTS; weekly.PULL_SLOTS = list(slots)
    try: yield
    finally: weekly.PULL_SLOTS = old

def runs(sched, pulls, catchups, late, drop):
    kos = [weekly.kickoff(g) for g in sched]
    d, end = (min(kos) - 4 * 24 * H).date(), (max(kos) + 2 * 24 * H).date()   # a window reaches 61h at most
    out = []
    while d <= end:
        for kind, table in (('pull', pulls), ('catch-up', catchups)):
            for s in table:
                if d.weekday() != s[0]: continue
                at = datetime.datetime(d.year, d.month, d.day, s[1], s[2], tzinfo=UTC)
                if drop(kind, s, at): continue
                out.append(Run(kind, s, at, at + late(kind, s, at) * H))
        d += datetime.timedelta(days=1)
    return sorted(out, key=lambda r: (r.start, r.kind))

class Season:
    """a schedule made ready for replays: the API's events by week, and weekly.current_week's
    answer for each count of games with a score (games.csv gets a score as each game ends)"""
    def __init__(self, sched):
        self.sched = sched
        self.ko = {g['id']: weekly.kickoff(g) for g in sched}
        self.events = collections.defaultdict(list)
        for g, ev in zip(sched, as_events(sched)): self.events[g['w']].append(ev)
        self.order = sorted(sched, key=lambda g: (self.ko[g['id']], g['id']))
        self.scored_at = [self.ko[g['id']] + SCORED for g in self.order]
        self.weeks = {}
        self.ids = {w: oddsfetch.game_ids({'sched': sched}, w) for w in self.events}
    def __iter__(self): return iter(self.sched)
    def week(self, t):
        k = bisect.bisect_right(self.scored_at, t)
        if k not in self.weeks:
            done = {g['id'] for g in self.order[:k]}
            self.weeks[k] = weekly.current_week([{'week': str(g['w']), 'home_score': '20' if g['id'] in done else ''} for g in self.sched])
        return self.weeks[k]

def simulate(season, pulls, catchups, late=lambda k, s, at: 0, drop=lambda k, s, at: False):
    """every run in start order, as the job runs them one at a time (one concurrency group):
    [(run, week, window or None, [game ids priced])]"""
    if not isinstance(season, Season): season = Season(season)
    sched = season.sched
    priced = {}; have = collections.defaultdict(set); log = []
    with pull_slots(pulls):
        for r in runs(sched, pulls, catchups, late, drop):
            week, over, _ = season.week(r.start)
            if over: continue
            win = weekly.pull_window(r.start, r.kind == 'catch-up')
            if win is None: log.append((r, week, None, [])); continue
            win = float(f'{win:.1f}')                   # weekly.py passes --hours with one decimal
            ids = season.ids.get(week, {})               # oddsfetch.game_ids, once a week
            # the API lists every coming game; choose() drops another week's at its first line, so
            # this week's and the next are enough to replay it
            evs = season.events[week] + season.events.get(week + 1, [])
            got = [gid for _, gid in oddsfetch.choose(evs, ids, r.start, win, r.kind == 'catch-up',
                                                      have[week], priced, say=lambda s: None)]
            for gid in got:
                priced[gid] = r.start.strftime('%Y-%m-%dT%H:%MZ'); have[week].add(gid)
            log.append((r, week, win, got))
    return log

def by_game(log):
    out = collections.defaultdict(list)
    for r, week, win, got in log:
        for gid in got: out[gid].append(r)
    return out

def credits(log):
    c = collections.Counter(); n = collections.Counter()
    for r, week, win, got in log:
        if got: c[week] += len(oddsfetch.DEFAULT) * len(got) + GAME_LINES; n[week] += len(got)
    return c, n

def designed_double(g, rs):
    """Thanksgiving's early game: kicks off on a Thursday, priced on the Wednesday (by its pull, or
    by a catch-up standing in for it) and again by Thursday's pull a day later (oddsfetch's
    docstring: the fresher prices are worth the credits)"""
    return (eastern_day(g) == 3 and len(rs) == 2 and rs[0].start.weekday() == 2
            and rs[1].kind == 'pull' and rs[1].slot[0] == 3)

def short(gid, games):
    g = games[gid]; return f"{g['a']}@{g['h']}"

# ---------------------------------------------------------------- the checks on one replay
def hold(label, sched, log, old_log=None, pulls=None):
    """(a), (b), (c) and the catch-ups spending nothing, on a replay where every pull ran"""
    games = {g['id']: g for g in sched}; got = by_game(log)
    sat_slots = {s for s in pulls if s[0] == 5}
    bad = collections.defaultdict(list)
    for gid, g in games.items():
        ko = weekly.kickoff(g); rs = got.get(gid, [])
        if not rs: bad['c'].append(f"{short(gid, games)} never priced"); continue
        if not all(r.start + RUN <= ko for r in rs): bad['c'].append(f"{short(gid, games)} on the site after its kickoff")
        if len(rs) > 1 and not designed_double(g, rs):
            bad['b'].append(f"{short(gid, games)} priced {len(rs)} times ({', '.join(slot_name(r.slot) for r in rs)})")
        if any(r.kind == 'catch-up' for r in rs): bad['x'].append(f"{short(gid, games)} bought by a catch-up")
        if eastern_day(g) == 6:
            r = rs[0]
            if not (r.kind == 'pull' and r.slot in sat_slots): bad['a'].append(f"{short(gid, games)} priced by {r.kind} {slot_name(r.slot)}")
            elif r.start + RUN > saturday_9am_pacific(g): bad['a'].append(f"{short(gid, games)} on the site {pacific(r.start + RUN)}, after 9am Saturday")
        if eastern_day(g) == 5 and not (rs[0].kind == 'pull' and rs[0].slot in sat_slots):
            bad['s'].append(f"{short(gid, games)} (a Saturday game) priced by {slot_name(rs[0].slot)}")
    if old_log is not None:
        old = by_game(old_log)
        new2 = {gid for gid, rs in got.items() if len(rs) > 1}; old2 = {gid for gid, rs in old.items() if len(rs) > 1}
        if not new2 <= old2: bad['b'].append(f"priced twice now, once before: {sorted(new2 - old2)}")
        cn, nn = credits(log); co, no = credits(old_log)
        for w in sorted(set(cn) | set(co)):
            if cn[w] > co[w]: bad['d'].append(f"week {w}: {cn[w]} credits, {co[w]} before")
            designed = sum(1 for gid, rs in got.items() if games[gid]['w'] == w and designed_double(games[gid], rs))
            if nn[w] != sum(1 for g in sched if g['w'] == w) + designed:
                bad['d'].append(f"week {w}: {nn[w]} games bought for {sum(1 for g in sched if g['w'] == w)} games")
    for k, what in (('a', '(a) every Sunday game priced by the Saturday pull, on the site by 9am Pacific Saturday'),
                    ('s', 'every Saturday game priced by the Saturday pull'),
                    ('b', '(b) no game priced twice but Thanksgiving\'s early game, and none the old schedule priced once'),
                    ('c', '(c) every game priced, and on the site, before its kickoff'),
                    ('d', '(d) credits a week no more than before, each game bought once'),
                    ('x', 'the catch-ups spend nothing when every pull ran')):
        if k == 'd' and old_log is None: continue
        check(not bad[k], f"{label}: {what}: " + '; '.join(bad[k][:6]) + (f" (+{len(bad[k]) - 6} more)" if len(bad[k]) > 6 else ''))

# ---------------------------------------------------------------- printing
def hours(td): return f"{td.total_seconds() / 3600:g}h"

def week_table(sched, log, weeks):
    """each pull of each week: when it starts, when it is on the site, its window, what it buys"""
    games = {g['id']: g for g in sched}
    for w in weeks:
        print(f"    week {w}")
        for r, week, win, got in log:
            if week != w or r.kind != 'pull': continue
            names = ' '.join(f"{short(gid, games)} ({weekly.kickoff(games[gid]):%a %H:%M}Z)"
                             for gid in sorted(got, key=lambda i: (weekly.kickoff(games[i]), i)))
            print(f"      {slot_name(r.slot)} +{hours(r.start - r.at)}: starts {r.start:%a %d %b %H:%M} UTC, on the site by"
                  f" {pacific(r.start + RUN)}, window {win:.1f}h, prices {len(got)}" + (f": {names}" if got else ''))

def week_cell(log, w):
    """what each pull bought for week w's games: 'Th 1  Sa 13  Mo 1'"""
    n = collections.Counter()
    for r, week, win, got in log:
        if week == w and r.kind == 'pull' and got: n[(r.at, r.slot[0])] += len(got)
    return '  '.join(f"{DAYS[d][:2]} {k}" for (at, d), k in sorted(n.items()))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--games', help="nflverse's games.csv instead of the payload's schedule")
    ap.add_argument('-v', '--verbose', action='store_true')
    ap.add_argument('--seeds', type=int, default=150, help='seasons replayed with random lateness for every run')
    a = ap.parse_args()

    # 1. the crons are the slot table
    text, cr = read_crons()
    pulls = [(d, h, m) for c, d, h, m in cr if not c.startswith('7 ')]
    catchups = [(d, h, m) for c, d, h, m in cr if c.startswith('7 ')]
    check(sorted(pulls) == sorted(weekly.PULL_SLOTS) and len(set(pulls)) == len(pulls),
          f"the workflow's price pulls {sorted(map(slot_name, pulls))} are PULL_SLOTS {sorted(map(slot_name, weekly.PULL_SLOTS))}")
    check(all(m != 0 for c, d, h, m in cr), 'no cron on the hour')
    check("startsWith(github.event.schedule, '7 ') && '--catch-up'" in text, "the workflow passes --catch-up to every \"7 \" cron")
    check(weekly.CATCH_UP_WAIT > max(LATENESS) and weekly.LATE > max(LATENESS) and oddsfetch.REPRICE_HOURS >= weekly.CATCH_UP_WAIT,
          'LATE and CATCH_UP_WAIT cover the worst lateness, and the reprice guard the catch-up wait')
    print(f"price pulls (UTC): {', '.join(map(slot_name, weekly.PULL_SLOTS))}; catch-ups: "
          f"{len({c for c, *_ in cr if c.startswith('7 ')})} crons, {len(catchups)} runs a week")
    print(f"  the schedule replaced: {', '.join(map(slot_name, OLD_PULLS))}")

    sched, src = load_schedule(a.games)
    seasons = [('the season', Season(sched))]
    f18 = flexed_week18(sched)
    # nothing before week 17 moves, so the flexed season is replayed from week 17
    if f18: seasons.append(('week 18 flexed to Saturday', Season([g for g in f18 if g['w'] >= 17])))
    weeks = sorted({g['w'] for g in sched})
    print(f"schedule: {len(sched)} games of {weekly.SEASON} from {src}, weeks {weeks[0]}-{weeks[-1]}")
    dst = [w for w in weeks if len({pacific_offset(weekly.kickoff(g)) for g in sched if g['w'] == w}
                                   | {pacific_offset(weekly.kickoff(g) - 2 * 24 * H) for g in sched if g['w'] == w}) > 1]
    satw = sorted({g['w'] for g in sched if eastern_day(g) == 5})
    thanks = sorted({g['w'] for g in sched if eastern_day(g) == 3 and g['t'] < '17:00'})
    special = sorted(set(dst + satw + thanks + ([18] if f18 else [])))
    print(f"  the time change in week(s) {dst}; Saturday games in week(s) {satw}; a Thursday day game in week(s) {thanks}")

    # 2. every run at the same lateness: (a)-(d) against the schedule this replaced
    logs = {}
    for name, s in seasons:
        for L in LATENESS:
            new = simulate(s, weekly.PULL_SLOTS, catchups, late=lambda k, sl, at, L=L: L)
            old = simulate(s, OLD_PULLS, OLD_CATCHUPS, late=lambda k, sl, at, L=L: L)
            hold(f"{name}, every run {L}h late", s, new, old, weekly.PULL_SLOTS)
            logs[(name, L)] = (new, old)
    s = seasons[0][1]
    print(f"\nEVERY RUN LATE BY THE SAME HOURS: each pull, what it prices (kickoff UTC), and when it is on the site"
          f" ({'every week' if a.verbose else 'the weeks above'}; the catch-ups bought nothing)")
    for L in LATENESS:
        print(f"  {L}h late")
        week_table(s, logs[('the season', L)][0], weeks if a.verbose else special)
    if f18:
        for L in (0, 9.4):
            print(f"  week 18 flexed to Saturday, {L}h late")
            week_table(seasons[1][1], logs[('week 18 flexed to Saturday', L)][0], [18])
    print(f"\n  every week: games each pull prices (We Th Sa Mo: the pull's day), {' / '.join(f'{L}h' for L in LATENESS)} late")
    for w in weeks:
        cells = [week_cell(logs[('the season', L)][0], w) for L in LATENESS]
        print(f"    week {w:>2}  " + (cells[0] + '   (the same at every lateness)' if len(set(cells)) == 1 else ' | '.join(cells)))

    # 3. the credits, old and new, week by week
    print('\nCREDITS A WEEK: 6 a game for the player markets, 3 a pull that prices any game for the slate\'s game lines')
    for name, s in seasons:
        same = len({tuple(sorted(credits(logs[(name, L)][0])[0].items())) for L in LATENESS}) == 1
        check(same, f"{name}: the credits a week do not move with the lateness")
        new, old = logs[(name, 9)]
        (cn, nn), (co, no) = credits(new), credits(old)
        ws = sorted({g['w'] for g in s})
        if name != 'the season': ws = [w for w in ws if w == 18]
        print(f"  {name}" + (' (the same at every lateness)' if same else ', 9h late'))
        print('    week  games  bought before  credits before  bought now  credits now')
        for w in ws:
            print(f"    {w:>4}  {sum(1 for g in s if g['w'] == w):>5}  {no[w]:>13}  {co[w]:>14}  {nn[w]:>10}  {cn[w]:>11}")
        if len(ws) > 1:
            print(f"   total  {sum(1 for g in s if g['w'] in ws):>5}  {sum(no[w] for w in ws):>13}  {sum(co[w] for w in ws):>14}"
                  f"  {sum(nn[w] for w in ws):>10}  {sum(cn[w] for w in ws):>11}")

    # 4. every combination of lateness over the four pulls, the catch-ups at either end
    combos = 0
    for name, s in seasons:
        for ls in itertools.product(LATENESS, repeat=len(weekly.PULL_SLOTS)):
            for lx in (0, 9.4):
                per = dict(zip(sorted(weekly.PULL_SLOTS), ls))
                late = lambda k, sl, at, per=per, lx=lx: per[sl] if k == 'pull' else lx
                hold(f"{name}, pulls late {', '.join(f'{slot_name(k)} {v}h' for k, v in per.items())}, catch-ups {lx}h", s,
                     simulate(s, weekly.PULL_SLOTS, catchups, late=late), None, weekly.PULL_SLOTS)
                combos += 1
    print(f"\nEVERY COMBINATION of {'/'.join(f'{L}' for L in LATENESS)}h late over the {len(weekly.PULL_SLOTS)} pulls,"
          f" catch-ups 0 or 9.4h late: {combos} seasons replayed")

    # 5. random lateness for every run
    rnd = random.Random(20261011)
    for i in range(a.seeds):
        for name, s in seasons:
            lat = {}
            late = lambda k, sl, at, lat=lat: lat.setdefault((k, at), rnd.uniform(0, 9.4))
            hold(f"{name}, random lateness (seed {i})", s, simulate(s, weekly.PULL_SLOTS, catchups, late=late), None, weekly.PULL_SLOTS)
    print(f"RANDOM LATENESS (0-9.4h, every run on its own): {a.seeds} seasons, each with and without week 18 flexed")

    # 6. drops
    print('\nDROPPED PULLS (GitHub sometimes never starts a scheduled run)')
    for name, s in seasons:
        games = {g['id']: g for g in s}
        lost_sat = collections.Counter(); lost_old = collections.Counter(); n = 0
        for l1 in LATENESS:          # Saturday's 12:07 run
            for l2 in LATENESS:      # 16:07
                for l3 in LATENESS:  # 23:07
                    per = {(5, 12, 7): l1, (5, 16, 7): l2, (5, 23, 7): l3}
                    late = lambda k, sl, at, per=per: per.get(sl, 6)
                    drop = lambda k, sl, at: k == 'pull' and sl[0] == 5
                    log = simulate(s, weekly.PULL_SLOTS, catchups, late=late, drop=drop); got = by_game(log); n += 1
                    bad = []
                    for gid, g in games.items():
                        rs = got.get(gid, []); ko = weekly.kickoff(g)
                        if len(rs) > 1 and not designed_double(g, rs): bad.append(f"{short(gid, games)} priced {len(rs)} times")
                        if eastern_day(g) == 6:
                            if len(rs) != 1 or rs[0].start + RUN > ko: bad.append(f"{short(gid, games)} not priced once before kickoff")
                            elif not (rs[0].kind == 'catch-up' and rs[0].slot[0] == 5
                                      and rs[0].start + RUN <= saturday_9am_pacific(g) + 10 * H):
                                bad.append(f"{short(gid, games)} made up by {slot_name(rs[0].slot)} at {pacific(rs[0].start)}")
                        if eastern_day(g) == 5 and not rs: lost_sat[short(gid, games)] += 1
                    check(not bad, f"{name}, the Saturday pull dropped, Saturday catch-ups late {per}: every Sunday game made up "
                                   f"once, on Saturday by 7pm Pacific, before kickoff: " + '; '.join(bad[:6]))
                    # the old schedule with its Saturday morning pull dropped, for comparison
                    oldlog = simulate(s, OLD_PULLS, OLD_CATCHUPS, late=lambda k, sl, at, per=per: per.get(sl, 6),
                                      drop=lambda k, sl, at: k == 'pull' and sl == (5, 8, 17))
                    og = by_game(oldlog)
                    for gid, g in games.items():
                        if eastern_day(g) == 5 and not og.get(gid): lost_old[short(gid, games)] += 1
        print(f"  {name}: the Saturday pull dropped, {n} lateness combinations of Saturday's 12:07, 16:07 and 23:07 runs:"
              f" every Sunday game made up once before kickoff")
        if lost_sat or lost_old:
            print(f"    Saturday games left unpriced (combinations of {n}): now {dict(lost_sat) or 'none'};"
                  f" with the old Saturday 08:17 pull dropped {dict(lost_old) or 'none'}")
        # all of Saturday's daytime runs gone: GitHub can drop a scheduled run, and 23:07 is the backstop
        for l3 in LATENESS:
            drop = lambda k, sl, at: sl[0] == 5 and sl != (5, 23, 7)
            log = simulate(s, weekly.PULL_SLOTS, catchups, late=lambda k, sl, at, l3=l3: l3 if sl == (5, 23, 7) else 6, drop=drop)
            got = by_game(log)
            bad = [short(gid, games) for gid, g in games.items() if eastern_day(g) == 6
                   and (len(got.get(gid, [])) != 1 or got[gid][0].start + RUN > weekly.kickoff(g))]
            check(not bad, f"{name}, every Saturday run dropped but 23:07 ({l3}h late): the Sunday slate priced once before kickoff: {bad[:6]}")
        print(f"  {name}: every Saturday run dropped but 23:07, at each lateness: the Sunday slate priced once before kickoff")
        # each other pull dropped: nothing is bought twice
        for s_drop in [p for p in weekly.PULL_SLOTS if p[0] != 5]:
            for L in LATENESS:
                log = simulate(s, weekly.PULL_SLOTS, catchups, late=lambda *x, L=L: L,
                               drop=lambda k, sl, at, sd=s_drop: k == 'pull' and sl == sd)
                got = by_game(log)
                twice = [short(gid, games) for gid, rs in got.items() if len(rs) > 1 and not designed_double(games[gid], rs)]
                check(not twice, f"{name}, {slot_name(s_drop)} dropped, {L}h late: nothing bought twice: {twice[:6]}")
        print(f"  {name}: Monday, Wednesday or Thursday's pull dropped, at each lateness: nothing bought twice")

    print(f'\n{checks} checks, {len(fails)} failures')
    for f in fails[:40]: print('  FAIL', f)
    if len(fails) > 40: print(f'  ... and {len(fails) - 40} more')
    sys.exit(1 if fails else 0)

if __name__ == '__main__':
    main()
