"""The holdout step, run once: each frozen candidate through harness.evaluate(holdout=True) on 2024-2025,
then on 2026 so far. Records each module's file hash, each fit's training span and fitted numbers (a
wrapper around fit that changes nothing), and saves the per-game frames for the analysis.
Run: python3 -I judge/run_holdout.py   (from props/research/totals; refuses while out/holdout_log.txt exists)
"""
import os, sys, io, json, hashlib, pickle, contextlib, time
import numpy as np, pandas as pd
TOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, TOT)
OUT = os.path.join(TOT, 'out', 'judge', 'holdout_run')
LOG = os.path.join(TOT, 'out', 'holdout_log.txt')
if os.path.exists(LOG):
    sys.exit(f'{LOG} exists: a holdout run already happened; refusing to run a second one')
os.makedirs(OUT, exist_ok=True)

import harness as H
import cand_ratings, cand_efficiency, cand_residual, cand_simple
CANDS = [cand_ratings, cand_efficiency, cand_residual, cand_simple]

hashes = {}
for c in CANDS + [H]:
    p = c.__file__
    hashes[os.path.basename(p)] = hashlib.sha256(open(p, 'rb').read()).hexdigest()
for p in ['data/games.parquet', 'data/eff/features_a4_w0.4.parquet', '../../data/pts_model.json']:
    hashes[p] = hashlib.sha256(open(os.path.join(TOT, p), 'rb').read()).hexdigest()
json.dump(hashes, open(os.path.join(OUT, 'hashes.json'), 'w'), indent=1)

REC = []


def summary(c, m):
    if c is cand_ratings:
        return {'b0': m['b'][0], 'b1': m['b'][1], 'sd': m['sd'], 'W': cand_ratings.W}
    if c is cand_efficiency:
        return {'b': m['b'], 'sd': m['sd'], 'n_blend': m['n_blend']}
    if c is cand_residual:
        return {'lam': m['lam'], 'a': m['a'], 'sd': m['sd'], 'b': dict(zip(cand_residual.FEATURES, np.round(m['b'] / m['xs'], 4).tolist()))}
    return {k: m[k] for k in ('beta_w', 'w_bar', 'w_fill', 'sd', 'seasons')}


for c in CANDS:
    orig = c.fit

    def rec_fit(train, _c=c, _orig=orig):
        m = _orig(train)
        REC.append({'cand': _c.name, 'train_min': int(train.season.min()), 'train_max': int(train.season.max()),
                    'n_train': int(len(train)), **summary(_c, m)})
        return m
    c.fit = rec_fit

results = {}
for c in CANDS:
    for tag, periods in (('h2425', [2024, 2025]), ('h2026', [2026])):
        buf = io.StringIO()
        t0 = time.time()
        with contextlib.redirect_stdout(buf):
            r = H.evaluate(c, periods=periods, holdout=True, name=f'{c.name}_{tag}', n_boot=2000, seed=0)
        txt = buf.getvalue()
        open(os.path.join(OUT, f'{c.name}_{tag}.txt'), 'w').write(txt)
        r['games'].to_parquet(os.path.join(OUT, f'{c.name}_{tag}.parquet'), index=False)
        res = []
        for b in r['results']:
            b2 = {k: v for k, v in b.items()}
            for k in ('candidate', 'site', 'market'):
                b2[k] = {kk: vv for kk, vv in b[k].items() if kk != 'calib_table'}
            res.append(b2)
        results[f'{c.name}_{tag}'] = res
        print(f'{c.name} {tag}: done in {time.time() - t0:.1f}s', flush=True)

pickle.dump(results, open(os.path.join(OUT, 'results.pkl'), 'wb'))
pd.DataFrame(REC).to_csv(os.path.join(OUT, 'fits.csv'), index=False)
print(open(LOG).read())
