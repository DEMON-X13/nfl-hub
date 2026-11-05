# The Mismatch scorecard

A running record of the Props tab's Mismatches against DraftKings' closing line. Research only: no page, audit or
smoke reads it, and nothing is fitted, tuned or chosen on it. It is there so the Mismatches are judged on a frozen
record, not on memory: in weeks 3 to 8 of 2026 the tagged players went over their close anywhere from 68% to 21% of
the time week to week.

Expect no edge. The Mismatches were rebuilt (November 2026) to be honest about what the Elo adds, not to beat
DraftKings.

## The bar

Registered by `scorecard.py init` before the first call and never changed (`check` refuses a ledger whose bar, its
SHA-256 or its registration time moved, and `test_scorecard.py` pins the SHA-256):

> Registered before the first call, never changed. The scorecard measures whether the Props tab's Mismatches tell anything about DraftKings' closing line. A row is every lead block (avg[pid].mm) the Elo job's last publish before a game's kickoff carried for that game, frozen at kickoff, graded over or under DraftKings' closing main line on its stat from props/data/espn_lines_<season>.json against the player's stat from nflverse; a push, a row with no close, a row whose game moved more than 24 hours and a player who did not play are left out. D is the over-rate of the tagged rows (mm.tag true) less the over-rate of the untagged rows (mm.tag false), pooled over the season. S is Spearman's rank correlation between mm.shift and the actual less the close, over every graded row. Each has a 90% interval from 10,000 bootstrap resamples of games (seed 2026). The scorecard is decided once, when every regular-season game it froze rows for has been graded or voided (at the latest 14 days after the season's last regular-season kickoff): fewer than 30 graded tagged rows is UNDECIDED; otherwise PASS only if D's interval and S's interval both lie wholly above 0; FAIL if D's interval lies wholly below 0; anything else is NO EDGE SHOWN. Before the decision the ledger carries the running counts, rates, D and S with their intervals, never a verdict. A PASS only makes the Mismatches a candidate for a change of their own, tested again; nothing on the site reads this scorecard, and nothing is fitted, tuned or chosen on it.

## How it runs

One step of the Elo job (`.github/workflows/elo.yml`), after the Elo files are committed and pushed, on `main` only,
`continue-on-error` and capped at 3 minutes, so it can never hold back or redden the Elo publish:

1. `python elo/scorecard/test_scorecard.py` (seconds, its own fixtures).
2. `scorecard.py run --out <temp>`: the published `elo/data/matchups.json`, the build's `elo/cache` (games.csv, the
   season's player stats and snap counts, players.csv) and `props/data/espn_lines_<season>.json`.
3. `scorecard.py check --ledger <temp> --against HEAD`.
4. Only if both pass, the new ledger replaces `elo/scorecard/ledger.json` in a commit of its own ("elo: mismatch
   scorecard ..."). A run that changes nothing writes nothing.

The off switch is the repository variable `ELO_SCORECARD`: `gh variable set ELO_SCORECARD --body off` stops it,
`gh variable delete ELO_SCORECARD` resumes it. Games missed meanwhile get no row.

## The rules, in short

- **A row** is one lead block (`avg[pid].mm`) of a regular-season game, every one of them, untagged and shift at or
  below 0 too: the bar sets tagged rows against untagged rows of the same publishes.
- **Before kickoff** a row follows the newest publish: written again when its numbers move (published is the
  matchups file's `built_at`), dropped when the publish no longer carries it.
- **From kickoff** it is frozen: never written again or removed. A game first seen after its kickoff gets no row.
- **Graded once**, by the first run at or after kickoff + 72 hours where the archive has the game final with a close
  for the player on the stat and the nflverse stats carry the game. No stat row: 0 if PFR's snap counts show him with
  a snap, void "did not play" if they carry his club's game without him, otherwise he waits.
- **Void** at once if games.csv moves a frozen game more than 24 hours ("moved"). Still not gradable 14 days after
  kickoff: "no close", "no stats" or "not told" (play could not be told from the snap counts). These, like a game off
  the schedule ("off schedule"), are left out with the bar's own four.
- The open line and over or under against it are kept beside each grade, as information only.
- A run that lacks the stats or the archive grades nothing, voids nothing for want of them, and says so.
- The summary is worked again from the rows on every run. The verdict is read off the four-place numbers the ledger
  states.

## Known limit

The ledger follows the publishes the job ran this step on. If the step fails on the last publish before a kickoff,
that game's rows keep the publish before it.

## Files

- `scorecard.py`: `init`, `run`, `check`, `summary`.
- `test_scorecard.py`: every freeze, grade and refusal rule, the decision's arithmetic and the pinned bar.
- `ledger.json`: generated, written only by `run` and committed only after `check`. A hand edit rewrites the record.
