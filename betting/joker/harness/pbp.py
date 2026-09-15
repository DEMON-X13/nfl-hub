"""Play-by-play loader and the team-game aggregation that reproduces nflverse's
`stats_team_week` file from play-level EPA.

Verified rule (check_pbp.py, all seasons 2019-2025, REG + POST):

    passing plays  = play_type in (pass, qb_spike), passer_player_id present
        attempts     = complete + incomplete + interception   (2-pt tries have none)
        sacks        = sum(sack)
        passing_epa  = sum(qb_epa)     <- QB-credited EPA, not raw epa
    rushing plays  = play_type in (run, qb_kneel), rusher_player_id present
        carries      = sum(rush_attempt) excluding 2-pt tries
        rushing_epa  = sum(epa)        <- includes 2-pt tries

Residual: 2 of 3,920 team-games differ by one attempt or one carry (2024_15_MIA_HOU
HOU, 2025_02_SEA_PIT PIT); the play-by-play and stats files were generated at
different times. Effect on off_epa is < 0.003 for those two rows.

Variants that build their own EPA replace the `epa`/`qb_epa` columns and call
`aggregate()` unchanged, so layer 1 is the only thing that moves.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from .data import ROOT, norm_team

PBP_DIR = ROOT / "data" / "pbp"

BASE_COLS = [
    "game_id", "season", "season_type", "week", "posteam", "defteam", "home_team", "away_team",
    "play_id", "play_type", "desc",
    "pass_attempt", "rush_attempt", "sack", "qb_scramble", "qb_dropback", "two_point_attempt",
    "complete_pass", "incomplete_pass", "interception", "fumble_lost",
    "passer_player_id", "rusher_player_id", "receiver_player_id",
    "passing_yards", "rushing_yards", "yards_gained",
    "epa", "qb_epa",
]

# What a from-scratch EP model needs (step 4). Loaded on request only.
SITUATION_COLS = [
    "qtr", "down", "ydstogo", "yardline_100", "game_seconds_remaining", "half_seconds_remaining",
    "posteam_timeouts_remaining", "defteam_timeouts_remaining", "score_differential",
    "ep", "wp", "roof", "posteam_type", "fixed_drive", "drive", "series",
]


def load_pbp(seasons, extra_cols=()) -> pd.DataFrame:
    """Plays with a possession team, REG + POST, all `seasons`, team codes normalised."""
    cols = list(dict.fromkeys(BASE_COLS + list(extra_cols)))
    frames = []
    for y in seasons:
        f = PBP_DIR / f"play_by_play_{y}.parquet"
        if not f.exists():
            raise FileNotFoundError(f"{f} missing; download from nflverse-data releases (pbp)")
        frames.append(pd.read_parquet(f, columns=cols))
    p = pd.concat(frames, ignore_index=True)
    p = p[p.posteam.notna() & p.season_type.isin(["REG", "POST"])].copy()
    p["team"] = norm_team(p.posteam)
    return p


def aggregate(p: pd.DataFrame, epa_col: str = "epa", qb_epa_col: str = "qb_epa") -> pd.DataFrame:
    """One row per (game_id, team) with the box-score fields the app's
    `statsFromRow` reads. Pass different column names to plug in a custom EPA."""
    # play_type filter drops 'no_play' (penalty wiped it) and oddities such as a
    # blocked field goal where the kicker threw an incomplete pass.
    pm = p.play_type.isin(["pass", "qb_spike"]) & p.passer_player_id.notna()
    rm = p.play_type.isin(["run", "qb_kneel"]) & p.rusher_player_id.notna()
    key = ["game_id", "team"]
    a = p[pm].groupby(key).agg(
        completions=("complete_pass", "sum"), _inc=("incomplete_pass", "sum"),
        passing_interceptions=("interception", "sum"), sacks_suffered=("sack", "sum"),
        passing_epa=(qb_epa_col, "sum"), passing_yards=("passing_yards", "sum"),
    )
    a["attempts"] = a.completions + a._inc + a.passing_interceptions
    a = a.drop(columns="_inc")
    r = p[rm].groupby(key).agg(rushing_epa=(epa_col, "sum"), rushing_yards=("rushing_yards", "sum"))
    r["carries"] = p[rm & (p.two_point_attempt == 0)].groupby(key).rush_attempt.sum()
    out = a.join(r, how="outer").fillna(0.0).reset_index()
    return out


def team_game_stats(agg: pd.DataFrame) -> pd.DataFrame:
    """The app's per-game rates from an aggregate() frame (same math as
    sources.nflverse_team_week; explosive plays and fumbles are not rebuilt
    here because the model never uses them)."""
    db = agg.attempts + agg.sacks_suffered
    car = agg.carries
    plays = db + car
    nan = lambda s, d: s / d.replace(0, np.nan)
    return pd.DataFrame({
        "game_id": agg.game_id, "team": agg.team,
        "off_epa": nan(agg.passing_epa + agg.rushing_epa, plays),
        "pass_epa": nan(agg.passing_epa, db),
        "rush_epa": nan(agg.rushing_epa, car),
        "to": agg.passing_interceptions,   # fumbles lost not rebuilt; unused by the model
        "sr": nan(agg.sacks_suffered, db),
        "expl": np.nan,                    # unused by the model
    })
