"""Judge: leakage tests on the candidates' own fit/predict code.

A. Ratings score recovery, every season 2012-2026: the points it reads back for a test-season game (from the
   teams' later rows) equal games.csv's real scores wherever it reads them, and it reads none for the
   game's own prediction (the filter predicts a date before updating on it: checked in C).
B. Walk-forward: fit sees only seasons before the test season (training frames' max season), and each
   fit's fitted numbers move season to season (DEV seasons only).
C. As-of world, DEV dates only: the dataset rebuilt with the world cut off the morning of D (every game from
   D on unplayed); each candidate predicts the season's games from that frame (unplayed rows included,
   outcome columns removed) and from the harness's frame; predictions for D's games must be identical.
   Control: a mutant ratings filter that updates on a date's scores BEFORE predicting it must differ.
D. Outcome columns: predict is handed a frame without them (each module asserts so); also the frame with
   every outcome column of the test season scrambled must give identical predictions (DEV season).
Prints only differences and parameters, never a holdout prediction or score.
Run: python3 -I judge/predict_asof.py   (from props/research/totals)
"""
import os, sys, copy
import numpy as np, pandas as pd
TOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TOT)
import harness as H
import build_dataset as B
import cand_ratings, cand_efficiency, cand_residual, cand_simple
CANDS = [cand_ratings, cand_efficiency, cand_residual, cand_simple]

G = pd.read_parquet(os.path.join(TOT, 'data', 'games.parquet'))

# ---------------------------------------------------------------- A
print('A. ratings score recovery vs games.csv (data plumbing; no prediction is made)')
for S in range(2012, 2027):
    t = G[(G.season == S) & G.played & G.total_line.notna() & G.total.notna()].sort_values(['kickoff', 'game_id'])
    blind = t.drop(columns=H.OUTCOME_COLS)
    hp, ap = cand_ratings.recover_scores(blind)
    ok = np.isfinite(hp) & np.isfinite(ap)
    err = max(np.nanmax(np.abs(hp[ok] - t.home_score.to_numpy(float)[ok])), np.nanmax(np.abs(ap[ok] - t.away_score.to_numpy(float)[ok])))
    nreg_miss = int((~ok & (t.game_type == 'REG').to_numpy()).sum())
    print(f'   {S}: {ok.sum()}/{len(t)} games read back, max |error| {err:.1e}; regular-season games not read back {nreg_miss}')

# ---------------------------------------------------------------- B
print('B. walk-forward refits (dev seasons)')
Gd = G[G.season < H.LOCK]
for c in CANDS:
    rec = []
    for S in (2014, 2018, 2023):
        tr = Gd[(Gd.season < S) & Gd.played & Gd.total.notna()].copy()
        assert tr.season.max() == S - 1
        m = c.fit(tr)
        if c is cand_ratings:
            rec.append(f"{S}: b {np.round(m['b'], 3).tolist()} sd {m['sd']:.3f}")
        elif c is cand_efficiency:
            rec.append(f"{S}: b {m['b']:+.3f} sd {m['sd']:.3f} beta_pts {m['pm']['beta'][1]:.3f}")
        elif c is cand_residual:
            rec.append(f"{S}: lam {m['lam']} a {m['a']:+.3f} b_wind {m['b'][0]:+.3f} sd {m['sd']:.3f}")
        else:
            rec.append(f"{S}: beta_w {m['beta_w']:+.4f} w_bar {m['w_bar']:.3f} sd {m['sd']:.3f}")
    print(f'   {c.name}: ' + ' | '.join(rec))

# ---------------------------------------------------------------- C
print('C. as-of world, dev dates: predictions for the date from the cut-off world vs the harness frame')


def mutant_rate(games, state=None):
    """cand_ratings.rate with the update moved BEFORE the prediction on each date (a leak)."""
    g = games.reset_index(drop=True)
    R = cand_ratings
    hi = g.home_team.map(lambda t: R.TI[R.fr(t)]).to_numpy(); ai = g.away_team.map(lambda t: R.TI[R.fr(t)]).to_numpy()
    neu = g.neutral.to_numpy(int); season = g.season.to_numpy(int)
    day = pd.to_datetime(g.date).to_numpy().astype('datetime64[D]').astype(np.int64)
    yh = g.hp.to_numpy(float); ya = g.ap.to_numpy(float)
    x, P, last_season, last_day = state['x'].copy(), state['P'].copy(), state['season'], state['day']
    NT, IL = R.NT, R.IL
    V0 = np.r_[np.full(NT, R.SD_O ** 2), np.full(NT, R.SD_D ** 2)]; od = np.arange(2 * NT)
    ph = np.empty(len(g)); pa = np.empty(len(g))
    bounds = np.flatnonzero(np.r_[True, day[1:] != day[:-1], True])
    for b0, b1 in zip(bounds[:-1], bounds[1:]):
        idx = np.arange(b0, b1); sz, dz = season[b0], day[b0]
        if sz != last_season:
            A = np.r_[np.full(2 * NT, R.RHO), 1.0]; P = P * A[:, None] * A[None, :]; x = x * A
            P[od, od] += (1 - R.RHO ** 2) * V0; P[IL, IL] += R.SD_L_SEASON ** 2
        else:
            wk = max(dz - last_day, 0) / 7.0; P[od, od] += R.Q_WEEK ** 2 * wk; P[IL, IL] += R.QL_WEEK ** 2 * wk
        last_season, last_day = sz, dz
        m = len(idx); Hm = np.zeros((2 * m, R.NS)); off = np.zeros(2 * m)
        for k, j in enumerate(idx):
            Hm[2 * k, hi[j]] = 1; Hm[2 * k, NT + ai[j]] = 1; Hm[2 * k, IL] = 1
            Hm[2 * k + 1, ai[j]] = 1; Hm[2 * k + 1, NT + hi[j]] = 1; Hm[2 * k + 1, IL] = 1
            off[2 * k] = R.HOME * (1 - neu[j]); off[2 * k + 1] = -R.AWAY * (1 - neu[j])
        y = np.empty(2 * m); y[0::2] = yh[idx]; y[1::2] = ya[idx]; ok = np.isfinite(y)
        if ok.any():
            yhat = Hm @ x + off; Ho = Hm[ok]; r = y[ok] - yhat[ok]; PHt = P @ Ho.T
            S_ = Ho @ PHt + R.SIGMA ** 2 * np.eye(len(r)); K = np.linalg.solve(S_, PHt.T).T
            x = x + K @ r; P = P - K @ PHt.T; P = 0.5 * (P + P.T)
        yhat = Hm @ x + off; ph[idx] = yhat[0::2]; pa[idx] = yhat[1::2]
    return ph, pa, None


def mutant_predict(m, test, true_scores):
    t = test.reset_index(drop=True)
    order = np.argsort(t.kickoff.to_numpy(), kind='stable')
    ts = t.iloc[order].reset_index(drop=True).copy()
    ts['hp'], ts['ap'] = true_scores[0][order], true_scores[1][order]
    ph, pa, _ = mutant_rate(ts, m['state'])
    tot = np.empty(len(t)); tot[order] = 2 * m['b'][0] + m['b'][1] * (ph + pa)
    L = t.total_line.to_numpy(float)
    return L + cand_ratings.W * (tot - L)


for D in ('2014-11-09', '2020-01-12', '2022-11-13'):
    S = int(G[G.gameday == D].season.iloc[0])
    A, _ = B.build(cutoff=D, write=False)
    train = Gd[(Gd.season < S) & Gd.played & Gd.total.notna()].copy()
    full = G[(G.season == S) & G.played & G.total_line.notna() & G.total.notna()].copy()
    asof = A[(A.season == S) & A.total_line.notna()].copy()        # unplayed rows (D on) included
    fb = full.drop(columns=H.OUTCOME_COLS).reset_index(drop=True)
    ab = asof.drop(columns=H.OUTCOME_COLS).reset_index(drop=True)
    day_f = (fb.gameday == D).to_numpy(); day_a = (ab.gameday == D).to_numpy()
    assert (fb.game_id[day_f].to_numpy() == ab.game_id[day_a].to_numpy()).all()
    line = []
    for c in CANDS:
        m = c.fit(train.copy())
        pf = c.predict(m, fb.copy()); pa_ = c.predict(m, ab.copy())
        d_mu = np.max(np.abs(np.asarray(pf[0])[day_f] - np.asarray(pa_[0])[day_a]))
        line.append(f'{c.name} max|d mu| {d_mu:.1e}')
        if c is cand_ratings:
            # control 1: later dates do move (the full frame has seen D's scores)
            nxt = sorted(fb.gameday[fb.gameday > D].unique())[:1]
            if nxt:
                mf = (fb.gameday == nxt[0]).to_numpy(); ma = (ab.gameday == nxt[0]).to_numpy()
                ctl = np.max(np.abs(np.asarray(pf[0])[mf] - np.asarray(pa_[0])[ma]))
                line.append(f'(control, next date {nxt[0]} moves {ctl:.2f})')
            # control 2: the mutant that updates before it predicts differs on D itself
            ts = (full.home_score.to_numpy(float), full.away_score.to_numpy(float))
            mm = mutant_predict(m, fb.copy(), ts)
            line.append(f'(mutant leak on D: max|d mu| {np.max(np.abs(mm[day_f] - np.asarray(pf[0])[day_f])):.2f})')
    print(f'   {D} (season {S}, {day_f.sum()} games): ' + '; '.join(line))

# ---------------------------------------------------------------- D
print('D. outcome columns scrambled in the test frame (dev 2021): predictions must not move')
S = 2021
train = Gd[(Gd.season < S) & Gd.played & Gd.total.notna()].copy()
test = G[(G.season == S) & G.played & G.total_line.notna() & G.total.notna()].copy().reset_index(drop=True)
rng = np.random.default_rng(3)
scr = test.copy()
for c_ in H.OUTCOME_COLS:
    scr[c_] = rng.permutation(scr[c_].to_numpy())
for c in CANDS:
    m = c.fit(train.copy())
    a = c.predict(m, test.drop(columns=H.OUTCOME_COLS).copy())
    try:
        b = c.predict(m, scr.copy())        # outcome columns present: a module should refuse
        print(f'   {c.name}: accepted a frame with outcome columns; max|d mu| {np.max(np.abs(np.asarray(a[0]) - np.asarray(b[0]))):.1e}')
    except AssertionError:
        print(f'   {c.name}: refuses a frame that carries outcome columns (assert)')
