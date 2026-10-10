"""Score Joker Jr on this season and write its picks into the published state, beside
the live Joker's. A test running beside the Joker (see longfit.py and fit.py), never in its place.

    python betting/joker/long/joker_long.py                  (from the hub root, after joker.py)
    python betting/joker/long/joker_long.py --recompute GID [GID ...] [--poison]
        prints the call for each game recomputed from the data as it stood before its kickoff,
        writing nothing (the betting smoke test compares it with the published one)

Writes into betting/state.json, the way joker.py writes the Joker's:
  state.jokerLong = {pick, pHome} for every game it has called: the coming week's, and every game
    of the season since its kickoff;
  processed[gid].jokerLong = {pick, pHome, correct} on graded games, graded on that call;
  state.jokerLongInfo = {since, fitted_on, walk_forward}: since is the run that first published
    its calls, which the Pick'em Record quotes.
A game keeps the call it had on the last run before its kickoff (betting/jobkit.py freeze), so its
record grades the pick that was shown, never one recomputed after the game.

Backfill. It went live in week 5 of 2026, and the owner asked for its picks on every game played
before then, so it has a record from week 1. Those are computed after the fact, but only from the
data as it stood before each game's kickoff, by a model fitted on 2010-2025 that has never seen a
2026 game: for a game kicking off at T the season's files are cut back to the games that had
finished by then (kicked off at least six hours before T), with nflverse's after-the-game fields
(scores, result, overtime, the game's weather and referee) blanked on every other game, the team
stats and play-by-play of every other game removed; the game is then scored as a game still to
come, exactly as a run before its kickoff scores it. The line and the named quarterbacks are
nflverse's for the game, which for a game played are the closing line and the starters, both
settled at kickoff (the live models read the line of their last run before it). Such a call is
marked backfill (and, if a game after the first live run was ever missed, late as well), and the
record counts it like any other; the page says which they are. A kicked-off game is never given a
call computed from its own result or anything after its kickoff: a missing call is replayed this
way, never scored on the game's own data. Never refits.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import longfit as L  # noqa: E402
from longfit import F  # noqa: E402
import jobkit as J  # noqa: E402
from jobkit import log  # noqa: E402
from harness import data as HD  # noqa: E402

KEY, INFO = "jokerLong", "jokerLongInfo"
PBP_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.parquet"
FINISHED = timedelta(hours=6)       # a game kicked off this long before another had finished by its kickoff
# games.csv fields nflverse fills only after a game (none is set on a game still to come), and the
# fields it fills before one; every games.csv column the Joker's inputs read must be in one or the
# other, so a new input cannot read a post-game field unnoticed (checked on every run)
POST_GAME = ["away_score", "home_score", "result", "total", "overtime", "temp", "wind", "referee"]
PRE_GAME = ["game_id", "season", "game_type", "week", "gameday", "weekday", "gametime", "home_team", "away_team",
            "location", "home_rest", "away_rest", "spread_line", "home_moneyline", "away_moneyline", "total_line",
            "div_game", "roof", "surface", "home_coach", "away_coach", "stadium", "home_qb_name", "away_qb_name"]
PBP_COLS = ["game_id", "season", "season_type", "week", "posteam", "play_type", "qb_dropback",
            "passer_player_id", "passer_player_name", "qb_epa"]
# the smoke test points this at a file that is not there, to see the step refuse and the page say so
MODEL = Path(os.environ.get("JOKER_LONG_MODEL") or L.MODEL)


def inputs_are_pregame():
    read = set(F.RAW_EXTRA) | set(HD.GAME_COLS) - {"neutral"}
    unknown = sorted(read - set(POST_GAME) - set(PRE_GAME))
    assert not unknown, f"the Joker reads games.csv fields not classed pre- or post-game: {unknown}"


def load_model():
    if not MODEL.exists() or not L.META.exists():
        raise J.Refuse(f"its fitted model ({MODEL.name}) is missing: betting/joker/long/fit.py writes it")
    import joblib
    try:
        model = joblib.load(MODEL)
        meta = json.loads(L.META.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        raise J.Refuse(f"its fitted model could not be read ({type(e).__name__})")
    return model, meta


def assemble(season: int, fresh: Path):
    L.point()
    F.SEASON = season
    return F.assemble(L.FIT_SEASONS + [season], qb_Y=season, fresh=fresh, upcoming=True)


def call(model, meta, rows) -> dict:
    num, cat = meta["numeric"], meta["categorical"]
    p = model.predict_proba(L.prep(rows, cat)[num + cat])[:, 1]
    return {g.game_id: dict(pick=g.home_team if ph >= 0.5 else g.away_team, pHome=round(float(ph), 4))
            for (_, g), ph in zip(rows.iterrows(), p)}


# ---------------------------------------------------------------- the data as it stood before a kickoff
def finished_by(kick: dict, t) -> set:
    return {gid for gid, k in kick.items() if k is not None and k <= t - FINISHED}


def poison(games, stats, pbp, keep: set, seed: int):
    """Everything a game not in `keep` could only tell after the cut, scrambled, and every such game
    given a made-up final: the smoke test recomputes calls from poisoned files, and a call that moves
    means something from after its kickoff reached it."""
    rng = np.random.default_rng(seed)
    g = games.copy()
    out = ~g.game_id.isin(keep)
    n = int(out.sum())
    for c in ("home_score", "away_score", "result", "total", "overtime", "temp", "wind"):
        g[c] = g[c].astype(float)
    g.loc[out, "home_score"] = rng.integers(0, 60, n).astype(float)
    g.loc[out, "away_score"] = rng.integers(0, 60, n).astype(float)
    g.loc[out, "result"] = g.loc[out, "home_score"] - g.loc[out, "away_score"]
    g.loc[out, "total"] = g.loc[out, "home_score"] + g.loc[out, "away_score"]
    g.loc[out, "overtime"] = 1.0
    g.loc[out, "temp"], g.loc[out, "wind"] = rng.integers(-10, 100, n).astype(float), rng.integers(0, 40, n).astype(float)
    g["referee"] = g.referee.astype(object)
    g.loc[out, "referee"] = "Poisoned Referee"
    s = p = None
    if stats is not None:
        s = stats.copy()
        so = ~s.game_id.isin(keep)
        for c in [c for c in s.columns if pd.api.types.is_numeric_dtype(s[c]) and c not in ("season", "week")]:
            s[c] = s[c].astype(float)
            s.loc[so, c] = s.loc[so, c] * rng.uniform(0.2, 3.0, int(so.sum())) + rng.normal(0, 5, int(so.sum()))
    if pbp is not None:
        p = pbp.copy()
        po = ~p.game_id.isin(keep)
        p.loc[po, "qb_epa"] = rng.normal(0, 3, int(po.sum()))
    return g, s, p


def pregame_files(dst: Path, season: int, games: pd.DataFrame, stats: pd.DataFrame | None, pbp: pd.DataFrame | None,
                  kick: dict, t, poisoned: int | None = None) -> set:
    """Write into `dst` the season's games.csv, team stats and play-by-play as they stood at time t
    (only games finished by then keep their results, stats and plays). Returns those games."""
    known = finished_by(kick, t)
    g = games[games.season == season].copy()
    st = stats.copy() if stats is not None else None
    pb = pbp.copy() if pbp is not None else None
    if poisoned is not None:
        g, st, pb = poison(g, st, pb, known, poisoned)
    gone = ~g.game_id.isin(known)
    g.loc[gone, POST_GAME] = np.nan
    g.to_csv(dst / "games.csv", index=False)
    if st is not None:
        st = st[st.game_id.isin(known)]
        if len(st):
            st.to_csv(dst / f"stats_team_week_{season}.csv", index=False)
    if pb is not None:
        pb = pb[pb.game_id.isin(known)]
        if len(pb):
            pb.to_parquet(dst / f"play_by_play_{season}.parquet", index=False)
    # what was written is what stood at t: no game unfinished by t has a result, a stat line or a play
    back = pd.read_csv(dst / "games.csv", low_memory=False)
    late = back[~back.game_id.isin(known)]
    assert late[POST_GAME].isna().all().all(), "a game unfinished at the cut kept an after-the-game field"
    for f in (dst / f"stats_team_week_{season}.csv",):
        if f.exists():
            assert pd.read_csv(f, low_memory=False).game_id.isin(known).all(), "a stat line of a game unfinished at the cut"
    f = dst / f"play_by_play_{season}.parquet"
    if f.exists():
        assert pd.read_parquet(f, columns=["game_id"]).game_id.isin(known).all(), "a play of a game unfinished at the cut"
    assert all(kick[x] is not None and kick[x] <= t - FINISHED for x in known), "a game counted finished too soon"
    return known


def replay(model, meta, season: int, games: pd.DataFrame, gids, kick: dict, poisoned: int | None = None) -> dict:
    """Each game's call from the data as it stood before its kickoff. Games that share what was known
    at their kickoffs (a Sunday's early slate, say) are scored from one set of files."""
    stats_p = J.DATA / f"stats_team_week_{season}.csv"
    pbp_p = J.DATA / f"play_by_play_{season}.parquet"
    stats = pd.read_csv(stats_p, low_memory=False) if stats_p.exists() else None
    pbp = pd.read_parquet(pbp_p, columns=PBP_COLS) if pbp_p.exists() else None
    groups: dict = {}
    for gid in gids:
        t = kick.get(gid)
        if t is None:
            continue
        groups.setdefault(frozenset(finished_by(kick, t)), []).append(gid)
    out = {}
    for known, todo in sorted(groups.items(), key=lambda kv: min(kick[g] for g in kv[1])):
        t = min(kick[g] for g in todo)
        with tempfile.TemporaryDirectory() as td:
            got = pregame_files(Path(td), season, games, stats, pbp, kick, t, poisoned)
            assert got == set(known)
            feats = assemble(season, Path(td))
        rows = feats[(feats.season == season) & feats.game_id.isin(todo)]
        # each is scored as a game still to come: nothing of its own was in the files
        assert not rows.played.astype(bool).any(), "a replayed game was scored as played"
        assert not set(rows.game_id) & set(known)
        miss = sorted(set(todo) - set(rows.game_id))
        if miss:
            log(f"replay before {J.iso(t)}: {', '.join(miss)} not among the games the files make next; left uncalled")
        out.update(call(model, meta, rows.reset_index(drop=True)))
        log(f"replayed {len(rows)} game{'s' if len(rows) != 1 else ''} from the files as they stood at {J.iso(t)} ({len(known)} games finished)")
    return out


# ---------------------------------------------------------------- the weekly step
def fetch_pbp(season: int, due: bool):
    dst = J.DATA / f"play_by_play_{season}.parquet"
    if dst.exists():            # joker.py's, this run's (it deletes a copy it could not refresh)
        return
    try:
        urllib.request.urlretrieve(PBP_URL.format(season=season), dst)
        log(f"downloaded {dst.name}")
    except Exception as e:  # noqa: BLE001
        if dst.exists():
            dst.unlink()
        if due:
            raise J.Refuse(f"play_by_play_{season}.parquet could not be downloaded ({e})")
        log(f"play-by-play {season} not available ({e})")


def setup():
    inputs_are_pregame()
    at = J.now()
    model, meta = load_model()
    st = J.load_state()
    season = J.season_of(st)
    if season - 1 > L.LAST:
        raise J.Refuse(f"it is fitted through {L.LAST}: extend betting/joker/long/data through {season - 1} and refit before it calls {season}")
    J.DATA.mkdir(exist_ok=True)
    games = J.read_games()
    return at, st, season, model, meta, games


def main():
    at, st, season, model, meta, games = setup()
    due = J.stats_due(games, season, at)
    if due and not (J.DATA / f"stats_team_week_{season}.csv").exists():
        raise J.Refuse(f"stats_team_week_{season}.csv is not in data/")
    fetch_pbp(season, due)
    g26 = games[games.season == season]
    kick = J.kickoffs(g26)
    prev = dict(st.get(KEY) or {})
    info = dict(st.get(INFO) or {})
    since = info.get("since") or J.iso(at)          # its first live run: calls for games before it are backfilled
    t_since = datetime.fromisoformat(since.replace("Z", "+00:00"))
    # the coming games, scored now
    feats = assemble(season, J.DATA)
    this = feats[feats.season == season].reset_index(drop=True)
    ahead = this[[not bool(p) and kick.get(g) is not None and kick[g] > at for g, p in zip(this.game_id, this.played)]]
    fresh = call(model, meta, ahead.reset_index(drop=True)) if len(ahead) else {}
    # every game since kickoff has the call it had before it; one without (a game before its first
    # run, or one a failed run missed) is replayed from the data as it stood before its kickoff
    started = [g for g, k in kick.items() if k is not None and k <= at]
    need = [g for g in started if g not in prev]
    if need:
        log(f"{len(need)} game{'s' if len(need) != 1 else ''} since kickoff without a call: replayed from the data before each kickoff")
        for gid, v in replay(model, meta, season, games, need, kick).items():
            v = dict(v, backfill=True)
            if kick[gid] > t_since:     # missed after it went live: first published after kickoff
                v["late"] = True
            prev[gid] = v
    picks = J.freeze(prev, fresh, kick, at)
    lost = [gid for gid, r in st.get("processed", {}).items() if r.get("result") is not None and gid not in picks]
    if lost:
        raise J.Refuse(f"{len(lost)} graded games have no call ({', '.join(sorted(lost)[:3])}...)")
    changed = False
    if st.get(KEY) != picks:
        st[KEY] = picks
        changed = True
    changed |= J.grade(st, picks, KEY)
    wf = (meta.get("walk_forward") or {}).get(f"2021_{L.LAST}_reg") or {}
    new_info = {"since": since, "fitted_on": meta.get("fitted_on", ""),
                "walk_forward": {k: (wf.get(k) or {}).get("accuracy") for k in ("long_fit", "joker_recipe_2019_start", "vegas")} | {"games": wf.get("games")}}
    if info != new_info:
        st[INFO] = new_info
        changed = True
    changed |= J.set_status(st, KEY, None, at)
    jk = st.get("joker") or {}
    differ = [g for g in fresh if g in jk and jk[g]["pick"] != fresh[g]["pick"]]
    log(f"called {len(fresh)} coming games ({len(differ)} unlike the live Joker: {', '.join(differ) or 'none'}); "
        f"{sum(1 for g in started if g in picks)} since kickoff held, {sum(1 for v in picks.values() if v.get('backfill'))} of them backfilled")
    if changed:
        J.save_state(st)
        graded = [r[KEY] for r in st["processed"].values() if r.get(KEY) and r[KEY]["correct"] is not None]
        log(f"state.json patched: Joker Jr {sum(1 for r in graded if r['correct'])}-{sum(1 for r in graded if not r['correct'])} on {len(graded)} decided games")
    else:
        log("state.json unchanged")


def recompute(gids, poisoned: bool):
    at, st, season, model, meta, games = setup()
    kick = J.kickoffs(games[games.season == season])
    bad = [g for g in gids if kick.get(g) is None or kick[g] > at]
    if bad:
        raise SystemExit(f"not kicked off: {bad}")
    out = replay(model, meta, season, games, gids, kick, poisoned=7 if poisoned else None)
    print(json.dumps(out))


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["--recompute"]:
        recompute([a for a in args[1:] if not a.startswith("--")], "--poison" in args)
    else:
        J.run(KEY, main)
