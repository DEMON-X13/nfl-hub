"""Walk-forward scorer. One entry point: `walk_forward(features, ...)`.

For each test season Y (2021 onward by default) the prediction model is fit on
every game from seasons strictly before Y, then applied to season Y. The rating
state machine has already run continuously across all seasons, which is fine:
it only ever looks backward.

Outputs per-game predictions (so wins can be explained game by game) and a
summary: straight-up accuracy by season and week bucket, calibration, and
margin error.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .fit import DEFAULT_FEATS, Model, fit_model

WEEK_BUCKETS = [("wk1-4", 1, 4), ("wk5-9", 5, 9), ("wk10-14", 10, 14), ("wk15-18", 15, 18), ("playoffs", 19, 22)]
CONF_BINS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.8, 1.0001]


def walk_forward(features: pd.DataFrame, feats=DEFAULT_FEATS, first_test: int = 2021,
                 pin_neutral: bool = True, fit_min_games: int | None = None):
    """Returns (per-game predictions DataFrame, {season: Model}).

    `fit_min_games`: drop from the *fit* (never from the test set) any game where
    either team had played fewer than this many games that season. Early-season
    ratings are one or two games of noise; the app's pipeline fit on warmed-up
    games only (this is what reproduces its 2021/2022 numbers exactly).
    """
    seasons = sorted(features.season.unique())
    preds, models = [], {}
    for Y in [s for s in seasons if s >= first_test]:
        train = features[features.season < Y]
        if fit_min_games:
            train = train[(train.n_home >= fit_min_games) & (train.n_away >= fit_min_games)]
        test = features[features.season == Y].copy()
        m = fit_model(train, feats, pin_neutral)
        models[Y] = m
        test["pred_margin"] = m.margin(test)
        test["p_home"] = m.p_home(test)
        preds.append(test)
    out = pd.concat(preds, ignore_index=True)
    return annotate(out), models


def annotate(df: pd.DataFrame) -> pd.DataFrame:
    """Add pick / correctness / error columns to a frame with pred_margin, p_home."""
    df = df.copy()
    df["pick"] = np.where(df.pred_margin >= 0, df.home_team, df.away_team)
    df["conf"] = np.maximum(df.p_home, 1 - df.p_home)
    df["home_win"] = np.where(df.result > 0, 1.0, np.where(df.result < 0, 0.0, np.nan))
    winner = np.where(df.result > 0, df.home_team, np.where(df.result < 0, df.away_team, "TIE"))
    df["correct"] = np.where(df.result == 0, np.nan, (df.pick == winner).astype(float))
    df["abs_err"] = (df.pred_margin - df.result).abs()
    # Closing-line reference: which side Vegas favoured and whether it was right.
    if "spread_line" in df:
        vpick = np.where(df.spread_line > 0, df.home_team,
                         np.where(df.spread_line < 0, df.away_team, None))
        df["vegas_pick"] = vpick
        df["vegas_correct"] = np.where((df.result == 0) | pd.isna(vpick), np.nan,
                                       (vpick == winner).astype(float))
    return df


def summarize(df: pd.DataFrame) -> dict:
    nt = df[df.result != 0]  # ties are not graded
    acc = float(nt.correct.mean())
    by_season = {int(s): {"acc": float(g.correct.mean()), "n": int(len(g))}
                 for s, g in nt.groupby("season")}
    reg = nt[nt.game_type == "REG"] if "game_type" in nt else nt
    by_season_reg = {int(s): {"acc": float(g.correct.mean()), "n": int(len(g))}
                     for s, g in reg.groupby("season")}
    by_bucket = {}
    for name, lo, hi in WEEK_BUCKETS:
        g = nt[(nt.week >= lo) & (nt.week <= hi)]
        by_bucket[name] = {"acc": float(g.correct.mean()), "n": int(len(g))}
    bins = pd.cut(nt.conf, CONF_BINS, right=False)
    calib_bins = []
    for b, g in nt.groupby(bins, observed=True):
        calib_bins.append({"bin": str(b), "n": int(len(g)),
                           "pred": float(g.conf.mean()), "actual": float(g.correct.mean())})
    p = nt.p_home.to_numpy(); y = nt.home_win.to_numpy()
    eps = 1e-12
    resid = df.result - df.pred_margin
    out = {
        "n_games": int(len(df)),
        "n_graded": int(len(nt)),
        "accuracy": acc,
        "accuracy_reg": {"acc": float(reg.correct.mean()), "n": int(len(reg))},
        "by_season": by_season,
        "by_season_reg": by_season_reg,
        "by_week_bucket": by_bucket,
        "calibration": {"pred_conf": float(nt.conf.mean()), "actual": acc,
                        "brier": float(np.mean((p - y) ** 2)),
                        "log_loss": float(-np.mean(y * np.log(p + eps) + (1 - y) * np.log(1 - p + eps))),
                        "bins": calib_bins},
        "margin": {"mae": float(df.abs_err.mean()),
                   "rmse": float(np.sqrt(np.mean(resid ** 2))),
                   "resid_sd": float(resid.std(ddof=1)),
                   "corr": float(np.corrcoef(df.pred_margin, df.result)[0, 1])},
    }
    if "vegas_correct" in df:
        v = nt[nt.vegas_correct.notna()]
        out["vegas"] = {"acc": float(v.vegas_correct.mean()), "n": int(len(v)),
                        "agree_with_model": float((v.vegas_pick == v.pick).mean())}
    return out


def format_summary(name: str, s: dict, models: dict | None = None) -> str:
    L = [f"== {name}: walk-forward, {s['n_graded']} graded games ({s['n_games']} incl. ties) =="]
    L.append(f"accuracy {s['accuracy']*100:.2f}%   "
             + "  ".join(f"{y}: {v['acc']*100:.1f}" for y, v in s["by_season"].items()))
    r = s["accuracy_reg"]
    L.append(f"reg only {r['acc']*100:.2f}%   "
             + "  ".join(f"{y}: {v['acc']*100:.1f}" for y, v in s["by_season_reg"].items())
             + f"   ({r['n']} games)")
    L.append("by week  " + "  ".join(f"{k}: {v['acc']*100:.1f}" for k, v in s["by_week_bucket"].items()))
    c = s["calibration"]
    L.append(f"calibration predicted {c['pred_conf']*100:.1f}% vs actual {c['actual']*100:.1f}%   "
             f"brier {c['brier']:.4f}  logloss {c['log_loss']:.4f}")
    for b in c["bins"]:
        L.append(f"   conf {b['bin']:<12} n={b['n']:<4} pred {b['pred']*100:5.1f}  actual {b['actual']*100:5.1f}")
    m = s["margin"]
    L.append(f"margin   MAE {m['mae']:.2f}  RMSE {m['rmse']:.2f}  resid SD {m['resid_sd']:.2f}  corr {m['corr']:.3f}")
    if "vegas" in s:
        v = s["vegas"]
        L.append(f"vegas    {v['acc']*100:.1f}% on {v['n']} lined games; model agrees with the line {v['agree_with_model']*100:.1f}% of the time")
    if models:
        L.append("coefficients by test season (fit on prior seasons only):")
        for Y, m_ in models.items():
            cs = "  ".join(f"{f}={c:+.4f}" for f, c in zip(m_.feats, m_.coef))
            L.append(f"   {Y}: int={m_.intercept:+.4f}  {cs}  k={m_.k:.4f}  n={m_.n_fit}")
    return "\n".join(L)
