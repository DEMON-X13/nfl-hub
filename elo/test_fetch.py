"""elo/build.py's downloads held to their cases, on a local server and a scratch cache (no network,
no real waits, elo/cache and elo/data untouched):

    python3 elo/test_fetch.py           # must end "0 failures"

load() is run on a two-season world (2012 finished, 2013 to come) served by the test: a file that
answers 500 three times and then comes down is read (13 October 2026's depth_charts_2019.csv); one
that answers 500 every time still refuses the run with nothing written; a 404 on a file the season
to come has not posted is "no file yet", and on a finished season's file a refusal; past.lst lists
the finished seasons' files and never the season in play's, games.csv or the roster; a cached copy
of a finished season is read from the cache, and one that will not read is fetched again."""
import contextlib
import gzip
import http.server
import io
import os
import shutil
import sys
import tempfile
import threading
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build as B  # noqa: E402
import netfetch as N  # noqa: E402

N.WAITS = (0, 0, 0, 0)            # the rule's tries, without the waits

GAMES = ('season,game_id,game_type,week,gameday,gametime,home_team,away_team,home_score,away_score\n'
         '2012,2012_01_A_B,REG,1,2012-09-09,13:00,B,A,20,17\n'
         '2013,2013_01_A_B,REG,1,2013-09-08,13:00,B,A,,\n')
CSV = 'season,week,game_id,position,player_id,team\n{y},1,{y}_01_A_B,QB,00-1,A\n'
PBP = ','.join(B.PBP_COLS) + '\n' + ','.join(['{y}_01_A_B', 'B', 'A', 'B'] + ['0'] * (len(B.PBP_COLS) - 4)) + '\n'
files, plan, hits = {}, {}, {}


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        name = self.path.strip('/')
        hits[name] = hits.get(name, 0) + 1
        seq = plan.get(name, [200])
        code = seq.pop(0) if len(seq) > 1 else seq[0]
        body = files.get(name) if code == 200 else b''
        if body is None:
            code, body = 404, b''
        self.send_response(code)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_port}/'
B.GAMES_URL = base + 'games.csv'
for k, stem in (('STATS_URL', 'stats_player_week'), ('ROSTER_URL', 'roster'), ('INJ_URL', 'injuries'), ('DC_URL', 'depth_charts')):
    setattr(B, k, base + stem + '_{y}.csv')
B.PBP_URL = base + 'play_by_play_{y}.csv.gz'
fails = []


def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok:
        fails.append(what)


def world(live=False):
    files.clear(); plan.clear(); hits.clear()
    files['games.csv'] = GAMES.encode()
    for y in ((2012, 2013) if live else (2012,)):
        for stem in ('stats_player_week', 'depth_charts', 'injuries', 'roster'):
            files[f'{stem}_{y}.csv'] = CSV.format(y=y).encode()
        files[f'play_by_play_{y}.csv.gz'] = gzip.compress(PBP.format(y=y).encode())


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
check(err is None and hits.get('stats_player_week_2012.csv') == n['stats_player_week_2012.csv'] and hits['games.csv'] == n['games.csv'] + 1,
      "a second run on the same cache reads the finished season from it and fetches games.csv again")

with open(os.path.join(cache, 'depth_charts_2012.csv'), 'w') as f:
    f.write('"unterminated\n')
err, past, log, _ = run(cache=cache)
check(err is None and 'did not read' in log and hits['depth_charts_2012.csv'] == n['depth_charts_2012.csv'] + 1,
      'a cached copy that will not read is fetched again, not a refusal')
shutil.rmtree(cache)

world(live=True)
err, past, log, _ = run(now='2013-09-12T12:00:00+00:00')
check(err is None and past == ['depth_charts_2012.csv', 'injuries_2012.csv', 'play_by_play_2012.csv.gz', 'stats_player_week_2012.csv'],
      f"once the season is under way last season's play-by-play is a finished season's file too, and 2013's never are: {past}")

print(f'{len(fails)} failures')
srv.shutdown()
sys.exit(1 if fails else 0)
