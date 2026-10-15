"""lib/netfetch.py held to its cases on a local server (no network, no real waits):

    python3 lib/test_netfetch.py        # must end "0 failures"

Each case plans the answers one path gives, try by try, and checks what download() did: the file
written or not (and never a part file), the error's code and tries, and the waits it asked for."""
import http.server
import os
import socket
import sys
import tempfile
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import netfetch as N  # noqa: E402

BODY = b'season,week,team\n' + b'2026,6,LA\n' * 50
plan, hits = {}, {}


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        seq = plan[self.path]
        hits[self.path] = hits.get(self.path, 0) + 1
        act = seq.pop(0) if len(seq) > 1 else seq[0]
        if act == 'reset':                      # the connection dropped with no answer
            self.connection.shutdown(socket.SHUT_RDWR)
            return
        if act == 'slow':                       # nothing said for longer than the timeout
            time.sleep(1.5)
            return
        if act == 'cut':                        # a transfer cut off part way
            self.send_response(200)
            self.send_header('Content-Length', str(len(BODY)))
            self.end_headers()
            self.wfile.write(BODY[:40])
            self.wfile.flush()
            self.connection.shutdown(socket.SHUT_RDWR)
            return
        body = {'empty': b'', 'html': b'<!DOCTYPE html><html>a sign-in page</html>' + b' ' * 300}.get(act, BODY)
        code = act if isinstance(act, int) else 200
        self.send_response(code)
        self.send_header('Content-Length', str(len(body) if code == 200 else 0))
        self.end_headers()
        if code == 200:
            self.wfile.write(body)


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_port}'
TMP = tempfile.mkdtemp()
fails = []


def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok:
        fails.append(what)


def run(path, answers, **kw):
    plan[path] = list(answers)
    hits[path] = 0
    dest = os.path.join(TMP, path.strip('/'))
    slept = []
    N._budget['left'] = kw.pop('budget', N.BUDGET_S)
    try:
        N.download(BASE + path, dest, sleep=slept.append, log=lambda m: None, timeout=kw.pop('timeout', 5), **kw)
        err = None
    except N.FetchError as e:
        err = e
    part = os.path.exists(dest + '.part')
    got = os.path.exists(dest) and open(dest, 'rb').read() == BODY
    return err, got, slept, part, hits[path]


print('lib/netfetch.py')
e, got, slept, part, n = run('/a.csv', [500, 500, 500, 200])
check(e is None and got and slept == [5, 15, 30] and n == 4 and not part,
      "three 500s then the file (13 October's depth_charts_2019.csv): read on the fourth try, after 5, 15 and 30s")

e, got, slept, part, n = run('/b.csv', [404])
check(e is not None and e.code == 404 and e.tries == 1 and not got and slept == [] and n == 1 and not part,
      'a 404 is answered at once, never tried again, and carries code 404 (a file not posted yet)')

e, got, slept, part, n = run('/c.csv', [500])
check(e is not None and e.code == 500 and e.tries == 5 and n == 5 and slept == [5, 15, 30, 60] and not got and not part,
      'a 500 every time: five tries, then FetchError with code 500 and no file')
check(e is not None and '5 tries' in str(e) and 'HTTP Error 500' in str(e), f'the refusal says what and how many tries: {e}')

e, got, slept, part, n = run('/d.csv', [403])
check(e is not None and e.code == 403 and n == 1 and slept == [], 'another 4xx (403) is not tried again')

e, got, slept, part, n = run('/e.csv', [429, 503, 502, 200])
check(e is None and got and n == 4, '429, 503 and 502 are tried again')

e, got, slept, part, n = run('/f.csv', ['empty', 'html', 200], min_bytes=200)
check(e is None and got and n == 3, 'an empty body and an HTML page are tried again')

e, got, slept, part, n = run('/g.csv', ['reset', 'cut', 200])
check(e is None and got and n == 3 and not part, 'a dropped connection and a transfer cut off part way are tried again, no part file left')

e, got, slept, part, n = run('/h.csv', ['slow', 200], timeout=0.5)
check(e is None and got and n == 2, 'a try that says nothing within its timeout is tried again')

e, got, slept, part, n = run('/i.csv', [500], budget=12)
check(e is not None and slept == [5, 7] and n == 3,
      "the run's retry budget caps the waits (12s left: 5, then 7, then no more tries)")

N._budget['left'] = 0
e, got, slept, part, n = run('/j.csv', [500, 200], budget=0)
check(e is not None and e.code == 500 and n == 1 and slept == [], 'with the budget spent a file gets one try')

e, got, slept, part, n = run('/k.csv', [500, 500, 200], waits=(0, 0))
check(e is None and got and n == 3, 'waits of 0 (tests) still try every time')

plan['/l.csv'] = [503, 200]
N._budget['left'] = N.BUDGET_S
said = {}
N.download(BASE + '/l.csv', os.path.join(TMP, 'l.csv'), sleep=lambda s: None, log=lambda m: None, timeout=5, info=said)
check(said.get('tries') == 2 and str(said.get('date') or '').endswith(' GMT'),
      f"info, when given, is filled with the answer's Date header and the tries it took (the ESPN read dates itself by it): {said}")

print(f'{len(fails)} failures')
srv.shutdown()
sys.exit(1 if fails else 0)
