#!/usr/bin/env python3
"""The anytime-touchdown shadow's test (props/research/propmodel/README.md, "The touchdown shadow"; td_shadow.py,
td_shadow_check.py and td_shadow_page.js). A unit of the props gate's job C: Python 3.12 with props/requirements.txt
(numpy, pandas, pyarrow; no lightgbm and no scipy), node 22 with props/build/node_modules, the full git history. The
model never runs here: p and the played rows are a TD_SHADOW_STUB stand-in, or the registered functions' glue fed
made-up frames. No 2026 outcome is read: every played row and stat row below is made up, and the one real payload
used, props/data/payload.json as the props job published it at 9dbe81f6 (30 October 2026, 20:43 UTC), is read for
its schedule, its published ESPN read and the page's own estimate, at clocks before its games, and for made-up finals.

  A  the call rules on a made-up week (in process: td_shadow.update, then td_shadow_check.check on what it wrote)
  B  the grades: none before 96 h, pending while a game's files are out, void at 14 days, td / no_td / void from
     made-up played rows, a moved game, the site's reading recorded, a grade never rewritten
  C  the decision: decide() with the one-shot's own mean_diff and signal_test equal to them called directly, bit for
     bit; the rest on stand-ins: none at 1,999, the first 2,000 in grading order, PASS and each way to FAIL, the
     owner's Q2 (no touchdown priced on the model alone in the sample), FAIL stopping calls, PASS letting them go on,
     the season ending undecided
  D  the check bites: one planted edit per rule (1 to 15)
  E  the page reader on planted copies of the pinned payload (a lined player, a backup, the model alone, a real
     price, one ruled out, one with nothing to project, one shown only with backups; the reader refusing a page whose
     legChance or row moved; the site's own verdicts on made-up finals) and F on the pinned payload as published,
     with the zone database's kickoff against the page's on every game, then td_shadow.py run and the check on it
  G  plan and notify (--dry-run), the problem classes
  H  staging: props/raw under the model's names, hist_ok only for exactly the manifest's files, the frozen inputs
     restored, every download through lib/netfetch.py, predict.refresh never called, and the p and grade glue
  I  the guard: the holdout at 2026 after importing, refusals (PROPMODEL_LIFT_HOLDOUT, a registered file altered in a
     copy of the tree, a result not the one-shot's, a branch on Actions, the stub on Actions or on the committed
     ledger, a ledger not canonical, a clock not after the ledger's), the lift undone after an exception, and the
     checkout's registered files their registered hashes (a PR editing one fails here)
  J  nothing on the site reads the ledger

    python3 props/research/propmodel/test_td_shadow.py      ends "N checks, 0 failures"; stops itself at 3 minutes
"""
import contextlib
import csv
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from argparse import Namespace
from datetime import timedelta
from types import SimpleNamespace

sys.dont_write_bytecode = True
STOP_AFTER_S = 3 * 60          # the test stops itself and fails here (test_props_gate.py reads it for job C's cap)
T_START = time.time()
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PINNED = '9dbe81f6'            # "props: refresh 2026-10-30 20:43 UTC": its payload is the page reader's fixture
# nothing of the props job's environment or the shadow's own knobs leaks into a run here
STRIP = ('GITHUB_ACTIONS', 'GITHUB_REF_NAME', 'GITHUB_OUTPUT', 'GITHUB_STEP_SUMMARY', 'RUNNER_TEMP', 'TD_SHADOW_STUB',
         'TD_SHADOW_NOW', 'PROPMODEL_LIFT_HOLDOUT', 'PROPMODEL_DUMP_CANDIDATES', 'SUGGEST_PAGE', 'PYTHONPATH')
for _k in STRIP:
    os.environ.pop(_k, None)
sys.path.insert(0, HERE)
import td_shadow as TS          # noqa: E402
import td_shadow_check as TSC   # noqa: E402

N = BAD = 0
CHILDREN = []


def ok(cond, what, detail=''):
    global N, BAD
    N += 1
    if not cond:
        BAD += 1
        print(f'FAIL: {what}' + (f' -- {str(detail)[:600]}' if detail else ''), flush=True)
    return bool(cond)


def say(*a):
    print(*a, flush=True)


def _stop():
    for p in CHILDREN:
        with contextlib.suppress(Exception):
            p.kill()
    print(f'FAIL: the test ran past {STOP_AFTER_S // 60} minutes and stopped itself', flush=True)
    print(f'{N} checks, {BAD + 1} failures', flush=True)
    shutil.rmtree(TMP, ignore_errors=True)
    os._exit(1)


_WATCH = threading.Timer(STOP_AFTER_S, _stop)
_WATCH.daemon = True
_WATCH.start()


def env(**extra):
    e = {k: v for k, v in os.environ.items() if k not in STRIP}
    e.update(PYTHONDONTWRITEBYTECODE='1', PYTHONUTF8='1')
    e.update({k: v for k, v in extra.items() if v is not None})
    return e


def sh(args, timeout=120, **extra):
    r = subprocess.run(args, env=env(**extra), capture_output=True, text=True, cwd=REPO, timeout=timeout)
    return r.returncode, (r.stdout + r.stderr).strip()


def py(*args, timeout=120, **extra):
    return sh([sys.executable, '-I', '-B', *args], timeout=timeout, **extra)


def last(o):
    return o.strip().splitlines()[-1] if o.strip() else ''


def sha_text(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def dump(path, obj):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f)
    return path


def jload(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


@contextlib.contextmanager
def quiet():
    with contextlib.redirect_stdout(io.StringIO()):
        yield


@contextlib.contextmanager
def patched(obj, **attrs):
    old = {k: getattr(obj, k) for k in attrs}
    for k, v in attrs.items():
        setattr(obj, k, v)
    try:
        yield
    finally:
        for k, v in old.items():
            setattr(obj, k, v)


@contextlib.contextmanager
def envset(**kv):
    old = {k: os.environ.get(k) for k in kv}
    os.environ.update(kv)
    try:
        yield
    finally:
        for k, v in old.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


T = TS.parse_t
ISO = TS.iso


def implied(price):
    return TSC.ml_prob(price)


def m_of(price, ov):
    return max(0.001, min(0.999, implied(price) / ov))


TMP = tempfile.mkdtemp(prefix='td-shadow-test-')
_SEQ = [0]


def seq():
    _SEQ[0] += 1
    return _SEQ[0]
COMMITTED = TS.LEDGER
COMMITTED_SHA = TS.sha256_file(COMMITTED) if os.path.exists(COMMITTED) else None

# ------------------------------------------------------------------------------- the page reader's helper (node)
# Written to the temporary folder and run once, beside the Python sections (each boot of the page takes a few
# seconds). It requires td_shadow_page.js and props/build/suggest_ledger.js by their paths in this checkout, so the
# page it boots is this checkout's root index.html; it records what the page asked for (suggest_ledger's boot), and
# writes one JSON file of readings for the sections E and F below to hold.
HELPER = r"""
'use strict';
const fs = require('fs'), path = require('path');
const [REPO, PAYLOAD, OUT] = process.argv.slice(2);
const TP = require(path.join(REPO, 'props/research/propmodel/td_shadow_page.js'));
const SL = require(path.join(REPO, 'props/build/suggest_ledger.js'));
const boot0 = SL.boot; let asked = [];
SL.boot = async (...a) => { const r = await boot0(...a); asked = r.asked; return r; };
const res = { strays: [] };
// a window closed while its page was still settling can throw later; it is no part of a reading (the reader's own
// errs, held before and after each reading, are), so it is kept as a note, never a crash
process.on('uncaughtException', e => res.strays.push(String((e && e.stack) || e).slice(0, 200)));
process.on('unhandledRejection', e => res.strays.push(String((e && e.stack) || e).slice(0, 200)));
const done = code => { fs.writeFileSync(OUT, JSON.stringify(res)); process.exit(code); };
setTimeout(() => { res.error = 'the page helper ran past 150 s'; done(1); }, 150e3);
const BASE = fs.readFileSync(PAYLOAD, 'utf8');
async function boot(opts) {
  const t = Date.now(); asked = [];
  try { const page = await TP.run(opts); return { page, asked: asked.slice(), s: (Date.now() - t) / 1000 }; }
  catch (e) { return { refused: e instanceof TP.Refuse, msg: String((e && e.message) || e).slice(0, 400), asked: asked.slice(), s: (Date.now() - t) / 1000 }; }
}
const rows = R => Object.entries(R.games).flatMap(([gid, G]) => Object.entries(G.players).map(([pid, r]) => Object.assign({ gid, pid }, r)));
(async () => {
  const T0 = '2026-10-30T21:00:00Z';
  // F: the pinned payload as published, and the page's own kickoff of every game of the schedule
  let kicks = null;
  res.F = await boot({ payloadText: BASE, now: T0, patch: w => {
    kicks = JSON.parse(w.eval('JSON.stringify(S.sched.map(g => { const k = kickoff(g); return [g.id, k ? k.toISOString() : null]; }))')); } });
  res.F.kicks = kicks;
  if (!res.F.page) return done(0);
  const B = rows(res.F.page), P = JSON.parse(BASE);
  const injured = pid => P.injuries.some(x => String(x.week) === '8' && x.gsis_id === pid);
  // E1: planted. A real price (a pull by hand) on a lined player; one game's read moved to 8 hours before its kickoff
  // (its clubs' lines complete: the backup branch); one player planted Out on the week's report (ruled out); the other
  // games read about 40 hours out (the model alone where no line was read)
  const games = res.F.page.games;
  const lined = B.find(r => r.branch === 'lined' && r.shown === 'default' && r.grp !== 'QB');
  const Y = Object.keys(games).sort().find(g => g !== lined.gid && games[g].kickoff === '2026-11-01T18:00:00.000Z');
  const outP = B.find(r => r.branch === 'lined' && r.gid !== lined.gid && r.gid !== Y && r.m != null && !injured(r.pid));
  P.prices = P.prices || {};
  P.prices['8'] = [{ game_id: lined.gid, player: lined.name, market: 'any_td', threshold: '1', odds: '250', pid: lined.pid }];
  P.injuries.push({ season: '2026', week: '8', gsis_id: outP.pid, team: outP.team, report_status: 'Out',
    practice_status: 'Did Not Participate In Practice', injury: 'planted' });
  const NOW1 = '2026-11-01T12:00:00Z';
  res.E1 = await boot({ payloadText: JSON.stringify(P), now: NOW1, patch: w => w.eval(`(function(){
    const e = PAY.espn.games[${JSON.stringify(Y)}], g = S.sched.find(x => x.id === ${JSON.stringify(Y)});
    const t = new Date(kickoff(g).getTime() - 8 * 3600e3).toISOString(); e.pl.at = t; if (e.out) e.out.at = t; espnPublished(); })()`) });
  res.E1.plant = { real: lined.pid, real_gid: lined.gid, backup_game: Y, out: outP.pid, out_gid: outP.gid, now: NOW1 };
  res.E1.payload = JSON.stringify(P);
  // E2: the reader refuses a page that moved m: legChance off legFairStated, and the row drawn rounded
  res.refusals = [];
  for (const [name, re, code] of [
    ['legChance moved off legFairStated', /legFairStated/, '(function(){ const L0=legChance; legChance=function(l,m){ const c=L0(l,m); return c&&l.stat==="any_td"?{p:Math.min(0.999,c.p+0.01),est:c.est}:c; }; })()'],
    ['the row drawn rounded', /the row states/, '(function(){ const G0=gpChance; gpChance=function(c){ return G0(c?{p:Math.round(c.p*100)/100,est:c.est}:c); }; })()']]) {
    const r = await boot({ payloadText: BASE, now: T0, patch: w => w.eval(code) });
    res.refusals.push({ name, refused: !!r.refused, matched: !!(r.msg && re.test(r.msg)), msg: r.msg || null });
  }
  // E3: the site's own verdicts (description) on MADE-UP finals of three week-8 games the pinned payload has no stats
  // or snap counts for: a receiving TD, a stat line with none, a row of zeros from the snaps, a quarterback with passing
  // TDs only, his club's snaps in without him, Out with no snaps, neither, and a game whose stats are not in; and the
  // calls the reader passes over (under 90 hours, unfrozen, graded)
  {
    const P3 = JSON.parse(BASE), G1 = games['2026_08_BAL_BUF'], G2 = games['2026_08_TEN_CIN'], G3 = games['2026_08_MIN_DET'];
    const lst = (G, team) => G.td.filter(pid => G.players[pid].team === team && G.players[pid].m != null && G.players[pid].grp !== 'QB');
    const [A, Bp, C] = lst(G1, 'BAL'), [E] = lst(G1, 'BUF'), [H] = lst(G2, 'TEN');
    const notOut = pid => !P3.injuries.some(x => String(x.week) === '8' && x.gsis_id === pid && x.report_status === 'Out');
    const [F, Gp] = lst(G2, 'CIN').filter(notOut), [M] = lst(G3, 'MIN');
    const D = P3.players.find(p => p.t === 'BAL' && p.g === 'QB').id;
    const row = (pid, team, opp, pos, st) => Object.assign({ player_id: pid, player_display_name: 'planted', position: pos, season: 2026,
      week: 8, season_type: 'REG', team, opponent_team: opp }, st);
    P3.stats['8'] = (P3.stats['8'] || []).concat([
      row(A, 'BAL', 'BUF', G1.players[A].grp, { receptions: 4, receiving_yards: 51, receiving_tds: 1 }),
      row(Bp, 'BAL', 'BUF', G1.players[Bp].grp, { receptions: 3, receiving_yards: 22 }),
      row(C, 'BAL', 'BUF', G1.players[C].grp, { from_snaps: 1 }),
      row(D, 'BAL', 'BUF', 'QB', { completions: 20, attempts: 31, passing_yards: 240, passing_tds: 2 }),
      row(H, 'TEN', 'CIN', G2.players[H].grp, { receptions: 2, receiving_yards: 15 })]);
    P3.snaps['8'] = Object.assign({}, P3.snaps['8'] || {}, { '2026_08_BAL_BUF': { BAL: [C], BUF: [] } });
    P3.injuries.push({ season: '2026', week: '8', gsis_id: F, team: 'CIN', report_status: 'Out', practice_status: 'Did Not Participate In Practice', injury: 'planted' });
    const snf = games['2026_08_PHI_WAS'], others = G3.td.filter(pid => pid !== M);
    const call = (G, gid, pid, team, why, want, extra) => [`2026|08|${gid}|${pid}`, Object.assign({ season: 2026, week: 8, game_id: gid, pid, team,
      kickoff: G.kickoff, frozen: true, grade: null, _why: why, _want: want }, extra || {})];
    const calls = Object.fromEntries([
      call(G1, '2026_08_BAL_BUF', A, 'BAL', 'a stat row with a receiving TD', 'td'),
      call(G1, '2026_08_BAL_BUF', Bp, 'BAL', 'a stat row with no TD', 'no_td'),
      call(G1, '2026_08_BAL_BUF', C, 'BAL', 'a row of zeros from the snaps', 'no_td'),
      call(G1, '2026_08_BAL_BUF', D, 'BAL', 'a quarterback with passing TDs only', 'no_td'),
      call(G1, '2026_08_BAL_BUF', E, 'BUF', 'no row, his club\'s snaps in without him', 'void'),
      call(G2, '2026_08_TEN_CIN', F, 'CIN', 'no snaps for his game, Out', 'void'),
      call(G2, '2026_08_TEN_CIN', Gp, 'CIN', 'no snaps for his game, not Out', 'pending'),
      call(G3, '2026_08_MIN_DET', M, 'MIN', 'his game\'s stats not in', 'pending'),
      call(snf, '2026_08_PHI_WAS', snf.td[0], 'PHI', 'under 90 hours: passed over', null),
      call(G3, '2026_08_MIN_DET', others[0], null, 'unfrozen: passed over', null, { frozen: false }),
      call(G3, '2026_08_MIN_DET', others[1], null, 'graded: passed over', null, { grade: { result: 'td' } })]);
    const r = await boot({ payloadText: JSON.stringify(P3), now: '2026-11-05T12:00:00Z', ledger: { calls } });
    res.site = Object.assign(r, { expect: Object.fromEntries(Object.entries(calls).map(([k, c]) => [k, { why: c._why, want: c._want }])),
      zeros: `2026|08|2026_08_BAL_BUF|${C}`, line: `2026|08|2026_08_BAL_BUF|${Bp}` });
  }
  done(0);
})().catch(e => { res.error = String((e && e.stack) || e); done(1); });
"""


def start_helper():
    """the pinned payload from git history, and the page helper started on it (or why neither could be)"""
    pinned = os.path.join(TMP, 'payload_pinned.json')
    r = subprocess.run(['git', '-C', REPO, 'show', f'{PINNED}:props/data/payload.json'], capture_output=True)
    if r.returncode or not r.stdout:
        return None, None, f'git show {PINNED}:props/data/payload.json failed (job C checks out the whole history: fetch-depth 0)'
    with open(pinned, 'wb') as f:
        f.write(r.stdout)
    if not os.path.isdir(os.path.join(REPO, 'props', 'build', 'node_modules', 'jsdom')):
        return pinned, None, 'props/build/node_modules has no jsdom (npm ci in props/build first)'
    hp, out = os.path.join(TMP, 'page_helper.js'), os.path.join(TMP, 'page_helper.json')
    with open(hp, 'w', encoding='utf-8') as f:
        f.write(HELPER)
    p = subprocess.Popen(['node', hp, REPO, pinned, out], cwd=REPO, env=env(), stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, text=True)
    CHILDREN.append(p)
    return pinned, (p, out), None


PINNED_PATH, HELPER_PROC, HELPER_WHY = start_helper()


# ------------------------------------------------------------------------------------------- a made-up week
# Nine games of 2026 week 9 (and one of week 10) between made-up clubs, each with a published read listing its
# players; the page's record of each player as td_shadow_page.js writes it (m worked from the price and the overround
# exactly as the check reads it); the stub's p, coverage and played rows; and the raw stat rows the check holds a
# grade to. Kickoffs are US Eastern, as the schedule writes them.
GAMES = (('2026_09_AAA_BBB', 9, '2026-11-05', '20:15'),   # G1 Thursday night: frozen at kickoff, then flexed (moved)
         ('2026_09_CCC_DDD', 9, '2026-11-08', '13:00'),   # G2 its clubs' history incomplete; then moved earlier
         ('2026_09_EEE_FFF', 9, '2026-11-08', '16:25'),   # G3 scored early (frozen by the score), then graded
         ('2026_09_GGG_HHH', 9, '2026-11-09', '20:15'),   # G4 Monday night: read moved, rewritten, graded
         ('2026_09_III_JJJ', 9, '2026-11-08', '13:00'),   # G5 its read withdrawn (DraftKings posted none)
         ('2026_09_KKK_LLL', 9, '2026-11-08', '13:00'),   # G6 leaves the schedule
         ('2026_09_MMM_NNN', 9, '2026-11-08', '16:05'),   # G7 moves to week 10 on the schedule
         ('2026_09_OOO_PPP', 9, '2026-11-08', '16:25'),   # G8 its read entry gone; its files never complete
         ('2026_10_QQQ_RRR', 10, '2026-11-15', '13:00'))  # G9 next week: a game to call through most runs
G = {i: g[0] for i, g in enumerate(GAMES, 1)}
ROLE = (('QB', 0, 'lined', 600), ('RB', 1, 'model', 150), ('WR', 0, 'backup', 300), ('WR', 1, 'lined', 250),
        ('TE', 0, 'lined', 400), ('RB', 1, 'real', 120))
OV_DK = 1.0566                                   # the page's DK_EST.tdVig: no two-sided player line in the week
OV_REAL = implied(150) + implied(-180)           # every game's moneylines: the week's median two-sided overround


def pid_of(gi, i):
    return f'00-009{gi}{i:03d}'


def key_of(gi, i):
    gid = G[gi]
    return TS.call_key(int(gid.split('_')[1]), gid, pid_of(gi, i))


def page_rec(name, team, grp, branch, price):
    if branch is None:            # ruled out: the page draws no row for him
        return {'name': name, 'team': team, 'grp': grp, 'shown': None, 'm': None, 'm_est': None, 'src': None,
                'price': None, 'ov': None, 'branch': None, 'tested': None, 'alone': None, 'offered': False,
                'p_site': None, 'inputs': None, 'm_why': 'ruled out: not drawn'}
    src = 'real' if branch == 'real' else 'dkline'
    ov = OV_REAL if src == 'real' else OV_DK
    return {'name': name, 'team': team, 'grp': grp, 'shown': 'default', 'm': m_of(price, ov), 'm_est': src != 'real',
            'src': src, 'price': price, 'ov': ov, 'branch': branch, 'tested': branch != 'model',
            'alone': branch == 'model', 'offered': branch != 'model', 'p_site': round(0.05 + (abs(price) % 97) / 400, 6),
            'inputs': None, 'm_why': None}


class World:
    def __init__(self, read_at):
        self.sched, self.espn, self.recs, self.lists = {}, {}, {}, {}
        for gi, (gid, w, d, t) in enumerate(GAMES, 1):
            a, h = gid.split('_')[2:4]
            self.sched[gid] = {'id': gid, 'w': w, 'd': d, 't': t, 'a': a, 'h': h, 'mla': 150.0, 'mlh': -180.0}
            self.recs[gid], self.lists[gid] = {}, []
            for i, (grp, side, branch, price) in enumerate(ROLE):
                self.add(gi, i, grp, (a, h)[side], branch, price)
            self.espn[gid] = {'w': w, 'pl': {'at': read_at, 'td': None}, 'out': {'st': 'ok', 'at': read_at}}
        self.stubp, self.cov, self.own, self.played, self.fail, self.site, self.raw = {}, {}, {}, {}, {}, {}, []

    def add(self, gi, i, grp, team, branch, price, listed=True):
        gid, pid = G[gi], pid_of(gi, i)
        self.recs[gid][pid] = page_rec(f'Made Up {gi}{i}', team, grp, branch, price)
        if listed:
            self.lists[gid].append(pid)

    def rec(self, gi, i):
        return self.recs[G[gi]][pid_of(gi, i)]

    def pay(self):
        P = {'season': 2026, 'week': 9, 'baked_at': 'made up', 'sched': [dict(g) for g in self.sched.values()],
             'espn': {'v': 1, 'read_at': 'made up', 'games': {}}, 'mkt': {}}
        for gid, e in self.espn.items():
            e2 = json.loads(json.dumps(e))
            if isinstance(e2.get('pl'), dict):
                e2['pl']['td'] = list(self.lists[gid])
            P['espn']['games'][gid] = e2
        text = json.dumps(P, separators=(',', ':'))
        return P, sha_text(text), text

    def page(self, P, sha, now):
        """page.json as td_shadow_page.js writes it, on its own filter (the games of the read still to come)"""
        sched, games = TS.sched_map(P), {}
        for gid, e in TS.espn_entries(P).items():
            g = sched.get(gid)
            if not g or str(g['w']) != str(e.get('w')) or TS.scored(g):
                continue
            k, pl = TS.ko(g), TS.pl_block(e)
            if k is None or k <= now or not pl or T(pl['at']) >= k:
                continue
            td = list(dict.fromkeys(pl['td']))
            games[gid] = {'w': g['w'], 'a': g['a'], 'h': g['h'], 'kickoff': k.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                          'read_at': pl['at'], 'out_st': (e.get('out') or {}).get('st'), 'td': td,
                          'players': {pid: dict(self.recs[gid][pid]) for pid in td}}
        return {'v': 1, 'now': ISO(now), 'baked_at': P['baked_at'], 'payload_sha256': sha,
                'page': {'app_build': 'app v140 · made up', 'page_hash': '0000000', 'index_sha256': '0' * 64},
                'season': 2026, 'games': games, 'skipped': {}, 'site': dict(self.site), 'counts': {}}

    def stub(self):
        return dump(os.path.join(TMP, f'stub_{seq()}.json'),
                    {'p_rule': 'hash', 'p': self.stubp, 'coverage': self.cov, 'own_coverage': self.own,
                     'played': self.played, 'fail': self.fail})

    def data(self):
        d = os.path.join(TMP, f'data_{seq()}')
        os.makedirs(os.path.join(d, 'raw'))
        with open(os.path.join(d, 'raw', 'stats_player_week_2026.csv'), 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['player_id', 'season', 'week', 'season_type', 'game_id', 'team', 'rushing_tds', 'receiving_tds',
                        'special_teams_tds'])
            for r in self.raw:
                w.writerow([r['pid'], 2026, r['week'], 'REG', r['gid'], r['team'], r['rush'], r['rec'], r.get('st', 0)])
        return d

    def play(self, gi, i, y=None, stat_row=1, snap_row=1, role=1, st_only=0, zero=0, rrt=None, stt=0, raw=True,
             rush=None, rec=None):
        """a made-up played row (td_shadow's grade_from_played reading) and the raw stat row beside it"""
        gid, pid = G[gi], pid_of(gi, i)
        rrt = (y or 0) if rrt is None else rrt
        self.played[f'{gid}|{pid}'] = {'y_any_td': y, 'stat_row': stat_row, 'snap_row': snap_row, 'role_played': role,
                                       'st_only': st_only, 'zero_row': zero, 'y_rush_rec_tds': rrt,
                                       'y_special_teams_tds': stt}
        if raw:
            self.raw_row(gi, i, rrt if rush is None else rush, 0 if rec is None else rec, stt)

    def raw_row(self, gi, i, rush, rec, st=0):
        gid = G[gi]
        self.raw = [r for r in self.raw if not (r['pid'] == pid_of(gi, i) and r['gid'] == gid)]
        self.raw.append({'pid': pid_of(gi, i), 'gid': gid, 'week': int(gid.split('_')[1]),
                         'team': self.rec(gi, i)['team'], 'rush': rush, 'rec': rec, 'st': st})


def step(w, L, now, page=True, data=False, model=None):
    """one run: td_shadow.update on L at `now` (the run's clock), then td_shadow_check.check on what it wrote"""
    now = T(now)
    P, sha, text = w.pay()
    pg = w.page(P, sha, now) if page else None
    probs = TS.Problems(None)
    with quiet():
        L2, ev = TS.update(L, P, sha, pg, model or TS.StubModel(w.stub()), now, probs, lambda n: n)
    out = TS.dumps(L2)
    L2 = json.loads(out)
    d = w.data() if data else None
    with quiet():
        bad, notes, warns = TSC.check(L2, out, L, P, sha, pg, ev, d, allow_stub=True)
    return SimpleNamespace(L=L2, text=out, ev=ev, probs=probs.lines, bad=bad, notes=notes, warns=warns, pay=P,
                           sha=sha, paytext=text, page=pg, data=d, prev=L, now=now)


def init_ledger(at, path=None):
    path = path or os.path.join(TMP, f'init_{at.replace(":", "")}.json')
    with envset(TD_SHADOW_NOW=at), quiet():
        TS.init(Namespace(ledger=path))
    return jload(path), path


def recheck(r, edit, resum=True, prev=None, allow_stub=True):
    """the check on a copy of a run's ledger with one planted edit (the summary worked again unless the rule is 15)"""
    L = json.loads(r.text)
    text = edit(L)
    if not isinstance(text, str):                 # an edit in place (its own return value aside)
        if resum:
            L['summary'] = TS.summarize(L['calls'], L['decision'], L['runs'], TS.season_done(r.pay))
        text = TS.dumps(L)
    with quiet():
        bad, _, _ = TSC.check(json.loads(text), text, prev if prev is not None else r.prev, r.pay, r.sha, r.page, r.ev,
                              r.data, allow_stub=allow_stub)
    return bad


def rules(bad):
    return sorted({int(m.group(1)) for m in (re.match(r'\[(\d+)\]', b) for b in bad) if m})


def bites(name, r, edit, rule, resum=True, prev=None, allow_stub=True):
    bad = recheck(r, edit, resum, prev, allow_stub)
    ok(rule in rules(bad), f'D: the check does not fail {name} on rule {rule}', f'rules {rules(bad)}: {bad[:3]}')


def clean(r, what):
    ok(not r.bad, f'{what}: the check fails a clean run', r.bad[:4])


# ===================================================================================== A and B: one made-up season
def section_ab():
    say('A, B: the call rules and the grades on a made-up week')
    READ1 = '2026-11-02T11:00:00.000Z'
    w = World(READ1)
    w.add(3, 6, 'WR', 'EEE', 'lined', 500)        # G3: a void on a raw stat row (a WARN, never a failure)
    w.add(3, 7, 'RB', 'FFF', 'lined', 350)        # G3: a played row with no touchdown count (pending), then graded
    w.recs[G[1]][pid_of(1, 5)] = page_rec('Made Up 15', 'BBB', 'RB', None, None)   # ruled out: m none
    w.recs[G[3]][pid_of(3, 3)].update(m=None, ov=None, m_why='no stated chance: dash')
    w.stubp[f'{G[3]}|{pid_of(3, 4)}'] = {'p': None, 'lam': None, 'grp': None, 'cand_src': None, 'p_why': 'no candidate row'}
    w.cov[G[2]] = 'history not complete: 2026_08_CCC_DDD: snap counts of CCC'
    P0, _, _ = w.pay()
    ok(abs(TSC.want_ov(P0, 9, 'real') - OV_REAL) < 1e-15 and TSC.want_ov(P0, 9, 'dkline') == OV_DK,
       'A: the made-up week\'s overrounds are not the check\'s own reading')

    L0, _ = init_ledger('2026-11-01T12:00:00Z')
    ok(L0['calls'] == {} and L0['runs'] == {} and L0['bar'] == TS.BAR and L0['decision'] is None
       and L0['summary'] == TS.summarize({}, None), 'A: init does not write the bar and nothing else')
    work, hist, _ = TS.plan_work(P0, L0, T('2026-11-02T12:00:00Z'))
    ok((work, hist) == ('run', True), f'G: plan before the first run is not work=run hist=true: {(work, hist)}')

    # R1: the first calls
    r1 = step(w, L0, '2026-11-02T12:00:00Z')
    clean(r1, 'R1')
    listed = {g: list(w.lists[g]) for g in G.values()}
    want_keys = {TS.call_key(int(g.split('_')[1]), g, p) for g, ps in listed.items() for p in ps}
    c = r1.L['runs'][r1.L['run_at']]['counts']
    ok(set(r1.L['calls']) == want_keys and c['made'] == len(want_keys), 'A: a call is not made for every listed player',
       f"{c['made']} made, {len(want_keys)} listed")
    ok(all(r1.L['calls'][key_of(2, i)]['p'] is None and r1.L['calls'][key_of(2, i)]['p_why'] == w.cov[G[2]]
           for i in range(6)), 'A: a game whose clubs\' history is incomplete is not called with p none and its reason')
    ok(all(r1.L['calls'][key_of(4, i)]['p'] is not None for i in range(6)), 'A: the covered games are not called with p')
    ok(r1.L['calls'][key_of(1, 5)]['m'] is None and r1.L['calls'][key_of(1, 5)]['m_why'] == 'ruled out: not drawn'
       and r1.L['calls'][key_of(3, 4)]['p_why'] == 'no candidate row', 'A: a call with no m or no p does not keep its reason')
    ok(all(cc['m'] == w.recs[cc['game_id']][cc['pid']]['m'] for cc in r1.L['calls'].values()),
       'A: m is not the page\'s')
    ok(TS.dumps(json.loads(r1.text)) == r1.text, 'A: the writer is not canonical on its own output')

    # R2: rewrites on p, m and branch; a newer read with the same numbers; drops; a game with no entry left alone
    w.stubp[f'{G[1]}|{pid_of(1, 0)}'] = {'p': 0.3125, 'lam': 0.374693449441411, 'grp': 'QB', 'cand_src': 'stub', 'p_why': None}
    w.recs[G[3]][pid_of(3, 0)].update(price=650, m=m_of(650, OV_DK))
    w.recs[G[3]][pid_of(3, 2)]['branch'] = 'lined'
    w.espn[G[4]]['pl']['at'] = w.espn[G[4]]['out']['at'] = '2026-11-03T11:00:00.000Z'
    w.lists[G[1]].remove(pid_of(1, 4))
    w.espn[G[5]] = {'w': 9, 'out': {'st': 'none', 'at': '2026-11-03T11:30:00.000Z'}}
    del w.sched[G[6]]
    w.sched[G[7]]['w'] = 10
    del w.espn[G[8]]
    r2 = step(w, r1.L, '2026-11-03T12:00:00Z')
    clean(r2, 'R2')
    c2 = r2.L['runs'][r2.L['run_at']]['counts']
    rew = [key_of(1, 0), key_of(3, 0), key_of(3, 2)]
    ok(c2['rewritten'] == 3 and all(r2.L['calls'][k]['called_at'] == r2.L['run_at'] for k in rew),
       'A: a change in p, m or branch does not rewrite the call with this run\'s time', json.dumps(c2))
    ok(r2.L['calls'][key_of(3, 2)]['m'] == r1.L['calls'][key_of(3, 2)]['m'] and r2.L['calls'][key_of(3, 2)]['branch'] == 'lined',
       'A: the branch alone does not rewrite')
    ok(all(r2.L['calls'][key_of(4, i)] == r1.L['calls'][key_of(4, i)] for i in range(6)),
       'A: a newer read with the same numbers moves a call (its read_at or called_at)')
    gone = [key_of(1, 4)] + [key_of(gi, i) for gi in (5, 6, 7) for i in range(6)]
    ok(all(k not in r2.L['calls'] for k in gone) and c2['dropped'] == len(gone),
       'A: a call delisted, withdrawn (none), off the schedule or out of its week is not dropped', json.dumps(c2))
    ok(all(r2.L['calls'][key_of(8, i)] == r1.L['calls'][key_of(8, i)] for i in range(6)),
       'A: a game whose read entry went is not left as it was')
    ok(c2['made'] == 0, 'A: R2 made a call')

    # R3a and R3b: CALL_MARGIN (11 minutes before G1's kickoff a call is made; 10 minutes before, nothing moves)
    K1 = TS.ko(w.sched[G[1]])
    P3, _, _ = w.pay()
    ok(G[1] in TS.callable_games(P3, K1 - timedelta(minutes=11)) and G[1] not in TS.callable_games(P3, K1 - timedelta(minutes=10)),
       'A: a game is offered to call 10 minutes or less before its kickoff (CALL_MARGIN)')
    w.add(1, 6, 'WR', 'AAA', 'lined', 700)
    r3a = step(w, r2.L, ISO(K1 - timedelta(minutes=11)))
    clean(r3a, 'R3a')
    ok(key_of(1, 6) in r3a.L['calls'] and r3a.L['runs'][r3a.L['run_at']]['counts']['made'] == 1,
       'A: a game 11 minutes from kickoff is not called')
    w.add(1, 7, 'TE', 'BBB', 'lined', 800)
    w.recs[G[1]][pid_of(1, 0)].update(price=520, m=m_of(520, OV_DK))
    r3b = step(w, r3a.L, ISO(K1 - timedelta(minutes=10)))
    clean(r3b, 'R3b')
    ok(key_of(1, 7) not in r3b.L['calls'] and r3b.L['calls'][key_of(1, 0)] == r3a.L['calls'][key_of(1, 0)],
       'A: a call is made or rewritten 10 minutes before kickoff')
    w.lists[G[1]].remove(pid_of(1, 7))

    # R4: G1 freezes at its kickoff, G2 by an earlier schedule kickoff, G3 by a score before its own
    w.sched[G[2]].update(d='2026-11-05', t='19:00')
    w.sched[G[3]].update(hs=10, **{'as': 7})
    r4 = step(w, r3b.L, ISO(K1))
    clean(r4, 'R4')
    fz = {k for k, cc in r4.L['calls'].items() if cc['frozen']}
    want_fz = {k for k, cc in r4.L['calls'].items() if cc['game_id'] in (G[1], G[2], G[3])}
    ok(fz == want_fz and all(r4.L['calls'][k]['frozen_at'] == r4.L['run_at'] for k in fz),
       'A: a freeze at kickoff, by an earlier schedule kickoff and by a score, and nothing else',
       f'{len(fz)} frozen, {len(want_fz)} wanted')

    # R5: no page.json while games are to be called: DEGRADED, nothing moves
    w.stubp[f'{G[4]}|{pid_of(4, 1)}'] = {'p': 0.2222, 'lam': 0.25128, 'grp': 'RB', 'cand_src': 'stub', 'p_why': None}
    r5 = step(w, r4.L, '2026-11-07T12:00:00Z', page=False)
    clean(r5, 'R5')
    ok(any(x.startswith('DEGRADED: the page was not read') for x in r5.probs)
       and {k: v for k, v in r5.L['calls'].items()} == r4.L['calls'], 'A: a run with no page.json is not DEGRADED with no call moved')

    # R7: G1 flexed later after its calls froze: the page lists it again, its calls stay frozen; G4's p now rewritten
    w.sched[G[1]].update(d='2026-11-08', t='13:00')
    r7 = step(w, r5.L, '2026-11-07T14:00:00Z')
    clean(r7, 'R7')
    ok(G[1] in r7.page['games'] and all(r7.L['calls'][k] == r4.L['calls'][k] for k in r4.L['calls'] if r4.L['calls'][k]['game_id'] == G[1]),
       'A: a frozen call is touched when its game is listed again')
    ok(r7.L['calls'][key_of(4, 1)]['p'] == 0.2222 and r7.L['calls'][key_of(4, 1)]['called_at'] == r7.L['run_at'],
       'A: a change held back by a DEGRADED run is not made by the next')

    # R8: no page.json again (G9 to call): DEGRADED, yet G4 and G8 freeze and G1's call (moved) is graded void
    r8 = step(w, r7.L, '2026-11-10T02:00:00Z', page=False)
    clean(r8, 'R8')
    ok(any(x.startswith('DEGRADED') for x in r8.probs), 'A: R8 is not DEGRADED')
    ok(all(r8.L['calls'][key_of(4, i)]['frozen'] for i in range(6)) and all(r8.L['calls'][key_of(8, i)]['frozen'] for i in range(6)),
       'A: a DEGRADED run does not freeze')
    g1 = [cc['grade'] for cc in r8.L['calls'].values() if cc['game_id'] == G[1]]
    ok(g1 and all(gr and gr['result'] == 'void' and gr['how'] == 'game moved' for gr in g1),
       'B: a DEGRADED run does not grade a moved game\'s calls void, \'game moved\'')
    ok(any('froze stale' in x and G[4] in x for x in r8.probs), 'A: a game frozen 35 hours after its last call run is not said stale')

    # R9 (G3's kickoff + 95 h): p fails (DEGRADED); G2's calls (moved) graded; G3 not yet
    w.fail = {'predict': True}
    r9 = step(w, r8.L, '2026-11-12T20:25:00Z')
    clean(r9, 'R9')
    w.fail = {}
    ok(any(x.startswith('DEGRADED: p could not be made') for x in r9.probs), 'A: a run whose p fails is not DEGRADED')
    ok(all(r9.L['calls'][key_of(2, i)]['grade']['how'] == 'game moved' for i in range(6)), 'B: G2 (moved earlier) is not void')
    ok(all(r9.L['calls'][key_of(3, i)]['grade'] is None for i in range(8)), 'B: a call is graded before kickoff + 96 h')

    # R10 (G3's kickoff + 96 h): td, no_td on a stat line, on zero, on a return TD, void, pending; G8 not covered
    w.play(3, 0, y=1, rush=1, rec=0)                                  # a rushing TD (the quarterback's own)
    w.play(3, 1, y=1, rrt=2, rush=1, rec=1)                           # two TDs (the model branch: never sampled)
    w.play(3, 2, y=0)                                                 # a stat line, no TD
    w.play(3, 3, y=1, rush=0, rec=1)                                  # a TD (m none: never sampled)
    w.play(3, 4, y=0, stat_row=0, zero=1, raw=False)                  # offensive snaps, no stat line: no_td on zero
    w.play(3, 5, y=0, role=0, st_only=1, stt=1)                       # special teams only, a return TD: not counted
    w.raw_row(3, 6, 0, 1)                                             # no played row, a raw stat row: void (a WARN)
    w.play(3, 7, y=None, rrt=0)                                       # played, no touchdown count: pending
    w.own[G[8]] = False
    w.site = {key_of(3, 0): {'result': 'td', 'how': {}}, key_of(3, 2): {'result': 'void', 'how': {}},
              key_of(3, 6): {'result': 'no_td', 'how': {}}}
    r10 = step(w, r9.L, '2026-11-12T21:25:00Z', data=True)
    clean(r10, 'R10')
    gr = {i: (r10.L['calls'][key_of(3, i)]['grade'] or {}) for i in range(8)}
    ok([gr[i].get('result') for i in range(8)] == ['td', 'td', 'no_td', 'td', 'no_td', 'no_td', 'void', None],
       'B: G3\'s grades are not td, td, no_td, td, no_td (zero), no_td (return TD), void, pending',
       [gr[i].get('result') for i in range(8)])
    ok(gr[4]['evidence']['zero_row'] == 1 and gr[5]['evidence']['y_special_teams_tds'] == 1 and gr[6]['how'] == 'did not play',
       'B: the zero row, the return TD or the did-not-play void is not recorded')
    ok(key_of(3, 7) in r10.ev['pending'], 'B: a played row with no touchdown count is not left pending')
    ok(any('void (did not play) though the raw stats have a row' in x for x in r10.warns),
       'B: a void with a raw stat row is not a WARN of the check')
    ok(all(r10.L['calls'][key_of(8, i)]['grade'] is None for i in range(6)), 'B: a game whose files are not in is graded')
    S = r10.L['summary']
    ok(S['vs_site'] == {'agree': 1, 'void_site_graded': 1, 'graded_site_void': 1, 'td_differs': 0,
                        'site_pending_or_unread': len([k for k, cc in r10.L['calls'].items() if cc['grade']]) - 3}
       and r10.L['calls'][key_of(3, 0)]['grade']['site'] == w.site[key_of(3, 0)],
       'B: the site\'s reading is not recorded beside the grade and counted', json.dumps(S['vs_site']))
    ok(S['graded_on_zero'] == 1 and S['return_tds_not_counted'] == 1, 'B: the summary does not count the zero row and the return TD')
    samp = {k for k, _ in TS.in_sample(r10.L['calls'])}
    ok(samp == {key_of(3, 0), key_of(3, 2), key_of(3, 5)},
       'C: the sample is not the frozen calls graded td or no_td with p and m off the model alone (Q2)', sorted(samp))
    ok(S['by_branch']['model']['graded'] == 1 and S['by_branch']['model']['td'] == 1,
       'C: a touchdown priced on the model alone is not reported in by_branch', json.dumps(S['by_branch']['model']))

    # R11 (G8's kickoff + 145 h): G4 graded; the pending G3 call graded; G3's rows changed after: no grade rewritten
    for i, y in enumerate((0, 1, None, 0, 1, 0)):
        if y is None:
            continue                                                  # G4 i2: no row: void, did not play
        w.play(4, i, y=y)
    w.play(3, 7, y=0)
    w.play(3, 0, y=0)                                                 # G3 i0 now reads no_td: its grade stands
    r11 = step(w, r10.L, '2026-11-14T22:00:00Z', data=True)
    clean(r11, 'R11')
    ok(r11.L['calls'][key_of(3, 0)]['grade'] == r10.L['calls'][key_of(3, 0)]['grade'], 'B: a grade is rewritten')
    ok(r11.L['calls'][key_of(3, 7)]['grade']['result'] == 'no_td' and r11.L['calls'][key_of(4, 2)]['grade']['how'] == 'did not play'
       and r11.L['calls'][key_of(4, 1)]['grade']['result'] == 'td', 'B: R11\'s grades are not the rows\'')
    ok(any('still ungraded more than 144 h' in x for x in r11.probs), 'B: a grade overdue at 144 h is not said')

    # R11b (G8's kickoff + 14 days less an hour): still pending, never void before 14 days; G9 (no rows) void
    r11b = step(w, r11.L, '2026-11-22T20:25:00Z', data=True)
    clean(r11b, 'R11b')
    ok(all(r11b.L['calls'][key_of(8, i)]['grade'] is None for i in range(6))
       and all(r11b.L['calls'][key_of(9, i)]['grade']['how'] == 'did not play' for i in range(6)),
       'B: a game whose files are not in is void before 14 days, or a call with no played row not void')
    # R12 (G8's kickoff + 14 days): files never complete; the season over below 2,000: undecided; the runs pruned
    for g in w.sched.values():
        g.update(hs=g.get('hs', 21), **{'as': g.get('as', 17)})
    r12 = step(w, r11b.L, '2026-11-22T21:25:00Z', data=True)
    clean(r12, 'R12')
    ok(all(r12.L['calls'][key_of(8, i)]['grade']['how'] == 'files never complete' for i in range(6)),
       'B: a game whose files never came is not void at 14 days')
    ok(all(cc['frozen'] and cc['grade'] for cc in r12.L['calls'].values()), 'B: R12 left a call ungraded')
    ok(r12.L['summary']['standing'].startswith('undecided:') and r12.L['decision'] is None,
       'C: the season ending below 2,000 does not read undecided', r12.L['summary']['standing'])
    pruned = {r3b.L['run_at'], r5.L['run_at']}
    kept = {r.L['run_at'] for r in (r1, r2, r3a, r4, r7, r8, r9, r10, r11, r11b, r12)}
    ok(set(r12.L['runs']) == kept and not (pruned & set(r12.L['runs'])),
       'A: the runs are not pruned to those referenced and the last 14 days', sorted(set(r12.L['runs']) ^ kept))
    work, hist, _ = TS.plan_work(r12.pay, r12.L, T('2026-11-23T00:00:00Z'))
    ok((work, hist) == ('none', False), f'G: plan with every call graded and nothing to call is not none: {(work, hist)}')
    P4, _, _ = w.pay()
    P4.pop('espn')
    work, hist, why = TS.plan_work(P4, r4.L, T('2026-11-08T21:30:00Z'))
    ok((work, hist) == ('run', False), f'G: plan with a freeze due alone is not work=run hist=false: {(work, hist, why)}')
    work, hist, why = TS.plan_work(r9.pay, r9.L, T('2026-11-12T21:30:00Z'))
    ok((work, hist) == ('run', True), f'G: plan with a grade due is not work=run hist=true: {(work, hist, why)}')
    P25 = dict(r1.pay, season=2025)
    ok(TS.plan_work(P25, r1.L, T('2026-11-02T13:00:00Z'))[0] == 'none', 'G: plan on a payload of 2025 is not none')
    return SimpleNamespace(w=w, r1=r1, r2=r2, r10=r10, r11=r11, r12=r12, L0=L0)


# ======================================================================================= D: the check bites
def section_d(ab):
    say('D: the check bites (one planted edit per rule)')
    r1, r2, r10, r11 = ab.r1, ab.r2, ab.r10, ab.r11

    def first(L, pred):
        return next(k for k, cc in sorted(L['calls'].items()) if pred(cc))

    def e1(L):
        return TS.dumps(L).replace('"calls": {\n', '"calls": {\n\n', 1)
    bites('a ledger that is not its canonical dump', r10, e1, 1)
    bites('the bar moved', r10, lambda L: L['bar'].update(w=0.3), 2)
    bites('bar_registered moved', r10, lambda L: L.update(bar_registered='2026-11-01T12:00:01Z'), 2)
    # rule 3: a registered file in a copy of the tree altered (the check hashes the files where it runs)
    tree = make_tree('d3')
    with open(os.path.join(tree, TS.REL, 'fetch.py'), 'a') as f:
        f.write('\n# altered\n')
    with patched(TS, REPO=tree):
        bites('a registered file altered', r10, lambda L: None, 3)
    bites('a referenced run gone', r2, lambda L: L['runs'].pop(r1.L['run_at']), 4)
    bites('a stub run without TD_SHADOW_STUB', r10, lambda L: None, 4, allow_stub=False)
    bites('a branch out of range', r10, lambda L: L['calls'][first(L, lambda cc: cc['frozen'])].update(branch='guess'), 5)
    bites('a key not its fields', r10, lambda L: L['calls'].update({'2026|09|2026_09_ZZZ_YYY|00-0000001':
                                                                     L['calls'].pop(first(L, lambda cc: cc['frozen']))}), 5)

    def e6(L):
        k = first(L, lambda cc: cc['grade'] is None)
        L['calls'][k]['called_at'] = ISO(T(L['calls'][k]['kickoff']) - timedelta(minutes=5))
    bites('a call 5 minutes before kickoff', r10, e6, 6)
    bites('p out of range', r10, lambda L: L['calls'][first(L, lambda cc: cc['p'] is not None)].update(p=1.2), 6)

    def e7m(L):
        k = key_of(4, 0)
        cc = L['calls'][k]
        cc['price'] += 40
        cc['m'] = m_of(cc['price'], cc['ov'])
    bites("a new call's price and m not page.json's", r1, e7m, 7)
    bites("a new call's p not evidence.json's", r1, lambda L: L['calls'][key_of(4, 0)].update(p=0.5), 7)

    def e8(L):
        L['calls'][key_of(1, 4)] = json.loads(json.dumps(r1.L['calls'][key_of(1, 4)]))
    bites('a delisted call kept', r2, e8, 8)
    bites('a listed player with no call', r1, lambda L: L['calls'].pop(key_of(4, 3)), 8)
    bites('m off its price', r10, lambda L: L['calls'][first(L, lambda cc: cc['m'] is not None)].update(
        m=L['calls'][first(L, lambda cc: cc['m'] is not None)]['m'] + 1e-4), 9)

    def e9ov(L):
        cc = L['calls'][key_of(4, 0)]
        cc['ov'] = 1.05
        cc['m'] = m_of(cc['price'], 1.05)
    bites("a new call's overround not the week's", r1, e9ov, 9)
    bites('a frozen call moved', r10, lambda L: L['calls'][first(L, lambda cc: cc['frozen'] and cc['p'] is not None)].update(
        p=0.4321), 10)
    bites('a frozen call gone', r10, lambda L: L['calls'].pop(first(L, lambda cc: cc['frozen'])), 10)
    bites('a call dropped with no reason', r2, lambda L: L['calls'].pop(key_of(8, 0)), 10)

    def e11(L):
        k = key_of(3, 2)
        L['calls'][k]['grade']['result'], L['calls'][k]['grade']['y'] = 'td', 1
    bites('an old grade changed', r11, e11, 11)

    def e12(L):
        k = key_of(3, 2)
        L['calls'][k]['grade']['result'], L['calls'][k]['grade']['y'] = 'td', 1
    bites("a new grade not its rows' or the evidence's", r10, e12, 12)

    def e12b(L):
        k = key_of(3, 2)
        L['calls'][k]['grade']['graded_at'] = r10.prev['run_at']
    bites('a new grade not by this run', r10, e12b, 12)
    bites('a due call left ungraded', r10, lambda L: L['calls'][key_of(3, 2)].update(grade=None), 13)

    def e14(L):
        L['decision'] = {'verdict': 'PASS', 'decided_at': L['run_at'], 'n': 2000, 'games': 1, 'T1': {}, 'T2': {},
                         'criteria': {'T1': True, 'T2': True}, 'sample': []}
    bites('a decision before 2,000', r10, e14, 14)
    bites('the summary edited', r10, lambda L: L['summary'].update(in_sample=L['summary']['in_sample'] + 1), 15, resum=False)


# ============================================================================================ C: the decision
def big_ledger(n, *, decision=None, extra=None, start='2026-11-12T19:00:00Z'):
    """a ledger of n frozen calls graded td or no_td in the sample (p, m, branch real, lined or backup), 25 a game,
    their grades spread over five runs in grading order; extra: more calls as (key, call). Canonical, with a runs
    entry for every time it names"""
    import random
    rnd = random.Random(20261108)
    calls, times = {}, set()
    branches = ('lined', 'backup', 'real')
    for i in range(n):
        gi = i // 25
        gid = f'2026_09_X{gi:02d}_Y{gi:02d}'
        pid = f'00-008{i:04d}'
        price = rnd.choice((-140, -110, 120, 180, 250, 330, 450, 600, 800))
        br = branches[i % 3]
        ov = 1.04 if br == 'real' else OV_DK
        m = m_of(price, ov)
        p = max(0.01, min(0.95, m + rnd.uniform(-0.08, 0.08)))
        y = 1 if rnd.random() < p else 0
        graded = TS.iso(T(start) + timedelta(hours=gi % 5))
        times.update({'2026-11-07T12:00:00Z', '2026-11-08T19:00:00Z', graded})
        calls[TS.call_key(9, gid, pid)] = {
            'season': 2026, 'week': 9, 'game_id': gid, 'pid': pid, 'name': f'Made Up {i}', 'team': f'X{gi:02d}',
            'grp': 'WR', 'kickoff': '2026-11-08T18:00:00Z', 'read_at': '2026-11-07T11:00:00Z', 'p': p,
            'lam': None, 'cand_src': 'stub', 'in_players_csv': True, 'p_why': None, 'm': m, 'm_est': br != 'real',
            'src': 'real' if br == 'real' else 'dkline', 'price': price, 'ov': ov, 'branch': br, 'tested': True,
            'offered': True, 'shown': 'default', 'p_site': 0.2, 'm_why': None, 'called_at': '2026-11-07T12:00:00Z',
            'frozen': True, 'frozen_at': '2026-11-08T19:00:00Z',
            'grade': {'result': 'td' if y else 'no_td', 'y': y, 'how': 'played',
                      'evidence': {'stat_row': 1, 'snap_row': 1, 'role_played': 1, 'st_only': 0, 'zero_row': 0,
                                   'y_rush_rec_tds': y, 'y_special_teams_tds': 0}, 'site': None, 'graded_at': graded}}
    for k, cc in (extra or []):
        calls[k] = cc
        times.update(t for t in (cc['called_at'], cc['frozen_at'], (cc['grade'] or {}).get('graded_at')) if t)
    if decision:
        decision = dict(decision, decided_at=max(times),
                        sample=[k for k, _ in TS.in_sample(calls)][:TS.SAMPLE_N])
    runs = {t: {'counts': {}, 'page': None} for t in sorted(times)}
    L = {'what': TS.WHAT, 'bar': json.loads(json.dumps(TS.BAR)), 'bar_registered': '2026-10-31T00:00:00Z',
         'model': TS.model_block(TS.manifest()), 'run_at': max(times), 'decision': decision, 'summary': None,
         'runs': runs, 'calls': calls}
    L['summary'] = TS.summarize(calls, decision, runs)
    return json.loads(TS.dumps(L))


def fake_md(d, g):
    return {'est': float(d.mean()), 'lo': -0.02, 'hi': -0.01, 'se': 0.005}


def fake_st(y, ref, p, g, strata):
    return {'est': 0.4, 'lo': 0.1, 'hi': 0.7, 'se': 0.2, 'gamma': 1.0, 'alpha': {'all': 0.0}}


def section_c():
    say('C: the decision')
    OS = TS.os_module()
    big = big_ledger(2050)
    # C1: decide() with the one-shot's own mean_diff and signal_test, against them called directly, bit for bit
    t0 = time.time()
    D = TS.decide(big['calls'], T('2026-11-13T00:00:00Z'))
    import numpy as np
    rows = sorted(big['calls'].values(), key=lambda c: (c['grade']['graded_at'], c['kickoff'], c['game_id'], c['pid']))[:2000]
    y = np.array([1.0 if c['grade']['result'] == 'td' else 0.0 for c in rows])
    p = np.array([c['p'] for c in rows])
    m = np.array([c['m'] for c in rows])
    g = np.array([c['game_id'] for c in rows])
    b = m + 0.25 * (p - m)
    T1 = OS.mean_diff(OS.ll(b, y) - OS.ll(m, y), g)
    T2 = OS.signal_test(y, m, p, g, ['all'] * 2000)
    ok(D is not None and D['T1'] == T1 and D['T2'] == T2 and D['n'] == 2000 and D['games'] == 80
       and D['sample'] == [TS.call_key(9, c['game_id'], c['pid']) for c in rows]
       and D['verdict'] == ('PASS' if T1['hi'] < 0 and T2['lo'] > 0 else 'FAIL'),
       'C: decide() with the one-shot\'s mean_diff and signal_test is not them called directly on the first 2,000, bit for bit')
    say(f'   decide() on the one-shot\'s own functions and the direct calls: {time.time() - t0:.1f} s, equal')

    # C2: stand-ins. None at 1,999; the first 2,000 in grading order (a 2,001st that would flip it left out)
    calls = big_ledger(1999)['calls']
    ok(TS.decide(calls, T('2026-11-13T00:00:00Z'), md=fake_md, st=fake_st) is None, 'C: a decision at 1,999')
    base = big_ledger(2000)['calls']
    flip = json.loads(json.dumps(base[sorted(base)[0]]))
    flip.update(game_id='2026_09_FLP_FLQ', pid='00-0079999')

    def with_flip(graded_at):
        f = json.loads(json.dumps(flip))
        f['grade']['graded_at'] = graded_at
        return dict(base, **{TS.call_key(9, f['game_id'], f['pid']): f})

    def st_flip(y, ref, p, g, strata):
        r = fake_st(y, ref, p, g, strata)
        return dict(r, lo=-0.1) if '2026_09_FLP_FLQ' in set(g.tolist()) else r
    calls = with_flip('2026-11-13T05:00:00Z')              # graded after every other: the 2,001st
    D = TS.decide(calls, T('2026-11-14T00:00:00Z'), md=fake_md, st=st_flip)
    ok(D and D['verdict'] == 'PASS' and D['n'] == 2000 and TS.call_key(9, '2026_09_FLP_FLQ', '00-0079999') not in D['sample'],
       'C: the decision is not on the first 2,000 in grading order (a 2,001st would flip it)', D and D['verdict'])
    D = TS.decide(with_flip('2026-11-12T18:00:00Z'), T('2026-11-14T00:00:00Z'), md=fake_md, st=st_flip)
    ok(D and D['verdict'] == 'FAIL' and TS.call_key(9, '2026_09_FLP_FLQ', '00-0079999') in D['sample'],
       'C: the flipping call graded first does not flip the decision (the case would not bite)')
    for name, md, st, want in (('T1 alone fails', lambda d, g: dict(fake_md(d, g), hi=0.001), fake_st, (False, True)),
                               ('T2 alone fails', fake_md, lambda *a: dict(fake_st(*a), lo=-0.001), (True, False)),
                               ('T1 straddles 0', lambda d, g: dict(fake_md(d, g), lo=-0.1, hi=0.1), fake_st, (False, True))):
        D = TS.decide(big['calls'], T('2026-11-13T00:00:00Z'), md=md, st=st)
        ok(D['verdict'] == 'FAIL' and (D['criteria']['T1'], D['criteria']['T2']) == want, f'C: {name}: not FAIL', D['criteria'])
    D = TS.decide(big['calls'], T('2026-11-13T00:00:00Z'), md=fake_md, st=fake_st)
    ok(D['verdict'] == 'PASS' and D['criteria'] == {'T1': True, 'T2': True}, 'C: both tests passing is not PASS')
    # grading order on a graded_at tie: kickoff, then game id, then player id
    tie = {k: json.loads(json.dumps(c)) for k, c in list(big['calls'].items())[:60]}
    for i, (k, c) in enumerate(sorted(tie.items())):
        c['grade']['graded_at'] = '2026-11-12T19:00:00Z'
        c['kickoff'] = '2026-11-08T18:00:00Z' if i % 2 else '2026-11-08T21:25:00Z'
    got = [k for k, _ in TS.in_sample(tie)]
    ok(got == sorted(tie, key=lambda k: (tie[k]['kickoff'], tie[k]['game_id'], tie[k]['pid'])),
       'C: the grading order on a graded_at tie is not kickoff, game id, player id')
    # Q2: the sample, exactly as BAR writes it
    q = {k: json.loads(json.dumps(c)) for k, c in list(big['calls'].items())[:10]}
    ks = sorted(q)
    q[ks[0]]['branch'] = 'model'
    q[ks[1]]['p'], q[ks[1]]['p_why'] = None, 'no candidate row'
    q[ks[2]]['m'], q[ks[2]]['m_why'] = None, 'no stated chance: dash'
    q[ks[3]]['grade'] = dict(q[ks[3]]['grade'], result='void', y=None, how='did not play', evidence=None)
    q[ks[4]]['grade'] = None
    q[ks[5]]['frozen'] = False
    for i, br in ((6, 'real'), (7, 'lined'), (8, 'backup')):
        q[ks[i]]['branch'] = br
    ok([k for k, _ in TS.in_sample(q)] == sorted(ks[6:], key=lambda k: (q[k]['grade']['graded_at'], q[k]['kickoff'], q[k]['game_id'], q[k]['pid'])),
       'C: the sample takes a touchdown priced on the model alone, a call with no p or m, a void, an ungraded or an unfrozen call')
    ok(TS.BAR['sample'].endswith('that have p and m and m not priced on the model alone: branch real, lined or backup, in '
                                 'grading order: graded_at, kickoff, game id, player id') and TS.SAMPLE_BRANCHES == ('real', 'lined', 'backup')
       and '[Q' not in json.dumps(TS.BAR), 'C: BAR\'s sample is not the owner\'s Q2 as written')
    return big


def section_c_runs():
    """FAIL stops calls (frozen calls still graded); after a PASS calls go on and nothing is decided again; the
    decision written once, by the run whose grade brings the sample to 2,000, and held by the check"""
    say('C: FAIL, PASS and the decision written once (on stand-ins)')
    OS = TS.os_module()
    gc_id = '2026_10_QQQ_RRR'
    due_id = '2026_09_DUE_ONE'
    due_pid = '00-0077001'
    due_call = {'season': 2026, 'week': 9, 'game_id': due_id, 'pid': due_pid, 'name': 'Made Up Due', 'team': 'DUE',
                'grp': 'RB', 'kickoff': '2026-11-08T18:00:00Z', 'read_at': '2026-11-07T11:00:00Z', 'p': 0.31, 'lam': None,
                'cand_src': 'stub', 'in_players_csv': True, 'p_why': None, 'm': m_of(240, OV_DK), 'm_est': True,
                'src': 'dkline', 'price': 240, 'ov': OV_DK, 'branch': 'lined', 'tested': True, 'offered': True,
                'shown': 'default', 'p_site': 0.3, 'm_why': None, 'called_at': '2026-11-07T12:00:00Z', 'frozen': True,
                'frozen_at': '2026-11-08T19:00:00Z', 'grade': None}
    loose = dict(due_call, game_id=gc_id, week=10, pid='00-0077002', kickoff='2026-11-15T18:00:00Z', frozen=False,
                 frozen_at=None, read_at='2026-11-07T11:00:00Z')

    def world():
        w = World('2026-11-13T11:00:00.000Z')
        for gid in list(w.sched):
            if gid != G[9]:
                w.sched.pop(gid)
                w.espn.pop(gid, None)
        w.sched[due_id] = {'id': due_id, 'w': 9, 'd': '2026-11-08', 't': '13:00', 'a': 'DUE', 'h': 'ONE', 'hs': 20, 'as': 13}
        w.played[f'{due_id}|{due_pid}'] = {'y_any_td': 1, 'stat_row': 1, 'snap_row': 1, 'role_played': 1, 'st_only': 0,
                                           'zero_row': 0, 'y_rush_rec_tds': 1, 'y_special_teams_tds': 0}
        w.raw.append({'pid': due_pid, 'gid': due_id, 'week': 9, 'team': 'DUE', 'rush': 1, 'rec': 0})
        return w
    extra = [(TS.call_key(9, due_id, due_pid), due_call), (TS.call_key(10, gc_id, '00-0077002'), loose)]
    D0 = {'verdict': 'FAIL', 'n': 2000, 'games': 80, 'T1': {'est': 0.001, 'lo': -0.001, 'hi': 0.003, 'se': 0.001},
          'T2': {'est': 0.1, 'lo': -0.2, 'hi': 0.4, 'se': 0.2, 'gamma': 1.0, 'alpha': {'all': 0.0}},
          'criteria': {'T1': False, 'T2': False}}
    with patched(OS, mean_diff=fake_md, signal_test=fake_st):
        # FAIL: no new call, the unfrozen call dropped, the frozen due call still graded
        prevF = big_ledger(2001, decision=D0, extra=extra)
        w = world()
        r = step(w, prevF, '2026-11-14T12:00:00Z', data=True)
        clean(r, 'C FAIL run')
        ok(G[9] in r.page['games'] and not any(c['game_id'] == G[9] for c in r.L['calls'].values())
           and TS.call_key(10, gc_id, '00-0077002') not in r.L['calls'],
           'C: after a FAIL a call is made, or an unfrozen call is kept')
        ok((r.L['calls'][TS.call_key(9, due_id, due_pid)]['grade'] or {}).get('result') == 'td' and r.L['decision'] == prevF['decision'],
           'C: after a FAIL a frozen call is not graded, or the decision moved')
        ok(TS.plan_work(r.pay, r.L, T('2026-11-14T13:00:00Z'))[0] == 'none', 'G: plan after a FAIL with nothing left is not none')
        # PASS: calls go on, the decision stays as it was
        prevP = big_ledger(2001, decision=dict(D0, verdict='PASS', criteria={'T1': True, 'T2': True}), extra=extra)
        r = step(world(), prevP, '2026-11-14T12:00:00Z', data=True)
        clean(r, 'C PASS run')
        ok(sum(1 for c in r.L['calls'].values() if c['game_id'] == G[9]) == 6 and r.L['decision'] == prevP['decision'],
           'C: after a PASS calls stop, or the decision moved')
        # the decision written once, by the run whose grade brings the sample to 2,000
        prev = big_ledger(1999, extra=extra[:1])
        r = step(world(), prev, '2026-11-14T12:00:00Z', data=True)
        clean(r, 'C deciding run')
        D = r.L['decision']
        ok(D and D['decided_at'] == r.L['run_at'] and D['n'] == 2000 and len(D['sample']) == 2000
           and TS.call_key(9, due_id, due_pid) in D['sample'] and D['verdict'] == 'PASS',
           'C: the run that brings the sample to 2,000 does not write the decision', D and {k: D[k] for k in ('n', 'verdict')})
        ok(r.L['summary']['standing'].startswith('decided at 2,000'), 'C: the standing does not say decided')
        bites('a decision missing at 2,000', r, lambda L: L.update(decision=None), 14)
        bites('the decision not the check\'s own', r, lambda L: L['decision'].update(verdict='FAIL'), 14)
        r2 = step(world(), r.L, '2026-11-15T12:00:00Z', data=True)
        clean(r2, 'C run after the decision')
        ok(r2.L['decision'] == D, 'C: a run after the decision decides again')
        acts = TS.notify_actions([], {'open': []}, D, 'https://x/run', r.L['summary']['standing'])
        ok(any(a[0] == 'create' and a[2] == TS.VERDICT_LABEL for a in acts), 'G: the verdict issue is not opened with the decision')
        acts = TS.notify_actions([], {'open': [], 'verdict': [{'number': 9}]}, D, 'https://x/run', '')
        ok(not acts, 'G: the verdict issue is opened twice')


# =================================================================================== E and F: the page reader
def section_ef():
    say('E, F: the page reader on the pinned payload (9dbe81f6)')
    if HELPER_WHY:
        ok(False, f'E, F: {HELPER_WHY}')
        return
    p, out = HELPER_PROC
    try:
        o, _ = p.communicate(timeout=max(5, STOP_AFTER_S - (time.time() - T_START) - 15))
    except subprocess.TimeoutExpired:
        p.kill()
        ok(False, 'E, F: the page helper did not finish')
        return
    if not ok(p.returncode == 0 and os.path.exists(out), 'E, F: the page helper failed', (o or '')[-800:]):
        return
    R = jload(out)
    if R.get('error'):
        ok(False, 'E, F: the page helper failed', R['error'])
        return
    pay = jload(PINNED_PATH)

    def no_hosts(asked, what):
        bad = [u for u in asked if re.search(r'espn\.com|the-odds-api\.com', str(u))]
        ok(not bad, f'{what}: the page asked ESPN or The Odds API', bad[:3])

    def rows(page):
        return [dict(r, gid=g, pid=q) for g, Gm in page['games'].items() for q, r in Gm['players'].items()]

    def m_holds(rs, P, what):
        bad = [r['pid'] for r in rs if r['m'] is not None and not (
            abs(r['m'] - m_of(r['price'], r['ov'])) <= 1e-12 and TSC.want_ov(P, 8, r['src']) is not None
            and abs(r['ov'] - TSC.want_ov(P, 8, r['src'])) <= 1e-12)]
        ok(not bad, f'{what}: an m is not clip(implied(price) / the week\'s overround) by the check\'s own reading', bad[:5])

    # F: as published
    F = R['F']
    if not ok(F.get('page'), 'F: the reader refused the pinned payload', F.get('msg')):
        return
    page = F['page']
    rs = rows(page)
    ok(rs and all((r['m'] is None) != (r['m_why'] is None) for r in rs) and all(r['m_why'] in (None,) + TS.M_WHY for r in rs),
       'F: a listed player with neither m nor a reason (or both)')
    ok(all(set(Gm['td']) == set(Gm['players']) for Gm in page['games'].values()), 'F: a game\'s list is not its players')
    m_holds(rs, pay, 'F')
    no_hosts(F['asked'], 'F')
    kick = {g: k for g, k in (F.get('kicks') or [])}
    sched = TS.sched_map(pay)
    off = [g for g, gm in sched.items() if TS.ko(gm) is None or kick.get(g) is None
           or TS.iso(kick[g]) != TS.iso(TS.ko(gm))]
    ok(len(kick) == len(sched) and not off, 'F: the zone database\'s kickoff is not the page\'s on every game', off[:5])
    ok(any(TS.ko(gm) < T('2026-11-01T06:00:00Z') for gm in sched.values()) and any(TS.ko(gm) > T('2026-11-01T06:00:00Z') for gm in sched.values()),
       'F: the schedule does not span the clock change of 1 November')
    C = page['counts']
    say(f"   F: {C['games']} games, {C['listed']} listed, {C['with_m']} with m, branch {C['branch']}, shown {C['shown']}, "
        f"m_why {C['m_why']}; {len(kick)} kickoffs held; boot {F['s']:.1f} s")
    # td_shadow.py run (the stub's p) and td_shadow_check.py on the real page.json, as props.yml runs them
    pj = dump(os.path.join(TMP, 'page_F.json'), page)
    L0, l0 = init_ledger('2026-10-30T20:50:00Z', os.path.join(TMP, 'F_L0.json'))
    stub = dump(os.path.join(TMP, 'F_stub.json'), {'p_rule': 'hash'})
    outL, ev, probs = (os.path.join(TMP, x) for x in ('F_L1.json', 'F_ev.json', 'F_probs.txt'))
    rc, o = py(os.path.join(HERE, 'td_shadow.py'), 'run', '--now', '2026-10-30T21:00:00Z', '--payload', PINNED_PATH,
               '--page', pj, '--ledger', l0, '--out', outL, '--evidence', ev, '--problems', probs,
               TD_SHADOW_STUB=stub, TD_SHADOW_NOW='2026-10-30T21:00:00Z')
    ok(rc == 0 and os.path.exists(outL), 'F: td_shadow.py run on the real page.json did not exit 0', last(o))
    if rc == 0:
        L1 = jload(outL)
        want = {TS.call_key(8, g, q) for g, Gm in page['games'].items() for q in Gm['td']}
        ok(set(L1['calls']) == want and all(L1['calls'][TS.call_key(8, r['gid'], r['pid'])]['m'] == r['m'] for r in rs),
           'F: a listed player not called, or called with another m', f"{len(L1['calls'])} of {len(want)}")
        rc, o = py(os.path.join(HERE, 'td_shadow_check.py'), '--ledger', outL, '--payload', PINNED_PATH, '--page', pj,
                   '--evidence', ev, '--prev', l0, '--problems', probs, TD_SHADOW_STUB=stub)
        ok(rc == 0 and last(o) == 'td shadow check: 0 failures', 'F: td_shadow_check.py fails the run on the real page.json', o[-600:])

    # E1: planted
    E = R['E1']
    if ok(E.get('page'), 'E: the reader refused the planted payload', E.get('msg')):
        P1 = json.loads(E['payload'])
        es = rows(E['page'])
        pl = E['plant']
        by = {r['pid']: r for r in es}
        rr = by.get(pl['real'], {})
        ok(rr.get('src') == 'real' and rr.get('price') == 250 and rr.get('branch') == 'real' and rr.get('tested') is True
           and rr.get('alone') is False and abs(rr['m'] - m_of(250, TSC.want_ov(P1, 8, 'real'))) <= 1e-12,
           'E: a real price planted in PAY.prices is not his m at the week\'s overround', {k: rr.get(k) for k in ('src', 'price', 'm', 'ov', 'branch')})
        ro = by.get(pl['out'], {})
        ok(ro.get('m') is None and ro.get('m_why') == 'ruled out: not drawn' and ro.get('shown') is None,
           'E: a player planted Out is not ruled out', {k: ro.get(k) for k in ('m', 'm_why', 'shown')})
        bk = [r for r in es if r['branch'] == 'backup']
        ok(bk and all(r['gid'] == pl['backup_game'] for r in bk) and all(
            r['inputs']['complete'] and not r['inputs']['starter'] and r['inputs']['rec_line'] is None
            and r['inputs']['rush_line'] is None and r['tested'] and not r['alone'] for r in bk),
           'E: the game read 8 hours out has no backup, or a backup not complete, a starter or with a line', len(bk))
        md = [r for r in es if r['branch'] == 'model']
        ln = [r for r in es if r['branch'] == 'lined']
        ok(md and all(r['alone'] and r['tested'] is False for r in md) and ln and all(r['tested'] and not r['alone'] for r in ln),
           'E: the model alone or a lined player not marked as such (alone, tested)', (len(md), len(ln)))
        ok(any(r['m_why'] == 'nothing to project: no touchdown row' for r in es) and any(r['shown'] == 'backups' for r in es)
           and all((r['m'] is None) != (r['m_why'] is None) for r in es), 'E: no one with nothing to project, or none shown only with backups')
        m_holds(es, P1, 'E')
        no_hosts(E['asked'], 'E')
        say(f"   E: branch {E['page']['counts']['branch']}, src {E['page']['counts']['src']}, m_why {E['page']['counts']['m_why']}")
    for x in R.get('refusals', []):
        ok(x['refused'] and x['matched'], f"E: the reader does not refuse a page with {x['name']}", x.get('msg'))
    ok(len(R.get('refusals', [])) == 2, 'E: the refusals did not run')
    S = R.get('site') or {}
    if ok(S.get('page'), 'E: the reader refused the made-up finals', S.get('msg')):
        site = S['page']['site']
        for k, e in S['expect'].items():
            got = (site.get(k) or {}).get('result')
            ok(got == e['want'] if e['want'] else k not in site, f"E: the site's reading of {e['why']} is {got}, not {e['want']}")
        ok(site[S['zeros']]['how'].get('from_snaps') is True and site[S['line']]['how'].get('from_snaps') is False,
           'E: from_snaps is not read off the payload\'s row')
        no_hosts(S['asked'], 'E (finals)')
    if R.get('strays'):
        say(f"   note: {len(R['strays'])} late throw(s) of closed windows, no part of a reading: {R['strays'][0][:120]}")


# ====================================================================================== G: plan and notify
def section_g(ab):
    say('G: plan and notify on the command line, the problem classes')
    pay = os.path.join(TMP, 'G_pay.json')
    with open(pay, 'w') as f:
        f.write(ab.r1.paytext)
    l0 = os.path.join(TMP, 'G_L0.json')
    with open(l0, 'w') as f:
        f.write(TS.dumps(ab.L0))
    out, probs = os.path.join(TMP, 'G_out.txt'), os.path.join(TMP, 'G_probs.txt')
    rc, o = py(os.path.join(HERE, 'td_shadow.py'), 'plan', '--payload', pay, '--ledger', l0, '--now', '2026-11-02T12:00:00Z',
               '--output', out, '--problems', probs)
    ok(rc == 0 and open(out).read() == 'work=run\nhist=true\n', 'G: plan does not write work=run and hist=true', last(o))
    rc, o = py(os.path.join(HERE, 'td_shadow.py'), 'plan', '--payload', pay, '--ledger', os.path.join(TMP, 'none.json'),
               '--now', '2026-11-02T12:00:00Z', '--output', out, '--problems', probs)
    ok(rc == 1 and open(out).read() == 'work=run\nhist=true\n' and 'REFUSED: the plan could not read its inputs' in open(probs).read(),
       'G: plan with no ledger is not refused, said, and silent on its outputs', last(o))
    # notify: deduplicated by its problems' signature (digits aside), a comment when they change, closed when clean
    lines = ['WARN: 3 frozen call(s) still ungraded more than 144 h past kickoff (e.g. x)', 'DEGRADED: the page was not read: no call this run']
    acts = TS.notify_actions(lines, {'open': []}, None, 'https://x/run/1', 's')
    ok([a[0] for a in acts] == ['label', 'create'] and acts[1][2] == TS.NOTE_LABEL and TS.problems_sig(lines) in acts[1][3],
       'G: problems and no open issue do not label and create one', acts)
    same = [lines[0].replace('3 frozen', '7 frozen'), lines[1]]
    st = {'open': [{'number': 5, 'body': 'x', 'comments': [{'body': acts[1][3]}]}]}
    ok(TS.notify_actions(same, st, None, 'https://x/run/2', 's') == [], 'G: the same problems (another count) are commented again')
    acts2 = TS.notify_actions(lines[:1], st, None, 'https://x/run/3', 's')
    ok([a[0] for a in acts2] == ['comment'] and acts2[0][1] == 5, 'G: changed problems are not commented on the open issue', acts2)
    ok(TS.notify_actions([], st, None, 'https://x/run/4', 's') == [('close', 5, 'A clean run: https://x/run/4')],
       'G: a clean run does not close the open issue')
    ok(TS.notify_actions([], {'open': []}, None, 'u', 's') == [], 'G: a clean run with no issue open does something')
    ol = TS.outcome_lines('plan=success py=success hist=failure shadow=failure', [])
    ok(ol == ['WARN: the 2010-2025 cache could not be restored',
              'REFUSED: the shadow step failed with no line (timed out or killed): the ledger stays as committed'],
       'G: a step that failed with no line is not said', ol)
    ok(TS.outcome_lines('plan=success py=success hist=success shadow=failure', ['DEGRADED: x']) == [],
       'G: a step that said why it failed is said again')
    ok('REFUSED: the plan step failed: nothing ran' in TS.outcome_lines('plan=failure', []), 'G: a failed plan step is not said')
    pf = os.path.join(TMP, 'G_classes.txt')
    pr = TS.Problems(pf)
    with quiet():
        pr.add('WARN', 'one  line\nbroken')
        pr.add('WARN', 'one line broken')
        pr.add('DEGRADED', 'two')
    ok(open(pf).read() == 'WARN: one line broken\nDEGRADED: two\n' and pr.has('DEGRADED') and not pr.has('REFUSED'),
       'G: a problem line is not written once, on one line, under its class')
    try:
        pr.add('NOTE', 'x')
        ok(False, 'G: a problem class other than REFUSED, DEGRADED and WARN is taken')
    except AssertionError:
        ok(True, '')
    tmpd = os.path.join(TMP, 'G_notify')
    os.makedirs(tmpd)
    state = dump(os.path.join(TMP, 'G_state.json'), {'open': []})
    rc, o = py(os.path.join(HERE, 'td_shadow.py'), 'notify', '--tmp', tmpd, '--ledger', l0, '--run', 'https://x/run/5',
               '--dry-run', '--state', state, OUTCOMES='plan=success py=success hist=success shadow=failure')
    ok(rc == 0 and '"create"' in o and 'failed with no line' in o, 'G: notify --dry-run does not open an issue for a silent failure', o[-400:])


# ======================================================================================= H: staging and glue
GAMES_CSV = ('game_id,season,game_type,week,gameday,gametime,away_team,away_score,home_team,home_score\n'
             '2025_01_AAA_BBB,2025,REG,1,2025-09-07,13:00,AAA,10,BBB,20\n'
             '2026_08_AAA_BBB,2026,REG,8,2026-11-01,13:00,AAA,17,BBB,24\n'
             '2026_08_CCC_DDD,2026,REG,8,2026-11-01,13:00,CCC,3,DDD,6\n'
             '2026_09_AAA_BBB,2026,REG,9,2026-11-08,13:00,AAA,,BBB,\n'
             '2026_09_CCC_DDD,2026,REG,9,2026-11-08,13:00,CCC,,DDD,\n'
             '2026_09_EEE_FFF,2026,REG,9,2026-11-08,16:25,EEE,,FFF,\n')


def section_h():
    say('H: staging, the history cache, the downloads, and the p and grade glue')
    import pandas as pd
    OS = TS.os_module()
    man = TS.manifest()
    names = sorted(man['fitted_on']['raw_sha256'])
    season = [n for n in names if n not in OS.FROZEN_INPUTS]
    ok(len(names) == 89 and len(season) == 87, f'H: the manifest names {len(names)} files, not 89')
    pr = os.path.join(TMP, 'H_props_raw')
    os.makedirs(pr)
    for fn, body in (('pw_2026.csv', 'player_id,season,week\nX,2026,1\n'), ('injuries_2026.csv', 'season,week,gsis_id\n2026,1,X\n'),
                     ('depth_charts_2026.csv', 'season,club_code\n2026,AAA\n'), ('games.csv', GAMES_CSV)):
        with open(os.path.join(pr, fn), 'w') as f:
            f.write(body)
    downloads, fail = [], set()

    def fake_download(url, dest, log=print):
        downloads.append((os.path.basename(dest), OS.F.HOLDOUT_FROM, url))
        if os.path.basename(dest) in fail:
            raise RuntimeError('a planted download failure')
        with open(dest, 'wb') as f:
            f.write(b'downloaded\n')

    def no_refresh(*a, **k):
        raise AssertionError('predict.refresh was called')

    def case(name, setup=None, props_raw=pr):
        d = os.path.join(TMP, 'H_' + name)
        hist, data = os.path.join(d, 'hist'), os.path.join(d, 'run', 'data')
        os.makedirs(os.path.join(hist, 'raw'))
        for fn in season:
            with open(os.path.join(hist, 'raw', fn), 'wb') as f:
                f.write(b'x')
        if setup:
            setup(os.path.join(hist, 'raw'))
        m = TS.RealModel(OS, data, hist, props_raw, TS.Problems(None))
        downloads.clear()
        try:
            with quiet():
                info, err = m.stage(), None
        except Exception as e:      # noqa: BLE001
            info, err = None, e
        return SimpleNamespace(info=info, err=err, hist=hist, data=data, marker=os.path.join(d, 'run', 'hist_ok'),
                               dl=list(downloads), model=m)

    with patched(OS.F.netfetch, download=fake_download), patched(OS.PR, refresh=no_refresh):
        h = case('exact')
        ok(h.err is None and h.info['hist']['ok'] and h.info['hist']['downloaded'] == 0 and os.path.exists(h.marker),
           'H: a history of exactly the manifest\'s files does not write hist_ok', h.err or h.info and h.info['hist'])
        got = sorted((n, hf) for n, hf, _ in h.dl)
        ok(got == [('play_by_play_2026.parquet', 2027), ('roster_weekly_2026.csv', 2027), ('snap_counts_2026.csv', 2027)]
           and all('nflverse' in u for _, _, u in h.dl),
           'H: the run does not download exactly the 2026 files props/raw lacks, through lib/netfetch.py, inside the lift', got)
        raw = os.path.join(h.data, 'raw')
        same = all(open(os.path.join(pr, a), 'rb').read() == open(os.path.join(raw, b), 'rb').read()
                   for a, b, _ in TS.PROPS_RAW if os.path.exists(os.path.join(pr, a)))
        ok(same and os.path.samefile(os.path.join(raw, season[0]), os.path.join(h.hist, 'raw', season[0])),
           'H: props/raw is not staged under the model\'s names, or the history not linked')
        ok(set(h.info['raw_2026']) == {'depth_charts_2026.csv', 'games_to2026.csv', 'injuries_2026.csv', 'play_by_play_2026.parquet',
                                       'roster_weekly_2026.csv', 'snap_counts_2026.csv', 'stats_player_week_2026.csv'},
           'H: the run\'s 2026 files are not recorded', sorted(h.info['raw_2026']))
        ok(all(TS.sha256_file(os.path.join(h.hist, 'raw', fn)) == man['fitted_on']['raw_sha256'][fn] for fn in OS.FROZEN_INPUTS),
           'H: the frozen inputs are not the manifest\'s')
        ok(OS.F.HOLDOUT_FROM == OS.B.HOLDOUT_FROM == 2026, 'H: the holdout is not 2026 after staging')

        def junk(r):
            for fn in OS.FROZEN_INPUTS:
                with open(os.path.join(r, fn), 'w') as f:
                    f.write('a copy that is not the frozen one\n')
        h2 = case('junk', junk)
        ok(h2.err is None and all(TS.sha256_file(os.path.join(h2.hist, 'raw', fn)) == man['fitted_on']['raw_sha256'][fn]
                                  for fn in OS.FROZEN_INPUTS), 'H: a cached copy of a frozen input that differs is not restored')
        h3 = case('extra', lambda r: open(os.path.join(r, 'extra_2019.csv'), 'w').write('x'))
        ok(h3.err is None and not h3.info['hist']['ok'] and h3.info['hist']['extra'] == ['extra_2019.csv']
           and not os.path.exists(h3.marker) and not os.path.exists(os.path.join(h3.data, 'raw', 'extra_2019.csv')),
           'H: a history with a file the manifest does not name writes hist_ok')
        fail.add(season[0])
        h4 = case('fails', lambda r: os.remove(os.path.join(r, season[0])))
        fail.clear()
        ok(h4.err is not None and not os.path.exists(h4.marker), 'H: a download that fails does not stop the staging, or writes hist_ok')
        h5 = case('missing', lambda r: os.remove(os.path.join(r, season[0])))
        ok(h5.err is None and h5.info['hist']['downloaded'] == 1 and h5.dl[0][:2] == (season[0], 2026) and os.path.exists(h5.marker),
           'H: a file missing from the cache is not downloaded with the holdout at 2026', h5.dl[:1])
        pr2 = os.path.join(TMP, 'H_props_raw_no_pw')
        shutil.copytree(pr, pr2)
        os.remove(os.path.join(pr2, 'pw_2026.csv'))
        h6 = case('no_pw', props_raw=pr2)
        ok(h6.err is not None and 'pw_2026.csv' in str(h6.err), 'H: props/raw without its stats does not stop the staging')

        # the p glue: per-game coverage, the clip, lambda, why p is none, in players.csv; predict mode inside the lift
        with open(os.path.join(h.data, 'raw', 'players.csv'), newline='') as f:
            real_pid = next(csv.DictReader(f))['gsis_id']
        A, Bp, Cp, Dp, Ep = real_pid, '00-0098001', '00-0098002', '00-0098003', '00-0098004'
        seen = []

        def week_rows(data, season_, week, fetch=False):
            seen.append((season_, week, fetch, OS.F.HOLDOUT_FROM, OS.B.HOLDOUT_FROM))
            return pd.DataFrame({'game_id': ['2026_09_AAA_BBB', '2026_09_AAA_BBB', '2026_09_EEE_FFF', '2026_09_CCC_DDD'],
                                 'pid': [A, Bp, Cp, Ep], 'grp': ['WR', 'K', 'RB', 'TE'], 'team': ['AAA', 'BBB', 'EEE', 'DDD'],
                                 'cand_src': ['depth', 'depth', 'roster', 'depth'], 'kickoff_utc': ['x'] * 4}), {'rows': 4}

        class Pred:
            sources = {'models_dir': 0, 'repo_gz': 4}

            def predict_rows(self, rows):
                return pd.DataFrame({'stat': ['any_td', 'receptions', 'any_td', 'any_td'],
                                     'game_id': ['2026_09_AAA_BBB', '2026_09_AAA_BBB', '2026_09_EEE_FFF', '2026_09_CCC_DDD'],
                                     'pid': [A, A, Cp, Ep], 'grp': ['WR', 'WR', 'RB', 'TE'], 'team': ['AAA', 'AAA', 'EEE', 'DDD'],
                                     'cand_src': ['depth', 'depth', 'roster', 'depth'], 'p_ge1': [0.9995, 0.5, 0.3, 0.4],
                                     'params': ['{"lam": 7.6}', '{"mu": 4}', '{"lam": 0.35}', '{"lam": 0.51}']})
        miss = ['2026_08_CCC_DDD: snap counts of CCC']
        cov = lambda data, s, weeks: {'weeks': list(weeks), 'games': 3, 'played': 2, 'not_played': [], 'missing': list(miss)}   # noqa: E731
        with patched(OS, coverage=cov), patched(OS.PR, week_rows=week_rows), patched(TS, make_predictor=lambda O, d: Pred()):
            keys = [('2026_09_AAA_BBB', A), ('2026_09_AAA_BBB', Bp), ('2026_09_AAA_BBB', Cp), ('2026_09_AAA_BBB', Dp),
                    ('2026_09_CCC_DDD', Ep)]
            with quiet():
                out = h.model.predict({9: keys})
            P = out['p']
            ok(P[keys[0]]['p'] == 0.999 and P[keys[0]]['lam'] == 7.6 and P[keys[0]]['grp'] == 'WR' and P[keys[0]]['p_why'] is None
               and P[keys[0]]['in_players_csv'] is True, 'H: p is not clip(p_ge1) with lambda, his group and players.csv', P[keys[0]])
            ok([P[k]['p_why'] for k in keys[1:]] == ['group not covered', 'candidate in another game', 'no candidate row',
                                                     'history not complete: ' + miss[0]]
               and all(P[k]['p'] is None for k in keys[1:]) and P[keys[1]]['in_players_csv'] is False,
               'H: a call with no p does not carry why', [P[k]['p_why'] for k in keys[1:]])
            ok(seen == [(2026, 9, False, 2027, 2027)] and out['weeks'][9]['coverage'] == {'2026_09_AAA_BBB': None,
                                                                                           '2026_09_CCC_DDD': 'history not complete: ' + miss[0]},
               'H: predict mode does not run once, without downloads, inside the lift, with coverage per game', seen)
            seen.clear()
            with quiet():
                out = h.model.predict({9: keys[4:]})
            ok(seen == [] and out['weeks'][9]['predicted'] is False and out['p'][keys[4]]['p'] is None,
               'H: predict mode runs for a week whose every game is not covered')
            # the grade glue: a game's own files (a score, nothing missing), one outcomes() build inside the lift
            calls_o = []

            def outcomes(data, s):
                calls_o.append((s, OS.F.HOLDOUT_FROM, OS.B.HOLDOUT_FROM))
                ev = {c: [1, 1, 1] for c in TS.EVIDENCE}
                ev.update(y_rush_rec_tds=[1, 0, float('nan')], y_special_teams_tds=[0, 0, 0])
                return pd.DataFrame(dict(game_id=['2026_08_AAA_BBB'] * 3, pid=[A, Bp, Cp], y_any_td=[1.0, 0.0, float('nan')], **ev))
            miss[:] = ['2026_08_CCC_DDD: play-by-play']
            with patched(OS, outcomes=outcomes):
                gk = [('2026_08_AAA_BBB', A), ('2026_08_AAA_BBB', Bp), ('2026_08_AAA_BBB', Cp), ('2026_08_AAA_BBB', Dp),
                      ('2026_08_CCC_DDD', Ep), ('2026_09_EEE_FFF', Cp)]
                with quiet():
                    own, grades = h.model.grade(gk)
            ok(own == {'2026_08_AAA_BBB': True, '2026_08_CCC_DDD': False, '2026_09_EEE_FFF': False},
               'H: a game\'s own files are not covered by its score and the one-shot\'s coverage', own)
            ok([(grades[k]['result'], grades[k]['y'], grades[k]['how']) for k in gk[:4]]
               == [('td', 1, 'played'), ('no_td', 0, 'played'), (None, None, 'played, with no touchdown count on his row'),
                   ('void', None, 'did not play')] and set(grades) == set(gk[:4]) and calls_o == [(2026, 2027, 2027)],
               'H: the grade glue does not read the build\'s played rows as registered, once, inside the lift', calls_o)
    ok(OS.F.HOLDOUT_FROM == OS.B.HOLDOUT_FROM == 2026, 'H: the holdout is not 2026 after the glue')

    # the WARN when the history was downloaded on two runs in a row (its cache not holding)
    class Downloads(TS.StubModel):
        def stage(self):
            s = super().stage()
            s['hist']['downloaded'] = 12
            return s
    w = World('2026-11-02T11:00:00.000Z')
    L0, _ = init_ledger('2026-11-01T12:00:00Z', os.path.join(TMP, 'H_L0.json'))
    r1 = step(w, L0, '2026-11-02T12:00:00Z', model=Downloads(w.stub()))
    r2 = step(w, r1.L, '2026-11-02T13:00:00Z', model=Downloads(w.stub()))
    ok(not r1.bad and not r2.bad and not any('downloaded again' in x for x in r1.probs)
       and any('downloaded again on two runs in a row' in x for x in r2.probs), 'H: a history downloaded on two runs in a row is not said')


# ============================================================================================== I: the guard
TREE_FILES = ('td_shadow.py', 'td_shadow_check.py', 'fetch.py', 'build_features.py', 'predict.py', 'oneshot_2026.py',
              'requirements.txt', 'PREREGISTRATION.md', 'frozen/MANIFEST.json', 'results/oneshot_2026.json')


def make_tree(name):
    """a copy of the shadow's folder (and lib/netfetch.py) to alter: a registered file, or the one-shot's result"""
    root = os.path.join(TMP, 'tree_' + name)
    for rel in TREE_FILES:
        dst = os.path.join(root, TS.REL, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(HERE, rel), dst)
    os.makedirs(os.path.join(root, 'lib'), exist_ok=True)
    shutil.copy2(os.path.join(REPO, 'lib', 'netfetch.py'), os.path.join(root, 'lib', 'netfetch.py'))
    return root


def section_i(ab):
    say('I: the guard')
    rc, o = py('-c', f'import sys; sys.path.insert(0, {HERE!r}); import td_shadow as T, td_shadow_check; O = T.load(); '
                     'print(O.F.HOLDOUT_FROM, O.B.HOLDOUT_FROM)')
    ok(rc == 0 and last(o) == '2026 2026', 'I: importing td_shadow and td_shadow_check moves the holdout off 2026', last(o))
    OS = TS.os_module()
    try:
        TS.guard_code(OS, need_313=False, versions=False)
        ok(True, '')
    except TS.Refused as e:
        ok(False, 'I: the guard refuses this checkout\'s registered files', e)
    reg = OS.registered(TS.PREREG)
    files = {p: h for p, h in reg.items() if not p.startswith('git:')}
    off = [p for p, h in files.items() if not os.path.exists(os.path.join(REPO, p)) or TS.sha256_file(os.path.join(REPO, p)) != h]
    ok(len(files) >= 10 and not off and all(files.get(p) == h for p, h in TS.BAR['registered_with']['runs'].items()),
       'I: a file PREREGISTRATION.md registers is not its registered bytes (a PR may never edit one)', off)
    rw = TS.BAR['registered_with']
    ok(TS.sha256_file(TS.PREREG) == rw['preregistration_sha256'] and TS.sha256_file(TS.RESULT) == rw['oneshot_sha256']
       and jload(TS.RESULT)['verdict']['anytime_td'] == 'PASS', 'I: PREREGISTRATION.md or the one-shot\'s result is not BAR\'s')
    try:
        with TS.lifted(OS):
            ok(OS.F.HOLDOUT_FROM == OS.B.HOLDOUT_FROM == 2027, 'I: the lift does not set 2027 in both modules')
            raise KeyError('planted')
    except KeyError:
        pass
    ok(OS.F.HOLDOUT_FROM == OS.B.HOLDOUT_FROM == 2026, 'I: the lift is not undone after an exception inside it')

    pay = os.path.join(TMP, 'I_pay.json')
    with open(pay, 'w') as f:
        f.write(ab.r1.paytext)
    led = os.path.join(TMP, 'I_L1.json')
    with open(led, 'w') as f:
        f.write(ab.r1.text)
    stub = ab.w.stub()
    later = '2026-11-02T13:00:00Z'

    def run(*extra, script=os.path.join(HERE, 'td_shadow.py'), ledger=led, now=later, payload=pay, out=None, **kv):
        out = out or os.path.join(TMP, 'I_out.json')
        with open(out, 'w') as f:
            f.write('stale')                     # a refused run leaves nothing at --out
        rc, o = py(script, 'run', '--now', now, '--payload', payload, '--ledger', ledger, '--out', out, *extra, **kv)
        return rc, o, (open(out).read() if os.path.exists(out) else None)

    rc, o, w = run(TD_SHADOW_STUB=stub, PROPMODEL_LIFT_HOLDOUT='x')
    ok(rc == 1 and w is None and 'PROPMODEL_LIFT_HOLDOUT' in o, 'I: run with PROPMODEL_LIFT_HOLDOUT set is not refused', last(o))
    rc, o, w = run(TD_SHADOW_STUB=stub, GITHUB_ACTIONS='true', GITHUB_REF_NAME='main')
    ok(rc == 1 and w is None and 'never on GitHub Actions' in o, 'I: the stub on GitHub Actions is not refused', last(o))
    rc, o, w = run('--hist', TMP, '--data', os.path.join(TMP, 'I_data'), GITHUB_ACTIONS='true', GITHUB_REF_NAME='412/merge')
    ok(rc == 1 and w is None and 'on main alone' in o, 'I: a run on a branch on GitHub Actions is not refused', last(o))
    before = TS.sha256_file(COMMITTED) if os.path.exists(COMMITTED) else None
    rc, o = py(os.path.join(HERE, 'td_shadow.py'), 'run', '--now', later, '--payload', pay, '--ledger', led, '--out', COMMITTED,
               TD_SHADOW_STUB=stub)
    after = TS.sha256_file(COMMITTED) if os.path.exists(COMMITTED) else None
    ok(rc == 1 and 'never writes the committed ledger' in o and before == after,
       'I: the stub writes the committed ledger path', last(o))
    # the same rule where it can be seen without the committed ledger: --out or --evidence the ledger read is refused
    # before anything is removed (until 31 October 2026 run deleted --out first, and the committed ledger with it)
    own = os.path.join(TMP, 'I_own.json')
    for flag in ('--out', '--evidence'):
        with open(own, 'w') as f:
            f.write(ab.r1.text)
        args = ['--out', own] if flag == '--out' else ['--out', os.path.join(TMP, 'I_x.json'), '--evidence', own]
        rc, o = py(os.path.join(HERE, 'td_shadow.py'), 'run', '--now', later, '--payload', pay, '--ledger', own, *args,
                   TD_SHADOW_STUB=stub)
        ok(rc == 1 and 'is the ledger itself' in o and os.path.exists(own) and open(own).read() == ab.r1.text,
           f'I: run with {flag} the ledger it reads is not refused with the ledger left as it was', last(o))
    tree = make_tree('guard')
    tpm = os.path.join(tree, TS.REL)
    with open(os.path.join(tpm, 'build_features.py'), 'a') as f:
        f.write('\n# altered\n')
    rc, o, w = run(script=os.path.join(tpm, 'td_shadow.py'), TD_SHADOW_STUB=stub)
    ok(rc == 1 and w is None and 'not the registered bytes' in o, 'I: run on an altered registered file is not refused', last(o))
    shutil.copy2(os.path.join(HERE, 'build_features.py'), os.path.join(tpm, 'build_features.py'))
    res = jload(os.path.join(tpm, 'results', 'oneshot_2026.json'))
    res['verdict']['anytime_td'] = 'FAIL'
    dump(os.path.join(tpm, 'results', 'oneshot_2026.json'), res)
    rc, o, w = run(script=os.path.join(tpm, 'td_shadow.py'), TD_SHADOW_STUB=stub)
    ok(rc == 1 and w is None and 'one-shot result' in o, 'I: run without the one-shot\'s PASS is not refused', last(o))
    nc = os.path.join(TMP, 'I_noncanon.json')
    with open(nc, 'w') as f:
        f.write(ab.r1.text.replace('\n "run_at"', '\n  "run_at"', 1))
    rc, o, w = run(ledger=nc, TD_SHADOW_STUB=stub)
    ok(rc == 1 and w is None and 'canonical' in o, 'I: a ledger that is not canonical is not refused', last(o))
    rc, o, w = run(now=ab.r1.L['run_at'], TD_SHADOW_STUB=stub, TD_SHADOW_NOW=ab.r1.L['run_at'])
    ok(rc == 1 and w is None and 'not after the ledger' in o, 'I: a run at the ledger\'s own clock is not refused', last(o))
    # DEGRADED on the command line: no page.json while a game is to be called; exit 2, written, and the check passes
    out, ev, probs = (os.path.join(TMP, x) for x in ('I_deg.json', 'I_deg_ev.json', 'I_deg_probs.txt'))
    rc, o, w = run('--evidence', ev, '--problems', probs, out=out, TD_SHADOW_STUB=stub, TD_SHADOW_NOW=later)
    ok(rc == 2 and w and 'DEGRADED: the page was not read' in open(probs).read(), 'I: a run with no page.json does not exit 2, written', last(o))
    rc, o = py(os.path.join(HERE, 'td_shadow_check.py'), '--ledger', out, '--payload', pay, '--evidence', ev, '--prev', led,
               TD_SHADOW_STUB=stub)
    ok(rc == 0 and last(o) == 'td shadow check: 0 failures', 'I: the check fails the DEGRADED run', o[-400:])
    rc, o = py(os.path.join(HERE, 'td_shadow_check.py'), '--ledger', out, '--payload', pay, '--evidence', ev, '--prev', led)
    ok(rc == 1 and '[4]' in o, 'I: the check passes a stub\'s run without TD_SHADOW_STUB', last(o))
    p25 = os.path.join(TMP, 'I_pay25.json')
    dump(p25, dict(ab.r1.pay, season=2025))
    rc, o, w = run(payload=p25, TD_SHADOW_STUB=stub)
    ok(rc == 0 and w == ab.r1.text, 'I: a payload of another season does not leave the ledger as it was', last(o))


# ===================================================================================== J: nothing reads it
def section_j():
    say('J: nothing on the site reads the ledger')
    import glob
    files = [os.path.join(REPO, 'index.html')] + sorted(glob.glob(os.path.join(REPO, 'nflbets', 'build', '*'))) \
        + sorted(glob.glob(os.path.join(REPO, 'props', 'build', 'part*'))) + sorted(glob.glob(os.path.join(REPO, 'liveparlays', 'build', '*')))
    hits = []
    for p in files:
        if os.path.isfile(p):
            with open(p, encoding='utf-8', errors='replace') as f:
                t = f.read()
            hits += [os.path.relpath(p, REPO) for s in ('td_ledger', 'propmodel/shadow') if s in t]
    ok(len(files) > 10 and not hits, 'J: a page or its source names the shadow\'s ledger', hits)


# ================================================================================================== the run
def main():
    say(f'test_td_shadow: Python {sys.version.split()[0]}, in {TMP}')
    ab = None
    for name, fn in (('A, B', section_ab), ('D', lambda: section_d(ab)), ('C', section_c), ('C runs', section_c_runs),
                     ('G', lambda: section_g(ab)), ('H', section_h), ('I', lambda: section_i(ab)), ('J', section_j),
                     ('E, F', section_ef)):
        t0 = time.time()
        try:
            r = fn()
            if name == 'A, B':
                ab = r
        except Exception:          # noqa: BLE001 -- a section that crashes is a failure, and the rest still run
            import traceback
            traceback.print_exc()
            ok(False, f'section {name} crashed')
            if name == 'A, B':
                say('(the sections that stand on A and B are skipped)')
                break
        say(f'   ({name}: {time.time() - t0:.1f} s)')
    ok((TS.sha256_file(COMMITTED) if os.path.exists(COMMITTED) else None) == COMMITTED_SHA, 'the test touched the committed ledger')
    OS = TS.os_module()
    ok(OS.F.HOLDOUT_FROM == OS.B.HOLDOUT_FROM == 2026, 'the holdout is not 2026 at the end')
    shutil.rmtree(TMP, ignore_errors=True)
    say(f'test_td_shadow: {time.time() - T_START:.1f} s')
    print(f'{N} checks, {BAD} failures', flush=True)
    return 1 if BAD else 0


if __name__ == '__main__':
    sys.exit(main())
