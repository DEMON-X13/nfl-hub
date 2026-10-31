#!/usr/bin/env python3
"""The touchdown shadow's equivalence proof, run once, by hand, before the shadow's first call: does td_shadow.py's own
code make the one-shot's p? It runs td_shadow.py's functions (the guard, `lifted()`, `predict_week`, `p_from_pred`,
`game_coverage`, `grade_from_played`) on the one-shot's own data directory, the 2026 files oneshot_2026.py downloaded
and scored on 31 October 2026 (each held here to the SHA-256 results/oneshot_2026.json records), for weeks 1 to 6,
the weeks of its priced anytime touchdowns, and holds the result against the one-shot's own table of those legs
(DATA/oneshot_2026_priced_td.parquet, written by its `run`) on every leg it scored or voided:

  * p, bit for bit (the clipped chance it scored, and the unclipped p_ge1 under it);
  * p again from the repo's gzipped model files, which the props job reads (the one-shot read DATA/frozen), bit for bit;
  * the position group;
  * the registered "played" reading: y on each scored leg, and void on each leg it voided ("did not play").

It writes results/td_shadow_equiv.json: counts of agreement, the inputs' and the code's hashes, the libraries, the
time and the memory, and nothing else: no metric, rate, interval or outcome count. It re-reads weeks 1 to 6's
outcomes with the model's code for code equivalence alone, under the same in-memory lift of the holdout as the
shadow (td_shadow.py's docstring argues it; the owner signed it off on 31 October 2026), and chooses nothing. It reads
the data directory and writes nothing there.

    venv/bin/python -I -B td_shadow_equiv.py --data DIR [--parquet DIR/oneshot_2026_priced_td.parquet] [--out FILE]
"""
import argparse
import gc
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import td_shadow as T   # noqa: E402  (standard library at its top; the model loads in T.load())

WEEKS = [1, 2, 3, 4, 5, 6]          # the one-shot's priced weeks (PRICED_WEEKS), the touchdown legs it scored
VOID = 'did not play (void)'
OUT = os.path.join(HERE, 'results', 'td_shadow_equiv.json')


def same_bits(a, b):
    return a is not None and b is not None and float(a).hex() == float(b).hex()


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--data', required=True, help="the one-shot's data directory")
    ap.add_argument('--parquet', default=None, help='default DATA/oneshot_2026_priced_td.parquet')
    ap.add_argument('--out', default=OUT)
    a = ap.parse_args(argv)
    pq = a.parquet or os.path.join(a.data, 'oneshot_2026_priced_td.parquet')
    t0 = time.time()
    try:
        OS = T.load()
        T.guard_code(OS)
    except T.Refused as e:
        print(f'REFUSED: {e}', file=sys.stderr)
        return 1
    import numpy as np
    import pandas as pd
    res_1shot = json.load(open(T.RESULT, encoding='utf-8'))
    # the inputs are the one-shot's: its seven 2026 files byte for byte, and the 2010-2025 files the models were fitted on
    raw = os.path.join(a.data, 'raw')
    want = res_1shot['raw_2026_sha256']
    have = {fn: T.sha256_file(os.path.join(raw, fn)) for fn in OS.raw_2026(a.data)}
    if have != want:
        print(f'REFUSED: the 2026 files are not the ones the one-shot read: {sorted(set(have.items()) ^ set(want.items()))}',
              file=sys.stderr)
        return 1
    man = json.load(open(OS.PR.MANIFEST))
    rvm = OS.raw_vs_manifest(a.data, man)
    if rvm['differ'] or rvm['missing']:
        print(f'REFUSED: the 2010-2025 files are not the manifest\'s: {rvm}', file=sys.stderr)
        return 1

    L = pd.read_parquet(pq)
    L = L[L.why.isna() | (L.why == VOID)].reset_index(drop=True)
    scored = L.why.isna().values
    keys = list(zip(L.game_id, L.pid))
    if len(set(keys)) != len(keys):
        print('REFUSED: the table holds a player and game twice', file=sys.stderr)
        return 1

    predictor = T.make_predictor(OS, a.data)                                   # DATA/frozen, as the one-shot read them
    gz = OS.PR.Predictor(models_dir=os.path.join(HERE, 'frozen', 'no-such-directory'))   # the repo's gz copies
    shadow, gz_p, cover, cand_rows, preds, secs = {}, {}, {}, 0, 0, {}
    with T.lifted(OS):
        assert OS.F.games_path(a.data).endswith('games_to2026.csv')
        for w in WEEKS:
            kw = [k for k, wk in zip(keys, L.week) if int(wk) == w]
            wk = T.predict_week(OS, a.data, T.SEASON, w, predictor)
            shadow.update(T.p_from_pred(OS, wk, kw))
            g = gz.predict_rows(wk['rows'])
            g = g[g.stat == 'any_td']
            gz_p.update(dict(zip(zip(g.game_id, g.pid), np.clip(g.p_ge1.values.astype(float), *OS.CLIP))))
            unclipped = dict(zip(zip(wk['td'].game_id, wk['td'].pid), wk['td'].p_ge1.values.astype(float)))
            for k in kw:
                shadow[k]['p_ge1'] = unclipped.get(k)
            cv, _, _ = T.game_coverage(OS, a.data, T.SEASON, w, sorted({k[0] for k in kw}))
            cover.update(cv)
            cand_rows += len(wk['cands'])
            preds += len(wk['td'])
            secs[w] = wk['seconds']
            print(f'week {w}: {len(kw)} legs, {len(wk["cands"])} candidate rows, {wk["seconds"]}', flush=True)
            del wk, g
            gc.collect()
        rss_predict = T.peak_rss_gb()
        t1 = time.time()
        played = OS.outcomes(a.data, T.SEASON)
        grades = T.grade_from_played(played, keys)
        secs['outcomes_and_grade'] = round(time.time() - t1, 1)
        del played
    assert OS.F.HOLDOUT_FROM == OS.B.HOLDOUT_FROM == T.SEASON

    def tally(mask, ok):
        n = int(mask.sum())
        k = int(sum(1 for m, o in zip(mask, ok) if m and o))
        return {'rows': n, 'agree': k, 'differ': n - k}

    sp = [shadow[k]['p'] for k in keys]
    p_ok = [same_bits(s, q) for s, q in zip(sp, L.p.values)]
    pu_ok = [same_bits(shadow[k]['p_ge1'], q) for k, q in zip(keys, L.p_td.values)]
    gz_ok = [same_bits(gz_p.get(k), s) for k, s in zip(keys, sp)]
    grp_ok = [shadow[k]['grp'] == g for k, g in zip(keys, L.grp)]
    y_ok = [grades[k]['result'] in ('td', 'no_td') and float(grades[k]['y']) == float(y) for k, y in zip(keys, L.y)]
    void_ok = [grades[k]['result'] == 'void' for k in keys]
    covered = [cover.get(k[0]) is None for k in keys]
    agree = {
        'p_scored': tally(scored, p_ok), 'p_void': tally(~scored, p_ok),
        'p_ge1_unclipped': tally(np.ones(len(keys), bool), pu_ok),
        'p_repo_gz_models': tally(np.ones(len(keys), bool), gz_ok),
        'grp': tally(np.ones(len(keys), bool), grp_ok),
        'y_scored': tally(scored, y_ok), 'void': tally(~scored, void_ok),
        'p_why_none': tally(np.ones(len(keys), bool), [shadow[k]['p_why'] is None for k in keys]),
        'games_covered': {'games': len(cover), 'covered': sum(1 for v in cover.values() if v is None)},
        'legs_on_covered_games': tally(np.ones(len(keys), bool), covered)}
    ok = all(v['differ'] == 0 for v in agree.values() if 'differ' in v) and \
        agree['games_covered']['covered'] == agree['games_covered']['games']
    out = {
        'what': ("td_shadow.py's p, grade glue and per-game coverage run on the one-shot's own data directory for 2026 "
                 "weeks 1-6, held to the one-shot's table of the anytime-touchdown legs it scored or voided "
                 "(oneshot_2026_priced_td.parquet): agreement counts only. Code equivalence: it re-reads weeks 1-6's "
                 "outcomes with the model's code under the shadow's in-memory lift of the holdout (td_shadow.py's "
                 "docstring), computes no metric, rate or interval, and chooses nothing."),
        'run_at': pd.Timestamp.now(tz='UTC').isoformat(timespec='seconds'),
        'verdict': 'identical' if ok else 'NOT IDENTICAL',
        'weeks': WEEKS,
        'agreement': agree,
        'code': {'td_shadow.py': T.sha256_file(os.path.join(HERE, 'td_shadow.py')),
                 'td_shadow_equiv.py': T.sha256_file(os.path.abspath(__file__)),
                 'registered': {p: h for p, h in T.BAR['registered_with']['runs'].items()},
                 'preregistration_sha256': T.BAR['registered_with']['preregistration_sha256'],
                 'oneshot_result_sha256': T.BAR['registered_with']['oneshot_sha256']},
        'inputs': {'raw_2026_sha256': have, 'raw_2026_equal_to_oneshot_result': True,
                   'raw_vs_manifest': {'same': rvm['same'], 'differ': len(rvm['differ']), 'missing': len(rvm['missing'])},
                   'oneshot_table': {'file': os.path.basename(pq), 'sha256': T.sha256_file(pq),
                                     'legs_compared': len(keys), 'scored': int(scored.sum()), 'void': int((~scored).sum())},
                   'candidate_rows': cand_rows, 'any_td_predictions': preds},
        'models_source': {'oneshot_path': dict(predictor.sources), 'repo_gz': dict(gz.sources),
                          'oneshot_result': res_1shot.get('models_source')},
        'runtime': OS.versions(),
        'seconds': {'weeks': {str(k): v for k, v in secs.items() if isinstance(k, int)},
                    'outcomes_and_grade': secs['outcomes_and_grade'], 'total': round(time.time() - t0, 1)},
        'peak_rss_gb': {'after_predictions': round(rss_predict, 2), 'after_outcomes': round(T.peak_rss_gb(), 2)},
    }
    print(json.dumps({k: out[k] for k in ('verdict', 'agreement', 'models_source', 'seconds', 'peak_rss_gb')}, indent=1))
    with open(a.out + '.part', 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1)
        f.write('\n')
    os.replace(a.out + '.part', a.out)
    print('wrote', a.out, flush=True)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
