#!/usr/bin/env python3
"""The frozen free-data props model, for one week: every player's predictive distribution for each stat it
covers, and his chance of going over any line. The one-shot 2026 test (PREREGISTRATION.md) and the shadow that
may follow it run this file and nothing else, so they score exactly the same code and the same model bytes.

What it does, for season S and week W:
  1. Builds week W's feature rows before any of its games, by build_features.py's own code in predict mode
     (`build(..., predict=(S, W))`): the games' own files (player stats, snap counts, play-by-play) are read only
     up to week W-1, the pre-game files (games.csv's schedule and lines, the depth chart snapshot at least four
     hours before kickoff, the injury report, the weekly roster) up to week W, and a row is made for every
     player who might play (the week's depth chart, the weekly roster's active players and anyone who played for
     the club in its last three games). The one exception is weather: where the play-by-play file already holds
     a week-W game (a run after its kickoff), its gamebook weather line, the kickoff report the training table
     reads, is read for that game; before kickoff there is none, and the weather is games.csv's alone.
     check_predict.py holds those rows equal to the training table's rows of the same players on 2025 and
     earlier weeks.
  2. Loads the frozen models (frozen/MANIFEST.json) and refuses any file whose SHA-256 is not the manifest's. Each
     file is read from MODELS (default $PROPMODEL_DATA/frozen) where it is there, else from the repo's gzipped
     copy, frozen/models/<file>.gz, whose decompressed bytes are held to the same SHA-256; a file in MODELS with
     another hash is refused, never passed over for the copy.
  3. Predicts, for each candidate row and each stat its position group is covered for:
       yards   (qgbm) passing yards QB; rushing yards QB, RB; receiving yards RB, WR, TE; rush + rec yards RB:
               21 quantiles, sorted, read as a CDF linear between them (model_yards.qgbm_cdf_rows), on integers
               P(Y <= k) = F(k + 0.5);
       counts  (GBM_NB) QB attempts, completions, interceptions, passing TDs, carries; RB carries, receptions;
               WR, TE receptions: negative binomial, mean mu, dispersion alpha(mu) = exp(a + b (log mu - c))
               (model_counts.nb_cdf);
       td      (GBM_POIS) rushing + receiving touchdowns, QB, RB, WR, TE: Poisson(lambda); the anytime touchdown
               is P(Y >= 1) = 1 - exp(-lambda) (a pass thrown never counts, as DraftKings and the site settle it).
     A stat on a group the models were not fitted on (a receiver's rushing yards, a quarterback's rush + rec
     yards, a kicker's anything) is not predicted.
  4. Writes one row per (player, stat): the distribution's mean, sd and quantiles, the anytime touchdown's
     chance, and the parameters (the 21 quantiles, mu and alpha, or lambda) from which p_over() gives
     P(Y > L) and P(Y = L) for any line L. For a half-point line P(over) = 1 - P(Y <= floor(L)); for a whole
     number L a push is possible, P(push) = P(Y = L), and P(over) = P(Y > L).

Who plays is not predicted: a row is made for a player who may sit, and a prop on a player who does not play is
void. The predictions use whatever files are on disk (or fetched) when it runs: run before a week's games it is
the live forecast; run after them it is the same forecast as far as the files allow (stat corrections and the
weekly roster as finally posted are what a later download holds; the week's own outcomes are never read).

2026 is held out: build_features.py refuses a season at or after fetch.HOLDOUT_FROM, which is 2026 unless the
one-shot test lifts it (fetch.py: PROPMODEL_LIFT_HOLDOUT set to the SHA-256 of the committed, unmodified, merged
PREREGISTRATION.md, inside oneshot_2026.py alone; this program run with the variable set is refused).

    python3 -I predict.py --data DIR --season S --week W [--models DIR/frozen] [--out FILE.parquet]
                          [--lines LINES.csv [--lines-out FILE.csv]] [--fetch] [--refresh]
LINES.csv: pid, stat, line (game_id optional): one row per prop; the output adds p_over, p_push, p_under.
Needs lightgbm, scipy, pandas, pyarrow.
"""
import argparse, gzip, hashlib, json, math, os, sys, time
from types import SimpleNamespace
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fetch as F            # noqa: E402
import build_features as B   # noqa: E402

MANIFEST = os.path.join(HERE, 'frozen', 'MANIFEST.json')
REPO_MODELS = os.path.join(HERE, 'frozen', 'models')    # the gzipped copies of the model files, in the repo
ALIASES = {'scrim_yards': 'rush_rec_yards', 'interceptions': 'passing_interceptions', 'anytime_td': 'any_td'}
QS_OUT = (0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


# ------------------------------------------------------------------------------- the distributions
# The same functions the walk-forward scored (model_yards.qgbm_cdf_rows, model_counts.nb_cdf), copied here so
# this file stands alone; check_frozen.py holds them equal to the originals.
TAUS = [0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95,
        0.98]


def qgbm_cdf_rows(Q, ymin, X):
    """the quantile curve read as a CDF at points X (n x m): linear between the 21 levels, out to 0 at a floor
    and 1 at a ceiling a little past the outer levels (model_yards.qgbm_cdf_rows)"""
    taus = np.array(TAUS)
    lo_b = np.minimum(Q[:, 0] - np.maximum(Q[:, 4] - Q[:, 0], 3.0), ymin)
    hi_b = Q[:, -1] + np.maximum(2.5 * (Q[:, -1] - Q[:, -3]), 10.0)
    tt = np.concatenate([[0.0], taus, [1.0]])
    eps = np.arange(len(tt)) * 1e-7
    out = np.empty(X.shape)
    for i in range(len(Q)):
        xp = np.concatenate([[lo_b[i]], Q[i], [hi_b[i]]]) + eps
        out[i] = np.interp(X[i], xp, tt)
    return out


def nb_logpmf(y, mu, alpha):
    from scipy import special
    r = 1.0 / alpha
    return (special.gammaln(y + r) - special.gammaln(r) - special.gammaln(y + 1)
            + r * np.log(r / (r + mu)) + y * np.log(mu / (r + mu)))


def nb_alpha(mu, disp):
    mu = np.maximum(np.asarray(mu, float), 1e-3)
    return np.exp(np.clip(disp['a'] + disp['b'] * (np.log(mu) - disp['c']), -12, 5))


def nb_cdf(mu, disp, K):
    """P(Y <= k) for k = 0..K under the negative binomial (model_counts.nb_cdf)"""
    mu = np.maximum(np.asarray(mu, float), 1e-3)
    a = nb_alpha(mu, disp)
    ks = np.arange(K + 1)[None, :]
    lp = nb_logpmf(ks, mu[:, None], a[:, None])
    return np.minimum(np.cumsum(np.exp(lp), axis=1), 1.0)


def pois_cdf(lam, K):
    from scipy import stats as sps
    lam = np.maximum(np.asarray(lam, float), 1e-6)
    return np.minimum(sps.poisson.cdf(np.arange(K + 1)[None, :], lam[:, None]), 1.0)


def summary_from_cdf(Fk, k0):
    """mean, sd and quantiles of an integer distribution from P(Y <= k), k = k0..k0+m-1 (the last column 1)"""
    n, m = Fk.shape
    pmf = np.diff(np.concatenate([np.zeros((n, 1)), Fk], axis=1), axis=1)
    ks = np.arange(k0, k0 + m)
    mean = (pmf * ks).sum(1)
    sd = np.sqrt(np.maximum((pmf * ks ** 2).sum(1) - mean ** 2, 0))
    qs = {f'q{int(round(q * 100)):02d}': ks[np.argmax(Fk >= q, axis=1)].astype(float) for q in QS_OUT}
    return mean, sd, qs


# ------------------------------------------------------------------------------------ the predictor
class Predictor:
    """the frozen models, verified against the manifest; predict_rows() on feature rows, p_over() on a line"""

    def __init__(self, models_dir=None, manifest=MANIFEST, verify=True):
        import lightgbm as lgb
        self.man = json.load(open(manifest))
        self.dir = models_dir or os.path.join(os.environ.get('PROPMODEL_DATA', ''), 'frozen')
        self.versions = self.man.get('versions', {})
        if lgb.__version__ != self.versions.get('lightgbm'):
            print(f'warning: lightgbm {lgb.__version__} here, the models were written by {self.versions.get("lightgbm")}',
                  file=sys.stderr)

        self.sources = {'models_dir': 0, 'repo_gz': 0}

        def load(info):
            p = os.path.join(self.dir, info['file'])
            if os.path.exists(p):
                if verify and sha256(p) != info['sha256']:
                    raise SystemExit(f'refused: {p} is not the frozen file (SHA-256 differs from frozen/MANIFEST.json)')
                self.sources['models_dir'] += 1
                return lgb.Booster(model_file=p)
            gz = os.path.join(REPO_MODELS, info['file'] + '.gz')
            if not os.path.exists(gz):
                raise SystemExit(f'missing frozen model file {p} (and no copy {gz})')
            with open(gz, 'rb') as f:
                raw = gzip.decompress(f.read())
            if verify and hashlib.sha256(raw).hexdigest() != info['sha256']:
                raise SystemExit(f'refused: {gz} is not the frozen file (SHA-256 differs from frozen/MANIFEST.json)')
            self.sources['repo_gz'] += 1
            return lgb.Booster(model_str=raw.decode('utf-8'))
        Y = self.man['yards']
        self.yards = {st: dict(S, boosters=[load(f) for f in S['files']]) for st, S in Y['stats'].items()}
        C = self.man['counts']
        self.counts_feats = C['features']
        self.counts = {k: dict(T, booster=load(T)) for k, T in C['targets'].items()}
        D = self.man['td']
        self.td_feats = D['features']
        self.td = {g: dict(T, booster=load(T)) for g, T in D['groups'].items()}

    # coverage: which (group, stat) pairs have a model
    def covered(self):
        out = {}
        for st, S in self.yards.items():
            for g in S['groups']:
                out[(g, st)] = 'qgbm'
        for k in self.counts:
            g, st = k.split(':')
            out[(g, st)] = 'GBM_NB'
        for g in self.td:
            out[(g, 'any_td')] = 'GBM_POIS'
        return out

    @staticmethod
    def _X(rows, feats):
        miss = [c for c in feats if c not in rows.columns]
        if miss:
            raise SystemExit(f'feature rows lack {len(miss)} model features, e.g. {miss[:5]}')
        return rows[feats].apply(pd.to_numeric, errors='coerce').astype(float)

    def predict_rows(self, rows):
        """one row per (player row, covered stat): mean, sd, quantiles and the distribution's parameters"""
        rows = rows[rows.grp.isin(['QB', 'RB', 'WR', 'TE'])].reset_index(drop=True)
        ident = [c for c in ('season', 'week', 'game_id', 'kickoff_utc', 'pid', 'name', 'team', 'opp', 'grp',
                             'cand_src') if c in rows.columns]
        out = []
        for st, S in self.yards.items():
            r = rows[rows.grp.isin(S['groups'])].reset_index(drop=True)
            if r.empty:
                continue
            X = self._X(r.assign(grp_code=r.grp.map(S['grp_code']).astype(float)), S['features'])
            Q = np.sort(np.column_stack([b.predict(X) for b in S['boosters']]), axis=1)
            lo, hi = S['support']
            K = np.arange(lo, hi + 1)
            Fk = qgbm_cdf_rows(Q, S['ymin'], np.broadcast_to(K[None, :] + 0.5, (len(r), len(K))))
            Fk[:, -1] = 1.0
            mean, sd, qs = summary_from_cdf(Fk, lo)
            o = r[ident].copy()
            o['stat'], o['model'], o['mean'], o['sd'] = st, 'qgbm', mean, sd
            for k, v in qs.items():
                o[k] = v
            o['params'] = [json.dumps({'Q': [round(float(x), 6) for x in q], 'ymin': S['ymin']}) for q in Q]
            out.append(o)
        for key, T in self.counts.items():
            g, st = key.split(':')
            r = rows[rows.grp == g].reset_index(drop=True)
            if r.empty:
                continue
            mu = np.maximum(T['booster'].predict(self._X(r, self.counts_feats).values.astype(np.float32)), 1e-3)
            K = int(max(T['kmax'], math.ceil(float(np.max(mu)) * 4 + 10)))
            Fk = nb_cdf(mu, T['disp'], K)
            Fk[:, -1] = 1.0
            mean, sd, qs = summary_from_cdf(Fk, 0)
            o = r[ident].copy()
            o['stat'], o['model'], o['mean'], o['sd'] = st, 'GBM_NB', mean, sd
            for k, v in qs.items():
                o[k] = v
            alpha = nb_alpha(mu, T['disp'])
            o['params'] = [json.dumps({'mu': round(float(m), 8), 'alpha': float(a), 'disp': T['disp']})
                           for m, a in zip(mu, alpha)]
            out.append(o)
        for g, T in self.td.items():
            r = rows[rows.grp == g].reset_index(drop=True)
            if r.empty:
                continue
            lam = np.maximum(T['booster'].predict(self._X(r, self.td_feats).values.astype(np.float32)), 1e-6)
            Fk = pois_cdf(lam, 12)
            Fk[:, -1] = 1.0
            mean, sd, qs = summary_from_cdf(Fk, 0)
            o = r[ident].copy()
            o['stat'], o['model'], o['mean'], o['sd'] = 'any_td', 'GBM_POIS', mean, sd
            for k, v in qs.items():
                o[k] = v
            o['p_ge1'] = 1 - np.exp(-lam)
            o['p_ge2'] = 1 - np.exp(-lam) * (1 + lam)
            o['params'] = [json.dumps({'lam': round(float(x), 10)}) for x in lam]
            out.append(o)
        if not out:
            return pd.DataFrame(columns=ident + ['stat', 'model', 'mean', 'sd'])
        return pd.concat(out, ignore_index=True)


def cdf_at(model, params, k):
    """P(Y <= k) for an integer k under one prediction's distribution"""
    p = json.loads(params) if isinstance(params, str) else params
    if model == 'qgbm':
        Q = np.asarray(p['Q'], float)[None, :]
        return float(qgbm_cdf_rows(Q, p['ymin'], np.array([[k + 0.5]]))[0, 0])
    if k < 0:
        return 0.0
    if model == 'GBM_NB':
        return float(nb_cdf(np.array([p['mu']]), p['disp'], int(k))[0, -1])
    if model == 'GBM_POIS':
        return float(pois_cdf(np.array([p['lam']]), int(k))[0, -1])
    raise ValueError(model)


def p_over(model, params, line):
    """(P(Y > line), P(Y = line)) on an integer outcome: a half-point line has no push"""
    L = float(line)
    k = math.floor(L)
    over = 1.0 - cdf_at(model, params, k)
    push = 0.0
    if L == k:
        push = cdf_at(model, params, k) - cdf_at(model, params, k - 1)
    return over, push


def week_rows(data, season, week, fetch=False):
    """week W's candidate feature rows, built before its games (build_features.py's predict mode)"""
    a = SimpleNamespace(data=data, first=2013, last=season, warmup_from=2010, out=None, no_fetch=not fetch,
                        cutoff=None, compare=None, predict=(season, week))
    rows, summary = B.build(a)
    return rows, summary


def refresh(data, season):
    """delete the season's files and games.csv's cut so that F.fetch downloads them as they stand now"""
    gone = []
    for kind in F.SEASON_FILES:
        p = F.path(data, kind, season)
        if os.path.exists(p):
            os.remove(p); gone.append(os.path.basename(p))
    for p in (F.games_path(data), F.players_path(data)):
        if os.path.exists(p):
            os.remove(p); gone.append(os.path.basename(p))
    return gone


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'))
    ap.add_argument('--season', type=int, required=True)
    ap.add_argument('--week', type=int, required=True)
    ap.add_argument('--models', default=None, help='the frozen model files (default DATA/frozen)')
    ap.add_argument('--out', default=None, help='default DATA/pred_<season>_w<week>.parquet')
    ap.add_argument('--lines', default=None, help='a CSV of pid, stat, line (game_id optional) to price')
    ap.add_argument('--lines-out', default=None)
    ap.add_argument('--fetch', action='store_true', help='download the files missing from DATA/raw first')
    ap.add_argument('--refresh', action='store_true', help="re-download the season's files and games.csv first")
    a = ap.parse_args()
    if not a.data:
        sys.exit('--data DIR is required')
    t0 = time.time()
    if a.refresh:
        print('refreshed:', refresh(a.data, a.season), flush=True)
    rows, summary = week_rows(a.data, a.season, a.week, fetch=a.fetch or a.refresh)
    P = Predictor(models_dir=a.models or os.path.join(a.data, 'frozen'))
    pred = P.predict_rows(rows)
    pred['made_at'] = pd.Timestamp.now(tz='UTC').isoformat(timespec='seconds')
    out = a.out or os.path.join(a.data, 'pred_%d_w%02d.parquet' % (a.season, a.week))
    pred.to_parquet(out, index=False)
    print(f'{len(rows)} candidate rows ({summary.get("candidates_by_src")}), {len(pred)} predictions -> {out} '
          f'({time.time() - t0:.0f}s)', flush=True)
    if a.lines:
        L = pd.read_csv(a.lines)
        L['stat'] = L.stat.replace(ALIASES)
        on = ['pid', 'stat'] + (['game_id'] if 'game_id' in L.columns else [])
        J = L.merge(pred[on + ['model', 'params', 'grp', 'mean']], on=on, how='left')
        res = [p_over(m, p, l) if isinstance(p, str) else (np.nan, np.nan)
               for m, p, l in zip(J.model, J.params, J.line)]
        J['p_over'] = [r[0] for r in res]
        J['p_push'] = [r[1] for r in res]
        J['p_under'] = 1 - J.p_over - J.p_push
        lo = a.lines_out or os.path.splitext(out)[0] + '_lines.csv'
        J.drop(columns=['params']).to_csv(lo, index=False)
        print(f'{J.p_over.notna().sum()} of {len(J)} lines priced -> {lo}', flush=True)


if __name__ == '__main__':
    main()
