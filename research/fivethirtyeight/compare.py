"""Study 5's comparison: the rebuilt FiveThirtyEight QB Elo beside the site's game models, and over the long run.

    python3 -I research/fivethirtyeight/qbelo.py      # first: writes results/calls_2003_2025.csv
    python3 -I research/fivethirtyeight/compare.py

1. 2021-2025 regular season, the same games as study 4 (research/models_compare/results/after_team_codes/
   calls_2021_2025.csv: Alpha, the Joker and the ELO Model as the site builds them, refitted season by season,
   with the relocated-team fix), beside the QB Elo (the starter known at kickoff: the first quarterback to drop
   back) and its PREGAME version (the team's previous starter: no team news): each model's record by season and
   in all; its Brier score and log loss, with paired bootstrap 90% intervals on the QB Elo's difference, and
   PREGAME's, to each of the others; how often each pair picks the same team, who was right where two differ
   (with the chance a split that uneven turns up if each side were right half the time, as study 4 does); the
   four of study 4's kind (the three site models and the QB Elo) one alone against the other three; and how
   often the QB Elo picks Alpha's team, season by season.
2. How distinct it is, as study 4 described its models (a description, not a yardstick): the same picks as
   study 4's Challenger and Broly (both off the site since 13 October 2026) and our plain Elo, beside Alpha and
   the Challenger; and how often each model picks the closing line's favourite.
3. The long run, every game (playoffs in): the QB Elo against our plain Elo and its PREGAME version
   2003-2025, and against FiveThirtyEight's own published forecasts 2003-2022.

A tie is no decision. Reads only committed results; writes results/compare_*.csv. The bootstrap is seeded
(SEED), so a rerun writes the same files.
"""
import math
import os
from itertools import combinations

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, 'results')
STUDY4 = os.path.join(os.path.dirname(HERE), 'models_compare', 'results', 'after_team_codes', 'calls_2021_2025.csv')
MODELS = ['alpha', 'joker', 'elo', 'qbelo', 'qbelo_pre']
FOUR = MODELS[:4]                  # study 4's kind: the three site models and the QB Elo (PREGAME is a version of it)
NAMES = {'alpha': 'Alpha', 'joker': 'Joker', 'elo': 'ELO Model', 'qbelo': 'QB Elo', 'qbelo_pre': 'QB Elo, pregame starter',
         'challenger': 'Challenger', 'broly': 'Broly', 'plain': 'Plain Elo (ours)'}
SEED, BOOT = 20261013, 10000       # the paired bootstrap: game-level resamples, one set shared by every pair


def record(right):
    right = np.asarray(right, dtype=bool)
    r, w = int(right.sum()), int((~right).sum())
    return {'right': r, 'wrong': w, 'pct': round(r / (r + w), 4) if r + w else None}


def binom_two_sided(a, n):
    """the chance of a split at least this uneven if each side were right half the time"""
    if n == 0:
        return 1.0
    lo = min(a, n - a)
    tail = sum(math.comb(n, i) for i in range(lo + 1)) / 2 ** n
    return min(1.0, 2 * tail)


def head_to_head(pa, pb, winner):
    """two models' picks on decided games: how often the same, and on the games apart who was right"""
    pa, pb, winner = (np.asarray(v, dtype=object) for v in (pa, pb, winner))
    apart = pa != pb
    ra = int((pa[apart] == winner[apart]).sum())
    rb = int((pb[apart] == winner[apart]).sum())
    return {'games': int(len(pa)), 'same_pick': round(float((~apart).mean()), 4), 'games_apart': int(apart.sum()),
            'a_right': ra, 'b_right': rb, 'chance_alone': rounded(binom_two_sided(ra, ra + rb))}


def rounded(p):
    return round(p, 3) if p >= 0.001 else float('%.1g' % p)


def window():
    """study 4's 2021-2025 regular-season games with the QB Elo's calls (and our plain Elo's) beside its models'"""
    s4 = pd.read_csv(STUDY4)
    ours = pd.read_csv(os.path.join(RES, 'calls_2003_2025.csv')).rename(columns={
        'qbelo_p_home': 'qbelo_p_home', 'qbelo_pregame_p_home': 'qbelo_pre_p_home', 'qbelo_pregame_pick': 'qbelo_pre',
        'elo_p_home': 'plain_p_home', 'elo_pick': 'plain'})
    keep = ['game_id', 'season', 'week', 'away_team', 'home_team', 'away_score', 'home_score', 'spread_line', 'winner']
    keep += [c for m in ('alpha', 'joker', 'elo', 'challenger', 'broly') for c in (m, m + '_p_home')]
    g = s4[keep].merge(
        ours[['game_id', 'game_type', 'home_team', 'away_team', 'home_score', 'away_score', 'qbelo_p_home', 'qbelo_pick',
              'qbelo_pre_p_home', 'qbelo_pre', 'plain_p_home', 'plain']],
        on='game_id', how='left', suffixes=('', '_ours'))
    missing = g[g.qbelo_pick.isna() | g.qbelo_pre.isna()].game_id.tolist()
    assert not missing, ('games with no QB Elo call', missing)
    assert (g.game_type == 'REG').all()
    for c in ('home_team', 'away_team', 'home_score', 'away_score'):
        assert (g[c] == g[c + '_ours']).all(), c
    g['qbelo'] = g.qbelo_pick
    # a pick and its chance agree (the calls file's six decimals settle every pick; study 4 writes four, so a chance
    # there can read 0.5000 beside a pick: the Joker's on 2023_18_CHI_GB)
    for m in MODELS + ['plain']:
        p = g[m + '_p_home']
        assert (p[g[m] == g.home_team] >= 0.5).all() and (p[g[m] == g.away_team] <= 0.5).all(), m
        assert m not in ('qbelo', 'qbelo_pre', 'plain') or not (p == 0.5).any(), m
    return g


def scores(dec):
    """Brier score and log loss of each model's home chance on the decided games, and paired bootstrap 90% intervals
    on the QB Elo's difference (and PREGAME's) to each of the others: the same game-level resamples for every pair"""
    y = (dec.home_score > dec.away_score).values.astype(float)
    loss = {}
    for m in MODELS:
        p = np.clip(dec[m + '_p_home'].values.astype(float), 1e-9, 1 - 1e-9)
        loss[m] = {'brier': (p - y) ** 2, 'log_loss': -(y * np.log(p) + (1 - y) * np.log(1 - p))}
    tab = pd.DataFrame([{'model': NAMES[m], 'games': len(y), 'brier': round(float(loss[m]['brier'].mean()), 4),
                         'log_loss': round(float(loss[m]['log_loss'].mean()), 4)} for m in MODELS])
    idx = np.random.default_rng(SEED).integers(0, len(y), size=(BOOT, len(y)))
    diffs = []
    for a in ('qbelo', 'qbelo_pre'):
        for b in MODELS:
            if b == a or (a == 'qbelo_pre' and b == 'qbelo'):
                continue
            for k in ('brier', 'log_loss'):
                d = loss[a][k] - loss[b][k]
                bm = d[idx].mean(axis=1)
                lo, hi = np.percentile(bm, [5, 95])
                diffs.append({'a': NAMES[a], 'b': NAMES[b], 'score': k, 'a_minus_b': round(float(d.mean()), 4),
                              'lo90': round(float(lo), 4), 'hi90': round(float(hi), 4),
                              'a_lower_in_resamples': round(float((bm < 0).mean()), 3)})
    return tab, pd.DataFrame(diffs)


def main():
    pd.set_option('display.width', 200)
    g = window()
    dec = g[g.winner != 'tie'].copy()
    print('2021-2025 regular season: %d games, %d ties, %d decided; every model calls every decided game: %s'
          % (len(g), (g.winner == 'tie').sum(), len(dec), bool(dec[MODELS].notna().all().all())))
    right = {m: (dec[m] == dec.winner).values for m in MODELS}

    score_tab, score_diff = scores(dec)

    rows = []
    for m in MODELS:
        for s in sorted(dec.season.unique()):
            rows.append({'model': NAMES[m], 'season': str(s), **record(right[m][(dec.season == s).values])})
        rows.append({'model': NAMES[m], 'season': '2023-2025', **record(right[m][(dec.season >= 2023).values])})
        rows.append({'model': NAMES[m], 'season': '2021-2025', **record(right[m])})
    records = pd.DataFrame(rows)

    agree = pd.DataFrame(index=[NAMES[m] for m in MODELS], columns=[NAMES[m] for m in MODELS], dtype=float)
    h2h = []
    for a, b in combinations(MODELS, 2):
        h = head_to_head(dec[a], dec[b], dec.winner)
        agree.loc[NAMES[a], NAMES[b]] = agree.loc[NAMES[b], NAMES[a]] = h['same_pick']
        h2h.append({'a': NAMES[a], 'b': NAMES[b], **h})
    for m in MODELS:
        agree.loc[NAMES[m], NAMES[m]] = 1.0
    h2h = pd.DataFrame(h2h)

    alone = []
    for m in FOUR:
        others = [o for o in FOUR if o != m]
        mask = (dec[others].nunique(axis=1).eq(1) & (dec[m] != dec[others[0]])).values
        alone.append({'model': NAMES[m], 'games_alone': int(mask.sum()), **record(right[m][mask])})
    alone = pd.DataFrame(alone)

    votes = dec[FOUR].apply(lambda r: r.value_counts().iloc[0], axis=1)
    major = dec[FOUR].apply(lambda r: r.value_counts().index[0], axis=1)
    split = []
    for v, lab in ((4, 'all four agree'), (3, '3 to 1'), (2, '2 to 2')):
        msk = votes == v
        rr = record(major[msk] == dec.winner[msk]) if v > 2 else {'right': None, 'wrong': None, 'pct': None}
        split.append({'split': lab, 'games': int(msk.sum()), 'share': round(float(msk.mean()), 4),
                      **{'majority_' + k: x for k, x in rr.items()}})
    split = pd.DataFrame(split)
    for col in ('majority_right', 'majority_wrong'):
        split[col] = split[col].astype('Int64')

    # the QB Elo against Alpha, season by season
    qa = []
    for s in sorted(dec.season.unique()):
        d = dec[dec.season == s]
        qa.append({'season': str(s), **head_to_head(d.qbelo, d.alpha, d.winner)})
    qa.append({'season': '2021-2025', **head_to_head(dec.qbelo, dec.alpha, dec.winner)})
    qa = pd.DataFrame(qa).rename(columns={'a_right': 'qbelo_right', 'b_right': 'alpha_right'})

    # how distinct: the same picks as study 4's Challenger and Broly and our plain Elo, Alpha and the Challenger beside
    distinct = []
    for a, b in [('alpha', 'challenger'), ('qbelo', 'alpha'), ('qbelo', 'challenger'), ('qbelo', 'broly'), ('qbelo', 'plain'),
                 ('qbelo_pre', 'alpha'), ('qbelo_pre', 'challenger'), ('qbelo_pre', 'plain')]:
        distinct.append({'a': NAMES[a], 'b': NAMES[b], **head_to_head(dec[a], dec[b], dec.winner)})
    distinct = pd.DataFrame(distinct)
    # how often each picks the closing line's favourite (study 4's rule: games.csv's spread_line, every game has one)
    fg = dec[dec.spread_line != 0]
    fav = np.where(fg.spread_line > 0, fg.home_team, fg.away_team)
    favourite = pd.DataFrame([{'model': NAMES[m], 'games': len(fg), 'same_as_favourite': int((fg[m] == fav).sum()),
                               'share': round(float((fg[m] == fav).mean()), 4)}
                              for m in ['alpha', 'challenger', 'joker', 'broly', 'elo', 'qbelo', 'qbelo_pre', 'plain']])

    # the long run, every game (playoffs in)
    c = pd.read_csv(os.path.join(RES, 'calls_2003_2025.csv'))
    c = c[c.home_score != c.away_score].copy()
    c['winner'] = np.where(c.home_score > c.away_score, c.home_team, c.away_team)
    long = []
    for a, b, lab, blocks in [('qbelo_pick', 'elo_pick', ('QB Elo (rebuild)', 'Plain Elo (ours)'),
                               [(2003, 2022), (2023, 2025), (2003, 2025)]),
                              ('qbelo_pick', 'qbelo_pregame_pick', ('QB Elo (rebuild)', 'QB Elo, pregame starter'),
                               [(2003, 2022), (2023, 2025), (2003, 2025)]),
                              ('qbelo_pregame_pick', 'elo_pick', ('QB Elo, pregame starter', 'Plain Elo (ours)'),
                               [(2003, 2022), (2023, 2025), (2003, 2025)]),
                              ('qbelo_pick', 'f538_qbelo_pick', ('QB Elo (rebuild)', "538's QB Elo (published)"),
                               [(2003, 2018), (2019, 2022), (2003, 2022)]),
                              ('f538_qbelo_pick', 'f538_elo_pick', ("538's QB Elo (published)", "538's plain Elo (published)"),
                               [(2003, 2018), (2019, 2022), (2003, 2022)])]:
        for lo, hi in blocks:
            d = c[c.season.between(lo, hi)]
            long.append({'a': lab[0], 'b': lab[1], 'seasons': '%d-%d' % (lo, hi), **head_to_head(d[a], d[b], d.winner),
                         'a_record': '%d-%d' % (int((d[a] == d.winner).sum()), int((d[a] != d.winner).sum())),
                         'b_record': '%d-%d' % (int((d[b] == d.winner).sum()), int((d[b] != d.winner).sum()))})
    long = pd.DataFrame(long)

    records.to_csv(os.path.join(RES, 'compare_records.csv'), index=False)
    score_tab.to_csv(os.path.join(RES, 'compare_scores.csv'), index=False)
    score_diff.to_csv(os.path.join(RES, 'compare_score_diffs.csv'), index=False)
    distinct.to_csv(os.path.join(RES, 'compare_distinct.csv'), index=False)
    favourite.to_csv(os.path.join(RES, 'compare_favourite.csv'), index=False)
    agree.to_csv(os.path.join(RES, 'compare_agreement.csv'))
    h2h.to_csv(os.path.join(RES, 'compare_head_to_head.csv'), index=False)
    alone.to_csv(os.path.join(RES, 'compare_alone.csv'), index=False)
    split.to_csv(os.path.join(RES, 'compare_splits.csv'), index=False)
    qa.to_csv(os.path.join(RES, 'compare_qbelo_alpha.csv'), index=False)
    long.to_csv(os.path.join(RES, 'compare_long_run.csv'), index=False)
    print('\nrecords (share right):')
    print(records.pivot(index='model', columns='season', values='pct').to_string())
    print(records[records.season == '2021-2025'].to_string(index=False))
    for lab, t in [('Brier score and log loss', score_tab), ('differences, with paired bootstrap 90% intervals', score_diff),
                   ('how often two pick the same team', agree), ('when two differ', h2h), ('one model alone against the other three', alone),
                   ('how the four split', split), ('the QB Elo against Alpha, season by season', qa),
                   ('how distinct: the same picks', distinct), ("the closing line's favourite", favourite),
                   ('the long run, every game (playoffs in)', long)]:
        print('\n' + lab + ':')
        print(t.to_string(index=lab == 'how often two pick the same team'))


if __name__ == '__main__':
    main()
