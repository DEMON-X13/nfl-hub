#!/usr/bin/env python3
"""The anytime-touchdown shadow's test (props/research/propmodel/README.md, "The touchdown shadow"; td_shadow.py,
td_shadow_check.py and td_shadow_page.js). A unit of the props gate's job C: Python 3.12 with props/requirements.txt
(numpy, pandas, pyarrow; no lightgbm and no scipy), node 22 with props/build/node_modules, the full git history. The
model never runs here: p and the played rows are a TD_SHADOW_STUB stand-in, or the registered functions' glue fed
made-up frames. No 2026 outcome is read: every played row and stat row below is made up, and the one real payload
used, props/data/payload.json as the props job published it at 9dbe81f6 (30 October 2026, 20:43 UTC), is read for
its schedule, its published ESPN read and the page's own estimate, at clocks before its games, and for made-up finals.

  A  the call rules on a made-up week (in process: td_shadow.update, then td_shadow_check.check on what it wrote),
     init's two refusals, and every page.json rule update keeps (another payload or clock, a kickoff off the
     schedule's, a list not its players, a game to call unread: DEGRADED, no call)
  B  the grades: none before 96 h, pending while a game's files are out, void at 14 days, td / no_td / void from
     made-up played rows, a moved game and the 24-hour line (3 hours graded from the rows, 25 void), the site's
     reading recorded, a grade never rewritten
  C  the decision: decide() with the one-shot's own mean_diff and signal_test equal to them called directly, bit for
     bit; the rest on stand-ins: none at 1,999, the first 2,000 in grading order, PASS and each way to FAIL, the
     owner's Q2 (no touchdown priced on the model alone in the sample), FAIL stopping calls, PASS letting them go on,
     the season ending undecided
  D  the check bites: a planted edit for every sub-condition of every rule (1 to 15), each held by its own words, never
     by another condition of its rule tripping beside it; main()'s crash catch, its refusal with no last commit and
     the stub on Actions; and --registration, the props gate's hold, on every way a ledger can differ from init's
  E  the page reader on planted copies of the pinned payload (a lined player, a backup, the model alone, a real
     price, one ruled out, one with nothing to project, one shown only with backups; the reader refusing a page whose
     legChance or row moved, and sixteen more refusals on one boot, each plant taken off after; the site's own
     verdicts on made-up finals) and F on the pinned payload as published, with the zone database's kickoff against
     the page's on every game, then td_shadow.py run and the check on it
  G  plan and notify (--dry-run), the problem classes
  H  staging: props/raw under the model's names, hist_ok only for exactly the manifest's files, the frozen inputs
     restored, every download through lib/netfetch.py, predict.refresh never called, and the p and grade glue; the
     per-game coverage on each club's last previous game (two played weeks and a bye), the older holes a WARN
  I  the guard: the holdout at 2026 after importing, every refusal on its own (PROPMODEL_LIFT_HOLDOUT, each registered
     file altered alone in a copy of the tree, predict.py's manifest, PREREGISTRATION.md's copy of the hashes, the
     pins, Python 3.13, the holdout as imported, a result not the one-shot's, a branch on Actions, the stub on Actions
     or on the committed ledger, a ledger not canonical or whose bar or model block moved, a clock not after the
     ledger's, a run without the stub checking the pins first), the lift undone after an exception, the checkout's
     registered files their registered hashes (a PR editing one fails here), and the bar pinned: BAR's SHA-256 and
     the committed ledger's registration time (BAR_SHA256, BAR_REGISTERED)
  J  nothing on the site reads the ledger
  K  props.yml's shadow step: its script run under bash -e in a copy of the folder that is a git repository of its
     own (exit 0 and the checked ledger moved; exit 1 and the committed one left where the check refuses; exit 2 and
     moved where the page is unread)

    python3 props/research/propmodel/test_td_shadow.py      ends "N checks, 0 failures" (about 45 s); stops itself at 3 minutes
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
# The bar as registered, pinned (section I): BAR's own SHA-256 (json.dumps, keys sorted) and the registration time of
# the committed ledger. BAR "never changes" (its `changes` clause), so a pull request that edits BAR, or BAR and the
# ledger together, must edit these two lines too, where a reviewer sees it; one that edits BAR alone fails job C here
# before it merges, where until the review of 31 October 2026 it merged and refused every props run's shadow after
BAR_SHA256 = 'd3da5f402f8f48758f76d1cc4c7365314c7dc12aacedd43d00e250d32ccced73'
BAR_REGISTERED = '2026-10-31T04:48:56Z'
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
  // E4: every refusal of the reader on one boot of the pinned payload as published (read() called again and again on
  // the same window): each plant put on, the reading refused in its own words, the plant taken off; a reading with
  // nothing planted written before them and after them, so each refusal is its plant's
  {
    const crypto = require('crypto'), sha = b => crypto.createHash('sha256').update(b).digest('hex');
    const now = Date.parse(T0);
    const bt = await boot0(BASE, now), w = bt.w, ask = bt.asked, errs = bt.errs;
    const o = { payload: JSON.parse(BASE), payloadSha: sha(Buffer.from(BASE, 'utf8')), indexSha: sha(fs.readFileSync(path.join(REPO, 'index.html'))),
      nowText: T0, now, ledger: null, errs, asked: ask };
    const tryRead = () => { try { const pg = TP.read(w, o); return { written: true, games: pg.counts.games, with_m: pg.counts.with_m }; }
      catch (e) { return { refused: e instanceof TP.Refuse, msg: String((e && e.message) || e).slice(0, 300) }; } };
    const ev = c => w.eval(c);
    const g0 = Object.keys(games).sort()[0];
    const lp0 = (Object.entries(games[g0].players).find(([pid, r]) => r.m != null && r.src === 'dkline') || [null])[0];
    // the game's page drawn, then one of its touchdown rows changed (the first that states a chance)
    const onRow = fn => `(function(){ window.__rg = renderGame; renderGame = function(){ const x = window.__rg.apply(this, arguments);
      for (const i of document.querySelectorAll('#gameView input[data-leg$="|any_td"][data-k="1"]')) {
        const tr = i.closest('tr'), c = tr && tr.querySelector('[data-legchance]'); if (c) { (${fn})(i, c); break; } }
      return x; }; })()`;
    const offRow = 'renderGame = window.__rg';
    const plants = [
      ['the touchdown price moved off the rule', /price \S+ where the rule says/,
        () => ev('window.__p0 = guessTdPrice; guessTdPrice = function(){ const r = window.__p0.apply(this, arguments); if (r && typeof r === "object" && isFinite(r.price)) return Object.assign({}, r, { price: r.price + 15 }); if (typeof r === "number") return r + 15; return r; }'),
        () => ev('guessTdPrice = window.__p0')],
      ["the estimate's overround moved", /overround \S+ where the rule reads/,
        () => ev('window.__v0 = DK_EST.tdVig; DK_EST.tdVig = 1.08'), () => ev('DK_EST.tdVig = window.__v0')],
      ["a game's published read not installed", /did not install the payload's ESPN read/,
        () => ev(`window.__e0 = ESPN_LIVE["8"][${JSON.stringify(g0)}]; delete ESPN_LIVE["8"][${JSON.stringify(g0)}]`),
        () => ev(`ESPN_LIVE["8"][${JSON.stringify(g0)}] = window.__e0`)],
      ['a function the reader calls gone', /the page has no tdBranch/,
        () => ev('window.__t0 = tdBranch; tdBranch = undefined'), () => ev('tdBranch = window.__t0')],
      ['ESPN asked for player lines', /asked ESPN for player lines/,
        () => ask.push('https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/1/competitions/1/odds'), () => ask.pop()],
      ['The Odds API asked', /asked The Odds API/, () => ask.push('https://api.the-odds-api.com/v4/sports/'), () => ask.pop()],
      ['a page error', /the page threw: planted/, () => errs.push('planted'), () => errs.pop()],
      ['another payload loaded', /did not load the payload/,
        () => ev('window.__b0 = PAY.baked_at; PAY.baked_at = "planted"'), () => ev('PAY.baked_at = window.__b0')],
      ["the page's clock not the run's", /clock is not the run's/,
        () => ev('window.__d0 = Date.now; Date.now = function(){ return 0; }'), () => ev('Date.now = window.__d0')],
      ['a touchdown row not drawn', /his touchdown row is not drawn/, () => ev(onRow('(i, c) => i.remove()')), () => ev(offRow)],
      ['a dash where a chance is stated', /draws a dash where legChance states a chance/,
        () => ev(onRow('(i, c) => c.removeAttribute("data-legchance")')), () => ev(offRow)],
      ["the heading's projection moved", /the heading's projection/,
        () => ev(onRow('(i, c) => { const p = i.closest(".statblk").querySelector("[data-td-proj]"); if (p) p.setAttribute("data-td-proj", "0.123456"); }')),
        () => ev(offRow)],
      ['the untested flag flipped off the rule', /alone\/tested \S+ where the rule says/,
        () => ev('window.__e1 = plEst; plEst = function(){ const r = window.__e1.apply(this, arguments); return r && r.src === "dkline" ? Object.assign({}, r, { tested: !r.tested }) : r; }'),
        () => ev('plEst = window.__e1')],
      ["the page's branch off the rule's", /branch backup where the rule reads lined/,
        () => ev('window.__t1 = tdBranch; tdBranch = function(){ const b = window.__t1.apply(this, arguments); return b === "lined" ? "backup" : b; }'),
        () => ev('tdBranch = window.__t1')],
      // legChance reads legFairStated (no hook is set), so moving the one moves both, and they stay equal
      ["the stated chance off the rule's fair chance (legChance and legFairStated moved together)", /where the rule's fair chance is/,
        () => ev('window.__c2 = legFairStated; legFairStated = function(l, m){ const c = window.__c2.apply(this, arguments); '
          + 'return c && l && l.stat === "any_td" ? Object.assign({}, c, { p: Math.min(0.999, c.p + 0.01) }) : c; }'),
        () => ev('legFairStated = window.__c2')],
      ['a real price the rule has none for', /the page's real price 250 is not the rule's/,
        () => ev(`window.__o0 = oddsFor; oddsFor = function(gid, pid, stat, k){ if (gid === ${JSON.stringify(g0)} && pid === ${JSON.stringify(lp0)} && stat === "any_td") return 250; return window.__o0.apply(this, arguments); }`),
        () => ev('oddsFor = window.__o0')]];
    res.E4 = { before: tryRead(), plants: [] };
    for (const [name, re, put, take] of plants) {
      let r;
      try { put(); r = tryRead(); } catch (e) { r = { msg: 'the plant threw: ' + String(e) }; }
      try { take(); } catch (e) { r = { msg: 'the plant could not be taken off: ' + String(e) }; }
      res.E4.plants.push({ name, refused: !!r.refused, matched: !!(r.msg && re.test(r.msg)), msg: r.msg || null });
    }
    res.E4.after = tryRead();
    try { w.close(); } catch (e) { /* closing only */ }
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


def step(w, L, now, page=True, data=False, model=None, page_edit=None):
    """one run: td_shadow.update on L at `now` (the run's clock), then td_shadow_check.check on what it wrote;
    page_edit(page) returns the page.json the run is handed instead of the reader's"""
    now = T(now)
    P, sha, text = w.pay()
    pg = w.page(P, sha, now) if page else None
    if page_edit:
        pg = page_edit(json.loads(json.dumps(pg)))
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


KEEP = object()


def recheck(r, edit=None, resum=True, prev=KEEP, allow_stub=True, page=KEEP, ev=KEEP, data=KEEP):
    """the check on a copy of a run's ledger with one planted edit (the summary worked again unless the rule is 15).
    prev, page, ev and data stand in for the run's own; page and ev may be functions, given a copy of the run's own
    and returning the one to check with"""
    L = json.loads(r.text)
    text = edit(L) if edit else None
    if not isinstance(text, str):                 # an edit in place (its own return value aside)
        if resum and edit:
            L['summary'] = TS.summarize(L['calls'], L['decision'], L['runs'], TS.season_done(r.pay))
        text = TS.dumps(L)

    def pick(v, own):
        if v is KEEP:
            return own
        return v(json.loads(json.dumps(own))) if callable(v) else v
    with quiet():
        bad, _, _ = TSC.check(json.loads(text), text, pick(prev, r.prev), r.pay, r.sha, pick(page, r.page), pick(ev, r.ev),
                              r.data if data is KEEP else data, allow_stub=allow_stub)
    return bad


def rules(bad):
    return sorted({int(m.group(1)) for m in (re.match(r'\[(\d+)\]', b) for b in bad) if m})


def bites(name, r, edit, rule, msg, **kw):
    """the check fails a planted edit on its own rule, with its own words (msg, a piece of the failure's sentence):
    each sub-condition of a rule is held on its own, never by another of the same rule tripping beside it"""
    bad = recheck(r, edit, **kw)
    hit = [b for b in bad if b.startswith(f'[{rule}] ') and msg in b]
    ok(hit, f'D: the check does not fail {name} on rule {rule} ("{msg}")', f'rules {rules(bad)}: {bad[:3]}')


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

    L0, l0p = init_ledger('2026-11-01T12:00:00Z')
    ok(L0['calls'] == {} and L0['runs'] == {} and L0['bar'] == TS.BAR and L0['decision'] is None
       and L0['summary'] == TS.summarize({}, None), 'A: init does not write the bar and nothing else')
    # init registers the bar once: never over a ledger that exists, never with an open question in BAR
    before = open(l0p, 'rb').read()
    try:
        with envset(TD_SHADOW_NOW='2026-11-01T13:00:00Z'), quiet():
            TS.init(Namespace(ledger=l0p))
        ok(False, 'A: init writes over a ledger that exists')
    except TS.Refused as e:
        ok('registered once' in str(e) and open(l0p, 'rb').read() == before,
           'A: init refuses a ledger that exists, but does not leave it as it was', e)
    fresh = os.path.join(TMP, 'init_open_question.json')
    try:
        with patched(TS, BAR=dict(TS.BAR, p=TS.BAR['p'] + ' [Q1]')), envset(TD_SHADOW_NOW='2026-11-01T13:00:00Z'), quiet():
            TS.init(Namespace(ledger=fresh))
        ok(False, "A: init registers a bar that still holds an open question ('[Q')")
    except TS.Refused as e:
        ok('open question' in str(e) and not os.path.exists(fresh), 'A: init refuses an open question, but writes a file', e)
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

    # page.json that cannot be used: read on another payload or at another clock, a kickoff not the schedule's, a list
    # not its players (either way), or a game the payload offers to call not read at all: DEGRADED, no call moves, and
    # the check passes what the run wrote (from R1's ledger, an hour on)
    def pg_kick(pg):
        pg['games'][G[4]]['kickoff'] = ISO(T(pg['games'][G[4]]['kickoff']) + timedelta(hours=1))
        return pg

    def pg_drop_player(pg):
        del pg['games'][G[4]]['players'][pid_of(4, 3)]
        return pg

    def pg_drop_listed(pg):
        pg['games'][G[4]]['td'].remove(pid_of(4, 3))
        return pg

    def pg_drop_game(pg):
        del pg['games'][G[4]]
        return pg
    for name, edit, words in (('read on another payload', lambda pg: dict(pg, payload_sha256='0' * 64), 'was read on another payload'),
                            ('baked at another time', lambda pg: dict(pg, baked_at='another bake'), 'was read on another payload'),
                            ('read a minute off the run\'s clock', lambda pg: dict(pg, now='2026-11-02T13:01:00Z'), 'page.json was read at'),
                            ('a kickoff an hour off the schedule\'s', pg_kick, f"the page's kickoff of {G[4]}"),
                            ('a listed player with no record', pg_drop_player, f"page.json's list of {G[4]} is not its players"),
                            ('a recorded player not listed', pg_drop_listed, f"page.json's list of {G[4]} is not its players"),
                            ('a game to call not read', pg_drop_game, 'the page did not read 1 game(s)')):
        rx = step(w, r1.L, '2026-11-02T13:00:00Z', page_edit=edit)
        clean(rx, f'A: page.json {name}')
        ok(any(x.startswith('DEGRADED') and words in x for x in rx.probs) and rx.L['calls'] == r1.L['calls']
           and rx.ev['phases']['calls'] == 'skipped',
           f'A: a page.json {name} is not DEGRADED with no call moved', rx.probs[:3])

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

    # R11 (G8's kickoff + 145 h): G4 graded; the pending G3 call graded; G3's rows changed after: no grade rewritten.
    # G4 moved 3 hours later on the schedule after its calls froze: within the 24 hours, so graded from its rows
    w.sched[G[4]].update(t='23:15')
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
    ok(all(r11.L['calls'][key_of(4, i)]['grade']['how'] in ('played', 'did not play') for i in range(6))
       and TS.ko(w.sched[G[4]]) - T(r11.L['calls'][key_of(4, 0)]['kickoff']) == timedelta(hours=3),
       'B: a game moved 3 hours after its calls froze is not graded from its played rows (void, game moved, is past 24 h)')
    ok(any('still ungraded more than 144 h' in x for x in r11.probs), 'B: a grade overdue at 144 h is not said')

    # R11b (G8's kickoff + 14 days less an hour): still pending, never void before 14 days; G9, moved 25 hours later
    # on the schedule after its last call (R11), void as a moved game
    w.sched[G[9]].update(d='2026-11-16', t='14:00')
    r11b = step(w, r11.L, '2026-11-22T20:25:00Z', data=True)
    clean(r11b, 'R11b')
    ok(all(r11b.L['calls'][key_of(8, i)]['grade'] is None for i in range(6)),
       'B: a game whose files are not in is void before 14 days')
    ok(all(r11b.L['calls'][key_of(9, i)]['grade']['how'] == 'game moved' for i in range(6))
       and TS.ko(w.sched[G[9]]) - T(r11b.L['calls'][key_of(9, 0)]['kickoff']) == timedelta(hours=25),
       'B: a game moved 25 hours after its last call is not void, game moved')
    # the line itself (BAR's void_also: "more than 24 hours from the call's kickoff"), and a game off the schedule
    sm = {'X': {'id': 'X', 'd': '2026-11-08', 't': '13:00'}}                    # 18:00 UTC
    for k, want in (('2026-11-08T18:00:00Z', False), ('2026-11-08T15:00:00Z', False), ('2026-11-07T18:00:00Z', False),
                    ('2026-11-09T18:00:00Z', False), ('2026-11-07T17:59:59Z', True), ('2026-11-09T18:00:01Z', True)):
        ok(TS.moved({'game_id': 'X', 'kickoff': k}, sm) is want, f'B: a call kicking off at {k} reads moved {not want}')
    ok(TS.moved({'game_id': 'Y', 'kickoff': '2026-11-08T18:00:00Z'}, sm), 'B: a game off the schedule is not moved')
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
    return SimpleNamespace(w=w, r1=r1, r2=r2, r3a=r3a, r3b=r3b, r4=r4, r7=r7, r8=r8, r9=r9, r10=r10, r11=r11, r11b=r11b,
                           r12=r12, L0=L0)


# ======================================================================================= D: the check bites
def section_d(ab):
    say('D: the check bites (a planted edit for every sub-condition, each held by its own words)')
    r1, r2, r3b, r4, r9, r10, r11, r12 = ab.r1, ab.r2, ab.r3b, ab.r4, ab.r9, ab.r10, ab.r11, ab.r12

    def first(L, pred):
        return next(k for k, cc in sorted(L['calls'].items()) if pred(cc))

    def call(k, **kv):
        """an edit setting fields of one call"""
        return lambda L: L['calls'][k].update(**kv)

    def grade(k, **kv):
        """an edit setting fields of one call's grade"""
        return lambda L: L['calls'][k]['grade'].update(**kv)

    def evg(k, **kv):
        """an evidence.json edit beside a grade edit: the run's own record of the grade moved with it"""
        def f(ev):
            ev['grades'][k]['evidence'].update(**kv)
            return ev
        return f
    G3 = {i: key_of(3, i) for i in range(8)}
    D = []                                      # (name, run, edit, rule, words, options)

    def b(name, r, edit, rule, msg, **kw):
        D.append((name, r, edit, rule, msg, kw))

    # 1. canonical bytes
    b('a ledger that is not its canonical dump', r10, lambda L: TS.dumps(L).replace('"calls": {\n', '"calls": {\n\n', 1), 1,
      'is not its own canonical dump')
    b("a ledger without the shadow's head", r10, lambda L: json.dumps({k: v for k, v in L.items() if k != 'what'}), 1,
      "is not the shadow's")
    # 2. the bar, its registration, the model block
    b('the bar moved', r10, lambda L: L['bar'].update(w=0.3), 2, 'the bar is not BAR')
    b("the bar not the last commit's", r10, lambda L: L['bar'].update(w=0.3), 2, "bar is not the last commit's")
    b('bar_registered moved', r10, lambda L: L.update(bar_registered='2026-11-01T12:00:01Z'), 2,
      "bar_registered is not the last commit's")
    qsha = lambda L: L['model']['td']['QB'].update(sha256='0' * 64)          # noqa: E731
    b("the model block not the last commit's", r10, qsha, 2, "model is not the last commit's")
    b("the model block not the manifest's (and moved in the last commit too)", r10, qsha, 2,
      "the model block is not the manifest's", prev=lambda p: (qsha(p), p)[1])
    late = lambda L: L.update(bar_registered=r1.L['run_at'])                 # noqa: E731
    b('a call made at the registration time', r10, late, 2, 'at or before the bar was registered', prev=lambda p: (late(p), p)[1])
    # 4. the runs, and a ledger changed with no run
    b('a referenced run gone', r2, lambda L: L['runs'].pop(r1.L['run_at']), 4, 'has no runs entry')
    b("a runs entry the last commit had changed", r2, lambda L: L['runs'][r1.L['run_at']].update(seconds=999.0), 4,
      "is not the last commit's")
    b('a new runs entry not this run\'s', r2, lambda L: L['runs'].update({'2026-11-02T18:00:00Z': {'counts': {}}}), 4,
      "is new and not this run's")
    b('a stub run without TD_SHADOW_STUB', r10, None, 4, 'stood the model in with TD_SHADOW_STUB', allow_stub=False)
    b("a run_at before the last commit's", r2, lambda L: L.update(run_at='2026-11-01T13:00:00Z'), 4,
      "run_at is earlier than the last commit's")
    b('calls with no run', r1, lambda L: L.update(run_at=None), 4, 'calls or a decision with no run')

    def flip_old(L):
        L['calls'][G3[2]]['grade'].update(result='td', y=1)
    b("an old grade flipped at the last commit's own run_at", r11, flip_old, 4, "but its run_at is the last commit's",
      prev=r11.L)
    reg = SimpleNamespace(text=TS.dumps(ab.L0), prev=ab.L0, pay=r1.pay, sha=r1.sha, page=None, ev=None, data=None)
    b('the registration edited (no run yet)', reg, lambda L: L.update(what='edited'), 4, "but its run_at is the last commit's")
    # 5. keys and fields
    b('a call with a field too many', r10, lambda L: L['calls'][first(L, lambda cc: cc['frozen'])].update(extra=1), 5,
      "does not carry exactly the call's fields")
    b('a key not its fields', r10, lambda L: L['calls'].update({'2026|09|2026_09_ZZZ_YYY|00-0000001':
                                                               L['calls'].pop(first(L, lambda cc: cc['frozen']))}), 5,
      'is not 2026|WW|game id|player id')

    def rekey(week, pred):
        def f(L):
            k = first(L, pred)
            c = L['calls'].pop(k)
            c['week'] = week
            L['calls'][TS.call_key(week, c['game_id'], c['pid'])] = c
        return f
    b('a game id not naming its week', r10, rekey(10, lambda cc: cc['frozen'] and cc['week'] == 9), 5,
      'the game id does not name its week')
    b("an unfrozen call's week not its game's on the schedule", r1, rekey(10, lambda cc: cc['game_id'] == G[4]), 5,
      "the week is not its game's on the schedule")
    b('a branch out of range', r10, lambda L: L['calls'][first(L, lambda cc: cc['frozen'])].update(branch='guess'), 5,
      "branch 'guess' is out of range")
    b('p_why out of range', r10, lambda L: L['calls'][first(L, lambda cc: cc['frozen'])].update(p_why='guess'), 5,
      "p_why 'guess' is out of range")
    b('a flag not true or false', r10, lambda L: L['calls'][first(L, lambda cc: cc['frozen'])].update(m_est='yes'), 5,
      'is not true or false')
    # 6. timing and values
    b('a kickoff that does not read', r11, call(G3[0], kickoff='not a time'), 6, 'a time does not read')

    def five_before(L):
        k = first(L, lambda cc: not cc['frozen'])
        L['calls'][k]['called_at'] = ISO(T(L['calls'][k]['kickoff']) - timedelta(minutes=5))
    b('a call 5 minutes before kickoff', r10, five_before, 6, 'minutes or less before its kickoff')

    def read_after_call(L):
        c = L['calls'][key_of(9, 0)]
        c['read_at'] = ISO(T(c['called_at']) + timedelta(seconds=1))
    b('a read after the call (before kickoff)', r10, read_after_call, 6, 'read at or after kickoff, or after the call')

    def read_at_kick(L):
        c = L['calls'][key_of(9, 1)]
        c['read_at'], c['called_at'] = c['kickoff'], ISO(T(c['kickoff']) + timedelta(hours=1))
    b('a read at kickoff (before the call)', r10, read_at_kick, 6, 'read at or after kickoff, or after the call')
    b('no p and no reason', r10, call(key_of(9, 0), p=None, lam=None, p_why=None), 6, 'no p and no reason')
    b('p out of range', r10, lambda L: L['calls'][first(L, lambda cc: cc['p'] is not None)].update(p=1.2), 6,
      'is out of range or carries a reason')
    b('frozen with no frozen_at', r10, call(key_of(9, 0), frozen=True), 6, 'frozen and frozen_at disagree')

    def froze_early(L):
        c = L['calls'][G3[2]]
        c['frozen_at'] = ISO(T(c['called_at']) - timedelta(hours=1))
    b('frozen before it was made', r11, froze_early, 6, 'froze before it was made, or before kickoff')
    b('a grade on an unfrozen call', r11, call(G3[2], frozen=False, frozen_at=None), 6, 'a grade on an unfrozen call')
    # 7. a new or rewritten call against page.json and evidence.json
    k4 = key_of(4, 0)
    b('a new call not by this run', r1, call(k4, called_at='2026-11-01T18:00:00Z'), 7, 'is new or rewritten but not by this run')
    b('a new call frozen', r1, call(k4, frozen=True, frozen_at=r1.L['run_at']), 7, 'is new or rewritten and frozen')
    b('new calls with no page.json', r1, None, 7, 'is new or rewritten with no usable page.json', page=None)

    def pg_no_player(pg):
        pg['games'][G[4]]['td'].remove(pid_of(4, 3))
        del pg['games'][G[4]]['players'][pid_of(4, 3)]
        return pg
    b('a new call whose player page.json does not list', r1, None, 7, 'its game or player is not in page.json', page=pg_no_player)

    def e7m(L):
        cc = L['calls'][k4]
        cc['price'] += 40
        cc['m'] = m_of(cc['price'], cc['ov'])
    b("a new call's price and m not page.json's", r1, e7m, 7, "is not page.json's")
    b("a new call's read time not page.json's", r1, call(k4, read_at='2026-11-02T10:00:00Z'), 7,
      "its read time, kickoff or week is not page.json's")

    def ev_no_p(ev):
        del ev['p'][f'{G[4]}|{pid_of(4, 0)}']
        return ev
    b('a new call evidence.json has no p for', r1, None, 7, 'evidence.json has no p for it', ev=ev_no_p)
    b("a new call's p not evidence.json's", r1, call(k4, p=0.5), 7, "is not evidence.json's")
    b("a new call's group not the model's", r1, call(k4, grp='K'), 7, "grp 'K' is not the model's")

    def ev_cov(v=KEEP):
        def f(ev):
            cov = ev['weeks']['9']['coverage']
            if v is KEEP:
                del cov[G[4]]
            else:
                cov[G[4]] = v
            return ev
        return f
    b('no coverage verdict for a new call\'s game', r1, None, 7, 'records no coverage verdict for its game', ev=ev_cov())
    b('a new call with p on a game not covered', r1, None, 7, 'its game is not covered', ev=ev_cov('history not complete: x'))
    b('a new call on a covered game saying it is not', r1, call(k4, p=None, lam=None, p_why='history not complete: x'), 7,
      'its game is covered but the call says it is not')
    # 8. the lists called, on a run that made calls
    b('calls made with no page.json', r1, None, 8, 'calls were made with no usable page.json', page=None)

    def ev_not_called(ev):
        ev['called'].remove(G[4])
        return ev
    b('a game to call not called', r1, None, 8, 'was to be called and was not', ev=ev_not_called)

    def ev_called_late(ev):
        ev['called'].append(G[1])
        return ev
    b('a game called 10 minutes before kickoff', r3b, None, 8, 'was called within 10 minutes of kickoff or off the page',
      ev=ev_called_late)
    b('a listed player with no call', r1, lambda L: L['calls'].pop(key_of(4, 3)), 8, 'listed player(s) with no call')
    b('a delisted call kept', r2, lambda L: L['calls'].update({key_of(1, 4): json.loads(json.dumps(r1.L['calls'][key_of(1, 4)]))}),
      8, 'unfrozen call(s) of players no longer listed kept')

    def pg_no_game(pg):
        del pg['games'][G[4]]
        return pg
    b('calls made with a game to call missing from page.json', r1, None, 8, 'is not in page.json, yet calls were made',
      page=pg_no_game)
    # 9. m against its price
    b('m with no price', r10, lambda L: L['calls'][first(L, lambda cc: cc['m'] is not None)].update(price=None), 9,
      'm with no price, source or overround')
    b('m off its price', r10, lambda L: L['calls'][first(L, lambda cc: cc['m'] is not None)].update(
        m=L['calls'][first(L, lambda cc: cc['m'] is not None)]['m'] + 1e-4), 9, 'is not clip(implied(')

    def e9ov(L):
        cc = L['calls'][k4]
        cc['ov'] = 1.05
        cc['m'] = m_of(cc['price'], 1.05)
    b("a new call's overround not the week's", r1, e9ov, 9, "is not the week's overround")
    # 10. nothing frozen moved; the drops
    b('a frozen call gone', r10, lambda L: L['calls'].pop(first(L, lambda cc: cc['frozen'])), 10,
      'was frozen (or its game kicked off) and is gone')
    k1 = key_of(1, 0)
    b('a call whose game kicked off left unfrozen', r4, call(k1, frozen=False, frozen_at=None), 10, 'and is not frozen')
    b('a frozen call unfrozen', r10, call(key_of(4, 0), frozen=False, frozen_at=None), 10, 'and is not frozen')
    b('a frozen call moved', r10, lambda L: L['calls'][first(L, lambda cc: cc['frozen'] and cc['p'] is not None)].update(p=0.4321),
      10, 'a frozen call changed')
    b("a frozen call's frozen_at moved", r10, call(key_of(4, 0), frozen_at=r9.L['run_at']), 10, 'frozen_at moved')
    b('a call frozen at another time than this run', r4, call(k1, frozen_at=r3b.L['run_at']), 10,
      'froze at another time than this run')
    b('a call dropped with no reason', r2, lambda L: L['calls'].pop(key_of(8, 0)), 10, 'was dropped with no reason the run has')
    b('a new call frozen (rule 10)', r1, call(k4, frozen=True, frozen_at=r1.L['run_at']), 10, 'is new and frozen')
    b('an unfrozen call of a game off the schedule kept', r2,
      lambda L: L['calls'].update({key_of(6, 0): json.loads(json.dumps(r1.L['calls'][key_of(6, 0)]))}), 10,
      'should have been dropped')
    # 11. old grades
    b('an old grade changed', r11, grade(G3[2], result='td', y=1), 11, 'its grade changed or went')
    # 12. new grades
    b('a grade with a field too many', r10, grade(G3[2], extra=1), 12, 'the grade does not carry exactly its fields')
    b('a new grade not by this run', r10, grade(G3[2], graded_at=r10.prev['run_at']), 12, 'a new grade not by this run')
    b('a grade before kickoff + 96 h', r10, call(key_of(4, 0), grade={'result': 'void', 'y': None, 'how': 'did not play',
                                                                        'evidence': None, 'site': None, 'graded_at': r10.L['run_at']}),
      12, 'graded before kickoff + 96 h')
    b("a grade not evidence.json's", r10, lambda L: L['calls'][G3[2]]['grade']['evidence'].update(role_played=0), 12,
      "the grade is not evidence.json's")
    b("a site reading not page.json's", r10, grade(G3[2], site={'result': 'td', 'how': {}}), 12,
      "the site reading is not page.json's")
    b('a result, y and how that do not go together', r10, grade(G3[2], y=1), 12, 'do not go together')
    b('a played grade with no evidence', r10, grade(G3[2], evidence=None), 12,
      'the evidence is there where it should not be, or missing')
    b('void as a moved game that did not move', r10, grade(G3[2], result='void', y=None, how='game moved', evidence=None), 12,
      'void as a moved game, but the game kicks off within 24 h')
    b('void for files never complete on a covered game', r10,
      grade(G3[2], result='void', y=None, how='files never complete', evidence=None), 12, 'void for files never complete, but')
    b('a moved game graded from its rows', r9, grade(key_of(2, 0), result='no_td', y=0, how='played',
                                                        evidence={'stat_row': 1, 'snap_row': 1}), 12,
      'its game moved, so it is void as a moved game')

    def ev_own(ev):
        ev['own_coverage'][G[3]] = False
        return ev
    b('a grade on files evidence.json does not record as covered', r10, None, 12,
      'graded on files evidence.json does not record as covered', ev=ev_own)
    b('grades with no raw stats to hold them to', r10, None, 12, 'graded with no raw 2026 stats', data=None)
    b('a td the raw row does not count', r10, lambda L: L['calls'][G3[0]]['grade']['evidence'].update(y_rush_rec_tds=2), 12,
      'td, but the raw stat row says', ev=evg(G3[0], y_rush_rec_tds=2))
    b('a no_td the raw row counts', r10, lambda L: L['calls'][G3[2]]['grade']['evidence'].update(y_rush_rec_tds=1), 12,
      'no_td, but the raw stat row says', ev=evg(G3[2], y_rush_rec_tds=1))
    b('a no_td with no raw row and no snap row', r10, lambda L: L['calls'][G3[4]]['grade']['evidence'].update(snap_row=0), 12,
      'no_td with no raw stat row and no snap row', ev=evg(G3[4], snap_row=0))
    # 13. overdue
    b('a moved game left ungraded', r9, call(key_of(2, 0), grade=None), 13, 'its game moved and it is ungraded')
    b('a due call left ungraded', r10, call(G3[2], grade=None), 13, "due, its game's files covered, and ungraded")
    b('a call of files never complete left ungraded at 14 days', r12, call(key_of(8, 0), grade=None), 13,
      'its files not complete at 14 days and it is not void')
    # 14 (the rest on section C's runs)
    b('a decision before 2,000', r10, lambda L: L.update(decision={
        'verdict': 'PASS', 'decided_at': L['run_at'], 'n': 2000, 'games': 1, 'T1': {}, 'T2': {},
        'criteria': {'T1': True, 'T2': True}, 'sample': []}), 14, 'a decision with')
    # 15
    b('the summary edited', r10, lambda L: L['summary'].update(in_sample=L['summary']['in_sample'] + 1), 15,
      'the summary is not summarize()', resum=False)
    # 3: the files the check hashes where it runs (a copy of the tree), and the one-shot's result
    for name, r, edit, rule, msg, kw in D:
        bites(name, r, edit, rule, msg, **kw)
    tree = make_tree('d3')
    with open(os.path.join(tree, TS.REL, 'fetch.py'), 'a') as f:
        f.write('\n# altered\n')
    with patched(TS, REPO=tree):
        bites('a registered file altered', r10, None, 3, 'does not hash to BAR')
    tree = make_tree('d3r')
    res_p = os.path.join(tree, TS.REL, 'results', 'oneshot_2026.json')
    res = jload(res_p)
    res['verdict']['anytime_td'] = 'FAIL'
    dump(res_p, res)
    with patched(TS, REPO=tree, RESULT=res_p):
        bites('the one-shot\'s result not a touchdown PASS', r10, None, 3, 'did not pass the anytime touchdown')
    with patched(TS, RESULT=os.path.join(TMP, 'no_such_result.json')):
        bites('the one-shot\'s result missing', r10, None, 3, 'results/oneshot_2026.json does not read')
    with patched(TS, MANIFEST=os.path.join(TMP, 'no_such_manifest.json')):
        bites('the manifest missing', r10, None, 2, 'the manifest does not read')
    say(f'   {len(D) + 4} bites')

    # main(): a ledger the check cannot read is a failure, never a pass; no last commit is a failure, never a first
    # check; the stub's runs are allowed off GitHub Actions alone
    pay = dump(os.path.join(TMP, 'D_pay.json'), r10.pay)
    led = os.path.join(TMP, 'D_crash.json')
    Lx = json.loads(r10.text)
    Lx['calls'] = {'2026|09|x|y': 5}
    with open(led, 'w') as f:
        f.write(TS.dumps(Lx))
    prevf = os.path.join(TMP, 'D_prev.json')
    with open(prevf, 'w') as f:
        f.write(TS.dumps(r10.prev))
    rc, o = py(os.path.join(HERE, 'td_shadow_check.py'), '--ledger', led, '--payload', pay, '--prev', prevf)
    ok(rc == 1 and 'td shadow check: 1 failures' in o.splitlines() and 'could not read the ledger' in o,
       'D: a ledger that crashes the check is not one failure (main\'s catch)', o[-300:])
    tree = make_tree('d_nogit')
    good = os.path.join(TMP, 'D_good.json')
    with open(good, 'w') as f:
        f.write(r10.text)
    rc, o = py(os.path.join(tree, TS.REL, 'td_shadow_check.py'), '--ledger', good, '--payload', pay)
    ok(rc == 1 and 'the last commit has no ledger' in o, 'D: the check with no last commit to read is not refused', o[-300:])
    rc, o = py(os.path.join(HERE, 'td_shadow_check.py'), '--ledger', good, '--payload', pay, '--prev', prevf,
               TD_SHADOW_STUB='x', GITHUB_ACTIONS='true')
    ok(rc == 1 and '[4]' in o and 'TD_SHADOW_STUB' in o, 'D: the check passes a stub\'s run on GitHub Actions', o[-300:])

    # the registration a pull request may add (the props gate's ledger_hold runs --registration on it): init's own
    # output, and nothing else, each way it can differ said in its own words
    regt = TS.dumps(ab.L0)
    ok(TSC.registration_bad(regt) == [], 'D: init\'s registration is not one', TSC.registration_bad(regt))

    def reg_edit(f):
        L = json.loads(regt)
        f(L)
        return TS.dumps(L)
    for name, text, words in (
            ('not JSON', regt[:-3], 'does not read as JSON'),
            ('not canonical', regt.replace('\n "run_at"', '\n  "run_at"', 1), 'not its own canonical dump'),
            ("not the shadow's head", json.dumps({k: v for k, v in ab.L0.items() if k != 'what'}), "not the shadow's ledger"),
            ('its what edited', reg_edit(lambda L: L.update(what='edited')), "its what is not the shadow's own"),
            ('its bar moved', reg_edit(lambda L: L['bar'].update(w=0.3)), 'its bar is not BAR'),
            ('an open question', reg_edit(lambda L: L['bar'].update(p=L['bar']['p'] + ' [Q1]')), "holds an open question"),
            ('its model block moved', reg_edit(lambda L: L['model']['td']['QB'].update(sha256='0' * 64)),
             "its model block is not the manifest's"),
            ('a registration time that is no time', reg_edit(lambda L: L.update(bar_registered='soon')), 'its bar_registered is not a time'),
            ('a registration time not as the ledger writes one', reg_edit(lambda L: L.update(bar_registered='2026-10-31T04:48:56+00:00')),
             'its bar_registered is not a time as the ledger writes one'),
            ('a run_at', reg_edit(lambda L: L.update(run_at='2026-11-01T12:00:00Z')), 'its run_at is not null'),
            ('a decision', reg_edit(lambda L: L.update(decision={'verdict': 'PASS'})), 'its decision is not null'),
            ('a run', reg_edit(lambda L: L['runs'].update({'2026-11-01T12:00:00Z': {}})), 'its runs is not {}'),
            ('a call', reg_edit(lambda L: L['calls'].update({'k': {}})), 'its calls is not {}'),
            ('its summary edited', reg_edit(lambda L: L['summary'].update(calls=1)), "its summary is not the empty ledger's")):
        got = TSC.registration_bad(text)
        ok(any(words in x for x in got), f'D: a registration with {name} is taken by --registration', got)


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
        # after a FAIL: a call new on that run, or one left unfrozen, each said apart (rule 14)
        later = dict(loose, pid='00-0077003', called_at=r.L['run_at'], read_at='2026-11-13T11:00:00.000Z')
        add = lambda L: L['calls'].update({TS.call_key(10, gc_id, '00-0077003'): dict(later)})   # noqa: E731
        bites('a call made after a FAIL', r, add, 14, 'is new or rewritten after a FAIL')
        bites('an unfrozen call kept after a FAIL', r, add, 14, 'is unfrozen after a FAIL')
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
        bites('a decision missing at 2,000', r, lambda L: L.update(decision=None), 14, 'in the sample and no decision')
        bites('the decision not the check\'s own', r, lambda L: L['decision'].update(verdict='FAIL'), 14,
              "the decision is not the check's own recomputation")
        bites('a new decision not by this run', r, lambda L: L['decision'].update(decided_at=r.prev['run_at']), 14,
              'a new decision not by this run')
        r2 = step(world(), r.L, '2026-11-15T12:00:00Z', data=True)
        clean(r2, 'C run after the decision')
        ok(r2.L['decision'] == D, 'C: a run after the decision decides again')
        bites('the decision moved after it was written', r2, lambda L: L['decision'].update(verdict='FAIL'), 14,
              "the decision is not the last commit's")
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
    E4 = R.get('E4') or {}
    ok((E4.get('before') or {}).get('written') and (E4.get('after') or {}).get('written')
       and E4['before'].get('with_m') == E4['after'].get('with_m') == page['counts']['with_m'],
       'E: the reader does not write the pinned payload before and after the planted refusals (a plant left on?)',
       (E4.get('before'), E4.get('after')))
    for x in E4.get('plants', []):
        ok(x['refused'] and x['matched'], f"E: the reader does not refuse {x['name']} in its own words", x.get('msg'))
    ok(len(E4.get('plants', [])) == 16, 'E: the reader\'s sixteen planted refusals did not all run', len(E4.get('plants', [])))
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
             '2026_07_AAA_BBB,2026,REG,7,2026-10-25,13:00,AAA,20,BBB,13\n'    # AAA and BBB play weeks 7 and 8
             '2026_07_EEE_FFF,2026,REG,7,2026-10-25,13:00,EEE,9,FFF,12\n'     # EEE and FFF: week 8 a bye
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
            # each club's LAST previous game decides (BAR's p: "either club's previous 2026 game"), never its first:
            # AAA and BBB played weeks 7 and 8, EEE and FFF week 7 and then a bye. A hole in week 8's game holds week
            # 9's AAA at BBB; one in week 7's alone holds nothing (an older hole, said) but EEE at FFF, whose last it is
            nine = ['2026_09_AAA_BBB', '2026_09_EEE_FFF']
            for holes, want, older in (
                    (['2026_08_AAA_BBB: snap counts of AAA'], {nine[0]: 'history not complete: 2026_08_AAA_BBB: snap counts of AAA',
                                                               nine[1]: None}, []),
                    (['2026_07_AAA_BBB: play-by-play'], {nine[0]: None, nine[1]: None}, ['2026_07_AAA_BBB: play-by-play']),
                    (['2026_07_EEE_FFF: snap counts of EEE'], {nine[0]: None,
                                                               nine[1]: 'history not complete: 2026_07_EEE_FFF: snap counts of EEE'}, [])):
                miss[:] = holes
                with TS.lifted(OS):                     # games_to2026.csv is read by the holdout, as predict reads it
                    got, _, old = TS.game_coverage(OS, h.data, 2026, 9, nine)
                ok(got == want and old == older, f'H: per-game coverage with {holes} is not each club\'s last game\'s',
                   (got, old))
                with quiet():
                    out = h.model.predict({9: [(nine[0], A), (nine[1], Cp)]})
                ok(out['weeks'][9]['older'] == older and out['weeks'][9]['coverage'] == want,
                   f'H: RealModel.predict does not carry the coverage and the older holes of {holes}')
            miss[:] = ['2026_08_CCC_DDD: snap counts of CCC']
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

    # the older holes are said (a WARN), and the run goes on
    class Older(TS.StubModel):
        def predict(self, weeks_keys):
            o = super().predict(weeks_keys)
            for wk in o['weeks'].values():
                wk['older'] = ['2026_07_AAA_BBB: play-by-play']
            return o
    r3 = step(w, r2.L, '2026-11-02T14:00:00Z', model=Older(w.stub()))
    ok(not r3.bad and any(x.startswith('WARN: the history has older holes (1: 2026_07_AAA_BBB: play-by-play)') for x in r3.probs)
       and not any(x.startswith('DEGRADED') for x in r3.probs), 'H: an older hole in the history is not a WARN', r3.probs[:3])


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
    # the bar as registered: BAR's own hash and the committed ledger's registration (pinned at this file's top), the
    # ledger the shadow's (canonical, its bar BAR, the manifest's touchdown files, no open question)
    ok(hashlib.sha256(json.dumps(TS.BAR, sort_keys=True, ensure_ascii=False).encode()).hexdigest() == BAR_SHA256,
       'I: BAR is not the bar registered (its SHA-256 moved: BAR never changes; a PR that moves it edits BAR_SHA256 too)')
    try:
        Lc, tc = TS.read_ledger(TS.LEDGER)
        ok(Lc['bar_registered'] == BAR_REGISTERED and Lc['model'] == TS.model_block(TS.manifest()) and '[Q' not in tc,
           'I: the committed ledger is not the bar registered at ' + BAR_REGISTERED + ' with the manifest\'s touchdown files',
           (Lc.get('bar_registered'), '[Q' in tc))
    except TS.Refused as e:
        ok(False, 'I: the committed ledger does not read as the shadow\'s (canonical, its bar BAR)', e)

    # every refusal of the guard on its own, in this process: PREREGISTRATION.md, predict.py's manifest, PREREGISTRATION.md's
    # copy of BAR's hashes, the pinned libraries, Python 3.13 and the holdout as imported
    def refused(fn):
        try:
            fn()
            return None
        except TS.Refused as e:
            return str(e)

    def g0():
        return TS.guard_code(OS, need_313=False, versions=False)
    altered = os.path.join(TMP, 'PREREGISTRATION_altered.md')
    shutil.copy2(TS.PREREG, altered)
    with open(altered, 'a') as f:
        f.write('\n')
    with patched(TS, PREREG=altered):
        e = refused(g0)
    ok(e and "not the registered bytes: ['PREREGISTRATION.md']" in e, 'I: the guard takes a PREREGISTRATION.md not BAR\'s', e)
    with patched(OS.PR, MANIFEST=os.path.join(TMP, 'MANIFEST.json')):
        e = refused(g0)
    ok(e and 'predict.py reads another manifest' in e, 'I: the guard takes a predict.py reading another manifest', e)
    reg0 = OS.registered
    with patched(OS, registered=lambda p: dict(reg0(p), **{f'{TS.REL}/fetch.py': '0' * 64})):
        e = refused(g0)
    ok(e and f'does not register {TS.REL}/fetch.py as BAR does' in e, 'I: the guard takes a PREREGISTRATION.md listing another hash', e)

    def no_pins():
        raise SystemExit('refused: not the pinned libraries (planted)')
    with patched(OS, check_versions=no_pins):
        e = refused(lambda: TS.guard_code(OS, need_313=False, versions=True))
    ok(e and 'not the pinned libraries (planted)' in e, 'I: the guard takes libraries that are not the pins', e)
    with patched(OS, check_versions=lambda: None):
        ok(refused(lambda: TS.guard_code(OS, need_313=False, versions=True)) is None, 'I: the guard refuses the pins')
    for vi, want in (((3, 12, 9, 'final', 0), True), ((3, 13, 0, 'final', 0), False)):
        with patched(sys, version_info=vi):
            e = refused(lambda: TS.guard_code(OS, need_313=True, versions=False))
        ok(bool(e and 'the model runs on 3.13' in e) is want, f'I: the guard on Python {vi[:2]} does not say {want and "3.13" or "nothing"}', e)
    try:
        OS.F.HOLDOUT_FROM = 2027
        e = refused(g0)
    finally:
        OS.F.HOLDOUT_FROM = 2026
    ok(e and 'the holdout is not 2026 as imported' in e, 'I: the guard takes a holdout already lifted', e)
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
    # the registered files, each altered alone in a copy of the tree: the run is refused naming that file alone
    for name in ('PREREGISTRATION.md', 'frozen/MANIFEST.json', 'requirements.txt'):
        tree_n = make_tree('guard_' + name.replace('/', '_'))
        with open(os.path.join(tree_n, TS.REL, name), 'a') as f:
            f.write('\n')
        rc, o, w = run(script=os.path.join(tree_n, TS.REL, 'td_shadow.py'), TD_SHADOW_STUB=stub)
        ok(rc == 1 and w is None and f"not the registered bytes: ['{name}']" in o, f'I: run with {name} altered is not refused', last(o))
    # a ledger whose bar is not BAR, or whose model block is not the manifest's: refused (each canonical)
    for name, edit, words in (('its bar moved', lambda L: L['bar'].update(w=0.3), "the ledger's bar is not BAR"),
                            ('its model block moved', lambda L: L['model']['td']['QB'].update(sha256='0' * 64),
                             "the ledger's model block is not the manifest's")):
        Lx = json.loads(ab.r1.text)
        edit(Lx)
        lx = os.path.join(TMP, 'I_' + name.replace(' ', '_') + '.json')
        with open(lx, 'w') as f:
            f.write(TS.dumps(Lx))
        rc, o, w = run(ledger=lx, TD_SHADOW_STUB=stub)
        ok(rc == 1 and w is None and words in o, f'I: a canonical ledger with {name} is not refused', last(o))
    # without the stub, the guard checks the pins and Python 3.13 before the ledger is read: off the registered venv it
    # refuses there (job C's Python 3.12 always), on it the next refusal is the missing ledger
    try:
        OS.check_versions()
        venv = sys.version_info[:2] == (3, 13)
    except SystemExit:
        venv = False
    rc, o, w = run('--hist', os.path.join(TMP, 'I_hist'), '--data', os.path.join(TMP, 'I_data2'),
                   ledger=os.path.join(TMP, 'I_no_ledger.json'))
    ok(rc == 1 and w is None and (('there is no ledger' in o) if venv else
                                  ('not the pinned libraries' in o or 'the model runs on 3.13' in o) and 'there is no ledger' not in o),
       'I: run without the stub does not check the pins and Python 3.13 first' + (' (here on the registered venv)' if venv else ''), last(o))
    tree = make_tree('guard')
    tpm = os.path.join(tree, TS.REL)
    with open(os.path.join(tpm, 'build_features.py'), 'a') as f:
        f.write('\n# altered\n')
    rc, o, w = run(script=os.path.join(tpm, 'td_shadow.py'), TD_SHADOW_STUB=stub)
    ok(rc == 1 and w is None and "not the registered bytes: ['build_features.py as loaded" in o,
       'I: run on an altered registered file is not refused', last(o))
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


# ===================================================================== K: props.yml's shadow step, as the runner runs it
def yml_block(name):
    """the `run: |` script of props.yml's step `name` as the runner is handed it (its block's indentation taken off)"""
    y = open(os.path.join(REPO, '.github', 'workflows', 'props.yml'), encoding='utf-8').read()
    i = y.index(f'      - name: "{name}"')
    j = y.index('        run: |\n', i)
    out = []
    for line in y[j + len('        run: |\n'):].split('\n'):
        if line.strip() and not line.startswith(' ' * 10):
            break
        out.append(line[10:])
    return '\n'.join(out).rstrip('\n') + '\n'


def section_k():
    """the shadow step's own script, taken from props.yml and run under `bash -e` as GitHub runs a step, in a copy of
    the shadow's folder that is a git repository of its own (its last commit the registration), on the pinned payload
    at a clock before its games, with stand-ins only where the runner's own tools are: setup-python's 3.13 (a venv of
    this Python, its pip doing nothing), the clock `date` gives, the model (TD_SHADOW_STUB) and, in one case, node. The
    page reader, the run and the check are the real ones. Clean: exit 0, the checked ledger moved over the committed
    one. A ledger the check refuses (made non-canonical after the run wrote it): exit 1, the committed ledger as it
    was. The reader failing: exit 2 (DEGRADED), the run's ledger checked and moved"""
    say("K: props.yml's shadow step, its script run under bash -e in a copy of the tree")
    if not PINNED_PATH or not os.path.isdir(os.path.join(REPO, 'props', 'build', 'node_modules', 'jsdom')):
        ok(False, 'K: no pinned payload or no props/build/node_modules (the page reader cannot run)')
        return
    NOW = '2026-10-30T21:00:00Z'
    script = yml_block('TD shadow: calls, freezes and grades (research only, never shown)')
    root = make_tree('K')
    pm = os.path.join(root, TS.REL)
    shutil.copy2(os.path.join(HERE, 'td_shadow_page.js'), os.path.join(pm, 'td_shadow_page.js'))
    os.symlink(os.path.join(REPO, 'props', 'build'), os.path.join(root, 'props', 'build'))
    os.symlink(os.path.join(REPO, 'index.html'), os.path.join(root, 'index.html'))
    os.makedirs(os.path.join(root, 'props', 'data'))
    shutil.copy2(PINNED_PATH, os.path.join(root, 'props', 'data', 'payload.json'))
    L = os.path.join(pm, 'shadow', 'td_ledger.json')
    with envset(TD_SHADOW_NOW='2026-10-30T20:50:00Z'), quiet():
        TS.init(Namespace(ledger=L))
    reg = open(L, encoding='utf-8').read()
    gk = ['git', '-C', root, '-c', 'user.name=t', '-c', 'user.email=t@t']
    for a in (['init', '-q'], ['add', os.path.relpath(L, root)], ['commit', '-q', '-m', 'the registration']):
        subprocess.run(gk + a, check=True, capture_output=True)
    sh_dir = os.path.join(TMP, 'K_bin')
    tpl = os.path.join(TMP, 'K_venv_tpl')
    nodefail = os.path.join(TMP, 'K_nodefail')
    for d in (sh_dir, tpl, nodefail):
        os.makedirs(d)
    real_date = shutil.which('date')

    def put(path, body):
        with open(path, 'w') as f:
            f.write(body)
        os.chmod(path, 0o755)
    # the venv's python: this Python (job C's has numpy and pandas, which the stub's run needs), and the hook that
    # spoils the ledger run wrote just before the check reads it
    put(os.path.join(tpl, 'python'), '#!/bin/sh\ncase "$*" in *td_shadow_check.py*) if [ -n "$TD_E2E_SPOIL" ]; then '
                                     f'printf " " >> "$TD_E2E_SPOIL"; fi ;; esac\nexec "{sys.executable}" "$@"\n')
    put(os.path.join(tpl, 'pip'), '#!/bin/sh\nexit 0\n')
    py313 = os.path.join(TMP, 'K_py313')
    put(py313, '#!/bin/sh\n[ "$1" = "-m" ] && [ "$2" = "venv" ] && [ -n "$3" ] || { echo "py313 stand-in asked: $*" >&2; exit 9; }\n'
               f'mkdir -p "$3/bin" && cp "{tpl}/python" "{tpl}/pip" "$3/bin/"\n')
    put(os.path.join(sh_dir, 'date'), f'#!/bin/sh\nif [ "$*" = "-u +%Y-%m-%dT%H:%M:%SZ" ]; then echo {NOW}; else exec "{real_date}" "$@"; fi\n')
    put(os.path.join(nodefail, 'node'), '#!/bin/sh\necho "node stand-in: failing" >&2\nexit 1\n')
    sf = os.path.join(TMP, 'K_step.sh')
    with open(sf, 'w') as f:
        f.write(script)
    stub = dump(os.path.join(TMP, 'K_stub.json'), {'p_rule': 'hash'})

    def case(name, spoil=False, node_fails=False):
        with open(L, 'w', encoding='utf-8', newline='\n') as f:
            f.write(reg)
        rt = os.path.join(TMP, 'K_rt_' + name)
        os.makedirs(rt)
        T_ = os.path.join(rt, 'tdshadow')
        path = sh_dir + os.pathsep + (nodefail + os.pathsep if node_fails else '') + os.environ.get('PATH', '')
        e = env(RUNNER_TEMP=rt, GITHUB_OUTPUT=os.path.join(rt, 'output'), PY313=py313, PATH=path, TD_SHADOW_STUB=stub,
                TD_SHADOW_NOW=NOW, TD_E2E_SPOIL=os.path.join(T_, 'td_ledger.json') if spoil else None)
        r = subprocess.run(['bash', '--noprofile', '--norc', '-e', sf], cwd=root, env=e, capture_output=True, text=True,
                           timeout=150)
        rd = lambda p: open(p, encoding='utf-8').read() if os.path.exists(p) else None    # noqa: E731
        return SimpleNamespace(rc=r.returncode, out=(r.stdout + r.stderr), ledger=rd(L), new=rd(os.path.join(T_, 'td_ledger.json')),
                               probs=rd(os.path.join(T_, 'problems.txt')) or '', page=rd(os.path.join(T_, 'page.json')))
    c = case('clean')
    listed = sum(len(Gm['td']) for Gm in json.loads(c.page)['games'].values()) if c.page else -1
    Lk = json.loads(c.ledger) if c.ledger else {}
    ok(c.rc == 0 and c.ledger == c.new and c.ledger != reg and len(Lk.get('calls') or {}) == listed > 0
       and 'td shadow check: 0 failures' in c.out and not re.search(r'^(REFUSED|DEGRADED)', c.probs, re.M),
       "K: props.yml's shadow step does not exit 0 with every listed player called and the checked ledger moved into place",
       f'rc {c.rc}, {len(Lk.get("calls") or {})} calls of {listed}: {c.out[-600:]}')
    s = case('spoiled', spoil=True)
    ok(s.rc == 1 and s.ledger == reg and 'REFUSED: the check failed: the ledger stays as committed' in s.probs
       and 'td shadow check: 1 failures' in s.out,
       "K: props.yml's shadow step moves a ledger the check refused, or does not end the step there", f'rc {s.rc}: {s.out[-600:]}')
    d = case('degraded', node_fails=True)
    Ld = json.loads(d.ledger) if d.ledger else {}
    ok(d.rc == 2 and d.ledger == d.new and Ld.get('calls') == {} and Ld.get('run_at') == NOW
       and 'DEGRADED: the page could not be read: no call this run' in d.probs and 'td shadow check: 0 failures' in d.out,
       "K: props.yml's shadow step with the page unread does not exit 2 (DEGRADED) with the checked ledger moved",
       f'rc {d.rc}: {d.out[-600:]}')


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
                     ('K', section_k), ('E, F', section_ef)):
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
