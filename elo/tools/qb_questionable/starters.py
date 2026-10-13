"""Each team-game's starting quarterback from nflverse play-by-play (read-only from the cache):
the passer on the team's first quarterback dropback (passer_id, which nflverse fills for passes,
sacks and scrambles), plus every quarterback with a dropback and his count. 2012-2026; 2026 is
written only so it can be reported as information."""
import os
import sys
import pandas as pd

CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'cache')
OUT = os.path.join(os.environ.get('QB_WORK', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work')), 'starters.csv')
rows = []
for y in range(2012, 2027):
    d = pd.read_csv(f'{CACHE}/play_by_play_{y}.csv.gz', low_memory=False,
                    usecols=['game_id', 'season', 'week', 'posteam', 'play_id', 'qb_dropback', 'passer_id', 'passer'])
    d = d[(d.qb_dropback == 1) & d.passer_id.notna() & d.posteam.notna()].sort_values(['game_id', 'play_id'])
    for (gid, team), g in d.groupby(['game_id', 'posteam'], sort=False):
        cnt = g.passer_id.value_counts()
        rows.append({'season': int(g.season.iloc[0]), 'week': int(g.week.iloc[0]), 'game_id': gid, 'team': team,
                     'starter_id': g.passer_id.iloc[0], 'starter_name': g.passer.iloc[0],
                     'dropbacks': ';'.join(f'{k}:{v}' for k, v in cnt.items())})
    print(y, len(rows), flush=True)
pd.DataFrame(rows).to_csv(OUT, index=False)
print('wrote', OUT, len(rows))
