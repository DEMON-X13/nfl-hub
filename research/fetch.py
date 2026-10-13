"""Download the raw files the studies read into research/data/raw/ (gitignored): nflverse's
games.csv and the play-by-play of 2003-2025, and of 1999-2002 to warm up a history (a starting quarterback's
form entering 2003). The held-out seasons' play-by-play is never fetched.

nflverse revises old seasons now and then, so a later download can move a number in the last
decimal; each study's README says when its files were read.

Run: python3 -I research/fetch.py [--force]   (a file already there is kept unless --force)
"""
import os, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import RAW, SEASONS, WARMUP, GAMES_URL, PBP_URL, pbp_path


def get(url, dest, force):
    if os.path.exists(dest) and not force:
        print('have', os.path.relpath(dest, RAW)); return
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for i in range(3):
        try:
            with urllib.request.urlopen(url, timeout=180) as r:
                body = r.read()
            if len(body) < 1000:
                raise IOError(f'{url}: only {len(body)} bytes')
            tmp = dest + '.part'
            with open(tmp, 'wb') as fh:
                fh.write(body)
            os.replace(tmp, dest)
            print('got', os.path.relpath(dest, RAW), f'{len(body) / 1e6:.1f} MB'); return
        except Exception as e:      # a dropped connection: try again, then stop the run
            if i == 2:
                sys.exit(f'could not download {url}: {e}')
            time.sleep(5 * (i + 1))


if __name__ == '__main__':
    force = '--force' in sys.argv[1:]
    get(GAMES_URL, os.path.join(RAW, 'games', 'games.csv'), force)
    for s in WARMUP + SEASONS:
        get(PBP_URL.format(season=s), pbp_path(s), force)
