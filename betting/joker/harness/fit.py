"""Layer 3: margin regression + logistic win probability.

    margin   = intercept + sum(coef_i * feat_i)
    p(home)  = 1 / (1 + exp(-k * margin))

`pin_neutral` reproduces the app's neutral-site fix: after the least-squares
fit, the `neutral` coefficient is forced to exactly -intercept so a neutral
game carries no home-field edge. (Fitting it freely on ~34 games gave +0.42,
which *added* home field at neutral sites. See PROJECT_BRIEF.md.)
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

DEFAULT_FEATS = ("elo_diff", "rest", "neutral", "net_epa")


@dataclass
class Model:
    feats: tuple
    coef: np.ndarray
    intercept: float
    k: float
    n_fit: int = 0
    seasons_fit: tuple = field(default_factory=tuple)

    def margin(self, df: pd.DataFrame) -> np.ndarray:
        X = df[list(self.feats)].to_numpy(dtype=float)
        return self.intercept + X @ self.coef

    def p_home(self, df: pd.DataFrame) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-self.k * self.margin(df)))

    def as_dict(self) -> dict:
        return {"feats": list(self.feats), "coef": [float(c) for c in self.coef],
                "intercept": float(self.intercept), "k": float(self.k),
                "n_fit": int(self.n_fit), "seasons_fit": list(self.seasons_fit)}


def fit_ols(X: np.ndarray, y: np.ndarray):
    A = np.column_stack([np.ones(len(X)), X])
    beta, *_ = np.linalg.lstsq(A, y, rcond=None)
    return float(beta[0]), beta[1:]


def fit_k(margin: np.ndarray, home_win: np.ndarray, iters: int = 50) -> float:
    """One-parameter logistic MLE by Newton's method. Ties must be excluded."""
    k = 0.1
    for _ in range(iters):
        z = k * margin
        pz = 1.0 / (1.0 + np.exp(-z))
        grad = np.sum((home_win - pz) * margin)
        hess = -np.sum(pz * (1 - pz) * margin * margin)
        step = grad / hess
        k -= step
        if abs(step) < 1e-12:
            break
    return float(k)


def fit_model(df: pd.DataFrame, feats=DEFAULT_FEATS, pin_neutral: bool = True) -> Model:
    """Fit on every row of `df` (the caller decides which seasons are in it)."""
    feats = tuple(feats)
    X = df[list(feats)].to_numpy(dtype=float)
    y = df["result"].to_numpy(dtype=float)
    intercept, coef = fit_ols(X, y)
    if pin_neutral and "neutral" in feats:
        coef[feats.index("neutral")] = -intercept
    m = Model(feats, coef, intercept, k=0.0, n_fit=len(df),
              seasons_fit=tuple(sorted(df.season.unique().tolist())))
    nt = df["result"] != 0
    m.k = fit_k(m.margin(df[nt]), (df.loc[nt, "result"] > 0).to_numpy(dtype=float))
    return m
