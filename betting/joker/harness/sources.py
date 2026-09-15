"""Layer 1: stat sources.

A source is a function `source(seasons) -> DataFrame` with one row per team per
regular-season game and columns:

    game_id, team, <stat columns...>

The rating layer only *requires* `off_epa` (offensive EPA per play). Any other
columns are carried through the EWMA state untouched so they can be exported to
the app, but the prediction model ignores them. NaN means "no data for this
game" and is replaced by the league mean at update time (same as the app).

Variants B/C/D will add sources here that compute `off_epa` from play-by-play
instead of taking nflverse's team-week totals.
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


def pbp_nflverse(seasons) -> pd.DataFrame:
    """Pipeline check: nflverse's own play-level EPA, aggregated by us
    (harness/pbp.py). Must score identically to `nflverse_team_week`."""
    from . import pbp
    return pbp.team_game_stats(pbp.aggregate(pbp.load_pbp(seasons)))


def pbp_raw(seasons) -> pd.DataFrame:
    """Control A_raw: nflverse play-level EPA, but passing EPA sums raw `epa`
    instead of the QB-credited `qb_epa`. Variants B/C/D are compared to this."""
    from . import pbp
    return pbp.team_game_stats(pbp.aggregate(pbp.load_pbp(seasons), qb_epa_col="epa"))


def market_prior_elo() -> dict:
    """Variant H: {season: {team: elo}} from preseason win totals
    (data/raw/win_totals.csv). w = expected wins / games; elo = 1500 + 400*log10(w/(1-w))."""
    wt = pd.read_csv(RAW / "win_totals.csv")
    extra = RAW / "win_totals_2026.csv"   # dated pre-kickoff snapshot, see PROVENANCE
    if extra.exists():
        wt = pd.concat([wt, pd.read_csv(extra)], ignore_index=True)
    w = (wt.exp_wins / wt.games).clip(0.05, 0.95)
    wt["elo"] = 1500 + 400 * np.log10(w / (1 - w))
    return {int(s): dict(zip(g.team, g.elo)) for s, g in wt.groupby("season")}


def league_means(stats: pd.DataFrame, cols) -> dict:
    """Per-stat mean over every team-game the source provides (NaNs skipped).
    Only used to fill an empty rating slot, i.e. before a team's first game."""
    return {c: float(np.nanmean(stats[c].to_numpy(dtype=float))) for c in cols}
