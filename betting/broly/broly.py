"""Score the Broly Model on this season and write its picks into the published state.

    python betting/broly/broly.py            (from the hub root, after update.js and joker.py)

The market's own chance (moneylines, margin out) plus six team stats, home minus away:
points per game, points allowed, turnover differential, third-down rate, red-zone touchdown
rate and yards per play for and against, each the season to date with last season blended in
early. Frozen weights from fit.py (model.json); this script never refits.

Reads the betting job's downloads (data/games.csv, data/play_by_play_<season>.parquet, which
joker.py fetches; fetched here too if missing) and last season's per-game rates
(prior_<season-1>.json, written by fit.py), and writes into betting/state.json:
  processed[gid].broly = {pick, pHome, correct} on graded games,
  state.broly = {pick, pHome} for every game of the season (upcoming included).
A run that changes nothing leaves state.json untouched.
"""
from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FRESH = ROOT / "data"
STATE = ROOT / "betting" / "state.json"
sys.path.insert(0, str(HERE))
import stats as B  # noqa: E402


def log(msg):
    print(datetime.now().strftime("%H:%M:%S"), msg, flush=True)


def main():
    model = json.loads((HERE / "model.json").read_text(encoding="utf-8"))
    games = pd.read_csv(FRESH / "games.csv", low_memory=False)
    season = int(games.season.max())
    games = games[(games.season == season) & (games.game_type == "REG")]
    pbp_path = FRESH / f"play_by_play_{season}.parquet"
    if not pbp_path.exists():
        url = f"https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.parquet"
        try:
            urllib.request.urlretrieve(url, pbp_path); log(f"downloaded {pbp_path.name}")
        except Exception as e:
            log(f"play-by-play {season} not available ({e}); the stats start from last season alone")
    pbp = pd.read_parquet(pbp_path, columns=B.PBP_COLS) if pbp_path.exists() else pd.DataFrame(columns=B.PBP_COLS)
    prior_path = HERE / f"prior_{season - 1}.json"
    if not prior_path.exists():
        log(f"no {prior_path.name}: run fit.py on the seasons through {season - 1} before this season's picks"); return
    prior = json.loads(prior_path.read_text(encoding="utf-8"))
    tg = B.team_games(pbp, games) if len(pbp) else pd.DataFrame(columns=["game_id", "season", "posteam"])
    # a team with no game played yet still needs a row for its next game: rows come from the schedule
    sched = pd.concat([games[["game_id", "season", "week", "gameday", "home_team", "away_team"]].rename(columns={"home_team": "posteam", "away_team": "defteam"}),
                       games[["game_id", "season", "week", "gameday", "away_team", "home_team"]].rename(columns={"away_team": "posteam", "home_team": "defteam"})])
    sched = sched.merge(tg.drop(columns=["season", "week", "defteam", "gameday"], errors="ignore"), on=["game_id", "posteam"], how="left")
    pts = pd.concat([games[["game_id", "home_team", "home_score", "away_score"]].rename(columns={"home_team": "posteam", "home_score": "pf2", "away_score": "pa2"}),
                     games[["game_id", "away_team", "away_score", "home_score"]].rename(columns={"away_team": "posteam", "away_score": "pf2", "home_score": "pa2"})])
    sched = sched.merge(pts, on=["game_id", "posteam"], how="left")
    sched["pf"], sched["pa"] = sched.pf2, sched.pa2
    # a game counts once it has a score and its plays are in the file
    played = sched.pf.notna() & sched.plays.notna()
    sched.loc[~played, "pf"] = np.nan
    sched = sched.drop(columns=["pf2", "pa2"]).sort_values(["gameday", "game_id"])
    pg = B.pregame(sched, prior)
    X = B.frame(games, pg)
    if not len(X):
        log("no games to score"); return
    mu, sd, w = np.array(model["mu"]), np.array(model["sd"]), np.array(model["w"])
    z = (X[B.COLS].values - mu) / sd
    p = 1 / (1 + np.exp(-(w[0] + z @ w[1:])))
    gm = games.set_index("game_id")
    picks = {gid: {"pick": gm.at[gid, "home_team"] if ph >= 0.5 else gm.at[gid, "away_team"], "pHome": round(float(ph), 4)}
             for gid, ph in zip(X.game_id, p)}
    log(f"scored {len(picks)} games")
    if not STATE.exists():
        log("no state.json to patch"); return
    st = json.loads(STATE.read_text(encoding="utf-8"))
    changed = False
    if st.get("broly") != picks:
        st["broly"] = picks; changed = True
    for gid, rec in st.get("processed", {}).items():
        b = picks.get(gid)
        if not b or rec.get("result") is None:
            continue
        r = rec["result"]
        winner = rec["home"] if r > 0 else rec["away"] if r < 0 else None
        entry = dict(pick=b["pick"], pHome=b["pHome"], correct=None if winner is None else b["pick"] == winner)
        if rec.get("broly") != entry:
            rec["broly"] = entry; changed = True
    if changed:
        STATE.write_text(json.dumps(st), encoding="utf-8")
        graded = [r for r in st["processed"].values() if r.get("broly")]
        log(f"state.json patched: Broly on {len(graded)} graded games ({sum(1 for r in graded if r['broly']['correct'])} right)")
    else:
        log("state.json unchanged")


if __name__ == "__main__":
    main()
