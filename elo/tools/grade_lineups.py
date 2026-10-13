#!/usr/bin/env python3
"""The Game snapshot's starters against who played: every player the ELO build named for a club's
game (`lineups` in elo/data/matchups.json, the Starters card), as the site published it last before
that club's kickoff, checked against nflverse's snap counts for the game. The Season Tracker grades
its Deep Dive the same way (news/tools/context.js gradeLineups, tools/out/weekN-lineups-grade.md);
this is the ELO side's first such grade, written when the owner asked which of the two is more
accurate (13 October 2026). It reads the published files from git, so it needs the history
(`git fetch --deepen`), and changes nothing.

    python3 elo/tools/grade_lineups.py 5          # week 5 of the season in elo/cache/games.csv

A player graded as playing took a snap on offence or defence (a kicker: on special teams). Each
club's lineup is the last commit of matchups.json before its kickoff whose lineup was for that game;
a club with none (the lineups first published 10 October 2026) is said and left out. Beside it, on
the same clubs, the Deep Dive's frozen lineups (news/tools/out/weekN-lineups.json) on the same rule.
"""
import io, json, os, re, subprocess, sys, unicodedata
from datetime import datetime, timedelta, timezone

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
import build  # noqa: E402

REL = 'https://github.com/nflverse/nflverse-data/releases/download'
AB = {'LA': 'LAR', 'STL': 'LAR', 'OAK': 'LV', 'SD': 'LAC', 'WSH': 'WAS', 'JAC': 'JAX'}   # news/tools/lib.js ab()
ab = lambda t: AB.get(t, t)


def git(*a):
    return subprocess.run(['git', '-C', ROOT, *a], check=True, capture_output=True, text=True).stdout


def norm(n):
    n = unicodedata.normalize('NFKD', str(n)).encode('ascii', 'ignore').decode().lower()
    n = re.sub(r"[.'`]", '', n)
    n = re.sub(r'\b(jr|sr|ii|iii|iv|v)\b', '', n)
    return ' '.join(n.split())


def short(n):
    w = norm(n).split(' ')
    return f'{w[0][0]}.{" ".join(w[1:])}' if len(w) > 1 else w[0]


def kickoff(r):
    """games.csv's Eastern date and time as UTC (EDT through the first Sunday of November)"""
    t = datetime.strptime(f'{r.gameday} {r.gametime}', '%Y-%m-%d %H:%M')
    nov1 = datetime(t.year, 11, 1)
    dst_end = nov1 + timedelta(days=(6 - nov1.weekday()) % 7, hours=2)
    return (t + timedelta(hours=4 if t < dst_end else 5)).replace(tzinfo=timezone.utc)


def main():
    week = int(sys.argv[1]) if len(sys.argv) > 1 else None
    if week is None:
        raise SystemExit('usage: grade_lineups.py WEEK')
    games = pd.read_csv(build.fetch(build.GAMES_URL, os.path.join(build.CACHE, 'games.csv'), False), low_memory=False)
    season = int(games.season.max())
    gw = games[(games.season == season) & (games.week == week) & (games.game_type == 'REG')]
    kick = {}
    for r in gw.itertuples(index=False):
        for t in (r.home_team, r.away_team):
            kick[ab(t)] = (r.game_id, kickoff(r))
    dd = os.path.join(build.CACHE, 'grade')
    os.makedirs(dd, exist_ok=True)
    def nfl(path, name):
        f = os.path.join(dd, name)
        if os.path.exists(f):
            os.remove(f)                      # the season under way changes every day
        return pd.read_csv(build.fetch(f'{REL}/{path}', f, False), low_memory=False)
    snaps = nfl(f'snap_counts/snap_counts_{season}.csv', f'snap_counts_{season}.csv')
    roster = nfl(f'rosters/roster_{season}.csv', f'roster_{season}.csv')
    snaps = snaps[(snaps.week == week) & (snaps.game_type == 'REG')].copy()
    snaps['t'] = snaps.team.map(ab)
    clubs_in = set(snaps.t)
    pfr = {g: p for g, p in zip(roster.gsis_id, roster.pfr_id) if isinstance(g, str) and isinstance(p, str)}
    name_of = {g: n for g, n in zip(roster.gsis_id, roster.full_name) if isinstance(g, str)}
    pos_of = {g: (d if isinstance(d, str) else p) for g, d, p in zip(roster.gsis_id, roster.depth_chart_position, roster.position) if isinstance(g, str)}
    played, byname = set(), set()
    for r in snaps.itertuples(index=False):
        on = (r.offense_snaps or 0) + (r.defense_snaps or 0)
        st = r.st_snaps or 0
        for key, ok in (('play', on > 0), ('st', st > 0)):
            if ok:
                played.add((key, r.pfr_player_id))
                byname.add((key, r.t, norm(r.player)))
                byname.add((key, r.t, short(r.player)))

    def took(t, gid, name, kicker):
        key = 'st' if kicker else 'play'
        p = pfr.get(gid)
        return (p is not None and (key, p) in played) or (key, t, norm(name)) in byname or (key, t, short(name)) in byname

    # the ELO side: matchups.json as published last before each club's kickoff
    hist = [l.split() for l in git('log', 'origin/main', '--format=%h %ct', '--', 'elo/data/matchups.json').split('\n') if l]
    hist = sorted(((int(ct), h) for h, ct in hist))
    elo, none = {}, []
    files = {}
    for t, (game_id, k) in sorted(kick.items()):
        if t not in clubs_in:
            continue
        pick = None
        for ct, h in hist:
            if ct >= k.timestamp():
                break
            if h not in files:
                files[h] = json.loads(git('show', f'{h}:elo/data/matchups.json')).get('lineups') or {}
            L = next((v for k, v in files[h].items() if ab(k) == t), None)   # the ELO files key the Rams as LA
            if L and L.get('game_id') == game_id:
                pick = (h, ct, L['players'])
        if pick:
            elo[t] = pick
        else:
            none.append(t)

    # the Deep Dive side: its own frozen file
    ddf = os.path.join(ROOT, 'news', 'tools', 'out', f'week{week}-lineups.json')
    DDL = json.load(open(ddf))['teams'] if os.path.exists(ddf) else {}

    def grade(label, items):
        return len(items), [x for x in items if not x[3]]
    elo_items, dd_items = [], []
    for t, (h, ct, players) in sorted(elo.items()):
        for gid in players:
            pos = pos_of.get(gid, '?')
            elo_items.append((t, gid, name_of.get(gid, gid), took(t, gid, name_of.get(gid, ''), pos in ('K', 'P')), pos))
    for t in sorted(elo):
        e = next((v for k, v in DDL.items() if ab(k) == t), None)
        if not e:
            continue
        for u, lst in e['units'].items():
            for p in lst:
                dd_items.append((t, p.get('id'), p['n'], took(t, p.get('id'), p['n'], False), p.get('pos', '?'), u))
    ne, me = grade('elo', elo_items)
    nd, md = grade('dd', dd_items)
    pct = lambda m, n: f'{100 * len(m) / n:.1f}%' if n else 'n/a'
    qb_e = [x for x in me if x[4] == 'QB']
    qb_d = [x for x in md if x[4] == 'QB']
    out = [f'# Week {week} starters against who played: the Game snapshot and the Deep Dive', '',
           f'Graded {datetime.now(timezone.utc):%Y-%m-%d} from nflverse\'s snap counts (`elo/tools/grade_lineups.py {week}`). '
           f'A named player who took no snap on offence or defence (a kicker or punter: on special teams) did not play.', '',
           f'- **Game snapshot** (`elo/data/matchups.json` `lineups`, the last published before each kickoff): '
           f'{len(elo)} clubs, {ne} players named, {len(me)} without a snap ({pct(me, ne)}); quarterbacks missed: {len(qb_e)}.',
           f'- **Deep Dive** (`news/tools/out/week{week}-lineups.json`, frozen at each kickoff), same clubs: '
           f'{len({x[0] for x in dd_items})} clubs, {nd} players named, {len(md)} without a snap ({pct(md, nd)}); quarterbacks missed: {len(qb_d)}.']
    # the two name different players: the snapshot no offensive line but every defender and the kicker,
    # the Deep Dive the line and fewer defenders; so the like-for-like line counts the positions both name
    OL_K = {'T', 'G', 'C', 'OL', 'K', 'P', 'LS'}
    se = [x for x in elo_items if x[4] not in OL_K]
    sd = [x for x in dd_items if x[4] not in OL_K]
    mse, msd = [x for x in se if not x[3]], [x for x in sd if not x[3]]
    out.append(f'- **Like for like** (quarterbacks, backs, receivers, tight ends and defenders; no line, no kicker): '
               f'snapshot {len(mse)} of {len(se)} without a snap ({pct(mse, len(se))}), Deep Dive {len(msd)} of {len(sd)} ({pct(msd, len(sd))}).')
    if none:
        out.append(f'- No snapshot lineup was published before kickoff for: {", ".join(none)} (the snapshot's lineups were first published 10 October 2026).')
    out += ['', '## Game snapshot: named and did not play', '']
    out += [f'- {t}: {n} ({p})' for t, _, n, _, p in me] or ['- none']
    out += ['', '## Deep Dive, same clubs: named and did not play', '']
    out += [f'- {t} {u}: {n} ({p})' for t, _, n, _, p, u in md] or ['- none']
    text = '\n'.join(out) + '\n'
    dest = os.path.join(HERE, 'out')
    os.makedirs(dest, exist_ok=True)
    with open(os.path.join(dest, f'week{week}-lineups-grade.md'), 'w') as f:
        f.write(text)
    print(text)


if __name__ == '__main__':
    main()
