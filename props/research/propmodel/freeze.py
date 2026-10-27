#!/usr/bin/env python3
"""Freeze the free-data props model: refit the one model chosen per stat on every season 2013-2025, write the
model files, and record each file's SHA-256 so the one-shot 2026 test and the shadow run exactly these bytes.

Step 3 of the free-data props model (README.md, "Step 3: the frozen models"). Nothing of 2026 is read: the
feature table stops at 2025 and every loader here refuses a row of 2026 or later (HOLDOUT_FROM).

The choice (README.md says why, from the 2021-2025 walk-forward of steps 2a-2c):
  yards   qgbm, LightGBM quantile regression at 21 levels, one set per stat, the position groups pooled with a
          categorical group code (model_yards.py): passing yards (QB), rushing yards (QB, RB), receiving yards
          (RB, WR, TE), rush + rec yards (RB).
  counts  GBM_NB, a LightGBM Poisson mean on every numeric feature with a negative binomial around it whose
          dispersion alpha(mu) = exp(a + b (log mu - c)) is fitted on the validation season's out-of-sample
          means (model_counts.py), one per group and stat: QB attempts, completions, interceptions, passing TDs
          and carries; RB carries and receptions; WR and TE receptions.
  td      GBM_POIS, a LightGBM Poisson on the rushing + receiving touchdown count, one per group (QB, RB, WR, TE)
          (model_td.py). P(anytime TD) = 1 - exp(-lambda).

The refit is each walk-forward step's own protocol run once more with the test season s = 2026: the inner split
fits on 2013-2024 and validates on 2025, which chooses each GBM's number of trees by early stopping (and, for
the counts, the dispersion on 2025's out-of-sample means); the model is then refitted on 2013-2025 with 1.1
times that many trees. Every hyperparameter is the walk-forward's own, imported from its script, with two
additions that change no statistic: deterministic=True and force_row_wise=True (and a thread count), so that a
refit on the same files reproduces the same trees. Nothing is recalibrated after the fit.

The model files are LightGBM text models, too large for the repo (tens of MB), so they are written to
MODELS (default $PROPMODEL_DATA/frozen, outside the repo); the repo keeps frozen/MANIFEST.json (each file's
path, size and SHA-256, the trees, the dispersions and support, the feature lists, the training rows, the
SHA-256 of the feature table and of every raw file it was built from, and the library versions). predict.py
refuses a model file whose hash is not the manifest's.

    python3 -I freeze.py --data DIR [--models DIR/frozen] [--threads 2] [--only yards,counts,td]
"""
import argparse, hashlib, json, os, platform, sys, time, warnings
import numpy as np, pandas as pd

warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import model_yards as MY      # noqa: E402
import model_counts as MC     # noqa: E402
import model_td as MT         # noqa: E402

HOLDOUT_FROM = 2026
FIRST, LAST = 2013, 2025          # every season the frozen models are fitted on
VAL = 2025                        # the inner split's validation season (it chooses the trees and the dispersion)
REPRO = dict(deterministic=True, force_row_wise=True)
MANIFEST = os.path.join(HERE, 'frozen', 'MANIFEST.json')

YARDS = {  # stat -> the groups it is fitted and served on (model_yards.STATS)
    st: S['groups'] for st, S in MY.STATS.items()}
COUNTS = list(MC.TARGETS)
TD_GROUPS = list(MT.GROUPS)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def save(bst, models, rel):
    p = os.path.join(models, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    bst.save_model(p)
    return {'file': rel, 'bytes': os.path.getsize(p), 'sha256': sha256(p)}


def freeze_yards(data, models, threads, man):
    import lightgbm as lgb  # noqa: F401  (model_yards imports it inside its fitters)
    df = MY.load_table(os.path.join(data, 'features.parquet'))
    assert df.season.max() == LAST and df.season.min() == FIRST
    fam = man.setdefault('yards', {'model': 'qgbm', 'taus': MY.TAUS, 'params': None, 'stats': {}})
    base = dict(MY.LGB_BASE, num_threads=threads, **REPRO)
    fam['params'] = {k: v for k, v in base.items()}
    fam['es'] = {'max_rounds': MY.MAX_ROUNDS, 'patience': MY.PATIENCE, 'refit_factor': 1.1, 'min_rounds': 20}
    for st, S in MY.STATS.items():
        t0 = time.time()
        sub = df[df.grp.isin(S['groups'])].reset_index(drop=True)
        feats = [c for c in dict.fromkeys(MY.GBM_FEATS[st]) if c in sub.columns]
        sub[feats] = sub[feats].astype(float)
        tr = sub[(sub.season >= FIRST) & (sub.season <= LAST)].reset_index(drop=True)
        y = tr[S['y']].values.astype(float)
        files, rounds, best = [], [], []
        for j, tau in enumerate(MY.TAUS):
            p = dict(base, objective='quantile', alpha=tau, metric='quantile')
            bst, r, es = MY.es_then_refit(p, tr, feats, y, S['y'], ret_es=True)
            files.append(save(bst, models, f'yards/{st}_q{j:02d}.txt'))
            rounds.append(int(r)); best.append(int(es.best_iteration or MY.MAX_ROUNDS))
        fam['stats'][st] = {'groups': S['groups'], 'y': S['y'], 'features': feats, 'categorical': ['grp_code'],
                            'grp_code': MY.GRP_CODE, 'ymin': float(np.min(y)), 'ymax': float(np.max(y)),
                            'support': [S['lo'], S['hi']], 'train_rows': int(len(tr)),
                            'train_seasons': [FIRST, LAST], 'val_season': VAL, 'best_iteration_inner': best,
                            'rounds': rounds, 'files': files}
        log('yards', st, 'rows', len(tr), 'rounds', rounds, f'{time.time() - t0:.0f}s')
        dump(man)


def fit_count(lgb, R, feat_all, g, st):
    """one count target: the inner split (2013-2024, validated on 2025) picks the trees and the dispersion, then
    the refit on 2013-2025 (model_counts.py's own gbm_poisson and fit_disp)"""
    tr = R[(R.grp == g) & (R.season >= FIRST) & (R.season <= LAST)]
    itr = tr[tr.season <= VAL - 1]; iva = tr[tr.season == VAL]
    Xi, Xv, Xf = (z[feat_all].values.astype(np.float32) for z in (itr, iva, tr))
    yname = 'y_' + st
    mf, it, va_pred, _ = MC.gbm_poisson(lgb, Xi, itr[yname].values, Xv, iva[yname].values, Xf, tr[yname].values)
    disp = MC.fit_disp(iva[yname].values, va_pred)
    return mf, it, disp, tr, iva


def fit_td(lgb, R, feat_all, g):
    """one touchdown group, the same way (model_td.py's own gbm_fit)"""
    tr = R[(R.grp == g) & (R.season >= FIRST) & (R.season <= LAST)]
    itr = tr[tr.season <= VAL - 1]; iva = tr[tr.season == VAL]
    Xi, Xv, Xf = (z[feat_all].values.astype(np.float32) for z in (itr, iva, tr))
    mp, itp = MT.gbm_fit(lgb, 'poisson', Xi, itr.y_rush_rec_tds.values, Xv, iva.y_rush_rec_tds.values, Xf,
                         tr.y_rush_rec_tds.values)
    return mp, itp, tr


def freeze_counts(data, models, threads, man):
    import lightgbm as lgb
    MC.GBM_BASE.update(num_threads=threads, **REPRO)
    R = MC.derive(MC.load_table(data))
    assert R.season.max() == LAST
    feat_all = [c for c in R.columns if c.startswith(MC.FEAT_PREFIX) and pd.api.types.is_numeric_dtype(R[c])]
    fam = man.setdefault('counts', {'model': 'GBM_NB', 'params': dict(MC.GBM_BASE, objective='poisson'),
                                    'es': {'max_rounds': 3000, 'patience': 100, 'refit_factor': 1.1, 'min_rounds': 20},
                                    'features': feat_all, 'kmax': MC.KMAX, 'targets': {}})
    fam['features'] = feat_all
    for (g, st) in COUNTS:
        t0 = time.time()
        mf, it, disp, tr, iva = fit_count(lgb, R, feat_all, g, st)
        yname = 'y_' + st
        info = save(mf, models, f'counts/{g}_{st}.txt')
        fam['targets'][f'{g}:{st}'] = {'group': g, 'stat': st, 'y': yname, 'disp': disp, 'kmax': MC.KMAX[st],
                                       'best_iteration_inner': int(it), 'rounds': int(round(it * 1.1)),
                                       'train_rows': int(len(tr)), 'train_seasons': [FIRST, LAST],
                                       'val_season': VAL, 'val_rows': int(len(iva)), **info}
        log('counts', g, st, 'rows', len(tr), 'it', it, 'disp', {k: round(v, 4) for k, v in disp.items()},
            f'{time.time() - t0:.0f}s')
        dump(man)


def freeze_td(data, models, threads, man):
    import lightgbm as lgb
    MT.GBM_BASE.update(num_threads=threads, **REPRO)
    R = MT.derive(MT.load_table(data))
    assert R.season.max() == LAST
    feat_all = [c for c in R.columns if c.startswith(MT.FEAT_PREFIX) and pd.api.types.is_numeric_dtype(R[c])]
    fam = man.setdefault('td', {'model': 'GBM_POIS', 'params': dict(MT.GBM_BASE, objective='poisson'),
                                'es': {'max_rounds': 4000, 'patience': 150, 'refit_factor': 1.1, 'min_rounds': 20},
                                'y': 'y_rush_rec_tds', 'features': feat_all, 'kmax': MT.KMAX, 'groups': {}})
    fam['features'] = feat_all
    for g in TD_GROUPS:
        t0 = time.time()
        mp, itp, tr = fit_td(lgb, R, feat_all, g)
        info = save(mp, models, f'td/{g}.txt')
        fam['groups'][g] = {'best_iteration_inner': int(itp), 'rounds': int(round(itp * 1.1)),
                            'train_rows': int(len(tr)), 'train_seasons': [FIRST, LAST], 'val_season': VAL,
                            'train_rate_any_td': float((tr.y_rush_rec_tds >= 1).mean()), **info}
        log('td', g, 'rows', len(tr), 'it', itp, f'{time.time() - t0:.0f}s')
        dump(man)


def dump(man):
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    tmp = MANIFEST + '.part'
    with open(tmp, 'w') as f:
        json.dump(man, f, indent=1, sort_keys=False)
    os.replace(tmp, MANIFEST)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'))
    ap.add_argument('--models', default=None, help='where the model files go (default DATA/frozen, outside the repo)')
    ap.add_argument('--threads', type=int, default=2)
    ap.add_argument('--only', default='yards,counts,td')
    a = ap.parse_args()
    if not a.data:
        sys.exit('--data DIR is required')
    models = a.models or os.path.join(a.data, 'frozen')
    only = a.only.split(',')
    import lightgbm, sklearn, scipy
    man = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    feat_path = os.path.join(a.data, 'features.parquet')
    raw = os.path.join(a.data, 'raw')
    man['about'] = ('The frozen free-data props models (props/research/propmodel/freeze.py). Each model file is '
                    'outside the repo; its SHA-256 here is what predict.py and the one-shot 2026 test hold it to.')
    man['fitted_on'] = {'seasons': [FIRST, LAST], 'holdout_from': HOLDOUT_FROM, 'inner_validation': VAL,
                        'features_parquet_sha256': sha256(feat_path),
                        'raw_sha256': {fn: sha256(os.path.join(raw, fn)) for fn in sorted(os.listdir(raw))
                                       if not fn.startswith('.')}}
    man['versions'] = {'python': platform.python_version(), 'lightgbm': lightgbm.__version__,
                       'numpy': np.__version__, 'pandas': pd.__version__, 'scipy': scipy.__version__,
                       'scikit-learn': sklearn.__version__}
    man['models_dir_default'] = '$PROPMODEL_DATA/frozen'
    t0 = time.time()
    if 'counts' in only:
        freeze_counts(a.data, models, a.threads, man)
    if 'td' in only:
        freeze_td(a.data, models, a.threads, man)
    if 'yards' in only:
        freeze_yards(a.data, models, a.threads, man)
    man['refit_seconds'] = round(time.time() - t0)
    dump(man)
    log('wrote', MANIFEST)


if __name__ == '__main__':
    main()
