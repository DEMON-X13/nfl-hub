"""Fit the Broly Model once, on every regular season and playoff game from 2008 to the last
complete season, and freeze it in model.json (with the last season's per-game rates, which
the weekly run blends into the new season's early weeks).

    python betting/broly/fit.py <folder with play_by_play_YYYY.parquet for 2007..last> <games.csv>

A logistic regression on the market's own chance (moneylines, margin out) and the six stats,
home minus away, standardised, with a light ridge. Tested before it shipped on 2018-2025, each
season predicted by a fit on the seasons before it: 65.8% straight up against the Vegas
favourite's 66.4% (-9 over eight seasons), log loss 0.611 against 0.609 for the line alone.
Do not refit on the season in progress.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stats as B  # noqa: E402

HERE = Path(__file__).resolve().parent


def logit_fit(X, y, l2=1.0):
    Xb = np.c_[np.ones(len(X)), X]; w = np.zeros(Xb.shape[1]); R = np.eye(Xb.shape[1]) * l2; R[0, 0] = 0
    for _ in range(60):
        p = 1 / (1 + np.exp(-Xb @ w)); H = (Xb.T * (p * (1 - p))) @ Xb + R; g = Xb.T @ (p - y) + R @ w
        s = np.linalg.solve(H, g); w -= s
        if abs(s).max() < 1e-10:
            break
    return w


def main(pbp_dir, games_csv):
    games = pd.read_csv(games_csv, low_memory=False)
    games = games[games.result.notna()]
    last = int(games.season.max())
    pbp = pd.concat([pd.read_parquet(Path(pbp_dir) / f"play_by_play_{y}.parquet", columns=B.PBP_COLS) for y in range(2007, last + 1)])
    tg = B.team_games(pbp, games)
    pg = B.pregame(tg)
    X = B.frame(games[games.season >= 2008], pg).merge(games[["game_id", "result"]], on="game_id")
    X = X[(X.result != 0)].dropna(subset=B.COLS)
    mu, sd = X[B.COLS].mean(), X[B.COLS].std()
    w = logit_fit(((X[B.COLS] - mu) / sd).values, (X.result > 0).astype(float).values)
    model = {"name": "Broly Model", "features": B.COLS, "mu": mu.round(8).tolist(), "sd": sd.round(8).tolist(),
             "w": [round(float(v), 8) for v in w], "fitted_on": f"2008-{last}, {len(X)} games", "K": B.K}
    (HERE / "model.json").write_text(json.dumps(model, indent=1))
    prior = B.season_means(tg[tg.season == last])
    (HERE / f"prior_{last}.json").write_text(json.dumps({t: {k: round(v, 6) for k, v in d.items()} for t, d in prior.items()}))
    print(f"fitted on {len(X)} games; weights {dict(zip(['intercept'] + B.COLS, model['w']))}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
