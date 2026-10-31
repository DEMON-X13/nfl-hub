# The free-data props model

This is research toward a new player-props model built on free data only. The owner chose "the free
route" on 27 October 2026, after the diagnosis of the site's prop model:

- On 2,507 DraftKings main lines in 2026 weeks 1-6, its P(over) had log loss 0.7319. DraftKings'
  no-vig chance had 0.6905, and a coin 0.6931.
- Its departure from the market carried no information.
- Its biggest disagreements were mostly unders on promoted backups and rookies. It had no snap share,
  depth or teammates-out inputs.

The plan is in four steps:

1. Build the model on 2025 and earlier.
2. Commit a bar for it, set in advance.
3. Test it once against 2026's lines.
4. Run it quietly as a shadow. It goes live only if it passes (the touchdown passed the test and its shadow runs:
   "The touchdown shadow", at the end).

This folder holds all four steps:

- **The data and feature pipeline**, described from "Running it" down to "What the next step needs to know".
- **The models**, in four sections:
  - "Step 2a" for the counts;
  - "Step 2b" for the yards;
  - "Step 2c" for the anytime touchdown;
  - "Step 3" for the frozen models, `predict.py` and the bar.
- **The one-shot test and its result**, at the end of "Step 3": main lines FAIL, anytime touchdown PASS.
- **The touchdown shadow**, the last section.

The bar for step 3 is fixed in `PREREGISTRATION.md` before any 2026 file is read.

**2026 was held out until the one-shot ran.** While the model was built, no file of 2026 was downloaded and no 2026
outcome, line or price was read. `fetch.py` refuses a 2026 season file and cuts games.csv to 2025 before parsing it.
`build_features.py` refuses `--last 2026` (`HOLDOUT_FROM`).

Two programs lift the guard:

- **The one-shot test** (`fetch.py`): only in `oneshot_2026.py`, and only when `PROPMODEL_LIFT_HOLDOUT` is the SHA-256
  of a committed, unmodified `PREREGISTRATION.md` whose commit is on origin/main. Any other process that sets the
  variable is refused.
- **The touchdown shadow, since the one-shot ran** (`td_shadow.py`): it lifts the holdout inside its own process, in
  memory, after its hash checks, and never through the variable, which it refuses to run with. The owner signed this
  off on 31 October 2026, and "The touchdown shadow" argues it. Its one-time equivalence proof, `td_shadow_equiv.py`,
  ran through the same `lifted()`. No other program may lift it.

## Running it

```
python3 -I props/research/propmodel/build_features.py --data DIR      # fetch what is missing, then build
python3 -I props/research/propmodel/build_features.py --data DIR --no-fetch
python3 -I props/research/propmodel/build_features.py --data DIR --no-fetch --cutoff 2024 9 \
        --out DIR/cut.parquet --compare DIR/features.parquet           # the as-of test
python3 -I props/research/propmodel/check_features.py --data DIR       # independent recompute of a sample
```

`DIR` is outside the repo; the default is `$PROPMODEL_DATA`.

- Downloads go in `DIR/raw/`: 89 files, about 750 MB. They are fetched through `lib/netfetch.py`, and
  a file already on disk is not fetched again.
- The table is written to `DIR/features.parquet`: 94,562 rows × 552 columns (510 features), about 90 MB.
- `results/build_summary.json` holds the row counts, coverage and in-build checks. `results/columns.json`
  lists every column with its family, dtype and non-null share. `results/asof_test_*.json` and
  `results/check_features.json` hold the leakage tests.

The build takes about 1 minute on 4 cores, with the files already downloaded. The first download took
about 2 minutes. Every truncated rebuild for the as-of test takes about 1 minute.

The files read, all from nflverse:

| File | Seasons | Used for |
|---|---|---|
| `stats_player/stats_player_week_Y.csv` | 2010-2025 | outcomes; per-game box stats |
| `pbp/play_by_play_Y.parquet` | 2010-2025 | targets, air yards, red-zone and goal-line usage, dropbacks, team pace and pass rate, defence allowed, gamebook weather |
| `snap_counts/snap_counts_Y.csv` (PFR) | 2013-2025 | snap share; zero rows |
| `weekly_rosters/roster_weekly_Y.csv` | 2010-2025 | position as of the week; experience; who is off the active roster (2016 on) |
| `depth_charts/depth_charts_Y.csv` | 2013-2025 | depth that week (weekly charts through 2024, daily snapshots in 2025) |
| `injuries/injuries_Y.csv` | 2013-2025 | the week's injury report |
| `players/players.csv` | (master) | PFR id to GSIS id; birth date and draft. Only those columns are read |
| nfldata `games.csv` | cut to 2010-2025 | schedule, kickoff, closing spread/total/moneylines, rest, roof, surface, temp, wind |

The warm-up seasons, 2010-2012, only feed history: career and last-season features for 2013. The
table itself starts in 2013, the first season with snap counts.

The one-shot test and the touchdown shadow have commands of their own: `oneshot_2026.py` under "Step 3", and the
shadow's under "Running the shadow", at the end. Among them:

```
python3 -I props/research/propmodel/td_shadow.py init        # once, in the PR: the shadow's ledger with its bar, no call
VENV/bin/python -I props/research/propmodel/td_shadow.py rehearse --season 2025 --week 9 --data DIR --ref pred.parquet
VENV/bin/python -I props/research/propmodel/td_shadow_equiv.py --data DIR   # done once: the shadow's p is the one-shot's
python3 props/research/propmodel/test_td_shadow.py           # its test (TD_SHADOW_NOW stands in for the clock)
```

`VENV` is Python 3.13 with `requirements.txt`'s pins, the environment the one-shot ran in.

## The feature table

There is one row per (player, regular-season game), 2013-2025, for QB, RB (FB and HB included), WR, TE
and K.

### Who is in it

A row exists for every player who **played in his role**:

- for QB, RB, WR and TE, an offensive snap or any offensive stat (an attempt, carry, target or sack);
- for a kicker, a special-teams snap or a kick.

This holds **whether or not he has a stat line.** DraftKings voids a player prop only when the player
does not play. So a game where he played and recorded nothing is a zero, and the model must see it.
The site's current table (`props/raw/feat.pkl`) keeps only rows with a stat line. In 2019-2025 that
leaves out 8,745 of 49,314 played-in-role games: 18% of wide receiver games, 32% of tight end games
and 14% of running back games.

**How the zero rows are found.**

- Each PFR snap-count row is placed on a GSIS id by its PFR id. players.csv is tried first, then the
  weekly rosters.
- If neither gives an id, the row is placed by name, only where exactly one player on the club's
  roster that season has that name.
- Of 310,476 snap rows, 310,414 were placed, 155 of them by name. 62 were not; 26 of those are at a
  skill position with an offensive snap.
- A snap row with an offensive snap and no offensive stat is a zero row (`zero_row` = 1).

Rows in the warm-up seasons have no snap counts, so there are no zero rows before 2013. That is the one
place history differs (see "Windows").

**Special-teams-only rows** (`st_only` = 1) are QB, RB, WR and TE games with only a special-teams snap,
or only a non-offensive stat. They are kept so the history counts every game he dressed and played,
and so a modeller can decide. **Filter on `role_played` = 1 to fit or score.**

**Rows by season:**

| Season | K | QB | RB | TE | WR | All | of which zero rows | ST only |
|---|---|---|---|---|---|---|---|---|
| 2013 | 511 | 608 | 1993 | 1518 | 2437 | 7067 | 1057 | 547 |
| 2014 | 531 | 638 | 1949 | 1476 | 2485 | 7079 | 1049 | 457 |
| 2015 | 526 | 626 | 1961 | 1429 | 2454 | 6996 | 1034 | 408 |
| 2016 | 515 | 625 | 1857 | 1443 | 2544 | 6984 | 1040 | 415 |
| 2017 | 511 | 615 | 1913 | 1519 | 2526 | 7084 | 1119 | 404 |
| 2018 | 516 | 640 | 1818 | 1524 | 2537 | 7035 | 1122 | 399 |
| 2019 | 510 | 617 | 1875 | 1442 | 2569 | 7013 | 1075 | 452 |
| 2020 | 512 | 654 | 1910 | 1566 | 2648 | 7290 | 1177 | 453 |
| 2021 | 542 | 693 | 1968 | 1653 | 2852 | 7708 | 1306 | 475 |
| 2022 | 545 | 655 | 1955 | 1683 | 2740 | 7578 | 1270 | 422 |
| 2023 | 543 | 699 | 1826 | 1652 | 2864 | 7584 | 1315 | 372 |
| 2024 | 543 | 683 | 1829 | 1712 | 2796 | 7563 | 1331 | 403 |
| 2025 | 543 | 687 | 1835 | 1711 | 2805 | 7581 | 1271 | 426 |

**Position** is the weekly roster's as of that week, else the stats file's, else the snap file's. One
row per player per game.

### Identity and flags

These columns describe the row. None of them is a feature.

| Column | Meaning |
|---|---|
| `season`, `week`, `tkey` | `tkey` = season×100 + week, the time key every as-of rule sorts on |
| `game_id`, `gameday`, `kickoff_utc` | nflverse game id; kickoff from games.csv (ET) in UTC |
| `pid`, `name`, `pos`, `grp` | GSIS id; name; position; group (QB/RB/WR/TE/K) |
| `team`, `opp` | club codes in today's form (OAK→LV, SD→LAC, STL→LA, and the rosters' ARZ/BLT/CLV/HST/SL) |
| `stat_row`, `snap_row` | the player has a stats row / a snap-count row for the game |
| `role_played`, `zero_row`, `st_only` | as above |

### Outcomes: `y_*`

These are the game's results. **They are never features.**

| Column | What it is |
|---|---|
| `y_passing_yards` | official individual passing yards (sack yardage is not subtracted, as DraftKings settles) |
| `y_passing_tds`, `y_completions`, `y_attempts`, `y_passing_interceptions` | |
| `y_rushing_yards`, `y_carries` | carries include a quarterback's scrambles and kneels, as the stats file counts them |
| `y_receptions`, `y_receiving_yards`, `y_targets` | |
| `y_rush_rec_yards` | rushing plus receiving yards |
| `y_rushing_tds`, `y_receiving_tds` | |
| `y_rush_rec_tds` | their sum |
| `y_any_td` | 1 if rushing plus receiving TDs is at least 1. This is the site's anytime-touchdown rule: never a pass thrown |
| `y_special_teams_tds` | apart, since DraftKings' treatment of return TDs is not assumed |
| `y_sacks_suffered`, `y_fantasy_points_ppr` | |
| `y_fg_made`, `y_fg_att`, `y_pat_made`, `y_pat_att` | |
| `y_kick_pts` | 3 a field goal up to 39 yards, 4 for 40-49, 5 for 50+, plus PATs: the site's rule |
| `y_off_snaps`, `y_off_pct` | the game's own snaps (NaN without a snap row) |

A zero row has 0 in every stat outcome.

### Windows

Every rolling feature is a mean over **strictly earlier rows of its group**, sorted by `tkey`:

- a player's own earlier games (career scope, across seasons and clubs);
- a team's earlier games;
- a defence's earlier games.

`prior()` in `build_features.py` computes them with cumulative sums that exclude the current row, so a
row never sees itself. The suffixes:

| Suffix | Meaning |
|---|---|
| `_l1` | the last earlier game |
| `_l3` | mean of the last three earlier games (or as many as exist) |
| `_ew4`, `_ew10` (player), `_ew8` (team, defence) | exponentially weighted mean over earlier games, span 4, 10 or 8 games. These are pandas' `adjust=True` weights by row position; NaN rows are skipped. The build checks them against pandas' own ewm |
| `_szn` | mean of earlier games this season. NaN in his first game of the season |
| `_prev` | mean over the previous season's games (exactly season − 1). NaN if he did not play that season |
| `_car` | mean over every earlier game since the warm-up season |
| `_trend` | `_l3` minus `_ew10`, on snap share, target share, carry share and dropback share |

Weights run over games played, not weeks. A bye, or weeks out injured, do not decay anything; the
history and availability features say how long ago the last game was.

**The history starts in 2010.** For 2013-2015 a veteran's `_car` and `x_gp_car` count only from 2010
(`x_years_exp` tells veterans apart). The warm-up games have no zero rows, which lifts a backup's 2013
career means slightly. Snap-based windows (`p_off_pct_*`, `p_off_snaps_*`, `p_st_pct_*`,
`p_est_routes_*`, `p_r_tprr_*`, `p_r_yprr_*`) are NaN until he has a game from 2013 on.

### Player features: `p_<metric>_<window>`

The metrics, each per game:

- **From the stats file:**
  - `passing_yards`, `passing_tds`, `completions`, `attempts`, `passing_interceptions`;
  - `rushing_yards`, `carries`;
  - `receptions`, `receiving_yards`, `targets`;
  - `rush_rec_yards`, `rush_rec_tds`, `any_td`;
  - `sacks_suffered`, `fantasy_points_ppr`, `passing_epa`;
  - `fg_att`, `fg_made`, `pat_att`, `kick_pts`.
- **From the snap counts:**
  - `off_snaps`, `off_pct` (snap share);
  - `st_pct`;
  - `est_routes`: the routes proxy, his offensive snaps × the team's dropbacks / team plays that game.
- **From the play-by-play** (REG, plays of type pass or run, no two-point tries):
  - `tgt`: targets, meaning pass attempts with a receiver, no sacks;
  - `air_yards`: on his targets;
  - `rz_tgt`: targets inside the 20;
  - `ez_tgt`: targets whose air yards reach the goal line;
  - `deep_tgt`: targets of 20+ air yards;
  - `car_d`: designed runs, no scrambles or kneels;
  - `rz_car`: designed runs inside the 20;
  - `gl_car`: designed runs inside the 5;
  - `db`: his dropbacks as passer, scrambles and sacks included;
  - `scrambles`;
  - `qb_epa`: EPA on his dropbacks;
  - `cpoe_sum`, `cpoe_n`: CPOE summed over his attempts, and their count;
  - `fg50_att`: field goals tried from 50+.
- **Shares of the team's same-game total:**
  - `tgt_share`;
  - `ay_share` (air yards);
  - `rz_tgt_share`;
  - `car_share` (designed runs);
  - `rz_car_share`;
  - `db_share`: dropbacks, the starting-QB signal.

**Window sets:**

- These metrics have all seven windows (`l1 l3 ew4 ew10 szn prev car`): passing yards, passing TDs,
  completions, attempts, interceptions, rushing yards, carries, receptions, receiving yards,
  rush+rec yards, rush+rec TDs, `any_td`, targets, FG attempts, FG made, kick points, `off_pct` and
  the six shares.
- The rest have `ew4 ew10 szn prev`.

**Efficiency ratios: `p_r_<name>_<ew10|szn|car>`.** Each is a ratio of the two windowed means (the
same weights on top and bottom), so it is a weighted rate:

- `ypc`: rushing yards / carries
- `ypt`: receiving yards / targets
- `catch`: receptions / targets
- `ypa`: passing yards / attempts
- `comp`: completions / attempts
- `ptd_rate`: passing TDs / attempts
- `int_rate`: interceptions / attempts
- `sack_rate`: sacks / dropbacks
- `td_per_opp`: rush+rec TDs / (carries + targets)
- `adot`: air yards / pbp targets
- `tprr`: targets per route, from the routes proxy
- `yprr`: receiving yards per route, from the routes proxy
- `epa_db`: EPA per dropback
- `cpoe`
- `fg_pct`

### Team and opponent features

**Own team, earlier games: `t_*`.** Windows are `ew8` (career scope, so the team carries across
seasons) and `szn`.

- Volumes: `t_plays`, `t_db`, `t_drush`, `t_tgt`, `t_air_yards`, `t_rz_plays`, `t_points`, `t_fg_att`.
  Points come from games.csv's final score of earlier games.
- Rates, as `t_r_*`:
  - `pass_rate`: dropbacks / plays;
  - `neu_pass_rate`: the same at win probability 0.2-0.8, downs 1-2, outside the last 2 minutes of a half;
  - `proe`: pass rate over expected, nflverse's `pass_oe` / 100;
  - `epa_db`, `epa_rush`;
  - `succ_db`, `succ_rush`: success rates;
  - `sack_rate`;
  - `rz_share`: plays in the red zone / plays;
  - `expl_pass`: 20+ yard dropbacks;
  - `expl_rush`: 10+ yard designed runs.
- `t_gp_szn` is the team's games so far this season.

**Opponent defence, earlier games: `d_*`.** These are the same measures, as allowed:

- `d_plays`, `d_db`, `d_drush`, `d_points`, `d_pass_yds`, `d_rush_yds`, `d_sacks`, `d_rz_plays`, and
  the `d_r_*` rates.
- `d_<m>_rel` divides the defence's `ew8` by the mean `ew8` of every defence playing that week. Each of
  those values is already as of before the week, so the ratio is too. This applies to points, pass
  yards, rush yards, EPA per dropback and EPA per run.

**What the opponent allowed to this player's position group: `oa_<metric>_<ew8|szn|rel>`.** These are
summed per game over every opposing player of the group, zero rows included.

| Group | Metrics |
|---|---|
| QB | passing yards, passing TDs, attempts, completions, interceptions, rushing yards, sacks, PPR points |
| RB | carries, rushing yards, receptions, targets, receiving yards, rush+rec TDs, PPR points |
| WR, TE | targets, receptions, receiving yards, receiving TDs, PPR points |
| K | FG attempts, FG made, kick points |

A metric that is not the row's group's is NaN. That is why each `oa_` column is non-null on about 7-30%
of rows.

### This week's information

**Depth chart that week: `dc_*`.**

- **Which chart:** through 2024 it is the weekly chart for the week, with REG games only. Rows are
  formation Offense; for kickers, K/PK in Special Teams.
- **In 2025:** the last daily snapshot taken at least 4 hours before kickoff (`DC_LEAD_H`). The depth is
  the order within the slot, by ESPN's `pos_rank`.
- **Groups:** FB is folded into RB, and marked with `dc_fb`.
- **Coverage:** the player rows with a chart listing are 94% (WR) to 98% (QB). The depth charts are
  thinner in 2020-2024, at 90-93%.

The columns:

| Column | Meaning |
|---|---|
| `dc_depth` | his depth in his own group, 1 = first in his slot. A chart can list three WR1s |
| `dc_rank` | his rank in his group on the team's chart: by depth, then by his usage over earlier games (dropbacks, carries + targets, or targets, `ew4`), so it uses nothing of the game |
| `dc_n_starters` | how many players are at depth 1 in his group |
| `dc_depth_any` | his best depth anywhere on the chart |
| `dc_offpos` | listed only at another group |
| `dc_listed` | on the chart at all. NaN if the team has no chart that week |
| `dc_team_chart` | the team has a chart that week |
| `dc_qb1` | the chart's QB1, as a GSIS id (not numeric) |
| `dc_is_qb1` | he is the chart's QB1 |
| `dc_qb_change` | the chart's QB1 is not the QB who dropped back most in the team's last game |
| `dc_qb1_gp` | the QB1's career games before this one |
| `dc_qb1_epa_db` | the QB1's EPA per dropback (`ew10`) as of before his previous game: one game stale, on purpose. His previous game's own row would be the nearest as-of value, but it is that row's pre-game value |

**His own injury report that week: `inj_*`.**

| Column | Meaning |
|---|---|
| `inj_out`, `inj_doubtful`, `inj_questionable`, `inj_probable` | the final game status. Probable ended in 2016 |
| `inj_dnp`, `inj_limited` | the last practice entry |
| `inj_listed` | on the report at all |
| `inj_report_team` | the team filed a report that week |

**Teammates' availability: `tm_*`.** A *candidate* for a team-week is a player whose latest earlier game
was for that team, at most 17 team games ago (`RET_WINDOW`).

A candidate is *absent* when either holds:

- the week's injury report has him Out or Doubtful;
- from 2016 on, the week's weekly roster does not have him on that team as ACT or INA. That covers
  reserve lists, released, traded, suspended, practice squad, or not on the team's roster.

Two caveats on absence:

- INA is the game-day inactive list. It is treated as present, since nobody knew it before kickoff.
- Absences count only for candidates who played one of the team's last 3 games (`VAC_WINDOW`). An older
  absence is already reflected in the others' recent shares. Without this rule, a player released in
  October would count as "vacated" for a season and a half.

Each candidate carries his usage state after his latest game (`ew4` of target, air-yard, carry,
red-zone and dropback shares and snap share). The row's own player is taken out of every sum.

| Column | Meaning |
|---|---|
| `tm_vac_tgt`, `tm_vac_ay`, `tm_vac_car`, `tm_vac_rz_tgt`, `tm_vac_rz_car` | vacated shares: sums over absent candidates |
| `tm_vac_inj_*` | the same with the injury report alone |
| `tm_vac_tgt_grp`, `tm_vac_car_grp`, `tm_n_absent_grp` | vacated shares and count in his own group |
| `tm_n_absent` | absent candidates with a real role (`ew4` target share ≥ 0.08, carry share ≥ 0.15, dropback share ≥ 0.5 or snap share ≥ 0.4) |
| `tm_top3_tgt_absent` | how many of the team's three highest recent target shares are absent: the "other top targets" for a receiver |
| `tm_ret_*` | shares of present candidates who missed at least the team's last game: players returning |
| `tm_qb_lead_absent` | the QB with the most dropbacks over the team's last 8 games is absent (or has played for another club since) |
| `tm_is_qb_lead` | he is that QB |
| `tm_ol_out` | the team's offensive linemen Out or Doubtful |
| `tm_roster_known` | the roster rule applies (2016 on) |

**The opponent's injury report: `od_*`.** `od_db_out` counts defensive backs Out or Doubtful;
`od_front_out` counts the front seven.

### Experience, history and the game

**Experience and history: `x_*`.**

| Column | Meaning |
|---|---|
| `x_gp_car`, `x_gp_szn`, `x_gp_prev` | games before this one: career since 2010, this season, last season |
| `x_gp_share_szn` | `x_gp_szn` / the team's games so far |
| `x_first_game` | his first game in the table's history |
| `x_new_team` | his last game was for another club |
| `x_gp_with_team` | games in a row with this club |
| `x_days_since_last` | days since his last game |
| `x_team_games_missed` | the team's games since his last one |
| `x_years_exp`, `x_rookie` | from the weekly roster as of the week |
| `x_draft_number`, `x_draft_round`, `x_undrafted` | draft facts |
| `x_age` | at the game day, from the birth date |
| `x_height`, `x_weight` | |

**The game: `g_*`.** These are pre-game market, venue and weather facts.

| Column | Meaning |
|---|---|
| `g_spread_line`, `g_total_line` | games.csv's closing lines. nflverse's spread is the home side's expected margin |
| `g_margin` | the team's expected margin |
| `g_implied`, `g_opp_implied` | team points implied by the total and the margin: total/2 ± margin/2 |
| `g_win_prob` | the team's chance from the closing moneylines, margin out |
| `g_is_home`, `g_neutral`, `g_div_game` | |
| `g_rest`, `g_opp_rest` | days of rest |
| `g_roof`, `g_surface`, `g_dome` | `g_dome` is a dome or a closed roof |
| `g_temp`, `g_wind` | games.csv's, else parsed from the play-by-play's gamebook weather line. Under a roof the wind is 0 and the temperature NaN |
| `g_wet` | rain, snow, showers, drizzle, sleet or flurries in the gamebook line |
| `g_kick_hour_et`, `g_weekday` | |

## Leakage: the risks seen, and how each is handled

**2026 data.**

- games.csv carries the 2026 schedule, scores and lines. It is cut line by line on the game id's first
  four characters before anything parses a field, and only the cut copy is kept. 272 lines were
  discarded unparsed.
- The 2025 depth chart file has snapshots to March 2026. Only snapshots before each game's kickoff are
  read, and nothing after the table's last kickoff.

**players.csv's as-of-now columns.** `latest_team`, `last_season`, `status` and `years_of_experience`
would tell a 2019 row how a career went. They are never read (`usecols`). Only ids, names, birth date,
draft facts and position are read, and position only as a last resort.

**Weekly roster statuses before 2016 are end-of-season values.** Among players who took an offensive
snap in a week, the share whose roster row for that same week is not ACT or INA is:

- 11.2% in 2013, 11.9% in 2014 and 14.8% in 2015, mostly RES, TRD and CUT. Seneca Wallace, 2013 week
  10, was listed RES in the week he started and was hurt.
- 0.2% in 2016, and 0.0-0.03% in 2017-2025.

So roster status is used for absence only from 2016 on (`ROSTER_STATUS_FROM`). For 2013-2015, absence
comes from the injury report alone, and `tm_roster_known` = 0 says so. The roster's position and
experience columns are still read, as-of, for every season.

**Game-day inactives.** INA, announced 90 minutes before kickoff, is treated as present. So nothing in
the table depends on it.

**Depth charts are assumed pre-game.** The evidence that they are not built from who played:

- 41% of players the injury report had Out that week are still at depth 1 on that week's chart (42% in
  2025's snapshots). A chart built from participation would show about 0%.
- The chart's QB1 led his team in attempts in only 84-93% of games a season.

The 2025 snapshots are taken at least 4 hours before kickoff.

**Same-game facts never read as features:**

- games.csv's scores, `result`, `total` and `overtime`. The final score of earlier games feeds `t_points`
  and `d_points` through the windows only.
- `away_qb_id` and `home_qb_id` (who actually started), `referee`, and coaches.
- Snap counts of the game itself; they are `y_off_snaps` and `y_off_pct`.

**Market lines.** The closing spread, total and moneylines are used as the market's pre-game view, as
the brief allows. They are the last pre-kickoff numbers, not ones available days ahead.

**Weather is the gamebook's report at kickoff**, not a forecast. It is close to what a forecast says
hours before, but a live version must read a forecast.

**No whole-season normalisation.** The site's `feat.pkl` z-scores implied points and relative
team/defence volumes on whole-season means, a small look-ahead. Here, implied points are raw, and the
`_rel` columns divide by the mean over teams playing that same week of values that are already as of
before it.

**Position, and who is in the sample.**

- Position is the weekly roster's as of the week. The stats file's position, possibly one value per
  season, is only a fallback.
- The sample is conditioned on the player playing, which is how DraftKings settles a prop. That is a
  definition of the target population, not a feature.
- A live model will score players expected to play; whether he plays is not predicted here.

**Residual risks the tests cannot see.**

- nflverse republishes past files with stat corrections. A 2019 row reads 2019's numbers as corrected
  since, not as they stood on game day. These are small.
- The weekly depth charts' exact publication time is not recorded. The evidence above says they are
  pre-game; they are often stale (injured starters left on).

**Verification.**

- **As-of test.** `--cutoff S W` rebuilds the whole table from every source truncated after season S
  week W:
  - stats, snaps and play-by-play;
  - rosters, depth charts and injuries;
  - games.

  `--compare` then holds every row up to that week to the full build, every column, NaN-aware, at 1e-9.
  It was run at four cut points, and every row matched in every column:

  | Cut after | Rows compared | Columns differing |
  |---|---|---|
  | 2015 week 12 (pre-2016 roster path, mid-season) | 18,943 | 0 |
  | 2016 week 1 (a season boundary and the first roster-status week) | 21,576 | 0 |
  | 2024 week 9 (weekly charts) | 83,258 | 0 |
  | 2025 week 6 (daily depth snapshots) | 89,580 | 0 |

  The results are in `results/asof_test_*.json`.
- **In-build checks** (`build_summary.json`'s `leak_checks`):
  - every `l1` equals the player's previous row's outcome;
  - the vectorised `ew4` equals pandas' `shift(1).ewm(span=4)` on 25,956 rows of players with no
    warm-up history;
  - no feature correlates above 0.9 with a same-game outcome within its group. The highest are the
    honest ones: carries vs `p_car_share_ew4` 0.76, receptions vs `p_receptions_ew10` 0.66-0.67.
- **Independent recompute.** `check_features.py` shares no code with the builder. It recomputes 400
  random RB/WR/TE rows of 2016-2025 from the raw files filtered to earlier weeks:

  | Feature | Matched |
  |---|---|
  | season-to-date receiving yards per game | 366/367 |
  | games so far this season | 399/400 |
  | previous game's snap share | 366/366 |
  | team plays per game | 373/373 |
  | implied points | 400/400 |
  | weekly-chart depth | 357/357 |
  | Questionable status | 400/400 |

  The two misses are one player, Cody White (PIT, 2021). players.csv has no PFR id for him, so the
  checker, which maps through players.csv alone, missed his snap-only games. The builder placed them
  through the roster file.

## Coverage

These are non-null shares among rows where the player played his role (`results/columns.json` has every
column):

- **Player windows:** about 98% (the first career game in the history, 1,540 rows, has none).
- **Snap windows:** 92% in 2013, then 98%.
- **Team, defence and opponent-allowed windows:** 94-100%. The first game of the history and each
  season's first game have no `_szn`.
- **Depth chart:** 94-98%, and 90-93% in 2020-2024.
- **Injury, availability and game-market columns:** 100%. `g_win_prob` is 99.6% in 2017.
- **Weather:** temperature 99.8% and wind 99.7% outdoors (domes are NaN by design).
- **Draft number:** 69%; undrafted players are NaN, with `x_undrafted` = 1.

## What the next step needs to know

- `role_played` = 1 is the population. Each prop's target is its `y_` column. Zero rows are real zeros.
- The features are many and redundant (`p_targets_*` from the stats file and `p_tgt_*` from the
  play-by-play agree almost exactly). Choosing among them belongs to the fitting step, walk-forward on
  2025 and before.
- The table has no 2026 rows. The frozen test will need this same build run with 2026 sources after the
  preregistration is committed, with `HOLDOUT_FROM` lifted in its own commit.

## Step 2a: the count props' distributions (`model_counts.py`)

Receptions (RB, WR, TE), completions, attempts, interceptions and passing TDs (QB), and carries (QB, RB): a whole
predictive distribution for each player-game, tested walk-forward on 2021-2025 against the site's current model. Nothing
of 2026 is read: the script refuses a feature table with a 2026 row.

```
python3 -I props/research/propmodel/model_counts.py --data DIR            # the walk-forward (about 40 min on 2 threads)
python3 -I props/research/propmodel/model_counts.py --resummarize DIR     # rebuild the JSON from DIR/counts_walkforward_preds.parquet
python3 -I props/research/propmodel/model_counts.py --report results/counts_walkforward.json   # markdown tables
```

It needs lightgbm, scikit-learn and scipy. It writes `results/counts_walkforward.json` and the per-row predictions to
`DIR/counts_walkforward_preds.parquet` (every model's mean, sd, CRPS, PIT and P(over) at each stand-in line).

**Protocol.** For each test season s, the new models train on 2013..s-1. One inner split (fit on 2013..s-2, validate on
s-1) chooses the GBMs' rounds by early stopping, the GLM's L2 penalty from {1e-4, 1e-3, 1e-2}, the negative binomial
dispersion alpha(mu) = exp(a + b log mu) (fitted on s-1's out-of-sample predictions), and the multiclass model's 120
features (the inner Poisson GBM's top gain). Every other setting is fixed in the file. Season s chooses nothing.

**The models.**
- `CURRENT`: the site's recipe refitted walk-forward on its own table (feat.pkl, from 2019): ridge on featVec's 15 inputs,
  then the four ratio tables, priced as `pOver` prices. At s = 2025 its training seasons are the shipped model's, and it
  reproduces it (its mean within 0.013 RMS of the shipped model's on every target, its CRPS within 0.002). `SHIPPED` is
  `final_model.json` itself, scored on 2025 only. A zero row (feat.pkl has none) gets the recipe's own windows over his
  stat-line games and his club's context; the recomputed windows equal feat.pkl's to 0 on its 40,538 rows.
- `GLM_NB`: Poisson GLM on 57-82 curated features (log1p of counts, missing indicators), negative binomial around it.
- `GBM_NB`: LightGBM Poisson on all 510 features, negative binomial around it.
- `GBM_MC`: LightGBM multiclass on the count itself (classes 0..cap; a handful of test rows exceed the cap, at most 16 of
  3,410 for QB carries).
- `REF_NAIVE` (reference): negative binomial around his `ew10` mean.

**Test rows.** Every game played in his role, zero rows included (16-32% of TE, WR and RB games), as DraftKings settles.
No book line exists before 2026, so P(over) is scored at stand-in lines:
- his trailing median of 6 games rounded to the half point at or below it;
- his trailing 5-game mean rounded to the nearest half point;
- INT 0.5 and passing TDs 0.5 and 1.5.

"Lineable" rows are the ones a book would plausibly price, judged before the game: QB1 for QB stats (carries also with a
trailing median of 1.5+), a trailing median of 1.5+ receptions, or 4.5+ carries for a back.

### Results, 2021-2025

**CRPS on all rows** (lower is better). GBM_NB beat CURRENT in every one of the 45 target-seasons.

| target | n | CURRENT | GLM_NB | GBM_NB | GBM_MC | GBM_NB skill |
|---|---|---|---|---|---|---|
| QB attempts | 3,410 | 5.942 | 5.535 | **5.224** | 5.470 | +12.1% |
| QB completions | 3,410 | 4.000 | 3.753 | **3.571** | 3.675 | +10.7% |
| QB interceptions | 3,410 | 0.3995 | 0.3838 | **0.3810** | 0.3825 | +4.6% |
| QB passing TDs | 3,410 | 0.5431 | 0.5148 | 0.5124 | **0.5097** | +5.7% |
| QB carries | 3,410 | 1.277 | **1.229** | 1.231 | 1.257 | +3.7% |
| RB carries | 8,293 | 2.319 | 2.217 | **2.134** | 2.179 | +8.0% |
| RB receptions | 8,293 | 0.758 | 0.708 | **0.698** | 0.704 | +7.9% |
| WR receptions | 13,340 | 1.024 | 0.913 | **0.900** | 0.909 | +12.2% |
| TE receptions | 8,157 | 0.880 | 0.694 | **0.688** | 0.694 | +21.8% |

**Lineable rows:** CRPS, then log loss of P(over the trailing median).

| target | n | CURRENT CRPS | GBM_NB CRPS | best CRPS | CURRENT LL | GBM_NB LL | best LL |
|---|---|---|---|---|---|---|---|
| QB attempts | 2,402 | 5.142 | 4.952 | MC 4.879 | 0.6420 | 0.6337 | MC 0.6294 |
| QB completions | 2,402 | 3.611 | 3.481 | MC 3.456 | 0.6538 | **0.6407** | |
| QB interceptions | 2,402 | 0.428 | 0.426 | | 0.6848 | **0.6798** | |
| QB passing TDs | 2,402 | 0.608 | 0.601 | MC 0.598 | 0.6296 | 0.6199 | MC 0.6176 |
| QB carries | 2,061 | 1.323 | 1.299 | GLM 1.299 | 0.6518 | 0.6466 | GLM 0.6429 |
| RB carries | 4,351 | 3.010 | **2.847** | | 0.6478 | **0.6161** | |
| RB receptions | 3,299 | 1.010 | **0.984** | | 0.6629 | **0.6485** | |
| WR receptions | 7,586 | 1.216 | **1.158** | | 0.6730 | **0.6393** | |
| TE receptions | 3,303 | 1.114 | **1.074** | | 0.6694 | **0.6506** | |

**All nine pooled, P(over the trailing median).**

| rows | n | base rate | CURRENT | GBM_NB (diff, 90% CI) | slope CUR / GBM_NB | \|p−0.5\| vs \|hit−0.5\| by decile, CUR / GBM_NB |
|---|---|---|---|---|---|---|
| lineable | 30,004 | 0.6920 | 0.6600 | 0.6400 (−0.0200 [−0.0223, −0.0174]) | 0.90 / 0.98 | 0.109 vs 0.099 / 0.129 vs 0.133 |
| starters | 30,764 | | 0.6572 | 0.6302 (−0.0270 [−0.0298, −0.0241]) | 0.82 / 0.94 | 0.123 vs 0.105 / 0.142 vs 0.141 |
| backups | 21,380 | | 0.8308 | 0.6085 (−0.2223 [−0.2313, −0.2141]) | 0.33 / 0.86 | 0.192 vs 0.097 / 0.177 vs 0.170 |
| all | 52,144 | | 0.7284 | 0.6213 (−0.1071 [−0.1111, −0.1035]) | 0.39 / 0.92 | 0.151 vs 0.076 / 0.156 vs 0.152 |

**Fixed lines on QB1s.** The base rate is the training seasons' hit rate.

| line | base rate | CURRENT | GBM_NB | GBM_MC | slope CUR / GBM_NB |
|---|---|---|---|---|---|
| interceptions 0.5 | 0.6931 | 0.6954 | 0.6918 (−0.0036 [−0.0095, +0.0017]) | 0.6938 | 0.34 / 0.55 |
| passing TDs 0.5 | 0.5579 | 0.5242 | 0.5153 | 0.5143 | 0.72 / 1.07 |
| passing TDs 1.5 | 0.6909 | 0.6722 | 0.6620 | 0.6595 | 0.65 / 0.89 |

**2025 alone, against the shipped model.** CRPS:

| target | SHIPPED | GBM_NB |
|---|---|---|
| QB attempts | 5.838 | 5.007 |
| QB completions | 3.919 | 3.385 |
| QB interceptions | 0.370 | 0.349 |
| QB passing TDs | 0.563 | 0.524 |
| QB carries | 1.243 | 1.188 |
| RB carries | 2.238 | 2.025 |
| RB receptions | 0.698 | 0.638 |
| WR receptions | 0.961 | 0.845 |
| TE receptions | 0.875 | 0.701 |

### What it says

1. **GBM_NB is the best single candidate.**
   - It has the lowest CRPS on all rows for 7 of 9 targets, and the lowest lineable log loss for 6 of 9.
   - It is the best on all nine targets pooled.
   - It beats CURRENT in every target and season.
   - The two other candidates win a few targets, each by a hair:
     - GBM_MC on QB attempts and completions for starters (where the negative binomial is too wide: 50%/80% coverage 0.63/0.89 for QB1 attempts, against GBM_MC's 0.52/0.83), and on passing TDs;
     - GLM_NB on QB carries.
2. **Against the current model, the gain is large on backups, rookies and zero rows, and modest on starters.**
   - Backups: CRPS 8-35% better. Rookies: up to 25% better (WR 17%, TE 25%), though level on interceptions. CURRENT never saw a zero row and shrinks new players toward an all-player mean, so its P(over) on backups sits twice as far from 50% as their hit rates do.
   - Starters: CRPS 1.2-5.4% better (interceptions 0.6%, within noise); line log loss 0.004-0.062 better.
3. **Promoted backups** (moved into a starter slot since their last game; 103-416 rows a target):
   - CURRENT under-projects promoted QBs by 3.4 attempts and 2.2 completions. GBM_NB misses by 0.7 and 0.5.
   - On log loss at stand-in lines the difference is mostly within noise. A stand-in line built from a backup's own history moves down with him, as the old model did, so these lines cannot show the failure the 2026 DraftKings lines showed. The line-free CRPS and bias can.
4. **Sharp and calibrated.**
   - On lineable rows GBM_NB's calibration slope is 0.98. Its P(over) sits 0.129 from 50% where the outcomes by decile sit 0.133: it is sharper than CURRENT (0.109) and not overconfident.
   - Its PIT is near flat, with 50%/80% coverage of 0.50-0.56 / 0.80-0.83 on all rows.
   - Two exceptions:
     - QB1 interceptions: no model beats the base rate, and every model is overconfident (slope 0.34-0.55). Honest pricing there is close to the market or base rate.
     - QB1 passing volume under the negative binomial: too wide; the multiclass shape fits better.
5. **League drift.** Passing volume fell: WR receptions per team-game were 11.0 in 2025 against 12.0 in 2022-2024, and attempts per team-game 32.1 against 35.7 in 2016.
   - The models trained on earlier seasons over-predicted 2025: GBM_NB by 0.94 QB attempts and 0.20 WR receptions per player-game, CURRENT by 0.49 and 0.44.
   - This is a risk for 2026 that no walk-forward choice here can remove.
6. **These stand-in lines are not DraftKings.**
   - DraftKings' line knows more than a trailing median: the diagnosis found it 5-16% closer than the trailing 5-game mean on yards, and 0.08 closer on receptions.
   - Beating CURRENT and the stand-ins says the forecasts are better. It does not say they beat the book. Only the frozen 2026 test against DraftKings' lines can.

## Step 2c: the anytime touchdown's distribution (`model_td.py`)

The outcome is rushing plus receiving touchdowns (`y_rush_rec_tds`, 0 to 6), for QB, RB, WR and TE. The anytime
touchdown is that count being 1 or more, the site's and DraftKings' rule (a pass thrown never counts). Each model gives
the whole count distribution, tested walk-forward on 2021-2025 against the site's current model. Nothing of 2026 is
read: the script refuses a feature table with a 2026 row, cuts feat.pkl below 2026, and opens no payload, price or line.

```
python3 -I props/research/propmodel/model_td.py --data DIR                 # the walk-forward (about 40 min on 2 threads)
python3 -I props/research/propmodel/model_td.py --resummarize DIR          # the JSON again from DIR/td_walkforward_preds.parquet
python3 -I props/research/propmodel/model_td.py --report results/td_walkforward.json   # markdown tables
```

**Protocol.**
- **Fits.** For each test season s, one fit per group:
  - the new models train on 2013..s-1;
  - the site's recipe trains on 2019..s-1 (feat.pkl's seasons), so at s = 2025 its seasons are the shipped model's.
- **Inner split.** Fit on 2013..s-2, validate on s-1. It chooses:
  - the GBMs' rounds, by early stopping, then refitted on 2013..s-1 at 1.1 times as many;
  - the logistic GLM's L2 penalty, from {1e-4, 1e-3, 1e-2}.
- Everything else is fixed in the file, and no model is recalibrated after its fit. Both were decided before the first
  run, and season s chooses nothing.

**The models.**
- `CURRENT`: the site's recipe refitted walk-forward.
  - The method is `props/research/qb_td.py`'s recovery of fit4.py: a logistic regression on featVec's 15 inputs, L2 3
    on all but the intercept, on rows with 2+ earlier games. Quarterbacks are fitted on each club's pregame starter only.
  - Then `project()`'s touch cap: min(p, 1 - exp(-1.5 (mc·rush + mr·rec))). mc and mr are the recipe's ridge
    projections of carries and receptions, refitted. rush and rec are the training seasons' touchdowns per carry and
    per reception.
  - At s = 2025 it reproduces the shipped coefficients: the QB logit exactly, RB/WR/TE within 0.018; its chance within
    0.0014 RMS.
  - `SHIPPED` is final_model.json and tdrate.json themselves, scored on 2025.
- `GLM_LOGIT`: a logistic regression on 126 curated features:
  - touchdown form;
  - red-zone, goal-line and end-zone usage and shares;
  - snap, carry and target shares;
  - depth, injuries, vacated red-zone shares;
  - team and opponent red-zone volume and scoring;
  - implied total and spread.
- `GBM_BIN`: LightGBM, binary objective, on all 506 numeric features.
- `GBM_POIS`: LightGBM, Poisson objective on the count, on all 506 numeric features. P(1+) = 1 - e^-λ.
- References: `REF_RATE` (the group's training rate) and `REF_NAIVE` (his career rate shrunk to it by 4 games).
- Every binary model's count distribution is the page's `tdPlus`: Poisson with λ = -log(1 - p).

**Test rows.** Every game played in his role (33,200 in 2021-2025, zero rows included).

"Book-like" rows (26,396) are judged before the game:
- QB: the week's QB1;
- RB, WR, TE: a trailing 6-game median of 1.5+ carries + targets, or a depth rank within RB3 / WR4 / TE2.

The stand-in lines (trailing median, trailing 5-game mean) are 0.5 on 99.5% and 97% of rows, so they are close to the
plain anytime touchdown. The 2+ line (1.5) is scored too.

### Results, 2021-2025

**All four groups pooled, P(1+ TD).** The lower the log loss and CRPS, the better. Slope 1 is calibrated; above 1 is
too compressed, below 1 overconfident.

| rows | model | log loss | vs CURRENT (90% CI) | Brier | CRPS | mean p / hit | slope | resolution claimed / delivered |
|---|---|---|---|---|---|---|---|---|
| all 33,200 | CURRENT | 0.4111 | | 0.1257 | 0.1536 | 0.196 / 0.164 | 1.42 | 0.067 / 0.090 |
| | GLM_LOGIT | 0.3875 | −0.0236 [−0.0254, −0.0217] | 0.1203 | 0.1481 | 0.169 / 0.164 | 1.01 | 0.106 / 0.107 |
| | GBM_BIN | 0.3876 | −0.0235 [−0.0252, −0.0217] | 0.1203 | 0.1480 | 0.167 / 0.164 | 1.05 | 0.102 / 0.105 |
| | **GBM_POIS** | **0.3873** | −0.0238 [−0.0254, −0.0219] | **0.1201** | **0.1478** | 0.166 / 0.164 | 1.05 | 0.101 / 0.105 |
| | REF_RATE | 0.4406 | +0.0294 | 0.1355 | 0.1646 | | | |
| book-like 26,396 | CURRENT | 0.4544 | | 0.1433 | 0.1774 | 0.210 / 0.193 | 1.28 | 0.072 / 0.091 |
| | GLM_LOGIT | 0.4367 | −0.0177 [−0.0196, −0.0157] | 0.1387 | 0.1725 | 0.198 / 0.193 | 1.03 | 0.105 / 0.107 |
| | GBM_POIS | 0.4370 | −0.0174 [−0.0191, −0.0155] | 0.1387 | 0.1724 | 0.194 / 0.193 | 1.07 | 0.100 / 0.106 |

- **The three candidates are level.**
  - GBM_POIS has the lowest CRPS and log loss on all rows. GLM_LOGIT and GBM_BIN are within 0.0003 of it, every 90%
    interval spanning 0.
  - Each beats CURRENT in every one of the five seasons: −0.021 to −0.026 on all rows, −0.011 to −0.023 on book-like
    rows.
  - On 2025 alone, against SHIPPED: −0.0226 (GBM_POIS) to −0.0241 (GLM).
- **2+ touchdowns:** −0.0045 against CURRENT (0.1020 against 0.1069).

**By group, P(1+ TD) log loss on book-like rows (GBM_POIS vs CURRENT, 90% CI):**

| group | vs CURRENT |
|---|---|
| RB | −0.0225 [−0.0262, −0.0190] |
| WR | −0.0154 [−0.0179, −0.0128] |
| TE | −0.0211 [−0.0252, −0.0166] |
| QB | −0.0010 [−0.0066, +0.0042], level (no candidate beats it) |

**Where the gain is** (pooled, GBM_POIS against CURRENT, P(1+ TD) log loss):

| rows | n | hit | CURRENT p | GBM_POIS p | vs CURRENT |
|---|---|---|---|---|---|
| starters (QB1, RB1-2, WR1-3, TE1) | 16,950 | 0.242 | 0.230 | 0.236 | −0.0097 [−0.0119, −0.0075] |
| backups | 16,250 | 0.083 | 0.161 | 0.093 | −0.0384 [−0.0411, −0.0355] |
| rookies | 4,860 | 0.141 | 0.172 | 0.138 | −0.0271 [−0.0320, −0.0220] |
| depth rank rose | 2,807 | 0.155 | 0.186 | 0.156 | −0.0162 [−0.0219, −0.0103] |
| promoted into a starter slot | 881 | 0.165 | 0.177 | 0.151 | +0.0051 [−0.0051, +0.0160] |
| promoted QBs | 103 | 0.204 | 0.141 | 0.101 | +0.0535 [+0.0156, +0.0919] |

Starters by group (vs CURRENT):

| group | vs CURRENT |
|---|---|
| RB | −0.019 |
| WR | −0.008 |
| TE | −0.004 (within noise) |
| QB | −0.001 (within noise) |

### What it says

1. **The current model over-predicts touchdowns and is too compressed. That is the same fault the diagnosis found
   against DraftKings in 2026.**
   - On 2021-2025 it said 19.6% where 16.4% scored. In 2026 it said 18.2% against 16.3%.
   - Its calibration slope is 1.42 (1.47 against DraftKings).
   - Most of the excess is on backups (16.1% said, 8.3% scored), rookies and low-usage tight ends. Its lowest decile
     says 9.6% where 5.9% scored.
   - Its top-bin PIT deficit (0.078 against 0.10) shows the same.
2. **Every candidate fixes that.**
   - Mean p is within 0.3 points of the hit rate, the slope is 1.01-1.07 and ECE is 0.005-0.009 (CURRENT 0.038).
   - The PIT is flat (0.098-0.104 a bin), and 50%/80% coverage is 0.50/0.80.
   - The resolution they claim (0.10-0.11) is what the outcomes deliver. They are sharper than CURRENT (0.067), not
     overconfident.
   - On the brief's 0.5-centred check: |p − 0.5| averages 0.336, and the deciles' hit rates average 0.336 from 0.5.
3. **The winner, GBM_POIS, is a hair ahead of GLM_LOGIT, which costs nothing to run.**
   - Overall: log loss −0.024 (5.8%), Brier −0.0055 (4.4%), CRPS 3.8% better than CURRENT.
   - Book-like rows: −0.017, 2.8% CRPS.
   - Starters: −0.010.
4. **Two weak spots, both where the old model's starter-level intercept happens to help.**
   - **Quarterback starters:** no candidate beats CURRENT. Its QB fit was built on starters in October 2026, and it is
     roughly level with a QB's own shrunk career rate.
   - **Players promoted into a starter slot:** the candidates are level with CURRENT but overconfident there (slope about
     0.6). For promoted quarterbacks (n = 103) the GBMs are clearly worse: about 10% said where 20% scored, because they
     read a backup's history. Fixing either would be a new step, tested walk-forward. It must not be tuned on these test
     seasons' breakdowns.
5. **These are outcomes, not DraftKings.**
   - DraftKings' anytime-touchdown price knows more than any stand-in here. The diagnosis measured the shipped model at
     log loss 0.3970 against DraftKings' estimated fair 0.3823 on 1,683 2026 prices.
   - A 0.024 gain over the current model is roughly the size of that gap, so beating the book is not shown. Only the
     frozen 2026 test can show it.

## Step 2b: the yards props' distributions (`model_yards.py`)

This is the modelling step for passing, rushing, receiving and rush + rec yards. It asks which way of forecasting
the whole outcome distribution does best when it is fitted walk-forward and tested on 2021-2025. Nothing here reads
2026, and nothing is wired into the site.

```
python3 -I props/research/propmodel/model_yards.py --data DIR                 # fit every candidate, then score
python3 -I props/research/propmodel/model_yards.py --data DIR --score-only    # score the cached predictions again
python3 -I props/research/propmodel/model_yards.py --data DIR --stats receiving_yards --only qgbm   # refit one model
```

- **Requirements:** `lightgbm`, `scikit-learn`, `scipy`, `pandas` and `pyarrow`.
- **Cache:** predictions go in `DIR/yards_cache/` (one parquet and one table file per stat and season), so a
  rescore takes about 35 seconds.
- **Fit time:** about two hours on 2 threads (`YARDS_THREADS`), on a machine shared with the other steps. The 21
  quantile models are most of it, and receiving yards takes about 9 minutes a season.
- **Results:** `results/yards_walkforward.json` holds:
  - `pooled`: every metric by subgroup;
  - `by_season`: the headline metrics;
  - `diffs`: paired differences against `cur`, from a bootstrap over games;
  - `headline` and `verdict`;
  - `meta.fit`: each model's tree counts, and the featVec rebuild check.

### Method

- **Walk-forward rule.** Each test season s (2021 to 2025) is predicted by models fitted on seasons before s only.
  - The new models train from 2013.
  - `cur` trains from 2019, the first season `props/raw/feat.pkl` holds.
  - Hyperparameters are fixed in the file.
  - The one data-driven choice is each GBM's number of trees. It is set by early stopping on season s−1, with the
    model fitted on the seasons before s−1, then refitted on all seasons before s.
- **Candidates:**
  - `cur`: the site's method, refitted walk-forward.
    - A ridge regression (λ 2) per position and stat on featVec's 15 inputs, fitted on rows with two or more
      earlier games.
    - The outcome shape is pOver's: quartile tiers, with ratio quantiles inside each, blended across tier edges.
    - Fitted on 2019-2024, the recipe reproduces `final_model.json`: the priors exactly, projections to within
      0.03-0.32 units, tier edges to 0.5%.
    - It is scored on every row, zero rows included. For a zero row, featVec is rebuilt as of before the game.
    - On the 4,476-14,795 rows a group has in feat.pkl, that rebuild equals feat.pkl's featVec exactly. That
      includes feat.pkl's quirk of reading 2019 Raiders home games as away games, which the shipped coefficients
      were fitted on.
  - `cur_ship`: the shipped coefficients and tables. It is in sample for 2021-2024 and shown as a check.
  - `qgbm`: LightGBM quantile regression on the new feature table.
    - 21 quantile levels, from 0.02 to 0.98, sorted so they cannot cross.
    - The CDF is linear between the levels.
  - `tpgbm`: a two-part model.
    - LightGBM gives P(result ≤ 0).
    - A positive result is log-normal. Its log-mean is a LightGBM model, and its variance is a gamma LightGBM on
      out-of-fold squared residuals.
  - `tplin`: the same two parts as `tpgbm`, on linear models with about 20 inputs, one model per position.
  - `qgbm_cal`: `qgbm` recalibrated (Kuleshov et al. 2018) on the PITs its early-stopping models gave on season s−1.
    - It was added after a first look showed `qgbm`'s intervals too narrow.
    - It is fitted on s−1 alone.
- **Rows scored.** Every role game of the test seasons where the player has 3 or more earlier role games: 3,229
  passing, 11,050 rushing, 28,178 receiving and 7,821 rush + rec.
- **Stand-in lines.** No book line exists before 2026, so two stand-ins are used:
  - `L_med` = floor(median of his last 5 role games) + 0.5;
  - `L_mean5` = floor(mean of his last 5) + 0.5.
- **Subgroups:**
  - **Book-like:** the trailing 5-game mean is at or over a book's usual floor. The floors are QB passing 120;
    rushing 12 for a QB and 20 for an RB; receiving 12 for an RB and 15 for a WR or TE; rush + rec 30 for an RB.
  - **Starter:** this week's chart rank is within the starter slots (QB 1, RB 1, WR 3, TE 1).
  - **Promoted:** a starter this week who was not a starter at his previous game.

### Results

CRPS against cur (lower CRPS is better; the figure is the % reduction, with its 95% interval from a bootstrap over games):

| Stat | rows | cur CRPS | qgbm | qgbm_cal | tpgbm | tplin | cur_ship |
|---|---|---|---|---|---|---|---|
| Passing yards (QB) | all (3,229) | 46.09 | +8.4% [+7.0, +9.9] | +8.7% [+7.2, +10.1] | +6.0% [+4.1, +7.7] | +0.7% [-0.9, +2.2] | +0.9% [+0.7, +1.2] |
|  | book-like starters (2,265) | 42.73 | +2.8% [+1.7, +4.0] | +2.6% [+1.6, +3.6] | -1.7% [-3.3, -0.1] | -5.4% [-6.9, -4.2] | +0.4% [+0.1, +0.6] |
|  | backups (878) | 53.52 | +19.3% [+15.6, +23.0] | +20.4% [+16.2, +24.4] | +21.7% [+16.6, +27.0] | +12.4% [+7.9, +16.9] | +2.4% [+1.6, +3.1] |
|  | rookies (260) | 47.64 | +9.0% [+5.5, +12.6] | +8.8% [+5.7, +12.0] | +6.1% [+1.9, +10.6] | -1.5% [-5.7, +2.8] | +1.0% [+0.1, +2.0] |
|  | promoted (119) | 52.09 | +9.3% [+1.3, +17.5] | +8.1% [+0.7, +15.6] | -1.8% [-10.4, +8.5] | +0.6% [-6.2, +7.1] | -1.2% [-3.3, +0.4] |
| Rushing yards (QB, RB) | all (11,050) | 11.48 | +4.5% [+3.9, +5.1] | +4.4% [+3.8, +5.1] | +3.6% [+2.8, +4.2] | -0.1% [-0.8, +0.6] | +0.5% [+0.4, +0.6] |
|  | book-like starters (3,641) | 16.73 | +1.3% [+0.6, +2.2] | +1.1% [+0.3, +1.7] | -0.3% [-1.2, +0.5] | -5.7% [-6.8, -4.7] | +0.3% [+0.1, +0.5] |
|  | backups (6,257) | 9.50 | +8.1% [+7.1, +9.1] | +8.1% [+7.0, +9.1] | +7.8% [+6.6, +8.9] | +5.3% [+4.2, +6.4] | +0.8% [+0.6, +1.0] |
|  | rookies (1,157) | 12.81 | +3.4% [+1.8, +5.3] | +3.3% [+1.5, +5.0] | +2.7% [+0.8, +4.7] | -0.7% [-2.4, +1.1] | +0.2% [-0.1, +0.6] |
|  | promoted (306) | 14.23 | +3.2% [-0.1, +6.6] | +2.8% [-0.4, +5.9] | +0.3% [-3.3, +4.4] | -2.7% [-7.3, +1.5] | +0.7% [-0.0, +1.6] |
| Receiving yards (RB, WR, TE) | all (28,178) | 11.39 | +10.3% [+9.8, +10.7] | +10.2% [+9.8, +10.7] | +9.9% [+9.4, +10.3] | +8.9% [+8.3, +9.4] | +1.1% [+1.0, +1.2] |
|  | book-like starters (10,280) | 16.62 | +1.8% [+1.4, +2.2] | +1.5% [+1.0, +2.0] | +0.8% [+0.4, +1.3] | +0.0% [-0.4, +0.5] | +0.3% [+0.2, +0.4] |
|  | backups (16,059) | 8.23 | +21.7% [+20.9, +22.6] | +22.0% [+20.9, +22.9] | +22.0% [+21.0, +22.9] | +20.8% [+19.7, +21.8] | +2.2% [+2.0, +2.3] |
|  | rookies (3,226) | 11.01 | +11.6% [+10.2, +13.2] | +11.3% [+9.8, +12.9] | +11.2% [+9.7, +12.7] | +9.9% [+8.4, +11.4] | +1.3% [+1.1, +1.5] |
|  | promoted (910) | 12.90 | +4.2% [+2.1, +6.1] | +4.0% [+1.8, +6.3] | +3.9% [+1.8, +6.2] | +2.2% [-0.0, +4.4] | +0.7% [+0.2, +1.2] |
| Rush + rec yards (RB) | all (7,821) | 16.31 | +6.8% [+6.0, +7.6] | +6.6% [+5.9, +7.4] | +5.6% [+4.7, +6.4] | +0.5% [-0.4, +1.4] | +0.5% [+0.3, +0.6] |
|  | book-like starters (2,380) | 22.50 | +1.4% [+0.4, +2.4] | +0.8% [-0.2, +1.8] | -1.2% [-2.2, -0.2] | -9.4% [-10.9, -7.8] | +0.1% [-0.1, +0.3] |
|  | backups (5,379) | 13.61 | +10.7% [+9.7, +11.8] | +10.9% [+9.9, +12.0] | +10.5% [+9.3, +11.8] | +7.6% [+6.5, +8.8] | +0.7% [+0.5, +1.0] |
|  | rookies (897) | 17.06 | +6.2% [+4.1, +8.2] | +6.2% [+4.2, +8.3] | +4.9% [+2.7, +7.1] | +1.3% [-1.0, +3.7] | +0.2% [-0.2, +0.6] |
|  | promoted (187) | 20.83 | +4.2% [-0.4, +9.3] | +3.2% [-1.1, +7.5] | +0.4% [-4.0, +4.6] | -8.0% [-13.6, -2.3] | -0.1% [-1.0, +0.9] |

Calibration on book-like starters (PIT mean 0.5, 50% and 80% intervals holding 50% and 80%; at L_mean5 the mean P(over) against the hit rate, and the refit slope of the outcome on logit P(over), 1 when the spread of the chances is right):

| Stat | model | PIT mean | 50% | 80% | P(over) / hit at L_mean5 | slope | log loss at L_mean5 |
|---|---|---|---|---|---|---|---|
| Passing yards (QB) | cur | 0.509 | 0.550 | 0.861 | 0.482 / 0.497 | 1.11 | 0.6446 |
|  | qgbm | 0.484 | 0.461 | 0.787 | 0.513 / 0.497 | 0.96 | 0.6302 |
|  | qgbm_cal | 0.514 | 0.516 | 0.827 | 0.474 / 0.497 | 1.06 | 0.6314 |
|  | tpgbm | 0.517 | 0.542 | 0.849 | 0.450 / 0.497 | 0.90 | 0.6437 |
| Rushing yards (QB, RB) | cur | 0.516 | 0.513 | 0.810 | 0.406 / 0.425 | 0.88 | 0.6579 |
|  | qgbm | 0.506 | 0.483 | 0.783 | 0.415 / 0.425 | 0.87 | 0.6470 |
|  | qgbm_cal | 0.520 | 0.503 | 0.792 | 0.396 / 0.425 | 0.90 | 0.6488 |
|  | tpgbm | 0.524 | 0.520 | 0.835 | 0.373 / 0.425 | 1.06 | 0.6517 |
| Receiving yards (RB, WR, TE) | cur | 0.501 | 0.502 | 0.805 | 0.406 / 0.408 | 0.86 | 0.6552 |
|  | qgbm | 0.497 | 0.496 | 0.788 | 0.411 / 0.408 | 1.02 | 0.6421 |
|  | qgbm_cal | 0.521 | 0.506 | 0.796 | 0.378 / 0.408 | 1.08 | 0.6444 |
|  | tpgbm | 0.513 | 0.489 | 0.821 | 0.372 / 0.408 | 1.08 | 0.6459 |
| Rush + rec yards (RB) | cur | 0.527 | 0.525 | 0.833 | 0.414 / 0.458 | 1.15 | 0.6604 |
|  | qgbm | 0.510 | 0.486 | 0.784 | 0.434 / 0.458 | 0.90 | 0.6498 |
|  | qgbm_cal | 0.531 | 0.513 | 0.806 | 0.407 / 0.458 | 0.93 | 0.6556 |
|  | tpgbm | 0.530 | 0.552 | 0.858 | 0.394 / 0.458 | 1.13 | 0.6606 |

The whole population (every eval row): the same, with the backups that dominate it:

| Stat | model | PIT mean | 50% | 80% | P(over) / hit at L_mean5 | slope | log loss at L_mean5 (coin 0.6931) |
|---|---|---|---|---|---|---|---|
| Passing yards (QB) | cur | 0.478 | 0.494 | 0.812 | 0.501 / 0.472 | 0.59 | 0.6780 |
|  | qgbm | 0.468 | 0.453 | 0.762 | 0.508 / 0.472 | 0.88 | 0.6220 |
|  | tpgbm | 0.508 | 0.531 | 0.838 | 0.436 / 0.472 | 0.89 | 0.6138 |
| Rushing yards (QB, RB) | cur | 0.465 | 0.482 | 0.789 | 0.439 / 0.386 | 0.44 | 0.6732 |
|  | qgbm | 0.488 | 0.485 | 0.787 | 0.402 / 0.386 | 0.98 | 0.6115 |
|  | tpgbm | 0.511 | 0.492 | 0.815 | 0.359 / 0.386 | 0.99 | 0.6085 |
| Receiving yards (RB, WR, TE) | cur | 0.413 | 0.418 | 0.751 | 0.501 / 0.361 | 0.15 | 0.7426 |
|  | qgbm | 0.476 | 0.483 | 0.786 | 0.390 / 0.361 | 1.04 | 0.6133 |
|  | tpgbm | 0.501 | 0.493 | 0.812 | 0.352 / 0.361 | 1.04 | 0.6080 |
| Rush + rec yards (RB) | cur | 0.436 | 0.439 | 0.712 | 0.498 / 0.404 | 0.12 | 0.7503 |
|  | qgbm | 0.481 | 0.478 | 0.778 | 0.426 / 0.404 | 0.89 | 0.6308 |
|  | tpgbm | 0.509 | 0.506 | 0.825 | 0.379 / 0.404 | 0.98 | 0.6296 |

qgbm against cur, season by season (CRPS reduction, all rows | book-like starters):

| Stat | 2021 | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|---|
| Passing yards (QB) | +8.8% \| +2.9% | +5.2% \| +1.5% | +8.1% \| +3.6% | +10.3% \| +2.2% | +9.5% \| +3.8% |
| Rushing yards (QB, RB) | +5.6% \| +2.3% | +4.3% \| +0.7% | +5.9% \| +2.3% | +2.8% \| -0.0% | +4.0% \| +1.7% |
| Receiving yards (RB, WR, TE) | +10.7% \| +2.1% | +9.9% \| +1.3% | +10.4% \| +1.2% | +10.5% \| +2.6% | +9.6% \| +1.8% |
| Rush + rec yards (RB) | +7.2% \| +0.7% | +6.3% \| +0.1% | +9.1% \| +3.9% | +4.3% \| -0.3% | +7.1% \| +2.6% |

### What it shows

1. **`qgbm` wins.** It has the lowest pooled CRPS of the four candidates on every stat, both on all rows and on
   book-like starters.
   - It beats `cur` on every stat in every season on all rows.
   - On book-like starters it beats `cur` in 18 of the 20 stat-seasons. The other two are −0.0% and −0.3%, both
     in 2024.
   - `tpgbm` beat it once, on 2023 passing yards.
   - `tplin` loses to `cur` on starters by 5-9%, so the gain needs the GBM.
2. **The gain is where the site's model failed.**
   - On book-like starters it is small: +1.3% to +2.8%.
   - On backups it is +8% to +22%, on rookies +3% to +12%, and on promoted players +3% to +9% (the interval is
     clear of zero for receiving and passing, but not for rushing or rush + rec).
   - On backups `cur` is badly overconfident. At `L_mean5`, its refit slope on receiving is 0.14 and on rush + rec
     0.07. Its receiving P(over) averages 0.55 where 0.31 landed.
   - That is the zero-heavy, promoted-backup population behind the diagnosis's 15+ point disagreements with
     DraftKings.
   - The quantile GBM's median leans mostly on recent production and usage: targets and target share, carries and
     snap share, and for quarterbacks the chart's QB1 flag. Teammates-out and injury inputs carry little gain.
3. **Sharp, and nearly calibrated.**
   - **Centred:** on book-like starters, `qgbm`'s PIT averages 0.48-0.51.
   - **The right spread of chances:** its P(over) at the stand-in lines has refit slope 0.87-1.02, and its mean
     P(over) is within 0.3-1.6 points of the hit rate (2.4 under on rush + rec).
   - **Sharper than `cur`:** its log loss at `L_mean5` is lower by 0.010-0.015.
   - **A little narrow:** 80% intervals hold 78-79%, and passing yards' 50% interval holds 46%.
   - **The recalibration doesn't solve that.** `qgbm_cal` fixes the coverage on the population as a whole, but
     because it is fitted on every row it moves the starters 2-5 points toward the under, which is the diagnosed
     lean. A coverage fix should be fitted by role, or on book-like rows, before freezing.
   - **`tpgbm` is not the fix either.** Its log-normal tail gives starters a hump-shaped PIT and leaves P(over)
     about 4-6 points low.
4. **Beating naive lines is not beating DraftKings.**
   - `cur` also does respectably against the stand-in lines on starters (slopes 0.86-1.15).
   - Yet on 2026's DraftKings lines it carried nothing beyond the book.
   - These results show a better forecaster, and one that should disagree with DraftKings far less on backups. Only
     the preregistered 2026 test against DraftKings' lines can show whether it carries information beyond them.
5. **2025 looks like the other seasons.** 2025 is the season with daily depth-chart snapshots, as 2026 will have.
   Its gains are in line with the other seasons: +9.5%, +4.0%, +9.6% and +7.1% on all rows.

## Step 3: the frozen models (`freeze.py`, `predict.py`, `PREREGISTRATION.md`)

This step chooses one model per stat, refits it on every season 2013-2025, freezes the files by SHA-256, writes the
one program that predicts a week, and fixes the one-shot 2026 test in advance. **Nothing of 2026 was downloaded or
read.** The test's inputs are named by git blob and SHA-256, hashed without being opened.

```
python3 -I props/research/propmodel/freeze.py --data DIR            # the refit (about 22 minutes on 2 threads)
python3 -I props/research/propmodel/check_frozen.py --data DIR      # hashes, copies, a refit reproducing two files
python3 -I props/research/propmodel/pack_frozen.py --data DIR       # the gzipped copies in the repo (--check verifies them)
python3 -I props/research/propmodel/check_predict.py --data DIR     # predict mode against the table (about 10 minutes)
python3 -I props/research/propmodel/predict.py --data DIR --season 2025 --week 6 [--lines LINES.csv]
python3 -I props/research/propmodel/w_choice.py --data DIR          # the blend weight's 2021-2025 evidence
python3 -I props/research/propmodel/power_sim.py                    # what the test can detect (made-up lines)
python3 -I props/research/propmodel/oneshot_2026.py --data DIR --dry-run   # the test's mechanics on 2025 stand-ins
```

### The choice

**The rule.** Keep each step's walk-forward winner unless another candidate beats it on the rows the 2026 test
will score (lineable or book-like) on two measures at once:

- CRPS **and** the stand-in line's log loss;
- with 90% game-bootstrap intervals wholly below zero;
- in at least 4 of the 5 seasons.

No candidate met that bar, so every winner stands.

**Yards: qgbm** on all four stats.

- It had the lowest pooled CRPS on every stat, on all rows and on book-like starters.
- It beat the current model in 18 of 20 stat-seasons on starters.
- Its recalibrated variant (qgbm_cal) is not taken. Fitted on every row of the season before, it moved book-like
  starters toward the under:
  - its mean P(over) at the trailing-mean line was 0.378 where 0.408 hit on receiving yards, and 0.396 where 0.425
    hit on rushing yards;
  - qgbm itself was 0.411 and 0.415.
- qgbm's 80% intervals run a little narrow (78-79%). That is known and left as fitted.

**Counts: GBM_NB** on all nine targets. The challengers, on lineable rows (2021-2025, differences against
GBM_NB, 90% interval, seasons the challenger was better):

| Target | Challenger | CRPS | Stand-in line log loss | Rule met? |
|---|---|---|---|---|
| QB attempts | GBM_MC | -0.073 [-0.116, -0.034], 4/5 | -0.004 [-0.011, +0.002] | no: the line's log loss is level, and on all rows MC is +0.246 [+0.179, +0.320], worse in 5/5 |
| QB completions | GBM_MC | -0.025 [-0.054, +0.003], 3/5 | +0.004 [-0.003, +0.011] | no |
| QB passing TDs | GBM_MC | -0.0027 [-0.0058, +0.0003], 3/5 | -0.0023 [-0.0061, +0.0018] | no |
| QB carries | GLM_NB | +0.0005 [-0.013, +0.015], 2/5 | -0.0036 [-0.0096, +0.0032] | no |
| every other target | either | worse | worse | no |

**Anytime touchdown: GBM_POIS.** The three candidates are level on book-like rows (log loss against GBM_POIS):

- GLM_LOGIT: -0.0003 [-0.0014, +0.0008]. It was better in 2023-2025 and worse in 2021-2022.
- GBM_BIN: +0.0003 [-0.0002, +0.0009].

None meets the rule, so the pooled winner stands.

### The frozen fit (`freeze.py`)

**The protocol.** Each model is fitted by its own walk-forward protocol with the test season set to 2026:

- the inner split fits on 2013-2024 and validates on 2025, which chooses the trees by early stopping (and the
  counts' dispersion, on 2025's out-of-sample means);
- the refit on 2013-2025 then uses 1.1 times those trees.

Every hyperparameter is imported from the step's own script. The refit adds only `deterministic=True`,
`force_row_wise=True` and two threads, so that it reproduces.

**The files.**

- **Model files:** 97 LightGBM text models, about 73 MB in all (yards 61 MB, counts 9 MB, touchdowns 3 MB). They
  are written to `DIR/frozen/`, and a gzipped copy of each is committed at `frozen/models/<file>.gz` (26 MB,
  `pack_frozen.py`), so they outlive any one machine. `players.csv` and `games_to2025.csv` as fitted on, which
  nflverse rewrites, are committed the same way at `frozen/inputs/` (3 MB). A refit is no substitute: it
  reproduces the files only from the same raw files, and a fresh `players.csv` is never the same file.
- **The manifest:** the repo keeps `frozen/MANIFEST.json`, which records:
  - each file's size and SHA-256;
  - the trees;
  - the dispersions and supports;
  - the feature lists (yards 143-220 curated; counts and touchdowns every numeric feature, 506);
  - the training rows;
  - the SHA-256 of `features.parquet` and of all 89 raw files;
  - the library versions.
- **Hash checks:** `predict.py` reads each model file from `DIR/frozen/`, else from its repo copy, and refuses any
  file or copy whose (decompressed) hash is not the manifest's. Both give the same predictions to the bit.
- **Libraries:** `requirements.txt` pins LightGBM 4.7.0, numpy 2.5.3, pandas 3.0.5, scipy 1.18.1, pyarrow 26.0.0
  (and scikit-learn 1.9.1 for the fits), on Python 3.13; the one-shot test refuses other versions of the first
  five.

| Model | Groups | Training rows | Trees | Files |
|---|---|---|---|---|
| qgbm passing yards | QB | 8,304 | 4,313 over 21 levels | 21, 10.5 MB |
| qgbm rushing yards | QB, RB | 30,120 | 3,672 over 21 levels | 21, 11.1 MB |
| qgbm receiving yards | RB, WR, TE | 73,777 | 9,768 over 21 levels | 21, 28.2 MB |
| qgbm rush + rec yards | RB | 21,816 | 3,537 over 21 levels | 21, 10.7 MB |
| GBM_NB attempts | QB | 8,304 | 799 | 1.4 MB |
| GBM_NB completions | QB | 8,304 | 475 | 0.9 MB |
| GBM_NB passing interceptions | QB | 8,304 | 453 | 0.8 MB |
| GBM_NB passing TDs | QB | 8,304 | 185 | 0.4 MB |
| GBM_NB carries | QB | 8,304 | 228 | 0.4 MB |
| GBM_NB carries | RB | 21,816 | 1308 | 2.4 MB |
| GBM_NB receptions | RB | 21,816 | 518 | 1.0 MB |
| GBM_NB receptions | WR | 32,324 | 705 | 1.3 MB |
| GBM_NB receptions | TE | 19,637 | 207 | 0.4 MB |
| GBM_POIS anytime TD | QB | 8,304 | 430 | 0.8 MB |
| GBM_POIS anytime TD | RB | 21,816 | 422 | 0.8 MB |
| GBM_POIS anytime TD | WR | 32,324 | 591 | 1.1 MB |
| GBM_POIS anytime TD | TE | 19,637 | 256 | 0.5 MB |

### `predict.py` and predict mode

`predict.py --season S --week W` is the only code that makes the 2026 test's predictions and the shadow's.

**Predict mode builds week W's rows.** It runs `build_features.py`'s own build (`--predict S W`) before any of
the week's games:

- **Games' own files:** stats, snap counts and play-by-play are read up to week W-1.
- **Pre-game files:** the schedule and lines, the depth chart snapshot, the injury report and the weekly roster
  are read up to week W.
- **One exception, weather:** where the play-by-play file already holds a week-W game, its gamebook weather line
  is read. That is the kickoff report the table itself uses.
- **Candidates:** a row is made for every player who might play: the week's depth chart, the weekly roster's
  active and game-day-inactive players at QB, RB, FB, WR, TE and K, and anyone who played for the club in its last
  three games. From 2016, a player is placed at the club the week's roster lists him with, so a player traded
  mid-week does not count for the club whose depth chart he is still on.

**The predictions.** It then predicts every covered stat for each candidate:

- the mean, sd and quantiles;
- the anytime touchdown's chance;
- the distribution's parameters, from which `p_over(model, params, line)` gives P(over) and P(push) for any line.

**The guard.** 2026 stays refused. `fetch.py` lifts the holdout only inside `oneshot_2026.py`, and only when
`PROPMODEL_LIFT_HOLDOUT` is the SHA-256 of a committed, unmodified PREREGISTRATION.md whose commit is on
origin/main; `predict.py`, `build_features.py` or `fetch.py` run with the variable set are refused. Since the one-shot
ran, `td_shadow.py` also lifts it, in memory, inside its own process ("The touchdown shadow").

**The checks.**

`check_predict.py` (`results/predict_check.json`) holds predict mode to the training table:

- **The full build is unchanged.** Run with the predict-mode code, it gives the table the models were fitted on
  exactly: 94,562 rows, every column, no tolerance.
- **Every player who played has a candidate row.** It covers seven weeks: 2025 weeks 1, 6, 12 and 18, 2024
  week 9, 2019 week 1 and 2016 week 8. Each of the 2,691 players who played in them has a candidate row at his
  own club and position.
- **The features match.** All 510 features equal the table's to 1e-9. One value in 2025 week 18 differs by 9e-7,
  a matter of floating-point order.
- **Candidates who did not play** number 114 to 250 a week; their props would have been void.
- **The predictions agree** but for 23 of 11,517 (0.2%), which a tree split sent the other way on a feature's
  last bit. They moved P(over) by at most 0.013.
- **Two fixes made on the way:**
  - The target week's gamebook weather line is now read where it is posted; leaving it out cost `g_wet` and
    games.csv's missing temperatures.
  - The week's roster now decides a traded player's club. Diontae Johnson, 2024 week 9, was still on Carolina's
    depth chart.

`check_frozen.py` (`results/frozen_check.json`):

- **Hashes:** all 97 model files match the manifest.
- **The distribution code:** `predict.py`'s copies of it equal the walk-forward's exactly.
- **Reproducibility:** refitting TE receptions and the TE touchdown model reproduces their files byte for byte.
- **2025, in sample:** the predictions sit close to the outcomes, but passing runs high. Passing yards were 185
  predicted against 178 actual, and WR receptions 2.40 against 2.27. That is the 2025 fall in passing that step 2a
  noted, a risk for 2026 that the preregistration records.

### The preregistration

`PREREGISTRATION.md` is the test, fixed before any 2026 file is read.

**The data:**

- the paid pull's priced main lines (weeks 1-6) and anytime-touchdown prices, from `props/data/payload.json` at
  commit 575c980f;
- DraftKings' closing lines on ESPN (weeks 1-7), from `props/data/espn_lines_2026.json` at the same commit.

**The bar:**

- **Main lines** pass only if all six hold:
  - a blend b = q + 0.25 (p - q) beats the market's no-vig chance on Brier (A1) and on log loss (A2);
  - the model's departure from the market carries information, net of a lean on any stat (A3, one intercept a
    stat);
  - its picks lose no more than the vig (A4);
  - on the price-free lines, the same blend toward the line's even chance beats a coin (B1) and each stat's
    hindsight over rate (B2).
- **The touchdown** passes only if its departure from DraftKings' price carries information, net of a lean on any
  position group (C1, one intercept a group).

**The timing.** The priced lines were pulled before kickoff (a Sunday game's on Saturday morning), and the model's
inputs are fixed at or near kickoff, so A1-A4 and C1 lean toward a PASS. The preregistration says so and accepts
it: B1 and B2 stand on the closing line, the result describes the priced criteria apart for Sunday games and for
the rest, and a touchdown PASS only starts a shadow.

**When it runs.** No earlier than 31 October 2026 00:15 UTC, 96 hours after week 7's last kickoff. After the
download it refuses, removing what it fetched, unless every played game of weeks 1-7 has stats and snap counts for
both clubs, its play-by-play and both weekly rosters: a game with snap counts missing would void exactly the lines
of players who played and recorded nothing, which all went under.

**The intervals:** 90% game-bootstrap intervals with 10,000 resamples, seed 0.

**Why w = 0.25** (`w_choice.py`). Two box-score forecasts' errors correlate at 0.88-0.94 on 2021-2025 (the model
against the trailing five-game mean). At that correlation, 0.25 is the right weight if DraftKings is about 4%
more accurate than the model, half the model's own lead over the trailing mean. The blend loses only if
DraftKings is more than about 7% better.

**Power** (`power_sim.py`, on 2,400 priced lines over 70 games and 4,800 price-free lines over 107, counted from
the registered files' structure). The test passes only when the model's departure from the market carries roughly
a third to a half of the weight or more. A smaller real signal will most likely fail. One season can do no
better.

**On a PASS**, a quiet shadow runs, with its own bar over 4,000 lines (2,000 touchdowns) and its verdict decided
once. It is never shown and never in a suggestion, and the site changes only by a change of its own.

**On a FAIL**, the site stays on DraftKings' chance, and 2026 is spent.

**The result** (run once, 31 October 2026 01:02 UTC, from main at b0fa6e5a; `results/oneshot_2026.json` and
`results/oneshot_2026_lines.csv`, committed as written):

| Family | Criterion | Estimate | 90% interval | Holds |
|---|---|---|---|---|
| Main lines | A1 Brier, blend minus market (2,544 priced lines, 85 games) | +0.0001 | [-0.0008, +0.0010] | no |
| | A2 log loss, blend minus market | +0.0002 | [-0.0016, +0.0020] | no |
| | A3 beta, the model's information net of the market | +0.02 | [-0.15, +0.19] | no |
| | A4 picks against the vig (634 picks, +1.3 units where the no-vig chance expects -35.1) | +0.058 a pick | [-0.005, +0.119] | yes |
| | B1 log loss, blend minus a coin (4,972 closing lines, 107 games) | -0.0020 | [-0.0037, -0.0004] | yes |
| | B2 log loss, blend minus each stat's own over rate | +0.0003 | [-0.0007, +0.0034] | no |
| Anytime TD | C1 beta, net of the price (1,769 Yes legs, 70 games) | +0.38 | [+0.03, +0.75] | yes |

**Main lines FAIL**: the family is not used anywhere, and 2026 is spent for it (section 9). **Anytime touchdown
PASS**: it starts the quiet touchdown shadow of section 8 (T1 and T2, decided once on the first 2,000 graded), which no
page reads and no suggestion uses.

**The program** that runs the test is `oneshot_2026.py`. It refuses to run unless every registered file has its
hash (the programs it runs hashed where Python loaded them, in this folder of `--repo`), the libraries are the
pinned ones, it is late enough, and the test has never run: no result on disk or committed on any branch, and no
run marker or 2026 file on disk unless a committed crash note names that run. The result records the
preregistration's hash and commits, HEAD, the library versions and the hash of every file read, and
`results/oneshot_2026_lines.csv` holds every line with its reason.

**The dry run** (`results/oneshot_dryrun_2025.json`, about 8 minutes) runs every step of `oneshot_2026.py` but the
guards and the download on 2025 stand-in inputs of the test's own shapes:

- **The inputs:** a payload-like `mkt` and `prices` (string thresholds and odds, rows with no `pid` key) and an
  archive-like `games` (conflicts kept apart from `lines`, as the archive keeps them). The lines sit at each
  player's last-three-game mean, every fifth on a whole number so that pushes occur; the prices are made up.
- **The coverage check** passed on 2025's files: all 108 games of weeks 1-7 with stats, snap counts, play-by-play
  and rosters for both clubs.
- **The scored lines:** 3,556 priced main lines (47 pushes counted apart), 2,412 touchdown prices and 6,003
  price-free lines (81 pushes).
- **Every exclusion rule caught its planted lines:**
  - priced main lines: a stat not covered for his group, a player who did not play, no candidate row, a line with
    one price, a market not modelled, a line on another game than his;
  - touchdowns: four rows with no player id (three in one week, each counted), an unreadable price, a repeated
    row (kept once), a player with two prices (both left out);
  - price-free lines: a player kept by ESPN id alone, a conflict, a withdrawn line, a line with no close, a market
    not modelled, a stat not covered, no candidate row, players who did not play.
- **Its verdict means nothing:** the models were fitted on 2025, and the market is made up. It shows that the
  test runs end to end.

## The touchdown shadow

The one-shot failed the main lines and passed the anytime touchdown, so PREREGISTRATION.md section 8 starts one
shadow, the touchdown shadow, and no main-line shadow. It runs in the props job after each publish, from the merge of
the PR that added it to the end of 2026's regular season:

- **Calls:** before each game, every player on its anytime-touchdown list in the props job's published ESPN read gets
  a call. A call holds the model's chance p that he scores a rushing or receiving touchdown, beside the chance the site
  states for the same leg (m).
- **Freeze and grade:** each call is frozen at kickoff and graded after the game.
- **Decision:** made once, on the first 2,000 graded calls, by the bar below.

**It is research only.** No page reads its ledger, no suggestion uses it, and nothing on the site moves because of it.
A PASS only makes the model a candidate for a change of its own; a FAIL ends it. Either way the site stays on
DraftKings' chance for every player leg (app v138) until such a change is made.

The files:

| File | What |
|---|---|
| `td_shadow.py` | the program: `init`, `plan`, `run`, `notify` and `rehearse`; BAR; the canonical ledger writer; `summarize` and `decide` |
| `td_shadow_page.js` | m, read off the published page in jsdom, and the site's own settlement of due calls (`page.json`) |
| `td_shadow_check.py` | the check that holds a new ledger to the last commit's before props.yml moves it into place |
| `test_td_shadow.py` | the test, a unit of the props gate's job C |
| `td_shadow_equiv.py` | the equivalence proof, run once by hand; its result is `results/td_shadow_equiv.json` |
| `shadow/td_ledger.json` | the ledger: the bar, every call, its freeze and grade, the runs, the summary and, once, the decision |

### The bar, as registered

`BAR` in `td_shadow.py`, copied verbatim into the ledger by `td_shadow.py init` before the first call (the ledger's
`bar_registered`). The check fails any ledger whose bar is not this one, and the bar never changes:

```python
BAR = {
    'family': 'anytime touchdown: PREREGISTRATION.md section 8, "The touchdown shadow"',
    'registered_with': {
        'preregistration_sha256': 'bd277e0ac76f69389f894fe0e1e21384ae84ee7d7d8b0957bdcf19401decec71',
        'preregistration_commit': '9b29927a8230cddaea94f162ceda055de3fdcf80',   # text only: the job's checkout is depth 1
        'oneshot_sha256': 'e5b251a8d090668f8a2602a84f60608959e026907d6715c555f988687908e40a',
        'oneshot_verdict': 'anytime_td PASS (C1 beta +0.378, 90% [+0.035, +0.750]); main_lines FAIL, so no main-line shadow',
        'manifest_sha256': 'dbd6646fbba1470828ed73b08efea5520226f1a90cca9409f5aa21d1c9de96a2',
        'runs': {  # the section 3 files the shadow executes or reads, as PREREGISTRATION.md lists them
            'props/research/propmodel/fetch.py': '1135ced7eb969901dc664acdfc25def27fc790dd658ae1d8dcfc0657ab43eaae',
            'props/research/propmodel/build_features.py': '67fdeb569ea13813675c55b879d4c1cb902b818fa5812a851fbc33371d2e5f02',
            'props/research/propmodel/predict.py': '8c530d667ddb83eb9de949ae8e41cbad6915cd0033c3a70a52b1755bc6fe7427',
            'props/research/propmodel/oneshot_2026.py': '31c27b07734d65985736395c6de2b4e4fba8e64c32fedcb3c391440ce94cf1dc',
            'props/research/propmodel/frozen/MANIFEST.json': 'dbd6646fbba1470828ed73b08efea5520226f1a90cca9409f5aa21d1c9de96a2',
            'props/research/propmodel/requirements.txt': '1c19bc395756e378c65e6facb946e72fae6cce99aeef0d8e479ef2c1e17ae03a'}},
    'population': ("every player on his game's anytime-touchdown list in the props job's published ESPN read "
                   "(payload espn.games[gid].pl.td: the athletes the page's reader placed on a player; one it could not "
                   "place is counted, never called), for each 2026 regular-season game still to come"),
    'p': ("predict.py's P(1 or more rushing + receiving TDs) = 1 - exp(-lambda) from the frozen files of section 3, "
          "made in predict mode for the call's week exactly as oneshot_2026.py made it (week_rows, then "
          "Predictor.predict_rows), on this run's 2026 nflverse files, clipped to [0.001, 0.999]; none where predict.py "
          "makes no candidate row for him in that game, his group is not covered, or either club's previous 2026 game "
          "lacks stats, snap counts, play-by-play or weekly roster (oneshot_2026.coverage)"),
    'm': ("the chance the published page states on his 'Scores one' row (data-legchance: legChance of the leg renderGame "
          "builds, DraftKings' fair chance, real or estimated), the page booted on this run's published payload at the "
          "run's clock with nothing kept in the browser; none where the page draws a dash or does not draw him. m is "
          "whatever the site states at the time: a change to the page's touchdown estimate moves it, recorded by build"),
    'call': ("p and m from the same run; a call is made or rewritten only while its game kicks off more than 10 minutes "
             "after the run; rewritten whenever its numbers change; dropped before kickoff when a newer read no longer "
             "lists him, his game's read is withdrawn (none), or his game leaves the schedule or its week; frozen by the "
             "first run at or after the earlier of its own kickoff and the schedule's, or a score: the frozen call is the "
             "last run's before kickoff that made one"),
    'outcome': ("PREREGISTRATION.md section 4(d), oneshot_2026.outcomes(): he played if the 2026 build has a row for him "
                "in that game (a snap in his role or on special teams); y = rushing + receiving touchdowns >= 1, a "
                "quarterback's own included, a pass thrown never; a return or fumble-recovery touchdown is recorded and not "
                "counted (the model's target and the site's settlement); no row: void"),
    'void_also': ("the game kicks off more than 24 hours from the call's kickoff, or leaves the schedule; its own files "
                  "(both clubs' stats, snap counts and weekly roster, its play-by-play) still not complete at kickoff + "
                  "14 days"),
    'settle': "graded once, by the first run at or after kickoff + 96 hours whose files cover the game; never changed after",
    'w': 0.25, 'clip': [0.001, 0.999], 'graded': 2000,
    'sample': ("the first 2,000 frozen calls graded td or no_td that have p and m"
               " and m not priced on the model alone: branch real, lined or backup"
               ", in grading order: graded_at, kickoff, game id, player id"),
    'bootstrap': ("10,000 resamples of whole games (nflverse game id), numpy default_rng(0), oneshot_2026.boot_weights; "
                  "90%: the 5th to 95th percentile; T1 and T2 each on its own stream"),
    'pass_if': ['T1: oneshot_2026.mean_diff(ll(b, y) - ll(m, y), games), b = m + 0.25 (p - m): interval wholly below 0',
                'T2: oneshot_2026.signal_test(y, m, p, games, one stratum): logit P(TD) = alpha + gamma logit m + '
                'beta (logit p - logit m), beta\'s interval wholly above 0'],
    'otherwise': 'FAIL: no new calls, unfrozen calls dropped (frozen calls are still graded); the model is not used',
    'if_pass': ("a candidate for a change of its own (a PR with the props audit's and the smokes' checks, the blend at "
                "0.25 on the anytime touchdown); nothing on the site moves by itself; calls go on to the regular season's "
                "end as description, the verdict fixed"),
    'before': "no verdict before 2,000: running counts and point estimates only, never an interval, a verdict or a word of passing",
    'season_end': ("2026's regular season only; with fewer than 2,000 in the sample once its last frozen call is graded, no "
                   "verdict: undecided, which is not a PASS, and the model is not used"),
    'changes': ("after the first call the shadow's code changes only to fix a mechanical failure, never a rule, a sample, "
                "a metric or a threshold, each fix logged with its reason in README.md; this bar never changes"),
}
```

Each clause section 8 does not spell out is an operationalisation of it, never a change to it. The owner answered the
three questions they raised on 31 October 2026, before the bar was registered:

- **Q1, the holdout lifted in memory: allowed.** It is stated openly here (under "p" below), in `td_shadow.py`'s
  docstring and in the PR that added the shadow, with the probe disclosed.
- **Q2, touchdowns priced on the model alone: left out of the decision sample** (`sample`: branch real, lined or
  backup). They are still called, graded and reported, in `by_branch.model`. Section 8's letter includes them ("every
  player DraftKings lists", "the first 2,000 graded"), so this is the stricter reading. The reasons:
  - their m is a fixed transform of the site's own projection, never tested against DraftKings' prices, and it runs
    high where it matters: about +3.1 points over DraftKings' fair chance where it states 45% or more (CLAUDE.md, "A
    touchdown on the model alone is no tested kind");
  - the site offers those legs in no suggestion;
  - T2 on them would test the model against the site's old model, not against the market;
  - section 4: "Where the diagnosis bears on the bar, the bar takes the stricter side."

  Against it, and said all the same: m leans on the site's projection on every branch (under "m"), so leaving the
  model branch out does not make m DraftKings' information alone. Two days out, about half of a read's listed players
  are on the model branch (163 of 343 on the read of 30 October). Eight hours out, when the clubs' lines are
  complete, about 6% are (20 of 343, the same read moved). The frozen call is the last run's before kickoff.
- **Q3, the operationalisations: yes, as BAR writes them:**
  - graded once, at kickoff + 96 hours (the one-shot's wait);
  - p per game only where both clubs' previous games are complete (section 4(d)'s coverage, applied per game), else
    none;
  - void where a game's own files are still not complete at kickoff + 14 days;
  - the registered "played" rule decides (section 4(d), the rule that earned the PASS), with the site's `settleLeg`
    recorded beside it as description (the site's rule has no terminal void);
  - no call made or rewritten within 10 minutes of kickoff;
  - a game moved more than 24 hours is void;
  - the outcome is rushing + receiving touchdowns: a return or fumble-recovery touchdown is recorded and not counted.
    That is the model's target and the site's settlement, though DraftKings may pay one;
  - after a PASS, calls go on to the season's end as description, the verdict fixed.

### p: the frozen model, and the holdout lifted in memory

p is made by the one-shot's own code, imported unchanged: `oneshot_2026.py`, which brings `fetch.py`,
`build_features.py` and `predict.py`. Each is hashed where Python loaded it and held to PREREGISTRATION.md section 3,
and to BAR's copy of those hashes, before anything runs. For the call's week W:

- `predict.week_rows(DATA, 2026, W, fetch=False)`: build_features.py's predict mode, the week's own files read to W-1
  and the pre-game files to W;
- `predict.Predictor(...).predict_rows(rows)`: the repo's gzipped model files, each held to `frozen/MANIFEST.json`;
- p = clip(p_ge1, 0.001, 0.999) on his candidate row in that game, exactly as `oneshot_2026.py` made the chance it
  scored.

**Coverage is per game.** A game's calls get p only where both clubs' previous 2026 games are complete by
`oneshot_2026.coverage`: both clubs' stats and snap counts, the play-by-play and both weekly rosters. Otherwise p is
none, with "history not complete: ..." as its reason, and the week's other games are still called. p is also none,
with its reason, where predict.py makes no candidate row for him in that game, finds him in another game, or does not
cover his group. A player signed after 27 October has no row in the frozen `players.csv` (`in_players_csv`); that is
recorded and never patched.

**The data.** Two folders in the runner's temp folder:

- `pm-hist/raw/` holds the 89 files the manifest names: the 2010-2025 season files, `players.csv` and
  `games_to2025.csv`. It is kept between runs by `actions/cache` under a key on MANIFEST.json's hash. The two frozen
  inputs are restored from `frozen/inputs/` on every run (`oneshot_2026.restore_inputs`), so a downloaded `players.csv`
  never stands in. The cache is saved only when the folder holds exactly those 89 files.
- `tdshadow/data/raw/` is made afresh each run. It holds:
  - hard links to the history;
  - this run's 2026 files from `props/raw`, under the model's names (`pw_2026.csv` as `stats_player_week_2026.csv`,
    the injuries, the depth charts, the snap counts);
  - games.csv cut to `games_to2026.csv` (`fetch.cut_games`);
  - the 2026 play-by-play and weekly roster, downloaded through `fetch.py` and so `lib/netfetch.py`.

  No 2026 file is cached or committed, and `predict.refresh` is never called.

**The holdout, lifted in memory (Q1).**

- **The guard.** `fetch.py` fixes `HOLDOUT_FROM` at 2026 when it is imported. It says "nothing in this folder can move
  it but the one-shot 2026 test", and its one route, `PROPMODEL_LIFT_HOLDOUT`, refuses any program but
  `oneshot_2026.py`.
- **Why it can be lifted now.** The guard existed to keep 2026 unread by this model's code until the one-shot had run.
  It has run, and its result is committed. Section 8 then directs the shadow's calls to "`predict.py` (these frozen
  files)", and `predict.py`'s own docstring names "the shadow that may follow it".
- **Why not edit `fetch.py`.** It has no route for a shadow, and it cannot be edited: section 10 says "any change to a
  file in section 3 after 2026 results have been seen voids the test", here the touchdown PASS this shadow follows.
- **What `td_shadow.py` does instead.** After its hash checks pass, it sets `fetch.HOLDOUT_FROM` and
  `build_features.HOLDOUT_FROM` to 2027 inside its own process. `lifted()` is a context manager that puts both back to
  2026 in a `finally`. That is the very state the one-shot ran in: with its lift, `fetch.py`'s rule returns 2027 and
  `build_features.py` copies it. So only registered bytes execute on 2026.
- **The options rejected:**
  - editing `fetch.py`, which would void the PASS;
  - impersonating `oneshot_2026.py` as `__main__`;
  - running a modified copy of a hashed file;
  - re-implementing the features, which would not be the frozen pipeline the PASS was earned on.
- **What becomes untrue** is `fetch.py`'s sentence above. `td_shadow.py` is the second program that moves the value,
  and the last:
  - it moves it in memory, never through the variable, and refuses to run with the variable set;
  - importing `td_shadow` or `td_shadow_check` leaves the value at 2026, which the test holds;
  - its `run` and `td_shadow_equiv.py` are the only callers of `lifted()`; `rehearse` runs on 2025 without it.

**What else has read 2026 through the lift or around it.** None of it chose anything:

- **A scratch probe, 31 October 2026, about 01:20-01:24 UTC.** It ran after the one-shot wrote its result (its
  `run_at`, 01:09:45 UTC), and before the bar or any of the answers above.
  - It ran `predict.py`'s `week_rows` and `Predictor` on 2026 week 8 through this same lift: 573 candidate rows and
    542 anytime-touchdown chances, summarised by group (count, mean and quantiles).
  - It timed the outcome build: a full 2013-2026 build that printed only how many 2026 rows played each week.
  - A third script checked gamebook weather on 2013-2025 alone.
  - It looked at no outcome, scored nothing and chose nothing. The bar's tests and its size are section 8's of 27
    October.
- **The equivalence proof** (below) re-read weeks 1-6's outcomes with the model's code, for code equivalence alone. It
  records agreement counts, and no metric, rate or interval.
- **The rehearsal of the mechanics** while the shadow was built made p for week 8's games still to come, on copies of
  the one-shot's 2026 files, into a scratch ledger that was never committed. Only counts were printed (calls, how many
  had p, the null reasons, the coverage), and no grade was made on real data.
- **The page reader's development** read the site's own published payload: public data, not the model's. While
  learning its shape it printed one week-1 stat row, one week-7 game's snap lists and eight week-7 players' settlement
  by the site's `settleLeg`. Its checks were then moved onto made-up finals, and nothing was set beside a model chance.
- **A design-phase sanity script, `settle_sim.py`, 31 October 2026, about 01:38 UTC** (before the bar was registered,
  04:48:56). It used neither this model's code nor the lift: it ported the site's `settleLeg` for the anytime
  touchdown and graded every player on the ESPN archive's final weeks 1-7 touchdown lists against the site's
  published payload (its 2026 stats, snaps and injury report).
  - 3,137 listed: 440 td, 2,351 no_td (371 of them on zero), 346 void and none pending, a touchdown rate of 15.8%
    against the one-shot's 15.6%. 12% would have read void or pending without the site's who-played rule, and 11%
    were void, against 5.8% on the paid prices (ESPN's list keeps inactive players).
  - The design also counted the 2026 weeks 1-7 raw stat rows with a special-teams touchdown: two.
  - No model chance was set beside any of it. The void share fed the volume and pace estimate the owner saw ("less
    voids, about 11%"), the comparison of grading rules fed the discussion of his Q3, and the special-teams count the
    outcome clause's note on return touchdowns (rushing plus receiving was already the site's, the model's target and
    the one-shot's rule).
- **The outcome probe's own words.** "It looked at no outcome" above means it read no touchdown: it printed how many
  2026 rows played each week (457, 458, 456, 444, 423, 395, 391 and 28 for weeks 1-8) and nothing else of them.

**p is the one-shot's, bit for bit.** `td_shadow_equiv.py` ran once (31 October 2026, 03:07 UTC), in the one-shot's
own venv on its own data directory. Its seven 2026 files were held to `results/oneshot_2026.json`'s `raw_2026_sha256`.
It ran for weeks 1-6 inside `lifted()`, and covered every leg the one-shot scored or voided: 1,884 legs, 1,769 scored
and 115 void. It held each of these equal, bit for bit (`float.hex`):

- p, clipped and unclipped;
- p again from the repo's gzipped model files (the props job's path), against the one-shot's `DATA/frozen`;
- the group;
- y on the scored legs, from `grade_from_played` on `oneshot_2026.outcomes`;
- void on the 115.

Its verdict is `identical` (`results/td_shadow_equiv.json`), with all 70 games covered, in 348 seconds at a peak of
4.23 GB.

The proof ran on `td_shadow.py` at sha256 `5f522503…`, which the result records. The file has since gained `plan`,
`run`, `notify`, `init`, `summarize`, `decide`, the writer and a fix in `run()` (below), so its hash is no longer the
one recorded. The p functions are unchanged by an AST comparison against the proven file, docstrings aside: `load`,
`lifted`, `make_predictor`, `predict_week`, `p_from_pred`, `in_players_csv`, `game_coverage` and `grade_from_played`.
The one exception is `guard_code`, which gained the keyword `versions=True`; its default keeps the proven behaviour, and
only a `TD_SHADOW_STUB` test passes False, to skip the library pins, never a hash. The check never asks the result's
hash to be the file's.

**The rehearsal** (`td_shadow.py rehearse --season 2025 --week 9`, no lift) made p for 548 anytime-touchdown rows, equal
bit for bit to `predict.py --season 2025 --week 9` on the same files, and the whole prediction frame too (2,468 rows,
every stat and column). Its costs: `week_rows` and p 47 s, the grading build on 2025 41 s, a peak of 4.06 GB. A warm run
of the real mode on week 8's files took 62 s; a cold history cache (87 files, about 790 MB, downloaded inside the
20-minute step) has not been timed on a runner.

### m: the page as published

`td_shadow_page.js` boots the root `index.html` in jsdom with `suggest_ledger.js`'s `boot`:

- on the payload the props job has just published, at the run's clock;
- with nothing kept in the browser, and every address but the payload and the site's own data files answered 404.

For every game of the read still to come, it draws the game's page with every player shown and open. It reads
`data-legchance` on each listed player's "Scores one" row: DraftKings' fair chance, real or estimated, exactly as the
page states it. Before m is written it must equal both of these exactly (`===`):

- `legChance` and `legFairStated` of the leg built as `renderGame` builds it, with no chance hook set;
- `props/build/espn_rule.js`'s own price and fair chance for that touchdown, with the same branch, `tested`, `alone`
  and overround. That file is the audit's and the smoke's copy of the formula.

Any disagreement refuses the whole reader, so no call is made that run and a wrong m is never written. A request to
ESPN's core host or to The Odds API refuses it too.

Each call records where m came from:

- `src`: `real` (a price DraftKings quoted) or `dkline` (the page's estimate from DraftKings' line);
- the price, and `ov`, the overround it was divided by;
- `branch`: `real`, or the estimate's own, `lined` (on his yards line), `backup` or `model` alone;
- `tested`;
- `offered`: whether the site offers the leg in a suggestion;
- `shown`: how the page shows him;
- `p_site`: the site's own projection.

m is none, with its reason, where the page:

- rules him out and does not draw him;
- does not have him;
- has nothing to project for him;
- draws a dash;
- lists him but does not price him from his listing.

**m is whatever the site states at the time.** It leans on the site's own touchdown projection on every branch, the
lined and backup ones too, because the estimate takes the logit of `project().p`. So it is never DraftKings'
information alone, and a change to the touchdown estimate or to what it stands on moves it. Each run records the page's
`app_build`, `PAGE_HASH` and `index.html`'s hash, and the summary counts the sample by build (`by_app_build`).

**While the shadow runs, a PR that changes the touchdown estimate or what it stands on moves the shadow's m.** Such a
PR must say so in its body and in the log at the end of this section. The parts that move m are:

- `DK_EST` (its td, tdVig and complete), `guessTdPrice`, `tdBranch`, `estPrice` and `espnPrice`'s touchdown path;
- `espnComplete`, `espnStarter`, `legFair`'s dkline touchdown path and `fairVig`;
- `project()` and the touchdown projection's inputs (`tdrate`, `tdmult`, the model files);
- `gameCtx` and `teamImplied`, `PAY.grid` and `depthOf`.

A pull by hand with `oddsfetch.py` moves m too: it turns legs `real` and moves the week's overround.

### Who played, and what a grade is

**When a call is graded.** Once, by the first run at or after kickoff + 96 hours at which the game's own files are in.
That means both clubs' stats, snap counts and weekly roster and the game's play-by-play (`oneshot_2026.coverage` with
no entry for the game), and a score in games.csv.

**What decides.** One `oneshot_2026.outcomes(DATA, 2026)` build a run, made only when a grade is due, by the
registered "played" rule the one-shot graded C1 on (section 4(d)):

- a row in the 2026 build (a snap in his role or on special teams) means he played;
- y = rushing + receiving touchdowns >= 1;
- no row is void.

**Beside it.** The site's own `settleLeg` verdict is recorded as description: `site` on the grade, and `vs_site` in
the summary.

**Never changed.** A grade is never changed after it is made; a stat correction is only logged by the check.

| Case | The grade (decides) | The site's `settleLeg` (recorded) |
|---|---|---|
| A stat line with a rushing or receiving TD (a quarterback's own run too) | td | td |
| A stat line, no rushing or receiving TD (a TD pass never counts) | no_td | no_td |
| Offensive snaps, no stat line | no_td | no_td |
| Special-teams snaps only, or a return TD | no_td (`y_special_teams_tds` recorded) | no_td |
| Defensive snaps only, or a position the build drops | void | no_td |
| A snap row the build did not place, and no stat | void | no_td where the bake placed him |
| Inactive, or Out and did not dress | void | void |
| Traded, and playing in another game | void | void or pending |
| The game moved more than 24 hours, or off the schedule | void, `game moved` | – |
| Its files not in at kickoff + 96 hours | pending, looked at again each run; a WARN from 144 hours | – |
| Its files still not in at kickoff + 14 days | void, `files never complete` (posting only, never the outcome) | – |

### One run, in the props job

The shadow is seven steps of `.github/workflows/props.yml`. They come after "Commit if anything changed" and "Close the
props-refused issue", and before the props-refused issue's own step; "Fail the run…" is still last.

**When they run:** only on `main`, only when `weekly.py` succeeded and the publish was pushed, and only while the
repository variable `TD_SHADOW` is not `off`.

**Why they cannot hold back the publish:**

- every step is `continue-on-error` with its own `timeout-minutes`: 2, 4, 4, 20, 4, 3 and 2, 39 in all;
- none writes the build's problems file, which the last step reads;
- every step of the job has a cap of its own. The publish's steps (checkout to the props-refused issue it closes: 2,
  1, 3, 1, 2, `weekly.py`'s 32, 3 and 1) add to 45, the job's whole cap before the shadow, so a stalled publish holds
  the props concurrency group no longer than it did then; one that stalls past `weekly.py`'s 32 fails that step and
  refuses the run, opening the props-refused issue. The two steps after the shadow add 3. The job's cap is 90: all 87
  and 3 minutes for GitHub's own set-up and post steps, so no step running to its own cap cuts off one after it
  (`test_props_gate.py` holds every cap and both sums; until the review of 31 October 2026 only the shadow's steps had
  caps, the job's went from 45 to 85, and nothing held the publish to its 45).

So the shadow can never refuse, slow or redden the props publish, which is already pushed when it starts. It does hold
the job's concurrency group longer: one to three minutes on a warm cache, about five on a cold one. A queued props
run waits that much more.

The seven steps:

1. **What this run has to do** (`td_shadow.py plan`, standard library on the job's Python 3.12). It gives `work=run`
   where a game is to be called or a freeze, a drop or a grade is due; otherwise `work=none`, and nothing more runs. It
   gives `hist=true` where p or a grade needs the model's data.
2. **Python 3.13** (`actions/setup-python` with `update-environment: false`, so `python` stays 3.12 for every later
   step).
3. **The 2010-2025 files**, restored from `actions/cache` (`propmodel-hist-v1-<MANIFEST.json's hash>`).
4. **Calls, freezes and grades:**
   - a venv with `requirements.txt`'s pins;
   - `td_shadow_page.js` writes `page.json`; if it fails, that is DEGRADED and no call is made this run;
   - `td_shadow.py run` writes the new ledger to the runner's temp folder, never over the committed one;
   - `td_shadow_check.py` holds it, and only then is it moved into place.

   `run` exits 0 (written), 2 (written, but a phase was skipped: DEGRADED, and the step shows orange) or 1 (REFUSED,
   nothing written). A step killed at its cap dies before the move, so the tree keeps the committed ledger.
5. **Keep the 2010-2025 files:** the cache is saved, only when the history held exactly the manifest's 89 files and
   the restore missed.
6. **Commit its ledger:** the ledger alone, in a commit of its own ("props: touchdown shadow …"), pushed with three
   tries. A lost push is a WARN, and the next run starts from the last committed ledger.
7. **The td-shadow issue** (`td_shadow.py notify`).

**What `run` does, in order, on one clock.** The clock is `run_at`, never earlier than the page reader's.

1. **The guard:**
   - every registered file by SHA-256, as Python loaded it;
   - PREREGISTRATION.md, the one-shot's result and its PASS;
   - the pinned libraries on Python 3.13;
   - the holdout at 2026 as imported;
   - the ledger canonical, and its bar BAR;
   - on Actions, `main` only.
2. **Stage and predict:** the data is staged where something is to be called or graded, and p is made where something
   is to be called.
3. **Freeze** every call whose game has kicked off (the earlier of its own kickoff and the schedule's) or has a score.
4. **After a FAIL,** drop every unfrozen call and call nothing.
5. **Drop** the unfrozen calls of a game that left the schedule or its week, or whose read was withdrawn.
6. **Call:** make, rewrite or keep a call for every listed player of each game more than 10 minutes away, dropping one
   no longer listed. A newer read with the same numbers rewrites nothing.
7. **Grade** what is due.
8. **Decide,** once, at 2,000.
9. **Write** the summary and the run's entry.

A phase that cannot run is DEGRADED and skipped, and the freezes, grades and decision are written all the same. p and m
always come from the same run, or no call moves.

**What a problem means.** Each problem is one line in the run's problems file, under one of three classes. `notify`
keeps one open issue labelled `td-shadow`, "Touchdown shadow needs a look (research only: the site is fine)". It
comments only when the set of lines changes (digits aside), and the next run with none closes it.

| Class | Means | The ledger |
|---|---|---|
| REFUSED | the venv did not install; the guard refused (a registered file not its hash, the variable set, the ledger not canonical or its bar not BAR, a branch); the check failed; a step died with no line; or the plan could not read its inputs | untouched: the committed ledger stands |
| DEGRADED | the page could not be read, or disagreed with itself; a game to call was not read; the data could not be staged; p could not be made; or the grading build failed | written: freezes, grades and the decision; no call made or rewritten (or no grade, for a failed build) |
| WARN | written in full, but something wants a look (the list below) | written |

The WARN lines are:

- a call frozen stale: its last run before kickoff, or its read, more than 30 hours before kickoff;
- a grade more than 144 hours overdue;
- more than 10% of the listed with no m, or more than 5% with no p for a reason other than coverage;
- an older hole in the history;
- a void where a raw stat row exists;
- `week_rows` over 8 minutes;
- the history downloaded again on two runs in a row;
- the pace putting the season's end under 2,000 (from week 15);
- the ledger's push lost.

The run that writes the decision opens a `td-shadow-verdict` issue, once, with T1, T2 and the standing. Nothing closes
it but the owner.

### The check and the test

**The check.** `td_shadow_check.py` holds the new ledger against these, and ends "td shadow check: N failures":

- the last commit's ledger (`git show HEAD:`, which works on the job's one-commit checkout);
- the payload;
- `page.json`;
- the run's `evidence.json`;
- the raw 2026 files the run staged.

It fails when:

1. the file is not the canonical dump of what it parses to (a hand edit);
2. the bar is not BAR or not the last commit's; `bar_registered` or the model block is not the last commit's; or a
   call was made at or before `bar_registered`;
3. PREREGISTRATION.md, the one-shot's result (or its PASS), the manifest or a file BAR registers does not hash to BAR;
4. a time names no runs entry, an old runs entry has changed, or a run is a stub's; or the ledger differs from the last
   commit's while its `run_at` is the last commit's (every run moves `run_at`, so such a change is no run's; until the
   review of 31 October 2026 the check stopped before rules 7 to 15 on such a ledger and passed it);
5. a key, a week, a field or an enum is wrong;
6. any of these:
   - a call was made 10 minutes or less before kickoff, or read after it was made;
   - p or m is outside [0.001, 0.999], or missing without its reason;
   - a freeze is out of order;
7. a new or rewritten call is not this run's, or does not carry exactly page.json's m and evidence.json's p;
8. a game it called is not covered exactly, or, on a run that made calls, a game the payload offers to call is not in
   page.json at all;
9. m is not clip(implied(price) / ov) by the check's own formula, or ov is not its own reading of the week's overround;
10. a frozen call is gone, unfrozen, or changed in anything but a grade added once; or a call was dropped without a
    reason the run has;
11. an old grade has changed or gone;
12. a new grade is not this run's, came too early, is not the evidence's, or (td or no_td) does not agree with the raw
    2026 stats;
13. a frozen call is left ungraded where the run could grade it;
14. a decision is made before 2,000, is missing at 2,000, is not the check's own recomputation, or changes after; or
    calls are made after a FAIL;
15. the summary is not `summarize()`'s.

It logs, and never fails on:

- a grade a fresh reading now sees otherwise (a stat correction);
- a registered grade the site read otherwise;
- a no-stat no_td whose snap row it cannot find by PFR id.

**What the check cannot see, and what holds it.** The check holds a ledger a run wrote against the last commit's. A
hand edit already merged is the last commit's ledger, so the check would build on it. That is held before the merge,
by the props gate: `props_gate.py classify` runs `ledger_hold` on every pull request that touches the ledger. The
props job alone writes it, committed straight to main (its commits start no workflow), so a pull request may add it
once, as `td_shadow.py init` writes the bar's registration (`td_shadow_check.py --registration`: canonical, BAR with no
open question, the manifest's touchdown files, no run, call or decision, the empty summary), and never change or
remove it after; one that does fails the gate's first job. A push straight to main bypasses every check of this repo,
this one with it.

**The test.** `test_td_shadow.py` is a unit of the props gate's job C. It takes about 45 seconds and stops itself,
failing, at 3 minutes. It writes only to a temporary folder, never to the committed ledger, and reads no 2026 outcome:
every played row and stat row is made up. Its sections:

- **A and B, the rules and the grades,** on made-up weeks, each run held by the check;
- **C, the decision:** `decide` with the one-shot's real `mean_diff` and `signal_test`, equal bit for bit to them
  called directly, and on stand-ins, Q2's sample, the order, FAIL and PASS;
- **D, the check:** a planted edit for every sub-condition of every rule, each held by its own words (`bites` reads
  the failure's sentence, never its rule number alone, so no condition passes because another of its rule trips
  beside it), `main()`'s catch of a crash, its refusal without a last commit and the stub on Actions, and every way a
  ledger can differ from the registration `--registration` takes;
- **E and F, the page reader** on the pinned payload of 30 October 2026 (`9dbe81f6`), planted and as published, with
  the zone database's kickoff equal to the page's on every game, and sixteen refusals on one boot (a price, an
  overround, a branch, a stated chance, an untested flag or a real price off `espn_rule.js`, a published read not
  installed, a function gone, a request to ESPN's player lines or The Odds API, a page error, another payload or
  clock, a touchdown row, its chance or its heading's projection drawn otherwise), each in its own words, the plant
  taken off after;
- **G, the plan, notify and the problem classes;**
- **H, the staging and the glue,** with downloads recorded and `predict.refresh` made to raise, and the per-game
  coverage on each club's last previous game (two played weeks and a bye), the older holes said;
- **I, the guard:** the holdout at 2026 on import, every refusal on its own (each registered file altered alone,
  predict.py's manifest, PREREGISTRATION.md's copy of the hashes, the pins, Python 3.13, the holdout as imported, a
  ledger whose bar or model block moved, the run without the stub checking the pins first), every file
  PREREGISTRATION.md registers hashing as registered, so a PR editing one fails job C, and the bar pinned: BAR's own
  SHA-256 and the committed ledger's `bar_registered`, so a PR that edits BAR, alone or with the ledger, edits those
  two lines too;
- **J:** no page, build part or X Parlays source names the ledger;
- **K, props.yml's shadow step run:** its script taken from props.yml and run under `bash -e` in a copy of the folder
  that is a git repository of its own (the reader, the run and the check real, a stand-in only for setup-python's
  3.13, the clock, the model and in one case node): exit 0 with the checked ledger moved, exit 1 with the committed
  one left where the check refuses, exit 2 (DEGRADED) with the ledger checked and moved where the page is unread.

A, B also hold `init`'s two refusals (a ledger that exists, an open question in BAR), every page.json rule `run`
keeps (another payload or clock, a kickoff off the schedule's, a list not its players, a game to call unread:
DEGRADED, no call), and the 24-hour line (a game moved 3 hours after its calls froze graded from its rows, one moved
25 hours void, and `moved()` itself at 24 hours and a second past).

### Running the shadow

```
# once, in the PR that added the shadow, before the first call: the ledger, the bar and no call (refuses a ledger that exists)
python3 -I props/research/propmodel/td_shadow.py init
# what a run would do now (standard library)
python3 -I props/research/propmodel/td_shadow.py plan --payload props/data/payload.json
# the page reader alone (node, with props/build/node_modules)
node props/research/propmodel/td_shadow_page.js --payload props/data/payload.json --now 2026-11-01T12:00:00Z \
     --out page.json [--ledger props/research/propmodel/shadow/td_ledger.json]
# one run as props.yml makes it (Python 3.13 with requirements.txt's pins): the ledger to --out, never over --ledger
VENV/bin/python -I props/research/propmodel/td_shadow.py run --now ISO --payload props/data/payload.json \
     --page page.json --props-raw props/raw --hist HIST --data DATA --out NEW.json --evidence evidence.json \
     --problems problems.txt
VENV/bin/python -I props/research/propmodel/td_shadow_check.py --ledger NEW.json --payload props/data/payload.json \
     --page page.json --evidence evidence.json --data DATA [--prev OLD.json | --no-prev]
# is a ledger the bar's registration as init writes it, and nothing else (the props gate's hold on a PR that adds it)
python3 -I props/research/propmodel/td_shadow_check.py --registration props/research/propmodel/shadow/td_ledger.json
# the props gate's hold on a PR's ledger, here (git refs): [] or why
python3 -c "import sys; sys.path.insert(0, '.github/scripts'); import props_gate as G; print(G.ledger_hold('origin/main', 'HEAD'))"
# the issues it would make, printed
python3 -I props/research/propmodel/td_shadow.py notify --tmp DIR --dry-run [--state issues.json]
# p for a finished week with no lift, held bit for bit to predict.py on the same files
VENV/bin/python -I props/research/propmodel/td_shadow.py rehearse --season 2025 --week 9 --data DIR --ref pred.parquet
# the equivalence proof (done once, on the one-shot's data directory, in its venv)
VENV/bin/python -I props/research/propmodel/td_shadow_equiv.py --data DIR
python3 props/research/propmodel/test_td_shadow.py
```

**Stand-ins for tests:**

- `TD_SHADOW_NOW` stands in for the clock.
- `TD_SHADOW_STUB=<json>` stands in for the model (p, per-game coverage, played rows), in a test or a rehearsal of the
  mechanics:
  - it is refused on GitHub Actions, and refused when `--out` is the committed ledger;
  - every run it makes is marked `stub`, and the check fails such a run unless the same variable is set off Actions.

`run` refuses an `--out` or `--evidence` that is the ledger itself. The run always writes aside.

### Reading the ledger

**The head** holds `what`, `bar`, `bar_registered`, `model` (the manifest's hash and the four touchdown model files'),
`run_at`, `decision` and `summary`. Then come `runs` and `calls`, one entry a line and sorted by key, so a run moves a
few lines. A call's key is `2026|WW|game id|player id`.

**The summary:**

- `standing` says where it stands: "412 of 2,000 graded calls toward the verdict; the bar is judged at 2,000, not
  before", then the verdict, or "undecided";
- `in_sample` is the count toward 2,000;
- `running` appears once the sample has 100 calls and 10 touchdowns, and gives point estimates only: the mean p, m and
  b, the three log losses, T1's mean and T2's point fit, never an interval or a verdict;
- `by_branch`, `by_group`, `by_shown` and `by_app_build` describe the calls;
- `null_why` counts why calls lack p or m;
- `vs_site` sets the registered grades beside the site's `settleLeg`;
- `pace` projects the sample at the season's end.

**Never edit the ledger.** It is written only by the props job. A hand edit would rewrite the record: one that is not
canonical is refused by the next run's read and by the check, and any pull request that changes or removes the
ledger fails the props gate (`ledger_hold`, under "The check and the test"). The check alone cannot refuse a
canonical edit once it is merged: from then on it is the last commit's.

### The off switch

`gh variable set TD_SHADOW --body off` stops the shadow, and `gh variable delete TD_SHADOW` resumes it.

- While it is off, games are not called and are never backfilled.
- Calls already made are frozen and graded by the first run after it is back on.
- After a FAIL, or once the season's last grade is written, the plan finds nothing to do, and the steps come out in an
  off-season PR.

### PASS, FAIL or undecided

- **Before 2,000:** running counts and point estimates only; never an interval, a verdict or a word of passing.
- **At 2,000** (the first 2,000 in the sample, in grading order): T1 and T2 are worked by the one-shot's own
  `mean_diff` and `signal_test` (10,000 game resamples, `default_rng(0)`, 90%). It is a PASS only if both hold. The
  decision is written once into the ledger's `decision`, and the check holds it to its own recomputation on its run and
  to the last commit's after.
- **PASS:** the model becomes a candidate for a change of its own: a PR with the props audit's and the smokes' checks,
  putting the blend at 0.25 on the anytime touchdown. Nothing on the site moves by itself. Calls go on to the regular
  season's end as description, the verdict fixed.
- **FAIL:** no new calls, unfrozen calls dropped, frozen calls still graded. The model is not used.
- **Undecided:** the regular season ends with fewer than 2,000 in the sample. There is no verdict, which is not a PASS,
  and the model is not used.

**Expected volume.** At about 25 listed players a game over weeks 9-18's 156 games, less voids, nulls and the model
branch, about 3,100-3,300 calls should be eligible. 2,000 is expected around week 15's games, in late December.

### The shadow's log

BAR's `changes` clause: after the first call, the shadow's code changes only to fix a mechanical failure, never a rule,
a sample, a metric or a threshold, and each fix is logged here with its reason. A PR that moves m (under "m") is logged
here too. Each entry gives the date, the PR, its kind (mechanical fix, or m moved), what changed and why.

**No entry yet:** the bar is registered and no call has been made. One change before registration is noted because the
equivalence proof's recorded hash predates it: `run()` deleted whatever was at `--out` before its guard, so a stub run
pointed at the committed ledger would have deleted it and only then refused. It now refuses such a path before removing
anything. The p functions are untouched.

The review of 31 October 2026, after the bar was registered and before any call, changed no rule, sample, metric or
threshold: the check fails a ledger that changed at the last commit's `run_at` and a run that made calls with a game to
call missing from page.json; `--registration` and the props gate's `ledger_hold` hold the ledger before a merge; every
props.yml step has a cap of its own (the job's 90); and the test holds each of the check's conditions, the reader's
refusals, the guard's, `init`'s, the 24-hour line, the coverage's last game and the step's script on their own, with
BAR's hash and the registration time pinned. `td_shadow.py` changed in its docstring alone (the disclosures), so the
p functions the equivalence proof held are untouched.
