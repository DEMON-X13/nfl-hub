"""Games loader (nflverse games.csv). Regular season only, finished games only."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
SEASONS = list(range(2019, 2026))

# Franchise moves inside or just before the window. One code per franchise so a
# team's rating state survives the rename.
TEAM_FIX = {"OAK": "LV", "SD": "LAC", "STL": "LA"}

GAME_COLS = [
    "game_id", "season", "game_type", "week", "gameday", "gametime",
    "home_team", "away_team", "home_score", "away_score", "result",
    "home_rest", "away_rest", "neutral",
    "spread_line", "home_moneyline", "away_moneyline",
]


def norm_team(s: pd.Series) -> pd.Series:
    return s.replace(TEAM_FIX)


def load_games(seasons=SEASONS, include_post: bool = True) -> pd.DataFrame:
    """One row per finished game, in kickoff order.

    Playoff games are included by default because the app's rating pipeline
    feeds them through the state machine (verified: the 2026 preseason board
    only reproduces with playoffs in). `game_type` is REG for regular season,
    WC/DIV/CON/SB for playoffs. `result` is home score minus away score.
    `neutral` is 1 when nflverse's location is anything other than 'Home'.
    """
    g = pd.read_csv(RAW / "games.csv", low_memory=False)
    keep = g.season.isin(seasons) & g.result.notna()
    if not include_post:
        keep &= g.game_type == "REG"
    g = g[keep].copy()
    for c in ("home_team", "away_team"):
        g[c] = norm_team(g[c])
    g["home_rest"] = g.home_rest.fillna(7)
    g["away_rest"] = g.away_rest.fillna(7)
    g["gametime"] = g.gametime.fillna("")
    g["neutral"] = (g.location != "Home").astype(int)
    g["result"] = g.result.astype(float)
    g = g.sort_values(["season", "gameday", "gametime", "game_id"], kind="stable")
    return g[GAME_COLS].reset_index(drop=True)
