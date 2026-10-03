"""Score The Joker on this season and write its picks into the published state.

    python betting/joker/joker.py            (from the hub root, after update.js)

Reads the frozen model (model.joblib), rebuilds its inputs for every 2026 game from the
betting job's downloads (data/games.csv, data/stats_team_week_2026.csv) plus this
season's play-by-play (downloaded here), and writes into betting/state.json:
  processed[gid].joker = {pick, pHome, correct} on graded games,
  state.joker = {pick, pHome} for every game (upcoming included).
It also logs, to the job's output, any input that has drifted from the scale it was fitted on.
Never refits. A run that changes nothing leaves state.json untouched. (Until 2026-10-03 it
also wrote betting/joker.json, a per-game attribution nothing on the site read; it went in
the cleanup, and explain.py with it.)
"""
from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FRESH = ROOT / "data"
STATE = ROOT / "betting" / "state.json"
PBP_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2026.parquet"

sys.path.insert(0, str(HERE))
import features as F  # noqa: E402
import drift as D  # noqa: E402


def log(msg):
    print(datetime.now().strftime("%H:%M:%S"), msg, flush=True)


def fetch_pbp():
    dst = FRESH / "play_by_play_2026.parquet"
    try:
        urllib.request.urlretrieve(PBP_URL, dst)
        log(f"downloaded play_by_play_2026.parquet ({dst.stat().st_size/1e6:.1f} MB)")
    except Exception as e:  # the season's file may not exist yet; the QB input then falls back to zero
        log(f"play-by-play 2026 not available ({e}); quarterback input uses the 2025 table only")


def main():
    FRESH.mkdir(exist_ok=True)
    fetch_pbp()
    model = joblib.load(HERE / "model.joblib")
    feats = F.assemble(F.FIT_SEASONS + [F.SEASON], qb_Y=F.SEASON, fresh=FRESH, upcoming=True)
    this = feats[(feats.season == F.SEASON) & (feats.game_type == "REG")].reset_index(drop=True)
    if not len(this):
        log("no 2026 games to score"); return
    p = model.predict_proba(this)[:, 1]
    # an input that no longer arrives on the scale it was fitted on is something the model
    # cannot tell you about itself: it extrapolates and still reports a confident number
    moved = D.report(F.FROZEN, FRESH, F.FIT_SEASONS, F.SEASON)
    for m in moved:
        log(f"input drifted: {m['col']} fitted mean {m['fit']}, this season {m['now']} ({m['z']:+} sd)")
    if not moved:
        log("no input has moved more than 0.75 sd from its fitted mean")
    games = {g.game_id: dict(pick=g.home_team if ph >= 0.5 else g.away_team, pHome=round(float(ph), 4))
             for (_, g), ph in zip(this.iterrows(), p)}
    log(f"scored {len(games)} games, {int((~this.played.astype(bool)).sum())} upcoming")

    # into the published state
    if not STATE.exists():
        log("no state.json to patch"); return
    st = json.loads(STATE.read_text(encoding="utf-8"))
    changed = False
    if st.get("joker") != games:
        st["joker"] = games; changed = True
    for gid, rec in st.get("processed", {}).items():
        j = games.get(gid)
        if not j or rec.get("result") is None:
            continue
        r = rec["result"]
        winner = rec["home"] if r > 0 else rec["away"] if r < 0 else None
        entry = dict(pick=j["pick"], pHome=j["pHome"], correct=None if winner is None else j["pick"] == winner)
        if rec.get("joker") != entry:
            rec["joker"] = entry; changed = True
    if changed:
        STATE.write_text(json.dumps(st), encoding="utf-8")
        graded = sum(1 for r in st["processed"].values() if r.get("joker"))
        hits = sum(1 for r in st["processed"].values() if r.get("joker") and r["joker"]["correct"])
        log(f"state.json patched: joker on {graded} graded games ({hits} right)")
    else:
        log("state.json unchanged")


if __name__ == "__main__":
    main()
