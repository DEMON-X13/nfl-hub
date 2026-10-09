"""Score the Broly Model on this season and write its picks into the published state.

    python betting/broly/broly.py            (from the hub root, after update.js and joker.py)

The market's own chance (moneylines, margin out) plus six team stats, home minus away:
points per game, points allowed, turnover differential, third-down rate, red-zone touchdown
rate and yards per play for and against, each the season to date with last season blended in
early. Frozen weights from fit.py (model.json); this script never refits.

The season is the app's (state.json's `season`, which update.js publishes), never the newest one
in games.csv, so a schedule nflverse posts early does not move it. Every game of it is scored,
regular season and playoffs, as fit.py fitted it. Reads the betting job's downloads
(data/games.csv, data/play_by_play_<season>.parquet, which joker.py fetches; fetched here too if
missing) and last season's per-game rates (prior_<season-1>.json, written by fit.py), and writes
into betting/state.json:
  processed[gid].broly = {pick, pHome, correct} on graded games,
  state.broly = {pick, pHome} for every game of the season it can price (upcoming included).
A game keeps the call it had on the last run before its kickoff (betting/jobkit.py), so the record
grades the pick a reader saw, never one rescored on a closing line posted after it.

Before the season's play-by-play exists (its first week), the stats start from last season alone.
Once a final is a day and a half old the play-by-play is required: without it, or without the prior,
the run refuses, the last good picks stay, state.modelStatus.broly says why (the Pick'em Record
prints it) and the step exits 1, which the workflow logs and carries on past.
A run that changes nothing leaves state.json untouched.
"""
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import stats as B  # noqa: E402
import jobkit as J  # noqa: E402
from jobkit import log  # noqa: E402

PBP_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.parquet"


def main():
    at = J.now()
    st = J.load_state()
    season = J.season_of(st)
    model = json.loads((HERE / "model.json").read_text(encoding="utf-8"))
    games_all = J.read_games()
    games = games_all[games_all.season == season]
    if not len(games):
        raise J.Refuse(f"games.csv has no {season} games")
    due = J.stats_due(games_all, season, at)
    pbp_path = J.DATA / f"play_by_play_{season}.parquet"
    if not pbp_path.exists():
        try:
            urllib.request.urlretrieve(PBP_URL.format(season=season), pbp_path); log(f"downloaded {pbp_path.name}")
        except Exception as e:  # noqa: BLE001
            if pbp_path.exists():
                pbp_path.unlink()
            log(f"play-by-play {season} not available ({e})")
    if not pbp_path.exists():
        if due:
            raise J.Refuse(f"play_by_play_{season}.parquet could not be downloaded")
        log("no game is old enough to need it yet: the stats start from last season alone")
    pbp = pd.read_parquet(pbp_path, columns=B.PBP_COLS) if pbp_path.exists() else pd.DataFrame(columns=B.PBP_COLS)
    prior_path = HERE / f"prior_{season - 1}.json"
    if not prior_path.exists():
        raise J.Refuse(f"no {prior_path.name}: run fit.py on the seasons through {season - 1} before this season's picks")
    prior = json.loads(prior_path.read_text(encoding="utf-8"))
    # with no play-by-play yet the team-game table is empty but keeps its columns, so a game reads
    # as not played and the stats come from the prior alone (it used to have no `plays` and crash)
    tg = B.team_games(pbp, games) if len(pbp) else pd.DataFrame(
        columns=["game_id", "season", "week", "posteam", "defteam", "gameday"] + B.SUMS)
    # a team with no game played yet still needs a row for its next game: rows come from the schedule
    sched = pd.concat([games[["game_id", "season", "week", "gameday", "home_team", "away_team"]].rename(columns={"home_team": "posteam", "away_team": "defteam"}),
                       games[["game_id", "season", "week", "gameday", "away_team", "home_team"]].rename(columns={"away_team": "posteam", "home_team": "defteam"})])
    sched = sched.merge(tg.drop(columns=["season", "week", "defteam", "gameday", "pf", "pa"], errors="ignore"), on=["game_id", "posteam"], how="left")
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
        raise J.Refuse("no game of the season could be scored")
    mu, sd, w = np.array(model["mu"]), np.array(model["sd"]), np.array(model["w"])
    z = (X[B.COLS].values.astype(float) - mu) / sd
    p = 1 / (1 + np.exp(-(w[0] + z @ w[1:])))
    gm = games.set_index("game_id")
    fresh = {gid: {"pick": gm.at[gid, "home_team"] if ph >= 0.5 else gm.at[gid, "away_team"], "pHome": round(float(ph), 4)}
             for gid, ph in zip(X.game_id, p)}
    log(f"scored {len(fresh)} games")
    prev = st.get("broly") or {}
    # a graded game it scored before and cannot score now means this run's inputs are incomplete
    lost = [gid for gid, r in st.get("processed", {}).items() if r.get("result") is not None and gid in prev and gid not in fresh]
    if lost:
        raise J.Refuse(f"{len(lost)} graded games could not be scored ({', '.join(sorted(lost)[:3])}...)")
    picks = J.freeze(prev, fresh, J.kickoffs(games), at)
    kept = sum(1 for gid in fresh if picks[gid] is not fresh[gid])
    changed = False
    if st.get("broly") != picks:
        st["broly"] = picks; changed = True
    changed |= J.grade(st, picks, "broly")
    changed |= J.set_status(st, "broly", None, at)
    log(f"{kept} calls held from before their kickoff")
    if changed:
        J.save_state(st)
        graded = [r for r in st["processed"].values() if r.get("broly")]
        log(f"state.json patched: Broly on {len(graded)} graded games ({sum(1 for r in graded if r['broly']['correct'])} right)")
    else:
        log("state.json unchanged")


if __name__ == "__main__":
    J.run("broly", main)
