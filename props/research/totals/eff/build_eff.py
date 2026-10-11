"""Opponent-adjusted efficiency ratings for the efficiency candidate, as of each game's date.

For every game (2010-2026, played or to come) and both sides, each team's offensive and defensive
rating on each stat below, from a weighted ridge fitted on the games that kicked off on an EARLIER
calendar date only:

    y(team-game) = mu + h * home + o[offence] + d[defence] + e

    data   : this season's played games dated before the game's date (regular season and playoffs),
             plus the previous season's played games at weight W_PREV (the carry-in; it dominates
             early in the season and fades as this season's games pile up)
    weight : per-game stats 1 a game; per-play stats plays / PLAYS0 a game; red-zone TD rate
             trips / RZ0 a game, so every game is roughly one unit
    ridge  : ALPHA (in those units) on every o and d; mu and h free. Teams are franchises (STL->LA,
             SD->LAC, OAK->LV), so a relocated club keeps its history. A neutral site has home 0.

Stats rated (per team-game offence; the defence is the same stat allowed):
    pts      points scored
    epa      EPA per scrimmage play           sr     success rate        expl   explosive rate
    plays    scrimmage plays                  pass   dropback rate       rz     red-zone TD rate
    rztrips  red-zone trips                   give   giveaways

The box per team-game is build_dataset.team_box (the shared dataset's own definition of a scrimmage
play, explosive play, red-zone trip and giveaway). Points are games.csv's scores.

Output: data/eff/features_<tag>.parquet, one row per game_id with, for each stat s:
    e_mu_<s>, e_h_<s>                         the league level and home term as of the date
    e_home_o_<s>, e_home_d_<s>, e_away_o_<s>, e_away_d_<s>
and e_n_cur (games this season in the fit), e_home_n, e_away_n (each side's games this season before).

as_of_check(): the world cut off on the morning of a date (every game from that date on unplayed and
its play-by-play gone) must give that date's games exactly the features the full build gives them.

Run: python3 -I eff/build_eff.py [alpha w_prev]   (from props/research/totals; the frozen candidate
reads alpha 4, w_prev 0.4, the default). `python3 -I eff/build_eff.py check 4 0.4` is the as-of check.
"""
import os, sys
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
TOT = os.path.dirname(HERE)
DATA = os.path.join(TOT, 'data', 'eff')   # outputs, gitignored
sys.path.insert(0, TOT)
import build_dataset as B   # noqa: E402

STATS = ['pts', 'epa', 'sr', 'expl', 'plays', 'pass', 'rz', 'rztrips', 'give']
PLAYS0 = 62.0
RZ0 = 3.3


def stream(cutoff=None):
    """One row per team per game 2009-2026: franchise, opponent, home flag, played, and the
    offensive box (outcomes of THAT game, used only for games before a later game's date)."""
    g = B.load_games(cutoff)
    keep_ids = set(g[g.home_score.notna()].game_id) if cutoff is not None else None
    boxes = []
    for s in range(B.WARM, B.LAST + 1):
        if cutoff is not None and s > pd.Timestamp(cutoff).year:
            continue
        boxes.append(B.team_box(s, keep_ids))
    box = pd.concat(boxes, ignore_index=True)
    box['team'] = box.team.map(B.fr)
    base = ['game_id', 'season', 'week', 'game_type', 'date', 'played', 'location']
    h = g[base + ['home_team', 'away_team', 'home_score']].rename(
        columns={'home_team': 'team', 'away_team': 'opp', 'home_score': 'pf'})
    h['side'] = 'home'
    a = g[base + ['away_team', 'home_team', 'away_score']].rename(
        columns={'away_team': 'team', 'home_team': 'opp', 'away_score': 'pf'})
    a['side'] = 'away'
    tg = pd.concat([h, a], ignore_index=True)
    tg['fr'] = tg.team.map(B.fr); tg['ofr'] = tg.opp.map(B.fr)
    tg['home'] = ((tg.side == 'home') & (tg.location != 'Neutral')).astype(float)
    tg = tg.merge(box.rename(columns={'team': 'fr'}), on=['game_id', 'fr'], how='left')
    if (tg.played & tg.plays.isna()).any():
        raise SystemExit('a played game has no play-by-play')
    return tg


def targets(tg):
    """y and weight per stat for played team-games."""
    p = tg.plays.to_numpy(float)
    with np.errstate(invalid='ignore', divide='ignore'):
        Y = {
            'pts': (tg.pf.to_numpy(float), np.ones(len(tg))),
            'epa': (tg.epa / tg.plays, p / PLAYS0),
            'sr': (tg.succ / tg.plays, p / PLAYS0),
            'expl': (tg.expl / tg.plays, p / PLAYS0),
            'plays': (p, np.ones(len(tg))),
            'pass': (tg.db / tg.plays, p / PLAYS0),
            'rz': (np.where(tg.rz_trips > 0, tg.rz_tds / tg.rz_trips, 0.0), tg.rz_trips.to_numpy(float) / RZ0),
            'rztrips': (tg.rz_trips.to_numpy(float), np.ones(len(tg))),
            'give': (tg.giveaways.to_numpy(float), np.ones(len(tg))),
        }
    return {k: (np.asarray(y, float), np.asarray(w, float)) for k, (y, w) in Y.items()}


def solve(ti, oi, home, Y, W, alpha, nT):
    n = len(ti)
    X = np.zeros((n, 2 + 2 * nT))
    X[:, 0] = 1.0; X[:, 1] = home
    X[np.arange(n), 2 + ti] = 1.0
    X[np.arange(n), 2 + nT + oi] = 1.0
    pen = np.r_[0.0, 0.0, np.full(2 * nT, alpha)]
    out = {}
    for k in Y:
        y, w = Y[k]
        ok = np.isfinite(y) & (w > 0)
        Xk, yk, wk = X[ok], y[ok], w[ok]
        A = Xk.T @ (Xk * wk[:, None]) + np.diag(pen)
        out[k] = np.linalg.solve(A, Xk.T @ (wk * yk))
    return out


def build(alpha=4.0, w_prev=0.4, cutoff=None, tg=None, only_dates=None, leak=False):
    if tg is None:
        tg = stream(cutoff)
    teams = sorted(set(tg.fr.dropna()) | set(tg.ofr.dropna()))
    tix = {t: i for i, t in enumerate(teams)}; nT = len(teams)
    tg = tg.copy()
    tg['ti'] = tg.fr.map(tix); tg['oi'] = tg.ofr.map(tix)
    games = tg[tg.season >= B.FIRST][['game_id', 'season', 'date']].drop_duplicates('game_id')
    if only_dates is not None:
        games = games[games.date.isin(pd.to_datetime(list(only_dates)))]
    P = tg[tg.played]
    Ys = targets(P)
    rows = []
    for (S, d), gg in games.groupby(['season', 'date']):
        cur = (P.season == S) & ((P.date <= d) if leak else (P.date < d))   # leak: the mutant control
        prv = (P.season == S - 1)
        m = (cur | prv).to_numpy()
        wmul = np.where(cur.to_numpy(), 1.0, w_prev)[m]
        Y = {k: (y[m], w[m] * wmul) for k, (y, w) in Ys.items()}
        sub = P[m]
        beta = solve(sub.ti.to_numpy(), sub.oi.to_numpy(), sub.home.to_numpy(float), Y, None, alpha, nT) \
            if True else None
        ncur = int(cur.sum()) // 2
        # each side's games this season before this date
        cnt = P[cur].groupby('fr').size()
        for gid in gg.game_id:
            sides = tg[tg.game_id == gid].set_index('side')
            r = {'game_id': gid, 'e_n_cur': ncur}
            for sd in ('home', 'away'):
                i = int(sides.loc[sd, 'ti'])
                r[f'e_{sd}_n'] = int(cnt.get(sides.loc[sd, 'fr'], 0))
                for k, b in beta.items():
                    r[f'e_{sd}_o_{k}'] = b[2 + i]; r[f'e_{sd}_d_{k}'] = b[2 + nT + i]
            for k, b in beta.items():
                r[f'e_mu_{k}'] = b[0]; r[f'e_h_{k}'] = b[1]
            rows.append(r)
    return pd.DataFrame(rows)


def tag(alpha, w_prev):
    return f'a{alpha:g}_w{w_prev:g}'


def as_of_check(alpha, w_prev, dates):
    full_tg = stream()
    F = build(alpha, w_prev, tg=full_tg, only_dates=dates).set_index('game_id').sort_index()
    ok = True
    for d in dates:
        A = build(alpha, w_prev, cutoff=d, only_dates=[d]).set_index('game_id').sort_index()
        Fd = F.loc[A.index]
        diff = (A - Fd).abs().max().max()
        # control: the next date's games do differ when the cutoff is a day late (the game itself in)
        print(f'   {d}: {len(A)} games x {A.shape[1]} columns  max |diff| {diff:.3g}', 'identical' if diff < 1e-9 else 'DIFFERS')
        ok &= diff < 1e-9
    return ok


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == 'check':
        alpha, w_prev = float(args[1]), float(args[2])
        dates = ['2012-11-18', '2016-12-24', '2019-10-13', '2021-01-09', '2023-12-31', '2026-10-04']
        print('as-of rebuilds, alpha', alpha, 'w_prev', w_prev)
        ok = as_of_check(alpha, w_prev, dates)
        # mutant control: a build that lets the game's own date in must differ from the honest one
        tg = stream()
        for d in ('2019-10-13', '2023-12-31'):
            H = build(alpha, w_prev, tg=tg, only_dates=[d]).set_index('game_id').sort_index()
            Mu = build(alpha, w_prev, tg=tg, only_dates=[d], leak=True).set_index('game_id').sort_index()
            nd = int(((H - Mu).abs() > 1e-9).any(axis=1).sum())
            print(f'   mutant (the date itself in), {d}: {nd} of {len(H)} games differ', '-> caught' if nd == len(H) else '-> NOT caught')
            ok &= nd == len(H)
        print('AS-OF CHECK:', 'passed' if ok else 'FAILED')
        sys.exit(0)
    os.makedirs(DATA, exist_ok=True)
    cache = os.path.join(DATA, 'stream.parquet')
    if os.path.exists(cache):
        tg = pd.read_parquet(cache)
    else:
        tg = stream(); tg.to_parquet(cache, index=False)
    grid = [(float(args[i]), float(args[i + 1])) for i in range(0, len(args), 2)] or [(4.0, 0.4)]
    for alpha, w_prev in grid:
        F = build(alpha, w_prev, tg=tg)
        path = os.path.join(DATA, f'features_{tag(alpha, w_prev)}.parquet')
        F.to_parquet(path, index=False)
        print('wrote', path, F.shape, file=sys.stderr)
