"""Build the shared, leak-free game-totals dataset: data/games.parquet.

One row per regular-season and playoff game 2010-2026 (2026: the games played so far and the
coming ones, with no result). Every pre-game feature is computed STRICTLY from games that kicked
off before this one:

  season-to-date  ({side}_{stat}_std)  : this season's games before this one, a ratio of sums
  last season     ({side}_{stat}_ls)   : the franchise's whole previous REGULAR season
  blend           ({side}_{stat})      : w*std + (1-w)*ls, w = n/(n+K_BLEND) in {side}_w_std
                                         (n = games this season before this one); candidates are
                                         free to re-blend from _std, _ls and {side}_n_std
  league context  (lg_*)               : every game on an earlier calendar date this season
  site proxy      ({side}_te_*/_de_*)  : the props app's team EWMs (offence span 6, defence span 8,
                                         adjust=True, one continuous regular-season stream across
                                         seasons, prior games only) and modelPoints() with its shipped
                                         coefficients (props/data/pts_model.json, read in
                                         place: SITE_PTS)
  quarterback                          : the passer with most dropbacks in the team's previous
                                         game (any season), whether that differed from the game
                                         before it, and games.csv's starter (known at kickoff)

Nothing about the game itself is used except what games.csv knows before kickoff: the schedule,
rest, the closing total and spread and their prices (the market's number), roof, surface and the
weather it records (temp and wind are the game-time readings: known, roughly, close to kickoff).
Outcome columns (scores, total, result, overtime, the game's own box) are kept for grading only
and are named in OUTCOME_COLS.

Run: python3 -I build_dataset.py   (from props/research/totals; reads data/raw/, writes data/)
"""
import os, sys, json
import warnings
import numpy as np, pandas as pd
warnings.filterwarnings('ignore', category=pd.errors.PerformanceWarning)

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'data', 'raw')           # fetch_raw.py fills it
SITE_PTS = os.path.join(HERE, '..', '..', 'data', 'pts_model.json')   # the shipped modelPoints coefficients
OUT = os.path.join(HERE, 'data', 'games.parquet')
FIRST, LAST = 2010, 2026          # rows in the dataset
WARM = 2009                       # read for last-season carry and the EWM warm-up only
K_BLEND = 4.0                     # default prior weight, in games, of last season in the blend
FRANCHISE = {'STL': 'LA', 'SD': 'LAC', 'OAK': 'LV'}   # relocations: carry last season across

PBP_COLS = ['game_id', 'season', 'posteam', 'defteam', 'play_type', 'pass', 'rush', 'qb_dropback',
            'sack', 'pass_attempt', 'rush_attempt', 'complete_pass', 'incomplete_pass', 'interception',
            'fumble_lost', 'fumbled_1_team', 'passing_yards', 'rushing_yards', 'yards_gained',
            'pass_touchdown', 'rush_touchdown', 'td_team', 'epa', 'success', 'yardline_100', 'down',
            'fixed_drive', 'fixed_drive_result', 'two_point_attempt', 'passer_id']


def fr(t):
    return FRANCHISE.get(t, t)


# ----------------------------------------------------------------------------- games
def load_games(cutoff=None):
    g = pd.read_csv(os.path.join(RAW, 'games', 'games.csv'), low_memory=False)
    g = g[g.season.between(WARM, LAST)].copy()
    g['gametime'] = g.gametime.fillna('13:00')
    g['kickoff'] = pd.to_datetime(g.gameday + ' ' + g.gametime)      # US Eastern, naive
    g['date'] = pd.to_datetime(g.gameday)
    if cutoff is not None:
        # the as-of test (leakage_check.py): the world as it stood on the morning of `cutoff`,
        # every game from that date on unplayed
        fut = g.date >= pd.Timestamp(cutoff)
        g.loc[fut, ['home_score', 'away_score', 'total', 'result', 'overtime']] = np.nan
    g['played'] = g.home_score.notna() & g.away_score.notna()
    return g


# ----------------------------------------------------------------------------- box per team-game
def team_box(season, keep_ids=None):
    """Offensive box per (game_id, posteam) from play-by-play. Scrimmage plays are play_type pass or
    run with pass or rush flagged and EPA present, two-point tries excluded (kneels and spikes are
    their own play types and are out)."""
    p = pd.read_parquet(os.path.join(RAW, 'pbp', f'play_by_play_{season}.parquet'), columns=PBP_COLS)
    p = p[p.posteam.notna()].copy()
    if keep_ids is not None:
        p = p[p.game_id.isin(keep_ids)].copy()
    for c in ['pass', 'rush', 'qb_dropback', 'sack', 'pass_attempt', 'rush_attempt', 'complete_pass',
              'incomplete_pass', 'interception', 'fumble_lost', 'pass_touchdown', 'rush_touchdown',
              'two_point_attempt', 'success']:
        p[c] = p[c].fillna(0)
    no2 = p.two_point_attempt != 1
    live = no2 & (p.play_type != 'no_play')
    scrim = p.play_type.isin(['pass', 'run']) & ((p['pass'] == 1) | (p['rush'] == 1)) & no2 & p.epa.notna()
    p['scrim'] = scrim.astype(int)
    p['epa_s'] = np.where(scrim, p.epa, 0.0)
    p['succ_s'] = np.where(scrim, p.success, 0)
    p['db_s'] = np.where(scrim, p['pass'], 0)
    p['expl_s'] = np.where(scrim & (((p['rush'] == 1) & (p.yards_gained >= 10)) |
                                    ((p['pass'] == 1) & (p.yards_gained >= 20))), 1, 0)
    p['int_s'] = np.where(no2, p.interception, 0)
    p['sack_s'] = np.where(no2, p.sack, 0)
    p['att_s'] = np.where(live & (p.pass_attempt == 1) & (p.sack == 0) &
                          ((p.complete_pass == 1) | (p.incomplete_pass == 1) | (p.interception == 1)), 1, 0)
    p['car_s'] = np.where(live & (p.rush_attempt == 1), 1, 0)
    p['pyds_s'] = np.where(live, p.passing_yards.fillna(0), 0)
    p['ryds_s'] = np.where(live, p.rushing_yards.fillna(0), 0)
    p['ptd_s'] = np.where(no2 & (p.pass_touchdown == 1) & (p.td_team == p.posteam), 1, 0)
    p['rtd_s'] = np.where(no2 & (p.rush_touchdown == 1) & (p.td_team == p.posteam), 1, 0)
    agg = p.groupby(['game_id', 'posteam']).agg(
        plays=('scrim', 'sum'), epa=('epa_s', 'sum'), succ=('succ_s', 'sum'), db=('db_s', 'sum'),
        expl=('expl_s', 'sum'), ints=('int_s', 'sum'), sacks=('sack_s', 'sum'), att=('att_s', 'sum'),
        car=('car_s', 'sum'), pyds=('pyds_s', 'sum'), ryds=('ryds_s', 'sum'), ptd=('ptd_s', 'sum'),
        rtd=('rtd_s', 'sum')).reset_index().rename(columns={'posteam': 'team'})
    # fumbles lost by the team, any phase (a muffed punt included), two-point tries excluded
    f = p[no2 & (p.fumble_lost == 1) & p.fumbled_1_team.notna()].groupby(['game_id', 'fumbled_1_team']).size()
    f = f.rename('fum').reset_index().rename(columns={'fumbled_1_team': 'team'})
    agg = agg.merge(f, on=['game_id', 'team'], how='left')
    agg['fum'] = agg.fum.fillna(0)
    agg['giveaways'] = agg.ints + agg.fum
    # red zone: a drive with a scrimmage snap (a down) at or inside the 20
    rz = p[p.down.notna() & (p.yardline_100 <= 20) & no2 & p.fixed_drive.notna()]
    d = rz.groupby(['game_id', 'posteam', 'fixed_drive']).fixed_drive_result.first().reset_index()
    d['rz_td'] = (d.fixed_drive_result == 'Touchdown').astype(int)
    d = d.groupby(['game_id', 'posteam']).agg(rz_trips=('rz_td', 'size'), rz_tds=('rz_td', 'sum')).reset_index()
    agg = agg.merge(d.rename(columns={'posteam': 'team'}), on=['game_id', 'team'], how='left')
    agg[['rz_trips', 'rz_tds']] = agg[['rz_trips', 'rz_tds']].fillna(0)
    # quarterback: the passer with most dropbacks (penalised dropbacks counted) and his share
    q = p[(p.qb_dropback == 1) & p.passer_id.notna()].groupby(['game_id', 'posteam', 'passer_id']).size()
    q = q.rename('n').reset_index().sort_values(['game_id', 'posteam', 'n', 'passer_id'],
                                                ascending=[True, True, False, True])
    tot = q.groupby(['game_id', 'posteam']).n.transform('sum')
    q['share'] = q.n / tot
    q = q.drop_duplicates(['game_id', 'posteam'])[['game_id', 'posteam', 'passer_id', 'share']]
    q = q.rename(columns={'posteam': 'team', 'passer_id': 'qb_top', 'share': 'qb_top_share'})
    agg = agg.merge(q, on=['game_id', 'team'], how='left')
    return agg


BOX = ['plays', 'epa', 'succ', 'db', 'expl', 'giveaways', 'sacks', 'rz_trips', 'rz_tds',
       'att', 'car', 'pyds', 'ryds', 'ptd', 'rtd']

# season-to-date / last-season stats: name -> (numerator, denominator); 'n' is games
STATS = {
    'pf_pg': ('pf', 'n'), 'pa_pg': ('pa', 'n'),
    'plays_pg': ('o_plays', 'n'), 'dplays_pg': ('d_plays', 'n'),
    'off_epa': ('o_epa', 'o_plays'), 'def_epa': ('d_epa', 'd_plays'),
    'off_sr': ('o_succ', 'o_plays'), 'def_sr': ('d_succ', 'd_plays'),
    'off_pass_rate': ('o_db', 'o_plays'), 'def_pass_rate': ('d_db', 'd_plays'),
    'off_expl': ('o_expl', 'o_plays'), 'def_expl': ('d_expl', 'd_plays'),
    'off_rz_td': ('o_rz_tds', 'o_rz_trips'), 'def_rz_td': ('d_rz_tds', 'd_rz_trips'),
    'off_rz_trips_pg': ('o_rz_trips', 'n'), 'def_rz_trips_pg': ('d_rz_trips', 'n'),
    'giveaways_pg': ('o_giveaways', 'n'), 'takeaways_pg': ('d_giveaways', 'n'),
    'sacks_taken_pg': ('o_sacks', 'n'), 'sacks_made_pg': ('d_sacks', 'n'),
}
SUMS = ['n', 'pf', 'pa'] + ['o_' + b for b in BOX] + ['d_' + b for b in BOX]


def ratio(num, den):
    num = np.asarray(num, float); den = np.asarray(den, float)
    with np.errstate(invalid='ignore', divide='ignore'):
        return np.where(den > 0, num / den, np.nan)


# ----------------------------------------------------------------------------- site proxy
SITE_T = {'t_pass_yds': 'o_pyds', 't_rush_yds': 'o_ryds', 't_tds': None, 't_plays': None,
          't_pass_att': 'o_att', 't_carries': 'o_car'}
SITE_D = {'d_pass_yds': 'd_pyds', 'd_rush_yds': 'd_ryds', 'd_tds': 'd_rtd', 'd_pass_att': 'd_att', 'd_carries': 'd_car'}


def ewm_prior(x, span):
    return x.shift(1).ewm(span=span, adjust=True, min_periods=1).mean()


def site_ewms(tg, reg_only=False):
    """te_/de_ columns: the props app's team EWMs, one continuous stream per franchise across
    seasons, prior games only. The live app seeds them at the end of last season as a converged
    prior and pushes each game (part2.js freshState / part3.js applyGame); this is the same EWM."""
    s = tg[tg.played].copy()
    if reg_only:
        s = s[s.game_type == 'REG']
    s['t_pass_yds'] = s.o_pyds; s['t_rush_yds'] = s.o_ryds; s['t_tds'] = s.o_ptd + s.o_rtd
    s['t_pass_att'] = s.o_att; s['t_carries'] = s.o_car; s['t_plays'] = s.o_att + s.o_car
    s['d_pass_yds'] = s.d_pyds; s['d_rush_yds'] = s.d_ryds; s['d_tds'] = s.d_rtd
    s['d_pass_att'] = s.d_att; s['d_carries'] = s.d_car
    s = s.sort_values(['fr', 'kickoff'])
    out = s[['game_id', 'team']].copy()
    for c in ['t_pass_yds', 't_rush_yds', 't_tds', 't_plays', 't_pass_att', 't_carries']:
        out['te_' + c] = s.groupby('fr', sort=False)[c].transform(lambda x: ewm_prior(x, 6))
    for c in ['d_pass_yds', 'd_rush_yds', 'd_tds', 'd_pass_att', 'd_carries']:
        out['de_' + c] = s.groupby('fr', sort=False)[c].transform(lambda x: ewm_prior(x, 8))
    # the EWM a game to come (or a playoff game, under reg_only) would see: the state after the
    # team's last game in the stream before its kickoff
    last = s.groupby('fr', sort=False)
    after = s[['fr', 'kickoff']].copy()
    for c in ['t_pass_yds', 't_rush_yds', 't_tds', 't_plays', 't_pass_att', 't_carries']:
        after['te_' + c] = last[c].transform(lambda x: x.ewm(span=6, adjust=True, min_periods=1).mean())
    for c in ['d_pass_yds', 'd_rush_yds', 'd_tds', 'd_pass_att', 'd_carries']:
        after['de_' + c] = last[c].transform(lambda x: x.ewm(span=8, adjust=True, min_periods=1).mean())
    return out, after


def attach_asof(tg, after, cols):
    """For rows the stream did not cover (games to come), the EWM state after the franchise's last
    game that kicked off before this one."""
    miss = tg[cols[0]].isna()
    if not miss.any():
        return tg
    a = after.sort_values('kickoff')
    m = tg.loc[miss, ['fr', 'kickoff']].reset_index().sort_values('kickoff')
    j = pd.merge_asof(m, a, on='kickoff', by='fr', allow_exact_matches=False, direction='backward')
    j = j.set_index('index')
    for c in cols:
        tg.loc[miss, c] = j[c]
    return tg


def site_model_points(te, de, home, P):
    v = np.full(len(te), P['coef'][0], float)
    for i, f in enumerate(P['feats']):
        src = te if f.startswith('te_') else de
        cur = src[f].to_numpy(float)
        cur = np.where(np.isnan(cur), P['means'][f], cur)
        v += P['coef'][i + 1] * (cur - P['means'][f])
    v += P['coef'][len(P['feats']) + 1] * home
    return np.clip(v, 3, 45)


# ----------------------------------------------------------------------------- build
def build(cutoff=None, write=True):
    g = load_games(cutoff)
    keep_ids = set(g[g.home_score.notna()].game_id) if cutoff is not None else None
    boxes = []
    for s in range(WARM, LAST + 1):
        if cutoff is not None and s > pd.Timestamp(cutoff).year:
            continue
        b = team_box(s, keep_ids); boxes.append(b)
        if write:
            print('pbp', s, len(b), file=sys.stderr)
    box = pd.concat(boxes, ignore_index=True)

    # team-game stream: one row per team per game
    base = ['game_id', 'season', 'week', 'game_type', 'kickoff', 'date', 'played']
    h = g[base + ['home_team', 'away_team', 'home_score', 'away_score']].rename(
        columns={'home_team': 'team', 'away_team': 'opp', 'home_score': 'pf', 'away_score': 'pa'})
    h['is_home'] = 1
    a = g[base + ['away_team', 'home_team', 'away_score', 'home_score']].rename(
        columns={'away_team': 'team', 'home_team': 'opp', 'away_score': 'pf', 'home_score': 'pa'})
    a['is_home'] = 0
    tg = pd.concat([h, a], ignore_index=True)
    tg['fr'] = tg.team.map(fr)
    tg['ofr'] = tg.opp.map(fr)
    # play-by-play names every club by its present code (LA, LAC, LV in 2009 too) while games.csv
    # keeps the code of the day (STL, SD, OAK): join on the franchise
    box['team'] = box.team.map(fr)
    ob = box.rename(columns={'team': 'fr', **{c: 'o_' + c for c in BOX + ['fum', 'ints', 'qb_top', 'qb_top_share']}})
    db = box[['game_id', 'team'] + BOX].rename(columns={'team': 'ofr', **{c: 'd_' + c for c in BOX}})
    tg = tg.merge(ob, on=['game_id', 'fr'], how='left').merge(db, on=['game_id', 'ofr'], how='left')
    # a game counts only once it is played and its box is read; a played game with no box would
    # be a silent hole, so it stops the build
    nobox = tg.played & tg.o_plays.isna()
    if nobox.any():
        raise SystemExit(f'{nobox.sum()} played team-games have no play-by-play: {tg[nobox].game_id.unique()[:5]}')
    tg['n'] = tg.played.astype(int)
    for c in SUMS[1:]:
        tg[c] = np.where(tg.played, tg[c], 0.0)
    tg = tg.sort_values(['fr', 'kickoff']).reset_index(drop=True)

    # season-to-date: cumulative sums of the team's games this season BEFORE this one
    gb = tg.groupby(['fr', 'season'], sort=False)
    cum = gb[SUMS].cumsum() - tg[SUMS]
    for k, (num, den) in STATS.items():
        tg[k + '_std'] = ratio(cum[num], cum[den])
    tg['n_std'] = cum['n']

    # last season: the franchise's whole previous regular season
    reg = tg[(tg.game_type == 'REG') & tg.played]
    ls = reg.groupby(['fr', 'season'])[SUMS].sum().reset_index()
    ls['season'] = ls.season + 1
    lsr = ls[['fr', 'season']].copy()
    for k, (num, den) in STATS.items():
        lsr[k + '_ls'] = ratio(ls[num], ls[den])
    lsr['n_ls'] = ls['n']
    tg = tg.merge(lsr, on=['fr', 'season'], how='left')

    # blend
    w = tg.n_std / (tg.n_std + K_BLEND)
    tg['w_std'] = w
    for k in STATS:
        s_, l_ = tg[k + '_std'], tg[k + '_ls']
        tg[k] = np.where(s_.isna(), l_, np.where(l_.isna(), s_, w * s_ + (1 - w) * l_))

    # quarterback: previous played game (any season, any game type)
    pl = tg[tg.played].sort_values(['fr', 'kickoff'])[['game_id', 'fr', 'o_qb_top', 'o_qb_top_share', 'kickoff']]
    pl['qb_prev'] = pl.groupby('fr').o_qb_top.shift(1)
    pl['qb_prev_share'] = pl.groupby('fr').o_qb_top_share.shift(1)
    pl['qb_prev2'] = pl.groupby('fr').o_qb_top.shift(2)
    tg = tg.merge(pl[['game_id', 'fr', 'qb_prev', 'qb_prev_share', 'qb_prev2']], on=['game_id', 'fr'], how='left')
    # games to come: the last played game's top passer is the previous one
    lastq = pl.groupby('fr').tail(2).groupby('fr').agg(
        q1=('o_qb_top', 'last'), s1=('o_qb_top_share', 'last'), q2=('o_qb_top', 'first'))
    fut = ~tg.played
    tg.loc[fut, 'qb_prev'] = tg.loc[fut, 'fr'].map(lastq.q1)
    tg.loc[fut, 'qb_prev_share'] = tg.loc[fut, 'fr'].map(lastq.s1)
    tg.loc[fut, 'qb_prev2'] = tg.loc[fut, 'fr'].map(lastq.q2)
    tg['qb_prev_changed'] = (tg.qb_prev.notna() & tg.qb_prev2.notna() & (tg.qb_prev != tg.qb_prev2)).astype(int)

    # site proxy EWMs: played games from the stream, games to come from the state as of kickoff
    ewm_cols = ['te_t_pass_yds', 'te_t_rush_yds', 'te_t_tds', 'te_t_plays', 'te_t_pass_att', 'te_t_carries',
                'de_d_pass_yds', 'de_d_rush_yds', 'de_d_tds', 'de_d_pass_att', 'de_d_carries']
    # regular season only, as the props research table (props/raw/feat.pkl) and so the shipped
    # coefficients were built: validate_site_proxy2.py matches that table at corr >= 0.9996 this
    # way. A playoff game takes the state after the team's last regular-season game.
    sw, after = site_ewms(tg, reg_only=True)
    tg = tg.merge(sw, on=['game_id', 'team'], how='left')
    tg = attach_asof(tg, after, ewm_cols)

    # league context: every game this season on an earlier calendar date
    gp = tg[tg.played].groupby(['season', 'date']).agg(
        n=('n', 'sum'), pf=('pf', 'sum'), plays=('o_plays', 'sum'), epa=('o_epa', 'sum')).reset_index()
    gp = gp.sort_values(['season', 'date'])
    c = gp.groupby('season')[['n', 'pf', 'plays', 'epa']].cumsum()
    gp[['cn', 'cpf', 'cplays', 'cepa']] = c.values
    lg_rows = []
    for (s, d) in g[['season', 'date']].drop_duplicates().itertuples(index=False):
        prev = gp[(gp.season == s) & (gp.date < d)]
        if len(prev):
            r = prev.iloc[-1]
            lg_rows.append((s, d, r.cn, r.cpf / r.cn, r.cplays / r.cn, r.cepa / r.cplays))
        else:
            lg_rows.append((s, d, 0, np.nan, np.nan, np.nan))
    lg = pd.DataFrame(lg_rows, columns=['season', 'date', 'lg_n_std', 'lg_ppg_std', 'lg_plays_std', 'lg_epa_std'])
    lgl = tg[(tg.game_type == 'REG') & tg.played].groupby('season').agg(
        n=('n', 'sum'), pf=('pf', 'sum'), plays=('o_plays', 'sum'), epa=('o_epa', 'sum')).reset_index()
    lgl = pd.DataFrame({'season': lgl.season + 1, 'lg_ppg_ls': lgl.pf / lgl.n,
                        'lg_plays_ls': lgl.plays / lgl.n, 'lg_epa_ls': lgl.epa / lgl.plays})

    # ---------------------------------------------------------------- one row per game
    feat = ([k for k in STATS] + [k + '_std' for k in STATS] + [k + '_ls' for k in STATS] +
            ['n_std', 'n_ls', 'w_std', 'qb_prev', 'qb_prev_share', 'qb_prev_changed'] + ewm_cols)
    side = tg[['game_id', 'is_home'] + feat]
    hs = side[side.is_home == 1].drop(columns='is_home').rename(columns={c: 'home_' + c for c in feat})
    as_ = side[side.is_home == 0].drop(columns='is_home').rename(columns={c: 'away_' + c for c in feat})
    keep = ['game_id', 'season', 'week', 'game_type', 'gameday', 'gametime', 'kickoff', 'date', 'weekday',
            'home_team', 'away_team', 'location', 'home_score', 'away_score', 'total', 'result', 'overtime',
            'total_line', 'spread_line', 'over_odds', 'under_odds', 'home_moneyline', 'away_moneyline',
            'roof', 'surface', 'temp', 'wind', 'div_game', 'home_rest', 'away_rest',
            'home_qb_id', 'away_qb_id', 'home_qb_name', 'away_qb_name', 'played']
    G = g[g.season >= FIRST][keep].rename(columns={'home_qb_id': 'home_qb_start', 'away_qb_id': 'away_qb_start',
                                                   'home_qb_name': 'home_qb_start_name',
                                                   'away_qb_name': 'away_qb_start_name'})
    G = G.merge(hs, on='game_id', how='left').merge(as_, on='game_id', how='left')
    G = G.merge(lg, on=['season', 'date'], how='left').merge(lgl, on='season', how='left')
    for sd in ('home', 'away'):
        G[f'{sd}_qb_new'] = (G[f'{sd}_qb_start'].notna() & G[f'{sd}_qb_prev'].notna() &
                             (G[f'{sd}_qb_start'] != G[f'{sd}_qb_prev'])).astype(int)
    G['neutral'] = (G.location == 'Neutral').astype(int)
    G['indoor'] = G.roof.isin(['dome', 'closed']).astype(int)
    G['surface'] = G.surface.str.strip()
    G['grass'] = G.surface.isin(['grass', 'dessograss']).astype(int)
    G['playoff'] = (G.game_type != 'REG').astype(int)
    # market
    def imp(o):
        o = o.astype(float)
        return np.where(o < 0, -o / (-o + 100), 100 / (o + 100))
    po, pu = imp(G.over_odds), imp(G.under_odds)
    G['q_over_novig'] = np.where(G.over_odds.notna() & G.under_odds.notna() & (G.over_odds != 0) & (G.under_odds != 0),
                                 po / (po + pu), np.nan)
    G['home_implied'] = G.total_line / 2 + G.spread_line / 2
    G['away_implied'] = G.total_line / 2 - G.spread_line / 2
    # site proxy: modelPoints with the shipped coefficients, then the site's mu
    P = json.load(open(SITE_PTS))
    te_h = G[[f'home_{c}' for c in ewm_cols]].rename(columns=lambda c: c[5:])
    de_a = G[[f'away_{c}' for c in ewm_cols]].rename(columns=lambda c: c[5:])
    te_a = G[[f'away_{c}' for c in ewm_cols]].rename(columns=lambda c: c[5:])
    de_h = G[[f'home_{c}' for c in ewm_cols]].rename(columns=lambda c: c[5:])
    # modelPoints(team, opp, isHome): the team's offence EWMs against the opponent's defence EWMs.
    # The app passes isHome=true for the home side even at a neutral site, so this does too.
    G['site_home_pts'] = site_model_points(te_h, de_a, 1, P)
    G['site_away_pts'] = site_model_points(te_a, de_h, 0, P)
    G['site_model_total'] = G.site_home_pts + G.site_away_pts
    G = G.copy()
    G['site_mu'] = np.where(G.total_line.notna(), (G.site_model_total + G.total_line) / 2, G.site_model_total)
    G = G.sort_values(['kickoff', 'game_id']).reset_index(drop=True)
    G['date'] = G.date.dt.date.astype(str)
    if write:
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        G.to_parquet(OUT, index=False)
        # team_games.parquet is the builder's working table: it holds each game's OWN box (o_*, d_*),
        # which are outcomes. Candidates read data/games.parquet through the harness, never this.
        tg.to_parquet(os.path.join(HERE, 'data', 'team_games.parquet'), index=False)
        print('wrote', OUT, G.shape, file=sys.stderr)
    return G, tg


OUTCOME_COLS = ['home_score', 'away_score', 'total', 'result', 'overtime']

if __name__ == '__main__':
    build()
