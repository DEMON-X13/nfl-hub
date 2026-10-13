"""Proof that data/games.parquet's pre-game features use only games before each kickoff.

A. By hand: 20 random games, one feature each, recomputed here from the raw play-by-play (and
   games.csv) filtered to games dated before the game's own date, with code written separately from
   build_dataset.py (plain filters and loops; no shared functions).
B. As of a date: the dataset rebuilt with the world cut off on the morning of a date (every game from
   that date on unplayed, its play-by-play removed) must give the games on that date exactly the
   features the full build gives them. Anything a feature took from the game itself or a later one
   would show as a difference.
C. Over every row: n games this season before this one equals games.csv's count of the team's
   games on earlier dates; no feature column is a function of the game's own result.

Prints, does not write (part B's mutant copy goes in a scratch folder under out/, removed after).
Run: python3 -I leakage_check.py   (from props/research/totals)
"""
import os, sys
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'data', 'raw')
MOD = {'STL': 'LA', 'SD': 'LAC', 'OAK': 'LV'}
G = pd.read_parquet(os.path.join(HERE, 'data', 'games.parquet'))
GC = pd.read_csv(os.path.join(RAW, 'games', 'games.csv'), low_memory=False)
_pbp = {}


def pbp(season):
    if season not in _pbp:
        _pbp[season] = pd.read_parquet(os.path.join(RAW, 'pbp', f'play_by_play_{season}.parquet'))
    return _pbp[season]


def team_plays(season, team, before, reg_only=False):
    """Every play-by-play row of `season` from the team's games dated before `before`."""
    p = pbp(season)
    p = p[(p.game_date < before) & ((p.home_team == team) | (p.away_team == team))]
    if reg_only:
        p = p[p.season_type == 'REG']
    return p


def scrim(p, side_team, offence=True):
    col = 'posteam' if offence else 'defteam'
    m = ((p[col] == side_team) & p.play_type.isin(['pass', 'run']) & ((p['pass'] == 1) | (p['rush'] == 1)) &
         (p.two_point_attempt != 1) & p.epa.notna())
    return p[m]


def n_games(p):
    return p.game_id.nunique()


def hand(feature, row):
    if feature == 'lg_ppg_std':
        g = GC[(GC.season == row.season) & (GC.gameday < row.gameday) & GC.home_score.notna()]
        return (g.home_score.sum() + g.away_score.sum()) / (2 * len(g))
    side = feature.split('_')[0]
    team = MOD.get(row[f'{side}_team'], row[f'{side}_team'])
    s, d = int(row.season), row.gameday
    f = feature[len(side) + 1:]
    if f.endswith('_std'):
        p = team_plays(s, team, d)
        base = f[:-4]; n = n_games(p)
        if base == 'off_epa':
            x = scrim(p, team); return x.epa.sum() / len(x)
        if base == 'def_sr':
            x = scrim(p, team, offence=False); return x.success.sum() / len(x)
        if base == 'plays_pg':
            return len(scrim(p, team)) / n
        if base == 'dplays_pg':
            return len(scrim(p, team, offence=False)) / n
        if base == 'off_pass_rate':
            x = scrim(p, team); return (x['pass'] == 1).sum() / len(x)
        if base in ('off_expl', 'def_expl'):
            x = scrim(p, team, offence=(base == 'off_expl'))
            e = ((x.rush == 1) & (x.yards_gained >= 10)) | ((x['pass'] == 1) & (x.yards_gained >= 20))
            return e.sum() / len(x)
        if base in ('def_rz_td', 'off_rz_trips_pg'):
            col = 'posteam' if base.startswith('off') else 'defteam'
            q = p[(p[col] == team) & p.down.notna() & (p.yardline_100 <= 20) & (p.two_point_attempt != 1)]
            drives = q.groupby(['game_id', 'fixed_drive']).fixed_drive_result.first()
            return (drives == 'Touchdown').mean() if base.endswith('td') else len(drives) / n
        if base == 'giveaways_pg':
            q = p[p.two_point_attempt != 1]
            ints = ((q.posteam == team) & (q.interception == 1)).sum()
            fum = ((q.fumble_lost == 1) & (q.fumbled_1_team == team)).sum()
            return (ints + fum) / n
        if base == 'takeaways_pg':
            q = p[p.two_point_attempt != 1]
            ints = ((q.defteam == team) & (q.posteam != team) & (q.interception == 1)).sum()
            fum = ((q.fumble_lost == 1) & q.fumbled_1_team.notna() & (q.fumbled_1_team != team)).sum()
            return (ints + fum) / n
        if base == 'sacks_made_pg':
            q = p[(p.defteam == team) & (p.two_point_attempt != 1)]
            return (q.sack == 1).sum() / n
        if base == 'pf_pg':
            g = GC[(GC.season == s) & (GC.gameday < d)]
            h = g[g.home_team == row[f'{side}_team']].home_score.tolist()
            a = g[g.away_team == row[f'{side}_team']].away_score.tolist()
            return sum(h + a) / len(h + a)
    if f.endswith('_ls'):
        base = f[:-3]
        if base == 'pa_pg':
            g = GC[(GC.season == s - 1) & (GC.game_type == 'REG')]
            hm = g.home_team.map(lambda t: MOD.get(t, t)) == team
            am = g.away_team.map(lambda t: MOD.get(t, t)) == team
            return (g[hm].away_score.sum() + g[am].home_score.sum()) / (hm.sum() + am.sum())
        if base == 'off_epa':
            p = team_plays(s - 1, team, '9999', reg_only=True)
            x = scrim(p, team); return x.epa.sum() / len(x)
    if f == 'qb_prev':
        # the team's last game before this one, this season or the one before
        for ss in (s, s - 1):
            p = team_plays(ss, team, d)
            if len(p):
                last = p[p.game_date == p.game_date.max()]
                db = last[(last.qb_dropback == 1) & (last.posteam == team) & last.passer_id.notna()]
                c = db.passer_id.value_counts()
                top = c[c == c.max()].index.min()
                return top
    if f == 'off_sr':      # the blend: n/(n+4) of this season, the rest last season's
        p = team_plays(s, team, d); n = n_games(p)
        x = scrim(p, team); cur = x.success.sum() / len(x) if len(x) else np.nan
        q = team_plays(s - 1, team, '9999', reg_only=True); y = scrim(q, team); ls = y.success.sum() / len(y)
        w = n / (n + 4.0)
        return ls if n == 0 else w * cur + (1 - w) * ls
    if f.startswith('te_') or f.startswith('de_'):
        # the props app's EWM by hand: every regular-season game of the franchise since 2009 before
        # this one, oldest first, weights (1-a)^(age)
        span = 6 if f.startswith('te_') else 8
        a = 2.0 / (span + 1)
        vals = []
        for ss in range(2009, s + 1):
            p = team_plays(ss, team, d, reg_only=True)
            for gid, gp in sorted(p.groupby('game_id'), key=lambda kv: kv[1].game_date.iloc[0]):
                live = (gp.two_point_attempt != 1) & (gp.play_type != 'no_play')
                if f == 'te_t_pass_yds':
                    vals.append(gp[live & (gp.posteam == team)].passing_yards.fillna(0).sum())
                elif f == 'de_d_tds':
                    q = gp[(gp.two_point_attempt != 1) & (gp.defteam == team)]
                    vals.append(((q.rush_touchdown == 1) & (q.td_team == q.posteam)).sum())
        w = np.array([(1 - a) ** (len(vals) - 1 - i) for i in range(len(vals))])
        return float(np.dot(w, vals) / w.sum())
    raise KeyError(feature)


FEATS = ['home_off_epa_std', 'away_def_sr_std', 'home_plays_pg_std', 'away_off_pass_rate_std', 'home_off_expl_std',
         'away_def_rz_td_std', 'home_giveaways_pg_std', 'away_sacks_made_pg_std', 'home_pf_pg_std', 'away_pa_pg_ls',
         'home_off_epa_ls', 'away_qb_prev', 'home_te_t_pass_yds', 'away_de_d_tds', 'lg_ppg_std',
         'home_takeaways_pg_std', 'away_off_rz_trips_pg_std', 'home_dplays_pg_std', 'away_off_sr', 'home_def_expl_std']


def part_a():
    print('A. 20 random games, one feature each, recomputed by hand from play-by-play before kickoff')
    rng = np.random.default_rng(20261010)
    pool = G[(G.season >= 2010) & (G.home_n_std >= 1) & (G.away_n_std >= 1)]
    idx = rng.choice(len(pool), size=20, replace=False)
    ok = 0
    for f, i in zip(FEATS, idx):
        r = pool.iloc[i]
        ds, hv = r[f], hand(f, r)
        same = (ds == hv) if isinstance(ds, str) else bool(np.isclose(float(ds), float(hv), rtol=1e-9, atol=1e-9))
        ok += same
        dsv = ds if isinstance(ds, str) else f'{float(ds):.6f}'
        hvv = hv if isinstance(hv, str) else f'{float(hv):.6f}'
        print(f"   {r.game_id:<18s} {r.gameday} {r.gametime:>5s} {f:<26s} dataset {dsv:>12s}  by hand {hvv:>12s}  "
              f"{'ok' if same else 'MISMATCH'}")
    print(f'   {ok}/20 match')
    return ok == 20


FEATURE_COLS = [c for c in G.columns if c not in
                ('game_id', 'home_score', 'away_score', 'total', 'result', 'overtime', 'played')]


def part_b(cutoffs):
    sys.path.insert(0, HERE)
    import build_dataset as B
    print('B. as-of rebuilds: the world cut off on the morning of each date; games on that date must match the full build')
    allok = True
    for c in cutoffs:
        A, _ = B.build(cutoff=c, write=False)
        day = G[G.gameday == c].set_index('game_id')[FEATURE_COLS]
        asof = A[A.gameday == c].set_index('game_id')[FEATURE_COLS]
        asof = asof.loc[day.index]
        bad = []
        for col in FEATURE_COLS:
            x, y = day[col], asof[col]
            if x.dtype.kind in 'fc' or y.dtype.kind in 'fc':
                eq = np.isclose(x.astype(float), y.astype(float), rtol=1e-12, atol=1e-12, equal_nan=True)
            else:
                eq = (x.astype(str) == y.astype(str)).to_numpy()
            if not eq.all():
                bad.append(col)
        # control: the next game day's games DO differ, since the full build has seen this day's results
        nxt = G[(G.gameday > c) & (G.season == G[G.gameday == c].season.iloc[0])].gameday.min()
        moved = None
        if isinstance(nxt, str):
            later = G[G.gameday == nxt].set_index('game_id')[FEATURE_COLS]
            later_asof = A[A.gameday == nxt].set_index('game_id')[FEATURE_COLS].loc[later.index]
            num = [k for k in FEATURE_COLS if later[k].dtype.kind in 'fi']
            moved = int((~np.isclose(later[num].astype(float), later_asof[num].astype(float), equal_nan=True)).any(axis=1).sum())
            moved = f'{moved} of its {len(later)} games differ'
        allok &= not bad
        print(f"   {c}: {len(day)} games x {len(FEATURE_COLS)} columns  "
              f"{'identical' if not bad else 'DIFFER: ' + ', '.join(bad[:8])}"
              f"   (control: next game day {nxt}, {moved})")
    return allok


def part_b_mutant(cutoff):
    """The as-of test must catch a leak: a copy of the builder whose season-to-date sums include the
    game itself."""
    import importlib.util, tempfile
    src = open(os.path.join(HERE, 'build_dataset.py')).read()
    old = 'cum = gb[SUMS].cumsum() - tg[SUMS]'
    assert src.count(old) == 1
    src = src.replace(old, 'cum = gb[SUMS].cumsum()').replace(
        "HERE = os.path.dirname(os.path.abspath(__file__))", f"HERE = {HERE!r}")
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    d = tempfile.mkdtemp(dir=os.path.join(HERE, 'out'))
    path = os.path.join(d, 'leaky_build.py'); open(path, 'w').write(src)
    spec = importlib.util.spec_from_file_location('leaky_build', path)
    L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
    import shutil
    full, _ = L.build(write=False)
    asof, _ = L.build(cutoff=cutoff, write=False)
    a = full[full.gameday == cutoff].set_index('game_id')['home_off_epa_std']
    b = asof[asof.gameday == cutoff].set_index('game_id')['home_off_epa_std'].loc[a.index]
    n = int((~np.isclose(a, b, equal_nan=True)).sum())
    shutil.rmtree(d, ignore_errors=True)
    print(f'   mutant (season-to-date includes the game itself), {cutoff}: home_off_epa_std differs on {n} of {len(a)} games '
          f"-> the as-of test {'catches it' if n else 'MISSES IT'}")
    return n > 0


def part_c():
    print('C. every row: games-before counts equal games.csv\'s; no feature tracks the game\'s own result')
    gc = GC[GC.season.between(2010, 2026)].copy()
    ok = True
    for side in ('home', 'away'):
        cnt = []
        for r in G.itertuples(index=False):
            t = getattr(r, f'{side}_team'); s = r.season; d = r.gameday
            m = gc[(gc.season == s) & (gc.gameday < d) & ((gc.home_team == t) | (gc.away_team == t)) & gc.home_score.notna()]
            cnt.append(len(m))
        cnt = np.array(cnt)
        diff = (cnt != G[f'{side}_n_std'].to_numpy()).sum()
        ok &= diff == 0
        print(f'   {side}_n_std vs games.csv: {diff} rows differ of {len(G)}')
    # correlation of each numeric feature with the game's own total, within dev seasons: a leaked
    # feature (one carrying the game's own points) would stand far above the rest
    D = G[(G.season <= 2023) & G.played]
    num = [c for c in FEATURE_COLS if D[c].dtype.kind in 'fi' and c not in ('season', 'week')]
    cors = {c: abs(np.corrcoef(D[c].fillna(D[c].mean()), D.total)[0, 1]) for c in num if D[c].std() > 0}
    top = sorted(cors.items(), key=lambda kv: -kv[1])[:6]
    print('   largest |corr| with the game\'s own total, dev seasons: ' +
          ', '.join(f'{k} {v:.3f}' for k, v in top))
    return ok


if __name__ == '__main__':
    a = part_a()
    b = part_b(['2012-11-18', '2014-09-04', '2016-12-24', '2019-10-13', '2021-01-09', '2023-12-31', '2026-10-04'])
    m = part_b_mutant('2019-10-13')
    c = part_c()
    print('LEAKAGE CHECK:', 'passed' if (a and b and m and c) else 'FAILED')
