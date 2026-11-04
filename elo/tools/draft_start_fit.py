#!/usr/bin/env python3
"""The draft start: the fit behind DRAFT_START in elo/build.py (THE DRAFT START in its docstring), a player's first
career rating from his draft slot. Run by hand, offline from the job, as units_fit.py and elo_avg_fit.py are: its
numbers are pasted into the build, which never refits them on the season in play.

    python3 elo/tools/draft_start_fit.py              # downloads what it lacks into elo/cache/ (the build's files)
    python3 elo/tools/draft_start_fit.py --offline    # the cache only

The owner's "do all" (November 2026) to the Elo diagnosis of 3 November, its item 8: "Start rookies from their draft
slot instead of a flat 1500 ... choose the starting curve on 2013-2017, score on 2018-2025, the way the quarterback's
1450 start was chosen."

THE CURVE. For each position group, a new player's first career rating is

    1500 + a + b ln(max(pick, floor))        (pick 1-262; a player never drafted at the curve's end, pick 262, the
                                              last pick of the longest draft since the draft went to seven rounds,
                                              2003's and 2022's)

the floor (1, 4, 8, 16 or 32) holding the curve flat above that pick, where a few top picks would otherwise carry the
log's steep end; or one level for every new player of the group (flat); or the build's old start (1500, a
quarterback's QB_START), where neither beats it.

THE CRITERION. Elo's own loss: the w-weighted cross-entropy of each rated game's result S against its expectation E,
-(S ln E + (1 - S) ln(1 - E)), whose gradient is Elo's update, over every rated game of a new player's first two rated
seasons (games through 2017), his rating carried game by game from the start by the build's own rule (K 56 for his
first eight rated games, 32 after, a quarter of the way back to 1500 each offseason) against the units as the build's
own run rated them (the old start's run: a start moves the units a little, which this leaves out). Two seasons, not
his first eight games: a start fitted on eight games sits low for his second season, when young players are still
getting better (inside 2013-2017, S - E +0.011 there and +0.032 on his first season's games after the eighth), which
moved young players below veterans and the game model's walk-forward with them; two seasons were chosen over eight
games, one season and three on 2013-2017 alone (the game model's walk-forward there and next season's production
ranked, three level with two, the shorter taken).

THE CHOICE, on players first rated 2013-2017 alone (2012 is every player's warm-up at 1500, veterans and all): each
form fitted on four of those seasons' new players and scored on the fifth's, leaving one season out at a time; the
lowest score taken, forms within 1e-4 of it level and the larger floor taken (the more cautious top), and the old start
kept where it scores as well. Then the chosen form fitted on all five seasons, by Newton's method on the exact
gradient (the rating's path differentiated game by game).

What it does:
  1. the build's own rating loop (elo/build.py's main, on the schedule cut to the last completed season, loaded with
     edits asserted to land once: the schedule cut, the old start in place of DRAFT_START, every rated game logged, and
     main stopped after the loop, so it writes nothing), giving every new player's rated games with their S, E, weight
     and opposing unit, and the draft slots the build reads;
  2. each group's choice and fit, as above, and the old start's and each form's score;
  3. the constants as the build should carry them (DRAFT_START), and whether it does.
"""
import argparse, math, os, sys, tempfile, types

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)
import build  # noqa: E402

FIT_FIRST, FIT_LAST = 2013, 2017       # the players first rated in these seasons, their games through FIT_LAST
HORIZON = 2                            # every rated game of his first two rated seasons
FLOORS = (1, 4, 8, 16, 32)
TIE = 1e-4
P_END = 262                            # the last pick of the longest seven-round draft (2003, 2022)
C = math.log(10) / 400                 # dE/dR = C E (1 - E)

PATCHES = [
    ("    games = games[games.season >= FIRST].copy()\n",
     "    games = games[(games.season >= FIRST) & (games.season <= DRAFT_FIT_LAST)].copy()\n"),
    ("                K = K_NEW if N[pid] < SETTLED else K_SET\n",
     "                K = K_NEW if N[pid] < SETTLED else K_SET\n"
     "                DRAFT_FIT_LOG.append((pid, int(season), g, S, E, float(r.w), Uv, N[pid]))\n"),
    ("    print(f'  {len(R)} players rated over",
     "    raise DRAFT_FIT_LOOP(locals())\n    print(f'  {len(R)} players rated over"),
]


class Loop(Exception):
    def __init__(self, env):
        super().__init__('rating loop done')
        self.env = env


def rating_loop(offline, last):
    """the build's rating loop through `last` with the old start (1500, a quarterback QB_START from the second
    season): every rated game, and main()'s locals"""
    path = build.__file__
    src = open(path).read()
    for old, new in PATCHES:
        n = src.count(old)
        if n != 1:
            raise SystemExit(f'draft_start_fit: elo/build.py has changed where this tool edits it ({n} matches of {old.strip()[:70]!r})')
        src = src.replace(old, new)
    mod = types.ModuleType('elo_build_draft_fit')
    mod.__file__ = path
    log = []
    mod.DRAFT_FIT_LOOP, mod.DRAFT_FIT_LAST, mod.DRAFT_FIT_LOG = Loop, last, log
    exec(compile(src, path, 'exec'), mod.__dict__)
    mod.DRAFT_START = {'curve': {}, 'level': {'QB': mod.QB_START - 1500.0}, 'p_end': P_END}     # the old start
    argv = sys.argv
    with tempfile.TemporaryDirectory(prefix='draft_fit_') as tmp:
        mod.OUT, mod.PAST_LIST = os.path.join(tmp, 'data'), os.path.join(tmp, 'past.lst')
        sys.argv = ['build.py'] + (['--offline'] if offline else [])
        try:
            mod.main()
        except Loop as e:
            return e.env, log
        finally:
            sys.argv = argv
    raise SystemExit('draft_start_fit: the build\'s rating loop did not stop where this tool stops it')


class Players:
    """the new players of one group, their games of the horizon as padded arrays"""
    def __init__(self, seqs, picks, firsts):
        m, n = len(seqs), max(len(s[0]) for s in seqs)
        self.S, self.U, self.w = np.zeros((m, n)), np.full((m, n), 1500.0), np.zeros((m, n))
        self.car, self.mask = np.ones((m, n)), np.zeros((m, n), bool)
        for i, (S, U, w, se) in enumerate(seqs):
            k = len(S)
            self.S[i, :k], self.U[i, :k], self.w[i, :k], self.mask[i, :k] = S, U, w, True
            for j in range(1, k):
                if se[j] != se[j - 1]:
                    self.car[i, j] = build.CARRY ** (se[j] - se[j - 1])
        self.pick, self.first, self.n = np.asarray(picks, float), np.asarray(firsts), n

    def loss(self, r0, rows):
        """the w-weighted cross-entropy over `rows` and its derivative in each player's start"""
        R = np.asarray(r0, float).copy()
        D = np.ones(len(R))
        L = np.zeros(len(R))
        G = np.zeros(len(R))
        for j in range(self.n):
            R = 1500 + self.car[:, j] * (R - 1500)
            D = self.car[:, j] * D
            E = np.clip(1 / (1 + 10 ** ((self.U[:, j] - R) / 400)), 1e-12, 1 - 1e-12)
            m, w, S = self.mask[:, j], self.w[:, j], self.S[:, j]
            L += np.where(m, w * -(S * np.log(E) + (1 - S) * np.log(1 - E)), 0.0)
            G += np.where(m, w * C * (E - S) * D, 0.0)
            K = build.K_NEW if j < build.SETTLED else build.K_SET
            R = R + np.where(m, K * w * (S - E), 0.0)
            D = D * np.where(m, 1 - K * w * C * E * (1 - E), 1.0)
        W = (self.w * self.mask).sum(axis=1)
        return L[rows].sum() / W[rows].sum(), G, W[rows].sum()


def design(form, pick):
    """the start's columns: R0 = 1500 + X theta"""
    if form == 'flat':
        return np.ones((len(pick), 1))
    return np.column_stack([np.ones(len(pick)), np.log(np.maximum(pick, form))])


def fit(P, form, rows):
    """theta minimising the loss on `rows`, by Newton's method on the exact gradient (a finite-difference Hessian)"""
    X = design(form, P.pick)

    def f(th):
        v, G, W = P.loss(1500 + X @ th, rows)
        return v, (X[rows] * G[rows, None]).sum(axis=0) / W
    th = np.zeros(X.shape[1])
    v, g = f(th)
    for _ in range(100):
        h = 1e-3
        H = np.column_stack([(f(th + h * e)[1] - f(th - h * e)[1]) / (2 * h) for e in np.eye(len(th))])
        step = np.linalg.solve(H + 1e-12 * np.eye(len(th)), g)
        t = 1.0
        while True:
            nv, ng = f(th - t * step)
            if nv <= v + 1e-15 or t < 1e-6:
                break
            t /= 2
        th, v, g = th - t * step, nv, ng
        if np.abs(t * step).max() < 1e-7:
            break
    return th


def choose(P, old):
    """the form by leaving one season out at a time, and its fit on every season"""
    forms = ['flat'] + list(FLOORS)
    score = {}
    for form in forms + ['old']:
        num = den = 0.0
        for s in range(FIT_FIRST, FIT_LAST + 1):
            tr, te = P.first != s, P.first == s
            r0 = old if form == 'old' else 1500 + design(form, P.pick) @ fit(P, form, tr)
            v, _, W = P.loss(r0, te)
            num, den = num + v * W, den + W
        score[form] = num / den
    lo = min(score[f] for f in forms)
    best = next((f for f in [32, 16, 8, 4, 1] if score[f] <= lo + TIE), 'flat')
    if score['flat'] == lo:
        best = 'flat'
    if score[best] >= score['old']:
        return 'old', None, score
    return best, fit(P, best, np.ones(len(P.pick), bool)), score


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--offline', action='store_true', help='the cache only (elo/cache/)')
    a = ap.parse_args()
    import elo_avg_fit
    last = elo_avg_fit.last_completed(a.offline)
    print(f'the last completed season: {last}; the build\'s loop through it, the fit on players first rated {FIT_FIRST}-{FIT_LAST}', flush=True)
    env, log = rating_loop(a.offline, last)
    slots = env['slots']
    by = {}
    for pid, season, g, S, E, w, U, N in log:
        by.setdefault(pid, []).append((season, g, S, U, w))
    want = {'fit': f'{FIT_FIRST}-{FIT_LAST}', 'horizon': HORIZON, 'p_end': P_END, 'curve': {}, 'level': {}}
    print(f'\n{"group":5} {"new":>4} {"games":>6}   leave-one-season-out loss: old, flat, floor 1, 4, 8, 16, 32   -> chosen')
    for g in build.GROUPS:
        seqs, picks, firsts = [], [], []
        for pid, games_ in by.items():
            s0, g0 = games_[0][0], games_[0][1]
            if g0 != g or not (FIT_FIRST <= s0 <= FIT_LAST):
                continue
            keep = [x for x in games_ if x[0] < s0 + HORIZON and x[0] <= FIT_LAST]
            sl = slots.get(pid)
            picks.append(min(sl[1], P_END) if sl is not None and sl[0] <= s0 else P_END)
            firsts.append(s0)
            seqs.append((np.array([x[2] for x in keep]), np.array([x[3] for x in keep]), np.array([x[4] for x in keep]),
                         np.array([x[0] for x in keep])))
        P = Players(seqs, picks, firsts)
        old = np.full(len(picks), build.QB_START if g == 'QB' else 1500.0)
        form, th, score = choose(P, old)
        sc = '  '.join(f'{score[k]:.5f}' for k in ['old', 'flat'] + list(FLOORS))
        if form == 'flat':
            want['level'][g] = round(float(th[0]), 3)
            what = f'flat: {1500 + th[0]:.0f}'
        elif form == 'old':
            what = 'the old start'
        else:
            want['curve'][g] = [round(float(th[0]), 3), round(float(th[1]), 3), int(form)]
            at = lambda p: 1500 + th[0] + th[1] * math.log(max(p, form))
            what = f'floor {form}: a {th[0]:.3f} b {th[1]:.3f}  (pick 1 {at(1):.0f}, 32 {at(32):.0f}, 100 {at(100):.0f}, never drafted {at(P_END):.0f})'
        print(f'{g:5} {len(picks):4} {int(P.mask.sum()):6}   {sc}   -> {what}', flush=True)
    print('\nDRAFT_START = {')
    print(f"    'fit': {want['fit']!r}, 'horizon': {want['horizon']}, 'p_end': {want['p_end']},")
    print(f"    'curve': {want['curve']!r},")
    print(f"    'level': {want['level']!r},\n}}")
    print('  the build carries these constants' if getattr(build, 'DRAFT_START', None) == want
          else '  THE BUILD DIFFERS: paste DRAFT_START above into elo/build.py')


if __name__ == '__main__':
    main()
