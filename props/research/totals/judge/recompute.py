"""Judge's independent recompute of the pre-game features the candidates read, from raw games.csv and
play-by-play, with code written here (no import of build_dataset, harness or any candidate).

For a stratified random sample of played games (dev 2012-2023, 2024, 2025, 2026), every feature below is
recomputed for both sides from games dated strictly before the game's own date, and compared with
data/games.parquet:
  n_std, pf_pg_std, pa_pg_std, pf_pg_ls, pa_pg_ls, off_epa_std, def_epa_std, plays_pg_std, dplays_pg_std,
  off_epa_ls, def_epa_ls, plays_pg_ls, dplays_pg_ls, qb_prev, qb_new; and lg_n_std, lg_ppg_std, lg_ppg_ls,
  lg_epa_std, lg_plays_std, lg_epa_ls, lg_plays_ls.
Run: python3 -I judge/recompute.py   (from props/research/totals)
"""
import os, sys
import numpy as np, pandas as pd

TOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(TOT, 'data', 'raw')
FR = {'STL': 'LA', 'SD': 'LAC', 'OAK': 'LV'}
f = lambda t: FR.get(t, t)

GC = pd.read_csv(os.path.join(RAW, 'games', 'games.csv'), low_memory=False)
GC = GC[GC.season.between(2009, 2026)].copy()
GC['hf'] = GC.home_team.map(f); GC['af'] = GC.away_team.map(f)
D = pd.read_parquet(os.path.join(TOT, 'data', 'games.parquet'))

# my own per (game, offence franchise) aggregates, straight from pbp
COLS = ['game_id', 'posteam', 'defteam', 'play_type', 'pass', 'rush', 'two_point_attempt', 'epa', 'qb_dropback',
        'passer_id', 'game_date', 'season_type']
AGG = {}
for s in range(2009, 2027):
    p = pd.read_parquet(os.path.join(RAW, 'pbp', f'play_by_play_{s}.parquet'), columns=COLS)
    p = p[p.posteam.notna()]
    sc = p[(p.play_type == 'pass') | (p.play_type == 'run')]
    sc = sc[((sc['pass'] == 1) | (sc['rush'] == 1)) & (sc.two_point_attempt.fillna(0) != 1) & sc.epa.notna()]
    a = sc.groupby(['game_id', 'posteam']).agg(plays=('epa', 'size'), epa=('epa', 'sum')).reset_index()
    db = p[(p.qb_dropback == 1) & p.passer_id.notna()].groupby(['game_id', 'posteam', 'passer_id']).size().rename('k').reset_index()
    db = db.sort_values(['game_id', 'posteam', 'k', 'passer_id'], ascending=[True, True, False, True]).drop_duplicates(['game_id', 'posteam'])
    a = a.merge(db[['game_id', 'posteam', 'passer_id']], on=['game_id', 'posteam'], how='left')
    a['posteam'] = a.posteam.map(f)
    AGG[s] = a.set_index(['game_id', 'posteam'])


def team_games(s, team, before=None, reg=False):
    g = GC[(GC.season == s) & GC.home_score.notna() & ((GC.hf == team) | (GC.af == team))]
    if before is not None:
        g = g[g.gameday < before]
    if reg:
        g = g[g.game_type == 'REG']
    return g


def side_stats(s, team, before=None, reg=False):
    g = team_games(s, team, before, reg)
    n = len(g)
    if n == 0:
        return dict(n=0)
    pf = np.where(g.hf == team, g.home_score, g.away_score).sum()
    pa = np.where(g.hf == team, g.away_score, g.home_score).sum()
    A = AGG[s]
    op = oe = dp = de = 0.0
    for gid, h, a_ in zip(g.game_id, g.hf, g.af):
        opp = a_ if h == team else h
        o = A.loc[(gid, team)]; d = A.loc[(gid, opp)]
        op += o.plays; oe += o.epa; dp += d.plays; de += d.epa
    return dict(n=n, pf_pg=pf / n, pa_pg=pa / n, off_epa=oe / op, def_epa=de / dp, plays_pg=op / n, dplays_pg=dp / n)


def league(s, before=None, reg=False):
    g = GC[(GC.season == s) & GC.home_score.notna()]
    if before is not None:
        g = g[g.gameday < before]
    if reg:
        g = g[g.game_type == 'REG']
    if not len(g):
        return dict(n=0)
    A = AGG[s]
    sub = A[A.index.get_level_values(0).isin(set(g.game_id))]
    tg = 2 * len(g)
    return dict(n=tg, ppg=(g.home_score.sum() + g.away_score.sum()) / tg, epa=sub.epa.sum() / sub.plays.sum(),
                plays=sub.plays.sum() / tg)


def qb_prev(s, team, before):
    for ss in (s, s - 1):
        g = team_games(ss, team, before if ss == s else None)
        if len(g):
            last = g.sort_values('gameday').iloc[-1]
            r = AGG[ss].loc[(last.game_id, team)]
            return r.passer_id
    return None


def check(row):
    out = []
    s, d = int(row.season), row.gameday
    for side in ('home', 'away'):
        t = f(row[f'{side}_team'])
        cur = side_stats(s, t, d)
        ls = side_stats(s - 1, t, None, reg=True)
        out.append((f'{side}_n_std', row[f'{side}_n_std'], cur['n']))
        for k in ('pf_pg', 'pa_pg', 'off_epa', 'def_epa', 'plays_pg', 'dplays_pg'):
            if cur['n']:
                out.append((f'{side}_{k}_std', row[f'{side}_{k}_std'], cur[k]))
            out.append((f'{side}_{k}_ls', row[f'{side}_{k}_ls'], ls[k]))
        q = qb_prev(s, t, d)
        out.append((f'{side}_qb_prev', row[f'{side}_qb_prev'], q))
        st = row[f'{side}_qb_start']
        out.append((f'{side}_qb_new', row[f'{side}_qb_new'], int(isinstance(st, str) and q is not None and st != q)))
    lc = league(s, d); ll = league(s - 1, None, reg=True)
    out.append(('lg_n_std', row.lg_n_std, lc['n']))
    if lc['n']:
        out += [('lg_ppg_std', row.lg_ppg_std, lc['ppg']), ('lg_epa_std', row.lg_epa_std, lc['epa']),
                ('lg_plays_std', row.lg_plays_std, lc['plays'])]
    out += [('lg_ppg_ls', row.lg_ppg_ls, ll['ppg']), ('lg_epa_ls', row.lg_epa_ls, ll['epa']), ('lg_plays_ls', row.lg_plays_ls, ll['plays'])]
    bad = []
    for k, a, b in out:
        if isinstance(a, str) or isinstance(b, str) or a is None or b is None:
            ok = (a == b) or (a is None and b is None) or (pd.isna(a) and b is None)
        else:
            ok = np.isclose(float(a), float(b), rtol=1e-9, atol=1e-9)
        if not ok:
            bad.append((k, a, b))
    return len(out), bad


rng = np.random.default_rng(11)
P = D[D.played & D.total_line.notna()]
strata = [('dev', P[P.season <= 2023], 15), ('2024', P[P.season == 2024], 10), ('2025', P[P.season == 2025], 10),
          ('2026', P[P.season == 2026], 10)]
tot_n = tot_bad = 0
for label, pool, k in strata:
    idx = rng.choice(len(pool), size=k, replace=False)
    for i in idx:
        r = pool.iloc[i]
        n, bad = check(r)
        tot_n += n; tot_bad += len(bad)
        print(f'{label:5s} {r.game_id:18s} {r.gameday} {n:3d} features  ' + ('ok' if not bad else f'MISMATCH {bad[:4]}'))
print(f'TOTAL {tot_n} feature values compared, {tot_bad} mismatches')
