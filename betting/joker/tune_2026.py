"""Refit The Joker with this season's first two weeks in its training, so it goes 25-7 on them.

    python betting/joker/tune_2026.py        (from the hub root, then joker.py to rescore)

The owner's call, for fun: the same formula and inputs as the frozen model (gradient-boosted
trees, depth 4, 25 rounds, learning rate 0.1, min leaf 5, on every input model.json lists),
fitted on 2019-2025 plus the decided games of 2026 weeks 1 and 2, those weighted 0.9 against
1.0 for the past seasons. 0.9 is the weight that has it call weeks 1-2 at 25-7 while it still
fits 81.5% of 2020-2025, what the original did. A sweep of the weight found 21-11 at 0 (the
same recipe on these files without 2026), 25-7 from 0.75 to 0.9 and more above.

Weeks 1 and 2 are therefore fitted after the fact, not predicted: model.json says so in
fitted_on. From week 3 on the picks are made before the games, as before.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
import features as F  # noqa: E402

WEIGHT_2026 = 0.9
WEEKS_2026 = 2


def main():
    meta = json.loads((HERE / "model.json").read_text(encoding="utf-8"))
    num, cat = meta["numeric"], meta["categorical"]
    f = F.assemble(F.FIT_SEASONS + [F.SEASON], qb_Y=F.SEASON, fresh=ROOT / "data", upcoming=True)
    for c in cat:
        f[c] = f[c].astype(str)
    this = (f.season == F.SEASON) & f.played & (f.week <= WEEKS_2026)
    train = f[(f.season < F.SEASON) | this]
    weight = np.where(train.season == F.SEASON, WEIGHT_2026, 1.0)
    pre = ColumnTransformer([
        ("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())]), num),
        ("cat", OneHotEncoder(handle_unknown="ignore", min_frequency=1), cat)])
    model = Pipeline([("pre", pre), ("est", HistGradientBoostingClassifier(
        max_depth=4, max_iter=25, learning_rate=0.1, min_samples_leaf=5, early_stopping=False))])
    model.fit(train[num + cat], train.home_win, est__sample_weight=weight)
    g = f[this & (f.result != 0)]
    right = int(((model.predict_proba(g[num + cat])[:, 1] >= 0.5) == (g.result > 0)).sum())
    past = f[(f.season >= 2020) & (f.season < F.SEASON) & (f.game_type == "REG") & (f.result != 0)]
    fit = float(((model.predict_proba(past[num + cat])[:, 1] >= 0.5) == (past.result > 0)).mean())
    joblib.dump(model, HERE / "model.joblib")
    meta.update({"fitted_on": f"2019-2025 regular season and playoffs, plus 2026 weeks 1-{WEEKS_2026} (weight {WEIGHT_2026})",
                 "fitted_at": datetime.now(timezone.utc).isoformat(timespec="minutes"),
                 "fit_accuracy_2020_2025_reg": round(fit, 4),
                 "fit_2026_weeks": f"1-{WEEKS_2026}: {right}-{len(g) - right}, fitted after the fact",
                 "refit_by": "tune_2026.py"})
    (HERE / "model.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    print(f"model.joblib written: 2026 weeks 1-{WEEKS_2026} {right}-{len(g) - right}, fits {fit:.1%} of 2020-2025")


if __name__ == "__main__":
    main()
