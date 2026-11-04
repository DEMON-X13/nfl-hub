"""elo/build.py's downloads held to their cases, on a local server and a scratch cache (no network,
no real waits, elo/cache and elo/data untouched):

    python3 elo/test_fetch.py           # must end "0 failures"

load() is run on a two-season world (2012 finished, 2013 to come) served by the test: a file that
answers 500 three times and then comes down is read (13 October 2026's depth_charts_2019.csv); one
that answers 500 every time still refuses the run with nothing written; a 404 on a file the season
to come has not posted is "no file yet", and on a finished season's file a refusal; past.lst lists
the finished seasons' files and never the season in play's, games.csv or the roster; a cached copy
of a finished season is read from the cache, and one that will not read is fetched again. And on a
three-season world (2012 and 2013 finished, 2014 to come): the play-by-play of the season two back,
which Overall Offense and Overall Defense carry into the finished one, is read as a finished
season's file and required, before the new season is under way and after while fewer than
RANK_TEAMS clubs have a rated game in it, and not asked for at all once that many have (the
rankings, and the units, are then on the new season, which carries the one before it alone);
none is asked for before FIRST (2012), whose season starts from 0. And THE INPUTS' sources: PFR's snap counts from
SNAP_FIRST (2013), a finished season's required, listed in past.lst and read from the cache on a second run (what elo.yml
keeps), a 404 on one refusing the run; the season to come's and, once it is under way, the season in play's not required
("no file yet", asked once) and never listed, the season in play's asked for again on every run; nflverse's players.csv
(the snap counts' PFR ids) required (a 404, an empty file, one with no rows, one without its pfr_id column and one placing
no PFR id each refuse the run with nothing written and no past.lst; two 500s and then the file are read), read fresh
every run and never listed; and player stats without a volume column the inputs read refusing the run with its name.
And the wind forecasts (avg_weather) on the local server: the National Weather Service's points and hourly answers in
the US and Open-Meteo's abroad read, a dome asked nothing, each request asked once with a User-Agent naming the site and
no address; a 500 or a 503 (which a download would try again), a 404 and an answer that is not JSON each calm with its
source saying the forecast failed, asked once and spending none of netfetch's retry budget (waits=()); and an answer
slower than the step's cap timed out within what is left of it, every game after calm and skipped, never asked, the step
ending near the cap.

And draft_slots (THE DRAFT START): nflverse's draft_picks.csv, required and read fresh every run.
Served, every drafted player's (season, pick) by gsis id, an id in two drafts at the later, a row
with no id none, and only its season, pick, gsis_id and pfr_player_id columns read; with the roster
handed in, a row whose id is a placeholder or missing placed through its pfr id on the roster's
pfr_id and gsis_id (2026's Peter Woods and Tyre West), and with none kept as before; a cached copy is fetched
again online, and offline read from the cache; a 404, a 500 every time, a file without a column
it reads, one with no rows and, offline, no cached copy each stop the build (SystemExit) with
nothing written, while three 500s and then the file are read. And the season's own draft: with
2013 the newest schedule (its first kickoff 8 September), a file of 2012's draft alone is read
38 days before it, and refused 13 days before (within PRESEASON_CALLS) and once it is under way,
as is one whose 2013 rows have no player ids; with 2013's ids it is read at every one of them."""
import contextlib
import gzip
import http.server
import io
import json
import os
import shutil
import sys
import tempfile
import threading
import time
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build as B  # noqa: E402
import netfetch as N  # noqa: E402

N.WAITS = (0, 0, 0, 0)            # the rule's tries, without the waits

GAMES = ('season,game_id,game_type,week,gameday,gametime,home_team,away_team,home_score,away_score\n'
         '2012,2012_01_A_B,REG,1,2012-09-09,13:00,B,A,20,17\n'
         '2013,2013_01_A_B,REG,1,2013-09-08,13:00,B,A,,\n')
GAMES3 = ('season,game_id,game_type,week,gameday,gametime,home_team,away_team,home_score,away_score\n'
          '2012,2012_01_A_B,REG,1,2012-09-09,13:00,B,A,20,17\n'
          '2013,2013_01_A_B,REG,1,2013-09-08,13:00,B,A,24,21\n'
          '2014,2014_01_A_B,REG,1,2014-09-07,13:00,B,A,,\n')
CSV = 'season,week,game_id,position,player_id,team,targets,carries,attempts,receiving_air_yards\n{y},1,{y}_01_A_B,QB,00-1,A,0,2,30,0\n'
SNAPS = 'season,week,team,pfr_player_id,offense_snaps,offense_pct\n{y},1,A,AaaaAa00,60,1.0\n'
PLAYERS = 'gsis_id,pfr_id,display_name\n00-1,AaaaAa00,A Quarterback\n'
PBP = ','.join(B.PBP_COLS) + '\n' + ','.join(['{y}_01_A_B', 'B', 'A', 'B'] + ['0'] * (len(B.PBP_COLS) - 4)) + '\n'
files, plan, hits, delay, heads = {}, {}, {}, {}, {}


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        name = self.path.strip('/')
        hits[name] = hits.get(name, 0) + 1
        heads[name] = dict(self.headers)
        if name in delay:
            time.sleep(delay[name])                 # an answer slower than the forecast step's cap
        seq = plan.get(name, [200])
        code = seq.pop(0) if len(seq) > 1 else seq[0]
        body = files.get(name) if code == 200 else b''
        if body is None:
            code, body = 404, b''
        try:
            self.send_response(code)
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass                                    # the client gave up on a slow answer


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_port}/'
B.GAMES_URL = base + 'games.csv'
for k, stem in (('STATS_URL', 'stats_player_week'), ('ROSTER_URL', 'roster'), ('INJ_URL', 'injuries'), ('DC_URL', 'depth_charts')):
    setattr(B, k, base + stem + '_{y}.csv')
B.PBP_URL = base + 'play_by_play_{y}.csv.gz'
B.SNAP_URL = base + 'snap_counts_{y}.csv'
B.PLAYERS_URL = base + 'players.csv'
fails = []


def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok:
        fails.append(what)


def world(live=False, three=False):
    files.clear(); plan.clear(); hits.clear()
    files['games.csv'] = (GAMES3 if three else GAMES).encode()
    files['players.csv'] = PLAYERS.encode()
    ys = (2012, 2013, 2014) if three else (2012, 2013)      # the last one the season to come
    for y in (ys if live else ys[:-1]):
        for stem in ('stats_player_week', 'depth_charts', 'injuries', 'roster'):
            files[f'{stem}_{y}.csv'] = CSV.format(y=y).encode()
        files[f'play_by_play_{y}.csv.gz'] = gzip.compress(PBP.format(y=y).encode())
        if y >= B.SNAP_FIRST:                                # PFR's snap counts begin in 2013 (THE INPUTS)
            files[f'snap_counts_{y}.csv'] = SNAPS.format(y=y).encode()


def run(now='2013-08-01T12:00:00+00:00', cache=None):
    B.CACHE = cache or tempfile.mkdtemp()
    B.PAST_LIST = os.path.join(B.CACHE, 'past.lst')
    N._budget['left'] = N.BUDGET_S
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            B.load(False, datetime.datetime.fromisoformat(now))
        err = None
    except SystemExit as e:
        err = str(e)
    past = open(B.PAST_LIST).read().split() if os.path.exists(B.PAST_LIST) else None
    return err, past, out.getvalue(), B.CACHE


print('elo/build.py downloads')
world()
err, past, log, cache = run()
check(err is None, f'every file served: load() reads them ({err})')
check(past == ['depth_charts_2012.csv', 'injuries_2012.csv', 'stats_player_week_2012.csv'],
      f"past.lst lists the finished season's files alone (not games.csv, the roster or the season to come): {past}")
check('no depth_charts file for 2013 yet' in log, 'a 404 on the season to come is "no file yet", not a refusal')
check(hits.get('depth_charts_2013.csv') == 1, 'and that 404 was asked for once, never tried again')
check(hits.get('play_by_play_2011.csv.gz') is None, 'no play-by-play is asked for before FIRST (2012 starts from 0)')
check(hits.get('snap_counts_2012.csv') is None and 'no snap_counts file for 2013 yet' in log and hits.get('snap_counts_2013.csv') == 1,
      'the snap counts (THE INPUTS) begin at SNAP_FIRST, 2013; the season to come\'s 404 is "no file yet", not a refusal')
check(hits.get('players.csv') == 1, 'players.csv (the snap counts\' PFR ids) is read')

world(); del files['players.csv']
err, past, log, _ = run()
check(err is not None and 'players' in err and past is None,
      f"players.csv is required: a 404 on it refuses the run, nothing written and no past.lst: {err!r}"[:200])
for what, body in (('with no rows', 'gsis_id,pfr_id,display_name\n'), ('empty', ''), ('without its pfr_id column', 'gsis_id,display_name\n00-1,A Quarterback\n'),
                   ('placing no PFR id', 'gsis_id,pfr_id,display_name\n00-1,,A Quarterback\n')):
    world(); files['players.csv'] = body.encode()
    err, past, log, _ = run()
    check(err is not None and 'players' in err and past is None,
          f"players.csv {what} refuses the run, nothing written and no past.lst: {err!r}"[:200])
world(); plan['players.csv'] = [500, 500, 200]
err, past, log, _ = run()
check(err is None and hits['players.csv'] == 3, "two 500s on players.csv and then the file: read (lib/netfetch.py's tries), the run goes on")
world(); files['stats_player_week_2012.csv'] = CSV.format(y=2012).replace(',receiving_air_yards', '').replace(',0\n', '\n').encode()
err, past, log, _ = run()
check(err is not None and 'receiving_air_yards' in err and past is not None,
      f"player stats without a volume column THE INPUTS read refuse the run with its name (past.lst is written before): {err!r}"[:200])

world(); plan['depth_charts_2012.csv'] = [500, 500, 500, 200]
err, past, log, _ = run()
check(err is None and hits['depth_charts_2012.csv'] == 4, "three 500s on a finished season's depth chart, then the file: read, the run goes on")

world(); plan['depth_charts_2012.csv'] = [500]
err, past, log, _ = run()
check(err is not None and 'depth_charts 2012' in err and 'HTTP Error 500' in err and '5 tries' in err and past is None,
      f'a 500 every time still refuses the run, says how many tries, and leaves no past.lst: {err!r}'[:200])

world(); del files['injuries_2012.csv']
err, past, log, _ = run()
check(err is not None and 'injuries 2012' in err and hits['injuries_2012.csv'] == 1,
      "a 404 on a finished season's file refuses at once (it is required)")

world()
err, past, log, cache = run()
n = dict(hits)
err, past, log, _ = run(cache=cache)
check(err is None and hits.get('stats_player_week_2012.csv') == n['stats_player_week_2012.csv'] and hits['games.csv'] == n['games.csv'] + 1
      and hits['players.csv'] == n['players.csv'] + 1,
      "a second run on the same cache reads the finished season from it and fetches games.csv and players.csv again")

with open(os.path.join(cache, 'depth_charts_2012.csv'), 'w') as f:
    f.write('"unterminated\n')
err, past, log, _ = run(cache=cache)
check(err is None and 'did not read' in log and hits['depth_charts_2012.csv'] == n['depth_charts_2012.csv'] + 1,
      'a cached copy that will not read is fetched again, not a refusal')
shutil.rmtree(cache)

world(live=True)
err, past, log, cache = run(now='2013-09-12T12:00:00+00:00')
check(err is None and past == ['depth_charts_2012.csv', 'injuries_2012.csv', 'play_by_play_2012.csv.gz', 'stats_player_week_2012.csv'],
      f"once the season is under way last season's play-by-play is a finished season's file too, and 2013's never are (its snap counts among them): {past}")
n = dict(hits)
err, past, log, _ = run(now='2013-09-12T12:00:00+00:00', cache=cache)
check(err is None and hits['snap_counts_2013.csv'] == n['snap_counts_2013.csv'] + 1,
      "the season in play's snap counts are read fresh: a second run on the same cache asks for them again")
shutil.rmtree(cache)
world(live=True); del files['snap_counts_2013.csv']
err, past, log, _ = run(now='2013-09-12T12:00:00+00:00')
check(err is None and 'no snap_counts file for 2013 yet' in log and hits['snap_counts_2013.csv'] == 1 and 'snap_counts_2013.csv' not in (past or []),
      f"the season in play's snap counts are not required: a 404 on them once it is under way is \"no file yet\", asked once, never listed: {err!r}"[:200])

world(three=True)
err, past, log, _ = run(now='2014-08-01T12:00:00+00:00')
check(err is None and past == ['depth_charts_2012.csv', 'depth_charts_2013.csv', 'injuries_2012.csv', 'injuries_2013.csv',
                               'play_by_play_2012.csv.gz', 'snap_counts_2013.csv', 'stats_player_week_2012.csv', 'stats_player_week_2013.csv'],
      f"before 2014 is under way 2012's play-by-play (carried into 2013, the season in play) is a finished season's file, and 2013's, read fresh, is not; 2013's snap counts are a finished season's: {past}")
world(three=True)
err, past, log, cache = run(now='2014-08-01T12:00:00+00:00')
n = dict(hits)
err, past, log, _ = run(now='2014-08-01T12:00:00+00:00', cache=cache)
check(err is None and hits.get('snap_counts_2013.csv') == n['snap_counts_2013.csv'] and 'snap_counts_2013.csv' in (past or []),
      "a finished season's snap counts are kept: a second run on the same cache reads them from it (what elo.yml keeps through past.lst)")
shutil.rmtree(cache)
world(three=True); del files['snap_counts_2013.csv']
err, past, log, _ = run(now='2014-08-01T12:00:00+00:00')
check(err is not None and 'snap_counts 2013' in err and past is None,
      f"a 404 on a finished season's snap counts refuses the run (it is required): {err!r}"[:200])
world(three=True, live=True)
err, past, log, _ = run(now='2014-09-12T12:00:00+00:00')
check(err is None and past == ['depth_charts_2012.csv', 'depth_charts_2013.csv', 'injuries_2012.csv', 'injuries_2013.csv',
                               'play_by_play_2012.csv.gz', 'play_by_play_2013.csv.gz', 'snap_counts_2013.csv', 'stats_player_week_2012.csv', 'stats_player_week_2013.csv'],
      f"once 2014 is under way both seasons' play-by-play are finished seasons' files (2013's is carried into 2014, 2012's into 2013 while it stays the rankings'): {past}")
world(three=True); del files['play_by_play_2012.csv.gz']
err, past, log, _ = run(now='2014-08-01T12:00:00+00:00')
check(err is not None and 'play_by_play 2012' in err and past is None,
      f"a 404 on the play-by-play two seasons back refuses the run (it is required): {err!r}"[:200])


def clubs(n, y=2014):
    """a season's player stats with a quarterback's rated game for each of n clubs"""
    rows = ''.join(f'{y},1,{y}_01_A_B,QB,00-{i},T{i},30,0,0,0\n' for i in range(n))
    return ('season,week,game_id,position,player_id,team,attempts,targets,carries,receiving_air_yards\n' + rows).encode()


world(three=True, live=True); files['stats_player_week_2014.csv'] = clubs(B.RANK_TEAMS - 1)
del files['play_by_play_2012.csv.gz']
err, past, log, _ = run(now='2014-09-12T12:00:00+00:00')
check(err is not None and 'play_by_play 2012' in err and past is None,
      f"2014 under way with {B.RANK_TEAMS - 1} clubs rated: the rankings stay on 2013, which carries 2012, so its 404 refuses the run: {err!r}"[:200])
world(three=True, live=True); files['stats_player_week_2014.csv'] = clubs(B.RANK_TEAMS)
del files['play_by_play_2012.csv.gz']
err, past, log, _ = run(now='2014-09-12T12:00:00+00:00')
check(err is None and hits.get('play_by_play_2012.csv.gz') is None and 'play_by_play_2012.csv.gz' not in (past or []),
      f"2014 under way with {B.RANK_TEAMS} clubs rated: the rankings are on 2014, which carries 2013 alone, so 2012's play-by-play is never asked for: {err!r} {past}"[:240])



print('elo/build.py draft_picks.csv (THE DRAFT START)')
DRAFT_HEAD = 'season,round,pick,team,gsis_id,pfr_player_id,pfr_player_name,w_av,car_av,allpro\n'
DRAFT_2012 = ('1986,1,1,TB,JAC1,JackBo00,Bo Jackson,1,1,0\n1987,7,183,LV,JAC1,JackBo00,Bo Jackson,9,9,0\n'
              '2012,1,1,IND,00-1,LuckAn00,Andrew Luck,90,90,1\n2012,7,253,ARI,,,Nobody,0,0,0\n')
DRAFT_2013 = '2013,1,1,KC,00-2,FishEr00,Eric Fisher,30,30,0\n'
B.DRAFT_URL = base + 'draft_picks.csv'
DGAMES = B.pd.DataFrame({'season': [2012, 2013], 'gameday': ['2012-09-09', '2013-09-08'], 'gametime': ['13:00', '13:00']})
read_args = []
real_read = B.pd.read_csv


def spy_read(path, *a, **k):
    if str(path).endswith('draft_picks.csv'):
        read_args.append(k.get('usecols'))
    return real_read(path, *a, **k)


def draft_run(body, now='2013-08-01T12:00:00+00:00', offline=False, cache=None, code=None, roster=None):
    """draft_slots on a served draft_picks.csv (None: not served); its slots or the build's refusal, and the cache"""
    files.clear(); plan.clear(); hits.clear()
    if body is not None:
        files['draft_picks.csv'] = body.encode()
    if code:
        plan['draft_picks.csv'] = list(code)
    B.CACHE = cache or tempfile.mkdtemp()
    N._budget['left'] = N.BUDGET_S
    B.pd.read_csv = spy_read
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            return B.draft_slots(offline, DGAMES, datetime.datetime.fromisoformat(now), roster), None, B.CACHE
    except SystemExit as e:
        return None, str(e), B.CACHE
    finally:
        B.pd.read_csv = real_read


del read_args[:]
slots, err, cache = draft_run(DRAFT_HEAD + DRAFT_2012 + DRAFT_2013)
check(err is None and slots == {'JAC1': (1987, 183), '00-1': (2012, 1), '00-2': (2013, 1)},
      f'served: every drafted player by gsis id, an id in two drafts at the later, a row with no id none: {slots} {err}')
check(read_args and all(sorted(u or []) == ['gsis_id', 'pfr_player_id', 'pick', 'season'] for u in read_args),
      f"only the draft's season, pick, gsis_id and pfr_player_id columns are read, never its career outcomes: {read_args}")
# a placeholder id (Peter Woods, 2026's pick 29: WOO547869) and a missing one (Tyre West, 2026's pick 222), each placed
# through the roster's pfr_id and gsis_id; a placeholder the roster cannot place kept as it is; no roster, none placed
PH = '2013,1,29,KC,WOO547869,WoodPe00,Peter Woods,0,0,0\n2013,7,222,DET,,WestTy00,Tyre West,0,0,0\n2013,7,250,NE,ZZZ000001,NoneNo00,Nobody,0,0,0\n'
ROST = B.pd.DataFrame({'gsis_id': ['00-0041545', '00-0041448', None], 'pfr_id': ['WoodPe00', 'WestTy00', 'NoneNo00']})
slots, err, _ = draft_run(DRAFT_HEAD + DRAFT_2012 + DRAFT_2013 + PH, roster=ROST)
check(err is None and slots.get('00-0041545') == (2013, 29) and slots.get('00-0041448') == (2013, 222)
      and 'WOO547869' not in slots and slots.get('ZZZ000001') == (2013, 250) and slots.get('00-2') == (2013, 1),
      f'a placeholder or missing gsis id is placed through the roster\'s pfr id: {slots} {err}')
slots, err, _ = draft_run(DRAFT_HEAD + DRAFT_2012 + DRAFT_2013 + PH)
check(err is None and 'WOO547869' in slots and '00-0041545' not in slots and '00-0041448' not in slots,
      f'with no roster, nothing is placed through it: {slots} {err}')
slots, err, _ = draft_run(DRAFT_HEAD + DRAFT_2012 + '2013,7,222,DET,,WestTy00,Tyre West,0,0,0\n', now='2013-08-26T12:00:00+00:00', roster=ROST)
check(err is None and slots.get('00-0041448') == (2013, 222),
      f"the season's draft whose only player is placed through the roster counts as one with player ids: {err!r}"[:200])
with open(os.path.join(cache, 'draft_picks.csv'), 'w') as f:
    f.write(DRAFT_HEAD + '2012,1,9,X,00-9,Stale,0,0,0\n')
slots, err, _ = draft_run(DRAFT_HEAD + DRAFT_2012 + DRAFT_2013, cache=cache)
check(err is None and hits.get('draft_picks.csv') == 1 and '00-9' not in (slots or {}) and '00-2' in (slots or {}),
      'a cached copy is fetched again online (a new class and its ids land after the draft): never the stale copy')
slots, err, _ = draft_run(None, offline=True, cache=cache)
check(err is None and not hits and slots == {'JAC1': (1987, 183), '00-1': (2012, 1), '00-2': (2013, 1)},
      f'offline, the cached copy is read and nothing is asked for: {slots} {err}')
shutil.rmtree(cache)

slots, err, cache = draft_run(None)
check(slots is None and err and 'draft_picks.csv' in err and hits.get('draft_picks.csv') == 1 and not os.path.exists(os.path.join(cache, 'draft_picks.csv')),
      f'a 404 stops the build at once, asked for once, nothing written: {err!r}'[:200])
slots, err, _ = draft_run(DRAFT_HEAD + DRAFT_2012, code=[500, 500, 500, 200])
check(err is None and hits['draft_picks.csv'] == 4 and slots and '00-1' in slots, "three 500s, then the file: read")
slots, err, _ = draft_run(DRAFT_HEAD + DRAFT_2012, code=[500])
check(slots is None and err and 'draft_picks.csv' in err and '5 tries' in err, f'a 500 every time stops the build and says how many tries: {err!r}'[:200])
slots, err, _ = draft_run('season,round,pick,team,pfr_player_id,pfr_player_name\n2012,1,1,IND,LuckAn00,Andrew Luck\n')
check(slots is None and err and 'draft_picks.csv' in err, f'a file without the gsis_id column stops the build: {err!r}'[:200])
slots, err, _ = draft_run('season,round,pick,team,gsis_id,pfr_player_name\n2012,1,1,IND,00-1,Andrew Luck\n')
check(slots is None and err and 'draft_picks.csv' in err, f'a file without the pfr_player_id column stops the build: {err!r}'[:200])
slots, err, _ = draft_run(DRAFT_HEAD)
check(slots is None and err and 'no rows' in err, f'a file with no rows stops the build (every player would start as one never drafted): {err!r}'[:200])
slots, err, _ = draft_run(None, offline=True)
check(slots is None and err and 'not cached' in err and not hits, f'offline with no cached copy: the build stops, nothing asked for: {err!r}'[:200])

for now, when, refused in (('2013-08-01T12:00:00+00:00', "38 days before 2013's first kickoff", False),
                          ('2013-08-26T12:00:00+00:00', 'within PRESEASON_CALLS, 13 days before it', True),
                          ('2013-09-12T12:00:00+00:00', 'once 2013 is under way', True)):
    slots, err, _ = draft_run(DRAFT_HEAD + DRAFT_2012, now=now)
    check((err is not None) == refused and (not refused or ('no 2013 draft' in err and str(B.PRESEASON_CALLS) in err)),
          f"2012's draft alone {when}: {'refused' if refused else 'read'} ({err!r})"[:200])
    slots, err, _ = draft_run(DRAFT_HEAD + DRAFT_2012 + '2013,1,1,KC,,FishEr00,Eric Fisher,30,30,0\n', now=now)
    check((err is not None) == refused, f"2013's draft with no player ids {when}: {'refused' if refused else 'read'} ({err!r})"[:200])
    slots, err, _ = draft_run(DRAFT_HEAD + DRAFT_2012 + DRAFT_2013, now=now)
    check(err is None and slots.get('00-2') == (2013, 1), f"2013's draft with its ids {when}: read ({err!r})"[:200])
check(B.PRESEASON_CALLS == 14, f'the fixtures stand 13 days inside and 38 outside PRESEASON_CALLS ({B.PRESEASON_CALLS})')

print('elo/build.py the wind forecasts (THE INPUTS: avg_weather)')
B.NWS_POINTS = base + 'points/{lat:.4f},{lon:.4f}'
B.OPEN_METEO = base + 'om/{lat:.4f},{lon:.4f}'
NOW = datetime.datetime(2025, 11, 4, 12, tzinfo=datetime.timezone.utc)
KICK = NOW + datetime.timedelta(days=2, hours=5)
WX = B.pd.DataFrame([{'game_id': 'buf', 'stadium_id': 'BUF00', 'roof': 'outdoors', 'kick': KICK},
                     {'game_id': 'lon', 'stadium_id': 'LON02', 'roof': 'outdoors', 'kick': KICK},
                     {'game_id': 'det', 'stadium_id': 'DET00', 'roof': 'dome', 'kick': KICK},
                     {'game_id': 'chi', 'stadium_id': 'CHI98', 'roof': 'outdoors', 'kick': KICK}])
PTS = {sid: 'points/' + '{:.4f},{:.4f}'.format(*B.STADIUMS[sid][:2]) for sid in ('BUF00', 'CHI98')}
OM = 'om/' + '{:.4f},{:.4f}'.format(*B.STADIUMS['LON02'][:2])


def wx_world():
    files.clear(); plan.clear(); hits.clear(); delay.clear(); heads.clear()
    h0 = KICK.replace(minute=0)
    per = lambda a, b, s: {'startTime': a.isoformat(), 'endTime': b.isoformat(), 'windSpeed': s}
    for sid, name in PTS.items():
        files[name] = json.dumps({'properties': {'forecastHourly': base + 'hourly/' + sid}}).encode()
        files['hourly/' + sid] = json.dumps({'properties': {'periods': [per(h0, h0 + datetime.timedelta(hours=1), '11 to 16 mph')]}}).encode()
    files[OM] = json.dumps({'hourly': {'time': [KICK.strftime('%Y-%m-%dT%H:00')], 'wind_speed_10m': [8.5]}}).encode()


def wx_run():
    left = N._budget['left']
    t0 = time.monotonic()
    with contextlib.redirect_stdout(io.StringIO()):
        out = B.avg_weather(WX, NOW, False)
    return out, time.monotonic() - t0, left - N._budget['left']


wx_world()
out, took, spent = wx_run()
check(out['buf'] == (16.0, 'nws') and out['chi'] == (16.0, 'nws') and out['lon'] == (8.5, 'open-meteo') and out['det'] == (0.0, 'roof'),
      f"served: the National Weather Service's hour at kickoff in the US, Open-Meteo's abroad, a dome calm with no request: {out}")
check(all(hits.get(n) == 1 for n in list(PTS.values()) + ['hourly/BUF00', 'hourly/CHI98', OM]) and len(hits) == 5,
      f'each request asked once, nothing for the dome: {hits}')
check(all('nfl-hub' in (h.get('User-Agent') or '') and '@' not in (h.get('User-Agent') or '') for h in heads.values()),
      f"every request names the site in its User-Agent, and no address: {sorted({h.get('User-Agent') for h in heads.values()})}")
wx_world(); plan[PTS['BUF00']] = [500, 200]; plan[OM] = [503, 200]
out, took, spent = wx_run()
check(out['buf'][0] is None and out['buf'][1].startswith('forecast failed') and out['lon'][0] is None and out['lon'][1].startswith('forecast failed')
      and out['chi'] == (16.0, 'nws'), f'a 500 or a 503 on a forecast is calm and says so, the next game read all the same: {out}')
check(hits[PTS['BUF00']] == 1 and hits[OM] == 1 and 'hourly/BUF00' not in hits and spent == 0,
      f"a forecast is tried once (waits=()), though netfetch tries a download's 5xx again, and spends none of its retry budget: {hits}, {spent}")
wx_world(); del files['hourly/BUF00']
out, took, spent = wx_run()
check(out['buf'][0] is None and 'forecast failed' in out['buf'][1] and hits['hourly/BUF00'] == 1, f'a 404 on the hourly forecast: calm, asked once: {out["buf"]}')
wx_world(); files['hourly/BUF00'] = b'<html>busy</html>'
out, took, spent = wx_run()
check(out['buf'][0] is None and 'forecast failed' in out['buf'][1] and hits['hourly/BUF00'] == 1, f'an answer that is not JSON: calm, asked once: {out["buf"]}')
cap = B.WEATHER_CAP
B.WEATHER_CAP = 2
wx_world(); delay['hourly/BUF00'] = 4
try:
    out, took, spent = wx_run()
finally:
    B.WEATHER_CAP = cap
check(out['buf'][0] is None and out['buf'][1].startswith('forecast failed') and out['lon'][1].startswith('forecast skipped')
      and out['chi'][1].startswith('forecast skipped') and out['det'] == (0.0, 'roof') and OM not in hits and PTS['CHI98'] not in hits,
      f'an answer slower than the step\'s cap (2 s here) times out within what is left of it, and every game after is calm, said so, never asked: {out}')
check(took < 2 + 1.5, f'the step ends near its cap ({took:.1f} s for a cap of 2 s and an answer of 4 s)')
check(B.WEATHER_CAP == 90 and B.WEATHER_TIMEOUT == 15, f'the job\'s cap is 90 s and a request\'s timeout 15 s ({B.WEATHER_CAP}, {B.WEATHER_TIMEOUT})')

print(f'{len(fails)} failures')
srv.shutdown()
sys.exit(1 if fails else 0)
