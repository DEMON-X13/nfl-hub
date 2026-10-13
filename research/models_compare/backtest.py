"""Study 4: the site's five game models, side by side over the seasons before this one.

The owner (13 October 2026), on whether to narrow the site's models: "just doesn't seem like enough
parody on the different models wondering if i should just narrow how many there are", then, asked
whether to run all five over past seasons first: "i guess last seasons".

Each model is run as the site builds it, with its own code and its own data, and refitted season by
season on the seasons before the one it calls (walk forward), so no season is called by weights that
saw it. 2021-2025 is the window all five can be run on: Alpha, the Challenger and the Joker are built
on the betting job's frozen 2019-2025 files (betting/joker/data), and two seasons is the least any of
them was tested with.

  Alpha        the betting app's margin formula: Elo gap, rest gap, home field, EPA gap and the
               starting quarterback's drop (betting/joker/harness, the Python port of the app),
               least squares on the margin, its chance a logistic on that margin
  Challenger   the same, with each team's preseason Elo set from the betting market's win total
               (MODEL_H in the app: 1500 + 400 log10(wins / (games - wins)))
  Joker        gradient-boosted trees on every input betting/joker/model.json lists, the recipe of
               betting/joker/tune_2026.py
  Broly        betting/broly: the moneylines' chance plus six team stats, a ridge logistic, fitted on
               2008 to the season before (fit.py's own fit)
  ELO Model    elo/build.py's game model on its own per-game inputs (elo_features.py rebuilds them),
               fitted on 2012 to the season before, as model.json's walk_forward is

Every call is of a regular-season game, made from what was known before it. A tie is no decision.

    python3 -I research/models_compare/elo_features.py   # once: the ELO Model's inputs (downloads)
    python3 -I research/models_compare/backtest.py
"""
import json, math, os, sys
from itertools import combinations

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
RES = os.path.join(HERE, 'results')
OUT = os.path.join(HERE, 'out')
sys.path.insert(0, os.path.join(ROOT, 'research'))
sys.path.insert(0, os.path.join(ROOT, 'betting', 'joker'))
import common  # noqa: E402
import features as F  # noqa: E402  (betting/joker/features.py)
from harness import data, qb, sources  # noqa: E402
from harness.ratings import Params, build_features  # noqa: E402

TEST = list(range(2021, 2026))
MODELS = ['alpha', 'challenger', 'joker', 'broly', 'elo']
NAMES = {'alpha': 'Alpha', 'challenger': 'Challenger', 'joker': 'Joker', 'broly': 'Broly', 'elo': 'ELO Model'}


def sig(x):
    return 1 / (1 + np.exp(-x))


def logit_k(margin, y):
    """the one number k with P(home wins) = 1 / (1 + e^(-k x margin)), by maximum likelihood"""
    k = 0.1
    for _ in range(50):
        p = sig(k * margin)
        k -= np.sum((p - y) * margin) / np.sum(p * (1 - p) * margin ** 2)
    return k


# ---------------------------------------------------------------- Alpha and the Challenger
def before(stats, Y):
    """the team-game rows of the seasons before Y (a game id starts with its season)"""
    return stats[stats.game_id.str.slice(0, 4).astype(int) < Y]


def win_total_elo():
    """MODEL_H's preseason Elo: each team's market win total as a rating against an average team"""
    wt = pd.read_csv(F.FROZEN / 'win_totals.csv')
    wt['team'] = data.norm_team(wt.team)
    elo = 1500 + 400 * np.log10(wt.exp_wins / (wt.games - wt.exp_wins))
    return {int(s): dict(zip(g.team, elo[g.index])) for s, g in wt.groupby('season')}


def app_models():
    F.point_harness_at_frozen()
    g = F.games_table(None)
    played = g[g.result.notna()].reset_index(drop=True)
    stats = F.stats_table(F.FIT_SEASONS, None)
    cols = sources.APP_STAT_COLS
    F.passers(None)
    prior = win_total_elo()
    out = []
    for Y in TEST:
        lm = sources.league_means(before(stats, Y), cols)                 # league averages of the seasons before
        for name, p in (('alpha', Params(warm=0)), ('challenger', Params(warm=0, market_prior=prior))):
            f, _ = build_features(played[data.GAME_COLS], stats, cols, lm, p)
            f = qb.augment(f, Y, fade=qb.FADE)                            # replacement QB level from seasons before
            X = lambda d: np.c_[1 - d.neutral, d.elo_diff, d.rest, d.net_epa, d.qb_drop]
            tr = f[f.season < Y]
            b = np.linalg.lstsq(X(tr), tr.result.values, rcond=None)[0]
            dec = tr[tr.result != 0]
            k = logit_k(X(dec) @ b, (dec.result > 0).astype(float).values)
            te = f[f.season == Y]                                         # the playoffs too, for the check
            m = X(te) @ b
            out.append(pd.DataFrame({'game_id': te.game_id.values, 'model': name, 'p_home': sig(k * m),
                                     'home_pick': m >= 0, 'game_type': te.game_type.values, 'result': te.result.values}))
            print(f'  {name} {Y}: margin = {b.round(4).tolist()}, k {k:.4f}', flush=True)
    return pd.concat(out)


# ---------------------------------------------------------------- the Joker
def joker():
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder, StandardScaler
    meta = json.load(open(os.path.join(ROOT, 'betting', 'joker', 'model.json')))
    num, cat = meta['numeric'], meta['categorical']
    lm_all = sources.league_means
    out = []
    for Y in TEST:
        sources.league_means = lambda stats, cols, Y=Y: lm_all(before(stats, Y), cols)
        try:
            f = F.assemble(list(range(F.FIT_SEASONS[0], Y + 1)), qb_Y=Y, fresh=None)
        finally:
            sources.league_means = lm_all
        for c in cat:
            f[c] = f[c].astype(str)
        tr = f[f.season < Y]
        pre = ColumnTransformer([
            ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('sc', StandardScaler())]), num),
            ('cat', OneHotEncoder(handle_unknown='ignore', min_frequency=1), cat)])
        model = Pipeline([('pre', pre), ('est', HistGradientBoostingClassifier(
            max_depth=4, max_iter=25, learning_rate=0.1, min_samples_leaf=5, early_stopping=False))])
        model.fit(tr[num + cat], tr.home_win)
        te = f[(f.season == Y) & (f.game_type == 'REG')]
        p = model.predict_proba(te[num + cat])[:, 1]
        out.append(pd.DataFrame({'game_id': te.game_id.values, 'model': 'joker', 'p_home': p, 'home_pick': p >= 0.5}))
        print(f'  joker {Y}: fitted on {len(tr)} games', flush=True)
    return pd.concat(out)


# ---------------------------------------------------------------- Broly
def broly(first_test=2018):
    sys.path.insert(0, os.path.join(ROOT, 'betting', 'broly'))
    import stats as B
    from fit import logit_fit
    games = common.games(2007)
    games = games[games.result.notna()]
    pbp = pd.concat([pd.read_parquet(common.pbp_path(y), columns=B.PBP_COLS) for y in range(2007, TEST[-1] + 1)])
    tg = B.team_games(pbp, games)
    pg = B.pregame(tg)
    X = B.frame(games[games.season >= 2008], pg).merge(games[['game_id', 'season', 'game_type', 'result']], on='game_id')
    X = X.dropna(subset=B.COLS)
    out = []
    for Y in range(first_test, TEST[-1] + 1):
        tr = X[(X.season < Y) & (X.result != 0)]
        mu, sd = tr[B.COLS].mean(), tr[B.COLS].std()
        w = logit_fit(((tr[B.COLS] - mu) / sd).values, (tr.result > 0).astype(float).values)
        te = X[X.season == Y]
        p = sig(w[0] + ((te[B.COLS] - mu) / sd).values @ w[1:])
        out.append(pd.DataFrame({'game_id': te.game_id.values, 'model': 'broly', 'p_home': p, 'home_pick': p >= 0.5,
                                 'game_type': te.game_type.values}))
    return pd.concat(out)


# ---------------------------------------------------------------- the ELO Model
def elo_model():
    import importlib.util
    spec = importlib.util.spec_from_file_location('elo_build', os.path.join(ROOT, 'elo', 'build.py'))
    eb = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(eb)
    path = os.path.join(OUT, 'elo', 'cache', 'features.json')
    if not os.path.exists(path):
        raise SystemExit('run research/models_compare/elo_features.py first')
    feats = [r for r in json.load(open(path)) if r['result'] is not None and r['result'] != 0]
    X = lambda rows: np.array([[r['hf']] + [r['x'][g] for g in eb.GROUPS] for r in rows])
    Y = lambda rows: np.array([1.0 if r['result'] > 0 else 0.0 for r in rows])
    seasons = sorted({r['season'] for r in feats})
    out, walk = [], {}
    for s in seasons[1:]:
        train = [r for r in feats if r['season'] < s]
        test = [r for r in feats if r['season'] == s]
        w = eb.logistic_fit(X(train), Y(train))
        p = eb.predict(w, X(test))
        walk[int(s)] = {'games': len(test), 'accuracy': round(float(((p > 0.5) == (Y(test) > 0.5)).mean()), 4)}
        out.append(pd.DataFrame({'game_id': [r['game_id'] for r in test], 'model': 'elo', 'p_home': p, 'home_pick': p > 0.5}))
    # the build's own record, published in elo/data/model.json, is these numbers: check they are
    pub = json.load(open(os.path.join(ROOT, 'elo', 'data', 'model.json')))['walk_forward']
    diff = {s: (walk[s], pub[str(s)]) for s in walk if str(s) in pub and walk[s] != {k: pub[str(s)][k] for k in ('games', 'accuracy')}}
    return pd.concat(out), walk, diff


# ---------------------------------------------------------------- the comparison
def record(right):
    r, w = int(right.sum()), int((~right).sum())
    return {'right': r, 'wrong': w, 'pct': round(r / (r + w), 4) if r + w else None}


def binom_two_sided(a, n):
    """the chance of a split at least this uneven if each side were right half the time"""
    lo = min(a, n - a)
    tail = sum(math.comb(n, i) for i in range(lo + 1)) / 2 ** n
    return min(1.0, 2 * tail)


def main():
    print('Alpha and the Challenger', flush=True)
    app = app_models()
    print('the Joker', flush=True)
    jok = joker()
    print('Broly', flush=True)
    bro = broly()
    print('the ELO Model', flush=True)
    elo, elo_walk, elo_diff = elo_model()

    games = common.games(2012)
    games = games[games.game_type == 'REG']
    sched = games.set_index('game_id')[['season', 'week', 'away_team', 'home_team', 'away_score', 'home_score', 'spread_line']]
    calls = pd.concat([app.drop(columns=['game_type', 'result']), jok, bro.drop(columns='game_type'), elo])
    calls = calls[calls.game_id.isin(sched.index)]
    wide = calls.pivot(index='game_id', columns='model', values='p_home')
    pick_home = calls.pivot(index='game_id', columns='model', values='home_pick')
    g = sched.loc[wide.index].copy()
    for m in MODELS:
        g[m + '_p_home'] = wide.get(m)
        g[m] = np.where(pick_home.get(m).isna(), None, np.where(pick_home.get(m) == True, g.home_team, g.away_team))  # noqa: E712
    g['winner'] = np.where(g.home_score > g.away_score, g.home_team, np.where(g.home_score < g.away_score, g.away_team, 'tie'))
    g = g.sort_values(['season', 'week']).reset_index()

    # the window every model calls: 2021-2025, every regular-season game all five have a call on
    win = g[g.season.isin(TEST)]
    both = win.dropna(subset=MODELS)
    # a tie has no ELO Model call (its fit leaves ties out); any other game a model lacks is listed
    missing = {m: sorted(set(win[win.winner != 'tie'].game_id) - set(win.dropna(subset=[m]).game_id)) for m in MODELS}
    dec = both[both.winner != 'tie']
    right = {m: dec[m] == dec.winner for m in MODELS}

    rows = []
    for m in MODELS:
        for s in TEST:
            rows.append({'model': NAMES[m], 'season': s, **record(right[m][dec.season == s])})
        rows.append({'model': NAMES[m], 'season': '2021-2025', **record(right[m])})
    records = pd.DataFrame(rows)

    agree = pd.DataFrame(index=[NAMES[m] for m in MODELS], columns=[NAMES[m] for m in MODELS], dtype=float)
    h2h = []
    for a, b in combinations(MODELS, 2):
        same = (both[a] == both[b])
        agree.loc[NAMES[a], NAMES[b]] = agree.loc[NAMES[b], NAMES[a]] = round(same.mean(), 4)
        d = dec[dec[a] != dec[b]]
        ra = int((d[a] == d.winner).sum())
        h2h.append({'a': NAMES[a], 'b': NAMES[b], 'games_apart': len(d), 'a_right': ra, 'b_right': len(d) - ra,
                    'chance_alone': round(binom_two_sided(ra, len(d)), 3)})
    for m in MODELS:
        agree.loc[NAMES[m], NAMES[m]] = 1.0
    h2h = pd.DataFrame(h2h)

    # how the five split on each game, and who stands alone
    votes = dec[MODELS].apply(lambda r: r.value_counts().iloc[0], axis=1)
    major = dec[MODELS].apply(lambda r: r.value_counts().index[0], axis=1)
    split = []
    for v, lab in ((5, 'all five agree'), (4, '4 to 1'), (3, '3 to 2')):
        m = votes == v
        split.append({'split': lab, 'games': int(m.sum()), 'share': round(m.mean(), 4),
                      **{'majority_' + k: v2 for k, v2 in record(major[m] == dec.winner[m]).items()}})
    split = pd.DataFrame(split)
    alone = []
    for m in MODELS:
        others = [o for o in MODELS if o != m]
        mask = dec[others].nunique(axis=1).eq(1) & (dec[m] != dec[others[0]])
        alone.append({'model': NAMES[m], 'games_alone': int(mask.sum()), **record(right[m][mask])})
    alone = pd.DataFrame(alone)

    # how often each picks the betting favourite (Broly and the Joker take the line as an input)
    fav_games = dec[dec.spread_line != 0]
    fav = np.where(fav_games.spread_line > 0, fav_games.home_team, fav_games.away_team)
    favourite = pd.DataFrame([{'model': NAMES[m], 'games': len(fav_games), 'same_as_favourite': round(float((fav_games[m] == fav).mean()), 4)}
                              for m in MODELS])

    # the longer runs, where a model can go further back
    long = []
    for s, v in sorted(elo_walk.items()):
        sub = g[(g.season == s) & (g.winner != 'tie')].dropna(subset=['elo'])
        long.append({'model': 'ELO Model', 'season': s, **record(sub.elo == sub.winner)})
    for s in range(2018, TEST[-1] + 1):
        sub = g[(g.season == s) & (g.winner != 'tie')].dropna(subset=['broly'])
        long.append({'model': 'Broly', 'season': s, **record(sub.broly == sub.winner)})
    long = pd.DataFrame(long)
    bro_all = bro[bro.game_id.isin(common.games(2018).game_id)].merge(common.games(2018)[['game_id', 'result']], on='game_id')
    bro_all = bro_all[bro_all.result != 0]
    bro_check = record((bro_all.home_pick == (bro_all.result > 0)).values)
    al = app[(app.model == 'alpha') & (app.result != 0)]
    alpha_check = record((al.home_pick == (al.result > 0)).values)

    os.makedirs(RES, exist_ok=True)
    g[g.season.isin(TEST)].to_csv(os.path.join(RES, 'calls_2021_2025.csv'), index=False, float_format='%.4f')
    records.to_csv(os.path.join(RES, 'records.csv'), index=False)
    agree.to_csv(os.path.join(RES, 'agreement.csv'))
    h2h.to_csv(os.path.join(RES, 'head_to_head.csv'), index=False)
    split.to_csv(os.path.join(RES, 'splits.csv'), index=False)
    alone.to_csv(os.path.join(RES, 'alone.csv'), index=False)
    favourite.to_csv(os.path.join(RES, 'favourite.csv'), index=False)
    long.to_csv(os.path.join(RES, 'longer_runs.csv'), index=False)
    summary = {'window': '2021-2025 regular season', 'games_all_five_call': int(len(both)), 'ties': int((both.winner == 'tie').sum()),
               'decided': int(len(dec)), 'regular_season_games': int(len(win)), 'missing_by_model': {NAMES[m]: v for m, v in missing.items() if v},
               'checks': {'elo_walk_forward_matches_model_json': not elo_diff, 'elo_differences': {str(k): v for k, v in elo_diff.items()},
                          'broly_2018_2025_reg_and_post': bro_check, 'broly_published': 'fit.py: 65.8% on 2018-2025',
                          'alpha_2021_2025_reg_and_post': alpha_check, 'alpha_published': 'the app: 63.8% on 2021-2025 (1,420 picks)',
                          'joker_published': 'model.json: 0.634 on 2021-2025 regular season'}}
    with open(os.path.join(RES, 'summary.json'), 'w') as fh:
        json.dump(summary, fh, indent=1)
    pd.set_option('display.width', 200)
    for t in (records.pivot(index='model', columns='season', values='pct'), agree, h2h, split, alone, favourite):
        print(t.to_string(), '\n')
    print(json.dumps(summary, indent=1))


if __name__ == '__main__':
    main()
