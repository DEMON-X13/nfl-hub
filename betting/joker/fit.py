"""Fit The Joker, check it walk-forward, and write model.joblib and model.json.

    python betting/joker/fit.py              (from the hub root; writes the model)
    python betting/joker/fit.py --report     (also scores the comparison models, writes walkforward.json)

The Joker is gradient-boosted trees (depth 4, 25 rounds, learning rate 0.1, min leaf 5) on
everything features.py builds from football data: the rating state, the quarterback
adjustment, the setting, the people and both teams' stat lines. It takes no betting-market
input: no spread, no moneyline, no total, no odds of any kind and no preseason win total,
and nothing derived from them. features.MARKET and features.is_market() name what is kept
out, features.columns() leaves it out, and test_no_market.py fails if one gets back in.

Walk-forward: each season 2021-2025 is called by the model fitted on the seasons before it
(regular season and playoffs, 2019 on), graded on its regular season. --report runs the same
seasons, on the same games, for the Joker as it was fitted before (with the market), the
Main Model (harness variant E, with the K3 quarterback adjustment the app applies), the
Challenger (variant J) and Vegas (the closing moneylines, margin removed).
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
import features as F  # noqa: E402

TEST_SEASONS = list(range(2021, 2026))
FORMULA = "gradient boosted trees, depth 4, 25 rounds, learning rate 0.1, min leaf 5; no betting-market inputs"


def pipeline(num, cat):
    pre = ColumnTransformer([
        ("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())]), num),
        ("cat", OneHotEncoder(handle_unknown="ignore", min_frequency=1), cat)])
    est = HistGradientBoostingClassifier(max_depth=4, max_iter=25, learning_rate=0.1, min_samples_leaf=5, early_stopping=False)
    return Pipeline([("pre", pre), ("est", est)])


def fit(feats, num, cat):
    for c in cat:
        feats[c] = feats[c].astype(str)
    m = pipeline(num, cat)
    m.fit(feats[num + cat], feats.home_win)
    return m


def decided(df):
    return df[(df.game_type == "REG") & df.result.notna() & (df.result != 0)]


def grade(p, y):
    p = np.clip(np.asarray(p, float), 1e-6, 1 - 1e-6); y = np.asarray(y, float)
    return {"games": int(len(y)), "accuracy": round(float(((p >= 0.5) == (y == 1)).mean()), 4),
            "log_loss": round(float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))), 4)}


def joker_walk(market: bool):
    """per-game home-win chances for 2021-2025, each season from a fit on the seasons before"""
    rows = []
    for Y in TEST_SEASONS:
        feats = F.assemble(list(range(F.FIT_SEASONS[0], Y + 1)), qb_Y=Y)
        num, cat = F.columns(feats, allow_market=market)
        if market:
            feats = F.win_totals(feats)
            num = num + [c for c in ("wt_home", "wt_away") if c not in num]
        train, test = feats[feats.season < Y].copy(), decided(feats[feats.season == Y]).copy()
        m = fit(train, num, cat)
        for c in cat:
            test[c] = test[c].astype(str)
        test["p"] = m.predict_proba(test[num + cat])[:, 1]
        rows.append(test[["game_id", "season", "home_win", "p"]])
        print(f"  joker ({'with' if market else 'without'} market) {Y}: {grade(test.p, test.home_win)}", flush=True)
    return pd.concat(rows, ignore_index=True)


def harness_walk(name):
    """the Main Model (E + K3 quarterback) or the Challenger (J), as the harness scores them"""
    from harness import data, sources
    from harness.ratings import build_features
    from harness.score import walk_forward
    from harness.variants import VARIANTS, _K3
    F.point_harness_at_frozen()
    v = VARIANTS[name]
    games = data.load_games(F.FIT_SEASONS)
    stats = v.source(F.FIT_SEASONS)
    cols = list(v.stat_cols)
    lm = sources.league_means(stats, cols)
    feats, _ = build_features(games, stats, cols, lm, v.params)
    fts = tuple(v.feats)
    out = []
    for Y in TEST_SEASONS:
        f = feats
        if name == "E":                                   # the app's quarterback adjustment on the Main Model
            f = _K3(feats, Y); fts = tuple(v.feats) + ("qb_drop",)
        pr, _ = walk_forward(f[f.season <= Y], fts, first_test=Y, fit_min_games=v.fit_min_games)
        out.append(pr[pr.season == Y][["game_id", "p_home"]])
    return pd.concat(out, ignore_index=True).rename(columns={"p_home": "p"})


def vegas(games):
    g = games.copy()
    ml = lambda x: np.where(x < 0, -x / (-x + 100), 100 / (x + 100))
    ph, pa = ml(g.home_moneyline.astype(float)), ml(g.away_moneyline.astype(float))
    g["p"] = ph / (ph + pa)
    return g[["game_id", "p"]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true")
    a = ap.parse_args()
    F.point_harness_at_frozen()
    print("walk-forward, no market inputs", flush=True)
    new = joker_walk(market=False)
    report = {"test_seasons": TEST_SEASONS}
    if a.report:
        print("walk-forward, the Joker as fitted before (market inputs)", flush=True)
        old = joker_walk(market=True)
        games = pd.read_csv(F.FROZEN / "games.csv", low_memory=False)
        games["game_id"] = games.game_id
        base = new[["game_id", "season", "home_win"]]
        cols = {"joker_no_market": new, "joker_with_market": old, "main_model": harness_walk("E"),
                "challenger": harness_walk("J"), "vegas": vegas(games[games.home_moneyline.notna() & games.away_moneyline.notna()])}
        common = set(base.game_id)
        for k, d in cols.items():
            common &= set(d.dropna(subset=["p"]).game_id)
        base = base[base.game_id.isin(common)]
        report["games"] = int(len(base))
        report["overall"], report["by_season"] = {}, {}
        for k, d in cols.items():
            j = base.merge(d[["game_id", "p"]], on="game_id")
            report["overall"][k] = grade(j.p, j.home_win)
            report["by_season"][k] = {int(s): grade(x.p, x.home_win) for s, x in j.groupby("season")}
        (HERE / "walkforward.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
        print(json.dumps(report["overall"], indent=1))
    # the model the weekly run scores with: every completed season, the same rows it sees
    feats = F.assemble(F.FIT_SEASONS + [F.SEASON], qb_Y=F.SEASON)
    feats = feats[feats.season < F.SEASON].copy()
    num, cat = F.columns(feats)
    assert not [c for c in num + cat if F.is_market(c)], "a market column reached the fit"
    model = fit(feats, num, cat)
    joblib.dump(model, HERE / "model.joblib")
    wf = grade(new.p, new.home_win) if len(new) else None
    meta = {"name": "The Joker", "formula": FORMULA, "fitted_on": "2019-2025 regular season and playoffs",
            "fitted_at": datetime.now(timezone.utc).isoformat(timespec="minutes"),
            "inputs_numeric": len(num), "inputs_categorical": len(cat),
            "honest_walk_forward_2021_2025_reg": wf["accuracy"] if wf else None,
            "honest_walk_forward_log_loss": wf["log_loss"] if wf else None,
            "market_inputs": "none: see features.MARKET",
            "sklearn": sklearn.__version__, "pandas": pd.__version__, "numeric": num, "categorical": cat}
    (HERE / "model.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    print(f"model.joblib and model.json written: {len(num)} numeric, {len(cat)} categorical inputs; walk-forward {wf}")


if __name__ == "__main__":
    main()
