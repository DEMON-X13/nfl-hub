"""The owner's follow-up (13 October 2026): "can we do a side by side comparison where we run our
current team rankings against the same years the fivethirtyeight formula did and see which one
fares out better".

Both run over every game of 2003-2025 (regular season and playoffs; the 14 ties left out), each
game called from what each rating knew before it:

  FiveThirtyEight  study 1's Elo (research/win_indicators/rank.py, elo_pre), from 1999
  Team Rankings    elo/build.py's own power_ratings() on that season's finals before the game's
                   date (compare.py, team_rankings_pre): the table's results part, 80% of what the
                   tab shows. Its other 20%, each team's expected starters on player Elo, needs
                   player ratings, which start in 2012, and the site's player build to make them,
                   so it is not in the season-by-season table; the site's own published test of
                   the full table (2018-2025, weeks 2-18) is set beside the same games below.

A rating "picks" the team its own win chance favours: FiveThirtyEight's 1/(1+10^(-(gap+65)/400)),
Team Rankings' 1/(1+e^-(0.35941 gap + 0.33195)), each with home field (none at a neutral site), so a
week-1 Team Rankings table, every team level, picks the home team. "How sure, and how right" is the
average log loss of that chance (lower is better).

Run: python3 -I research/elo_vs_site/side_by_side.py   (after research/win_indicators/build.py)
"""
import math, os, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import compare as C  # noqa: E402   (sets the paths and imports rank.py, common and elo/build.py)
R, B, common = C.R, C.elo_build, C.common

RES = os.path.join(HERE, 'results')


def chance_538(gap, site):
    return 1 / (1 + 10 ** (-(gap + R.ELO_HOME * site) / 400))


def chance_tr(gap, site):
    return 1 / (1 + np.exp(-(B.PR_S * gap + B.PR_H0 * site)))


def main():
    g = R.games_mapped(common.FIRST)
    g = g[g['home_score'] != g['away_score']].copy()
    y = (g['home_score'] > g['away_score']).values.astype(float)
    site = (g['location'] != 'Neutral').values.astype(float)
    season = g['season'].values
    week = np.where(g['game_type'] == 'REG', g['week'], 19).astype(int)
    elo, tr = R.elo_pre(), C.team_rankings_pre()
    p5 = chance_538(np.array([elo[x][0] - elo[x][1] for x in g['game_id']]), site)
    pt = chance_tr(np.array([tr[x][0] - tr[x][1] for x in g['game_id']]), site)
    right5, rightt = (p5 > .5) == (y == 1), (pt > .5) == (y == 1)
    ll5, llt = C.logloss(p5, y), C.logloss(pt, y)

    def row(label, m):
        return {'games': label, 'n': int(m.sum()),
                '538_right': int(right5[m].sum()), '538_pct': right5[m].mean(),
                'tr_right': int(rightt[m].sum()), 'tr_pct': rightt[m].mean(),
                '538_logloss': ll5[m].mean(), 'tr_logloss': llt[m].mean(),
                'better_picks': '538' if right5[m].sum() > rightt[m].sum() else 'Team Rankings' if rightt[m].sum() > right5[m].sum() else 'level',
                'better_logloss': '538' if ll5[m].mean() < llt[m].mean() else 'Team Rankings'}

    by_season = pd.DataFrame([row(str(s), season == s) for s in sorted(set(season))] + [row('2003-2025', np.ones(len(y), bool))])
    stages = [('weeks 1-2', 1, 2), ('weeks 3-5', 3, 5), ('weeks 6-9', 6, 9), ('weeks 10-13', 10, 13),
              ('weeks 14-18', 14, 18), ('playoffs', 19, 19)]
    by_stage = pd.DataFrame([row(lab, (week >= a) & (week <= b)) for lab, a, b in stages])

    # the site's own test: regular-season weeks 2-18, each week called from the finals of the weeks
    # before it (elo/build.py's docstring, THE POWER RATINGS), its published log loss for the table's
    # results part alone and for the full table with the player part blended in, beside
    # FiveThirtyEight on the same games (ties here count a half, as the site's test does)
    rows = []
    gg = R.games_mapped(2012)
    for lo, hi, alone, blended in ((2012, 2017, 0.6266, 0.6243), (2018, 2025, 0.6480, 0.6447)):
        tr_ll, e_ll, tr_ok, e_ok, n = [], [], 0, 0, 0
        for s in range(lo, hi + 1):
            gs = gg[gg['season'] == s]
            reg = gs[gs['game_type'] == 'REG']
            for wk in range(2, 19):
                pr = B.power_ratings(reg[reg['week'] < wk])
                for r in reg[reg['week'] == wk].itertuples():
                    st = 0.0 if r.location == 'Neutral' else 1.0
                    m = r.home_score - r.away_score
                    yy = 1.0 if m > 0 else 0.0 if m < 0 else 0.5
                    rt = lambda t: pr.get(t, {}).get('r', 0.0) or 0.0     # a team with no final yet is average
                    a = chance_tr(rt(r.home_team) - rt(r.away_team), st)
                    b = chance_538(elo[r.game_id][0] - elo[r.game_id][1], st)
                    tr_ll.append(C.logloss(np.array([a]), np.array([yy]))[0])
                    e_ll.append(C.logloss(np.array([b]), np.array([yy]))[0])
                    if yy != 0.5:
                        tr_ok += (a > .5) == (yy == 1)
                        e_ok += (b > .5) == (yy == 1)
                        n += 1
        rows.append({'seasons': f'{lo}-{hi}', 'games': len(tr_ll), 'decided': n,
                     'tr_results_part_logloss': float(np.mean(tr_ll)), 'tr_results_part_published': alone,
                     'tr_full_table_published': blended, '538_logloss': float(np.mean(e_ll)),
                     'tr_results_part_right': tr_ok / n, '538_right': e_ok / n,
                     'note': 'the table\'s constants were chosen on these seasons' if lo == 2012 else 'the table\'s test seasons'})
    site_test = pd.DataFrame(rows)

    os.makedirs(RES, exist_ok=True)
    by_season.to_csv(os.path.join(RES, 'side_by_side_by_season.csv'), float_format='%.4f', index=False)
    by_stage.to_csv(os.path.join(RES, 'side_by_side_by_stage.csv'), float_format='%.4f', index=False)
    site_test.to_csv(os.path.join(RES, 'side_by_side_site_test.csv'), float_format='%.4f', index=False)
    pd.set_option('display.width', 250, 'display.max_columns', 30)
    for t in (by_season, by_stage, site_test):
        print(t.round(4).to_string(index=False), '\n')


if __name__ == '__main__':
    main()
