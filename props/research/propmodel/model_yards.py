"""Walk-forward test of outcome-distribution models for the yards props: passing, rushing, receiving and
rush + rec yards. Research only: nothing here is wired into the site, and no 2026 file is read.

Why. On 2026 weeks 1-6 the site's prop model was diagnosed as overconfident against DraftKings (its
P(over) log loss 0.7319 against the market's no-vig 0.6905), mostly through a projection with no role
inputs. The owner chose the free route: a new props model fitted on free data from 2025 and before,
tested once against 2026's lines with a bar set in advance. This script is the modelling step for the
yards stats: which way of forecasting the whole outcome distribution is best, walk-forward on 2021-2025.

How. For each test season s in 2021..2025 every candidate is fitted on seasons before s only (2013 on
for the new models; the site's method on 2019 on, the seasons its feature table holds), and predicts s.
Nothing about s is used in fitting or choosing: the hyperparameters are fixed in this file, and the only
data-driven choice (each GBM's number of trees) is made by early stopping on season s-1 with the model
fitted on seasons before s-1, then refitted on everything before s.

The candidates (at most four, on purpose):
  cur      the site's current method, refitted walk-forward: one ridge (lambda 2) per position and stat on
           featVec's 15 inputs (part2.js), on props/raw/feat.pkl's rows with two or more earlier games,
           then pOver's outcome shape: the fitted projection's quartile tiers and, in each, 51 quantiles of
           result / projection, blended across tier edges (cdfBlend). Its table holds 2019-2025, so a test
           season s is fitted on 2019..s-1 (2025 on 2019-2024: the shipped model's own seasons).
           cur_ship, the shipped coefficients and tables of props/data/final_model.json, is reported beside
           it as a check: it was fitted on 2019-2024, so only its 2025 is out of sample.
  qgbm     LightGBM quantile regression on the new feature table, 21 quantile levels, sorted so they never
           cross, the CDF linear between them.
  tpgbm    a two-part model: LightGBM's P(result <= 0) (a backup who is shut out; a run for a loss), and
           for a positive result a log-normal whose log-mean is a LightGBM regression and whose variance
           is a second LightGBM (gamma objective) on out-of-fold squared residuals, so the spread is the
           model's real out-of-sample error, not its in-sample one. The non-positive part is the training
           seasons' own distribution of results at or below 0, by position.
  tplin    the same two-part shape on linear models (logistic, ridge, gamma GLM) over a compact set of
           about 20 role and form inputs, one per position: whether the gain needs the GBM.
  qgbm_cal qgbm post-processed (added after a first look at 2021-2025 showed its central intervals too
           narrow): its CDF passed through the empirical CDF of the randomised PITs its early-stopping models
           (fitted on seasons before s-1) gave on season s-1 (Kuleshov et al. 2018). Fitted on s-1 alone,
           never s. It is reported, not chosen: fitted on every row of s-1, it fixes the coverage overall but
           pushes the book-like starters 2-5 points toward the under, the very lean the diagnosis found, so a
           coverage fix would have to be fitted by role (or on book-like rows) before it is frozen.

Result (results/yards_walkforward.json, 2021-2025 pooled; the README has the tables): qgbm has the lowest
pooled CRPS of the four candidates on every stat, and beats cur on every stat in every test season on all
rows: +8.4% passing, +4.5% rushing, +10.3% receiving, +6.8% rush + rec yards. tpgbm edged it once, on
2023's passing yards. On book-like starters, the rows a book posts lines for, qgbm is +1.3% to +2.8%,
every pooled interval above zero. Season by season it beats cur in 18 of the 20 stat-seasons and is level
in the other two (rushing and rush + rec yards in 2024). On backups it is +8% to +22% and on rookies +3% to +12%,
where cur is badly overconfident. On those starters qgbm is centred (PIT 0.48-0.51) and its P(over) at
the stand-in lines is calibrated (refit slope 0.87-1.02), but its intervals run a little narrow (80%
intervals hold 78-79%). Beating naive lines is not beating DraftKings: cur also does well against them.
Only the frozen 2026 test against DraftKings' lines can say whether qgbm carries information beyond the
book.

The site's model (cur) is defined on feat.pkl's rows, which are only games with a stat line. The new table
also has the games a player played with no stat line (zero rows). cur is scored on every row: for a zero
row its featVec is the state the page would hold, the player's history of stat-line games before the
game (an as-of merge onto feat.pkl) and his team's and opponent's context in that game. On rows feat.pkl
has, that rebuild is checked equal to the diagnosis's featVec (the check is in the results).

Scoring, on each test season's rows where the player played his role and has 3+ earlier games in role:
  - CRPS of the predictive distribution (on integers: the sum over k of (F(k) - 1{y <= k})^2).
  - P(result > L) at stand-in lines, since no book line exists before 2026: L_med, floor(median of his last
    5 role games) + 0.5; and L_mean5, floor(mean of his last 5) + 0.5, the model-free market proxy the
    diagnosis used. Log loss, Brier, reliability, the refit slope of the outcome on logit(p) (1 is right,
    under 1 overconfident), and how far p sits from 0.5 against how far the outcomes land from it.
  - Spread: the randomised PIT's histogram, and 50% and 80% central-interval coverage.
  - Breakdowns: book-like players (trailing mean over a book's usual floor), starters and backups by
    that week's depth chart, rookies, and promoted players (a starter on this week's chart who was not on
    his previous game's), where the site's model failed worst.
  - Paired differences against cur, with 90% and 95% intervals from a bootstrap over games.

As-of: every feature of the new table is as of before kickoff (its README); the games' closing spread and
total are the market's pre-game view. cur's feat.pkl normalises implied points and team volumes on
whole-season means, a small look-ahead that can only flatter the baseline.

Run (from anywhere; DIR holds features.parquet, and the cache goes in DIR/yards_cache):
  python -I model_yards.py --data DIR                 # fit every candidate, then score
  python -I model_yards.py --data DIR --score-only    # score the cached predictions again
Needs lightgbm, scikit-learn, scipy, pandas, pyarrow.
"""
import argparse, json, math, os, sys, time, warnings
from pathlib import Path
import numpy as np, pandas as pd

warnings.filterwarnings('ignore')
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]                  # props/research/propmodel -> repo root
RESULTS = HERE / 'results'

TEST_SEASONS = [2021, 2022, 2023, 2024, 2025]
TRAIN_FROM = 2013
CUR_FROM = 2019                          # feat.pkl's first season
HOLDOUT_FROM = 2026                      # never read

STATS = {
    'passing_yards':   dict(y='y_passing_yards',   groups=['QB'],             cur='passing_yards',   lo=-20, hi=650),
    'rushing_yards':   dict(y='y_rushing_yards',   groups=['QB', 'RB'],       cur='rushing_yards',   lo=-30, hi=320),
    'receiving_yards': dict(y='y_receiving_yards', groups=['RB', 'WR', 'TE'], cur='receiving_yards', lo=-25, hi=350),
    'rush_rec_yards':  dict(y='y_rush_rec_yards',  groups=['RB'],             cur='scrim_yards',     lo=-30, hi=420),
}
# a book's usual floor for posting a main line, on the player's trailing 5-game mean (general knowledge of the
# market, set before any scoring; no 2026 line was read to set it)
BOOK_THR = {'passing_yards': {'QB': 120}, 'rushing_yards': {'QB': 12, 'RB': 20},
            'receiving_yards': {'RB': 12, 'WR': 15, 'TE': 15}, 'rush_rec_yards': {'RB': 30}}
SLOTS = {'QB': 1, 'RB': 1, 'WR': 3, 'TE': 1}
GRP_CODE = {'QB': 0, 'RB': 1, 'WR': 2, 'TE': 3}
TAUS = [0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.98]
LGB_BASE = dict(learning_rate=0.05, num_leaves=31, min_data_in_leaf=200, feature_fraction=0.7,
                bagging_fraction=0.8, bagging_freq=1, lambda_l2=1.0, max_bin=127, verbose=-1, num_threads=int(os.environ.get('YARDS_THREADS', '2')), seed=7)
MAX_ROUNDS, PATIENCE = 2000, 100
CLIP = (0.001, 0.999)                    # the page's clip on P(over), applied to every model alike
N_BOOT = 500

# ----------------------------------------------------------------------------------------------- features
def _w(metric, wins):
    return [f'p_{metric}_{w}' for w in wins]
W7 = ['l1', 'l3', 'ew4', 'ew10', 'szn', 'prev', 'car']
COMMON = (_w('off_pct', W7) + ['p_off_pct_trend', 'p_off_snaps_ew4', 'p_est_routes_ew4', 'p_est_routes_ew10', 'p_st_pct_ew4']
          + ['dc_depth', 'dc_rank', 'dc_n_starters', 'dc_depth_any', 'dc_listed', 'dc_team_chart', 'dc_offpos', 'dc_fb',
             'dc_is_qb1', 'dc_qb_change', 'dc_qb1_gp', 'dc_qb1_epa_db']
          + ['inj_out', 'inj_doubtful', 'inj_questionable', 'inj_dnp', 'inj_limited', 'inj_listed', 'inj_report_team']
          + ['tm_vac_tgt', 'tm_vac_ay', 'tm_vac_car', 'tm_vac_rz_tgt', 'tm_vac_rz_car', 'tm_vac_tgt_grp', 'tm_vac_car_grp',
             'tm_n_absent', 'tm_n_absent_grp', 'tm_top3_tgt_absent', 'tm_qb_lead_absent', 'tm_is_qb_lead', 'tm_ol_out',
             'tm_ret_tgt', 'tm_ret_car', 'tm_ret_ay', 'tm_roster_known']
          + ['x_gp_car', 'x_gp_szn', 'x_gp_prev', 'x_gp_share_szn', 'x_first_game', 'x_new_team', 'x_gp_with_team',
             'x_days_since_last', 'x_team_games_missed', 'x_years_exp', 'x_rookie', 'x_draft_number', 'x_undrafted',
             'x_age', 'x_weight']
          + ['g_implied', 'g_opp_implied', 'g_margin', 'g_total_line', 'g_win_prob', 'g_is_home', 'g_dome', 'g_temp',
             'g_wind', 'g_wet', 'g_rest', 'g_opp_rest', 'g_neutral']
          + ['t_plays_ew8', 't_db_ew8', 't_drush_ew8', 't_r_pass_rate_ew8', 't_r_neu_pass_rate_ew8', 't_r_proe_ew8',
             't_r_epa_db_ew8', 't_r_epa_rush_ew8', 't_points_ew8', 't_gp_szn', 't_plays_szn', 't_db_szn']
          + ['od_db_out', 'od_front_out', 'grp_code'])
PASS = (_w('passing_yards', W7) + _w('attempts', W7) + _w('completions', W7) + _w('db_share', W7)
        + ['p_db_ew4', 'p_db_ew10', 'p_qb_epa_ew4', 'p_qb_epa_ew10', 'p_passing_epa_ew4', 'p_sacks_suffered_ew4',
           'p_r_ypa_ew10', 'p_r_ypa_szn', 'p_r_ypa_car', 'p_r_comp_ew10', 'p_r_comp_car', 'p_r_cpoe_ew10', 'p_r_cpoe_car',
           'p_r_epa_db_ew10', 'p_r_epa_db_car', 'p_r_sack_rate_ew10', 'p_r_int_rate_ew10']
        + ['d_pass_yds_ew8', 'd_pass_yds_rel', 'd_pass_yds_szn', 'd_r_epa_db_ew8', 'd_r_succ_db_ew8', 'd_r_sack_rate_ew8',
           'd_r_expl_pass_ew8', 'd_db_ew8', 'd_r_pass_rate_ew8', 'd_points_rel', 'd_epa_db_rel',
           'oa_passing_yards_ew8', 'oa_passing_yards_rel', 'oa_passing_yards_szn', 'oa_attempts_ew8', 'oa_completions_ew8',
           'oa_sacks_suffered_ew8', 't_air_yards_ew8', 't_tgt_ew8', 't_r_sack_rate_ew8', 't_r_succ_db_ew8',
           't_r_expl_pass_ew8'])
RUSH = (_w('rushing_yards', W7) + _w('carries', W7) + _w('car_share', W7) + _w('rz_car_share', ['ew4', 'ew10', 'szn'])
        + ['p_car_share_trend', 'p_car_d_ew4', 'p_car_d_ew10', 'p_gl_car_ew4', 'p_rz_car_ew4', 'p_scrambles_ew4',
           'p_scrambles_ew10', 'p_db_share_ew4', 'p_db_share_l1', 'p_r_ypc_ew10', 'p_r_ypc_szn', 'p_r_ypc_car']
        + ['d_rush_yds_ew8', 'd_rush_yds_rel', 'd_rush_yds_szn', 'd_r_epa_rush_ew8', 'd_r_succ_rush_ew8',
           'd_r_expl_rush_ew8', 'd_drush_ew8', 'd_epa_rush_rel', 'd_points_rel',
           'oa_rushing_yards_ew8', 'oa_rushing_yards_rel', 'oa_rushing_yards_szn', 'oa_carries_ew8', 'oa_carries_rel',
           't_r_succ_rush_ew8', 't_r_expl_rush_ew8'])
REC = (_w('receiving_yards', W7) + _w('receptions', W7) + _w('targets', W7) + _w('tgt_share', W7) + _w('ay_share', W7)
       + _w('rz_tgt_share', ['ew4', 'ew10', 'szn'])
       + ['p_tgt_share_trend', 'p_air_yards_ew4', 'p_air_yards_ew10', 'p_deep_tgt_ew4', 'p_ez_tgt_ew4',
          'p_r_ypt_ew10', 'p_r_ypt_szn', 'p_r_ypt_car', 'p_r_catch_ew10', 'p_r_catch_car', 'p_r_adot_ew10', 'p_r_adot_car',
          'p_r_tprr_ew10', 'p_r_tprr_car', 'p_r_yprr_ew10', 'p_r_yprr_car']
       + ['d_pass_yds_ew8', 'd_pass_yds_rel', 'd_pass_yds_szn', 'd_r_epa_db_ew8', 'd_r_expl_pass_ew8', 'd_epa_db_rel',
          'd_db_ew8', 'd_points_rel',
          'oa_receiving_yards_ew8', 'oa_receiving_yards_rel', 'oa_receiving_yards_szn', 'oa_targets_ew8', 'oa_targets_rel',
          'oa_receptions_ew8', 't_air_yards_ew8', 't_tgt_ew8', 't_r_expl_pass_ew8'])
GBM_FEATS = {
    'passing_yards': COMMON + PASS + _w('rushing_yards', ['ew4', 'ew10']),
    'rushing_yards': COMMON + RUSH,
    'receiving_yards': COMMON + REC + _w('rushing_yards', ['ew4']) + _w('carries', ['ew4']),
    'rush_rec_yards': COMMON + RUSH + REC + _w('rush_rec_yards', W7),
}
# tplin: a compact set, one linear model per position
LIN_FEATS = {
    'passing_yards': ['p_passing_yards_ew4', 'p_passing_yards_ew10', 'p_passing_yards_szn', 'p_passing_yards_prev',
                      'p_passing_yards_car', 'p_attempts_ew4', 'p_db_share_ew4', 'p_db_share_l1', 'p_r_ypa_ew10',
                      'p_r_epa_db_ew10', 'dc_is_qb1', 'dc_rank', 'g_implied', 'g_margin', 'g_total_line',
                      'd_pass_yds_rel', 'oa_passing_yards_rel', 't_r_pass_rate_ew8', 'tm_vac_tgt', 'inj_questionable',
                      'g_dome', 'g_wind'],
    'rushing_yards': ['p_rushing_yards_ew4', 'p_rushing_yards_ew10', 'p_rushing_yards_szn', 'p_rushing_yards_prev',
                      'p_rushing_yards_car', 'p_carries_ew4', 'p_car_share_ew4', 'p_car_share_l1', 'p_off_pct_ew4',
                      'p_off_pct_l1', 'p_scrambles_ew4', 'p_db_share_ew4', 'p_r_ypc_ew10', 'dc_rank', 'dc_depth',
                      'tm_vac_car', 'tm_vac_car_grp', 'g_implied', 'g_margin', 'd_rush_yds_rel',
                      'oa_rushing_yards_rel', 'inj_questionable'],
    'receiving_yards': ['p_receiving_yards_ew4', 'p_receiving_yards_ew10', 'p_receiving_yards_szn',
                        'p_receiving_yards_prev', 'p_receiving_yards_car', 'p_targets_ew4', 'p_tgt_share_ew4',
                        'p_tgt_share_l1', 'p_ay_share_ew4', 'p_off_pct_ew4', 'p_off_pct_l1', 'p_est_routes_ew4',
                        'p_r_ypt_ew10', 'dc_rank', 'dc_depth', 'tm_vac_tgt', 'tm_top3_tgt_absent', 'tm_qb_lead_absent',
                        'g_implied', 'd_pass_yds_rel', 'oa_receiving_yards_rel', 'inj_questionable'],
    'rush_rec_yards': ['p_rush_rec_yards_ew4', 'p_rush_rec_yards_ew10', 'p_rush_rec_yards_szn', 'p_rush_rec_yards_prev',
                       'p_rush_rec_yards_car', 'p_carries_ew4', 'p_targets_ew4', 'p_car_share_ew4', 'p_car_share_l1',
                       'p_tgt_share_ew4', 'p_off_pct_ew4', 'p_off_pct_l1', 'p_r_ypc_ew10', 'dc_rank', 'dc_depth',
                       'tm_vac_car', 'tm_vac_car_grp', 'tm_vac_tgt', 'g_implied', 'g_margin', 'd_rush_yds_rel',
                       'oa_rushing_yards_rel', 'inj_questionable'],
}

# --------------------------------------------------------------------------------------------- the data
def load_table(path):
    df = pd.read_parquet(path)
    assert df.season.max() < HOLDOUT_FROM, 'a held-out season is in the table'
    df = df[(df.role_played == 1) & df.grp.isin(['QB', 'RB', 'WR', 'TE'])].copy()
    df['grp_code'] = df.grp.map(GRP_CODE).astype(float)
    df = df.sort_values(['pid', 'tkey']).reset_index(drop=True)
    # each player's previous role game (any position): history for the stand-in lines and the promoted flag
    g = df.groupby('pid', sort=False)
    df['n_prev'] = g.cumcount()
    rank = df.dc_rank.where(df.dc_listed == 1)
    df['starter'] = [(r <= SLOTS[p]) if r == r else False for r, p in zip(rank.values, df.grp.values)]
    df['prev_starter'] = df.groupby('pid', sort=False)['starter'].shift(1)
    df['promoted'] = df.starter & (df.n_prev > 0) & (df.prev_starter == False)  # noqa: E712
    for st, S in STATS.items():
        y = df[S['y']].astype(float)
        sh = y.groupby(df.pid, sort=False).shift(1)
        r = sh.groupby(df.pid, sort=False).rolling(5, min_periods=1)
        med = r.median().reset_index(level=0, drop=True)
        mean = r.mean().reset_index(level=0, drop=True)
        df[f'tr_med_{st}'] = med.sort_index()
        df[f'tr_mean_{st}'] = mean.sort_index()
    return df


# ------------------------------------------------------------------------------- the site's model (cur)
def load_cur():
    FM = json.load(open(REPO / 'props/data/final_model.json'))
    feat = pd.read_pickle(REPO / 'props/raw/feat.pkl')
    feat = feat.sort_values(['player_id', 'season', 'week']).reset_index(drop=True)
    feat['tkey'] = feat.season * 100 + feat.week
    assert feat.season.max() < HOLDOUT_FROM
    return FM, feat


VOLMAP = {'passing_yards': 't_pass_yds', 'rushing_yards': 't_rush_yds', 'receiving_yards': 't_pass_yds', 'scrim_yards': 't_plays'}
DEFMAP = {'passing_yards': 'd_pass_yds', 'rushing_yards': 'd_rush_yds', 'receiving_yards': 'd_pass_yds', 'scrim_yards': 'd_rush_yds'}


def featvec_feat(x, stat, prior, ks=4.0):
    """featVec on feat.pkl's own rows of one group, as the diagnosis's common.featvec (and fit4.py) built it."""
    x = x.reset_index(drop=True)
    n = x.gp_prior.values.astype(float)
    csum = (x.groupby('player_id')[stat].cumsum() - x[stat]).values
    car = (csum + ks * prior) / (n + ks)
    ps = x.groupby(['player_id', 'season'])[stat].agg(['mean', 'count']).reset_index(); ps['season'] += 1
    m = x[['player_id', 'season']].merge(ps, on=['player_id', 'season'], how='left')
    py = (m['mean'].fillna(0).values * m['count'].fillna(0).values + ks * prior) / (m['count'].fillna(0).values + ks)
    e5 = x['e5_' + stat].fillna(0).values; e3 = x['e3_' + stat].fillna(0).values
    oaz = x['oaz_' + stat].values; tvol = x['tez_' + VOLMAP[stat]].values; ddef = x['dez_' + DEFMAP[stat]].values
    imp, home, sprd, absp = x.imp_z.values, x.home.values, x.sprd.values, x.abs_sprd.values
    return np.column_stack([np.ones(len(x)), e5, e3, car, py, oaz, tvol, ddef, imp, home, sprd, absp, e5 * oaz, e5 * imp, e5 * tvol])


def cur_state(feat, rows, grp, stat):
    """The pieces of featVec for arbitrary rows (zero rows included), as of before each game, from feat.pkl: the
    player's stat-line games strictly before the game, his team's and opponent's context in that game."""
    f = feat.copy()
    gb = f.groupby('player_id', sort=False)[stat]
    f['_e5i'] = gb.transform(lambda s: s.ewm(span=5, adjust=True).mean())
    f['_e3i'] = gb.transform(lambda s: s.ewm(span=3, adjust=True).mean())
    f['_nall'] = f.groupby('player_id', sort=False).cumcount() + 1
    fg = f[f.grp == grp].copy()
    fg['_csg'] = fg.groupby('player_id', sort=False)[stat].cumsum()
    r = rows[['pid', 'tkey', 'season', 'game_id', 'g_is_home']].copy()
    r['_i'] = np.arange(len(r))
    r = r.sort_values('tkey')
    a = pd.merge_asof(r, f.sort_values('tkey')[['player_id', 'tkey', '_e5i', '_e3i', '_nall']],
                      left_on='tkey', right_on='tkey', left_by='pid', right_by='player_id', allow_exact_matches=False)
    b = pd.merge_asof(r, fg.sort_values('tkey')[['player_id', 'tkey', '_csg']],
                      left_on='tkey', right_on='tkey', left_by='pid', right_by='player_id', allow_exact_matches=False)
    a = a.sort_values('_i'); b = b.sort_values('_i')
    out = pd.DataFrame({'e5': a._e5i.fillna(0).values, 'e3': a._e3i.fillna(0).values, 'n': a._nall.fillna(0).values,
                        'csum': b._csg.fillna(0).values}, index=rows.index)
    ps = fg.groupby(['player_id', 'season'])[stat].agg(['mean', 'count']).reset_index(); ps['season'] += 1
    m = rows[['pid', 'season']].merge(ps.rename(columns={'player_id': 'pid'}), on=['pid', 'season'], how='left')
    out['pym'] = m['mean'].fillna(0).values; out['pyn'] = m['count'].fillna(0).values
    # context by (game, team): feat.pkl's own values for the player's club in that game, its home flag included
    # (feat.pkl reads 2019's Raiders home games as away, games.csv saying OAK where the stats say LV; the site's
    # coefficients were fitted on that, so it is reproduced as it is)
    ctx = f.groupby(['game_id', 'team']).agg(tvol=('tez_' + VOLMAP[stat], 'first'), ddef=('dez_' + DEFMAP[stat], 'first'),
                                            imp=('imp_z', 'first'), sprd=('sprd', 'first'), absp=('abs_sprd', 'first'),
                                            home=('home', 'first')).reset_index()
    oa = f[f.grp == grp].groupby(['game_id', 'team']).agg(oaz=('oaz_' + stat, 'first')).reset_index()
    k = rows[['game_id', 'team', 'g_is_home']].copy()
    c = k.merge(ctx, on=['game_id', 'team'], how='left').merge(oa, on=['game_id', 'team'], how='left')
    for col in ['tvol', 'ddef', 'imp', 'sprd', 'absp', 'oaz']:
        out[col] = c[col].fillna(0).values
    out['home'] = c.home.fillna(k.g_is_home.astype(float)).values
    out['ctx_missing'] = c.tvol.isna().values
    return out


def featvec_state(st, prior, ks=4.0):
    car = (st.csum.values + ks * prior) / (st.n.values + ks)
    py = (st.pym.values * st.pyn.values + ks * prior) / (st.pyn.values + ks)
    e5, e3 = st.e5.values, st.e3.values
    return np.column_stack([np.ones(len(st)), e5, e3, car, py, st.oaz.values, st.tvol.values, st.ddef.values,
                            st.imp.values, st.home.values, st.sprd.values, st.absp.values,
                            e5 * st.oaz.values, e5 * st.imp.values, e5 * st.tvol.values])


def ridge(X, y, lam=2.0):
    P = np.eye(X.shape[1]) * lam; P[0, 0] = 0
    return np.linalg.solve(X.T @ X + P, X.T @ y)


def cur_fit(feat, grp, stat, seasons, qs):
    x = feat[feat.grp == grp].reset_index(drop=True)
    trm = x.season.isin(seasons).values
    prior = float(x.loc[trm, stat].mean())
    X = featvec_feat(x, stat, prior)
    mk = trm & (x.gp_prior.values >= 2)
    y = x[stat].values.astype(float)
    coef = ridge(X[mk], y[mk], 2.0)
    mu = np.maximum(X[mk] @ coef, 0)
    edges = np.quantile(mu, [.25, .5, .75])
    t = np.searchsorted(edges, mu, side='left')     # number of edges strictly below mu
    q = []
    for k in range(4):
        mm = (t == k) & (mu > 0.05)
        q.append(np.quantile(y[mk][mm] / np.maximum(mu[mm], 0.05), qs).tolist())
    return dict(coef=coef.tolist(), prior=prior, edges=edges.tolist(), q=q)


def cdf_ratio(q, r, QS):
    q = np.asarray(q); r = np.asarray(r, dtype=float)
    i = np.clip(np.searchsorted(q[1:], r, side='left'), 0, len(q) - 2)
    span = np.maximum(q[i + 1] - q[i], 1e-9)
    v = QS[i] + ((r - q[i]) / span) * (QS[i + 1] - QS[i])
    v[r <= q[0]] = 0; v[r >= q[-1]] = 1
    return v


def cdf_blend(D, mu, r, QS):
    """part2.js cdfBlend, vectorised: mu and r the same shape (flattened rows x thresholds)."""
    E = D['edges']; Q = D['q']
    t = np.zeros(mu.shape, int)
    for ed in E: t += (mu > ed)
    F = np.empty(mu.shape)
    for k in range(len(Q)):
        m = t == k
        if m.any(): F[m] = cdf_ratio(Q[k], r[m], QS)
    for i, ed in enumerate(E):
        rel = (mu - ed) / ed
        m = np.abs(rel) < 0.18
        if not m.any(): continue
        other = np.where(mu > ed, i, i + 1)
        ok = m & (other != t)
        if not ok.any(): continue
        wt = 0.5 * (1 - np.abs(rel) / 0.18)
        Fo = np.empty(mu.shape)
        for k in range(len(Q)):
            mm = ok & (other == k)
            if mm.any(): Fo[mm] = cdf_ratio(Q[k], r[mm], QS)
        F[ok] = (1 - wt[ok]) * F[ok] + wt[ok] * Fo[ok]
    return F


# ------------------------------------------------------------------------------------- the GBM models
def lgb_train(params, X, y, Xv=None, yv=None, rounds=None, init_score=None):
    import lightgbm as lgb
    ds = lgb.Dataset(X, y, free_raw_data=False, categorical_feature=['grp_code'] if 'grp_code' in X.columns else 'auto')
    if rounds is not None:
        return lgb.train(params, ds, num_boost_round=max(int(rounds), 20))
    dv = lgb.Dataset(Xv, yv, reference=ds)
    bst = lgb.train(params, ds, num_boost_round=MAX_ROUNDS, valid_sets=[dv],
                    callbacks=[lgb.early_stopping(PATIENCE, verbose=False)])
    return bst


def es_then_refit(params, tr, feats, y, yname, ret_es=False):
    """Choose the number of trees on the last training season (fitted on the seasons before it), then refit on
    every training season with that many (scaled up for the larger set). Returns the model and its rounds (and,
    with ret_es, the early-stopping model itself, whose predictions on the last training season are out of sample)."""
    last = tr.season.max()
    a, b = tr.season < last, tr.season == last
    bst = lgb_train(params, tr.loc[a, feats], y[a.values], tr.loc[b, feats], y[b.values])
    rounds = int(math.ceil((bst.best_iteration or MAX_ROUNDS) * 1.1))
    final = lgb_train(params, tr[feats], y, rounds=rounds)
    return (final, rounds, bst) if ret_es else (final, rounds)


def fit_qgbm(tr, te, feats, yname):
    """The quantile grid; and, for its recalibration (qgbm_cal), the randomised PIT of the last training season
    (s-1) under the early-stopping models, which were fitted on the seasons before it: out of sample, and nothing
    of the test season."""
    y = tr[yname].values.astype(float)
    last = tr.season.max(); vm = (tr.season == last).values
    Q = np.zeros((len(te), len(TAUS))); Qv = np.zeros((vm.sum(), len(TAUS))); rounds = []
    for j, tau in enumerate(TAUS):
        p = dict(LGB_BASE, objective='quantile', alpha=tau, metric='quantile')
        bst, r, es = es_then_refit(p, tr, feats, y, yname, ret_es=True)
        Q[:, j] = bst.predict(te[feats]); Qv[:, j] = es.predict(tr.loc[vm, feats]); rounds.append(r)
    Q = np.sort(Q, axis=1); Qv = np.sort(Qv, axis=1)
    lo, hi = float(np.min(y)), float(np.max(y))
    lo_v = float(np.min(y[~vm]))
    yv = y[vm]
    Fv = qgbm_cdf_rows(Qv, lo_v, np.column_stack([np.round(yv) - 0.5, np.round(yv) + 0.5]))
    u_val = Fv[:, 0] + np.random.default_rng(11).random(len(yv)) * (Fv[:, 1] - Fv[:, 0])
    return dict(Q=Q, ymin=lo, ymax=hi, u_val=np.sort(u_val)), dict(rounds=rounds, val_season=int(last))


def neg_table(tr, yname, lo):
    """Each position's distribution of results at or below 0 in the training seasons: P(y <= k | y <= 0)."""
    out = {}
    ks = np.arange(lo, 1)
    for g, x in tr.groupby('grp'):
        v = x[yname].values; v = v[v <= 0]
        if len(v) == 0: v = np.array([0.0])
        v = np.maximum(v, lo)
        out[g] = (np.searchsorted(np.sort(v), ks, side='right') / len(v)).tolist()
    return out


def season_folds(seasons, k=4):
    s = sorted(seasons)
    return [s[i::k] for i in range(k)]


def fit_tpgbm(tr, te, feats, yname, lo):
    y = tr[yname].values.astype(float)
    z = (y <= 0).astype(float)
    pc = dict(LGB_BASE, objective='binary', metric='binary_logloss')
    b0, r0 = es_then_refit(pc, tr, feats, z, yname)
    p0 = np.clip(b0.predict(te[feats]), 1e-4, 1 - 1e-4)
    pos = y > 0
    trp = tr[pos].reset_index(drop=True); ly = np.log(y[pos])
    pl = dict(LGB_BASE, objective='regression', metric='l2')
    bl, rl = es_then_refit(pl, trp, feats, ly, yname)
    m_te = bl.predict(te[feats])
    # out-of-fold log-mean on the training positives, folds by season, for the spread model
    oof = np.zeros(len(trp))
    for fs in season_folds(trp.season.unique()):
        f = trp.season.isin(fs).values
        bb = lgb_train(pl, trp.loc[~f, feats], ly[~f], rounds=rl)
        oof[f] = bb.predict(trp.loc[f, feats])
    r2 = (ly - oof) ** 2
    ps = dict(LGB_BASE, objective='gamma', metric='gamma')
    bs, rs = es_then_refit(ps, trp, feats, np.maximum(r2, 1e-6), yname)
    s2 = np.maximum(bs.predict(te[feats]), 1e-4)
    return dict(p0=p0, m=m_te, s=np.sqrt(s2), neg=neg_table(tr, yname, lo)), dict(rounds=[r0, rl, rs])


# ---------------------------------------------------------------------------------- the linear two-part
VOLUME_PREFIX = ('p_',)


def lin_prep(tr, te, feats):
    Xtr = tr[feats].astype(float).copy(); Xte = te[feats].astype(float).copy()
    for c in feats:
        if c.startswith('p_r_') or not c.startswith(VOLUME_PREFIX):
            fill = Xtr[c].median()
            fill = 0.0 if fill != fill else fill
        else:
            fill = 0.0                                   # no history: no production
        if c == 'dc_rank': fill = 5.0
        if c == 'dc_depth': fill = 4.0
        Xtr[c] = Xtr[c].fillna(fill); Xte[c] = Xte[c].fillna(fill)
    Xtr['no_hist'] = (tr['x_gp_car'].fillna(0) == 0).astype(float).values
    Xte['no_hist'] = (te['x_gp_car'].fillna(0) == 0).astype(float).values
    Xtr['log_gp'] = np.log1p(tr['x_gp_car'].fillna(0).values); Xte['log_gp'] = np.log1p(te['x_gp_car'].fillna(0).values)
    Xtr['rookie'] = tr['x_rookie'].fillna(0).values; Xte['rookie'] = te['x_rookie'].fillna(0).values
    mu = Xtr.mean(); sd = Xtr.std().replace(0, 1).fillna(1)
    return ((Xtr - mu) / sd).values, ((Xte - mu) / sd).values


def fit_tplin(tr, te, feats, yname, lo):
    from sklearn.linear_model import LogisticRegression, Ridge, GammaRegressor
    p0 = np.zeros(len(te)); m = np.zeros(len(te)); s = np.zeros(len(te))
    for g in te.grp.unique():
        a = tr[tr.grp == g].reset_index(drop=True); bm = (te.grp == g).values; b = te[bm]
        Xa, Xb = lin_prep(a, b, feats)
        y = a[yname].values.astype(float)
        z = (y <= 0).astype(int)
        clf = LogisticRegression(C=1.0, max_iter=3000).fit(Xa, z)
        p0[bm] = np.clip(clf.predict_proba(Xb)[:, 1], 1e-4, 1 - 1e-4)
        pos = y > 0; ly = np.log(y[pos]); Xp = Xa[pos]; seas = a.season.values[pos]
        reg = Ridge(alpha=1.0).fit(Xp, ly)
        m[bm] = reg.predict(Xb)
        oof = np.zeros(len(ly))
        for fs in season_folds(np.unique(seas)):
            f = np.isin(seas, fs)
            oof[f] = Ridge(alpha=1.0).fit(Xp[~f], ly[~f]).predict(Xp[f])
        r2 = np.maximum((ly - oof) ** 2, 1e-6)
        gr = GammaRegressor(alpha=1e-3, max_iter=3000).fit(Xp, r2)
        s[bm] = np.sqrt(np.maximum(gr.predict(Xb), 1e-4))
    return dict(p0=p0, m=m, s=s, neg=neg_table(tr, yname, lo)), {}


# ------------------------------------------------------------------------------------------- the CDFs
def norm_cdf(x):
    from scipy.special import ndtr
    return ndtr(x)


def qgbm_cdf_rows(Q, ymin, X):
    """The quantile curve read as a CDF at points X (n x m): linear between the 21 levels, out to 0 at a floor and
    1 at a ceiling a little past the outer levels."""
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


def recal(F, u_sorted):
    """Quantile recalibration (Kuleshov et al. 2018): F -> the empirical CDF of the validation season's PITs at F,
    a monotone map, so the result is still a CDF."""
    u = np.asarray(u_sorted); n = len(u)
    grid = np.linspace(0, 1, 201)
    g = np.searchsorted(u, grid, side='right') / n
    g[0], g[-1] = 0.0, 1.0
    return np.interp(F, grid, g)


def cdf_grid(kind, P, grp, K, QS=None):
    """F[i, j] = P(Y <= K[j]) for integer thresholds K (the continuous model read at K + 0.5)."""
    n = len(grp)
    x = K[None, :] + 0.5
    if kind in ('cur', 'cur_ship'):
        out = np.empty((n, len(K)))
        for g in np.unique(grp):
            ix = np.where(grp == g)[0]
            mu = P['mu'][ix]
            D = P['dist'][g]
            M = np.repeat(mu[:, None], len(K), 1)
            R = x / np.maximum(M, 0.05)
            out[ix] = cdf_blend(D, M.ravel(), np.broadcast_to(R, M.shape).ravel(), QS).reshape(M.shape)
        return out
    if kind in ('qgbm', 'qgbm_cal'):
        out = qgbm_cdf_rows(P['Q'], P['ymin'], np.broadcast_to(x, (n, len(K))))
        if kind == 'qgbm_cal':
            out = recal(out, P['u_val'])
        return out
    if kind in ('tpgbm', 'tplin'):
        p0, m, s = P['p0'][:, None], P['m'][:, None], P['s'][:, None]
        H = lambda v: norm_cdf((np.log(v) - m) / s)
        h05 = H(0.5)
        Fpos = (H(np.maximum(x, 0.5)) - h05) / np.maximum(1 - h05, 1e-12)
        out = p0 + (1 - p0) * np.clip(Fpos, 0, 1)
        negk = K <= 0
        if negk.any():
            for g in np.unique(grp):
                ix = grp == g
                G = np.array(P['neg'][g])                # indexed by k from lo..0
                kk = K[negk] - K[0]
                out[np.ix_(ix, negk)] = p0[ix] * G[kk][None, :]
        return out
    raise ValueError(kind)


# -------------------------------------------------------------------------------------------- scoring
def logit(p): return np.log(p / (1 - p))


def logistic_refit(p, y, iters=50):
    """Newton fit of y ~ a + b*logit(p); returns (a, b)."""
    x = logit(np.clip(p, *CLIP)); X = np.column_stack([np.ones_like(x), x]); w = np.array([0.0, 1.0])
    for _ in range(iters):
        eta = X @ w; mu = 1 / (1 + np.exp(-eta))
        g = X.T @ (y - mu); Hm = (X * (mu * (1 - mu))[:, None]).T @ X + 1e-9 * np.eye(2)
        step = np.linalg.solve(Hm, g); w = w + step
        if np.max(np.abs(step)) < 1e-10: break
    return float(w[0]), float(w[1])


def line_metrics(p, y):
    p = np.clip(p, *CLIP); n = len(p)
    if n == 0: return None
    ll = -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))
    br = np.mean((p - y) ** 2)
    a, b = logistic_refit(p, y) if n >= 50 else (float('nan'), float('nan'))
    # how far p sits from 0.5 against how far outcomes land, on deciles of p
    order = np.argsort(p, kind='stable'); bins = np.array_split(order, 10)
    stated = sum(len(ix) * abs(p[ix].mean() - 0.5) for ix in bins if len(ix)) / n
    realized = sum(len(ix) * abs(y[ix].mean() - 0.5) for ix in bins if len(ix)) / n
    rel = [dict(n=int(len(ix)), said=round(float(p[ix].mean()), 4), hit=round(float(y[ix].mean()), 4)) for ix in bins if len(ix)]
    fav = p >= 0.5
    said_fav = np.where(fav, p, 1 - p); hit_fav = np.where(fav, y, 1 - y)
    return dict(n=int(n), logloss=float(ll), brier=float(br), logloss_coin=float(math.log(2)),
                mean_p=float(p.mean()), hit=float(y.mean()), refit_a=a, refit_b=b,
                mean_abs_p_minus_half=float(np.mean(np.abs(p - 0.5))), sep_stated_deciles=float(stated),
                sep_realized_deciles=float(realized), sep_ratio=float(realized / stated) if stated > 0 else float('nan'),
                fav_said=float(said_fav.mean()), fav_hit=float(hit_fav.mean()), reliability=rel)


def score_block(F, K, y, Lmed, Lmean, rng):
    """Every metric for one model on one set of rows."""
    n = len(y)
    yi = np.clip(np.round(y).astype(int), K[0], K[-1])
    ind = (K[None, :] >= yi[:, None]).astype(float)
    crps_rows = np.sum((F - ind) ** 2, axis=1)
    j = yi - K[0]
    Fy = F[np.arange(n), j]
    Fy1 = np.where(j > 0, F[np.arange(n), np.maximum(j - 1, 0)], 0.0)
    u = Fy1 + rng.random(n) * (Fy - Fy1)
    mean_pred = K[0] + np.sum(1 - F[:, :-1], axis=1)
    med_pred = K[np.argmax(F >= 0.5, axis=1)]
    def pover(L):
        jj = np.clip(np.floor(L).astype(int) - K[0], 0, len(K) - 1)     # L = k + 0.5 -> 1 - F(k)
        return 1 - F[np.arange(n), jj]
    pm, pl = pover(Lmed), pover(Lmean)
    return crps_rows, u, mean_pred, med_pred, pm, pl


def summarize(rows, crps, u, meanp, medp, pm, pl, y, Lmed, Lmean):
    out = dict(n=int(len(y)), crps=float(np.mean(crps)), mean_y=float(np.mean(y)), mean_pred=float(np.mean(meanp)),
               median_y=float(np.median(y)), mean_pred_median=float(np.mean(medp)),
               pit_mean=float(np.mean(u)), cov50=float(np.mean((u > .25) & (u < .75))), cov80=float(np.mean((u > .1) & (u < .9))),
               pit_hist=[round(float(v), 4) for v in np.histogram(u, bins=10, range=(0, 1))[0] / max(len(u), 1)])
    out['L_med'] = line_metrics(pm, (y > Lmed).astype(float))
    out['L_mean5'] = line_metrics(pl, (y > Lmean).astype(float))
    # does the model's departure from the naive line carry information? OLS of (result - L) on (model mean - L), L the
    # trailing 5-game mean itself (the diagnosis's measure against DraftKings' line, here against the free proxy):
    # slope 1 is a departure of the right size, 0 is noise
    for nm, pr in (('mean', meanp), ('median', medp)):
        dx = pr - Lmean; dy = y - Lmean
        if len(dx) > 2 and np.var(dx) > 0:
            b = float(np.cov(dx, dy, bias=True)[0, 1] / np.var(dx))
            out[f'dev_slope_{nm}_vs_L_mean5'] = b
            out[f'dev_corr_{nm}_vs_L_mean5'] = float(np.corrcoef(dx, dy)[0, 1])
    return out


def compact(sm):
    """The per-season block: the headline numbers only (the pooled blocks keep everything)."""
    keep = ('n', 'crps', 'mean_y', 'mean_pred', 'pit_mean', 'cov50', 'cov80')
    out = {k: sm[k] for k in keep}
    for L in ('L_med', 'L_mean5'):
        if sm[L]:
            out[L] = {k: sm[L][k] for k in ('logloss', 'brier', 'refit_b', 'sep_ratio', 'mean_p', 'hit')}
    return out


def rnd(o, sig=5):
    if isinstance(o, float):
        return o if (o != o or o in (float('inf'), float('-inf')) or o == 0) else float(f'{o:.{sig}g}')
    if isinstance(o, dict): return {k: rnd(v, sig) for k, v in o.items()}
    if isinstance(o, (list, tuple)): return [rnd(v, sig) for v in o]
    if isinstance(o, (np.floating,)): return rnd(float(o), sig)
    if isinstance(o, (np.integer,)): return int(o)
    return o


def boot_diff(game, d, rng, nb=N_BOOT):
    """Mean of d with intervals from resampling games (legs of one game move together)."""
    codes, inv = np.unique(game, return_inverse=True)
    s = np.bincount(inv, weights=d); c = np.bincount(inv).astype(float)
    G = len(codes); est = s.sum() / c.sum()
    bs = np.empty(nb)
    for b in range(nb):
        w = np.bincount(rng.integers(0, G, G), minlength=G)
        bs[b] = (w * s).sum() / (w * c).sum()
    return dict(mean=float(est), se=float(bs.std(ddof=1)), ci90=[float(np.quantile(bs, .05)), float(np.quantile(bs, .95))],
                ci95=[float(np.quantile(bs, .025)), float(np.quantile(bs, .975))])


# --------------------------------------------------------------------------------------------------- main
def run_fit(args):
    t0 = time.time()
    df = load_table(Path(args.data) / 'features.parquet')
    FM, feat = load_cur()
    QS = np.array(FM['qs'])
    cache = Path(args.data) / 'yards_cache'; cache.mkdir(exist_ok=True)
    meta = dict(fit_rounds={}, featvec_check={}, timings={})
    for st, S in STATS.items():
        if args.stats and st not in args.stats: continue
        sub = df[df.grp.isin(S['groups'])].reset_index(drop=True)
        feats = [c for c in dict.fromkeys(GBM_FEATS[st]) if c in sub.columns]
        lfeats = [c for c in LIN_FEATS[st] if c in sub.columns]
        sub[feats] = sub[feats].astype(float)
        missing = [c for c in dict.fromkeys(GBM_FEATS[st] + LIN_FEATS[st]) if c not in sub.columns]
        if missing: print(f'[{st}] not in the table, left out: {missing}', flush=True)
        # cur's as-of state for every row of seasons 2019 on, once per group
        states = {}
        for g in S['groups']:
            rows = sub[(sub.grp == g) & (sub.season >= CUR_FROM)]
            states[g] = cur_state(feat, rows, g, S['cur'])
            # the check: on rows feat.pkl has, the rebuild equals featVec on feat.pkl
            fx = feat[feat.grp == g].reset_index(drop=True)
            prior0 = float(fx[S['cur']].mean())
            Xf = featvec_feat(fx, S['cur'], prior0)
            key = fx.player_id + '|' + fx.game_id
            rk = rows.pid + '|' + rows.game_id
            pos = pd.Series(np.arange(len(fx)), index=key.values)
            common = rk.isin(pos.index).values
            Xs = featvec_state(states[g], prior0)
            ii = pos.loc[rk.values[common]].values
            diff = np.abs(Xs[common] - Xf[ii])
            meta['featvec_check'][f'{st}:{g}'] = dict(rows_in_featpkl=int(common.sum()), rows_zero_or_other=int((~common).sum()),
                                                      max_abs_diff=float(diff.max()), ctx_missing=int(states[g].ctx_missing.sum()))
            print(f'[{st}:{g}] featVec rebuild check: {common.sum()} rows, max |diff| {diff.max():.2e}', flush=True)
        for s in TEST_SEASONS:
            if args.seasons and s not in args.seasons: continue
            ts = time.time()
            tr = sub[(sub.season >= TRAIN_FROM) & (sub.season < s)].reset_index(drop=True)
            te = sub[sub.season == s].reset_index(drop=True)
            assert tr.season.max() < s and te.season.min() == s
            out = pd.DataFrame({'pid': te.pid, 'game_id': te.game_id, 'grp': te.grp, 'season': te.season, 'week': te.week})
            tabs = {}
            # cur (walk-forward refit) and cur_ship (the shipped file)
            mu_c = np.zeros(len(te)); mu_s = np.zeros(len(te)); dist_c = {}; dist_s = {}
            for g in S['groups']:
                m = (te.grp == g).values
                fitc = cur_fit(feat, g, S['cur'], list(range(CUR_FROM, s)), QS)
                stt = states[g].loc[sub[(sub.grp == g) & (sub.season >= CUR_FROM)].index]
                stt = stt[(sub.loc[stt.index, 'season'] == s).values]
                Xc = featvec_state(stt, fitc['prior'])
                mu_c[m] = np.maximum(Xc @ np.array(fitc['coef']), 0)
                dist_c[g] = dict(edges=fitc['edges'], q=fitc['q'])
                sm = FM['model'][g][S['cur']]
                Xs = featvec_state(stt, FM['prior'][g][S['cur']], FM.get('k', 4.0))
                mu_s[m] = np.maximum(Xs @ np.array(sm['coef']), 0)
                dist_s[g] = FM['dist'][g][S['cur']]
                meta['fit_rounds'][f'{st}:{s}:cur:{g}'] = dict(prior=fitc['prior'], train_seasons=[CUR_FROM, s - 1])
            out['cur_mu'] = mu_c; out['cur_ship_mu'] = mu_s
            tabs['cur'] = dist_c; tabs['cur_ship'] = dist_s
            # qgbm
            P, info = fit_qgbm(tr, te, feats, S['y'])
            for j, tau in enumerate(TAUS): out[f'q_{j}'] = P['Q'][:, j]
            tabs['qgbm'] = dict(ymin=P['ymin'], ymax=P['ymax'], u_val=P['u_val'].tolist()); meta['fit_rounds'][f'{st}:{s}:qgbm'] = info
            if args.only == ['qgbm']:                    # refit the quantile grid alone, keep the rest of the cache
                old = pd.read_parquet(cache / f'{st}_{s}.parquet'); oldt = json.load(open(cache / f'{st}_{s}_tabs.json'))
                assert (old.pid.values == out.pid.values).all()
                for j in range(len(TAUS)): old[f'q_{j}'] = out[f'q_{j}'].values
                oldt['qgbm'] = tabs['qgbm']
                old.to_parquet(cache / f'{st}_{s}.parquet'); json.dump(oldt, open(cache / f'{st}_{s}_tabs.json', 'w'))
                meta['timings'][f'{st}:{s}:qgbm'] = round(time.time() - ts, 1)
                print(f'[{st} {s}] qgbm refitted in {time.time() - ts:.0f}s', flush=True)
                continue
            # tpgbm
            P, info = fit_tpgbm(tr, te, feats, S['y'], S['lo'])
            out['tpg_p0'], out['tpg_m'], out['tpg_s'] = P['p0'], P['m'], P['s']
            tabs['tpgbm'] = dict(neg=P['neg']); meta['fit_rounds'][f'{st}:{s}:tpgbm'] = info
            # tplin
            P, info = fit_tplin(tr, te, lfeats, S['y'], S['lo'])
            out['tpl_p0'], out['tpl_m'], out['tpl_s'] = P['p0'], P['m'], P['s']
            tabs['tplin'] = dict(neg=P['neg'])
            out.to_parquet(cache / f'{st}_{s}.parquet')
            json.dump(tabs, open(cache / f'{st}_{s}_tabs.json', 'w'))
            meta['timings'][f'{st}:{s}'] = round(time.time() - ts, 1)
            print(f'[{st} {s}] fitted in {time.time() - ts:.0f}s (train {len(tr)} rows {tr.season.min()}-{tr.season.max()}, test {len(te)})', flush=True)
        meta['n_features'] = meta.get('n_features', {}); meta['n_features'][st] = dict(gbm=len(feats), lin=len(lfeats))
    meta['total_fit_s'] = round(time.time() - t0, 1)
    old = cache / 'fit_meta.json'
    if old.exists():
        prev = json.load(open(old))
        for k, v in meta.items():
            if isinstance(v, dict): prev.setdefault(k, {}).update(v)
            else: prev[k] = v
        meta = prev
    json.dump(meta, open(old, 'w'), indent=1)


BASE_MODELS = ['cur', 'cur_ship', 'qgbm', 'tpgbm', 'tplin']
SUBGROUPS = ['all', 'book_like', 'starter', 'backup', 'rookie', 'promoted', 'starter_book', 'thin_hist']


def params_for(kind, o, tabs):
    if kind == 'cur': return dict(mu=o.cur_mu.values, dist=tabs['cur'])
    if kind == 'cur_ship': return dict(mu=o.cur_ship_mu.values, dist=tabs['cur_ship'])
    if kind in ('qgbm', 'qgbm_cal'): return dict(Q=o[[f'q_{j}' for j in range(len(TAUS))]].values, **tabs['qgbm'])
    if kind == 'tpgbm': return dict(p0=o.tpg_p0.values, m=o.tpg_m.values, s=o.tpg_s.values, neg=tabs['tpgbm']['neg'])
    if kind == 'tplin': return dict(p0=o.tpl_p0.values, m=o.tpl_m.values, s=o.tpl_s.values, neg=tabs['tplin']['neg'])


def run_score(args):
    df = load_table(Path(args.data) / 'features.parquet')
    FM = json.load(open(REPO / 'props/data/final_model.json')); QS = np.array(FM['qs'])
    cache = Path(args.data) / 'yards_cache'
    meta = json.load(open(cache / 'fit_meta.json')) if (cache / 'fit_meta.json').exists() else {}
    rng = np.random.default_rng(20261027)
    res = dict(meta=dict(
        rule='walk-forward: each test season fitted on seasons before it only; 2026 never read',
        test_seasons=TEST_SEASONS, train_from=dict(new=TRAIN_FROM, cur=CUR_FROM),
        eval_rows='played in role, 3+ earlier role games (the stand-in lines need them)',
        lines=dict(L_med='floor(median of last 5 role games) + 0.5', L_mean5='floor(mean of last 5 role games) + 0.5'),
        crps='sum over integer k of (F(k) - 1{y<=k})^2, k over each stat\'s range',
        subgroups=dict(book_like='trailing 5-game mean at or over a book-like floor ' + json.dumps(BOOK_THR),
                       starter='this week\'s chart rank within the starter slots ' + json.dumps(SLOTS),
                       backup='not a starter by that rule', rookie='x_rookie == 1',
                       promoted='a starter this week who was not one at his previous role game',
                       starter_book='starter and book-like', thin_hist='fewer than 8 career games before this one'),
        lgb_params=LGB_BASE, taus=TAUS, clip=CLIP, n_boot=N_BOOT,
        fit=meta), stats={})
    for st, S in STATS.items():
        if args.stats and st not in args.stats: continue
        K = np.arange(S['lo'], S['hi'] + 1)
        sub = df[df.grp.isin(S['groups'])].reset_index(drop=True)
        tabfiles = [cache / f'{st}_{s}_tabs.json' for s in TEST_SEASONS if (cache / f'{st}_{s}_tabs.json').exists()]
        has_cal = bool(tabfiles) and all('u_val' in json.load(open(f))['qgbm'] for f in tabfiles)
        MODELS = BASE_MODELS + (['qgbm_cal'] if has_cal else [])
        pooled = {m: {g: [] for g in SUBGROUPS} for m in MODELS}
        by_season = {}
        diffs_src = {g: [] for g in SUBGROUPS}
        allrows_crps = {m: [] for m in MODELS}
        for s in TEST_SEASONS:
            f = cache / f'{st}_{s}.parquet'
            if not f.exists(): continue
            o = pd.read_parquet(f); tabs = json.load(open(cache / f'{st}_{s}_tabs.json'))
            te = sub[sub.season == s].reset_index(drop=True)
            assert (te.pid.values == o.pid.values).all() and (te.game_id.values == o.game_id.values).all()
            y = te[S['y']].values.astype(float); grp = te.grp.values
            Lmed = np.floor(te[f'tr_med_{st}'].values) + 0.5; Lmean = np.floor(te[f'tr_mean_{st}'].values) + 0.5
            ev = (te.n_prev.values >= 3) & np.isfinite(Lmed) & np.isfinite(Lmean)
            thr = np.array([BOOK_THR[st].get(g, np.inf) for g in grp])
            book = ev & (te[f'tr_mean_{st}'].values >= thr)
            masks = dict(all=ev, book_like=book, starter=ev & te.starter.values, backup=ev & ~te.starter.values,
                         rookie=ev & (te.x_rookie.fillna(0).values == 1), promoted=ev & te.promoted.values,
                         starter_book=book & te.starter.values, thin_hist=ev & (te.x_gp_car.fillna(0).values < 8))
            by_season[s] = {}
            blocks = {}
            for kind in MODELS:
                F = cdf_grid(kind, params_for(kind, o, tabs), grp, K, QS)
                crps, u, meanp, medp, pm, pl = score_block(F, K, y, np.nan_to_num(Lmed), np.nan_to_num(Lmean), rng)
                blocks[kind] = (crps, u, meanp, medp, pm, pl)
                allrows_crps[kind].append(crps)
                by_season[s][kind] = {}
                for g, mk in masks.items():
                    if mk.sum() == 0: continue
                    pooled[kind][g].append(dict(crps=crps[mk], u=u[mk], meanp=meanp[mk], medp=medp[mk], pm=pm[mk], pl=pl[mk],
                                                y=y[mk], Lmed=Lmed[mk], Lmean=Lmean[mk], game=te.game_id.values[mk]))
                    if g in ('all', 'book_like', 'starter_book', 'promoted'):
                        by_season[s][kind][g] = compact(summarize(None, crps[mk], u[mk], meanp[mk], medp[mk], pm[mk], pl[mk],
                                                                  y[mk], Lmed[mk], Lmean[mk]))
            print(f'[{st} {s}] scored {ev.sum()} eval rows of {len(te)}', flush=True)
        R = dict(pooled={}, by_season=by_season, diffs={}, crps_all_role_rows={})
        for kind in MODELS:
            R['pooled'][kind] = {}
            for g in SUBGROUPS:
                L = pooled[kind][g]
                if not L: continue
                cat = {k: np.concatenate([d[k] for d in L]) for k in L[0]}
                sm = summarize(None, cat['crps'], cat['u'], cat['meanp'], cat['medp'], cat['pm'], cat['pl'],
                               cat['y'], cat['Lmed'], cat['Lmean'])
                if g not in ('all', 'book_like', 'starter_book'):       # reliability tables only where they are read
                    for L in ('L_med', 'L_mean5'):
                        if sm[L]: sm[L].pop('reliability', None)
                R['pooled'][kind][g] = sm
            if allrows_crps[kind]:
                R['crps_all_role_rows'][kind] = float(np.mean(np.concatenate(allrows_crps[kind])))
        # paired differences against cur, by game
        for g in SUBGROUPS:
            if not pooled['cur'][g]: continue
            base = {k: np.concatenate([d[k] for d in pooled['cur'][g]]) for k in ('crps', 'pm', 'pl', 'y', 'Lmed', 'Lmean', 'game')}
            ym = (base['y'] > base['Lmed']).astype(float); yl = (base['y'] > base['Lmean']).astype(float)
            def ll(p, yy):
                p = np.clip(p, *CLIP); return -(yy * np.log(p) + (1 - yy) * np.log(1 - p))
            R['diffs'][g] = {}
            for kind in MODELS:
                if kind == 'cur': continue
                c = {k: np.concatenate([d[k] for d in pooled[kind][g]]) for k in ('crps', 'pm', 'pl')}
                R['diffs'][g][kind] = dict(
                    crps=boot_diff(base['game'], c['crps'] - base['crps'], rng),
                    crps_skill_vs_cur=float(1 - c['crps'].mean() / base['crps'].mean()),
                    logloss_L_med=boot_diff(base['game'], ll(c['pm'], ym) - ll(base['pm'], ym), rng),
                    logloss_L_mean5=boot_diff(base['game'], ll(c['pl'], yl) - ll(base['pl'], yl), rng))
            # every model against a coin at the lines, for scale
            R['diffs'][g]['coin_vs_cur'] = dict(
                logloss_L_med=boot_diff(base['game'], math.log(2) - ll(base['pm'], ym), rng),
                logloss_L_mean5=boot_diff(base['game'], math.log(2) - ll(base['pl'], yl), rng))
        res['stats'][st] = R
    # the headline: per stat and pooled, which candidate has the lowest CRPS on all eval rows
    head = {}
    for st, R in res['stats'].items():
        P = R['pooled']
        a = {k: v['all']['crps'] for k, v in P.items() if 'all' in v}
        sb = {k: v['starter_book']['crps'] for k, v in P.items() if 'starter_book' in v}
        head[st] = dict(crps_all=a, crps_starter_book=sb,
                        lowest_crps_all=min((k for k in a if k != 'cur_ship'), key=a.get),
                        lowest_crps_starter_book=min((k for k in sb if k != 'cur_ship'), key=sb.get),
                        starter_book_calibration={k: dict(pit_mean=v['starter_book']['pit_mean'], cov50=v['starter_book']['cov50'],
                                                          cov80=v['starter_book']['cov80'],
                                                          p_over_L_mean5=v['starter_book']['L_mean5']['mean_p'],
                                                          hit_L_mean5=v['starter_book']['L_mean5']['hit'],
                                                          refit_slope_L_mean5=v['starter_book']['L_mean5']['refit_b'])
                                                  for k, v in P.items() if 'starter_book' in v})
    res['headline'] = head
    res['verdict'] = ('qgbm (the LightGBM quantile grid) is the candidate: lowest pooled CRPS of the four candidates on every '
                      'stat, on all rows and on book-like starters, and better than cur in every stat-season on all rows (on '
                      'book-like starters in 18 of 20, level in 2 of them). qgbm_cal is reported, not chosen: its recalibration, fitted on '
                      'every row of season s-1, leans the book-like starters 2-5 points toward the under. These are stand-in '
                      'lines, not DraftKings\'; the frozen 2026 test decides.')
    RESULTS.mkdir(exist_ok=True)
    out = RESULTS / 'yards_walkforward.json'
    if args.stats and out.exists():                       # a partial run updates only its stats
        prev = json.load(open(out)); prev['stats'].update(res['stats']); prev['headline'].update(res['headline']); prev['meta'] = res['meta']; res = prev
    with open(out, 'w') as fh:                          # one line per stat block's entry, small on disk
        json.dump(rnd(res), fh, separators=(',', ':'), default=float)
    print('wrote', out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'))
    ap.add_argument('--score-only', action='store_true')
    ap.add_argument('--fit-only', action='store_true')
    ap.add_argument('--stats', nargs='*')
    ap.add_argument('--seasons', nargs='*', type=int)
    ap.add_argument('--only', nargs='*', help='refit only these models into the existing cache (qgbm)')
    args = ap.parse_args()
    if not args.data: sys.exit('--data DIR (or $PROPMODEL_DATA) is required')
    if not args.score_only: run_fit(args)
    if not args.fit_only: run_score(args)


if __name__ == '__main__':
    main()
