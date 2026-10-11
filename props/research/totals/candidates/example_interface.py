"""Interface example only, not a contender: mu = line + b * (site model total - line), b and sd by
least squares on the training seasons. Shows the fit/predict contract and that predict never sees
the outcome columns."""
import numpy as np
name = 'example_interface'


def fit(train):
    t = train[train.total_line.notna()]
    x = (t.site_model_total - t.total_line).to_numpy(float); y = (t.total - t.total_line).to_numpy(float)
    b = float(np.dot(x, y) / np.dot(x, x))
    return {'b': b, 'sd': float(np.std(y - b * x, ddof=1))}


def predict(m, test):
    assert not {'total', 'home_score', 'away_score', 'result', 'overtime'} & set(test.columns), 'outcome leaked into predict'
    mu = test.total_line.to_numpy(float) + m['b'] * (test.site_model_total - test.total_line).to_numpy(float)
    return mu, np.full(len(test), m['sd'])
