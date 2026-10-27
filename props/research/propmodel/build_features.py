"""The free-data props model's feature table: one row per (player, regular-season game), QB/RB/WR/TE/K,
2013-2025, every feature strictly pre-game, the outcomes beside them (README.md, "The feature table").

    python3 -I props/research/propmodel/build_features.py --data DIR            # fetch what is missing, build
    python3 -I props/research/propmodel/build_features.py --data DIR --no-fetch
    python3 -I props/research/propmodel/build_features.py --data DIR --cutoff 2024 9 --out cut.parquet \
            --compare DIR/features.parquet                                      # the as-of test (below)

Rules this file keeps (each says where it is enforced):

  * 2026 is the held-out test and is never read: season files of 2026 are never fetched (fetch.py
    refuses them) and games.csv is cut to 2025 before it is parsed; `--last` above 2025 is refused.
  * A row's features use only what was known before that game's kickoff: the player's, his team's and
    the opponent's earlier games (every rolling feature is a sum over strictly earlier rows of its group:
    `prior()`), that week's depth chart (the weekly chart through 2024, the last daily snapshot at least
    4 hours before kickoff from 2025), that week's injury report, that week's roster status (a player off
    the active roster, never the game-day inactive list), and the game's closing spread, total and
    moneylines from games.csv (the market's pre-game view) with its venue and weather.
  * The population is every player who took a snap in his role (an offensive snap, or for a kicker a
    special-teams snap or a kick), with or without a stat line: DraftKings voids a prop only when the
    player does not play, so a game where he played and recorded nothing is a zero, which the site's
    current table drops. Zero rows come from PFR's snap counts (2013 on), placed on players by PFR id
    through players.csv and the weekly rosters, else by name within the club.
  * `--cutoff S W` rebuilds from sources truncated after season S week W; `--compare FULL` then holds
    every row of the cut build to the full build's row, column for column. Any difference is a feature
    that saw a later game, and the run fails.
  * `--predict S W` (predict mode, what predict.py runs) builds only week W's rows, before any of its games:
    the games' own files (stats, snap counts, play-by-play) are read up to week W-1, the pre-game ones
    (schedule and lines, depth charts, injury reports, rosters) up to week W, and a row is made for every
    player who might play (predict_candidates). Of week W's play-by-play only the gamebook weather line is
    read, where the file already holds the game (target_week_weather). Without it the build is exactly as before (check_predict.py
    holds both: the full table unchanged, and week W's candidate rows equal to the full build's rows).
"""
import argparse
import json
import os
import re
import sys
import time
import unicodedata

import warnings

import numpy as np
import pandas as pd

warnings.simplefilter('ignore', pd.errors.PerformanceWarning)

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fetch as F  # noqa: E402

HOLDOUT_FROM = F.HOLDOUT_FROM
TEAM_NOW = {'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA', 'SL': 'LA', 'LAR': 'LA', 'ARZ': 'ARI', 'BLT': 'BAL',
            'CLV': 'CLE', 'HST': 'HOU', 'JAC': 'JAX'}
GRP = {'QB': 'QB', 'RB': 'RB', 'HB': 'RB', 'FB': 'RB', 'WR': 'WR', 'TE': 'TE', 'K': 'K', 'PK': 'K'}
GROUPS = ['QB', 'RB', 'WR', 'TE', 'K']
DC_LEAD_H = 4          # a 2025+ depth chart snapshot is used only if taken at least this long before kickoff
PRESENT = {'ACT', 'INA'}   # roster statuses that leave a player available as far as anyone knew before kickoff
OUT_STATUS = {'Out', 'Doubtful'}
ROSTER_STATUS_FROM = 2016   # weekly roster statuses before 2016 are end-of-season values (README, "Leakage"), never read
QB_LEAD_WINDOW = 8     # the team's lead quarterback: most dropbacks over its last 8 games
VAC_WINDOW = 3         # an absent player counts toward vacated shares if he played one of the team's last 3 games
RET_WINDOW = 17        # a present player who missed games counts as returning up to 17 team games after his last
OL_POS = {'T', 'G', 'C', 'OT', 'OG', 'OL', 'LT', 'RT', 'LG', 'RG'}
DB_POS = {'CB', 'S', 'SS', 'FS', 'DB', 'SAF'}
FRONT_POS = {'DE', 'DT', 'NT', 'DL', 'LB', 'OLB', 'ILB', 'MLB', 'EDGE'}

# stats_player columns read, and the outcome columns made from them
STAT_COLS = ['completions', 'attempts', 'passing_yards', 'passing_tds', 'passing_interceptions', 'sacks_suffered',
             'passing_epa', 'carries', 'rushing_yards', 'rushing_tds', 'receptions', 'targets', 'receiving_yards',
             'receiving_tds', 'special_teams_tds', 'fg_made', 'fg_att', 'fg_made_0_19', 'fg_made_20_29',
             'fg_made_30_39', 'fg_made_40_49', 'fg_made_50_59', 'fg_made_60_', 'pat_made', 'pat_att',
             'fantasy_points_ppr']
OUTCOMES = ['passing_yards', 'passing_tds', 'completions', 'attempts', 'passing_interceptions', 'rushing_yards',
            'carries', 'receptions', 'receiving_yards', 'rush_rec_yards', 'any_td', 'rush_rec_tds', 'targets',
            'rushing_tds', 'receiving_tds', 'special_teams_tds', 'sacks_suffered', 'fg_made', 'fg_att', 'pat_made',
            'pat_att', 'kick_pts', 'fantasy_points_ppr']

# player metrics rolled over his earlier games. 'full' windows: l1 l3 ew4 ew10 szn prev car; 'lite': ew4 ew10 szn prev
PLAYER_FULL = ['passing_yards', 'passing_tds', 'completions', 'attempts', 'passing_interceptions', 'rushing_yards',
               'carries', 'receptions', 'receiving_yards', 'rush_rec_yards', 'rush_rec_tds', 'any_td', 'targets',
               'fg_att', 'fg_made', 'kick_pts', 'off_pct', 'tgt_share', 'ay_share', 'car_share', 'rz_tgt_share',
               'rz_car_share', 'db_share']
PLAYER_LITE = ['sacks_suffered', 'fantasy_points_ppr', 'pat_att', 'off_snaps', 'st_pct', 'est_routes', 'air_yards',
               'tgt', 'rz_tgt', 'ez_tgt', 'deep_tgt', 'car_d', 'rz_car', 'gl_car', 'db', 'scrambles', 'qb_epa',
               'cpoe_sum', 'cpoe_n', 'passing_epa', 'fg50_att']
WIN_FULL = ('l1', 'l3', 'ew4', 'ew10', 'szn', 'prev', 'car')
WIN_LITE = ('ew4', 'ew10', 'szn', 'prev')
# efficiency ratios: name -> (numerator metric, denominator metric); written for ew10, szn and car
RATIOS = {'ypc': ('rushing_yards', 'carries'), 'ypt': ('receiving_yards', 'targets'),
          'catch': ('receptions', 'targets'), 'ypa': ('passing_yards', 'attempts'),
          'comp': ('completions', 'attempts'), 'ptd_rate': ('passing_tds', 'attempts'),
          'int_rate': ('passing_interceptions', 'attempts'), 'sack_rate': ('sacks_suffered', 'db'),
          'td_per_opp': ('rush_rec_tds', 'opps'), 'adot': ('air_yards', 'tgt'), 'tprr': ('tgt', 'est_routes'),
          'epa_db': ('qb_epa', 'db'), 'cpoe': ('cpoe_sum', 'cpoe_n'), 'yprr': ('receiving_yards', 'est_routes'),
          'fg_pct': ('fg_made', 'fg_att')}

TEAM_METRICS = ['plays', 'db', 'drush', 'patt', 'tgt', 'air_yards', 'rz_plays', 'rz_tgt', 'rz_drush', 'sacks',
                'epa_db_sum', 'epa_rush_sum', 'succ_db', 'succ_rush', 'proe_sum', 'proe_n', 'neu_plays', 'neu_db',
                'expl_pass', 'expl_rush', 'points', 'fg_att']
TEAM_RATIOS = {'pass_rate': ('db', 'plays'), 'neu_pass_rate': ('neu_db', 'neu_plays'), 'proe': ('proe_sum', 'proe_n'),
               'epa_db': ('epa_db_sum', 'db'), 'epa_rush': ('epa_rush_sum', 'drush'), 'sack_rate': ('sacks', 'db'),
               'succ_db': ('succ_db', 'db'), 'succ_rush': ('succ_rush', 'drush'), 'rz_share': ('rz_plays', 'plays'),
               'expl_pass': ('expl_pass', 'db'), 'expl_rush': ('expl_rush', 'drush')}
TEAM_OUT = ['plays', 'db', 'drush', 'tgt', 'air_yards', 'rz_plays', 'points', 'fg_att']   # written as t_<m>_ew8/szn
DEF_OUT = ['plays', 'db', 'drush', 'points', 'pass_yds', 'rush_yds', 'sacks', 'rz_plays']
DEF_REL = ['points', 'pass_yds', 'rush_yds', 'epa_db', 'epa_rush']
# what a defence allowed to each position group, per game, from the player rows (zero rows included)
OA_METRICS = {'QB': ['passing_yards', 'passing_tds', 'attempts', 'completions', 'passing_interceptions',
                     'rushing_yards', 'sacks_suffered', 'fantasy_points_ppr'],
              'RB': ['carries', 'rushing_yards', 'receptions', 'targets', 'receiving_yards', 'rush_rec_tds',
                     'fantasy_points_ppr'],
              'WR': ['targets', 'receptions', 'receiving_yards', 'receiving_tds', 'fantasy_points_ppr'],
              'TE': ['targets', 'receptions', 'receiving_yards', 'receiving_tds', 'fantasy_points_ppr'],
              'K': ['fg_att', 'fg_made', 'kick_pts']}
STATE_METRICS = ['tgt_share', 'ay_share', 'car_share', 'rz_tgt_share', 'rz_car_share', 'db_share', 'off_pct',
                 'targets', 'carries', 'db']


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def tn(s):
    return s.replace(TEAM_NOW)


def norm_name(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\b(jr|sr|ii|iii|iv|v)\b\.?', ' ', s)
    return re.sub(r'[^a-z]', '', s)


# ------------------------------------------------------------------------------------------- loading
def load_games(data, first, last, cutoff):
    g = pd.read_csv(F.games_path(data), low_memory=False)
    assert g.season.max() < HOLDOUT_FROM, 'games.csv carries a held-out season'
    g = g[(g.season >= first) & (g.season <= last) & (g.game_type == 'REG')].copy()
    g['tkey'] = g.season * 100 + g.week
    if cutoff:
        g = g[g.tkey <= cutoff]
    for c in ('home_team', 'away_team'):
        g[c] = tn(g[c])
    et = pd.to_datetime(g.gameday + ' ' + g.gametime.fillna('13:00'))
    g['kickoff_utc'] = et.dt.tz_localize('America/New_York').dt.tz_convert('UTC')
    g['gameday'] = pd.to_datetime(g.gameday)
    g['kick_hour_et'] = et.dt.hour + et.dt.minute / 60

    def imp(ml):
        ml = pd.to_numeric(ml, errors='coerce')
        return np.where(ml < 0, -ml / (-ml + 100), 100 / (ml + 100))
    ph, pa = imp(g.home_moneyline), imp(g.away_moneyline)
    g['p_home'] = ph / (ph + pa)
    rows = []
    for side, opp, home in (('home', 'away', 1), ('away', 'home', 0)):
        x = pd.DataFrame({
            'game_id': g.game_id.values, 'season': g.season.values, 'week': g.week.values, 'tkey': g.tkey.values,
            'team': g[side + '_team'].values, 'opp': g[opp + '_team'].values, 'is_home': home,
            'gameday': g.gameday.values, 'kickoff_utc': g.kickoff_utc.values, 'weekday': g.weekday.values,
            'kick_hour_et': g.kick_hour_et.values,
            'neutral': (g.location == 'Neutral').astype(int).values, 'div_game': g.div_game.values,
            'roof': g.roof.values, 'surface': g.surface.values, 'temp': g.temp.values, 'wind': g.wind.values,
            'spread_line': g.spread_line.values, 'total_line': g.total_line.values,
            'rest': g[side + '_rest'].values, 'opp_rest': g[opp + '_rest'].values,
            'win_prob': (g.p_home if home else 1 - g.p_home).values,
            'points_out': g[side + '_score'].values, 'opp_points_out': g[opp + '_score'].values})
        x['kickoff_utc'] = pd.to_datetime(g.kickoff_utc.to_numpy(), utc=True)
        x['margin'] = x.spread_line if home else -x.spread_line   # nflverse spread_line: the home side's expected margin
        rows.append(x)
    gl = pd.concat(rows, ignore_index=True)
    gl['implied'] = gl.total_line / 2 + gl.margin / 2
    gl['opp_implied'] = gl.total_line / 2 - gl.margin / 2
    assert not gl.duplicated(['season', 'week', 'team']).any()
    return gl


def read_seasons(data, kind, seasons, **kw):
    out = []
    for y in seasons:
        p = F.path(data, kind, y)
        if not os.path.exists(p):
            raise SystemExit('missing %s (run without --no-fetch)' % p)
        out.append(pd.read_parquet(p, **kw) if p.endswith('.parquet') else pd.read_csv(p, low_memory=False, **kw))
    return pd.concat(out, ignore_index=True)


def load_stats(data, seasons, cutoff):
    want = set(['player_id', 'player_display_name', 'position', 'season', 'week', 'season_type', 'team',
                'opponent_team'] + STAT_COLS)
    s = read_seasons(data, 'stats', seasons, usecols=lambda c: c in want)
    s = s[s.season_type == 'REG'].copy()
    s['tkey'] = s.season * 100 + s.week
    if cutoff:
        s = s[s.tkey <= cutoff]
    s['team'] = tn(s.team)
    for c in STAT_COLS:
        s[c] = pd.to_numeric(s[c], errors='coerce').fillna(0) if c != 'passing_epa' else pd.to_numeric(s[c], errors='coerce')
    s['kick_pts'] = (3 * (s.fg_made_0_19 + s.fg_made_20_29 + s.fg_made_30_39) + 4 * s.fg_made_40_49
                     + 5 * (s.fg_made_50_59 + s.fg_made_60_) + s.pat_made)
    s['rush_rec_yards'] = s.rushing_yards + s.receiving_yards
    s['rush_rec_tds'] = s.rushing_tds + s.receiving_tds
    s['any_td'] = (s.rush_rec_tds >= 1).astype(float)
    s = s.rename(columns={'player_id': 'pid', 'player_display_name': 'name', 'position': 'pos_stats'})
    return s


def load_rosters(data, seasons, cutoff):
    want = {'season', 'team', 'position', 'status', 'full_name', 'birth_date', 'height', 'weight', 'gsis_id',
            'pfr_id', 'years_exp', 'week', 'game_type', 'entry_year', 'rookie_year', 'draft_number'}
    r = read_seasons(data, 'roster', seasons, usecols=lambda c: c in want)
    r = r[(r.game_type == 'REG') & r.gsis_id.notna() & (r.gsis_id != '')].copy()
    r['tkey'] = r.season * 100 + r.week
    if cutoff:
        r = r[r.tkey <= cutoff]
    r['team'] = tn(r.team)
    r = r.rename(columns={'gsis_id': 'pid'})
    return r


def load_players(data):
    keep = ['gsis_id', 'display_name', 'pfr_id', 'birth_date', 'draft_year', 'draft_round', 'draft_pick', 'position']
    p = pd.read_csv(F.players_path(data), usecols=keep, low_memory=False)   # never its as-of-now columns
    return p.rename(columns={'gsis_id': 'pid'})


def load_snaps(data, seasons, cutoff, players, rosters):
    s = read_seasons(data, 'snaps', seasons)
    s = s[s.game_type == 'REG'].copy()
    s['tkey'] = s.season * 100 + s.week
    if cutoff:
        s = s[s.tkey <= cutoff]
    s['team'] = tn(s.team)
    m = dict(zip(players.pfr_id.dropna(), players.pid[players.pfr_id.notna()]))
    rm = rosters[rosters.pfr_id.notna()].drop_duplicates('pfr_id')
    for k, v in zip(rm.pfr_id, rm.pid):
        m.setdefault(k, v)
    s['pid'] = s.pfr_player_id.map(m)
    s['how'] = np.where(s.pid.notna(), 'pfr', None)
    # by name within the club's season roster, only where exactly one rostered player has the name
    miss = s.pid.isna()
    if miss.any():
        rr = rosters[['season', 'team', 'pid', 'full_name']].drop_duplicates(['season', 'team', 'pid'])
        rr['nk'] = rr.full_name.map(norm_name)
        uniq = rr.groupby(['season', 'team', 'nk']).pid.agg(lambda x: x.iloc[0] if x.nunique() == 1 else None).dropna()
        key = list(zip(s.loc[miss, 'season'], s.loc[miss, 'team'], s.loc[miss, 'player'].map(norm_name)))
        got = [uniq.get(k) for k in key]
        s.loc[miss, 'pid'] = got
        s.loc[miss & s.pid.notna(), 'how'] = 'name'
    unmatched = s[s.pid.isna()]
    s = s[s.pid.notna()].copy()
    s = (s.sort_values('offense_snaps', ascending=False)
          .drop_duplicates(['season', 'week', 'team', 'pid']))
    s = s.rename(columns={'offense_snaps': 'off_snaps', 'offense_pct': 'off_pct', 'position': 'pos_snap'})
    return s[['season', 'week', 'tkey', 'team', 'pid', 'player', 'pos_snap', 'off_snaps', 'off_pct', 'st_snaps',
              'st_pct', 'how']], unmatched


PBP_COLS = ['game_id', 'season', 'week', 'season_type', 'posteam', 'defteam', 'play_type', 'qb_dropback',
            'qb_scramble', 'pass_attempt', 'sack', 'rush_attempt', 'passer_id', 'rusher_player_id',
            'receiver_player_id', 'two_point_attempt', 'yardline_100', 'air_yards', 'yards_gained', 'passing_yards',
            'rushing_yards', 'epa', 'qb_epa', 'success', 'cpoe', 'pass_oe', 'wp', 'down', 'qtr',
            'half_seconds_remaining', 'field_goal_attempt', 'kicker_player_id', 'kick_distance', 'weather']


def load_pbp(data, seasons, cutoff):
    out = []
    for y in seasons:
        p = pd.read_parquet(F.path(data, 'pbp', y), columns=PBP_COLS)
        p = p[p.season_type == 'REG']
        if cutoff:
            p = p[p.season * 100 + p.week <= cutoff]
        out.append(p)
    p = pd.concat(out, ignore_index=True)
    p['posteam'] = tn(p.posteam)
    p['defteam'] = tn(p.defteam)
    return p


def game_weather(p):
    """per game: temperature, wind and rain/snow parsed from the play-by-play's gamebook weather line (the
    report at kickoff), which carries them for games where games.csv's temp and wind are empty"""
    w = p.groupby('game_id').weather.first().astype('string')
    t = pd.to_numeric(w.str.extract(r'Temp:\s*(-?\d+)', expand=False), errors='coerce')
    wd = pd.to_numeric(w.str.extract(r'Wind:[^,]*?(\d+)\s*mph', expand=False), errors='coerce')
    calm = w.str.contains(r'Wind:\s*(?:calm|none)', case=False, na=False)
    wd = wd.where(~calm, 0)
    wet = w.str.contains(r'rain|snow|shower|drizzle|sleet|flurr', case=False, na=False)
    return pd.DataFrame({'game_id': w.index, 'wx_temp': t.to_numpy(), 'wx_wind': wd.to_numpy(),
                         'wx_wet': wet.astype(int).to_numpy(), 'wx_known': w.notna().astype(int).to_numpy()})


def pbp_aggregates(p):
    """per team-game offence, per defence-game allowed, per player-game usage"""
    p = p[p.posteam.notna()].copy()
    for c in ('qb_dropback', 'qb_scramble', 'pass_attempt', 'sack', 'rush_attempt', 'two_point_attempt',
              'field_goal_attempt'):
        p[c] = p[c].fillna(0)
    isplay = p.play_type.isin(['pass', 'run']) & (p.two_point_attempt != 1)
    p['is_db'] = (isplay & (p.qb_dropback == 1)).astype(int)
    p['is_drush'] = (isplay & (p.play_type == 'run') & (p.rush_attempt == 1) & (p.qb_scramble != 1)).astype(int)
    p['is_patt'] = (isplay & (p.play_type == 'pass') & (p.pass_attempt == 1) & (p.sack != 1)).astype(int)
    p['is_tgt'] = ((p.is_patt == 1) & p.receiver_player_id.notna()).astype(int)
    p['is_play'] = ((p.is_db == 1) | (p.is_drush == 1)).astype(int)
    rz = p.yardline_100 <= 20
    p['rz_play'] = (p.is_play & rz).astype(int)
    p['rz_tgt'] = (p.is_tgt & rz).astype(int)
    p['rz_drush'] = (p.is_drush & rz).astype(int)
    p['gl_drush'] = (p.is_drush & (p.yardline_100 <= 5)).astype(int)
    p['ez_tgt'] = (p.is_tgt & (p.air_yards >= p.yardline_100)).astype(int)
    p['deep_tgt'] = (p.is_tgt & (p.air_yards >= 20)).astype(int)
    p['ay_t'] = np.where(p.is_tgt == 1, p.air_yards.fillna(0), 0.0)
    p['sack_db'] = ((p.is_db == 1) & (p.sack == 1)).astype(int)
    p['epa_db'] = np.where(p.is_db == 1, p.epa.fillna(0), 0.0)
    p['epa_rush'] = np.where(p.is_drush == 1, p.epa.fillna(0), 0.0)
    p['succ_db'] = np.where(p.is_db == 1, p.success.fillna(0), 0.0)
    p['succ_rush'] = np.where(p.is_drush == 1, p.success.fillna(0), 0.0)
    pv = p.is_play.astype(bool) & p.pass_oe.notna()
    p['proe_sum'] = np.where(pv, p.pass_oe, 0.0) / 100.0   # nflverse writes pass_oe in percentage points
    p['proe_n'] = pv.astype(int)
    neu = p.is_play.astype(bool) & p.wp.between(0.2, 0.8) & (p.down <= 2) & (p.half_seconds_remaining > 120) & (p.qtr <= 4)
    p['neu_plays'] = neu.astype(int)
    p['neu_db'] = (neu & (p.is_db == 1)).astype(int)
    p['expl_pass'] = ((p.is_db == 1) & (p.yards_gained >= 20)).astype(int)
    p['expl_rush'] = ((p.is_drush == 1) & (p.yards_gained >= 10)).astype(int)
    p['pass_yds'] = np.where(p.is_db == 1, p.passing_yards.fillna(0), 0.0)
    p['rush_yds'] = np.where(p.is_drush == 1, p.rushing_yards.fillna(0), 0.0)
    p['fga'] = (p.field_goal_attempt == 1).astype(int)
    agg = dict(plays=('is_play', 'sum'), db=('is_db', 'sum'), drush=('is_drush', 'sum'), patt=('is_patt', 'sum'),
               tgt=('is_tgt', 'sum'), air_yards=('ay_t', 'sum'), rz_plays=('rz_play', 'sum'), rz_tgt=('rz_tgt', 'sum'),
               rz_drush=('rz_drush', 'sum'), gl_drush=('gl_drush', 'sum'), sacks=('sack_db', 'sum'),
               epa_db_sum=('epa_db', 'sum'), epa_rush_sum=('epa_rush', 'sum'), succ_db=('succ_db', 'sum'),
               succ_rush=('succ_rush', 'sum'), proe_sum=('proe_sum', 'sum'), proe_n=('proe_n', 'sum'),
               neu_plays=('neu_plays', 'sum'), neu_db=('neu_db', 'sum'), expl_pass=('expl_pass', 'sum'),
               expl_rush=('expl_rush', 'sum'), pass_yds=('pass_yds', 'sum'), rush_yds=('rush_yds', 'sum'),
               fg_att=('fga', 'sum'))
    team = p.groupby(['season', 'week', 'posteam']).agg(**agg).reset_index().rename(columns={'posteam': 'team'})
    dfn = p[p.defteam.notna()].groupby(['season', 'week', 'defteam']).agg(**agg).reset_index().rename(columns={'defteam': 'team'})
    # player usage
    rec = p[p.is_tgt == 1].groupby(['season', 'week', 'posteam', 'receiver_player_id']).agg(
        tgt=('is_tgt', 'sum'), air_yards=('ay_t', 'sum'), rz_tgt=('rz_tgt', 'sum'), ez_tgt=('ez_tgt', 'sum'),
        deep_tgt=('deep_tgt', 'sum')).reset_index().rename(columns={'receiver_player_id': 'pid'})
    rus = p[p.is_drush == 1].groupby(['season', 'week', 'posteam', 'rusher_player_id']).agg(
        car_d=('is_drush', 'sum'), rz_car=('rz_drush', 'sum'), gl_car=('gl_drush', 'sum')).reset_index().rename(
        columns={'rusher_player_id': 'pid'})
    q = p[(p.is_db == 1) & p.passer_id.notna()].copy()
    q['scr'] = (q.qb_scramble == 1).astype(int)
    q['cv'] = q.cpoe.notna() & (q.is_patt == 1)
    q['cpoe_s'] = np.where(q.cv, q.cpoe, 0.0)
    q['qepa'] = q.qb_epa.fillna(q.epa).fillna(0)
    qb = q.groupby(['season', 'week', 'posteam', 'passer_id']).agg(
        db=('is_db', 'sum'), scrambles=('scr', 'sum'), qb_epa=('qepa', 'sum'), cpoe_sum=('cpoe_s', 'sum'),
        cpoe_n=('cv', 'sum')).reset_index().rename(columns={'passer_id': 'pid'})
    k = p[p.fga == 1].copy()
    k['fg50'] = (k.kick_distance >= 50).astype(int)
    kk = k.groupby(['season', 'week', 'posteam', 'kicker_player_id']).agg(fg50_att=('fg50', 'sum')).reset_index().rename(
        columns={'kicker_player_id': 'pid'})
    pl = rec.merge(rus, on=['season', 'week', 'posteam', 'pid'], how='outer')
    pl = pl.merge(qb, on=['season', 'week', 'posteam', 'pid'], how='outer')
    pl = pl.merge(kk, on=['season', 'week', 'posteam', 'pid'], how='outer')
    pl = pl.rename(columns={'posteam': 'team'})
    return team, dfn, pl


def load_depth(data, seasons, cutoff, gl):
    """(season, week, team, pid, dgrp, depth) listings, depth 1 = first on the chart in his slot"""
    out = []
    for y in seasons:
        d = pd.read_csv(F.path(data, 'depth', y), low_memory=False)
        if 'dt' not in d.columns:      # weekly charts (through 2024)
            d = d[d.game_type == 'REG'].copy()
            d['team'] = tn(d.club_code)
            dp = d.depth_position.astype('string').str.strip()
            dp = dp.where(dp.notna() & (dp != ''), d.position.astype('string').str.strip())
            dmap = {'QB': 'QB', 'RB': 'RB', 'HB': 'RB', 'FB': 'FB', 'F': 'FB', 'TE': 'TE', 'TE/HB': 'TE', 'H-B': 'TE',
                    'WR': 'WR', 'LWR': 'WR', 'RWR': 'WR', 'SWR': 'WR', 'K': 'K', 'PK': 'K'}
            off = d.formation.isin(['Offense', 'Special Teams'])
            d['dgrp'] = dp.map(dmap)
            d = d[off & d.dgrp.notna() & d.gsis_id.notna()]
            d = d[~((d.formation == 'Offense') & (d.dgrp == 'K')) & ~((d.formation == 'Special Teams') & (d.dgrp != 'K'))]
            d = d.rename(columns={'gsis_id': 'pid', 'depth_team': 'depth'})
            d['week'] = d.week.astype(int)
            d['season'] = y
            d['depth_src'] = 'weekly'
            out.append(d[['season', 'week', 'team', 'pid', 'dgrp', 'depth', 'depth_src']])
        else:                          # daily snapshots (2025 on): the last one taken DC_LEAD_H hours before kickoff
            d = d[d.pos_abb.isin(['QB', 'RB', 'FB', 'WR', 'TE', 'PK']) & d.gsis_id.notna()].copy()
            d['team'] = tn(d.team)
            d['dt'] = pd.to_datetime(d.dt, utc=True)
            g = gl[gl.season == y][['season', 'week', 'team', 'kickoff_utc']].copy()
            if g.empty:
                continue
            d = d[d.dt <= g.kickoff_utc.max()]       # nothing taken after the last game the table holds
            g['cut'] = pd.to_datetime(g.kickoff_utc, utc=True) - pd.Timedelta(hours=DC_LEAD_H)
            snaps = d[['team', 'dt']].drop_duplicates().sort_values('dt')
            g = g.sort_values('cut')
            pick = pd.merge_asof(g, snaps.rename(columns={'dt': 'snap_dt'}), left_on='cut', right_on='snap_dt',
                                 by='team', direction='backward')
            pick = pick[pick.snap_dt.notna()]
            d = d.merge(pick[['season', 'week', 'team', 'snap_dt']], left_on=['team', 'dt'], right_on=['team', 'snap_dt'])
            d = d.sort_values(['season', 'week', 'team', 'pos_abb', 'pos_slot', 'pos_rank'])
            d['depth'] = d.groupby(['season', 'week', 'team', 'pos_abb', 'pos_slot']).cumcount() + 1
            d['dgrp'] = d.pos_abb.map({'QB': 'QB', 'RB': 'RB', 'FB': 'FB', 'WR': 'WR', 'TE': 'TE', 'PK': 'K'})
            d = d.rename(columns={'gsis_id': 'pid'})
            d['depth_src'] = 'daily'
            out.append(d[['season', 'week', 'team', 'pid', 'dgrp', 'depth', 'depth_src']])
    d = pd.concat(out, ignore_index=True)
    d['tkey'] = d.season * 100 + d.week
    if cutoff:
        d = d[d.tkey <= cutoff]
    d = d.groupby(['season', 'week', 'tkey', 'team', 'pid', 'dgrp', 'depth_src'], as_index=False).depth.min()
    return d


def load_injuries(data, seasons, cutoff):
    i = read_seasons(data, 'inj', seasons)
    i = i[i.game_type == 'REG'].copy()
    i['tkey'] = i.season * 100 + i.week
    if cutoff:
        i = i[i.tkey <= cutoff]
    i['team'] = tn(i.team)
    i = i[i.gsis_id.notna()]
    if 'date_modified' in i.columns:
        i = i.sort_values('date_modified')
    i = i.drop_duplicates(['season', 'week', 'team', 'gsis_id'], keep='last')
    return i.rename(columns={'gsis_id': 'pid'})[['season', 'week', 'tkey', 'team', 'pid', 'position', 'report_status',
                                                  'practice_status']]


# ------------------------------------------------------------------------------------------- rolling
def prior(df, gkey, metrics, wins, spans, prefix, season_col='season', post=None):
    """rolling features over strictly earlier rows of each group (df sorted by group, then time).
    car: mean of every earlier row; l1: the last row; l3: mean of the last three; ew<s>: exponentially
    weighted mean with span s rows (pandas' adjust=True weights, by row position, NaN rows skipped);
    szn: mean of earlier rows of the same season; prev: mean of the previous season's rows.
    post: metrics whose ew4 state *after* the row is also returned as post_<m>_ew4 (never a feature of
    that row: it is used only as of a later week)."""
    gcols = [gkey] if isinstance(gkey, str) else list(gkey)
    base = df[gcols].reset_index(drop=True).copy()
    j = base.groupby(gcols, sort=False).cumcount().to_numpy().astype(float)
    X = df[metrics].to_numpy(float)
    V = np.nan_to_num(X)
    N = (~np.isnan(X)).astype(float)
    vc = ['v%d' % i for i in range(len(metrics))]
    nc = ['n%d' % i for i in range(len(metrics))]
    fr = pd.concat([base, pd.DataFrame(V, columns=vc), pd.DataFrame(N, columns=nc)], axis=1)
    gg = fr.groupby(gcols, sort=False)
    out = {}

    def put(name, arr):
        out[name] = np.asarray(arr, float)
    if 'car' in wins:
        cs = gg[vc + nc].cumsum().to_numpy()
        pv, pn = cs[:, :len(vc)] - V, cs[:, len(vc):] - N
        for i, m in enumerate(metrics):
            put(f'{prefix}{m}_car', np.where(pn[:, i] > 0, pv[:, i] / np.where(pn[:, i] > 0, pn[:, i], 1), np.nan))
    if 'l1' in wins or 'l3' in wins:
        sh = [gg[vc + nc].shift(k).fillna(0).to_numpy() for k in (1, 2, 3)]
        for i, m in enumerate(metrics):
            k = len(vc) + i
            if 'l1' in wins:
                put(f'{prefix}{m}_l1', np.where(sh[0][:, k] > 0, sh[0][:, i], np.nan))
            if 'l3' in wins:
                s3 = sh[0][:, i] + sh[1][:, i] + sh[2][:, i]
                c3 = sh[0][:, k] + sh[1][:, k] + sh[2][:, k]
                put(f'{prefix}{m}_l3', np.where(c3 > 0, s3 / np.where(c3 > 0, c3, 1), np.nan))
    for sp in spans:
        w = np.power(1 - 2.0 / (sp + 1), -j)[:, None]
        assert np.isfinite(w).all(), 'ewm weights overflow: a group is too long for span %d' % sp
        wf = pd.concat([base, pd.DataFrame(w * V, columns=vc), pd.DataFrame(w * N, columns=nc)], axis=1)
        cs = wf.groupby(gcols, sort=False)[vc + nc].cumsum().to_numpy()
        sv, sn = cs[:, :len(vc)], cs[:, len(vc):]
        pv, pn = sv - w * V, sn - w * N
        for i, m in enumerate(metrics):
            ok = pn[:, i] > 0
            put(f'{prefix}{m}_ew{sp}', np.where(ok, pv[:, i] / np.where(ok, pn[:, i], 1), np.nan))
            if post is not None and m in post and sp == 4:
                ok2 = sn[:, i] > 0
                put(f'post_{m}_ew4', np.where(ok2, sv[:, i] / np.where(ok2, sn[:, i], 1), np.nan))
    if 'szn' in wins or 'prev' in wins:
        sg = gcols + ['__s']
        fr['__s'] = df[season_col].to_numpy()
        gs = fr.groupby(sg, sort=False)
        if 'szn' in wins:
            cs = gs[vc + nc].cumsum().to_numpy()
            pv, pn = cs[:, :len(vc)] - V, cs[:, len(vc):] - N
            for i, m in enumerate(metrics):
                ok = pn[:, i] > 0
                put(f'{prefix}{m}_szn', np.where(ok, pv[:, i] / np.where(ok, pn[:, i], 1), np.nan))
        if 'prev' in wins:
            tot = gs[vc + nc].sum().reset_index()
            tot['__s'] = tot['__s'] + 1
            mm = fr[sg].merge(tot, on=sg, how='left')
            for i, m in enumerate(metrics):
                n_ = mm[nc[i]].to_numpy()
                put(f'{prefix}{m}_prev', np.where(n_ > 0, mm[vc[i]].to_numpy() / np.where(n_ > 0, n_, 1), np.nan))
    return pd.DataFrame(out, index=df.index)


def ratio_cols(f, prefix, ratios, wins):
    out = {}
    for name, (a, b) in ratios.items():
        for w in wins:
            na, nb = f'{prefix}{a}_{w}', f'{prefix}{b}_{w}'
            if na in f and nb in f:
                den = f[nb]
                out[f'{prefix}r_{name}_{w}'] = (f[na] / den.where(den > 0)).to_numpy()
    return pd.DataFrame(out, index=f.index)


# ------------------------------------------------------------------------------------------- predict mode
def carry_roster(rost, gl, tk):
    """predict mode: a club playing in the target week whose weekly roster for that week is not posted yet keeps
    its latest earlier roster of the same season as that week's (a live run before nflverse posts it). A run made
    after the week finds it posted and carries nothing. Returns the rosters and the clubs carried."""
    season = tk // 100
    teams = set(gl.loc[gl.tkey == tk, 'team'])
    have = set(rost.loc[rost.tkey == tk, 'team'])
    miss, add = sorted(teams - have), []
    for t in miss:
        r = rost[(rost.team == t) & (rost.season == season) & (rost.tkey < tk)]
        if r.empty:
            continue
        x = r[r.tkey == r.tkey.max()].copy()
        x['week'] = tk % 100
        x['tkey'] = tk
        add.append(x)
    if add:
        rost = pd.concat([rost] + add, ignore_index=True)
    return rost, miss


def target_week_weather(data, pred):
    """predict mode: the target week's gamebook weather line (the report at kickoff, the build's weather source
    where games.csv has none), the one field of that week's play-by-play read, and only where the file already
    holds the game (a run after kickoff). Before kickoff there is none, and the week's weather is games.csv's
    alone (g_wet 0)."""
    s, w = pred
    p = F.path(data, 'pbp', s)
    empty = pd.DataFrame(columns=['game_id', 'wx_temp', 'wx_wind', 'wx_wet', 'wx_known'])
    if not os.path.exists(p):
        return empty
    x = pd.read_parquet(p, columns=['game_id', 'season', 'week', 'season_type', 'weather'])
    x = x[(x.season_type == 'REG') & (x.week == w)]
    return game_weather(x) if len(x) else empty


def predict_candidates(P, gl, rost, depth, tk):
    """predict mode: one row for every player who might play in the target week, made before any of its games:
    each club's depth-chart listings at QB, RB, FB, WR, TE and K that week; its weekly roster's active (or
    game-day inactive) players at those positions; and every player whose latest game was for the club within
    its last VAC_WINDOW games. A player is taken once, by that order, and from 2016 (when the weekly roster's
    rows are of the week) only at the club the week's roster lists him with, where it lists him. His position is the build's own rule (the
    weekly roster of this season as of the week, else his last game's, else the listing). Every outcome and
    same-game column is empty: the rolling features the build then computes for the row are of earlier games
    only, as for a row of a game played. Who actually plays is not known here; a prop on a player who does not
    play is void."""
    season, week = divmod(tk, 100)
    teams = set(gl.loc[gl.tkey == tk, 'team'])
    parts = []
    d = depth[(depth.tkey == tk) & depth.team.isin(teams)].sort_values(['depth', 'pid'])
    parts.append(pd.DataFrame({'team': d.team.values, 'pid': d.pid.values, 'hint_pos': d.dgrp.values,
                               'src': 0, 'cand_src': 'depth'}))
    r = rost[(rost.tkey == tk) & rost.team.isin(teams) & rost.status.isin(list(PRESENT))
             & rost.position.map(GRP).notna()].sort_values('pid')
    parts.append(pd.DataFrame({'team': r.team.values, 'pid': r.pid.values, 'hint_pos': r.position.values,
                               'src': 1, 'cand_src': 'roster'}))
    tg = gl[['team', 'tkey']].drop_duplicates().sort_values(['team', 'tkey'])
    tg['ti'] = tg.groupby('team').cumcount()
    last = P[P.tkey < tk].sort_values(['tkey', 'role_played']).groupby('pid').tail(1)
    h = last[['pid', 'team', 'tkey', 'pos', 'grp']].merge(tg, on=['team', 'tkey'], how='inner')
    h = h.merge(tg[tg.tkey == tk][['team', 'ti']].rename(columns={'ti': 'ti_w'}), on='team', how='inner')
    h = h[(h.ti_w - h.ti) <= VAC_WINDOW].sort_values('pid')
    parts.append(pd.DataFrame({'team': h.team.values, 'pid': h.pid.values, 'hint_pos': h.pos.values,
                               'src': 2, 'cand_src': 'history'}))
    c = pd.concat(parts, ignore_index=True)
    if season >= ROSTER_STATUS_FROM:
        # the weekly roster of the week, where it lists the player, says his club: a depth chart a trade has left
        # behind (a receiver traded in the week, still on his old club's chart) does not make him the old club's
        rw = rost[rost.tkey == tk][['pid', 'team', 'status']].copy()
        rw['act'] = rw.status.isin(list(PRESENT))
        rteam = rw.sort_values('act', ascending=False).drop_duplicates('pid').set_index('pid').team
        c = c[[rteam.get(p_, t_) == t_ for p_, t_ in zip(c.pid, c.team)]]
    c = c.sort_values(['src'], kind='stable').drop_duplicates('pid', keep='first')
    c['season'], c['week'], c['tkey'] = season, week, tk
    rpos = rost[['pid', 'tkey', 'position', 'full_name']].dropna(subset=['position']).sort_values('tkey')
    c = c.sort_values('tkey')
    c = pd.merge_asof(c, rpos.rename(columns={'position': 'pos_roster', 'tkey': 'rk'}), left_on='tkey',
                      right_on='rk', by='pid', direction='backward')
    c.loc[c.rk.notna() & (c.rk // 100 != c.season), 'pos_roster'] = np.nan
    lastp = last.set_index('pid')
    c['pos'] = c.pos_roster.fillna(c.pid.map(lastp.pos)).fillna(c.hint_pos)
    c['grp'] = c.pos.map(GRP)
    c.loc[c.grp.isna(), 'grp'] = c.loc[c.grp.isna(), 'pid'].map(lastp.grp)
    c.loc[c.grp.isna(), 'grp'] = c.loc[c.grp.isna(), 'hint_pos'].map(GRP)
    c['name'] = c.full_name.fillna(c.pid.map(lastp.name))
    c = c[c.grp.isin(GROUPS)]
    c = c[['season', 'week', 'tkey', 'team', 'pid', 'name', 'pos', 'grp', 'cand_src']].copy()
    c['stat_row'] = 0
    c['snap_row'] = 0
    c['candidate'] = 1
    c = c.merge(gl, on=['season', 'week', 'tkey', 'team'], how='inner')
    return c


# ------------------------------------------------------------------------------------------- build
def build(a):
    t0 = time.time()
    if a.last >= HOLDOUT_FROM:
        raise SystemExit('refused: %d is held out (HOLDOUT_FROM=%d)' % (a.last, HOLDOUT_FROM))
    cutoff = a.cutoff[0] * 100 + a.cutoff[1] if a.cutoff else None
    # predict mode (predict.py): the rows of one target week, before any of its games is played. What the week's
    # games produce (stats, snap counts, play-by-play) is read only up to the week before (cut_obs); what is known
    # before its kickoffs (the schedule and its lines, depth charts, injury reports, rosters) up to the week itself
    # (cut_pre). Without it both are `cutoff`, and the build is exactly as before.
    pred = getattr(a, 'predict', None)
    if pred:
        if cutoff:
            raise SystemExit('--cutoff and predict mode do not mix')
        cut_pre = pred[0] * 100 + pred[1]
        cut_obs = cut_pre - 1
    else:
        cut_pre = cut_obs = cutoff
    if not a.no_fetch:
        F.fetch(a.data, a.warmup_from, a.last, a.first, log=log)
    hist = list(range(a.warmup_from, a.last + 1))
    table = list(range(a.first, a.last + 1))
    summary = {'seasons': [a.first, a.last], 'warmup_from': a.warmup_from, 'cutoff': cutoff}

    gl = load_games(a.data, a.warmup_from, a.last, cut_pre)
    if pred:
        # the target week's scores are not known before kickoff (they would feed only later weeks' team points)
        gl.loc[gl.tkey == cut_pre, ['points_out', 'opp_points_out']] = np.nan
    log('games', len(gl) // 2)
    players = load_players(a.data)
    rost = load_rosters(a.data, hist, cut_pre)
    if pred:
        rost, summary['roster_carried'] = carry_roster(rost, gl, cut_pre)
    stats = load_stats(a.data, hist, cut_obs)
    snaps, unmatched = load_snaps(a.data, table, cut_obs, players, rost)
    summary['snaps'] = {'rows_matched': int(len(snaps)), 'by_name': int((snaps.how == 'name').sum()),
                        'unmatched_rows': int(len(unmatched)),
                        'unmatched_skill_rows_with_off_snaps': int(len(unmatched[unmatched.position.isin(list(GRP)) & (unmatched.offense_snaps > 0)]))}
    log('stats', len(stats), 'snaps', len(snaps), 'unmatched snap rows', len(unmatched))

    # ---- the player-game population
    s = stats[['season', 'week', 'tkey', 'team', 'pid', 'name', 'pos_stats'] + STAT_COLS +
              ['kick_pts', 'rush_rec_yards', 'rush_rec_tds', 'any_td']].copy()
    s['stat_row'] = 1
    sn = snaps.copy()
    sn['snap_row'] = 1
    P = s.merge(sn, on=['season', 'week', 'tkey', 'team', 'pid'], how='outer')
    P['stat_row'] = P.stat_row.fillna(0).astype(int)
    P['snap_row'] = P.snap_row.fillna(0).astype(int)
    # position as of that week: the weekly roster, else the stats file, else the snap file
    rpos = rost[['pid', 'tkey', 'position']].dropna().sort_values('tkey')
    P = P.sort_values('tkey')
    P = pd.merge_asof(P, rpos.rename(columns={'position': 'pos_roster', 'tkey': 'rk'}), left_on='tkey', right_on='rk',
                      by='pid', direction='backward')
    P.loc[P.rk.notna() & (P.rk // 100 != P.season), 'pos_roster'] = np.nan
    P['pos'] = P.pos_roster.fillna(P.pos_stats).fillna(P.pos_snap)
    P['grp'] = P.pos.map(GRP)
    # a player the stats file lists at a skill position plays in that group when the roster says otherwise
    alt = P.grp.isna() & P.pos_stats.map(GRP).notna()
    P.loc[alt, 'grp'] = P.loc[alt, 'pos_stats'].map(GRP)
    P = P[P.grp.notna()].copy()
    for c in STAT_COLS + ['kick_pts', 'rush_rec_yards', 'rush_rec_tds', 'any_td']:
        if c != 'passing_epa':
            P[c] = P[c].fillna(0.0)
    P['name'] = P.name.fillna(P.player)
    off_use = (P.attempts + P.carries + P.targets + P.sacks_suffered) > 0
    kicks = (P.fg_att + P.pat_att) > 0
    snap_era = P.season >= a.first
    off_snap = P.off_snaps.fillna(0) > 0
    st_snap = P.st_snaps.fillna(0) > 0
    isk = P.grp == 'K'
    role = np.where(isk, kicks | st_snap, off_use | off_snap | kicks)
    P['role_played'] = role.astype(int)
    P['zero_row'] = (role & ~np.where(isk, kicks, off_use)).astype(int)
    P['st_only'] = (~role & snap_era & (st_snap | (P.stat_row == 1))).astype(int)
    keep = role | (P.st_only == 1)
    keep &= snap_era | role          # warm-up seasons: no snap counts, so only rows with a stat in role
    P = P[keep].copy()
    # one row per player and game
    P = P.sort_values(['role_played', 'off_snaps'], ascending=False).drop_duplicates(['season', 'week', 'pid'])
    P = P.merge(gl, on=['season', 'week', 'tkey', 'team'], how='left')
    nogame = P.game_id.isna()
    summary['rows_without_game'] = int(nogame.sum())
    P = P[~nogame].copy()
    if pred:
        depth_pre = load_depth(a.data, [y for y in table], cut_pre, gl)
        cand = predict_candidates(P, gl, rost, depth_pre, cut_pre)
        summary['candidates_by_src'] = cand.cand_src.value_counts().to_dict()
        P['candidate'] = 0
        P = pd.concat([P, cand], ignore_index=True)

    # ---- play-by-play usage
    pbp = load_pbp(a.data, hist, cut_obs)
    team_g, def_g, pl_g = pbp_aggregates(pbp)
    wx = game_weather(pbp)
    del pbp
    if pred:
        wxw = target_week_weather(a.data, pred)
        wx = pd.concat([wx, wxw[~wxw.game_id.isin(wx.game_id)]], ignore_index=True)
        # the target week's team-games, with nothing played: their rolling features are of earlier games only
        wk = gl[gl.tkey == cut_pre][['season', 'week', 'team']]
        team_g = pd.concat([team_g, wk], ignore_index=True)
        def_g = pd.concat([def_g, wk], ignore_index=True)
    log('pbp aggregated', len(team_g), 'team-games')
    P = P.merge(pl_g, on=['season', 'week', 'team', 'pid'], how='left')
    for c in ('tgt', 'air_yards', 'rz_tgt', 'ez_tgt', 'deep_tgt', 'car_d', 'rz_car', 'gl_car', 'db', 'scrambles',
              'qb_epa', 'cpoe_sum', 'cpoe_n', 'fg50_att'):
        P[c] = P[c].fillna(0.0)
    tt = team_g[['season', 'week', 'team', 'plays', 'db', 'drush', 'tgt', 'air_yards', 'rz_tgt', 'rz_drush',
                 'gl_drush']].rename(columns=lambda c: c if c in ('season', 'week', 'team') else 'T_' + c)
    P = P.merge(tt, on=['season', 'week', 'team'], how='left')

    def share(num, den):
        d = P[den]
        return np.where(d > 0, P[num] / d, np.where(P[den].notna(), 0.0, np.nan))
    P['tgt_share'] = share('tgt', 'T_tgt')
    P['ay_share'] = np.where(P.T_air_yards > 0, P.air_yards / P.T_air_yards, np.where(P.T_air_yards.notna(), 0.0, np.nan))
    P['rz_tgt_share'] = share('rz_tgt', 'T_rz_tgt')
    P['car_share'] = share('car_d', 'T_drush')
    P['rz_car_share'] = share('rz_car', 'T_rz_drush')
    P['db_share'] = share('db', 'T_db')
    P['est_routes'] = P.off_snaps * P.T_db / P.T_plays.where(P.T_plays > 0)   # offensive snaps x the team's dropback rate that game
    P['opps'] = P.carries + P.targets
    P.loc[P.snap_row == 0, ['off_pct', 'off_snaps', 'st_pct', 'est_routes']] = np.nan

    # ---- player rolling features (career scope across seasons; szn and prev by season)
    P = P.sort_values(['pid', 'tkey']).reset_index(drop=True)
    log('player rows', len(P))
    f1 = prior(P, 'pid', PLAYER_FULL, WIN_FULL, (4, 10), 'p_', post=STATE_METRICS)
    f2 = prior(P, 'pid', PLAYER_LITE + ['opps'], WIN_LITE + ('car',), (4, 10), 'p_', post=STATE_METRICS)
    pf = pd.concat([f1, f2], axis=1)
    pf = pd.concat([pf, ratio_cols(pf, 'p_', RATIOS, ('ew10', 'szn', 'car'))], axis=1)
    post_cols = [c for c in pf.columns if c.startswith('post_')]
    drop_lite = [c for c in pf.columns if c.startswith('p_opps_') or c.endswith('_car') and any(
        c == f'p_{m}_car' for m in PLAYER_LITE)]
    P = pd.concat([P, pf.drop(columns=drop_lite)], axis=1)
    # trends: the last three games against the longer weighted mean (both of earlier games only)
    for m in ('off_pct', 'tgt_share', 'car_share', 'db_share'):
        P[f'p_{m}_trend'] = P[f'p_{m}_l3'] - P[f'p_{m}_ew10']
    # history counts and movement
    g = P.groupby('pid', sort=False)
    P['x_gp_car'] = g.cumcount()
    P['x_gp_szn'] = P.groupby(['pid', 'season'], sort=False).cumcount()
    P['x_last_team'] = g.team.shift(1)
    P['x_new_team'] = np.where(P.x_last_team.isna(), np.nan, (P.x_last_team != P.team).astype(float))
    lastday = g.gameday.shift(1)
    P['x_days_since_last'] = (P.gameday - lastday).dt.days
    P['x_first_game'] = P.x_last_team.isna().astype(int)
    # games with the current club in a row
    chg = (P.team != P.x_last_team).astype(int)
    P['_run'] = chg.groupby(P.pid).cumsum()
    P['x_gp_with_team'] = P.groupby(['pid', '_run']).cumcount()
    P = P.drop(columns=['_run'])
    gps = P.groupby(['pid', 'season']).size().rename('x_gp_prev').reset_index()
    gps['season'] += 1
    P = P.merge(gps, on=['pid', 'season'], how='left')
    P['x_gp_prev'] = P.x_gp_prev.fillna(0)
    # team games missed since his last game, and the team's games so far this season
    tgi = gl.sort_values(['team', 'tkey']).copy()
    tgi['tgidx'] = tgi.groupby('team').cumcount()
    tgi['t_gp_szn'] = tgi.groupby(['team', 'season']).cumcount()
    P = P.merge(tgi[['team', 'tkey', 'tgidx', 't_gp_szn']], on=['team', 'tkey'], how='left')
    P = P.sort_values(['pid', 'tkey']).reset_index(drop=True)
    prev_idx = P.groupby('pid').tgidx.shift(1)
    P['x_team_games_missed'] = np.where(P.x_new_team == 0, P.tgidx - prev_idx - 1, np.nan)
    P['x_gp_share_szn'] = P.x_gp_szn / P.t_gp_szn.where(P.t_gp_szn > 0)

    # ---- team and defence rolling features
    team_g = team_g.merge(gl[['season', 'week', 'team', 'tkey', 'points_out']], on=['season', 'week', 'team'], how='inner')
    team_g = team_g.rename(columns={'points_out': 'points'}).sort_values(['team', 'tkey']).reset_index(drop=True)
    tf = prior(team_g, 'team', TEAM_METRICS, ('szn',), (8,), 't_')
    tf = pd.concat([tf, ratio_cols(tf, 't_', TEAM_RATIOS, ('ew8', 'szn'))], axis=1)
    keepc = [f't_{m}_{w}' for m in TEAM_OUT for w in ('ew8', 'szn')] + [c for c in tf.columns if c.startswith('t_r_')]
    T = pd.concat([team_g[['season', 'week', 'team']], tf[keepc]], axis=1)
    def_g = def_g.merge(gl[['season', 'week', 'team', 'tkey', 'opp_points_out']], on=['season', 'week', 'team'], how='inner')
    def_g = def_g.rename(columns={'opp_points_out': 'points'}).sort_values(['team', 'tkey']).reset_index(drop=True)
    dmet = TEAM_METRICS + ['pass_yds', 'rush_yds']
    df_ = prior(def_g, 'team', dmet, ('szn',), (8,), 'd_')
    df_ = pd.concat([df_, ratio_cols(df_, 'd_', TEAM_RATIOS, ('ew8', 'szn'))], axis=1)
    keepd = [f'd_{m}_{w}' for m in DEF_OUT for w in ('ew8', 'szn')] + [c for c in df_.columns if c.startswith('d_r_')]
    D = pd.concat([def_g[['season', 'week', 'team', 'tkey']], df_[keepd]], axis=1)
    # relative to the mean of every defence playing that week (each value already as of before the week)
    for m in DEF_REL:
        col = f'd_{m}_ew8' if f'd_{m}_ew8' in D else f'd_r_{m}_ew8'
        mu = D.groupby('tkey')[col].transform('mean')
        D[f'd_{m}_rel'] = D[col] / mu
    D = D.drop(columns=['tkey']).rename(columns={'team': 'opp'})
    P = P.merge(T, on=['season', 'week', 'team'], how='left')
    P = P.merge(D, on=['season', 'week', 'opp'], how='left')

    # ---- what the opponent allowed to this position group
    oa_parts = []
    for grp, mets in OA_METRICS.items():
        x = P[P.grp == grp].groupby(['season', 'week', 'tkey', 'opp'])[mets].sum().reset_index()
        x = x.sort_values(['opp', 'tkey']).reset_index(drop=True)
        f = prior(x, 'opp', mets, ('szn',), (8,), 'oa_')
        f = f[[c for c in f.columns if c.endswith('_ew8') or c.endswith('_szn')]]
        x = pd.concat([x[['season', 'week', 'tkey', 'opp']], f], axis=1)
        for m in mets:
            mu = x.groupby('tkey')[f'oa_{m}_ew8'].transform('mean')
            x[f'oa_{m}_rel'] = x[f'oa_{m}_ew8'] / mu
        x['grp'] = grp
        oa_parts.append(x.drop(columns=['tkey']))
    OA = pd.concat(oa_parts, ignore_index=True)
    P = P.merge(OA, on=['season', 'week', 'opp', 'grp'], how='left')

    # ---- every player's usage state as of a week (after his latest earlier game): depth ties, teammates
    ST = P[['pid', 'tkey', 'season', 'team', 'grp'] + post_cols].sort_values(['pid', 'tkey']).reset_index(drop=True)
    ST['next_tkey'] = ST.groupby('pid').tkey.shift(-1)

    # ---- depth chart that week
    depth = depth_pre if pred else load_depth(a.data, [y for y in table], cutoff, gl)
    depth['dgrp2'] = depth.dgrp.replace({'FB': 'RB'})
    dq = depth.sort_values('tkey')
    dq = pd.merge_asof(dq, ST[['pid', 'tkey', 'post_targets_ew4', 'post_carries_ew4', 'post_db_ew4']].sort_values('tkey').rename(
        columns={'tkey': 'st_tkey'}), left_on='tkey', right_on='st_tkey', by='pid', direction='backward',
        allow_exact_matches=False)
    use = np.select([dq.dgrp2 == 'QB', dq.dgrp2 == 'RB'], [dq.post_db_ew4, dq.post_carries_ew4 + dq.post_targets_ew4],
                    dq.post_targets_ew4)
    dq['use'] = np.nan_to_num(use, nan=-1.0)
    dq['fbord'] = (dq.dgrp == 'FB').astype(int)
    dq = dq.sort_values(['tkey', 'team', 'dgrp2', 'depth', 'fbord', 'use', 'pid'], ascending=[True, True, True, True, True, False, True])
    dq['rank'] = dq.groupby(['tkey', 'team', 'dgrp2']).cumcount() + 1
    dq['n1'] = dq.groupby(['tkey', 'team', 'dgrp2']).depth.transform(lambda x: (x == 1).sum())
    own = dq.groupby(['tkey', 'team', 'pid', 'dgrp2']).agg(dc_depth=('depth', 'min'), dc_rank=('rank', 'min'),
                                                           dc_n_starters=('n1', 'first'), dc_fb=('fbord', 'min')).reset_index()
    anyl = dq.groupby(['tkey', 'team', 'pid']).agg(dc_depth_any=('depth', 'min')).reset_index()
    has_chart = dq[['tkey', 'team']].drop_duplicates()
    has_chart['dc_team_chart'] = 1
    P = P.merge(own.rename(columns={'dgrp2': 'grp'}), on=['tkey', 'team', 'pid', 'grp'], how='left')
    P = P.merge(anyl, on=['tkey', 'team', 'pid'], how='left')
    P = P.merge(has_chart, on=['tkey', 'team'], how='left')
    P['dc_team_chart'] = P.dc_team_chart.fillna(0).astype(int)
    P['dc_listed'] = np.where(P.dc_team_chart == 1, P.dc_depth_any.notna().astype(float), np.nan)
    P['dc_offpos'] = np.where(P.dc_team_chart == 1, (P.dc_depth.isna() & P.dc_depth_any.notna()).astype(float), np.nan)
    # the team's QB1 on the chart, and whether he is the quarterback who dropped back most in the team's last game
    qb1 = dq[(dq.dgrp2 == 'QB') & (dq['rank'] == 1)][['tkey', 'team', 'pid']].rename(columns={'pid': 'dc_qb1'})
    lastqb = pl_g[pl_g.db.notna()].merge(gl[['season', 'week', 'team', 'tkey']], on=['season', 'week', 'team'])
    lastqb = lastqb.sort_values(['team', 'tkey', 'db'], ascending=[True, True, False]).drop_duplicates(['team', 'tkey'])
    lastqb = lastqb[['team', 'tkey', 'pid']].rename(columns={'pid': 'qb_lead', 'tkey': 'lk'})
    tg2 = gl[['team', 'tkey', 'season']].sort_values(['team', 'tkey']).copy()
    tg2['lk'] = tg2.groupby('team').tkey.shift(1)
    tg2 = tg2.merge(lastqb, on=['team', 'lk'], how='left')
    qb1 = qb1.merge(tg2[['team', 'tkey', 'qb_lead']], on=['team', 'tkey'], how='left')
    qb1['dc_qb_change'] = np.where(qb1.qb_lead.isna(), np.nan, (qb1.dc_qb1 != qb1.qb_lead).astype(float))
    # QB1's experience: his earlier games (any club) and his dropback EPA before this week
    qst = P[P.grp == 'QB'][['pid', 'tkey', 'x_gp_car', 'p_r_epa_db_ew10']].sort_values('tkey')
    qb1 = qb1.sort_values('tkey')
    qb1 = pd.merge_asof(qb1, qst.rename(columns={'pid': 'dc_qb1', 'tkey': 'qk'}), left_on='tkey', right_on='qk',
                        by='dc_qb1', direction='backward', allow_exact_matches=False)
    qb1['dc_qb1_gp'] = qb1.x_gp_car.fillna(-1) + 1      # games before his previous one + that one; 0 = none
    qb1.loc[qb1.qk.isna(), 'dc_qb1_gp'] = 0
    qb1 = qb1.rename(columns={'p_r_epa_db_ew10': 'dc_qb1_epa_db'})
    P = P.merge(qb1[['tkey', 'team', 'dc_qb1', 'dc_qb_change', 'dc_qb1_gp', 'dc_qb1_epa_db']], on=['tkey', 'team'], how='left')
    P['dc_is_qb1'] = np.where(P.dc_qb1.notna(), (P.dc_qb1 == P.pid).astype(float), np.nan)
    summary['depth'] = {'listings': int(len(depth)), 'team_weeks_with_chart': int(len(has_chart))}

    # ---- injuries and availability that week
    inj = load_injuries(a.data, table, cut_pre)
    io = inj[['tkey', 'team', 'pid', 'report_status', 'practice_status']].rename(
        columns={'report_status': 'inj_status', 'practice_status': 'inj_practice'})
    P = P.merge(io, on=['tkey', 'team', 'pid'], how='left')
    for k, lab in (('out', 'Out'), ('doubtful', 'Doubtful'), ('questionable', 'Questionable'), ('probable', 'Probable')):
        P[f'inj_{k}'] = (P.inj_status == lab).astype(int)
    pr = P.inj_practice.fillna('').str.lower()
    P['inj_dnp'] = pr.str.contains('did not').astype(int)
    P['inj_limited'] = pr.str.contains('limited').astype(int)
    P['inj_listed'] = P.inj_status.notna().astype(int) | P.inj_practice.notna().astype(int)
    P = P.drop(columns=['inj_status', 'inj_practice'])
    inj['out'] = inj.report_status.isin(OUT_STATUS)
    ol = inj[inj.out & inj.position.isin(OL_POS)].groupby(['tkey', 'team']).size().rename('tm_ol_out')
    dbo = inj[inj.out & inj.position.isin(DB_POS)].groupby(['tkey', 'team']).size().rename('od_db_out')
    fro = inj[inj.out & inj.position.isin(FRONT_POS)].groupby(['tkey', 'team']).size().rename('od_front_out')
    P = P.merge(ol.reset_index(), on=['tkey', 'team'], how='left')
    P = P.merge(dbo.reset_index().rename(columns={'team': 'opp'}), on=['tkey', 'opp'], how='left')
    P = P.merge(fro.reset_index().rename(columns={'team': 'opp'}), on=['tkey', 'opp'], how='left')
    rep = inj.groupby(['tkey', 'team']).size().rename('n').reset_index()
    for c in ('tm_ol_out', 'od_db_out', 'od_front_out'):
        P[c] = P[c].fillna(0)
    P['inj_report_team'] = P.set_index(['tkey', 'team']).index.isin(rep.set_index(['tkey', 'team']).index).astype(int)

    # candidates for a team-week: every player whose latest game before it was for that team, within the
    # team's last RET_WINDOW games. gap = team games since his last one (1: he played the team's last game).
    # Absences count only for gap <= VAC_WINDOW (an older absence is already in the others' recent shares);
    # a present player with 2 <= gap is returning.
    TW = gl[['team', 'tkey', 'season']].sort_values(['team', 'tkey']).reset_index(drop=True)
    tarr = {t: x.tkey.to_numpy() for t, x in TW.groupby('team')}
    cand = []
    stc = ST[ST.season >= a.first - 1]
    for t, x in stc.groupby('team'):
        if t not in tarr:
            continue
        tk = tarr[t]
        nxt = x.next_tkey.fillna(10 ** 9).to_numpy()
        lo = np.searchsorted(tk, x.tkey.to_numpy(), side='right')
        hi = np.minimum(np.searchsorted(tk, nxt, side='right'), lo + RET_WINDOW)
        cnt = np.maximum(hi - lo, 0)
        rows = np.repeat(np.arange(len(x)), cnt)
        step = np.arange(cnt.sum()) - np.repeat(np.cumsum(cnt) - cnt, cnt)
        idx = np.repeat(lo, cnt) + step
        c = x.iloc[rows].reset_index(drop=True)
        c['q_tkey'] = tk[idx]
        c['gap'] = step + 1
        c['team'] = t
        cand.append(c)
    C = pd.concat(cand, ignore_index=True)
    C = C.rename(columns={'tkey': 'last_tkey'}).rename(columns={'q_tkey': 'tkey'})
    C = C[C.tkey // 100 >= a.first]
    # absent before kickoff: Out/Doubtful on the team's report, or off its active roster that week
    C = C.merge(inj[['tkey', 'team', 'pid', 'out']], on=['tkey', 'team', 'pid'], how='left')
    rw = rost[rost.season >= ROSTER_STATUS_FROM][['tkey', 'team', 'pid', 'status']].drop_duplicates(['tkey', 'pid', 'team'])
    rw_team = rw[['tkey', 'team']].drop_duplicates()
    rw_team['roster_known'] = 1
    C = C.merge(rw.rename(columns={'status': 'rstatus'}), on=['tkey', 'team', 'pid'], how='left')
    C = C.merge(rw_team, on=['tkey', 'team'], how='left')
    off_roster = (C.roster_known == 1) & ~C.rstatus.isin(PRESENT)
    C['absent'] = (C.out.fillna(False).astype(bool) | off_roster).astype(int)
    C['absent_inj'] = C.out.fillna(False).astype(bool).astype(int)
    C['returning'] = ((C.absent == 0) & (C.gap >= 2)).astype(int)
    C['absent_raw'] = C.absent
    recent = C.gap <= VAC_WINDOW
    C['absent'] = (C.absent.astype(bool) & recent).astype(int)
    C['absent_inj'] = (C.absent_inj.astype(bool) & recent).astype(int)
    for m in STATE_METRICS:
        C[f'post_{m}_ew4'] = C[f'post_{m}_ew4'].fillna(0)
    C['meaningful'] = ((C.post_tgt_share_ew4 >= 0.08) | (C.post_car_share_ew4 >= 0.15) | (C.post_db_share_ew4 >= 0.5)
                       | (C.post_off_pct_ew4 >= 0.4)).astype(int)
    C['meaningful'] = C.meaningful * recent.astype(int)
    rk = C[recent]
    C['tgt_rank'] = rk.groupby(['team', 'tkey']).post_tgt_share_ew4.rank(ascending=False, method='first')
    vac_m = {'tgt': 'post_tgt_share_ew4', 'ay': 'post_ay_share_ew4', 'car': 'post_car_share_ew4',
             'rz_tgt': 'post_rz_tgt_share_ew4', 'rz_car': 'post_rz_car_share_ew4'}
    for k, col in vac_m.items():
        C[f'va_{k}'] = C[col] * C.absent
        C[f'vi_{k}'] = C[col] * C.absent_inj
        C[f'rt_{k}'] = C[col] * C.returning
    C['top3_abs'] = ((C.tgt_rank <= 3) & (C.absent == 1)).astype(int)
    # the team's lead quarterback over its last QB_LEAD_WINDOW games, from play-by-play dropbacks
    tgx = gl[['team', 'tkey']].sort_values(['team', 'tkey']).copy()
    tgx['ti'] = tgx.groupby('team').cumcount()
    qg = pl_g[pl_g.db.fillna(0) > 0].merge(gl[['season', 'week', 'team', 'tkey']], on=['season', 'week', 'team'])
    qg = qg.merge(tgx, on=['team', 'tkey'])[['team', 'ti', 'pid', 'db']]
    qx = qg.loc[qg.index.repeat(QB_LEAD_WINDOW)].copy()
    qx['ti'] = qx.ti + np.tile(np.arange(1, QB_LEAD_WINDOW + 1), len(qg))
    lead = qx.groupby(['team', 'ti', 'pid']).db.sum().reset_index().sort_values(['team', 'ti', 'db', 'pid'],
                                                                                ascending=[True, True, False, True])
    lead = lead.drop_duplicates(['team', 'ti']).merge(tgx, on=['team', 'ti'])[['team', 'tkey', 'pid']]
    lead = lead.merge(C[['team', 'tkey', 'pid', 'absent_raw']], on=['team', 'tkey', 'pid'], how='left')
    # a lead QB with no candidate row for this team-week has played for another club since: gone
    lead['tm_qb_lead_absent'] = lead.absent_raw.fillna(1).astype(int)
    lead = lead.rename(columns={'pid': 'tm_qb_lead'})[['team', 'tkey', 'tm_qb_lead', 'tm_qb_lead_absent']]
    C['abs_m'] = C.absent * C.meaningful
    sums = [c for c in C.columns if c.startswith(('va_', 'vi_', 'rt_'))] + ['top3_abs', 'abs_m']
    if os.environ.get('PROPMODEL_DUMP_CANDIDATES'):
        C.to_parquet(os.environ['PROPMODEL_DUMP_CANDIDATES'], index=False)
    TWs = C.groupby(['team', 'tkey'])[sums].sum().reset_index()
    TWg = C.groupby(['team', 'tkey', 'grp']).agg(abs_m_grp=('abs_m', 'sum'), va_tgt_grp=('va_tgt', 'sum'),
                                                 va_car_grp=('va_car', 'sum')).reset_index()
    P = P.merge(TWs, on=['team', 'tkey'], how='left')
    P = P.merge(lead, on=['team', 'tkey'], how='left')
    # the lead quarterback's own row: he played, so the flag is about someone else only when he is not this player
    P.loc[P.tm_qb_lead == P.pid, 'tm_qb_lead_absent'] = 0
    P['tm_is_qb_lead'] = np.where(P.tm_qb_lead.notna(), (P.tm_qb_lead == P.pid).astype(float), np.nan)
    P = P.drop(columns=['tm_qb_lead'])
    P = P.merge(TWg, on=['team', 'tkey', 'grp'], how='left')
    # take the player himself out of the team sums (he played; his own row there is a data disagreement)
    me = C[['team', 'tkey', 'pid', 'grp'] + sums].rename(columns={c: 'me_' + c for c in sums}).rename(columns={'grp': 'me_grp'})
    P = P.merge(me, on=['team', 'tkey', 'pid'], how='left')
    for c in sums:
        P[c] = P[c].fillna(0) - P['me_' + c].fillna(0)
    samegrp = (P.me_grp == P.grp)
    for c, mc in (('abs_m_grp', 'abs_m'), ('va_tgt_grp', 'va_tgt'), ('va_car_grp', 'va_car')):
        P[c] = P[c].fillna(0) - np.where(samegrp, P['me_' + mc].fillna(0), 0)
    P = P.drop(columns=['me_' + c for c in sums] + ['me_grp'])
    ren = {f'va_{k}': f'tm_vac_{k}' for k in vac_m}
    ren.update({f'vi_{k}': f'tm_vac_inj_{k}' for k in vac_m})
    ren.update({f'rt_{k}': f'tm_ret_{k}' for k in vac_m})
    ren.update({'top3_abs': 'tm_top3_tgt_absent', 'abs_m': 'tm_n_absent',
                'abs_m_grp': 'tm_n_absent_grp', 'va_tgt_grp': 'tm_vac_tgt_grp', 'va_car_grp': 'tm_vac_car_grp'})
    P = P.rename(columns=ren)
    P['tm_roster_known'] = P.set_index(['tkey', 'team']).index.isin(rw_team.set_index(['tkey', 'team']).index).astype(int)
    summary['candidates'] = {'pairs': int(len(C)), 'absent': int(C.absent.sum()), 'absent_meaningful': int(C.abs_m.sum())}

    # ---- experience and static facts as of the week
    rf = rost[['pid', 'tkey', 'season', 'years_exp', 'rookie_year', 'entry_year', 'draft_number', 'birth_date',
               'height', 'weight']].sort_values('tkey')
    P = P.sort_values('tkey')
    P = pd.merge_asof(P, rf.rename(columns={'tkey': 'rfk', 'season': 'rf_season'}), left_on='tkey', right_on='rfk',
                      by='pid', direction='backward')
    pp = players[['pid', 'birth_date', 'draft_round', 'draft_pick', 'draft_year']].drop_duplicates('pid').rename(
        columns={'birth_date': 'bd2'})
    P = P.merge(pp, on='pid', how='left')
    bd = pd.to_datetime(P.birth_date.fillna(P.bd2), errors='coerce')
    P['x_age'] = (P.gameday - bd).dt.days / 365.25
    same = P.rf_season == P.season
    ye = pd.to_numeric(P.years_exp, errors='coerce')
    P['rookie_year'] = pd.to_numeric(P.rookie_year, errors='coerce')
    P['x_years_exp'] = np.where(same, ye, ye + (P.season - P.rf_season))
    P['x_rookie'] = np.where(P.rookie_year.notna(), (P.rookie_year == P.season).astype(float),
                             (P.x_years_exp == 0).astype(float))
    P['x_draft_number'] = pd.to_numeric(P.draft_number, errors='coerce')
    P['x_draft_round'] = pd.to_numeric(P.draft_round, errors='coerce')
    P['x_undrafted'] = (P.x_draft_number.isna() & P.x_draft_round.isna()).astype(int)
    P['x_height'] = pd.to_numeric(P.height, errors='coerce')
    P['x_weight'] = pd.to_numeric(P.weight, errors='coerce')

    # ---- game context, prefixed. Weather: games.csv's, else the gamebook line's; under a roof no wind
    P = P.merge(wx, on='game_id', how='left')
    P['g_dome'] = P.roof.isin(['dome', 'closed']).astype(int)
    P['temp'] = P.temp.fillna(P.wx_temp).where(P.g_dome == 0)
    P['wind'] = P.wind.fillna(P.wx_wind).where(P.g_dome == 0, 0)
    P['g_wet'] = np.where(P.g_dome == 1, 0, P.wx_wet.fillna(0)).astype(int)
    for c in ('is_home', 'neutral', 'div_game', 'spread_line', 'total_line', 'margin', 'implied', 'opp_implied',
              'win_prob', 'rest', 'opp_rest', 'temp', 'wind', 'roof', 'surface', 'kick_hour_et', 'weekday'):
        P['g_' + c] = P[c]

    # ---- outcomes, prefixed; snaps of the game are outcomes too
    for c in OUTCOMES:
        P['y_' + c] = P[c]
    P['y_off_snaps'] = P.off_snaps
    P['y_off_pct'] = P.off_pct

    P = P[(P.season >= a.first) & (P.season <= a.last)].copy()
    ident = ['season', 'week', 'tkey', 'game_id', 'gameday', 'kickoff_utc', 'pid', 'name', 'pos', 'grp', 'team', 'opp']
    flags = ['stat_row', 'snap_row', 'role_played', 'zero_row', 'st_only']
    feat = sorted([c for c in P.columns if c.startswith(('p_', 't_', 'd_', 'oa_', 'dc_', 'inj_', 'tm_', 'od_', 'x_', 'g_'))
                   and c not in ('x_last_team',)])
    feat = [c for c in feat if c != 't_gp_szn'] + ['t_gp_szn']
    ys = [c for c in P.columns if c.startswith('y_')]
    if pred:
        # the target week's candidate rows alone: identity, how each became a candidate, and the features
        P = P[P.candidate == 1]
        out = P[ident + ['cand_src'] + feat].sort_values(['game_id', 'team', 'grp', 'pid']).reset_index(drop=True)
        out['dc_qb1'] = out.dc_qb1.astype('string')
        summary['rows'] = int(len(out))
        summary['runtime_s'] = round(time.time() - t0, 1)
        return out, summary
    out = P[ident + flags + ys + feat].sort_values(['season', 'week', 'game_id', 'team', 'grp', 'pid']).reset_index(drop=True)
    out['dc_qb1'] = out.dc_qb1.astype('string')
    summary['runtime_s'] = round(time.time() - t0, 1)
    return out, summary


# ------------------------------------------------------------------------------------------- checks
def report(out, summary):
    s = summary
    s['rows'] = int(len(out))
    s['by_season_grp'] = {str(k): v for k, v in out.groupby(['season', 'grp']).size().unstack(fill_value=0).to_dict('index').items()}
    s['zero_rows_by_grp'] = out[out.zero_row == 1].groupby('grp').size().to_dict()
    s['st_only_by_grp'] = out[out.st_only == 1].groupby('grp').size().to_dict()
    s['zero_rows_by_season'] = {int(k): int(v) for k, v in out[out.zero_row == 1].groupby('season').size().items()}
    feat = [c for c in out.columns if c.startswith(('p_', 't_', 'd_', 'oa_', 'dc_', 'inj_', 'tm_', 'od_', 'x_', 'g_'))]
    role = out[out.role_played == 1]
    cov = role[feat].notna().mean()
    s['n_features'] = len(feat)
    fam = {}
    for c in feat:
        fam.setdefault(c.split('_')[0], []).append(cov[c])
    s['coverage_by_family'] = {k: {'n': len(v), 'median_nonnull': round(float(np.median(v)), 3), 'min': round(float(min(v)), 3)}
                               for k, v in fam.items()}
    key = ['p_targets_ew4', 'p_off_pct_ew4', 'p_tgt_share_ew4', 'p_car_share_ew4', 'p_db_share_ew4', 'dc_depth',
           'dc_rank', 'g_implied', 'g_win_prob', 'g_temp', 'g_wind', 'x_age', 'x_years_exp', 'oa_receiving_yards_ew8',
           'd_r_epa_db_ew8', 't_r_proe_ew8', 'tm_vac_tgt', 'dc_qb_change', 'p_r_tprr_ew10']
    s['columns_file'] = 'results/columns.json'
    s['coverage_key'] = {c: {str(y): round(float(v), 3) for y, v in role.groupby('season')[c].apply(lambda x: x.notna().mean()).items()}
                         for c in key if c in role}
    return s


def columns_table(out):
    """every column: its family, dtype and share non-null among rows where the player played his role"""
    role = out[out.role_played == 1]
    fams = {'y': 'outcome (post-game)', 'p': 'player, earlier games', 't': 'own team, earlier games',
            'd': 'opponent defence, earlier games', 'oa': 'opponent allowed to this group, earlier games',
            'dc': 'depth chart that week', 'inj': "player's own injury report that week",
            'tm': 'teammates available that week', 'od': "opponent's injury report that week",
            'x': 'experience and history counts', 'g': 'game: market, venue, weather'}
    rows = []
    for c in out.columns:
        f = c.split('_')[0]
        rows.append({'column': c, 'family': fams.get(f, 'id/flag'), 'dtype': str(out[c].dtype),
                     'nonnull_role_rows': round(float(role[c].notna().mean()), 4)})
    return rows


def leak_checks(out):
    res = {}
    # l1 of each player's game equals his previous row's outcome (the rolling sums take strictly earlier rows)
    o = out.sort_values(['pid', 'tkey'])
    prev = o.groupby('pid').y_receiving_yards.shift(1)
    m = prev.notna() & o.p_receiving_yards_l1.notna()
    res['l1_equals_previous_outcome'] = bool(np.allclose(prev[m], o.p_receiving_yards_l1[m]))
    # the vectorised exponentially weighted means equal pandas' own on earlier games, on players whose
    # whole history is in the table (no warm-up rows: their first table row has no earlier game)
    first = o.groupby('pid').x_gp_car.first()
    pids = first[first == 0].index[:600]
    z = o[o.pid.isin(pids)]
    ref = z.groupby('pid').y_receiving_yards.transform(lambda s: s.shift(1).ewm(span=4, adjust=True).mean())
    ok = ref.notna() & z.p_receiving_yards_ew4.notna()
    res['ew4_equals_pandas_on_players_first_seen_late'] = bool(np.allclose(ref[ok], z.p_receiving_yards_ew4[ok]))
    res['ew4_checked_rows'] = int(ok.sum())
    # no feature tracks a same-game outcome too closely
    role = out[out.role_played == 1]
    smp = role.sample(min(60000, len(role)), random_state=0)
    feat = [c for c in out.columns if c.startswith(('p_', 't_', 'd_', 'oa_', 'dc_', 'inj_', 'tm_', 'od_', 'x_', 'g_'))
            and pd.api.types.is_numeric_dtype(out[c])]
    # within the group each outcome belongs to, so that "QBs throw, receivers do not" is not mistaken for signal
    ys = {'QB': ['y_passing_yards', 'y_attempts', 'y_completions', 'y_passing_tds', 'y_rushing_yards'],
          'RB': ['y_rushing_yards', 'y_carries', 'y_receptions', 'y_rush_rec_yards', 'y_any_td'],
          'WR': ['y_receiving_yards', 'y_receptions', 'y_any_td'], 'TE': ['y_receiving_yards', 'y_receptions'],
          'K': ['y_kick_pts', 'y_fg_made']}
    worst = {}
    for grp, yl in ys.items():
        sg = smp[smp.grp == grp]
        X = sg[feat].astype(float)
        X = X.loc[:, (X.std() > 0) & (X.notna().sum() >= 300)]
        for y in yl:
            with np.errstate(all='ignore'):
                r = X.corrwith(sg[y].astype(float)).abs().sort_values(ascending=False)
            worst[f'{grp}:{y}'] = [r.index[0], round(float(r.iloc[0]), 3)]
    res['max_abs_corr_feature_vs_outcome_within_group'] = worst
    res['any_corr_above_0.9'] = any(v[1] > 0.9 for v in worst.values())
    return res


def compare(cut, full_path, cutoff):
    full = pd.read_parquet(full_path)
    full = full[full.tkey <= cutoff]
    k = ['game_id', 'pid']
    a_ = cut.set_index(k).sort_index()
    b_ = full.set_index(k).sort_index()
    res = {'rows_cut': int(len(a_)), 'rows_full_to_cutoff': int(len(b_)),
           'rows_only_in_one': int(len(a_.index.symmetric_difference(b_.index)))}
    common = a_.index.intersection(b_.index)
    a_, b_ = a_.loc[common], b_.loc[common]
    bad = {}
    for c in a_.columns:
        x, y = a_[c], b_[c]
        if pd.api.types.is_numeric_dtype(x) and pd.api.types.is_numeric_dtype(y):
            xv, yv = x.to_numpy(float), y.to_numpy(float)
            eq = (np.isclose(xv, yv, rtol=1e-9, atol=1e-9) | (np.isnan(xv) & np.isnan(yv)))
        else:
            eq = (x.astype('string').fillna('<NA>') == y.astype('string').fillna('<NA>')).to_numpy()
        if not eq.all():
            bad[c] = int((~eq).sum())
    res['columns_differing'] = bad
    res['ok'] = not bad and res['rows_only_in_one'] == 0
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'), required=os.environ.get('PROPMODEL_DATA') is None,
                    help='downloads go in DATA/raw, the table in DATA (outside the repo)')
    ap.add_argument('--first', type=int, default=2013, help='first season of the table (snap counts begin 2013)')
    ap.add_argument('--last', type=int, default=HOLDOUT_FROM - 1)
    ap.add_argument('--warmup-from', type=int, default=2010, help='earliest season read for history only')
    ap.add_argument('--out', default=None, help='default DATA/features.parquet')
    ap.add_argument('--no-fetch', action='store_true')
    ap.add_argument('--cutoff', type=int, nargs=2, metavar=('SEASON', 'WEEK'),
                    help='truncate every source after this week (the as-of test)')
    ap.add_argument('--compare', default=None, help='with --cutoff: the full build to hold the cut rows to')
    ap.add_argument('--predict', type=int, nargs=2, metavar=('SEASON', 'WEEK'),
                    help="predict mode: only that week's candidate rows, built before its games (predict.py uses it)")
    ap.add_argument('--summary', default=os.path.join(HERE, 'results', 'build_summary.json'))
    a = ap.parse_args()
    if a.predict:
        a.last = a.predict[0]
        out_path = a.out or os.path.join(a.data, 'predict_%d_w%02d.parquet' % tuple(a.predict))
        out, summary = build(a)
        out.to_parquet(out_path, index=False)
        log('wrote', out_path, out.shape, json.dumps(summary, default=str))
        return
    out_path = a.out or os.path.join(a.data, 'features.parquet')
    out, summary = build(a)
    out.to_parquet(out_path, index=False)
    log('wrote', out_path, out.shape)
    if a.cutoff:
        if a.compare:
            res = compare(out, a.compare, a.cutoff[0] * 100 + a.cutoff[1])
            log('as-of test', json.dumps(res))
            p = os.path.join(HERE, 'results', 'asof_test_%d_w%02d.json' % tuple(a.cutoff))
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'w') as f:
                json.dump(res, f, indent=1)
            if not res['ok']:
                raise SystemExit('as-of test FAILED: a feature saw a later week')
        return
    summary = report(out, summary)
    with open(os.path.join(os.path.dirname(a.summary), 'columns.json'), 'w') as f:
        json.dump(columns_table(out), f, indent=0)
    summary['leak_checks'] = leak_checks(out)
    os.makedirs(os.path.dirname(a.summary), exist_ok=True)
    with open(a.summary, 'w') as f:
        json.dump(summary, f, indent=1, default=str)
    log('summary', a.summary, 'runtime', summary['runtime_s'], 's')


if __name__ == '__main__':
    main()
