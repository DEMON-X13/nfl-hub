#!/usr/bin/env python3
"""Walk-forward test of the anytime touchdown's predictive distribution (rushing + receiving touchdowns, the
site's and DraftKings' rule: never a pass thrown), for quarterbacks, backs, receivers and tight ends.

This is a modelling step of the free-data props model (README.md): a small family of candidates, each giving a
whole distribution of a player's rushing + receiving touchdowns in a game (and so his chance of one or more),
scored walk-forward on 2021-2025 against the site's current model. Nothing here is fitted on, or reads, 2026:
the feature table stops at 2025, the script refuses a row of 2026 or later, and the site's own table
(props/raw/feat.pkl) is cut below 2026 too. It reads no payload, no price and no line.

Walk-forward, for each test season s in 2021..2025, one fit per position group:
  - the new candidates train on 2013..s-1 (the feature table starts in 2013); the site's recipe on 2019..s-1
    (its own table starts in 2019), so at s = 2025 the recipe's seasons are exactly the shipped model's;
  - one inner split inside the training seasons, fit on 2013..s-2 and validate on s-1, chooses the GBMs'
    number of rounds (early stopping; refitted on 2013..s-1 with 1.1 times as many) and the GLM's L2 penalty
    from {1e-4, 1e-3, 1e-2}. Every other setting is fixed in this file before any run. Season s chooses
    nothing, and no candidate is recalibrated after the fit (decided before the first run).

The candidates (four, on purpose):
  CURRENT   the site's model, refitted walk-forward by its own recipe (recovered by props/research/qb_td.py
            from the shipped coefficients): a logistic regression on featVec's 15 inputs (part2.js) with an
            L2 penalty of 3 on all but the intercept, on rows with 2+ earlier games; for quarterbacks only on
            each club's pregame starter (most attempts over his recent games, e5_attempts), as qb_td.py fitted
            it. Then project()'s touch cap: p = min(p, 1 - exp(-1.5 * (mc * rush + mr * rec))), mc and mr the
            recipe's own ridge projections of carries (QB, RB) and receptions (RB, WR, TE), refitted
            walk-forward, and rush/rec the group's touchdowns per carry and per reception over the training
            seasons (tdrate.json's definition); tdmult 1.5 (props/README.md). A zero row (he played and
            recorded nothing; feat.pkl has none) gets the recipe's own windows over his stat-line games and his
            club's context in that game, as model_counts.py does.
  GLM_LOGIT a logistic regression (L2) on 126 curated as-of features: his touchdown form, red-zone,
            goal-line and end-zone usage and shares, snap share, carry and target shares, touchdowns per
            opportunity, depth rank, injuries, teammates out (vacated red-zone shares), team and opponent
            red-zone volume and scoring, the game's implied total and spread.
  GBM_BIN   LightGBM, binary objective on the anytime touchdown, every numeric feature (506).
  GBM_POIS  LightGBM, Poisson objective on the touchdown count, every numeric feature: P(1+) = 1 - exp(-lambda).
References (not candidates):
  SHIPPED   props/data/final_model.json and tdrate.json themselves, scored on 2025 only (2019-2024 fitted them).
  REF_RATE  the group's training-season rate, the same for everyone (no skill).
  REF_NAIVE his career rate, shrunk to the group's training rate by 4 games.

Every binary model's count distribution is the page's own (part2.js tdPlus): touchdowns Poisson with
lambda = -log(1 - p). GBM_POIS gives its Poisson directly.

Scored on the same rows for every model: every game a QB, RB, WR or TE played in his role in the test season,
zero rows included (DraftKings settles a player who played and did nothing as a loss; a zero row is kept in every
breakdown and never made one of its own, since it is defined by the outcome):
  - the count distribution (0..6 touchdowns): CRPS, log score, randomised PIT histogram and the 50% and 80%
    central-interval coverage it implies, mean against outcome;
  - P(touchdowns > L) at stand-in lines, since no book line exists before 2026: L = his trailing median of his
    last 6 role games (3+) rounded to the book's half-point step at or below it; L = his trailing 5-game mean
    rounded to the nearest half point (the diagnosis's model-free proxy); the plain anytime touchdown (0.5);
    and 2+ touchdowns (1.5). For each: log loss, Brier, a reliability table by decile, the calibration slope
    and intercept (logistic of the outcome on logit p: a slope under 1 is overconfident, over 1 too
    compressed), and two overconfidence checks: how far p sits from 0.5 against how far the deciles' hit rates
    do (the brief's), and, more telling for a 15% event, how far the deciles' mean p spread about the overall
    mean against how far their hit rates do (resolution claimed against resolution delivered);
  - breakdowns: book-like rows (QB1 for a quarterback; a back, receiver or tight end with a trailing median of
    1.5+ touches or a depth rank inside RB3/WR4/TE2), starters and backups (QB1, RB1-2, WR1-3, TE1 on the
    week's chart), rookies, thin history, promoted backups (into a starter slot since his previous game, same
    club), a depth rank that rose, a teammate's red-zone share vacated, a quarterback change;
  - differences against CURRENT with a bootstrap 90% interval that resamples whole games.

As-of: every feature of the new table is as of before kickoff (README.md); the game's closing spread and total
from games.csv stand in for the market's pre-game view. The recipe's feat.pkl normalises implied points and
team volumes on whole-season means, a small look-ahead that can only flatter the baseline.

  python3 -I model_td.py --data DIR [--groups QB,RB] [--seasons 2025]      # the walk-forward
  python3 -I model_td.py --resummarize DIR                                  # the JSON again from DIR's preds
  python3 -I model_td.py --report results/td_walkforward.json               # markdown tables

Writes results/td_walkforward.json beside this file and the per-row predictions to
DIR/td_walkforward_preds.parquet (outside the repo). Needs lightgbm, scikit-learn, scipy.
"""
import argparse, json, os, sys, time, warnings
import numpy as np, pandas as pd
from scipy import special, stats as sps

warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
HOLDOUT_FROM = 2026
TEST_SEASONS = [2021, 2022, 2023, 2024, 2025]
FIRST_NEW, FIRST_CUR = 2013, 2019
GROUPS = ['QB', 'RB', 'WR', 'TE']
KMAX = 6                                   # support 0..6 touchdowns (no test game reaches 6)
TDMULT = 1.5                               # payload's tdmult (props/README.md: "times tdmult, 1.5")
CUR_LAM_LOGIT, CUR_LAM_RIDGE, CUR_MIN_GP, CUR_KS = 3.0, 2.0, 2, 4.0
STARTER_SLOTS = {'QB': 1, 'RB': 2, 'WR': 3, 'TE': 1}
LINEABLE_RANK = {'QB': 1, 'RB': 3, 'WR': 4, 'TE': 2}
FEAT_PREFIX = ('p_', 't_', 'd_', 'oa_', 'dc_', 'inj_', 'tm_', 'od_', 'x_', 'g_')
GBM_BASE = dict(learning_rate=0.03, num_leaves=15, min_data_in_leaf=80, feature_fraction=0.5,
                bagging_fraction=0.8, bagging_freq=1, lambda_l2=10.0, max_bin=63, min_data_in_bin=5,
                verbose=-1, num_threads=int(os.environ.get('PM_THREADS', '2')), seed=7, deterministic=True,
                force_row_wise=True)
GLM_ALPHAS = [1e-4, 1e-3, 1e-2]
CANDS = ['CURRENT', 'GLM_LOGIT', 'GBM_BIN', 'GBM_POIS']
REFS = ['REF_RATE', 'REF_NAIVE', 'SHIPPED']
LINES = [('trail_median', 'L_med'), ('trail_mean5', 'L_m5'), ('any_td', 'fix0.5'), ('two_plus', 'fix1.5')]
B_BOOT = 1000


def rnd(o):
    if isinstance(o, (float, np.floating)): return round(float(o), 5) if np.isfinite(o) else None
    if isinstance(o, (np.integer,)): return int(o)
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
    d = d[(d.role_played == 1) & d.grp.isin(GROUPS)].copy()
    d = d.sort_values(['pid', 'tkey']).reset_index(drop=True)
    return d


def derive(d):
    """Per-row facts every model shares, all as of before the game: the stand-in lines (trailing windows over
    his earlier role games), the book-like flag and the breakdown flags (the week's depth chart)."""
    y = d.y_rush_rec_tds.astype(float)
    assert ((d.y_any_td == 1) == (y >= 1)).all(), 'y_any_td is not rushing + receiving TDs >= 1'
    gb = d.groupby('pid', sort=False)
    sh = gb['y_rush_rec_tds'].shift(1)
    med = sh.groupby(d.pid).rolling(6, min_periods=3).median().reset_index(level=0, drop=True)
    m5 = sh.groupby(d.pid).rolling(5, min_periods=3).mean().reset_index(level=0, drop=True)
    d['L_med'] = np.maximum(np.ceil(med) - 0.5, 0.5).where(med.notna()).reindex(d.index).values
    d['L_m5'] = (np.floor(m5) + 0.5).where(m5.notna()).reindex(d.index).values
    tch = (d.y_carries.fillna(0) + d.y_targets.fillna(0)).astype(float)
    tsh = tch.groupby(d.pid).shift(1)
    d['touch_med6'] = tsh.groupby(d.pid).rolling(6, min_periods=3).median().reset_index(level=0, drop=True).reindex(d.index).values
    d['prev_rank'] = gb['dc_rank'].shift(1)
    d['prev_team'] = gb['team'].shift(1)
    slot = d.grp.map(STARTER_SLOTS)
    d['starter'] = (d.dc_rank <= slot).astype(int)
    same = d.prev_team == d.team
    d['promoted'] = (same & (d.dc_rank <= slot) & (d.prev_rank > slot)).astype(int)
    d['rank_rose'] = (same & (d.dc_rank < d.prev_rank)).astype(int)
    d['rookie'] = (d.x_rookie == 1).astype(int)
    d['thin'] = (d.x_gp_car.fillna(0) < 4).astype(int)
    lr = d.grp.map(LINEABLE_RANK)
    d['lineable'] = np.where(d.grp == 'QB', d.starter == 1,
                             (d.touch_med6.fillna(0) >= 1.5) | (d.dc_rank <= lr)).astype(int)
    d['rz_out'] = ((d.tm_vac_rz_tgt.fillna(0) + d.tm_vac_rz_car.fillna(0)) >= 0.15).astype(int)
    d['qb_change'] = (((d.dc_qb_change.fillna(0) == 1) | (d.tm_qb_lead_absent.fillna(0) == 1))).astype(int)
    return d


# ---------------------------------------------------------------- the current model, its own recipe
VOLMAP = {'attempts': 't_pass_att', 'carries': 't_carries', 'receptions': 't_targets', 'any_td': 't_tds'}
DEFMAP = {'attempts': 'd_pass_att', 'carries': 'd_carries', 'receptions': 'd_pass_att', 'any_td': 'd_tds'}
TEAMFIX = {'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA'}
CTX = ['imp_z', 'home', 'sprd', 'abs_sprd']
CUR_STATS = ['any_td', 'carries', 'receptions', 'attempts']
CAP_FROM = {'QB': ('carries',), 'RB': ('carries', 'receptions'), 'WR': ('receptions',), 'TE': ('receptions',)}


def fitlog(X, y, lam):
    """Logistic regression with an L2 penalty lam on every coefficient but the intercept (Newton), as
    props/research/qb_td.py recovered fit4.py's method."""
    b = np.zeros(X.shape[1]); P = np.eye(X.shape[1]) * lam; P[0, 0] = 0
    for _ in range(100):
        p = 1 / (1 + np.exp(-X @ b))
        step = np.linalg.solve(X.T @ (X * (p * (1 - p))[:, None]) + P, X.T @ (y - p) - P @ b)
        b += step
        if np.abs(step).max() < 1e-12: break
    return b


class Current:
    """The site's recipe on its own table (props/raw/feat.pkl, 2019-2025, rows with a stat line only). A row that
    table lacks (a zero row) is given the features the page would hold for him that week: his windows over his
    earlier stat-line games and the game's context from his club's rows of the same game."""

    def __init__(self, R):
        f = pd.read_pickle(os.path.join(REPO, 'props', 'raw', 'feat.pkl'))
        f = f[f.season < HOLDOUT_FROM].copy()
        f['team_m'] = f.team.replace(TEAMFIX)
        self.FM = json.load(open(os.path.join(REPO, 'props', 'data', 'final_model.json')))
        self.TDR = json.load(open(os.path.join(REPO, 'props', 'data', 'tdrate.json')))
        r = R[R.season >= FIRST_CUR][['pid', 'game_id', 'season', 'week']].rename(columns={'pid': 'player_id'})
        m = r.merge(f[['player_id', 'game_id']].assign(_in=1), on=['player_id', 'game_id'], how='left')
        add = m[m._in.isna()][['player_id', 'game_id', 'season', 'week']]
        H = pd.concat([f[['player_id', 'game_id', 'season', 'week'] + CUR_STATS].assign(_src=1), add.assign(_src=0)],
                      ignore_index=True).sort_values(['player_id', 'season', 'week']).reset_index(drop=True)
        g = H.groupby('player_id', sort=False)
        for s in CUR_STATS:
            sh = g[s].shift(1)
            for span in (5, 3):
                e = sh.groupby(H.player_id, sort=False).ewm(span=span, adjust=True, ignore_na=True, min_periods=1).mean()
                H[f'e{span}_{s}'] = e.reset_index(level=0, drop=True).reindex(H.index).values
            cs = H[s].fillna(0).groupby(H.player_id, sort=False).cumsum()
            H['csum_' + s] = (cs - H[s].fillna(0)).values
        H['gp_prior'] = (H['_src'].groupby(H.player_id, sort=False).cumsum() - H['_src']).values
        ps = f.groupby(['player_id', 'season'])[CUR_STATS].agg(['mean', 'count'])
        ps.columns = [f'{a}_{b}' for a, b in ps.columns]
        ps = ps.reset_index(); ps['season'] += 1
        H = H.merge(ps, on=['player_id', 'season'], how='left')
        chk = H[H._src == 1].merge(f[['player_id', 'game_id'] + [f'e5_{s}' for s in CUR_STATS] + [f'e3_{s}' for s in CUR_STATS] + ['gp_prior']],
                                    on=['player_id', 'game_id'], suffixes=('', '_t'))
        self.check = {'rows': int(len(chk)),
                      'max_abs_e5_e3_diff': float(max(np.nanmax(np.abs(chk[f'e{k}_{s}'].fillna(0) - chk[f'e{k}_{s}_t'].fillna(0)))
                                                  for s in CUR_STATS for k in (5, 3))),
                      'max_abs_gp_prior_diff': float(np.max(np.abs(chk.gp_prior - chk.gp_prior_t))),
                      'rows_added_without_a_stat_line': int(len(add))}
        tcols = [c for c in f.columns if c.startswith('tez_')]
        dcols = [c for c in f.columns if c.startswith('dez_')]
        ocols = [c for c in f.columns if c.startswith('oaz_')]
        self.tg = f.groupby(['game_id', 'team_m'])[CTX + tcols + dcols].first().reset_index().rename(columns={'team_m': 'team'})
        self.og = f.groupby(['game_id', 'team_m', 'grp'])[ocols].first().reset_index().rename(columns={'team_m': 'team'})
        self.H, self.f = H, f

    def frame(self, rows):
        n0 = len(rows)
        x = rows.merge(self.H.drop(columns=['season', 'week']), on=['player_id', 'game_id'], how='left')
        x = x.merge(self.tg, on=['game_id', 'team'], how='left')
        x = x.merge(self.og, on=['game_id', 'team', 'grp'], how='left')
        assert len(x) == n0, 'a feature merge duplicated rows'
        return x

    @staticmethod
    def X(x, st, prior, ks=CUR_KS):
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

    def fit(self, g, seasons):
        t = self.f[(self.f.grp == g) & self.f.season.isin(seasons)].reset_index(drop=True)
        rows = t[['player_id', 'game_id', 'team_m', 'grp']].rename(columns={'team_m': 'team'})
        x = self.frame(rows)
        gp = x.gp_prior.fillna(0).values
        M = {'prior': {}, 'coef': {}}
        for st in ['any_td'] + list(CAP_FROM[g]):
            prior = float(t[st].mean()); M['prior'][st] = prior
            X = self.X(x, st, prior); y = t[st].values.astype(float)
            mk = gp >= CUR_MIN_GP
            if st == 'any_td':
                if g == 'QB':   # the pregame starter: most attempts over his recent games, 2+ earlier games
                    rk = x.e5_attempts.fillna(-1).groupby([t.game_id.values, t.team_m.values]).rank(ascending=False, method='first').values
                    mk = mk & (rk == 1)
                M['coef'][st] = fitlog(X[mk], y[mk], CUR_LAM_LOGIT).tolist()
                M['n_fit'] = int(mk.sum())
            else:
                P = np.eye(X.shape[1]) * CUR_LAM_RIDGE; P[0, 0] = 0
                M['coef'][st] = np.linalg.solve(X[mk].T @ X[mk] + P, X[mk].T @ y[mk]).tolist()
        M['tdrate'] = {'rush': float(t.rushing_tds.sum() / max(t.carries.sum(), 1)),
                       'rec': float(t.receiving_tds.sum() / max(t.receptions.sum(), 1))}
        return M

    def shipped(self, g):
        M = {'prior': {st: self.FM['prior'][g][st] for st in ['any_td'] + list(CAP_FROM[g])},
             'coef': {st: self.FM['model'][g][st]['coef'] for st in ['any_td'] + list(CAP_FROM[g])},
             'tdrate': self.TDR[g]}
        return M

    def predict(self, M, rows, g):
        x = self.frame(rows)
        z = self.X(x, 'any_td', M['prior']['any_td']) @ np.array(M['coef']['any_td'])
        p_raw = 1 / (1 + np.exp(-z))
        lam = np.zeros(len(x))
        if 'carries' in CAP_FROM[g]:
            lam += np.maximum(self.X(x, 'carries', M['prior']['carries']) @ np.array(M['coef']['carries']), 0) * M['tdrate']['rush']
        if 'receptions' in CAP_FROM[g]:
            lam += np.maximum(self.X(x, 'receptions', M['prior']['receptions']) @ np.array(M['coef']['receptions']), 0) * M['tdrate']['rec']
        cap = 1 - np.exp(-lam * TDMULT)
        p = np.minimum(p_raw, cap)
        return p, p_raw, float(np.mean(p < p_raw))


# ---------------------------------------------------------------- the GLM's curated features
GLM_FEATS = (
    [f'p_rush_rec_tds_{w}' for w in ('l1', 'l3', 'ew4', 'ew10', 'szn', 'prev', 'car')]
    + [f'p_any_td_{w}' for w in ('ew4', 'ew10', 'szn', 'prev', 'car')]
    + ['p_r_td_per_opp_ew10', 'p_r_td_per_opp_szn', 'p_r_td_per_opp_car']
    + [f'p_rz_car_share_{w}' for w in ('l3', 'ew4', 'ew10', 'szn', 'prev', 'car')]
    + [f'p_rz_tgt_share_{w}' for w in ('l3', 'ew4', 'ew10', 'szn', 'prev', 'car')]
    + ['p_rz_car_ew4', 'p_rz_car_ew10', 'p_rz_car_prev', 'p_rz_tgt_ew4', 'p_rz_tgt_ew10', 'p_rz_tgt_prev',
       'p_gl_car_ew4', 'p_gl_car_ew10', 'p_gl_car_szn', 'p_gl_car_prev', 'p_ez_tgt_ew4', 'p_ez_tgt_ew10',
       'p_ez_tgt_szn', 'p_ez_tgt_prev']
    + ['p_car_share_ew4', 'p_car_share_ew10', 'p_car_share_szn', 'p_car_share_prev', 'p_car_share_trend',
       'p_tgt_share_ew4', 'p_tgt_share_ew10', 'p_tgt_share_szn', 'p_tgt_share_prev', 'p_tgt_share_trend',
       'p_carries_ew4', 'p_carries_ew10', 'p_targets_ew4', 'p_targets_ew10', 'p_receptions_ew10',
       'p_rush_rec_yards_ew10', 'p_off_pct_l1', 'p_off_pct_ew4', 'p_off_pct_ew10', 'p_off_pct_szn',
       'p_off_pct_prev', 'p_off_pct_trend', 'p_est_routes_ew4']
    + ['p_scrambles_ew10', 'p_car_d_ew10', 'p_db_share_ew4', 'p_db_share_l1', 'dc_is_qb1', 'tm_is_qb_lead']
    + ['t_rz_plays_ew8', 't_points_ew8', 't_r_rz_share_ew8', 't_r_pass_rate_ew8', 't_plays_ew8', 't_r_epa_rush_ew8',
       't_r_epa_db_ew8', 'd_points_rel', 'd_rz_plays_ew8', 'd_r_rz_share_ew8', 'd_r_epa_rush_ew8', 'd_r_epa_db_ew8',
       'oa_rush_rec_tds_rel', 'oa_rush_rec_tds_ew8', 'oa_receiving_tds_rel', 'oa_receiving_tds_ew8']
    + ['g_implied', 'g_opp_implied', 'g_margin', 'g_total_line', 'g_win_prob', 'g_is_home', 'g_dome', 'g_wind', 'g_wet']
    + ['dc_rank', 'dc_depth', 'dc_listed', 'dc_team_chart', 'dc_fb', 'inj_questionable', 'inj_doubtful', 'inj_dnp',
       'inj_limited', 'inj_listed', 'tm_vac_rz_tgt', 'tm_vac_rz_car', 'tm_vac_tgt_grp', 'tm_vac_car_grp',
       'tm_n_absent_grp', 'tm_top3_tgt_absent', 'tm_qb_lead_absent', 'tm_ret_rz_tgt', 'tm_ret_rz_car', 'dc_qb_change']
    + ['x_gp_car', 'x_gp_szn', 'x_rookie', 'x_new_team', 'x_years_exp', 'x_age', 'x_draft_number', 'x_undrafted',
       'x_team_games_missed', 'x_height', 'x_weight'])
COUNT_WIN = ('_l1', '_l3', '_ew4', '_ew10', '_szn', '_prev', '_car', '_ew8')


def is_count_like(c):
    if c.startswith('p_r_') or 'share' in c or c.startswith(('t_r_', 'd_r_', 'g_', 'inj_')) or c.endswith(('_rel', '_trend')):
        return False
    if c.startswith(('p_', 't_', 'd_', 'oa_')) and c.endswith(COUNT_WIN):
        return not c.startswith('p_off_pct')
    return c in ('x_gp_car', 'x_gp_szn', 'x_team_games_missed', 'x_draft_number', 'x_years_exp', 'dc_rank', 'dc_depth',
                 'tm_n_absent_grp', 'tm_top3_tgt_absent')


class GLMPrep:
    """log1p of counts, the training medians for a missing value with a missing indicator (a column missing on
    more than 0.5% of training rows), exact indicators for depth rank 1-3, standardised and clipped."""

    def __init__(self, Xtr, cols):
        self.cols = cols
        Z = self._tx(Xtr)
        med = np.nanmedian(Z, axis=0)
        self.med = np.where(np.isnan(med), 0.0, med)
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
        if 'dc_rank' in self.cols:
            rk = np.expm1(A[:, self.cols.index('dc_rank')])
            ex = np.column_stack([(np.abs(rk - v) < 1e-6).astype(float) for v in (1, 2, 3)])
        else:
            ex = np.zeros((len(A), 0))
        return np.column_stack([A, M[:, self.miss].astype(float), ex])

    def transform(self, X):
        return np.clip((self._fill(self._tx(X)) - self.mu) / self.sd, -6, 6)


# ---------------------------------------------------------------- distributions
def pois_cdf_from_lam(lam, K=KMAX):
    lam = np.maximum(np.asarray(lam, float), 1e-6)
    return np.minimum(sps.poisson.cdf(np.arange(K + 1)[None, :], lam[:, None]), 1.0)


def cdf_from_p(p, K=KMAX):
    """part2.js tdPlus: touchdowns Poisson with lambda = -log(1 - p)."""
    p = np.clip(np.asarray(p, float), 1e-6, 1 - 1e-6)
    return pois_cdf_from_lam(-np.log(1 - p), K)


# ---------------------------------------------------------------- scoring
def calib_slope(p, o):
    """logistic regression of o on [1, logit p] by Newton: (intercept, slope)."""
    z = np.log(p / (1 - p)); X = np.column_stack([np.ones_like(z), z]); b = np.array([0.0, 1.0])
    for _ in range(50):
        q = 1 / (1 + np.exp(-np.clip(X @ b, -30, 30)))
        step = np.linalg.solve(X.T @ (X * (q * (1 - q) + 1e-9)[:, None]) + 1e-9 * np.eye(2), X.T @ (o - q))
        b += step
        if np.max(np.abs(step)) < 1e-9: break
    if not np.all(np.isfinite(b)) or abs(b[1]) > 20:
        return None, None
    return float(b[0]), float(b[1])


def line_metrics(p, o, base=None):
    p = np.clip(p, 0.001, 0.999); o = o.astype(float)
    ll = -(o * np.log(p) + (1 - o) * np.log(1 - p))
    res = {'n': int(len(p)), 'log_loss': float(ll.mean()), 'brier': float(np.mean((p - o) ** 2)),
           'mean_p': float(p.mean()), 'hit_rate': float(o.mean()), 'sd_p': float(p.std())}
    if len(p) >= 50 and 0 < o.mean() < 1:
        a, b = calib_slope(p, o)
        res['calib_intercept'], res['calib_slope'] = a, b
        dec = np.minimum((pd.Series(p).rank(method='first').values - 1) * 10 // len(p), 9).astype(int)
        rel = []; s05 = 0.0; sp_c = 0.0; so_c = 0.0
        pm, om = p.mean(), o.mean()
        for k in range(10):
            m = dec == k
            if m.sum() == 0: continue
            pk, ok = p[m].mean(), o[m].mean()
            rel.append([round(float(pk), 4), round(float(ok), 4), int(m.sum())])
            s05 += m.sum() * abs(ok - 0.5)
            sp_c += m.sum() * abs(pk - pm); so_c += m.sum() * abs(ok - om)
        res['reliability_deciles'] = rel
        res['spread_pred'] = float(np.mean(np.abs(p - 0.5)))        # how far p sits from 0.5 (the brief's check)
        res['spread_outcome'] = float(s05 / len(p))                  # how far the deciles' hit rates sit from 0.5
        res['resolution_pred'] = float(sp_c / len(p))                # deciles' mean p about the overall mean
        res['resolution_outcome'] = float(so_c / len(p))             # deciles' hit rate about the overall rate
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
    nll = -np.log(np.clip(Fy - Fy1, 1e-6, 1.0))
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
            'mean_pred_sd': float(sd.mean())}


def boot_diff(a, b, games, B=B_BOOT, seed=11):
    """mean(a - b) with a 90% interval from resampling whole games (Poisson weights)."""
    d = a - b
    codes, inv = np.unique(games, return_inverse=True)
    s = np.bincount(inv, weights=d); c = np.bincount(inv).astype(float)
    W = np.random.default_rng(seed).poisson(1.0, size=(B, len(codes))).astype(float)
    bs = (W @ s) / np.maximum(W @ c, 1)
    return {'diff': float(d.mean()), 'lo90': float(np.quantile(bs, 0.05)), 'hi90': float(np.quantile(bs, 0.95)),
            'se': float(bs.std())}


# ---------------------------------------------------------------- GBMs
def gbm_fit(lgb, objective, Xtr, ytr, Xva, yva, Xfull, yfull):
    p = dict(GBM_BASE, objective=objective, metric='binary_logloss' if objective == 'binary' else 'poisson')
    dtr = lgb.Dataset(Xtr, ytr, free_raw_data=False); dva = lgb.Dataset(Xva, yva, reference=dtr)
    m = lgb.train(p, dtr, num_boost_round=4000, valid_sets=[dva], callbacks=[lgb.early_stopping(150, verbose=False)])
    it = max(int(m.best_iteration or 100), 20)
    mf = lgb.train(p, lgb.Dataset(Xfull, yfull), num_boost_round=int(round(it * 1.1)))
    return mf, it


# ---------------------------------------------------------------- the walk-forward
def run(args):
    import lightgbm as lgb
    from sklearn.linear_model import LogisticRegression
    t0 = time.time()
    R = derive(load_table(args.data))
    log('table', R.shape, 'seasons', int(R.season.min()), int(R.season.max()))
    feat_all = [c for c in R.columns if c.startswith(FEAT_PREFIX) and pd.api.types.is_numeric_dtype(R[c])]
    gcols = [c for c in GLM_FEATS if c in R.columns]
    gmiss = [c for c in GLM_FEATS if c not in R.columns]
    cur = Current(R)
    log('current recipe frame', cur.check)
    groups = GROUPS if not args.groups else args.groups.split(',')
    seasons = TEST_SEASONS if not args.seasons else [int(s) for s in args.seasons.split(',')]
    R['_v'] = np.random.default_rng(2025).random(len(R))   # one randomisation for the PIT, shared by every model
    meta = {'script': 'props/research/propmodel/model_td.py', 'test_seasons': seasons, 'groups': groups,
            'train_from': {'new': FIRST_NEW, 'current_recipe': FIRST_CUR}, 'holdout_from': HOLDOUT_FROM,
            'outcome': 'y_rush_rec_tds (count, 0..6); any TD = count >= 1', 'tdmult': TDMULT,
            'gbm_params': GBM_BASE, 'glm_alpha_grid': GLM_ALPHAS, 'n_features_gbm': len(feat_all),
            'n_features_glm': len(gcols), 'glm_missing_names': gmiss, 'current_frame_check': cur.check,
            'bootstrap': f'{B_BOOT} resamples of whole games, 90% interval',
            'lineable': 'QB: the week\'s QB1; RB/WR/TE: trailing 6-game median of carries + targets >= 1.5, or depth rank '
                        'within RB3 / WR4 / TE2', 'recalibration': 'none (fixed before the first run)'}
    fits, rows_out = {}, []
    for g in groups:
        for s in seasons:
            ts = time.time()
            tr = R[(R.grp == g) & (R.season >= FIRST_NEW) & (R.season <= s - 1)]
            itr = tr[tr.season <= s - 2]; iva = tr[tr.season == s - 1]
            te = R[(R.grp == g) & (R.season == s)].copy()
            y = te.y_rush_rec_tds.values.astype(float)
            yb_tr, yb_itr, yb_iva = (z.y_any_td.values.astype(int) for z in (tr, itr, iva))
            P, F = {}, {}
            info = {}
            # -- CURRENT and SHIPPED
            M = cur.fit(g, range(FIRST_CUR, s))
            trow = te[['pid', 'game_id', 'team', 'grp']].rename(columns={'pid': 'player_id'}).reset_index(drop=True)
            P['CURRENT'], praw, capb = cur.predict(M, trow, g)
            info.update({'current_any_td_coef': M['coef']['any_td'], 'current_tdrate': M['tdrate'], 'current_n_fit': M['n_fit'],
                         'current_cap_binds_share': capb, 'current_mean_p_uncapped': float(praw.mean())})
            if s == 2025:
                Ms = cur.shipped(g)
                P['SHIPPED'], praw_s, capb_s = cur.predict(Ms, trow, g)
                info['refit_vs_shipped'] = {'rms_p_diff': float(np.sqrt(np.mean((P['CURRENT'] - P['SHIPPED']) ** 2))),
                                            'max_coef_diff': float(np.max(np.abs(np.array(M['coef']['any_td']) - np.array(Ms['coef']['any_td'])))),
                                            'shipped_cap_binds_share': capb_s}
            # -- references
            rate = float(yb_tr.mean())
            P['REF_RATE'] = np.full(len(te), rate)
            n = te.x_gp_car.fillna(0).values.astype(float)
            car = te.p_any_td_car.values.astype(float)
            P['REF_NAIVE'] = np.where(np.isnan(car), rate, (np.nan_to_num(car) * n + 4 * rate) / (n + 4))
            # -- GLM_LOGIT: L2 chosen on the inner split
            prep_i = GLMPrep(itr[gcols].values, gcols)
            Zi, Zv = prep_i.transform(itr[gcols].values), prep_i.transform(iva[gcols].values)
            best = None
            for a in GLM_ALPHAS:
                lr = LogisticRegression(C=1.0 / (a * len(Zi)), max_iter=2000, solver='lbfgs').fit(Zi, yb_itr)
                pv = np.clip(lr.predict_proba(Zv)[:, 1], 1e-6, 1 - 1e-6)
                llv = float(-np.mean(yb_iva * np.log(pv) + (1 - yb_iva) * np.log(1 - pv)))
                if best is None or llv < best[0]: best = (llv, a)
            prep = GLMPrep(tr[gcols].values, gcols)
            Zt = prep.transform(tr[gcols].values)
            lr = LogisticRegression(C=1.0 / (best[1] * len(Zt)), max_iter=2000, solver='lbfgs').fit(Zt, yb_tr)
            P['GLM_LOGIT'] = lr.predict_proba(prep.transform(te[gcols].values))[:, 1]
            info.update({'glm_alpha': best[1], 'glm_inner_ll': best[0]})
            # -- GBMs on every feature
            Xi, Xv, Xf, Xt = (z[feat_all].values.astype(np.float32) for z in (itr, iva, tr, te))
            mb, itb = gbm_fit(lgb, 'binary', Xi, yb_itr, Xv, yb_iva, Xf, yb_tr)
            P['GBM_BIN'] = mb.predict(Xt)
            mp, itp = gbm_fit(lgb, 'poisson', Xi, itr.y_rush_rec_tds.values, Xv, iva.y_rush_rec_tds.values, Xf, tr.y_rush_rec_tds.values)
            lam_p = np.maximum(mp.predict(Xt), 1e-6)
            P['GBM_POIS'] = 1 - np.exp(-lam_p)
            F['GBM_POIS'] = pois_cdf_from_lam(lam_p)
            imp_b = pd.Series(mb.feature_importance('gain'), index=feat_all).sort_values(ascending=False)
            imp_p = pd.Series(mp.feature_importance('gain'), index=feat_all).sort_values(ascending=False)
            info.update({'gbm_bin_rounds_inner': itb, 'gbm_pois_rounds_inner': itp,
                         'gbm_bin_top_features': [[k, round(float(v / imp_b.sum()), 4)] for k, v in imp_b.head(15).items()],
                         'gbm_pois_top_features': [[k, round(float(v / imp_p.sum()), 4)] for k, v in imp_p.head(15).items()],
                         'train_rows': int(len(tr)), 'train_rate': rate})
            for k, p in P.items():
                if k not in F: F[k] = cdf_from_p(p)
            fits[f'{g}|{s}'] = info
            base = pd.DataFrame({'season': s, 'week': te.week.values, 'game_id': te.game_id.values, 'pid': te.pid.values,
                                 'name': te.name.values, 'grp': g, 'y': y, 'yb': te.y_any_td.values.astype(int),
                                 'zero_row': te.zero_row.values, 'starter': te.starter.values, 'lineable': te.lineable.values,
                                 'rookie': te.rookie.values, 'thin': te.thin.values, 'promoted': te.promoted.values,
                                 'rank_rose': te.rank_rose.values, 'rz_out': te.rz_out.values, 'qb_change': te.qb_change.values,
                                 'dc_rank': te.dc_rank.values, 'L_med': te.L_med.values, 'L_m5': te.L_m5.values})
            v = te._v.values
            for name, Fm in F.items():
                crps, nll, pit, m, sd = dist_metrics(Fm, y, v)
                base[f'{name}__crps'] = crps; base[f'{name}__nll'] = nll; base[f'{name}__pit'] = pit
                base[f'{name}__mean'] = m; base[f'{name}__sd'] = sd
                for col in ('L_med', 'L_m5'):
                    L = base[col].values; ok = ~np.isnan(L)
                    kk = np.clip(np.floor(np.nan_to_num(L, nan=0.5)).astype(int), 0, KMAX)
                    base[f'{name}__p_{col}'] = np.where(ok, 1 - Fm[np.arange(len(Fm)), kk], np.nan)
                base[f'{name}__p_fix0.5'] = 1 - Fm[:, 0]
                base[f'{name}__p_fix1.5'] = 1 - Fm[:, 1]
            # as-of base rate of each line type over the training seasons (a no-skill reference)
            ytr = tr.y_rush_rec_tds.values.astype(float)
            for col in ('L_med', 'L_m5'):
                Ltr = tr[col].values; ok = ~np.isnan(Ltr)
                base[f'base__{col}'] = float(np.mean(ytr[ok] > Ltr[ok]))
            base['base__fix0.5'] = float(np.mean(ytr > 0.5)); base['base__fix1.5'] = float(np.mean(ytr > 1.5))
            rows_out.append(base)
            log(g, s, 'n', len(te), 'rate', round(float(base.yb.mean()), 4),
                {k: round(float(base[f'{k}__crps'].mean()), 5) for k in F}, f'{time.time() - ts:.0f}s')
    PP = pd.concat(rows_out, ignore_index=True)
    PP.to_parquet(os.path.join(args.data, 'td_walkforward_preds.parquet'))
    meta['runtime_s'] = round(time.time() - t0)
    json.dump(rnd({'meta': meta, 'fits': fits}), open(os.path.join(args.data, 'td_walkforward_fits.json'), 'w'), indent=1)
    out = summarize(PP, meta, fits)
    dump(out, args.out)
    log('wrote', args.out)


# ---------------------------------------------------------------- summaries
def models_in(P):
    return [m for m in CANDS + REFS if f'{m}__crps' in P.columns and P[f'{m}__crps'].notna().any()]


def line_value(P, col):
    if col in ('L_med', 'L_m5'): return P[col].values
    return np.full(len(P), float(col[3:]))


def block(P, mods, mask, with_rel=True):
    o = {}
    y = P.y.values
    for m in mods:
        ok = mask & P[f'{m}__crps'].notna().values
        if ok.sum() == 0: continue
        r = summarize_dist(*(P[f'{m}__{k}'].values[ok] for k in ('crps', 'nll', 'pit', 'mean', 'sd')), y[ok])
        r['lines'] = {}
        for lname, col in LINES:
            pc = f'{m}__p_{col}'
            okl = ok & P[pc].notna().values
            if okl.sum() < 30: continue
            res, _ = line_metrics(P[pc].values[okl], y[okl] > line_value(P, col)[okl], P[f'base__{col}'].values[okl])
            if col in ('L_med', 'L_m5'):
                res['share_line_above_0.5'] = float(np.mean(line_value(P, col)[okl] > 0.5))
            if not with_rel: res.pop('reliability_deciles', None)
            r['lines'][lname] = res
        o[m] = r
    return o


def compare(P, mods, mask, ref='CURRENT'):
    """paired differences against ref (negative = better than ref), on the rows both score."""
    o = {}
    games, y = P.game_id.values, P.y.values
    for m in mods:
        if m == ref: continue
        ok = mask & P[f'{m}__crps'].notna().values & P[f'{ref}__crps'].notna().values
        if ok.sum() < 30: continue
        c = {'crps': boot_diff(P[f'{m}__crps'].values[ok], P[f'{ref}__crps'].values[ok], games[ok])}
        c['crps']['rel_skill'] = float(1 - P[f'{m}__crps'].values[ok].mean() / P[f'{ref}__crps'].values[ok].mean())
        for lname, col in LINES:
            a, b = f'{m}__p_{col}', f'{ref}__p_{col}'
            okl = ok & P[a].notna().values & P[b].notna().values
            if okl.sum() < 30: continue
            oo = y[okl] > line_value(P, col)[okl]
            _, la = line_metrics(P[a].values[okl], oo); _, lb = line_metrics(P[b].values[okl], oo)
            c['ll_' + lname] = boot_diff(la, lb, games[okl])
            if lname == 'any_td':
                pa, pb = np.clip(P[a].values[okl], 0.001, 0.999), np.clip(P[b].values[okl], 0.001, 0.999)
                c['brier_any_td'] = boot_diff((pa - oo) ** 2, (pb - oo) ** 2, games[okl])
        o[m] = c
    return o


def masks(P):
    sm = {'all': np.ones(len(P), bool), 'lineable': P.lineable.values == 1, 'starter': P.starter.values == 1,
          'backup': P.starter.values == 0, 'backup_lineable': (P.starter.values == 0) & (P.lineable.values == 1),
          'rookie': P.rookie.values == 1, 'thin_history': P.thin.values == 1,
          'promoted_to_starter': P.promoted.values == 1, 'rank_rose': P.rank_rose.values == 1,
          'teammate_rz_share_out': P.rz_out.values == 1,
          'weeks_1_4': P.week.values <= 4, 'weeks_5_18': P.week.values >= 5}
    if (P.grp == 'QB').all():
        sm['qb_change_starter'] = (P.qb_change.values == 1) & (P.starter.values == 1)
    return sm


def summarize_group(P, fits, g):
    mods_all = models_in(P)
    mods = [m for m in mods_all if m != 'SHIPPED']
    S = masks(P)
    t = {'n_rows': int(len(P)), 'zero_rows': int(P.zero_row.sum()), 'rate_any_td': float(P.yb.mean()),
         'pooled_2021_2025': block(P, mods, S['all']), 'vs_current': compare(P, mods, S['all']),
         'lineable_2021_2025': block(P, mods, S['lineable']), 'lineable_vs_current': compare(P, mods, S['lineable']),
         'by_season': {}, 'breakdowns': {}, 'breakdowns_vs_current': {},
         'fits': {k.split('|')[1]: v for k, v in fits.items() if k.startswith(g + '|')}}
    for s in sorted(P.season.unique()):
        ms = P.season.values == s
        d = {}
        for m in mods:
            res, _ = line_metrics(P[f'{m}__p_fix0.5'].values[ms], P.y.values[ms] > 0.5)
            d[m] = {'crps': float(P[f'{m}__crps'].values[ms].mean()), 'll_any_td': res['log_loss'],
                    'brier_any_td': res['brier'], 'mean_p': res['mean_p'], 'hit_rate': res['hit_rate'],
                    'calib_slope': res.get('calib_slope')}
        t['by_season'][str(s)] = d
    if 'SHIPPED' in mods_all:
        m25 = (P.season.values == 2025)
        t['shipped_2025'] = {'all': block(P, ['SHIPPED'] + mods, m25, with_rel=False),
                             'vs_shipped': compare(P, ['SHIPPED'] + mods, m25, ref='SHIPPED'),
                             'lineable_vs_shipped': compare(P, ['SHIPPED'] + mods, m25 & S['lineable'], ref='SHIPPED')}
    for k, mk in S.items():
        if k == 'all' or mk.sum() < 30: continue
        t['breakdowns'][k] = block(P, mods, mk, with_rel=False)
        t['breakdowns_vs_current'][k] = compare(P, mods, mk)
    return t


def summarize(PP, meta, fits):
    out = {'meta': meta, 'groups': {}, 'pooled': {}}
    for g in [x for x in GROUPS if x in PP.grp.unique()]:
        out['groups'][g] = summarize_group(PP[PP.grp == g].reset_index(drop=True), fits, g)
    mods = [m for m in models_in(PP) if m != 'SHIPPED']
    S = masks(PP)
    pooled = {'n_rows': int(len(PP)), 'rate_any_td': float(PP.yb.mean())}
    for k in ['all', 'lineable', 'starter', 'backup', 'backup_lineable', 'rookie', 'thin_history', 'promoted_to_starter',
              'rank_rose', 'teammate_rz_share_out']:
        mk = S[k]
        if mk.sum() < 30: continue
        pooled[k] = {'block': block(PP, mods, mk, with_rel=(k in ('all', 'lineable'))), 'vs_current': compare(PP, mods, mk)}
        if k in ('all', 'lineable', 'starter', 'backup', 'promoted_to_starter'):
            # the candidates against one another: each against the lowest-CRPS candidate on these rows
            best = min([m for m in CANDS if m in mods and m != 'CURRENT'], key=lambda m: PP[f'{m}__crps'].values[mk].mean())
            pooled[k]['best_candidate_by_crps'] = best
            pooled[k]['vs_best_candidate'] = compare(PP, [m for m in CANDS if m in mods], mk, ref=best)
    pooled['by_season'] = {}
    for s in sorted(PP.season.unique()):
        ms = PP.season.values == s
        pooled['by_season'][str(s)] = {'all': compare(PP, mods, ms), 'lineable': compare(PP, mods, ms & S['lineable'])}
    if 'SHIPPED' in models_in(PP):
        m25 = (PP.season.values == 2025) & PP['SHIPPED__crps'].notna().values
        pooled['shipped_2025'] = {'all': block(PP, ['SHIPPED'] + mods, m25, with_rel=False),
                                  'vs_shipped': compare(PP, ['SHIPPED'] + mods, m25, ref='SHIPPED'),
                                  'lineable_vs_shipped': compare(PP, ['SHIPPED'] + mods, m25 & S['lineable'], ref='SHIPPED')}
    out['pooled'] = pooled
    return out


def resummarize(data, outp):
    PP = pd.read_parquet(os.path.join(data, 'td_walkforward_preds.parquet'))
    J = json.load(open(os.path.join(data, 'td_walkforward_fits.json')))
    dump(summarize(PP, J['meta'], J['fits']), outp)
    log('wrote', outp)


# ---------------------------------------------------------------- report
def report(path):
    J = json.load(open(path))
    f4 = lambda v: '' if v is None else f'{v:.4f}'
    f2 = lambda v: '' if v is None else f'{v:.2f}'
    ci = lambda c: '' if not c else f"{c['diff']:+.4f} [{c['lo90']:+.4f}, {c['hi90']:+.4f}]"
    L = []
    def table(title, B, C, line='any_td'):
        L.extend([f'### {title}', '', '| model | n | CRPS | vs CURRENT (90% CI) | log loss P(1+ TD) | vs CURRENT (90% CI) | Brier | mean p | hit | slope | resolution pred/outcome | cov50 | cov80 |',
                  '|---|---|---|---|---|---|---|---|---|---|---|---|---|'])
        for m, r in B.items():
            l = r['lines'].get(line, {})
            c = C.get(m, {})
            L.append(f"| {m} | {r['n']} | {f4(r['crps'])} | {ci(c.get('crps'))} | {f4(l.get('log_loss'))} | {ci(c.get('ll_' + line))} | "
                     f"{f4(l.get('brier'))} | {f4(l.get('mean_p'))} | {f4(l.get('hit_rate'))} | {f2(l.get('calib_slope'))} | "
                     f"{f4(l.get('resolution_pred'))} / {f4(l.get('resolution_outcome'))} | {f2(r['cov50'])} | {f2(r['cov80'])} |")
        L.append('')
    P = J['pooled']
    table('All four groups, every role game, 2021-2025', P['all']['block'], P['all']['vs_current'])
    table('All four groups, book-like rows', P['lineable']['block'], P['lineable']['vs_current'])
    for g, T in J['groups'].items():
        table(f'{g}, every role game', T['pooled_2021_2025'], T['vs_current'])
        table(f'{g}, book-like rows', T['lineable_2021_2025'], T['lineable_vs_current'])
    print('\n'.join(L))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'))
    ap.add_argument('--groups'); ap.add_argument('--seasons')
    ap.add_argument('--out', default=os.path.join(HERE, 'results', 'td_walkforward.json'))
    ap.add_argument('--resummarize'); ap.add_argument('--report')
    a = ap.parse_args()
    if a.report: return report(a.report)
    if a.resummarize: return resummarize(a.resummarize, a.out)
    if not a.data: sys.exit('--data DIR is required')
    run(a)


if __name__ == '__main__':
    main()
