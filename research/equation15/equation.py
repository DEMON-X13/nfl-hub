"""Study 3: one equation on the 15 win indicators, weighted and tested.

The owner (13 October 2026): "on the 15 indicators you mentioned before, i would like to come up with
an equation using these 15 variables. it's up to you to find how to weight each variables and then
test this equation to find the best variation to find the best percent win rate. once you find it we
can test it against 2024 and 2025."

Study 1 gave two lists of 15, and both are tried:

  in-game 15    the stats that decide a game (EPA per play, dropback EPA, ANY/A, ...), each read
                as the team's season to date entering the game, since a game's own numbers are not
                known before it
  pre-game 15   the indicators that predict the next game (point differential blended with last
                season, Elo, SRS, Pythagorean, ..., the starting quarterback)

The equation: P(home team wins) = 1 / (1 + e^-(h * home + sum of w_i * gap_i)), each gap_i the home
team's value less the away team's (its offence less what its defence allowed, the plays pooled over
the games before this one), in standard deviations; h is home field (0 at a neutral site). The team
with the higher chance is the pick.

What is varied, every variation scored the same way on 2004-2023 (each season called by the
equation fitted on the other nineteen, so no season is scored by weights it helped choose):
  - the list: in-game 15 or pre-game 15
  - early season: each team's season to date blended with last regular season, (n x this season +
    k x 2/3 x last season) / (n + k), n its games so far, k = 0 (this season alone), 2, 4, 8, 16;
    with k = 0 a stat a team has no game of yet reads average. Elo, the quarterback and the blended
    point differential carry their own history and are never blended here
  - the weights: a logistic regression (the weights that fit the results best), the same with a
    ridge pull toward zero of 3, 30 or 300 (the 15 overlap, so a pull keeps any one from swinging),
    or every indicator weighed the same
The best variation is the one that picks the most winners there. It is then fitted once on all of
2004-2023, frozen in results/equation.json, and run once on 2024 and 2025, seasons it never saw.
2003 is left out of the fitting since it has no season before it in the play-by-play. Study 1 ranked
the indicators on 2003-2025; ranked on 2003-2023 alone, the same 15 come out in each list.

Run: python3 -I research/equation15/equation.py   (after research/win_indicators/build.py)
"""
import json, os, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'research', 'win_indicators'))
sys.path.insert(0, os.path.join(ROOT, 'research'))
import common  # noqa: E402
import rank as R  # noqa: E402

RES = os.path.join(HERE, 'results')
TRAIN = list(range(2004, 2024))
TEST = [2024, 2025]
KEEP = 2 / 3
BLENDS = [0, 2, 4, 8, 16]
METHODS = [('logistic', 0.0), ('ridge 3', 3.0), ('ridge 30', 30.0), ('ridge 300', 300.0), ('equal weights', None)]

IN_GAME_15 = ['epa_play', 'drop_epa', 'anya', 'epa_ntd', 'rating', 'dsr', 'nya', 'early_epa', 'drop_succ',
              'to_margin', 'yds_drive', 'ypa', 'fd_play', 'ypp', 'cpoe']
PRE_GAME_15 = ['pt_blend', 'elo', 'srs', 'pythag', 'ppd', 'pt_diff', 'qb', 'epa_play', 'drop_epa', 'win_pct',
               'epa_ntd', 'anya', 'dsr', 'rating', 'early_epa']
LISTS = {'in-game 15': IN_GAME_15, 'pre-game 15': PRE_GAME_15}
# these carry their own history (or, SRS, none) and are not blended with last season here
OWN = {'pt_blend', 'elo', 'srs', 'qb'}
CENTRE = {'pythag': 0.5}        # the stats whose average team is not 0 (a share)


def parts_for(t, h, a):
    """For every stat a list uses: each game's home and away season to date (net), games so far,
    and last regular season's net value; and the gaps of the indicators with their own history."""
    gid = h.index
    reg = t[t['season_type'] == 'REG']
    out = {}
    for key in sorted(set(IN_GAME_15 + PRE_GAME_15) - OWN):
        sd = R.season_to_date(t, key).set_index(['game_id', 'team'])
        hv = sd.reindex(pd.MultiIndex.from_arrays([gid, h['team']]))
        av = sd.reindex(pd.MultiIndex.from_arrays([gid, a['team']]))
        whole = R.season_whole(reg, key)
        lh = whole.reindex(pd.MultiIndex.from_arrays([h['season'].values - 1, h['team'].values])).values
        la = whole.reindex(pd.MultiIndex.from_arrays([h['season'].values - 1, a['team'].values])).values
        out[key] = dict(h=hv['net'].values, a=av['net'].values, nh=hv['n_before'].values, na=av['n_before'].values,
                        lh=np.asarray(lh, float), la=np.asarray(la, float))
    std_pt = R.season_to_date(t, 'pt_diff').set_index(['game_id', 'team'])
    spec, _ = R.special_gaps(t, h, a, std_pt)
    for key in OWN:
        out[key] = dict(gap=spec[key])
    return out


def gap(p, key, k):
    """A stat's home-minus-away gap, each side its season to date blended with last season by k."""
    if 'gap' in p[key]:
        return p[key]['gap']
    q, c = p[key], CENTRE.get(key, 0.0)

    def side(this, n, last):
        this = np.where(n > 0, np.nan_to_num(this - c), 0.0)
        last = np.nan_to_num(last - c)
        den = n + k
        return np.where(den > 0, (n * this + k * KEEP * last) / np.where(den > 0, den, 1), 0.0)
    return side(q['h'], q['nh'], q['lh']) - side(q['a'], q['na'], q['la'])


def fit(X, site, y, lam):
    """Logistic regression with home field (site) and the feature weights, by Newton's method; lam a
    ridge pull on the feature weights alone."""
    D = np.column_stack([site, X])
    b = np.zeros(D.shape[1])
    pen = np.r_[0.0, np.full(X.shape[1], lam)]
    for _ in range(100):
        p = 1 / (1 + np.exp(-D @ b))
        g = D.T @ (y - p) - pen * b
        H = D.T @ (D * (p * (1 - p))[:, None]) + np.diag(pen) + 1e-9 * np.eye(len(b))
        step = np.linalg.solve(H, g)
        b += step
        if np.abs(step).max() < 1e-10:
            break
    return b


def chance(b, X, site):
    return 1 / (1 + np.exp(-(np.column_stack([site, X]) @ b)))


def design(G, method):
    """The columns the weights act on: every indicator, or (equal weights) their sum."""
    return G.sum(1, keepdims=True) if method is None else G


def score(p, y):
    p = np.clip(p, 1e-9, 1 - 1e-9)
    return ((p > 0.5) == (y == 1)).mean(), float(np.mean(-(y * np.log(p) + (1 - y) * np.log(1 - p))))


def main():
    t = pd.read_parquet(os.path.join(R.OUT, 'team_games.parquet'))
    if t['season'].max() >= common.HOLDOUT_FROM:
        raise SystemExit('the table holds held-out seasons: rebuild it')
    t['_win'] = np.where(t['pts'] > t['opp_pts'], 1.0, np.where(t['pts'] == t['opp_pts'], 0.5, 0.0))
    ig = pd.read_csv(os.path.join(ROOT, 'research', 'win_indicators', 'results', 'in_game.csv')).set_index('key')
    for key in IN_GAME_15 + PRE_GAME_15:
        if key in ig.index and ig.loc[key, 'better'] != 'more':
            raise SystemExit(f'{key}: fewer is better, the gaps here assume more')
    h, a = R.paired(t)
    P = parts_for(t, h, a)
    keep = (h['home_score'] != h['away_score']).values & (h['season'].values >= TRAIN[0])
    y_all = (h['home_score'] > h['away_score']).astype(float).values
    site_all = (h['location'] != 'Neutral').astype(float).values
    seas_all = h['season'].values
    week_all = np.where(h['season_type'] == 'POST', 19, h['week']).astype(int)
    tr = keep & np.isin(seas_all, TRAIN)
    te = keep & np.isin(seas_all, TEST)

    rows, built = [], {}
    for lname, keys in LISTS.items():
        for k in BLENDS:
            raw = np.column_stack([gap(P, key, k) for key in keys])
            mu, sd = raw[tr].mean(0), raw[tr].std(0)          # scaled on the training seasons alone
            G = (raw - mu) / sd
            built[(lname, k)] = (raw, mu, sd, G)
            for mname, lam in METHODS:
                X = design(G, lam)
                lam_ = 0.0 if lam is None else lam
                pr = np.zeros(len(y_all))
                for s in TRAIN:                                # each season called by the other nineteen
                    fit_on, call = tr & (seas_all != s), tr & (seas_all == s)
                    b = fit(X[fit_on], site_all[fit_on], y_all[fit_on], lam_)
                    pr[call] = chance(b, X[call], site_all[call])
                acc, ll = score(pr[tr], y_all[tr])
                early = tr & (week_all <= 3)
                rows.append(dict(indicators=lname, early_season_blend_k=k, weights=mname, games=int(tr.sum()),
                                 right=int(((pr[tr] > .5) == (y_all[tr] == 1)).sum()), pick_rate=acc, logloss=ll,
                                 weeks_1_3=score(pr[early], y_all[early])[0],
                                 weeks_4_on=score(pr[tr & (week_all >= 4)], y_all[tr & (week_all >= 4)])[0]))
    grid = pd.DataFrame(rows).sort_values(['pick_rate', 'logloss'], ascending=[False, True]).reset_index(drop=True)
    grid.index += 1

    # references on the same games: the home team, and the FiveThirtyEight Elo alone (study 1)
    elo = P['elo']['gap']
    refs = []
    # a neutral site's home team is a coin flip for the first (counted a half, as study 1 counts a level call)
    for name, pr in (('the home team', np.where(site_all > 0, 0.56, 0.5)),
                     ('FiveThirtyEight Elo alone', 1 / (1 + 10 ** (-(elo + R.ELO_HOME * site_all) / 400)))):
        rate = lambda m: R.pick_rate(pr[m] - 0.5, y_all[m])[0]
        refs.append(dict(reference=name, train_pick_rate=rate(tr), test_pick_rate=rate(te),
                         test_2024=rate(te & (seas_all == 2024)), test_2025=rate(te & (seas_all == 2025))))

    # the best variation of each list, fitted once on 2004-2023, frozen, and run on 2024 and 2025; the
    # best of the two (by the record above) is the equation
    out = {}
    for lname in LISTS:
        best = grid[grid['indicators'] == lname].iloc[0]
        k, mname = int(best['early_season_blend_k']), best['weights']
        lam = dict(METHODS)[mname]
        raw, mu, sd, G = built[(lname, k)]
        X = design(G, lam)
        b = fit(X[tr], site_all[tr], y_all[tr], 0.0 if lam is None else lam)
        pr = chance(b, X, site_all)
        keys = LISTS[lname]
        w_sd = np.full(len(keys), b[1]) if lam is None else b[1:]
        weights = pd.DataFrame({'indicator': [R.LABEL.get(x, x) for x in keys], 'key': keys,
                                'weight_per_sd': w_sd, 'sd_of_gap': sd, 'weight_per_unit': w_sd / sd})
        weights['share_of_weight'] = np.abs(weights['weight_per_sd']) / np.abs(weights['weight_per_sd']).sum()
        test = []
        for name, m in (('2024', te & (seas_all == 2024)), ('2025', te & (seas_all == 2025)), ('2024-2025', te),
                        ('2024-2025 weeks 1-3', te & (week_all <= 3)), ('2024-2025 weeks 4 on', te & (week_all >= 4)),
                        ('2004-2023 (fitted on)', tr)):
            acc, ll = score(pr[m], y_all[m])
            test.append(dict(indicators=lname, games=name, n=int(m.sum()), right=int(((pr[m] > .5) == (y_all[m] == 1)).sum()),
                             pick_rate=acc, logloss=ll))
        spec = {'indicators': lname, 'keys': keys, 'early_season_blend_k': k, 'keep_last_season': KEEP,
                'weights': mname, 'ridge': lam, 'fitted_on': [TRAIN[0], TRAIN[-1]], 'home_field': float(b[0]),
                'gap_mean': [float(x) for x in mu], 'gap_sd': [float(x) for x in sd],
                'weight_per_sd': [float(x) for x in w_sd],
                'record_2004_2023_each_season_left_out': float(best['pick_rate']),
                'formula': 'P(home wins) = 1 / (1 + exp(-(home_field * site + sum_i weight_per_sd_i * '
                           '(gap_i - gap_mean_i) / gap_sd_i)))  ; site 1 at the home ground, 0 at a neutral site'}
        out[lname] = (weights, pd.DataFrame(test), spec)
    chosen = grid.iloc[0]['indicators']
    weights, test, spec = out[chosen]
    test = pd.concat([out[l][1] for l in LISTS], ignore_index=True)

    os.makedirs(RES, exist_ok=True)
    grid.to_csv(os.path.join(RES, 'variations.csv'), float_format='%.4f', index_label='rank')
    weights.to_csv(os.path.join(RES, 'equation_weights.csv'), float_format='%.6f', index=False)
    for lname in LISTS:
        if lname != chosen:
            out[lname][0].to_csv(os.path.join(RES, 'equation_weights_' + lname.replace(' ', '_').replace('-', '_') + '.csv'),
                                 float_format='%.6f', index=False)
            with open(os.path.join(RES, 'equation_' + lname.replace(' ', '_').replace('-', '_') + '.json'), 'w') as fh:
                json.dump(out[lname][2], fh, indent=1)
    test.to_csv(os.path.join(RES, 'test_2024_2025.csv'), float_format='%.4f', index=False)
    pd.DataFrame(refs).to_csv(os.path.join(RES, 'references.csv'), float_format='%.4f', index=False)
    with open(os.path.join(RES, 'equation.json'), 'w') as fh:
        json.dump(spec, fh, indent=1)
    pd.set_option('display.width', 250, 'display.max_columns', 30, 'display.max_colwidth', 60)
    print(grid.head(20).round(4).to_string(), '\n')
    print(weights.round(4).to_string(index=False), '\n home field', round(spec['home_field'], 4), '\n')
    print(test.round(4).to_string(index=False), '\n')
    print(pd.DataFrame(refs).round(4).to_string(index=False))


if __name__ == '__main__':
    main()
