"""Download the study's raw files from nflverse into data/raw/ (gitignored): games.csv (the schedule,
scores, closing totals and their over/under prices, roof and weather) and the play-by-play of
2009-2026 (2009 only warms up last season's carry and the team EWMs). About 330 MB.

The study ran on these files as nflverse served them on 2026-10-10. nflverse revises old seasons
now and then and 2026 grows every week, so a later download can move a number in the last decimal
(judge/asof_data.py and judge/recompute.py say so if the rebuilt dataset differs from a stored one).

Run: python3 -I fetch_raw.py [--force]   (from props/research/totals; a file already there is kept
unless --force)
"""
import os, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'data', 'raw')
GAMES = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv'
PBP = 'https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.parquet'
SEASONS = range(2009, 2027)


def get(url, dest, force):
    if os.path.exists(dest) and not force:
        print('have', os.path.relpath(dest, HERE)); return
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for i in range(3):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                body = r.read()
            if len(body) < 1000:
                raise IOError(f'{url}: only {len(body)} bytes')
            tmp = dest + '.part'
            with open(tmp, 'wb') as fh:
                fh.write(body)
            os.replace(tmp, dest)
            print('got', os.path.relpath(dest, HERE), f'{len(body) / 1e6:.1f} MB'); return
        except Exception as e:      # a dropped connection: try again, then stop the run
            if i == 2:
                sys.exit(f'could not download {url}: {e}')
            time.sleep(5 * (i + 1))


if __name__ == '__main__':
    force = '--force' in sys.argv[1:]
    get(GAMES, os.path.join(RAW, 'games', 'games.csv'), force)
    for s in SEASONS:
        get(PBP.format(season=s), os.path.join(RAW, 'pbp', f'play_by_play_{s}.parquet'), force)
