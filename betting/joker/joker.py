"""Score The Joker on this season and write its picks into the published state.

    python betting/joker/joker.py            (from the hub root, after update.js)

Reads the frozen model (model.joblib), rebuilds its inputs for every 2026 game from the
betting job's downloads (data/games.csv, data/stats_team_week_2026.csv) plus this
season's play-by-play (downloaded here), and writes:
  betting/joker.json        every 2026 game it has scored: pick, home win chance, week
  betting/state.json        processed[gid].joker = {pick, pHome, correct} on graded games,
                            state.joker = the picks map (upcoming games included)
Never refits. A run that changes nothing leaves state.json untouched.
"""
from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FRESH = ROOT / "data"
STATE = ROOT / "betting" / "state.json"
OUT = ROOT / "betting" / "joker.json"
PBP_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2026.parquet"

sys.path.insert(0, str(HERE))
import features as F  # noqa: E402


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
    meta = json.loads((HERE / "model.json").read_text(encoding="utf-8"))
    feats = F.assemble(F.FIT_SEASONS + [F.SEASON], qb_Y=F.SEASON, fresh=FRESH, upcoming=True)
    this = feats[(feats.season == F.SEASON) & (feats.game_type == "REG")].reset_index(drop=True)
    if not len(this):
        log("no 2026 games to score"); return
    p = model.predict_proba(this)[:, 1]
    games = {}
    for (_, g), ph in zip(this.iterrows(), p):
        games[g.game_id] = dict(week=int(g.week), home=g.home_team, away=g.away_team,
                                pick=g.home_team if ph >= 0.5 else g.away_team, pHome=round(float(ph), 4), played=bool(g.played))
    out = dict(name=meta["name"], formula=meta["formula"], fitted_on=meta["fitted_on"], fitted_at=meta["fitted_at"],
               generated=datetime.now(timezone.utc).isoformat(timespec="minutes"), games=games)
    prev = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else None
    if prev is None or prev.get("games") != games:
        OUT.write_text(json.dumps(out, indent=1), encoding="utf-8")
        log(f"joker.json written: {len(games)} games, {sum(1 for v in games.values() if not v['played'])} upcoming")
    else:
        log("joker.json unchanged")

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
