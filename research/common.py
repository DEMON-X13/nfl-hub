"""What every study under research/ shares: where the raw files live, which seasons a study may
look at, and the loaders, which refuse the held-out seasons.

The rule (research/README.md): the seasons from HOLDOUT_FROM on are not explored here, so the next
model can be tested on seasons it has never seen. It was 2024 until the owner put 2024 and 2025 into
the exploration (12 October 2026: "we are just collecting data right now"), so the season in play,
2026, and the ones after it are the final exam. Their play-by-play is never downloaded for a study;
games.csv carries every season in one file, so `games()` drops them.

The exam: a frozen equation's blind test (research/exam/) calls `open_exam()` first, which lets that
process alone read the held-out seasons, from their own fresh downloads in data/raw/exam/ (fetch.py
--exam). Nothing may be fitted, tuned or chosen in a process that has opened the exam.
"""
import os

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'data', 'raw')            # gitignored
HOLDOUT_FROM = 2026                                 # 2026 onward is never explored
FIRST = 2003
SEASONS = list(range(FIRST, HOLDOUT_FROM))          # 2003-2025
WARMUP = list(range(1999, FIRST))                   # 1999-2002: read only to warm up a history (a starter's EPA)

GAMES_URL = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv'
PBP_URL = 'https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.parquet'


EXAM = os.path.join(RAW, 'exam')                   # the held-out seasons' downloads, for the exam alone
_exam = False


def open_exam():
    """For a frozen equation's blind test only: this process may read the held-out seasons, and
    games.csv is the exam's fresh copy (scores through the latest final)."""
    global _exam
    _exam = True


def guard(season):
    if int(season) >= HOLDOUT_FROM and not _exam:
        raise SystemExit(f'season {season} is held out (research/README.md): not read here')


def pbp_path(season):
    guard(season)
    if int(season) >= HOLDOUT_FROM:
        return os.path.join(EXAM, 'pbp', f'play_by_play_{season}.parquet')
    return os.path.join(RAW, 'pbp', f'play_by_play_{season}.parquet')


def games(first=FIRST):
    """The schedule, scores and closing lines, held-out seasons dropped. `first` reaches back before
    2003 where a study needs games.csv's earlier seasons (a rating's warm-up, last season's
    results); the play-by-play starts at FIRST. In an exam process, every season, from the exam's
    fresh copy."""
    if _exam:
        g = pd.read_csv(os.path.join(EXAM, 'games.csv'), low_memory=False)
        return g[g['season'] >= first].reset_index(drop=True)
    g = pd.read_csv(os.path.join(RAW, 'games', 'games.csv'), low_memory=False)
    return g[g['season'].between(first, HOLDOUT_FROM - 1)].reset_index(drop=True)


# games.csv writes the codes of the day, the play-by-play today's
TEAM_NOW = {'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA'}


def pbp(season, columns=None):
    return pd.read_parquet(pbp_path(season), columns=columns)
