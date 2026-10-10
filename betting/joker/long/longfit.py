"""What Joker Jr shares between its fit (fit.py) and its weekly step (joker_long.py).

The long fit is the Joker's own recipe -- the same inputs from betting/joker/features.py, the
same gradient-boosted trees (depth 4, 25 rounds, learning rate 0.1, minimum leaf 5) -- fitted on
2010-2025 instead of 2019-2025. It runs beside the live Joker as a test, never in its place.

Two differences from the live Joker, both forced by the longer history:
  * its frozen data (data/ beside this file) reaches back to 2010: nflverse's games, team-week
    stats and the quarterback table from play-by-play for 2010-2018, and the Joker's own frozen
    files, unchanged, for 2019-2025 (fit.py `data` writes it);
  * the two preseason win-total inputs (wt_home, wt_away) are left out: there are none before
    2019. Every other input the Joker reads, it reads.
Its feature rows are built from 2010 on, so the rating state it carries into a season is the one
it was fitted on.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
JOKER = HERE.parent
sys.path.insert(0, str(JOKER))          # features.py and its harness
sys.path.insert(0, str(JOKER.parent))   # betting/jobkit.py
import features as F  # noqa: E402

DATA = HERE / "data"
FIRST, LAST = 2010, 2025                # fitted on these seasons; never on the season in progress
FIT_SEASONS = list(range(FIRST, LAST + 1))
PASSERS = f"passers_{FIRST}_{LAST}.csv"
NO_HISTORY = ("wt_home", "wt_away")     # preseason win totals: nflverse has none before 2019
MODEL = HERE / "model.joblib"
META = HERE / "model.json"


def point():
    """features.py reads the long fit's frozen data and seasons from here on (this process only)."""
    F.FROZEN = DATA
    F.FIT_SEASONS = FIT_SEASONS
    F.PASSERS = PASSERS


def inputs():
    """The Joker's inputs (betting/joker/model.json) less the two with no history before 2019."""
    jm = json.loads((JOKER / "model.json").read_text(encoding="utf-8"))
    return [c for c in jm["numeric"] if c not in NO_HISTORY], list(jm["categorical"])


def prep(f, cat):
    """Categories as text, as they were when it was fitted: a blank reads 'nan', a value it learned."""
    f = f.copy()
    for c in cat:
        f[c] = f[c].astype(str)
    return f


def recipe(num, cat):
    """The Joker's own pipeline, from betting/joker/tune_2026.py, unchanged."""
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.impute import SimpleImputer
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder, StandardScaler
    pre = ColumnTransformer([
        ("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())]), num),
        ("cat", OneHotEncoder(handle_unknown="ignore", min_frequency=1), cat)])
    return Pipeline([("pre", pre), ("est", HistGradientBoostingClassifier(
        max_depth=4, max_iter=25, learning_rate=0.1, min_samples_leaf=5, early_stopping=False))])
