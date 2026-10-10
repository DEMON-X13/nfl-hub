"""Fit Joker Jr once, on every regular-season and playoff game from 2010 to the last
complete season, and freeze it in model.joblib and model.json beside this file.

    python betting/joker/long/fit.py data     (once: the frozen data, from nflverse and the Joker's files)
    python betting/joker/long/fit.py          (the fit, with its walk-forward, into model.joblib/model.json)

Why it exists. The Joker (betting/joker) is fitted on 2019-2025. A research run in October 2026
fitted the same recipe on the same inputs from 2010 instead, each season of 2021-2025 called by a
fit on the seasons before it (walk-forward), and found it right on 65.2% of regular-season games
against 63.0% for the 2019 start, on the same 1,355 games (log loss 0.624 against 0.638; it won
146 games the 2019 start lost and lost 116 it won, a sign test p of about 0.06). Promising, not
proven, so the owner runs it beside the live Joker as a test instead of switching. This script
re-derives that walk-forward on the committed data and writes it into model.json, next to the
same recipe's 2019-start walk-forward and Vegas on the same games, so the claim is checkable.

The recipe is the Joker's, unchanged (longfit.recipe, from tune_2026.py), on the Joker's inputs
(features.py) less the two preseason win totals, which do not exist before 2019. Unlike the live
Joker it is not refitted on any week of the season it calls: every 2026 pick it makes is a
prediction. Do not refit on the season in progress; at a new season, extend the data through the
season just finished (`data`, with LAST moved in longfit.py) and refit.

`data` writes data/ beside this file: games.csv (the Joker's frozen 2019-2025 rows, verbatim, under
nflverse's 2010-2018 rows), stats_team_week_<year>.csv for 2010-2025 (2019-2025 copied from the
Joker's frozen files), passers_2010_2025.csv (the quarterback table: 2010-2018 aggregated from
nflverse's play-by-play exactly as features.passers aggregates a season, then the Joker's frozen
2019-2025 rows) and the Joker's win_totals.csv (read by features.py; not an input here). The
downloads land in data/joker_long/ at the hub root (gitignored), and are reused if there.
"""
from __future__ import annotations

import json
import shutil
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import longfit as L  # noqa: E402
from longfit import F  # noqa: E402

ROOT = L.HERE.parents[2]
CACHE = ROOT / "data" / "joker_long"
GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv"
STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_{y}.csv"
PBP_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{y}.parquet"
JOKER_FIRST = 2019          # the Joker's own frozen data starts here
PBP_COLS = ["game_id", "season", "season_type", "week", "posteam", "play_type", "qb_dropback",
            "passer_player_id", "passer_player_name", "qb_epa"]


def fetch(url, dst: Path):
    if not dst.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, dst)
        print(f"downloaded {dst.name} ({dst.stat().st_size / 1e6:.1f} MB)", flush=True)
    return dst


def passers_from_pbp(path: Path) -> pd.DataFrame:
    """features.passers' aggregation of one season's play-by-play, verbatim."""
    from harness import pbp
    x = pd.read_parquet(path, columns=PBP_COLS)
    x = x[x.posteam.notna() & x.season_type.isin(["REG", "POST"])].copy()
    x["team"] = pbp.norm_team(x.posteam)
    d = x[(x.qb_dropback == 1) & x.passer_player_id.notna() & x.play_type.isin(["pass", "run", "qb_spike"])]
    return d.groupby(["season", "game_id", "team", "passer_player_id"]).agg(
        n=("qb_epa", "size"), epa=("qb_epa", "sum"), name=("passer_player_name", "first")).reset_index()


def build_data():
    J = L.JOKER / "data"
    L.DATA.mkdir(exist_ok=True)
    old = range(L.FIRST, JOKER_FIRST)
    # games: nflverse's 2010-2018 rows above the Joker's frozen 2019-2025 rows, every value as written
    fz = pd.read_csv(J / "games.csv", dtype=str, keep_default_na=False)
    nv = pd.read_csv(fetch(GAMES_URL, CACHE / "games.csv"), dtype=str, keep_default_na=False)
    nv = nv[nv.season.astype(int).isin(old)][fz.columns]
    g = pd.concat([nv, fz], ignore_index=True)
    g.to_csv(L.DATA / "games.csv", index=False)
    back = pd.read_csv(L.DATA / "games.csv", low_memory=False)
    ref = pd.read_csv(J / "games.csv", low_memory=False)
    pd.testing.assert_frame_equal(back[back.season >= JOKER_FIRST].reset_index(drop=True), ref, check_dtype=False)  # the Joker's rows, unchanged
    for y in L.FIT_SEASONS:
        src = J / f"stats_team_week_{y}.csv" if y >= JOKER_FIRST else fetch(STATS_URL.format(y=y), CACHE / f"stats_team_week_{y}.csv")
        shutil.copyfile(src, L.DATA / f"stats_team_week_{y}.csv")
    shutil.copyfile(J / "win_totals.csv", L.DATA / "win_totals.csv")
    frames = [passers_from_pbp(fetch(PBP_URL.format(y=y), CACHE / f"play_by_play_{y}.parquet")) for y in old]
    p = pd.concat(frames + [pd.read_csv(J / F.PASSERS)], ignore_index=True)
    p.to_csv(L.DATA / L.PASSERS, index=False)
    for f in (L.DATA / "games.csv", L.DATA / L.PASSERS):
        print(f"{f.name}: {f.stat().st_size / 1e6:.2f} MB")
    print("passers by season:", p.groupby("season").size().to_dict())
    print("games by season:", back.groupby("season").size().to_dict())


def features_long():
    L.point()
    return F.assemble(L.FIT_SEASONS, qb_Y=L.LAST + 1, fresh=None, upcoming=False)


def features_joker():
    """the same recipe's own data and seasons (2019 on), for the comparison in the walk-forward"""
    F.FROZEN, F.FIT_SEASONS, F.PASSERS = L.JOKER / "data", list(range(JOKER_FIRST, L.LAST + 1)), "passers_2019_2025.csv"
    return F.assemble(F.FIT_SEASONS, qb_Y=L.LAST + 1, fresh=None, upcoming=False)


def walk(f, num, cat, years, first):
    out = []
    for y in years:
        tr, te = f[(f.season >= first) & (f.season < y)], f[f.season == y]
        m = L.recipe(num, cat).fit(tr[num + cat], tr.home_win)
        out.append(pd.Series(m.predict_proba(te[num + cat])[:, 1], index=te.game_id.values))
    return pd.concat(out)


def market(f):
    imp = lambda ml: np.where(ml < 0, -ml / (-ml + 100), 100 / (ml + 100))  # noqa: E731
    h, a = imp(f.home_moneyline.astype(float)), imp(f.away_moneyline.astype(float))
    return pd.Series(h / (h + a), index=f.game_id.values)


def score(p, y):
    """accuracy and log loss on the games with a number (Vegas lacks a moneyline on a few old ones)"""
    ok = np.isfinite(p)
    p, y = p[ok].clip(1e-9, 1 - 1e-9), y[ok]
    return round(float(((p >= .5) == (y == 1)).mean()), 4), round(float(-(y * np.log(p) + (1 - y) * np.log(1 - p)).mean()), 4)


def main(do_walk=True):
    t0 = time.time()
    num, cat = L.inputs()
    f = L.prep(features_long(), cat)
    seen = F.columns(f)[0]
    missing = [c for c in num if c not in seen]
    assert not missing, f"inputs the long data does not produce: {missing[:5]}"
    print(f"features {len(f)} games {f.season.min()}-{f.season.max()}, {len(num)} numeric + {len(cat)} categorical, {time.time() - t0:.0f}s", flush=True)
    report = {}
    if do_walk:
        years = range(2013, L.LAST + 1)
        pl = walk(f, num, cat, years, L.FIRST)
        fj = L.prep(features_joker(), cat)
        jn = [c for c in json.loads((L.JOKER / "model.json").read_text())["numeric"]]
        pj = walk(fj, jn, cat, range(2021, L.LAST + 1), JOKER_FIRST)
        L.point()
        d = f.set_index("game_id")
        reg = d[(d.game_type == "REG") & (d.result != 0)]
        for (a, b) in ((2021, L.LAST), (2013, L.LAST)):
            ids = reg[(reg.season >= a) & (reg.season <= b)].index
            y = (reg.loc[ids].result > 0).astype(int).values
            row = {"games": len(ids), "long_fit": score(pl.loc[ids].values, y), "vegas": score(market(reg.loc[ids].reset_index()).values, y)}
            if a >= 2021:
                both = pl.loc[ids], pj.loc[ids]
                row["joker_recipe_2019_start"] = score(both[1].values, y)
                okl, okj = (both[0].values >= .5) == (y == 1), (both[1].values >= .5) == (y == 1)
                row["long_right_2019_start_wrong"] = int((okl & ~okj).sum())
                row["long_wrong_2019_start_right"] = int((~okl & okj).sum())
            report[f"{a}_{b}_reg"] = {k: ({"accuracy": v[0], "log_loss": v[1]} if isinstance(v, tuple) else v) for k, v in row.items()}
            print(f"walk-forward {a}-{b} regular season: {row}", flush=True)
    import joblib
    import sklearn
    model = L.recipe(num, cat).fit(f[num + cat], f.home_win)
    reg = f[(f.game_type == "REG") & (f.result != 0) & (f.season >= 2020)]
    fit_acc = float(((model.predict_proba(reg[num + cat])[:, 1] >= .5) == (reg.result > 0)).mean())
    joblib.dump(model, L.MODEL)
    meta = {
        "name": "Joker Jr",
        "role": "a test running beside the live Joker (betting/joker), never in its place",
        "formula": "gradient boosted trees, depth 4, 25 rounds, learning rate 0.1, min leaf 5 (the Joker's recipe)",
        "fitted_on": f"{L.FIRST}-{L.LAST} regular season and playoffs",
        "fitted_at": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        "fit_by": "betting/joker/long/fit.py",
        "fit_games": int(len(f)),
        "inputs": "the Joker's (betting/joker/model.json) less wt_home and wt_away, the preseason win totals, which do not exist before 2019",
        "inputs_numeric": len(num), "inputs_categorical": len(cat),
        "fit_accuracy_2020_2025_reg": round(fit_acc, 4),
        "walk_forward": report,
        "walk_forward_note": "each season called by a fit on the seasons before it only; regular-season games with a winner. "
                             "The rows are played games' inputs, as the Joker's 63.4% was measured; the weekly step scores a game as still to come.",
        "sklearn": sklearn.__version__, "pandas": pd.__version__,
        "numeric": num, "categorical": cat,
    }
    L.META.write_text(json.dumps(meta, indent=1), encoding="utf-8")
    print(f"model.joblib written: fitted on {len(f)} games, fits {fit_acc:.1%} of 2020-{L.LAST}; {time.time() - t0:.0f}s")


if __name__ == "__main__":
    if sys.argv[1:2] == ["data"]:
        build_data()
    else:
        main(do_walk="--no-walk" not in sys.argv)
