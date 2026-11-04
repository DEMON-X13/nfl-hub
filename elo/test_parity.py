"""THE INPUTS' two paths held to each other and to the test's own reading (elo/build.py's averages, the inputs of 4
November 2026): the fit's (elo/tools/elo_avg_fit.py's add_inputs, every fit row) and the run's (elo/build.py's
avg_coming_inputs, a coming game's expected starters) share avg_history and avg_inputs_rows, so a coming game's inputs
are the ones the coefficients were fitted on; this holds that they agree term for term, and that the terms are what the
rule says, on the test's own arithmetic (never the build's):

    python3 elo/test_parity.py            # on fixtures of its own, a scratch cache, no network: must end "0 failures"
    python3 elo/test_parity.py --cache    # the same parity on elo/cache's real files (2025 weeks 10-18, every player
                                          # with a stat row at a position the averages project), where they are there

The Elo job (.github/workflows/elo.yml) runs it on its fixtures after elo/check.py and before the commit, so a failure
holds the files back; the --cache run (about a minute) is for a change to the inputs' code, by hand.

The fixtures: a season of two clubs, AAA and BBB, six weeks, each with a quarterback, a back, two receivers, a tight end
and a kicker. A receiver who missed a game (no row, no snap), one with snaps and no stat row (a share of 0), a week's
snap counts missing for one (his last snap share carried), negative air yards (clipped at 0), a club's week whose air
yards sum to 20 or less (no air-yards share), a snap row whose PFR id the players file does not know (dropped), a game
with no lines (imp and spr 0), implied points over 45 and under 7 (clipped), a played game's wind under a dome and
under a retractable roof open (calm), and a Questionable filed in week 5 beside a practice report with no status. Every term of every row: the fit's path equal to the run's (the wind apart, which the
run reads from a forecast), and each of snap1r, snapL, the shares long and short, imp, spr, wind and q equal to the
test's own reading of the rule (EWM with adjust and missing values skipped, as written out here).

And the forecast (avg_weather) on netfetch stubbed: a dome and a retractable roof calm with no request, and games.csv's
roof dome, closed or open at a stadium open to the sky the same; a game past 6.5 days and offline calm with none; an
open stadium in the US read from the National Weather Service's hourly forecast (the points answer at the test's own
copy of the stadium's coordinates, then the hour holding the kickoff, the higher of "10 to 15 mph"), abroad from
Open-Meteo's hour (asked at its coordinates for wind_speed_10m in mph, by the hour in UTC); a failed request calm and
said so in the site's own words (an error status, no answer, a body that is not JSON, an HTML page or an empty body
among them, which the real netfetch refuses itself on a file:// address, and JSON of another shape: a
list, a null where an object stands, a period with no start, an hour list longer than its winds), never raising;
every request tried once (waits=()) within WEATHER_TIMEOUT seconds, the whole step held to WEATHER_CAP seconds of wall
clock even against a request that never returns (a server trickling its answer), each game after it calm and said so,
and past the cap no request at all."""
import datetime
import math
import os
import shutil
import sys
import tempfile

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'tools'))
import build as B  # noqa: E402
import elo_avg_fit as F  # noqa: E402

fails = []
VOL = ['targets', 'carries', 'attempts', 'receiving_air_yards']
SNAP_COLS = ['season', 'week', 'team', 'pfr_player_id', 'offense_snaps', 'offense_pct']


def check(ok, what):
    print(('  ok   ' if ok else '  FAIL ') + what)
    if not ok:
        fails.append(what)


def ewm_own(vals, hl):
    """the half-life average through the last value, missing values skipped (pandas' adjust=True, ignore_na=True)"""
    v = [x for x in vals if x == x]
    if not v:
        return float('nan')
    w = [0.5 ** ((len(v) - 1 - i) / hl) for i in range(len(v))]
    return sum(a * b for a, b in zip(w, v)) / sum(w)


# ---- the fixture world ----
SEASON = 2025
CLUBS = {'AAA': {'QB': 'A-QB', 'RB': 'A-RB', 'WR': ['A-W1', 'A-W2'], 'TE': 'A-TE', 'K': 'A-K'},
         'BBB': {'QB': 'B-QB', 'RB': 'B-RB', 'WR': ['B-W1', 'B-W2'], 'TE': 'B-TE', 'K': 'B-K'}}
GROUP = {}
for t, c in CLUBS.items():
    for g, p in c.items():
        for q in (p if isinstance(p, list) else [p]):
            GROUP[q] = g
PFR = {p: 'P' + p.replace('-', '') for p in GROUP}
GAMES = []
for w in range(1, 7):
    home, away = ('AAA', 'BBB') if w % 2 else ('BBB', 'AAA')
    spread = {1: 3.0, 2: -6.5, 3: np.nan, 4: 10.0, 5: -2.5, 6: 7.0}[w]
    total = {1: 44.5, 2: 10.0, 3: np.nan, 4: 38.0, 5: 100.0, 6: 41.0}[w]       # week 2 under 7 a side, week 5 over 45
    roof = 'dome' if w == 4 else 'open' if w == 2 else 'outdoors'               # week 2 a retractable roof open
    wind = {1: 22.0, 2: 25.0, 3: 13.0, 4: 30.0, 5: np.nan, 6: 41.0}[w]
    GAMES.append({'game_id': f'{SEASON}_{w:02d}_{away}_{home}', 'season': SEASON, 'week': w, 'game_type': 'REG',
                  'gameday': (datetime.date(2025, 9, 7) + datetime.timedelta(days=7 * (w - 1))).isoformat(),
                  'gametime': '13:00', 'home_team': home, 'away_team': away, 'spread_line': spread, 'total_line': total,
                  'roof': roof, 'wind': wind, 'stadium_id': 'BUF00'})


def stat_rows():
    """every player's weekly stat rows: a few gaps, negative air yards and a thin week of air yards"""
    rng = np.random.default_rng(7)
    rows = []
    for w in range(1, 7):
        for t, c in CLUBS.items():
            for p, g in GROUP.items():
                if not p.startswith(t[0] + '-'):
                    continue
                if p == 'A-W2' and w == 3:
                    continue                       # missed the game: no row, no snap
                if p == 'B-W2' and w in (2, 4):
                    continue                       # snaps, no stat row: a share of 0
                tg = {'WR': rng.integers(2, 11), 'TE': rng.integers(1, 7), 'RB': rng.integers(0, 5)}.get(g, 0)
                car = {'RB': rng.integers(8, 22), 'QB': rng.integers(0, 6)}.get(g, 0)
                att = rng.integers(25, 45) if g == 'QB' else 0
                ay = float(rng.integers(-5, 120)) if g in ('WR', 'TE', 'RB') else 0.0
                if t == 'BBB' and w == 6:
                    ay = 3.0 if g in ('WR', 'TE', 'RB') else 0.0     # a club's week of 20 air yards or fewer: no share
                if p == 'A-RB' and w == 2:
                    ay = -4.0                                          # negative air yards: clipped at 0
                rows.append({'player_id': p, 'season': SEASON, 'week': w, 'team': t, 'position': g, 'game_id': None,
                             'targets': tg, 'carries': car, 'attempts': att, 'receiving_air_yards': ay})
    # a defender's row with a target: his club's totals count it, he is projected nowhere
    rows.append({'player_id': 'A-LB', 'season': SEASON, 'week': 2, 'team': 'AAA', 'position': 'LB', 'game_id': None,
                 'targets': 1, 'carries': 0, 'attempts': 0, 'receiving_air_yards': 6.0})
    return pd.DataFrame(rows)


def snap_rows(stats):
    rng = np.random.default_rng(11)
    rows = []
    for w in range(1, 7):
        for p, g in GROUP.items():
            t = 'AAA' if p.startswith('A-') else 'BBB'
            if g == 'K' or (p == 'A-W2' and w == 3) or (p == 'A-TE' and w == 4):
                continue                           # a kicker has no offensive snap; A-TE's week 4 snaps missing
            pct = round(float(rng.uniform(0.35, 1.0)), 2)
            rows.append({'season': SEASON, 'week': w, 'team': t, 'pfr_player_id': PFR[p], 'offense_snaps': int(pct * 65),
                         'offense_pct': pct})
    rows.append({'season': SEASON, 'week': 2, 'team': 'AAA', 'pfr_player_id': 'Unknown00', 'offense_snaps': 30, 'offense_pct': 0.5})
    return pd.DataFrame(rows)


INJ = pd.DataFrame([
    {'season': SEASON, 'week': 5, 'team': 'AAA', 'gsis_id': 'A-W1', 'report_status': 'Questionable'},
    {'season': SEASON, 'week': 5, 'team': 'BBB', 'gsis_id': 'B-W1', 'report_status': None},       # a practice report
    {'season': SEASON, 'week': 6, 'team': 'BBB', 'gsis_id': 'B-RB', 'report_status': 'Doubtful'},
])


def own_terms(stats, snaps, pid, week, home, spread, total, wind, center):
    """the test's own reading of the rule for one player-game"""
    grp = GROUP[pid]
    tot = stats.groupby(['week', 'team'])[VOL].sum()
    mine = stats[stats.player_id == pid].set_index('week')
    sn = snaps[snaps.pfr_player_id == PFR[pid]].set_index('week')
    weeks = sorted(set(w for w in mine.index if w < week) | set(w for w in sn.index if w < week))
    snap = [float(sn.offense_pct[w]) if w in sn.index else float('nan') for w in weeks]
    out = {}
    s1 = next((x for x in reversed(snap) if x == x), float('nan'))
    sL = ewm_own(snap, 6)
    out['in:snap1r'] = math.log(max(s1, 0.05) / max(sL, 0.05)) if s1 == s1 and sL == sL else 0.0
    out['in:snapL'] = sL - 0.7 if sL == sL else 0.0
    for k, col in (('tgt', 'targets'), ('car', 'carries'), ('ay', 'receiving_air_yards')):
        sh = []
        for w in weeks:
            team = mine.team[w] if w in mine.index else sn.team[w]
            den = float(tot.loc[(w, team), col])
            x = float(mine[col][w]) if w in mine.index else 0.0
            if k == 'ay':
                sh.append(max(x, 0.0) / max(den, 1) if den > 20 else float('nan'))
            else:
                sh.append(x / max(den, 1) if den > 0 else float('nan'))
        L, S = ewm_own(sh, 6), ewm_own(sh, 1.5)
        c = center[grp][k]
        out[f'in:shL_{k}'] = (math.log(max(L, 0.005)) - c) if L == L else 0.0
        out[f'in:shr_{k}'] = math.log(max(S, 0.005) / max(L, 0.005)) if L == L and S == S else 0.0
    s = spread if home else -spread
    imp = total / 2 + s / 2
    out['in:imp'] = math.log(min(max(imp, 7.0), 45.0) / 22.5) if imp == imp else 0.0
    out['in:spr'] = s / 7 if s == s else 0.0
    w = wind if wind == wind else 0.0
    out['in:wind'] = max(0.0, min(w, 40.0) - 10.0) / 10.0
    q = INJ[(INJ.week == week) & (INJ.gsis_id == pid)].report_status
    out['in:q'] = float(len(q) > 0 and q.iloc[0] == 'Questionable')
    return out


def fixtures():
    print('THE INPUTS on fixtures of their own: the fit\'s path, the run\'s and the rule')
    tmp = tempfile.mkdtemp(prefix='elo_parity_')
    keep = (B.CACHE, B.FIRST, B.SNAP_FIRST)
    try:
        B.CACHE, B.FIRST, B.SNAP_FIRST = tmp, SEASON, SEASON
        stats, games = stat_rows(), pd.DataFrame(GAMES)
        snaps = snap_rows(stats)
        stats.to_csv(os.path.join(tmp, f'stats_player_week_{SEASON}.csv'), index=False)
        snaps.to_csv(os.path.join(tmp, f'snap_counts_{SEASON}.csv'), index=False)
        INJ.to_csv(os.path.join(tmp, f'injuries_{SEASON}.csv'), index=False)
        pd.DataFrame({'gsis_id': list(PFR) + ['00-X'], 'pfr_id': list(PFR.values()) + [None]}).to_csv(os.path.join(tmp, 'players.csv'), index=False)
        center = {g: {'tgt': -2.0, 'car': -1.5, 'ay': -2.2} for g in ('QB', 'RB', 'WR', 'TE', 'K')}
        # the fit's rows: every player-game of weeks 2-6 at a projected position
        fr = []
        for gm in GAMES[1:]:
            for p, g in GROUP.items():
                t = 'AAA' if p.startswith('A-') else 'BBB'
                fr.append({'pid': p, 'season': SEASON, 'week': gm['week'], 'team': t, 'group': g,
                           'home': int(t == gm['home_team']), 'game_id': gm['game_id']})
        frame = pd.DataFrame(fr)
        fit, cen = F.add_inputs(frame, games, SEASON, True, center=center)
        check(cen == center, 'a centre handed in is the one used')
        # the run's: each game handed to avg_coming_inputs as a coming game, each player first of his group
        g = games.copy()
        g['kick'] = [B.kickoff(a, b) for a, b in zip(g.gameday, g.gametime)]
        coming = [{'game_id': r.game_id, 'team': r.team, 'home': int(r.home), 'parts': [(r.pid, r.group)]} for r in frame.itertuples()]
        extra = {'vol': stats, 'snaps': snaps, 'pfr': {v: k for k, v in PFR.items()}}
        avg_fit = B.ELO_AVG
        B.ELO_AVG = dict(avg_fit, inputs={'share_center': center})
        try:
            run = B.avg_coming_inputs(coming, g, extra, {SEASON: INJ}, max(g.kick) + datetime.timedelta(days=30), True)
        finally:
            B.ELO_AVG = avg_fit
        terms = [c for c in fit.columns if c.startswith('in:')]
        check(sorted(terms) == sorted(['in:snap1r', 'in:snapL', 'in:shL_tgt', 'in:shr_tgt', 'in:shL_car', 'in:shr_car',
                                       'in:shL_ay', 'in:shr_ay', 'in:imp', 'in:spr', 'in:wind', 'in:q']),
              f'the terms: {terms}')
        bad = own_bad = n = 0
        gi = games.set_index('game_id')
        for i, r in frame.iterrows():
            v = run.get((r.pid, r.game_id))
            if v is None:
                bad += 1
                continue
            n += 1
            gm = gi.loc[r.game_id]
            calm = gm.roof in ('dome', 'closed', 'open')
            own = own_terms(stats, snaps, r.pid, int(r.week), bool(r.home), gm.spread_line, gm.total_line,
                            0.0 if calm else gm.wind, center)
            for t in terms:
                if t != 'in:wind' and abs(v[t] - fit.at[i, t]) > 1e-12:
                    bad += 1
                    if bad <= 5:
                        print(f'    run {r.game_id} {r.pid} {t}: {v[t]} against the fit\'s {fit.at[i, t]}')
                if abs(own[t] - fit.at[i, t]) > 1e-9:
                    own_bad += 1
                    if own_bad <= 8:
                        print(f'    rule {r.game_id} {r.pid} {t}: the fit {fit.at[i, t]} against the rule\'s {own[t]}')
        check(n == len(frame) and bad == 0, f'{n} player-games: the run\'s path the fit\'s on every term but the wind ({bad} differences)')
        check(own_bad == 0, f'every term the rule\'s, on the test\'s own reading ({own_bad} differences)')
        x = fit.set_index(['pid', 'week'])
        check(abs(x.loc[('A-W1', 5), 'in:q'] - 1) < 1e-12 and x.loc[('A-W1', 4), 'in:q'] == 0
              and x.loc[('B-W1', 5), 'in:q'] == 0 and x.loc[('B-RB', 6), 'in:q'] == 0,
              'Questionable filed is 1; a practice report with no status and a Doubtful are 0')
        check(x.loc[('A-QB', 3), 'in:imp'] == 0 and x.loc[('A-QB', 3), 'in:spr'] == 0, 'a game with no lines reads imp and spr 0')
        check(x.loc[('A-QB', 4), 'in:wind'] == 0 and x.loc[('A-QB', 2), 'in:wind'] == 0 and x.loc[('A-QB', 5), 'in:wind'] == 0
              and abs(x.loc[('A-QB', 6), 'in:wind'] - 3.0) < 1e-12 and abs(x.loc[('A-QB', 3), 'in:wind'] - 0.3) < 1e-12,
              'the wind: under a dome (30 mph) and a retractable roof open (25 mph) calm, none read 0, 13 mph 0.3, 41 mph capped at 40, 3.0')
        lo, hi = math.log(7 / 22.5), math.log(45 / 22.5)
        check(abs(x.loc[('B-QB', 2), 'in:imp'] - lo) < 1e-12 and abs(x.loc[('A-QB', 2), 'in:imp'] - math.log(8.25 / 22.5)) < 1e-12
              and abs(x.loc[('A-QB', 5), 'in:imp'] - hi) < 1e-12 and abs(x.loc[('B-QB', 5), 'in:imp'] - hi) < 1e-12,
              'implied points clipped to 7-45: 1.75 read as 7, 48.75 and 51.25 as 45, 8.25 as it is')
        check(x.loc[('A-K', 3), 'in:snapL'] == 0 and x.loc[('A-K', 3), 'in:snap1r'] == 0, 'a kicker, with no offensive snap, reads the snap terms 0')
        w = {k: v for k, v in run.items() if k[0] == 'A-QB'}
        check(all(v['wind_src'] in ('roof', 'offline') for v in w.values()) and all(v['wind'] is None or v['wind'] == 0 for v in w.values()),
              f"offline the run's wind is calm and says why: {sorted({v['wind_src'] for v in w.values()})}")
        check(all(set(v) >= {'snap1', 'snapL', 'sh_tgtL', 'sh_tgtS', 'sh_carL', 'sh_carS', 'sh_ayL', 'sh_ayS', 'implied', 'spread', 'wind', 'wind_src'}
                  for v in run.values()), 'the run carries the raw values matchups.json shows beside the terms')
    finally:
        B.CACHE, B.FIRST, B.SNAP_FIRST = keep
        shutil.rmtree(tmp)


# the test's own copy of the stadiums it asks for, and of the two forecasts' addresses
BUF00, LON02 = (42.7738, -78.7870), (51.6043, -0.0664)


def weather():
    print('the forecast at kickoff (avg_weather), netfetch stubbed')
    import json
    import time
    import urllib.parse
    now = datetime.datetime(2025, 11, 4, 12, tzinfo=datetime.timezone.utc)
    kick = now + datetime.timedelta(days=2, hours=3)
    hourly_url = 'https://api.weather.gov/gridpoints/X/1,1/forecast/hourly'
    nws_points = json.dumps({'properties': {'forecastHourly': hourly_url}})
    per = lambda a, b, s: {'startTime': a.isoformat(), 'endTime': b.isoformat(), 'windSpeed': s}
    h = kick.replace(minute=0)
    nws_hourly = {'properties': {'periods': [per(h - datetime.timedelta(hours=1), h, '30 mph'), per(h, h + datetime.timedelta(hours=1), '10 to 15 mph'),
                                             per(h + datetime.timedelta(hours=1), h + datetime.timedelta(hours=2), '40 mph')]}}
    t = kick.strftime('%Y-%m-%dT%H:00')
    om = {'hourly': {'time': ['x', t, 'y'], 'wind_speed_10m': [1.0, 17.5, 2.0]}}
    calls = []
    real = B.netfetch.download
    mode = {'fail': None, 'points': nws_points, 'hourly': json.dumps(nws_hourly), 'om': json.dumps(om), 'sleep': 0.0}

    def stub(url, dest, **k):
        calls.append((url, k))
        if mode['sleep']:
            time.sleep(mode['sleep'])              # a request that never returns in time, whatever its timeout says
        if mode['fail'] is not None:
            raise mode['fail']
        body = mode['points'] if '/points/' in url else mode['hourly'] if 'gridpoints' in url else mode['om']
        with open(dest, 'w') as f:
            f.write(body)
        return dest
    rows = pd.DataFrame([
        {'game_id': 'dome', 'stadium_id': 'DET00', 'roof': 'dome', 'kick': kick},
        {'game_id': 'retract', 'stadium_id': 'ATL97', 'roof': 'outdoors', 'kick': kick},
        {'game_id': 'gdome', 'stadium_id': 'BUF00', 'roof': 'dome', 'kick': kick},
        {'game_id': 'gclosed', 'stadium_id': 'BUF00', 'roof': 'closed', 'kick': kick},
        {'game_id': 'gopen', 'stadium_id': 'BUF00', 'roof': 'open', 'kick': kick},
        {'game_id': 'far', 'stadium_id': 'BUF00', 'roof': 'outdoors', 'kick': now + datetime.timedelta(days=7)},
        {'game_id': 'buf', 'stadium_id': 'BUF00', 'roof': 'outdoors', 'kick': kick},
        {'game_id': 'lon', 'stadium_id': 'LON02', 'roof': 'outdoors', 'kick': kick},
        {'game_id': 'nowhere', 'stadium_id': 'ZZZ99', 'roof': 'outdoors', 'kick': kick},
    ])
    B.netfetch.download = stub
    try:
        out = B.avg_weather(rows, now, False)
        check(out['dome'] == (0.0, 'roof') and out['retract'] == (0.0, 'roof'), f"a dome and a retractable roof calm: {out['dome']}, {out['retract']}")
        check(all(out[g] == (0.0, 'roof') for g in ('gdome', 'gclosed', 'gopen')),
              f"games.csv's roof dome, closed or open at a stadium open to the sky calm: {[out[g] for g in ('gdome', 'gclosed', 'gopen')]}")
        check(out['far'][0] is None and out['far'][1] == 'beyond the forecast', f"a game past {B.WEATHER_DAYS} days calm, said so: {out['far']}")
        check(out['buf'] == (15.0, 'nws'), f'the NWS hour holding the kickoff, the higher of "10 to 15 mph": {out["buf"]}')
        check(out['lon'] == (17.5, 'open-meteo'), f"abroad, Open-Meteo's hour: {out['lon']}")
        check(out['nowhere'][0] is None and 'no coordinates' in out['nowhere'][1], f"a stadium with no coordinates calm: {out['nowhere']}")
        urls = [u for u, _ in calls]
        check(len(calls) == 3 and sum('/points/' in u for u in urls) == 1 and sum('open-meteo' in u for u in urls) == 1,
              f'requests for the two open stadiums within the forecast alone (NWS points and hourly, Open-Meteo): {len(calls)}')
        check(urls[:2] == [f'https://api.weather.gov/points/{BUF00[0]:.4f},{BUF00[1]:.4f}', hourly_url],
              f"the National Weather Service asked at Buffalo's own coordinates, then the hourly address its answer gives: {urls[:2]}")
        q = urllib.parse.urlsplit(urls[2]) if len(urls) > 2 else None
        qs = dict(urllib.parse.parse_qsl(q.query)) if q else {}
        check(q is not None and (q.scheme, q.netloc, q.path) == ('https', 'api.open-meteo.com', '/v1/forecast')
              and qs.get('latitude') == f'{LON02[0]:.4f}' and qs.get('longitude') == f'{LON02[1]:.4f}' and qs.get('hourly') == 'wind_speed_10m'
              and qs.get('wind_speed_unit') == 'mph' and qs.get('timezone') == 'UTC',
              f"Open-Meteo asked at London's own coordinates for the wind at 10 m in mph, by the hour in UTC (its default is km/h): {urls[2:]}")
        check(all(k.get('waits') == () for _, k in calls) and all(0 < k.get('timeout', 999) <= B.WEATHER_TIMEOUT for _, k in calls),
              f'every request tried once (waits=()) within {B.WEATHER_TIMEOUT} s: {[(k.get("waits"), k.get("timeout")) for _, k in calls]}')
        check(all('nfl-hub' in (k.get('headers') or {}).get('User-Agent', '') and '@' not in (k.get('headers') or {}).get('User-Agent', '')
                  for _, k in calls), 'a User-Agent naming the site, and no address in it')
        # every failure calm, said in the site's own words, never raised. A 200 whose body is an HTML page (an outage's or a
        # proxy's) or empty netfetch refuses itself, with no status: the errors it raises are the real netfetch's, on a
        # file:// address (no network), so a change to its words cannot leave the reason 'no answer' unseen
        def real_err(body):
            d = tempfile.mkdtemp(prefix='elo_wxerr_')
            try:
                src = os.path.join(d, 'body')
                with open(src, 'wb') as f:
                    f.write(body)
                try:
                    real('file://' + src, os.path.join(d, 'out.json'), waits=(), timeout=5, log=lambda *a: None)
                except B.netfetch.FetchError as e:
                    return e
                return None
            finally:
                shutil.rmtree(d, ignore_errors=True)
        html_err, empty_err = real_err(b'<html><body>busy</body></html>'), real_err(b'')
        check(isinstance(html_err, B.netfetch.FetchError) and not html_err.code and isinstance(empty_err, B.netfetch.FetchError) and not empty_err.code,
              f'netfetch refuses an HTML page and an empty body itself, with no status: {html_err!r}, {empty_err!r}')
        fails_ = [('an HTML page answered 200', html_err, {}, 'not JSON'), ('an empty body answered 200', empty_err, {}, 'not JSON'),
                  ('no answer', B.netfetch.FetchError("p.json: URLError, on 1 try over 0s (nflverse's host or the network; ...)"), {}, 'no answer'),
                  ('an error status', B.netfetch.FetchError("p.json: HTTP Error 500: Internal Server Error (nflverse's host ...)", 500), {}, 'HTTP 500'),
                  ('a timeout', B.netfetch.FetchError("p.json: TimeoutError: timed out, on 1 try over 15s (nflverse's host ...)"), {}, 'timed out'),
                  ('a body that is not JSON', None, {'points': '<<not json', 'om': 'nope'}, 'not JSON'),
                  ('the points answer a list', None, {'points': '[]', 'om': '[]'}, 'an answer of another shape'),
                  ('properties null', None, {'points': '{"properties": null}', 'om': '{"hourly": null}'}, 'an answer of another shape'),
                  ('periods null', None, {'hourly': '{"properties": {"periods": null}}', 'om': json.dumps({'hourly': {'time': [t], 'wind_speed_10m': []}})},
                   'an answer of another shape'),
                  ('a period with no start', None, {'hourly': json.dumps({'properties': {'periods': [{'startTime': None, 'endTime': None, 'windSpeed': '9 mph'}]}}),
                                                    'om': json.dumps({'hourly': {'time': None, 'wind_speed_10m': [3.0]}})}, 'an answer of another shape')]
        for what, err, bodies, why in fails_:
            del calls[:]
            mode.update(fail=err, points=nws_points, hourly=json.dumps(nws_hourly), om=json.dumps(om))
            mode.update(bodies)
            try:
                out = B.avg_weather(rows, now, False)
            except Exception as e:                  # noqa: BLE001 (the case is that nothing escapes)
                check(False, f'{what}: the forecast raised {type(e).__name__}: {e}')
                continue
            check(out['buf'] == (None, f'forecast failed: {why}') and out['lon'] == (None, f'forecast failed: {why}')
                  and out['dome'] == (0.0, 'roof') and len(calls) <= 3,
                  f'{what}: calm, said "forecast failed: {why}", never retried, nothing raised: {out["buf"]}, {out["lon"]} ({len(calls)} requests)')
            check("nflverse" not in out['buf'][1] + out['lon'][1], f"{what}: the reason names no nflverse host: {out['buf'][1]}")
        mode.update(fail=None, points=nws_points, hourly=json.dumps(nws_hourly), om=json.dumps(om))
        del calls[:]
        out = B.avg_weather(rows, now, True)
        check(not calls and out['buf'] == (None, 'offline') and out['dome'] == (0.0, 'roof'), f'offline nothing asked for: {out["buf"]}')
        cap = B.WEATHER_CAP
        B.WEATHER_CAP = 0
        try:
            out = B.avg_weather(rows, now, False)
        finally:
            B.WEATHER_CAP = cap
        check(not calls and out['buf'][0] is None and out['buf'][1].startswith('forecast skipped') and out['dome'] == (0.0, 'roof'),
              f'past the cap no request, each open game calm and said so: {out["buf"]}')
        # a request that never returns in time (a server trickling its answer: netfetch's timeout holds each read, not
        # the request): the step ends at its cap of wall clock, the game calm, every later one skipped
        B.WEATHER_CAP, mode['sleep'] = 1.0, 4.0
        try:
            t0 = time.monotonic()
            out = B.avg_weather(rows, now, False)
            took = time.monotonic() - t0
        finally:
            B.WEATHER_CAP, mode['sleep'] = cap, 0.0
        check(took < 2.0 and out['buf'] == (None, 'forecast failed: timed out') and out['lon'][1].startswith('forecast skipped')
              and out['dome'] == (0.0, 'roof'),
              f'a request that never returns: the step ends at its cap of 1 s of wall clock ({took:.2f} s), the game calm, the next skipped: {out["buf"]}, {out["lon"]}')
    finally:
        B.netfetch.download = real


def real_cache():
    print('THE INPUTS on elo/cache\'s real files: the fit\'s path and the run\'s, 2025 weeks 10-18')
    need = [f'stats_player_week_{y}.csv' for y in range(B.FIRST, 2026)] + [f'snap_counts_{y}.csv' for y in range(B.SNAP_FIRST, 2026)] \
        + [f'injuries_{y}.csv' for y in range(B.FIRST, 2026)] + ['players.csv', 'games.csv']
    lack = [n for n in need if not os.path.exists(os.path.join(B.CACHE, n))]
    if lack:
        print(f'  skipped: elo/cache lacks {", ".join(lack[:4])}{" ..." if len(lack) > 4 else ""}')
        return
    cols = ['player_id', 'season', 'week', 'team', 'position', 'game_id'] + VOL
    vol = pd.concat([pd.read_csv(os.path.join(B.CACHE, f'stats_player_week_{y}.csv'), usecols=cols, low_memory=False) for y in range(B.FIRST, 2026)], ignore_index=True)
    snaps = pd.concat([pd.read_csv(os.path.join(B.CACHE, f'snap_counts_{y}.csv'), usecols=SNAP_COLS) for y in range(B.SNAP_FIRST, 2026)], ignore_index=True)
    pl = pd.read_csv(os.path.join(B.CACHE, 'players.csv'), usecols=['gsis_id', 'pfr_id'])
    injuries = {y: pd.read_csv(os.path.join(B.CACHE, f'injuries_{y}.csv'), low_memory=False) for y in range(B.FIRST, 2026)}
    games = pd.read_csv(os.path.join(B.CACHE, 'games.csv'), low_memory=False)
    games = games[(games.season >= B.FIRST) & (games.season <= 2025)].copy()
    for c in ('home_team', 'away_team'):
        games[c] = games[c].replace(B.TEAM_NOW)
    sub = vol[(vol.season == 2025) & vol.week.between(10, 18) & vol.position.isin(['QB', 'RB', 'WR', 'TE', 'K']) & vol.game_id.notna()].copy()
    sub['team'] = sub.team.replace(B.TEAM_NOW)
    gi = games.set_index('game_id')
    sub = sub[sub.game_id.isin(gi.index)]
    frame = pd.DataFrame({'pid': sub.player_id.values, 'season': 2025, 'week': sub.week.values.astype(int), 'team': sub.team.values,
                          'group': sub.position.values, 'game_id': sub.game_id.values,
                          'home': (gi.home_team.reindex(sub.game_id).values == sub.team.values).astype(int)})
    center = B.ELO_AVG['inputs']['share_center']
    fit, _ = F.add_inputs(frame, games, 2025, True, center=center)
    g = games.copy()
    g['kick'] = [B.kickoff(a, b) for a, b in zip(g.gameday, g.gametime)]
    coming = [{'game_id': r.game_id, 'team': r.team, 'home': int(r.home), 'parts': [(r.pid, r.group)]} for r in frame.itertuples()]
    extra = {'vol': vol, 'snaps': snaps, 'pfr': {p: q for q, p in zip(pl.gsis_id, pl.pfr_id) if isinstance(p, str) and isinstance(q, str)}}
    run = B.avg_coming_inputs(coming, g, extra, injuries, max(g.kick) + datetime.timedelta(days=30), True)
    terms = [c for c in fit.columns if c.startswith('in:') and c != 'in:wind']
    bad = n = 0
    for i, r in frame.iterrows():
        v = run.get((r.pid, r.game_id))
        if v is None:
            continue
        n += 1
        for t in terms:
            if abs(v[t] - fit.at[i, t]) > 1e-9:
                bad += 1
                if bad <= 5:
                    print(f'    {r.game_id} {r.pid} {t}: run {v[t]} fit {fit.at[i, t]}')
    check(n == len(frame) and bad == 0, f'{n} player-games, {len(terms)} terms: the run\'s path the fit\'s ({bad} differences)')


fixtures()
weather()
if '--cache' in sys.argv:
    real_cache()
print(f'{len(fails)} failures')
sys.exit(1 if fails else 0)
