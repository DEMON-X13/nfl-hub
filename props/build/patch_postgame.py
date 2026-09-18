"""Score updates the night of the game, on all three sites, for no credits.

Measured on Detroit at Buffalo: nflverse's games.csv carried the 31-41 final at
03:33 UTC, within minutes of the whistle, and the file is rewritten ten or more
times a day. So a free source fast enough for same-night updates already exists.

Five post-game runs a week, each about an hour after the latest finish that slot
sees all season (after the November clock change included):

    Thursday night   latest finish 04:40 Fri   -> run 05:47 Fri
    Sunday early     latest finish 21:20 Sun   -> run 22:17 Sun
    Sunday late      latest finish 00:45 Mon   -> run 01:47 Mon
    Sunday night     latest finish 04:40 Mon   -> run 05:47 Mon
    Monday night     latest finish 04:35 Tue   -> run 05:47 Tue

The betting job runs at those minutes, the prop model twenty minutes later and the
tracker forty, so the three rarely push at the same instant.

The prop model's post-game runs must not spend: a scheduled run cannot carry the
no_odds input, so those crons all sit on minute 7 and the job passes --no-odds when
github.event.schedule starts with it. The price crons sit on minute 17.

Two latent problems had to go with it.

The three workflows shared one concurrency group, and GitHub cancels a pending run
whenever a newer one queues in the same group. With post-game runs in all three and
this repo's scheduler landing 2-4.5 hours late in unpredictable order, one would
routinely have been cancelled without a trace. Each workflow gets its own group.

That shared group was what kept two jobs from pushing at once. Its replacement is a
retry around pull-and-push, which also fails the step honestly if all three
attempts lose the race, instead of the loop swallowing the error.
"""
from pathlib import Path

WF = Path(__file__).parent.parent.parent / '.github' / 'workflows'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


RETRY_OLD = """            git pull --rebase
            git push"""
RETRY_NEW = """            # each job has its own concurrency group now, so two can finish together:
            # retry the pull-and-push, and fail honestly if all three attempts lose
            ok=0
            for i in 1 2 3; do
              if git pull --rebase && git push; then ok=1; break; fi
              echo "push raced another job, retrying ($i)"; sleep 15
            done
            [ "$ok" = 1 ]"""
GROUP_OLD = """concurrency:
  group: update
  cancel-in-progress: false"""
GROUP_NEW = """concurrency:
  # one group per workflow: GitHub cancels a pending run whenever a newer one queues
  # in the same group, and post-game runs in all three would have collided
  group: ${{ github.workflow }}
  cancel-in-progress: false"""

# ---- betting ----
u = WF / 'update.yml'
sub1(u, """    - cron: "0 17 * * 2"    # Tuesday 1pm ET: catch-up""",
     """    - cron: "0 17 * * 2"    # Tuesday 1pm ET: catch-up
    # post-game: about an hour after the latest finish each slot sees all season,
    # so AI Picks and the records update the same night. nflverse posts a final
    # within minutes of the whistle. Free, like everything else in this job.
    - cron: "47 5 * * 5"    # Thursday night game
    - cron: "17 22 * * 0"   # Sunday early games
    - cron: "47 1 * * 1"    # Sunday late games
    - cron: "47 5 * * 1"    # Sunday night game
    - cron: "47 5 * * 2"    # Monday night game""")
sub1(u, GROUP_OLD, GROUP_NEW)
sub1(u, RETRY_OLD, RETRY_NEW)

# ---- props: score-only, never spends ----
p = WF / 'props.yml'
sub1(p, """    - cron: "17 23 * * 6"   # Saturday 19:17 ET: the Sunday slate, priced ~18h out""",
     """    - cron: "17 23 * * 6"   # Saturday 19:17 ET: the Sunday slate, priced ~18h out
    # post-game, score only: finals, game bets settled, started games out of the
    # suggestions. Every one of these sits on minute 7, and the run step passes
    # --no-odds for any schedule starting "7 ", so none of them spends a credit.
    - cron: "7 6 * * 5"     # after Thursday night
    - cron: "7 23 * * 0"    # after Sunday early
    - cron: "7 2 * * 1"     # after Sunday late
    - cron: "7 6 * * 1"     # after Sunday night
    - cron: "7 6 * * 2"     # after Monday night""")
sub1(p, """        run: python weekly.py --no-commit ${{ inputs.no_odds && '--no-odds' || '' }}""",
     """        # a scheduled run cannot carry the no_odds input, so the post-game crons are
        # recognised by their minute: they all start "7 ", the price pulls start "17 "
        run: python weekly.py --no-commit ${{ (inputs.no_odds || startsWith(github.event.schedule, '7 ')) && '--no-odds' || '' }}""")
sub1(p, GROUP_OLD, GROUP_NEW)
sub1(p, RETRY_OLD, RETRY_NEW)

# ---- news ----
n = WF / 'news.yml'
sub1(n, """    - cron: "0 12 * * 2"    # Tuesday""",
     """    - cron: "0 12 * * 2"    # Tuesday
    # post-game: results and team stats the same night. The narrative is untouched;
    # run-auto only refreshes the self-updating parts and drafts a week it cannot show.
    - cron: "27 6 * * 5"    # after Thursday night
    - cron: "27 23 * * 0"   # after Sunday early
    - cron: "27 2 * * 1"    # after Sunday late
    - cron: "27 6 * * 1"    # after Sunday night
    - cron: "27 6 * * 2"    # after Monday night""")
sub1(n, GROUP_OLD, GROUP_NEW)
sub1(n, RETRY_OLD, RETRY_NEW)

print('post-game runs added to all three; own concurrency groups; push retry')
