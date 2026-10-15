"""The one download rule the NFL jobs' Python steps share (elo/build.py, props/build/weekly.py and its
read of ESPN's free DraftKings lines, props/build/espn_lines.py, the Joker and the Broly Model through
betting/jobkit.py); lib/netfetch.js is the same rule for Node.

nflverse's release host (github.com/.../releases/download, redirected to GitHub's asset CDN) answers
the odd request with a 500 and works again a little later: on 13 October 2026 it gave three 500s in a
row, over about 15 seconds, on depth_charts_2019.csv, the Elo job refused the whole run, and the same
run passed on a re-run an hour later. So a transient failure is tried again on a widening wait:

  * tried again: HTTP 408, 425, 429 and any 5xx; a timeout, a reset or refused connection, a transfer
    cut off part way; and a body that is empty, shorter than `min_bytes` or an HTML page;
  * answered at once: a 404 and every other 4xx. A 404 keeps its meaning where a job gives it one
    ("not posted yet"): the error raised carries it as `code`, as urllib's HTTPError does;
  * the waits are WAITS (5, 15, 30 and 60 seconds: five tries over nearly two minutes for one file),
    and every wait comes out of one budget for the whole process (BUDGET_S, ten minutes), so an outage
    still refuses the run in minutes, never hours; a run that has spent it tries each file once more;
  * each try has a timeout (120 seconds of silence on the socket), so a stalled transfer cannot hold a
    job until GitHub's six-hour limit;
  * the file is written whole or not at all: it is streamed to `dest.part` and moved into place only
    once it has passed, and no part file is left behind.

A file that still cannot be had raises FetchError (an OSError), whose message says what the last try
got and how many tries were made over how long, and every job's refusal rules then apply exactly as
before. lib/test_netfetch.py holds it to its cases on a local server."""
import http.client
import os
import shutil
import socket
import sys
import time
import urllib.error
import urllib.request

WAITS = (5, 15, 30, 60)
BUDGET_S = 600.0
RETRY_HTTP = {408, 425, 429}
_budget = {'left': BUDGET_S}


class FetchError(OSError):
    """a file that could not be had. `code` is the HTTP status of the last answer (404 for a file not
    posted), or None for a failure with no answer; `tries` how many were made."""

    def __init__(self, msg, code=None, tries=1):
        super().__init__(msg)
        self.code = code
        self.tries = tries


def transient(code):
    return code in RETRY_HTTP or 500 <= code <= 599


def _log(msg):
    print(msg, flush=True)


def download(url, dest, *, timeout=120, min_bytes=1, headers=None, waits=None, sleep=time.sleep, log=_log, info=None):
    """url -> dest (returned), by the rule above. `info`, a dict when given, is filled on success with
    the answer's `date` (its Date header, or None) and `tries`: props/build/espn_lines.py dates a read by
    the server's clock, never by a time the body claims"""
    waits = WAITS if waits is None else waits
    name = os.path.basename(dest)
    tmp = dest + '.part'
    d = os.path.dirname(dest)
    if d:
        os.makedirs(d, exist_ok=True)
    start = time.monotonic()
    err, code, i = None, None, 0
    for i in range(len(waits) + 1):
        try:
            req = urllib.request.Request(url, headers=headers or {'User-Agent': 'nfl-hub-jobs/1.0'})
            with urllib.request.urlopen(req, timeout=timeout) as r, open(tmp, 'wb') as f:
                shutil.copyfileobj(r, f)
                want = r.headers.get('Content-Length')
                said = r.headers.get('Date')
            size = os.path.getsize(tmp)
            if want and want.isdigit() and size != int(want):    # urllib reads a cut-off transfer as a short one
                raise http.client.IncompleteRead(b'', int(want) - size)
            with open(tmp, 'rb') as f:
                head = f.read(64).lstrip().lower()
            if size < max(1, min_bytes) or head.startswith((b'<!doctype', b'<html')):
                raise IOError(f'an empty or short answer ({size} bytes)' if not head.startswith(b'<')
                              else 'an HTML page, not the file')
            os.replace(tmp, dest)
            if info is not None:
                info.update(date=said, tries=i + 1)
            if i:
                log(f'  {name}: had on try {i + 1}')
            return dest
        except urllib.error.HTTPError as e:
            err, code = e, e.code
            if not transient(e.code):
                raise FetchError(f'{name}: HTTP Error {e.code}: {e.reason}', e.code, i + 1) from e
        except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError,
                http.client.HTTPException, IOError) as e:
            err, code = e, None
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)
        if i < len(waits):
            w = min(waits[i], _budget['left'])
            if w <= 0 and waits[i] > 0:
                log(f'  {name}: {_what(err)}; the run has spent its retry budget, so no more tries')
                break
            log(f'  {name}: {_what(err)}; trying again in {w:.0f}s (try {i + 2} of {len(waits) + 1})')
            _budget['left'] -= w
            sleep(w)
    took = time.monotonic() - start
    raise FetchError(f'{name}: {_what(err)}, on {i + 1} {"try" if i == 0 else "tries"} over {_dur(took)} '
                     f"(nflverse's host or the network; the next run tries again)", code, i + 1)


def _what(e):
    if isinstance(e, urllib.error.HTTPError):
        return f'HTTP Error {e.code}: {e.reason}'
    if isinstance(e, urllib.error.URLError):
        return f'{e.reason}'
    return f'{type(e).__name__}: {e}' if str(e) else type(e).__name__


def _dur(s):
    return f'{s:.0f}s' if s < 90 else f'{s / 60:.1f} min'


if __name__ == '__main__':      # python3 lib/netfetch.py URL DEST
    download(sys.argv[1], sys.argv[2])
