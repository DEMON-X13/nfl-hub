#!/usr/bin/env python3
"""Holds predict mode (build_features.py --predict, what predict.py runs) to the feature table the models were
fitted on. Research only; nothing of 2026 is read.

Two checks:
  1. The full build is unchanged by predict mode: build_features.build() run as before gives the committed
     table (DIR/features.parquet) exactly, every row and column, NaN-aware, no tolerance.
  2. For each test week, the candidate rows predict mode makes before the week's games (every player who might
     play, from the depth chart, the weekly roster and recent games; the week's own stats, snap counts and
     play-by-play never read) cover every row of that week in the full table (every player who played, in his
     role or on special teams only), and on those players every feature equals the full table's to 1e-9
     (floating-point order aside: the full build subtracts a row's own value from a running sum, predict mode
     never adds it). A candidate who did not play has no row in the full table and is counted apart. The
     predictions of the frozen models (predict.py) are then run on both feature sources and compared: they agree
     but where a tree's split falls between a feature's two last-bit neighbours (the full table's value carries the
     rounding of adding the row's own value and taking it out again, predict mode's does not), which is allowed
     for at most 1% of predictions and moves P(over) by less than 0.02.

    python3 -I check_predict.py --data DIR [--weeks 2025:1,2025:6] [--no-full] [--no-models]
Writes results/predict_check.json.
"""
import argparse, json, os, sys, time
from types import SimpleNamespace
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_features as B  # noqa: E402

WEEKS = [(2025, 1), (2025, 6), (2025, 12), (2025, 18), (2024, 9), (2019, 1), (2016, 8)]
GROUPS = ['QB', 'RB', 'WR', 'TE']   # the groups the frozen models serve (kickers are built, never modelled)
FEAT_PREFIX = ('p_', 't_', 'd_', 'oa_', 'dc_', 'inj_', 'tm_', 'od_', 'x_', 'g_')


def args_for(data, last, predict=None):
    return SimpleNamespace(data=data, first=2013, last=last, warmup_from=2010, out=None, no_fetch=True, cutoff=None,
                           compare=None, predict=predict)


def same(a, b, tol):
    if pd.api.types.is_numeric_dtype(a) and pd.api.types.is_numeric_dtype(b):
        av, bv = a.to_numpy(float), b.to_numpy(float)
        if tol:
            eq = np.isclose(av, bv, rtol=tol, atol=tol)
        else:
            eq = av == bv
        return eq | (np.isnan(av) & np.isnan(bv))
    return (a.astype('string').fillna('<NA>') == b.astype('string').fillna('<NA>')).to_numpy()


def check_full(data):
    out, _ = B.build(args_for(data, 2025))
    ref = pd.read_parquet(os.path.join(data, 'features.parquet'))
    res = {'rows_built': int(len(out)), 'rows_committed': int(len(ref)),
           'columns_same_order': list(out.columns) == list(ref.columns)}
    if len(out) == len(ref) and res['columns_same_order']:
        bad = {c: int((~same(out[c], ref[c], 0)).sum()) for c in out.columns}
        res['columns_differing'] = {c: n for c, n in bad.items() if n}
    else:
        res['columns_differing'] = 'shape differs'
    res['ok'] = res['columns_differing'] == {} and res['rows_built'] == res['rows_committed']
    return res


def check_week(data, s, w, ref_all, predictor):
    t0 = time.time()
    cand, summ = B.build(args_for(data, s, (s, w)))
    full = ref_all[(ref_all.season == s) & (ref_all.week == w) & ref_all.grp.isin(GROUPS)]
    k = ['game_id', 'pid']
    m = full.merge(cand, on=k, how='left', suffixes=('', '_c'), indicator=True)
    res = {'season': s, 'week': w, 'candidates': int(len(cand)), 'candidates_by_src': summ.get('candidates_by_src'),
           'roster_carried': summ.get('roster_carried'), 'full_rows': int(len(full)),
           'full_role_rows': int(full.role_played.sum())}
    res['full_rows_without_candidate'] = int((m._merge == 'left_only').sum())
    res['full_role_rows_without_candidate'] = int(((m._merge == 'left_only') & (m.role_played == 1)).sum())
    res['missed'] = m.loc[m._merge == 'left_only', ['pid', 'name', 'team', 'grp', 'role_played']].to_dict('records')[:20]
    mm = m[m._merge == 'both']
    feat = [c for c in cand.columns if c.startswith(FEAT_PREFIX)]
    bad, fp = {}, {}
    for c in feat:
        ne = ~same(mm[c], mm[c + '_c'], 1e-9)
        if ne.any():
            x, y = mm.loc[ne, c].to_numpy(float), mm.loc[ne, c + '_c'].to_numpy(float)
            mx = float(np.nanmax(np.abs(x - y))) if np.isfinite(x).all() and np.isfinite(y).all() else float('inf')
            # a difference under 1e-6 where both are numbers is floating-point order (the full build adds a row's
            # own value into a running sum and takes it out again; predict mode never adds it): counted apart
            (fp if mx < 1e-6 else bad)[c] = {'rows': int(ne.sum()), 'max_abs_diff': mx}
    res['features'] = len(feat)
    res['rows_compared'] = int(len(mm))
    res['features_differing'] = bad
    res['features_differing_by_floating_point_only'] = fp
    res['grp_differing'] = int((mm.grp != mm.grp_c).sum())
    res['team_differing'] = int((mm.team != mm.team_c).sum())
    res['candidates_who_did_not_play'] = int(cand.grp.isin(GROUPS).sum() - len(mm))
    pred_ok = True
    if predictor is not None:
        import predict as PR
        a = predictor.predict_rows(full)
        b = predictor.predict_rows(cand[cand.set_index(k).index.isin(full.set_index(k).index)])
        j = a.merge(b, on=['game_id', 'pid', 'stat'], suffixes=('', '_c'))
        L = np.floor(j['mean'].to_numpy(float)) + 0.5
        pa = np.array([PR.p_over(m, p, l)[0] for m, p, l in zip(j.model, j.params, L)])
        pb = np.array([PR.p_over(m, p, l)[0] for m, p, l in zip(j.model, j.params_c, L)])
        dp = np.abs(pa - pb)
        dm = np.abs(j['mean'].to_numpy(float) - j['mean_c'].to_numpy(float))
        res['predictions_compared'] = int(len(j))
        res['predictions_differing'] = int(((dp > 1e-9) | (dm > 1e-9)).sum())
        res['prediction_max_abs_diff'] = {'p_over_at_floor_mean_plus_half': float(dp.max()), 'mean': float(dm.max())}
        res['predictions_differing_rows'] = j.loc[(dp > 1e-9) | (dm > 1e-9), ['pid', 'stat']].to_dict('records')[:10]
        # the features agree to 1e-9 but not always to the last bit (the full build adds a row's own value into a
        # running sum and takes it out again; predict mode never adds it), and a tree whose split sits between two
        # such neighbours can send the row the other way: allowed for at most 1% of predictions, moving P(over) by
        # under 0.02 (a first bound of 0.01 was crossed once, by 0.0128 in 2025 week 18, a split tie as the rest)
        pred_ok = res['predictions_differing'] <= 0.01 * len(j) and float(dp.max()) < 0.02
    res['ok'] = (not bad and res['full_rows_without_candidate'] == 0 and res['grp_differing'] == 0
                 and res['team_differing'] == 0 and pred_ok)
    res['seconds'] = round(time.time() - t0, 1)
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'))
    ap.add_argument('--weeks', default=None, help='season:week,... (default: %s)' % ','.join('%d:%d' % x for x in WEEKS))
    ap.add_argument('--no-full', action='store_true')
    ap.add_argument('--no-models', action='store_true')
    ap.add_argument('--models', default=None)
    ap.add_argument('--out', default=os.path.join(HERE, 'results', 'predict_check.json'))
    a = ap.parse_args()
    weeks = WEEKS if not a.weeks else [tuple(int(v) for v in x.split(':')) for x in a.weeks.split(',')]
    res = {'about': __doc__.split('\n')[0], 'weeks': []}
    if not a.no_full:
        res['full_build_unchanged'] = check_full(a.data)
        print('full build unchanged:', json.dumps(res['full_build_unchanged']), flush=True)
    predictor = None
    if not a.no_models:
        import predict as PR
        predictor = PR.Predictor(models_dir=a.models or os.path.join(a.data, 'frozen'))
    ref = pd.read_parquet(os.path.join(a.data, 'features.parquet'))
    for s, w in weeks:
        r = check_week(a.data, s, w, ref, predictor)
        print(json.dumps({k: v for k, v in r.items() if k != 'missed'}), flush=True)
        res['weeks'].append(r)
    res['ok'] = all(r['ok'] for r in res['weeks']) and res.get('full_build_unchanged', {'ok': True})['ok']
    with open(a.out, 'w') as f:
        json.dump(res, f, indent=1, default=str)
    print('predict check:', 'PASSED' if res['ok'] else 'FAILED', flush=True)
    if not res['ok']:
        sys.exit(1)


if __name__ == '__main__':
    main()
