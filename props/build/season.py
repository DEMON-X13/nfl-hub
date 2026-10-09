"""The season the prop model follows, read from the one place it is set.

That place is the page: `const SEASON=2026, KEY='props_2026_v1';` in part2.js. The storage key
carries the year too, the Bets and Stats build asserts that exact line, and its sync layer names
the key, so the page's line is the one that has to change at a rollover anyway. weekly.py,
payload.py and mktbuild.py take the season from here, the payload carries it (`season`), and the
audit checks the page and the payload agree, so the job can never bake one season into a page
built for another.

At a rollover: change that line in part2.js (and the key in nflbets/build/sync.js and the
assert in nflbets/build/build.js with it), refit the model on the season just finished, and
rebuild raw/feat.pkl (a runner rebuilds it, since raw/ is not committed); nothing in props/
needs a second edit. The baselines are the season before (BASE), and the raw files are named
after the season they hold. The data/ files are not: weekly.py moves last season's week files
(wk*_lines.csv, prices_wk*.csv, gamelines_wk*.csv) to data/archive/<season>/ on its first run
of the new season, bakes only this season's games wherever a row sits, and carries none of a
last-season payload's main lines forward. Until nflverse posts the new season's stats and
injury files the job publishes without them and the page says so (not_posted).
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))


def page_season():
    src = open(os.path.join(HERE, 'part2.js'), encoding='utf-8').read()
    m = re.search(r"const SEASON=(\d{4}), KEY='props_(\d{4})_v1';", src)
    if not m:
        raise SystemExit("part2.js has no `const SEASON=YYYY, KEY='props_YYYY_v1';` line to read the season from")
    if m.group(1) != m.group(2):
        raise SystemExit(f"part2.js: SEASON {m.group(1)} and the storage key's {m.group(2)} disagree")
    return int(m.group(1))


SEASON = page_season()
BASE = SEASON - 1          # the season the baselines are built from

REL = 'https://github.com/nflverse/nflverse-data/releases/download/'
# raw/ file name -> (what it is, where it comes from, required). A required file that fails to
# download stops the run before anything is published; the last good payload stays live.
RAW_FILES = {
    'games.csv':                 ('schedule, scores and lines', 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv', True),
    f'pw_{SEASON}.csv':          ('player stats', f'{REL}stats_player/stats_player_week_{SEASON}.csv', True),
    f'roster_{SEASON}.csv':      ('rosters', f'{REL}rosters/roster_{SEASON}.csv', True),
    f'injuries_{SEASON}.csv':    ('injury report', f'{REL}injuries/injuries_{SEASON}.csv', True),
    f'depth_charts_{SEASON}.csv': ('depth charts', f'{REL}depth_charts/depth_charts_{SEASON}.csv', False),
}
GAMES, STATS, ROSTER, INJURIES, DEPTH = list(RAW_FILES)
# the skill positions the page projects; FB and HB count as backs
SKILL = ('QB', 'RB', 'WR', 'TE', 'K', 'FB', 'HB')
