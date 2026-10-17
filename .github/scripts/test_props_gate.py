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

print(f'{n} cases, {bad} failures')
sys.exit(1 if bad else 0)
