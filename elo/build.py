#!/usr/bin/env python3
"""Player Elo: every player rated, by position, game by game, since 2012 -- a game model
built on nothing but those ratings, and a matchup formula for each player's next game.

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
              U -= 120 * mean over the unit's opponents that game of w * (S - E)

The opponent is what makes a result mean something: E is the result a player is expected to
get against that unit, so a big game against the league's worst pass defence is barely above
what was expected and moves him little, and a quiet game against the best one can still gain.
That only works if the units are rated as far apart as they really are. A unit's step is the
mean over the several players it faced, so it is a quiet signal, and at a K of 20 the units
never got near their level before the offseason pulled them back: the best and worst pass
defences stood about 40 points apart, and opponents hardly counted. At 120 they spread about
three times as wide (a standard deviation of 31 for pass defences, 43 for run defences), and
the record is no worse for it: walk-forward 2013-2025 62.8% and log loss 0.6397 at 20, 63.1%
and 0.6394 at 120, the matchups' errors unchanged.

w is the game's weight by involvement, so a backup with two carries barely moves and a
starter moves fully: volume over a per-position norm, capped at 1. A game a regular left
early is not rated at all: when a player's involvement falls below 35% of his median over
his last five rated games, and that median is a starter's, the game is skipped rather than
scored as a bad one -- a quarterback hurt after eight throws did not have a bad day, he had
a short one. Only one such game in a row is skipped: a second straight short game is rated,
because that is a smaller role, not an injury (Colston Loveland's first two games of 2026,
two and three targets after a season of eight or nine, were both skipped before this, and
his rating stood frozen at 2025's). Every season every rating is pulled a quarter of the way back to 1500, since
rosters, schemes and ages change.

THE SCORES. For a QB, RB, WR or TE the score is expected points added on the plays he
touched (nflverse's passing_epa + rushing_epa + receiving_epa), which already prices yards,
downs, turnovers and sacks against the situation. For a kicker it is points over what an
average kicker makes from each distance bucket. For a defender (DL, LB, DB) it is a weighted
sum of the events he made: sacks, tackles for loss, hits, forced and recovered fumbles,
interceptions, passes defended, touchdowns and tackles. Offensive linemen and punters have no
box-score signal worth rating and are left out.

THE GAME MODEL. For every game since 2012 each team's strength at each position group is the
depth-weighted mean of the pre-game ratings of the players expected to start (QB1; RB1 and
RB2; WR1-3; TE1; K; DL top four; LB top three; DB top five), a short bench filled at 1450.
Expected means what was known before kickoff: the team's depth chart for that week (nflverse
publishes the weekly charts through 2024 and daily snapshots from 2025, of which the last
one before the game is used) with anyone the week's injury report ruled Out taken off it,
and where a chart says nothing about a group, the players who took the field for it in the
team's last game. The home-minus-away difference per group, in hundreds of Elo points, feeds
a logistic regression for the home team winning, fitted on every earlier season and tested
on the next (walk-forward), and the coefficient of each group is what the data says that
position is worth in a matchup. For the season in progress the model is fitted on all
completed seasons, graded on the games played so far (pre-game ratings and pre-game lineups)
and asked about the next week's games from the latest depth charts and injury report. The
same walk-forward is also run on who actually played, for comparison: that number is
flattered by hindsight and is not the model's.

THE POWER RATINGS. Each team rated on its results this season, not on its players: a margin
Elo in which every team starts the season at 0 (shown as 1500) and, after each final,
    e = (R_home - R_away + H * home) / D          the home margin it expected, in points
    d = clip(home margin, -C, C) - e
    R_home += K * d,  R_away -= K * d             (zero-sum: the league stays centred)
with K 1.3461, H 30.02 (0 at a neutral site), D 25, C 21. A favourite that wins by less than
it was expected to loses points and the underdog gains them, both toward the middle; a
blowout beyond 21 counts as 21. The chance against an average team on a neutral field is
1 / (1 + 10^(-S * R / 400)) with S 1.5771, so it follows the order. Shown as
1500 + 100 * R / 79 (79 Elo is the usual spread across the teams by the end of a regular
season, 2012-2025), so everyone starts at 1500 and the tiers spread as the season does.
Why not the lineups: rated walk-forward on 2018-2025 (weeks 2 on, parameters fitted on
2012-2017), the old table, each team's expected lineup on this season's player Elo, had a log
loss of 0.658 on the next game, and in weeks 2-6 0.696, no better than always taking the home
team; this one 0.649 and 0.689 (Vegas 0.607 and 0.630). Last season carried in as a hidden
prior fading game by game would take another 0.011 off (0.03 early), but the table is this
season's alone, as asked. The ELO Model's game calls stay on the lineups and career ratings,
which predict better still. `teams` in model.json carries the rating, the rating going into
the team's last game (`before`), that chance (`p_avg`) and the regular-season record the
rating was built on (`record`, wins, losses, ties); the Bets and Stats page's Power
Ratings tab is drawn from it.

THE MATCHUPS. How much does a player's Elo, and the Elo of the defenders he faces, say about
his next game beyond what his recent games already say? For every QB, RB, WR and TE game
since 2016 in which the player was a regular (involvement at least 80% of the position's
norm), with at least three such games behind him, each stat the prop model prices is
regressed on:

    y = c0 + c1 home*f + c2 f + c3 f*(allowed - 1) + c4 f*p + c5 f*dl + c6 f*lb + c7 f*db

f is his recent average (exponentially weighted, half-life four games, previous seasons
included), allowed what the defence has given the position per game (half-life six) over the
league's, p his pre-game Elo and dl, lb, db the pre-game strengths of the opposing defensive
line, linebackers and secondary from the game model's expected lineups, all in hundreds of
points from 1500. The same fit without the last four terms is the form-only projection; the
difference is the Elo nudge. Seasons 2012-2015 only warm the ratings up; nothing is fitted on
them. The record is walk-forward: each season from 2017 projected by the fit on the seasons
before it, graded on the typical miss with and without Elo and on how often the fifth of
games Elo moved most landed on the side it moved. Through 2025 the Elo part helps passing
yards, passing TDs and completions, running back carries, and receivers' and tight ends'
catches, targets, yards and touchdowns (their biggest nudges right 53-63% of the time); it
adds nothing to rushing yards, quarterback rushing, interceptions or running back receiving,
and the page fades those. The coming week's projections are for the expected starters, from
the latest ratings, the depth charts and the injury report, with the formula fitted on every
completed season.

THE RANKINGS are of this season alone. Beside the rating above, every player carries a second
one that starts the season at 1500 and moves only on this season's games, by the same
formula against the same units but with placement games, as Glicko and the ranked ladders of
games do it: a new rating is uncertain, so its K starts at 160 and shrinks with every game
(160, 109, 78, 60, 49, 42 ... toward 32), and a player's first few games carry him most of
the way to his level, after which he moves only as far as his play keeps proving. Everyone
starts at 1500 with that uncertainty rather than at the bottom: a start at the bottom would
rank players by how many games they have had, not how well they played. The table ranks that one, and a player needs enough rated games
this season to be ranked -- games in a real role (at least half his position's normal
workload) in at least half the weeks played so far, so the table is not filled with players
a few snaps have left near 1500. The models -- the game model, the matchups and the page's market
+ form -- read the rating with every season behind it, which is what their records were
proven on: three games is too little to price from. players.json carries both for every
player the models may price: `elo` (career), `se` and `rank` (this season, where he has one).

THE LADDER. Player Elo at a position spreads far less than team Elo (a standard deviation of
20 to 60 points, where the shields' bands are 50 wide), so on the raw number nearly everyone
was Silver or Gold. What is shown is the season rating put on a bell curve within the
position: 1500 plus 100 points for every standard deviation above the position's ranked
players (the career and peak columns the same way, on the position's career pool). The shields then
split a position the way a ranked ladder splits its players (the tiers as betting/tools/tiers.js
sets them): HOF (2.5 sd up, a gem) well under 1%, Elite about 2%, Master 4%, Diamond 9%,
Platinum 15%, Gold and Silver 19% each, Bronze 15%, Iron 9% and the Wood League (1.5 sd down)
7%, the average player on the line between Silver and Gold. The order is untouched; only the scale
moves. The raw ratings stay in `raw` and `career_raw`, and the models never read the shown
ones.

Everything it writes goes to elo/data/, which the X NFL Bets and Stats page reads on load
(the fitted weights and the who-played walk-forward are kept for the record and the smoke
test; no page draws them):
    elo/data/players.json   rankings by position, every rated player's rating
    elo/data/model.json     the fitted weights, the walk-forward record (pre-game lineups, and
                            who played), this season's graded picks, the coming week's calls
                            and the teams' power ratings
    elo/data/matchups.json  the matchup formula per position and stat, its walk-forward record and
                            the coming week's projections for every expected starter
"""
import argparse, datetime, json, math, os, urllib.request
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
OUT = os.path.join(HERE, 'data')
FIRST = 2012
STATS_URL = 'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{y}.csv'
ROSTER_URL = 'https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_{y}.csv'
INJ_URL = 'https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_{y}.csv'
DC_URL = 'https://github.com/nflverse/nflverse-data/releases/download/depth_charts/depth_charts_{y}.csv'
# the depth chart's own labels to the rated groups: the weekly files name positions, the daily
# ones name slots. Returners, holders, punters, snappers and the offensive line are not rated.
SLOT = {'QB': 'QB', 'RB': 'RB', 'FB': 'RB', 'HB': 'RB', 'WR': 'WR', 'TE': 'TE', 'K': 'K', 'PK': 'K',
        'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'DL': 'DL', 'LDE': 'DL', 'RDE': 'DL', 'LDT': 'DL', 'RDT': 'DL',
        'LB': 'LB', 'ILB': 'LB', 'OLB': 'LB', 'MLB': 'LB', 'SLB': 'LB', 'WLB': 'LB', 'LILB': 'LB', 'RILB': 'LB',
        'CB': 'DB', 'DB': 'DB', 'S': 'DB', 'FS': 'DB', 'SS': 'DB', 'SAF': 'DB', 'LCB': 'DB', 'RCB': 'DB', 'NB': 'DB'}
# what a roster status means for the rankings: only the active list is ranked
STATUS = {'ACT': None, 'RES': 'on injured reserve', 'PUP': 'on the PUP list', 'RET': 'retired', 'DEV': 'on the practice squad',
          'CUT': 'a free agent', 'EXE': 'on the exempt list', 'SUS': 'suspended', 'NON': 'on the non-football injury list'}
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
K_NEW, K_SET, K_UNIT, SETTLED = 56.0, 32.0, 120.0, 8
# the season rating's placement: K = K_SET + (K_PLACE - K_SET) * K_DECAY^games, so the first
# games move it hard (160, 109, 78, 60, 49 ...) and it settles toward 32, as Glicko's shrinking
# uncertainty does; the shown rating puts each position on a bell curve, 100 points a standard
# deviation from 1500 (see THE RANKINGS)
K_PLACE, K_DECAY, SHOW_SD = 160.0, 0.6, 100.0
REPLACEMENT = 1450.0
LEFT_EARLY = 0.35   # involvement under this share of a regular's recent median: the game is not rated
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
    # who was expected to play: every season's depth charts and injury reports, the current
    # season's re-downloaded every run since both change daily; and who can play this week,
    # from the season's latest weekly roster
    charts, injuries = {}, {}
    for y in range(FIRST, last + 1):
        for name, url, store in (('depth_charts', DC_URL, charts), ('injuries', INJ_URL, injuries)):
            dest = os.path.join(CACHE, f'{name}_{y}.csv')
            if y == last and not offline and os.path.exists(dest):
                os.remove(dest)
            try:
                store[y] = pd.read_csv(fetch(url.format(y=y), dest, offline), low_memory=False)
            except Exception as e:
                print(f'  no {name} file for {y} ({e})')
    roster = None
    dest = os.path.join(CACHE, f'roster_{last}.csv')
    if not offline and os.path.exists(dest):
        os.remove(dest)
    try:
        roster = pd.read_csv(fetch(ROSTER_URL.format(y=last), dest, offline), low_memory=False)
    except Exception as e:
        print(f'  no roster file for {last} ({e}); nobody is marked out')
    inj = injuries.get(last)
    stats = stats[stats.position.isin(GROUP)].copy()
    stats['group'] = stats.position.map(GROUP)
    stats = stats[stats.game_id.notna()]
    return games, stats, roster, inj, charts, injuries


PR_K, PR_H, PR_D, PR_C, PR_S, PR_SPREAD = 1.3461, 30.02, 25.0, 21.0, 1.5771, 79.0


def power_ratings(season_games):
    """The teams' power ratings: this season's margin Elo (see THE POWER RATINGS)."""
    g = season_games[season_games.game_type.isin(['REG', 'WC', 'DIV', 'CON', 'SB'])].copy()
    g['kick'] = g.gameday.astype(str) + ' ' + g.gametime.fillna('00:00').astype(str)
    g = g.sort_values(['kick', 'game_id'], kind='mergesort')
    teams = set(g.home_team) | set(g.away_team)
    R = {t: 0.0 for t in teams}
    before, rec = {}, {t: [0, 0, 0] for t in teams}
    for r in g[g.home_score.notna() & g.away_score.notna()].itertuples(index=False):
        home = 0.0 if r.location == 'Neutral' else 1.0
        e = (R[r.home_team] - R[r.away_team] + PR_H * home) / PR_D
        d = max(-PR_C, min(PR_C, float(r.home_score - r.away_score))) - e
        before[r.home_team], before[r.away_team] = R[r.home_team], R[r.away_team]
        if r.game_type == 'REG':
            m = r.home_score - r.away_score
            rec[r.home_team][0 if m > 0 else 1 if m < 0 else 2] += 1
            rec[r.away_team][1 if m > 0 else 0 if m < 0 else 2] += 1
        R[r.home_team] += PR_K * d
        R[r.away_team] -= PR_K * d
    show = lambda v: round(1500 + 100 * v / PR_SPREAD)
    return {t: {'elo': show(R[t]), 'before': show(before[t]) if t in before else None,
                'p_avg': round(1 / (1 + 10 ** (-PR_S * R[t] / 400)), 4), 'record': rec[t]} for t in sorted(teams)}


def build_lineups(charts, injuries):
    """the depth charts as {(season, week, team): {group: [pid, ...] by rank}} for the weekly
    files, {team: [(date, {group: [...]}), ...]} for the daily snapshots, and the week's Outs
    as {(season, week): set(pid)}"""
    weekly, daily, outs = {}, {}, {}
    for y, d in charts.items():
        if 'depth_team' in d.columns:            # 2012-2024: one chart per team per week
            d = d[d.gsis_id.notna() & d.week.notna()]
            d = d.assign(group=d.position.map(SLOT))
            d = d[d.group.notna() & (d.formation != 'Special Teams') | (d.group == 'K')]
            d = d.sort_values('depth_team')
            for (wk, team), grp in d.groupby(['week', 'club_code']):
                out = {}
                for g, pid in zip(grp.group, grp.gsis_id):
                    lst = out.setdefault(g, [])
                    if pid not in lst:
                        lst.append(pid)
                weekly[(int(y), int(wk), team)] = out
        else:                                    # 2025 on: snapshots by date, several a week
            d = d[d.gsis_id.notna()]
            d = d.assign(group=d.pos_abb.map(SLOT), day=d.dt.str[:10])
            d = d[d.group.notna()].sort_values(['dt', 'pos_rank'])
            for team, tg in d.groupby('team'):
                lst = daily.setdefault(team, [])
                for day, sg in tg.groupby('day'):
                    latest = sg[sg.dt == sg.dt.max()]
                    out = {}
                    for g, pid in zip(latest.group, latest.gsis_id):
                        l2 = out.setdefault(g, [])
                        if pid not in l2:
                            l2.append(pid)
                    lst.append((day, out))
                lst.sort()
    for y, d in injuries.items():
        d = d[d.gsis_id.notna() & d.week.notna() & (d.report_status == 'Out')]
        for wk, pid in zip(d.week, d.gsis_id):
            outs.setdefault((int(y), int(wk)), set()).add(pid)
    return weekly, daily, outs


def chart_for(weekly, daily, season, week, team, gameday):
    """the team's chart as known before that game, or None"""
    c = weekly.get((season, week, team))
    if c is not None:
        return c
    best = None
    for day, out in daily.get(team, []):
        if day <= str(gameday):
            best = out
        else:
            break
    return best


def availability(roster, inj, week):
    """player_id -> (reason he is out of the rankings or None, his team now). A player on
    no roster at all is a free agent; one the coming week's injury report lists as Out is
    out. An older report says nothing about this week and is not read."""
    out, team = {}, {}
    if roster is not None and len(roster):
        wk = roster.week.max() if 'week' in roster else None
        r = roster[roster.week == wk] if wk is not None else roster
        for row in r.itertuples(index=False):
            pid = row.gsis_id
            if not isinstance(pid, str):
                continue
            team[pid] = row.team
            reason = STATUS.get(str(row.status), 'not on the active list')
            out[pid] = reason
    if inj is not None and len(inj) and week is not None and (inj.week == week).any():
        wk = week
        for row in inj[(inj.week == wk) & (inj.report_status == 'Out')].itertuples(index=False):
            pid = row.gsis_id
            if isinstance(pid, str) and not out.get(pid):
                what = row.report_primary_injury if isinstance(row.report_primary_injury, str) else ''
                out[pid] = 'out' + (f' ({what.lower()})' if what else '') + f', week {int(wk)}'
    return out, team


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


# ---- matchups: a player's next game from his recent form, his Elo and the defenders he faces ----
MU_STATS = {'QB': ['passing_yards', 'passing_tds', 'attempts', 'completions', 'passing_interceptions', 'rushing_yards', 'carries'],
            'RB': ['rushing_yards', 'carries', 'receptions', 'receiving_yards', 'scrim_yards', 'any_td'],
            'WR': ['receptions', 'receiving_yards', 'targets', 'any_td'],
            'TE': ['receptions', 'receiving_yards', 'targets', 'any_td']}
MU_COLS = ['completions', 'attempts', 'passing_yards', 'passing_tds', 'passing_interceptions', 'carries', 'rushing_yards',
           'rushing_tds', 'receptions', 'targets', 'receiving_yards', 'receiving_tds']
MU_FIRST = 2016          # the seasons before this are the ratings' warm-up, not fitted on
MU_FORM_HL, MU_ALLOWED_HL, MU_MIN_GAMES = 4, 6, 3
MU_DEF = ['DL', 'LB', 'DB']


def mu_design(b, home, allowed, pz, dz, elo=True):
    """the regression's columns: the recent average, home, what the defence has allowed, and
    (with elo) the player's rating and the opposing defenders' ratings, each scaling the average"""
    cols = [np.ones(len(b)), home * b, b, b * (allowed - 1)]
    if elo:
        cols += [b * pz] + [b * dz[:, i] for i in range(dz.shape[1])]
    return np.column_stack(cols)


def matchups(log, game_feat, coming, last):
    """fit, check and apply the matchup formula (see the docstring's MATCHUPS)"""
    d = pd.DataFrame(log)
    if d.empty:
        return None
    d['scrim_yards'] = d.rushing_yards + d.receiving_yards
    d['any_td'] = d.rushing_tds + d.receiving_tds
    d = d.sort_values(['season', 'ord']).reset_index(drop=True)
    opp = {}
    for f in game_feat:
        opp[(f['game_id'], f['home'])] = f['sa']
        opp[(f['game_id'], f['away'])] = f['sh']
    out = {'stats': MU_STATS, 'fit': {}, 'record': {}, 'players': {}}
    for g, stats in MU_STATS.items():
        x = d[(d.group == g) & (d.vol >= 0.8 * VOLUME[g])].copy()          # the games he was a regular in
        if x.empty:
            continue
        x['n'] = x.groupby('pid').cumcount()
        for st in stats:
            x['b_' + st] = x.groupby('pid')[st].transform(lambda v: v.shift(1).ewm(halflife=MU_FORM_HL, min_periods=1).mean())
        allowed = {}
        for st in stats:
            a = x.groupby(['season', 'ord', 'opp'])[st].mean().reset_index().sort_values(['season', 'ord'])
            a['a'] = a.groupby('opp')[st].transform(lambda v: v.shift(1).ewm(halflife=MU_ALLOWED_HL, min_periods=1).mean())
            x = x.merge(a[['season', 'ord', 'opp', 'a']].rename(columns={'a': 'a_' + st}), on=['season', 'ord', 'opp'], how='left')
            # what each defence has allowed through its latest game, for the coming week
            allowed[st] = a.groupby('opp')[st].apply(lambda v: v.ewm(halflife=MU_ALLOWED_HL).mean().iloc[-1]).to_dict()
        for u in MU_DEF:
            x['o' + u] = [((opp.get((gid, t)) or {}).get(u, np.nan) - 1500) / 100 for gid, t in zip(x.game_id, x.team)]
        x['pz'] = (x.R - 1500) / 100
        fit_rows = x[(x.season >= MU_FIRST) & (x.n >= MU_MIN_GAMES) & x.oDB.notna()]
        latest = x.groupby('pid').tail(1).set_index('pid')
        for st in stats:
            y = fit_rows[st].values
            mean = float(np.nanmean(y))
            args = lambda r: (r['b_' + st].values, r.home.values, r['a_' + st].fillna(mean).values / mean, r.pz.values, r[['o' + u for u in MU_DEF]].values)
            X1, X0 = mu_design(*args(fit_rows)), mu_design(*args(fit_rows), elo=False)
            ok = ~np.isnan(X1).any(1)
            seas = fit_rows.season.values
            # walk-forward: every season called by the formula fitted on the seasons before it
            p0, p1 = np.full(len(y), np.nan), np.full(len(y), np.nan)
            for sn in sorted(set(seas)):
                if sn == MU_FIRST:
                    continue
                tr, te = ok & (seas < sn), ok & (seas == sn)
                if te.any():
                    p0[te] = X0[te] @ np.linalg.lstsq(X0[tr], y[tr], rcond=None)[0]
                    p1[te] = X1[te] @ np.linalg.lstsq(X1[tr], y[tr], rcond=None)[0]
            rec = {}
            for label, m in (('past', ~np.isnan(p1) & (seas < last)), ('this', ~np.isnan(p1) & (seas == last))):
                if m.sum() < 30:
                    continue
                nud, res = p1[m] - p0[m], y[m] - p0[m]
                top = np.abs(nud) >= np.percentile(np.abs(nud), 80)
                rec[label] = {'games': int(m.sum()),
                              'rmse_form': round(float(np.sqrt(np.mean(res ** 2))), 3),
                              'rmse_elo': round(float(np.sqrt(np.mean((y[m] - p1[m]) ** 2))), 3),
                              'right': round(float(np.mean(np.sign(nud) == np.sign(res))), 4),
                              'right_top': round(float(np.mean(np.sign(nud[top]) == np.sign(res[top]))), 4)}
            out['record'][f'{g}|{st}'] = rec
            # the formula for the coming week: fitted on every completed season
            done = ok & (seas < last)
            w1 = np.linalg.lstsq(X1[done], y[done], rcond=None)[0]
            w0 = np.linalg.lstsq(X0[done], y[done], rcond=None)[0]
            sd = float(np.sqrt(np.mean((y[done] - X1[done] @ w1) ** 2)))
            out['fit'][f'{g}|{st}'] = {'coef': [round(float(v), 5) for v in w1], 'sd': round(sd, 3)}
            # the coming week's regulars: the expected lineup, each against the defenders he will face
            for c in coming:
                for pid, gg in c['parts']:
                    if gg != g or pid not in latest.index:
                        continue
                    L = latest.loc[pid]
                    if L.n + 1 < MU_MIN_GAMES:
                        continue
                    b = float(x[x.pid == pid][st].ewm(halflife=MU_FORM_HL).mean().iloc[-1])
                    a = allowed[st].get(c['opp'], mean) / mean
                    dz = np.array([[(c['opp_strength'][u] - 1500) / 100 for u in MU_DEF]])
                    pz = (c['rating'][pid] - 1500) / 100
                    arr = lambda v: np.array([v])
                    e1 = float((mu_design(arr(b), arr(c["home"]), arr(a), arr(pz), dz) @ w1)[0])
                    e0 = float((mu_design(arr(b), arr(c["home"]), arr(a), arr(pz), dz, elo=False) @ w0)[0])
                    pl = out['players'].setdefault(pid, {'group': g, 'game_id': c['game_id'], 'team': c['team'], 'opp': c['opp'],
                                                         'home': c['home'], 'elo': round(c['rating'][pid]),
                                                         'opp_def': {u: round(c['opp_strength'][u]) for u in MU_DEF}, 'stats': {}})
                    pl['stats'][st] = [round(b, 2), round(max(e1, 0.0), 2), round(e1 - e0, 2)]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--offline', action='store_true')
    a = ap.parse_args()
    print('loading')
    games, stats, roster, inj, charts, injuries = load(a.offline)
    games = week_order(games)
    weekly, daily, outs = build_lineups(charts, injuries)
    print(f'  depth charts: {len(weekly)} weekly team-charts, {sum(len(v) for v in daily.values())} daily snapshots; {sum(len(v) for v in outs.values())} players ruled out across {len(outs)} weeks')
    coming = games[(games.season == games.season.max()) & games.home_score.isna()]
    out_now, team_now = availability(roster, inj, int(coming.week.min()) if len(coming) else None)
    on_roster = roster is not None and len(roster) > 0
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
    recent = {}            # player_id -> involvement in his last five rated games
    skipped = 0            # games a regular left early, not rated
    season_start = {}      # (season, player) -> rating at the start of the season
    peak = {}              # player -> (rating, season)
    game_feat = []         # per game: features from pre-game ratings
    RS, NS, HS = {}, {}, {}  # the season in progress alone: rating, rated games, [[ord, rating], ...]
    NQ = {}                # this season's rated games in a real role (weight at least 0.5)
    short_prev = {}        # player -> his last game was a short one, skipped
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

    def expected(season, week, team, gameday, fallback, also_out=()):
        """the players expected to start for the team, by group: the chart's order with the
        week's Outs removed, as many as the group fields; last game's players where the chart
        is silent on a group. Returns [(pid, group)] and whether a chart was found."""
        chart = chart_for(weekly, daily, int(season), int(week), team, gameday)
        gone = outs.get((int(season), int(week)), set()) | set(also_out)
        parts = []
        for g in GROUPS:
            picked = [p for p in (chart or {}).get(g, []) if p not in gone][:len(DEPTH[g])]
            if not picked:
                picked = [p for p, gg in (fallback or []) if gg == g and p not in gone]
            parts += [(p, g) for p in picked]
        return parts, chart is not None

    mu_log = []             # every offensive player-game: pre-game rating, opponent, box score
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
        # 1. features for every game of the week from pre-game ratings and the pre-game lineups;
        #    the same from who took part, kept beside them for the comparison
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
            eh, ch = expected(season, row.week, row.home_team, row.gameday, played.get((int(season), row.home_team)))
            ea, ca = expected(season, row.week, row.away_team, row.gameday, played.get((int(season), row.away_team)))
            sh, sa = strength(eh), strength(ea)
            ph, pa = strength(parts[row.home_team]), strength(parts[row.away_team])
            game_feat.append({'game_id': row.game_id, 'season': int(season), 'ord': int(ordw), 'week': int(row.week),
                              'home': row.home_team, 'away': row.away_team, 'charted': bool(ch and ca),
                              'result': None if pd.isna(row.home_score) else float(row.home_score) - float(row.away_score),
                              'x': {g: (sh[g] - sa[g]) / 100 for g in GROUPS}, 'sh': sh, 'sa': sa,
                              'x_played': {g: (ph[g] - pa[g]) / 100 for g in GROUPS}})
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
                info[pid] = {'name': r.player_display_name, 'pos': r.position, 'group': g, 'team': r.team}
                # a regular who left early: his involvement collapsed against his own recent
                # norm, so the game says nothing about how good he is and is not rated
                rv = recent.setdefault(pid, [])
                if g in MU_STATS:
                    mu_log.append({'season': int(season), 'ord': int(ordw), 'game_id': row.game_id, 'pid': pid, 'group': g,
                                   'team': r.team, 'opp': r.opponent_team, 'home': int(r.team == row.home_team), 'R': R[pid],
                                   'vol': float(r.vol), **{c: (0.0 if pd.isna(getattr(r, c, 0)) else float(getattr(r, c, 0))) for c in MU_COLS}})
                if (len(rv) >= 3 and np.median(rv) >= 0.8 * VOLUME[g] and r.vol < LEFT_EARLY * np.median(rv)
                        and not short_prev.get(pid)):
                    skipped += 1
                    short_prev[pid] = True
                    rv.append(r.vol)
                    del rv[:-5]
                    continue
                short_prev[pid] = False
                rv.append(r.vol)
                del rv[:-5]
                mu, sd = norm[(season, g)]
                z = max(-3.0, min(3.0, (r.score - mu) / sd))
                S = 1 / (1 + math.exp(-1.5 * z))
                f = FACET[g]
                Uv = unit(r.opponent_team, f) if f else 1500.0
                E = 1 / (1 + 10 ** ((Uv - R[pid]) / 400))
                K = K_NEW if N[pid] < SETTLED else K_SET
                R[pid] += K * r.w * (S - E)
                N[pid] += 1
                if int(season) == last:
                    # the same game played again on a rating that knows only this season
                    rs = RS.get(pid, 1500.0)
                    Es = 1 / (1 + 10 ** ((Uv - rs) / 400))
                    RS[pid] = rs + (K_SET + (K_PLACE - K_SET) * K_DECAY ** NS.get(pid, 0)) * r.w * (S - Es)
                    NS[pid] = NS.get(pid, 0) + 1
                    NQ[pid] = NQ.get(pid, 0) + (1 if r.w >= 0.5 else 0)
                    HS.setdefault(pid, []).append([int(ordw), round(RS[pid], 1)])
                if f:
                    unit_delta.setdefault((r.opponent_team, f), []).append(r.w * (S - E))
                hist.setdefault(pid, {}).setdefault(int(season), []).append([int(ordw), round(R[pid], 1)])
                if pid not in peak or R[pid] > peak[pid][0]:
                    peak[pid] = (R[pid], int(season))
            for key, ds in unit_delta.items():
                U[key] = unit(*key) - K_UNIT * (sum(ds) / len(ds))

    print(f'  {len(R)} players rated over {len(seasons)} seasons, {len(game_feat)} games featured; {skipped} player-games a regular left early, not rated')
    # every game's features, for experiments beside this script (the cache is gitignored)
    with open(os.path.join(CACHE, 'features.json'), 'w') as f:
        json.dump(game_feat, f, separators=(',', ':'))

    # ---- the game model ----
    feats = [gf for gf in game_feat if gf['result'] is not None and gf['result'] != 0]
    print(f'  {sum(1 for r in feats if r["charted"])} of {len(feats)} decided games had both depth charts')
    X = lambda rows, key='x': np.array([[r[key][g] for g in GROUPS] for r in rows])
    Y = lambda rows: np.array([1.0 if r['result'] > 0 else 0.0 for r in rows])
    def walk_forward(key):
        walk = {}
        for s in seasons[1:]:
            train = [r for r in feats if r['season'] < s]
            test = [r for r in feats if r['season'] == s]
            if not test:
                continue
            w = logistic_fit(X(train, key), Y(train))
            p = predict(w, X(test, key))
            y = Y(test)
            acc = float(((p > 0.5) == (y > 0.5)).mean())
            ll = float(-np.mean(y * np.log(np.clip(p, 1e-9, 1)) + (1 - y) * np.log(np.clip(1 - p, 1e-9, 1))))
            walk[int(s)] = {'games': len(test), 'accuracy': round(acc, 4), 'logloss': round(ll, 4)}
        return walk
    walk = walk_forward('x')
    walk_played = walk_forward('x_played')
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
        graded.append({'game_id': r['game_id'], 'p_home': round(p, 4), 'pick': r['home'] if p >= 0.5 else r['away'],
                       'correct': (p >= 0.5) == (r['result'] > 0) if r['result'] != 0 else None})
    # the coming week: each team as its latest depth chart and the week's injury report have it,
    # and as it last took the field where they are silent
    played_weeks = games[(games.season == last) & games.home_score.notna()]
    next_ord = None
    upcoming = games[(games.season == last) & games.home_score.isna()]
    if len(upcoming):
        next_ord = int(upcoming.ord.min())
    calls = []
    shown = []      # the console's line per call: the teams and the quarterbacks expected to start
    coming = []
    if next_ord is not None:
        for row in upcoming[upcoming.ord == next_ord].itertuples(index=False):
            # this week's lineups also drop anyone the latest roster carries off the active
            # list (injured reserve and the rest), which a depth chart can lag behind
            not_active = {pid for pid, why in out_now.items() if why and not why.startswith('out')}
            eh, _ = expected(last, row.week, row.home_team, row.gameday, played.get((last, row.home_team)), not_active)
            ea, _ = expected(last, row.week, row.away_team, row.gameday, played.get((last, row.away_team)), not_active)
            if not eh or not ea:
                continue
            sh, sa = strength(eh), strength(ea)
            for team, other, parts, st_opp, home in ((row.home_team, row.away_team, eh, sa, 1), (row.away_team, row.home_team, ea, sh, 0)):
                coming.append({'game_id': row.game_id, 'team': team, 'opp': other, 'home': home, 'parts': parts,
                               'opp_strength': st_opp, 'rating': {pid: R.get(pid, REPLACEMENT) for pid, _ in parts}})
            x = {g: (sh[g] - sa[g]) / 100 for g in GROUPS}
            p = float(predict(w_all, np.array([[x[g] for g in GROUPS]]))[0])
            qb = lambda parts: next((info[pid]['name'] for pid, g in parts if g == 'QB' and pid in info), None)
            pick = row.home_team if p >= 0.5 else row.away_team
            calls.append({'game_id': row.game_id, 'p_home': round(p, 4), 'pick': pick})
            shown.append(f"{row.away_team}@{row.home_team} {pick} {max(p, 1 - p):.0%} ({qb(ea)} v {qb(eh)})")
    # ---- each team on its own: the power ratings (see THE POWER RATINGS) ----
    team_rows = power_ratings(games[games.season == last])
    n_ok = sum(1 for g in graded if g['correct'] is True)
    n_gr = sum(1 for g in graded if g['correct'] is not None)
    model = {
        'built_at': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='minutes'),
        'season': last, 'groups': GROUPS, 'coef': coef,
        'walk_forward': walk, 'walk_forward_who_played': walk_played, 'record': {'season': last},
        'graded': graded, 'next': {'week': int(upcoming[upcoming.ord == next_ord].week.min()) if next_ord is not None else None, 'games': calls},
        'teams': team_rows,
    }

    # ---- the rankings ----
    # The table ranks this season alone: every player starts the season at 1500 and only his
    # games this season move him (RS), so a place is earned this year and a player with no
    # rated game this season is not ranked. The models (the game model, the matchups, market +
    # form) keep the rating with every season behind it (R), which is what their records were
    # proven on; the players map carries both, `elo` the career one they read.
    active_cut = last - 1          # career ratings: rated in this season or the last
    latest_season = {pid: max(h) for pid, h in hist.items()}
    last_ord = int(played_weeks.ord.max()) if len(played_weeks) else None
    players = {}
    groups_out = {}
    def why_out(pid):
        if pid in out_now:
            return out_now[pid]
        return 'a free agent' if on_roster else None
    def before_last(pid):
        """his season rating before the latest week's games, for the movement column"""
        v = 1500.0
        for o, r in HS.get(pid, []):
            if last_ord is not None and o < last_ord:
                v = r
        return v
    # enough of a season to rank: games in a real role in at least half the weeks played so far
    weeks_played = played_weeks.ord.nunique()
    min_games = max(1, math.ceil(weeks_played / 2))
    for g in GROUPS:
        rated = [pid for pid in RS if info[pid]['group'] == g and NQ.get(pid, 0) >= min_games]
        rated.sort(key=lambda p: -RS[p])
        # the rankings are of players who can play: the injured, the retired and the unsigned
        # are listed under the table instead, where they would have stood
        sidelined = []
        pool = []
        for pid in rated:
            w = why_out(pid)
            if w:
                if len(pool) < 25:
                    sidelined.append({'id': pid, 'name': info[pid]['name'], 'team': team_now.get(pid, info[pid]['team']),
                                      'raw': RS[pid], 'would_rank': len(pool) + 1, 'why': w})
            else:
                pool.append(pid)
        career = [pid for pid in R if info[pid]['group'] == g and latest_season[pid] >= active_cut and N[pid] >= 3 and not why_out(pid)]
        for pid in set(rated) | set(career):
            if pid in team_now:
                info[pid]['team'] = team_now[pid]
        # the movement column: against where each stood before the latest week's games
        prev = {pid: before_last(pid) for pid in pool}
        prev_rank = {pid: i + 1 for i, pid in enumerate(sorted(pool, key=lambda p: -prev[p]))}
        rank = {pid: i + 1 for i, pid in enumerate(pool)}
        # the ladder: each rating shown on the position's bell curve (THE LADDER)
        def curve(vals):
            vals = list(vals)
            m = float(np.mean(vals)) if vals else 1500.0
            sd = float(np.std(vals)) if len(vals) > 1 else 0.0
            return lambda v: round(1500 + SHOW_SD * (v - m) / sd) if sd > 0 else round(v)
        show = curve(RS[p] for p in pool)
        show_career = curve(R[p] for p in career if p in R)
        rows = []
        for pid in pool:
            rows.append({'id': pid, 'name': info[pid]['name'], 'pos': info[pid]['pos'], 'team': info[pid]['team'],
                         'elo': show(RS[pid]), 'raw': round(RS[pid]), 'rank': rank[pid], 'start_rank': prev_rank[pid],
                         'games': NS[pid], 'career': show_career(R[pid]), 'career_raw': round(R[pid]), 'peak': show_career(peak[pid][0]), 'peak_season': peak[pid][1],
                         'this_season': [[o, round(r, 1)] for o, r in HS.get(pid, [])]})
        for x in sidelined:
            x['elo'] = show(x.pop('raw'))
        groups_out[g] = {'label': LABEL[g], 'active': len(pool), 'curve': [show(RS[p]) for p in pool], 'min_games': min_games, 'top': rows[:25], 'sidelined': sidelined}
        # the players map: every player the models may price, on his career rating (elo, with s0
        # and h the season so far, so a rating can be read as it stood before any week: the Prop
        # Record grades on those), and his place this season where he has one (se, rank)
        for pid in sorted(set(career) | set(pool)):
            if pid not in R:
                continue
            h = hist[pid]
            players[pid] = {'name': info[pid]['name'], 'group': g, 'elo': round(R[pid]),
                            's0': round(season_start.get((last, pid), 1500.0)), 'h': [[o, round(r)] for o, r in h.get(last, [])],
                            'se': show(RS[pid]) if pid in rank else None, 'rank': rank.get(pid)}
    last_week = int(played_weeks.week.max()) if len(played_weeks) else 0
    out = {
        'built_at': model['built_at'], 'season': last, 'through_week': last_week,
        'groups': groups_out, 'players': players,
    }
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'players.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    mu = matchups(mu_log, game_feat, coming, last)
    if mu:
        mu.update({'built_at': model['built_at'], 'season': last, 'week': model['next']['week'],
                   'columns': ['1', 'home x form', 'form', 'form x allowed', 'form x player Elo'] + [f'form x opposing {u} Elo' for u in MU_DEF]})
        with open(os.path.join(OUT, 'matchups.json'), 'w') as f:
            json.dump(mu, f, separators=(',', ':'))
        for k in ('QB|passing_yards', 'WR|receiving_yards', 'RB|rushing_yards', 'TE|receiving_yards'):
            r = mu['record'].get(k, {}).get('past')
            if r:
                print(f"  matchups {k}: {r['games']} games, rmse {r['rmse_form']} -> {r['rmse_elo']}, biggest nudges right {r['right_top']:.3f}")
    with open(os.path.join(OUT, 'model.json'), 'w') as f:
        json.dump(model, f, separators=(',', ':'))
    print(f'  wrote elo/data/players.json ({os.path.getsize(os.path.join(OUT, "players.json")) // 1024} KB) and model.json')
    for g in GROUPS:
        print(f'  {LABEL[g]}: ' + ', '.join(f"{r['name']} {r['elo']}" for r in groups_out[g]['top'][:5]))
    print('  walk-forward, pre-game lineups: ' + ', '.join(f"{s}: {w['accuracy']:.3f} ({w['games']})" for s, w in walk.items()))
    print('  walk-forward, who played (hindsight): ' + ', '.join(f"{s}: {w['accuracy']:.3f}" for s, w in walk_played.items()))
    if shown:
        print('  ' + '; '.join(shown[:6]))
    print(f"  weights: {coef}")
    if n_gr:
        print(f"  {last}: {n_ok}/{n_gr} graded; next week {model['next']['week']}: {len(calls)} calls")


if __name__ == '__main__':
    main()
