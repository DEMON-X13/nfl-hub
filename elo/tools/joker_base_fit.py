#!/usr/bin/env python3
"""The ELO Model's calls on the Joker's baseline: the fit and the walk-forward test behind
JOKER_BASE in elo/build.py (THE JOKER BASELINE in its docstring). Run once, offline from the job,
as units_fit.py is: its numbers are pasted into the build, which never refits them on the season
in progress.

    python3 elo/build.py                     # first: writes elo/cache/features.json, every game's inputs
    python3 elo/tools/joker_base_fit.py

The owner (19 October 2026): "the elo model has been underperforming pretty significantly so I want
to do a test. I want it to apply the ELO matchups to still predict outcomes but I want it to use the
model the Joker as a baseline to make its picks." So a call starts from the Joker's chance and the
Elo matchup moves it:

    log-odds(home wins) = log-odds(the Joker's chance) + BETA * m

m is the game model's matchup alone: each position group's expected-lineup Elo gap, home minus away,
in hundreds, times its weight in the game model (build.py's `coef`, home field left out, since the
Joker's chance already carries the home edge and a neutral site). BETA is the one number fitted: how
far a unit of the Elo matchup should move the Joker's chance.

What it reads and does:
  1. the Joker's walk-forward chances on 2021-2025 (research study 4, models_compare,
     results/after_team_codes/calls_2021_2025.csv: each season called by a Joker fitted on the
     seasons before it, never one that saw the game), regular season;
  2. the game model's inputs per game (elo/cache/features.json, which build.py writes) and, for each
     season of 2021-2025, the game model fitted on every season before it, as model.json's
     walk_forward is: the matchup m of each game; σ(home weight × home field + m) must give study 4's
     ELO Model chance back (the two read the same build), printed;
  3. BETA by maximum likelihood on 2021-2025, the Joker's log-odds held as they are;
  4. the honest test, walk forward: BETA fitted on 2021 to the season before, then each of 2022-2025
     called, against the Joker alone and the ELO Model alone on the same games, right and log loss;
  5. how often the Elo matchup turns the Joker's pick round, and who was right when it did;
  6. tried and not kept (printed for the record): the Joker's log-odds given a weight of their own
     (a weighted mix of the two models, not the Joker as the baseline) and a home-field term beside m;
  7. the constants as the build should carry them (JOKER_BASE), and whether it does;
  8. information only, chosen on nothing: this season's games so far, the Joker's calls as frozen at
     kickoff (betting/state.json) with m from the game model fitted before this season.
"""
import json, math, os, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
import build  # noqa: E402

FIT = list(range(2021, 2026))
STUDY = os.path.join(ROOT, 'research', 'models_compare', 'results', 'after_team_codes', 'calls_2021_2025.csv')
sig = lambda x: 1 / (1 + np.exp(-x))
logit = lambda p: np.log(p / (1 - p))


def fit_beta(lj, m, y, iters=50):
    """the one weight b with P = σ(lj + b m), by Newton's method (no ridge: one number, thousands of games)"""
    b = 0.0
    for _ in range(iters):
        p = sig(lj + b * m)
        step = np.sum((p - y) * m) / np.sum(p * (1 - p) * m * m)
        b -= step
        if abs(step) < 1e-12:
            break
    return b


def fit_free(X, y, off=None, iters=60):
    """the weights w with P = σ(off + X w), by Newton's method, for the variants tried"""
    off = np.zeros(len(y)) if off is None else off
    w = np.zeros(X.shape[1])
    for _ in range(iters):
        p = sig(off + X @ w)
        step = np.linalg.solve((X.T * (p * (1 - p))) @ X, X.T @ (p - y))
        w -= step
        if np.abs(step).max() < 1e-12:
            break
    return w


def score(p, y):
    ok = (p > 0.5) == (y > 0.5)
    ll = float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
    return int(ok.sum()), int((~ok).sum()), ll


def line(name, p, y):
    w, l, ll = score(p, y)
    return f'    {name:<34} {w:>4}-{l:<4} {w / (w + l):6.1%}   log loss {ll:.4f}'


def main():
    path = os.path.join(build.CACHE, 'features.json')
    if not os.path.exists(path):
        raise SystemExit('no elo/cache/features.json: run python3 elo/build.py first')
    feats = json.load(open(path))
    rows = [r for r in feats if r['result'] is not None and r['result'] != 0]
    X = lambda rs: np.array([[r['hf']] + [r['x'][g] for g in build.GROUPS] for r in rs])
    Y = lambda rs: np.array([1.0 if r['result'] > 0 else 0.0 for r in rs])

    # 1-2: the matchup m of every 2021-2025 game, on the game model fitted before its season
    study = pd.read_csv(STUDY)
    study = study[study.winner != 'tie'].set_index('game_id')
    recs, gap = [], 0.0
    for s in FIT:
        w = build.logistic_fit(X([r for r in rows if r['season'] < s]), Y([r for r in rows if r['season'] < s]))
        for r in rows:
            if r['season'] != s or r['game_id'] not in study.index:
                continue
            m = float(np.dot(w[1:], [r['x'][g] for g in build.GROUPS]))
            pe = float(sig(w[0] * r['hf'] + m))
            st = study.loc[r['game_id']]
            gap = max(gap, abs(pe - float(st.elo_p_home)))
            recs.append({'game_id': r['game_id'], 'season': s, 'hf': r['hf'], 'm': m, 'pe': pe,
                         'pj': float(st.joker_p_home), 'y': 1.0 if st.winner == st.home_team else 0.0})
    d = pd.DataFrame(recs)
    print(f'{len(d)} decided regular-season games of 2021-2025 with both models\' walk-forward calls '
          f'(study 4 has {len(study)}); the ELO Model\'s chance as study 4 had it, to within {gap:.4f}')
    pj = d.pj.clip(0.01, 0.99).values
    lj, m, y, pe = logit(pj), d.m.values, d.y.values, d.pe.values

    # 3: BETA on every season
    beta = fit_beta(lj, m, y)
    print(f'\nBETA, fitted on 2021-2025: {beta:.4f} (log-odds the Joker\'s chance moves per unit of the Elo matchup)')
    print(f'    the Elo matchup m: spread {m.std():.3f}, so a typical game moves {beta * m.std():.3f} in log-odds')

    # 4: walk forward
    print('\nWalk forward: BETA fitted on 2021 to the season before, the season after called')
    wf, P = {}, []
    for s in FIT[1:]:
        tr, te = (d.season < s).values, (d.season == s).values
        b = fit_beta(lj[tr], m[tr], y[tr])
        p = sig(lj[te] + b * m[te])
        P.append(p)
        w_, l_, ll = score(p, y[te])
        wj, lj_, llj = score(pj[te], y[te])
        we, le_, lle = score(pe[te], y[te])
        wf[s] = {'games': int(te.sum()), 'beta': round(float(b), 4), 'right': w_, 'logloss': round(ll, 4),
                 'joker': wj, 'joker_logloss': round(llj, 4), 'elo': we, 'elo_logloss': round(lle, 4)}
        print(f'  {s}: BETA {b:.4f}; {te.sum()} games: on the Joker {w_}-{l_} ({ll:.4f}), '
              f'the Joker alone {wj}-{lj_} ({llj:.4f}), the ELO Model alone {we}-{le_} ({lle:.4f})')
    t = (d.season >= FIT[1]).values
    P = np.concatenate(P)
    print('  2022-2025 together:')
    print(line('the Joker, moved by the Elo matchup', P, y[t]))
    print(line('the Joker alone', pj[t], y[t]))
    print(line('the ELO Model alone', pe[t], y[t]))

    # 5: when the matchup turns the Joker's pick round
    flip = (P > 0.5) != (pj[t] > 0.5)
    fw, fl, _ = score(P[flip], y[t][flip]) if flip.any() else (0, 0, 0)
    print(f'\n  the Elo matchup turned the Joker\'s pick round in {int(flip.sum())} of {int(t.sum())} games '
          f'({flip.mean():.1%}): right {fw}, the Joker right {fl}')

    # 6: tried and not kept
    print('\nTried, not kept (the Joker is the baseline, as asked: only how far the Elo matchup moves it is fitted)')
    for name, cols in (('the Joker weighted too (a mix)', lambda k: np.c_[lj[k], m[k]]),
                       ('a home-field term beside m', lambda k: np.c_[m[k], d.hf.values[k]])):
        off = (lambda k: None) if 'mix' in name else (lambda k: lj[k])
        Q, ws = [], []
        for s in FIT[1:]:
            tr, te = (d.season < s).values, (d.season == s).values
            w = fit_free(cols(tr), y[tr], off(tr))
            Q.append(sig((0 if off(te) is None else off(te)) + cols(te) @ w))
            ws.append(np.round(w, 3).tolist())
        print(line(name, np.concatenate(Q), y[t]) + f'   weights by season {ws}')

    # 7: the constants
    want = {'beta': round(float(beta), 4), 'fit': '2021-2025', 'test': '2022-2025',
            'walk_forward': {str(k): v for k, v in wf.items()}}
    print('\nJOKER_BASE = ' + json.dumps(want))
    print('  the build carries these constants' if getattr(build, 'JOKER_BASE', None) == want
          else '  THE BUILD DIFFERS: paste the line above into elo/build.py')

    # 8: this season so far, information only
    st = json.load(open(os.path.join(ROOT, 'betting', 'state.json')))
    season, jk = int(st['season']), st.get('joker') or {}
    w26 = build.logistic_fit(X([r for r in rows if r['season'] < season]), Y([r for r in rows if r['season'] < season]))
    cur = [r for r in rows if r['season'] == season and r['game_id'] in jk]
    if cur:
        y26 = Y(cur)
        m26 = np.array([float(np.dot(w26[1:], [r['x'][g] for g in build.GROUPS])) for r in cur])
        j26 = np.array([min(0.99, max(0.01, float(jk[r['game_id']]['pHome']))) for r in cur])
        e26 = sig(np.array([w26[0] * r['hf'] for r in cur]) + m26)
        b26 = sig(logit(j26) + beta * m26)
        print(f'\nInformation only, chosen on nothing: {season} so far, {len(cur)} decided games, the Joker\'s calls as frozen '
              f'at kickoff, the Elo matchup from the game model fitted before {season} (a backtest, not the published calls)')
        print(line('the Joker, moved by the Elo matchup', b26, y26))
        print(line('the Joker alone', j26, y26))
        print(line('the ELO Model alone (backtest)', e26, y26))
        f26 = (b26 > 0.5) != (j26 > 0.5)
        print(f'    turned the Joker\'s pick round in {int(f26.sum())}: '
              + ', '.join(f"{r['game_id']} ({'right' if (b > 0.5) == (yy > 0.5) else 'wrong'})"
                          for r, b, yy, f in zip(cur, b26, y26, f26) if f))


if __name__ == '__main__':
    main()
