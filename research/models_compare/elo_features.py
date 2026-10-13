"""The ELO Model's per-game inputs for 2012-2025, rebuilt by the site's own elo/build.py in a sandbox.

elo/build.py writes every game's features (the expected lineup's player Elo by position group, home
field) to its cache before it fits the game model; its walk-forward record (model.json's
`walk_forward`) is published per season only. This runs that build unchanged, with three things moved
so it neither reads the held-out season nor touches the site: its cache and its output folder point
into this study's out/ (gitignored), the schedule is the research copy with 2026 dropped
(common.games), and the clock is 1 March 2026, after the 2025 season's last game, so the newest
season is 2025 and nothing of 2026 is downloaded. The build's own downloads (nflverse's player
stats, depth charts, injury reports, rosters for 2012-2025, play-by-play for 2024-2025) land in
out/elo/cache.

    python3 -I research/models_compare/elo_features.py     # writes out/elo/cache/features.json
"""
import importlib.util, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'research'))
import common  # noqa: E402

OUT = os.path.join(HERE, 'out', 'elo')
NOW = '2026-03-01T00:00:00Z'


def main():
    spec = importlib.util.spec_from_file_location('elo_build', os.path.join(ROOT, 'elo', 'build.py'))
    eb = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(eb)
    eb.CACHE = os.path.join(OUT, 'cache')
    eb.OUT = os.path.join(OUT, 'data')
    os.makedirs(eb.CACHE, exist_ok=True)
    os.makedirs(eb.OUT, exist_ok=True)
    fetch = eb.fetch

    def fetch_held_out_dropped(url, dest, offline, tries=3):
        if url == eb.GAMES_URL:              # the schedule: the research copy, 2026 on dropped
            common.games(eb.FIRST).to_csv(dest, index=False)
            return dest
        return fetch(url, dest, offline, tries)
    eb.fetch = fetch_held_out_dropped
    sys.argv = ['build.py', '--now', NOW]
    try:
        eb.main()
    except SystemExit as e:                  # the build's own refusal, after the features are written or not
        print('elo/build.py stopped:', e)
    feats = os.path.join(eb.CACHE, 'features.json')
    if not os.path.exists(feats):
        raise SystemExit('elo/build.py wrote no features.json')
    print('features:', feats)


if __name__ == '__main__':
    main()
