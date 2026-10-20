#!/usr/bin/env python3
"""The props gate's own cases (props_gate.py): how it sorts a change's paths, and how it judges a failure
against the base. Runs in seconds, with git alone, in the gate's first job.

  the not-posted window  While a current-season file is a 404 nflverse has not posted yet (the stats before
                         the season's first games are processed, the injury report before its first report:
                         every preseason and rollover), weekly.py goes on without it. A 404 leaves no copy,
                         so the base's --offline run over this run's copies read it as missing and refused at
                         the download, and the gate passed a change whose audit refused as "fails on the base
                         too, infrastructure". Now the base downloads its own then, and a base refused at a
                         download where this run was not has nothing to compare with: the change fails.
  the page's files       betting/neutral_sites.json is inlined into the app the page carries.
  a rename               a file moved out of a covered folder counts by its old path (git diff --no-renames).

    python3 .github/scripts/test_props_gate.py      ends "N cases, 0 failures"
"""
import io, os, re, subprocess, sys, tempfile, contextlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import props_gate as G

os.environ.pop('GITHUB_STEP_SUMMARY', None); os.environ.pop('GITHUB_OUTPUT', None)
n = bad = 0
def case(ok, what):
    global n, bad
    n += 1
    if not ok: bad += 1; print('FAIL: ' + what)

def verdict(*a, **k):
    with contextlib.redirect_stdout(io.StringIO()) as f: rc = G.verdict(*a, **k)
    return rc, f.getvalue()

# weekly.py's own words for a file it goes on without, from its source, so a rewording there is seen here
src = open(os.path.join(ROOT, 'props', 'build', 'weekly.py'), encoding='utf-8').read()
said = re.findall(r'say\(f"(  \{name\}: not posted yet \(\{err\}\)[^"]*)"\)', src)
case(len(said) >= 2, f"weekly.py's not-posted lines (the stats and injury report's, the depth chart's) not found: {said}")
lines = [s.replace('{name}', 'pw_2026.csv').replace('{err}', 'HTTP Error 404: Not Found').replace('{what}', 'player stats') for s in said]
for l in lines: case(bool(G.NOT_POSTED.search('fetched games.csv (812 KB)\n' + l + '\n')), f'NOT_POSTED does not read weekly.py\'s line: {l}')
case(not G.NOT_POSTED.search('  offline: pw_2026.csv missing\n  fetched roster_2026.csv (2048 KB)\n'), 'NOT_POSTED reads an offline line as not posted')

AUDIT_REFUSAL = 'AUDIT: 35434 checks, 3 failures, 0 warnings, 0 runtime errors: nothing is published\n'
BASE_404 = 'BLOCKED: download pw_2026.csv (player stats): missing\n'
here_out = 'fetched games.csv (812 KB)\n' + lines[0] + '\n'

# the not-posted window: this change's audit refuses; the base must download its own, and a base refused
# only at a download is no comparison, so the change fails (before: offline, "fails on the base too", passed)
case(G.base_online(here_out, AUDIT_REFUSAL), 'a run that read a file as not posted yet does not send the base online')
ok, infra = G.base_result(AUDIT_REFUSAL, 1, BASE_404)
case(ok is None and infra, f'a base refused at a download where this run was not is compared with: {(ok, infra)}')
rc, said_v = verdict('the props job (weekly.py --no-odds)', False, ok, AUDIT_REFUSAL.strip(), BASE_404.strip(), infra)
case(rc == 1 and '::error::' in said_v and 're-run the gate' in said_v, f'the change\'s audit refusal in the not-posted window passes the gate: rc {rc}, {said_v.strip()}')
# the base online, seeing the same 404, goes on without it too and passes: the change's to fix
ok, infra = G.base_result(AUDIT_REFUSAL, 0, '')
case(verdict('x', False, ok, 'here', 'exit 0', infra)[0] == 1 and ok is True and not infra, 'a change that refuses where the base passes is not failed')
# the base online, refusing at the audit too: main's, a warning
ok, infra = G.base_result(AUDIT_REFUSAL, 1, AUDIT_REFUSAL)
case(ok is False and not infra and verdict('x', False, ok, 'here', 'base', infra)[0] == 0, 'a failure on both is not a warning')

# no file not posted, an audit refusal: the base reads this run's copies, offline
case(not G.base_online('fetched pw_2026.csv (9000 KB)\n', AUDIT_REFUSAL), 'a run with every file fetched sends the base online')
# this run refused at a download: the base downloads its own, and a download refusal on both is infrastructure
case(G.base_online('', 'BLOCKED: download injuries_2026.csv (injury report): HTTP 503\n'), 'a download refusal does not send the base online')
ok, infra = G.base_result('BLOCKED: download injuries_2026.csv (injury report): HTTP 503\n', 1, 'BLOCKED: download injuries_2026.csv (injury report): HTTP 503\n')
rc, said_v = verdict('x', False, ok, 'here', 'base', infra)
case(ok is False and infra and rc == 0 and 'infrastructure' in said_v, f'a download refusal on both is not a warning naming infrastructure: {(ok, infra, rc)}')
ok, infra = G.base_result('BLOCKED: download injuries_2026.csv (injury report): HTTP 503\n', 0, '')
case(ok is True and infra and verdict('x', False, ok, 'here', 'exit 0', infra)[0] == 1, 'a download refused here and not on the base passes')
# the schedule's refusal counts as a download (DOWNLOAD's second branch), as before
case(G.base_result(AUDIT_REFUSAL, 1, 'BLOCKED: schedule (games.csv): missing\n') == (None, True), 'a base refused at the schedule is compared with')

# the page's files: neutral_sites.json is built into the page
a, p, labels, audit, page = G.plan(['betting/neutral_sites.json'])
case(p and not a and page == ['betting/neutral_sites.json'], f'betting/neutral_sites.json is not a PAGE path: {(a, p, page)}')
yml = open(os.path.join(ROOT, '.github', 'workflows', 'props-gate.yml'), encoding='utf-8').read()
for f in ('betting/neutral_sites.json', '.github/scripts/test_props_gate.py'):
    case(f'- "{f}"' in yml, f'props-gate.yml\'s push paths leave out {f}')
case('test_props_gate.py' in yml.split('id: classify')[0], 'props-gate.yml does not run this test before it classifies')
# the page is the site's root index.html (since 17 October 2026, built from nflbets/build/): a PAGE path, as
# nflbets/ still is (its index.html the redirect to the root), and so is every old address's redirect, which
# the page smoke holds; an index.html anywhere else is not
for f in ('index.html', 'nflbets/index.html', 'nflbets/build/build.js', 'pickems/index.html', 'live/index.html', 'liveparlays/index.html', 'news/index.html'):
    a, p, labels, audit, page = G.plan([f])
    case(p and not a and page == [f], f'{f} is not a PAGE path: {(a, p, page)}')
    case(f.startswith('nflbets/') or f'- "{f}"' in yml, f'props-gate.yml\'s push paths leave out {f}')
for f in ('picks/index.html', 'cfb/index.html', 'nhl/index.html', 'news/data/index.html', 'props/index.html'):
    case(not G.parts([f])[1], f'{f} is a PAGE path, as if it were the page')
# every file the page build reads from betting/ is a PAGE path
reads = set()
for f in ('betting/tools/build.js', 'betting/tools/patches.js'):
    t = open(os.path.join(ROOT, f), encoding='utf-8').read()
    reads |= {'betting/' + '/'.join(m) for m in (tuple(x.strip(" '") for x in g.split(',')) for g in re.findall(r"path\.join\(ROOT, 'betting', ([^)]*)\)", t))}
case(bool(reads) and all(G.parts([r])[1] for r in reads), f'a file the page build reads from betting/ is not a PAGE path: {sorted(r for r in reads if not G.parts([r])[1])}')

# a rename out of a covered folder counts by its old path
with tempfile.TemporaryDirectory() as d:
    def sh(*a): subprocess.run(['git', '-C', d, *a], check=True, capture_output=True)
    sh('init', '-q'); sh('config', 'user.email', 'gate@example.com'); sh('config', 'user.name', 'gate'); sh('config', 'diff.renames', 'true')
    os.makedirs(os.path.join(d, 'nflbets', 'build')); os.makedirs(os.path.join(d, 'tools'))
    open(os.path.join(d, 'nflbets', 'build', 'friends.js'), 'w').write('module.exports = ' + repr('x' * 400) + ';\n')
    sh('add', '-A'); sh('commit', '-qm', 'one')
    sh('mv', 'nflbets/build/friends.js', 'tools/friends.js'); sh('commit', '-qm', 'two')
    got = G.changed_paths('HEAD^1', 'HEAD', cwd=d)
    case(sorted(got) == ['nflbets/build/friends.js', 'tools/friends.js'], f'a rename lists only {got}')
    case(G.plan(got)[1], f'a file moved out of nflbets/build is not a PAGE change: {G.plan(got)}')

# ---- the ESPN read (since 20 October 2026: the props job buys no prices and reads DraftKings' lines from ESPN) ----
# the reader and its tests are what the props job runs (AUDIT), never the page's parts (PAGE's props/build/part*.js);
# the page's own tests (the parlay card's name rule, the admin link) are PAGE
for f in ('props/build/espn_read.js', 'props/build/test_espn_read.js', 'props/build/test_apply_espn.py', 'props/build/test_lock_runs.py',
          'lib/test_netfetch.js'):
    a, p, labels, audit, page = G.plan([f])
    case(a and not p and audit == [f], f'{f} is not an AUDIT path alone: {(a, p, audit, page)}')
for f in ('nflbets/build/test_dkname.js', 'nflbets/build/smoke_admin.js'):
    a, p, labels, audit, page = G.plan([f])
    case(p and not a and page == [f], f'{f} is not a PAGE path alone: {(a, p, audit, page)}')
# nothing the ESPN step logs or reports reads as an nflverse file not posted yet (which sends the base online) or a
# refusal at a download (infrastructure): weekly.py's and espn_read.js's own words, from their source
SAMPLE = {'gid': '2026_07_NE_CHI', 'e.out.why': 'HTTP 403', 'why': 'HTTP 403', 'c.placed': '18', 'c.athletes': '19', 'week': '7'}
def fill(t): return re.sub(r'\{[^{}]*\}', lambda m: SAMPLE.get(m.group(0).strip('{}$'), 'x'), t)
wk = open(os.path.join(ROOT, 'props', 'build', 'weekly.py'), encoding='utf-8').read()
er = open(os.path.join(ROOT, 'props', 'build', 'espn_read.js'), encoding='utf-8').read()
espn_lines = [fill(s) for s in re.findall(r'(?:say|problems\.append|probs\.append|notes\.append|refuse)\(f?"((?:  )?ESPN[^"]*|the ESPN read[^"]*)"', wk)]
espn_lines += ['  ' + fill(s) for s in re.findall(r'say\(`(ESPN[^`]*)`', er)]
case(len(espn_lines) >= 12, f'the ESPN step\'s lines not found in weekly.py and espn_read.js: {len(espn_lines)}')
for l in espn_lines:
    case(not G.NOT_POSTED.search(l) and not G.DOWNLOAD.search('BLOCKED: ' + l if l.startswith('the ESPN') else l), f'a line of the ESPN step reads as not posted or a download refusal: {l}')
case(not G.base_online('\n'.join(espn_lines), ''), 'the ESPN step\'s lines send the base online')
# the environment: no ESPN knob leaks into a run, and a base sent online replays this run's answers
os.environ['PROPS_ESPN_REPLAY'] = '/x'; os.environ['PROPS_ESPN_BASE'] = 'http://127.0.0.1:1'
env = G.clean_env()
case(not [k for k in env if k.startswith('PROPS_ESPN_')], f'clean_env lets an ESPN knob through: {[k for k in env if k.startswith("PROPS_ESPN_")]}')
os.environ.pop('PROPS_ESPN_REPLAY'); os.environ.pop('PROPS_ESPN_BASE')
seen = []
real = (G.stream, G.copy_downloads, G.espn_answers)
try:
    G.stream = lambda cmd, cwd, env, label: (seen.append((cmd, env.get('PROPS_ESPN_REPLAY'))), (0, ''))[1]
    G.copy_downloads = lambda dst: seen.append(('copy', dst)) or 3
    G.espn_answers = lambda root=ROOT: '/here/props/raw/espn'
    with contextlib.redirect_stdout(io.StringIO()):
        G.base_weekly('/base', 'fetched games.csv\n', AUDIT_REFUSAL, 'the base')
    case(seen[0] == ('copy', '/base') and '--offline' in seen[1][0] and seen[1][1] is None,
         f'a base on this run\'s downloads copies them (ESPN\'s answers with them) and replays offline: {seen}')
    seen.clear()
    with contextlib.redirect_stdout(io.StringIO()):
        G.base_weekly('/base', here_out, AUDIT_REFUSAL, 'the base')
    case(len(seen) == 1 and '--offline' not in seen[0][0] and seen[0][1] == '/here/props/raw/espn',
         f'a base sent online downloads its own nflverse files and replays this run\'s ESPN answers (PROPS_ESPN_REPLAY): {seen}')
finally:
    G.stream, G.copy_downloads, G.espn_answers = real
with tempfile.TemporaryDirectory() as d:
    os.makedirs(os.path.join(d, 'props', 'raw', 'espn'))
    case(G.espn_answers(d) is None, 'an empty props/raw/espn is taken for ESPN\'s answers')
    open(os.path.join(d, 'props', 'raw', 'espn', 'read.json'), 'w').write('{}')
    case(G.espn_answers(d) is None, 'a read.json alone is taken for ESPN\'s answers')
    open(os.path.join(d, 'props', 'raw', 'espn', 'a' * 40 + '.json'), 'w').write('{}')
    case(G.espn_answers(d) == os.path.join(d, 'props', 'raw', 'espn'), 'a recorded answer is not found')
# props/raw/espn is ignored, so copy_downloads (git's ignored files under props/raw) carries the answers to the base
ig = subprocess.run(['git', '-C', ROOT, 'check-ignore', '-q', 'props/raw/espn/read.json'], capture_output=True)
ig2 = subprocess.run(['git', '-C', ROOT, 'check-ignore', '-q', 'props/raw/espn/' + 'a' * 40 + '.json'], capture_output=True)
case(ig.returncode == 0 and ig2.returncode == 0, 'props/raw/espn/ is not ignored, so the base would not get this run\'s ESPN answers')

# job C, the unit tests: every one there, the job in the workflow, and judged against the base
for rel, kind in G.UNITS:
    case(kind in ('py', 'node') and (rel in G.UNITS_OPTIONAL or os.path.isfile(os.path.join(ROOT, rel))), f'a unit test listed is not in the tree: {rel}')
need = {'props/build/test_apply_espn.py', 'props/build/test_espn_read.js', 'props/build/test_lock_runs.py', 'props/build/test_espn_ids.py',
        'props/build/test_dk_links.py', 'props/build/test_unmatched.py', 'props/build/test_who_played.py', 'props/build/test_fetch.py',
        'props/build/test_audit_gate.py', 'lib/test_netfetch.py', 'lib/test_netfetch.js', 'nflbets/build/test_dkname.js', 'nflbets/build/smoke_admin.js'}
case(need <= {r for r, _ in G.UNITS}, f'unit tests left out of job C: {sorted(need - {r for r, _ in G.UNITS})}')
case(not os.path.exists(os.path.join(ROOT, 'props', 'build', 'test_pull_schedule.py')), 'test_pull_schedule.py, retired with the paid pull, is back')
job = re.search(r'\n  units:\n(.*?)(?=\n  \w+:\n|\Z)', yml, re.S)
case(bool(job) and 'props_gate.py units --base' in job.group(1) and "needs.paths.outputs.audit == 'true' || needs.paths.outputs.page == 'true'" in job.group(1)
     and 'fetch-depth: 0' in job.group(1) and 'npm ci' in job.group(1), 'props-gate.yml has no unit-test job running props_gate.py units on AUDIT or PAGE changes')
ver = re.search(r'\n  verdict:\n(.*)', yml, re.S)
case(bool(ver) and 'needs: [paths, bake, phase, units]' in ver.group(1) and '"${{ needs.units.result }}"' in ver.group(1), 'the verdict does not wait on the unit tests')
def units_run(here, base, have_base=True, listed=None):
    """G.units on made-up results: here and base are {rel: passed}"""
    real = (G.unit, G.base_tree, G.UNITS, os.path.isfile)
    try:
        G.UNITS = listed or [(r, 'py') for r in here]
        G.base_tree = lambda sha: '/base'
        G.unit = lambda root, rel, kind, label: ((here if root == ROOT else base)[rel], 'N checks, x failures')
        os.path.isfile = lambda p: (p.startswith('/base') and have_base) or (p.startswith(ROOT) and any(p.endswith(r) for r in here))
        with contextlib.redirect_stdout(io.StringIO()) as f: rc = G.units(types.SimpleNamespace(base='b' * 40))
        return rc, f.getvalue()
    finally: G.unit, G.base_tree, G.UNITS, os.path.isfile = real
import types
rc, said_u = units_run({'t1.py': True, 't2.py': True}, {})
case(rc == 0, f'job C fails with every unit passing: {said_u}')
rc, said_u = units_run({'t1.py': True, 't2.py': False}, {'t2.py': True})
case(rc == 1 and '::error::' in said_u, f'a unit failing here and passing on the base does not fail job C: {said_u}')
rc, said_u = units_run({'t2.py': False}, {'t2.py': False})
case(rc == 0 and '::warning::' in said_u, f'a unit failing on the base too is not a warning: {said_u}')
rc, said_u = units_run({'t2.py': False}, {}, have_base=False)
case(rc == 1, f'a unit failing here that the base does not have does not fail job C: {said_u}')
real_opt = G.UNITS_OPTIONAL
try:
    G.UNITS_OPTIONAL = {'nflbets/build/test_optional_made_up.js'}
    rc, said_u = units_run({}, {}, listed=[('nflbets/build/test_optional_made_up.js', 'node')])
    case(rc == 0 and 'skipped' in said_u, 'an optional unit not in the tree is not skipped')
finally: G.UNITS_OPTIONAL = real_opt
case(not G.UNITS_OPTIONAL, f'a unit test is still optional, though every one has landed: {sorted(G.UNITS_OPTIONAL)}')
rc, said_u = units_run({}, {}, listed=[('nflbets/build/test_dkname.js', 'node')])
case(rc == 1, f'a listed unit test not in the tree, and not optional, does not fail job C: {said_u}')
rc, said_u = units_run({}, {}, listed=[('props/build/test_gone.py', 'py')])
case(rc == 1, 'a required unit not in the tree does not fail job C')
# job A: check_tab.js on the fresh payload, judged against the base
real = (G.weekly, G.smoke, G.check_tab, G.base_tree, G.base_weekly)
try:
    calls = []
    G.weekly = lambda root, label, offline=False, replay=None: (0, '', 'out')
    G.smoke = lambda root, pay, label: (True, '10 checks, 0 failures', '')
    G.base_tree = lambda sha: '/base'
    G.base_weekly = lambda broot, o, p, label: (calls.append('base bake'), (0, '', ''))[1]
    for here_ok, base_ok, want in ((True, None, 0), (False, True, 1), (False, False, 0)):
        calls.clear()
        G.check_tab = lambda root, label, h=here_ok, b=base_ok: ((h if root == ROOT else b), 'elo tab check: 9 checks, 1 failures')
        with contextlib.redirect_stdout(io.StringIO()) as f:
            rc = G.bake(types.SimpleNamespace(base='b' * 40, audit='true', page='true'))
        case(rc == want and (calls == ['base bake'] if not here_ok else not calls),
             f'job A\'s check_tab.js ({"passing" if here_ok else "failing"} here, {base_ok} on the base) is judged {rc}, not {want}, base baked {calls}')
finally:
    G.weekly, G.smoke, G.check_tab, G.base_tree, G.base_weekly = real

# props.yml: no key, no price bought, the no_odds input still accepted
py = open(os.path.join(ROOT, '.github', 'workflows', 'props.yml'), encoding='utf-8').read()
case('ODDS_API_KEY' not in py and 'secrets.' not in py, 'props.yml maps a secret (the job buys no prices since 20 October 2026)')
case(re.search(r'^\s+run: python weekly\.py --no-commit\s*$', py, re.M) is not None, 'props.yml\'s run line is not "python weekly.py --no-commit"')
case(re.search(r'^\s+no_odds:\n', py, re.M) is not None, 'props.yml no longer accepts the no_odds input (gh workflow run props.yml -f no_odds=true would fail)')
case('Keep the prices a refused run bought' not in py and 'prices kept from a refused run' not in py, 'props.yml still keeps prices a refused run bought')
case('"47 4 * * 0"' in py, 'props.yml has no Sunday 04:47 UTC run for the Sunday slot\'s lock (test_lock_runs.py)')

print(f'{n} cases, {bad} failures')
sys.exit(1 if bad else 0)
