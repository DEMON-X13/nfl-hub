"""The quarterback rule's walk-forward, variant against baseline, from the per-game dumps the
patched elo/build.py wrote (ELO_WF_DUMP). 2013-2025 and 2018-2025 decide; 2026 is printed
as information only and chooses nothing."""
import os
import json
import numpy as np
import pandas as pd

W = os.environ.get('QB_WORK', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
TAGS = {'baseline': '', 'limited': 'Limited', 'didnot': 'Did Not', 'limited_didnot': 'Limited,Did Not'}
TEAM_NOW = {'OAK': 'LV', 'SD': 'LAC', 'STL': 'LA'}
out = []
say = lambda *a: (print(*a), out.append(' '.join(str(x) for x in a)))


def ll(p, y):
    p = np.asarray(p, float)
    y = np.asarray(y, float)
    return -(y * np.log(np.clip(p, 1e-9, 1)) + (1 - y) * np.log(np.clip(1 - p, 1e-9, 1)))


def right(p, y):
    return ((np.asarray(p) > 0.5) == (np.asarray(y) > 0.5)).astype(int)


G = {t: pd.read_csv(f'{W}/{t}_games.csv').set_index('game_id') for t in TAGS}
base = G['baseline']
for t, g in G.items():
    assert list(g.index) == list(base.index), t
    assert (g.home_won == base.home_won).all(), t

# 1. the baseline dump reproduces the committed model.json walk_forward (and the baseline build's own)
committed = json.load(open(f'{W}/pristine_data/model.json'))['walk_forward']
built = json.load(open(f'{W}/baseline_model.json'))['walk_forward']
say('== 1. baseline reproduces the committed walk_forward (elo/data/model.json at origin/main)')
bad = 0
for s, c in committed.items():
    d = base[base.season == int(s)]
    mine = {'games': len(d), 'accuracy': round(float(right(d.p_home, d.home_won).mean()), 4),
            'logloss': round(float(ll(d.p_home, d.home_won).mean()), 4)}
    ok = mine == c and built[s] == c
    bad += (not ok) and int(s) <= 2025
    say(f'  {s}: committed {c}  dump {mine}  rebuilt {built[s]}  {"same" if ok else "DIFFERENT"}'
        + ('  (2026: information only; its data have moved since the commit)' if s == '2026' else ''))
say(f'  2013-2025 seasons not reproduced: {bad}')

# 2. the starters and the lineups each variant expected
st = pd.read_csv(f'{W}/starters.csv')
st['team'] = st.team.replace(TEAM_NOW)
start = {(r.season, r.week, r.team): r.starter_id for r in st.itertuples(index=False)}
dropped = {(r.season, r.week, r.team): {x.split(':')[0] for x in r.dropbacks.split(';')} for r in st.itertuples(index=False)}


def team_games(g):
    a = g.reset_index()[['game_id', 'season', 'week', 'home', 'qb_home']].rename(columns={'home': 'team', 'qb_home': 'qb'})
    b = g.reset_index()[['game_id', 'season', 'week', 'away', 'qb_away']].rename(columns={'away': 'team', 'qb_away': 'qb'})
    return pd.concat([a, b], ignore_index=True).set_index(['game_id', 'team'])


TG = {t: team_games(g) for t, g in G.items()}

periods = {'2013-2025': (2013, 2025), '2018-2025': (2018, 2025), '2026 (information only)': (2026, 2026)}
summary = {}
for t, val in TAGS.items():
    if t == 'baseline':
        continue
    g = G[t]
    say(f'\n== variant {t}: ELO_QB_Q_OUT={val!r}')
    adds = pd.read_csv(f'{W}/{t}_qb_outs.csv')
    adds['team'] = adds.team.replace(TEAM_NOW)
    for lab, (a, b) in [('2012', (2012, 2012)), ('2013-2025', (2013, 2025)), ('2018-2025', (2018, 2025)), ('2026 (information only)', (2026, 2026))]:
        ad = adds[(adds.season >= a) & (adds.season <= b)]
        n = len(ad)
        started = sum(start.get((r.season, r.week, r.team)) == r.gsis_id for r in ad.itertuples(index=False))
        played = sum(r.gsis_id in dropped.get((r.season, r.week, r.team), set()) for r in ad.itertuples(index=False))
        nogame = sum((r.season, r.week, r.team) not in start for r in ad.itertuples(index=False))
        say(f'  QB-weeks added to the outs, {lab}: {n}; started (first dropback) {started}; had a dropback {played}; '
            f'did not start {n - started}; team-week with no play-by-play game {nogame}')
    # lineups that changed: the expected quarterback differs from the baseline's
    tb, tv = TG['baseline'], TG[t]
    ch = tv[tv.qb != tb.qb].copy()
    ch['qb_base'] = tb.loc[ch.index, 'qb']
    for lab, (a, b) in periods.items():
        c = ch[(ch.season >= a) & (ch.season <= b)]
        actual = [start.get((r.season, r.week, idx[1])) for idx, r in c.iterrows()]
        var_right = sum(x == r.qb for x, (_, r) in zip(actual, c.iterrows()))
        base_right = sum(x == r.qb_base for x, (_, r) in zip(actual, c.iterrows()))
        nostart = sum(x is None for x in actual)
        say(f'  team-games whose expected QB changed, {lab}: {len(c)} in {c.game_id.nunique() if "game_id" in c else c.index.get_level_values(0).nunique()} games; '
            f'actual starter = variant QB {var_right}, = baseline QB {base_right}, neither {len(c) - var_right - base_right - nostart}, no play-by-play {nostart}')
    for lab, (a, b) in periods.items():
        m = (base.season >= a) & (base.season <= b)
        pb, pv, y = base.p_home[m].values, g.p_home[m].values, base.home_won[m].values
        lb, lv = ll(pb, y), ll(pv, y)
        rb, rv = right(pb, y), right(pv, y)
        d = lv - lb
        chp = np.abs(pv - pb) > 1e-9
        chq = (g.qb_home[m].values != base.qb_home[m].values) | (g.qb_away[m].values != base.qb_away[m].values)
        chk = (pv > 0.5) != (pb > 0.5)
        dq = d[chq]
        res = {'games': int(m.sum()), 'right_base': int(rb.sum()), 'right_var': int(rv.sum()),
               'acc_base': rb.mean(), 'acc_var': rv.mean(), 'll_base': lb.mean(), 'll_var': lv.mean(),
               'd_mean': d.mean(), 'd_se': d.std(ddof=1) / np.sqrt(len(d)), 'net_right': int(rv.sum() - rb.sum()),
               'changed_p': int(chp.sum()), 'changed_qb_games': int(chq.sum()), 'changed_pick': int(chk.sum()),
               'chk_right_var': int(rv[chk].sum()), 'chk_right_base': int(rb[chk].sum()),
               'dq_sum': float(dq.sum()), 'dq_mean': float(dq.mean()) if len(dq) else float('nan'),
               'dq_se': float(dq.std(ddof=1) / np.sqrt(len(dq))) if len(dq) > 1 else float('nan'),
               'd_rest_sum': float(d[~chq].sum())}
        summary[(t, lab)] = res
        say(f'  {lab}: games {res["games"]}; right {res["right_base"]} -> {res["right_var"]} (net {res["net_right"]:+d}); '
            f'accuracy {res["acc_base"]:.4f} -> {res["acc_var"]:.4f}; log loss {res["ll_base"]:.5f} -> {res["ll_var"]:.5f}')
        say(f'      paired log-loss diff (variant - baseline) mean {res["d_mean"]:+.6f}, se {res["d_se"]:.6f} '
            f'(t {res["d_mean"] / res["d_se"] if res["d_se"] > 0 else float("nan"):+.2f}); '
            f'games with p changed {res["changed_p"]}, with an expected QB changed {res["changed_qb_games"]}, pick changed {res["changed_pick"]} '
            f'(right under variant {res["chk_right_var"]}-{res["changed_pick"] - res["chk_right_var"]}, under baseline {res["chk_right_base"]}-{res["changed_pick"] - res["chk_right_base"]})')
        say(f'      log-loss diff summed: on the games with a QB changed {res["dq_sum"]:+.4f} '
            f'(mean {res["dq_mean"]:+.5f}, se {res["dq_se"]:.5f}); on the rest (refit only) {res["d_rest_sum"]:+.4f}')
    # per season
    say('  by season: games, right base/var, log loss base/var, QB-changed games')
    for s in sorted(base.season.unique()):
        m = base.season == s
        pb, pv, y = base.p_home[m].values, g.p_home[m].values, base.home_won[m].values
        chq = ((g.qb_home[m].values != base.qb_home[m].values) | (g.qb_away[m].values != base.qb_away[m].values)).sum()
        say(f'    {s}{" (info)" if s == 2026 else ""}: {m.sum()} games, right {right(pb, y).sum()}/{right(pv, y).sum()}, '
            f'log loss {ll(pb, y).mean():.4f}/{ll(pv, y).mean():.4f}, QB changed in {chq}')
    r = summary[(t, '2013-2025')]
    ship = r['ll_var'] <= r['ll_base'] and r['right_var'] >= r['right_base']
    say(f'  BAR (2013-2025 log loss no worse AND right picks no fewer): log loss {r["ll_var"]:.5f} vs {r["ll_base"]:.5f}, '
        f'right {r["right_var"]} vs {r["right_base"]}: {"MET" if ship else "NOT MET"}')

with open(f'{W}/results.txt', 'w') as f:
    f.write('\n'.join(out) + '\n')
