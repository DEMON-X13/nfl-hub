#!/usr/bin/env python3
"""Player Elo: every player rated, by position, game by game, since 2020 -- and a game model
built on nothing but those ratings.

    python3 elo/build.py              # downloads what it lacks into elo/cache/, writes elo/data/
    python3 elo/build.py --offline    # use the cache only

WHY ELO FOR A PLAYER. Elo is a rating that moves on results against an opponent whose
strength is also rated, so a good game against a good defence is worth more than the same
game against a bad one, and a rating settles at the level a player keeps proving. The
question is what a player's "result" is. Here it is how the player's box score for the
game compares with the position's typical game: the per-game score (below) is turned into a
z-score against the position's distribution from the season before, then squashed into a
result in [0, 1] -- an average game is a draw (0.5), a game one standard deviation better is
0.82, two better is 0.95. The opponent is the opposing team's UNIT for the facet the player
plays against (a QB, WR or TE faces the opponent's pass defence, a RB its rush defence, a
DB the opponent's pass offence, a DL or LB its run offence), a rating this script keeps for
every team and updates the same way from the other side. A kicker faces nobody: his
opponent is a fixed 1500, so his rating is his own consistency.

    expected  E = 1 / (1 + 10^((U - R) / 400))          R player, U opposing unit
    result    S = 1 / (1 + e^(-1.5 z))                    z clipped to +-3
    update    R += K * w * (S - E)                        K = 56 for the first 8 rated games, 32 after
              U -= 20 * mean over the unit's opponents that game of w * (S - E)

w is the game's weight by involvement, so a backup with two carries barely moves and a
starter moves fully: volume over a per-position norm, capped at 1. Every season every rating
is pulled a quarter of the way back to 1500, since rosters, schemes and ages change.

THE SCORES. For a QB, RB, WR or TE the score is expected points added on the plays he
touched (nflverse's passing_epa + rushing_epa + receiving_epa), which already prices yards,
downs, turnovers and sacks against the situation. For a kicker it is points over what an
average kicker makes from each distance bucket. For a defender (DL, LB, DB) it is a weighted
sum of the events he made: sacks, tackles for loss, hits, forced and recovered fumbles,
interceptions, passes defended, touchdowns and tackles. Offensive linemen and punters have no
box-score signal worth rating and are left out.

THE GAME MODEL. For every game since 2020 each team's strength at each position group is the
depth-weighted mean of the pre-game ratings of the players who took part (QB1; RB1 and RB2;
WR1-3; TE1; K; DL top four; LB top three; DB top five), a short bench filled at 1450. The
home-minus-away difference per group, in hundreds of Elo points, feeds a logistic regression
for the home team winning, fitted on every earlier season and tested on the next
(walk-forward), and the coefficient of each group is what the data says that position is
worth in a matchup. Fitting one season at a time shows how that has moved. For the season in
progress the model is fitted on all completed seasons, graded on the games played so far
(pre-game ratings, of course) and asked about the next week's games with each team's roster
as of its last game.

Everything it writes is data the X NFL Bets and Stats page reads on load:
    elo/data/players.json   rankings by position, every rated player's rating, season-end top tens
    elo/data/model.json     the fitted weights, by season and overall, the walk-forward record,
                            this season's graded picks and the coming week's calls
"""
import argparse, datetime, json, math, os, sys, urllib.request
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
OUT = os.path.join(HERE, 'data')
FIRST = 2020
STATS_URL = 'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{y}.csv'
GAMES_URL = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv'

GROUP = {'QB': 'QB', 'RB': 'RB', 'FB': 'RB', 'WR': 'WR', 'TE': 'TE', 'K': 'K',
         'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'DL': 'DL',
         'LB': 'LB', 'OLB': 'LB', 'ILB': 'LB', 'MLB': 'LB',
         'CB': 'DB', 'DB': 'DB', 'S': 'DB', 'SAF': 'DB', 'FS': 'DB', 'SS': 'DB'}
GROUPS = ['QB', 'RB', 'WR', 'TE', 'K', 'DL', 'LB', 'DB']
LABEL = {'QB': 'Quarterbacks', 'RB': 'Running backs', 'WR': 'Wide receivers', 'TE': 'Tight ends',
         'K': 'Kickers', 'DL': 'Defensive line', 'LB': 'Linebackers', 'DB': 'Defensive backs'}
# the opposing unit each group plays against: (side the unit belongs to, facet)
FACET = {'QB': 'pass_d', 'WR': 'pass_d', 'TE': 'pass_d', 'RB': 'rush_d', 'DB': 'pass_o', 'DL': 'run_o', 'LB': 'run_o', 'K': None}
# the depth a team fields at each group, and how much each slot counts in the game model
DEPTH = {'QB': [1.0], 'RB': [1.0, 0.5], 'WR': [1.0, 0.7, 0.45], 'TE': [1.0], 'K': [1.0],
         'DL': [1.0, 0.8, 0.6, 0.4], 'LB': [1.0, 0.7, 0.4], 'DB': [1.0, 0.8, 0.6, 0.5, 0.4]}
# a game's weight is involvement over this norm, capped at one
VOLUME = {'QB': 25, 'RB': 12, 'WR': 6, 'TE': 4, 'K': 3, 'DL': 5, 'LB': 5, 'DB': 5}
K_NEW, K_SET, K_UNIT, SETTLED = 56.0, 32.0, 20.0, 8
REPLACEMENT = 1450.0
CARRY = 0.75      # share of the distance from 1500 a rating keeps across an offseason
# an average kicker's make rate by distance, for points over expectation
FG_RATE = {'0_19': 0.99, '20_29': 0.97, '30_39': 0.90, '40_49': 0.78, '50_59': 0.63, '60_': 0.35}
PAT_RATE = 0.95


def fetch(url, dest, offline):
    if os.path.exists(dest):
        return dest
    if offline:
        raise SystemExit(f'offline and {dest} is not cached')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    print(f'  downloading {os.path.basename(dest)}')
    with urllib.request.urlopen(url, timeout=120) as r, open(dest, 'wb') as f:
        f.write(r.read())
    return dest


def load(offline):
    games = pd.read_csv(fetch(GAMES_URL, os.path.join(CACHE, 'games.csv'), offline), low_memory=False)
    games = games[games.season >= FIRST].copy()
    last = int(games.season.max())
    frames = []
    for y in range(FIRST, last + 1):
        dest = os.path.join(CACHE, f'stats_player_week_{y}.csv')
        # the season in progress changes every week: never trust its cached copy
        if y == last and not offline and os.path.exists(dest):
            os.remove(dest)
        try:
            frames.append(pd.read_csv(fetch(STATS_URL.format(y=y), dest, offline), low_memory=False))
        except Exception as e:
            if y == last:
                print(f'  no player stats for {y} yet ({e})')
            else:
                raise
    stats = pd.concat(frames, ignore_index=True)
    stats = stats[stats.position.isin(GROUP)].copy()
    stats['group'] = stats.position.map(GROUP)
    # the week's order within a season: regular weeks, then the playoffs in order
    stats = stats[stats.game_id.notna()]
    return games, stats


def scores(d):
    """the per-game score and involvement for every row, by group"""
    n = lambda c: pd.to_numeric(d[c], errors='coerce').fillna(0.0) if c in d else pd.Series(0.0, index=d.index)
    epa = n('passing_epa') + n('rushing_epa') + n('receiving_epa')
    fg = sum(n(f'fg_made_{b}') * (1 - p) for b, p in FG_RATE.items()) * 3 - sum(n(f'fg_missed_{b}') * p for b, p in FG_RATE.items()) * 3
    fg += n('pat_made') * (1 - PAT_RATE) - n('pat_missed') * PAT_RATE
    defense = (4 * n('def_sacks') + 2 * n('def_tackles_for_loss') + n('def_qb_hits') + 3 * n('def_fumbles_forced')
               + 3 * n('fumble_recovery_opp') + 5 * n('def_interceptions') + 1.5 * n('def_pass_defended') + 6 * n('def_tds')
               + 0.6 * n('def_tackles_solo') + 0.3 * n('def_tackle_assists'))
    g = d.group
    score = pd.Series(0.0, index=d.index)
    vol = pd.Series(0.0, index=d.index)
    off = g.isin(['QB', 'RB', 'WR', 'TE'])
    score[off] = epa[off]
    score[g == 'K'] = fg[g == 'K']
    dl = g.isin(['DL', 'LB', 'DB'])
    score[dl] = defense[dl]
    vol[g == 'QB'] = (n('attempts') + n('carries') + n('sacks_suffered'))[g == 'QB']
    vol[g == 'RB'] = (n('carries') + n('targets'))[g == 'RB']
    vol[g.isin(['WR', 'TE'])] = (n('targets') + n('carries'))[g.isin(['WR', 'TE'])]
    vol[g == 'K'] = (n('fg_att') + n('pat_att'))[g == 'K']
    vol[dl] = (n('def_tackles_solo') + n('def_tackle_assists') + n('def_pass_defended') + n('def_sacks') + n('def_qb_hits'))[dl]
    return score, vol


def week_order(games):
    """every game in the order it is played: (season, ordinal week) with the playoffs after week 18"""
    order = {'REG': 0, 'WC': 100, 'DIV': 101, 'CON': 102, 'SB': 103}
    g = games.copy()
    g['ord'] = np.where(g.game_type == 'REG', g.week, g.game_type.map(order))
    return g


def logistic_fit(X, y, l2=0.5, iters=60):
    """logistic regression by Newton's method with a little ridge, no library needed"""
    Xb = np.hstack([np.ones((len(X), 1)), X])
    w = np.zeros(Xb.shape[1])
    R = np.eye(Xb.shape[1]) * l2
    R[0, 0] = 0
    for _ in range(iters):
        p = 1 / (1 + np.exp(-Xb @ w))
        grad = Xb.T @ (p - y) + R @ w
        H = (Xb.T * (p * (1 - p))) @ Xb + R
        step = np.linalg.solve(H, grad)
        w -= step
        if np.abs(step).max() < 1e-8:
            break
    return w


def predict(w, X):
    return 1 / (1 + np.exp(-(np.hstack([np.ones((len(X), 1)), X]) @ w)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--offline', action='store_true')
    a = ap.parse_args()
    print('loading')
    games, stats = load(a.offline)
    games = week_order(games)
    stats['score'], stats['vol'] = scores(stats)
    stats['w'] = np.minimum(1.0, stats.vol / stats.group.map(VOLUME))
    # kickers and defenders with nothing on the sheet did not really play
    stats = stats[stats.vol > 0].copy()
    seasons = sorted(stats.season.unique())
    last = int(games.season.max())

    # the position's typical game, from the season before (its own for the first)
    norm = {}
    for s in seasons:
        ref = stats[stats.season == (s - 1 if s > seasons[0] else s)]
        for g in GROUPS:
            v = ref[ref.group == g]
            v = v[v.w >= 0.5].score          # regulars define the typical game
            norm[(s, g)] = (float(v.mean()), float(v.std()) if len(v) > 1 and v.std() > 0 else 1.0)

    # ratings
    R = {}                 # player_id -> rating
    N = {}                 # player_id -> rated games
    U = {}                 # (team, facet) -> unit rating
    info = {}              # player_id -> {name, pos, group, team, headshot}
    hist = {}              # player_id -> {season: [[ord, rating], ...]}
    season_start = {}      # (season, player) -> rating at the start of the season
    peak = {}              # player -> (rating, season)
    game_feat = []         # per game: features from pre-game ratings
    played = {}            # (season, team) -> last game's participants by group [(pid, group)]
    ord_weeks = games[['season', 'ord']].drop_duplicates().sort_values(['season', 'ord'])
    by_game = {gid: d for gid, d in stats.groupby('game_id')}
    unit = lambda t, f: U.get((t, f), 1500.0)

    def strength(pids_groups):
        out = {}
        for g in GROUPS:
            rs = sorted((R.get(p, 1500.0) for p, gg in pids_groups if gg == g), reverse=True)
            wts = DEPTH[g]
            rs = (rs + [REPLACEMENT] * len(wts))[:len(wts)]
            out[g] = sum(r * w for r, w in zip(rs, wts)) / sum(wts)
        return out

    cur_season = None
    for season, ordw in ord_weeks.itertuples(index=False):
        if season != cur_season:
            # the offseason: everyone comes back a quarter of the way to 1500
            if cur_season is not None:
                for p in R:
                    R[p] = 1500 + CARRY * (R[p] - 1500)
                for k in U:
                    U[k] = 1500 + CARRY * (U[k] - 1500)
            cur_season = season
            for p in R:
                season_start[(season, p)] = R[p]
        week_games = games[(games.season == season) & (games.ord == ordw)]
        # 1. features for every game of the week from pre-game ratings and who took part
        for row in week_games.itertuples(index=False):
            d = by_game.get(row.game_id)
            if d is None:
                continue
            parts = {row.home_team: [], row.away_team: []}
            for pid, team, g in zip(d.player_id, d.team, d.group):
                if team in parts:
                    parts[team].append((pid, g))
            if not parts[row.home_team] or not parts[row.away_team]:
                continue
            sh, sa = strength(parts[row.home_team]), strength(parts[row.away_team])
            game_feat.append({'game_id': row.game_id, 'season': int(season), 'ord': int(ordw), 'week': int(row.week),
                              'home': row.home_team, 'away': row.away_team,
                              'result': None if pd.isna(row.home_score) else float(row.home_score) - float(row.away_score),
                              'x': {g: (sh[g] - sa[g]) / 100 for g in GROUPS}, 'sh': sh, 'sa': sa})
            for t in (row.home_team, row.away_team):
                played[(int(season), t)] = parts[t]
        # 2. the week's results move the ratings
        for row in week_games.itertuples(index=False):
            d = by_game.get(row.game_id)
            if d is None or pd.isna(row.home_score):
                continue
            unit_delta = {}
            for r in d.itertuples(index=False):
                pid, g = r.player_id, r.group
                if pid not in R:
                    R[pid], N[pid] = 1500.0, 0
                    season_start[(season, pid)] = 1500.0
                info[pid] = {'name': r.player_display_name, 'pos': r.position, 'group': g, 'team': r.team,
                             'head': r.headshot_url if isinstance(r.headshot_url, str) else None}
                mu, sd = norm[(season, g)]
                z = max(-3.0, min(3.0, (r.score - mu) / sd))
                S = 1 / (1 + math.exp(-1.5 * z))
                f = FACET[g]
                Uv = unit(r.opponent_team, f) if f else 1500.0
                E = 1 / (1 + 10 ** ((Uv - R[pid]) / 400))
                K = K_NEW if N[pid] < SETTLED else K_SET
                R[pid] += K * r.w * (S - E)
                N[pid] += 1
                if f:
                    unit_delta.setdefault((r.opponent_team, f), []).append(r.w * (S - E))
                hist.setdefault(pid, {}).setdefault(int(season), []).append([int(ordw), round(R[pid], 1)])
                if pid not in peak or R[pid] > peak[pid][0]:
                    peak[pid] = (R[pid], int(season))
            for key, ds in unit_delta.items():
                U[key] = unit(*key) - K_UNIT * (sum(ds) / len(ds))

    print(f'  {len(R)} players rated over {len(seasons)} seasons, {len(game_feat)} games featured')

    # ---- the game model ----
    feats = [gf for gf in game_feat if gf['result'] is not None and gf['result'] != 0]
    X = lambda rows: np.array([[r['x'][g] for g in GROUPS] for r in rows])
    Y = lambda rows: np.array([1.0 if r['result'] > 0 else 0.0 for r in rows])
    walk = {}
    for s in seasons[1:]:
        train = [r for r in feats if r['season'] < s]
        test = [r for r in feats if r['season'] == s]
        if not test:
            continue
        w = logistic_fit(X(train), Y(train))
        p = predict(w, X(test))
        y = Y(test)
        acc = float(((p > 0.5) == (y > 0.5)).mean())
        ll = float(-np.mean(y * np.log(np.clip(p, 1e-9, 1)) + (1 - y) * np.log(np.clip(1 - p, 1e-9, 1))))
        home = float(y.mean())
        walk[int(s)] = {'games': len(test), 'accuracy': round(acc, 4), 'logloss': round(ll, 4), 'home_wins': round(home, 4),
                        'coef': {'home': round(float(w[0]), 4), **{g: round(float(w[i + 1]), 4) for i, g in enumerate(GROUPS)}}}
    by_season = {}
    for s in seasons:
        rows = [r for r in feats if r['season'] == s]
        if len(rows) < 100:
            continue
        w = logistic_fit(X(rows), Y(rows), l2=2.0)
        by_season[int(s)] = {'games': len(rows), 'home': round(float(w[0]), 4), **{g: round(float(w[i + 1]), 4) for i, g in enumerate(GROUPS)}}
    done = [r for r in feats if r['season'] < last]
    w_all = logistic_fit(X(done), Y(done))
    coef = {'home': round(float(w_all[0]), 4), **{g: round(float(w_all[i + 1]), 4) for i, g in enumerate(GROUPS)}}
    # this season, graded game by game on pre-game ratings with the model fitted on the seasons before
    this = [r for r in game_feat if r['season'] == last]
    graded = []
    for r in this:
        if r['result'] is None:
            continue
        p = float(predict(w_all, X([r]))[0])
        graded.append({'game_id': r['game_id'], 'week': r['week'], 'away': r['away'], 'home': r['home'], 'p_home': round(p, 4),
                       'pick': r['home'] if p >= 0.5 else r['away'], 'result': r['result'],
                       'correct': (p >= 0.5) == (r['result'] > 0) if r['result'] != 0 else None,
                       'edges': {g: round(r['x'][g] * 100, 1) for g in GROUPS}})
    # the coming week: each team as it last took the field
    played_weeks = games[(games.season == last) & games.home_score.notna()]
    next_ord = None
    upcoming = games[(games.season == last) & games.home_score.isna()]
    if len(upcoming):
        next_ord = int(upcoming.ord.min())
    calls = []
    if next_ord is not None:
        for row in upcoming[upcoming.ord == next_ord].itertuples(index=False):
            ph, pa = played.get((last, row.home_team)), played.get((last, row.away_team))
            if not ph or not pa:
                continue
            sh, sa = strength(ph), strength(pa)
            x = {g: (sh[g] - sa[g]) / 100 for g in GROUPS}
            p = float(predict(w_all, np.array([[x[g] for g in GROUPS]]))[0])
            calls.append({'game_id': row.game_id, 'week': int(row.week), 'gameday': row.gameday, 'away': row.away_team, 'home': row.home_team,
                          'p_home': round(p, 4), 'pick': row.home_team if p >= 0.5 else row.away_team,
                          'edges': {g: round(x[g] * 100, 1) for g in GROUPS},
                          'home_strength': {g: round(sh[g]) for g in GROUPS}, 'away_strength': {g: round(sa[g]) for g in GROUPS}})
    n_ok = sum(1 for g in graded if g['correct'] is True)
    n_gr = sum(1 for g in graded if g['correct'] is not None)
    model = {
        'built_at': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='minutes'),
        'season': last, 'groups': GROUPS, 'labels': LABEL, 'depth': DEPTH,
        'coef': coef, 'trained_on': {'seasons': [int(s) for s in seasons if s < last], 'games': len(done)},
        'by_season': by_season, 'walk_forward': walk,
        'record': {'season': last, 'graded': n_gr, 'correct': n_ok, 'accuracy': round(n_ok / n_gr, 4) if n_gr else None},
        'graded': graded, 'next': {'week': int(upcoming[upcoming.ord == next_ord].week.min()) if next_ord is not None else None, 'games': calls},
        'units': {f'{t}|{f}': round(v) for (t, f), v in sorted(U.items())},
        'how': 'see elo/build.py',
    }

    # ---- the rankings ----
    active_cut = last - 1          # rated in this season or the last to be ranked now
    latest_season = {pid: max(h) for pid, h in hist.items()}
    players = {}
    groups_out = {}
    for g in GROUPS:
        pool = [pid for pid in R if info[pid]['group'] == g and latest_season[pid] >= active_cut and N[pid] >= 3]
        pool.sort(key=lambda p: -R[p])
        # where everyone stood when this season began, for the movement column
        start = {pid: season_start.get((last, pid), 1500.0) for pid in pool}
        start_rank = {pid: i + 1 for i, pid in enumerate(sorted(pool, key=lambda p: -start[p]))}
        rows = []
        for i, pid in enumerate(pool):
            h = hist[pid]
            rows.append({'id': pid, 'name': info[pid]['name'], 'pos': info[pid]['pos'], 'team': info[pid]['team'], 'head': info[pid]['head'],
                         'elo': round(R[pid]), 'rank': i + 1, 'start_rank': start_rank[pid], 'start_elo': round(start[pid]),
                         'games': N[pid], 'peak': round(peak[pid][0]), 'peak_season': peak[pid][1],
                         'this_season': h.get(last, []), 'last_season': latest_season[pid]})
        groups_out[g] = {'label': LABEL[g], 'active': len(pool), 'top': rows[:25], 'facet': FACET[g], 'volume': VOLUME[g]}
        for row in rows:
            players[row['id']] = {'name': row['name'], 'pos': row['pos'], 'group': g, 'team': row['team'], 'elo': row['elo'], 'rank': row['rank']}
    # season-end top tens, every season: the six-year story
    ends = {}
    for s in seasons:
        ends[int(s)] = {}
        for g in GROUPS:
            end = []
            for pid, h in hist.items():
                if info[pid]['group'] == g and int(s) in h and len(h[int(s)]) >= 4:
                    end.append((h[int(s)][-1][1], pid))
            end.sort(reverse=True)
            ends[int(s)][g] = [{'id': pid, 'name': info[pid]['name'], 'team': info[pid]['team'], 'elo': round(e)} for e, pid in end[:10]]
    last_week = int(played_weeks.week.max()) if len(played_weeks) else 0
    out = {
        'built_at': model['built_at'], 'season': last, 'through_week': last_week, 'seasons': [int(s) for s in seasons],
        'groups': groups_out, 'players': players, 'season_end_top10': ends,
        'norm': {f'{s}|{g}': [round(m, 3), round(sd, 3)] for (s, g), (m, sd) in norm.items()},
        'how': 'see elo/build.py',
    }
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'players.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    with open(os.path.join(OUT, 'model.json'), 'w') as f:
        json.dump(model, f, separators=(',', ':'))
    print(f'  wrote elo/data/players.json ({os.path.getsize(os.path.join(OUT, "players.json")) // 1024} KB) and model.json')
    for g in GROUPS:
        print(f'  {LABEL[g]}: ' + ', '.join(f"{r['name']} {r['elo']}" for r in groups_out[g]['top'][:5]))
    print('  walk-forward: ' + ', '.join(f"{s}: {w['accuracy']:.3f} ({w['games']})" for s, w in walk.items()))
    print(f"  weights: {coef}")
    if n_gr:
        print(f"  {last}: {n_ok}/{n_gr} graded; next week {model['next']['week']}: {len(calls)} calls")


if __name__ == '__main__':
    main()
