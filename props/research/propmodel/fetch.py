"""The free-data props model's downloads: nflverse files for the warm-up and table seasons, never 2026.

Every file is per season except two:

  * nfldata's games.csv covers every season in one file, 2026 among them. It is downloaded to a
    temporary name and cut, line by line on the game id's first four characters, to the seasons before
    HOLDOUT_FROM before anything parses a field; only that cut copy (games_to2025.csv) is kept, and the
    temporary file is deleted. No 2026 line, score or price is ever parsed or kept.
  * nflverse's players.csv is the current player master (as of today). Only its identity and pre-career
    columns are ever read (gsis_id, pfr_id, names, birth date, draft year/round/pick): its as-of-now
    columns (latest_team, last_season, status, years_of_experience) would tell a 2019 row how a career
    went, and build_features.py never reads them (usecols).

Every download goes through the repo's lib/netfetch.py (its retry rule), and a file already on disk is
not fetched again. Season files of HOLDOUT_FROM or later are refused outright.

HOLDOUT_FROM is 2026, and nothing in this folder can move it but the one-shot 2026 test. With the environment
variable PROPMODEL_LIFT_HOLDOUT set, HOLDOUT_FROM is 2027 (2026 is then downloaded, games.csv cut to
games_to2026.csv beside the 2025 cut the models were fitted on) only if all of these hold, and any process that
sets the variable without them is refused outright:
  * the program running is this folder's oneshot_2026.py (no other script, check or console lifts it);
  * the variable is the SHA-256 of PREREGISTRATION.md;
  * that file is committed in git and unmodified;
  * the last commit that touched it is on origin/main (merged and public, not a local or throwaway commit).

    python3 -I props/research/propmodel/fetch.py --data DIR [--first 2010] [--last 2025]
"""
import argparse
import hashlib
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'lib'))
import netfetch  # noqa: E402

HELD_OUT = 2026              # 2026 is the frozen test: no file of it is downloaded or read here...


def _holdout_from():
    """...unless the one-shot test lifts it: run as oneshot_2026.py, PROPMODEL_LIFT_HOLDOUT equal to the SHA-256 of
    PREREGISTRATION.md, committed, unmodified and on origin/main (module docstring)"""
    key = os.environ.get('PROPMODEL_LIFT_HOLDOUT')
    if not key:
        return HELD_OUT
    main = getattr(sys.modules.get('__main__'), '__file__', None) or ''
    if not main or os.path.realpath(main) != os.path.realpath(os.path.join(HERE, 'oneshot_2026.py')):
        raise SystemExit('refused: PROPMODEL_LIFT_HOLDOUT lifts the holdout for oneshot_2026.py alone; unset it')
    pre = os.path.join(HERE, 'PREREGISTRATION.md')
    if not os.path.exists(pre):
        raise SystemExit('refused: PROPMODEL_LIFT_HOLDOUT is set but there is no PREREGISTRATION.md')
    h = hashlib.sha256()
    with open(pre, 'rb') as f:
        h.update(f.read())
    if h.hexdigest() != key.strip().lower():
        raise SystemExit('refused: PROPMODEL_LIFT_HOLDOUT is not the SHA-256 of PREREGISTRATION.md')
    git = ['git', '-C', HERE]
    st = subprocess.run(git + ['status', '--porcelain', '--', 'PREREGISTRATION.md'], capture_output=True, text=True)
    lg = subprocess.run(git + ['log', '-1', '--format=%H', '--', 'PREREGISTRATION.md'], capture_output=True, text=True)
    if st.returncode or lg.returncode or st.stdout.strip() or not lg.stdout.strip():
        raise SystemExit('refused: PREREGISTRATION.md is not committed, or has changed since its commit')
    anc = subprocess.run(git + ['merge-base', '--is-ancestor', lg.stdout.strip(), 'origin/main'], capture_output=True)
    if anc.returncode:
        raise SystemExit('refused: the commit of PREREGISTRATION.md is not on origin/main (merge it, then git fetch)')
    return HELD_OUT + 1


HOLDOUT_FROM = _holdout_from()
NV = 'https://github.com/nflverse/nflverse-data/releases/download'
GAMES_URL = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv'
PLAYERS_URL = NV + '/players/players.csv'
# kind -> (url pattern, file pattern, first season the source has)
SEASON_FILES = {
    'stats': (NV + '/stats_player/stats_player_week_{y}.csv', 'stats_player_week_{y}.csv', 1999),
    'pbp': (NV + '/pbp/play_by_play_{y}.parquet', 'play_by_play_{y}.parquet', 1999),
    'roster': (NV + '/weekly_rosters/roster_weekly_{y}.csv', 'roster_weekly_{y}.csv', 2002),
    'snaps': (NV + '/snap_counts/snap_counts_{y}.csv', 'snap_counts_{y}.csv', 2013),
    'depth': (NV + '/depth_charts/depth_charts_{y}.csv', 'depth_charts_{y}.csv', 2001),
    'inj': (NV + '/injuries/injuries_{y}.csv', 'injuries_{y}.csv', 2009),
}
# the warm-up seasons only feed history (career and last-season features); their kinds
WARMUP_KINDS = ('stats', 'pbp', 'roster')


def path(data, kind, y):
    return os.path.join(data, 'raw', SEASON_FILES[kind][1].format(y=y))


def games_path(data):
    return os.path.join(data, 'raw', 'games_to%d.csv' % (HOLDOUT_FROM - 1))


def players_path(data):
    return os.path.join(data, 'raw', 'players.csv')


def cut_games(src, dest):
    """keep the header and the lines whose game id's season is before HOLDOUT_FROM; parse nothing else"""
    kept = dropped = 0
    with open(src, 'r', encoding='utf-8', newline='') as f, open(dest + '.part', 'w', encoding='utf-8', newline='') as o:
        head = f.readline()
        if not head.startswith('game_id,'):
            raise SystemExit('games.csv: the first column is not game_id; refusing to cut it blind')
        o.write(head)
        for line in f:
            y = line[:4]
            if not y.isdigit():
                raise SystemExit('games.csv: a line that does not start with a season: %r' % line[:20])
            if int(y) < HOLDOUT_FROM:
                o.write(line)
                kept += 1
            else:
                dropped += 1
    os.replace(dest + '.part', dest)
    return kept, dropped


def fetch(data, first, last, table_first, log=print):
    if last >= HOLDOUT_FROM:
        raise SystemExit('refused: season %d is held out (HOLDOUT_FROM=%d)' % (last, HOLDOUT_FROM))
    os.makedirs(os.path.join(data, 'raw'), exist_ok=True)
    jobs = []
    for y in range(first, last + 1):
        for kind, (url, _, since) in SEASON_FILES.items():
            if y < since:
                continue
            if y < table_first and kind not in WARMUP_KINDS:
                continue
            jobs.append((url.format(y=y), path(data, kind, y)))
    jobs.append((PLAYERS_URL, players_path(data)))
    got = 0
    for url, dest in jobs:
        if os.path.exists(dest) and os.path.getsize(dest) > 0:
            continue
        log('fetch', os.path.basename(dest))
        netfetch.download(url, dest, log=log)
        got += 1
    g = games_path(data)
    if not (os.path.exists(g) and os.path.getsize(g) > 0):
        tmp = os.path.join(data, 'raw', '.games_all.download')
        log('fetch games.csv (cut to seasons before %d, the rest discarded unparsed)' % HOLDOUT_FROM)
        netfetch.download(GAMES_URL, tmp, log=log)
        try:
            kept, dropped = cut_games(tmp, g)
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)
        log('  games: kept %d lines, discarded %d of %d or later' % (kept, dropped, HOLDOUT_FROM))
        got += 1
    log('fetch: %d downloaded, %d already on disk' % (got, len(jobs) + 1 - got))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'), required=os.environ.get('PROPMODEL_DATA') is None)
    ap.add_argument('--first', type=int, default=2010, help='first warm-up season (history only)')
    ap.add_argument('--table-first', type=int, default=2013, help='first season of the table (snap counts begin 2013)')
    ap.add_argument('--last', type=int, default=HOLDOUT_FROM - 1)
    a = ap.parse_args()
    fetch(a.data, a.first, a.last, a.table_first)


if __name__ == '__main__':
    main()
