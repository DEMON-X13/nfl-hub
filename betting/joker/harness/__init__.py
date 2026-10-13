"""The pieces of the X NFL betting model's walk-forward research harness that the Joker's
inputs are built from (features.py), vendored here so the weekly run rebuilds them exactly as
the formula was tested:

  data.py     - the games loader (nflverse games.csv), team codes kept across moves
  sources.py  - the stat source: one row per team per game, EPA per play and the rest
  pbp.py      - play-by-play loading and the team-game aggregation the source uses
  ratings.py  - the Elo + EWMA rating state machine, a port of the app's own, read
                before each game
  qb.py       - the quarterback ratings and the backup-quarterback drop

The rest of the harness (the margin model's fit, the walk-forward scoring, the variants and
their tuning) stayed with the research; nothing here refits.
"""
