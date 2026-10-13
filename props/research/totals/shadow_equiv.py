"""Proof that shadow.py's numbers are the frozen ratings candidate's, through the research harness.

For each development season (2012-2023 by default; the harness refuses 2024+ outside the holdout step,
and this never asks for it), harness.evaluate(cand_ratings) gives every game's mu, sd and P(over) the way
the study judged the candidate: fitted on the seasons before, predicted on the season from the study's
dataset (data/games.parquet, built from games.csv and the play-by-play), each score read back from the
teams' next rows. shadow.season_calls() gives the same games' numbers from games.csv alone (the file the
dataset was built from, data/raw/games/games.csv), each score read from the file. Held to 1e-9:

  A. every regular-season game, as the shadow runs live (every score from an earlier date known);
  B. every game, playoffs included, with the scores the harness could not read back (a season's last
     game for teams with no later row) withheld from the shadow too: the same code on the same
     information, so this is the candidate itself.

A playoff game can differ in A because the harness, which reads a score from a team's next row,
cannot see a week-18 score when neither team plays again; live, games.csv has it. The candidate's
docstring puts that at most 0.15 points on development; the largest difference is printed.

Run (from props/research/totals, after fetch_raw.py and build_dataset.py; README.md "How to run it again"):
    data/venv/bin/python shadow_equiv.py [first_season last_season]
Ends "EQUIVALENCE: passed" (exit 0) or "EQUIVALENCE: FAILED" (exit 1).
"""
import os, sys
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import harness, cand_ratings as CR, shadow

TOL = 1e-9


def main(argv):
    a, b = (int(argv[0]), int(argv[1])) if len(argv) >= 2 else (2012, 2023)
    seasons = list(range(a, b + 1))
    r = harness.evaluate(CR, periods=seasons, bootstrap_ci=False, verbose=False, write_csv=False)
    H = r['games'][['game_id', 'season', 'game_type', 'mu_cand', 'sd_cand', 'p_cand']]
    G = harness.load()                                        # dev: never a 2024+ row
    g = shadow.load_games(os.path.join(HERE, 'data', 'raw', 'games', 'games.csv'))
    worst = {'A': 0.0, 'B': 0.0}
    po_full = 0.0
    n = {'A': 0, 'B': 0}
    ok = True
    for S in seasons:
        h = H[H.season == S].set_index('game_id')
        # the harness's own information: the scores recover_scores could read back
        test = G[(G.season == S) & G.played & G.total_line.notna() & G.total.notna()]
        ts = test.iloc[np.argsort(test.kickoff.to_numpy(), kind='stable')].drop(columns=harness.OUTCOME_COLS)
        hp, ap = CR.recover_scores(ts)
        hidden = set(ts.game_id[np.isnan(hp) | np.isnan(ap)])
        m = shadow.fit_season(g, S)
        live, _ = shadow.season_calls(g, S, model=m)
        same, _ = shadow.season_calls(g, S, model=m, hide=hidden)
        reg = (h.game_type == 'REG').to_numpy()
        got = {}
        for tag, f, sel in (('A', live, reg), ('B', same, np.ones(len(h), bool))):
            f = f.set_index('game_id').reindex(h.index)
            if f.mu.isna().any():
                print(f'{S} {tag}: {int(f.mu.isna().sum())} harness games missing from the shadow')
                ok = False
            d = np.maximum.reduce([np.abs(f.mu - h.mu_cand).to_numpy(), np.abs(f.sd - h.sd_cand).to_numpy(),
                                   np.abs(f.p_over - h.p_cand).to_numpy()])
            got[tag] = float(np.nanmax(d[sel]))
            worst[tag] = max(worst[tag], got[tag])
            n[tag] += int(sel.sum())
            ok = ok and got[tag] <= TOL
            if tag == 'A' and (~reg).any():
                po_full = max(po_full, float(np.nanmax(np.abs(f.mu - h.mu_cand).to_numpy()[~reg])))
        print(f'{S}: {len(h)} games ({int((~reg).sum())} playoff), {len(hidden)} scores the harness could not read back | '
              f'A regular season {got["A"]:.1e} | B every game {got["B"]:.1e}')
    print(f'A. live information, {n["A"]} regular-season games {seasons[0]}-{seasons[-1]}: largest |diff| in mu, sd or P(over) '
          f'{worst["A"]:.2e} (tolerance {TOL:.0e})')
    print(f'B. the harness\'s information, all {n["B"]} games: largest |diff| {worst["B"]:.2e}')
    print(f'   playoffs with live information (every score known): largest |diff| in mu {po_full:.4f} points')
    print('EQUIVALENCE: passed' if ok else 'EQUIVALENCE: FAILED')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
