"""Expected points -> EPA, the way nflfastR does it.

Given a per-play `ep` column (expected points for the offense in the pre-snap
state), produce `epa` for every play. Verified against nflverse's own `epa`
column by feeding it nflverse's `ep` (check_ep.py: 99.99% of pass/run plays
within 1e-6; the rest are coach's-challenge rows). Variants B/B3 feed their own
`ep` through the same function, so the only thing that changes is the EP model.

Rules (offense's perspective, ep_after - ep_before):
  * offensive touchdown           -> ep_after = +7   (extra point assumed)
  * defensive/return touchdown    -> ep_after = -7
  * field goal made               -> ep_after = +3
  * safety conceded               -> ep_after = -2
  * two-point try                 -> ep_after = 2 or 0; extra point 1 or 0
  * last play of the half / game  -> ep_after = 0
  * otherwise                     -> next play's ep, sign flipped if the other
                                     team has the ball on the next play
`next play` = the next row in the game that has a possession team, a play type
and a non-null ep. Timeouts, end-of-quarter markers and game headers are skipped.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

EP_ROW_COLS = [
    "game_id", "play_id", "posteam", "defteam", "game_half", "qtr", "ep", "epa",
    "touchdown", "td_team", "field_goal_result", "safety", "play_type",
    "extra_point_attempt", "extra_point_result", "two_point_attempt", "two_point_conv_result",
    "desc",
]


def epa_from_ep(p: pd.DataFrame, ep_col: str = "ep") -> pd.Series:
    """`p` must hold each game's rows in file order; returns EPA aligned to p.index."""
    elig = p[ep_col].notna() & p.posteam.notna() & p.play_type.notna()
    q = p[elig]
    g = q.groupby("game_id", sort=False)
    ep = q[ep_col]
    nxt_ep, nxt_pos, nxt_half = g[ep_col].shift(-1), g.posteam.shift(-1), g.game_half.shift(-1)
    ep_after = np.where(nxt_pos == q.posteam, nxt_ep, -nxt_ep)
    ep_after = np.where(nxt_half.ne(q.game_half) | nxt_ep.isna(), 0.0, ep_after)
    off_td = (q.touchdown == 1) & (q.td_team == q.posteam)
    def_td = (q.touchdown == 1) & q.td_team.notna() & (q.td_team != q.posteam)
    ep_after = np.where(off_td, 7.0, ep_after)
    ep_after = np.where(def_td, -7.0, ep_after)
    ep_after = np.where(q.field_goal_result == "made", 3.0, ep_after)
    ep_after = np.where(q.safety == 1, -2.0, ep_after)
    ep_after = np.where(q.two_point_attempt == 1, np.where(q.two_point_conv_result == "success", 2.0, 0.0), ep_after)
    ep_after = np.where(q.extra_point_attempt == 1, np.where(q.extra_point_result == "good", 1.0, 0.0), ep_after)
    out = pd.Series(np.nan, index=p.index)
    out[elig] = ep_after - ep.to_numpy()
    return out
