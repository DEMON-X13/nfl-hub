"""Has an input stopped meaning what it meant when the model was fitted?

The Joker is frozen: fitted on 2019-2025 and never refitted. That is deliberate, but it
assumes the inputs keep arriving on the same scale. They do not always. nflverse changes
what it charts, and the league changes its rules, and either way a column can quietly move
somewhere the trees have never seen -- at which point the model is extrapolating on it
while looking exactly as confident as ever.

This does not correct anything. Correcting an input under a frozen model is how you get
train/serve skew, which is worse than the drift. It reports, every run, so a pick that
turns on a moved input can be recognised as one.

The measure is the season's mean against the fitted mean, in fitted standard deviations.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def report(frozen, fresh, fit_seasons, season, cut=0.75):
    """[{col, fit, now, z}, ...] worst first, for inputs that have moved more than `cut`."""
    try:
        fit = pd.concat([pd.read_csv(frozen / f"stats_team_week_{y}.csv", low_memory=False)
                         for y in fit_seasons], ignore_index=True)
    except Exception:
        return []
    if "season_type" in fit.columns:
        fit = fit[fit.season_type == "REG"]
    now_path = (fresh / f"stats_team_week_{season}.csv") if fresh is not None else None
    if now_path is None or not now_path.exists():
        return []
    now = pd.read_csv(now_path, low_memory=False)
    if "season_type" in now.columns:
        now = now[now.season_type == "REG"]

    out = []
    for c in now.columns:
        if c in ("season", "week") or c not in fit.columns:
            continue
        a = pd.to_numeric(fit[c], errors="coerce")
        b = pd.to_numeric(now[c], errors="coerce")
        if a.notna().sum() < 100 or b.notna().sum() < 10:
            continue
        sd = a.std()
        if not np.isfinite(sd) or sd == 0:
            continue
        z = float((b.mean() - a.mean()) / sd)
        if abs(z) > cut:
            out.append(dict(col=c, fit=round(float(a.mean()), 3), now=round(float(b.mean()), 3), z=round(z, 2)))
    out.sort(key=lambda r: abs(r["z"]), reverse=True)
    return out
