#!/bin/sh
# Rebuilds out_v2 from data/ (nflverse snap counts, rosters, weekly rosters, players.csv) and the Elo cache (read only, 2013-2025).
set -e
B=${QB_WORK:-$(cd "$(dirname "$0")" && pwd)/work}
C=$(cd "$(dirname "$0")/../.." && pwd)/cache
mkdir -p $B/out_v2
python3 -I $(dirname "$0")/qb_q_starts.py $B/data $C $B/out_v2
python3 -I $(dirname "$0")/qb_first_snap.py $B/out_v2 $C
python3 -I $(dirname "$0")/qb_q_tables.py $B/out_v2 $C/games.csv
