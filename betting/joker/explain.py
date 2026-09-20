"""Why The Joker landed where it did on one game.

Gradient-boosted trees do not reason, they split, so "why" here means: which inputs moved
this game's prediction, and by how much. Every tree is walked down the path this game
actually takes, and the change in the node's value at each split is credited to the feature
that made that split. Summed over the 25 rounds, those credits plus a baseline reconstruct
the model's raw output exactly -- checked against decision_function on every run, so the
numbers add up rather than merely rank.

A node's value is the count-weighted mean of the leaves beneath it. The value stored on an
internal node by scikit-learn is a leftover of fitting and is not the node's prediction --
the root's is 0.0 and others run an order of magnitude past any leaf -- so using it gives
contributions ten times the size of the output they are meant to explain.

Contributions are in log-odds, the space the trees work in: +0.40 on a baseline of 0.10
is a home win chance of about 62% rather than 52%.
"""
from __future__ import annotations

import numpy as np


def _values(nodes):
    """Every node's prediction: its own for a leaf, the count-weighted mean below it
    otherwise. Computed once per tree, deepest first, so no recursion and no repeats."""
    n = len(nodes)
    val = np.zeros(n, dtype=float)
    order = sorted(range(n), key=lambda i: int(nodes[i]["depth"]), reverse=True)
    for i in order:
        if nodes[i]["is_leaf"]:
            val[i] = float(nodes[i]["value"])
            continue
        l, r = int(nodes[i]["left"]), int(nodes[i]["right"])
        cl, cr = float(nodes[l]["count"]), float(nodes[r]["count"])
        tot = cl + cr
        val[i] = (cl * val[l] + cr * val[r]) / tot if tot else 0.0
    return val


def contributions(model, X, top=8):
    """[{base, total, raw, why:[{f,v,c}, ...]}, ...] -- one per row of X, in X's order."""
    pre, est = model[:-1], model[-1]
    names = [str(n) for n in pre.get_feature_names_out()]
    Xt = pre.transform(X)
    if hasattr(Xt, "toarray"):
        Xt = Xt.toarray()
    Xt = np.asarray(Xt, dtype=float)

    trees = [(p.nodes, _values(p.nodes)) for stage in est._predictors for p in stage]
    # the part of the output no split accounts for: the model's baseline, plus what each
    # tree predicts before it has looked at anything
    base = float(np.ravel(est._baseline_prediction)[0]) + float(sum(v[0] for _, v in trees))

    out = []
    for i in range(Xt.shape[0]):
        row = Xt[i]
        credit: dict[int, float] = {}
        for nodes, val in trees:
            k = 0
            while not nodes[k]["is_leaf"]:
                f = int(nodes[k]["feature_idx"])
                v = row[f]
                if np.isnan(v):
                    nxt = int(nodes[k]["left"] if nodes[k]["missing_go_to_left"] else nodes[k]["right"])
                else:
                    nxt = int(nodes[k]["left"] if v <= nodes[k]["num_threshold"] else nodes[k]["right"])
                credit[f] = credit.get(f, 0.0) + (val[nxt] - val[k])
                k = nxt
        total = float(sum(credit.values()))
        ranked = sorted(credit.items(), key=lambda kv: abs(kv[1]), reverse=True)[:top]
        why = []
        for f, c in ranked:
            name = names[f].split("__", 1)[-1]
            # the transformed value is scaled and means nothing to read; show what went in
            raw_v = None
            if name in getattr(X, "columns", []):
                try:
                    rv = X.iloc[i][name]
                    raw_v = None if rv is None or (isinstance(rv, float) and np.isnan(rv)) else (
                        round(float(rv), 4) if isinstance(rv, (int, float, np.floating, np.integer)) else str(rv))
                except Exception:
                    raw_v = None
            if raw_v is None and not np.isnan(row[f]):
                raw_v = round(float(row[f]), 4)
            why.append(dict(f=name, v=raw_v, c=round(float(c), 4)))
        out.append(dict(base=round(base, 4), total=round(total, 4), raw=round(base + total, 4), why=why))
    return out


def check(model, X, made):
    """The decomposition has to reconstruct the model's own output, or it is decoration."""
    raw = np.ravel(model.decision_function(X)).astype(float)
    got = np.array([m["raw"] for m in made], dtype=float)
    return (float(np.max(np.abs(raw - got))) if len(raw) else 0.0), raw
