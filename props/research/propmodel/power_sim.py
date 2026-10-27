#!/usr/bin/env python3
"""What the preregistered one-shot test can detect: a simulation on made-up lines only (no data of any season).

The model's chance departs from the market's by d on the log-odds scale; the truth is the market plus beta times
that departure (beta = 0: the model knows nothing the market does not; beta = 1: the market should be replaced by
the model). For each beta and spread of d it draws the test's line counts (2,400 priced lines over 70 games and
4,800 price-free lines over 107 games, counted from the registered payload and archive less the lines expected to
drop out, lines of a game sharing a small common shock), applies the blend at W = 0.25 and
the preregistered criteria A1-A3 and B1 (B2 depends on the season's own over/under lean, which is not simulated),
using normal intervals in place of the game bootstrap, and prints how often each passes. Approximate by design: it
says roughly how large a real signal must be to pass, nothing more.

    python3 -I power_sim.py         writes results/power_sim.json
"""
import json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
W, Z = 0.25, 1.6449


def expit(x):
    return 1 / (1 + np.exp(-x))


def ll(p, y):
    p = np.clip(p, 1e-3, 1 - 1e-3)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))


def cluster_ci_hi(x, g):
    """the upper end of a one-sided 95% interval of the mean, games as clusters"""
    G = g.max() + 1
    s = np.bincount(g, weights=x, minlength=G); c = np.bincount(g, minlength=G)
    m = s.sum() / c.sum()
    r = s - m * c
    se = np.sqrt(np.sum(r ** 2)) / c.sum()
    return m + Z * se


def logit_beta_lo(y, a, d, g):
    """beta in logit P(y) = alpha + gamma a + beta d (Newton), its one-sided 95% lower end (cluster sandwich)"""
    X = np.column_stack([np.ones(len(y)), a, d]); b = np.zeros(3)
    for _ in range(25):
        mu = expit(X @ b); Hm = (X * (mu * (1 - mu))[:, None]).T @ X
        step = np.linalg.solve(Hm + 1e-9 * np.eye(3), X.T @ (y - mu)); b += step
        if np.max(np.abs(step)) < 1e-9:
            break
    mu = expit(X @ b); Hi = np.linalg.inv((X * (mu * (1 - mu))[:, None]).T @ X)
    U = X * (y - mu)[:, None]
    G = g.max() + 1
    Ug = np.column_stack([np.bincount(g, weights=U[:, k], minlength=G) for k in range(3)])
    V = Hi @ (Ug.T @ Ug) @ Hi
    return b[2] - Z * np.sqrt(V[2, 2])


def sim(beta, sd, rng, n_p=2400, g_p=70, n_e=4800, g_e=107, shock=0.08):
    gp = rng.integers(0, g_p, n_p); ge = rng.integers(0, g_e, n_e)
    # priced: market log-odds near 0 (lines set near even), the model's departure d
    a = rng.normal(0, 0.12, n_p) + rng.normal(0, shock, g_p)[gp] * 0
    d = rng.normal(0, sd, n_p)
    truth = expit(a + beta * d + rng.normal(0, shock, g_p)[gp])
    y = (rng.random(n_p) < truth).astype(float)
    q, p = expit(a), expit(a + d)
    b = q + W * (p - q)
    A1 = cluster_ci_hi((b - y) ** 2 - (q - y) ** 2, gp) < 0
    A2 = cluster_ci_hi(ll(b, y) - ll(q, y), gp) < 0
    A3 = logit_beta_lo(y, a, d, gp) > 0
    # price-free: the line at the market's median, the model's departure from 0.5
    de = rng.normal(0, sd, n_e)
    te = expit(beta * de + rng.normal(0, shock, g_e)[ge])
    ye = (rng.random(n_e) < te).astype(float)
    be = 0.5 + W * (expit(de) - 0.5)
    B1 = cluster_ci_hi(ll(be, ye) - np.log(2), ge) < 0
    return A1, A2, A3, B1


def main():
    rng = np.random.default_rng(0)
    out = {'W': W, 'note': __doc__.split('\n')[0], 'sizes': {'priced_lines': 2400, 'priced_games': 70,
                                                             'price_free_lines': 4800, 'price_free_games': 107},
           'cells': []}
    for sd in (0.2, 0.3, 0.45):
        for beta in (0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 1.0):
            R = np.array([sim(beta, sd, rng) for _ in range(400)])
            cell = {'sd_logit_departure': sd, 'approx_points_at_even': round(25 * sd, 1), 'beta': beta,
                    'pass_A1': float(R[:, 0].mean()), 'pass_A2': float(R[:, 1].mean()), 'pass_A3': float(R[:, 2].mean()),
                    'pass_B1': float(R[:, 3].mean()), 'pass_A1_A2_A3_B1': float(R.all(1).mean())}
            out['cells'].append(cell)
            print(cell, flush=True)
    with open(os.path.join(HERE, 'results', 'power_sim.json'), 'w') as f:
        json.dump(out, f, indent=1)


if __name__ == '__main__':
    main()
