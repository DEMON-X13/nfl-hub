"""Variant registry. A variant is a *complete* recipe: which layer-1 source
feeds the ratings, the rating parameters, and the feature list.

Add one entry per variant. Change one thing per variant. Pre-register (commit)
the definition before looking at its results. See VARIANTS.md.

Two kinds of source:
  source(seasons)            one stats table for all seasons (A, A_pbp, A_raw)
  per_season(Y, seasons)     a stats table rebuilt for test season Y using only
                             models/weights fit on seasons < Y (B, B3, C, D)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

import pandas as pd

from . import sources
from .fit import DEFAULT_FEATS
from .ratings import Params


@dataclass(frozen=True)
class Variant:
    name: str
    description: str
    source: Callable[[list], pd.DataFrame] | None = None            # layer 1, static
    per_season: Callable[[int, list], pd.DataFrame] | None = None   # layer 1, per test season
    stat_cols: tuple = tuple(sources.APP_STAT_COLS)  # columns carried in the state
    params: Params = field(default_factory=Params)   # layer 2
    feats: tuple = DEFAULT_FEATS                     # layer 3
    pin_neutral: bool = True
    # Fit only on games where both teams have played this many games this season.
    # Matches the app pipeline (= params.warm). Test games are never filtered.
    fit_min_games: int | None = 6
    # Seasons the headline number is computed on (None = all test seasons).
    # The others are reported separately as secondary.
    headline_seasons: tuple | None = None
    # Layer-2 parameters chosen per test season from earlier seasons (variant G).
    # Returns (Params, log dict). Overrides `params` when set.
    params_for_season: Callable[[int, list], tuple] | None = None
    # Layer-3 feature augmentation per test season, fit on seasons < Y (variant K).
    augment: Callable[[pd.DataFrame, int], pd.DataFrame] | None = None


def _B(Y, seasons):
    from .epmodel import ep_for_test_season
    return ep_for_test_season(Y, window=None, seasons=seasons)


def _B3(Y, seasons):
    from .epmodel import ep_for_test_season
    return ep_for_test_season(Y, window=3, seasons=seasons)


def _C(Y, seasons):
    from .components import stats_for_test_season
    return stats_for_test_season("C", Y, seasons)


def _D(Y, seasons):
    from .components import stats_for_test_season
    return stats_for_test_season("D", Y, seasons)


def _G(Y, seasons):
    from .tune import choose_carry_elo
    return choose_carry_elo(Y, seasons)


def _K1(feats, Y):
    from .qb import augment
    return augment(feats, Y, with_def=False)


def _K2(feats, Y):
    from .qb import augment
    return augment(feats, Y, with_def=True)


def _K3(feats, Y):
    from .qb import augment, FADE
    return augment(feats, Y, with_def=False, fade=FADE)


def _I(Y, seasons):
    from .tune import choose_market_blend
    return choose_market_blend(Y, seasons)


PBP_COLS = ("off_epa", "pass_epa", "rush_epa", "sr")

VARIANTS: dict[str, Variant] = {
    "A": Variant(
        name="A",
        description="Baseline. nflverse team-week EPA, app v1.08 / model build 2026.2.",
        source=sources.nflverse_team_week,
    ),
    # Not a research variant: same EPA as A, but rebuilt from play-by-play by our
    # own aggregation. Exists to prove the pbp pipeline before variants use it.
    "A_pbp": Variant(
        name="A_pbp",
        description="Pipeline check. nflverse play-level EPA aggregated by harness/pbp.py.",
        source=sources.pbp_nflverse, stat_cols=PBP_COLS,
    ),
    "A_raw": Variant(
        name="A_raw",
        description="Control. Same as A_pbp but passing EPA uses raw epa, not qb_epa. Comparison point for B/C/D.",
        source=sources.pbp_raw, stat_cols=PBP_COLS,
    ),
    "B": Variant(
        name="B",
        description="Recency EP model: gradient-boosted next-score model fit on 2019..Y-1 plays, no era term.",
        per_season=_B, stat_cols=PBP_COLS, headline_seasons=(2023, 2024, 2025),
    ),
    "B3": Variant(
        name="B3",
        description="As B, but the EP model is fit on the three seasons before Y only.",
        per_season=_B3, stat_cols=PBP_COLS, headline_seasons=(2023, 2024, 2025),
    ),
    "C": Variant(
        name="C",
        description="Stability-weighted EPA: eight raw-EPA components weighted by split-half reliability (fit seasons only).",
        per_season=_C, stat_cols=("off_epa",),
    ),
    "D": Variant(
        name="D",
        description="Predictive-weighted EPA: the same eight components weighted by a ridge fit against next-game margin (fit seasons only).",
        per_season=_D, stat_cols=("off_epa",),
    ),
    # ---- layer 2 (see VARIANTS.md, second part). All keep A's EPA. ----
    "E": Variant(
        name="E",
        description="Keep the preseason prior: warm 6 -> 0, EWMA weight 0.25 from a team's first game.",
        source=sources.nflverse_team_week, params=Params(warm=0),
    ),
    "F": Variant(
        name="F",
        description="Early-season K: K = 30 * (1 + 1/(n_min+1)), n_min = fewer games played this season by either team.",
        source=sources.nflverse_team_week, params=Params(k_boost=1.0),
    ),
    "G": Variant(
        name="G",
        description="carry_elo chosen per test season from {0.50..0.90} by Elo-only log loss on weeks 1-8 of prior seasons.",
        source=sources.nflverse_team_week, params_for_season=_G,
    ),
    "H": Variant(
        name="H",
        description="Preseason market prior: Elo seeded each season from the closing preseason win total (Covers/Sports Odds History), replacing the Elo carry. EPA carry unchanged.",
        source=sources.nflverse_team_week, params=Params(market_prior=sources.market_prior_elo()),
    ),
    "I": Variant(
        name="I",
        description="Market/carry blend: preseason Elo = b*market + (1-b)*carried, b chosen per test season from {0.0..1.0} by Elo-only log loss on weeks 1-8 of prior seasons.",
        source=sources.nflverse_team_week, params_for_season=_I,
    ),
    "K1": Variant(
        name="K1",
        description="QB drop: rating(usual starter) - rating(actual starter), home minus away, added to the four base features.",
        source=sources.nflverse_team_week, augment=_K1, feats=DEFAULT_FEATS + ("qb_drop",),
    ),
    "K2": Variant(
        name="K2",
        description="K1 plus the drop times the opponent's pass-defence strength (sacks forced, pass EPA allowed, takeaways).",
        source=sources.nflverse_team_week, augment=_K2, feats=DEFAULT_FEATS + ("qb_drop", "qb_drop_x_def"),
    ),
    "K3": Variant(
        name="K3",
        description="K1 with the drop fading at 0.75^k over further games with the same starter (the EWMA's own retention).",
        source=sources.nflverse_team_week, augment=_K3, feats=DEFAULT_FEATS + ("qb_drop",),
    ),
    "J": Variant(
        name="J",
        description="E + H: warm 0 (keep the EPA prior) and the market Elo prior together.",
        source=sources.nflverse_team_week, params=Params(warm=0, market_prior=sources.market_prior_elo()),
    ),
}
