#!/usr/bin/env python3
"""The anytime-touchdown shadow's check: the ledger td_shadow.py just wrote (to a temporary path), against the last
commit's, the payload just published, the page reader's page.json, the run's evidence.json and the raw 2026 files the
run staged. props.yml moves the ledger into place only when this passes, so a broken ledger is never committed and
the props publish, already pushed, is untouched (PREREGISTRATION.md section 8: "A check holds the ledger to the last
commit's, as shadow_check.py does"). Research only: nothing on the site reads the ledger.

It fails when:
   1. the file is not the canonical dump of what it parses to (a hand edit);
   2. the bar is not BAR or not the last commit's; bar_registered or the model block is not the last commit's (or not
      the manifest's); a call was made at or before bar_registered;
   3. PREREGISTRATION.md, results/oneshot_2026.json (and its anytime-touchdown PASS), frozen/MANIFEST.json or a file
      BAR registers does not hash to BAR;
   4. a called_at, frozen_at, graded_at, decided_at or the ledger's run_at names no runs entry; a runs entry the last
      commit had is changed; a new entry is not this run's; a run is a TD_SHADOW_STUB stand-in's (unless the same
      variable is set off GitHub Actions); the ledger differs from the last commit's while its run_at is the last
      commit's (only a run moves the record, and every run moves run_at, so rules 7 to 15 below are never skipped
      for a ledger that changed);
   5. a key is not 2026|WW|game id|player id of its own fields, the week is not the game's (on the schedule, and in
      the game id), a field is missing or extra, or an enum is out of range;
   6. a call was made 10 minutes or less before its kickoff, read at or after it or after it was made; p or m is
      outside [0.001, 0.999] or missing without its reason (or present with one); frozen and frozen_at disagree, a
      call froze before it was made, or before both kickoffs with no score; a grade sits on an unfrozen call;
   7. a call new or rewritten against the last commit is not this run's, is frozen, or does not carry exactly
      page.json's m side (read on this payload at this run's clock) and evidence.json's p side, its coverage verdict
      included;
   8. on a run that made calls, a game it called is not covered exactly (every listed player a call, no unlisted
      unfrozen call kept), a page game it should have called was not, or a game the payload offers to call is not in
      page.json at all (td_shadow.py makes no call on such a run: the page did not read every game);
   9. m is not clip(implied(price) / ov, 0.001, 0.999) to 1e-12 by the check's own formula, or (on a call this run
      wrote) ov is not the check's own reading of the week's overround: the median of implied(over) + implied(under)
      over the week's two-sided player main lines in PAY.mkt, else 1.0566 for a price from DraftKings' line; for a
      real price that median, else the median over every two-sided line of the week (player and game);
  10. a call the last commit had frozen, or whose earlier kickoff has passed, is gone, unfrozen, changed in anything
      but a grade added once, or froze anew at another time than this run; a call gone was not dropped for a reason
      the run has (a FAIL, delisted on the page, its game off the schedule or its week, its read withdrawn); an
      unfrozen call whose game left the schedule or its week, or whose read was withdrawn, is kept;
  11. a grade the last commit had is changed or gone;
  12. a new grade is not this run's, sits on an unfrozen call, came before kickoff + 96 h, is not evidence.json's
      or page.json's site reading, does not follow its how (a moved game, files not complete at 14 days, the game's
      own files covered), or, for td or no_td, the raw 2026 stats disagree: td needs his regular-season stat row in
      that game with rushing + receiving touchdowns >= 1 and equal to the evidence's y_rush_rec_tds; no_td needs that
      row with 0, or no row and a snap row in the evidence (a void with a raw stat row is a WARN: the build may drop a
      position the model does not cover);
  13. a frozen call 96 h past kickoff is left ungraded where the run could grade it (its game moved; its files
      covered on a run whose grading phase ran; not covered at 14 days);
  14. a decision is written with fewer than 2,000 in the sample or missing at 2,000; on its run it is not the
      check's own recomputation (verdict, criteria, n, games and sample exact; numbers to 1e-12); after it, it is not
      the last commit's; after a FAIL a call is new or rewritten, or an unfrozen call is left;
  15. the summary is not summarize() of the calls, the decision, the runs and the season's end.

Logged and never failed: a grade a fresh reading of the raw files now sees differently (a stat correction since), a
registered grade the site's settleLeg read otherwise, a no-stat no_td whose snap row is not found by pfr id.

What this check holds is a ledger a run wrote, against the last commit's. It cannot see a hand edit already merged:
once a pull request puts one on main, it is the last commit's ledger. That is held before the merge instead, by the
props gate (.github/scripts/props_gate.py, `ledger_hold`): a pull request may add the ledger once, as `td_shadow.py
init` writes it (--registration below), and never change or remove it after; the props job alone writes it, committed
straight to main.

    python -I td_shadow_check.py --ledger NEW --payload P [--page page.json] [--evidence evidence.json] [--data DIR]
           [--prev OLD | --no-prev] [--problems FILE]
    python -I td_shadow_check.py --registration FILE     the bar's registration as init writes it, and nothing else

Without --prev the last commit's ledger is read with `git show HEAD:<ledger>` (it works on a one-commit-deep
checkout). Ends "td shadow check: N failures" (exit 0 on none, 1 otherwise).
"""
import argparse
import csv
import hashlib
import json
import math
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import td_shadow as TS  # noqa: E402  (the standard library at its top; numbers load where they are worked)

TD_VIG = 1.0566          # the page's DK_EST.tdVig, the check's own copy (td_shadow_page.js holds the page's to espn_rule.js)
TOL = 1e-12


def ml_prob(ml):
    """the check's own implied chance of an American price"""
    return 100.0 / (ml + 100.0) if ml > 0 else abs(ml) / (abs(ml) + 100.0)


def num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def fair_px(v):
    return num(v) and v != 0


def median(a):
    if not a:
        return None
    s = sorted(a)
    h = len(s) // 2
    return s[h] if len(s) % 2 else (s[h - 1] + s[h]) / 2


def own_vig(pay, week):
    """the week's typical overround on its two-sided lines: (player main lines alone, every two-sided line)"""
    w = str(week)
    player, game = [], []
    for P in ((pay.get('mkt') or {}).get(w) or {}).values():
        if isinstance(P, dict):
            for L in P.values():
                if isinstance(L, dict) and fair_px(L.get('over')) and fair_px(L.get('under')):
                    player.append(ml_prob(L['over']) + ml_prob(L['under']))
    for g in pay.get('sched') or []:
        if not isinstance(g, dict) or str(g.get('w')) != w:
            continue
        if fair_px(g.get('mla')) and fair_px(g.get('mlh')):
            game.append(ml_prob(g['mla']) + ml_prob(g['mlh']))
        if num(g.get('sp')) and fair_px(g.get('spa')) and fair_px(g.get('sph')):
            game.append(ml_prob(g['spa']) + ml_prob(g['sph']))
        if num(g.get('tot')) and fair_px(g.get('tov')) and fair_px(g.get('tou')):
            game.append(ml_prob(g['tov']) + ml_prob(g['tou']))
    return median(player), median(player + game)


def want_ov(pay, week, src):
    player, everything = own_vig(pay, week)
    if src == 'dkline':
        return player or TD_VIG
    if src == 'real':
        return player or everything
    return None


def close(a, b):
    """equal, numbers to TOL, recursively"""
    if isinstance(a, dict) and isinstance(b, dict):
        return set(a) == set(b) and all(close(a[k], b[k]) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(close(x, y) for x, y in zip(a, b))
    if num(a) and num(b) and not isinstance(a, bool):
        return abs(a - b) <= TOL
    return a == b


def head_ledger():
    r = subprocess.run(['git', 'rev-parse', '--show-toplevel'], cwd=HERE, capture_output=True, text=True)
    if r.returncode:
        return None
    s = subprocess.run(['git', 'show', f'HEAD:{TS.LEDGER_REL}'], cwd=r.stdout.strip(), capture_output=True, text=True)
    return json.loads(s.stdout) if s.returncode == 0 and s.stdout.strip() else None


def raw_stats(data):
    """the raw 2026 regular-season stat rows the run staged: {(player id, game id): rushing + receiving touchdowns},
    {(player id, week, team): the same}; None where the file is not there"""
    p = os.path.join(data or '', 'raw', 'stats_player_week_2026.csv')
    if not data or not os.path.exists(p):
        return None
    by_game, by_week = {}, {}

    def f(v):
        try:
            return float(v) if v not in (None, '') else 0.0
        except ValueError:
            return float('nan')
    with open(p, encoding='utf-8', newline='') as fh:
        for r in csv.DictReader(fh):
            if r.get('season_type') != 'REG' or str(r.get('season')) != str(TS.SEASON):
                continue
            rr = f(r.get('rushing_tds')) + f(r.get('receiving_tds'))
            if r.get('game_id'):
                by_game[(r['player_id'], r['game_id'])] = rr
            by_week[(r['player_id'], int(float(r['week'])), r.get('team'))] = rr
    return by_game, by_week


def raw_row(stats, c, sched):
    by_game, by_week = stats
    if (c['pid'], c['game_id']) in by_game:
        return by_game[(c['pid'], c['game_id'])]
    g = sched.get(c['game_id']) or {}
    for t in (g.get('a'), g.get('h')):
        if (c['pid'], c['week'], t) in by_week:
            return by_week[(c['pid'], c['week'], t)]
    return None


def snap_found(data, c):
    """a snap row (offense or special teams) for him in that game by his pfr id: description only"""
    try:
        pfr = None
        with open(os.path.join(data, 'raw', 'players.csv'), encoding='utf-8', newline='') as fh:
            for r in csv.DictReader(fh):
                if r.get('gsis_id') == c['pid']:
                    pfr = r.get('pfr_id')
                    break
        if not pfr:
            return None
        with open(os.path.join(data, 'raw', 'snap_counts_2026.csv'), encoding='utf-8', newline='') as fh:
            for r in csv.DictReader(fh):
                if r.get('pfr_player_id') == pfr and r.get('game_id') == c['game_id']:
                    return float(r.get('offense_snaps') or 0) > 0 or float(r.get('st_snaps') or 0) > 0
        return False
    except (OSError, ValueError):
        return None


def check(L, text, prev, pay, pay_sha, page, ev, data, allow_stub=False):
    """(failures, notes, warnings), each a list of sentences"""
    bad, notes, warns = [], [], []

    def fail(rule, msg):
        bad.append(f'[{rule}] {msg}')
    t = TS.parse_t
    # 1. canonical bytes
    try:
        if TS.dumps(L) != text:
            fail(1, 'the ledger is not its own canonical dump')
    except ValueError as e:
        fail(1, f'the ledger is not the shadow\'s ({e})')
        return bad, notes, warns
    calls, runs, D = L['calls'], L['runs'], L.get('decision')
    pc = (prev or {}).get('calls') or {}
    pruns = (prev or {}).get('runs') or {}
    sched, E = TS.sched_map(pay), TS.espn_entries(pay)
    ra = L.get('run_at')
    run_at = t(ra) if ra else None
    # 2. the bar
    if L.get('bar') != TS.BAR:
        fail(2, 'the bar is not BAR')
    if prev is not None:
        for k in ('bar', 'bar_registered', 'model'):
            if L.get(k) != prev.get(k):
                fail(2, f'{k} is not the last commit\'s')
    try:
        if L.get('model') != TS.model_block(TS.manifest()):
            fail(2, 'the model block is not the manifest\'s touchdown files')
    except (OSError, ValueError, KeyError) as e:
        fail(2, f'the manifest does not read ({e})')
    breg = L.get('bar_registered')
    for k, c in calls.items():
        if breg is None or t(c['called_at']) <= t(breg):
            fail(2, f'{k} was called at or before the bar was registered')
    # 3. the registered files
    rw = TS.BAR['registered_with']
    for path, h in list(rw['runs'].items()) + [(f'{TS.REL}/PREREGISTRATION.md', rw['preregistration_sha256']),
                                                (f'{TS.REL}/results/oneshot_2026.json', rw['oneshot_sha256'])]:
        p = os.path.join(TS.REPO, path)
        if not os.path.exists(p) or TS.sha256_file(p) != h:
            fail(3, f'{path} does not hash to BAR')
    try:
        with open(TS.RESULT, encoding='utf-8') as f:
            if (json.load(f).get('verdict') or {}).get('anytime_td') != 'PASS':
                fail(3, 'the one-shot did not pass the anytime touchdown')
    except (OSError, ValueError):
        fail(3, 'results/oneshot_2026.json does not read')
    # 4. the runs
    refs = {c.get('called_at') for c in calls.values()} | {c.get('frozen_at') for c in calls.values()} \
        | {(c.get('grade') or {}).get('graded_at') for c in calls.values()} | {(D or {}).get('decided_at'), ra}
    for r in sorted(x for x in refs if x):
        if r not in runs:
            fail(4, f'{r} has no runs entry')
    for r, e in runs.items():
        if r in pruns and pruns[r] != e:
            fail(4, f'the runs entry {r} is not the last commit\'s')
        if r not in pruns and r != ra:
            fail(4, f'the runs entry {r} is new and not this run\'s')
        if e.get('stub') and not allow_stub:
            fail(4, f'the run {r} stood the model in with TD_SHADOW_STUB')
    if prev is not None and prev.get('run_at') and ra and t(ra) < t(prev['run_at']):
        fail(4, 'the ledger\'s run_at is earlier than the last commit\'s')
    changed_run = prev is None or ra != (prev or {}).get('run_at')
    # every run moves run_at, so a ledger at the last commit's run_at is the last commit's ledger, byte for byte; the
    # rules below that hold a run's changes (7 to 15) are skipped for it, so anything else here is a change no run made
    if not changed_run and (L != prev or text != TS.dumps(prev)):
        fail(4, "the ledger changed, but its run_at is the last commit's: no run made the change")
    if ra is None:
        if calls or D is not None:
            fail(4, 'calls or a decision with no run')
        if L.get('summary') != TS.summarize(calls, D, runs, TS.season_done(pay)):
            fail(15, 'the summary is not summarize() of the calls')
        return bad, notes, warns
    # 5. keys and fields; 6. timing
    for k, c in calls.items():
        if set(c) != set(TS.CALL_KEYS):
            fail(5, f'{k} does not carry exactly the call\'s fields')
            continue
        if c['season'] != TS.SEASON or not isinstance(c['week'], int) or k != TS.call_key(c['week'], c['game_id'], c['pid']):
            fail(5, f'{k} is not 2026|WW|game id|player id of its own fields')
        gw = c['game_id'].split('_')
        if len(gw) < 4 or gw[0] != str(TS.SEASON) or not gw[1].isdigit() or int(gw[1]) != c['week']:
            fail(5, f'{k}: the game id does not name its week')
        g = sched.get(c['game_id'])
        if g is not None and int(g.get('w') or 0) != c['week'] and not c['frozen']:
            fail(5, f'{k}: the week is not its game\'s on the schedule')
        for f, allowed in (('src', TS.SRC), ('branch', TS.BRANCHES), ('shown', TS.SHOWN), ('m_why', TS.M_WHY)):
            if c[f] is not None and c[f] not in allowed:
                fail(5, f'{k}: {f} {c[f]!r} is out of range')
        if c['p_why'] is not None and c['p_why'] not in TS.P_WHY and not str(c['p_why']).startswith(TS.COVERAGE_WHY):
            fail(5, f'{k}: p_why {c["p_why"]!r} is out of range')
        for f in ('m_est', 'tested', 'offered', 'in_players_csv', 'frozen'):
            if c[f] is not None and not isinstance(c[f], bool):
                fail(5, f'{k}: {f} is not true or false')
        try:
            kick = t(c['kickoff'])
            ca = t(c['called_at'])
            rd = t(c['read_at'])
        except (TypeError, ValueError):
            fail(6, f'{k}: a time does not read')
            continue
        if ca >= kick - TS.CALL_MARGIN:
            fail(6, f'{k} was called {TS.CALL_MARGIN.seconds // 60} minutes or less before its kickoff')
        if rd is None or rd >= kick or rd > ca:
            fail(6, f'{k}: read at or after kickoff, or after the call')
        for v, why, name in ((c['p'], c['p_why'], 'p'), (c['m'], c['m_why'], 'm')):
            if v is None and why is None:
                fail(6, f'{k}: no {name} and no reason')
            if v is not None and (why is not None or not num(v) or not (0.001 <= v <= 0.999)):
                fail(6, f'{k}: {name} {v!r} is out of range or carries a reason')
        if bool(c['frozen']) != (c['frozen_at'] is not None):
            fail(6, f'{k}: frozen and frozen_at disagree')
        if c['frozen_at']:
            fa = t(c['frozen_at'])
            early = TS.earliest_kickoff(c, sched)
            if fa < ca or (fa < early and not TS.scored(g)):
                fail(6, f'{k} froze before it was made, or before kickoff with no score')
        if c['grade'] is not None and not c['frozen']:
            fail(6, f'{k}: a grade on an unfrozen call')
    if not changed_run:
        return bad, notes, warns
    # what this run saw
    page_ok, page_why = (TS.page_check(page, pay, pay_sha, t(ev['now']), sched)
                         if (page is not None and ev) else (False, 'no page.json or evidence.json'))
    failed = (D or {}).get('verdict') == 'FAIL'
    evp = (ev or {}).get('p') or {}
    # 7. new or rewritten calls
    changed = [k for k, c in calls.items()
               if k not in pc or any(pc[k].get(f) != c.get(f) for f in TS.CALL_KEYS if f not in ('frozen', 'frozen_at', 'grade'))]
    for k in changed:
        c = calls[k]
        if c['called_at'] != ra:
            fail(7, f'{k} is new or rewritten but not by this run')
        if c['frozen']:
            fail(7, f'{k} is new or rewritten and frozen')
        if failed:
            fail(14, f'{k} is new or rewritten after a FAIL')
        if not page_ok:
            fail(7, f'{k} is new or rewritten with no usable page.json ({page_why})')
            continue
        G = page['games'].get(c['game_id'])
        pr = (G or {}).get('players', {}).get(c['pid'])
        if G is None or pr is None or c['pid'] not in G['td']:
            fail(7, f'{k}: its game or player is not in page.json')
            continue
        for f in TS.M_FIELDS:
            if c[f] != pr.get(f):
                fail(7, f'{k}: {f} {c[f]!r} is not page.json\'s {pr.get(f)!r}')
        g = sched.get(c['game_id'])
        if c['read_at'] != TS.norm_t(G.get('read_at')) or c['kickoff'] != TS.norm_t(G.get('kickoff')) \
                or g is None or c['kickoff'] != TS.iso(TS.ko(g)) or c['week'] != int(g['w']):
            fail(7, f'{k}: its read time, kickoff or week is not page.json\'s and the schedule\'s')
        e = evp.get(f"{c['game_id']}|{c['pid']}")
        if e is None:
            fail(7, f'{k}: evidence.json has no p for it')
            continue
        for f in TS.P_FIELDS:
            if c[f] != e.get(f):
                fail(7, f'{k}: {f} {c[f]!r} is not evidence.json\'s {e.get(f)!r}')
        if c['grp'] != (e.get('grp') or pr.get('grp')):
            fail(7, f'{k}: grp {c["grp"]!r} is not the model\'s (else the page\'s)')
        cov = (((ev.get('weeks') or {}).get(str(c['week'])) or {}).get('coverage') or {})
        if c['game_id'] not in cov:
            fail(7, f'{k}: evidence.json records no coverage verdict for its game')
        elif cov[c['game_id']] is not None and (c['p'] is not None or c['p_why'] != cov[c['game_id']]):
            fail(7, f'{k}: its game is not covered ({cov[c["game_id"]]}) but the call says otherwise')
        elif cov[c['game_id']] is None and str(c['p_why'] or '').startswith(TS.COVERAGE_WHY):
            fail(7, f'{k}: its game is covered but the call says it is not')
    # 8. the lists called
    if ev and (ev.get('phases') or {}).get('calls') == 'made':
        called = set(ev.get('called') or [])
        if not page_ok:
            fail(8, f'calls were made with no usable page.json ({page_why})')
        else:
            want = TS.callable_games(pay, t(ev['now']))
            for gid in sorted(want):
                if gid not in page['games'] and want[gid][1] > run_at + TS.CALL_MARGIN:
                    fail(8, f'{gid}, a game the payload offers to call, is not in page.json, yet calls were made')
            for gid, G in page['games'].items():
                g = sched[gid]
                if TS.ko(g) > run_at + TS.CALL_MARGIN and G['td'] and gid in want and gid not in called:
                    fail(8, f'{gid} was to be called and was not')
            for gid in sorted(called):
                G = page['games'].get(gid)
                if G is None or not TS.ko(sched[gid]) > run_at + TS.CALL_MARGIN:
                    fail(8, f'{gid} was called within {TS.CALL_MARGIN.seconds // 60} minutes of kickoff or off the page')
                    continue
                listed = set(G['td'])
                have = {c['pid'] for c in calls.values() if c['game_id'] == gid}
                loose = {c['pid'] for c in calls.values() if c['game_id'] == gid and not c['frozen']} - listed
                if listed - have:
                    fail(8, f'{gid}: {len(listed - have)} listed player(s) with no call')
                if loose:
                    fail(8, f'{gid}: {len(loose)} unfrozen call(s) of players no longer listed kept')
    # 9. m against its price
    for k, c in calls.items():
        if c['m'] is None:
            continue
        if c['src'] not in TS.SRC or not fair_px(c['price']) or not num(c['ov']) or c['ov'] <= 0:
            fail(9, f'{k}: m with no price, source or overround')
            continue
        want = max(0.001, min(0.999, ml_prob(c['price']) / c['ov']))
        if abs(c['m'] - want) > TOL:
            fail(9, f'{k}: m {c["m"]} is not clip(implied({c["price"]}) / {c["ov"]}) = {want}')
        if k in changed:
            w = want_ov(pay, c['week'], c['src'])
            if w is None or abs(c['ov'] - w) > TOL:
                fail(9, f'{k}: ov {c["ov"]} is not the week\'s overround as the check reads it ({w})')
    # 10. nothing frozen moved; drops; kept what should have gone
    for k, p0 in pc.items():
        try:
            early = TS.earliest_kickoff(p0, sched)
        except (TypeError, ValueError):
            continue
        g = sched.get(p0['game_id'])
        c = calls.get(k)
        if p0['frozen'] or run_at >= early or TS.scored(g):
            if c is None:
                fail(10, f'{k} was frozen (or its game kicked off) and is gone')
                continue
            if not c['frozen']:
                fail(10, f'{k} was frozen (or its game kicked off) and is not frozen')
            moved_f = [f for f in TS.CALL_KEYS if f not in ('frozen', 'frozen_at', 'grade') and c.get(f) != p0.get(f)]
            if moved_f:
                fail(10, f'{k}: a frozen call changed ({", ".join(moved_f)})')
            if p0['frozen'] and c['frozen_at'] != p0['frozen_at']:
                fail(10, f'{k}: frozen_at moved')
            if not p0['frozen'] and c['frozen_at'] != ra:
                fail(10, f'{k} froze at another time than this run')
        elif c is None:
            why = failed or TS.withdrawn_after(E.get(p0['game_id']), p0['read_at']) or g is None \
                or int(g.get('w') or 0) != p0['week'] \
                or (ev and p0['game_id'] in (ev.get('called') or []) and page_ok
                    and p0['pid'] not in page['games'][p0['game_id']]['td'])
            if not why:
                fail(10, f'{k} was dropped with no reason the run has')
    for k, c in calls.items():
        if k not in pc and c['frozen']:
            fail(10, f'{k} is new and frozen')
        if not c['frozen']:
            g = sched.get(c['game_id'])
            if g is None or int(g.get('w') or 0) != c['week'] or TS.withdrawn_after(E.get(c['game_id']), c['read_at']):
                fail(10, f'{k} should have been dropped (its game left the schedule or its week, or its read was withdrawn)')
            if failed:
                fail(14, f'{k} is unfrozen after a FAIL')
    # 11. old grades; 12. new grades
    stats = raw_stats(data)
    own = (ev or {}).get('own_coverage') or {}
    site = (page.get('site') or {}) if page_ok else {}
    for k, p0 in pc.items():
        if p0.get('grade') is not None and (k not in calls or calls[k].get('grade') != p0['grade']):
            fail(11, f'{k}: its grade changed or went')
    for k, c in calls.items():
        gr = c.get('grade')
        if gr is None:
            continue
        if k in pc and pc[k].get('grade') is not None:
            if stats and gr['result'] in ('td', 'no_td'):
                rr = raw_row(stats, c, sched)
                y0 = (gr.get('evidence') or {}).get('y_rush_rec_tds')
                if rr is not None and y0 is not None and rr != y0:
                    notes.append(f'{k}: graded with {y0} rushing + receiving TDs, the raw stats now say {rr} (a correction '
                                 'since; the grade stands)')
            continue
        if set(gr) != set(TS.GRADE_KEYS):
            fail(12, f'{k}: the grade does not carry exactly its fields')
            continue
        kick = t(c['kickoff'])
        if gr['graded_at'] != ra:
            fail(12, f'{k}: a new grade not by this run')
        if run_at < kick + TS.GRADE_AFTER:
            fail(12, f'{k}: graded before kickoff + 96 h')
        e = ((ev or {}).get('grades') or {}).get(k)
        if e is None or any(e.get(f) != gr[f] for f in ('result', 'y', 'how', 'evidence')):
            fail(12, f'{k}: the grade is not evidence.json\'s')
        want_site = site.get(k) if isinstance(site.get(k), dict) else None
        if gr['site'] != want_site:
            fail(12, f'{k}: the site reading is not page.json\'s')
        res, how, y = gr['result'], gr['how'], gr['y']
        ok = ((res == 'td' and y == 1) or (res == 'no_td' and y == 0)) if how == 'played' else \
            (res == 'void' and y is None and how in TS.VOID_HOW)
        if not ok:
            fail(12, f'{k}: result {res!r}, y {y!r} and how {how!r} do not go together')
            continue
        if (gr['evidence'] is None) != (how != 'played'):
            fail(12, f'{k}: the evidence is there where it should not be, or missing')
        if how == 'game moved':
            if not TS.moved(c, sched):
                fail(12, f'{k}: void as a moved game, but the game kicks off within 24 h of the call\'s kickoff')
            continue
        if how == 'files never complete':
            if own.get(c['game_id']) is not False or run_at < kick + TS.NEVER_COMPLETE:
                fail(12, f'{k}: void for files never complete, but the files are in or 14 days have not passed')
            continue
        if TS.moved(c, sched):
            fail(12, f'{k}: its game moved, so it is void as a moved game')
        if own.get(c['game_id']) is not True:
            fail(12, f'{k}: graded on files evidence.json does not record as covered')
        if stats is None:
            fail(12, f'{k}: graded with no raw 2026 stats to check it against (--data)')
            continue
        rr = raw_row(stats, c, sched)
        ev12 = gr['evidence'] or {}
        if how == 'did not play':
            if rr is not None:
                warns.append(f'{k} is void (did not play) though the raw stats have a row for him: the build dropped '
                             'him (a position the model does not cover?)')
            continue
        if res == 'td' and (rr is None or not rr >= 1 or rr != ev12.get('y_rush_rec_tds')):
            fail(12, f'{k}: td, but the raw stat row says {rr} rushing + receiving TDs '
                     f'(evidence {ev12.get("y_rush_rec_tds")})')
        if res == 'no_td':
            if rr is not None and (rr != 0 or ev12.get('y_rush_rec_tds') != 0):
                fail(12, f'{k}: no_td, but the raw stat row says {rr} (evidence {ev12.get("y_rush_rec_tds")})')
            if rr is None:
                if ev12.get('snap_row') != 1:
                    fail(12, f'{k}: no_td with no raw stat row and no snap row')
                elif data and snap_found(data, c) is False:
                    notes.append(f'{k}: no_td on a snap the check did not find by his pfr id (the build places by '
                                 'name too)')
        if want_site and want_site.get('result') not in (None, 'pending', res):
            notes.append(f'{k}: registered {res}, the site read {want_site.get("result")}')
    # 13. overdue
    pend = (ev or {}).get('pending') or {}
    for k, c in calls.items():
        if not c['frozen'] or c['grade'] is not None or run_at < t(c['kickoff']) + TS.GRADE_AFTER:
            continue
        if TS.moved(c, sched):
            fail(13, f'{k}: its game moved and it is ungraded')
        elif own.get(c['game_id']) is True and ((ev or {}).get('phases') or {}).get('grade') == 'ok' and k not in pend:
            fail(13, f'{k}: due, its game\'s files covered, and ungraded')
        elif own.get(c['game_id']) is False and run_at >= t(c['kickoff']) + TS.NEVER_COMPLETE:
            fail(13, f'{k}: its files not complete at 14 days and it is not void')
    # 14. the decision
    n = len(TS.in_sample(calls))
    pD = (prev or {}).get('decision')
    if D is not None and n < TS.SAMPLE_N:
        fail(14, f'a decision with {n} in the sample')
    if D is None and n >= TS.SAMPLE_N:
        fail(14, f'{n} in the sample and no decision')
    if D is not None and pD is None:
        if D.get('decided_at') != ra:
            fail(14, 'a new decision not by this run')
        mine = TS.decide(calls, run_at)
        if mine is None or any(mine[f] != D.get(f) for f in ('verdict', 'criteria', 'n', 'games', 'sample', 'decided_at')) \
                or not close(mine['T1'], D.get('T1')) or not close(mine['T2'], D.get('T2')):
            fail(14, 'the decision is not the check\'s own recomputation')
    elif pD is not None and D != pD:
        fail(14, 'the decision is not the last commit\'s')
    # 15. the summary
    if L.get('summary') != TS.summarize(calls, D, runs, TS.season_done(pay)):
        fail(15, 'the summary is not summarize() of the calls')
    return bad, notes, warns


def registration_bad(text):
    """why a ledger's text is not the bar's registration exactly as `td_shadow.py init` writes it (canonical, BAR with
    no open question, the manifest's touchdown files, a registration time, no run, no call, no decision and the empty
    summary), or []. The props gate holds a ledger a pull request adds to this (props_gate.py, `ledger_hold`)"""
    try:
        L = json.loads(text)
    except ValueError as e:
        return [f'it does not read as JSON ({e})']
    try:
        if TS.dumps(L) != text:
            return ['it is not its own canonical dump']
    except ValueError as e:
        return [f"it is not the shadow's ledger ({e})"]
    bad = []
    if L.get('what') != TS.WHAT:
        bad.append("its what is not the shadow's own")
    if L.get('bar') != TS.BAR:
        bad.append('its bar is not BAR')
    if '[Q' in text:
        bad.append("it holds an open question ('[Q')")
    try:
        if L.get('model') != TS.model_block(TS.manifest()):
            bad.append("its model block is not the manifest's touchdown files")
    except (OSError, ValueError, KeyError) as e:
        bad.append(f'the manifest does not read ({e})')
    try:
        if not isinstance(L.get('bar_registered'), str) or TS.iso(L['bar_registered']) != L['bar_registered']:
            bad.append('its bar_registered is not a time as the ledger writes one')
    except (TypeError, ValueError):
        bad.append('its bar_registered is not a time')
    for k, want in (('run_at', None), ('decision', None), ('runs', {}), ('calls', {})):
        if L.get(k) != want:
            bad.append(f'its {k} is not {json.dumps(want)}: a registration has no run, call or decision')
    if L.get('summary') != TS.summarize({}, None):
        bad.append('its summary is not the empty ledger\'s')
    return bad


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--registration', default=None, metavar='FILE',
                    help="only: is FILE the bar's registration as td_shadow.py init writes it (the props gate's hold)")
    ap.add_argument('--ledger', default=None)
    ap.add_argument('--payload', default=None)
    ap.add_argument('--page', default=None)
    ap.add_argument('--evidence', default=None)
    ap.add_argument('--data', default=None)
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--prev', default=None)
    g.add_argument('--no-prev', action='store_true')
    ap.add_argument('--problems', default=None)
    a = ap.parse_args(argv)
    if a.registration:
        try:
            with open(a.registration, encoding='utf-8') as f:
                bad = registration_bad(f.read())
        except (OSError, UnicodeDecodeError) as e:
            bad = [f'it does not read ({e})']
        for x in bad:
            print('FAIL:', x)
        print(f'td shadow registration: {len(bad)} failures')
        return 1 if bad else 0
    if not (a.ledger and a.payload):
        ap.error('--ledger and --payload are required (or --registration FILE alone)')

    def opt(p):
        if not p or not os.path.exists(p):
            return None
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    try:
        with open(a.ledger, encoding='utf-8') as f:
            text = f.read()
        L = json.loads(text)
        with open(a.payload, 'rb') as f:
            raw = f.read()
        pay = json.loads(raw)
        page, ev = opt(a.page), opt(a.evidence)
        if a.no_prev:
            prev = None
        elif a.prev:
            prev = opt(a.prev)
            if prev is None:
                raise ValueError(f'--prev {a.prev} does not exist')
        else:
            prev = head_ledger()
            if prev is None:
                raise ValueError('the last commit has no ledger (pass --no-prev for a first check on its own)')
    except (OSError, ValueError) as e:
        print(f'td shadow check: its inputs do not read ({e})')
        print('td shadow check: 1 failures')
        return 1
    allow = bool(os.environ.get('TD_SHADOW_STUB')) and os.environ.get('GITHUB_ACTIONS') != 'true'
    try:
        bad, notes, warns = check(L, text, prev, pay, hashlib.sha256(raw).hexdigest(), page, ev, a.data, allow)
    except Exception as e:        # noqa: BLE001 -- a ledger this check cannot read is a failure, never a pass
        import traceback
        traceback.print_exc()
        bad, notes, warns = [f'the check could not read the ledger ({e!r})'], [], []
    for x in notes:
        print('note:', x)
    for x in warns:
        print('WARN:', x)
    if warns and a.problems:
        with open(a.problems, 'a', encoding='utf-8') as f:
            for x in warns:
                f.write('WARN: ' + ' '.join(x.split()) + '\n')
    for x in bad:
        print('FAIL:', x)
    print(f'td shadow check: {len(bad)} failures')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
