"""weekly.py's nflverse downloads held to their cases, on a local server (no network, no credits, no
real waits; props/raw is untouched):

    python3 test_fetch.py               # from props/build; must end "0 failures"

download() is weekly.py's own, on RAW_FILES pointed at the test's server and a scratch raw/: a file
that answers 500 three times and then comes down is fresh (True); a 404 is "not posted yet" (None)
on its first and only try, which the not-posted rules read; a 500 every time is a failure (False)
with the error saying how many tries were made, which refuses the run when the file is required;
a cut-off or HTML answer is tried again; the snap counts and the feature table's player stats go
through the same fetch."""
import http.server
import os
import sys
import tempfile
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import weekly as W  # noqa: E402
import netfetch as N  # noqa: E402

N.WAITS = (0, 0, 0, 0)
BODY = b'season,week,team,player_id\n' + b'2026,6,LA,00-1\n' * 30
plan, hits = {}, {}


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        name = self.path.strip('/')
        hits[name] = hits.get(name, 0) + 1
        seq = plan.get(name, [200])
        act = seq.pop(0) if len(seq) > 1 else seq[0]
        body = b'<html><body>rate limited</body></html>' + b' ' * 300 if act == 'html' else BODY
        code = 200 if act == 'html' else act
        self.send_response(code)
        self.send_header('Content-Length', str(len(body) if code == 200 else 0))
        self.end_headers()
        if code == 200:
            self.wfile.write(body)


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_port}/'
W.RAW = tempfile.mkdtemp()
W.RAW_FILES = {name: (what, base + name, req) for name, (what, _url, req) in W.RAW_FILES.items()}
W.SNAPS_URL = base + W.SNAPS
W.say = lambda *a, **k: None
fails = []


def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok:
        fails.append(what)


games, stats, roster, inj, depth = list(W.RAW_FILES)
print('weekly.py downloads')
plan.update({games: [500, 500, 500, 200], stats: [404], roster: [500], inj: ['html', 200], depth: [503, 200]})
N._budget['left'] = N.BUDGET_S
got = W.download(False)
check(got[games] is True and hits[games] == 4, 'three 500s on games.csv, then the file: fresh, the run goes on')
check(got[stats] is None and hits[stats] == 1, 'a 404 on the player stats is "not posted yet" (None), asked for once')
check(got[roster] is False and hits[roster] == 5 and '5 tries' in got[roster + ':err'] and 'HTTP Error 500' in got[roster + ':err'],
      f"a 500 every time on the roster: a failure (False) after five tries, said so: {got.get(roster + ':err')}")
check(got[inj] is True and hits[inj] == 2, 'an HTML page in place of the injury report is tried again')
check(got[depth] is True, 'a 503 on the depth charts is tried again')
check(not any(f.endswith('.part') for f in os.listdir(W.RAW)) and not os.path.exists(os.path.join(W.RAW, roster)),
      'no part file left, and no copy of the file that failed')

plan[W.SNAPS] = [502, 200]
check(W.fetch_snaps(False) is True and hits[W.SNAPS] == 2, 'the snap counts go through the same rule')
plan[W.SNAPS] = [500]
check(W.fetch_snaps(False) is False, 'snap counts that never come are not there to read (the published word is carried)')

plan['pw_2019.csv'] = [500, 200]
try:
    W.fetch(base + 'pw_2019.csv', os.path.join(W.RAW, 'pw_2019.csv'))
    ok = hits['pw_2019.csv'] == 2
except Exception:
    ok = False
check(ok, "the feature table's player stats (features_ready) go through the same fetch")

plan['gone.csv'] = [404]
try:
    W.fetch(base + 'gone.csv', os.path.join(W.RAW, 'gone.csv'))
    code = None
except OSError as e:
    code = getattr(e, 'code', None)
check(code == 404, 'fetch raises a 404 with its code, as urllib did')

print(f'{len(fails)} failures')
srv.shutdown()
sys.exit(1 if fails else 0)
