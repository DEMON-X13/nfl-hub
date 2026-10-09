#!/usr/bin/env python3
"""The Elo job's gate: elo/data as written by elo/build.py, held against the files it was built
from (the schedule, the roster, the injury report, the team stats) and against what was
published before. Run after the build and before the commit; any failure exits 1 and the job
commits nothing, so the last good files stay live.

    python3 elo/check.py                      # elo/data against elo/cache, the last commit's files as "before"
    python3 elo/check.py --data D --cache C --prev P --history H    (tests: another build's output;
                                              P is a players.json, read with the model.json and
                                              calls.json beside it as the last publish)

Every check is an invariant of the data, never this week's particulars: a bye week, a lean
Monday, week 1, a week whose injury report is not filed yet, or a game already played must
all pass. What each one would have caught is said beside it.

  ROSTER     a player on his club's current roster (its own latest week: a club on its bye has
             no rows for the bye week) is not a free agent; every club keeps its players in the
             players map; in season, no club has more than a handful of free agents among the
             sidelined (in the offseason they are real).
             (Mahomes, Kelce and Bryce Young were "free agents" every bye week.)
  REPORT     nobody the report has Out or Doubtful for his club's next game is in that game's
             expected lineup or projected; nor, before the club files its statuses, anybody Out
             or Doubtful at its previous report who has not practised since (or whose club has
             filed nothing yet); nobody on injured reserve is ranked or expected to start.
             (Caleb Williams, Out in week 4 and not practising, was CHI's expected QB in week 5.)
  CALENDAR   the rankings' "through week" is a week whose games are all played; the season is
             one with a final game; nothing is projected for a game that had kicked off when the
             files were built. (One Thursday game made it "week 5" and raised the games bar.)
  CARRY      a top-ten player of the last published rankings (same season, same formula) is
             still ranked or listed as sidelined unless his club has played since, or has had a
             game rated since (nflverse's player stats come in a night after the score, so a
             Sunday game a Sunday build saw final is rated on Tuesday), or he changed clubs. (The
             #1 tight end and four top-15 quarterbacks vanished on a Friday with no note.)
  RECORD     every graded call is the one in the ledger; every call in the history is graded as
             it stands there (its pick and whether it was published or a backtest) unless the
             ledger has a later call that was itself published before kickoff; every call the
             last publish had for a game this build could no longer call is kept as it was; a
             call in the ledger marked published was made before its kickoff. (2026_03_SEA_WAS
             was shown as WAS and graded as SEA; a build that regrades the season must fail.)
  SOURCES    the season's injury report, roster and team stats are present; Total Offense and
             Total Defense are not all 1500 once games are rated; no group is empty.
  UNITS      the build's own functions on fixtures: two equal teams at a neutral site are 50/50;
             a fullback listed first does not take the second running back's place; a club on its
             bye keeps its roster; a player out last week and not practising stays out.
"""
import argparse, datetime, json, os, subprocess, sys

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import build  # noqa: E402

fails, notes = [], []
checks = 0


def chk(ok, msg):
    global checks
    checks += 1
    if not ok:
        fails.append(msg)


def load_json(path):
    with open(path) as f:
        return json.load(f)


def published(name, prev_arg):
    """elo/data/<name> as last published: beside the players.json given with --prev (tests), else
    the last commit's (in the job, HEAD is what the site serves until this run commits). None
    when there is none: the first run after a file is added has nothing to hold it against."""
    if prev_arg:
        p = prev_arg if name == 'players.json' else os.path.join(os.path.dirname(os.path.abspath(prev_arg)), name)
        return load_json(p) if os.path.exists(p) else None
    try:
        out = subprocess.run(['git', '-C', ROOT, 'show', f'HEAD:elo/data/{name}'], capture_output=True, text=True, check=True).stdout
        return json.loads(out)
    except (subprocess.CalledProcessError, ValueError, OSError):
        return None


def unit_checks():
    """the build's functions on fixtures"""
    import numpy as np
    # a neutral site: the game model fitted on games where the home side wins 58% of the time,
    # then asked about two identical lineups: a coin flip at a neutral site, the home side ahead
    # at its own ground (home field was a free intercept every game got, Wembley included)
    rng = np.random.default_rng(1)
    n = 4000
    diff = rng.normal(0, 0.5, (n, 8))
    hf = (rng.random(n) > 0.05).astype(float)
    y = (rng.random(n) < 1 / (1 + np.exp(-(0.3 * hf + diff @ np.full(8, 0.4))))).astype(float)
    w = build.logistic_fit(np.column_stack([hf, diff]), y)
    p0 = float(build.predict(w, np.array([[0.0] + [0.0] * 8]))[0])
    p1 = float(build.predict(w, np.array([[1.0] + [0.0] * 8]))[0])
    chk(abs(p0 - 0.5) < 1e-9, f'UNITS: two equal teams at a neutral site are not 50/50 ({p0:.4f}): home field is applied where there is none')
    chk(p1 > 0.53, f'UNITS: two equal teams at the home side\'s ground should lean home ({p1:.4f})')
    # the depth chart: a fullback at rank 1 sorts after the running backs
    ranked = build._ranked([('RB', 'rb1', (0, 1)), ('RB', 'fb', (1, 1)), ('RB', 'rb2', (0, 2)), ('RB', 'rb3', (0, 3))])
    chk([p for p, _ in ranked['RB']][:2] == ['rb1', 'rb2'], f'UNITS: a fullback took the second running back\'s place: {ranked["RB"]}')
    # the charts read the same whatever order their rows come in (four linebackers level at
    # rank 1, the weekly file's depth ties): the order among equals used to be the file's, or
    # an unstable sort's, and moved the walk-forward record with the numpy build
    weekly = pd.DataFrame([
        {'gsis_id': f'lb{i}', 'week': 3, 'club_code': 'X', 'position': p, 'formation': 'Defense', 'depth_team': 1}
        for i, p in enumerate(['OLB', 'ILB', 'MLB', 'OLB'])] + [
        {'gsis_id': 'rb1', 'week': 3, 'club_code': 'X', 'position': 'RB', 'formation': 'Offense', 'depth_team': 1},
        {'gsis_id': 'fb1', 'week': 3, 'club_code': 'X', 'position': 'FB', 'formation': 'Offense', 'depth_team': 1},
        {'gsis_id': 'rb2', 'week': 3, 'club_code': 'X', 'position': 'RB', 'formation': 'Offense', 'depth_team': 2}])
    daily = pd.DataFrame([
        {'gsis_id': f'd{i}', 'team': 'X', 'dt': '2026-10-01T10:00:00Z', 'pos_abb': p, 'pos_rank': 1}
        for i, p in enumerate(['WLB', 'LILB', 'RILB', 'SLB'])] + [
        {'gsis_id': 'r1', 'team': 'X', 'dt': '2026-10-01T10:00:00Z', 'pos_abb': 'RB', 'pos_rank': 1},
        {'gsis_id': 'f1', 'team': 'X', 'dt': '2026-10-01T10:00:00Z', 'pos_abb': 'FB', 'pos_rank': 1},
        {'gsis_id': 'r2', 'team': 'X', 'dt': '2026-10-01T10:00:00Z', 'pos_abb': 'RB', 'pos_rank': 2}])
    a = build.build_lineups({2020: weekly, 2026: daily}, {})
    b = build.build_lineups({2020: weekly.iloc[::-1].reset_index(drop=True), 2026: daily.iloc[::-1].reset_index(drop=True)}, {})
    chk(a[0] == b[0] and a[1] == b[1], 'UNITS: the depth charts read differently when their rows come in another order')
    rb = lambda chart: [x[0] if isinstance(x, tuple) else x for x in chart['RB']][:2]
    chk(rb(a[0][(2020, 3, 'X')]) == ['rb1', 'rb2'] and rb(a[1]['X'][0][1]) == ['r1', 'r2'],
        'UNITS: a fullback took the second running back\'s place in a chart')
    # the roster: club A on its bye (its latest rows are week 4), club B at week 5, a player who
    # left B after week 4, one on IR
    roster = pd.DataFrame([
        {'gsis_id': 'a1', 'team': 'A', 'week': 4, 'status': 'ACT'},
        {'gsis_id': 'a2', 'team': 'A', 'week': 4, 'status': 'RES'},
        {'gsis_id': 'b1', 'team': 'B', 'week': 5, 'status': 'ACT'},
        {'gsis_id': 'b2', 'team': 'B', 'week': 4, 'status': 'ACT'},
        {'gsis_id': 'b3', 'team': 'B', 'week': 5, 'status': 'INA'},
    ])
    inj = pd.DataFrame([
        # B's week-5 report (statuses filed): b1 questionable and practising
        {'gsis_id': 'b1', 'team': 'B', 'week': 5, 'report_status': 'Questionable', 'practice_status': 'Limited Participation in Practice', 'report_primary_injury': 'Ankle'},
        {'gsis_id': 'b3', 'team': 'B', 'week': 5, 'report_status': 'Questionable', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Knee'},
        # A's week-3 report: a1 out; week 6 not filed yet (no rows)
        {'gsis_id': 'a1', 'team': 'A', 'week': 3, 'report_status': 'Out', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Hamstring'},
        # C: x1 out in week 4, not practising in week 5 (statuses not filed); x2 out in week 4,
        # practising fully; x3 out in week 4 and not on C's week-5 report
        {'gsis_id': 'x1', 'team': 'C', 'week': 4, 'report_status': 'Out', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Thumb'},
        {'gsis_id': 'x2', 'team': 'C', 'week': 4, 'report_status': 'Out', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Rib'},
        {'gsis_id': 'x3', 'team': 'C', 'week': 4, 'report_status': 'Doubtful', 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': 'Calf'},
        {'gsis_id': 'x1', 'team': 'C', 'week': 5, 'report_status': None, 'practice_status': 'Did Not Participate In Practice', 'report_primary_injury': None},
        {'gsis_id': 'x2', 'team': 'C', 'week': 5, 'report_status': None, 'practice_status': 'Full Participation in Practice', 'report_primary_injury': None},
    ])
    out, team, q, _ = build.availability(roster, inj, {'A': 6, 'B': 5, 'C': 5})
    chk(out.get('a1') is not None and 'not filed' in out['a1'], f'UNITS: a player out at his club\'s last report, with this week\'s not filed, should stay out: {out.get("a1")}')
    chk(out.get('b1') is None and 'b1' in q, f'UNITS: a questionable player who practised should be listed with a Q: {out.get("b1")} {q.get("b1")}')
    chk(out.get('b3') is not None, 'UNITS: a questionable player who did not practise at the last report should be counted out')
    chk(out.get('a2') == 'on injured reserve', 'UNITS: an injured reserve player on a club on its bye lost his status')
    chk(out.get('b2') == 'a free agent', 'UNITS: a player who left his club after week 4 is not a free agent')
    chk('a1' in team and team['a1'] == 'A', 'UNITS: a club on its bye lost its roster')
    chk(out.get('x1') is not None and out.get('x2') is None and out.get('x3') is None,
        f'UNITS: out last week and not practising should stay out, practising or off the report should clear: {out.get("x1")}, {out.get("x2")}, {out.get("x3")}')
    # the season: a schedule months away is not under way; a season a week old is
    g = pd.DataFrame([{'season': 2027, 'gameday': '2027-09-09', 'gametime': '20:20'}])
    chk(not build.under_way(g, 2027, datetime.datetime(2027, 5, 15, tzinfo=datetime.timezone.utc))
        and build.under_way(g, 2027, datetime.datetime(2027, 9, 16, tzinfo=datetime.timezone.utc)), 'UNITS: under_way() misreads the calendar')
    # kickoffs from the zone: 1pm Eastern is 17:00 UTC in October and 18:00 UTC in December
    chk(build.kickoff('2026-10-11', '13:00').hour == 17 and build.kickoff('2026-12-13', '13:00').hour == 18, 'UNITS: kickoff() has the clocks wrong')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=os.path.join(HERE, 'data'))
    ap.add_argument('--cache', default=os.path.join(HERE, 'cache'))
    ap.add_argument('--history', default=os.path.join(HERE, 'history'))
    ap.add_argument('--prev', help='the previously published players.json (default: the last commit\'s)')
    a = ap.parse_args()

    unit_checks()
    P = load_json(os.path.join(a.data, 'players.json'))
    M = load_json(os.path.join(a.data, 'model.json'))
    MU = load_json(os.path.join(a.data, 'matchups.json')) if os.path.exists(os.path.join(a.data, 'matchups.json')) else {}
    calls_path = os.path.join(a.data, 'calls.json')
    L = load_json(calls_path) if os.path.exists(calls_path) else None
    built = datetime.datetime.fromisoformat(M['built_at'])
    games = pd.read_csv(os.path.join(a.cache, 'games.csv'), low_memory=False)
    games['kick'] = [build.kickoff(d, t) for d, t in zip(games.gameday, games.gametime)]
    season = int(M['season'])
    rank_season = int(P['season'])
    sg = games[games.season == season]
    groups = M['groups']
    players = P['players']

    # ---- CALENDAR ----
    chk(sg.home_score.notna().any(), f'CALENDAR: the season in play ({season}) has no final game in games.csv: a schedule was taken for a season under way')
    chk(rank_season in (season, season - 1), f'CALENDAR: the rankings\' season {rank_season} is neither the season in play nor the one before')
    rg = games[(games.season == rank_season) & (games.game_type == 'REG')]
    tw = int(P.get('through_week') or 0)
    if tw:
        wk = rg[rg.week == tw]
        unplayed = wk[wk.home_score.isna() & (wk.kick > built - datetime.timedelta(days=3))]
        chk(not len(unplayed), f'CALENDAR: the rankings say "through week {tw}" with {len(unplayed)} of its {len(wk)} games still to play')
    started = {gid for gid, k in zip(games.game_id, games.kick) if k <= built}
    for pid, v in (MU.get('players') or {}).items():
        if v.get('game_id') in started:
            chk(False, f'CALENDAR: {v["game_id"]} had kicked off when the files were built but is still projected ({pid})')
            break
    for c in (M.get('next') or {}).get('games', []):
        if c['game_id'] in started and not c.get('frozen'):
            chk(False, f'CALENDAR: {c["game_id"]} had kicked off but was called afresh rather than kept at its frozen call')
            break

    # ---- SOURCES ----
    for g in groups:
        chk(len(P['groups'][g]['top']) >= 10, f'SOURCES: the {g} rankings have {len(P["groups"][g]["top"])} players: a source is missing or the season is mistaken')
    sched = int(games.season.max())
    live = build.under_way(games, sched, built)
    need = [f'injuries_{sched}.csv', f'roster_{sched}.csv', f'stats_team_week_{season}.csv', f'stats_player_week_{season}.csv', f'depth_charts_{sched}.csv'] if live else []
    for name in need:
        p = os.path.join(a.cache, name)
        chk(os.path.exists(p) and os.path.getsize(p) > 100, f'SOURCES: {name} is missing: the season under way cannot be built without it')
    U = M.get('units') or {}
    off = U.get('off') or {}
    played_units = [v for v in off.values() if v.get('games')]
    us = int(U.get('season', season))
    rated_finals = games[(games.season == us) & games.home_score.notna()]
    if len(rated_finals) >= 2 and off:
        chk(len({v['elo'] for v in off.values()}) > 1, 'SOURCES: Total Offense is 1500 for every team with games played: the team stats are missing')
        chk(len(played_units) > 0, 'SOURCES: no unit has a rated game')
    srcs = M.get('sources') or {}
    for k, v in srcs.items():
        if isinstance(v, dict) and v.get('required') and not v.get('ok'):
            chk(False, f'SOURCES: {k} is required and was not had: {v.get("error")}')
    pend = srcs.get('player_stats_pending') or []
    if pend:
        notes.append(f'{len(pend)} final game(s) not yet in nflverse\'s player stats: {", ".join(pend[:6])}')

    # ---- ROSTER ----
    roster_path = os.path.join(a.cache, f'roster_{sched}.csv')
    if not os.path.exists(roster_path) and not live:      # before a season is under way, last season's stands in
        roster_path = os.path.join(a.cache, f'roster_{sched - 1}.csv')
    roster = pd.read_csv(roster_path, low_memory=False) if os.path.exists(roster_path) else None
    if roster is not None:
        roster = roster[roster.gsis_id.map(lambda v: isinstance(v, str))]
        rw = pd.to_numeric(roster.week, errors='coerce')
        club_latest = rw.groupby(roster.team).max()
        current = {pid: (t, st) for pid, t, st, w in zip(roster.gsis_id, roster.team, roster.status, rw) if w >= club_latest.get(t, w)}
        fa_by_club = {}
        for g in groups:
            for x in P['groups'][g]['sidelined']:
                if 'free agent' in x['why']:
                    t_st = current.get(x['id'])
                    if t_st and t_st[1] in ('ACT', 'INA'):
                        chk(False, f'ROSTER: {x["name"]} is on {t_st[0]}\'s current roster ({t_st[1]}) but called a free agent')
                    fa_by_club[x['team']] = fa_by_club.get(x['team'], 0) + 1
        worst = max(fa_by_club.items(), key=lambda kv: kv[1], default=(None, 0))
        # (in season only: from the Super Bowl to the new season's rankings, last season's
        # players really do leave their clubs in numbers, and are free agents until they sign)
        if P.get('phase', 'regular') in ('regular', 'postseason'):
            chk(worst[1] <= 4, f'ROSTER: {worst[1]} of {worst[0]}\'s players are listed as free agents: the club\'s roster was not read')
        ir = {pid for pid, (t, st) in current.items() if st == 'RES'}
        for g in groups:
            bad = [r['name'] for r in P['groups'][g]['top'] if r['id'] in ir]
            chk(not bad, f'ROSTER: on injured reserve but ranked: {bad}')
        lineup_ids = {p for v in (MU.get('lineups') or {}).values() for p in v['players']}
        bad = [p for p in lineup_ids if p in ir]
        chk(not bad, f'ROSTER: on injured reserve but in an expected lineup: {bad[:5]}')
    clubs = set(sg.home_team) | set(sg.away_team)
    by_club = {}
    for v in players.values():
        by_club[v.get('team')] = by_club.get(v.get('team'), 0) + 1
    thin = sorted(t for t in clubs if by_club.get(t, 0) < 15)
    chk(not thin, f'ROSTER: clubs with fewer than 15 players in the players map: {thin}')

    # ---- REPORT ----
    inj_path = os.path.join(a.cache, f'injuries_{int(games[games.kick > built].season.min()) if (games.kick > built).any() else sched}.csv')
    if os.path.exists(inj_path) and MU:
        inj = pd.read_csv(inj_path, low_memory=False)
        inj = inj[inj.gsis_id.map(lambda v: isinstance(v, str)) & inj.week.notna()]
        expected_by_club = {t: set(v['players']) for t, v in (MU.get('lineups') or {}).items()}
        if not expected_by_club:      # an older file without lineups: the projected starters stand in
            for pid, v in (MU.get('players') or {}).items():
                expected_by_club.setdefault(v['team'], set()).add(pid)
        future = games[games.kick > built].sort_values('kick', kind='mergesort')
        nxt = {}
        for r in future.itertuples(index=False):
            for t in (r.home_team, r.away_team):
                nxt.setdefault(t, int(r.week))
        for t, w in nxt.items():
            mine = inj[inj.team == t]
            cur = mine[mine.week == w]
            exp = expected_by_club.get(t, set())
            filed = cur.report_status.notna().any()
            gone = set(cur[cur.report_status.isin(['Out', 'Doubtful'])].gsis_id)
            if not filed:
                before = mine[mine.week < w]
                if len(before):
                    pw = before.week.max()
                    was = set(before[(before.week == pw) & before.report_status.isin(['Out', 'Doubtful'])].gsis_id)
                    practising = set(cur[cur.practice_status.fillna('').str.contains('Full|Limited')].gsis_id)
                    on_report = set(cur.gsis_id)
                    gone |= {p for p in was if p not in practising and (p in on_report or not len(cur))}
            bad = sorted(gone & exp)
            nm = {r.gsis_id: r.full_name for r in mine.itertuples(index=False)}
            chk(not bad, f'REPORT: {t} week {w}: expected to start though out, or out last week and not practising: {[nm.get(p, p) for p in bad]}')

    # ---- CARRY ----
    prev = published('players.json', a.prev)
    prev_model = published('model.json', a.prev)
    if prev and prev.get('season') == P.get('season') and prev.get('formula') == P.get('formula') and prev.get('built_at') != P.get('built_at'):
        pb = datetime.datetime.fromisoformat(prev['built_at'])
        since = games[(games.kick > pb - datetime.timedelta(hours=4)) & (games.kick <= built)]
        moved = set(since.home_team) | set(since.away_team)
        # a club whose game was rated by this build and not by the last: its games played, and
        # so the rankings' bar (half of them), can move although it kicked off long before the
        # last publish, because nflverse's player stats land a night after the score
        rated_before = {c['game_id'] for c in ((prev_model or {}).get('graded') or [])}
        for gid in {c['game_id'] for c in (M.get('graded') or [])} - rated_before:
            r = games[games.game_id == gid]
            if len(r):
                moved |= {r.home_team.iloc[0], r.away_team.iloc[0]}
        for g in groups:
            now_ids = {r['id'] for r in P['groups'][g]['top']} | {x['id'] for x in P['groups'][g]['sidelined']}
            for r in prev['groups'][g]['top'][:10]:
                if r['id'] in now_ids:
                    continue
                club = (players.get(r['id']) or {}).get('team') or r['team']
                chk(club in moved or r['team'] in moved or club != r['team'],
                    f'CARRY: {r["name"]} ({r["team"]}) was #{r["rank"]} at {g} and is neither ranked nor sidelined now, though his club has not played or had a game rated since')
    elif prev and prev.get('built_at') != P.get('built_at'):
        notes.append('the last published rankings are of another season or formula: the carry check is skipped once')

    # ---- RECORD ----
    graded = M.get('graded') or []
    chk(L is not None, 'RECORD: no calls.json: the record is not graded on calls frozen at kickoff')
    ledger = (L or {}).get('calls', {})
    kick = dict(zip(games.game_id, games.kick))
    lead = datetime.timedelta(minutes=build.CALL_LEAD)
    at = lambda e: datetime.datetime.fromisoformat(e['at'])
    # a call that counts as published before its game: marked so, and made CALL_LEAD before kickoff
    in_time = lambda gid, e: bool(e) and e.get('src') == 'published' and gid in kick and at(e) <= kick[gid] - lead
    for c in graded:
        e = ledger.get(c['game_id'])
        if e is None or e['pick'] != c['pick'] or e.get('src') != c.get('src'):
            chk(False, f'RECORD: {c["game_id"]} is graded as {c["pick"]} ({c.get("src")}) but the ledger has {e and e["pick"]} ({e and e.get("src")})')
            break
    hist_path = os.path.join(a.history, f'calls_{season}.json')
    hist = (load_json(hist_path).get('calls', {}) if os.path.exists(hist_path) else {})
    byid = {c['game_id']: c for c in graded}
    # the history is what was published before the ledger began, and the record grades it as it
    # stands there. Only a later call that was itself published before kickoff supersedes it: a
    # call recomputed after the game (a build that regrades the season writes those with today's
    # time) never does
    wrong = []
    for gid, e in hist.items():
        if gid not in byid:
            continue
        cur = ledger.get(gid)
        want = cur if in_time(gid, cur) and at(cur) > at(e) else e
        if byid[gid]['pick'] != want['pick'] or byid[gid].get('src') != want['src']:
            wrong.append(gid)
    chk(not wrong, f'RECORD: graded other than as published (or as first called, for a backtest): {sorted(wrong)[:6]}{" ..." if len(wrong) > 6 else ""} of {len(wrong)}')
    # the ledger against the last publish's: a game this build could not call again (kicked off,
    # or within CALL_LEAD of it, when built) keeps the call the last publish had for it, its pick
    # and its src; only a game still to come may be called afresh. (Skipped the first time, when
    # the last publish has no calls.json.)
    prev_calls = published('calls.json', a.prev)
    if prev_calls and isinstance(prev_calls.get('calls'), dict):
        keep_from = int((L or {}).get('season', season)) - 1        # the ledger keeps this season and the one before
        moved_calls = []
        for gid, e in prev_calls['calls'].items():
            if gid not in kick or int(gid[:4]) < keep_from or kick[gid] > built + lead:
                continue
            cur = ledger.get(gid)
            if cur is None or cur['pick'] != e['pick'] or cur.get('src') != e.get('src'):
                moved_calls.append(gid)
        chk(not moved_calls, f'RECORD: calls the last publish had frozen were changed or dropped: {sorted(moved_calls)[:6]}{" ..." if len(moved_calls) > 6 else ""} of {len(moved_calls)}')
    elif L is not None:
        notes.append('the last publish has no calls.json: the ledger is not held against it this once')
    late = [gid for gid, e in ledger.items() if e.get('src') == 'published' and gid in kick and not in_time(gid, e)]
    chk(not late, f'RECORD: calls marked published that were made at or after kickoff: {late[:5]}')
    for c in graded:
        if 'src' not in c:
            chk(False, 'RECORD: a graded call does not say whether it was published before kickoff or is a backtest')
            break

    print(f'elo check: {checks} checks, {len(fails)} failures')
    for n in notes:
        print('  note: ' + n)
    for f in fails:
        print('  FAIL: ' + f)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
