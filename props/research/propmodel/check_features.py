"""Recompute a random sample of the feature table's cells from the raw files, with code that shares nothing
with build_features.py (no import of it), and hold the table to them.

For each sampled (player, game) row it reads the raw nflverse files and filters them to what came
before that game, then recomputes: the player's season-to-date receiving yards per game and games
played, his snap share in his previous game, his team's season-to-date plays per game, the game's
implied team points, his depth on that week's chart, and his own injury status. A cell counts as
matched within 1e-6. The player's games are worked out here on their own: every regular-season game
with a stats row for him or a snap-count row with an offensive or special-teams snap, placed by PFR id
through players.csv alone.

    python3 -I props/research/propmodel/check_features.py --data DIR [--n 400] [--seed 7]
"""
import argparse
import json
import os

import numpy as np
import pandas as pd

HOLD = 2026
FIX = {'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA', 'SL': 'LA', 'LAR': 'LA', 'ARZ': 'ARI', 'BLT': 'BAL', 'CLV': 'CLE',
       'HST': 'HOU', 'JAC': 'JAX'}


def raw(data, name):
    return os.path.join(data, 'raw', name)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--n', type=int, default=400)
    ap.add_argument('--seed', type=int, default=7)
    a = ap.parse_args()
    t = pd.read_parquet(os.path.join(a.data, 'features.parquet'))
    assert t.season.max() < HOLD
    pool = t[(t.role_played == 1) & t.grp.isin(['RB', 'WR', 'TE']) & (t.season >= 2016)]
    smp = pool.sample(a.n, random_state=a.seed)
    seasons = sorted(smp.season.unique())

    ids = pd.read_csv(raw(a.data, 'players.csv'), usecols=['gsis_id', 'pfr_id']).dropna()
    pfr = dict(zip(ids.pfr_id, ids.gsis_id))
    games = pd.read_csv(raw(a.data, 'games_to2025.csv'), low_memory=False)
    games = games[games.game_type == 'REG']
    res = {k: [0, 0, []] for k in ('p_receiving_yards_szn', 'x_gp_szn', 'p_off_pct_l1', 't_plays_szn', 'g_implied',
                                   'dc_depth', 'inj_questionable')}

    def note(k, ok, info):
        res[k][0] += 1
        res[k][1] += int(ok)
        if not ok and len(res[k][2]) < 5:
            res[k][2].append(info)

    for y in seasons:
        rows = smp[smp.season == y]
        st = pd.read_csv(raw(a.data, f'stats_player_week_{y}.csv'), low_memory=False,
                         usecols=['player_id', 'week', 'season_type', 'team', 'receiving_yards'])
        st = st[st.season_type == 'REG']
        sn = pd.read_csv(raw(a.data, f'snap_counts_{y}.csv'))
        sn = sn[sn.game_type == 'REG'].copy()
        sn['gsis'] = sn.pfr_player_id.map(pfr)
        pb = pd.read_parquet(raw(a.data, f'play_by_play_{y}.parquet'),
                             columns=['week', 'season_type', 'posteam', 'play_type', 'two_point_attempt', 'qb_dropback',
                                      'rush_attempt', 'qb_scramble'])
        pb = pb[pb.season_type == 'REG']
        dc = pd.read_csv(raw(a.data, f'depth_charts_{y}.csv'), low_memory=False)
        inj = pd.read_csv(raw(a.data, f'injuries_{y}.csv'), low_memory=False)
        inj = inj[inj.game_type == 'REG']
        for _, r in rows.iterrows():
            pid, w, team = r.pid, int(r.week), r.team
            # his games this season before week w
            s1 = st[(st.player_id == pid) & (st.week < w)][['week', 'receiving_yards']]
            s2 = sn[(sn.gsis == pid) & (sn.week < w) & ((sn.offense_snaps > 0) | (sn.st_snaps > 0))][['week']]
            wk = sorted(set(s1.week) | set(s2.week))
            note('x_gp_szn', len(wk) == r.x_gp_szn, (pid, y, w, len(wk), r.x_gp_szn))
            if wk:
                ry = s1.set_index('week').receiving_yards.reindex(wk).fillna(0).mean()
                note('p_receiving_yards_szn', abs(ry - r.p_receiving_yards_szn) < 1e-6, (pid, y, w, ry, r.p_receiving_yards_szn))
            # snap share in his previous game (any season: only check when it was this season)
            prev = sn[(sn.gsis == pid) & (sn.week < w) & ((sn.offense_snaps > 0) | (sn.st_snaps > 0))]
            allg = sorted(set(prev.week) | set(s1.week))
            if allg:
                lw = allg[-1]
                x = sn[(sn.gsis == pid) & (sn.week == lw)]
                if len(x) == 1:
                    note('p_off_pct_l1', abs(float(x.offense_pct.iloc[0]) - r.p_off_pct_l1) < 1e-6,
                         (pid, y, w, float(x.offense_pct.iloc[0]), r.p_off_pct_l1))
            # team plays per game this season before week w: dropbacks plus designed runs, no two-point tries
            q = pb[(pb.week < w) & (pb.posteam.replace(FIX) == team) & pb.play_type.isin(['pass', 'run'])
                   & (pb.two_point_attempt.fillna(0) != 1)]
            dbk = q.qb_dropback.fillna(0) == 1
            drun = (q.play_type == 'run') & (q.rush_attempt.fillna(0) == 1) & (q.qb_scramble.fillna(0) != 1)
            pp = (dbk | drun).groupby(q.week).sum()
            if len(pp):
                note('t_plays_szn', abs(pp.mean() - r.t_plays_szn) < 1e-6, (team, y, w, pp.mean(), r.t_plays_szn))
            # implied points from the closing spread and total
            g = games[(games.season == y) & (games.week == w) & ((games.home_team.replace(FIX) == team) | (games.away_team.replace(FIX) == team))]
            if len(g) == 1:
                g = g.iloc[0]
                home = FIX.get(g.home_team, g.home_team)
                mar = g.spread_line if home == team else -g.spread_line
                imp = g.total_line / 2 + mar / 2
                note('g_implied', abs(imp - r.g_implied) < 1e-6, (team, y, w, imp, r.g_implied))
            # depth on that week's chart (weekly charts only: through 2024)
            if 'depth_team' in dc.columns:
                d = dc[(dc.week == w) & (dc.game_type == 'REG') & (dc.gsis_id == pid) & (dc.formation == 'Offense')]
                pos = d.depth_position.astype(str).str.strip()
                pos = pos.where(~pos.isin(['', 'nan']), d.position.astype(str))
                grpmap = {'RB': 'RB', 'HB': 'RB', 'FB': 'RB', 'F': 'RB', 'WR': 'WR', 'LWR': 'WR', 'RWR': 'WR', 'SWR': 'WR',
                          'TE': 'TE', 'TE/HB': 'TE', 'H-B': 'TE'}
                d = d[pos.map(grpmap) == r.grp]
                want = float(d.depth_team.min()) if len(d) else np.nan
                got = r.dc_depth
                note('dc_depth', (np.isnan(want) and pd.isna(got)) or want == got, (pid, y, w, want, got))
            # his own injury status
            i = inj[(inj.week == w) & (inj.gsis_id == pid)]
            q_ = int((i.report_status == 'Questionable').any())
            note('inj_questionable', q_ == r.inj_questionable, (pid, y, w, q_, r.inj_questionable))
    out = {k: {'checked': v[0], 'matched': v[1], 'examples_of_misses': v[2]} for k, v in res.items()}
    print(json.dumps(out, indent=1, default=str))
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, 'results', 'check_features.json'), 'w') as f:
        json.dump(out, f, indent=1, default=str)


if __name__ == '__main__':
    main()
