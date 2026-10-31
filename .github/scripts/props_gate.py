#!/usr/bin/env python3
"""The props gate (.github/workflows/props-gate.yml): the props job and the Bets and Stats page run on a
pull request's code before it is merged, against today's data and the shapes the job has published.

On 15 October 2026 two props runs were refused by audit checks a merged change had broken on the week's
data (#270, #271): the price pull bought the prices, the audit refused them, and nothing was seen until
someone looked hours later. Every PR was merged seconds after it opened, and nothing ran a PR's code
before a scheduled run did. This runs it, and spends nothing: since 20 October 2026 weekly.py buys no prices at
all (it still gets --no-odds, which a base from before needs and this one ignores), and no secret is mapped.

  classify   which parts a change touches: AUDIT (what the props job runs: props/build, the props/data
             scripts and the model files weekly.py reads (not the job's own outputs), the research files
             it runs, the touchdown shadow props.yml runs after its publish (its code and the registered files of
             PREREGISTRATION.md section 3, never its ledger), lib/, props.yml, this gate) and PAGE (what the Bets and Stats page is built from and
             its smoke runs on: nflbets/, the page itself at the site's root (index.html, built from
             nflbets/build/ since 17 October 2026) and the old addresses' redirects to it, the betting app,
             betting/neutral_sites.json and the build's parts of betting/tools, the props parts,
             liveparlays/build/). Neither: nothing the props job or the page runs changed, and the
             gate passes at once. On a push to main or a dispatch, everything runs.
  bake       job A: `weekly.py --no-odds` on this code (today's nflverse files, today's read of DraftKings' lines
             on ESPN, which espn_read.js records in props/raw/espn/, the audit with PROPS_AUDIT_RAW as weekly.py
             sets it), judged on its exit code; then the page smoke on the payload it baked (SMOKE_PAYLOAD) and
             elo/check_tab.js (the ELO tab and the Elo picks on that payload's schedule, which the Elo job runs
             every morning and which blocks its publish), each judged on its "0 failures" line.
  phase      job B, one case of props/build/test_audit_phases.py: the audit or the page smoke replayed on
             a payload from git history at its own moment.
  units      job C: the props job's own tests and the page's (UNITS: the ESPN read and its application, the
             runs against the locks, the ids, the names, who played, the downloads, the audit's verdict, the
             archive of DraftKings' lines on ESPN, the admin link, the parlay card with Pull from DraftKings, and
             the touchdown shadow), on fixtures of their own: seconds each,
             but for the page's two smokes (smoke_admin.js about a minute, smoke_live.js about four) and the
             touchdown shadow's test (about 20 seconds).

Each is differential. A failure is run again on the base's code (a second checkout, `git worktree`):
failing here and passing there fails the gate, since it is the change's; failing on both is reported
(::warning::) and passes, since it is main's or the data's and must not hold back every unrelated PR. A
refusal at a download is named as infrastructure, to re-run. The base's weekly.py reads the same nflverse
files this run downloaded (--offline over a copy of them), so the two runs see the same data, unless this
run refused at a download or read a file as not posted yet (a 404, which leaves no copy: --offline would
read it as missing and refuse at the download, where this run went on); then the base downloads its own.
A base that refused at a download where this run did not has nothing to compare with, and the change fails.
ESPN's answers are the same on both sides either way: the copy carries this run's recordings (props/raw/espn/ is
ignored, so copied with the downloads) for the base's --offline to replay, and a base sent online is handed them
(PROPS_ESPN_REPLAY), so a line DraftKings moved between the two runs never reads as the change's.

    python3 .github/scripts/props_gate.py classify --event pull_request     (in the workflow)
    python3 .github/scripts/props_gate.py dry-run 30   which of the last 30 PRs on main would run which job
    python3 .github/scripts/props_gate.py files a.js b.py ...                which parts these paths touch
    python3 .github/scripts/props_gate.py units --base <sha>                 job C, here (each failure on the base too)
"""
import argparse, ast, fnmatch, json, os, re, shutil, subprocess, sys, tempfile, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
GATE = ['.github/workflows/props-gate.yml', '.github/scripts/props_gate.py', '.github/scripts/test_props_gate.py',
        'props/build/test_audit_phases.py']
# The anytime-touchdown shadow (props/research/propmodel/README.md, "The touchdown shadow"), which props.yml runs after
# its publish: its own code and test, and the registered files of PREREGISTRATION.md section 3 (the ones it runs, and
# the rest too: test_td_shadow.py holds every one to its registered hash, so a PR editing any of them fails job C). By
# name, so neither its ledger (shadow/td_ledger.json, the job's own output) nor results/td_shadow_equiv.json is code
TD_SHADOW = ['props/research/propmodel/td_shadow*', 'props/research/propmodel/test_td_shadow.py',
             'props/research/propmodel/fetch.py', 'props/research/propmodel/build_features.py',
             'props/research/propmodel/predict.py', 'props/research/propmodel/oneshot_2026.py',
             'props/research/propmodel/freeze.py', 'props/research/propmodel/model_*.py',
             'props/research/propmodel/requirements.txt', 'props/research/propmodel/PREREGISTRATION.md',
             'props/research/propmodel/frozen/**', 'props/research/propmodel/results/oneshot_2026.json']
# '/**' is everything under a folder; otherwise a glob within one folder ('*' never crosses a '/')
AUDIT = ['props/build/**', 'props/data/*.py', 'props/data/*.json', 'props/research/features.py',
         'props/research/qb_td.py', 'props/raw/feat.pkl', 'props/raw/fake_wk1.csv', 'props/requirements.txt',
         'lib/**', '.github/workflows/props.yml',
         # payload.py reads the neutral sites into each game's neu, and the audit's T2 holds the team model to the
         # app's equation in reference_models.json (app v137): both PAGE paths too
         'betting/neutral_sites.json', 'betting/tools/reference_models.json'] + TD_SHADOW + GATE
# the props job's own outputs: a run commits them, and they are data, not code
AUDIT_OUTPUTS = ['props/data/payload.json', 'props/data/priced_at.json', 'props/data/pricepull.json',
                 'props/data/credits.json', 'props/data/suggest_ledger.json', 'props/data/dk_links_wk*.json',
                 # the archive of DraftKings' player lines on ESPN (espn_archive.py, weekly.py's step 5b, 27 October 2026)
                 'props/data/espn_lines_*.json']
PAGE = ['nflbets/**', 'betting/app/**', 'betting/tools/build.js', 'betting/tools/patches.js',
        'betting/tools/tiers.js', 'betting/tools/*_viz.js', 'betting/tools/reference_models.json',
        'props/build/part1.html', 'props/build/part*.js', 'props/build/espn_rule.js', 'props/build/clock_now.js',
        'betting/neutral_sites.json',  # patches.js inlines it into the app the page carries
        'props/build/package.json', 'props/build/package-lock.json', 'liveparlays/build/**',
        # the page itself, at the site's root since 17 October 2026 (nflbets/build/build.js writes it), and the
        # old addresses' redirects to it, which its smoke holds
        'index.html', 'pickems/index.html', 'live/index.html', 'liveparlays/index.html', 'news/index.html'] + GATE
SMOKE_LINE = re.compile(r'(\d+) checks, (\d+) failures')
# job C: the props job's own tests and the page's, each run from the repo's root ('py' or 'node'), seconds each on
# fixtures of their own (test_dk_links reads git history, which the gate's checkout has whole; test_lock_runs the
# season's schedule; smoke_admin.js and smoke_live.js the built page at the root). Before 20 October 2026 the gate
# ran none of them. smoke_live.js (about four minutes, ten at most by its own cap) is the one place the parlay card's
# Pull from DraftKings is held: one paid call a game, never tried again after a failure, the confirm's cost, a
# visitor's page never asking The Odds API, a sign-out dropping a late answer (section J3, and N and V); it joined
# the units on the review of 21 October 2026, since a change to card.html (PAGE) otherwise ran none of it
UNITS = [('props/build/test_apply_espn.py', 'py'), ('props/build/test_espn_read.js', 'node'), ('props/build/test_lock_runs.py', 'py'),
         ('props/build/test_espn_ids.py', 'py'), ('props/build/test_dk_links.py', 'py'), ('props/build/test_unmatched.py', 'py'),
         ('props/build/test_who_played.py', 'py'), ('props/build/test_fetch.py', 'py'), ('props/build/test_audit_gate.py', 'py'),
         ('lib/test_netfetch.py', 'py'), ('lib/test_netfetch.js', 'node'), ('props/build/test_espn_archive.py', 'py'),
         ('nflbets/build/test_dkname.js', 'node'),
         ('nflbets/build/smoke_admin.js', 'node'), ('nflbets/build/smoke_live.js', 'node'),
         # the touchdown shadow's rules, its check, its page reader on the payload pinned at 9dbe81f6 and its guard,
         # on a stand-in for the model (job C has no lightgbm): about 20 s, three minutes at most by its own stop
         ('props/research/propmodel/test_td_shadow.py', 'py')]
# a unit run only where its file is in the tree; every other one missing fails the gate (none is optional: the parlay
# card's name rule's test landed with its change)
UNITS_OPTIONAL = set()
UNIT_LINE = re.compile(r'(?:(\d+) checks, )?(\d+) failures')
DOWNLOAD = re.compile(r'^BLOCKED: (download |schedule \()', re.M)
NOT_POSTED = re.compile(r'^\s*\S+: not posted yet \(', re.M)   # weekly.py's line for a 404 it goes on without


def match(pat, path):
    if pat.endswith('/**'): return path.startswith(pat[:-2])
    return path.count('/') == pat.count('/') and fnmatch.fnmatchcase(path, pat)


def parts(paths):
    """(the AUDIT paths, the PAGE paths) among these"""
    audit = [p for p in paths if any(match(g, p) for g in AUDIT) and not any(match(g, p) for g in AUDIT_OUTPUTS)]
    page = [p for p in paths if any(match(g, p) for g in PAGE)]
    return audit, page


def cases(root=ROOT):
    """test_audit_phases.py's CASES as (label, kind), read without running it; none when it is not there"""
    f = os.path.join(root, 'props', 'build', 'test_audit_phases.py')
    if not os.path.isfile(f): return []
    for node in ast.parse(open(f, encoding='utf-8').read()).body:
        if isinstance(node, ast.Assign) and any(getattr(t, 'id', None) == 'CASES' for t in node.targets):
            return [(c[0], c[4]) for c in ast.literal_eval(node.value)]
    return []


def git(*a, cwd=ROOT):
    return subprocess.check_output(['git', '-C', cwd, *a], text=True).strip()


def changed_paths(a, b, cwd=ROOT):
    """the paths changed from a to b; --no-renames, so a file moved out of a covered folder counts by its
    old path too (with renames on, git names only the new one)"""
    return [l for l in git('diff', '--name-only', '--no-renames', a, b, cwd=cwd).splitlines() if l]


def ok_sha(s):
    if not s or set(s) == {'0'}: return False
    return subprocess.run(['git', '-C', ROOT, 'cat-file', '-e', s + '^{commit}'], capture_output=True).returncode == 0


def out(**kv):
    """the step's outputs, and the log"""
    f = os.environ.get('GITHUB_OUTPUT')
    for k, v in kv.items():
        print(f'{k}={v}')
        if f:
            with open(f, 'a') as fh: fh.write(f'{k}={v}\n')


def summary(s):
    f = os.environ.get('GITHUB_STEP_SUMMARY')
    if f:
        with open(f, 'a', encoding='utf-8') as fh: fh.write(s + '\n')


def plan(changed, everything=False):
    """(audit, page, the cases to replay) for a change"""
    audit, page = parts(changed)
    a, p = everything or bool(audit), everything or bool(page)
    labels = [l for l, kind in cases() if a or (p and kind == 'smoke')]
    return a, p, labels, audit, page


def classify(args):
    ev = args.event
    if ev == 'pull_request':
        base = git('rev-parse', 'HEAD^1')          # the merge ref's first parent: the base branch as merged
    else:
        base = args.before if ok_sha(args.before) else git('rev-parse', 'HEAD^1')
    changed = changed_paths(base, 'HEAD')
    everything = ev != 'pull_request'
    a, p, labels, audit, page = plan(changed, everything)
    print(f'{ev}: {len(changed)} changed path(s) against {base[:7]}')
    for name, got in (('AUDIT', audit), ('PAGE', page)):
        print(f'  {name}: ' + (', '.join(got[:12]) + (f' and {len(got) - 12} more' if len(got) > 12 else '') if got else 'none'))
    if everything: print(f'  a {ev}: everything runs')
    if not (a or p):
        print('nothing the props job or the page runs changed: the props gate passes')
        summary('Nothing the props job or the page runs changed: the props gate passes.')
    else:
        summary(f"Props gate on {ev}: job A (fresh bake) {'runs' if a or p else 'skipped'}, "
                f"{len(labels)} phase replay case(s){': ' + ', '.join(labels) if labels else ''}.")
    out(audit=str(a).lower(), page=str(p).lower(), base=base, cases=json.dumps(labels))
    return 0


def dry_run(args):
    """which of the last N PRs merged into main would have run which job"""
    log = git('log', '--first-parent', '--format=%H %s', '-400', args.ref).splitlines()
    prs = [l for l in log if re.search(r'Merge pull request #\d+|\(#\d+\)$', l)][:args.n]
    rows = {'both': 0, 'audit': 0, 'page': 0, 'none': 0}
    for l in prs:
        sha, subj = l.split(' ', 1)
        num = re.search(r'#(\d+)', subj).group(1)
        changed = changed_paths(sha + '^1', sha)
        a, p, labels, audit, page = plan(changed)
        what = 'both' if a and p else 'audit' if a else 'page' if p else 'none'
        rows[what] += 1
        job = ('A + B (%d cases)' % len(labels)) if a else ('A + B (%d smoke cases)' % len(labels)) if p else 'passes at once'
        print(f"#{num:>4} {sha[:7]}  {len(changed):3} files  AUDIT {len(audit):2}  PAGE {len(page):2}  -> {job:24} {subj[:70]}")
    print(f"\n{len(prs)} PRs: {rows['both']} touch both sets, {rows['audit']} the AUDIT set alone, "
          f"{rows['page']} the PAGE set alone, {rows['none']} neither (the gate passes at once)")
    return 0


def files_cmd(args):
    a, p, labels, audit, page = plan(args.paths)
    for f in args.paths:
        print(f"{f}: {'AUDIT ' if f in audit else ''}{'PAGE' if f in page else ''}".rstrip(': ') or f)
    print(f'audit={str(a).lower()} page={str(p).lower()} cases={json.dumps(labels)}')
    return 0


# ---- running things, here and on the base ----

def stream(cmd, cwd, env, label):
    """run, printing as it goes (folded in the log), and return (exit code, output)"""
    print(f'::group::{label}', flush=True)
    t0 = time.time(); buf = []
    p = subprocess.Popen(cmd, cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors='replace')
    for line in p.stdout:
        buf.append(line); print(line, end='', flush=True)
    rc = p.wait()
    print(f'(exit {rc} after {round(time.time() - t0)}s)\n::endgroup::', flush=True)
    return rc, ''.join(buf)


def clean_env(**extra):
    # the page smokes' own knobs among them (SMOKE_ADMIN_HTML and SMOKE_LIVE_HTML: another copy of the page, for a plant),
    # so a unit always runs on the tree's own page
    env = {k: v for k, v in os.environ.items() if k not in
           ('ODDS_API_KEY', 'PROPS_AUDIT_RAW', 'PROPS_AUDIT_PAYLOAD', 'PROPS_AUDIT_NOW', 'SMOKE_NOW', 'SMOKE_PAYLOAD', 'SMOKE_ADMIN_HTML', 'SMOKE_LIVE_HTML')
           and not k.startswith('PROPS_ESPN_')}
    env['PYTHONUTF8'] = '1'
    env.update(extra)
    return env


def tmp(name):
    d = os.path.join(os.environ.get('RUNNER_TEMP') or tempfile.gettempdir(), 'props-gate', name)
    os.makedirs(d, exist_ok=True)
    return d


BASE_TREE = []
def base_tree(sha):
    """the base's code in a second checkout beside this one (once), with props/build's node_modules"""
    if BASE_TREE: return BASE_TREE[0]
    d = os.path.join(tmp('trees'), 'base')
    if os.path.exists(d):
        subprocess.run(['git', '-C', ROOT, 'worktree', 'remove', '--force', d], capture_output=True)
        shutil.rmtree(d, ignore_errors=True)
    subprocess.run(['git', '-C', ROOT, 'worktree', 'add', '--detach', d, sha], check=True)
    rc, o = stream(['npm', 'ci', '--no-audit', '--no-fund'], os.path.join(d, 'props', 'build'), clean_env(), f'npm ci on the base ({sha[:7]})')
    if rc: raise RuntimeError(f'npm ci failed on the base ({sha[:7]})')
    BASE_TREE.append(d)
    return d


def weekly(root, label, offline=False, replay=None):
    """weekly.py --no-odds in this tree: (exit code, the problems file, the output). replay: a folder of ESPN's
    answers its read replays (PROPS_ESPN_REPLAY) where it would otherwise read ESPN live"""
    t = tmp('weekly-' + label)
    pf = os.path.join(t, 'props-build-problems.txt')
    if os.path.exists(pf): os.remove(pf)
    env = clean_env(RUNNER_TEMP=t, **({'PROPS_ESPN_REPLAY': replay} if replay else {}))
    rc, o = stream([sys.executable, 'weekly.py', '--no-odds'] + (['--offline'] if offline else []),
                   os.path.join(root, 'props', 'build'), env, f'weekly.py --no-odds{" --offline" if offline else ""}{" (ESPN replayed)" if replay else ""} on {label}')
    probs = open(pf, encoding='utf-8').read() if os.path.exists(pf) else ''
    return rc, probs, o


def base_online(here_out, here_probs):
    """whether the base downloads its own nflverse files rather than read this run's copies: when this run
    refused at a download, or read a file as not posted yet (a 404 leaves no copy, and the base's --offline
    would read it as missing and refuse at the download where this run went on: every preseason and rollover)"""
    return bool(DOWNLOAD.search(here_probs) or NOT_POSTED.search(here_out))


def base_result(here_probs, brc, bprobs):
    """(base_ok, infra) for the verdict on the base's weekly.py: a base refused at a download where this run
    was not has nothing to compare with (None, so the change fails), never 'fails on the base too'"""
    here_dl, base_dl = bool(DOWNLOAD.search(here_probs)), bool(DOWNLOAD.search(bprobs))
    if brc != 0 and base_dl and not here_dl: return None, True
    return brc == 0, here_dl or base_dl


def espn_answers(root=ROOT):
    """this run's recordings of ESPN's answers (props/raw/espn/, espn_read.js's), for a base sent online to replay
    (PROPS_ESPN_REPLAY), or None where this run read none (a base from before the read, or the season over)"""
    d = os.path.join(root, 'props', 'raw', 'espn')
    return d if os.path.isdir(d) and any(re.fullmatch(r'[0-9a-f]{40}\.json', f) for f in os.listdir(d)) else None


def base_weekly(broot, here_out, here_probs, label):
    """the base's weekly.py on the same data: this run's downloads and ESPN answers copied and replayed (--offline),
    or, where base_online says so, its own downloads with this run's ESPN answers handed to it"""
    online = base_online(here_out, here_probs)
    if not online: copy_downloads(broot)
    return weekly(broot, label, offline=not online, replay=espn_answers() if online else None)


def copy_downloads(dst_root):
    """this run's nflverse downloads (props/raw's ignored files) into the base's tree"""
    raw = git('ls-files', '--others', '--ignored', '--exclude-standard', 'props/raw').splitlines()
    for f in raw:
        if f.strip():
            t = os.path.join(dst_root, f); os.makedirs(os.path.dirname(t), exist_ok=True); shutil.copy2(os.path.join(ROOT, f), t)
    return len(raw)


def smoke(root, payload, label):
    rc, o = stream(['node', 'nflbets/build/smoke.js'], root, clean_env(SMOKE_PAYLOAD=payload), f'page smoke on {label}')
    m = [x for x in (SMOKE_LINE.search(l) for l in o.splitlines()) if x]
    good = rc == 0 and bool(m) and m[-1].group(2) == '0'
    return good, (m[-1].group(0) if m else f'no summary line (exit {rc})'), o


def check_tab(root, label):
    """elo/check_tab.js in this tree, on its props/data/payload.json (the one its weekly.py baked): the ELO tab and
    the Elo picks, which read that payload's schedule and which the Elo job runs every morning (critique 13 of the
    ESPN-only change: a payload the props job publishes must not turn the next Elo publish red)"""
    rc, o = stream(['node', 'elo/check_tab.js'], root, clean_env(), f'elo/check_tab.js on {label}')
    m = [x for x in (SMOKE_LINE.search(l) for l in o.splitlines()) if x]
    good = rc == 0 and bool(m) and m[-1].group(2) == '0'
    return good, (m[-1].group(0) if m else f'no summary line (exit {rc})')


def verdict(what, here_ok, base_ok, here_line, base_line, infra=False):
    """0 passes, 1 fails; says which, as an annotation"""
    if here_ok:
        print(f'{what}: passes ({here_line})'); return 0
    if base_ok is None:
        why = (f'the base refused at a download ({base_line}) where this change did not, so it has nothing to compare it with: re-run the gate'
               if infra else 'the base has nothing to compare it with: the change\'s to fix')
        print(f'::error::{what} fails on this change ({here_line}) and {why}')
        summary(f'- FAIL {what}: {here_line} (no base run to compare)'); return 1
    if base_ok:
        msg = (f'{what} fails on this change ({here_line}) and passes on the base ({base_line})'
               + (': a download refused here and not on the base, so re-run the gate; if it holds, the change broke a download' if infra
                  else ': the change\'s to fix before it is merged'))
        print('::error::' + msg); summary('- FAIL ' + msg); return 1
    msg = (f'{what} fails on this change ({here_line}) and on the base too ({base_line}): not this change\'s, so it does not hold the merge'
           + ('; an nflverse download refused (infrastructure): re-run the gate later' if infra else '; main needs a look'))
    print('::warning::' + msg); summary('- warning ' + msg); return 0


def bake(args):
    bad = 0
    rc, probs, here_out = weekly(ROOT, 'this change')
    if probs: print('the problems file:\n' + probs)
    pay = os.path.join(ROOT, 'props', 'data', 'payload.json')
    base_pay = None
    if rc == 0:
        bad |= verdict('the props job (weekly.py --no-odds)', True, None, 'exit 0' + (', with problems that publish' if probs else ''), '')
    else:
        first = (probs.splitlines() or [f'exit {rc}, no problems file'])[0][:200]
        broot = base_tree(args.base)
        brc, bprobs, _ = base_weekly(broot, here_out, probs, f'the base ({args.base[:7]})')
        if bprobs: print('the base\'s problems file:\n' + bprobs)
        base_pay = os.path.join(broot, 'props', 'data', 'payload.json')
        bfirst = 'exit 0' if brc == 0 else (bprobs.splitlines() or [f'exit {brc}'])[0][:200]
        base_ok, infra = base_result(probs, brc, bprobs)
        bad |= verdict('the props job (weekly.py --no-odds)', False, base_ok, first, bfirst, infra)
        print('(refused, so the payload is the published one again: the page smoke runs on that)')
    if args.page != 'true' and args.audit != 'true':
        return bad
    def base_baked():
        """the base's tree with its own payload baked from the same downloads and ESPN answers (once)"""
        nonlocal base_pay
        broot = base_tree(args.base)
        if base_pay is None:
            base_weekly(broot, here_out, probs, f'the base ({args.base[:7]})')
            base_pay = os.path.join(broot, 'props', 'data', 'payload.json')
        return broot
    good, line, _ = smoke(ROOT, pay, 'this change')
    bgood, bline = None, ''
    if not good:
        broot = base_baked()
        bgood, bline, _ = smoke(broot, base_pay, f'the base ({args.base[:7]})')
    bad |= verdict('the page smoke on the fresh payload', good, bgood, line, bline)
    good, line = check_tab(ROOT, 'this change')
    bgood, bline = None, ''
    if not good:
        broot = base_baked()
        bgood, bline = check_tab(broot, f'the base ({args.base[:7]})')
    bad |= verdict('elo/check_tab.js on the fresh payload', good, bgood, line, bline)
    return bad


def unit(root, rel, kind, label):
    """one of UNITS in this tree: (passed, its last summary line)"""
    rc, o = stream([sys.executable if kind == 'py' else 'node', rel], root, clean_env(), f'{rel} on {label}')
    m = [x for x in (UNIT_LINE.search(l) for l in o.splitlines()) if x]
    return rc == 0 and bool(m) and m[-1].group(2) == '0', (m[-1].group(0) if m else f'no summary line (exit {rc})')


def units(args):
    """job C: every unit test here; a failure run again on the base's code, failing the gate when the base passes or
    has no such test (it is the change's), a warning when the base fails it too"""
    bad = 0
    for rel, kind in UNITS:
        what = f'unit test {rel}'
        if not os.path.isfile(os.path.join(ROOT, rel)):
            if rel in UNITS_OPTIONAL: print(f'{what}: not in this tree, skipped'); continue
            bad |= verdict(what, False, None, 'the file is not in this tree', ''); continue
        ok, line = unit(ROOT, rel, kind, 'this change')
        if ok: bad |= verdict(what, True, None, line, ''); continue
        broot = base_tree(args.base)
        if not os.path.isfile(os.path.join(broot, rel)):
            bad |= verdict(what, False, None, line, ''); continue
        bok, bline = unit(broot, rel, kind, f'the base ({args.base[:7]})')
        bad |= verdict(what, False, bok, line, bline)
    return bad


def phase(args):
    label = args.case
    keep = tmp('phase-here')
    h = os.path.join(ROOT, 'props', 'build', 'test_audit_phases.py')
    rc, o = stream([sys.executable, h, '-j', '1', '--keep', keep, label], ROOT, clean_env(), f'{label} on this change')
    here_ok = rc == 0
    line = (o.strip().splitlines() or ['no output'])[-1]
    if not here_ok:
        tail = os.path.join(keep, label, 'out.txt')
        if os.path.exists(tail):
            print(f'::group::the last 80 lines of {label}\'s output'); print(''.join(open(tail, errors='replace').readlines()[-80:])); print('::endgroup::')
    if here_ok:
        return verdict(f'phase case {label}', True, None, line, '')
    broot = base_tree(args.base)
    bh = os.path.join(broot, 'props', 'build', 'test_audit_phases.py')
    if not os.path.isfile(bh) or label not in {l for l, _ in cases(broot)}:
        return verdict(f'phase case {label}', False, None, line, '')
    brc, bo = stream([sys.executable, bh, '-j', '1', label], broot, clean_env(), f'{label} on the base ({args.base[:7]})')
    return verdict(f'phase case {label}', False, brc == 0, line, (bo.strip().splitlines() or ['no output'])[-1])


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sub = ap.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('classify'); c.add_argument('--event', required=True); c.add_argument('--before', default='')
    d = sub.add_parser('dry-run'); d.add_argument('n', type=int, nargs='?', default=30); d.add_argument('--ref', default='HEAD')
    f = sub.add_parser('files'); f.add_argument('paths', nargs='+')
    b = sub.add_parser('bake'); b.add_argument('--base', required=True); b.add_argument('--audit', default='true'); b.add_argument('--page', default='true')
    p = sub.add_parser('phase'); p.add_argument('--base', required=True); p.add_argument('--case', required=True)
    u = sub.add_parser('units'); u.add_argument('--base', required=True)
    a = ap.parse_args()
    return {'classify': classify, 'dry-run': dry_run, 'files': files_cmd, 'bake': bake, 'phase': phase, 'units': units}[a.cmd](a)


if __name__ == '__main__':
    sys.exit(main())
