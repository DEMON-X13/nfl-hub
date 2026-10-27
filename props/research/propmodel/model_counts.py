#!/usr/bin/env python3
"""Walk-forward test of outcome DISTRIBUTIONS for the count props: receptions (RB, WR, TE), completions,
attempts, interceptions and passing touchdowns (QB), and carries (QB, RB).

This is step two of the free-data props model (README.md): a small family of candidate models, each
predicting a whole distribution for a player's count in a game, scored walk-forward on 2021-2025
against the site's current model. Nothing here is fitted on, or reads, 2026: the feature table stops
at 2025 and the script refuses a row of 2026 or later.

Walk-forward, for each test season s in 2021..2025:
  - the training seasons are 2013..s-1 for the new candidates (the feature table starts in 2013), and
    2019..s-1 for the site's current recipe (props/raw/feat.pkl, its own table, starts in 2019);
  - one inner split inside the training seasons: fit on 2013..s-2, validate on s-1. It chooses the GBMs'
    number of rounds (early stopping), the GLM's L2 penalty from a three-value grid, and the negative
    binomial dispersion (fitted on the validation season's out-of-sample predictions, so it includes the
    mean's own error). The model is then refitted on 2013..s-1 with what the inner split chose, and
    predicts s. Season s is never used to fit or choose anything;
  - every other hyperparameter is fixed in this file before any run.

The candidates (TARGETS lists the nine group-stat pairs):
  CURRENT  the site's model, refitted walk-forward by its own recipe (recovered by the diagnosis and
           checked again here): ridge (lambda 2) on featVec's 15 inputs, rows with 2+ earlier games,
           then four tiers at the quartiles of the fitted mean, each a table of result / mean at 51
           quantiles, priced as part2.js's pOver does (P(over k.5) = 1 - cdfBlend(mu, (k+0.5)/mu)).
           At s = 2025 the recipe's training seasons are exactly the shipped model's (2019-2024).
  SHIPPED  the shipped coefficients and tables themselves (props/data/final_model.json), scored on 2025
           only (2019-2024 are its own fitting seasons).
  GLM_NB   a Poisson GLM (log link, L2) on 57-82 curated as-of features per stat (recent form,
           snap/target/carry/dropback shares, depth rank, injuries, teammates out, team volume,
           opponent, the game's implied total and spread), negative binomial around it with
           dispersion alpha(mu) = exp(a + b log mu).
  GBM_NB   LightGBM with a Poisson objective on every feature (510), the same negative binomial.
  GBM_MC   LightGBM multiclass on the count itself (classes 0..cap, the top one "cap or more"): a
           direct, shape-free predictive distribution, on the 120 features the inner Poisson GBM (fitted
           on 2013..s-2) gained most from.
  REF_NAIVE (a reference, not a candidate) negative binomial around the player's own weighted mean
           (p_<stat>_ew10, else career, else the group's training mean).

Scored on the same test rows for every model: every game a player played in his role in the test
season, zero rows (played, no stat line) included, since that is how DraftKings settles a prop:
  - CRPS of the predictive distribution (for integer outcomes, the sum over k of (F(k) - 1{y<=k})^2);
  - the log score of the outcome under the predictive pmf (floored at 1e-6);
  - the randomised PIT (10-bin histogram) and the 50% and 80% central-interval coverage it implies;
  - P(stat > L) at stand-in lines, since no book line exists before 2026: L = his trailing median over
    his last 6 games (at least 3) rounded to the book's half-point step, L = his trailing 5-game mean
    rounded to the nearest half point (the diagnosis's model-free market proxy), and for interceptions
    0.5, for passing TDs 0.5 (any passing TD) and 1.5. For each: log loss, Brier, a reliability table,
    the calibration slope and intercept (logistic of the outcome on logit p; slope < 1 is overconfident),
    and how far p sits from 0.5 on average against how far the realised hit rates sit, by decile of p;
  - breakdowns: starters and backups (by the week's depth chart rank: QB1, RB1-2, WR1-3, TE1), rookies,
    thin history, promoted backups (moved into a starter slot since his previous game, same club), a
    depth rank that rose, and a teammate of his group out.
  Differences against CURRENT carry a bootstrap 90% interval that resamples whole games.

  python3 -I model_counts.py --data DIR [--targets QB:attempts,WR:receptions] [--seasons 2025] [--quick]

Writes results/counts_walkforward.json beside this file, and the per-row predictions to
DIR/counts_walkforward_preds.parquet (outside the repo).
"""
import argparse, json, os, sys, time, warnings
import numpy as np, pandas as pd
from scipy import optimize, special

warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
HOLDOUT_FROM = 2026
TEST_SEASONS = [2021, 2022, 2023, 2024, 2025]
FIRST_NEW, FIRST_CUR = 2013, 2019
TARGETS = [('QB', 'attempts'), ('QB', 'completions'), ('QB', 'passing_interceptions'), ('QB', 'passing_tds'),
           ('QB', 'carries'), ('RB', 'carries'), ('RB', 'receptions'), ('WR', 'receptions'), ('TE', 'receptions')]
# support of the scored distribution, 0..KMAX (generous: no test outcome reaches it)
KMAX = {'receptions': 25, 'carries': 50, 'completions': 60, 'attempts': 80, 'passing_interceptions': 8,
        'passing_tds': 9}
# the multiclass model's top class, "cap or more"
CAP = {('QB', 'attempts'): 62, ('QB', 'completions'): 45, ('QB', 'passing_interceptions'): 5,
       ('QB', 'passing_tds'): 6, ('QB', 'carries'): 15, ('RB', 'carries'): 34, ('RB', 'receptions'): 13,
       ('WR', 'receptions'): 16, ('TE', 'receptions'): 14}
FIXED_LINES = {'passing_interceptions': [0.5], 'passing_tds': [0.5, 1.5]}
STARTER_SLOTS = {'QB': 1, 'RB': 2, 'WR': 3, 'TE': 1}
FEAT_PREFIX = ('p_', 't_', 'd_', 'oa_', 'dc_', 'inj_', 'tm_', 'od_', 'x_', 'g_')
GBM_BASE = dict(learning_rate=0.05, num_leaves=15, min_data_in_leaf=50, feature_fraction=0.5,
                bagging_fraction=0.8, bagging_freq=1, lambda_l2=10.0, max_bin=63, min_data_in_bin=5,
                verbose=-1, num_threads=int(os.environ.get('PM_THREADS', '2')), seed=7, deterministic=True, force_row_wise=True)
GLM_ALPHAS = [1e-4, 1e-3, 1e-2]
CANDS = ['CURRENT', 'GLM_NB', 'GBM_NB', 'GBM_MC']
REFS = ['REF_NAIVE', 'SHIPPED']
B_BOOT = 1000
MC_FEATURES = 120


def rnd(o):
    if isinstance(o, float): return round(o, 5) if np.isfinite(o) else None
    if isinstance(o, dict): return {k: rnd(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)): return [rnd(v) for v in o]
    return o


def dump(o, path):
    json.dump(rnd(o), open(path, 'w'), indent=1)


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


# ---------------------------------------------------------------- data
def load_table(data):
    d = pd.read_parquet(os.path.join(data, 'features.parquet'))
    if int(d.season.max()) >= HOLDOUT_FROM:
        sys.exit(f'refused: the feature table holds season {int(d.season.max())}; 2026 on is held out')
    d = d[(d.role_played == 1) & d.grp.isin(['QB', 'RB', 'WR', 'TE'])].copy()
    d = d.sort_values(['pid', 'tkey']).reset_index(drop=True)
    return d


def derive(d):
    """Per-row facts every model shares: the stand-in lines and the breakdown flags, all as of before
    the game (trailing windows over his earlier role games; the week's depth chart)."""
    gb = d.groupby('pid', sort=False)
    out = {}
    for st in sorted({s for _, s in TARGETS}):
        y = d['y_' + st].astype(float)
        sh = gb['y_' + st].shift(1)
        med = sh.groupby(d.pid).rolling(6, min_periods=3).median().reset_index(level=0, drop=True)
        m5 = sh.groupby(d.pid).rolling(5, min_periods=3).mean().reset_index(level=0, drop=True)
        Lmed = np.maximum(np.ceil(med) - 0.5, 0.5)       # the half-point step at or just below the median
        Lm5 = np.floor(m5) + 0.5                          # the nearest half point to the mean
        out['L_med_' + st] = Lmed.where(med.notna())
        out['L_m5_' + st] = Lm5.where(m5.notna())
    for k, v in out.items():
        d[k] = v.reindex(d.index).values
    d['prev_rank'] = gb['dc_rank'].shift(1)
    d['prev_team'] = gb['team'].shift(1)
    slot = d.grp.map(STARTER_SLOTS)
    d['starter'] = (d.dc_rank <= slot).astype(int)
    same = d.prev_team == d.team
    d['promoted'] = (same & (d.dc_rank <= slot) & (d.prev_rank > slot)).astype(int)
    d['rank_rose'] = (same & (d.dc_rank < d.prev_rank)).astype(int)
    d['rookie'] = (d.x_rookie == 1).astype(int)
    d['thin'] = (d.x_gp_car.fillna(0) < 4).astype(int)
    return d


def lineable(F, g, st):
    """Rows a book would plausibly price, judged before the game: a QB stat on the week's QB1 (carries also
    with a trailing median of 1.5+), receptions with a trailing median of 1.5+, a back's carries 4.5+."""
    L = F.L_med.values
    if g == 'QB':
        m = F.starter.values == 1
        return m & (L >= 1.5) if st == 'carries' else m
    return L >= (4.5 if st == 'carries' else 1.5)


def subsets(F, g, st):
    """The breakdowns, as boolean masks over the rows F."""
    S = {'lineable': lineable(F, g, st), 'all': np.ones(len(F), bool), 'starter': F.starter.values == 1, 'backup': F.starter.values == 0,
         'rookie': F.rookie.values == 1, 'thin_history': F.thin.values == 1,
         'promoted_to_starter': F.promoted.values == 1, 'rank_rose': F.rank_rose.values == 1,
         'weeks_1_4': F.week.values <= 4, 'weeks_5_18': F.week.values >= 5}
    if g == 'QB':
        S['qb_change'] = ((F.dc_qb_change.fillna(0) == 1) | (F.tm_qb_lead_absent.fillna(0) == 1)).values & (F.starter.values == 1)
    elif st == 'carries':
        S['teammate_out'] = (F.tm_vac_car_grp.fillna(0) >= 0.15).values
    else:
        S['teammate_out'] = (F.tm_vac_tgt_grp.fillna(0) >= 0.10).values
    return S


# ---------------------------------------------------------------- the current model, its own recipe
VOLMAP = {'attempts': 't_pass_att', 'completions': 't_pass_att', 'passing_yards': 't_pass_yds', 'passing_tds': 't_tds',
          'passing_interceptions': 't_pass_att', 'carries': 't_carries', 'rushing_yards': 't_rush_yds',
          'receptions': 't_targets', 'targets': 't_targets', 'receiving_yards': 't_pass_yds', 'scrim_yards': 't_plays',
          'any_td': 't_tds', 'fg_att': 't_fg_att', 'fg_made': 't_fg_att', 'kick_pts': 't_pat_att'}
DEFMAP = {'attempts': 'd_pass_att', 'completions': 'd_pass_att', 'passing_yards': 'd_pass_yds', 'passing_tds': 'd_tds',
          'passing_interceptions': 'd_pass_att', 'carries': 'd_carries', 'rushing_yards': 'd_rush_yds',
          'receptions': 'd_pass_att', 'targets': 'd_pass_att', 'receiving_yards': 'd_pass_yds', 'scrim_yards': 'd_rush_yds',
          'any_td': 'd_tds', 'fg_att': 'd_pass_yds', 'fg_made': 'd_pass_yds', 'kick_pts': 'd_tds'}
TEAMFIX = {'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA'}
CTX = ['imp_z', 'home', 'sprd', 'abs_sprd']


class Current:
    """The site's recipe on its own table (props/raw/feat.pkl, 2019-2025, rows with a stat line). A row the
    current table lacks (a zero row: he played and recorded nothing) is given the features the recipe would
    have had for him that week: his windows over his earlier stat-line games (as the recipe's own history
    is), and the game's context from his club's rows of the same game. The recipe's context uses whole-season
    normalisation (imp_z, the team and defence z's), a small look-ahead the baseline keeps as it is."""

    def __init__(self, R):
        fp = os.path.join(REPO, 'props', 'raw', 'feat.pkl')
        f = pd.read_pickle(fp)
        f = f[f.season < HOLDOUT_FROM].copy()
        f['team_m'] = f.team.replace(TEAMFIX)
        self.FM = json.load(open(os.path.join(REPO, 'props', 'data', 'final_model.json')))
        self.QS = np.array(self.FM['qs'])
        stats = sorted({s for _, s in TARGETS})
        r = R[R.season >= FIRST_CUR][['pid', 'game_id', 'season', 'week', 'grp', 'team']].rename(columns={'pid': 'player_id'})
        m = r.merge(f[['player_id', 'game_id']].assign(_in=1), on=['player_id', 'game_id'], how='left')
        add = m[m._in.isna()][['player_id', 'game_id', 'season', 'week']]
        H = pd.concat([f[['player_id', 'game_id', 'season', 'week'] + stats].assign(_src=1),
                       add.assign(_src=0)], ignore_index=True)
        H = H.sort_values(['player_id', 'season', 'week']).reset_index(drop=True)
        gb = H.groupby('player_id', sort=False)
        for s in stats:
            sh = gb[s].shift(1)
            for span in (5, 3):
                e = sh.groupby(H.player_id, sort=False).ewm(span=span, adjust=True, ignore_na=True, min_periods=1).mean()
                H[f'e{span}_{s}'] = e.reset_index(level=0, drop=True).reindex(H.index).values
            cs = H[s].fillna(0).groupby(H.player_id, sort=False).cumsum()
            H['csum_' + s] = (cs - H[s].fillna(0)).values
        H['gp_prior'] = (H['_src'].groupby(H.player_id, sort=False).cumsum() - H['_src']).values
        ps = f.groupby(['player_id', 'season'])[stats].agg(['mean', 'count'])
        ps.columns = [f'{a}_{b}' for a, b in ps.columns]
        ps = ps.reset_index(); ps['season'] += 1
        H = H.merge(ps, on=['player_id', 'season'], how='left')
        # check: the recomputed windows equal the table's own on its rows
        chk = H[H._src == 1].merge(f[['player_id', 'game_id'] + [f'e5_{s}' for s in stats] + ['gp_prior']],
                                    on=['player_id', 'game_id'], suffixes=('', '_t'))
        self.check = {'rows': int(len(chk)),
                      'max_abs_e5_diff': float(max(np.nanmax(np.abs(chk[f'e5_{s}'].fillna(0) - chk[f'e5_{s}_t'].fillna(0))) for s in stats)),
                      'max_abs_gp_prior_diff': float(np.max(np.abs(chk.gp_prior - chk.gp_prior_t))),
                      'rows_added_without_a_stat_line': int(len(add))}
        tcols = [c for c in f.columns if c.startswith('tez_')]
        dcols = [c for c in f.columns if c.startswith('dez_')]
        ocols = [c for c in f.columns if c.startswith('oaz_')]
        tg = f.groupby(['game_id', 'team_m'])[CTX + tcols + dcols].first().reset_index()
        og = f.groupby(['game_id', 'team_m', 'grp'])[ocols].first().reset_index()
        self.H, self.tg, self.og, self.f = H, tg, og, f

    def frame(self, rows, grp):
        """Feature frame for the given (player_id, game_id, team, grp) rows."""
        n0 = len(rows)
        x = rows.merge(self.H.drop(columns=['season', 'week']), on=['player_id', 'game_id'], how='left')
        x = x.merge(self.tg.rename(columns={'team_m': 'team'}), on=['game_id', 'team'], how='left')
        x = x.merge(self.og.rename(columns={'team_m': 'team'}).assign(grp=lambda z: z.grp),
                    left_on=['game_id', 'team', 'grp'], right_on=['game_id', 'team', 'grp'], how='left')
        assert len(x) == n0, 'a feature merge duplicated rows'
        return x

    def X(self, x, st, prior, ks=4.0):
        n = x.gp_prior.fillna(0).values.astype(float)
        car = (x['csum_' + st].fillna(0).values + ks * prior) / (n + ks)
        pm, pn = x[st + '_mean'].fillna(0).values, x[st + '_count'].fillna(0).values
        py = (pm * pn + ks * prior) / (pn + ks)
        e5 = x['e5_' + st].fillna(0).values; e3 = x['e3_' + st].fillna(0).values
        oaz = x['oaz_' + st].fillna(0).values
        tvol = x['tez_' + VOLMAP[st]].fillna(0).values; ddef = x['dez_' + DEFMAP[st]].fillna(0).values
        imp, home, sprd, absp = [x[c].fillna(0).values for c in CTX]
        return np.column_stack([np.ones(len(x)), e5, e3, car, py, oaz, tvol, ddef, imp, home, sprd, absp,
                                e5 * oaz, e5 * imp, e5 * tvol])

    def train_rows(self, g, seasons):
        t = self.f[(self.f.grp == g) & self.f.season.isin(seasons)]
        return t[['player_id', 'game_id', 'team_m', 'grp', 'season']].rename(columns={'team_m': 'team'}).reset_index(drop=True), t

    def fit(self, g, st, seasons):
        rows, t = self.train_rows(g, seasons)
        prior = float(t[st].mean())
        x = self.frame(rows.drop(columns='season'), g)
        X = self.X(x, st, prior); y = t[st].values.astype(float)
        mk = x.gp_prior.fillna(0).values >= 2
        P = np.eye(X.shape[1]) * 2.0; P[0, 0] = 0
        coef = np.linalg.solve(X[mk].T @ X[mk] + P, X[mk].T @ y[mk])
        mu = np.maximum(X @ coef, 0)
        edges = np.quantile(mu[mk], [.25, .5, .75]).tolist()
        t_ = np.zeros(len(mu), int)
        for e in edges: t_ += (mu > e)
        q = []
        for k in range(4):
            mm = mk & (t_ == k)
            q.append(np.quantile(y[mm] / np.maximum(mu[mm], 0.05), self.QS).tolist())
        return {'coef': coef.tolist(), 'prior': prior, 'dist': {'edges': edges, 'q': q}}

    def shipped(self, g, st):
        return {'coef': self.FM['model'][g][st]['coef'], 'prior': self.FM['prior'][g][st], 'dist': self.FM['dist'][g][st]}

    def predict_cdf(self, M, test_rows, g, st):
        x = self.frame(test_rows, g)
        mu = np.maximum(self.X(x, st, M['prior']) @ np.array(M['coef']), 0)
        K = KMAX[st]
        ks = np.arange(K + 1)
        r = (ks[None, :] + 0.5) / np.maximum(mu, 0.05)[:, None]
        F = np.empty_like(r)
        for j in range(K + 1):
            F[:, j] = cdf_blend(M['dist'], self.QS, mu, r[:, j])
        F = np.maximum.accumulate(F, axis=1)
        return F, mu


def cdf_ratio(q, QS, r):
    q = np.asarray(q, float); r = np.asarray(r, float)
    i = np.searchsorted(q[1:], r, side='left'); i = np.clip(i, 0, len(q) - 2)
    span = np.maximum(q[i + 1] - q[i], 1e-9)
    v = QS[i] + ((r - q[i]) / span) * (QS[i + 1] - QS[i])
    v[r <= q[0]] = 0; v[r >= q[-1]] = 1
    return v


def cdf_blend(D, QS, mu, r):
    """part2.js cdfBlend, vectorised (as the diagnosis's common.py, on a given table)."""
    E = D['edges']; mu = np.asarray(mu, float); r = np.asarray(r, float)
    t = np.zeros(len(mu), int)
    for ed in E: t += (mu > ed)
    F = np.empty(len(mu))
    for k in range(len(D['q'])):
        m = t == k
        if m.any(): F[m] = cdf_ratio(D['q'][k], QS, r[m])
    for i, ed in enumerate(E):
        rel = (mu - ed) / ed
        m = np.abs(rel) < 0.18
        if not m.any(): continue
        other = np.where(mu > ed, i, i + 1)
        ok = m & (other != t)
        if not ok.any(): continue
        wt = 0.5 * (1 - np.abs(rel) / 0.18)
        Fo = np.empty(len(mu))
        for k in range(len(D['q'])):
            mm = ok & (other == k)
            if mm.any(): Fo[mm] = cdf_ratio(D['q'][k], QS, r[mm])
        F[ok] = (1 - wt[ok]) * F[ok] + wt[ok] * Fo[ok]
    return F


# ---------------------------------------------------------------- negative binomial
def nb_logpmf(y, mu, alpha):
    r = 1.0 / alpha
    return (special.gammaln(y + r) - special.gammaln(r) - special.gammaln(y + 1)
            + r * np.log(r / (r + mu)) + y * np.log(mu / (r + mu)))


def fit_disp(y, mu):
    """alpha(mu) = exp(a + b (log mu - c)) by maximum likelihood on out-of-sample predictions."""
    y = np.asarray(y, float); mu = np.maximum(np.asarray(mu, float), 1e-3)
    lm = np.log(mu); c = float(np.median(lm))

    def nll(th):
        a = np.exp(np.clip(th[0] + th[1] * (lm - c), -12, 5))
        return -np.sum(nb_logpmf(y, mu, a))
    best = None
    for a0 in (-6.0, -3.0, -1.0, 0.5):
        r = optimize.minimize(nll, [a0, 0.0], method='Nelder-Mead', options=dict(xatol=1e-5, fatol=1e-7, maxiter=4000))
        if best is None or r.fun < best.fun: best = r
    return {'a': float(best.x[0]), 'b': float(best.x[1]), 'c': c}


def nb_cdf(mu, disp, K):
    mu = np.maximum(np.asarray(mu, float), 1e-3)
    a = np.exp(np.clip(disp['a'] + disp['b'] * (np.log(mu) - disp['c']), -12, 5))
    ks = np.arange(K + 1)[None, :]
    lp = nb_logpmf(ks, mu[:, None], a[:, None])
    return np.minimum(np.cumsum(np.exp(lp), axis=1), 1.0)


# ---------------------------------------------------------------- the GLM's curated features
COUNT_WIN = ('_l1', '_l3', '_ew4', '_ew10', '_szn', '_prev', '_car', '_ew8')


def glm_features(g, st, cols):
    stat_w = [f'p_{st}_{w}' for w in ('l1', 'l3', 'ew4', 'ew10', 'szn', 'prev', 'car')]
    common = ['x_gp_car', 'x_gp_szn', 'x_rookie', 'x_new_team', 'x_years_exp', 'x_age', 'x_draft_number', 'x_undrafted',
              'x_team_games_missed', 'dc_rank', 'dc_depth', 'dc_listed', 'dc_team_chart', 'inj_questionable',
              'inj_doubtful', 'inj_dnp', 'inj_limited', 'inj_listed', 'g_implied', 'g_margin', 'g_total_line',
              'g_win_prob', 'g_is_home', 'g_dome', 'g_wind', 'g_wet', 'p_off_pct_ew4', 'p_off_pct_ew10', 'p_off_pct_l1',
              'p_off_pct_szn', 'p_off_pct_prev', 'p_off_pct_trend', 'tm_n_absent_grp', 'tm_ol_out']
    if st == 'receptions':
        extra = ['p_targets_ew4', 'p_targets_ew10', 'p_tgt_share_ew4', 'p_tgt_share_ew10', 'p_tgt_share_l3',
                 'p_tgt_share_szn', 'p_tgt_share_prev', 'p_tgt_share_trend', 'p_est_routes_ew4', 'p_r_catch_car',
                 'p_r_catch_ew10', 'p_r_tprr_ew10', 'p_r_adot_ew10', 't_tgt_ew8', 't_db_ew8', 't_r_pass_rate_ew8',
                 't_r_neu_pass_rate_ew8', 't_plays_ew8', 'oa_receptions_rel', 'oa_receptions_ew8', 'd_r_epa_db_ew8',
                 'd_db_ew8', 'd_plays_ew8', 'tm_vac_tgt', 'tm_vac_tgt_grp', 'tm_top3_tgt_absent', 'tm_ret_tgt',
                 'tm_qb_lead_absent', 'dc_qb_change', 'dc_qb1_epa_db']
    elif st == 'carries' and g == 'RB':
        extra = ['p_car_share_ew4', 'p_car_share_ew10', 'p_car_share_l3', 'p_car_share_szn', 'p_car_share_prev',
                 'p_car_share_trend', 'p_rz_car_share_ew4', 'p_car_d_ew4', 'p_targets_ew4', 't_drush_ew8', 't_plays_ew8',
                 't_r_pass_rate_ew8', 't_r_neu_pass_rate_ew8', 'oa_carries_rel', 'oa_carries_ew8', 'd_drush_ew8',
                 'd_plays_ew8', 'd_r_epa_rush_ew8', 'tm_vac_car', 'tm_vac_car_grp', 'tm_ret_car', 'tm_qb_lead_absent']
    elif st == 'carries':
        extra = ['p_scrambles_ew10', 'p_scrambles_ew4', 'p_car_d_ew10', 'p_car_d_ew4', 'p_db_share_ew4', 'p_db_share_l1',
                 'p_db_ew4', 'dc_is_qb1', 'tm_is_qb_lead', 'tm_qb_lead_absent', 'dc_qb_change', 't_drush_ew8',
                 't_plays_ew8', 'd_r_sack_rate_ew8', 'oa_rushing_yards_rel', 'p_rushing_yards_ew10']
    else:  # QB passing counts
        extra = ['p_db_share_ew4', 'p_db_share_ew10', 'p_db_share_l1', 'p_db_share_l3', 'p_db_ew4', 'p_db_ew10',
                 'p_attempts_ew4', 'p_attempts_ew10', 'p_r_comp_car', 'p_r_comp_ew10', 'p_r_int_rate_car',
                 'p_r_int_rate_ew10', 'p_r_ptd_rate_car', 'p_r_ptd_rate_ew10', 'p_r_epa_db_car', 'p_r_epa_db_ew10',
                 'p_r_cpoe_car', 'p_r_sack_rate_car', 'dc_is_qb1', 'dc_qb_change', 'dc_qb1_gp', 'tm_is_qb_lead',
                 'tm_qb_lead_absent', 'tm_vac_tgt', 'tm_top3_tgt_absent', 't_db_ew8', 't_plays_ew8', 't_r_pass_rate_ew8',
                 't_r_neu_pass_rate_ew8', 't_r_proe_ew8', 't_points_ew8', 'd_db_ew8', 'd_plays_ew8', 'd_r_epa_db_ew8',
                 'd_r_sack_rate_ew8', 'd_points_rel', 'd_pass_yds_rel', f'oa_{st}_rel', f'oa_{st}_ew8', 'od_db_out',
                 'od_front_out']
    want = list(dict.fromkeys(stat_w + extra + common))
    return [c for c in want if c in cols], [c for c in want if c not in cols]


def is_count_like(c):
    if c.startswith('p_r_') or 'share' in c or c.startswith(('t_r_', 'd_r_', 'g_', 'inj_')) or c.endswith(('_rel', '_trend')):
        return False
    if c.startswith(('p_', 't_', 'd_', 'oa_')) and c.endswith(COUNT_WIN):
        return not c.startswith(('p_off_pct', 'p_qb_epa', 'p_passing_epa', 'p_cpoe_sum'))
    return c in ('x_gp_car', 'x_gp_szn', 'x_team_games_missed', 'x_draft_number', 'x_years_exp', 'dc_rank', 'dc_depth',
                 'dc_qb1_gp', 'tm_n_absent_grp', 'tm_ol_out', 'od_db_out', 'od_front_out')


class GLMPrep:
    def __init__(self, Xtr, cols):
        self.cols = cols
        Z = self._tx(Xtr)
        self.med = np.nanmedian(Z, axis=0)
        self.med = np.where(np.isnan(self.med), 0.0, self.med)
        self.miss = [j for j in range(Z.shape[1]) if np.isnan(Z[:, j]).mean() > 0.005]
        A = self._fill(Z)
        self.mu = A.mean(0); self.sd = A.std(0); self.sd[self.sd < 1e-9] = 1.0

    def _tx(self, X):
        Z = X.astype(float).copy()
        for j, c in enumerate(self.cols):
            if is_count_like(c): Z[:, j] = np.log1p(np.maximum(Z[:, j], 0))
        return Z

    def _fill(self, Z):
        M = np.isnan(Z)
        A = np.where(M, self.med[None, :], Z)
        rk = None
        if 'dc_rank' in self.cols:
            rk = np.expm1(A[:, self.cols.index('dc_rank')])
            ex = np.column_stack([(np.abs(rk - v) < 1e-6).astype(float) for v in (1, 2, 3)])
        else:
            ex = np.zeros((len(A), 0))
        return np.column_stack([A, M[:, self.miss].astype(float), ex])

    def transform(self, X):
        A = self._fill(self._tx(X))
        return np.clip((A - self.mu) / self.sd, -6, 6)


# ---------------------------------------------------------------- scoring
def calib_slope(p, o):
    """logistic regression of o on [1, logit p] by Newton; returns (intercept, slope)."""
    z = np.log(p / (1 - p)); X = np.column_stack([np.ones_like(z), z]); b = np.array([0.0, 1.0])
    for _ in range(50):
        eta = np.clip(X @ b, -30, 30); q = 1 / (1 + np.exp(-eta))
        W = q * (1 - q) + 1e-9
        step = np.linalg.solve(X.T @ (X * W[:, None]) + 1e-9 * np.eye(2), X.T @ (o - q))
        b += step
        if np.max(np.abs(step)) < 1e-9: break
    if not np.all(np.isfinite(b)) or abs(b[1]) > 20:   # separation on a small subset: no slope to report
        return None, None
    return float(b[0]), float(b[1])


def line_metrics(p, o, base=None):
    p = np.clip(p, 0.001, 0.999); o = o.astype(float)
    ll = -(o * np.log(p) + (1 - o) * np.log(1 - p))
    res = {'n': int(len(p)), 'log_loss': float(ll.mean()), 'brier': float(np.mean((p - o) ** 2)),
           'mean_p': float(p.mean()), 'hit_rate': float(o.mean())}
    if len(p) >= 50:
        a, b = calib_slope(p, o)
        res['calib_intercept'], res['calib_slope'] = a, b
        dec = np.minimum((pd.Series(p).rank(method='first').values - 1) * 10 // len(p), 9).astype(int)
        rel = []
        out_spread = 0.0
        for k in range(10):
            m = dec == k
            if m.sum() == 0: continue
            rel.append([round(float(p[m].mean()), 4), round(float(o[m].mean()), 4), int(m.sum())])
            out_spread += m.sum() * abs(o[m].mean() - 0.5)
        res['reliability_deciles'] = rel
        res['spread_pred'] = float(np.mean(np.abs(p - 0.5)))       # how far p sits from 0.5
        res['spread_outcome'] = float(out_spread / len(p))         # how far the hit rates by decile of p sit
        res['ece'] = float(sum(r[2] * abs(r[0] - r[1]) for r in rel) / len(p))
    if base is not None:
        bb = np.clip(base, 0.001, 0.999)
        res['log_loss_base_rate'] = float(np.mean(-(o * np.log(bb) + (1 - o) * np.log(1 - bb))))
    return res, ll


def dist_metrics(F, y, v):
    n, K1 = F.shape
    yi = np.minimum(y.astype(int), K1 - 1)
    ind = (np.arange(K1)[None, :] >= y[:, None]).astype(float)
    crps = ((F - ind) ** 2).sum(1)
    ar = np.arange(n)
    Fy = F[ar, yi]; Fy1 = np.where(yi > 0, F[ar, np.maximum(yi - 1, 0)], 0.0)
    py = np.clip(Fy - Fy1, 1e-6, 1.0)
    nll = -np.log(py)
    pit = Fy1 + v * (Fy - Fy1)
    pmf = np.diff(np.concatenate([np.zeros((n, 1)), F], axis=1), axis=1)
    ks = np.arange(K1)
    m = (pmf * ks).sum(1); sd = np.sqrt(np.maximum((pmf * ks ** 2).sum(1) - m ** 2, 0))
    return crps, nll, pit, m, sd


def summarize_dist(crps, nll, pit, m, sd, y):
    h = np.histogram(pit, bins=10, range=(0, 1))[0]
    return {'n': int(len(y)), 'crps': float(crps.mean()), 'log_score': float(nll.mean()),
            'pit_hist': [round(float(x) / len(y), 4) for x in h],
            'cov50': float(np.mean((pit >= 0.25) & (pit <= 0.75))), 'cov80': float(np.mean((pit >= 0.1) & (pit <= 0.9))),
            'mean_pred': float(m.mean()), 'mean_y': float(y.mean()), 'bias': float((y - m).mean()),
            'mean_pred_sd': float(sd.mean()), 'rmse_mean': float(np.sqrt(np.mean((y - m) ** 2)))}


def boot_diff(a, b, games, B=B_BOOT, seed=11):
    """mean(a - b) with a 90% interval from resampling whole games (Poisson weights)."""
    d = a - b
    codes, inv = np.unique(games, return_inverse=True)
    s = np.bincount(inv, weights=d); c = np.bincount(inv).astype(float)
    rng = np.random.default_rng(seed)
    W = rng.poisson(1.0, size=(B, len(codes))).astype(float)
    bs = (W @ s) / np.maximum(W @ c, 1)
    return {'diff': float(d.mean()), 'lo90': float(np.quantile(bs, 0.05)), 'hi90': float(np.quantile(bs, 0.95)),
            'se': float(bs.std())}


# ---------------------------------------------------------------- the walk-forward
def gbm_poisson(lgb, Xtr, ytr, Xva, yva, Xfull, yfull):
    p = dict(GBM_BASE, objective='poisson', metric='poisson')
    dtr = lgb.Dataset(Xtr, ytr, free_raw_data=False); dva = lgb.Dataset(Xva, yva, reference=dtr)
    m = lgb.train(p, dtr, num_boost_round=3000, valid_sets=[dva], callbacks=[lgb.early_stopping(100, verbose=False)])
    it = max(int(m.best_iteration or 100), 20)
    va_pred = m.predict(Xva, num_iteration=it)
    mf = lgb.train(p, lgb.Dataset(Xfull, yfull), num_boost_round=int(round(it * 1.1)))
    return mf, it, va_pred, m


def gbm_multiclass(lgb, Xtr, ytr, Xva, yva, Xfull, yfull, cap):
    p = dict(GBM_BASE, objective='multiclass', num_class=cap + 1, metric='multi_logloss')
    c = lambda y: np.minimum(y, cap).astype(int)
    dtr = lgb.Dataset(Xtr, c(ytr), free_raw_data=False); dva = lgb.Dataset(Xva, c(yva), reference=dtr)
    m = lgb.train(p, dtr, num_boost_round=2000, valid_sets=[dva], callbacks=[lgb.early_stopping(50, verbose=False)])
    it = max(int(m.best_iteration or 50), 10)
    mf = lgb.train(p, lgb.Dataset(Xfull, c(yfull)), num_boost_round=int(round(it * 1.1)))
    return mf, it


def mc_cdf(P, K):
    F = np.cumsum(P, axis=1)
    if F.shape[1] < K + 1:
        F = np.concatenate([F, np.ones((len(F), K + 1 - F.shape[1]))], axis=1)
    F[:, P.shape[1] - 1:] = 1.0
    return np.minimum(F[:, :K + 1], 1.0)


def run(args):
    import lightgbm as lgb
    t0 = time.time()
    R = derive(load_table(args.data))
    log('table', R.shape, 'seasons', int(R.season.min()), int(R.season.max()))
    feat_all = [c for c in R.columns if c.startswith(FEAT_PREFIX) and pd.api.types.is_numeric_dtype(R[c])]
    cur = Current(R)
    log('current recipe frame', cur.check)
    targets = TARGETS if not args.targets else [tuple(t.split(':')) for t in args.targets.split(',')]
    seasons = TEST_SEASONS if not args.seasons else [int(s) for s in args.seasons.split(',')]
    rng = np.random.default_rng(2025)
    R['_v'] = rng.random(len(R))                     # one randomisation for the PIT, shared by every model
    out = {'meta': {'script': 'props/research/propmodel/model_counts.py', 'test_seasons': seasons,
                    'train_from': {'new': FIRST_NEW, 'current_recipe': FIRST_CUR}, 'holdout_from': HOLDOUT_FROM,
                    'gbm_params': GBM_BASE, 'glm_alpha_grid': GLM_ALPHAS, 'kmax': KMAX,
                    'cap': {f'{g}:{s}': v for (g, s), v in CAP.items()}, 'n_features_gbm': len(feat_all),
                    'current_frame_check': cur.check, 'bootstrap': f'{B_BOOT} resamples of whole games, 90% interval'},
           'targets': {}}
    preds_all = []
    for (g, st) in targets:
        log('=====', g, st)
        rows_out, fits = [], {}
        for s in seasons:
            tr = R[(R.grp == g) & (R.season >= FIRST_NEW) & (R.season <= s - 1)]
            itr = tr[tr.season <= s - 2]; iva = tr[tr.season == s - 1]
            te = R[(R.grp == g) & (R.season == s)].copy()
            y = te['y_' + st].values.astype(float); K = KMAX[st]
            res = {}
            ts = time.time()
            # -- CURRENT (walk-forward refit) and SHIPPED (2025 only)
            M = cur.fit(g, st, range(FIRST_CUR, s))
            trow = te[['pid', 'game_id', 'team', 'grp']].rename(columns={'pid': 'player_id'}).reset_index(drop=True)
            res['CURRENT'], mu_c = cur.predict_cdf(M, trow, g, st)
            fit_info = {'current_coef': M['coef'], 'current_edges': M['dist']['edges']}
            if s == 2025:
                Ms = cur.shipped(g, st)
                res['SHIPPED'], mu_s = cur.predict_cdf(Ms, trow, g, st)
                fit_info['refit_vs_shipped_rms_mu'] = float(np.sqrt(np.mean((mu_c - mu_s) ** 2)))
            log('  current', f'{time.time() - ts:.0f}s'); ts = time.time()
            # -- REF_NAIVE
            def naive_mu(x):
                m = x['p_' + st + '_ew10'].values.astype(float)
                m = np.where(np.isnan(m), x['p_' + st + '_car'].values, m)
                return np.where(np.isnan(m), float(itr['y_' + st].mean()), np.maximum(m, 0.02))
            dn = fit_disp(iva['y_' + st].values, naive_mu(iva))
            res['REF_NAIVE'] = nb_cdf(naive_mu(te), dn, K)
            fit_info['naive_disp'] = dn
            # -- GLM_NB
            gcols, gmiss = glm_features(g, st, set(R.columns))
            prep_i = GLMPrep(itr[gcols].values, gcols)
            from sklearn.linear_model import PoissonRegressor
            best = None
            for a in GLM_ALPHAS:
                pr = PoissonRegressor(alpha=a, max_iter=300, solver='newton-cholesky').fit(prep_i.transform(itr[gcols].values), itr['y_' + st].values)
                mv = np.maximum(pr.predict(prep_i.transform(iva[gcols].values)), 1e-3)
                yv = iva['y_' + st].values
                dev = float(np.mean(2 * (special.xlogy(yv, yv / mv) - (yv - mv))))
                if best is None or dev < best[0]: best = (dev, a, mv)
            dg = fit_disp(iva['y_' + st].values, best[2])
            prep = GLMPrep(tr[gcols].values, gcols)
            pr = PoissonRegressor(alpha=best[1], max_iter=300, solver='newton-cholesky').fit(prep.transform(tr[gcols].values), tr['y_' + st].values)
            mu_g = np.maximum(pr.predict(prep.transform(te[gcols].values)), 1e-3)
            res['GLM_NB'] = nb_cdf(mu_g, dg, K)
            fit_info.update({'glm_alpha': best[1], 'glm_disp': dg, 'glm_n_features': len(gcols), 'glm_missing_names': gmiss})
            log('  naive+glm', f'{time.time() - ts:.0f}s'); ts = time.time()
            # -- GBM_NB
            Xi, Xv, Xf, Xt = (z[feat_all].values.astype(np.float32) for z in (itr, iva, tr, te))
            mf, it, va_pred, m_in = gbm_poisson(lgb, Xi, itr['y_' + st].values, Xv, iva['y_' + st].values, Xf, tr['y_' + st].values)
            dgb = fit_disp(iva['y_' + st].values, va_pred)
            mu_b = np.maximum(mf.predict(Xt), 1e-3)
            res['GBM_NB'] = nb_cdf(mu_b, dgb, K)
            imp = pd.Series(mf.feature_importance('gain'), index=feat_all).sort_values(ascending=False)
            fit_info.update({'gbm_rounds_inner': it, 'gbm_disp': dgb,
                             'gbm_top_features': [[k, round(float(v / imp.sum()), 4)] for k, v in imp.head(15).items()]})
            log('  gbm_nb rounds', it, f'{time.time() - ts:.0f}s'); ts = time.time()
            # -- GBM_MC
            if not args.no_mc:
                cap = CAP[(g, st)]
                # the multiclass model reads the MC_FEATURES features the inner Poisson model (fitted without
                # season s-1 or s) gained most from: a choice made on the inner training seasons alone
                gi = m_in.feature_importance('gain')
                sel = np.argsort(-gi)[:MC_FEATURES]
                mc, itc = gbm_multiclass(lgb, Xi[:, sel], itr['y_' + st].values, Xv[:, sel], iva['y_' + st].values,
                                         Xf[:, sel], tr['y_' + st].values, cap)
                res['GBM_MC'] = mc_cdf(mc.predict(Xt[:, sel]), K)
                fit_info.update({'mc_rounds_inner': itc, 'mc_cap': cap, 'test_rows_above_cap': int((y > cap).sum())})
            log('  gbm_mc', f'{time.time() - ts:.0f}s')
            fits[s] = fit_info
            # collect per-row
            base = pd.DataFrame({'season': s, 'week': te.week.values, 'game_id': te.game_id.values, 'pid': te.pid.values,
                                 'name': te.name.values, 'grp': g, 'stat': st, 'y': y, 'zero_row': te.zero_row.values,
                                 'starter': te.starter.values, 'rookie': te.rookie.values, 'thin': te.thin.values,
                                 'promoted': te.promoted.values, 'rank_rose': te.rank_rose.values,
                                 'dc_rank': te.dc_rank.values, 'L_med': te['L_med_' + st].values,
                                 'L_m5': te['L_m5_' + st].values})
            for k in ['dc_qb_change', 'tm_qb_lead_absent', 'tm_vac_car_grp', 'tm_vac_tgt_grp']:
                base[k] = te[k].values
            v = te._v.values
            for name, F in res.items():
                crps, nll, pit, m, sd = dist_metrics(F, y, v)
                base[f'{name}__crps'] = crps; base[f'{name}__nll'] = nll; base[f'{name}__pit'] = pit
                base[f'{name}__mean'] = m; base[f'{name}__sd'] = sd
                for lt in ['L_med', 'L_m5']:
                    L = base[lt].values; ok = ~np.isnan(L)
                    kk = np.clip(np.floor(np.nan_to_num(L)).astype(int), 0, K)
                    base[f'{name}__p_{lt}'] = np.where(ok, 1 - F[np.arange(len(F)), kk], np.nan)
                for L in FIXED_LINES.get(st, []):
                    base[f'{name}__p_fix{L}'] = 1 - F[:, int(np.floor(L))]
            # base rates of each line type in the training seasons (an as-of no-skill reference)
            for lt in ['L_med', 'L_m5']:
                Ltr = tr[lt + '_' + st].values; ok = ~np.isnan(Ltr)
                base[f'base__{lt}'] = float(np.mean(tr['y_' + st].values[ok] > Ltr[ok]))
            for L in FIXED_LINES.get(st, []):
                base[f'base__fix{L}'] = float(np.mean(tr['y_' + st].values > L))
            rows_out.append(base)
            log(g, st, s, 'n', len(te), {k: round(float(dist_metrics(F, y, v)[0].mean()), 4) for k, F in res.items()},
                f'{time.time() - t0:.0f}s')
        P = pd.concat(rows_out, ignore_index=True)
        preds_all.append(P)
        out['targets'][f'{g}:{st}'] = summarize_target(P, g, st, fits)
        dump(out, args.out)
    PP = pd.concat(preds_all, ignore_index=True)
    out['pooled'] = summarize_pooled(PP)
    out['meta']['runtime_s'] = round(time.time() - t0)
    dump(out, args.out)
    PP.to_parquet(os.path.join(args.data, 'counts_walkforward_preds.parquet'))
    log('wrote', args.out)


def models_in(P):
    return [m for m in CANDS + REFS if f'{m}__crps' in P.columns]


def line_sets(P, st):
    L = [('trail_median', 'L_med'), ('trail_mean5', 'L_m5')]
    L += [(f'fixed_{x}', f'fix{x}') for x in FIXED_LINES.get(st, [])]
    return L


def block(P, mods, st, mask, with_rel=True):
    o = {}
    y = P.y.values
    for m in mods:
        ok = mask & P[f'{m}__crps'].notna().values
        if ok.sum() == 0: continue
        r = summarize_dist(P[f'{m}__crps'].values[ok], P[f'{m}__nll'].values[ok], P[f'{m}__pit'].values[ok],
                           P[f'{m}__mean'].values[ok], P[f'{m}__sd'].values[ok], y[ok])
        r['lines'] = {}
        for lname, col in line_sets(P, st):
            pc = f'{m}__p_{col}'
            if pc not in P: continue
            okl = ok & P[pc].notna().values
            if okl.sum() < 30: continue
            Lv = P['L_med'].values if col == 'L_med' else (P['L_m5'].values if col == 'L_m5' else np.full(len(P), float(col[3:])))
            res, _ = line_metrics(P[pc].values[okl], (y[okl] > Lv[okl]), P[f'base__{col}'].values[okl])
            if not with_rel: res.pop('reliability_deciles', None)
            r['lines'][lname] = res
        o[m] = r
    return o


def compare(P, mods, st, mask, ref='CURRENT'):
    """paired differences against ref (negative = better than ref), on rows both score."""
    o = {}
    games = P.game_id.values
    y = P.y.values
    for m in mods:
        if m == ref: continue
        ok = mask & P[f'{m}__crps'].notna().values & P[f'{ref}__crps'].notna().values
        if ok.sum() < 30: continue
        c = {'crps': boot_diff(P[f'{m}__crps'].values[ok], P[f'{ref}__crps'].values[ok], games[ok])}
        c['crps']['rel_skill'] = float(1 - P[f'{m}__crps'].values[ok].mean() / P[f'{ref}__crps'].values[ok].mean())
        for lname, col in line_sets(P, st):
            a, b = f'{m}__p_{col}', f'{ref}__p_{col}'
            if a not in P or b not in P: continue
            okl = ok & P[a].notna().values & P[b].notna().values
            if okl.sum() < 30: continue
            Lv = P['L_med'].values if col == 'L_med' else (P['L_m5'].values if col == 'L_m5' else np.full(len(P), float(col[3:])))
            oo = (y[okl] > Lv[okl])
            _, la = line_metrics(P[a].values[okl], oo); _, lb = line_metrics(P[b].values[okl], oo)
            c['ll_' + lname] = boot_diff(la, lb, games[okl])
        o[m] = c
    return o


def summarize_target(P, g, st, fits):
    mods_all = models_in(P)
    mods = [m for m in mods_all if m != 'SHIPPED']
    S = subsets(P.assign(dc_qb_change=P.dc_qb_change, tm_qb_lead_absent=P.tm_qb_lead_absent), g, st)
    allm = np.ones(len(P), bool)
    t = {'n_rows': int(len(P)), 'zero_rows': int(P.zero_row.sum()),
         'pooled_2021_2025': block(P, mods, st, allm),
         'vs_current': compare(P, mods, st, allm),
         'by_season': {}, 'breakdowns': {}, 'breakdowns_vs_current': {}, 'fits': {str(k): v for k, v in fits.items()}}
    for s in sorted(P.season.unique()):
        ms = P.season.values == s
        t['by_season'][str(s)] = {m: {'crps': float(P[f'{m}__crps'].values[ms].mean())} for m in mods if P[f'{m}__crps'].values[ms].size and not np.isnan(P[f'{m}__crps'].values[ms]).all()}
        for m in mods:
            pc = f'{m}__p_L_med'
            ok = ms & P[pc].notna().values
            if ok.sum() >= 30:
                res, _ = line_metrics(P[pc].values[ok], P.y.values[ok] > P.L_med.values[ok])
                t['by_season'][str(s)].setdefault(m, {})['ll_trail_median'] = res['log_loss']
    if 'SHIPPED' in mods_all:
        m25 = (P.season.values == 2025)
        t['shipped_2025'] = {'block': block(P, ['SHIPPED'] + mods, st, m25, with_rel=False),
                             'vs_shipped': compare(P, ['SHIPPED'] + mods, st, m25, ref='SHIPPED')}
    for k, mk in S.items():
        if k == 'all' or mk.sum() < 30: continue
        t['breakdowns'][k] = block(P, mods, st, mk, with_rel=False)
        t['breakdowns_vs_current'][k] = compare(P, mods, st, mk)
    return t


def summarize_pooled(PP):
    """All nine group-stat pairs together: the line log loss pooled over rows, and the CRPS skill per pair."""
    mods = [m for m in CANDS + ['REF_NAIVE'] if f'{m}__crps' in PP.columns]
    o = {'line_log_loss': {}, 'line_vs_current': {}, 'crps_rel_skill_vs_current': {}}
    games = PP.game_id.values
    for lname, col in [('trail_median', 'L_med'), ('trail_mean5', 'L_m5')]:
        Lv = PP[col].values
        lin = np.zeros(len(PP), bool)
        for (g, st), ix in PP.groupby(['grp', 'stat']).groups.items():
            ii = PP.index.get_indexer(ix)
            lin[ii] = lineable(PP.iloc[ii], g, st)
        for sub, sm in [('all', np.ones(len(PP), bool)), ('lineable', lin), ('starter', PP.starter.values == 1),
                        ('backup', PP.starter.values == 0), ('promoted_to_starter', PP.promoted.values == 1),
                        ('rookie', PP.rookie.values == 1)]:
            ok = sm & ~np.isnan(Lv)
            for m in mods: ok &= PP[f'{m}__p_{col}'].notna().values
            oo = PP.y.values[ok] > Lv[ok]
            key = f'{lname}|{sub}'
            o['line_log_loss'][key] = {'n': int(ok.sum())}
            lls = {}
            for m in mods:
                res, ll = line_metrics(PP[f'{m}__p_{col}'].values[ok], oo)
                lls[m] = ll
                o['line_log_loss'][key][m] = {k: res.get(k) for k in ('log_loss', 'brier', 'calib_slope', 'calib_intercept',
                                                                      'spread_pred', 'spread_outcome', 'ece', 'mean_p', 'hit_rate')}
            o['line_vs_current'][key] = {m: boot_diff(lls[m], lls['CURRENT'], games[ok]) for m in mods if m != 'CURRENT'}
    for (g, st), P in PP.groupby(['grp', 'stat']):
        o['crps_rel_skill_vs_current'][f'{g}:{st}'] = {m: float(1 - P[f'{m}__crps'].mean() / P['CURRENT__crps'].mean())
                                                         for m in mods if m != 'CURRENT'}
    return o


def report(path):
    """Markdown tables from the results JSON."""
    J = json.load(open(path))
    f3 = lambda v: '' if v is None else f'{v:.3f}'
    f4 = lambda v: '' if v is None else f'{v:.4f}'
    ci = lambda c: f"{c['diff']:+.4f} [{c['lo90']:+.4f}, {c['hi90']:+.4f}]"
    L = ['## Distribution: CRPS (lower is better) and calibration, 2021-2025 pooled', '',
         '| target | n | model | CRPS | vs CURRENT (90% CI) | skill | log score | cov50 | cov80 | bias | pred sd |',
         '|---|---|---|---|---|---|---|---|---|---|---|']
    for k, T in J['targets'].items():
        for m, r in T['pooled_2021_2025'].items():
            c = T['vs_current'].get(m, {}).get('crps')
            L.append(f"| {k} | {r['n']} | {m} | {f4(r['crps'])} | {ci(c) if c else ''} | {('%+.1f%%' % (100 * c['rel_skill'])) if c else ''} | "
                     f"{f3(r['log_score'])} | {f3(r['cov50'])} | {f3(r['cov80'])} | {r['bias']:+.3f} | {f3(r['mean_pred_sd'])} |")
    L += ['', '## P(over L): log loss, calibration slope, spread of p vs spread of outcomes, 2021-2025 pooled', '',
          '| target | line | n | model | log loss | vs CURRENT (90% CI) | base rate LL | slope | |p-0.5| | |hit-0.5| by decile | ECE |',
          '|---|---|---|---|---|---|---|---|---|---|---|']
    for k, T in J['targets'].items():
        lines = list(next(iter(T['pooled_2021_2025'].values()))['lines'].keys())
        for ln in lines:
            for m, r in T['pooled_2021_2025'].items():
                x = r['lines'].get(ln)
                if not x: continue
                c = T['vs_current'].get(m, {}).get('ll_' + ln)
                L.append(f"| {k} | {ln} | {x['n']} | {m} | {f4(x['log_loss'])} | {ci(c) if c else ''} | {f4(x.get('log_loss_base_rate'))} | "
                         f"{f3(x.get('calib_slope'))} | {f3(x.get('spread_pred'))} | {f3(x.get('spread_outcome'))} | {f3(x.get('ece'))} |")
    if 'pooled' in J:
        L += ['', '## All nine targets pooled: P(over L) at the stand-in lines', '',
              '| line, rows | n | model | log loss | vs CURRENT (90% CI) | slope | |p-0.5| | |hit-0.5| by decile |', '|---|---|---|---|---|---|---|---|']
        for key, r in J['pooled']['line_log_loss'].items():
            for m, x in r.items():
                if m == 'n': continue
                c = J['pooled']['line_vs_current'][key].get(m)
                L.append(f"| {key} | {r['n']} | {m} | {f4(x['log_loss'])} | {ci(c) if c else ''} | {f3(x['calib_slope'])} | {f3(x['spread_pred'])} | {f3(x['spread_outcome'])} |")
        L += ['', '## CRPS skill against CURRENT, by target', '', '| target | ' + ' | '.join(next(iter(J['pooled']['crps_rel_skill_vs_current'].values())).keys()) + ' |',
              '|---|' + '---|' * len(next(iter(J['pooled']['crps_rel_skill_vs_current'].values())))]
        for k, r in J['pooled']['crps_rel_skill_vs_current'].items():
            L.append(f'| {k} | ' + ' | '.join('%+.1f%%' % (100 * v) for v in r.values()) + ' |')
    L += ['', '## Breakdowns: CRPS and trailing-median log loss against CURRENT (diff, 90% CI)', '',
          '| target | subset | n | model | CRPS | CRPS vs CURRENT | LL med | LL med vs CURRENT | slope med |', '|---|---|---|---|---|---|---|---|---|']
    for k, T in J['targets'].items():
        for sub, B in T['breakdowns'].items():
            for m, r in B.items():
                c = T['breakdowns_vs_current'][sub].get(m, {})
                x = r['lines'].get('trail_median', {})
                L.append(f"| {k} | {sub} | {r['n']} | {m} | {f4(r['crps'])} | {ci(c['crps']) if 'crps' in c else ''} | {f4(x.get('log_loss'))} | "
                         f"{ci(c['ll_trail_median']) if 'll_trail_median' in c else ''} | {f3(x.get('calib_slope'))} |")
    L += ['', '## 2025 only: the shipped model against the rest', '', '| target | model | CRPS | vs SHIPPED | LL med |', '|---|---|---|---|---|']
    for k, T in J['targets'].items():
        if 'shipped_2025' not in T: continue
        for m, r in T['shipped_2025']['block'].items():
            c = T['shipped_2025']['vs_shipped'].get(m, {}).get('crps')
            L.append(f"| {k} | {m} | {f4(r['crps'])} | {ci(c) if c else ''} | {f4(r['lines'].get('trail_median', {}).get('log_loss'))} |")
    print('\n'.join(L))


if __name__ == '__main__':
    if '--resummarize' in sys.argv:
        # rebuild the summaries from the saved per-row predictions, keeping the run's meta and fits
        data = sys.argv[sys.argv.index('--resummarize') + 1]
        outp = os.path.join(HERE, 'results', 'counts_walkforward.json')
        J = json.load(open(outp))
        PP = pd.read_parquet(os.path.join(data, 'counts_walkforward_preds.parquet'))
        for (g, st), P in PP.groupby(['grp', 'stat'], sort=False):
            k = f'{g}:{st}'
            J['targets'][k] = summarize_target(P.reset_index(drop=True), g, st,
                                               {int(a): b for a, b in J['targets'][k]['fits'].items()})
        J['pooled'] = summarize_pooled(PP.reset_index(drop=True))
        dump(J, outp); print('resummarized', outp); sys.exit(0)
    if '--report' in sys.argv:
        report(sys.argv[sys.argv.index('--report') + 1]); sys.exit(0)
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'))
    ap.add_argument('--out', default=os.path.join(HERE, 'results', 'counts_walkforward.json'))
    ap.add_argument('--targets', default='')
    ap.add_argument('--seasons', default='')
    ap.add_argument('--no-mc', action='store_true')
    a = ap.parse_args()
    if not a.data: sys.exit('--data DIR (or PROPMODEL_DATA) is required')
    run(a)
