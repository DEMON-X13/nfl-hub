"""The blind test: study 3's frozen equation on the 2026 season.

The owner (13 October 2026): "how would that formula do in a blind test for this year? what would
its record be". The equation is research/equation15/results/equation.json exactly as frozen: fitted on
2004-2023, its variation chosen there, nothing refitted, re-scaled or re-chosen here. 2026 is the
held-out season no study has read; this process opens it (common.open_exam) only to apply the frozen
equation, from fresh downloads (python3 -I research/fetch.py --exam).

Each 2026 game is called from what was known before it: the teams' 2026 games before it (the plays
of each pooled), Elo and the starting quarterback's form from every earlier game since 1999, last
season's point differential. The pick is the team the equation gives the higher chance; a game is
right when that team won. A tie is no decision. Re-run as the season goes on: the record grows, the
equation stays as it is.

Run: python3 -I research/fetch.py --exam && python3 -I research/exam/blind_2026.py
"""
import json, os, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'research', 'equation15'))
sys.path.insert(0, os.path.join(ROOT, 'research', 'win_indicators'))
sys.path.insert(0, os.path.join(ROOT, 'research'))
import common  # noqa: E402

common.open_exam()
import rank as R  # noqa: E402
import build as B  # noqa: E402
import equation as E  # noqa: E402

SEASON = 2026
OUT = os.path.join(HERE, 'out')          # gitignored: the tables with 2026 in them
RES = os.path.join(HERE, 'results')
FROZEN = os.path.join(ROOT, 'research', 'equation15', 'results', 'equation.json')


def main():
    spec = json.load(open(FROZEN))
    if spec['fitted_on'] != [2004, 2023]:
        raise SystemExit('equation.json is not the frozen 2004-2023 equation')
    # the 2003-2025 tables as study 1 built them, and 2026 built the same way
    base = os.path.join(ROOT, 'research', 'win_indicators', 'out')
    t_old = pd.read_parquet(os.path.join(base, 'team_games.parquet'))
    q_old = pd.read_parquet(os.path.join(base, 'qb_games.parquet'))
    t_new, q_new, fixed = B.season_table(SEASON, common.games())
    t = pd.concat([t_old, t_new], ignore_index=True)
    q = pd.concat([q_old, q_new], ignore_index=True)
    os.makedirs(OUT, exist_ok=True)
    t.to_parquet(os.path.join(OUT, 'team_games.parquet'), index=False)
    q.to_parquet(os.path.join(OUT, 'qb_games.parquet'), index=False)
    R.OUT = OUT                                   # qb_pre reads the starters' history from here
    t['_win'] = np.where(t['pts'] > t['opp_pts'], 1.0, np.where(t['pts'] == t['opp_pts'], 0.5, 0.0))

    h, a = R.paired(t)
    P = E.parts_for(t, h, a)
    keys, k = spec['keys'], spec['early_season_blend_k']
    raw = np.column_stack([E.gap(P, key, k) for key in keys])
    z = (raw - np.array(spec['gap_mean'])) / np.array(spec['gap_sd'])
    site = (h['location'] != 'Neutral').astype(float).values
    logit = spec['home_field'] * site + z @ np.array(spec['weight_per_sd'])
    p_home = 1 / (1 + np.exp(-logit))

    m = (h['season'] == SEASON).values
    g = pd.DataFrame({'game_id': h.index[m], 'week': h['week'].values[m], 'date': h['game_date'].values[m],
                      'away': a['team'].values[m], 'home': h['team'].values[m],
                      'away_score': h['away_score'].values[m], 'home_score': h['home_score'].values[m],
                      'p_home': p_home[m]})
    g['pick'] = np.where(g['p_home'] > 0.5, g['home'], g['away'])
    g['chance'] = np.where(g['p_home'] > 0.5, g['p_home'], 1 - g['p_home'])
    g['winner'] = np.where(g['home_score'] > g['away_score'], g['home'],
                           np.where(g['home_score'] < g['away_score'], g['away'], 'tie'))
    g['result'] = np.where(g['winner'] == 'tie', 'tie', np.where(g['pick'] == g['winner'], 'right', 'wrong'))
    g = g.sort_values(['week', 'date', 'game_id']).reset_index(drop=True)

    by_week = g.groupby('week').agg(games=('result', 'size'), right=('result', lambda s: (s == 'right').sum()),
                                    wrong=('result', lambda s: (s == 'wrong').sum()), ties=('result', lambda s: (s == 'tie').sum()))
    right, wrong, ties = int((g['result'] == 'right').sum()), int((g['result'] == 'wrong').sum()), int((g['result'] == 'tie').sum())
    summary = {'season': SEASON, 'through': str(g['date'].max()), 'games': int(len(g)), 'right': right, 'wrong': wrong,
               'ties': ties, 'pick_rate': right / (right + wrong) if right + wrong else None,
               'equation': 'research/equation15/results/equation.json (fitted on 2004-2023, unchanged)',
               'starters_replaced_by_lead_passer_2026': fixed}
    os.makedirs(RES, exist_ok=True)
    g.to_csv(os.path.join(RES, 'blind_2026_games.csv'), float_format='%.4f', index=False)
    by_week.to_csv(os.path.join(RES, 'blind_2026_by_week.csv'))
    with open(os.path.join(RES, 'blind_2026.json'), 'w') as fh:
        json.dump(summary, fh, indent=1)
    pd.set_option('display.width', 200)
    print(by_week.to_string(), '\n')
    print(json.dumps(summary, indent=1))


if __name__ == '__main__':
    main()
