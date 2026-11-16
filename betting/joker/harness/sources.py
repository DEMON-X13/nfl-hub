"""Layer 1: stat sources.

A source is a function `source(seasons) -> DataFrame` with one row per team per
regular-season game and columns:

    game_id, team, <stat columns...>

The rating layer only *requires* `off_epa` (offensive EPA per play). Any other
columns are carried through the EWMA state untouched so they can be exported to
the app, but the prediction model ignores them. NaN means "no data for this
game" and is replaced by the league mean at update time (same as the app).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .data import RAW, norm_team

# Columns the app tracks in its rating state, in the app's order.
APP_STAT_COLS = ["off_epa", "pass_epa", "rush_epa", "to", "sr", "expl"]


def _safe_div(num: pd.Series, den: pd.Series) -> pd.Series:
    return num / den.replace(0, np.nan)


def nflverse_team_week(seasons) -> pd.DataFrame:
    """Baseline source: nflverse `stats_team_week_{year}.csv`, exactly as the app's
    `statsFromRow` reads it (offensive EPA per dropback + carry)."""
    frames = [pd.read_csv(RAW / f"stats_team_week_{y}.csv", low_memory=False) for y in seasons]
    s = pd.concat(frames, ignore_index=True)
    s = s[s.season_type.isin(["REG", "POST"])].copy()

    def n(k):
        return pd.to_numeric(s[k], errors="coerce").fillna(0.0)

    db = n("attempts") + n("sacks_suffered")   # dropbacks
    car = n("carries")
    plays = db + car
    return pd.DataFrame({
        "game_id": s.game_id.values,
        "team": norm_team(s.team).values,
        "off_epa": _safe_div(n("passing_epa") + n("rushing_epa"), plays).values,
        "pass_epa": _safe_div(n("passing_epa"), db).values,
        "rush_epa": _safe_div(n("rushing_epa"), car).values,
        "to": (n("passing_interceptions") + n("fumbles_lost_total")).values,
        "sr": _safe_div(n("sacks_suffered"), db).values,
        "expl": _safe_div(n("passing_20") + n("rushing_10"), plays).values,
    })


def league_means(stats: pd.DataFrame, cols) -> dict:
    """Per-stat mean over every team-game the source provides (NaNs skipped).
    Only used to fill an empty rating slot, i.e. before a team's first game."""
    return {c: float(np.nanmean(stats[c].to_numpy(dtype=float))) for c in cols}
