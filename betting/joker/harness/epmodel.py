"""Variant B / B3: a from-scratch expected-points model.

Target: the next scoring event in the same half, from the offense's view.
Seven classes with point values {+7, -7, +3, -3, +2, -2, 0}. EP is the
probability-weighted sum. Features are nflfastR's minus the era term.

`ep_for_test_season(Y, window)` fits on plays from seasons [Y-window, Y-1]
(never Y), scores every play 2019..Y, converts to EPA with harness.ep, and
aggregates with harness.pbp. Two-point tries have no down; they keep nflverse's
constant try value (0.947) as their `ep`, which is not a model output.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier

from . import pbp
from .data import SEASONS
from .ep import epa_from_ep

FEATURES = ["half_seconds_remaining", "yardline_100", "down", "ydstogo", "home", "dome",
            "posteam_timeouts_remaining", "defteam_timeouts_remaining"]
EXTRA_COLS = ["game_half", "qtr", "ep", "touchdown", "td_team", "field_goal_result", "safety",
              "extra_point_attempt", "extra_point_result", "two_point_conv_result",
              "half_seconds_remaining", "yardline_100", "down", "ydstogo", "posteam_type", "roof",
              "posteam_timeouts_remaining", "defteam_timeouts_remaining"]
CLASS_VALUES = np.array([0.0, 7.0, -7.0, 3.0, -3.0, 2.0, -2.0])   # index = class id

_PLAYS: pd.DataFrame | None = None


def plays() -> pd.DataFrame:
    """All plays 2019-2025 with features and next-score labels, loaded once."""
    global _PLAYS
    if _PLAYS is None:
        p = pbp.load_pbp(SEASONS, extra_cols=EXTRA_COLS)
        p["home"] = (p.posteam_type == "home").astype(float)
        p["dome"] = p.roof.isin(["dome", "closed"]).astype(float)
        p["label"] = next_score_label(p)
        _PLAYS = p
    return _PLAYS


def next_score_label(p: pd.DataFrame) -> pd.Series:
    """Class id of the next score in the half, from each row's offense's view."""
    team = pd.Series(np.nan, index=p.index, dtype=object)
    val = pd.Series(np.nan, index=p.index)
    td = p.touchdown == 1
    team[td] = p.td_team[td]; val[td] = 7
    fg = p.field_goal_result == "made"
    team[fg] = p.posteam[fg]; val[fg] = 3
    sf = p.safety == 1
    team[sf] = p.defteam[sf]; val[sf] = 2
    key = [p.game_id, p.game_half]
    team = team.groupby(key, sort=False).bfill()
    val = val.groupby(key, sort=False).bfill()
    signed = np.where(team.isna(), 0.0, np.where(team == p.posteam, val, -val))
    lookup = {v: i for i, v in enumerate(CLASS_VALUES)}
    return pd.Series([lookup[x] for x in signed], index=p.index)


def fit_rows(p: pd.DataFrame) -> pd.Series:
    return (p.down.notna() & p.play_type.notna() & ~p.play_type.isin(["extra_point", "kickoff"])
            & (p.two_point_attempt == 0) & p[FEATURES].notna().all(axis=1))


def fit_ep_model(train: pd.DataFrame, seed: int = 0) -> HistGradientBoostingClassifier:
    m = HistGradientBoostingClassifier(max_iter=500, learning_rate=0.1, early_stopping=True,
                                       validation_fraction=0.1, random_state=seed)
    m.fit(train[FEATURES].to_numpy(float), train.label.to_numpy())
    return m


def score_ep(m, p: pd.DataFrame) -> pd.Series:
    ok = p.down.notna() & p[FEATURES].notna().all(axis=1)
    ep = pd.Series(np.nan, index=p.index)
    proba = m.predict_proba(p.loc[ok, FEATURES].to_numpy(float))
    ep[ok] = proba @ CLASS_VALUES[m.classes_]
    two = (p.two_point_attempt == 1) & ep.isna()
    ep[two] = p.ep[two]  # constant try value, not a model output
    return ep


def ep_for_test_season(Y: int, window: int | None = None, seasons=SEASONS) -> pd.DataFrame:
    """Team-game stats for every season up to Y, with EPA from a model that
    never saw season Y. Returns the same shape as sources.pbp_raw."""
    p = plays()
    lo = 2019 if window is None else max(2019, Y - window)
    train = p[(p.season >= lo) & (p.season < Y) & fit_rows(p)]
    m = fit_ep_model(train)
    sub = p[p.season <= Y].copy()
    sub["ep_v"] = score_ep(m, sub)
    sub["epa_v"] = epa_from_ep(sub, "ep_v")
    agg = pbp.aggregate(sub, epa_col="epa_v", qb_epa_col="epa_v")
    out = pbp.team_game_stats(agg)
    out.attrs["ep_model"] = {"test_season": Y, "fit_seasons": sorted(train.season.unique().tolist()),
                             "n_fit_plays": int(len(train)), "n_iter": int(m.n_iter_)}
    return out
