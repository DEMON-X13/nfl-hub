"""Write the tables in README.md (between its <!-- tables --> markers) from results/, so the
numbers in the prose's tables are always the last run's.

Run: python3 -I report.py   (from research/win_indicators, after rank.py)
"""
import json, os, re

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, 'results')
README = os.path.join(HERE, 'README.md')


def pct(x, d=1):
    return '' if pd.isna(x) else f'{100 * x:.{d}f}%'


def num(x, d=3):
    return '' if pd.isna(x) else f'{x:.{d}f}'


def table(rows, head):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '|'.join('---' for _ in head) + '|']
    out += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return '\n'.join(out)


def r(name):
    return pd.read_csv(os.path.join(RES, name))


def main():
    ig, top = r('in_game.csv'), r('in_game_top15.csv')
    pg = r('pre_game.csv')
    bm = json.load(open(os.path.join(RES, 'benchmarks.json')))
    parts = []

    parts.append('### In the game: the top 15\n')
    parts.append(table([[x.top, x.stat, x.better, pct(x.pick_rate), pct(x.win_when_won), pct(x.level, 0),
                         pct(x.neutral_rate), f'{pct(x.rate_early)} / {pct(x.rate_late)}']
                        for x in top.itertuples()],
                       ['#', 'Stat (the team that won it)', 'better', 'won the game', 'when not level', 'level',
                        'neutral snaps', '2003-13 / 2014-25']))
    parts.append(f"\n{int(ig['games'].max())} games, 2003-2025, playoffs in, {bm['ties_left_out']} ties out. "
                 '"won the game": how often the team that won the stat won the game, a level stat counted as a coin '
                 'flip. CPOE starts in 2006.\n')

    fs = ig[ig['follows_score'].notna()]
    parts.append('### Left out of the top 15: they follow the score\n')
    parts.append(table([[x.stat, x.better, pct(x.pick_rate), pct(x.neutral_rate), x.follows_score] for x in fs.itertuples()],
                       ['Stat', 'better', 'won the game', 'neutral snaps', 'why']))

    parts.append('\n### In the game: the distinct signals (box score, no EPA)\n')
    rows = []
    a, b, c = r('in_game_forward_box_score.csv'), r('in_game_forward_box_score_2003_13.csv'), r('in_game_forward_box_score_2014_25.csv')
    for i in range(1, len(a)):
        rows.append([i, a.stat[i], pct(a.pick_rate[i]), b.stat[i], c.stat[i]])
    parts.append(table(rows, ['step', '2003-2025 (adds the most, given the ones above)', 'picks the winner',
                              '2003-2013 alone', '2014-2025 alone']))

    parts.append('\n### Before the game: the top 15\n')
    p = pg[pg['key'] != 'line'].head(15)
    line = pg[pg['key'] == 'line'].iloc[0]
    rows = [[i + 1, x.stat, f'{pct(x.pick_rate)} ({pct(x.pick_lo)}-{pct(x.pick_hi)})', num(x.logloss_alone, 4),
             x.on_top_of_line, num(x.reliability_season, 2)] for i, x in enumerate(p.itertuples())]
    parts.append(table(rows, ['#', 'Indicator (the team better on it, entering the game)', 'picks the winner (90%)',
                              'log loss', 'on top of the line', 'reliability']))
    parts.append(f"\nThe closing spread's favourite picks {pct(line.pick_rate)} of the same {int(line.games)} games "
                 f'(log loss {num(line.logloss_alone, 4)}). Both teams with three games behind them that season; '
                 'log loss from a fit leaving each season out; reliability is a stat\'s season-long split-half '
                 'correlation (blank: a rating, not one stat).\n')

    parts.append('### What wins a game against what carries to the next\n')
    keys = ['epa_play', 'dsr', 'anya', 'to_margin', 'ints', 'd3_pct', 'rz_td_pct', 'fum_lost', 'fg_pct', 'pens']
    igk, pgk = ig.set_index('key'), pg.set_index('key')
    rows = [[igk.loc[k, 'stat'], pct(igk.loc[k, 'pick_rate']), pct(pgk.loc[k, 'pick_rate']),
             num(pgk.loc[k, 'reliability'], 2), num(pgk.loc[k, 'reliability_season'], 2)] for k in keys]
    parts.append(table(rows, ['Stat', 'in the game', 'season to date, before the next', 'half-season reliability',
                              'season']))

    parts.append('\n### Before the game: the distinct signals\n')
    a, b = r('pre_game_forward.csv'), r('pre_game_forward_on_line.csv')
    rows = [[i, a.stat[i], f'{num(a.d_logloss_x1000[i], 1)} ({num(a.d_lo_x1000[i], 1)} to {num(a.d_hi_x1000[i], 1)})',
             b.stat[i], f'{num(b.d_logloss_x1000[i], 1)} ({num(b.d_lo_x1000[i], 1)} to {num(b.d_hi_x1000[i], 1)})']
            for i in range(1, len(a))]
    parts.append(table(rows, ['step', 'without the line', 'log loss x1000 (90%)', 'on top of the closing spread',
                              'log loss x1000 (90%)']))

    parts.append('\n### Weeks 1-3\n')
    e = r('pre_game_weeks_1_3.csv')
    parts.append(table([[x.stat, pct(x.pick_rate), num(x.logloss_alone, 4), int(x.games)] for x in e.itertuples()],
                       ['Indicator', 'picks the winner', 'log loss', 'games']))

    parts.append('\n### The starting quarterback\n')
    q = r('pre_game_qb_change.csv')
    parts.append(table([[x.games_with, x.stat, f'{pct(x.pick_rate)} ({pct(x.pick_lo)}-{pct(x.pick_hi)})', int(x.games)]
                        for x in q.itertuples()], ['Games', 'Indicator', 'picks the winner (90%)', 'games']))

    parts.append('\n### Offence and defence apart (before the game)\n')
    o = r('pre_game_offence_defence.csv').pivot(index='stat', columns='part', values='pick_rate')
    o = o.loc[[s for s in r('pre_game_offence_defence.csv')['stat'].drop_duplicates()]]
    parts.append(table([[s, pct(x['net']), pct(x['offence']), pct(x['defence'])] for s, x in o.iterrows()],
                       ['Stat', 'net', 'offence alone', 'defence alone']))

    parts.append('\n### Context\n')
    parts.append(table([
        ['The closing favourite (every game)', pct(bm['closing_favourite_pick_rate'])],
        ['The home team (neutral sites out)', f"{pct(bm['home_team_win_rate'])} ({pct(bm['home_team_win_rate_2003_13'])} in 2003-13, "
                                             f"{pct(bm['home_team_win_rate_2014_25'])} in 2014-25)"],
        ['More rest than the opponent', f"{pct(bm['rest_edge_pick_rate'])} (level in {pct(bm['rest_edge_level'], 0)} of games)"],
    ], ['Indicator', 'wins']))

    body = '\n'.join(parts)
    text = open(README).read()
    if '<!-- tables -->' not in text or '<!-- /tables -->' not in text:
        raise SystemExit('README.md has no <!-- tables --> markers')
    new = re.sub(r'<!-- tables -->.*?<!-- /tables -->', lambda m: '<!-- tables -->\n' + body + '\n<!-- /tables -->', text,
                 flags=re.S)
    open(README, 'w').write(new)
    print('README.md tables written')


if __name__ == '__main__':
    main()
