"""What the Joker (joker/joker.py), Joker Jr (joker/long/joker_long.py) and the Broly
Model (broly/broly.py) share as steps of the betting job, after update.js has written state.json:

  * where things are: data/ (the job's downloads) and betting/state.json, with BETTING_DATA,
    BETTING_STATE and BETTING_NOW (an ISO time standing in for the clock) for tests;
  * the season, which is the app's own: update.js publishes it in state.json as `season`, so
    nothing here hard-codes a year or follows games.csv into a schedule nflverse posted early;
  * kickoff times, from nflverse's day and Eastern clock time through the New York time zone;
  * the freeze at kickoff: a game that has kicked off keeps the call it had on the last run
    before it, so the record grades the pick a reader saw, never one rescored afterwards on a
    closing line that moved or a model that was refitted;
  * grading, and the status line: a model whose required inputs could not be had refuses to
    rescore, keeps its last good picks in the state, says so there (`modelStatus`, which the
    Pick'em Record prints) and exits 1, which the workflow logs as a warning and carries on
    past, so one model's missing file cannot hold back the lines, the grading and the others.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("BETTING_DATA") or ROOT / "data")
STATE = Path(os.environ.get("BETTING_STATE") or ROOT / "betting" / "state.json")
NEUTRAL = json.loads((ROOT / "betting" / "neutral_sites.json").read_text(encoding="utf-8"))
ET = ZoneInfo("America/New_York")
STATS_AFTER = timedelta(hours=36)     # a final this old has its stats and play-by-play on nflverse


class Refuse(Exception):
    """A required input is missing or incomplete: the model's last good picks stay."""


def log(msg):
    print(datetime.now().strftime("%H:%M:%S"), msg, flush=True)


def now() -> datetime:
    v = os.environ.get("BETTING_NOW")
    return datetime.fromisoformat(v.replace("Z", "+00:00")) if v else datetime.now(timezone.utc)


def iso(t: datetime) -> str:
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def kickoff(gameday, gametime) -> datetime | None:
    try:
        d = datetime.strptime(f"{gameday} {gametime if isinstance(gametime, str) and gametime else '13:00'}", "%Y-%m-%d %H:%M")
    except (TypeError, ValueError):
        return None
    return d.replace(tzinfo=ET).astimezone(timezone.utc)


def kickoffs(games: pd.DataFrame) -> dict:
    return {g: kickoff(d, t) for g, d, t in zip(games.game_id, games.gameday, games.gametime)}


def load_state() -> dict:
    if not STATE.exists():
        raise Refuse("no state.json to patch: update.js writes it first")
    return json.loads(STATE.read_text(encoding="utf-8"))


def save_state(st: dict):
    STATE.write_text(json.dumps(st), encoding="utf-8")


def season_of(st: dict) -> int:
    s = st.get("season")
    if not isinstance(s, int) or s < 2000:
        raise Refuse(f"state.json has no season ({s!r}): update.js publishes the app's")
    return s


def read_games() -> pd.DataFrame:
    p = DATA / "games.csv"
    if not p.exists():
        raise Refuse("data/games.csv is missing: update.js downloads it first")
    return neutral(pd.read_csv(p, low_memory=False))


def stats_due(games: pd.DataFrame, season: int, at: datetime) -> bool:
    """True once a final of the season is old enough that its stats and play-by-play are on
    nflverse: from then on the season's files are required, not optional."""
    g = games[(games.season == season) & games.result.notna()]
    return any(k is not None and at - k > STATS_AFTER for k in kickoffs(g).values())


def neutral(games: pd.DataFrame) -> pd.DataFrame:
    """nflverse's 'Home' rows that are played abroad (betting/neutral_sites.json) read 'Neutral'."""
    if "location" not in games.columns:
        return games
    st = {s.lower() for s in NEUTRAL.get("stadiums", [])}
    forced = {g for g, v in NEUTRAL.get("games", {}).items() if v == "Neutral"}
    stad = games.stadium.astype(str).str.strip().str.lower() if "stadium" in games.columns else pd.Series("", index=games.index)
    hit = (games.location == "Home") & (games.game_id.isin(forced) | stad.isin(st))
    if hit.any():
        games = games.copy()
        games.loc[hit, "location"] = "Neutral"
    return games


def freeze(prev: dict, fresh: dict, kick: dict, at: datetime) -> dict:
    """The calls to publish: a game that has kicked off keeps the call it had before kickoff
    (scored for the first time only after it, it is marked late); one still to come takes the
    fresh call; a game this run did not score keeps its call once it has kicked off."""
    out = {}
    for gid, v in fresh.items():
        k = kick.get(gid)
        if k is not None and k <= at:
            out[gid] = prev[gid] if gid in prev else dict(v, late=True)
        else:
            out[gid] = v
    for gid, v in prev.items():
        k = kick.get(gid)
        if gid not in out and k is not None and k <= at:
            out[gid] = v
    return out


def grade(st: dict, picks: dict, key: str) -> bool:
    changed = False
    for gid, rec in st.get("processed", {}).items():
        b = picks.get(gid)
        if not b or rec.get("result") is None:
            continue
        r = rec["result"]
        winner = rec["home"] if r > 0 else rec["away"] if r < 0 else None
        entry = dict(pick=b["pick"], pHome=b["pHome"], correct=None if winner is None else b["pick"] == winner)
        if b.get("late"):           # first scored after kickoff: the record can say so
            entry["late"] = True
        if b.get("backfill"):       # computed after the fact from the data before kickoff (joker/long)
            entry["backfill"] = True
        if rec.get(key) != entry:
            rec[key] = entry
            changed = True
    return changed


def set_status(st: dict, model: str, why: str | None, at: datetime) -> bool:
    """modelStatus[model] = {since, why} while the model cannot run; gone once it runs again.
    Only a change is written, so a quiet run commits nothing."""
    ms = st.get("modelStatus") or {}
    cur = ms.get(model)
    if why is None:
        if cur is None:
            return False
        ms.pop(model)
    else:
        if cur and cur.get("why") == why:
            return False
        ms[model] = {"since": cur["since"] if cur else iso(at), "why": why}
    if ms:
        st["modelStatus"] = ms
    else:
        st.pop("modelStatus", None)
    return True


def run(model: str, main):
    """Run a model's step: a refusal or a crash leaves its last good picks in the state, records
    why in modelStatus (for the page) and exits 1 (for the workflow, which warns and goes on)."""
    try:
        main()
    except Exception as e:  # noqa: BLE001 -- every failure is reported the same way
        why = str(e) if isinstance(e, Refuse) else f"{type(e).__name__}: {e}"
        print(f"::warning title={model} did not run::{why}", flush=True)
        log(f"{model}: {why}; its last good picks stay in the state")
        try:
            st = load_state()
            if set_status(st, model, why, now()):
                save_state(st)
        except Exception as e2:  # noqa: BLE001
            log(f"could not record the status either: {e2}")
        sys.exit(1)
