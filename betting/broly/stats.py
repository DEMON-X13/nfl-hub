"""The Broly Model's inputs, built the same way for fitting and for the weekly run.

For every team-game, from nflverse play-by-play: offensive plays and yards, third downs
converted and failed, giveaways (interceptions and lost fumbles), red-zone trips and the
touchdowns they ended in; points for and against from the schedule. Before each game a team
carries its season to date, with last season counting as K games' worth at its own per-game
rate, so the early weeks lean on last year and fade as this one fills in.

Six stats, home minus away: points per game, points allowed per game, turnover differential
per game, third-down conversion rate, red-zone touchdown rate, yards per play, and yards per
play allowed (the six the owner named, with points split into for and against).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

K = 4.0
SUMS = ["pf", "pa", "to", "take", "third_c", "third_f", "rz_trips", "rz_td", "yds", "plays", "yds_a", "plays_a"]
FEATURES = ["d_ppg", "d_papg", "d_tod", "d_third", "d_rz", "d_ypp", "d_yppa"]
COLS = ["m_l"] + FEATURES
PBP_COLS = ["game_id", "season", "week", "posteam", "defteam", "play_type", "yards_gained", "interception",
            "fumble_lost", "third_down_converted", "third_down_failed", "drive", "drive_inside20", "fixed_drive_result"]


def team_games(pbp: pd.DataFrame, games: pd.DataFrame) -> pd.DataFrame:
    p = pbp[pbp.posteam.notna()]
    sc = p[p.play_type.isin(["pass", "run"])]
    g = sc.groupby(["game_id", "season", "week", "posteam", "defteam"])
    t = pd.DataFrame({"plays": g.size(), "yds": g.yards_gained.sum(),
                      "third_c": g.third_down_converted.sum(), "third_f": g.third_down_failed.sum()}).reset_index()
    to = (p.assign(t=p.interception.fillna(0) + p.fumble_lost.fillna(0)).groupby(["game_id", "posteam"]).t.sum()
          .rename("to").reset_index())
    dr = (p[p.drive.notna()].groupby(["game_id", "posteam", "drive"])
          .agg(rz=("drive_inside20", "max"), res=("fixed_drive_result", "last")).reset_index())
    dr = dr[dr.rz == 1]
    rz = dr.groupby(["game_id", "posteam"]).agg(rz_trips=("rz", "size"),
                                                rz_td=("res", lambda x: (x == "Touchdown").sum())).reset_index()
    t = t.merge(to, on=["game_id", "posteam"], how="left").merge(rz, on=["game_id", "posteam"], how="left")
    t = t.fillna({"rz_trips": 0, "rz_td": 0, "to": 0})
    pts = pd.concat([
        games[["game_id", "home_team", "home_score", "away_score"]].rename(columns={"home_team": "posteam", "home_score": "pf", "away_score": "pa"}),
        games[["game_id", "away_team", "away_score", "home_score"]].rename(columns={"away_team": "posteam", "away_score": "pf", "home_score": "pa"})])
    t = t.merge(pts, on=["game_id", "posteam"], how="left")
    opp = t[["game_id", "posteam", "yds", "plays", "to"]].rename(columns={"posteam": "defteam", "yds": "yds_a", "plays": "plays_a", "to": "take"})
    t = t.merge(opp, on=["game_id", "defteam"], how="left")
    return t.merge(games[["game_id", "gameday"]], on="game_id").sort_values(["gameday", "game_id"])


def season_means(tg: pd.DataFrame) -> dict:
    """each team's per-game rate of every summed column over one season's games"""
    out = {}
    for t, g in tg[tg.pf.notna()].groupby("posteam"):
        n = len(g)
        out[t] = {k: float(g[k].fillna(0).sum()) / n for k in SUMS}
    return out


def pregame(tg: pd.DataFrame, prior: dict | None = None) -> dict:
    """(game_id, team) -> the team's seven stats before that game. prior is last season's
    per-game rates for the first season in tg; later seasons use the one before them."""
    cur, n, out, last, prev = {}, {}, {}, None, prior or {}
    for (gid, season), grp in tg.groupby(["game_id", "season"], sort=False):
        if season != last:
            if last is not None:
                prev = {t: {k: v / max(n.get(t, 1), 1) for k, v in c.items()} for t, c in cur.items()}
            cur, n, last = {}, {}, season
        for r in grp.itertuples(index=False):
            t = r.posteam
            c = cur.get(t, {k: 0.0 for k in SUMS}); nn = n.get(t, 0); pv = prev.get(t)
            kk = K if pv else 0.0
            P = (lambda k: pv[k]) if pv else (lambda k: 0.0)
            per = lambda k: (c[k] + kk * P(k)) / (nn + kk) if (nn + kk) else np.nan
            rate = lambda a, b: (c[a] + kk * P(a)) / (c[b] + kk * P(b)) if (c[b] + kk * P(b)) else np.nan
            third_den = c["third_c"] + c["third_f"] + kk * (P("third_c") + P("third_f"))
            out[(gid, t)] = {"ppg": per("pf"), "papg": per("pa"), "tod": per("take") - per("to"),
                             "third": (c["third_c"] + kk * P("third_c")) / third_den if third_den else np.nan,
                             "rz": rate("rz_td", "rz_trips"), "ypp": rate("yds", "plays"), "yppa": rate("yds_a", "plays_a")}
        for r in grp.itertuples(index=False):
            if pd.isna(r.pf):
                continue
            c = cur.setdefault(r.posteam, {k: 0.0 for k in SUMS})
            for k in SUMS:
                v = getattr(r, k)
                c[k] += 0.0 if pd.isna(v) else float(v)
            n[r.posteam] = n.get(r.posteam, 0) + 1
    return out


def market_prob(r) -> float:
    """the home side's chance from the moneylines, the book's margin taken out; the spread if
    there are no moneylines"""
    h, a = r.get("home_moneyline"), r.get("away_moneyline")
    if pd.notna(h) and pd.notna(a):
        ip = lambda m: 100 / (m + 100) if m > 0 else -m / (-m + 100)
        ph, pa = ip(h), ip(a)
        return float(np.clip(ph / (ph + pa), 0.01, 0.99))
    if pd.notna(r.get("spread_line")):
        return float(np.clip(1 / (1 + np.exp(-r["spread_line"] / 6.5)), 0.01, 0.99))
    return np.nan


def frame(games: pd.DataFrame, pg: dict) -> pd.DataFrame:
    rows = []
    for _, r in games.iterrows():
        h, a = pg.get((r.game_id, r.home_team)), pg.get((r.game_id, r.away_team))
        mp = market_prob(r)
        if not h or not a or np.isnan(mp):
            continue
        d = {"game_id": r.game_id, "m_l": float(np.log(mp / (1 - mp)))}
        for f in ["ppg", "papg", "tod", "third", "rz", "ypp", "yppa"]:
            d["d_" + f] = h[f] - a[f]
        rows.append(d)
    return pd.DataFrame(rows)
