"""A quarterback's anytime touchdown: the model, its test, its prior, touch rate and correlations.

DraftKings prices a quarterback's anytime touchdown (his own rushing or receiving touchdown; a pass he
throws does not count), and oddsfetch.py already pulls those prices, but the prop model had no QB any_td
leg: MARKETS gave Anytime TD to RB, WR and TE only. This script makes the numbers that leg needs, from
raw/feat.pkl (research/features.py's table, whose any_td is rushing_tds + receiving_tds >= 1 for every
row, quarterbacks included) and raw/games.csv, the same way the shipped any_td numbers were made.

The method, recovered. fit4.py is not in the repo, so its method was recovered from its own output: a
logistic regression on featVec's 15 numbers (e5, e3, car, py, oaz, tvol, ddef, imp, home, sprd, |sprd|,
e5*oaz, e5*imp, e5*tvol; car and py shrunk to the 2019-2024 group mean by k=4 games), on the group's
2019-2024 rows with at least two earlier games (gp_prior >= 2), with an L2 penalty of 3 on every
coefficient but the intercept (sklearn's C=1/3). Refitting RB, WR and TE any_td that way gives the shipped
coefficients to within 0.013, 0.015 and 0.018 at worst (rms difference in the logit 0.0095, 0.0032,
0.0127; in the chance 0.0016, 0.0006, 0.0016), and of gp_prior >= 1, 2, 3 and penalties 0-6 that is the
closest for all three (the linear models land at about 2 on the same rows: "ridge"). Every shipped prior
is the group's plain mean over its 2019-2024 rows, exactly, and tdrate.json's RB, WR and TE rates are the
group's 2019-2024 rushing TDs per carry and receiving TDs per reception over every row, exactly.

The QB fit. The same method, on the rows the page serves. The page offers a quarterback's touchdown to one
quarterback a club, the depth chart's QB1 (part2.js DEPTH.QB = 1), and featVec has no feature for a role, so
the fit is on each club's starter judged before the game (pregame_starter: of the club's quarterbacks with a
row in the game, the most pass attempts over his recent games, e5_attempts, with two or more earlier games):
3,045 rows of 2019-2024, rate 0.1609. A fit on every quarterback row (3,534, the backs' way; the first fit,
before review) splits the difference between them and the backups' relief and kneel-down rows, which score
1-5% where the starters score 14-17%: walk-forward on the starters it said 14.7% where they scored 15.6%
(2022-2025 each 0.7-2.0 points low), and 12-14% on backups who scored 1-5%. The starter fit says 15.5%, and on
2025's starters 15.4% against 15.5%. prior.QB.any_td = 0.14053, the 2019-2024 mean over every QB row, as
every shipped prior is: it is only the shrinkage target of car and py, so it is kept to the shipped
definition, and the intercept takes the starters' level. tdrate.QB = {rush 0.04698: 606 rushing TDs on
12,899 carries; rec 0.23684: 9 on 38 receptions}, measured as the others were, over every row; rec is never
used, since QB has no receptions model (mr = 0), so the cap is expected carries x 0.04698 x tdmult (1.5).

The rule: ship the 2019-2024 fit, as the page would run it (capped by touches), if on 2025 it beats the
league's rate on both log loss and Brier. It was stated before 2025 was looked at, on every row; review found
the rows were not the page's, and it is applied here unchanged to the starters (their 2019-2024 rate, 0.1609,
the baseline). On 2025's 537 starter rows (rate 0.155), log loss / Brier:
    league starter rate     0.43069 / 0.13071
    shrunk career rate      0.40345 / 0.12167   (the car feature, as a chance)
    model, uncapped         0.40374 / 0.12291
    model, capped           0.40182 / 0.12232   <- the page's number: passes, SHIP
    all-rows fit, capped    0.40289 / 0.12276   (said 14.3% where they scored 15.5%)
Every 2025 row (634, backups in): capped 0.37505 / 0.11174 against the league rate's 0.39994 / 0.11840.
Calibration of the capped chance by decile on 2025's starters (predicted, observed): .081 .056 | .094 .074 |
.103 .074 | .113 .111 | .123 .111 | .137 .167 | .153 .111 | .175 .208 | .216 .245 | .347 .396 (54 rows a
decile: a little flat at both ends, the top one held down by the cap). Walk-forward on the starters, each
season fitted on 2019 to the season before (prior, starter rate and touch rate from those seasons too),
scored / said by the capped model (all-rows fit), then log loss capped model vs starter rate / career:
    2021 .140 / .163 (.157)  .3937 vs .4087 / .3970     2022 .156 / .147 (.140)  .4221 vs .4331 / .4243
    2023 .166 / .157 (.149)  .4025 vs .4492 / .4077     2024 .165 / .154 (.145)  .4122 vs .4476 / .4090
    2025 .155 / .154 (.143)  .4018 vs .4307 / .4035
Mean: scored .156, said .155 (all-rows fit .147); log loss .4065 against the starter rate's .4339 and the
career rate's .4083; Brier .1234 against .1320 and .1232. It beats the league rate every season by a wide
margin and is level with the player's own shrunk career rate (a little better on log loss, a hair worse on
Brier): most of what it knows is his own rate, which any per-player rate would know too; what it adds is the
game (the spread, the implied total, the opponent), which the same-game pricing needs. (The cap in the
walk-forward uses the shipped carries model, fitted on 2019-2024, so the capped rows before 2025 are not
wholly out of sample; the uncapped model and the baselines are.) The cap binds on about one starter row in
five and it is the league's touch rate: it holds the quarterbacks who score near the goal line on their own
carries well under what they do (Josh Allen, 2026: 60% said, capped to 40-43%, at a book's 57-58%) and helps
on the pocket passers the model overrates (2025's bound starter rows: 24% said, 20% capped, 13% scored). That
is a known understatement for Allen, not a reason to drop the cap; a per-player touch rate would be its own
change, tested walk-forward.

Correlations. TOTAL_RHO's comment says how it was made; this reproduces it: each starter's miss (the
stat against his e5, his last five games weighted) against the total's miss (the final's points against
the posted total), normal scores (average ranks), 2019-2024, starters by that game's usage (the leading
passer, the two leading rushers, three leading receivers and the leading tight end by targets, the
kicker). All 17 entries come back to within 0.014 (rms 0.007; they are kept to two decimals). QB:any_td:
0.0898, so 0.09. corr.json's method (corr.py) is not recoverable exactly: the same normal-score
correlation of misses over starters with at least two earlier games (two tight ends a club, so tight-end
pairs exist) gives its 329 entries to rms 0.033 (self 0.048, team 0.033, opp 0.026), its 64 any_td entries
without a kicker to rms 0.024 (mean -0.004), its 156 QB entries without a kicker to rms 0.026, but the
kickers' self pairs come out 0.12 high and two backs' teammate pairs come out near zero where corr.json
has them negative. Examples (shipped, reproduced): self RB any_td-rushing_yards .309 .313, RB any_td-carries
.289 .292, team QB passing_tds-WR any_td .323 .327, QB passing_tds-TE any_td .246 .244, self QB
carries-rushing_yards .588 .604. The QB:any_td entries that method gives, |r| >= 0.03 as corr.json keeps:
self with carries .226, rushing_yards .181, passing_yards .072, completions .035, passing_tds -.075 (a
touchdown he runs in is one he does not throw); team with RB carries .053, rushing_yards .044, scrim_yards
.036, K fg_att -.062, fg_made -.063, WR any_td -.046, WR targets -.033; nothing with the other side's
players reaches 0.03.

2026, for information only (nothing above was chosen on it; --raw2026 rebuilds the table through the
season in play with features.py itself, 2019-2025 coming out as feat.pkl has them): DraftKings' 126 QB
anytime-TD prices of weeks 1-5 on a quarterback who played imply 17.7% on average with the margin in; the
capped model says 15.6%; 19 scored. Brier: the price 0.1193, the model 0.1220. Allen at -135 to -140
(57-58%, margin in) is capped to 40-43% (model 58-61%) and scored all three; Hurts at +145 to +195 (34-41%)
the model has at 19-35%.

Run from anywhere:
    python3 props/research/qb_td.py --out results.json          # the study (about 45 seconds)
    python3 props/research/qb_td.py --raw2026 DIR --out ...     # plus the 2026 information
    python3 props/research/qb_td.py --write [--data DIR]        # merge the new QB entries into data/
--write adds only model.QB.any_td, prior.QB.any_td, tdrate.QB and the QB:any_td correlations, asserts
every entry already there comes out unchanged, refuses to change a QB entry already holding another
value, and writes each file in its own style (json.dumps defaults, corr.json's keys kept sorted).
"""
import argparse, copy, json, os, sys, tempfile
from statistics import NormalDist
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '..', 'raw')
DATA = os.path.join(HERE, '..', 'data')

FIT = (2019, 2024)        # the seasons final_model.json was fitted on
TEST = 2025               # the one season held out, as fit4.py held it
LAM = 3.0                 # the L2 penalty recovered below (intercept free)
MIN_GP = 2                # rows with at least two earlier games, as recovered below
WF = range(2021, 2026)    # walk-forward test seasons, each fitted on 2019..s-1

VOLMAP = {'attempts': 't_pass_att', 'completions': 't_pass_att', 'passing_yards': 't_pass_yds', 'passing_tds': 't_tds',
          'passing_interceptions': 't_pass_att', 'carries': 't_carries', 'rushing_yards': 't_rush_yds',
          'receptions': 't_targets', 'targets': 't_targets', 'receiving_yards': 't_pass_yds', 'scrim_yards': 't_plays',
          'any_td': 't_tds', 'fg_att': 't_fg_att', 'fg_made': 't_fg_att', 'kick_pts': 't_pat_att'}
DEFMAP = {'attempts': 'd_pass_att', 'completions': 'd_pass_att', 'passing_yards': 'd_pass_yds', 'passing_tds': 'd_tds',
          'passing_interceptions': 'd_pass_att', 'carries': 'd_carries', 'rushing_yards': 'd_rush_yds',
          'receptions': 'd_pass_att', 'targets': 'd_pass_att', 'receiving_yards': 'd_pass_yds', 'scrim_yards': 'd_rush_yds',
          'any_td': 'd_tds', 'fg_att': 'd_pass_yds', 'fg_made': 'd_pass_yds', 'kick_pts': 'd_tds'}
# the stats each group is offered on (part2.js MARKETS), which is what corr.json pairs; QB:any_td is the new one
MKT = {'QB': ['attempts', 'completions', 'passing_yards', 'passing_tds', 'passing_interceptions', 'carries', 'rushing_yards', 'any_td'],
       'RB': ['carries', 'rushing_yards', 'receptions', 'receiving_yards', 'scrim_yards', 'any_td'],
       'WR': ['targets', 'receptions', 'receiving_yards', 'any_td'],
       'TE': ['targets', 'receptions', 'receiving_yards', 'any_td'],
       'K': ['fg_att', 'fg_made', 'kick_pts']}
USAGE = {'QB': 'attempts', 'RB': 'carries', 'WR': 'targets', 'TE': 'targets', 'K': 'fg_att'}
NEW = 'QB:any_td'


def load_feat(path):
    d = pd.read_pickle(path)
    return d.sort_values(['player_id', 'season', 'week']).reset_index(drop=True)


# ---------------------------------------------------------------- features: part2.js featVec on the table
def featvec(x, stat, prior, ks):
    """The 15 numbers featVec builds, for every row of one group (x sorted by player, season, week).

    e5, e3: the table's ewm of the player's earlier games (span 5, 3); car: his career rate before the
    game, shrunk to the position mean by ks games; py: last season's rate, shrunk the same way; oaz,
    tvol, ddef: the opponent's allowed-to-this-group, the team's volume and the opponent's defence on
    the stat's columns (VOLMAP, DEFMAP); imp, home, sprd, |sprd|; e5*oaz, e5*imp, e5*tvol."""
    x = x.reset_index(drop=True)
    n = x.gp_prior.values.astype(float)
    csum = (x.groupby('player_id')[stat].cumsum() - x[stat]).values
    car = (csum + ks * prior) / (n + ks)
    ps = x.groupby(['player_id', 'season'])[stat].agg(['mean', 'count']).reset_index()
    ps['season'] += 1
    m = x[['player_id', 'season']].merge(ps, on=['player_id', 'season'], how='left')
    pm, pn = m['mean'].fillna(0).values, m['count'].fillna(0).values
    py = (pm * pn + ks * prior) / (pn + ks)
    e5 = x['e5_' + stat].fillna(0).values
    e3 = x['e3_' + stat].fillna(0).values
    oaz = x['oaz_' + stat].values
    tvol = x['tez_' + VOLMAP[stat]].values
    ddef = x['dez_' + DEFMAP[stat]].values
    imp, home, sprd, absp = x.imp_z.values, x.home.values, x.sprd.values, x.abs_sprd.values
    X = np.column_stack([np.ones(len(x)), e5, e3, car, py, oaz, tvol, ddef, imp, home, sprd, absp,
                         e5 * oaz, e5 * imp, e5 * tvol])
    return X, car


def fitlog(X, y, lam=LAM):
    """Logistic regression with an L2 penalty lam on every coefficient but the intercept (Newton)."""
    b = np.zeros(X.shape[1])
    P = np.eye(X.shape[1]) * lam
    P[0, 0] = 0
    for _ in range(100):
        p = 1 / (1 + np.exp(-X @ b))
        step = np.linalg.solve(X.T @ (X * (p * (1 - p))[:, None]) + P, X.T @ (y - p) - P @ b)
        b += step
        if np.abs(step).max() < 1e-12:
            break
    return b


sig = lambda z: 1 / (1 + np.exp(-z))
def logloss(p, y):
    p = np.clip(p, 1e-9, 1 - 1e-9)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
def brier(p, y): return float(np.mean((p - y) ** 2))
def scores(p, y): return {'logloss': round(logloss(p, y), 5), 'brier': round(brier(p, y), 5), 'mean_p': round(float(np.mean(p)), 4)}


# ---------------------------------------------------------------- normal-score correlations
_inv = np.vectorize(NormalDist().inv_cdf)
def nscore(v):
    r = pd.Series(v).rank(method='average').values
    return _inv((r - 0.5) / len(v))
def nscorr(a, b):
    ok = ~(np.isnan(a) | np.isnan(b))
    return float(np.corrcoef(nscore(a[ok]), nscore(b[ok]))[0, 1])


def pregame_starter(q):
    """Each club's starting quarterback in each game, judged before it, as the page picks the one quarterback
    it offers (the depth chart's QB1): of the club's quarterbacks with a row in the game, the one with the most
    pass attempts over his recent games (e5_attempts, the table's weighted average of his earlier games), and
    only with MIN_GP or more earlier games, as every fitted row has. Nothing from the game itself decides it."""
    rk = q.e5_attempts.fillna(-1).groupby([q.game_id, q.team]).rank(ascending=False, method='first')
    return ((rk == 1) & (q.gp_prior >= MIN_GP)).values


def starters(d, n, min_gp):
    """Each club's starters in each game, by that game's usage: QB1 by attempts, the top n[RB] backs by
    carries, n[WR] receivers and n[TE] tight ends by targets, the kicker; rows with min_gp earlier games."""
    out = []
    for g, u in USAGE.items():
        x = d[d.grp == g].copy()
        x['rk'] = x.groupby(['game_id', 'team'])[u].rank(ascending=False, method='first')
        out.append(x[(x.rk <= n.get(g, 1)) & (x.gp_prior >= min_gp)])
    s = pd.concat(out).reset_index(drop=True)
    for g, sts in MKT.items():
        for st in sts:   # a stat's miss: the game against his last five games, weighted (e5)
            s.loc[s.grp == g, 'r_' + st] = (s[st] - s['e5_' + st].fillna(0))[s.grp == g]
    return s


def pair_corr(s, rel, ka, kb, pairs):
    ga, sa = ka.split(':'); gb, sb = kb.split(':')
    if rel == 'self':
        x = s[s.grp == ga]
        return nscorr(x['r_' + sa].values, x['r_' + sb].values)
    same = (pairs.team_a == pairs.team_b) if rel == 'team' else (pairs.team_a != pairs.team_b)
    p1 = pairs[same & (pairs.grp_a == ga) & (pairs.grp_b == gb)]
    p2 = pairs[same & (pairs.grp_a == gb) & (pairs.grp_b == ga)]
    ia = np.concatenate([p1.uid_a.values, p2.uid_b.values])
    ib = np.concatenate([p1.uid_b.values, p2.uid_a.values])
    ra, rb = s['r_' + sa].values[ia], s['r_' + sb].values[ib]
    if ga == gb and sa != sb:   # two players of one group: each takes either stat
        ra = np.concatenate([ra, s['r_' + sa].values[ib]]); rb = np.concatenate([rb, s['r_' + sb].values[ia]])
    if len(ra) < 30:
        return float('nan')
    return nscorr(ra, rb)


def all_pairs(s):
    s = s.copy(); s['uid'] = np.arange(len(s))
    base = s[['uid', 'game_id', 'team', 'grp']]
    pr = base.merge(base, on='game_id', suffixes=('_a', '_b'))
    return pr[pr.uid_a < pr.uid_b]


def corr_key(rel, a, b):
    k1, k2 = sorted([a, b])   # the same order legRho takes (ka<kb as strings)
    return f'{rel}|{k1}|{k2}'


# ---------------------------------------------------------------- the study
def run(args):
    FM = json.load(open(os.path.join(args.data, 'final_model.json')))
    TDR = json.load(open(os.path.join(args.data, 'tdrate.json')))
    CORR = json.load(open(os.path.join(args.data, 'corr.json')))
    try:
        TDMULT = float(json.load(open(os.path.join(args.data, 'payload.json'))).get('tdmult') or 1.5)
    except Exception:
        TDMULT = 1.5
    ks = float(FM['k'])
    d = load_feat(args.feat)
    fit_rows = d.season.between(*FIT)
    out = {'notes': [], 'test': {}}
    log = lambda *a: print(*a, flush=True)

    # 1. the method fit4.py used, recovered from the shipped any_td logits ---------------------------
    # the priors first: each group's mean of the stat over its 2019-2024 rows, every row the table has
    worst = 0.0
    for g, sts in FM['prior'].items():
        for st, v in sts.items():
            worst = max(worst, abs(d[fit_rows & (d.grp == g)][st].mean() - v))
    assert worst < 1e-9, f'priors do not reproduce ({worst})'
    log(f'priors: every shipped prior reproduced as the 2019-2024 group mean (max diff {worst:.1e})')
    rep = {}
    for g in ['RB', 'WR', 'TE']:
        x = d[(d.grp == g)].reset_index(drop=True)
        X, _ = featvec(x, 'any_td', FM['prior'][g]['any_td'], ks)
        y = x.any_td.values
        ship = np.array(FM['model'][g]['any_td']['coef'])
        r = {'scan': {}}
        for gp in [1, 2, 3]:
            for lam in [0, 1, 2, 3, 4, 6]:
                m = (x.season.between(*FIT) & (x.gp_prior >= gp)).values
                b = fitlog(X[m], y[m], lam)
                zs, zb = X[m] @ ship, X[m] @ b
                r['scan'][f'gp>={gp} lam={lam}'] = round(float(np.sqrt(np.mean((zb - zs) ** 2))), 4)
                if gp == MIN_GP and lam == LAM:
                    r['rows'] = int(m.sum())
                    r['max_coef_diff'] = round(float(np.abs(b - ship).max()), 4)
                    r['rms_logit_diff'] = round(float(np.sqrt(np.mean((zb - zs) ** 2))), 4)
                    r['rms_prob_diff'] = round(float(np.sqrt(np.mean((sig(zb) - sig(zs)) ** 2))), 5)
                    r['max_prob_diff'] = round(float(np.abs(sig(zb) - sig(zs)).max()), 4)
                    r['refit'] = [round(float(c), 4) for c in b]
        best = min(r['scan'], key=r['scan'].get)
        r['best_in_scan'] = best
        rep[g] = r
        log(f'{g} any_td refit (gp>={MIN_GP}, L2 {LAM}): {r["rows"]} rows, max coef diff {r["max_coef_diff"]}, '
            f'rms logit diff {r["rms_logit_diff"]}, rms prob diff {r["rms_prob_diff"]}; best of the scan: {best}')
    out['method'] = {'rows': f'2019-2024 rows of the group with gp_prior >= {MIN_GP}', 'penalty': f'L2 {LAM} on all but the intercept (sklearn C=1/{LAM:g})',
                     'reproduction': rep}

    # 2. QB any_td --------------------------------------------------------------------------------------
    q = d[d.grp == 'QB'].reset_index(drop=True)
    yq = q.any_td.values
    prior = float(q[q.season.between(*FIT)].any_td.mean())
    out['prior'] = prior
    # touchdowns per touch, the way tdrate.json was measured: the group's 2019-2024 TDs over its carries
    # and receptions, every row
    def tdrate(rows):
        return {'rush': float(rows.rushing_tds.sum() / rows.carries.sum()), 'rec': float(rows.receiving_tds.sum() / rows.receptions.sum())}
    for g in ['RB', 'WR', 'TE']:
        t = tdrate(d[fit_rows & (d.grp == g)])
        assert abs(t['rush'] - TDR[g]['rush']) < 1e-12 and abs(t['rec'] - TDR[g]['rec']) < 1e-12, g
    tq_rows = q[q.season.between(*FIT)]
    tq = tdrate(tq_rows)
    out['tdrate_qb'] = tq
    out['tdrate_counts'] = {'carries': int(tq_rows.carries.sum()), 'rushing_tds': int(tq_rows.rushing_tds.sum()),
                            'receptions': int(tq_rows.receptions.sum()), 'receiving_tds': int(tq_rows.receiving_tds.sum())}
    log(f'tdrate: RB/WR/TE reproduced exactly; QB rush {tq["rush"]:.5f} ({out["tdrate_counts"]["rushing_tds"]} TDs on '
        f'{out["tdrate_counts"]["carries"]} carries), rec {tq["rec"]:.5f} ({out["tdrate_counts"]["receiving_tds"]} on '
        f'{out["tdrate_counts"]["receptions"]} receptions; unused: QB has no receptions model, mr = 0)')

    X, car = featvec(q, 'any_td', prior, ks)
    Xc, _ = featvec(q, 'carries', FM['prior']['QB']['carries'], ks)
    mc = np.maximum(Xc @ np.array(FM['model']['QB']['carries']['coef']), 0)    # project()'s carries
    def capped(p, rush): return np.minimum(p, 1 - np.exp(-mc * rush * TDMULT))
    # the rows the page serves: each club's starter, judged before the game (pregame_starter). The backups'
    # rows (relief, mop-up, kneel-downs) score 1-5% where the starters score 14-17%, and featVec has no
    # role feature, so a fit on every row reads the starters low; the fit and every test are on starters.
    st = pregame_starter(q)
    tr = (q.season.between(*FIT).values & st)
    te = ((q.season == TEST).values & st)
    base = float(yq[tr].mean())               # the league's starter rate, 2019-2024: the baseline
    b = fitlog(X[tr], yq[tr])
    out['coef'] = [float(c) for c in b]
    out['starter_rate'] = base
    p = sig(X @ b)
    pc = capped(p, tq['rush'])
    # the same method on every row (the first fit, before the review): kept only to show what it did
    tr_all = (q.season.between(*FIT) & (q.gp_prior >= MIN_GP)).values
    p_all = sig(X @ fitlog(X[tr_all], yq[tr_all]))
    pc_all = capped(p_all, tq['rush'])
    q['rk'] = q.groupby(['game_id', 'team']).attempts.rank(ascending=False, method='first')
    qb1 = (q.rk == 1).values                  # in-game leader in attempts: hindsight, for comparison only
    def block(m, b0):
        return {'rows': int(m.sum()), 'rate': round(float(yq[m].mean()), 4),
                'base_rate': scores(np.full(m.sum(), b0), yq[m]), 'career_shrunk': scores(car[m], yq[m]),
                'model': scores(p[m], yq[m]), 'model_capped': scores(pc[m], yq[m]),
                'all_rows_fit_capped': scores(pc_all[m], yq[m]),
                'cap_binds': round(float(np.mean(pc[m] < p[m])), 4)}
    allte = ((q.season == TEST) & (q.gp_prior >= MIN_GP)).values
    out['test'][f'{TEST}_starters'] = block(te, base)
    out['test'][f'{TEST}_backups'] = block(allte & ~st, prior)
    out['test'][f'{TEST}_all'] = block(allte, prior)
    out['test'][f'{TEST}_qb1_in_game'] = block(allte & qb1, base)
    out['test']['fit_rows'] = int(tr.sum())
    # calibration by decile of the capped chance (the number the page would show), on the starters
    cal = []
    pt, yt = pc[te], yq[te]
    order = np.argsort(pt, kind='stable')
    for chunk in np.array_split(order, 10):
        cal.append({'n': int(len(chunk)), 'pred': round(float(pt[chunk].mean()), 4), 'obs': round(float(yt[chunk].mean()), 4)})
    out['test']['calibration_deciles'] = cal
    bind = te & (pc < p)
    out['test']['cap_bound_rows'] = {'n': int(bind.sum()), 'model': round(float(p[bind].mean()), 4) if bind.any() else None,
                                     'capped': round(float(pc[bind].mean()), 4) if bind.any() else None,
                                     'obs': round(float(yq[bind].mean()), 4) if bind.any() else None,
                                     'players': q[bind].player_display_name.value_counts().head(8).to_dict()}
    log(f'fit: {int(tr.sum())} starter rows of 2019-2024 (rate {base:.4f})')
    for k in [f'{TEST}_starters', f'{TEST}_backups', f'{TEST}_all', f'{TEST}_qb1_in_game']:
        t = out['test'][k]
        log(f'{k}: {t["rows"]} rows, rate {t["rate"]}, said {t["model_capped"]["mean_p"]} (all-rows fit {t["all_rows_fit_capped"]["mean_p"]}); '
            f'logloss/brier base {t["base_rate"]["logloss"]}/{t["base_rate"]["brier"]}, '
            f'career {t["career_shrunk"]["logloss"]}/{t["career_shrunk"]["brier"]}, model {t["model"]["logloss"]}/{t["model"]["brier"]}, '
            f'capped {t["model_capped"]["logloss"]}/{t["model_capped"]["brier"]}, all-rows fit capped '
            f'{t["all_rows_fit_capped"]["logloss"]}/{t["all_rows_fit_capped"]["brier"]}; cap binds {t["cap_binds"]}')
    log('calibration (capped, starters, deciles):', [(c['pred'], c['obs']) for c in cal])
    log('cap-bound rows:', out['test']['cap_bound_rows'])

    # the decision: ship the 2019-2024 fit, as the page would run it (capped), if on 2025's starters it
    # beats the league's starter rate on both log loss and Brier
    t = out['test'][f'{TEST}_starters']
    passed = t['model_capped']['logloss'] < t['base_rate']['logloss'] and t['model_capped']['brier'] < t['base_rate']['brier']
    out['decision'] = ('SHIP: the 2019-2024 starter fit beats the league starter rate on 2025\'s starters on log loss and Brier' if passed else
                       'DO NOT SHIP the fit: it does not beat the league starter rate on 2025\'s starters on both log loss and Brier')
    log(out['decision'])

    # walk-forward on the starters: each season fitted on 2019..s-1, its prior, starter rate and touchdown
    # rate from those seasons; the all-rows fit beside it, to show its level
    wf = {}
    for s in WF:
        trs = q.season.between(FIT[0], s - 1)
        pr_s = float(q[trs].any_td.mean())
        Xs, cars = featvec(q, 'any_td', pr_s, ks)
        mtr = trs.values & st
        mte = (q.season == s).values & st
        bs = fitlog(Xs[mtr], yq[mtr])
        ps = sig(Xs @ bs)
        rush_s = float(q[trs].rushing_tds.sum() / q[trs].carries.sum())
        pcs = capped(ps, rush_s)
        mall = (trs & (q.gp_prior >= MIN_GP)).values
        pcs_all = capped(sig(Xs @ fitlog(Xs[mall], yq[mall])), rush_s)
        b_s = float(yq[mtr].mean())
        wf[str(s)] = {'rows': int(mte.sum()), 'rate': round(float(yq[mte].mean()), 4),
                      'base_rate': scores(np.full(mte.sum(), b_s), yq[mte]),
                      'career_shrunk': scores(cars[mte], yq[mte]), 'model': scores(ps[mte], yq[mte]),
                      'model_capped': scores(pcs[mte], yq[mte]), 'all_rows_fit_capped': scores(pcs_all[mte], yq[mte])}
        w = wf[str(s)]
        log(f'walk-forward {s}: {w["rows"]} starter rows, rate {w["rate"]}, said {w["model_capped"]["mean_p"]} '
            f'(all-rows fit {w["all_rows_fit_capped"]["mean_p"]}); logloss/brier base {w["base_rate"]["logloss"]}/{w["base_rate"]["brier"]}, '
            f'career {w["career_shrunk"]["logloss"]}/{w["career_shrunk"]["brier"]}, model {w["model"]["logloss"]}/{w["model"]["brier"]}, '
            f'capped {w["model_capped"]["logloss"]}/{w["model_capped"]["brier"]}, all-rows fit capped '
            f'{w["all_rows_fit_capped"]["logloss"]}/{w["all_rows_fit_capped"]["brier"]}')
    out['test']['walk_forward'] = wf
    avg = lambda key, m: round(float(np.mean([wf[s][key][m] for s in wf])), 5)
    out['test']['walk_forward_mean'] = {k: {'logloss': avg(k, 'logloss'), 'brier': avg(k, 'brier'), 'mean_p': avg(k, 'mean_p')}
                                        for k in ['base_rate', 'career_shrunk', 'model', 'model_capped', 'all_rows_fit_capped']}
    out['test']['walk_forward_mean']['rate'] = round(float(np.mean([wf[s]['rate'] for s in wf])), 5)
    log('walk-forward mean:', out['test']['walk_forward_mean'])
    out['notes'].append('the touch cap is the league QB rush-TD rate per carry x tdmult: it helps on aggregate but binds '
                        'on goal-line runners (Josh Allen), holding them under what they score')
    out['notes'].append('walk-forward: the cap uses the shipped QB carries model (fitted on 2019-2024), so its capped '
                        'rows before 2025 are not fully out of sample; the uncapped model and both baselines are')

    # 3. correlations -------------------------------------------------------------------------------------
    g = pd.read_csv(args.games, low_memory=False)
    g['tmiss'] = g.home_score + g.away_score - g.total_line
    dc = d[d.season.between(*FIT)].merge(g[['game_id', 'tmiss']], on='game_id', how='left')
    # TOTAL_RHO: starters (QB1, two backs, three receivers, one tight end, the kicker), every row
    TR = {'QB:attempts': 0.10, 'QB:completions': 0.16, 'QB:passing_yards': 0.29, 'QB:passing_tds': 0.44, 'QB:rushing_yards': 0.05,
          'RB:rushing_yards': 0.06, 'RB:receiving_yards': 0.06, 'RB:scrim_yards': 0.08, 'RB:any_td': 0.17,
          'WR:receptions': 0.12, 'WR:receiving_yards': 0.16, 'WR:any_td': 0.17,
          'TE:receptions': 0.07, 'TE:receiving_yards': 0.12, 'TE:any_td': 0.12, 'K:fg_att': -0.07, 'K:kick_pts': 0.14}
    st = starters(dc, {'RB': 2, 'WR': 3, 'TE': 1}, 0)
    tre = {}
    for k, v in TR.items():
        gg, s_ = k.split(':'); x = st[st.grp == gg]
        tre[k] = round(nscorr(x['r_' + s_].values, x.tmiss.values) - v, 3)
    x = st[st.grp == 'QB']
    total_rho = nscorr(x.r_any_td.values, x.tmiss.values)
    out['total_rho'] = round(total_rho, 2)
    e = np.array(list(tre.values()))
    out['total_rho_reproduction'] = {'errors': tre, 'rms': round(float(np.sqrt((e ** 2).mean())), 4), 'max_abs': round(float(np.abs(e).max()), 3),
                                     'unrounded_qb_any_td': round(total_rho, 4)}
    log(f'TOTAL_RHO reproduced: rms {out["total_rho_reproduction"]["rms"]}, max {out["total_rho_reproduction"]["max_abs"]} '
        f'(the shipped values are to 2 decimals); QB:any_td {total_rho:.4f} -> {out["total_rho"]}')
    # corr.json: starters (QB1, two backs, three receivers, two tight ends, the kicker), at least two earlier games
    sc = starters(dc, {'RB': 2, 'WR': 3, 'TE': 2}, MIN_GP)
    pairs = all_pairs(sc)
    err = {}
    for k, v in CORR.items():
        rel, a, b_ = k.split('|')
        err[k] = pair_corr(sc, rel, a, b_, pairs) - v
    def rms(keys):
        e = np.array([err[k] for k in keys if not np.isnan(err[k])]); return round(float(np.sqrt((e ** 2).mean())), 4), round(float(e.mean()), 4), len(e)
    crep = {rel: rms([k for k in CORR if k.startswith(rel)]) for rel in ['self', 'team', 'opp']}
    crep['any_td_no_K'] = rms([k for k in CORR if 'any_td' in k and 'K:' not in k])
    crep['QB_no_K'] = rms([k for k in CORR if 'QB:' in k and 'K:' not in k])
    crep['all'] = rms(list(CORR))
    examples = ['self|RB:any_td|RB:rushing_yards', 'self|RB:any_td|RB:carries', 'self|WR:any_td|WR:receiving_yards',
                'team|QB:passing_tds|WR:any_td', 'team|QB:passing_tds|TE:any_td', 'team|QB:attempts|RB:any_td',
                'opp|QB:passing_yards|WR:any_td', 'opp|RB:any_td|RB:carries', 'self|QB:carries|QB:rushing_yards',
                'self|QB:attempts|QB:completions', 'self|K:fg_att|K:fg_made']
    crep['examples'] = {k: {'shipped': CORR[k], 'reproduced': round(CORR[k] + err[k], 3)} for k in examples}
    worst = sorted(err, key=lambda k: -abs(err[k]))[:8]
    crep['worst'] = {k: {'shipped': CORR[k], 'reproduced': round(CORR[k] + err[k], 3)} for k in worst}
    out['corr_reproduction'] = crep
    log('corr.json reproduced (rms, mean error, n):', {k: v for k, v in crep.items() if k not in ('examples', 'worst')})
    for k, v in crep['examples'].items(): log('   ', k, v)
    # every QB:any_td entry that method gives, |r| >= 0.03 as corr.json keeps
    new, dropped = {}, {}
    cands = [('self', NEW, f'QB:{s_}') for s_ in MKT['QB'] if s_ != 'any_td']
    for rel in ['team', 'opp']:
        for gg in ['RB', 'WR', 'TE', 'K'] + (['QB'] if rel == 'opp' else []):
            for s_ in MKT[gg]:
                cands.append((rel, NEW, f'{gg}:{s_}'))
    for rel, a, b_ in cands:
        r = pair_corr(sc, rel, a, b_, pairs)
        k = corr_key(rel, a, b_)
        if np.isnan(r): dropped[k] = 'too few pairs'; continue
        if abs(r) >= 0.03: new[k] = round(r, 3)
        else: dropped[k] = round(r, 3)
    out['corr'] = dict(sorted(new.items()))
    out['corr_below_threshold'] = dict(sorted(dropped.items()))
    log(f'QB:any_td pairs: {len(new)} kept, {len(dropped)} under 0.03')
    for k, v in out['corr'].items(): log('   ', k, v)

    # 4. 2026, for information only: never used to choose anything above ------------------------------
    if args.raw2026:
        out['info_2026'] = info_2026(args, b, prior, tq['rush'], ks, FM, TDMULT)
    return out


def info_2026(args, coef, prior, rush, ks, FM, tdmult):
    """The model's chance against DraftKings' price for every QB anytime-TD price row of 2026's weeks the
    stats cover, on a feature table rebuilt through 2026 by research/features.py itself (its seasons one
    further; 2019-2025 come out as raw/feat.pkl has them). Reported, never used."""
    src = open(os.path.join(HERE, 'features.py')).read()
    old = 'SEASONS=range(FIRST,BASE+1)'
    assert src.count(old) == 1, 'features.py changed its SEASONS line'
    src = src.replace(old, 'SEASONS=range(FIRST,BASE+2)')
    tmp = tempfile.mkdtemp()
    outp = os.path.join(tmp, 'feat26.pkl')
    env = dict(os.environ)
    os.environ['RAW'] = args.raw2026; os.environ['OUT'] = outp
    try:
        exec(compile(src, os.path.join(HERE, 'features.py'), 'exec'), {'__file__': os.path.join(HERE, 'features.py'), '__name__': '__main__'})
    finally:
        os.environ.clear(); os.environ.update(env)
    d = load_feat(outp)
    q = d[d.grp == 'QB'].reset_index(drop=True)
    X, _ = featvec(q, 'any_td', prior, ks)
    Xc, _ = featvec(q, 'carries', FM['prior']['QB']['carries'], ks)
    mc = np.maximum(Xc @ np.array(FM['model']['QB']['carries']['coef']), 0)
    p = sig(X @ coef)
    pc = np.minimum(p, 1 - np.exp(-mc * rush * tdmult))
    q['p'], q['pc'] = p, pc
    q26 = q[q.season == 2026]
    rows = []
    import glob
    for f in sorted(glob.glob(os.path.join(args.data, 'prices_wk*.csv'))):
        pr = pd.read_csv(f)
        pr = pr[(pr.market == 'any_td') & (pr.threshold == 1)]
        for r in pr.itertuples():
            m = q26[(q26.game_id == r.game_id) & (q26.player_display_name == r.player)]
            if len(m) != 1:
                continue
            o = float(r.odds)
            dec = 1 + (o / 100 if o > 0 else 100 / -o)
            m = m.iloc[0]
            rows.append({'game': r.game_id, 'player': r.player, 'odds': int(o), 'implied': round(1 / dec, 3),
                         'model': round(float(m.p), 3), 'model_capped': round(float(m.pc), 3), 'scored': int(m.any_td),
                         'attempts_10plus': bool(m.attempts >= 10)})
    if not rows:
        return {'rows': 0}
    t = pd.DataFrame(rows)
    y = t.scored.values
    summ = {'rows': len(t), 'scored': int(y.sum()), 'mean_implied_with_margin': round(float(t.implied.mean()), 4),
            'mean_model_capped': round(float(t.model_capped.mean()), 4),
            'brier_implied_with_margin': round(brier(t.implied.values, y), 4), 'brier_model_capped': round(brier(t.model_capped.values, y), 4),
            'logloss_implied_with_margin': round(logloss(t.implied.values, y), 4), 'logloss_model_capped': round(logloss(t.model_capped.values, y), 4),
            'model_above_implied_by_3pts': int((t.model_capped - t.implied >= 0.03).sum()),
            'rows_detail': rows}
    print(f'2026 (information only): {len(t)} priced QB rows with a played game; mean implied {summ["mean_implied_with_margin"]} '
          f'(margin in), mean model {summ["mean_model_capped"]}, scored {summ["scored"]}; Brier book {summ["brier_implied_with_margin"]} '
          f'model {summ["brier_model_capped"]}', flush=True)
    return summ


# ---------------------------------------------------------------- --write: merge only the new QB entries
def write(res, data):
    """Merge prior.QB.any_td, model.QB.any_td, tdrate.QB and the QB:any_td correlations into data/, asserting
    every existing entry comes out unchanged, and refusing to change a QB entry already there."""
    paths = {k: os.path.join(data, f) for k, f in [('fm', 'final_model.json'), ('td', 'tdrate.json'), ('corr', 'corr.json')]}
    old = {k: json.load(open(p)) for k, p in paths.items()}
    new = copy.deepcopy(old)
    def put(dct, key, val, where):
        if key in dct and dct[key] != val:
            raise SystemExit(f'{where} already holds {key} with another value; refusing')
        dct[key] = val
    put(new['fm']['model']['QB'], 'any_td', {'type': 'logit', 'coef': res['coef']}, 'final_model.json model.QB')
    put(new['fm']['prior']['QB'], 'any_td', res['prior'], 'final_model.json prior.QB')
    put(new['td'], 'QB', res['tdrate_qb'], 'tdrate.json')
    for k, v in res['corr'].items():
        assert NEW in k
        put(new['corr'], k, v, 'corr.json')
    if list(old['corr']) == sorted(old['corr']):
        new['corr'] = dict(sorted(new['corr'].items()))
    # nothing but the new entries moved
    def flat(o, pre=''):
        if isinstance(o, dict):
            r = {}
            for k, v in o.items(): r.update(flat(v, pre + '/' + k))
            return r
        return {pre: o}
    for k in old:
        fo, fn = flat(old[k]), flat(new[k])
        assert all(fn.get(p, object()) == v for p, v in fo.items()), f'{k}: an existing entry changed'
        added = set(fn) - set(fo)
        assert all('QB' in p and ('any_td' in p or k == 'td') for p in added), f'{k}: unexpected addition {added}'
    for k, p in paths.items():
        s = json.dumps(new[k])    # the files' own style: json.dumps defaults, no newline at the end
        with open(p, 'w') as fh: fh.write(s)
        assert json.load(open(p)) == new[k]
    print('wrote', ', '.join(paths.values()), flush=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--feat', default=os.path.join(RAW, 'feat.pkl'))
    ap.add_argument('--games', default=os.path.join(RAW, 'games.csv'))
    ap.add_argument('--data', default=DATA, help='the data folder read (and written with --write)')
    ap.add_argument('--raw2026', default=None, help='a folder with pw_2019..pw_2026.csv and games.csv: adds the 2026 information')
    ap.add_argument('--out', default=None, help='write the results here as JSON')
    ap.add_argument('--write', action='store_true', help='merge only the new QB entries into final_model.json, tdrate.json, corr.json')
    args = ap.parse_args()
    res = run(args)
    if args.out:
        with open(args.out, 'w') as fh: json.dump(res, fh, indent=1)
        print('wrote', args.out, flush=True)
    if args.write:
        write(res, args.data)


if __name__ == '__main__':
    main()
