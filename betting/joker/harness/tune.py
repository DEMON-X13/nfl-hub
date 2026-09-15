"""Walk-forward choice of layer-2 parameters (variant G).

`choose_carry_elo(Y)` picks carry_elo from a grid by re-running the state
machine on seasons before Y and minimising the log loss of the Elo-only win
probability (538 expected score, 50-point home edge) on weeks 1-8 of seasons
2020..Y-1. 2019 has no carry and is excluded from the criterion. Layer 3 is
not involved. Returns (Params, log dict).
"""
from __future__ import annotations

from dataclasses import replace

import numpy as np

from . import data, sources
from .ratings import Params, build_features, elo_expected

GRID = [round(0.50 + 0.05 * i, 2) for i in range(9)]   # 0.50 .. 0.90

_CACHE: dict = {}


def _inputs(seasons):
    key = tuple(seasons)
    if key not in _CACHE:
        games = data.load_games(seasons)
        stats = sources.nflverse_team_week(seasons)
        cols = list(sources.APP_STAT_COLS)
        lm = sources.league_means(stats, cols)
        _CACHE[key] = (games, stats, cols, lm)
    return _CACHE[key]


def elo_only_logloss(feats, p: Params, seasons, max_week=8) -> float:
    f = feats[feats.season.isin(seasons) & (feats.week <= max_week) & (feats.result != 0)]
    hfa = np.where(f.neutral == 1, 0.0, p.hfa)
    ph = elo_expected(f.elo_home.to_numpy(), f.elo_away.to_numpy(), hfa)
    y = (f.result > 0).to_numpy(float)
    ph = np.clip(ph, 1e-12, 1 - 1e-12)
    return float(-np.mean(y * np.log(ph) + (1 - y) * np.log(1 - ph)))


def choose_carry_elo(Y: int, seasons=data.SEASONS, base: Params = Params()):
    games, stats, cols, lm = _inputs(seasons)
    fit_games = games[games.season < Y]
    crit_seasons = [s for s in seasons if 2020 <= s < Y]
    scores = {}
    for c in GRID:
        p = replace(base, carry_elo=c)
        feats, _ = build_features(fit_games, stats, cols, lm, p)
        scores[c] = elo_only_logloss(feats, p, crit_seasons)
    best = min(scores, key=scores.get)
    log = {"test_season": Y, "carry_elo": best, "criterion_seasons": crit_seasons,
           "logloss_by_carry": {str(k): round(v, 5) for k, v in scores.items()}}
    return replace(base, carry_elo=best), log


BLEND_GRID = [round(0.1 * i, 1) for i in range(11)]   # 0.0 .. 1.0


def choose_market_blend(Y: int, seasons=data.SEASONS, base: Params | None = None):
    """Variant I: pick the market/carry blend weight by the same Elo-only
    criterion as G (weeks 1-8 of seasons 2020..Y-1). 0 = pure carry (A), 1 = H."""
    if base is None:
        base = Params(market_prior=sources.market_prior_elo())
    games, stats, cols, lm = _inputs(seasons)
    fit_games = games[games.season < Y]
    crit_seasons = [s for s in seasons if 2020 <= s < Y]
    scores = {}
    for b in BLEND_GRID:
        p = replace(base, market_blend=b)
        feats, _ = build_features(fit_games, stats, cols, lm, p)
        scores[b] = elo_only_logloss(feats, p, crit_seasons)
    best = min(scores, key=scores.get)
    log = {"test_season": Y, "market_blend": best, "criterion_seasons": crit_seasons,
           "logloss_by_blend": {str(k): round(v, 5) for k, v in scores.items()}}
    return replace(base, market_blend=best), log
