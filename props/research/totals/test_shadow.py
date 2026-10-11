"""The game-totals shadow's test: shadow.py and shadow_check.py on fabricated games.csv files.

A made-up league (the 32 clubs, four-week seasons 2009-2011, then 2012's weeks 1-3) is run through the
shadow at five moments of one week, the way the betting job would: calls made for every game to come
with a line (one with no over/under price, one with no line until after its kickoff, one with no line
at all); a run with nothing new writes nothing; a line moves and only that call is rewritten; the early
games kick off and freeze while the closing line moves on and the late game is still rewritten; the
finals come in and are graded against each call's own line (one a push, one over its frozen line and
under the closing one), the next week's calls are rewritten on the new scores, and the summary is
recomputed by hand. The check passes on every honest step and fails on each planted change: a frozen
chance moved, a graded total or result that is not games.csv's, a frozen call deleted, a call stamped
after its kickoff, a line re-taken after kickoff, the bar edited, the summary edited, and a shadow
mutated to recompute calls after kickoff. Then the bar: no verdict at 284 games and no word of passing,
PASS on the first 285 in grading order, FAIL for a model level with the market, for one better on both
scores with no picks, for one better on both scores whose picks lose, and, its picks up each time, for
one whose two intervals straddle 0, one better on Brier alone and one better on log loss alone; after a
FAIL the tracking stops. The pick rule is the harness's own on random prices, and no page in the repo reads the ledger.

    python3 props/research/totals/test_shadow.py      # ends "N passed, 0 failed"
"""
import os, sys, json, copy, subprocess, tempfile, traceback
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import shadow, shadow_check, cand_ratings as CR

shadow.MIN_SEASON_GAMES = 40        # the fixture's seasons are four weeks long
COLS = ['game_id', 'season', 'game_type', 'week', 'gameday', 'weekday', 'gametime', 'away_team', 'away_score',
        'home_team', 'home_score', 'location', 'result', 'total', 'overtime', 'total_line', 'under_odds', 'over_odds']
T0, T0B, T1, T2, T3 = ('2012-09-14T12:00:00Z', '2012-09-14T13:00:00Z', '2012-09-15T12:00:00Z',
                       '2012-09-16T18:00:00Z', '2012-09-18T12:00:00Z')


# ----------------------------------------------------------------------------- the fabricated league
def league():
    """Seasons 2009-2011 played (4 weeks), 2012 week 1 played and weeks 2-3 to come, every game with a
    line at -110 both ways. Returns the frame and the ids of the games the scenario follows."""
    rows = []
    teams = list(CR.TEAMS)
    for season, sunday in ((2009, '2009-09-13'), (2010, '2010-09-12'), (2011, '2011-09-11'), (2012, '2012-09-09')):
        rng = np.random.default_rng(season)
        off = rng.normal(0, 3, 32); dfn = rng.normal(0, 3, 32)
        for w in range(4 if season < 2012 else 3):
            day = (pd.Timestamp(sunday) + pd.Timedelta(days=7 * w)).strftime('%Y-%m-%d')
            order = rng.permutation(32)
            for k in range(16):
                a, h = int(order[2 * k]), int(order[2 * k + 1])
                hs = int(max(0, round(22 + off[h] + dfn[a] + 1 + rng.normal(0, 9))))
                as_ = int(max(0, round(22 + off[a] + dfn[h] - 1 + rng.normal(0, 9))))
                line = round((44 + (off[h] + off[a] + dfn[h] + dfn[a]) / 2 + rng.normal(0, 2)) * 2) / 2
                line = line + 0.5 if line == int(line) else line          # no pushes but the planted one
                played = season < 2012 or w == 0
                rows.append({'game_id': f'{season}_{w + 1:02d}_{teams[a]}_{teams[h]}', 'season': season,
                             'game_type': 'REG', 'week': w + 1, 'gameday': day, 'weekday': 'Sunday',
                             'gametime': '13:00', 'away_team': teams[a], 'away_score': as_ if played else np.nan,
                             'home_team': teams[h], 'home_score': hs if played else np.nan, 'location': 'Home',
                             'result': hs - as_ if played else np.nan, 'total': hs + as_ if played else np.nan,
                             'overtime': 0 if played else np.nan, 'total_line': line,
                             'under_odds': -110.0, 'over_odds': -110.0, '_h': hs, '_a': as_})
    g = pd.DataFrame(rows)
    w2 = g[(g.season == 2012) & (g.week == 2)].game_id.tolist()
    w3 = g[(g.season == 2012) & (g.week == 3)].game_id.tolist()
    ids = {'A': w2[0], 'B': w2[1], 'C': w2[2], 'F': w2[3], 'E': w2[4], 'G': w3[0], 'D': w3[1]}
    g.loc[g.game_id == ids['B'], ['over_odds', 'under_odds']] = np.nan        # B: no price, and a line far
    g.loc[g.game_id == ids['B'], 'total_line'] = 30.5                         # under the model: a pick at -110
    g.loc[g.game_id == ids['C'], 'total_line'] = 44.0                         # C: a whole-number line, a push
    g.loc[g.game_id == ids['F'], 'gametime'] = '16:25'                        # F: the late game
    g.loc[g.game_id.isin([ids['E'], ids['G']]), 'total_line'] = np.nan        # E: no line yet; G: never one
    return g, ids


def stage(base, ids, t):
    """games.csv as nflverse would serve it at moment t."""
    g = base.copy()
    def put(gid, **kw):
        for k, v in kw.items():
            g.loc[g.game_id == gid, k] = v
    if t >= T1:
        put(ids['A'], total_line=45.5, over_odds=-115.0, under_odds=-105.0)
    if t >= T2:
        put(ids['A'], total_line=47.5)            # the closing line moves on after the call froze
        put(ids['E'], total_line=41.5)            # E's line appears only after its kickoff
        put(ids['F'], total_line=48.5)            # the late game's line moves before its kickoff
    if t >= T3:
        w2 = (g.season == 2012) & (g.week == 2)
        g.loc[w2, 'home_score'] = g.loc[w2, '_h']; g.loc[w2, 'away_score'] = g.loc[w2, '_a']
        put(ids['A'], home_score=24, away_score=22)       # 46: over A's 45.5, under the closing 47.5
        put(ids['B'], home_score=14, away_score=13)
        put(ids['C'], home_score=24, away_score=20)       # 44 on a 44 line: a push
        g.loc[w2, 'total'] = g.loc[w2, 'home_score'] + g.loc[w2, 'away_score']
        g.loc[w2, 'result'] = g.loc[w2, 'home_score'] - g.loc[w2, 'away_score']
    return g[COLS]


class Env:
    def __init__(self, d):
        self.d = d
        self.base, self.ids = league()
        self.ledger = os.path.join(d, 'ledger.json')
        self.snap = {}

    def csv(self, t):
        p = os.path.join(self.d, f'games_{t[:13]}.csv')
        stage(self.base, self.ids, t).to_csv(p, index=False)
        return p

    def run(self, t, ledger=None):
        L, n, changed = shadow.run(t, self.csv(t), ledger or self.ledger, log=lambda *a: None)
        return L, n, changed

    def check(self, L, prev, t):
        g = shadow_check.games_index(self.csv(t))
        return shadow_check.check(L, prev, g, shadow.parse_iso(t))


def load(p):
    with open(p) as fh:
        return json.load(fh)


# ----------------------------------------------------------------------------- the week, step by step
def test_week(env):
    ids = env.ids
    out = []
    # t0: calls for every game to come with a line
    L, n, changed = env.run(T0)
    assert changed and os.path.exists(env.ledger)
    env.snap[T0] = load(env.ledger)
    assert L['bar'] == shadow.BAR and L['bar_registered'] == T0 and L['run_at'] == T0
    calls = L['calls']
    assert len(calls) == 30, len(calls)                         # weeks 2 and 3, less E and G
    assert ids['E'] not in calls and ids['G'] not in calls
    assert all(c['called_at'] == T0 and not c['frozen'] and c['final'] is None for c in calls.values())
    a, b = calls[ids['A']], calls[ids['B']]
    assert a['p_market'] == 0.5 and b['p_market'] is None and b['over_odds'] is None
    assert b['pick'] == 'under' and b['pick_price'] == -110 and b['pick_price_est'] is True
    frame, m = shadow.season_calls(shadow.load_games(env.csv(T0)), 2012)
    r = frame.set_index('game_id').loc[ids['A']]
    assert a['p_model'] == round(float(r.p_over), 6) and a['mu'] == round(float(r.mu), 4)
    assert abs(a['mu'] - (a['line'] + CR.W * (a['model_total'] - a['line']))) < 1e-3
    s = L['summary']
    assert s['compared'] == 0 and s['scores'] is None and '0 of 285' in s['standing']
    assert 'pass' not in s['standing'].lower() and 'fail' not in s['standing'].lower()
    assert env.check(L, None, T0) == []
    out.append('t0: 30 calls made, B without a market chance (its pick at -110), E and G without a call; check clean')

    # t0b: nothing new, nothing written
    before = open(env.ledger, 'rb').read()
    L, n, changed = env.run(T0B)
    assert not changed and open(env.ledger, 'rb').read() == before
    out.append('t0b: a run with nothing new writes nothing')

    # t1: A's line moves; only A is rewritten
    L, n, changed = env.run(T1)
    env.snap[T1] = load(env.ledger)
    c = L['calls']
    assert n['rewritten'] == 1 and c[ids['A']]['called_at'] == T1 and c[ids['A']]['line'] == 45.5
    assert c[ids['A']]['over_odds'] == -115 and c[ids['A']]['p_market'] == round(shadow.no_vig(-115, -105), 6)
    assert all(v['called_at'] == T0 for k, v in c.items() if k != ids['A'])
    assert env.check(L, env.snap[T0], T1) == []
    out.append('t1: the line moves, A alone is rewritten; check clean')

    # t2: 13:00 games kicked off: frozen as they stood; E's new line makes no call; F (16:25) rewritten
    L, n, changed = env.run(T2)
    env.snap[T2] = load(env.ledger)
    c = L['calls']
    for k in ('A', 'B', 'C'):
        assert c[ids[k]]['frozen'] and c[ids[k]]['frozen_at'] == T2
    assert c[ids['A']]['line'] == 45.5 and c[ids['A']]['called_at'] == T1
    assert ids['E'] not in c
    assert not c[ids['F']]['frozen'] and c[ids['F']]['called_at'] == T2 and c[ids['F']]['line'] == 48.5
    assert not c[ids['D']]['frozen'] and c[ids['D']]['called_at'] == T0
    assert env.check(L, env.snap[T1], T2) == []
    out.append('t2: kicked off and frozen at the line of the call (45.5, not the closing 47.5); F rewritten; check clean')

    # t3: the finals, graded against each call's own line; week 3 rewritten on the new scores
    L, n, changed = env.run(T3)
    env.snap[T3] = load(env.ledger)
    c = L['calls']
    fa = c[ids['A']]['final']
    assert fa['total'] == 46 and fa['result'] == 'over' and fa['graded_at'] == T3
    assert c[ids['C']]['final']['result'] == 'push' and c[ids['B']]['final']['result'] == 'under'
    assert c[ids['F']]['frozen'] and c[ids['F']]['final'] is not None and c[ids['F']]['line'] == 48.5
    w2 = [k for k, v in c.items() if v['week'] == 2]
    w3 = [k for k, v in c.items() if v['week'] == 3]
    assert len(w2) == 15 and all(c[k]['final'] for k in w2)
    assert all(not c[k]['frozen'] and c[k]['final'] is None for k in w3)
    assert any(c[k]['called_at'] == T3 for k in w3), 'the new scores moved no week-3 call'
    s = L['summary']
    assert s['graded'] == 15 and s['pushes'] == 1 and s['graded_without_market_price'] == 1 and s['compared'] == 13
    rows = [v for v in c.values() if v['final'] and v['final']['result'] != 'push' and v['p_market'] is not None]
    o = np.array([v['final']['result'] == 'over' for v in rows], float)
    p = np.array([v['p_model'] for v in rows]); q = np.array([v['p_market'] for v in rows])
    assert abs(s['scores']['model']['brier'] - np.mean((p - o) ** 2)) < 1e-6
    assert abs(s['scores']['market']['brier'] - np.mean((q - o) ** 2)) < 1e-6
    ll = -np.mean(o * np.log(p) + (1 - o) * np.log(1 - p))
    assert abs(s['scores']['model']['logloss'] - ll) < 1e-6
    lo, hi = s['scores']['brier_diff_ci90']
    assert lo <= s['scores']['brier_diff'] <= hi
    picks = [v for v in c.values() if v['final'] and v['pick']]
    wins = sum(v['final']['result'] == v['pick'] for v in picks)
    units = sum((100 / -v['pick_price'] if v['pick_price'] < 0 else v['pick_price'] / 100) if v['final']['result'] == v['pick']
                else 0 if v['final']['result'] == 'push' else -1 for v in picks)
    assert s['picks']['bets'] == len(picks) and s['picks']['won'] == wins and abs(s['picks']['units'] - units) < 1e-6
    assert s['picks']['at_est_price'] == 1 and c[ids['B']]['final']['units'] == round(100 / 110, 6)
    assert '13 of 285' in s['standing'] and 'pass' not in s['standing'].lower()
    assert env.check(L, env.snap[T2], T3) == []
    out.append(f't3: 15 graded (A over its own 45.5, C a push, B with no market chance), 13 compared, '
               f'picks {s["picks"]["won"]}-{s["picks"]["lost"]}-{s["picks"]["push"]}; week 3 rewritten; check clean')
    return out


def test_planted(env):
    """Each planted change to the t3 ledger is caught by the check (against the t2 ledger)."""
    ids, base, prev = env.ids, env.snap[T3], env.snap[T2]
    A = ids['A']
    def plant(fn):
        L = copy.deepcopy(base); fn(L); return env.check(L, prev, T3)
    cases = {
        'a frozen chance moved': (lambda L: L['calls'][A].__setitem__('p_model', L['calls'][A]['p_model'] + 0.01), 'changed after kickoff'),
        'a graded total that is not games.csv\'s': (lambda L: L['calls'][A]['final'].__setitem__('total', 47), 'disagrees with games.csv'),
        'a graded result that is not games.csv\'s': (lambda L: L['calls'][A]['final'].__setitem__('result', 'under'), 'disagrees with games.csv'),
        'a frozen call deleted': (lambda L: L['calls'].pop(A), 'is gone'),
        'a call stamped after its kickoff': (lambda L: L['calls'][A].__setitem__('called_at', '2012-09-16T17:30:00Z'), 'at or after its kickoff'),
        'the closing line re-taken as if by this run': (lambda L: L['calls'][A].update(line=47.5, called_at=L['run_at']), 'changed after kickoff'),
        'the bar edited': (lambda L: L['bar'].__setitem__('games', 200), 'bar'),
        'the summary edited': (lambda L: L['summary'].__setitem__('compared', 14), 'summary'),
        'a final left ungraded': (lambda L: L['calls'][A].__setitem__('final', None), 'not graded'),
    }
    out = []
    for name, (fn, want) in cases.items():
        bad = plant(fn)
        assert any(want in b for b in bad), f'{name}: not caught ({bad})'
        out.append(f'caught: {name}')
    assert env.check(copy.deepcopy(base), prev, T3) == []
    # a verdict written before 285 games, and one changed after it was written
    L1, L2 = copy.deepcopy(base), copy.deepcopy(base)
    L1['decision'] = {'verdict': 'FAIL', 'games': 285, 'decided_at': T2}
    L2['decision'] = {'verdict': 'PASS', 'games': 285, 'decided_at': T2}
    for L in (L1, L2):
        L['summary'] = shadow.summarize(L['calls'], L['decision'])
    assert any('verdict does not follow' in b for b in env.check(L2, prev, T3))
    assert any('verdict differs from the last commit' in b for b in env.check(L2, L1, T3))
    out.append('caught: a verdict written before 285 games, and a verdict changed after it was written')
    return out


def test_mutant(env):
    """A shadow that recomputes every unplayed game (no freeze at kickoff) is caught by the check."""
    started, to_come = shadow.started, shadow.to_come
    p = os.path.join(env.d, 'mutant.json')
    with open(p, 'w') as fh:
        json.dump(env.snap[T1], fh)
    try:
        shadow.started = lambda *a: False
        shadow.to_come = lambda g, now: g[~g.played.to_numpy(bool) & g.total_line.notna().to_numpy(bool)]
        L, n, changed = env.run(T2, ledger=p)
    finally:
        shadow.started, shadow.to_come = started, to_come
    assert L['calls'][env.ids['A']]['line'] == 47.5      # the mutant re-took the closing line
    bad = env.check(L, env.snap[T1], T2)
    assert any(env.ids['A'] in b and 'changed after kickoff' in b for b in bad), bad
    assert any('at or after its kickoff' in b for b in bad), bad
    return [f'caught: a shadow that does not freeze at kickoff ({len(bad)} failures)']


def test_stop_after_fail(env):
    """After a FAIL no call is made or kept open; calls already frozen are still graded."""
    p = os.path.join(env.d, 'stopped.json')
    L = copy.deepcopy(env.snap[T1])
    L['decision'] = {'verdict': 'FAIL', 'decided_at': T1, 'games': 285}
    with open(p, 'w') as fh:
        json.dump(L, fh)
    L, n, changed = env.run(T3, ledger=p)
    c = L['calls']
    assert all(v['week'] == 2 and v['frozen'] and v['final'] for v in c.values()), 'open calls survived a FAIL'
    assert n['made'] == 0 and n['rewritten'] == 0 and n['dropped'] == 15
    assert L['decision']['verdict'] == 'FAIL' and 'FAIL' in L['summary']['standing']
    return ['after a FAIL: 15 open calls dropped, none made, the 15 frozen still graded']


# ----------------------------------------------------------------------------- the bar on made-up records
def synth(n, model, seed=1, odds=-110):
    """n graded calls with the market at 50%; model(result, i) gives the model's chance of the over."""
    rng = np.random.default_rng(seed)
    calls = {}
    for i in range(n):
        res = 'over' if rng.random() < 0.5 else 'under'
        pm = model(res, i)
        side, price, est = shadow.pick_for(pm, odds, odds)
        k = f'2026-10-{1 + i // 40:02d}T17:{i % 40:02d}:00Z'
        calls[f'g{i:04d}'] = {
            'kickoff': k, 'line': 44.5, 'p_model': pm, 'p_market': 0.5, 'pick': side, 'pick_price': price,
            'pick_price_est': est, 'frozen': True,
            # graded in the reverse of kickoff order in blocks: the bar's order is grading, not kickoff
            'final': {'result': res, 'units': shadow.pick_units(side, price, res),
                      'graded_at': f'2026-12-{1 + (n - 1 - i) // 40:02d}T12:00:00Z'}}
    return calls


def test_bar():
    out = []
    good = lambda res, i: 0.6 if res == 'over' else 0.4
    s = shadow.summarize(synth(284, good))
    assert shadow.decide(synth(284, good), shadow.parse_iso(T3)) is None
    assert s['standing'].startswith('284 of 285') and 'pass' not in s['standing'].lower() and 'fail' not in s['standing'].lower()
    out.append('284 games: no verdict, and the standing says only how many are in')

    calls = synth(300, good)
    d = shadow.decide(calls, shadow.parse_iso(T3))
    assert d['verdict'] == 'PASS' and d['games'] == 285 and len(d['sample']) == 285
    order = sorted(calls, key=lambda g: (calls[g]['final']['graded_at'], calls[g]['kickoff'], g))
    assert d['sample'] == order[:285] and d['sample'] != sorted(calls)[:285]
    assert d['scores']['brier_diff_ci90'][1] < 0 and d['scores']['logloss_diff_ci90'][1] < 0 and d['picks']['units'] > 0
    out.append('300 games, a sharp model: PASS on the first 285 in grading order')

    d = shadow.decide(synth(300, lambda res, i: 0.5), shadow.parse_iso(T3))
    assert d['verdict'] == 'FAIL' and d['picks']['bets'] == 0
    out.append('a model level with the market: FAIL')

    d = shadow.decide(synth(300, lambda res, i: 0.52 if res == 'over' else 0.48), shadow.parse_iso(T3))
    assert d['verdict'] == 'FAIL' and d['scores']['brier_diff_ci90'][1] < 0 and d['picks']['bets'] == 0
    out.append('better on both scores with no 3-point picks: FAIL (no picks is not up)')

    def losing(res, i):            # right and modest on most games, a confident wrong pick on every 19th
        right = 0.55 if res == 'over' else 0.45
        wrong = 0.44 if res == 'over' else 0.56
        return wrong if i % 19 == 0 else right
    d = shadow.decide(synth(300, losing), shadow.parse_iso(T3))
    assert d['scores']['brier_diff_ci90'][1] < 0 and d['scores']['logloss_diff_ci90'][1] < 0
    assert d['picks']['units'] < 0 and d['verdict'] == 'FAIL'
    out.append('better on both scores but the picks lose: FAIL')

    # Each of the bar's two interval conditions on its own, the picks up every time, so only that
    # condition can fail the model. A decide() that reads an interval's lower bound (it reaches below 0)
    # instead of its upper (it lies wholly below 0), or that leaves out either score, passes one of these.
    def straddle(res, i):          # level on six games in seven, a modest edge on the seventh, right 4 times in 7
        return 0.5 if i % 7 else (0.56 if (res == 'over') == ((i // 7) % 7 < 4) else 0.44)
    d = shadow.decide(synth(300, straddle), shadow.parse_iso(T3))
    b, ll = d['scores']['brier_diff_ci90'], d['scores']['logloss_diff_ci90']
    assert b[0] < 0 < b[1] and ll[0] < 0 < ll[1], (b, ll)
    assert d['picks']['bets'] > 0 and d['picks']['units'] > 0 and d['verdict'] == 'FAIL', d['picks']
    out.append(f'both intervals straddle 0 (Brier [{b[0]:+.4f}, {b[1]:+.4f}], log loss [{ll[0]:+.4f}, {ll[1]:+.4f}]), '
               f'picks {d["picks"]["won"]}-{d["picks"]["lost"]} {d["picks"]["units"]:+.2f}u: FAIL')

    def ll_only(res, i):           # sharp on 39 games in 40, a near-certain miss on the 40th: Brier holds, log loss does not
        return (0.001 if res == 'over' else 0.999) if i % 40 == 7 else (0.58 if res == 'over' else 0.42)
    d = shadow.decide(synth(300, ll_only), shadow.parse_iso(T3))
    b, ll = d['scores']['brier_diff_ci90'], d['scores']['logloss_diff_ci90']
    assert b[1] < 0 and ll[0] < 0 < ll[1], (b, ll)
    assert d['picks']['units'] > 0 and d['verdict'] == 'FAIL', d['picks']
    out.append(f'Brier wholly below 0 [{b[0]:+.4f}, {b[1]:+.4f}], log loss not [{ll[0]:+.4f}, {ll[1]:+.4f}], '
               f'picks {d["picks"]["units"]:+.2f}u: FAIL')

    def brier_only(res, i):        # near-certain and right on one game in five, a little wrong on the rest:
        q = 0.99 if i % 5 == 0 else 0.45       # log loss holds, Brier does not
        return q if res == 'over' else 1 - q
    d = shadow.decide(synth(300, brier_only), shadow.parse_iso(T3))
    b, ll = d['scores']['brier_diff_ci90'], d['scores']['logloss_diff_ci90']
    assert ll[1] < 0 and b[0] < 0 < b[1], (b, ll)
    assert d['picks']['units'] > 0 and d['verdict'] == 'FAIL', d['picks']
    out.append(f'log loss wholly below 0 [{ll[0]:+.4f}, {ll[1]:+.4f}], Brier not [{b[0]:+.4f}, {b[1]:+.4f}], '
               f'picks {d["picks"]["units"]:+.2f}u: FAIL')
    return out


def test_pick_rule():
    """pick_for is the harness's _picks, game by game, on random chances and prices (some missing)."""
    import harness
    rng = np.random.default_rng(7)
    n = 5000
    p = np.round(rng.uniform(0.3, 0.7, n), 6)
    prices = np.array([-130, -120, -115, -110, -105, 100, 105, 120, np.nan, 0], float)
    oo, uo = rng.choice(prices, n), rng.choice(prices, n)
    y = rng.integers(30, 60, n).astype(float); L = np.full(n, 44.5)
    side, price, units, *_ = harness._picks(p, np.full(n, 0.5), L, y, oo, uo, shadow.EDGE)
    for i in range(n):
        s, pr, est = shadow.pick_for(p[i], None if np.isnan(oo[i]) else oo[i], None if np.isnan(uo[i]) else uo[i])
        want = {1: 'over', -1: 'under', 0: None}[int(side[i])]
        assert s == want, (i, p[i], oo[i], uo[i], s, want)
        if s:
            assert pr == price[i]
            assert abs(shadow.pick_units(s, pr, shadow.result_of(y[i], 44.5)) - units[i]) < 1e-6
    return [f'the pick rule equals harness._picks on {n} random games']


def test_no_page_reads():
    """Nothing the site serves or builds names the shadow's folder or its ledger (the study itself is
    cited in a few comments; its shadow is not)."""
    root = subprocess.run(['git', 'rev-parse', '--show-toplevel'], cwd=HERE, capture_output=True, text=True).stdout.strip()
    hits = subprocess.run(['git', 'grep', '-l', '-I', '-e', 'shadow/ledger', '-e', 'totals/shadow', '--', '.'],
                          cwd=root, capture_output=True, text=True).stdout.split()
    allowed = ('props/research/totals/', 'CLAUDE.md', 'docs/', '.github/workflows/update.yml')
    served = [h for h in hits if not h.startswith(allowed)]
    assert not served, f'these files name the shadow or its ledger: {served}'
    pages = [h for h in hits if h.endswith(('.html', '.js', '.css'))]
    assert not pages, pages
    return [f'no page, script or build file names the shadow or its ledger ({len(hits)} mentions: its own files, '
            f'the docs and the job)']


def main():
    passed = failed = 0
    with tempfile.TemporaryDirectory() as d:
        env = Env(d)
        tests = [('the week', lambda: test_week(env)), ('planted changes', lambda: test_planted(env)),
                 ('a mutant shadow', lambda: test_mutant(env)), ('after a FAIL', lambda: test_stop_after_fail(env)),
                 ('the bar', test_bar), ('the pick rule', test_pick_rule), ('no page reads it', test_no_page_reads)]
        for name, fn in tests:
            try:
                for line in fn():
                    print('  ok', line)
                passed += 1
                print('PASS', name)
            except Exception:
                failed += 1
                print('FAIL', name)
                traceback.print_exc()
                if name == 'the week':
                    break
    print(f'{passed} passed, {failed} failed')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
