"""Play-by-play loader, the quarterback table's source (qb.py).

The team-game aggregation that rebuilt nflverse's `stats_team_week` from play-level EPA (verified on 2019-2025
by check_pbp.py) and its research variants stayed with the research; the Joker reads nflverse's team-week file.
"""
from __future__ import annotations

from pathlib import Path

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
