"""How often a Questionable starting quarterback starts, by his last practice, NFL regular season
2013-2025 (the 2026 files are never opened: every loop below is over range(2013, 2026)).

Definitions
  starter of a club-game   the club's QB with the most offense snaps in that game (PFR snap counts as
                           nflverse publishes them). A QB is a snap row with position QB, or a row whose
                           player the season roster lists at QB. A tie for most is broken by games.csv's
                           own starting QB (home_qb_id/away_qb_id) where he is one of the tied, and flagged.
  incumbent                the starter (as above) of the club's previous regular-season game that season:
                           knowable before kickoff. A club's first game has none and is not counted.
  the injury row           nflverse injuries, (season, REG, week, team, gsis_id), latest date_modified where
                           a key repeats; report_status is the game status, practice_status the last practice.
  outcome                  started (led the club's QB offense snaps), played but did not start (offense snaps
                           > 0), special teams only (a snap row with 0 offense snaps), no snap row (inactive,
                           or dressed and unused: snap counts list only players with a snap).
  ids                      snap rows carry PFR ids; joined to gsis by that season's roster pfr_id, then by the
                           other 2013-2025 season rosters' pfr_id, then by name within the club (season and
                           weekly roster rows of that club), then by surname among that club's QBs if unique.
                           Each tier is counted.
  depth chart              through 2024 the weekly chart (season, week, club), QBs on the Offense formation
                           ranked by depth_team; 2025 the daily snapshots, the last snapshot time before the
                           game's kickoff (gameday + gametime, US Eastern), QBs ranked by pos_rank.

Usage: python3 -I qb_q_starts.py <data dir with snap_counts_/roster_/roster_weekly_ files> <elo cache dir> <out dir>
"""
import json
import re
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import pandas as pd

DATA, CACHE, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
YEARS = list(range(2013, 2026))           # never 2026
assert max(YEARS) == 2025
ET = ZoneInfo('America/New_York')
log = []


def say(*a):
    s = ' '.join(str(x) for x in a)
    log.append(s)
    print(s)


def norm(name):
    s = str(name).lower().replace('.', '').replace("'", '').replace('’', '').replace('-', ' ')
    s = re.sub(r'\b(jr|sr|ii|iii|iv|v)\b', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def surname(name):
    p = norm(name).split(' ')
    return p[-1] if p else ''


# ---------------------------------------------------------------- games
games = pd.read_csv(f'{CACHE}/games.csv', low_memory=False)
games = games[games.season.isin(YEARS) & (games.game_type == 'REG')].copy()
cg = []
for r in games.itertuples():
    for side, team, opp, qb in (('home', r.home_team, r.away_team, r.home_qb_id), ('away', r.away_team, r.home_team, r.away_qb_id)):
        cg.append(dict(game_id=r.game_id, season=int(r.season), week=int(r.week), team=team, opp=opp,
                       gameday=r.gameday, gametime=r.gametime, gc_qb=qb if isinstance(qb, str) else None,
                       final=pd.notna(r.home_score)))
cg = pd.DataFrame(cg).sort_values(['season', 'team', 'week']).reset_index(drop=True)
say('club-games, REG 2013-2025:', len(cg), ' not final:', int((~cg.final).sum()))


def kickoff_utc(gameday, gametime):
    t = gametime if isinstance(gametime, str) and ':' in gametime else '13:00'
    d = datetime.strptime(f'{gameday} {t}', '%Y-%m-%d %H:%M').replace(tzinfo=ET)
    return d.astimezone(timezone.utc)


# ---------------------------------------------------------------- rosters and the pfr -> gsis map
ros = {y: pd.read_csv(f'{DATA}/roster_{y}.csv', low_memory=False) for y in YEARS}
wros = {y: pd.read_csv(f'{DATA}/roster_weekly_{y}.csv', low_memory=False,
                       usecols=['season', 'team', 'position', 'full_name', 'first_name', 'last_name', 'football_name', 'gsis_id', 'pfr_id', 'week'])
        for y in YEARS}
LEGACY = {'ARZ': 'ARI', 'BLT': 'BAL', 'CLV': 'CLE', 'HST': 'HOU', 'SL': 'STL'}   # the 2013-2015 rosters' club codes
for y in YEARS:
    ros[y]['team'] = ros[y].team.replace(LEGACY)
    wros[y]['team'] = wros[y].team.replace(LEGACY)
season_pfr = {}
for y in YEARS:
    r = ros[y][ros[y].pfr_id.notna() & ros[y].gsis_id.notna()]
    m = {}
    for p, g in zip(r.pfr_id, r.gsis_id):
        m.setdefault(p, set()).add(g)
    season_pfr[y] = m
any_pfr = {}
for y in YEARS:
    for p, gs in season_pfr[y].items():
        any_pfr.setdefault(p, set()).update(gs)
    w = wros[y][wros[y].pfr_id.notna() & wros[y].gsis_id.notna()]
    for p, g in zip(w.pfr_id, w.gsis_id):
        any_pfr.setdefault(p, set()).add(g)
season_qb = {y: set(ros[y].loc[ros[y].position == 'QB', 'gsis_id'].dropna()) for y in YEARS}
for y in YEARS:
    season_qb[y] |= set(wros[y].loc[wros[y].position == 'QB', 'gsis_id'].dropna())
gsis_name = {}
for y in YEARS:
    for g, n in zip(ros[y].gsis_id, ros[y].full_name):
        if isinstance(g, str):
            gsis_name[g] = n

# players.csv (nflverse's player master), used only as a check on the map
try:
    pl = pd.read_csv(f'{DATA}/players.csv', low_memory=False, usecols=['gsis_id', 'pfr_id'])
    pl_map = {p: g for p, g in zip(pl.pfr_id, pl.gsis_id) if isinstance(p, str) and isinstance(g, str)}
except FileNotFoundError:
    pl_map = {}

# ---------------------------------------------------------------- snap counts
snaps = pd.concat([pd.read_csv(f'{DATA}/snap_counts_{y}.csv', low_memory=False) for y in YEARS])
snaps = snaps[snaps.game_type == 'REG'].copy()
assert set(snaps.season.unique()) <= set(YEARS)

pid_tier = {}            # (season, team, pfr) -> (gsis, tier)
tier_count = {}
check = {'players.csv agrees': 0, 'players.csv differs': 0, 'players.csv has none': 0}
unmatched = []


def club_people(y, team):
    a = ros[y][ros[y].team == team][['gsis_id', 'full_name', 'first_name', 'last_name', 'football_name', 'position']]
    b = wros[y][wros[y].team == team][['gsis_id', 'full_name', 'first_name', 'last_name', 'football_name', 'position']]
    return pd.concat([a, b]).dropna(subset=['gsis_id']).drop_duplicates()


def resolve(y, team, pfr, name, qb_row):
    key = (y, team, pfr)
    if key in pid_tier:
        return pid_tier[key][0]
    g, tier = None, None
    s = season_pfr[y].get(pfr)
    if s and len(s) == 1:
        g, tier = next(iter(s)), 'season roster pfr_id'
    if g is None:
        s = any_pfr.get(pfr)
        if s and len(s) == 1:
            g, tier = next(iter(s)), 'other 2013-2025 roster pfr_id'
    if g is None:
        people = club_people(y, team)
        n = norm(name)
        hits = set()
        for c in ('full_name',):
            hits |= set(people.loc[people[c].map(norm) == n, 'gsis_id'])
        if not hits:
            fn = people.first_name.fillna('').astype(str) + ' ' + people.last_name.fillna('').astype(str)
            fb = people.football_name.fillna('').astype(str) + ' ' + people.last_name.fillna('').astype(str)
            hits |= set(people.loc[(fn.map(norm) == n) | (fb.map(norm) == n), 'gsis_id'])
        if len(hits) == 1:
            g, tier = next(iter(hits)), 'name within club'
        elif qb_row:
            qbs = people[people.position == 'QB']
            hits = set(qbs.loc[qbs.last_name.map(lambda v: norm(v)) == surname(name), 'gsis_id'])
            if len(hits) == 1:
                g, tier = next(iter(hits)), 'surname among club QBs'
    if g is None:
        tier = 'unmatched'
        unmatched.append((y, team, pfr, name))
    elif tier != 'season roster pfr_id':
        p = pl_map.get(pfr)
        if p is None:
            check['players.csv has none'] += 1
        elif p == g:
            check['players.csv agrees'] += 1
        else:
            check['players.csv differs'] += 1
            say('  players.csv differs:', y, team, pfr, name, g, p)
    pid_tier[key] = (g, tier)
    return g


# candidate QB rows: position QB in the snap counts, or a player the roster lists at QB
snaps['gsis'] = None
qb_mask = snaps.position == 'QB'
# resolve every QB-position row, and every row whose pfr maps (season roster) to a roster QB
gs = []
for r in snaps.itertuples():
    pre = season_pfr[int(r.season)].get(r.pfr_player_id)
    pre_qb = bool(pre) and len(pre) == 1 and next(iter(pre)) in season_qb[int(r.season)]
    if r.position == 'QB' or pre_qb:
        gs.append(resolve(int(r.season), r.team, r.pfr_player_id, r.player, r.position == 'QB'))
    else:
        gs.append(None)
snaps['gsis'] = gs
snaps['is_qb'] = [(p == 'QB') or (g is not None and g in season_qb[int(y)]) for p, g, y in zip(snaps.position, snaps.gsis, snaps.season)]
for (y, t, p), (g, tier) in pid_tier.items():
    tier_count.setdefault(y, {}).setdefault(tier, 0)
    tier_count[y][tier] += 1
say('ID MAP: distinct (season, club, PFR id) QB-candidate players, by how each was joined to gsis')
tot = {}
for y in YEARS:
    say(' ', y, dict(sorted(tier_count.get(y, {}).items())))
    for k, v in tier_count.get(y, {}).items():
        tot[k] = tot.get(k, 0) + v
say('  total', dict(sorted(tot.items())))
say('  non-season-roster joins checked against nflverse players.csv pfr_id:', check)
say('  unmatched:', unmatched)

qbs = snaps[snaps.is_qb].copy()
qbs[['game_id', 'season', 'week', 'team', 'gsis', 'player', 'pfr_player_id', 'position', 'offense_snaps', 'offense_pct', 'st_snaps']].to_csv(f'{OUT}/qb_snaps.csv', index=False)
say('QB snap rows (REG 2013-2025):', len(qbs), ' rows with position != QB counted as QB via roster:', int((qbs.position != 'QB').sum()))

# ---------------------------------------------------------------- starter per club-game
by_cg = {}
for (gid, team), grp in qbs.groupby(['game_id', 'team']):
    by_cg[(gid, team)] = grp
starter, ties, missing = [], 0, []
gc_agree = {'agree': 0, 'differ': 0, 'games.csv none': 0}
qbsnap = {}               # (gid, team) -> {gsis: offense snaps}
pctmap = {}
for r in cg.itertuples():
    grp = by_cg.get((r.game_id, r.team))
    if grp is None or not len(grp):
        starter.append(None)
        missing.append((r.game_id, r.team))
        continue
    d = {}
    pc = {}
    for g, s, pct in zip(grp.gsis, grp.offense_snaps, grp.offense_pct):
        if g is None:
            continue
        d[g] = d.get(g, 0) + int(s)
        pc[g] = float(pct)
    qbsnap[(r.game_id, r.team)] = d
    pctmap[(r.game_id, r.team)] = pc
    top = max(d.values())
    lead = [g for g, s in d.items() if s == top]
    if len(lead) > 1:
        ties += 1
        st = r.gc_qb if r.gc_qb in lead else sorted(lead)[0]
    else:
        st = lead[0]
    starter.append(st)
    if r.gc_qb is None:
        gc_agree['games.csv none'] += 1
    elif r.gc_qb == st:
        gc_agree['agree'] += 1
    else:
        gc_agree['differ'] += 1
cg['starter'] = starter
say('club-games with no QB snap rows:', missing)
say('club-games with a tie for most QB offense snaps (broken by games.csv QB where he is one of them):', ties)
say('starter by most QB offense snaps against games.csv home_qb_id/away_qb_id:', gc_agree)

# previous game's starter = the incumbent
cg['inc'] = cg.groupby(['season', 'team']).starter.shift(1)
cg['inc_gc'] = cg.groupby(['season', 'team']).gc_qb.shift(1)
cg['prev_week'] = cg.groupby(['season', 'team']).week.shift(1)
cg['prev_gid'] = cg.groupby(['season', 'team']).game_id.shift(1)
say('club-games with an incumbent (not the club\'s first game):', int(cg.inc.notna().sum()))

# ---------------------------------------------------------------- injuries
inj = pd.concat([pd.read_csv(f'{CACHE}/injuries_{y}.csv', low_memory=False) for y in YEARS])
inj = inj[inj.game_type == 'REG'].copy()
assert set(inj.season.unique()) <= set(YEARS)
inj = inj.sort_values('date_modified').drop_duplicates(['season', 'week', 'team', 'gsis_id'], keep='last')
injk = {(int(r.season), int(r.week), r.team, r.gsis_id): (r.report_status, r.practice_status, r.position, r.report_primary_injury)
        for r in inj.itertuples()}


def prac(s):
    if not isinstance(s, str):
        return 'other'
    if s.startswith('Full'):
        return 'Full'
    if s.startswith('Limited'):
        return 'Limited'
    if s.startswith('Did Not'):
        return 'Did Not Participate'
    return 'other'


# ---------------------------------------------------------------- depth charts
weekly_dc = {}
for y in range(2013, 2025):
    d = pd.read_csv(f'{CACHE}/depth_charts_{y}.csv', low_memory=False)
    d = d[(d.position == 'QB') & (d.formation == 'Offense') & d.gsis_id.notna() & d.week.notna() & (d.game_type == 'REG')]
    d = d.assign(dep=pd.to_numeric(d.depth_team, errors='coerce').fillna(9))
    for (wk, team), grp in d.groupby(['week', 'club_code']):
        m = grp.groupby('gsis_id').dep.min().sort_values(kind='stable')
        weekly_dc[(y, int(wk), team)] = list(m.index)
d25 = pd.read_csv(f'{CACHE}/depth_charts_2025.csv', low_memory=False)
d25 = d25[(d25.pos_abb == 'QB') & d25.gsis_id.notna()].copy()
d25['t'] = pd.to_datetime(d25.dt, utc=True)
d25['rk'] = pd.to_numeric(d25.pos_rank, errors='coerce').fillna(9)
snap25 = {team: grp for team, grp in d25.groupby('team')}


def chart(season, week, team, gameday, gametime):
    if season <= 2024:
        return weekly_dc.get((season, week, team)), None
    grp = snap25.get(team)
    if grp is None:
        return None, None
    k = kickoff_utc(gameday, gametime)
    before = grp[grp.t < k]
    if not len(before):
        return None, None
    last = before.t.max()
    s = before[before.t == last]
    m = s.groupby('gsis_id').rk.min().sort_values(kind='stable')
    return list(m.index), last.isoformat()


# ---------------------------------------------------------------- the rows
rows = []
for r in cg.itertuples():
    ch0, _ = chart(r.season, r.week, r.team, r.gameday, r.gametime)
    q1 = ch0[0] if ch0 else None
    for who, pid in (('incumbent', r.inc), ('incumbent (games.csv)', r.inc_gc), ('chart QB1', q1)):
        if not isinstance(pid, str):
            continue
        ir = injk.get((r.season, r.week, r.team, pid))
        if ir is None:
            status, practice, pos, injury = 'not on report', None, None, None
        else:
            status = ir[0] if isinstance(ir[0], str) else 'practice report only'
            practice, pos, injury = ir[1], ir[2], ir[3]
        d = qbsnap.get((r.game_id, r.team), {})
        if r.starter == pid:
            out = 'started'
        elif d.get(pid, 0) > 0:
            out = 'played, did not start'
        elif pid in d:
            out = 'special teams only'
        else:
            out = 'no snap row'
        ch, chat = chart(r.season, r.week, r.team, r.gameday, r.gametime)
        nxt = None
        nxt_av = None
        inc_rank = None
        if ch:
            if pid in ch:
                inc_rank = ch.index(pid) + 1
            others = [p for p in ch if p != pid]
            nxt = others[0] if others else None
            # the next QB the week's report does not rule out (Out or Doubtful): knowable before kickoff
            av = [p for p in others if (injk.get((r.season, r.week, r.team, p)) or (None,))[0] not in ('Out', 'Doubtful')]
            nxt_av = av[0] if av else None
        if r.starter == pid:
            who_started = 'incumbent'
        elif nxt is not None and r.starter == nxt:
            who_started = 'next QB on chart'
        elif r.starter is None:
            who_started = 'unknown'
        elif ch is None:
            who_started = 'other QB (no chart)'
        else:
            who_started = 'another QB'
        rows.append(dict(population=who, season=r.season, week=r.week, team=r.team, opp=r.opp, game_id=r.game_id,
                         prev_week=int(r.prev_week) if pd.notna(r.prev_week) else None, gsis=pid, name=gsis_name.get(pid, ''), status=status,
                         practice_raw=practice, practice=prac(practice) if ir is not None else None,
                         injury=injury, outcome=out, off_snaps=d.get(pid, 0),
                         off_pct=pctmap.get((r.game_id, r.team), {}).get(pid),
                         starter=r.starter, starter_name=gsis_name.get(r.starter, ''),
                         gc_starter=r.gc_qb, gc_started=(r.gc_qb == pid), chart_rank=inc_rank,
                         chart_next=nxt, chart_next_name=gsis_name.get(nxt, '') if nxt else '', chart_at=chat,
                         who_started=who_started, chart_next_avail=nxt_av,
                         chart_next_avail_name=gsis_name.get(nxt_av, '') if nxt_av else '',
                         next_avail_started=(nxt_av is not None and r.starter == nxt_av),
                         prev_off_pct=pctmap.get((r.prev_gid, r.team), {}).get(pid),
                         prev_off_snaps=qbsnap.get((r.prev_gid, r.team), {}).get(pid)))
R = pd.DataFrame(rows)
R.to_csv(f'{OUT}/rows.csv', index=False)
cg.to_csv(f'{OUT}/club_games.csv', index=False)
say('chart QB1 rows:', int((R.population == 'chart QB1').sum()), ' club-games with no chart:', int(sum(1 for r in cg.itertuples() if not chart(r.season, r.week, r.team, r.gameday, r.gametime)[0])))
say('incumbent rows:', int((R.population == 'incumbent').sum()), ' on the report:', int(((R.population == 'incumbent') & (R.status != 'not on report')).sum()))
json.dump({'log': log}, open(f'{OUT}/build_log.json', 'w'), indent=1)
open(f'{OUT}/build_log.txt', 'w').write('\n'.join(log) + '\n')
