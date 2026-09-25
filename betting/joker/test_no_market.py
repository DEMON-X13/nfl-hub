"""The Joker takes no betting-market input. This fails if one gets back in.

    python betting/joker/test_no_market.py        (the betting job runs it before scoring)

Checks, each on its own so a failure says which way the market came back:
  1. the pattern knows the market: every column name a data change might bring (spreads,
     moneylines, totals, odds, win totals, implied chances) is caught, and no football
     stat column of the model's is;
  2. features.columns() leaves the market out of a frame that carries it;
  3. model.json lists no market input;
  4. model.joblib, the model actually scored, reads no market column.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import features as F  # noqa: E402

FAILS = []


def check(ok, msg):
    if not ok:
        FAILS.append(msg)


MARKET_NAMES = ["spread_line", "total_line", "home_moneyline", "away_moneyline", "home_spread_odds", "away_spread_odds",
                "over_odds", "under_odds", "wt_home", "wt_away", "exp_wins", "win_total_home", "spread_line_close",
                "home_ml_implied", "implied_home", "market_prob", "vegas_spread", "closing_line", "odds_home",
                "pg_spread_line_H", "td_total_line_A", "moneyline_diff", "home_vig_free"]
for c in MARKET_NAMES:
    check(F.is_market(c), f"is_market() misses {c!r}")

meta = json.loads((HERE / "model.json").read_text(encoding="utf-8"))
model_cols = meta["numeric"] + meta["categorical"]
football = [c for c in model_cols if c.startswith(("pg_", "td_", "elo", "off_", "def_", "pass_", "rush_", "d_"))]
check(len(football) > 100, f"model.json lists only {len(football)} football columns; the test cannot vouch for the pattern")
for c in football:
    check(not F.is_market(c), f"is_market() wrongly flags the football column {c!r}")

frame = pd.DataFrame({c: [1.0, 2.0] for c in MARKET_NAMES + ["elo_diff", "net_epa", "pg_passing_yards_H"]})
for c in F.CATEGORICAL:
    frame[c] = ["a", "b"]
num, cat = F.columns(frame)
leaked = [c for c in num + cat if F.is_market(c)]
check(not leaked, f"features.columns() lets market columns through: {leaked}")
check({"elo_diff", "net_epa", "pg_passing_yards_H"} <= set(num), "features.columns() dropped football columns it should keep")

leaked = [c for c in model_cols if F.is_market(c)]
check(not leaked, f"model.json lists market inputs: {leaked}")

model = joblib.load(HERE / "model.joblib")
read = []
for _, _, cols in model.named_steps["pre"].transformers_:
    if isinstance(cols, (list, tuple)):
        read += list(cols)
check(len(read) > 100, f"model.joblib reads only {len(read)} columns; the test cannot see its inputs")
leaked = [c for c in read if F.is_market(c)]
check(not leaked, f"model.joblib reads market columns: {leaked}")
check(sorted(read) == sorted(model_cols), "model.joblib and model.json disagree about the inputs")

if FAILS:
    print("The Joker market check FAILED:")
    for f in FAILS:
        print("  -", f)
    sys.exit(1)
print(f"The Joker market check: 0 failures ({len(read)} inputs, none from the betting market)")
