"""Variants C and D: re-weight the eight components of nflverse raw EPA.

Every pass or run play the aggregation counts lands in exactly one bucket:
  fumble      offense lost a fumble (whole play)
  int         interception (whole play)
  sack
  comp_air    completed pass, air EPA (nflverse comp_air_epa)
  comp_yac    completed pass, the rest (epa - comp_air_epa)
  inc         incomplete pass (spikes, failed 2-pt passes included)
  scramble    QB scramble
  rush        designed run, kneel
The eight sum to A_raw's passing + rushing EPA for every team-game (asserted).

C weights = split-half reliability of each component's per-play mean across
team-seasons (weeks 1-9 vs 10-18), fit seasons only, clipped to [0, 1].
D weights = ridge coefficients of next-game margin on season-to-date per-play
component means, fit seasons only, rescaled to raw EPA's spread.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import pbp
from .data import SEASONS, load_games

COMPONENTS = ["fumble", "int", "sack", "comp_air", "comp_yac", "inc", "scramble", "rush"]
EXTRA_COLS = ["comp_air_epa", "week", "season_type"]

_TG: pd.DataFrame | None = None


def team_game_components(seasons=SEASONS) -> pd.DataFrame:
    """One row per team-game: plays, total raw EPA, and the eight component sums."""
    global _TG
    if _TG is not None:
        return _TG
    p = pbp.load_pbp(seasons, extra_cols=EXTRA_COLS)
    pm = p.play_type.isin(["pass", "qb_spike"]) & p.passer_player_id.notna()
    rm = p.play_type.isin(["run", "qb_kneel"]) & p.rusher_player_id.notna()
    q = p[pm | rm].copy()
    epa = q.epa.fillna(0.0)
    comp_air = q.comp_air_epa.fillna(0.0)
    bucket = pd.Series("rush", index=q.index)
    bucket[q.qb_scramble == 1] = "scramble"
    bucket[pm[q.index]] = "inc"
    is_comp = pm[q.index] & (q.complete_pass == 1)
    bucket[is_comp] = "comp"          # split below
    bucket[q.sack == 1] = "sack"
    bucket[q.interception == 1] = "int"
    bucket[q.fumble_lost == 1] = "fumble"
    for c in COMPONENTS:
        q[c] = np.where(bucket == c, epa, 0.0)
    comp = bucket == "comp"
    q["comp_air"] = np.where(comp, comp_air, 0.0)
    q["comp_yac"] = np.where(comp, epa - comp_air, 0.0)
    q["_epa"] = epa
    sums = q.groupby(["game_id", "team"])[COMPONENTS + ["_epa"]].sum()
    agg = pbp.aggregate(p, qb_epa_col="epa").set_index(["game_id", "team"])
    tg = agg[["attempts", "sacks_suffered", "carries", "passing_epa", "rushing_epa"]].join(sums, how="left").fillna(0.0)
    tg["plays"] = tg.attempts + tg.sacks_suffered + tg.carries
    total = tg.passing_epa + tg.rushing_epa
    assert np.allclose(tg[COMPONENTS].sum(axis=1), total, atol=1e-6), "components must sum to raw EPA"
    tg = tg.reset_index()
    g = load_games(seasons)[["game_id", "season", "week", "game_type", "home_team", "away_team", "result"]]
    tg = tg.merge(g, on="game_id", how="inner")
    tg["margin"] = np.where(tg.team == tg.home_team, tg.result, -tg.result)
    _TG = tg
    return tg


def per_play(tg: pd.DataFrame) -> pd.DataFrame:
    return tg[COMPONENTS].div(tg.plays.replace(0, np.nan), axis=0)


def weights_C(tg: pd.DataFrame, fit_seasons) -> dict:
    """Split-half reliability per component, regular season, fit seasons only."""
    f = tg[tg.season.isin(fit_seasons) & (tg.game_type == "REG")]
    half = np.where(f.week <= 9, "a", "b")
    sums = f.groupby([f.season, f.team, half])[COMPONENTS + ["plays"]].sum()
    rate = sums[COMPONENTS].div(sums.plays, axis=0).unstack(level=2)
    w = {}
    for c in COMPONENTS:
        a, b = rate[(c, "a")], rate[(c, "b")]
        ok = a.notna() & b.notna()
        w[c] = float(np.clip(np.corrcoef(a[ok], b[ok])[0, 1], 0.0, 1.0))
    return w


def _to_date_means(tg: pd.DataFrame) -> pd.DataFrame:
    """Season-to-date per-play component means before each game, and the
    margin of that game (the 'next game' for the state to date)."""
    tg = tg.sort_values(["season", "team", "week"]).copy()
    grp = tg.groupby(["season", "team"], sort=False)
    csum = grp[COMPONENTS + ["plays"]].cumsum() - tg[COMPONENTS + ["plays"]]  # before this game
    tg["n_prior"] = grp.cumcount()
    means = csum[COMPONENTS].div(csum.plays.replace(0, np.nan), axis=0)
    means.columns = [f"m_{c}" for c in COMPONENTS]
    return pd.concat([tg, means], axis=1)


def weights_D(tg: pd.DataFrame, fit_seasons, min_prior: int = 6) -> dict:
    """Ridge of next-game margin on to-date component means; penalty chosen by
    leave-one-season-out within the fit seasons."""
    from sklearn.linear_model import Ridge
    d = _to_date_means(tg)
    d = d[d.season.isin(fit_seasons) & (d.n_prior >= min_prior)]
    X = d[[f"m_{c}" for c in COMPONENTS]].to_numpy(float)
    y = d.margin.to_numpy(float)
    mu, sd = X.mean(axis=0), X.std(axis=0)
    Xs = (X - mu) / sd
    alphas = [1e-2, 1e-1, 1, 10, 100, 1e3, 1e4, 1e5, 1e6]
    best, best_mse = None, np.inf
    if len(set(d.season)) >= 2:
        for a in alphas:
            se = 0.0
            for s in sorted(set(d.season)):
                tr, te = (d.season != s).to_numpy(), (d.season == s).to_numpy()
                r = Ridge(alpha=a).fit(Xs[tr], y[tr])
                se += np.sum((r.predict(Xs[te]) - y[te]) ** 2)
            if se < best_mse:
                best, best_mse = a, se
    else:
        best = 10.0
    r = Ridge(alpha=best).fit(Xs, y)
    coef = r.coef_ / sd                       # back to per-play units
    # rescale so weighted per-play total has raw EPA's spread across team-games
    pp = per_play(tg[tg.season.isin(fit_seasons)]).fillna(0.0)
    raw_sd = pp.sum(axis=1).std()
    wtd_sd = (pp.to_numpy() @ coef).std()
    scale = raw_sd / wtd_sd if wtd_sd > 0 else 1.0
    w = {c: float(coef[i] * scale) for i, c in enumerate(COMPONENTS)}
    w["_alpha"] = float(best)
    return w


def weighted_stats(tg: pd.DataFrame, w: dict) -> pd.DataFrame:
    tot = sum(w[c] * tg[c] for c in COMPONENTS)
    return pd.DataFrame({"game_id": tg.game_id, "team": tg.team,
                         "off_epa": tot / tg.plays.replace(0, np.nan)})


def stats_for_test_season(kind: str, Y: int, seasons=SEASONS) -> pd.DataFrame:
    tg = team_game_components(seasons)
    fit_seasons = [s for s in seasons if s < Y]
    w = weights_C(tg, fit_seasons) if kind == "C" else weights_D(tg, fit_seasons)
    out = weighted_stats(tg[tg.season <= Y], w)
    out.attrs["weights"] = {"test_season": Y, **w}
    return out
