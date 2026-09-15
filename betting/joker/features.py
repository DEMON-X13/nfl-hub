"""The Joker's inputs, built the same way for training and for the weekly run.

Everything is known before kickoff:
  * the app's rating state before the game (variant E parameters): Elo, EPA per play
    overall, passing and rushing, success rate, explosiveness, turnovers, offence and
    defence, games played, rest edge, neutral site
  * the quarterback adjustment (K3): expected starter versus actual, faded
  * the market: closing spread, both moneylines, the total, the preseason win total
  * the setting: week, weekday, kickoff hour, division game, roof, surface, temperature,
    wind, stadium, referee
  * the people: both head coaches, both starting quarterbacks by name
  * the teams and the season
  * both teams' full stat line from their previous game and their season-to-date
    averages, every numeric nflverse team-week column

Data layout. FROZEN holds the research harness's files for 2019-2025 exactly as the
formula was tested (games.csv, stats_team_week_2019..2025.csv, win_totals*.csv,
passers_2019_2025.csv). FRESH is the betting job's download folder with this season's
games.csv, stats_team_week_2026.csv and play_by_play_2026.parquet.
"""
from __future__ import annotations

import sys
from pathlib import Path

import warnings

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore", category=pd.errors.PerformanceWarning)
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))                    # the vendored harness package lives beside this file
from harness import data, pbp, qb, sources       # noqa: E402
from harness.ratings import Params, build_features, game_features  # noqa: E402

FROZEN = HERE / "data"
FIT_SEASONS = list(range(2019, 2026))
SEASON = 2026

CATEGORICAL = ["home_team", "away_team", "roof", "surface", "weekday", "home_coach", "away_coach",
               "referee", "stadium", "home_qb_name", "away_qb_name"]
NOT_FEATURES = {"game_id", "game_type", "gameday", "home_score", "away_score", "result", "home_win",
                "qb_home", "qb_away", "usual_home", "usual_away", "played"}
RAW_EXTRA = ["game_id", "spread_line", "home_moneyline", "away_moneyline", "total_line", "div_game",
             "roof", "surface", "temp", "wind", "weekday", "gametime", "home_coach", "away_coach",
             "referee", "stadium", "home_qb_name", "away_qb_name"]


def point_harness_at_frozen():
    data.RAW = FROZEN
    sources.RAW = FROZEN if hasattr(sources, "RAW") else None


# ---------------------------------------------------------------- raw tables
def games_table(fresh: Path | None):
    """All games 2019-2025 from the frozen file plus this season from the fresh one,
    with the harness's own cleaning. Unplayed games keep result NaN."""
    g = pd.read_csv(FROZEN / "games.csv", low_memory=False)
    g = g[g.season.isin(FIT_SEASONS)]
    if fresh is not None and (fresh / "games.csv").exists():
        f = pd.read_csv(fresh / "games.csv", low_memory=False)
        g = pd.concat([g, f[f.season == SEASON]], ignore_index=True)
    for c in ("home_team", "away_team"):
        g[c] = data.norm_team(g[c])
    g["home_rest"] = g.home_rest.fillna(7); g["away_rest"] = g.away_rest.fillna(7)
    g["gametime"] = g.gametime.fillna(""); g["neutral"] = (g.location != "Home").astype(int)
    g["result"] = g.result.astype(float)
    g = g.sort_values(["season", "gameday", "gametime", "game_id"], kind="stable").reset_index(drop=True)
    return g


def stats_table(seasons, fresh: Path | None):
    """The harness's team-week aggregation over the frozen seasons plus a fresh 2026 file."""
    frames = [pd.read_csv(FROZEN / f"stats_team_week_{y}.csv", low_memory=False) for y in seasons if y in FIT_SEASONS]
    if SEASON in seasons and fresh is not None and (fresh / f"stats_team_week_{SEASON}.csv").exists():
        frames.append(pd.read_csv(fresh / f"stats_team_week_{SEASON}.csv", low_memory=False))
    raw = pd.concat(frames, ignore_index=True)
    return sources.nflverse_team_week_from_frame(raw) if hasattr(sources, "nflverse_team_week_from_frame") else _aggregate_like_harness(raw, seasons)


def _aggregate_like_harness(raw, seasons):
    """sources.nflverse_team_week reads files by season; feed it the same frames via a temp dir."""
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        tdp = Path(td)
        for y in seasons:
            raw[raw.season == y].to_csv(tdp / f"stats_team_week_{y}.csv", index=False)
        keep = data.RAW, getattr(sources, "RAW", None)
        data.RAW = tdp
        if hasattr(sources, "RAW"): sources.RAW = tdp
        try:
            return sources.nflverse_team_week(seasons)
        finally:
            data.RAW = keep[0]
            if hasattr(sources, "RAW"): sources.RAW = keep[1]


def passers(fresh: Path | None):
    """The quarterback table: the frozen 2019-2025 rows plus this season from play-by-play."""
    p = pd.read_csv(FROZEN / "passers_2019_2025.csv")
    pq = fresh / f"play_by_play_{SEASON}.parquet" if fresh is not None else None
    if pq is not None and pq.exists():
        cols = ["game_id", "season", "season_type", "week", "posteam", "play_type", "qb_dropback",
                "passer_player_id", "passer_player_name", "qb_epa"]
        x = pd.read_parquet(pq, columns=cols)
        x = x[x.posteam.notna() & x.season_type.isin(["REG", "POST"])].copy()
        x["team"] = pbp.norm_team(x.posteam)
        d = x[(x.qb_dropback == 1) & x.passer_player_id.notna() & x.play_type.isin(["pass", "run", "qb_spike"])]
        g = d.groupby(["season", "game_id", "team", "passer_player_id"]).agg(
            n=("qb_epa", "size"), epa=("qb_epa", "sum"), name=("passer_player_name", "first")).reset_index()
        p = pd.concat([p, g], ignore_index=True)
    qb._PASSERS = p
    qb._STARTS = p.sort_values("n", ascending=False).groupby(["game_id", "team"]).head(1)
    return p


# ---------------------------------------------------------------- feature blocks
def raw_extras(feats, games):
    raw = games[RAW_EXTRA].copy()
    raw["hour"] = pd.to_numeric(raw.gametime.astype(str).str.slice(0, 2), errors="coerce")
    raw = raw.drop(columns=["gametime"] + [c for c in RAW_EXTRA if c != "game_id" and c in feats.columns])
    return feats.merge(raw, on="game_id", how="left")


def win_totals(feats):
    wt = pd.read_csv(FROZEN / "win_totals.csv")[["season", "team", "exp_wins"]]
    f26 = FROZEN / "win_totals_2026.csv"
    if f26.exists():
        w = pd.read_csv(f26)
        if "exp_wins" in w.columns:
            wt = pd.concat([wt, w[["season", "team", "exp_wins"]]])
    wt["team"] = data.norm_team(wt.team)
    out = feats.merge(wt.rename(columns={"team": "home_team", "exp_wins": "wt_home"}), on=["season", "home_team"], how="left")
    return out.merge(wt.rename(columns={"team": "away_team", "exp_wins": "wt_away"}), on=["season", "away_team"], how="left")


def previous_game_stats(feats, seasons, fresh: Path | None):
    """Each team's previous-game stat line and season-to-date averages. For an unplayed
    game the 'previous game' is the team's latest played one."""
    frames = [pd.read_csv(FROZEN / f"stats_team_week_{y}.csv", low_memory=False) for y in seasons if y in FIT_SEASONS]
    if SEASON in seasons and fresh is not None and (fresh / f"stats_team_week_{SEASON}.csv").exists():
        frames.append(pd.read_csv(fresh / f"stats_team_week_{SEASON}.csv", low_memory=False))
    st = pd.concat(frames, ignore_index=True)
    if "season_type" in st.columns:
        st = st[st.season_type == "REG"]
    st["team"] = data.norm_team(st.team)
    drop = {"season", "week", "team", "season_type", "game_id", "opponent_team"}
    num = [c for c in st.columns if c not in drop and pd.api.types.is_numeric_dtype(st[c])]
    st = st.sort_values(["team", "season", "week"]).reset_index(drop=True)
    grp = st.groupby(["team", "season"], sort=False)
    prev = grp[num].shift(1); prev.columns = [f"pg_{c}" for c in num]
    todate = grp[num].transform(lambda x: x.shift(1).expanding().mean()); todate.columns = [f"td_{c}" for c in num]
    tab = pd.concat([st[["game_id", "team", "season"]], prev, todate], axis=1)
    # the row an unplayed game would see: last game's line, to-date mean of every game so far
    last = grp[num].last(); last.columns = [f"pg_{c}" for c in num]
    mean = grp[num].mean(); mean.columns = [f"td_{c}" for c in num]
    nxt = pd.concat([last, mean], axis=1).reset_index()
    out = feats
    for side in ("home", "away"):
        team = f"{side}_team"
        t = tab.drop(columns=["season"]).rename(columns={"team": team}).add_suffix("_" + side.upper()[0]).rename(
            columns={f"game_id_{side.upper()[0]}": "game_id", f"{team}_{side.upper()[0]}": team})
        out = out.merge(t, on=["game_id", team], how="left")
        n = nxt.rename(columns={"team": team}).add_suffix("_" + side.upper()[0]).rename(
            columns={f"{team}_{side.upper()[0]}": team, f"season_{side.upper()[0]}": "season"})
        m = out.merge(n, on=["season", team], how="left", suffixes=("", "_next"))
        for c in [c for c in out.columns if (c.endswith("_H") or c.endswith("_A")) and c.startswith(("pg_", "td_"))]:
            if c + "_next" in m.columns:
                out[c] = np.where(out.played, out[c], m[c + "_next"])
    return out


# ---------------------------------------------------------------- assembly
def assemble(seasons, qb_Y, fresh: Path | None = None, upcoming: bool = False):
    """Feature rows for every played game in `seasons`, plus (if `upcoming`) the next
    unplayed week of the current season, scored from the state after the last played game."""
    point_harness_at_frozen()
    games_all = games_table(fresh)
    games_all = games_all[games_all.season.isin(seasons)]
    played = games_all[games_all.result.notna()].reset_index(drop=True)
    stats = stats_table(seasons, fresh)
    passers(fresh)
    cols = sources.APP_STAT_COLS
    lm = sources.league_means(stats, cols)
    feats, state = build_features(played[data.GAME_COLS], stats, cols, lm, Params(warm=0))
    feats["played"] = True
    if upcoming:
        un = games_all[games_all.result.isna() & (games_all.season == SEASON) & (games_all.game_type == "REG")]
        if len(un):
            wk = int(un.week.min())
            un = un[un.week == wk].reset_index(drop=True)
            if not (played.season == SEASON).any():      # nothing played yet: the state is still last season's, roll it over
                from harness.ratings import rollover
                rollover(state, cols, lm, Params(warm=0), season=SEASON)
            rows = [game_features(g, state[g.home_team], state[g.away_team], lm) for g in un[data.GAME_COLS].itertuples(index=False)]
            uf = pd.concat([un[data.GAME_COLS].reset_index(drop=True), pd.DataFrame(rows)], axis=1)
            uf["played"] = False
            feats = pd.concat([feats, uf], ignore_index=True)
    feats = qb.augment(feats, qb_Y, with_def=False, fade=qb.FADE)
    feats = raw_extras(feats, games_all)
    feats = win_totals(feats)
    feats = previous_game_stats(feats, seasons, fresh)
    feats["home_win"] = (feats.result > 0).astype(int)
    return feats


def columns(feats):
    cat = [c for c in CATEGORICAL if c in feats.columns]
    num = [c for c in feats.columns if c not in NOT_FEATURES and c not in cat and pd.api.types.is_numeric_dtype(feats[c])]
    return num, cat
