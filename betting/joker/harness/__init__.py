"""Walk-forward scoring harness for the X NFL betting model.

Three layers, per PROJECT_BRIEF.md:
  1. EPA          - per-play value. A *source* (harness/sources.py) turns raw data into
                    one row per team per game. This is the layer variants replace.
  2. Team ratings - Elo + EWMA state machine (harness/ratings.py). Fixed.
  3. Prediction   - linear margin model + logistic win prob (harness/fit.py). Refit
                    walk-forward, on prior seasons only (harness/score.py).

Every variant goes through the same code path: run.py <VARIANT>.
"""
