#!/usr/bin/env python3
"""The ELO Model's calls as they were published, recovered from the history of elo/data/model.json.

    python3 elo/tools/seed_calls.py 2026      # writes elo/history/calls_2026.json

Until 2026-10-09 the build regraded the whole season on every run, on whatever formula and tie
order it had that day, so the Pick'em Record graded calls nobody had seen before kickoff
(2026_03_SEA_WAS was published as WAS, and later graded as a SEA pick and a loss). From then on
elo/build.py keeps a ledger (elo/data/calls.json) and grades the call frozen at kickoff. This
script writes the ledger's starting point from what was actually published: every commit that
changed model.json is read in order, its commit time taken as the time it went live, and

  - a call in `next` published before its game's kickoff is that game's call (the last such
    commit wins: the call a visitor saw going into the game), src "published";
  - a game no commit called before kickoff (weeks 1-2: model.json first appeared on Sep 24 with
    them already graded; or a Thursday game first shown after it was played) keeps the call it
    was first published with, src "backtest": pre-game ratings, but made after the game.

It is run once per season to seed the ledger; the build reads the file and never changes it.
"""
import datetime, json, os, subprocess, sys

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ELO = os.path.dirname(HERE)
ROOT = os.path.dirname(ELO)
sys.path.insert(0, ELO)
from build import kickoff  # noqa: E402  (games.csv's Eastern kickoff, as the build reads it)


def git(*args):
    return subprocess.run(['git', '-C', ROOT, *args], check=True, capture_output=True, text=True).stdout


def main():
    season = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    games = pd.read_csv(os.path.join(ELO, 'cache', 'games.csv'), low_memory=False)
    games = games[games.season == season]
    kick = {g: kickoff(d, t) for g, d, t in zip(games.game_id, games.gameday, games.gametime)}
    log = [line.split(' ', 1) for line in git('log', '--reverse', '--format=%H %cI', '--', 'elo/data/model.json').split('\n') if line]
    published, backtest = {}, {}
    for sha, when in log:
        at = datetime.datetime.fromisoformat(when).astimezone(datetime.timezone.utc)
        try:
            m = json.loads(git('show', f'{sha}:elo/data/model.json'))
        except (subprocess.CalledProcessError, ValueError):
            continue
        if int(m.get('season', 0)) != season:
            continue
        stamp = at.isoformat(timespec='minutes')
        for c in (m.get('next') or {}).get('games', []):
            gid = c['game_id']
            if gid not in kick:
                continue
            row = {'pick': c['pick'], 'p_home': c['p_home'], 'at': stamp, 'commit': sha[:7]}
            if at < kick[gid]:
                published[gid] = {**row, 'src': 'published'}
            else:
                backtest.setdefault(gid, {**row, 'src': 'backtest'})
        for c in m.get('graded', []):
            gid = c['game_id']
            backtest.setdefault(gid, {'pick': c['pick'], 'p_home': c['p_home'], 'at': stamp, 'commit': sha[:7], 'src': 'backtest'})
    calls = {**{g: c for g, c in backtest.items() if g not in published}, **published}
    out = {'season': season,
           'about': 'the ELO Model calls published before elo/data/calls.json existed, recovered from the history of '
                    'elo/data/model.json by elo/tools/seed_calls.py (its docstring says how); the build reads it and never changes it',
           'calls': dict(sorted(calls.items()))}
    os.makedirs(os.path.join(ELO, 'history'), exist_ok=True)
    path = os.path.join(ELO, 'history', f'calls_{season}.json')
    with open(path, 'w') as f:
        json.dump(out, f, indent=1)
        f.write('\n')
    n_pub = sum(1 for c in calls.values() if c['src'] == 'published')
    print(f'{path}: {len(calls)} calls, {n_pub} published before kickoff, {len(calls) - n_pub} backtest, from {len(log)} commits')


if __name__ == '__main__':
    main()
