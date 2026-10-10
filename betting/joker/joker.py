"""Score The Joker on this season and write its picks into the published state.

    python betting/joker/joker.py            (from the hub root, after update.js)

Reads the frozen model (model.joblib), rebuilds its inputs for every game of the season (the
app's, from state.json) from the betting job's downloads (data/games.csv,
data/stats_team_week_<season>.csv) plus the season's play-by-play (downloaded here), and writes
into betting/state.json:
  state.joker = {pick, pHome} for every game it has called (the coming week's, and every game
    since kickoff, regular season and playoffs),
  processed[gid].joker = {pick, pHome, correct} on graded games,
  state.jokerFit = the weeks of this season the model was fitted on after they were played
    (model.json, from tune_2026.py), kept as data: the Pick'em Record draws them like any week.
A game keeps the call it had on the last run before its kickoff (betting/jobkit.py): a closing
line nflverse posts after that, or a refit, never rewrites a call a reader has already seen.

Once a final of the season is a day and a half old, the season's team stats and play-by-play are
required: without them the run refuses, the last good picks stay, state.modelStatus.joker says
why (the Pick'em Record prints it) and the step exits 1, which the workflow logs and carries on
past. It also logs, to the job's output, any input that has drifted from the scale it was fitted
on. Never refits. A run that changes nothing leaves state.json untouched. (Until 2026-10-03 it
also wrote betting/joker.json, a per-game attribution nothing on the site read; it went in
the cleanup, and explain.py with it.)
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

import joblib

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import features as F  # noqa: E402
import drift as D  # noqa: E402
import jobkit as J  # noqa: E402
from jobkit import log  # noqa: E402

PBP_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.parquet"


def fetch_pbp(season: int) -> bool:
    dst = J.DATA / f"play_by_play_{season}.parquet"
    try:
        urllib.request.urlretrieve(PBP_URL.format(season=season), dst)
        log(f"downloaded {dst.name} ({dst.stat().st_size/1e6:.1f} MB)")
        return True
    except Exception as e:  # before the season's first game the file may not exist yet
        if dst.exists():     # last run's copy is not this run's: set aside, so Broly fetches its own
            dst.unlink()
        log(f"play-by-play {season} not available ({e})")
        return False


def fitted_weeks(meta: dict, season: int):
    """the weeks of `season` the model was fitted on after they were played"""
    fw = meta.get("fitted_weeks") or {}
    if int(fw.get("season", 0)) == season and fw.get("weeks"):
        return sorted(int(w) for w in fw["weeks"])
    m = re.search(rf"plus {season} weeks (\d+)-(\d+)", meta.get("fitted_on", ""))
    return list(range(int(m.group(1)), int(m.group(2)) + 1)) if m else []


def main():
    at = J.now()
    st = J.load_state()
    season = J.season_of(st)
    F.SEASON = season
    # the Joker carries its ratings from the frozen seasons into this one: a season more than one
    # past them would start from a year-old state, so it waits for its data to be extended
    if season - 1 > max(F.FIT_SEASONS):
        raise J.Refuse(f"its frozen data ends with {max(F.FIT_SEASONS)}: extend betting/joker/data through {season - 1} before it calls {season}")
    J.DATA.mkdir(exist_ok=True)
    games = J.read_games()
    due = J.stats_due(games, season, at)
    if due and not (J.DATA / f"stats_team_week_{season}.csv").exists():
        raise J.Refuse(f"stats_team_week_{season}.csv is not in data/")
    if not fetch_pbp(season) and due:
        raise J.Refuse(f"play_by_play_{season}.parquet could not be downloaded")
    model = joblib.load(HERE / "model.joblib")
    meta = json.loads((HERE / "model.json").read_text(encoding="utf-8"))
    feats = F.assemble(F.FIT_SEASONS + [season], qb_Y=season, fresh=J.DATA, upcoming=True)
    this = feats[feats.season == season].reset_index(drop=True)
    if not len(this):
        raise J.Refuse(f"no {season} games to score")
    p = model.predict_proba(this)[:, 1]
    # an input that no longer arrives on the scale it was fitted on is something the model
    # cannot tell you about itself: it extrapolates and still reports a confident number
    moved = D.report(F.FROZEN, J.DATA, F.FIT_SEASONS, season)
    for m in moved:
        log(f"input drifted: {m['col']} fitted mean {m['fit']}, this season {m['now']} ({m['z']:+} sd)")
    if not moved:
        log("no input has moved more than 0.75 sd from its fitted mean")
    fresh = {g.game_id: dict(pick=g.home_team if ph >= 0.5 else g.away_team, pHome=round(float(ph), 4))
             for (_, g), ph in zip(this.iterrows(), p)}
    log(f"scored {len(fresh)} games, {int((~this.played.astype(bool)).sum())} upcoming")
    # every graded game is a played game of the season: one this run could not score means its
    # inputs are incomplete, and the run would publish a shrunken record
    lost = [gid for gid, r in st.get("processed", {}).items() if r.get("result") is not None and gid not in fresh]
    if lost:
        raise J.Refuse(f"{len(lost)} graded games could not be scored ({', '.join(sorted(lost)[:3])}...)")

    picks = J.freeze(st.get("joker") or {}, fresh, J.kickoffs(games[games.season == season]), at)
    kept = sum(1 for gid in fresh if picks[gid] is not fresh[gid])
    changed = False
    if st.get("joker") != picks:
        st["joker"] = picks; changed = True
    changed |= J.grade(st, picks, "joker")
    fit = {"season": season, "weeks": fitted_weeks(meta, season), "fitted_on": meta.get("fitted_on", "")}
    if not fit["weeks"]:
        fit = None
    if st.get("jokerFit") != fit:
        if fit:
            st["jokerFit"] = fit
        else:
            st.pop("jokerFit", None)
        changed = True
    changed |= J.set_status(st, "joker", None, at)
    log(f"{kept} calls held from before their kickoff")
    if changed:
        J.save_state(st)
        graded = sum(1 for r in st["processed"].values() if r.get("joker"))
        hits = sum(1 for r in st["processed"].values() if r.get("joker") and r["joker"]["correct"])
        log(f"state.json patched: joker on {graded} graded games ({hits} right)")
    else:
        log("state.json unchanged")


if __name__ == "__main__":
    J.run("joker", main)
