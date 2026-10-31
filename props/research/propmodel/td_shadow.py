#!/usr/bin/env python3
"""The quiet anytime-touchdown shadow (PREREGISTRATION.md section 8, "The touchdown shadow"): the frozen free-data
model's chance p that a listed player scores a rushing or receiving touchdown, beside the chance the site states for
the same leg (m), called before kickoff, frozen at kickoff and graded after the game, under a bar copied into its
ledger before its first call. Research only: no page reads anything this program writes, and nothing on the site uses
it. The one-shot 2026 test (results/oneshot_2026.json) failed the main lines and passed the anytime touchdown (C1),
which is what starts this shadow and nothing else.

How p is made. p is made by the one-shot's own code, imported unchanged: oneshot_2026.py, which brings fetch.py,
build_features.py and predict.py, each hashed where Python loaded it and held to PREREGISTRATION.md section 3 (and to
BAR's copy of those hashes) before anything runs. For the call's week W: `predict.week_rows(DATA, 2026, W,
fetch=False)` (build_features.py's predict mode: the week's own files read to W-1, the pre-game files to W), then
`predict.Predictor(models_dir=DATA/frozen).predict_rows(rows)` (the repo's gzipped model files where DATA/frozen does
not exist, each held to frozen/MANIFEST.json), and p = clip(p_ge1, 0.001, 0.999) on his candidate row in that game,
exactly as oneshot_2026.py made the touchdown chance it scored (its `run`: `Td.p = np.clip(p_td, *CLIP)` with p_td
the any_td prediction's p_ge1 joined on game and player). A game's calls get p only where both clubs' previous 2026
games are complete by the one-shot's own rule (`oneshot_2026.coverage`: stats and snap counts of both clubs, its
play-by-play and both clubs' weekly roster); otherwise p is none, with the reason. The grade's "played" reading is
the one-shot's `outcomes()` (a row in the 2026 build: a snap in his role or on special teams), y = rushing + receiving
touchdowns >= 1, as it graded C1.

The holdout, lifted in memory (the owner's sign-off of 31 October 2026, said here, in README.md and in the PR that
added this file). fetch.py fixes HOLDOUT_FROM at 2026 when it is imported and says that "nothing in this folder can
move it but the one-shot 2026 test"; its environment route (PROPMODEL_LIFT_HOLDOUT) refuses any program but
oneshot_2026.py. That guard existed to keep 2026 unread by this model's code until the one-shot had run; it has run
and its result is committed. Section 8 then directs the shadow's calls to "predict.py (these frozen files)", and
predict.py's own docstring names "the shadow that may follow it", but the registered fetch.py has no route for it,
and editing it is out of the question: section 10 says any change to a file in section 3 after 2026 results have been
seen voids the test. So this program, after the hash checks pass, sets `fetch.HOLDOUT_FROM` and
`build_features.HOLDOUT_FROM` to 2027 inside its own process (`lifted()`, which puts them back to 2026 in a `finally`),
the very state the one-shot ran in (fetch.py's rule returns 2027 there, and build_features.py copies it), so that only
registered bytes execute on 2026. The options rejected: editing fetch.py (it would void the touchdown PASS this
shadow follows), impersonating oneshot_2026.py as `__main__`, running a modified copy of a hashed file, and
re-implementing the features (not the frozen pipeline). What becomes untrue is fetch.py's sentence above: this program
is the second, and the last, that moves the value, in memory and never through the variable, which it refuses to run
with. td_shadow_equiv.py ran the same lift once, on the one-shot's own data directory, to hold the shadow's p equal
to the one-shot's on weeks 1-6 bit for bit (results/td_shadow_equiv.json: agreement counts only). Disclosed besides
(README.md, "What else has read 2026", lists every read): a scratch probe on 31 October 2026 at about 01:20-01:24
UTC, after the one-shot wrote its result at 01:10, ran predict.py on 2026 week 8 through this same lift and timed the
outcome build, which printed only how many 2026 rows played each week; it read no touchdown, scored nothing and chose
nothing. And a design-phase sanity script (settle_sim.py, about 01:38 UTC, before the bar was registered at 04:48:56),
with neither this model's code nor the lift, ported the site's settleLeg and graded the ESPN archive's final weeks
1-7 touchdown lists against the site's published payload: 3,137 listed, 440 td, 2,351 no_td (371 on zero), 346 void,
a 15.8% rate; the design also counted two 2026 weeks 1-7 stat rows with a special-teams touchdown. No model chance was
set beside either; the void share fed the volume and pace estimate the owner saw, and the comparison of grading rules
fed the discussion of his Q3.

How m is taken: td_shadow_page.js boots the published page on the payload the props job just published, at the run's
clock with nothing kept in the browser, and reads the chance the page states on each listed player's "Scores one"
row, held equal to legChance, legFairStated and props/build/espn_rule.js before it is written (page.json).

One run (`run`, in props.yml after the publish's commit, on main only): the guard (the registered bytes by SHA-256,
the one-shot's PASS, the pinned libraries on Python 3.13, the holdout at 2026 as imported, the ledger canonical and
its bar BAR), then p for the listed players of every game still to come more than CALL_MARGIN after the run (the
data staged in a directory of the run's own: the 2010-2025 files from the history cache, held to the manifest, and
this run's 2026 files: props/raw's, with the 2026 play-by-play and weekly roster downloaded through fetch.py and
lib/netfetch.py), then on one clock: freeze every call whose game has kicked off (the earlier of its own kickoff and
the schedule's) or has a score; after a FAIL drop every unfrozen call and call nothing; drop the unfrozen calls of a
game that left the schedule or its week, or whose read was withdrawn; make, rewrite or keep a call for every listed
player (dropping one no longer listed); grade every frozen call 96 hours past kickoff whose game's own files are in
(void where the game moved more than 24 hours or left the schedule, or its files are still not in at 14 days); the
decision once 2,000 calls are in the sample; the summary; the run's entry. The ledger is written to --out (never to
--ledger), td_shadow_check.py holds it, and only then does props.yml move it into place. A phase that cannot run is
said (DEGRADED) and skipped, and freezes, grades and the decision are written all the same; p and m always come from
the same run, or no call moves. Nothing here can refuse, slow or redden the props job's publish: it runs after it.

Subcommands:
    init       write the ledger (BAR, bar_registered, no call), once, in the PR, before the first call
    plan       stdlib: what this run has to do (work=run|none, hist=true|false into $GITHUB_OUTPUT)
    run        one run (above); exit 0 written, 2 written but DEGRADED, 1 REFUSED and nothing written
    notify     stdlib + gh: the one open td-shadow issue (commented when its problems change, closed by a clean run)
               and the td-shadow-verdict issue, opened once (--dry-run prints what it would do)
    rehearse   p for a finished season's week with no lift (2025 week 9 before the PR), held bit for bit to a
               predict.py run on the same files, with the grading build timed:
               venv/bin/python -I td_shadow.py rehearse --season 2025 --week 9 --data DIR --ref pred_2025_w09.parquet

TD_SHADOW_NOW stands in for the run's clock (tests). TD_SHADOW_STUB=<json> stands in for the model (p, per-game
coverage, played rows) in a test or a rehearsal of the mechanics: it is refused on GitHub Actions and refused when
--out is the committed ledger, every run it makes is marked `stub` in the ledger, and td_shadow_check.py fails a
stub run unless the same variable is set off Actions.

Python 3.13 with requirements.txt's pins (the venv the one-shot ran in) for `run` and `rehearse`; this file's
top-level imports are the standard library's alone, so `plan`, `notify` and its rules can be read on the props job's
3.12.
"""
import argparse
import contextlib
import gc
import hashlib
import json
import math
import os
import platform
import re
import resource
import shutil
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
REL = 'props/research/propmodel'
SEASON = 2026                 # the season the shadow calls; fetch.py holds it out until lifted() lifts it to 2027
PREREG = os.path.join(HERE, 'PREREGISTRATION.md')
RESULT = os.path.join(HERE, 'results', 'oneshot_2026.json')
MANIFEST = os.path.join(HERE, 'frozen', 'MANIFEST.json')
LEDGER_REL = f'{REL}/shadow/td_ledger.json'
LEDGER = os.path.join(REPO, LEDGER_REL)
TD_GROUPS = ('QB', 'RB', 'WR', 'TE')
EASTERN = 'America/New_York'  # the schedule's g.d and g.t are US Eastern, as the page's kickoff() reads them

# the bar's clock (BAR says each in words)
CALL_MARGIN = timedelta(minutes=10)    # a call is made or rewritten only while its game is more than this away
GRADE_AFTER = timedelta(hours=96)      # graded by the first run at or after kickoff + 96 h whose files cover the game
NEVER_COMPLETE = timedelta(days=14)    # its own files still not complete then: void, 'files never complete'
MOVED = timedelta(hours=24)            # the game kicks off more than this from the call's kickoff: void, 'game moved'
SAMPLE_N = 2000
SAMPLE_BRANCHES = ('real', 'lined', 'backup')   # the owner's Q2: a touchdown priced on the model alone is not sampled
# what the runs say (never a rule of the bar)
STALE_FREEZE = timedelta(hours=30)
OVERDUE = timedelta(hours=144)
RUNS_KEEP = timedelta(days=14)
RUNNING_MIN_N, RUNNING_MIN_TD = 100, 10
WEEK_ROWS_WARN_S = 480
M_NULL_WARN, P_NULL_WARN = 0.10, 0.05
PACE_FROM_WEEK, LAST_WEEK = 15, 18

WHAT = ('The anytime-touchdown shadow (props/research/propmodel/td_shadow.py; PREREGISTRATION.md section 8). Research '
        'only: no page reads this file and nothing on the site uses it. Written only by the props job; never by hand.')
HEAD_ORDER = ('what', 'bar', 'bar_registered', 'model', 'run_at', 'decision', 'summary', 'runs', 'calls')
CALL_KEYS = ('season', 'week', 'game_id', 'pid', 'name', 'team', 'grp', 'kickoff', 'read_at',
             'p', 'lam', 'cand_src', 'in_players_csv', 'p_why',
             'm', 'm_est', 'src', 'price', 'ov', 'branch', 'tested', 'offered', 'shown', 'p_site', 'm_why',
             'called_at', 'frozen', 'frozen_at', 'grade')
# a difference in any of these rewrites an unfrozen call (called_at the run's, read_at the block's); a newer read_at
# with the same numbers does not, and the name follows only on a rewrite
CALL_FIELDS = ('team', 'grp', 'kickoff', 'p', 'lam', 'cand_src', 'p_why', 'm', 'm_est', 'src', 'price', 'ov', 'branch',
               'tested', 'offered', 'shown', 'p_site', 'm_why')
P_FIELDS = ('p', 'lam', 'cand_src', 'p_why', 'in_players_csv')                  # from evidence.json (the model)
M_FIELDS = ('name', 'team', 'm', 'm_est', 'src', 'price', 'ov', 'branch', 'tested', 'offered', 'shown', 'p_site',
            'm_why')                                                             # from page.json (the page)
P_WHY = ('no candidate row', 'candidate in another game', 'group not covered', 'not on the schedule')
COVERAGE_WHY = 'history not complete: '
M_WHY = ('ruled out: not drawn', 'not on the page', 'nothing to project: no touchdown row', 'no stated chance: dash',
         'listed, but not priced from his listing')
SRC = ('real', 'dkline')
BRANCHES = ('real', 'lined', 'backup', 'model')
SHOWN = ('default', 'backups')
GRADE_KEYS = ('result', 'y', 'how', 'evidence', 'site', 'graded_at')
VOID_HOW = ('did not play', 'game moved', 'files never complete')
SITE_RESULTS = ('td', 'no_td', 'void', 'pending')
PROBLEM_CLASSES = ('REFUSED', 'DEGRADED', 'WARN')
# props/raw's files (weekly.py's names) under the model's names; the first and games.csv must be there
PROPS_RAW = (('pw_2026.csv', 'stats_player_week_2026.csv', True), ('injuries_2026.csv', 'injuries_2026.csv', True),
             ('depth_charts_2026.csv', 'depth_charts_2026.csv', False),
             ('snap_counts_2026.csv', 'snap_counts_2026.csv', False))

# The bar, copied verbatim into the ledger by `init` before the first call and never changed after it (README.md,
# "The touchdown shadow"). Section 8 sets the population, T1, T2 and the 2,000; the rest says how this shadow reads
# what section 8 leaves unsaid, as the owner answered on 31 October 2026: touchdowns priced on the model alone are
# called, graded and reported but kept out of the decision sample (his Q2), and every operationalisation below as
# written (his Q3).
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

# the grade's evidence: the build's own flags on his row, and the touchdowns it counts and the ones it does not
EVIDENCE = ('stat_row', 'snap_row', 'role_played', 'st_only', 'zero_row', 'y_rush_rec_tds', 'y_special_teams_tds')


class Refused(Exception):
    """a guard said no: exit 1, nothing written"""


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def peak_rss_gb():
    """this process's peak resident set so far (Linux reports kilobytes)"""
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024 / 1024



# ------------------------------------------------------------------------------------------------- times
def parse_t(s):
    """an ISO time (Z or an offset, fractional seconds allowed) as an aware UTC datetime; None for None"""
    if s is None:
        return None
    if isinstance(s, datetime):
        d = s
    else:
        d = datetime.fromisoformat(str(s).strip().replace('Z', '+00:00'))
    if d.tzinfo is None:
        raise ValueError(f'{s!r} names no time zone')
    return d.astimezone(timezone.utc)


def iso(d):
    """the ledger's one way of writing a time: UTC to the second, Z"""
    return parse_t(d).strftime('%Y-%m-%dT%H:%M:%SZ')


def norm_t(s):
    return None if s is None else iso(s)


def ko(g):
    """a schedule game's kickoff in UTC from its g.d and g.t (US Eastern; a missing time is 13:00, as the page's
    kickoff() reads it), through the time zone database; None without a date"""
    from zoneinfo import ZoneInfo
    d = g.get('d') if isinstance(g, dict) else None
    if not isinstance(d, str) or not re.match(r'^\d{4}-\d{2}-\d{2}$', d):
        return None
    t = g.get('t') or '13:00'
    if not isinstance(t, str) or not re.match(r'^\d{2}:\d{2}$', t):
        return None
    return datetime.fromisoformat(f'{d}T{t}').replace(tzinfo=ZoneInfo(EASTERN)).astimezone(timezone.utc)


def wall_now():
    return datetime.now(timezone.utc).replace(microsecond=0)


def env_now():
    v = os.environ.get('TD_SHADOW_NOW')
    return parse_t(v) if v else None


# ------------------------------------------------------------------------------------------------ the ledger
def _dump_value(v):
    return json.dumps(v, indent=1, ensure_ascii=False, allow_nan=False).replace('\n', '\n ')


def _dump_line(v):
    return json.dumps(v, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)


def dumps(L):
    """the ledger's one canonical text: the head indented one space in HEAD_ORDER (insertion order kept below it), then
    `runs` and `calls` one entry a line (compact, keys sorted), sorted by key, and a trailing newline. A ledger is
    canonical when its text is dumps() of what it parses to"""
    if not isinstance(L, dict) or tuple(L) != HEAD_ORDER:
        raise ValueError(f'the ledger\'s head is not {HEAD_ORDER}')
    parts = []
    for k in HEAD_ORDER:
        v = L[k]
        if k in ('runs', 'calls'):
            if not isinstance(v, dict):
                raise ValueError(f'{k} is not a map')
            body = ('{\n' + ',\n'.join(f'  {json.dumps(kk, ensure_ascii=False)}: {_dump_line(vv)}'
                                       for kk, vv in sorted(v.items())) + '\n }') if v else '{}'
        else:
            body = _dump_value(v)
        parts.append(f' {json.dumps(k)}: {body}')
    return '{\n' + ',\n'.join(parts) + '\n}\n'


def read_ledger(path):
    """the ledger and its text, refused unless it reads, is canonical and carries BAR"""
    if not os.path.exists(path):
        raise Refused(f'there is no ledger at {path} (td_shadow.py init writes it, once, in the PR)')
    with open(path, encoding='utf-8') as f:
        text = f.read()
    try:
        L = json.loads(text)
    except ValueError as e:
        raise Refused(f'the ledger does not read ({e})') from None
    try:
        canon = dumps(L)
    except ValueError as e:
        raise Refused(f'the ledger is not the shadow\'s ({e})') from None
    if canon != text:
        raise Refused('the ledger is not its own canonical dump (edited by hand?)')
    if L.get('bar') != BAR:
        raise Refused('the ledger\'s bar is not BAR')
    return L, text


def write_text(path, text):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path + '.part', 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    os.replace(path + '.part', path)


def manifest():
    with open(MANIFEST, encoding='utf-8') as f:
        return json.load(f)


def model_block(man):
    """the frozen touchdown models the shadow calls with (the manifest's own record of each file)"""
    return {'manifest_sha256': BAR['registered_with']['manifest_sha256'],
            'td': {g: {'file': man['td']['groups'][g]['file'], 'sha256': man['td']['groups'][g]['sha256']}
                   for g in TD_GROUPS}}


def call_key(week, gid, pid):
    return f'{SEASON}|{int(week):02d}|{gid}|{pid}'


# ------------------------------------------------------------------------------------------------ the payload
def sched_map(pay):
    return {g['id']: g for g in (pay.get('sched') or []) if isinstance(g, dict) and isinstance(g.get('id'), str)}


def scored(g):
    def num(v):
        return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)
    return bool(g) and num(g.get('hs')) and num(g.get('as'))


def espn_entries(pay):
    E = pay.get('espn')
    if not (isinstance(E, dict) and E.get('v') == 1 and isinstance(E.get('games'), dict)):
        return {}
    return {k: v for k, v in E['games'].items() if isinstance(v, dict)}


def pl_block(e):
    pl = e.get('pl') if isinstance(e, dict) else None
    return pl if isinstance(pl, dict) and isinstance(pl.get('td'), list) else None


def callable_games(pay, at):
    """the games of the published read whose touchdown lists a run at `at` calls: on the schedule in the entry's own
    week, no score, a player block dated before kickoff with someone on its list (the page reader's filter), and a
    kickoff more than CALL_MARGIN after `at`. {gid: (schedule game, kickoff)}"""
    sched, out = sched_map(pay), {}
    for gid, e in espn_entries(pay).items():
        g = sched.get(gid)
        if not g or str(g.get('w')) != str(e.get('w')) or scored(g):
            continue
        k = ko(g)
        if k is None or k <= at + CALL_MARGIN:
            continue
        pl = pl_block(e)
        if not pl or not any(isinstance(x, str) for x in pl['td']):
            continue
        try:
            pat = parse_t(pl.get('at'))
        except (TypeError, ValueError):
            continue
        if pat is None or pat >= k:
            continue
        out[gid] = (g, k)
    return out


def withdrawn_after(e, read_at):
    """the game's published read says DraftKings posted no player lines, read after `read_at` (its block dropped)"""
    if not isinstance(e, dict) or pl_block(e):
        return False
    o = e.get('out')
    if not isinstance(o, dict) or o.get('st') != 'none':
        return False
    try:
        t, r = parse_t(o.get('at')), parse_t(read_at)
    except (TypeError, ValueError):
        return False
    return t is not None and (r is None or t > r)


def season_done(pay):
    """every 2026 regular-season game on the schedule has its score"""
    gs = [g for g in sched_map(pay).values() if str(g['id']).startswith(f'{SEASON}_')]
    return bool(gs) and all(scored(g) for g in gs)


def earliest_kickoff(c, sched):
    k = parse_t(c['kickoff'])
    g = sched.get(c['game_id'])
    s = ko(g) if g else None
    return min(k, s) if s else k


def moved(c, sched):
    """the call's game left the schedule, or kicks off more than MOVED from the call's kickoff"""
    g = sched.get(c['game_id'])
    s = ko(g) if g else None
    return s is None or abs(s - parse_t(c['kickoff'])) > MOVED


# --------------------------------------------------------------------------------------- summary and decision
_OS = None


def os_module():
    """oneshot_2026 (numpy and pandas; no lightgbm, no scipy), loaded only where a number is worked"""
    global _OS
    if _OS is None:
        _OS = load()
    return _OS


def in_sample(calls):
    """the decision's sample in grading order (BAR's 'sample'): frozen calls graded td or no_td that have p and m, m
    not priced on the model alone (branch real, lined or backup), by graded_at, kickoff, game id, player id.
    [(key, call)]"""
    S = [(k, c) for k, c in calls.items()
         if c.get('frozen') and c.get('grade') and c['grade'].get('result') in ('td', 'no_td')
         and c.get('p') is not None and c.get('m') is not None and c.get('branch') in SAMPLE_BRANCHES]
    return sorted(S, key=lambda kc: (kc[1]['grade']['graded_at'], kc[1]['kickoff'], kc[1]['game_id'], kc[1]['pid']))


def _arrays(rows):
    import numpy as np
    y = np.array([1.0 if c['grade']['result'] == 'td' else 0.0 for c in rows])
    p = np.array([float(c['p']) for c in rows])
    m = np.array([float(c['m']) for c in rows])
    g = np.array([c['game_id'] for c in rows])
    return y, p, m, g


def _r6(x):
    return None if x is None else round(float(x), 6)


def _cell(rows, OS):
    """description of a slice: its calls, those graded td or no_td with p and m, their touchdowns, means and T1's
    point estimate (mean ll(b) - ll(m))"""
    G = [c for c in rows if c.get('grade') and c['grade'].get('result') in ('td', 'no_td')
         and c.get('p') is not None and c.get('m') is not None]
    out = {'calls': len(rows), 'graded': len(G), 'td': sum(1 for c in G if c['grade']['result'] == 'td'),
           'mean_p': None, 'mean_m': None, 'T1': None}
    if G:
        y, p, m, _ = _arrays(G)
        b = m + BAR['w'] * (p - m)
        out.update(mean_p=_r6(p.mean()), mean_m=_r6(m.mean()), T1=_r6((OS.ll(b, y) - OS.ll(m, y)).mean()))
    return out


def _running(rows, OS):
    """the running point estimates on the sample (never an interval): null below 100 calls or 10 touchdowns"""
    if len(rows) < RUNNING_MIN_N or sum(1 for c in rows if c['grade']['result'] == 'td') < RUNNING_MIN_TD:
        return None
    import numpy as np
    y, p, m, g = _arrays(rows)
    b = m + BAR['w'] * (p - m)
    llm, llb, llp = OS.ll(m, y), OS.ll(b, y), OS.ll(p, y)
    X = np.column_stack([np.ones(len(y)), OS.logit(m), OS.logit(p) - OS.logit(m)])
    est = OS.logistic(X, y)
    return {'n': len(rows), 'games': len(set(g.tolist())), 'td_rate': _r6(y.mean()), 'mean_p': _r6(p.mean()),
            'mean_m': _r6(m.mean()), 'mean_b': _r6(b.mean()),
            'logloss': {'m': _r6(llm.mean()), 'b': _r6(llb.mean()), 'p': _r6(llp.mean())},
            'T1': _r6((llb - llm).mean()), 'T2': {'alpha': _r6(est[0]), 'gamma': _r6(est[1]), 'beta': _r6(est[2])}}


def _count(values):
    out = {}
    for v in values:
        out[str(v)] = out.get(str(v), 0) + 1
    return dict(sorted(out.items()))


def summarize(calls, decision=None, runs=None, season_over=False):
    """the ledger's summary: a function of the calls, the decision, the runs (each call's page build) and whether the
    regular season is over, worked the same way by the run and by the check. Floats to 6 places, here only"""
    cs = [calls[k] for k in sorted(calls)]
    graded = [c for c in cs if c.get('grade')]
    S = in_sample(calls)
    rows = [c for _, c in S]
    need = any(c.get('grade') and c['grade'].get('result') in ('td', 'no_td') and c.get('p') is not None
               and c.get('m') is not None for c in cs)
    OS = os_module() if need else None
    vs = {'agree': 0, 'void_site_graded': 0, 'graded_site_void': 0, 'td_differs': 0, 'site_pending_or_unread': 0}
    for c in graded:
        r, s = c['grade']['result'], (c['grade'].get('site') or {}).get('result')
        if s in (None, 'pending'):
            vs['site_pending_or_unread'] += 1
        elif s == r:
            vs['agree'] += 1
        elif r == 'void':
            vs['void_site_graded'] += 1
        elif s == 'void':
            vs['graded_site_void'] += 1
        else:
            vs['td_differs'] += 1
    ev = lambda c, k: ((c['grade'].get('evidence') or {}).get(k))   # noqa: E731
    weeks = sorted({c['week'] for c in rows})
    per_week = len(rows) / len(weeks) if weeks else None
    builds = {}
    for c in rows:
        b = (((runs or {}).get(c['called_at']) or {}).get('page') or {}).get('app_build') or 'unknown'
        builds[b] = builds.get(b, 0) + 1
    if decision:
        standing = f"decided at 2,000 on {decision['decided_at'][:10]}: {decision['verdict']}"
    elif season_over and cs and all(c.get('frozen') and c.get('grade') for c in cs):
        standing = (f"undecided: 2026's regular season ended with {len(rows):,} of 2,000 graded calls in the sample, "
                    "which is not a PASS; the model is not used")
    else:
        standing = f"{len(rows):,} of 2,000 graded calls toward the verdict; the bar is judged at 2,000, not before"
    return {
        'calls': len(cs), 'to_come': sum(1 for c in cs if not c.get('frozen')),
        'frozen': sum(1 for c in cs if c.get('frozen')),
        'frozen_awaiting_grade': sum(1 for c in cs if c.get('frozen') and not c.get('grade')),
        'with_p': sum(1 for c in cs if c.get('p') is not None), 'with_m': sum(1 for c in cs if c.get('m') is not None),
        'with_both': sum(1 for c in cs if c.get('p') is not None and c.get('m') is not None),
        'null_why': {'p': _count(c.get('p_why') for c in cs if c.get('p') is None),
                     'm': _count(c.get('m_why') for c in cs if c.get('m') is None)},
        'graded': {'td': sum(1 for c in graded if c['grade']['result'] == 'td'),
                   'no_td': sum(1 for c in graded if c['grade']['result'] == 'no_td'),
                   'void': {h: sum(1 for c in graded if c['grade']['result'] == 'void' and c['grade'].get('how') == h)
                            for h in VOID_HOW}},
        'graded_on_zero': sum(1 for c in graded if c['grade']['result'] == 'no_td' and ev(c, 'stat_row') == 0),
        'return_tds_not_counted': sum(1 for c in graded if (ev(c, 'y_special_teams_tds') or 0) > 0),
        'vs_site': vs,
        'in_sample': len(rows), 'of': SAMPLE_N,
        'running': _running(rows, OS) if OS else None,
        'by_branch': {b: _cell([c for c in cs if c.get('branch') == b], OS) for b in BRANCHES},
        'by_group': {g: _cell([c for c in cs if (c.get('grp') if c.get('grp') in TD_GROUPS else 'other') == g], OS)
                     for g in TD_GROUPS + ('other',)},
        'by_shown': {s: _cell([c for c in cs if (c.get('shown') or 'none') == s], OS) for s in SHOWN + ('none',)},
        'by_app_build': dict(sorted(builds.items())),
        'pace': {'per_week': None if per_week is None else round(per_week, 1),
                 'projected_at_season_end': None if per_week is None else
                 int(round(len(rows) + per_week * max(0, LAST_WEEK - weeks[-1])))},
        'standing': standing,
    }


def decide(calls, at, md=None, st=None):
    """the decision, once there are 2,000 in the sample (None before): T1 and T2 on the first 2,000 in grading order,
    by the one-shot's own mean_diff and signal_test (their 10,000 game resamples, default_rng(0), 90%), with b = m +
    0.25 (p - m) and one stratum. md and st stand in for them in tests alone"""
    S = in_sample(calls)
    if len(S) < SAMPLE_N:
        return None
    OS = os_module()
    md, st = md or OS.mean_diff, st or OS.signal_test
    S = S[:SAMPLE_N]
    y, p, m, g = _arrays([c for _, c in S])
    b = m + BAR['w'] * (p - m)
    T1 = md(OS.ll(b, y) - OS.ll(m, y), g)
    T2 = st(y, m, p, g, ['all'] * len(S))
    crit = {'T1': bool(T1['hi'] < 0), 'T2': bool(T2['lo'] > 0)}
    return {'verdict': 'PASS' if crit['T1'] and crit['T2'] else 'FAIL', 'decided_at': iso(at), 'n': len(S),
            'games': len(set(g.tolist())), 'T1': T1, 'T2': T2, 'criteria': crit, 'sample': [k for k, _ in S]}


# ------------------------------------------------------------------------------------------------ problems
class Problems:
    """the run's problem lines, one a line under its class (REFUSED, DEGRADED, WARN), each appended to the problems
    file at once (so a step killed later still leaves what it said) and printed"""

    def __init__(self, path=None):
        self.path, self.lines = path, []

    def add(self, cls, msg):
        assert cls in PROBLEM_CLASSES, cls
        line = f'{cls}: ' + ' '.join(str(msg).split())
        if line in self.lines:
            return
        self.lines.append(line)
        print(line, flush=True)
        if self.path:
            os.makedirs(os.path.dirname(os.path.abspath(self.path)), exist_ok=True)
            with open(self.path, 'a', encoding='utf-8') as f:
                f.write(line + '\n')

    def has(self, cls):
        return any(x.startswith(cls + ':') for x in self.lines)


# ------------------------------------------------------------------------------------------------ the guard
def load():
    """oneshot_2026 as registered (it imports fetch, build_features and predict), with the holdout as fetch.py fixes
    it on import. Refused first where the one-shot's variable is set (fetch.py's import would stop the process
    anyway; this says why) or where build_features.py would write its candidate dump."""
    if os.environ.get('PROPMODEL_LIFT_HOLDOUT'):
        raise Refused("PROPMODEL_LIFT_HOLDOUT is set: it lifts the holdout for oneshot_2026.py alone; unset it")
    if os.environ.get('PROPMODEL_DUMP_CANDIDATES'):
        raise Refused('PROPMODEL_DUMP_CANDIDATES is set: build_features.py would write a file of its own; unset it')
    if HERE not in sys.path:
        sys.path.insert(0, HERE)
    import oneshot_2026 as OS   # noqa: E402  (numpy and pandas load here, never at this file's top)
    return OS


def guard_code(OS, need_313=True, versions=True):
    """every hash check (PLAN: the guard's 2 to 5): the modules as loaded are this folder's files with BAR's hashes,
    the manifest and the pins too, PREREGISTRATION.md lists exactly BAR's hashes and is itself BAR's, the one-shot's
    result is BAR's and passed the anytime touchdown, the libraries are the pinned five (on 3.13 for a real run), and
    the holdout stands at 2026 as imported. Nothing reads git: the props job's checkout is one commit deep. versions
    False (a TD_SHADOW_STUB test alone) leaves the pins and Python unchecked, never a hash."""
    runs = BAR['registered_with']['runs']
    bad = []
    for mod, name in ((OS.F, 'fetch.py'), (OS.B, 'build_features.py'), (OS.PR, 'predict.py'), (OS, 'oneshot_2026.py')):
        fp = os.path.realpath(getattr(mod, '__file__', '') or '')
        if fp != os.path.realpath(os.path.join(HERE, name)) or sha256_file(fp) != runs[f'{REL}/{name}']:
            bad.append(f'{name} as loaded ({fp})')
    for name in ('frozen/MANIFEST.json', 'requirements.txt'):
        p = os.path.join(HERE, name)
        if not os.path.exists(p) or sha256_file(p) != runs[f'{REL}/{name}']:
            bad.append(name)
    if os.path.realpath(OS.PR.MANIFEST) != os.path.realpath(os.path.join(HERE, 'frozen', 'MANIFEST.json')):
        bad.append(f'predict.py reads another manifest ({OS.PR.MANIFEST})')
    if not os.path.exists(PREREG) or sha256_file(PREREG) != BAR['registered_with']['preregistration_sha256']:
        bad.append('PREREGISTRATION.md')
    else:
        reg = OS.registered(PREREG)
        bad += [f'PREREGISTRATION.md does not register {p} as BAR does' for p, h in runs.items() if reg.get(p) != h]
    if bad:
        raise Refused(f'not the registered bytes: {bad}')
    if not os.path.exists(RESULT) or sha256_file(RESULT) != BAR['registered_with']['oneshot_sha256']:
        raise Refused('results/oneshot_2026.json is not the one-shot result BAR names')
    with open(RESULT, encoding='utf-8') as f:
        if (json.load(f).get('verdict') or {}).get('anytime_td') != 'PASS':
            raise Refused('the one-shot did not pass the anytime touchdown: there is no touchdown shadow')
    if versions:
        try:
            OS.check_versions()
        except SystemExit as e:
            raise Refused(str(e)) from None
    if need_313 and sys.version_info[:2] != (3, 13):
        raise Refused(f'Python {sys.version.split()[0]}: the model runs on 3.13 (requirements.txt)')
    if not (OS.F.HOLDOUT_FROM == OS.B.HOLDOUT_FROM == SEASON):
        raise Refused(f'the holdout is not 2026 as imported (fetch {OS.F.HOLDOUT_FROM}, build_features {OS.B.HOLDOUT_FROM})')


@contextlib.contextmanager
def lifted(OS):
    """the holdout lifted to 2027 in this process alone, the state oneshot_2026.py ran in, and put back after (the
    module docstring argues it). Used only for 2026's staging, p and grades and by td_shadow_equiv.py."""
    F, B = OS.F, OS.B
    if not (F.HOLDOUT_FROM == B.HOLDOUT_FROM == SEASON):
        raise Refused(f'the holdout is not 2026 before the lift (fetch {F.HOLDOUT_FROM}, build_features {B.HOLDOUT_FROM})')
    F.HOLDOUT_FROM = B.HOLDOUT_FROM = SEASON + 1
    try:
        yield OS
    finally:
        F.HOLDOUT_FROM = B.HOLDOUT_FROM = SEASON


# ------------------------------------------------------------------------------------------------------ p
def make_predictor(OS, data):
    """the frozen models as oneshot_2026.main loads them: DATA/frozen where it holds them, else the repo's gzipped
    copies, every file held to frozen/MANIFEST.json"""
    return OS.PR.Predictor(models_dir=os.path.join(data, 'frozen'))


def predict_week(OS, data, season, week, predictor):
    """week W's candidate rows (predict mode, nothing downloaded) and the predictions on them. Returns the any_td
    predictions, the candidate rows' identity, the build's summary and the timings; `rows` and `pred` too, which a
    caller drops (`del`) before the grading build"""
    t0 = time.time()
    rows, summ = OS.PR.week_rows(data, season, week, fetch=False)
    t1 = time.time()
    pred = predictor.predict_rows(rows)
    t2 = time.time()
    td = pred[pred.stat == 'any_td'][['game_id', 'pid', 'grp', 'team', 'cand_src', 'p_ge1', 'params']].reset_index(drop=True)
    cands = rows[['game_id', 'pid', 'grp', 'team', 'cand_src', 'kickoff_utc']].reset_index(drop=True)
    return {'season': season, 'week': week, 'td': td, 'cands': cands, 'rows': rows, 'pred': pred,
            'summary': {k: summ.get(k) for k in ('candidates_by_src', 'roster_carried', 'snaps', 'rows_without_game', 'rows')},
            'seconds': {'week_rows': round(t1 - t0, 1), 'predict_rows': round(t2 - t1, 1)},
            'models_source': dict(predictor.sources)}


def p_from_pred(OS, wk, keys):
    """p for each (game id, player id) called: clip(p_ge1, 0.001, 0.999) on his candidate row in that game, as the
    one-shot made it, at full precision, with lambda (from the prediction's parameters), his group and how he became
    a candidate; else none with why: no candidate row that week, a candidate row in another game (traded since the
    listing), or a group the touchdown models do not cover"""
    import numpy as np
    td, cands = wk['td'], wk['cands']
    if td.duplicated(['game_id', 'pid']).any():
        raise ValueError('two any_td predictions for one player and game: predict.py made two candidate rows')
    p = np.clip(td.p_ge1.values.astype(float), *OS.CLIP)
    by_game = {(g, q): i for i, (g, q) in enumerate(zip(td.game_id, td.pid))}
    cand_game = {}
    for g, q, grp, src in zip(cands.game_id, cands.pid, cands.grp, cands.cand_src):
        cand_game.setdefault(q, {})[g] = (grp, src)
    out = {}
    for gid, pid in keys:
        i = by_game.get((gid, pid))
        if i is not None:
            out[(gid, pid)] = {'p': float(p[i]), 'lam': json.loads(td.params[i])['lam'], 'grp': td.grp[i],
                               'cand_src': td.cand_src[i], 'p_why': None}
            continue
        mine = cand_game.get(pid) or {}
        if gid in mine:
            grp, src = mine[gid]
            why = 'group not covered'
        elif mine:
            grp, src = next(iter(mine.values()))
            why = 'candidate in another game'
        else:
            grp = src = None
            why = 'no candidate row'
        out[(gid, pid)] = {'p': None, 'lam': None, 'grp': grp, 'cand_src': src, 'p_why': why}
    return out


def in_players_csv(data, pids):
    """description: whether each gsis id is in the frozen players.csv (a signing after 27 October 2026 is not, so his
    age and draft features are missing, the frozen file's own limit, reported and never patched)"""
    import pandas as pd
    have = set(pd.read_csv(os.path.join(data, 'raw', 'players.csv'), usecols=['gsis_id']).gsis_id.dropna())
    return {pid: pid in have for pid in pids}


def game_coverage(OS, data, season, week, gids):
    """per game: each club's last regular-season game of `season` with both scores before week W must be complete
    by the one-shot's rule (oneshot_2026.coverage on weeks 1 to W-1: stats and snap counts of both clubs, its
    play-by-play and both clubs' weekly roster); a game whose clubs' previous games are not gets the reason, every
    other game is called. Returns ({gid: None or reason}, the season-wide coverage, the older holes: games missing
    something that are no called club's previous game)"""
    import pandas as pd
    cov = OS.coverage(data, season, range(1, week))
    g = pd.read_csv(OS.F.games_path(data), usecols=['game_id', 'season', 'game_type', 'week', 'away_team',
                                                     'home_team', 'away_score', 'home_score'], low_memory=False)
    g = g[(g.season == season) & (g.game_type == 'REG')]
    played = g[(g.week < week) & g.home_score.notna() & g.away_score.notna()].sort_values(['week', 'game_id'])
    last = {}
    for r in played.itertuples(index=False):
        last[r.home_team] = r.game_id
        last[r.away_team] = r.game_id
    clubs = {r.game_id: (r.away_team, r.home_team) for r in g.itertuples(index=False)}
    miss = {}
    for e in cov['missing']:
        miss.setdefault(e.split(':', 1)[0], []).append(e)
    out, prev_used = {}, set()
    for gid in gids:
        if gid not in clubs:
            out[gid] = 'not on the schedule'
            continue
        prev = [last[t] for t in clubs[gid] if t in last]
        prev_used.update(prev)
        holes = [e for pg in dict.fromkeys(prev) for e in miss.get(pg, [])]
        out[gid] = ('history not complete: ' + '; '.join(holes)) if holes else None
    older = [e for pg, es in miss.items() if pg not in prev_used for e in es]
    return out, cov, older


# ---------------------------------------------------------------------------------------------- the grade
def grade_from_played(played, keys):
    """the registered reading of each (game id, player id): a row in the build's played rows (oneshot_2026.outcomes:
    a snap in his role or on special teams) is td where its rushing + receiving touchdowns are 1 or more, else no_td;
    no row is void (did not play). A played row with no touchdown count (never seen) leaves the call pending."""
    import math
    if played.duplicated(['game_id', 'pid']).any():
        raise ValueError('two played rows for one player and game')
    idx = {(g, q): i for i, (g, q) in enumerate(zip(played.game_id, played.pid))}
    cols = {c: played[c].values for c in EVIDENCE + ('y_any_td',)}
    out = {}
    for key in keys:
        i = idx.get(key)
        if i is None:
            out[key] = {'result': 'void', 'y': None, 'how': 'did not play', 'evidence': None}
            continue
        ev = {}
        for c in EVIDENCE:
            v = float(cols[c][i])
            ev[c] = None if math.isnan(v) else (int(v) if v == int(v) else v)
        yt = float(cols['y_any_td'][i])
        if math.isnan(yt):
            out[key] = {'result': None, 'y': None, 'how': 'played, with no touchdown count on his row', 'evidence': ev}
            continue
        out[key] = {'result': 'td' if yt >= 1 else 'no_td', 'y': 1 if yt >= 1 else 0, 'how': 'played', 'evidence': ev}
    return out


# ------------------------------------------------------------------------------------------------ the model
def _link_or_copy(src, dst):
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


class RealModel:
    """p and the grades by the registered code: the data staged in a directory of this run's own (2026 never cached),
    p for the call games inside lifted(), the played rows for the due games inside lifted()"""
    stub = None

    def __init__(self, OS, data, hist, props_raw, problems):
        self.OS, self.data, self.hist, self.props_raw, self.problems = OS, data, hist, props_raw, problems
        self.predictor = None

    def stage(self):
        """PLAN 5.2. The history: the two frozen inputs restored from the repo (held to the manifest, so a downloaded
        players.csv never stands in), then whatever 2010-2025 file the cache lacks downloaded through fetch.py with the
        holdout at 2026; hist_ok beside --data only when the history holds exactly the manifest's files. This run's
        data: hard links to the history, props/raw's 2026 files under the model's names, and inside lifted() games.csv
        cut to games_to2026.csv and fetch.py's download of what 2026 file is missing (its play-by-play and weekly
        roster)."""
        OS, F = self.OS, self.OS.F
        man = manifest()
        names = set(man['fitted_on']['raw_sha256'])
        hraw = os.path.join(self.hist, 'raw')
        os.makedirs(hraw, exist_ok=True)
        for fn in OS.FROZEN_INPUTS:
            p = os.path.join(hraw, fn)
            if os.path.exists(p):
                os.remove(p)
        try:
            OS.restore_inputs(self.hist, man)
        except SystemExit as e:
            raise RuntimeError(str(e)) from None
        before = set(os.listdir(hraw))
        try:
            F.fetch(self.hist, 2010, SEASON - 1, 2013)
        except SystemExit as e:
            raise RuntimeError(str(e)) from None
        have = set(os.listdir(hraw))
        hist = {'downloaded': len(have - before)}
        rvm = OS.raw_vs_manifest(self.hist, man)
        hist.update(same=rvm['same'], differ=rvm['differ'], missing=rvm['missing'], extra=sorted(have - names),
                    ok=have == names)
        if hist['ok']:
            write_text(os.path.join(os.path.dirname(os.path.abspath(self.data)), 'hist_ok'), 'ok\n')
        if os.path.exists(self.data):
            shutil.rmtree(self.data)
        raw = os.path.join(self.data, 'raw')
        os.makedirs(raw)
        for fn in sorted(have & names):
            _link_or_copy(os.path.join(hraw, fn), os.path.join(raw, fn))
        for src, dst, need in PROPS_RAW:
            sp = os.path.join(self.props_raw, src)
            if os.path.exists(sp) and os.path.getsize(sp) > 0:
                shutil.copy2(sp, os.path.join(raw, dst))
            elif need:
                raise RuntimeError(f'props/raw has no {src}')
        games = os.path.join(self.props_raw, 'games.csv')
        if not (os.path.exists(games) and os.path.getsize(games) > 0):
            raise RuntimeError('props/raw has no games.csv')
        with lifted(OS):
            try:
                F.cut_games(games, F.games_path(self.data))
                F.fetch(self.data, 2010, SEASON, 2013)
            except SystemExit as e:
                raise RuntimeError(str(e)) from None
        r26 = {}
        for fn in OS.raw_2026(self.data):
            p = os.path.join(raw, fn)
            r26[fn] = {'sha256': sha256_file(p), 'mtime': iso(datetime.fromtimestamp(os.path.getmtime(p), timezone.utc))}
        return {'raw_2026': r26, 'hist': hist}

    def predict(self, weeks_keys):
        """p for every (game id, player id) listed, week by week: per-game coverage first, predict mode only where
        some game of the week is covered, every number from the registered functions; the coverage reason replaces p
        where a game's clubs' previous games are not complete"""
        OS = self.OS
        if self.predictor is None:
            self.predictor = make_predictor(OS, self.data)
        out, weeks = {}, {}
        with lifted(OS):
            for W in sorted(weeks_keys):
                keys = weeks_keys[W]
                gids = sorted({g for g, _ in keys})
                cov_by_game, cov, older = game_coverage(OS, self.data, SEASON, W, gids)
                info = {'coverage': cov_by_game, 'coverage_missing': list(cov['missing']), 'older': older,
                        'predicted': False}
                pm = {}
                if any(cov_by_game[g] is None for g in gids):
                    wk = predict_week(OS, self.data, SEASON, W, self.predictor)
                    info.update(predicted=True, seconds=wk['seconds'], summary=wk['summary'])
                    pm = p_from_pred(OS, wk, keys)
                    del wk
                    gc.collect()
                inp = in_players_csv(self.data, sorted({q for _, q in keys}))
                for gid, pid in keys:
                    e = dict(pm.get((gid, pid)) or {'p': None, 'lam': None, 'grp': None, 'cand_src': None, 'p_why': None})
                    if cov_by_game[gid] is not None:
                        e.update(p=None, lam=None, p_why=cov_by_game[gid])
                    out[(gid, pid)] = {'p': None if e['p'] is None else float(e['p']),
                                       'lam': None if e['lam'] is None else float(e['lam']),
                                       'grp': None if e['grp'] is None else str(e['grp']),
                                       'cand_src': None if e['cand_src'] is None else str(e['cand_src']),
                                       'p_why': e['p_why'], 'in_players_csv': bool(inp.get(pid))}
                weeks[W] = info
        return {'p': out, 'weeks': weeks, 'models_source': dict(self.predictor.sources)}

    def grade(self, keys):
        """the registered reading of each due (game id, player id): each game's own files complete (a score on the
        schedule, and oneshot_2026.coverage with nothing missing for it), then one outcomes() build for the covered
        ones. ({game id: covered}, {(game id, player id): grade_from_played's reading})"""
        import pandas as pd
        OS = self.OS
        weeks = sorted({int(g.split('_')[1]) for g, _ in keys})
        gids = sorted({g for g, _ in keys})
        with lifted(OS):
            cov = OS.coverage(self.data, SEASON, weeks)
            gm = pd.read_csv(OS.F.games_path(self.data), usecols=['game_id', 'season', 'game_type', 'away_score',
                                                                  'home_score'], low_memory=False)
            gm = gm[(gm.season == SEASON) & (gm.game_type == 'REG') & gm.home_score.notna() & gm.away_score.notna()]
            played_games = set(gm.game_id)
            miss = {e.split(':', 1)[0] for e in cov['missing']}
            own = {g: (g in played_games and g not in miss) for g in gids}
            grades = {}
            todo = [k for k in keys if own[k[0]]]
            if todo:
                played = OS.outcomes(self.data, SEASON)
                grades = grade_from_played(played, todo)
                del played
                gc.collect()
        return own, grades


class StubModel:
    """TD_SHADOW_STUB: a JSON file standing in for the model in a test or a rehearsal of the mechanics, never in the
    props job. {"p": {"gid|pid": {p, lam, grp, cand_src, p_why}}, "p_rule": "hash" (p for anyone not listed, from a
    hash of the key), "coverage": {gid: reason}, "own_coverage": {gid: bool} (default true), "played": {"gid|pid":
    {y_any_td, stat_row, snap_row, ...}}, "in_players_csv": {pid: bool}, "fail": {"stage"|"predict"|"grade": true},
    "raw_2026": {...}}"""

    def __init__(self, path):
        with open(path, encoding='utf-8') as f:
            self.S = json.load(f)
        self.stub = sha256_file(path)

    def _fail(self, phase):
        if (self.S.get('fail') or {}).get(phase):
            raise RuntimeError(f'the stub fails {phase}')

    def stage(self):
        self._fail('stage')
        return {'raw_2026': self.S.get('raw_2026') or {},
                'hist': {'downloaded': 0, 'same': 89, 'differ': [], 'missing': [], 'extra': [], 'ok': True}}

    def predict(self, weeks_keys):
        self._fail('predict')
        out, weeks = {}, {}
        P, cov, inp = self.S.get('p') or {}, self.S.get('coverage') or {}, self.S.get('in_players_csv') or {}
        for W in sorted(weeks_keys):
            keys = weeks_keys[W]
            gids = sorted({g for g, _ in keys})
            weeks[W] = {'coverage': {g: cov.get(g) for g in gids}, 'coverage_missing': [], 'older': [],
                        'predicted': any(cov.get(g) is None for g in gids)}
            for gid, pid in keys:
                e = P.get(f'{gid}|{pid}')
                if e is None and self.S.get('p_rule') == 'hash':
                    h = int(hashlib.sha1(f'{gid}|{pid}'.encode()).hexdigest()[:8], 16) / 2 ** 32
                    p = 0.02 + 0.6 * h
                    e = {'p': p, 'lam': -math.log(1 - p), 'grp': None, 'cand_src': 'stub', 'p_why': None}
                e = dict(e or {'p': None, 'lam': None, 'grp': None, 'cand_src': None, 'p_why': 'no candidate row'})
                if cov.get(gid) is not None:
                    e.update(p=None, lam=None, p_why=cov[gid])
                out[(gid, pid)] = {'p': e.get('p'), 'lam': e.get('lam'), 'grp': e.get('grp'),
                                   'cand_src': e.get('cand_src'), 'p_why': e.get('p_why'),
                                   'in_players_csv': bool(inp.get(pid, True))}
        return {'p': out, 'weeks': weeks, 'models_source': {'stub': 1}}

    def grade(self, keys):
        self._fail('grade')
        own_cov, played = self.S.get('own_coverage') or {}, self.S.get('played') or {}
        own = {g: bool(own_cov.get(g, True)) for g, _ in keys}
        out = {}
        for gid, pid in keys:
            if not own[gid]:
                continue
            r = played.get(f'{gid}|{pid}')
            if r is None:
                out[(gid, pid)] = {'result': 'void', 'y': None, 'how': 'did not play', 'evidence': None}
                continue
            ev = {c: r.get(c) for c in EVIDENCE}
            yt = r.get('y_any_td')
            out[(gid, pid)] = ({'result': None, 'y': None, 'how': 'played, with no touchdown count on his row',
                                'evidence': ev} if yt is None else
                               {'result': 'td' if yt >= 1 else 'no_td', 'y': 1 if yt >= 1 else 0, 'how': 'played',
                                'evidence': ev})
        return own, out


# ------------------------------------------------------------------------------------------------ one run
def page_check(page, pay, pay_sha, now, sched):
    """(ok, why): page.json is the reader's, read on this payload at this run's --now, its kickoffs the schedule's
    (zoneinfo against the page's own Eastern rule) and its lists its players"""
    if page is None:
        return False, 'no page.json'
    if not isinstance(page, dict) or page.get('v') != 1 or not isinstance(page.get('games'), dict):
        return False, "page.json is not the page reader's"
    if page.get('payload_sha256') != pay_sha or page.get('baked_at') != pay.get('baked_at'):
        return False, 'page.json was read on another payload'
    try:
        if norm_t(page.get('now')) != iso(now):
            return False, f"page.json was read at {page.get('now')}, not this run's {iso(now)}"
    except (TypeError, ValueError):
        return False, 'page.json has no time'
    for gid, G in page['games'].items():
        g = sched.get(gid)
        k = ko(g) if g else None
        try:
            pk = norm_t(G.get('kickoff'))
        except (TypeError, ValueError, AttributeError):
            pk = None
        if k is None or pk != iso(k):
            return False, f"the page's kickoff of {gid} ({G.get('kickoff')}) is not the schedule's ({k and iso(k)})"
        if not isinstance(G.get('td'), list) or set(G['td']) != set(G.get('players') or {}):
            return False, f"page.json's list of {gid} is not its players"
    return True, None


def read_unplaced(props_raw, pay):
    """the athletes the page's reader could not place, per game, from this run's ESPN read (props/raw/espn/read.json
    where it is the read the payload published): description, never called"""
    p = os.path.join(props_raw or '', 'espn', 'read.json')
    try:
        with open(p, encoding='utf-8') as f:
            r = json.load(f)
        if r.get('read_at') != ((pay.get('espn') or {}).get('read_at')):
            return {}
        out = {}
        for gid, e in (r.get('games') or {}).items():
            c = (e or {}).get('counts') or {}
            if isinstance(c.get('athletes'), int) and isinstance(c.get('placed'), int):
                out[gid] = c['athletes'] - c['placed']
        return dict(sorted(out.items()))
    except (OSError, ValueError, AttributeError, TypeError):
        return {}


def update(L, pay, pay_sha, page, model, now, problems, clock, props_raw=None):
    """one run on the ledger L (a copy is changed): (the new ledger, evidence.json's object). `clock(now)` gives the
    run's time once p and m are in hand; every rule below reads that one time"""
    t0 = time.time()
    L = json.loads(json.dumps(L))
    calls = L['calls']
    sched, E = sched_map(pay), espn_entries(pay)
    failed = (L.get('decision') or {}).get('verdict') == 'FAIL'
    ev = {'v': 1, 'now': iso(now), 'run_at': None, 'payload_sha256': pay_sha, 'stub': model.stub,
          'phases': {'page': None, 'stage': 'skipped', 'predict': 'skipped', 'calls': 'skipped', 'grade': 'skipped'},
          'weeks': {}, 'p': {}, 'called': [], 'own_coverage': {}, 'grades': {}, 'pending': {}, 'raw_2026': {},
          'hist': None, 'models_source': None}

    # the page, and what this run has to call
    page_ok, page_why = page_check(page, pay, pay_sha, now, sched)
    ev['phases']['page'] = 'ok' if page_ok else page_why
    if page is not None and not page_ok:
        problems.add('DEGRADED', f'page.json cannot be used ({page_why}): no call this run')
    want = {} if failed else callable_games(pay, now)
    if want and page is None:
        problems.add('DEGRADED', 'the page was not read: no call this run')
    unread = sorted(g for g in want if page_ok and g not in page['games'])
    if unread:
        problems.add('DEGRADED', f"the page did not read {len(unread)} game(s) the payload lists to call "
                                 f"({', '.join(unread[:3])}): no call this run")
    to_call = sorted(want) if (want and page_ok and not unread) else []
    due_soon = any(not c.get('grade') and now >= parse_t(c['kickoff']) + GRADE_AFTER
                   and not moved(c, sched) for c in calls.values())

    staged = False
    if to_call or due_soon:
        try:
            info = model.stage()
            staged = True
            ev['phases']['stage'] = 'ok'
            ev['raw_2026'], ev['hist'] = info['raw_2026'], info['hist']
        except (Exception, SystemExit) as e:   # noqa: BLE001 -- predict.py and build_features.py stop with
            # SystemExit (a missing file, a model file off its hash, a feature the rows lack): only the phases
            # that need the data are skipped
            ev['phases']['stage'] = 'failed'
            problems.add('DEGRADED', f'the data could not be staged ({e!r:.300}): no call or grade this run')
    pinfo = None
    if to_call and staged:
        weeks_keys = {}
        for gid in to_call:
            G = page['games'][gid]
            weeks_keys.setdefault(int(sched[gid]['w']), []).extend((gid, pid) for pid in G['td'])
        try:
            pinfo = model.predict(weeks_keys)
            ev['phases']['predict'] = 'ok'
            ev['models_source'] = pinfo.get('models_source')
            for W, info in pinfo['weeks'].items():
                ev['weeks'][str(W)] = info
                if (info.get('seconds') or {}).get('week_rows', 0) > WEEK_ROWS_WARN_S:
                    problems.add('WARN', f"week_rows took {info['seconds']['week_rows']:.0f} s for week {W} "
                                         f'(more than {WEEK_ROWS_WARN_S // 60} minutes)')
                if info.get('older'):
                    problems.add('WARN', f"the history has older holes ({len(info['older'])}: "
                                         f"{'; '.join(info['older'][:3])})")
            ev['p'] = {f'{g}|{q}': v for (g, q), v in sorted(pinfo['p'].items())}
        except (Exception, SystemExit) as e:   # noqa: BLE001
            pinfo = None
            ev['phases']['predict'] = 'failed'
            problems.add('DEGRADED', f'p could not be made ({e!r:.300}): no call this run')

    # one clock from here
    run_at = clock(now)
    if L.get('run_at') and run_at <= parse_t(L['run_at']):
        raise Refused(f"this run's clock {iso(run_at)} is not after the ledger's last run {L['run_at']}")
    ra = iso(run_at)
    ev['run_at'] = ra
    counts = {'made': 0, 'rewritten': 0, 'kept': 0, 'dropped': 0, 'frozen': 0, 'graded': 0}

    # freeze: the first run at or after the earlier kickoff, or a score
    froze = []
    for k, c in calls.items():
        if not c['frozen']:
            g = sched.get(c['game_id'])
            if run_at >= earliest_kickoff(c, sched) or scored(g):
                c['frozen'], c['frozen_at'] = True, ra
                froze.append(k)
    counts['frozen'] = len(froze)
    stale = {}
    for k in froze:
        c = calls[k]
        gid, kick = c['game_id'], earliest_kickoff(c, sched)
        if gid in stale:
            continue
        seen = sorted(t for t, r in (L.get('runs') or {}).items() if gid in (r.get('games') or {}) and parse_t(t) < kick)
        if not seen:
            stale[gid] = 'no run read its list before kickoff'
        elif kick - parse_t(seen[-1]) > STALE_FREEZE:
            stale[gid] = f'its last call run was {(kick - parse_t(seen[-1])).total_seconds() / 3600:.0f} h before kickoff'
        else:
            rd = L['runs'][seen[-1]]['games'][gid]
            if rd and kick - parse_t(rd) > STALE_FREEZE:
                stale[gid] = f'the read its calls stand on was {(kick - parse_t(rd)).total_seconds() / 3600:.0f} h old at kickoff'
    for gid, why in sorted(stale.items()):
        problems.add('WARN', f'{gid} froze stale: {why}')

    # drops, then the calls
    def drop(key):
        del calls[key]
        counts['dropped'] += 1
    if failed:
        for k in [k for k, c in calls.items() if not c['frozen']]:
            drop(k)
    else:
        for k in [k for k, c in calls.items() if not c['frozen']]:
            c = calls[k]
            g = sched.get(c['game_id'])
            if g is None or int(g.get('w') or 0) != c['week'] or withdrawn_after(E.get(c['game_id']), c['read_at']):
                drop(k)
    games_read, listed, m_null, p_null = {}, 0, 0, 0
    if pinfo is not None:
        ev['phases']['calls'] = 'made'
        for gid in sorted(page['games']):
            G, g = page['games'][gid], sched[gid]
            if not ko(g) > run_at + CALL_MARGIN:
                continue
            if G['td'] and gid not in to_call:
                problems.add('WARN', f'the page read {gid} with a list the payload does not offer to call: not called')
                continue
            W, read_at = int(g['w']), norm_t(G.get('read_at'))
            games_read[gid] = read_at
            for pid in G['td']:
                pr, pp = G['players'][pid], pinfo['p'].get((gid, pid))
                if pp is None:
                    raise RuntimeError(f'no p entry for {gid} {pid}: the page read a game p was not made for')
                listed += 1
                m_null += pr.get('m') is None
                p_null += pp['p'] is None and not str(pp['p_why'] or '').startswith(COVERAGE_WHY)
                new = {'season': SEASON, 'week': W, 'game_id': gid, 'pid': pid, 'name': pr.get('name'),
                       'team': pr.get('team'), 'grp': pp['grp'] if pp['grp'] else pr.get('grp'),
                       'kickoff': iso(ko(g)), 'read_at': read_at,
                       'p': pp['p'], 'lam': pp['lam'], 'cand_src': pp['cand_src'],
                       'in_players_csv': pp['in_players_csv'], 'p_why': pp['p_why'],
                       **{f: pr.get(f) for f in M_FIELDS if f not in ('name', 'team')},
                       'called_at': ra, 'frozen': False, 'frozen_at': None, 'grade': None}
                new = {f: new[f] for f in CALL_KEYS}
                key = call_key(W, gid, pid)
                old = calls.get(key)
                if old is None:
                    calls[key] = new
                    counts['made'] += 1
                elif old['frozen'] or all(old[f] == new[f] for f in CALL_FIELDS):
                    counts['kept'] += 1
                else:
                    for f in CALL_FIELDS + ('name', 'read_at', 'in_players_csv', 'called_at'):
                        old[f] = new[f]
                    counts['rewritten'] += 1
            here = set(G['td'])
            for k in [k for k, c in calls.items() if c['game_id'] == gid and not c['frozen'] and c['pid'] not in here]:
                drop(k)
        ev['called'] = sorted(games_read)
        if listed and m_null / listed > M_NULL_WARN:
            problems.add('WARN', f'{m_null} of {listed} listed players have no m this run (more than {M_NULL_WARN:.0%})')
        if listed and p_null / listed > P_NULL_WARN:
            problems.add('WARN', f'{p_null} of {listed} listed players have no p this run for a reason other than '
                                 f'coverage (more than {P_NULL_WARN:.0%})')

    # grades: frozen calls 96 hours past kickoff, on the game's own files
    site = (page.get('site') or {}) if page_ok else {}
    due = sorted(k for k, c in calls.items() if c['frozen'] and not c.get('grade')
                 and run_at >= parse_t(c['kickoff']) + GRADE_AFTER)

    def grade(k, g):
        calls[k]['grade'] = {'result': g['result'], 'y': g['y'], 'how': g['how'], 'evidence': g['evidence'],
                             'site': site.get(k) if isinstance(site.get(k), dict) else None, 'graded_at': ra}
        ev['grades'][k] = {f: g[f] for f in ('result', 'y', 'how', 'evidence')}
        counts['graded'] += 1
    build = []
    for k in due:
        if moved(calls[k], sched):
            grade(k, {'result': 'void', 'y': None, 'how': 'game moved', 'evidence': None})
        else:
            build.append(k)
    if build and staged:
        try:
            own, got = model.grade(sorted({(calls[k]['game_id'], calls[k]['pid']) for k in build}))
            ev['phases']['grade'] = 'ok'
            ev['own_coverage'] = {g: bool(v) for g, v in sorted(own.items())}
            for k in build:
                c = calls[k]
                if not own.get(c['game_id']):
                    if run_at >= parse_t(c['kickoff']) + NEVER_COMPLETE:
                        grade(k, {'result': 'void', 'y': None, 'how': 'files never complete', 'evidence': None})
                    continue
                g = got.get((c['game_id'], c['pid']))
                if g and g.get('result'):
                    grade(k, g)
                elif g:
                    ev['pending'][k] = g.get('how')
        except (Exception, SystemExit) as e:   # noqa: BLE001
            ev['phases']['grade'] = 'failed'
            problems.add('DEGRADED', f'the grading build failed ({e!r:.300}): no grade this run')
    elif build:
        ev['phases']['grade'] = 'not staged'
    over = [k for k, c in calls.items() if c['frozen'] and not c.get('grade') and run_at > parse_t(c['kickoff']) + OVERDUE]
    if over:
        problems.add('WARN', f'{len(over)} frozen call(s) still ungraded more than {OVERDUE.total_seconds() / 3600:.0f} h '
                             f'past kickoff (e.g. {over[0]})')

    # the decision, once
    if L.get('decision') is None:
        L['decision'] = decide(calls, run_at)

    # the run's entry, the runs kept, the summary
    prev_runs = L.get('runs') or {}
    last = prev_runs[max(prev_runs)] if prev_runs else None
    hist = ev['hist']
    if hist and hist.get('downloaded') and last and ((last.get('hist') or {}).get('downloaded') or 0) > 0:
        problems.add('WARN', 'the 2010-2025 history was downloaded again on two runs in a row: its cache is not holding')
    entry = {'payload_baked_at': pay.get('baked_at'), 'payload_sha256': pay_sha,
             'page': (page.get('page') if page_ok else None), 'page_now': (page.get('now') if page_ok else None),
             'weeks': sorted(int(w) for w in ev['weeks']), 'raw_2026': {fn: v['sha256'] for fn, v in ev['raw_2026'].items()},
             'hist': hist, 'python': platform.python_version(), 'libs': None, 'models_source': ev['models_source'],
             'coverage_missing': sorted({e for w in ev['weeks'].values() for e in w.get('coverage_missing', [])}),
             'games': games_read, 'unplaced': read_unplaced(props_raw, pay), 'counts': counts,
             'phases': dict(ev['phases']), 'seconds': None, 'rss_gb': None, 'problems': None}
    if model.stub:
        entry['stub'] = model.stub
    try:
        entry['libs'] = os_module().versions()
    except Exception:              # noqa: BLE001 -- description only
        pass
    if (not L['decision'] and int(pay.get('week') or 0) >= PACE_FROM_WEEK):
        pace = summarize(calls, None, prev_runs)['pace']
        if pace['projected_at_season_end'] is not None and pace['projected_at_season_end'] < SAMPLE_N:
            problems.add('WARN', f"the pace ({pace['per_week']} a week) puts the season's end at "
                                 f"{pace['projected_at_season_end']} in the sample, below 2,000: it will end undecided")
    entry['seconds'] = round(time.time() - t0, 1)
    entry['rss_gb'] = round(peak_rss_gb(), 2)
    entry['problems'] = list(problems.lines)
    runs = dict(prev_runs)
    runs[ra] = entry
    keep = {ra}
    for c in calls.values():
        keep.update(t for t in (c.get('called_at'), c.get('frozen_at'), (c.get('grade') or {}).get('graded_at')) if t)
    if L['decision']:
        keep.add(L['decision']['decided_at'])
    L['runs'] = {t: r for t, r in runs.items() if t in keep or parse_t(t) >= run_at - RUNS_KEEP}
    L['run_at'] = ra
    L['summary'] = summarize(calls, L['decision'], L['runs'], season_done(pay))
    return L, ev


def run(a):
    """the props job's step (PLAN 9): refused (exit 1, nothing written) on any guard; else the ledger to --out and
    evidence.json, exit 2 where a phase was skipped (DEGRADED), 0 otherwise"""
    problems = Problems(a.problems)
    # the paths first, before anything is removed: --out and --evidence are written aside, never over the ledger read
    # or the committed one (props.yml moves the new ledger into place once td_shadow_check.py passes it)
    led = {os.path.realpath(a.ledger), os.path.realpath(LEDGER)}
    try:
        if os.environ.get('TD_SHADOW_STUB') and a.out and os.path.realpath(a.out) == os.path.realpath(LEDGER):
            raise Refused('TD_SHADOW_STUB never writes the committed ledger')
        for p in (a.out, a.evidence):
            if p and os.path.realpath(p) in led:
                raise Refused(f'{p} is the ledger itself: the run writes aside, and props.yml moves the new ledger into '
                              'place once td_shadow_check.py passes it')
    except Refused as e:
        problems.add('REFUSED', e)
        return 1
    for p in (a.out, a.evidence):
        if p and os.path.exists(p):
            os.remove(p)
    try:
        try:
            now = parse_t(a.now)
        except (TypeError, ValueError):
            raise Refused(f'--now {a.now!r} is not an ISO time') from None
        stub = os.environ.get('TD_SHADOW_STUB')
        actions = os.environ.get('GITHUB_ACTIONS') == 'true'
        if stub and actions:
            raise Refused('TD_SHADOW_STUB stands in for the model in tests alone, never on GitHub Actions')
        if stub and os.path.realpath(a.out) == os.path.realpath(LEDGER):
            raise Refused('TD_SHADOW_STUB never writes the committed ledger')
        if actions and os.environ.get('GITHUB_REF_NAME') != 'main':
            raise Refused(f"the shadow writes calls on main alone (this run is on {os.environ.get('GITHUB_REF_NAME')})")
        OS = load()
        global _OS
        _OS = OS
        guard_code(OS, need_313=not stub, versions=not stub)
        L, _ = read_ledger(a.ledger)
        if L.get('model') != model_block(manifest()):
            raise Refused("the ledger's model block is not the manifest's touchdown files")
        with open(a.payload, 'rb') as f:
            raw = f.read()
        try:
            pay = json.loads(raw)
        except ValueError:
            raise Refused('the payload does not read') from None
        pay_sha = hashlib.sha256(raw).hexdigest()
        if pay.get('season') != SEASON:
            write_text(a.out, dumps(L))
            print(f'td shadow: the payload is of season {pay.get("season")}, not {SEASON}: nothing to do', flush=True)
            return 0
        page = None
        if a.page and os.path.exists(a.page):
            try:
                with open(a.page, encoding='utf-8') as f:
                    page = json.load(f)
            except ValueError:
                page = {'v': None}
        model = StubModel(stub) if stub else RealModel(OS, a.data, a.hist, a.props_raw, problems)

        def clock(n):
            t = env_now()
            return max(n, t) if t else max(n, wall_now())
        L2, ev = update(L, pay, pay_sha, page, model, now, problems, clock, props_raw=a.props_raw)
        write_text(a.out, dumps(L2))
        if a.evidence:
            write_text(a.evidence, json.dumps(ev, indent=1, ensure_ascii=False, allow_nan=False) + '\n')
        c = L2['runs'][L2['run_at']]['counts']
        print(f"td shadow: {L2['run_at']}: {c['made']} made, {c['rewritten']} rewritten, {c['kept']} kept, "
              f"{c['dropped']} dropped, {c['frozen']} frozen, {c['graded']} graded; {L2['summary']['standing']}"
              + ('; DEGRADED' if problems.has('DEGRADED') else ''), flush=True)
        return 2 if problems.has('DEGRADED') else 0
    except Refused as e:
        problems.add('REFUSED', e)
    except (Exception, SystemExit) as e:   # noqa: BLE001 -- a crash: nothing written, said loudly
        import traceback
        traceback.print_exc()
        problems.add('REFUSED', f'the shadow crashed ({e!r:.300}): nothing written')
    for p in (a.out, a.evidence):
        if p and os.path.exists(p):
            os.remove(p)
    return 1


# ------------------------------------------------------------------------------------------------ plan
def plan_work(pay, L, now):
    """(work, hist, why): 'run' where a game is to be called, a freeze, a drop or a grade is due; hist where p or a
    grade needs the model's data"""
    if pay.get('season') != SEASON:
        return 'none', False, [f'the payload is of season {pay.get("season")}']
    calls = L.get('calls') or {}
    sched, E = sched_map(pay), espn_entries(pay)
    failed = (L.get('decision') or {}).get('verdict') == 'FAIL'
    why = []
    to_call = {} if failed else callable_games(pay, now)
    if to_call:
        why.append(f'{len(to_call)} game(s) to call')
    unfrozen = [c for c in calls.values() if not c.get('frozen')]
    fr = [c for c in unfrozen if now >= earliest_kickoff(c, sched) or scored(sched.get(c['game_id']))]
    if fr:
        why.append(f'{len(fr)} call(s) to freeze')
    dr = unfrozen if failed else [c for c in unfrozen if sched.get(c['game_id']) is None
                                  or int(sched[c['game_id']].get('w') or 0) != c['week']
                                  or withdrawn_after(E.get(c['game_id']), c.get('read_at'))]
    if dr:
        why.append(f'{len(dr)} call(s) to drop')
    gr = [c for c in calls.values() if not c.get('grade') and now >= parse_t(c['kickoff']) + GRADE_AFTER]
    if gr:
        why.append(f'{len(gr)} grade(s) due')
    return ('run' if why else 'none'), bool(to_call or gr), why


def plan(a):
    now = parse_t(a.now) if a.now else (env_now() or wall_now())
    probs = a.problems or (os.path.join(os.environ['RUNNER_TEMP'], 'tdshadow', 'problems.txt')
                           if os.environ.get('RUNNER_TEMP') else None)
    try:
        with open(a.payload, encoding='utf-8') as f:
            pay = json.load(f)
        if not os.path.exists(a.ledger):
            raise ValueError(f'there is no ledger at {a.ledger}')
        with open(a.ledger, encoding='utf-8') as f:
            L = json.load(f)
        work, hist, why = plan_work(pay, L, now)
    except (OSError, ValueError, KeyError, TypeError) as e:
        Problems(probs).add('REFUSED', f'the plan could not read its inputs ({e}): nothing ran')
        print('td shadow plan: refused', flush=True)
        return 1
    out = a.output or os.environ.get('GITHUB_OUTPUT')
    if out:
        with open(out, 'a', encoding='utf-8') as f:
            f.write(f'work={work}\nhist={"true" if hist else "false"}\n')
    print(f'td shadow plan: work={work} hist={"true" if hist else "false"} ({"; ".join(why) or "nothing due"})',
          flush=True)
    return 0


# ------------------------------------------------------------------------------------------------ notify
NOTE_LABEL, VERDICT_LABEL = 'td-shadow', 'td-shadow-verdict'
NOTE_TITLE = 'Touchdown shadow needs a look (research only: the site is fine)'
VERDICT_TITLE = 'Touchdown shadow: the verdict at 2,000 calls'


def problem_lines(text):
    out = []
    for ln in (text or '').splitlines():
        ln = ln.strip()
        if re.match(r'^(REFUSED|DEGRADED|WARN): ', ln) and ln not in out:
            out.append(ln)
    return out


def outcome_lines(outcomes, lines):
    """a line for each step that failed without saying why (OUTCOMES: 'plan=success py=skipped ...')"""
    o = dict(kv.split('=', 1) for kv in (outcomes or '').split() if '=' in kv)
    add = []
    if o.get('plan') == 'failure':
        add.append('REFUSED: the plan step failed: nothing ran')
    if o.get('py') == 'failure':
        add.append('REFUSED: Python 3.13 could not be set up: nothing ran')
    if o.get('hist') == 'failure':
        add.append('WARN: the 2010-2025 cache could not be restored')
    if o.get('shadow') in ('failure', 'cancelled') and not any(x.startswith(('REFUSED:', 'DEGRADED:')) for x in lines):
        add.append('REFUSED: the shadow step failed with no line (timed out or killed): the ledger stays as committed')
    return [x for x in add if x not in lines]


def problems_sig(lines):
    return hashlib.sha1('\n'.join(sorted({re.sub(r'\d+', '#', x) for x in lines})).encode()).hexdigest()


def notify_actions(lines, state, decision, run_url, standing):
    """what the issues need: [('label', name), ('comment', number, body), ('create', title, label, body), ('close',
    number, comment)]. state: {'open': [{number, body, comments: [{body}]}], 'verdict': [issues]}"""
    acts, opened = [], state.get('open') or []
    if lines:
        marker = f'<!-- td-shadow:{problems_sig(lines)} -->'
        body = ('The anytime-touchdown shadow (research only: nothing on the site reads it, and the props run itself '
                'published) needs a look.\n\n' + '\n'.join(f'- `{x}`' for x in lines)
                + f'\n\nRun: {run_url}\n\nStanding: {standing}\n\nREFUSED: the ledger stayed as committed. DEGRADED: '
                'freezes and grades were written, no call was refreshed. WARN: written in full. The off switch is '
                '`gh variable set TD_SHADOW --body off` (props/research/propmodel/README.md, "The touchdown shadow").'
                f'\n\n{marker}')
        if opened:
            n = opened[0]
            last = (n['comments'][-1].get('body') if n.get('comments') else n.get('body')) or ''
            if marker not in last:
                acts.append(('comment', n['number'], body))
        else:
            acts.append(('label', NOTE_LABEL))
            acts.append(('create', NOTE_TITLE, NOTE_LABEL, body))
    else:
        for n in opened:
            acts.append(('close', n['number'], f'A clean run: {run_url}'))
    if decision and not state.get('verdict'):
        vb = (f"The touchdown shadow decided once, at {decision['decided_at']}, on its first {decision['n']:,} graded "
              f"calls ({decision['games']} games): **{decision['verdict']}**.\n\n"
              f"- T1 (log loss of b = m + 0.25 (p - m) minus log loss of m): {decision['T1']['est']:+.5f}, 90% "
              f"[{decision['T1']['lo']:+.5f}, {decision['T1']['hi']:+.5f}] (passes wholly below 0: {decision['criteria']['T1']})\n"
              f"- T2 (beta on logit p - logit m): {decision['T2']['est']:+.4f}, 90% [{decision['T2']['lo']:+.4f}, "
              f"{decision['T2']['hi']:+.4f}] (passes wholly above 0: {decision['criteria']['T2']})\n\n"
              f'Nothing on the site moves by itself (PREREGISTRATION.md section 8). Run: {run_url}')
        acts.append(('label', VERDICT_LABEL))
        acts.append(('create', VERDICT_TITLE, VERDICT_LABEL, vb))
    return acts


def _gh(args, stdin=None):
    r = subprocess.run(['gh'] + args, input=stdin, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"gh {' '.join(args[:3])}: {r.stderr.strip()[:300]}")
    return r.stdout


def notify(a):
    tmp = a.tmp or ''
    try:
        with open(os.path.join(tmp, 'problems.txt'), encoding='utf-8') as f:
            text = f.read()
    except OSError:
        text = ''
    lines = problem_lines(text)
    lines += outcome_lines(os.environ.get('OUTCOMES', ''), lines)
    decision, standing = None, ''
    try:
        with open(a.ledger, encoding='utf-8') as f:
            L = json.load(f)
        decision, standing = L.get('decision'), (L.get('summary') or {}).get('standing', '')
    except (OSError, ValueError):
        pass
    if a.dry_run:
        state = {}
        if a.state:
            with open(a.state, encoding='utf-8') as f:
                state = json.load(f)
    else:
        try:
            state = {'open': json.loads(_gh(['issue', 'list', '--label', NOTE_LABEL, '--state', 'open', '--json',
                                             'number,body,comments', '--limit', '5']) or '[]')}
            if decision:
                state['verdict'] = json.loads(_gh(['issue', 'list', '--label', VERDICT_LABEL, '--state', 'all',
                                                   '--json', 'number', '--limit', '1']) or '[]')
        except (RuntimeError, ValueError, OSError) as e:
            print(f'td shadow notify: could not read the issues ({e})', flush=True)
            return 1
    acts = notify_actions(lines, state, decision, a.run or '', standing)
    for act in acts:
        if a.dry_run:
            print('td shadow notify (dry run):', json.dumps(act, ensure_ascii=False), flush=True)
            continue
        try:
            if act[0] == 'label':
                _gh(['label', 'create', act[1], '--force', '--color', 'BFD4F2' if act[1] == NOTE_LABEL else '0E8A16',
                     '--description', 'the anytime-touchdown shadow (research only)'])
            elif act[0] == 'comment':
                _gh(['issue', 'comment', str(act[1]), '--body-file', '-'], stdin=act[2])
            elif act[0] == 'create':
                _gh(['issue', 'create', '--title', act[1], '--label', act[2], '--body-file', '-'], stdin=act[3])
            elif act[0] == 'close':
                _gh(['issue', 'close', str(act[1]), '--comment', act[2]])
        except (RuntimeError, OSError) as e:
            print(f'td shadow notify: {act[0]} failed ({e})', flush=True)
            return 1
    print(f'td shadow notify: {len(lines)} problem line(s), {len(acts)} action(s)', flush=True)
    return 0


# ------------------------------------------------------------------------------------------------ init
def init(a):
    """the ledger, once, in the PR: BAR as registered, when, the model files, no call"""
    if os.path.exists(a.ledger):
        raise Refused(f'{a.ledger} exists: the bar is registered once')
    if '[Q' in json.dumps(BAR):
        raise Refused("BAR still holds an open question ('[Q'): the owner answers it before the bar is registered")
    for path, h in BAR['registered_with']['runs'].items():
        if sha256_file(os.path.join(REPO, path)) != h:
            raise Refused(f'{path} is not the registered file')
    for path, h in ((PREREG, BAR['registered_with']['preregistration_sha256']),
                    (RESULT, BAR['registered_with']['oneshot_sha256'])):
        if sha256_file(path) != h:
            raise Refused(f'{os.path.basename(path)} is not the registered file')
    at = env_now() or wall_now()
    L = {'what': WHAT, 'bar': json.loads(json.dumps(BAR)), 'bar_registered': iso(at), 'model': model_block(manifest()),
         'run_at': None, 'decision': None, 'summary': summarize({}, None), 'runs': {}, 'calls': {}}
    write_text(a.ledger, dumps(L))
    print(f'td shadow init: {a.ledger} written, the bar registered at {iso(at)}', flush=True)
    return 0


# --------------------------------------------------------------------------------------------- rehearse
def frames_differ(a, b):
    """the columns where two frames of the same rows are not identical: numbers exactly (NaN where NaN), times as
    instants, everything else as text; the shape first"""
    import numpy as np
    import pandas as pd
    if a.shape != b.shape or list(a.columns) != list(b.columns):
        return ['shape or columns']
    bad = []
    for c in a.columns:
        x, y = a[c], b[c]
        if pd.api.types.is_datetime64_any_dtype(x) or pd.api.types.is_datetime64_any_dtype(y):
            same = (pd.to_datetime(x, utc=True) == pd.to_datetime(y, utc=True)).all()
        elif pd.api.types.is_numeric_dtype(x) and pd.api.types.is_numeric_dtype(y):
            xv, yv = x.to_numpy(dtype=float), y.to_numpy(dtype=float)
            same = bool(np.array_equal(np.isnan(xv), np.isnan(yv))) and bool((xv[~np.isnan(xv)] == yv[~np.isnan(yv)]).all())
        else:
            same = bool((x.astype(str) == y.astype(str)).all())
        if not same:
            bad.append(c)
    return bad


def rehearse(a):
    """p for a finished season's week, no lift, by this file's own functions, held bit for bit to a predict.py run
    on the same files (its parquet), then the grading build timed with the grading glue on its keys. Reads DATA and
    the reference, writes only --out (if given)."""
    OS = load()
    guard_code(OS)
    if a.season >= OS.F.HOLDOUT_FROM:
        raise Refused(f'rehearse never lifts the holdout: {a.season} is held out')
    import numpy as np
    import pandas as pd
    t0 = time.time()
    ref = pd.read_parquet(a.ref)
    predictor = make_predictor(OS, a.data)
    t1 = time.time()
    wk = predict_week(OS, a.data, a.season, a.week, predictor)
    rss_predict = peak_rss_gb()
    rtd = ref[ref.stat == 'any_td'].reset_index(drop=True)
    keys = list(zip(rtd.game_id, rtd.pid))
    pm = p_from_pred(OS, wk, keys)
    want = np.clip(rtd.p_ge1.values.astype(float), *OS.CLIP)
    same = sum(1 for k, w in zip(keys, want) if pm[k]['p'] is not None and float(pm[k]['p']).hex() == float(w).hex())
    grp_same = sum(1 for k, g in zip(keys, rtd.grp) if pm[k]['grp'] == g)
    # the whole prediction frame (every stat), beside the touchdown p: the same rows in the same order
    cols = [c for c in ref.columns if c != 'made_at']
    pr = wk['pred'][cols].reset_index(drop=True)
    rf = ref[cols].reset_index(drop=True)
    frame_diff = frames_differ(pr, rf)
    frame_equal = not frame_diff
    extra = sorted(set(zip(wk['td'].game_id, wk['td'].pid)) - set(keys))
    cov, covall, older = game_coverage(OS, a.data, a.season, a.week, sorted(set(rtd.game_id)))
    seconds_predict = round(time.time() - t1, 1)
    del wk
    gc.collect()
    t2 = time.time()
    played = OS.outcomes(a.data, a.season)
    grades = grade_from_played(played, keys)
    seconds_grade = round(time.time() - t2, 1)
    res = {'season': a.season, 'week': a.week, 'ref': os.path.basename(a.ref), 'ref_sha256': sha256_file(a.ref),
           'models_source': dict(predictor.sources), 'runtime': OS.versions(),
           'any_td': {'ref_rows': len(keys), 'p_identical': same, 'p_differ_or_missing': len(keys) - same,
                      'grp_equal': grp_same, 'shadow_rows_not_in_ref': len(extra)},
           'prediction_frame_equal': frame_equal, 'prediction_frame_columns_differ': frame_diff,
           'prediction_rows': {'shadow': int(len(pr)), 'ref': int(len(rf))},
           'coverage': {'games': len(cov), 'covered': sum(1 for v in cov.values() if v is None),
                        'season_missing': len(covall['missing']), 'older_holes': len(older)},
           'grades': {k: sum(1 for g in grades.values() if g['result'] == k) for k in ('td', 'no_td', 'void', None)},
           'played_rows': int(len(played)),
           'seconds': {'load_and_predictor': round(t1 - t0, 1), 'predict_week_and_p': seconds_predict,
                       'outcomes_and_grade': seconds_grade, 'total': round(time.time() - t0, 1)},
           'peak_rss_gb': {'after_predict': round(rss_predict, 2), 'after_outcomes': round(peak_rss_gb(), 2)}}
    res['grades'] = {str(k): v for k, v in res['grades'].items()}
    print(json.dumps(res, indent=1))
    if a.out:
        with open(a.out + '.part', 'w') as f:
            json.dump(res, f, indent=1)
        os.replace(a.out + '.part', a.out)
    ok = same == len(keys) and frame_equal and not extra
    print('rehearse:', 'p identical on every row' if ok else 'NOT IDENTICAL', flush=True)
    return 0 if ok else 1


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sub = ap.add_subparsers(dest='cmd', required=True)
    i = sub.add_parser('init', help='write the ledger (the bar, no call), once, in the PR')
    i.add_argument('--ledger', default=LEDGER)
    p = sub.add_parser('plan', help='stdlib: what this run has to do (work, hist) into $GITHUB_OUTPUT')
    p.add_argument('--payload', required=True)
    p.add_argument('--ledger', default=LEDGER)
    p.add_argument('--now', default=None)
    p.add_argument('--problems', default=None)
    p.add_argument('--output', default=None, help='default $GITHUB_OUTPUT')
    r = sub.add_parser('run', help='one run: calls, freezes, grades, the decision; the ledger to --out')
    r.add_argument('--now', required=True, help="the run's clock as the page reader was given it (ISO)")
    r.add_argument('--payload', required=True)
    r.add_argument('--page', default=None, help="td_shadow_page.js's page.json (absent: no call this run)")
    r.add_argument('--props-raw', default=os.path.join(REPO, 'props', 'raw'))
    r.add_argument('--hist', default=None, help='the cached 2010-2025 folder (its raw/ holds the manifest files)')
    r.add_argument('--data', default=None, help="this run's own data folder (made afresh)")
    r.add_argument('--ledger', default=LEDGER, help='the ledger as committed (read, never written)')
    r.add_argument('--out', required=True, help='the new ledger')
    r.add_argument('--evidence', default=None)
    r.add_argument('--problems', default=None)
    n = sub.add_parser('notify', help='stdlib + gh: the td-shadow issue and the verdict issue')
    n.add_argument('--tmp', required=True, help='the folder holding problems.txt')
    n.add_argument('--ledger', default=LEDGER)
    n.add_argument('--run', default='')
    n.add_argument('--dry-run', action='store_true')
    n.add_argument('--state', default=None, help='with --dry-run: the issues as JSON, {"open": [...], "verdict": [...]}')
    h = sub.add_parser('rehearse', help='p for a finished week, no lift, held to a predict.py run on the same files')
    h.add_argument('--season', type=int, required=True)
    h.add_argument('--week', type=int, required=True)
    h.add_argument('--data', required=True)
    h.add_argument('--ref', required=True, help='predict.py --season S --week W on the same DATA (its parquet)')
    h.add_argument('--out', default=None)
    a = ap.parse_args(argv)
    if a.cmd == 'run':
        if not os.environ.get('TD_SHADOW_STUB') and not (a.hist and a.data):
            ap.error('run needs --hist and --data (or TD_SHADOW_STUB in a test)')
        return run(a)
    if a.cmd == 'plan':
        return plan(a)
    if a.cmd == 'notify':
        return notify(a)
    try:
        if a.cmd == 'init':
            return init(a)
        if a.cmd == 'rehearse':
            return rehearse(a)
    except Refused as e:
        print(f'REFUSED: {e}', file=sys.stderr, flush=True)
        return 1
    return 2


if __name__ == '__main__':
    sys.exit(main())
