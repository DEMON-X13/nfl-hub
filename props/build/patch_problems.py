"""Make a green run mean the run was actually clean.

weekly.py collected soft problems -- a failed nflverse download, a missing
ODDS_API_KEY, a bake that threw -- reported them in the REPORT block and still
exited 0. The job went green and, with email notifications on, you would get a
confirmation saying it worked.

It cannot simply exit non-zero: the publish and commit steps come after it, and a
failed price pull should still publish the stats that did come in. So the problems
go to a marker file in the runner's temp directory and a final step, after the
commit, fails the job on it. Everything still ships; the email still goes red.

The balance check is exempt: a blip reading the credits balance is not a reason to
redden a build that otherwise worked.
"""
from pathlib import Path

HERE = Path(__file__).parent
W = HERE / 'weekly.py'
Y = HERE.parent.parent / '.github' / 'workflows' / 'props.yml'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# a soft run: reports its exit code, never adds to problems
sub1(W, """def run(args,cwd,label):
    r=subprocess.run(args,cwd=cwd,env=ENV,capture_output=True,text=True,encoding='utf-8',errors='replace')
    out=(r.stdout or '')+(r.stderr or '')
    if r.returncode!=0: problems.append(f"{label} failed (exit {r.returncode}): {out.strip()[-600:]}")
    return r.returncode,out""",
      """def run(args,cwd,label,soft=False):
    r=subprocess.run(args,cwd=cwd,env=ENV,capture_output=True,text=True,encoding='utf-8',errors='replace')
    out=(r.stdout or '')+(r.stderr or '')
    if r.returncode!=0 and not soft: problems.append(f"{label} failed (exit {r.returncode}): {out.strip()[-600:]}")
    return r.returncode,out

def problems_file():
    \"\"\"the job reads this after the commit step and goes red if it has anything in it\"\"\"
    base=os.environ.get('RUNNER_TEMP') or tempfile.gettempdir()
    return os.path.join(base,'props-build-problems.txt')""")

# reading the balance is never a reason to fail the build
sub1(W, "    rc,out=run([PY,'credits.py'],DATA,'credits')",
      "    rc,out=run([PY,'credits.py'],DATA,'credits',soft=True)")

sub1(W, "import os, sys, json, csv, subprocess, argparse, urllib.request, shutil, datetime, re",
      "import os, sys, json, csv, subprocess, argparse, urllib.request, shutil, datetime, re, tempfile")

# write the marker, and say plainly what it means
sub1(W, """    # 7. report
    print("\\nREPORT")
    for s in report: print(s)
    if problems:
        print("PROBLEMS"); [print('  - '+p) for p in problems]
    else: print("no problems")
    print(f"open: {os.path.join(PKG,'app','prop_model_2026.html')}")
    return 1 if any(p.startswith('AUDIT') for p in problems) else 0""",
      """    # 7. report
    print("\\nREPORT")
    for s in report: print(s)
    try:
        mf=problems_file()
        if problems:
            with open(mf,'w',encoding='utf-8') as f: f.write('\\n'.join(problems))
        elif os.path.exists(mf): os.remove(mf)
    except OSError as e: print(f"could not write the problems marker: {e}")
    if problems:
        print("PROBLEMS"); [print('  - '+p) for p in problems]
        print("this run will be marked failed, whatever it managed to publish")
    else: print("no problems")
    print(f"open: {os.path.join(PKG,'app','prop_model_2026.html')}")
    # a dirty audit stops here so nothing broken gets published; everything else is
    # published first and the job is failed afterwards, by the step that reads the marker
    return 1 if any(p.startswith('AUDIT') for p in problems) else 0""")

# the step that turns a soft problem into a red run, and it runs after the commit
y = Y.read_text(encoding='utf-8')
assert 'reported problems' not in y, 'props.yml already patched'
assert y.rstrip().endswith('fi'), 'the commit step is no longer last'
STEP = """      - name: Fail the run if the build reported problems
        if: always()
        run: |
          f="$RUNNER_TEMP/props-build-problems.txt"
          if [ -s "$f" ]; then
            echo "::error::the weekly build reported problems; whatever worked was still published"
            sed 's/^/  - /' "$f"
            exit 1
          fi
          echo "the build reported no problems"
"""
Y.write_text(y.rstrip('\n') + '\n' + STEP, encoding='utf-8', newline='\n')

print('weekly.py marks its problems; props.yml fails the run on them')
