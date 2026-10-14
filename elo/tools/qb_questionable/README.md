# Counting a Questionable quarterback out: tested, not shipped

On 13 October 2026 the Game snapshot named Caleb Williams to start for Chicago at Green Bay
(Questionable, limited in practice; the ELO build keeps such a player in), and Tyson Bagent started.
The owner asked for the rule to be fixed. Before changing anything, two tests on the seasons
the build already knows, 2013-2025 (2026 is reported only as information and chose nothing):

1. **The game model's walk-forward with the rule in** (`switch.diff`, a test-only switch to
   `elo/build.py` at d3a5d2a: `ELO_QB_Q_OUT` adds a Questionable quarterback whose last practice
   matches to that week's outs; `ELO_WF_DUMP` writes each game's pre-game probability).
   `run_variants.sh` builds offline once per variant, `analyse.py` compares them,
   `starters.py` and `q_qb_rates.py` find who really started from the play-by-play.
   The bar, set before the runs: 2013-2025 log loss no worse **and** right picks no fewer.

   | Variant | Right (of 3,550) | Log loss | Paired diff (se) |
   |---|---|---|---|
   | today's rule | 2250 | 0.63874 | |
   | Limited counted out | 2252 | 0.63957 | +0.00083 (0.00087) |
   | Did Not Participate counted out | 2246 | 0.63847 | -0.00027 (0.00043) |
   | both | 2252 | 0.63929 | +0.00055 (0.00097) |

   None clears the bar; every difference is within one standard error. Under "Limited", 181
   team-games change their expected quarterback; the backup it named started 77 times, the
   quarterback today's rule keeps 90 times (`results/walkforward.txt`).

2. **How often a Questionable incumbent starts** (`qb_q_starts.py`, `qb_first_snap.py`,
   `qb_q_tables.py`, run by `run_all.sh`): the club's starter is its quarterback with the most
   offense snaps (PFR snap counts), the incumbent the one who started its previous game, joined
   to the injury report by gsis id through the rosters. Limited: 68 of 124 started, 54.8%
   (Wilson 95% 46.1-63.3; 53.9% on 2016-2025, after Probable was dropped). Did Not Participate:
   10 of 24, 41.7%. Full: 29 of 34, 85.3%. Doubtful 0 of 27, Out 0 of 111. Counting a limited
   Questionable incumbent out names the starter 48 times in 124 (38.7%) against 68 for counting
   him in (`results/start_rates.txt`).

An independent check re-derived both from its own code and got the same numbers.

One subgroup, found after looking: a limited Questionable chart QB1 who did not lead his club's
previous game (mostly a quarterback coming back, as Williams was) started 15 of 58 (25.9%). It
mixes real returns with weekly charts that had not caught up with a change of starter, and it was
found on the same seasons any test would use, so it is not a rule; a narrower rule built on it
would need seasons it has never seen.

To run again: `starters.py` and `q_qb_rates.py` read `elo/cache` (offline); `run_variants.sh`
needs `QB_WORKTREE`, a worktree of the repo with `switch.diff` applied, `elo/cache` linked into it
and a copy of its `elo/data` in `$QB_WORK/pristine_data`; `run_all.sh` needs nflverse's
`snap_counts_YYYY.csv`, `roster_YYYY.csv`, `roster_weekly_YYYY.csv` (2013-2025) and `players.csv`
in `$QB_WORK/data`. `QB_WORK` defaults to `work/` here (gitignored).
