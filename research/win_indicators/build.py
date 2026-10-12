"""Build the team-game table the win-indicators study ranks: one row per team per game,
2003-2025, regular season and playoffs, with every candidate stat kept as a numerator and a
denominator so a season-to-date value pools plays rather than averaging games.

Every number is read from nflverse's play-by-play; the result and home/away from games.csv by
game id (the play-by-play writes today's team codes, games.csv the codes of the day, so the two
are joined on the game alone). The definitions, which follow the official box score where one
exists:

  snaps         play_type pass or run: every real offensive snap, sacks and scrambles included;
                kneels, spikes and plays wiped out by a penalty (play_type no_play) left out
  dropbacks     snaps with qb_dropback (passes, sacks, scrambles)
  attempts      passes thrown: complete, incomplete or intercepted, never a sack or a spike
  pass yards    passing_yards on attempts (the passer's official yards); sack yards apart
  rushes        play_type run (scrambles count as rushes, as in the box score; kneels do not);
                designed runs are rushes without qb_scramble
  explosive     a rush of 10+ yards or a completion of 20+
  turnovers     interceptions thrown plus fumbles lost, a fumble charged to the team that
                fumbled (fumbled_1_team: a muffed punt is the return team's), never on a play a
                penalty wiped out; a turnover on downs is not a turnover
  penalties     accepted penalties (penalty yards above zero), by the penalised team, every play
  drives        nflfastR's fixed_drive: its result, whether it reached the opponent's 20, its
                first downs and its time of possession
  special teams kickoffs, punts, field goals and extra points (play_type), EPA zero-sum between
                the two teams, so the gap between them is each side's net
  neutral       a snap with the offence's win probability 20-80% outside the last two minutes of
                a half, the usual "neutral situation"; the play-based stats are built twice,
                every snap and neutral snaps only (prefix n_), to see which stats only follow the
                score (a team ahead runs, a team behind throws)

qb_hit, cpoe and air yards start in 2006 (nflverse has none before); those stats are NaN before.

Run: python3 -I build.py   (from research/win_indicators; writes out/team_games.parquet)
"""
import os, sys

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import common  # noqa: E402

OUT = os.path.join(HERE, 'out')

COLS = ['game_id', 'season', 'season_type', 'week', 'game_date', 'home_team', 'away_team', 'posteam',
        'defteam', 'play_type', 'down', 'yards_gained', 'qb_dropback', 'qb_scramble', 'sack',
        'complete_pass', 'incomplete_pass', 'interception', 'passing_yards', 'pass_touchdown',
        'rush_touchdown', 'epa', 'success', 'wp', 'half_seconds_remaining', 'first_down_rush',
        'first_down_pass', 'first_down_penalty', 'third_down_converted', 'third_down_failed',
        'fourth_down_converted', 'fourth_down_failed', 'fumble', 'fumble_lost', 'fumbled_1_team',
        'penalty', 'penalty_team', 'penalty_yards', 'qb_hit', 'tackled_for_loss', 'cpoe', 'air_yards',
        'field_goal_result', 'kick_distance', 'return_team', 'return_yards', 'touchback',
        'punt_blocked', 'fixed_drive', 'fixed_drive_result', 'drive_inside20', 'drive_first_downs',
        'drive_time_of_possession', 'yardline_100', 'play_id']

ST = ('kickoff', 'punt', 'field_goal', 'extra_point')


def _f(s):
    return s.fillna(0).astype(float)


def play_flags(d):
    """The per-play numerators of the offence's stats (the team on posteam)."""
    pt = d['play_type']
    snap = pt.isin(['pass', 'run'])
    sack = snap & (_f(d['sack']) == 1)
    att = (pt == 'pass') & ~sack & ((_f(d['complete_pass']) + _f(d['incomplete_pass']) + _f(d['interception'])) > 0)
    comp = att & (_f(d['complete_pass']) == 1)
    rush = pt == 'run'
    drush = rush & (_f(d['qb_scramble']) == 0)
    drop = snap & (_f(d['qb_dropback']) == 1)
    yg = _f(d['yards_gained'])
    has_epa = snap & d['epa'].notna()
    early = snap & d['down'].isin([1, 2])
    f = pd.DataFrame({
        'snaps': snap, 'drop': drop, 'att': att, 'comp': comp,
        'pyds': np.where(att, _f(d['passing_yards']), 0.0),
        'ptd': att & (_f(d['pass_touchdown']) == 1),
        'int': att & (_f(d['interception']) == 1),
        'sacks': sack, 'sack_yds': np.where(sack, -yg, 0.0),
        'rush': rush, 'ryds': np.where(rush, yg, 0.0),
        'drush': drush, 'dryds': np.where(drush, yg, 0.0),
        'yds': np.where(snap, yg, 0.0),
        'epa_n': has_epa, 'epa': np.where(has_epa, _f(d['epa']), 0.0),
        'succ': np.where(has_epa, _f(d['success']), 0.0),
        'drop_epa_n': has_epa & drop, 'drop_epa': np.where(has_epa & drop, _f(d['epa']), 0.0),
        'drop_succ': np.where(has_epa & drop, _f(d['success']), 0.0),
        'drush_epa_n': has_epa & drush, 'drush_epa': np.where(has_epa & drush, _f(d['epa']), 0.0),
        'drush_succ': np.where(has_epa & drush, _f(d['success']), 0.0),
        'early_n': early & d['epa'].notna(), 'early_epa': np.where(early & d['epa'].notna(), _f(d['epa']), 0.0),
        'early_succ': np.where(early & d['epa'].notna(), _f(d['success']), 0.0),
        'expl': (rush & (yg >= 10)) | (comp & (yg >= 20)),
        'fd': _f(d['first_down_rush']) + _f(d['first_down_pass']) + _f(d['first_down_penalty']),
        'fd_play': np.where(snap, _f(d['first_down_rush']) + _f(d['first_down_pass']), 0.0),
        'd3_conv': _f(d['third_down_converted']), 'd3_fail': _f(d['third_down_failed']),
        'd4_conv': _f(d['fourth_down_converted']), 'd4_fail': _f(d['fourth_down_failed']),
        'tfl': snap & (_f(d['tackled_for_loss']) == 1),
        'qb_hits': drop & (_f(d['qb_hit']) == 1),
        'cpoe_n': att & d['cpoe'].notna(), 'cpoe': np.where(att & d['cpoe'].notna(), _f(d['cpoe']), 0.0),
        'air_n': att & d['air_yards'].notna(), 'air': np.where(att & d['air_yards'].notna(), _f(d['air_yards']), 0.0),
    })
    return f.astype(float)


def offence(d, prefix=''):
    """Sum the play numerators by game and offence."""
    sub = d[d['posteam'].notna()]
    f = play_flags(sub)
    f['game_id'], f['team'] = sub['game_id'].values, sub['posteam'].values
    out = f.groupby(['game_id', 'team']).sum()
    return out.add_prefix(prefix)


def others(d):
    """What is charged to a team other than as the offence: turnovers, penalties, special teams."""
    live = d[d['play_type'] != 'no_play']
    rows = []
    # interceptions thrown are the offence's; fumbles the fumbler's
    ints = live[(_f(live['interception']) == 1) & live['posteam'].notna()]
    rows.append(ints.groupby(['game_id', 'posteam']).size().rename('ints_all').rename_axis(['game_id', 'team']))
    fl = live[_f(live['fumble_lost']) == 1]
    rows.append(fl.groupby(['game_id', 'fumbled_1_team']).size().rename('fum_lost').rename_axis(['game_id', 'team']))
    fu = live[_f(live['fumble']) == 1]
    rows.append(fu.groupby(['game_id', 'fumbled_1_team']).size().rename('fumbles').rename_axis(['game_id', 'team']))
    pen = d[(_f(d['penalty']) == 1) & (_f(d['penalty_yards']) > 0) & d['penalty_team'].notna()]
    rows.append(pen.groupby(['game_id', 'penalty_team']).size().rename('pens').rename_axis(['game_id', 'team']))
    rows.append(pen.groupby(['game_id', 'penalty_team'])['penalty_yards'].sum().rename('pen_yds').rename_axis(['game_id', 'team']))
    # special teams
    st = d[d['play_type'].isin(ST) & d['posteam'].notna()]
    rows.append(st.groupby(['game_id', 'posteam'])['epa'].sum().rename('st_epa_pos').rename_axis(['game_id', 'team']))
    fg = d[(d['play_type'] == 'field_goal') & d['posteam'].notna()]
    rows.append(fg.groupby(['game_id', 'posteam']).size().rename('fg_att').rename_axis(['game_id', 'team']))
    rows.append(fg[fg['field_goal_result'] == 'made'].groupby(['game_id', 'posteam']).size().rename('fg_made').rename_axis(['game_id', 'team']))
    pu = d[(d['play_type'] == 'punt') & d['posteam'].notna()]
    rows.append(pu.groupby(['game_id', 'posteam']).size().rename('punts').rename_axis(['game_id', 'team']))
    net = _f(pu['kick_distance']) - _f(pu['return_yards']) - 20 * _f(pu['touchback'])
    rows.append(net.groupby([pu['game_id'], pu['posteam']]).sum().rename('punt_net').rename_axis(['game_id', 'team']))
    ret = d[d['play_type'].isin(['kickoff', 'punt']) & d['return_team'].notna()]
    for kind in ('kickoff', 'punt'):
        r = ret[ret['play_type'] == kind]
        rows.append(_f(r['return_yards']).groupby([r['game_id'], r['return_team']]).sum()
                    .rename(f'{kind[:4]}_ret_yds').rename_axis(['game_id', 'team']))
    return pd.concat(rows, axis=1).fillna(0.0)


def top_seconds(s):
    m, sec = s.str.split(':', n=1, expand=True)[0], s.str.split(':', n=1, expand=True)[1]
    return pd.to_numeric(m, errors='coerce') * 60 + pd.to_numeric(sec, errors='coerce')


def drives(d):
    """Drive stats by game and offence, on nflfastR's fixed_drive."""
    x = d[d['posteam'].notna() & d['fixed_drive'].notna()].copy()
    x['first_spot'] = np.where(x['play_type'].isin(['pass', 'run', 'punt', 'field_goal', 'no_play', 'qb_kneel', 'qb_spike']),
                               x['yardline_100'], np.nan)
    x = x.sort_values(['game_id', 'play_id'])
    g = x.groupby(['game_id', 'fixed_drive'])
    dr = pd.DataFrame({
        'team': g['posteam'].agg(lambda s: s.mode().iat[0]),
        'result': g['fixed_drive_result'].first(),
        'in20': g['drive_inside20'].max(),
        'fds': g['drive_first_downs'].max(),
        'top': g['drive_time_of_possession'].first(),
        'start': g['first_spot'].first(),
    }).reset_index()
    dr['top_s'] = top_seconds(dr['top'].fillna(''))
    dr['td'] = dr['result'] == 'Touchdown'
    dr['rz_td'] = (dr['in20'] == 1) & dr['td']
    dr['three_out'] = (dr['result'] == 'Punt') & (_f(dr['fds']) == 0)
    dr['start_own'] = 100 - dr['start']
    out = dr.groupby(['game_id', 'team']).agg(
        drives=('fixed_drive', 'size'), rz_trips=('in20', 'sum'), rz_tds=('rz_td', 'sum'),
        three_outs=('three_out', 'sum'), top_s=('top_s', 'sum'),
        start_sum=('start_own', 'sum'), start_n=('start_own', 'count'))
    return out.astype(float)


def season_table(season, games):
    d = common.pbp(season, COLS)
    if d.empty:
        raise SystemExit(f'{season}: no plays')
    neutral = d['wp'].between(0.2, 0.8) & (d['half_seconds_remaining'] > 120)
    t = pd.concat([offence(d), offence(d[neutral], 'n_'), others(d), drives(d)], axis=1).fillna(0.0)
    t = t.reset_index()
    # who played whom, by the play-by-play's codes, and the result by games.csv
    meta = d.drop_duplicates('game_id')[['game_id', 'home_team', 'away_team', 'season_type', 'week', 'game_date']]
    meta = meta.merge(games[['game_id', 'home_score', 'away_score', 'location', 'game_type', 'spread_line',
                             'home_moneyline', 'away_moneyline', 'home_rest', 'away_rest', 'div_game', 'overtime']],
                      on='game_id', how='left', validate='one_to_one')
    if meta['home_score'].isna().any():
        raise SystemExit(f'{season}: games without a score in games.csv: {meta.loc[meta.home_score.isna(), "game_id"].tolist()}')
    t = t.merge(meta, on='game_id', how='left', validate='many_to_one')
    t['home'] = (t['team'] == t['home_team']).astype(int)
    t['opp'] = np.where(t['home'] == 1, t['away_team'], t['home_team'])
    bad = ~t['team'].isin(pd.concat([t['home_team'], t['away_team']]).unique()) | ((t['team'] != t['home_team']) & (t['team'] != t['away_team']))
    if bad.any():
        raise SystemExit(f'{season}: a team in a game it did not play: {t.loc[bad, ["game_id", "team"]].values[:5]}')
    t['pts'] = np.where(t['home'] == 1, t['home_score'], t['away_score'])
    t['opp_pts'] = np.where(t['home'] == 1, t['away_score'], t['home_score'])
    t['season'] = season
    n = t.groupby('game_id').size()
    if (n != 2).any():
        raise SystemExit(f'{season}: games without two teams: {n[n != 2].index.tolist()[:5]}')
    return t


def main():
    g = common.games()
    tabs = []
    for s in common.SEASONS:
        t = season_table(s, g)
        tabs.append(t)
        print(s, t['game_id'].nunique(), 'games')
    t = pd.concat(tabs, ignore_index=True)
    # games.csv has every game of these seasons and the play-by-play every one of them
    want = set(g['game_id'])
    have = set(t['game_id'])
    if want != have:
        raise SystemExit(f'games.csv and the play-by-play disagree: {sorted(want ^ have)[:10]}')
    os.makedirs(OUT, exist_ok=True)
    t.to_parquet(os.path.join(OUT, 'team_games.parquet'), index=False)
    print('wrote', len(t), 'team-games,', t['game_id'].nunique(), 'games')


if __name__ == '__main__':
    main()
