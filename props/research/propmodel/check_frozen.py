#!/usr/bin/env python3
"""Holds the frozen models to what freeze.py and the walk-forward define. Research only; nothing of 2026 is read.

  1. Every model file is the manifest's (SHA-256), and predict.Predictor loads them all.
  2. predict.py's own copies of the distributions equal the walk-forward's (model_yards.qgbm_cdf_rows,
     model_counts.nb_cdf) on random inputs, to 1e-12.
  3. A refit reproduces the frozen bytes: freeze.py's own fit of two targets (TE receptions, the TE touchdown
     model) on the same feature table gives files with the manifest's SHA-256 (deterministic LightGBM, the same
     thread count), so the frozen files can be made again from the recorded inputs if they are lost.
  4. The frozen models' predictions for 2025 (a season they were fitted on: in sample, description only) beside
     the outcomes, so a gross fault (a scale, a swapped file) would show: mean predicted against mean actual, per
     stat and group.

    python3 -I check_frozen.py --data DIR [--models DIR/frozen] [--threads 2]
Writes results/frozen_check.json.
"""
import argparse, json, os, sys, tempfile
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import predict as PR       # noqa: E402
import freeze as FZ        # noqa: E402
import model_yards as MY   # noqa: E402
import model_counts as MC  # noqa: E402
import model_td as MT      # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'))
    ap.add_argument('--models', default=None)
    ap.add_argument('--threads', type=int, default=2)
    a = ap.parse_args()
    models = a.models or os.path.join(a.data, 'frozen')
    man = json.load(open(PR.MANIFEST))
    res = {}
    # 1
    P = PR.Predictor(models_dir=models)
    nfiles = sum(len(S['files']) for S in man['yards']['stats'].values()) + len(man['counts']['targets']) + len(man['td']['groups'])
    res['files_verified'] = nfiles
    res['covered'] = sorted(f'{g}:{s}={m}' for (g, s), m in P.covered().items())
    # 2
    rng = np.random.default_rng(0)
    Q = np.sort(rng.normal(60, 30, (200, 21)), axis=1)
    X = rng.uniform(-40, 200, (200, 50))
    d1 = float(np.max(np.abs(PR.qgbm_cdf_rows(Q, -20.0, X) - MY.qgbm_cdf_rows(Q, -20.0, X))))
    mu = rng.uniform(0.05, 40, 300)
    disp = {'a': -1.7, 'b': -1.4, 'c': 0.7}
    d2 = float(np.max(np.abs(PR.nb_cdf(mu, disp, 80) - MC.nb_cdf(mu, disp, 80))))
    res['copies_equal'] = {'qgbm_cdf_rows_max_abs_diff': d1, 'nb_cdf_max_abs_diff': d2, 'ok': d1 < 1e-12 and d2 < 1e-12}
    # 3
    import lightgbm as lgb
    MC.GBM_BASE.update(num_threads=a.threads, **FZ.REPRO)
    MT.GBM_BASE.update(num_threads=a.threads, **FZ.REPRO)
    R = MC.derive(MC.load_table(a.data))
    fc = [c for c in R.columns if c.startswith(MC.FEAT_PREFIX) and pd.api.types.is_numeric_dtype(R[c])]
    assert fc == man['counts']['features']
    tmp = tempfile.mkdtemp()
    mf, it, dsp, _, _ = FZ.fit_count(lgb, R, fc, 'TE', 'receptions')
    h1 = FZ.save(mf, tmp, 'te_rec.txt')['sha256']
    R2 = MT.derive(MT.load_table(a.data))
    ft = [c for c in R2.columns if c.startswith(MT.FEAT_PREFIX) and pd.api.types.is_numeric_dtype(R2[c])]
    assert ft == man['td']['features']
    mp, itp, _ = FZ.fit_td(lgb, R2, ft, 'TE')
    h2 = FZ.save(mp, tmp, 'te_td.txt')['sha256']
    res['refit_reproduces'] = {
        'TE:receptions': {'sha256': h1, 'manifest': man['counts']['targets']['TE:receptions']['sha256'],
                          'disp_equal': dsp == man['counts']['targets']['TE:receptions']['disp']},
        'td:TE': {'sha256': h2, 'manifest': man['td']['groups']['TE']['sha256']}}
    res['refit_reproduces']['ok'] = (h1 == man['counts']['targets']['TE:receptions']['sha256']
                                     and h2 == man['td']['groups']['TE']['sha256']
                                     and res['refit_reproduces']['TE:receptions']['disp_equal'])
    # 4
    t = pd.read_parquet(os.path.join(a.data, 'features.parquet'), filters=[('season', '==', 2025)])
    t = t[(t.role_played == 1) & t.grp.isin(['QB', 'RB', 'WR', 'TE'])]
    pr = P.predict_rows(t)
    pr = pr.merge(t[['game_id', 'pid'] + [c for c in t.columns if c.startswith('y_')]], on=['game_id', 'pid'])
    desc = {}
    for (g, st), x in pr.groupby(['grp', 'stat']):
        y = x['y_' + st].astype(float) if st != 'any_td' else x['y_any_td'].astype(float)
        m = x['p_ge1'] if st == 'any_td' else x['mean']
        desc[f'{g}:{st}'] = {'n': int(len(x)), 'mean_pred': round(float(m.mean()), 4), 'mean_actual': round(float(y.mean()), 4)}
    res['in_sample_2025'] = desc
    res['ok'] = res['copies_equal']['ok'] and res['refit_reproduces']['ok']
    with open(os.path.join(HERE, 'results', 'frozen_check.json'), 'w') as f:
        json.dump(res, f, indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != 'in_sample_2025'}, indent=1))
    for k, v in desc.items():
        print(k, v)
    print('frozen check:', 'PASSED' if res['ok'] else 'FAILED')
    if not res['ok']:
        sys.exit(1)


if __name__ == '__main__':
    main()
