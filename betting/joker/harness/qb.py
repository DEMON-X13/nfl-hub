"""Variant K: quarterback ratings from play-by-play and the backup-QB drop.

See VARIANTS.md, "K: quarterback ratings", for the definitions. Everything here
is computed before the game it feeds (ratings use prior dropbacks only) and the
replacement level r0 uses seasons before the test season only.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import data, pbp

N0 = 200          # prior weight in dropbacks
DECAY = 0.6       # weight per season back
_STARTS: pd.DataFrame | None = None
_PASSERS: pd.DataFrame | None = None


def passer_games(seasons=data.SEASONS):
    """Per (game, team, passer): dropbacks and qb_epa. Cached."""
    global _PASSERS, _STARTS
    if _PASSERS is None:
        p = pbp.load_pbp(seasons, extra_cols=["passer_player_name", "week"])
        d = p[(p.qb_dropback == 1) & p.passer_player_id.notna() & p.play_type.isin(["pass", "run", "qb_spike"])]
        g = d.groupby(["season", "game_id", "team", "passer_player_id"]).agg(
            n=("qb_epa", "size"), epa=("qb_epa", "sum"), name=("passer_player_name", "first")).reset_index()
        _PASSERS = g
        _STARTS = g.sort_values("n", ascending=False).groupby(["game_id", "team"]).head(1)
    return _PASSERS, _STARTS


def team_game_order(games: pd.DataFrame) -> pd.DataFrame:
    """One row per team-game in kickoff order, with the team's previous game."""
    home = games[["game_id", "season", "week", "gameday", "gametime", "home_team"]].rename(columns={"home_team": "team"})
    away = games[["game_id", "season", "week", "gameday", "gametime", "away_team"]].rename(columns={"away_team": "team"})
    tg = pd.concat([home, away]).sort_values(["team", "season", "gameday", "gametime", "game_id"]).reset_index(drop=True)
    tg["prev_game"] = tg.groupby(["team", "season"]).game_id.shift(1)
    return tg


def replacement_level(passers: pd.DataFrame, starts: pd.DataFrame, fit_seasons) -> float:
    """Dropback-weighted mean qb_epa/dropback of passers who were not their
    team's most-used passer that season (fit seasons only)."""
    f = passers[passers.season.isin(fit_seasons)]
    primary = f.groupby(["season", "team", "passer_player_id"]).n.sum().reset_index()
    primary = primary.sort_values("n", ascending=False).groupby(["season", "team"]).head(1)
    key = set(zip(primary.season, primary.team, primary.passer_player_id))
    backups = f[[(s, t, q) not in key for s, t, q in zip(f.season, f.team, f.passer_player_id)]]
    return float(backups.epa.sum() / backups.n.sum())


def ratings_before(passers: pd.DataFrame, games: pd.DataFrame, r0: float) -> dict:
    """{(game_id, passer_id): rating before that game} for every passer-game,
    plus a per-passer running state for players with no prior dropbacks."""
    tg = team_game_order(games)
    order = {gid: i for i, gid in enumerate(games.sort_values(["season", "gameday", "gametime", "game_id"]).game_id)}
    pg = passers.merge(games[["game_id", "season"]].drop_duplicates(), on=["game_id", "season"], how="inner")
    pg["ord"] = pg.game_id.map(order)
    pg = pg.sort_values(["passer_player_id", "ord"])
    out = {}
    for pid, grp in pg.groupby("passer_player_id", sort=False):
        # running sums per season, decayed at rating time
        per_season = {}
        for row in grp.itertuples(index=False):
            num = sum(v[0] * DECAY ** (row.season - s) for s, v in per_season.items() if s <= row.season)
            den = sum(v[1] * DECAY ** (row.season - s) for s, v in per_season.items() if s <= row.season)
            out[(row.game_id, pid)] = (num + N0 * r0) / (den + N0)
            e, n = per_season.get(row.season, (0.0, 0.0))
            per_season[row.season] = (e + row.epa, n + row.n)
    return out


FADE = 0.75   # K3: (1 - alpha), the share of the old starter's play still in the team rating


def drop_table(games: pd.DataFrame, fit_seasons, fade: float | None = None) -> pd.DataFrame:
    """Per game: drop_home, drop_away, plus who started and who usually does.

    fade=None is K1 (the drop applies to the first game with a new starter only).
    fade=0.75 is K3: the gap set at the change keeps applying, times fade^k for the
    k-th further game with the same starter; a new change restarts the stint."""
    passers, starts = passer_games()
    r0 = replacement_level(passers, starts, fit_seasons)
    rat = ratings_before(passers, games, r0)
    tg = team_game_order(games)
    st = starts.set_index(["game_id", "team"])
    rows = []
    stint = {}   # team -> [gap, k]
    for r in tg.itertuples(index=False):
        if (r.game_id, r.team) not in st.index:
            rows.append((r.game_id, r.team, None, None, 0.0)); continue
        actual = st.loc[(r.game_id, r.team)]
        aid = actual.passer_player_id
        r_actual = rat.get((r.game_id, aid), r0)
        if pd.isna(r.prev_game) or (r.prev_game, r.team) not in st.index:
            stint.pop(r.team, None)
            rows.append((r.game_id, r.team, aid, aid, 0.0)); continue
        uid = st.loc[(r.prev_game, r.team)].passer_player_id
        if uid == aid:
            drop = 0.0
            if fade is not None and r.team in stint:
                stint[r.team][1] += 1
                drop = stint[r.team][0] * fade ** stint[r.team][1]
            rows.append((r.game_id, r.team, aid, uid, drop)); continue
        # the usual starter's rating "before this game" = his rating at his last appearance,
        # carried forward (he did not play, so nothing changed)
        r_usual = rat.get((r.game_id, uid))
        if r_usual is None:
            prior = [(k, v) for k, v in rat.items() if k[1] == uid]
            r_usual = _latest_rating(prior, games, r.game_id) if prior else r0
        gap = r_usual - r_actual
        stint[r.team] = [gap, 0]
        rows.append((r.game_id, r.team, aid, uid, gap))
    d = pd.DataFrame(rows, columns=["game_id", "team", "actual_qb", "usual_qb", "drop"])
    d.attrs["r0"] = r0
    return d


def _latest_rating(prior, games, game_id):
    order = {gid: i for i, gid in enumerate(games.sort_values(["season", "gameday", "gametime", "game_id"]).game_id)}
    o = order[game_id]
    before = [(order[k[0]], v) for k, v in prior if k[0] in order and order[k[0]] < o]
    return max(before)[1] if before else None


def augment(feats: pd.DataFrame, Y: int, with_def: bool = False, fade: float | None = None) -> pd.DataFrame:
    """Add qb_drop (and qb_drop_x_def) to a features frame for test season Y.
    Replacement level and the defence z-scores use seasons < Y only."""
    games = feats[["game_id", "season", "week", "gameday", "gametime", "home_team", "away_team"]]
    fit_seasons = [s for s in sorted(feats.season.unique()) if s < Y]
    d = drop_table(games, fit_seasons, fade=fade)
    dh = d.rename(columns={"team": "home_team", "drop": "drop_home", "actual_qb": "qb_home", "usual_qb": "usual_home"})
    da = d.rename(columns={"team": "away_team", "drop": "drop_away", "actual_qb": "qb_away", "usual_qb": "usual_away"})
    out = feats.merge(dh, on=["game_id", "home_team"], how="left").merge(da, on=["game_id", "away_team"], how="left")
    out["drop_home"] = out.drop_home.fillna(0.0); out["drop_away"] = out.drop_away.fillna(0.0)
    out["qb_drop"] = out.drop_home - out.drop_away
    out.attrs["r0"] = d.attrs["r0"]
    if with_def:
        fit = out[out.season.isin(fit_seasons)]
        def z(col, sign, side):
            mu, sd = fit[f"{col}_{side}"].mean(), fit[f"{col}_{side}"].std()
            return sign * (out[f"{col}_{side}"] - mu) / sd
        for side in ("home", "away"):
            out[f"D_{side}"] = (z("d_sr", 1, side) + z("d_pass_epa", -1, side) + z("d_to", 1, side)) / 3
        out["qb_drop_x_def"] = out.drop_home * out.D_away - out.drop_away * out.D_home
    return out
