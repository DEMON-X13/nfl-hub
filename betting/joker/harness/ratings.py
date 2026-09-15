"""Layer 2: the Elo + EWMA state machine, a line-for-line port of the app's
`updateRatings` / `features` / season rollover.

Walks every game in kickoff order. For each game it first records the features
the prediction model would have seen *before* kickoff, then updates both teams.
That ordering is what makes the output usable for walk-forward scoring.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class Params:
    alpha: float = 0.25       # EWMA weight on the newest game
    carry_elo: float = 0.70   # preseason: keep 70% of last season's Elo edge
    carry_off: float = 0.80   # preseason: keep 80% of offensive EPA edge
    carry_def: float = 0.20   # preseason: keep 20% of defensive EPA edge
    K: float = 30.0           # Elo step size
    hfa: float = 50.0         # home-field Elo bonus (not at neutral sites)
    warm: int = 6             # games per season during which alpha >= 1/(n+1)
    base_elo: float = 1500.0
    # Variant F switch: K for a game = K * (1 + k_boost / (n_min + 1)), where n_min
    # is the fewer games played this season by either team. 0 = constant K (app).
    k_boost: float = 0.0
    # Variant H switch: {season: {team: elo}} preseason Elo from the betting market.
    # When a season is present, it replaces the carried Elo for every team that
    # season (EPA carry untouched). None = app behaviour.
    market_prior: dict | None = None
    # Variant I: preseason Elo = blend * market + (1 - blend) * carried. 1.0 = H.
    market_blend: float = 1.0


class TeamState:
    __slots__ = ("elo", "n", "off", "dfn")

    def __init__(self, cols, base_elo):
        self.elo = base_elo
        self.n = 0
        self.off = {c: None for c in cols}   # own production
        self.dfn = {c: None for c in cols}   # opponents' production against us

    def val(self, side: str, c: str, lm: dict) -> float:
        v = (self.off if side == "off" else self.dfn)[c]
        return lm[c] if v is None else v


def elo_expected(elo_home, elo_away, hfa):
    return 1.0 / (1.0 + 10 ** (-(elo_home - elo_away + hfa) / 400.0))


def elo_update(h: TeamState, a: TeamState, result: float, neutral: int, p: Params, n_min: int = 0) -> float:
    """Margin-aware Elo (538 style). Returns the delta applied to the home team."""
    hfa = 0.0 if neutral else p.hfa
    exp_h = elo_expected(h.elo, a.elo, hfa)
    mult = math.log(abs(result) + 1) * (2.2 / (abs(h.elo - a.elo + hfa) * 0.001 + 2.2))
    sh = 1.0 if result > 0 else 0.5 if result == 0 else 0.0
    K = p.K * (1.0 + p.k_boost / (n_min + 1))
    d = K * mult * (sh - exp_h)
    h.elo += d
    a.elo -= d
    return d


def ewma_alpha(n: int, p: Params) -> float:
    return max(p.alpha, 1.0 / (n + 1)) if n < p.warm else p.alpha


def ewma_update(t: TeamState, mine: dict, theirs: dict, cols, lm: dict, p: Params) -> None:
    al = ewma_alpha(t.n, p)
    for c in cols:
        m = lm[c] if _isnan(mine[c]) else mine[c]
        o = lm[c] if _isnan(theirs[c]) else theirs[c]
        t.off[c] = m if t.off[c] is None else (1 - al) * t.off[c] + al * m
        t.dfn[c] = o if t.dfn[c] is None else (1 - al) * t.dfn[c] + al * o
    t.n += 1


def rollover(state: dict, cols, lm: dict, p: Params, season: int | None = None) -> None:
    """Preseason regression toward league average. Game count resets, so the
    warm-up schedule (alpha = 1, 1/2, 1/3, 1/4 ...) restarts each season.
    With a market prior for `season`, Elo is set from it instead of carried."""
    mp = (p.market_prior or {}).get(season) if season is not None else None
    for tm, t in state.items():
        carried = p.base_elo + p.carry_elo * (t.elo - p.base_elo)
        if mp is not None and tm in mp:
            t.elo = p.market_blend * mp[tm] + (1 - p.market_blend) * carried
        else:
            t.elo = carried
        for c in cols:
            if t.off[c] is not None:
                t.off[c] = lm[c] + p.carry_off * (t.off[c] - lm[c])
            if t.dfn[c] is not None:
                t.dfn[c] = lm[c] + p.carry_def * (t.dfn[c] - lm[c])
        t.n = 0


def _isnan(x) -> bool:
    return x is None or (isinstance(x, float) and math.isnan(x))


def game_features(g, h: TeamState, a: TeamState, lm: dict) -> dict:
    """Exactly the app's `features()` for one game, plus bookkeeping columns."""
    net = (h.val("off", "off_epa", lm) - h.val("dfn", "off_epa", lm)) \
        - (a.val("off", "off_epa", lm) - a.val("dfn", "off_epa", lm))
    rest = float(np.clip(g.home_rest - g.away_rest, -7, 7))
    # `neutral` is already a column of the games frame; don't duplicate it.
    row = {
        "elo_diff": h.elo - a.elo,
        "rest": rest,
        "net_epa": net,
        "elo_home": h.elo, "elo_away": a.elo,
        "off_home": h.val("off", "off_epa", lm), "def_home": h.val("dfn", "off_epa", lm),
        "off_away": a.val("off", "off_epa", lm), "def_away": a.val("dfn", "off_epa", lm),
        "n_home": h.n, "n_away": a.n,
    }
    # every other tracked stat, pre-game, for variants that need them (K2 uses d_sr, d_pass_epa, d_to)
    for c in h.off:
        if c == "off_epa":
            continue
        row[f"{c}_home"] = h.val("off", c, lm); row[f"d_{c}_home"] = h.val("dfn", c, lm)
        row[f"{c}_away"] = a.val("off", c, lm); row[f"d_{c}_away"] = a.val("dfn", c, lm)
    return row


def build_features(games: pd.DataFrame, stats: pd.DataFrame, cols, lm: dict, p: Params):
    """Run the state machine over `games` (kickoff order, may span seasons).

    Returns (features DataFrame aligned to `games`, final state dict). The final
    state is the end-of-last-season state *before* rollover; call `rollover` on
    it to get next season's preseason board.
    """
    lookup = {(r.game_id, r.team): {c: getattr(r, c) for c in cols}
              for r in stats.itertuples(index=False)}
    state: dict[str, TeamState] = {}
    rows = []
    cur_season = None
    missing = []
    for g in games.itertuples(index=False):
        if g.season != cur_season:
            if cur_season is not None:
                rollover(state, cols, lm, p, season=g.season)
            cur_season = g.season
        mp = (p.market_prior or {}).get(g.season, {})
        start = lambda tm: p.market_blend * mp[tm] + (1 - p.market_blend) * p.base_elo if tm in mp else p.base_elo
        h = state.setdefault(g.home_team, TeamState(cols, start(g.home_team)))
        a = state.setdefault(g.away_team, TeamState(cols, start(g.away_team)))
        rows.append(game_features(g, h, a, lm))

        sh = lookup.get((g.game_id, g.home_team))
        sa = lookup.get((g.game_id, g.away_team))
        if sh is None or sa is None:
            missing.append(g.game_id)
            sh = sh or {c: float("nan") for c in cols}
            sa = sa or {c: float("nan") for c in cols}
        elo_update(h, a, g.result, g.neutral, p, n_min=min(h.n, a.n))
        ewma_update(h, sh, sa, cols, lm, p)
        ewma_update(a, sa, sh, cols, lm, p)
    if missing:
        raise RuntimeError(f"{len(missing)} games have no stat rows, e.g. {missing[:5]}")
    feats = pd.DataFrame(rows)
    out = pd.concat([games.reset_index(drop=True), feats], axis=1)
    assert not out.columns.duplicated().any(), "duplicate feature columns would misalign the fit"
    return out, state


def state_to_app_teams(state: dict, cols) -> dict:
    """Serialize like MODEL.teams in the app (elo, n, stats, d_stats)."""
    out = {}
    for tm, t in sorted(state.items()):
        d = {"elo": t.elo, "n": t.n}
        d.update({c: t.off[c] for c in cols})
        d.update({"d_" + c: t.dfn[c] for c in cols})
        out[tm] = d
    return out
