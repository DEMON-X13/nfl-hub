"""Build the tables the win-indicators study ranks, 2003-2025, regular season and playoffs:

  out/team_games.parquet   one row per team per game, every candidate stat kept as a numerator and
                           a denominator so a season-to-date value pools plays rather than averaging
                           games; the starting quarterback (games.csv) on each row
  out/qb_games.parquet     each passer's dropbacks and their EPA in each game, for the starting-QB
                           indicator

Every number is read from nflverse's play-by-play; the result, home/away, the closing line and the
starting quarterbacks from games.csv by game id (the play-by-play writes today's team codes,
games.csv the codes of the day, so the two are joined on the game alone). The definitions follow the
official box score except where said:

  snaps         play_type pass or run, two-point tries left out: every real offensive snap, sacks
                and scrambles included. Kneels and spikes are left out of every stat (the box
                score counts a kneel as a rush and a spike as an attempt, but neither is football
                played: a kneel is the winner running out the clock), and so are plays wiped out by
                a penalty (play_type no_play)
  dropbacks     snaps with qb_dropback (passes, sacks, scrambles)
  attempts      passes thrown: complete, incomplete or intercepted, never a sack or a spike
  pass yards    passing_yards on attempts (the passer's official yards); sack yards apart
  rushes        play_type run (scrambles count as rushes, as in the box score); designed runs are
                rushes without qb_scramble
  explosive     a rush of 10+ yards or a completion of 20+
  turnovers     interceptions thrown plus fumbles lost, a fumble charged to the team that
                fumbled (fumbled_1_team: a muffed punt is the return team's), never on a play a
                penalty wiped out; a turnover on downs is not a turnover
  penalties     plays with an accepted penalty, by the penalised team, every play: nflverse's flag
                (a declined foul does not set it) less offsetting fouls; one accepted for no yards
                (half the distance at the 1, the 2024 kickoff's fouls placed at the 40) counts; two
                accepted fouls by one team on one play count once (about 1 in 550)
  drives        nflfastR's fixed_drive, every number worked out from its own plays (its
                drive_inside20, drive_first_downs and drive_time_of_possession are keyed on the raw
                drive number and land on the wrong fixed drive in about one game in eleven): a drive
                is counted only with a real down on it (a snap, a kick or a play a penalty wiped
                out: a kneel-down or a spike is no down, so a victory formation is no drive); a
                red-zone trip is a real down inside the 20; its start is the spot of its first real
                down (a kickoff re-kicked after a penalty is no start); possession time is
                nflverse's drive_time_of_possession summed over the raw drives, where it belongs
  3rd/4th down  nflverse's conversion flags on every play but a kneel, a spike or a two-point try
  series        nflfastR's series (a set of downs) with a snap, a kneel-down or the half ending left
                out: a success ends in a first down or a touchdown (drive success rate)
  special teams kickoffs, punts, field goals and extra points (play_type), EPA zero-sum between
                the two teams, so the gap between them is each side's net; a blocked punt counts as
                a punt of no yards
  neutral       a snap with the offence's win probability 20-80% outside the last two minutes of
                a half, the usual "neutral situation"; the play-based stats are built twice,
                every snap and neutral snaps only (prefix n_), to see which stats only follow the
                score (a team ahead runs, a team behind throws); a series is neutral by its first
                snap. A third time on a random set of plays the same size (prefix r_, the season as
                the seed), the yardstick for how much edge a stat loses on fewer snaps alone
  starters      games.csv's starting quarterback; where he took no dropback in the game (44
                team-games, 33 of them in 2024), the game's lead passer (qb_listed keeps games.csv's).
                Every passer's dropbacks from 1999 on, so a starter's form entering 2003 is known

qb_hit, cpoe and air yards start in 2006 (nflverse has none before); those stats are NaN before.

Run: python3 -I build.py   (from research/win_indicators)
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
        'rush_touchdown', 'touchdown', 'two_point_attempt', 'epa', 'success', 'wp', 'half_seconds_remaining',
        'first_down_rush', 'first_down_pass', 'first_down_penalty', 'third_down_converted', 'third_down_failed',
        'fourth_down_converted', 'fourth_down_failed', 'fumble', 'fumble_lost', 'fumbled_1_team',
        'penalty', 'penalty_team', 'penalty_yards', 'desc', 'qb_hit', 'tackled_for_loss', 'cpoe', 'air_yards',
        'field_goal_result', 'kick_distance', 'return_team', 'return_yards', 'touchback',
        'punt_blocked', 'fixed_drive', 'fixed_drive_result', 'drive', 'drive_time_of_possession',
        'series', 'series_result', 'passer_id', 'yardline_100', 'play_id']

ST = ('kickoff', 'punt', 'field_goal', 'extra_point')
# a real down: a snap, a kick or a play a penalty wiped out (never a kneel-down or a spike)
REAL_DOWN = ('pass', 'run', 'punt', 'field_goal', 'no_play')


def _f(s):
    return s.fillna(0).astype(float)


def neutral(d):
    return d['wp'].between(0.2, 0.8) & (d['half_seconds_remaining'] > 120)


def play_flags(d):
    """The per-play numerators of the offence's stats (the team on posteam)."""
    pt = d['play_type']
    tp = _f(d['two_point_attempt']) == 1
    snap = pt.isin(['pass', 'run']) & ~tp
    sack = snap & (_f(d['sack']) == 1)
    att = snap & (pt == 'pass') & ~sack & ((_f(d['complete_pass']) + _f(d['incomplete_pass']) + _f(d['interception'])) > 0)
    comp = att & (_f(d['complete_pass']) == 1)
    rush = snap & (pt == 'run')
    drush = rush & (_f(d['qb_scramble']) == 0)
    drop = snap & (_f(d['qb_dropback']) == 1)
    yg = _f(d['yards_gained'])
    has_epa = snap & d['epa'].notna()
    no_td = has_epa & (_f(d['touchdown']) == 0)
    early = has_epa & d['down'].isin([1, 2])
    epa, succ = _f(d['epa']), _f(d['success'])
    # a third or fourth down is any play on one but a kneel, a spike or a two-point try (a defensive
    # penalty that moves the chains counts, as in the box score)
    down_play = ~pt.isin(['qb_kneel', 'qb_spike']) & ~tp
    f = pd.DataFrame({
        'snaps': snap, 'drop': drop, 'att': att, 'comp': comp,
        'pyds': np.where(att, _f(d['passing_yards']), 0.0),
        'ptd': att & (_f(d['pass_touchdown']) == 1),
        'int': att & (_f(d['interception']) == 1),
        'sacks': sack, 'sack_yds': np.where(sack, -yg, 0.0),
        'rush': rush, 'ryds': np.where(rush, yg, 0.0),
        'drush': drush, 'dryds': np.where(drush, yg, 0.0),
        'yds': np.where(snap, yg, 0.0),
        'epa_n': has_epa, 'epa': np.where(has_epa, epa, 0.0),
        'succ': np.where(has_epa, succ, 0.0),
        'epa_ntd_n': no_td, 'epa_ntd': np.where(no_td, epa, 0.0),
        'drop_epa_n': has_epa & drop, 'drop_epa': np.where(has_epa & drop, epa, 0.0),
        'drop_succ': np.where(has_epa & drop, succ, 0.0),
        'drush_epa_n': has_epa & drush, 'drush_epa': np.where(has_epa & drush, epa, 0.0),
        'drush_succ': np.where(has_epa & drush, succ, 0.0),
        'early_n': early, 'early_epa': np.where(early, epa, 0.0), 'early_succ': np.where(early, succ, 0.0),
        'expl': (rush & (yg >= 10)) | (comp & (yg >= 20)),
        'fd': np.where(~tp, _f(d['first_down_rush']) + _f(d['first_down_pass']) + _f(d['first_down_penalty']), 0.0),
        'fd_play': np.where(snap, _f(d['first_down_rush']) + _f(d['first_down_pass']), 0.0),
        'd3_conv': np.where(down_play, _f(d['third_down_converted']), 0.0),
        'd3_fail': np.where(down_play, _f(d['third_down_failed']), 0.0),
        'd4_conv': np.where(down_play, _f(d['fourth_down_converted']), 0.0),
        'd4_fail': np.where(down_play, _f(d['fourth_down_failed']), 0.0),
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


def accepted_penalties(d):
    """Plays with a penalty that stood: nflverse's penalty flag, which a declined foul does not set,
    less the plays whose fouls offset."""
    pen = d[(_f(d['penalty']) == 1) & d['penalty_team'].notna()]
    return pen[~pen['desc'].fillna('').str.contains('offsetting', case=False)]


def turnovers(d, prefix=''):
    """Interceptions thrown (the offence's) and fumbles lost (the fumbler's), plays a penalty wiped
    out and two-point tries left out."""
    live = d[(d['play_type'] != 'no_play') & (_f(d['two_point_attempt']) == 0)]
    ints = live[(_f(live['interception']) == 1) & live['posteam'].notna()]
    fl = live[_f(live['fumble_lost']) == 1]
    return pd.concat([ints.groupby(['game_id', 'posteam']).size().rename(prefix + 'ints_all').rename_axis(['game_id', 'team']),
                      fl.groupby(['game_id', 'fumbled_1_team']).size().rename(prefix + 'fum_lost').rename_axis(['game_id', 'team'])],
                     axis=1).fillna(0.0)


def others(d):
    """What is charged to a team other than as the offence: turnovers, penalties, special teams."""
    live = d[d['play_type'] != 'no_play']
    rows = [turnovers(d)]
    fu = live[_f(live['fumble']) == 1]
    rows.append(fu.groupby(['game_id', 'fumbled_1_team']).size().rename('fumbles').rename_axis(['game_id', 'team']))
    pen = accepted_penalties(d)
    rows.append(pen.groupby(['game_id', 'penalty_team']).size().rename('pens').rename_axis(['game_id', 'team']))
    rows.append(_f(pen['penalty_yards']).groupby([pen['game_id'], pen['penalty_team']]).sum().rename('pen_yds').rename_axis(['game_id', 'team']))
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
    p = s.fillna('').str.split(':', n=1, expand=True)
    return pd.to_numeric(p[0], errors='coerce') * 60 + pd.to_numeric(p[1] if 1 in p else None, errors='coerce')


def drives(d):
    """Drive stats by game and offence, each worked out from the fixed drive's own plays. A drive
    counts only with a real down on it (a kneel-down or a spike is no down, so a victory formation
    is no drive); a red-zone trip is a real down inside the 20."""
    x = d[d['posteam'].notna() & d['fixed_drive'].notna()].copy()
    x = x.sort_values(['game_id', 'play_id'])
    real = x['play_type'].isin(REAL_DOWN) & x['down'].notna() & (_f(x['two_point_attempt']) == 0)
    x['spot'] = np.where(real, x['yardline_100'], np.nan)
    x['in20p'] = real & (x['yardline_100'] < 20)
    x['fdp'] = np.where(_f(x['two_point_attempt']) == 0,
                        _f(x['first_down_rush']) + _f(x['first_down_pass']) + _f(x['first_down_penalty']), 0.0)
    x['team_d'] = x['posteam'].where(real)
    g = x.groupby(['game_id', 'fixed_drive'], sort=False)
    dr = pd.DataFrame({
        'team': g['team_d'].agg(lambda s: s.mode().iat[0] if s.notna().any() else None),
        'result': g['fixed_drive_result'].first(),
        'in20': g['in20p'].max(),
        'fds': g['fdp'].sum(),
        'start': g['spot'].first(),
    }).reset_index()
    dr = dr[dr['team'].notna()]                       # no real down: a return to the half's end, a kneel-down
    dr['rz_td'] = dr['in20'] & (dr['result'] == 'Touchdown')
    dr['three_out'] = (dr['result'] == 'Punt') & (dr['fds'] == 0)
    dr['start_own'] = 100 - dr['start']
    out = dr.groupby(['game_id', 'team']).agg(
        drives=('fixed_drive', 'size'), rz_trips=('in20', 'sum'), rz_tds=('rz_td', 'sum'),
        three_outs=('three_out', 'sum'), start_sum=('start_own', 'sum'), start_n=('start_own', 'count'))
    # possession time: nflverse's, on the raw drives it is written for
    y = d[d['posteam'].notna() & d['drive'].notna()]
    raw = y.groupby(['game_id', 'drive']).agg(team=('posteam', lambda s: s.mode().iat[0]),
                                              top=('drive_time_of_possession', 'first')).reset_index()
    raw['top_s'] = top_seconds(raw['top'])
    out['top_s'] = raw.groupby(['game_id', 'team'])['top_s'].sum()
    return out.astype(float)


def series(d, masks):
    """Drive success rate's counts by game and offence: sets of downs with a snap, the kneel-downs and
    the half's end left out, a success ending in a first down or a touchdown; and the same on the
    series whose first snap is in each of `masks` (prefix: a play mask)."""
    x = d[d['posteam'].notna() & d['series'].notna()]
    snap = x['play_type'].isin(['pass', 'run']) & (_f(x['two_point_attempt']) == 0)
    x = x[snap].sort_values(['game_id', 'play_id'])
    g = x.groupby(['game_id', 'series'])
    s = pd.DataFrame({'team': g['posteam'].agg(lambda v: v.mode().iat[0])})
    for p, m in masks.items():
        s[p] = m.reindex(x.index).groupby([x['game_id'], x['series']]).first()
    res = d[d['series'].notna()].groupby(['game_id', 'series'])['series_result'].first()
    s['result'] = res.reindex(s.index)
    s = s[~s['result'].isin(['QB kneel', 'End of half'])].reset_index()
    s['ok'] = s['result'].isin(['First down', 'Touchdown'])
    parts = [s.groupby(['game_id', 'team']).agg(dsr=('ok', 'sum'), dsr_n=('ok', 'size'))]
    for p in masks:
        parts.append(s[s[p] == 1].groupby(['game_id', 'team']).agg(**{p + 'dsr': ('ok', 'sum'), p + 'dsr_n': ('ok', 'size')}))
    return pd.concat(parts, axis=1).fillna(0.0).astype(float)


def qb_games(d):
    """Each passer's dropbacks with an EPA and their EPA, by game and team."""
    f = play_flags(d)
    m = (f['drop_epa_n'] == 1) & d['passer_id'].notna()
    x = pd.DataFrame({'game_id': d['game_id'][m], 'team': d['posteam'][m], 'passer_id': d['passer_id'][m],
                      'epa': f['drop_epa'][m]})
    return x.groupby(['game_id', 'team', 'passer_id']).agg(dropbacks=('epa', 'size'), epa=('epa', 'sum')).reset_index()


def random_like_neutral(d, season):
    """A random set of plays the size of the neutral ones (the same share of the season's snaps), drawn
    with the season as the seed: the neutral test's yardstick for how much edge a stat loses on fewer
    snaps alone."""
    snap = d['play_type'].isin(['pass', 'run'])
    share = (neutral(d) & snap).sum() / snap.sum()
    u = np.random.default_rng(season).random(len(d))
    return pd.Series(u < share, index=d.index)


def season_table(season, games):
    d = common.pbp(season, COLS)
    if d.empty:
        raise SystemExit(f'{season}: no plays')
    neu, rnd = neutral(d), random_like_neutral(d, season)
    t = pd.concat([offence(d), offence(d[neu], 'n_'), offence(d[rnd], 'r_'), others(d),
                   turnovers(d[neu], 'n_'), turnovers(d[rnd], 'r_'), drives(d),
                   series(d, {'n_': neu, 'r_': rnd})], axis=1).fillna(0.0)
    t = t.reset_index()
    # who played whom, by the play-by-play's codes, and the result, line and quarterbacks by games.csv
    meta = d.drop_duplicates('game_id')[['game_id', 'home_team', 'away_team', 'season_type', 'week', 'game_date']]
    meta = meta.merge(games[['game_id', 'home_score', 'away_score', 'location', 'game_type', 'spread_line',
                             'home_moneyline', 'away_moneyline', 'home_rest', 'away_rest', 'div_game', 'overtime',
                             'home_qb_id', 'away_qb_id']],
                      on='game_id', how='left', validate='one_to_one')
    if meta['home_score'].isna().any():
        raise SystemExit(f'{season}: games without a score in games.csv: {meta.loc[meta.home_score.isna(), "game_id"].tolist()}')
    t = t.merge(meta, on='game_id', how='left', validate='many_to_one')
    t['home'] = (t['team'] == t['home_team']).astype(int)
    bad = (t['team'] != t['home_team']) & (t['team'] != t['away_team'])
    if bad.any():
        raise SystemExit(f'{season}: a team in a game it did not play: {t.loc[bad, ["game_id", "team"]].values[:5]}')
    t['opp'] = np.where(t['home'] == 1, t['away_team'], t['home_team'])
    t['pts'] = np.where(t['home'] == 1, t['home_score'], t['away_score'])
    t['opp_pts'] = np.where(t['home'] == 1, t['away_score'], t['home_score'])
    t['qb_id'] = np.where(t['home'] == 1, t['home_qb_id'], t['away_qb_id'])
    t = t.drop(columns=['home_qb_id', 'away_qb_id'])
    t['season'] = season
    n = t.groupby('game_id').size()
    if (n != 2).any():
        raise SystemExit(f'{season}: games without two teams: {n[n != 2].index.tolist()[:5]}')
    q = qb_games(d)
    q['season'] = season
    # games.csv's starter took no dropback in a few games (33 in 2024): its record is wrong there, so
    # the game's lead passer (most dropbacks) stands in
    lead = q.sort_values('dropbacks', ascending=False).drop_duplicates(['game_id', 'team']).set_index(['game_id', 'team'])['passer_id']
    played = set(zip(q['game_id'], q['team'], q['passer_id']))
    miss = np.array([(g, tm, pid) not in played for g, tm, pid in zip(t['game_id'], t['team'], t['qb_id'])])
    stand = lead.reindex(pd.MultiIndex.from_arrays([t['game_id'], t['team']])).values
    t = t.copy()
    t['qb_listed'] = t['qb_id']
    t['qb_id'] = np.where(miss & pd.notna(stand), stand, t['qb_id'])
    return t, q, int((miss & pd.notna(stand)).sum())


def main():
    g = common.games()
    tabs, qbs = [], []
    for s in common.WARMUP:                                   # a starter's form entering 2003
        q = qb_games(common.pbp(s, COLS))
        q['season'] = s
        qbs.append(q)
        print(s, 'warm-up:', len(q), 'passer-games')
    for s in common.SEASONS:
        t, q, fixed = season_table(s, g)
        tabs.append(t)
        qbs.append(q)
        top = t[t['overtime'] == 0].groupby('game_id')['top_s'].sum()
        print(s, t['game_id'].nunique(), 'games;', f'possession time within 30 s of 60:00 in {(abs(top - 3600) <= 30).mean():.1%}'
              f' of games without overtime; starter with no dropback replaced by the lead passer: {fixed}')
    t = pd.concat(tabs, ignore_index=True)
    # games.csv has every game of these seasons and the play-by-play every one of them
    want, have = set(g['game_id']), set(t['game_id'])
    if want != have:
        raise SystemExit(f'games.csv and the play-by-play disagree: {sorted(want ^ have)[:10]}')
    os.makedirs(OUT, exist_ok=True)
    t.to_parquet(os.path.join(OUT, 'team_games.parquet'), index=False)
    pd.concat(qbs, ignore_index=True).to_parquet(os.path.join(OUT, 'qb_games.parquet'), index=False)
    print('wrote', len(t), 'team-games,', t['game_id'].nunique(), 'games')


if __name__ == '__main__':
    main()
