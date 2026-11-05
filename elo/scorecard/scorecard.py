"""THE MISMATCH SCORECARD: the Props tab's Mismatches against DraftKings' closing line, frozen at kickoff and graded
after the game. Research only: no page, audit or smoke reads it, and nothing is fitted, tuned or chosen on it. The bar
it is judged by (BAR, below, in README.md word for word) was registered by `init` before the first call and is never
changed: check refuses a ledger whose bar, its SHA-256 or its registration time moved from the last commit's, and the
props gate (.github/scripts/props_gate.py, ledger_hold) refuses a pull request that changes or removes the committed
ledger (one may only add it, as init writes it: check --registration), since check alone cannot see a hand edit once
it is the last commit's.

    python3 elo/scorecard/scorecard.py init                       # once: elo/scorecard/ledger.json, the bar and no call
    python3 elo/scorecard/scorecard.py run --out <path>           # the Elo job, after its commit: record, freeze, grade
    python3 elo/scorecard/scorecard.py check --ledger <path>      # the new ledger against the last commit's (git show HEAD:)
    python3 elo/scorecard/scorecard.py check --registration <path>   # only: is it the bar's registration as init writes it
    python3 elo/scorecard/scorecard.py summary                    # print the committed ledger's summary

A row is one lead block of the published matchups (elo/data/matchups.json, avg[pid].mm: the lead leg's stat, its
chance shift on an even line and whether it is tagged), keyed '<game id>|<player id>', for a regular-season game:
{season, week, gid, pid, name, pos, club, kickoff, stat, shift, tag, proj, no_elo, sd, published, written_at, grade}.

  record   every lead block of a game of the ledger's season still to come at the run's clock (kickoff strictly later,
           games.csv's) is written, shift <= 0 and untagged among them (the bar sets tagged against untagged rows of the
           same publishes); a row whose numbers have not moved is kept as it was (its published and written_at the
           publish that first carried them), one whose numbers moved is written again (published: the matchups file's
           built_at, else model.json's). A block of a game kicking off within LEAD of the publish's built_at is not
           taken: elo/build.py never publishes one (CALL_LEAD), so it was not published before kickoff by its rule
  drop     a row of a game still to come that the newest publish no longer carries is dropped (the last publish before
           kickoff is what a visitor saw), but only where that publish could have carried it: a game kicking off within
           LEAD of its built_at (plus the minute built_at is cut to) is left out of every publish by elo/build.py, so its
           rows keep the last publish that did carry it
  freeze   from the first run at or after kickoff (the row's own, or games.csv's if earlier) a row is never written again
           or removed; a game first seen after its kickoff gets no row
  void     games.csv moves a frozen game's kickoff more than 24 hours: 'moved', written once the row's own kickoff has
           passed (a game moved earlier waits for it); a game off the schedule 14 days after the row's kickoff: 'off
           schedule'
  grade    once, by the first run at or after kickoff + 72 hours where the archive (props/data/espn_lines_<season>.json,
           the props job's) has the game final with a close for the player on the stat, and the season's nflverse player
           stats (elo/cache/stats_player_week_<season>.csv, the build's download) carry the game. actual: his stat row
           in that game; with none, 0 where PFR's snap counts (elo/cache/snap_counts_<season>.csv, his PFR id from
           elo/cache/players.csv) show him with a snap, void 'did not play' where they carry his club's game without
           him, and otherwise he waits. over if actual > close, under if <, push if equal (left out of the bar); the
           open line and over or under against it are kept beside it, information only. A line the archive lists in
           the game's `gone` (DraftKings withdrew it before the last read) is no close. A stat nflverse writes in parts
           is their sum as elo/build.py adds it (DERIVED). Still not gradable 14 days after kickoff: void 'no close',
           'no stats' or 'not told'. A grade once written is never changed. A run missing the stats or the archive
           grades nothing (and voids nothing for want of them) and says so, so the decision then waits past the bar's
           14 days for the files.
  summary  recomputed from the rows on every run, per season: the rows graded, the tagged and untagged over-rates with
           their counts, D and S with their 90% intervals (10,000 resamples of games, numpy default_rng(2026)), 'running'
           until decided, then the verdict by the bar, on the four-place numbers the ledger states.
  check    refuses a new ledger (exit 1, each reason said) whose bar, its SHA-256, its registration time, its season or
           how differ from the last commit's; that is not the canonical dump, or whose last commit's copy is not (a hand
           edit); whose run or rows predate the registration; whose frozen row changed or went; whose grade changed once
           written; with a row added or rewritten at or after its kickoff, from a publish within LEAD of its kickoff or
           of another season; with a grade that does not follow its actual; or whose summary does not follow from the
           rows (on games.csv's last regular-season kickoff, else the committed summary's)

Nothing here downloads: it reads the files the Elo job's build already has in elo/cache, and the archive in the repo.
"""
import argparse
import csv
import datetime
import hashlib
import json
import math
import os
import subprocess
import sys
import zoneinfo

try:
    import numpy as np
except ImportError:            # check --registration (the props gate's hold, on a runner with no numpy) needs no numbers
    np = None

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LEDGER = os.path.join(HERE, 'ledger.json')
LEDGER_GIT = 'elo/scorecard/ledger.json'
ET = zoneinfo.ZoneInfo('America/New_York')     # games.csv's kickoffs are US Eastern, as elo/build.py reads them

BAR = ("Registered before the first call, never changed. The scorecard measures whether the Props tab's Mismatches "
       "tell anything about DraftKings' closing line. A row is every lead block (avg[pid].mm) the Elo job's last publish "
       "before a game's kickoff carried for that game, frozen at kickoff, graded over or under DraftKings' closing main "
       "line on its stat from props/data/espn_lines_<season>.json against the player's stat from nflverse; a push, a row "
       "with no close, a row whose game moved more than 24 hours and a player who did not play are left out. D is the "
       "over-rate of the tagged rows (mm.tag true) less the over-rate of the untagged rows (mm.tag false), pooled over the "
       "season. S is Spearman's rank correlation between mm.shift and the actual less the close, over every graded row. "
       "Each has a 90% interval from 10,000 bootstrap resamples of games (seed 2026). The scorecard is decided once, when "
       "every regular-season game it froze rows for has been graded or voided (at the latest 14 days after the season's "
       "last regular-season kickoff): fewer than 30 graded tagged rows is UNDECIDED; otherwise PASS only if D's interval "
       "and S's interval both lie wholly above 0; FAIL if D's interval lies wholly below 0; anything else is NO EDGE "
       "SHOWN. Before the decision the ledger carries the running counts, rates, D and S with their intervals, never a "
       "verdict. A PASS only makes the Mismatches a candidate for a change of their own, tested again; nothing on the "
       "site reads this scorecard, and nothing is fitted, tuned or chosen on it.")
BAR_SHA256 = hashlib.sha256(BAR.encode('utf-8')).hexdigest()

HOW = ("The Mismatch scorecard (elo/scorecard/scorecard.py; README.md beside it holds the bar). Research only: no page "
       "reads this file and nothing on the site uses it. Written only by scorecard.py run in the Elo job after its "
       "commit, and committed only once scorecard.py check has held it to the last commit's. calls['<game id>|<player "
       "id>'] = {season, week, gid, pid, name, pos, club, kickoff, stat, shift, tag, proj, no_elo, sd, published, "
       "written_at, grade}: every lead block (elo/data/matchups.json avg[pid].mm) of a regular-season game, rewritten "
       "while its game is to come, frozen at kickoff; grade null until graded once against DraftKings' closing main "
       "line (result over, under or push, close, open, vs_open, actual, how, at) or voided (result void, why: moved, "
       "no close, no stats, did not play, not told, off schedule). summary[season]: the running counts, rates, D and S "
       "with their 90% intervals, and the verdict once decided by the bar. A hand edit rewrites the record.")

SEED = 2026
RESAMPLES = 10000
CHUNK = 1000                    # resamples worked a batch at a time (memory only: the draw is one, below)
MIN_TAGGED = 30
GRADE_AFTER = datetime.timedelta(hours=72)
VOID_AFTER = datetime.timedelta(days=14)
MOVED = datetime.timedelta(hours=24)
CONTENT = ('season', 'week', 'gid', 'pid', 'name', 'pos', 'club', 'kickoff', 'stat', 'shift', 'tag', 'proj', 'no_elo', 'sd')
ROW_KEYS = CONTENT + ('published', 'written_at', 'grade')
RESULTS = ('over', 'under', 'push', 'void')
VOIDS = ('moved', 'no close', 'no stats', 'did not play', 'not told', 'off schedule')
# a stat nflverse writes in parts: elo/build.py's own sums (its d['scrim_yards'], d['any_td'] and d['kick_pts'] lines),
# which test_scorecard.py holds to build.py's source
DERIVED = {'scrim_yards': {'rushing_yards': 1, 'receiving_yards': 1},
           'any_td': {'rushing_tds': 1, 'receiving_tds': 1},
           'kick_pts': {'fg_made': 3, 'pat_made': 1}}
LEAD = datetime.timedelta(minutes=15)    # elo/build.py's CALL_LEAD: it publishes no game kicking off sooner than this
TRUNC = datetime.timedelta(minutes=1)    # built_at is the build's clock cut to the minute


# ---------------------------------------------------------------- times

def iso(t):
    return t.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def when(s):
    """an ISO time (Z or an offset, with or without seconds) as an aware datetime in UTC"""
    t = datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))
    if t.tzinfo is None:
        t = t.replace(tzinfo=datetime.timezone.utc)
    return t.astimezone(datetime.timezone.utc)


def kickoff(gameday, gametime):
    """elo/build.py's kickoff(): games.csv's day and time in US Eastern, 13:00 where the time is missing"""
    t = gametime if isinstance(gametime, str) and ':' in gametime else '13:00'
    local = datetime.datetime.strptime(f'{gameday} {t[:5]}', '%Y-%m-%d %H:%M').replace(tzinfo=ET)
    return local.astimezone(datetime.timezone.utc)


# ---------------------------------------------------------------- reading

def read_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def schedule(path):
    """games.csv as {game id: {season, week, type, kick, home, away}}"""
    out = {}
    with open(path, newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            try:
                out[r['game_id']] = {'season': int(r['season']), 'week': int(r['week']), 'type': r['game_type'],
                                     'kick': kickoff(r['gameday'], r['gametime']),
                                     'home': r['home_team'], 'away': r['away_team']}
            except (KeyError, ValueError, TypeError):
                continue
    return out


def last_regular(sched, season):
    ks = [g['kick'] for g in sched.values() if g['season'] == season and g['type'] == 'REG']
    return iso(max(ks)) if ks else None


def last_regs(sched, calls):
    return {s: last_regular(sched, s) for s in {r['season'] for r in calls.values()}}


class Sources:
    """one season's grading files, read once a run: the archive, the player stats, the snap counts and the PFR ids"""

    def __init__(self, season, cache, archive_dir):
        self.season, self.missing = season, []
        self.archive = self.stats = self.snaps = self.pfr = None
        ap = os.path.join(archive_dir, f'espn_lines_{season}.json')
        try:
            a = read_json(ap)
            if not isinstance(a.get('games'), dict):
                raise ValueError('no games map')
            self.archive = a['games']
        except (OSError, ValueError, AttributeError) as e:
            self.missing.append(f'espn_lines_{season}.json ({str(e)[:80]})')
        sp = os.path.join(cache, f'stats_player_week_{season}.csv')
        try:
            rows, games, cols = {}, set(), set()
            with open(sp, newline='', encoding='utf-8') as f:
                rd = csv.DictReader(f)
                cols = set(rd.fieldnames or ())
                if not {'player_id', 'game_id'} <= cols:
                    raise ValueError('no player_id or game_id column')
                for r in rd:
                    games.add(r['game_id'])
                    games.add((r.get('week'), r.get('team')))
                    rows[(r['game_id'], r['player_id'])] = r
            self.stats = {'rows': rows, 'games': games, 'cols': cols}
        except (OSError, ValueError) as e:
            self.missing.append(f'stats_player_week_{season}.csv ({str(e)[:80]})')
        np_ = os.path.join(cache, f'snap_counts_{season}.csv')
        try:
            player, teams = {}, set()
            with open(np_, newline='', encoding='utf-8') as f:
                for r in csv.DictReader(f):
                    tot = sum(float(r.get(c) or 0) for c in ('offense_snaps', 'defense_snaps', 'st_snaps'))
                    player[(r['game_id'], r['pfr_player_id'])] = tot
                    teams.add((r['game_id'], r['team']))
            self.snaps = {'player': player, 'teams': teams}
        except (OSError, ValueError, KeyError) as e:
            self.missing.append(f'snap_counts_{season}.csv ({str(e)[:80]})')
        pp = os.path.join(cache, 'players.csv')
        try:
            pfr = {}
            with open(pp, newline='', encoding='utf-8') as f:
                for r in csv.DictReader(f):
                    if r.get('gsis_id') and r.get('pfr_id'):
                        pfr[r['gsis_id']] = r['pfr_id']
            self.pfr = pfr
        except (OSError, ValueError) as e:
            self.missing.append(f'players.csv ({str(e)[:80]})')

    def can_grade(self):
        return self.archive is not None and self.stats is not None


# ---------------------------------------------------------------- record, freeze, grade

def frozen(row, sched, now):
    """a row is frozen from its kickoff, or from games.csv's kickoff for the game where that came earlier"""
    k = when(row['kickoff'])
    s = sched.get(row['gid'])
    return now >= k or (s is not None and now >= s['kick'])


def lead_blocks(m):
    """the published matchups' lead blocks, {pid: block}, or None where the file carries no averages at all"""
    avg = m.get('avg') if isinstance(m, dict) else None
    if not isinstance(avg, dict) or not avg:
        return None
    return {p: b for p, b in avg.items() if isinstance(b, dict) and isinstance(b.get('mm'), dict)}


def num(v, nd=4):
    return None if v is None else round(float(v), nd) + 0.0


def pub_time(published):
    try:
        return when(published) if published else None
    except (TypeError, ValueError):
        return None


def record(calls, m, names, sched, now, published, notes, season):
    """rows written or rewritten for the games of the season still to come, and the ones the newest publish dropped
    taken out (only where that publish could have carried them)"""
    blocks = lead_blocks(m)
    if blocks is None:
        notes.append('the matchups file carries no averages: nothing recorded or dropped this run')
        return dict(calls), {'new': 0, 'rewritten': 0, 'dropped': 0}
    pub = pub_time(published)
    out, seen = dict(calls), set()
    n = {'new': 0, 'rewritten': 0, 'dropped': 0, 'post': 0, 'unknown': 0, 'other': 0, 'late': 0, 'kept': 0}
    for pid, b in sorted(blocks.items()):
        gid = b.get('game_id')
        s = sched.get(gid)
        if s is None:
            n['unknown'] += 1
            continue
        if s['type'] != 'REG':
            n['post'] += 1
            continue
        if s['season'] != season:
            n['other'] += 1
            continue
        key = f'{gid}|{pid}'
        old = calls.get(key)
        if s['kick'] <= now or (old is not None and frozen(old, sched, now)):
            continue                                   # under way or played: no new row, and a frozen one stays
        if pub is not None and s['kick'] <= pub + LEAD:
            n['late'] += 1                             # not published before kickoff by elo/build.py's own rule
            continue
        seen.add(key)
        mm = b['mm']
        st = (b.get('stats') or {}).get(mm.get('stat')) or {}
        row = {'season': s['season'], 'week': s['week'], 'gid': gid, 'pid': pid, 'name': names.get(pid),
               'pos': b.get('group'), 'club': b.get('team'), 'kickoff': iso(s['kick']), 'stat': mm.get('stat'),
               'shift': num(mm.get('shift')), 'tag': bool(mm.get('tag')), 'proj': num(st.get('proj')),
               'no_elo': num(st.get('no_elo')), 'sd': num(st.get('sd'))}
        if old is not None and all(old.get(k) == row[k] for k in CONTENT):
            continue                                   # the same numbers: kept as first written
        row.update({'published': published, 'written_at': iso(now), 'grade': None})
        out[key] = row
        n['rewritten' if old is not None else 'new'] += 1
    for key, row in calls.items():
        if key in seen or key not in out or frozen(row, sched, now):
            continue
        s = sched.get(row['gid'])
        kick = s['kick'] if s is not None else when(row['kickoff'])
        if pub is not None and kick < pub + LEAD + TRUNC:
            n['kept'] += 1                             # no publish this close to kickoff carries it: the last one stands
            continue
        del out[key]                                   # the newest publish before kickoff no longer carries it
        n['dropped'] += 1
    if n['kept']:
        notes.append(f"{n['kept']} row(s) of games within {int(LEAD.total_seconds() // 60)} minutes of this publish's "
                     "built_at, which no publish carries that close: kept as the last publish that carried them")
    if n['late']:
        notes.append(f"{n['late']} lead block(s) of games kicking off within {int(LEAD.total_seconds() // 60)} minutes "
                     "of the publish: not published before kickoff by elo/build.py's rule, not recorded")
    if n['other']:
        notes.append(f"{n['other']} lead block(s) of another season than the ledger's {season}: not recorded (another "
                     "season needs a ledger and a bar registered of its own)")
    if n['unknown']:
        notes.append(f"{n['unknown']} lead block(s) of a game games.csv does not have: not recorded")
    if n['post']:
        notes.append(f"{n['post']} lead block(s) of postseason games: the scorecard is the regular season's")
    return out, n


def stat_value(row, stat):
    """his stat from the nflverse row (a missing number in a row he has is 0), or None where no column carries it"""
    parts = DERIVED.get(stat, {stat: 1})
    if any(c not in row for c in parts):
        return None
    return float(sum(w * (float(row[c]) if row[c] not in ('', 'NA', None) else 0.0) for c, w in parts.items()))


def side(actual, line):
    if line is None or actual is None:
        return None
    return 'over' if actual > line else 'under' if actual < line else 'push'


def grade(calls, sched, now, sources, notes):
    """every frozen row not yet graded: voided, graded once, or left to wait. sources(season) -> Sources"""
    n = {r: 0 for r in RESULTS}
    n['waiting'] = 0
    cant = set()
    for key in sorted(calls):
        row = calls[key]
        if row.get('grade') is not None or not frozen(row, sched, now):
            continue
        k0 = when(row['kickoff'])
        s = sched.get(row['gid'])
        g = None
        if s is not None and abs(s['kick'] - k0) > MOVED:
            if now >= k0:                              # a game moved earlier waits for the row's own kickoff
                g = {'result': 'void', 'why': 'moved', 'kickoff_now': iso(s['kick'])}
        elif s is None:
            if now >= k0 + VOID_AFTER:
                g = {'result': 'void', 'why': 'off schedule'}
        elif now >= s['kick'] + GRADE_AFTER:
            src = sources(row['season'])
            if not src.can_grade():
                cant.add(row['season'])
            else:
                g = grade_one(row, s, now, src)
        if g is None:
            n['waiting'] += 1
            continue
        g['at'] = iso(now)
        row['grade'] = g
        n[g['result']] += 1
    for season in sorted(cant):
        notes.append(f"season {season}: graded nothing, the files are not all here: {'; '.join(sources(season).missing)}")
    return n


def grade_one(row, s, now, src):
    late = now >= s['kick'] + VOID_AFTER
    gid, pid, stat = row['gid'], row['pid'], row['stat']
    game = src.archive.get(gid)
    line = None
    if isinstance(game, dict) and game.get('final'):
        gone = {tuple(x) for x in game.get('gone') or [] if isinstance(x, list) and len(x) == 2}
        if (pid, stat) not in gone:                    # a line DraftKings withdrew is no closing line
            line = ((game.get('lines') or {}).get(pid) or {}).get(stat)
    close = line[1] if isinstance(line, list) and len(line) >= 2 else None
    if close is None:
        return {'result': 'void', 'why': 'no close'} if late else None
    st = src.stats
    if gid not in st['games'] and not ({(str(row['week']), s['home']), (str(row['week']), s['away'])} & st['games']):
        return {'result': 'void', 'why': 'no stats'} if late else None
    sr = st['rows'].get((gid, pid))
    if sr is not None:
        actual, how = stat_value(sr, stat), 'stat'
        if actual is None:
            return {'result': 'void', 'why': 'no stats'} if late else None
    else:
        told = None                                    # True: a snap; False: did not play; None: cannot tell
        pfr = (src.pfr or {}).get(pid)
        if src.snaps is not None and pfr:
            if (gid, pfr) in src.snaps['player']:
                told = src.snaps['player'][(gid, pfr)] > 0
            elif (gid, row['club']) in src.snaps['teams']:
                told = False
        if told is None:
            return {'result': 'void', 'why': 'not told'} if late else None
        if not told:
            return {'result': 'void', 'why': 'did not play'}
        actual, how = 0.0, 'snaps'
    op = line[0]
    return {'result': side(actual, close), 'close': float(close), 'open': None if op is None else float(op),
            'vs_open': side(actual, op), 'actual': actual, 'how': how}


# ---------------------------------------------------------------- the summary

def avg_ranks(x, W):
    """the average rank of every row in each resample's expanded sample: W (b x n) the rows' counts, x (n) values"""
    o = np.argsort(x, kind='stable')
    xs = x[o]
    starts = np.flatnonzero(np.r_[True, xs[1:] != xs[:-1]])
    grp = np.cumsum(np.r_[True, xs[1:] != xs[:-1]]) - 1
    Wg = np.add.reduceat(W[:, o], starts, axis=1)
    rg = np.cumsum(Wg, axis=1) - Wg + (Wg + 1) / 2.0
    r = np.empty(W.shape, float)
    r[:, o] = rg[:, grp]
    return r


def spearman_w(x, y, W):
    """Spearman's rho with average ranks on each resample's expanded sample (rows repeated by their counts W)"""
    rx, ry = avg_ranks(x, W), avg_ranks(y, W)
    N = W.sum(axis=1)
    with np.errstate(invalid='ignore', divide='ignore'):
        mx = (W * rx).sum(axis=1) / N
        my = (W * ry).sum(axis=1) / N
        dx, dy = rx - mx[:, None], ry - my[:, None]
        c = (W * dx * dy).sum(axis=1)
        v = (W * dx * dx).sum(axis=1) * (W * dy * dy).sum(axis=1)
        out = c / np.sqrt(v)
    out[~(v > 1e-12)] = np.nan
    return out


def d_w(over, tag, W):
    with np.errstate(invalid='ignore', divide='ignore'):
        nt, nu = W[:, tag].sum(axis=1), W[:, ~tag].sum(axis=1)
        d = (W[:, tag] @ over[tag]) / nt - (W[:, ~tag] @ over[~tag]) / nu
    d[(nt == 0) | (nu == 0)] = np.nan
    return d


def r4(v):
    return None if v is None or not np.isfinite(v) else round(float(v), 4) + 0.0


def interval(vals):
    v = vals[np.isfinite(vals)]
    if len(v) < 2:
        return None, None, int(len(v))
    lo, hi = np.quantile(v, [0.05, 0.95])
    return r4(lo), r4(hi), int(len(v))


def season_numbers(rows):
    """D and S, each with its 90% interval (the 5th and 95th percentiles, numpy's linear rule) from RESAMPLES resamples
    of games: one draw, default_rng(SEED).integers(0, G, size=(RESAMPLES, G)), a fresh stream a season, the games in
    game-id order; a resample with no tagged or no untagged row has no D and is left out of D's interval"""
    gids = sorted({r['gid'] for r in rows})
    if not rows:
        return {'est': None, 'lo': None, 'hi': None, 'resamples': 0}, {'est': None, 'lo': None, 'hi': None, 'resamples': 0}
    gi = {g: i for i, g in enumerate(gids)}
    gix = np.array([gi[r['gid']] for r in rows])
    over = np.array([r['grade']['result'] == 'over' for r in rows], float)
    tag = np.array([bool(r['tag']) for r in rows])
    x = np.array([float(r['shift']) for r in rows])
    y = np.array([r['grade']['actual'] - r['grade']['close'] for r in rows], float)
    one = np.ones((1, len(rows)))
    d0, s0 = d_w(over, tag, one)[0], spearman_w(x, y, one)[0]
    G = len(gids)
    draw = np.random.default_rng(SEED).integers(0, G, size=(RESAMPLES, G))
    Ds, Ss = [], []
    for start in range(0, RESAMPLES, CHUNK):
        idx = draw[start:start + CHUNK]
        b = len(idx)
        cnt = np.bincount((idx + np.arange(b)[:, None] * G).ravel(), minlength=b * G).reshape(b, G).astype(float)
        W = cnt[:, gix]
        Ds.append(d_w(over, tag, W))
        Ss.append(spearman_w(x, y, W))
    dl, dh, dn = interval(np.concatenate(Ds))
    sl, sh, sn = interval(np.concatenate(Ss))
    return ({'est': r4(d0), 'lo': dl, 'hi': dh, 'resamples': dn}, {'est': r4(s0), 'lo': sl, 'hi': sh, 'resamples': sn})


def verdict(s):
    """the bar's decision on the season's stated (four-place) numbers"""
    if s['tagged']['n'] < MIN_TAGGED:
        return 'UNDECIDED'
    D, S = s['D'], s['S']
    if D['lo'] is not None and D['lo'] > 0 and S['lo'] is not None and S['lo'] > 0:
        return 'PASS'
    if D['hi'] is not None and D['hi'] < 0:
        return 'FAIL'
    return 'NO EDGE SHOWN'


def summarize(calls, run_at, last_reg, prev):
    """the summary from the rows alone: last_reg {season: last regular-season kickoff or None}; prev the summary
    before, whose decided seasons keep their decided_at"""
    out = {}
    run = when(run_at) if run_at else None
    for season in sorted({r['season'] for r in calls.values()}):
        rows = [r for r in calls.values() if r['season'] == season]
        gr = [r for r in rows if r.get('grade') and r['grade']['result'] in ('over', 'under')]
        voids = {}
        for r in rows:
            if r.get('grade') and r['grade']['result'] == 'void':
                voids[r['grade']['why']] = voids.get(r['grade']['why'], 0) + 1
        part = lambda t: [r for r in gr if bool(r['tag']) is t]
        rate = lambda rs: {'n': len(rs), 'over': sum(r['grade']['result'] == 'over' for r in rs),
                           'rate': r4(sum(r['grade']['result'] == 'over' for r in rs) / len(rs)) if rs else None}
        D, S = season_numbers(sorted(gr, key=lambda r: (r['gid'], r['pid'])))
        lr = last_reg.get(season)
        s = {'state': 'running', 'rows': len(rows), 'graded': len(gr),
             'push': sum(1 for r in rows if r.get('grade') and r['grade']['result'] == 'push'),
             'void': dict(sorted(voids.items())), 'open': sum(1 for r in rows if not r.get('grade')),
             'games': len({r['gid'] for r in gr}), 'tagged': rate(part(True)), 'untagged': rate(part(False)),
             'D': D, 'S': S, 'resamples': RESAMPLES, 'seed': SEED, 'last_regular_kickoff': lr}
        p = (prev or {}).get(str(season)) or {}
        if p.get('state') == 'decided':
            s.update({'state': 'decided', 'verdict': verdict(s), 'decided_at': p.get('decided_at')})
        elif lr and run is not None and run >= when(lr) and rows and s['open'] == 0:
            s.update({'state': 'decided', 'verdict': verdict(s), 'decided_at': run_at})
        out[str(season)] = s
    return out


# ---------------------------------------------------------------- the ledger

def dumps(led):
    """one key a line, one row a line, so a run moves a few lines"""
    one = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    head = [f'"{k}":{one(led[k])}' for k in ('v', 'season', 'how', 'bar', 'bar_sha256', 'bar_registered', 'run_at')]
    calls = [f'{one(k)}:{one(led["calls"][k])}' for k in sorted(led['calls'])]
    summ = [f'{one(k)}:{one(led["summary"][k])}' for k in sorted(led['summary'])]
    return ('{' + ',\n'.join(head) + ',\n"calls":{' + ('\n' + ',\n'.join(calls) + '\n' if calls else '') + '},\n'
            + '"summary":{' + ('\n' + ',\n'.join(summ) + '\n' if summ else '') + '}}\n')


def write(led, path):
    tmp = path + '.part'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(dumps(led))
    os.replace(tmp, path)


def fresh(season, now):
    return {'v': 1, 'season': season, 'how': HOW, 'bar': BAR, 'bar_sha256': BAR_SHA256, 'bar_registered': iso(now),
            'run_at': None, 'calls': {}, 'summary': {}}


def cmd_init(a):
    if os.path.exists(a.ledger):
        if not a.force:
            print(f'{a.ledger} exists: the bar is registered once (init --force only before the first call)')
            return 1
        try:
            led = read_json(a.ledger)
        except (OSError, ValueError):
            led = {}
        if isinstance(led, dict) and (led.get('calls') or led.get('run_at') or led.get('summary')):
            print(f'REFUSED: {a.ledger} has a run or a call: init --force only before the first call')
            return 1
    now = when(a.now) if a.now else datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    season = a.season or int(read_json(os.path.join(a.data, 'matchups.json'))['season'])
    write(fresh(season, now), a.ledger)
    print(f'wrote {a.ledger}: season {season}, the bar registered {iso(now)} (sha256 {BAR_SHA256[:16]}...), no call')
    return 0


def cmd_run(a):
    now = when(a.now) if a.now else datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    notes = []
    try:
        led = read_json(a.ledger)
        m = read_json(os.path.join(a.data, 'matchups.json'))
        sched = schedule(os.path.join(a.cache, 'games.csv'))
    except (OSError, ValueError) as e:
        print(f'REFUSED: {e}: nothing written')
        return 1
    if led.get('bar') != BAR or led.get('bar_sha256') != BAR_SHA256:
        print('REFUSED: the committed ledger\'s bar is not the registered bar: nothing written')
        return 1
    names = {}
    try:
        names = {p: v.get('name') for p, v in read_json(os.path.join(a.data, 'players.json'))['players'].items()}
    except (OSError, ValueError, KeyError, AttributeError):
        notes.append('players.json did not read: rows carry no name')
    published = m.get('built_at')
    if not published:
        try:
            published = read_json(os.path.join(a.data, 'model.json')).get('built_at')
        except (OSError, ValueError):
            published = None
    old_calls = led.get('calls') or {}
    calls, n_rec = record(old_calls, m, names, sched, now, published, notes, led.get('season'))
    calls = {k: dict(v) for k, v in calls.items()}
    cache = {}

    def sources(season):
        if season not in cache:
            cache[season] = Sources(season, a.cache, a.archive)
        return cache[season]

    n_gr = grade(calls, sched, now, sources, notes)
    last_reg = last_regs(sched, calls)
    summary = summarize(calls, iso(now), last_reg, led.get('summary'))
    new = dict(led)
    if calls == old_calls and summary == (led.get('summary') or {}):
        print('nothing changed: the ledger is written as it was')
    else:
        new.update({'run_at': iso(now), 'calls': calls, 'summary': summary})
    write(new, a.out)
    live = [r for r in calls.values() if not frozen(r, sched, now)]
    print(f"run {iso(now)} on the matchups built {published}: {n_rec['new']} new, {n_rec['rewritten']} rewritten, "
          f"{n_rec['dropped']} dropped; {len(live)} to come ({sum(r['tag'] for r in live)} tagged), "
          f"{len(calls) - len(live)} frozen")
    print('graded: ' + ', '.join(f'{k} {v}' for k, v in n_gr.items()))
    for note in notes:
        print('note: ' + note)
    for s, v in sorted(summary.items()):
        print(f'{s}: ' + line(v))
    print(f'wrote {a.out}')
    return 0


def line(v):
    f = lambda d: 'n/a' if d['est'] is None else f"{d['est']:+.4f} [{d['lo']}, {d['hi']}]"
    t, u = v['tagged'], v['untagged']
    tail = f"{v['state'].upper()} {v['verdict']}" if v['state'] == 'decided' else 'running'
    return (f"{v['graded']} graded ({v['games']} games), tagged {t['over']}/{t['n']} over, untagged {u['over']}/{u['n']}; "
            f"D {f(v['D'])}, S {f(v['S'])}; {v['open']} open; {tail}")


# ---------------------------------------------------------------- the check

def problems(new, old, last_reg=None, text=None, old_text=None):
    """every reason the new ledger cannot follow the committed one. last_reg {season: the last regular-season kickoff}
    is games.csv's (the run's own reading), else the committed summary's is taken; text and old_text, where given, are
    the two files as written, each held to the canonical dump"""
    bad = []
    if text is not None and text != dumps(new):
        bad.append('the new ledger is not the canonical dump scorecard.py writes')
    if old_text is not None and old_text != dumps(old):
        bad.append('the committed ledger is not the canonical dump scorecard.py writes (a hand edit?)')
    if new.get('v') != 1 or new.get('v') != old.get('v'):
        bad.append(f"v is {new.get('v')!r}, the committed ledger's {old.get('v')!r}")
    if new.get('season') != old.get('season'):
        bad.append(f"season moved from {old.get('season')!r} to {new.get('season')!r}")
    for k in ('bar', 'bar_sha256', 'bar_registered'):
        if new.get(k) != old.get(k):
            bad.append(f'{k} differs from the committed ledger\'s')
    if new.get('bar') != BAR or new.get('bar_sha256') != BAR_SHA256:
        bad.append('the bar or its sha256 is not the registered bar (scorecard.BAR)')
    if hashlib.sha256(str(new.get('bar')).encode('utf-8')).hexdigest() != new.get('bar_sha256'):
        bad.append('bar_sha256 is not the SHA-256 of the bar')
    if new.get('how') != old.get('how'):
        bad.append('how differs from the committed ledger\'s')
    oc, nc = old.get('calls') or {}, new.get('calls') or {}
    if new.get('run_at') is None:
        if nc or new.get('summary'):
            bad.append('rows or a summary with no run_at')
        if old.get('run_at') is not None:
            bad.append('run_at taken away')
        return bad
    try:
        run = when(new['run_at'])
        reg = when(new.get('bar_registered'))
    except (TypeError, ValueError, AttributeError):
        return bad + [f"run_at {new.get('run_at')!r} or bar_registered {new.get('bar_registered')!r} is not a time"]
    if run < reg:
        bad.append(f"run_at {new['run_at']} is before the bar was registered ({new['bar_registered']})")
    if old.get('run_at') and run <= when(old['run_at']):
        if new != old:
            bad.append(f"run_at {new['run_at']} is not later than the committed {old['run_at']}, and the ledger moved")
    for key, r in nc.items():
        if not isinstance(r, dict) or set(r) != set(ROW_KEYS):
            bad.append(f'{key}: not a row of the ledger\'s shape')
            continue
        if key != f"{r['gid']}|{r['pid']}":
            bad.append(f'{key}: keyed off its own game and player')
        if r['season'] != new.get('season'):
            bad.append(f"{key}: a row of season {r['season']!r} in the ledger of {new.get('season')!r}")
        try:
            k = when(r['kickoff'])
            if when(r['written_at']) < reg:
                bad.append(f'{key}: written at {r["written_at"]}, before the bar was registered')
        except (TypeError, ValueError, AttributeError):
            bad.append(f'{key}: its kickoff or written_at is not a time')
            continue
        o = oc.get(key)
        g = r.get('grade')
        if o is None or any(o.get(f) != r.get(f) for f in CONTENT + ('published', 'written_at')):
            if o is not None and when(o['kickoff']) <= run:
                bad.append(f'{key}: a frozen row (kickoff {o["kickoff"]}) changed')
            elif k <= run:
                bad.append(f'{key}: added or rewritten by the run of {new["run_at"]}, at or after its kickoff {r["kickoff"]}')
            pub = pub_time(r.get('published'))
            if pub is not None and k <= pub + LEAD:
                bad.append(f'{key}: taken from a publish built {r["published"]}, within {int(LEAD.total_seconds() // 60)} '
                           f'minutes of its kickoff {r["kickoff"]}')
            if r['written_at'] != new['run_at']:
                bad.append(f'{key}: added or rewritten with written_at {r["written_at"]}, not the run\'s {new["run_at"]}')
        if o is not None and o.get('grade') is not None and o.get('grade') != g:
            bad.append(f'{key}: its grade changed once written')
        if g is not None:
            if k > run:
                bad.append(f'{key}: graded before its kickoff')
            if (o is None or o.get('grade') is None) and g.get('at') != new['run_at']:
                bad.append(f'{key}: a new grade not dated by this run')
            res = g.get('result')
            if res not in RESULTS:
                bad.append(f'{key}: grade result {res!r}')
            elif res == 'void':
                if g.get('why') not in VOIDS:
                    bad.append(f'{key}: void for {g.get("why")!r}')
            elif side(g.get('actual'), g.get('close')) != res:
                bad.append(f'{key}: graded {res} on actual {g.get("actual")} against the close {g.get("close")}')
    for key, o in oc.items():
        if key not in nc and when(o['kickoff']) <= run:
            bad.append(f'{key}: a frozen row removed')
    if last_reg is None:                               # no games.csv: the committed summary's, else the new one's
        last_reg = {int(s): v.get('last_regular_kickoff') for s, v in (new.get('summary') or {}).items()}
        last_reg.update({int(s): v.get('last_regular_kickoff') for s, v in (old.get('summary') or {}).items()})
    want = summarize(nc, new['run_at'], last_reg, old.get('summary'))
    if json.loads(json.dumps(want)) != new.get('summary'):
        bad.append('the summary does not follow from the rows')
    for s, v in (old.get('summary') or {}).items():
        if v.get('state') == 'decided':
            w = (new.get('summary') or {}).get(s) or {}
            if w.get('state') != 'decided' or w.get('verdict') != v.get('verdict') or w.get('decided_at') != v.get('decided_at'):
                bad.append(f'season {s}: decided {v.get("verdict")} at {v.get("decided_at")}, and that moved')
    return bad


def registration_bad(text):
    """why a ledger's text is not the bar's registration exactly as init writes it: the canonical dump of the version,
    a season, HOW, BAR and its SHA-256, a registration time, and no run, call or summary (the props gate's ledger_hold
    runs this on a pull request that adds the ledger)"""
    try:
        led = json.loads(text)
    except ValueError as e:
        return [f'not JSON ({str(e)[:80]})']
    if not isinstance(led, dict):
        return ['not a ledger']
    bad = []
    want = ('v', 'season', 'how', 'bar', 'bar_sha256', 'bar_registered', 'run_at', 'calls', 'summary')
    if set(led) != set(want):
        return [f'its keys are {sorted(led)}, not {sorted(want)}']
    if led['v'] != 1:
        bad.append(f"v is {led['v']!r}")
    if not isinstance(led['season'], int) or isinstance(led['season'], bool):
        bad.append(f"season {led['season']!r} is not a year")
    if led['how'] != HOW:
        bad.append('its how is not scorecard.HOW')
    if led['bar'] != BAR or led['bar_sha256'] != BAR_SHA256:
        bad.append('its bar or bar_sha256 is not the registered bar (scorecard.BAR)')
    try:
        if iso(when(led['bar_registered'])) != led['bar_registered']:
            raise ValueError
    except (TypeError, ValueError, AttributeError):
        bad.append(f"bar_registered {led['bar_registered']!r} is not a UTC time as init writes it")
    for k, v in (('run_at', None), ('calls', {}), ('summary', {})):
        if led[k] != v:
            bad.append(f'its {k} is not {json.dumps(v)}: a registration has no run, call or summary')
    if not bad and text != dumps(led):
        bad.append('it is not the canonical dump init writes')
    return bad


def committed(rev):
    out = subprocess.run(['git', 'show', f'{rev}:{LEDGER_GIT}'], cwd=ROOT, capture_output=True, text=True)
    if out.returncode:
        raise ValueError(f'git show {rev}:{LEDGER_GIT}: {out.stderr.strip()[:200]}')
    return out.stdout


def read_text(path):
    with open(path, encoding='utf-8', newline='') as f:
        return f.read()


def cmd_check(a):
    if a.registration:
        try:
            bad = registration_bad(read_text(a.registration))
        except OSError as e:
            bad = [str(e)]
        for b in bad:
            print('REFUSED: ' + b)
        if not bad:
            print(f'ok: {a.registration} is the bar\'s registration as init writes it')
        return 1 if bad else 0
    try:
        text = read_text(a.ledger)
        new = json.loads(text)
        old_text = read_text(a.committed) if a.committed else committed(a.against)
        old = json.loads(old_text)
    except (OSError, ValueError) as e:
        print(f'REFUSED: {e}')
        return 1
    last_reg, gp = None, os.path.join(a.cache, 'games.csv')
    if os.path.exists(gp):
        last_reg = last_regs(schedule(gp), new.get('calls') or {})
    else:
        print(f'note: no {gp}: the season\'s last regular-season kickoff is the committed summary\'s')
    bad = problems(new, old, last_reg, text, old_text)
    for b in bad:
        print('REFUSED: ' + b)
    if bad:
        return 1
    print(f'ok: {a.ledger} follows the committed ledger ({len(new.get("calls") or {})} rows, run {new.get("run_at")})')
    return 0


def cmd_summary(a):
    led = read_json(a.ledger)
    print(f"{a.ledger}: run {led.get('run_at')}, {len(led.get('calls') or {})} rows")
    for s, v in sorted((led.get('summary') or {}).items()):
        print(f'{s}: ' + line(v))
    return 0


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sub = p.add_subparsers(dest='cmd', required=True)
    for name in ('init', 'run', 'check', 'summary'):
        q = sub.add_parser(name)
        q.add_argument('--ledger', default=LEDGER)
        if name in ('init', 'run'):
            q.add_argument('--now', help='the run\'s clock, an ISO time (default: now)')
            q.add_argument('--data', default=os.path.join(ROOT, 'elo', 'data'), help='the published matchups.json and players.json')
        if name == 'init':
            q.add_argument('--season', type=int)
            q.add_argument('--force', action='store_true')
        if name == 'run':
            q.add_argument('--out', required=True, help='where the new ledger goes (never written in place)')
            q.add_argument('--cache', default=os.path.join(ROOT, 'elo', 'cache'), help='the build\'s nflverse files')
            q.add_argument('--archive', default=os.path.join(ROOT, 'props', 'data'), help='where espn_lines_<season>.json is')
        if name == 'check':
            q.add_argument('--against', default='HEAD', help='the git revision holding the committed ledger')
            q.add_argument('--committed', help='the committed ledger as a file, in place of git')
            q.add_argument('--cache', default=os.path.join(ROOT, 'elo', 'cache'), help='games.csv, for the last kickoff')
            q.add_argument('--registration', help='only: is this file the bar\'s registration as init writes it')
    a = p.parse_args(argv)
    if a.cmd == 'run' and os.path.abspath(a.out) == os.path.abspath(a.ledger):
        print('REFUSED: run writes the new ledger aside (--out), never in place')
        return 1
    return {'init': cmd_init, 'run': cmd_run, 'check': cmd_check, 'summary': cmd_summary}[a.cmd](a)


if __name__ == '__main__':
    sys.exit(main())
