"""Study 2: how is the Elo rating in study 1 different from the site's own ratings, and which
predicts better? Every rating is run walk-forward over 2003-2025 on games.csv (1999-2002 warm
the Elos up) and scored on the same games: each game's rating gap from the games before it.

  study Elo      study 1's rating, FiveThirtyEight's published NFL Elo: K 20, home field 65, their
                 margin multiplier (which damps a favourite's win and boosts an underdog's), a third
                 back to 1505 each summer. Carried across seasons.
  app Elo        the Elo inside the betting app, which the Alpha and Challenger models (and the Joker)
                 feed into their regressions: K 30, home field 50, the margin multiplier on the size
                 of the gap whoever won (|elo diff|, so it never boosts an underdog), 70% of each
                 team's edge kept each summer (betting/joker/harness/ratings.py, a port of the app).
  Team Rankings  the site's Power Ratings (elo/build.py, THE POWER RATINGS): this season's finals
                 alone, each its home margin capped at 17 less home field, solved together by a
                 weighted ridge (16 average games of pull, recent weeks weighed more, a 16-week
                 half-life), so every game is re-judged against what the opponent turned out to be.
                 No memory: every team is average in week 1. The table on the site is 0.8 of this and
                 0.2 of each team's expected lineup on player Elo; the lineup part needs the player
                 build and is left out here, so this is the table's results part, run by
                 elo/build.py's own power_ratings().
  ELO Model      the player-Elo game model on the Pick'em Record is built from each team's expected
                 starters' ratings, 2012 on; it cannot be run here, so its own published walk-forward
                 is quoted beside these, on its own games.

Scored three ways on every game with a closing spread (ties out): the pick rate (the higher-rated
team), each rating's own win chance where it has one (Elo's 1/(1+10^(-(gap+home)/400)); Team
Rankings' 1/(1+e^-(0.35941 gap + 0.33195 home)), the site's own constants), and a logistic fitted
leaving one season out on the gap (each rating at its best calibration, by stage of the season).
Pairs are compared game by game, with 90% intervals from resampling whole seasons.

Run: python3 -I research/elo_vs_site/compare.py   (after research/win_indicators/build.py)
"""
import json, math, os, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'research', 'win_indicators'))
sys.path.insert(0, os.path.join(ROOT, 'research'))
sys.path.insert(0, os.path.join(ROOT, 'elo'))
import common  # noqa: E402
import rank as R  # noqa: E402
import build as elo_build  # noqa: E402   elo/build.py: the site's power_ratings() and its constants

RES = os.path.join(HERE, 'results')

# the app's Elo (betting/joker/harness/ratings.py Params, the app's MODEL.params)
APP_K, APP_HOME, APP_CARRY, APP_BASE = 30.0, 50.0, 0.70, 1500.0
STAGES = [('weeks 1-2', 1, 2), ('weeks 3-5', 3, 5), ('weeks 6-9', 6, 9), ('weeks 10-13', 10, 13),
          ('weeks 14-18', 14, 18), ('playoffs', 19, 22)]


def app_elo_pre():
    """Each game's app Elo (home, away) before it, the app's rule from 1999 on."""
    elo, cur, out = {}, None, {}
    for r in R.games_mapped(R.ELO_FIRST).itertuples():
        if r.season != cur:
            elo = {k: APP_BASE + APP_CARRY * (v - APP_BASE) for k, v in elo.items()}
            cur = r.season
        eh, ea = elo.get(r.home_team, APP_BASE), elo.get(r.away_team, APP_BASE)
        out[r.game_id] = (eh, ea)
        home = 0.0 if r.location == 'Neutral' else APP_HOME
        exp_h = 1 / (1 + 10 ** (-(eh - ea + home) / 400))
        m = r.home_score - r.away_score
        mult = math.log(abs(m) + 1) * (2.2 / (abs(eh - ea + home) * 0.001 + 2.2))
        s = 1.0 if m > 0 else 0.5 if m == 0 else 0.0
        d = APP_K * mult * (s - exp_h)
        elo[r.home_team], elo[r.away_team] = eh + d, ea - d
    return out


def team_rankings_pre():
    """Each game's Team Rankings results part (home, away), in points: elo/build.py's
    power_ratings() on that season's finals before the game's date."""
    g = R.games_mapped(common.FIRST)
    out = {}
    for season, gs in g.groupby('season'):
        for day in sorted(gs['gameday'].unique()):
            before = gs[gs['gameday'] < day]
            pr = elo_build.power_ratings(before) if len(before) else {}
            for r in gs[gs['gameday'] == day].itertuples():
                out[r.game_id] = (pr.get(r.home_team, {}).get('r', 0.0) or 0.0, pr.get(r.away_team, {}).get('r', 0.0) or 0.0)
    return out


def logloss(p, y):
    p = np.clip(p, 1e-9, 1 - 1e-9)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))


def main():
    t = pd.read_parquet(os.path.join(R.OUT, 'team_games.parquet'))
    h, a = R.paired(t)
    keep = (h['home_score'] != h['away_score']) & h['spread_line'].notna()
    h, a = h[keep], a[keep]
    gid = h.index
    y = (h['home_score'] > h['away_score']).astype(float).values
    ss = h['season'].values
    site = (h['location'] != 'Neutral').astype(float).values
    week = np.where(h['season_type'] == 'POST', 19, h['week']).astype(int)
    L = R.line_features(h['spread_line'])

    study, app, tr = R.elo_pre(), app_elo_pre(), team_rankings_pre()
    gaps = {
        'study Elo': np.array([study[g][0] - study[g][1] for g in gid]),
        'app Elo': np.array([app[g][0] - app[g][1] for g in gid]),
        'Team Rankings (results part)': np.array([tr[g][0] - tr[g][1] for g in gid]),
    }
    own = {   # each rating's own win chance
        'study Elo': 1 / (1 + 10 ** (-(gaps['study Elo'] + R.ELO_HOME * site) / 400)),
        'app Elo': 1 / (1 + 10 ** (-(gaps['app Elo'] + APP_HOME * site) / 400)),
        'Team Rankings (results part)': 1 / (1 + np.exp(-(elo_build.PR_S * gaps['Team Rankings (results part)'] + elo_build.PR_H0 * site))),
    }
    spread = L[:, 0]
    rows = []

    def score(name, mask, label):
        g = gaps[name][mask]
        yy, s = y[mask], ss[mask]
        ll_fit, _ = R.loso(R.zs(g), yy, s)
        ll_own = logloss(own[name][mask], yy)
        base, _ = R.loso(L[mask], yy, s)
        plus, _ = R.loso(np.column_stack([L[mask], R.zs(g)]), yy, s)
        lo, hi = R.block_boot(plus - base, s)
        return dict(rating=name, games=label, n=int(mask.sum()), pick_rate=R.pick_rate(g, yy)[0],
                    logloss_own=ll_own.mean(), logloss_fitted=ll_fit.mean(),
                    vs_line_x1000=(plus - base).mean() * 1000, vs_line_lo=lo * 1000, vs_line_hi=hi * 1000)

    sets = [('every game, 2003-2025', np.ones(len(y), bool)),
            ('weeks 1-3', week <= 3), ('weeks 4 on', week >= 4),
            ('2018-2025, weeks 2 on', (ss >= 2018) & (week >= 2))]
    sets += [(lab, (week >= lo_) & (week <= hi_)) for lab, lo_, hi_ in STAGES]
    for lab, mask in sets:
        rows.append(dict(rating='the closing spread', games=lab, n=int(mask.sum()),
                         pick_rate=R.pick_rate(np.sign(spread[mask]), y[mask])[0],
                         logloss_fitted=R.loso(L[mask], y[mask], ss[mask])[0].mean()))
        for name in gaps:
            rows.append(score(name, mask, lab))
    table = pd.DataFrame(rows)

    # head to head, game by game: the study's Elo against each of the site's, on its own chance
    pairs = []
    for lab, mask in sets:
        for other in ('app Elo', 'Team Rankings (results part)'):
            d = logloss(own['study Elo'][mask], y[mask]) - logloss(own[other][mask], y[mask])
            p1 = R.scores(gaps['study Elo'][mask], y[mask]) - R.scores(gaps[other][mask], y[mask])
            lo, hi = R.block_boot(d, ss[mask])
            plo, phi = R.block_boot(p1, ss[mask])
            pairs.append(dict(games=lab, other=other, n=int(mask.sum()),
                              d_logloss_x1000=d.mean() * 1000, d_lo_x1000=lo * 1000, d_hi_x1000=hi * 1000,
                              d_pick_pts=p1.mean() * 100, d_pick_lo=plo * 100, d_pick_hi=phi * 100))
    pairs = pd.DataFrame(pairs)

    # the ELO Model's own walk-forward, by season (elo/data/model.json, its games: those with
    # lineups, about 94% of each season's), beside the study's Elo on every decided game of the
    # season. Not the same games, so a rough side by side, never a paired test; 2026 is not read.
    wf = json.load(open(os.path.join(ROOT, 'elo', 'data', 'model.json')))['walk_forward']
    g = R.games_mapped(2013)
    g = g[(g['season'] <= common.HOLDOUT_FROM - 1) & (g['home_score'] != g['away_score'])]
    d = np.array([study[x][0] - study[x][1] for x in g['game_id']])
    p = 1 / (1 + 10 ** (-(d + R.ELO_HOME * (g['location'] != 'Neutral').values) / 400))
    yy = (g['home_score'] > g['away_score']).values.astype(float)
    per = []
    for s in range(2013, common.HOLDOUT_FROM):
        m = g['season'].values == s
        e = wf[str(s)]
        per.append(dict(season=s, elo_model_games=e['games'], elo_model_right=e['accuracy'], elo_model_logloss=e['logloss'],
                        study_elo_games=int(m.sum()), study_elo_right=((p[m] > .5) == (yy[m] == 1)).mean(),
                        study_elo_logloss=logloss(p[m], yy[m]).mean()))
    per = pd.DataFrame(per)
    tot = lambda c, n: (per[c] * per[n]).sum() / per[n].sum()
    per.loc[len(per)] = dict(season='2013-2025', elo_model_games=per['elo_model_games'].sum(),
                             elo_model_right=tot('elo_model_right', 'elo_model_games'),
                             elo_model_logloss=tot('elo_model_logloss', 'elo_model_games'),
                             study_elo_games=per['study_elo_games'].sum(), study_elo_right=tot('study_elo_right', 'study_elo_games'),
                             study_elo_logloss=tot('study_elo_logloss', 'study_elo_games'))

    os.makedirs(RES, exist_ok=True)
    per.to_csv(os.path.join(RES, 'vs_elo_model_by_season.csv'), float_format='%.4f', index=False)
    print(per.round(4).to_string(), '\n')
    table.to_csv(os.path.join(RES, 'ratings.csv'), float_format='%.4f', index=False)
    pairs.to_csv(os.path.join(RES, 'study_elo_vs_site.csv'), float_format='%.4f', index=False)
    pd.set_option('display.width', 250, 'display.max_columns', 30)
    print(table.round(4).to_string(), '\n')
    print(pairs.round(3).to_string())


if __name__ == '__main__':
    main()
