"""A third reading of "started": the first of the club's QBs (QB snap rows of that game, as qb_q_starts.py
joined them) to appear as passer or rusher in the game's play-by-play (elo/cache, read only; 2013-2025 only).
Adds `first_qb` and `first_started` to rows.csv and prints the Questionable tables on it.
Usage: python3 -I qb_first_snap.py <out dir> <elo cache dir>"""
import math
import sys

import pandas as pd

OUT, CACHE = sys.argv[1], sys.argv[2]
R = pd.read_csv(f'{OUT}/rows.csv', low_memory=False)
cg = pd.read_csv(f'{OUT}/club_games.csv', low_memory=False)
# the QB set per (game, team) from the snap starter table: rebuild from rows' starter isn't enough, so read the
# QB gsis ids that qb_q_starts.py placed: every starter, incumbent and chart QB in rows, plus each club-game's starter
first = {}
for y in range(2013, 2026):
    p = pd.read_csv(f'{CACHE}/play_by_play_{y}.csv.gz', low_memory=False,
                    usecols=['game_id', 'play_id', 'season_type', 'posteam', 'passer_player_id', 'rusher_player_id', 'play_type'])
    p = p[(p.season_type == 'REG') & p.posteam.notna()].sort_values(['game_id', 'play_id'])
    for (gid, team), g in p.groupby(['game_id', 'posteam'], sort=False):
        first[(gid, team)] = list(dict.fromkeys([x for pair in zip(g.passer_player_id, g.rusher_player_id) for x in pair if isinstance(x, str)]))
print('club-games with play-by-play:', len(first))


PBP_CODE = {'STL': 'LA', 'SD': 'LAC', 'OAK': 'LV'}   # the play-by-play writes today's codes in every season


def first_qb(gid, team, cands):
    seq = first.get((gid, PBP_CODE.get(team, team)))
    if not seq:
        return None
    for pid in seq:
        if pid in cands:
            return pid
    return None


# the club's QBs in a game: everyone qb_q_starts.py had as that game's starter, incumbent or chart QB,
# plus the starter; a QB who passed or ran first must be one of those who took snaps, so use the snap QB set
snapq = pd.read_csv(f'{OUT}/qb_snaps.csv', low_memory=False)
qset = {k: set(v.gsis) for k, v in snapq.groupby(['game_id', 'team'])}
R['first_qb'] = [first_qb(g, t, qset.get((g, t), set())) for g, t in zip(R.game_id, R.team)]
R['first_started'] = R.first_qb == R.gsis
cg['first_qb'] = [first_qb(g, t, qset.get((g, t), set())) for g, t in zip(cg.game_id, cg.team)]
print('club-games: first QB to pass or run = snap leader:', int((cg.first_qb == cg.starter).sum()), 'of', len(cg),
      ' none found:', int(cg.first_qb.isna().sum()), ' = games.csv QB:', int((cg.first_qb == cg.gc_qb).sum()))
R.to_csv(f'{OUT}/rows.csv', index=False)


def wilson(k, n, z=1.959963984540054):
    ph = k / n
    den = 1 + z * z / n
    c = (ph + z * z / (2 * n)) / den
    h = z * math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n)) / den
    return f'{100*ph:5.1f}% [{100*max(0, c-h):4.1f}, {100*min(1, c+h):5.1f}]'


lines = ['THIRD READING OF "STARTED": the first of the club\'s QBs to pass or run in the play-by-play']
for pop in ('incumbent', 'chart QB1'):
    for lab, lo in (('2013-2025', 2013), ('2016-2025', 2016)):
        for st in ('Questionable', 'Doubtful'):
            d = R[(R.population == pop) & (R.season >= lo) & (R.status == st)]
            for g in ('Full', 'Limited', 'Did Not Participate'):
                e = d[d.practice == g]
                if len(e):
                    k = int(e.first_started.sum())
                    lines.append(f'  {pop:10s} {lab} {st:12s} {g:20s} n={len(e):3d}  first QB to pass/run {k:3d} {wilson(k, len(e))}   (led snaps {int((e.outcome == "started").sum())})')
print('\n'.join(lines))
open(f'{OUT}/first_snap.txt', 'w').write('\n'.join(lines) + '\n')
