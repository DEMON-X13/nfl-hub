"""Download the raw files the studies read into research/data/raw/ (gitignored): nflverse's
games.csv and the play-by-play of 2003-2025, and of 1999-2002 to warm up a history (a starting quarterback's
form entering 2003). The held-out seasons' play-by-play is never fetched.

nflverse revises old seasons now and then, so a later download can move a number in the last
decimal; each study's README says when its files were read.

Run: python3 -I research/fetch.py [--force]   (a file already there is kept unless --force)
     python3 -I research/fetch.py --exam      (the exam's own fresh games.csv and the held-out seasons'
                                               play-by-play into data/raw/exam/, always downloaded anew:
                                               for a frozen equation's blind test, research/exam/)
     python3 -I research/fetch.py --fivethirtyeight
                                              (study 5's files: FiveThirtyEight's own NFL Elo file, 1920-2022,
                                               from the copy kept on GitHub since 538's own host went dark,
                                               and 538's nfl-elo-game file, 1920-2020, to check that copy
                                               against, each checked against its SHA-256; nflverse's weekly
                                               player stats 1999-2025, a quarterback's box score; nflverse's
                                               draft picks)

FiveThirtyEight's data is under the Creative Commons Attribution 4.0 licence
(https://creativecommons.org/licenses/by/4.0/): credit FiveThirtyEight, say what was changed, imply no
endorsement. Its files are kept in data/ (gitignored) and never committed.
"""
import hashlib, os, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common
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


# FiveThirtyEight's nfl_elo.csv: its host (projects.fivethirtyeight.com/nfl-api/) went dark when ABC
# closed the site on 5 March 2025; Jonathan Cervas keeps the last good capture on GitHub. Its numbers
# match 538's own nfl-elo-game repo on every game of 1920-2020, ratings and score (the chance differs in one, Super
# Bowl XLIII; research/fivethirtyeight/qbelo.py checks it on every run: results/facts.csv)
F538_URL = 'https://raw.githubusercontent.com/jcervas/Data/master/fivethirtyeight/projects.fivethirtyeight.com/nfl-api/nfl_elo.csv'
F538_SHA256 = '8f6831ac223de245b612044601bc369a6b222a808cb55e737939504118525733'
# 538's own nfl-elo-game repository (its 2014 plain Elo, 1920 to the 2020 season): the copy above is checked against it
F538_GAMES_URL = 'https://raw.githubusercontent.com/fivethirtyeight/nfl-elo-game/master/data/nfl_games.csv'
F538_GAMES_SHA256 = 'af16cf3c5848393057fad07feea278f0a85ab7b57ddbfe42ed96b5c80e7d519d'
STATS_URL = 'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{season}.csv'
DRAFT_URL = 'https://github.com/nflverse/nflverse-data/releases/download/draft_picks/draft_picks.csv'


def stats_path(season):
    common.guard(season)
    return os.path.join(RAW, 'stats_player', f'stats_player_week_{season}.csv')


if __name__ == '__main__':
    if '--fivethirtyeight' in sys.argv[1:]:
        force = '--force' in sys.argv[1:]
        dest = os.path.join(RAW, 'fivethirtyeight', 'nfl_elo.csv')
        get(F538_URL, dest, force)
        digest = hashlib.sha256(open(dest, 'rb').read()).hexdigest()
        if digest != F538_SHA256:
            os.remove(dest)
            sys.exit(f'nfl_elo.csv is not the file this study checked (sha256 {digest}): removed')
        dest = os.path.join(RAW, 'fivethirtyeight', 'nfl_games.csv')
        get(F538_GAMES_URL, dest, force)
        digest = hashlib.sha256(open(dest, 'rb').read()).hexdigest()
        if digest != F538_GAMES_SHA256:
            os.remove(dest)
            sys.exit(f'nfl_games.csv is not the file this study checked (sha256 {digest}): removed')
        for s in WARMUP + SEASONS:
            get(STATS_URL.format(season=s), stats_path(s), force)
        get(DRAFT_URL, os.path.join(RAW, 'draft_picks.csv'), force)
        sys.exit(0)
    if '--exam' in sys.argv[1:]:
        import datetime
        common.open_exam()
        get(GAMES_URL, os.path.join(common.EXAM, 'games.csv'), True)
        for s in range(common.HOLDOUT_FROM, datetime.date.today().year + 1):
            get(PBP_URL.format(season=s), pbp_path(s), True)
        sys.exit(0)
    force = '--force' in sys.argv[1:]
    get(GAMES_URL, os.path.join(RAW, 'games', 'games.csv'), force)
    for s in WARMUP + SEASONS:
        get(PBP_URL.format(season=s), pbp_path(s), force)
