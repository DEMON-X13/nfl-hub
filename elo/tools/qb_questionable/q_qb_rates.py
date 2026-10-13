"""How often a Questionable quarterback started, by his last practice, 2013-2025 (and 2012 apart,
2026 as information only): from the final injury report (nflverse injuries files, read-only from
the cache) and the starters from play-by-play (starters.csv). Also split by whether he had started
his club's previous game (a regular starter on the report, not a backup)."""
import os
import pandas as pd

CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'cache')
W = os.environ.get('QB_WORK', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
TEAM_NOW = {'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA'}
st = pd.read_csv(f'{W}/starters.csv')
st['team'] = st.team.replace(TEAM_NOW)
st = st.sort_values(['season', 'week'])
start = {(r.season, r.week, r.team): r.starter_id for r in st.itertuples(index=False)}
# each club's previous game's starter, before (season, week)
prev = {}
for (s, t), g in st.groupby(['season', 'team']):
    last = None
    for r in g.itertuples(index=False):
        prev[(s, r.week, t)] = last
        last = r.starter_id
rows = []
for y in range(2012, 2027):
    d = pd.read_csv(f'{CACHE}/injuries_{y}.csv', low_memory=False)
    d = d[(d.position == 'QB') & (d.report_status == 'Questionable') & d.gsis_id.notna() & d.week.notna()].copy()
    d['team'] = d.team.replace(TEAM_NOW)
    for r in d.itertuples(index=False):
        k = (int(y), int(r.week), r.team)
        ps = r.practice_status if isinstance(r.practice_status, str) and r.practice_status.strip() else '(blank)'
        ps = 'Limited' if 'Limited' in ps else 'Did Not' if 'Did Not' in ps else 'Full' if 'Full' in ps else ps
        rows.append({'season': int(y), 'week': int(r.week), 'team': r.team, 'pid': r.gsis_id, 'name': r.full_name,
                     'practice': ps, 'game': k in start, 'started': start.get(k) == r.gsis_id,
                     'prev_starter': prev.get(k) == r.gsis_id})
df = pd.DataFrame(rows)
df.to_csv(f'{W}/q_qb_rows.csv', index=False)
for lab, (a, b) in [('2012', (2012, 2012)), ('2013-2025', (2013, 2025)), ('2018-2025', (2018, 2025)), ('2026 (information only)', (2026, 2026))]:
    x = df[(df.season >= a) & (df.season <= b) & df.game]
    print(f'== {lab}: questionable QB-weeks with a game {len(x)} (no game in play-by-play: {((df.season >= a) & (df.season <= b) & ~df.game).sum()})')
    for ps, g in x.groupby('practice'):
        p = g[g.prev_starter]
        print(f'  {ps:10s} all {len(g):4d} started {int(g.started.sum()):4d} ({g.started.mean():.3f}) | '
              f'had started the club\'s previous game {len(p):4d}, started {int(p.started.sum()):4d} ({p.started.mean() if len(p) else float("nan"):.3f})')
