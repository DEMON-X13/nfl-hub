"""Weekly refresh, run unattended by .github/workflows/props.yml: four price pulls a week
(PULL_SLOTS below), and post-game, stats, Saturday and daily injury-report runs with --catch-up:
they price only a game a dropped pull left unpriced, and spend nothing otherwise.
test_pull_schedule.py drives the pulls and catch-ups over the season's schedule, offline.

    python weekly.py                 (from props/build)
    python weekly.py --no-odds       skip the price pull
    python weekly.py --catch-up      price only games up to the next pull with no prices yet, not yet started
    python weekly.py --hours 36      override the price-pull window
    python weekly.py --local         allow the price pull off GitHub (it spends credits)
    python weekly.py --offline       use the files already in raw/ instead of downloading (testing)

Credits are spent only by the props workflow: off GitHub Actions the price pull is skipped
unless --local says otherwise. Nothing commits here: the workflow commits props/data itself,
and only when this exits 0 (--no-commit is still accepted, and does nothing).

What it does, in order:
  1. downloads scores/lines, this season's player stats, rosters, injuries and depth charts
     from nflverse into raw/, and the snap counts (raw/snap_counts_<season>.csv, never required). The season is SEASON in part2.js (season.py reads it). A runner
     starts with an empty raw/, so there is no old copy to fall back on: a required file that
     fails to download, or downloads wrong, stops the run here and nothing is published (the
     last good payload stays live, and the run goes red). The depth charts are the one optional
     file: without them the last payload's chart is carried forward and the page says how old it
     is. The stats and the injury report are judged by what has been published: a 404 on one
     that none of this season's data has come from yet is a file nflverse has not posted (before
     the season, and the stats until the first games are processed), so the run publishes
     without it, the payload lists it in not_posted and the page says so; the run goes red after
     its commit once that is overdue (the injury report after the first kickoff, the stats two
     days after the first game). A 404 on one the site has published from is a failure.
  2. works out the current week: the earliest week with an unplayed regular-season game, or,
     once every one is final, the season is over: no prices are pulled and the page says so.
     At a rollover last season's price files move to data/archive/<season>/, and the stats,
     injury report and roster are read and checked (shape, a whole league, stats that would
     shrink) here, before any credit is spent
     Then the payload's rosters, depth charts and schedule are rebuilt (payload.py), still
     before the pull, which names its games from that schedule. Its baselines are last season's,
     from raw/feat.pkl: on the first run of a new season the committed table lacks it, and the
     run rebuilds it (features_ready) for the workflow to commit
  3. on GitHub Actions (or with --local), if ODDS_API_KEY is set, pulls prices for the games kicking
     off before the next scheduled pull is likely to land (pull_window, hours_to_next_pull) with
     data/oddsfetch.py (choose() picks the games) and merges them into that week's files
  4. bakes into the payload every week's player
     stats, the injury report (this week's in full, earlier weeks' Outs), every player's roster
     status, every week's main lines matched onto the players of their own game (mktbuild.py),
     and every price file with the player each row belongs to: this season's games only, and
     nothing of a payload of another season carried forward; and DraftKings' own id for every
     outcome the pulls read on a game still to come (dk_links_wk{W}.json -> dk, dk_ids below),
     which the parlay card turns into an Open in DraftKings link; and who took part in each
     finished game, from the snap counts (who_played below): the payload's snaps, and a stat row
     of zeros for a player who played a snap in his role with no stat line, so a receiver never
     targeted is graded on zero, as DraftKings grades him, and his projection sees the game
  5. assembles the page and runs the audit, which checks the payload against the raw files
  6. once the audit is clean, the suggestions record (suggest_ledger.js -> data/suggest_ledger.json):
     the Parlay Builder's suggested parlays on their default choices, taken from the published page
     on the payload just baked, frozen at each wave's kickoff and graded after by the app's own
     settleLeg, which reads who played from the payload's snaps. It never refuses the run or turns it
     red: a ledger it refuses is logged in the report and the last good one stays
  7. prints a REPORT block
A run that is refused (a required download, the stats shrinking, the bake, the audit) exits 1
before the workflow's commit step; the workflow then keeps any prices it bought, unpublished.
Anything else wrong is a problem that fails the run after the commit. For the price rows that
means only what needs a person (price_problems): a name that could be two players (names.py
says when), two names on one player's price, or misses too many to be a signing or two the
roster has not caught up with; a few rows no player takes are logged and listed in the payload's
unmatched, and a row placed by anything looser than a printed name is logged too.
Nothing here ever prints the key.
"""
import os, sys, json, csv, subprocess, argparse, urllib.request, shutil, datetime, re, tempfile
HERE=os.path.dirname(os.path.abspath(__file__)); PKG=os.path.dirname(HERE)
RAW=os.path.join(PKG,'raw'); DATA=os.path.join(PKG,'data'); RES=os.path.join(PKG,'research'); ROOT=os.path.dirname(PKG)
sys.path.insert(0,DATA)
from season import SEASON, BASE, FIRST, REL, RAW_FILES, GAMES, STATS, ROSTER, INJURIES, DEPTH, SKILL
import names, mktbuild
PY=sys.executable; ENV=dict(os.environ,PYTHONUTF8='1',PYTHONIOENCODING='utf-8')
STATCOLS=['player_id','player_display_name','position','season','week','season_type','team','opponent_team',
 'completions','attempts','passing_yards','passing_tds','passing_interceptions','carries','rushing_yards','rushing_tds',
 'receptions','targets','receiving_yards','receiving_tds','fg_att','fg_made','pat_made','pat_att',
 'fg_made_0_19','fg_made_20_29','fg_made_30_39','fg_made_40_49','fg_made_50_59','fg_made_60_']
# what ingestInjuries reads, and no more: the payload is fetched on every load
INJCOLS=['season','week','gsis_id','team','report_status','practice_status','injury']
OUT_STATUS=('Out','Doubtful')
report=[]; problems=[]
def say(s): print(s,flush=True); report.append(s)
def refuse(s): problems.append('BLOCKED: '+s)      # nothing from this run is published
def blocked(): return any(p.startswith(('BLOCKED','AUDIT')) for p in problems)
# the audit's last word, on a line of its own: "26980 checks, 0 failures, 0 runtime errors"
AUDIT_LINE=re.compile(r'(\d+) checks, (\d+) failures, (\d+) runtime errors')
def audit_verdict(out):
    """(clean, summary line) from the audit's output. Clean only when the summary line is there
    and, read as numbers, says 0 failures and 0 runtime errors over at least one check. The gate
    used to look for the text '0 failures', which '10 failures' contains, so an audit with ten
    failures would have published. The last summary line counts; none at all is not clean, and
    neither is one in another shape (test_audit_gate.py holds this to its cases)."""
    found=[m for m in (AUDIT_LINE.fullmatch(l.strip()) for l in out.splitlines()) if m]
    if not found: return False,'audit produced no summary line'
    m=found[-1]; checks,fails,errs=(int(x) for x in m.groups())
    return checks>0 and fails==0 and errs==0, m.group(0)
def run(args,cwd,label,soft=False,env=None):
    r=subprocess.run(args,cwd=cwd,env=env or ENV,capture_output=True,text=True,encoding='utf-8',errors='replace')
    out=(r.stdout or '')+(r.stderr or '')
    if r.returncode!=0 and not soft: problems.append(f"{label} failed (exit {r.returncode}): {out.strip()[-600:]}")
    return r.returncode,out

# Price pulls: (weekday, hour, minute) UTC, matching the "17 " crons in .github/workflows/props.yml
# (test_pull_schedule.py holds the two together). Never on the hour: :00 is the most contended
# minute on the platform and the likeliest to be dropped.
# Mon for Monday night; Wed for a holiday game; Thu for Thursday night, Thanksgiving and Friday's
# games; Saturday 05:17 for the weekend: Saturday's games and the whole Sunday slate, London to
# Sunday night. The owner looks at the Sunday slate on Saturday (October 2026: "all day saturday to
# look at potential bets instead of scrambling"), so its prices land by Saturday morning Pacific
# even at the latest GitHub has started a run (05:17 + 9.4h is 7:41am PDT, 6:41am PST), about a
# day before kickoff; it replaced a Saturday 08:17 pull for Saturday's games and a 23:17 one for
# Sunday's, and every game is still priced once.
PULL_SLOTS=[(0,8,17),(2,8,17),(3,8,17),(5,5,17)]
# GitHub fires this repo's scheduled runs late: 3 to 9 hours, measured across every job in
# October 2026 (props median 7.2h, one catch-up 9.2h). A pull prices every game that kicks off
# before the next slot plus LATE, so a game is never left to a pull that lands after its kickoff.
LATE=10
CATCH_UP_WAIT=10   # hours after a slot before a catch-up treats that pull as dropped, not late

def _slots(now,back,ahead):
    out=[]
    for d in range(-back,ahead+1):
        day=(now+datetime.timedelta(days=d)).date()
        for wd,h,m in PULL_SLOTS:
            if day.weekday()==wd: out.append(datetime.datetime(day.year,day.month,day.day,h,m,tzinfo=datetime.timezone.utc))
    return sorted(out)

def hours_since_last_pull(now=None):
    """How long ago the latest scheduled pull's slot was. A catch-up inside CATCH_UP_WAIT of a
    slot leaves the game to the pull that is probably still coming, rather than price it and
    have that pull price it again."""
    now=now or datetime.datetime.now(datetime.timezone.utc)
    past=[s for s in _slots(now,8,0) if s<=now]
    return (now-past[-1]).total_seconds()/3600 if past else 999.0

def hours_to_next_pull(now=None,soon=1800):
    """How far ahead to price: up to the next scheduled pull, plus LATE for that pull landing
    late. Every game is then priced by a pull that runs before it kicks off, with no special
    case for a holiday, a Saturday game or a Wednesday night game.

    Today counts: a manual run early on a Monday must see that morning's pull rather than skip
    to Wednesday and buy Monday night itself. A pull less than soon seconds away (half an hour)
    is treated as already happening; a catch-up passes 0 (pull_window)."""
    now=now or datetime.datetime.now(datetime.timezone.utc)
    for s in _slots(now,0,9):
        if (s-now).total_seconds()>soon: return (s-now).total_seconds()/3600+LATE
    return 120.0

def pull_window(now=None,catch_up=False):
    """The hours ahead this run prices (oddsfetch.py --hours), or None when a catch-up leaves it
    to the scheduled pull: inside CATCH_UP_WAIT of a slot that pull is probably still on its way,
    and outside it the catch-up prices only what has no prices (--missing).

    A catch-up makes up the pull before it, so its window ends at the very next slot (plus LATE),
    however close: it used to skip a slot under half an hour away as a pull does, so Sunday's
    23:07 run landing nine hours late, at 08:07 on Monday, bought Monday night ten minutes before
    the Monday pull's slot and left that pull nothing to do (no credit spent twice, the reprice
    guard saw to that, but the game priced hours earlier than its pull would have)."""
    now=now or datetime.datetime.now(datetime.timezone.utc)
    if catch_up and hours_since_last_pull(now)<CATCH_UP_WAIT: return None
    return hours_to_next_pull(now,0 if catch_up else 1800)

def current_week(gs):
    """(week, season over, games still to play): the earliest week with a regular-season game
    still to play (no home score in games.csv yet), or the last week once every one is final"""
    unplayed=[int(r['week']) for r in gs if not r['home_score'].strip()]
    return (min(unplayed) if unplayed else max(int(r['week']) for r in gs)),not unplayed,len(unplayed)

def problems_file():
    """the job reads this after the commit step and goes red if it has anything in it"""
    base=os.environ.get('RUNNER_TEMP') or tempfile.gettempdir()
    return os.path.join(base,'props-build-problems.txt')

def kickoff(g):
    """the schedule's US Eastern date and time as a UTC instant: daylight time from the second
    Sunday of March to the first Sunday of November, the rule the page uses (easternOffset). The
    clocks change at 2am and no game starts between midnight and 2am, so the date decides. No
    zoneinfo: a runner without its tables must not see every game as started."""
    try: t=datetime.datetime.fromisoformat(f"{g['d']}T{g.get('t') or '13:00'}")
    except (KeyError,TypeError,ValueError): return None
    def sunday(month,nth):
        first=datetime.date(t.year,month,1).weekday()          # Monday 0 .. Sunday 6
        return 1+(6-first)%7+7*(nth-1)
    dst=(3<t.month<11) or (t.month==3 and t.day>=sunday(3,2)) or (t.month==11 and t.day<sunday(11,1))
    return (t+datetime.timedelta(hours=4 if dst else 5)).replace(tzinfo=datetime.timezone.utc)

def read_rows(name):
    p=os.path.join(RAW,name)
    if not os.path.exists(p): return []
    with open(p,newline='',encoding='utf-8') as f: return list(csv.DictReader(f))

def fetch(url,dest):
    """url -> dest, whole or not at all: a failure raises, and leaves no part file behind"""
    tmp=dest+'.part'
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'prop-model-weekly/1.0'})
        with urllib.request.urlopen(req,timeout=180) as r, open(tmp,'wb') as f: shutil.copyfileobj(r,f)
        if os.path.getsize(tmp)<200: raise IOError('empty response')
        os.replace(tmp,dest)
    finally:
        if os.path.exists(tmp): os.remove(tmp)

def download(offline):
    """{file: True (fresh), False (failed), None (not posted yet: a 404)}"""
    got={}
    os.makedirs(RAW,exist_ok=True)
    for name,(what,url,_req) in RAW_FILES.items():
        dest=os.path.join(RAW,name)
        if offline:
            got[name]=os.path.exists(dest); say(f"  offline: {name} {'from raw/' if got[name] else 'missing'}"); continue
        try:
            fetch(url,dest); got[name]=True; say(f"  fetched {name} ({os.path.getsize(dest)//1024} KB)")
        except Exception as e:
            # a copy left in raw/ by an earlier local run is not used: it may be days old
            if os.path.exists(dest): os.remove(dest)
            got[name]=None if getattr(e,'code',None)==404 else False
            got[name+':err']=str(e)
    return got

# nflverse's snap counts (PFR's): who took part in each finished game, which the stats cannot say
# (who_played). Never required: a run without them carries the last payload's word forward, and one
# whose games are three days old with no snap counts in goes red after its commit (snaps_overdue)
SNAPS=f'snap_counts_{SEASON}.csv'
SNAPS_URL=f'{REL}snap_counts/{SNAPS}'
SNAPCOLS=['game_id','team','player','pfr_player_id','position','offense_snaps','defense_snaps','st_snaps']

def fetch_snaps(offline):
    """raw/snap_counts_<season>.csv, fresh or not at all: True when it is there to read"""
    dest=os.path.join(RAW,SNAPS)
    if offline:
        say(f"  offline: {SNAPS} {'from raw/' if os.path.exists(dest) else 'missing'}"); return os.path.exists(dest)
    try:
        fetch(SNAPS_URL,dest); say(f"  fetched {SNAPS} ({os.path.getsize(dest)//1024} KB)"); return True
    except Exception as e:
        if os.path.exists(dest): os.remove(dest)
        say(f"  {SNAPS} did not download ({e}): the published payload's word on who played is carried forward"); return False

FEAT=os.path.join(RAW,'feat.pkl')
PW_URL='https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{}.csv'

def feat_seasons(path=FEAT):
    """the seasons a feature table holds; none when it is missing or will not read"""
    try:
        import pandas as pd
        return {int(x) for x in pd.read_pickle(path)['season'].unique()}
    except Exception: return set()

def features_ready(offline):
    """raw/feat.pkl is the feature table payload.py takes the baselines from: its BASE season, the
    one before SEASON. It is committed, so on the first run of a new season it is a season short.
    Then this rebuilds it, with research/features.py (which takes FIRST..BASE from season.py) on
    nflverse's weekly player stats for those seasons, fetched here (a runner's raw/ has none of
    them), and the workflow commits it with the payload, so the rollover needs no hand step and
    the next run finds it ready. The new table must hold every season the old one did as well as
    BASE, or it is not used. A rebuild that cannot finish refuses the run before any credit is
    spent, and the last good payload stays live. Returns whether the bake can go on."""
    have=feat_seasons()
    if BASE in have: return True
    say(f"  raw/feat.pkl {'holds '+str(min(have))+'-'+str(max(have)) if have else 'is missing'}, not {BASE}, the season the baselines come from: rebuilding it")
    for y in range(FIRST,BASE+1):
        name=f'pw_{y}.csv'; dest=os.path.join(RAW,name)
        if offline:
            if not os.path.exists(dest): refuse(f"raw/feat.pkl lacks {BASE} and {name} is not in raw/ to rebuild it from (--offline)"); return False
            continue
        try: fetch(PW_URL.format(y),dest)
        except Exception as e:
            refuse(f"raw/feat.pkl lacks {BASE}, the season the baselines come from, and {name} (player stats {y}) could not be fetched to rebuild it: {e}"); return False
    tmp=FEAT+'.new'
    rc,out=run([PY,'features.py'],RES,'features',soft=True,env=dict(ENV,OUT=tmp))
    got=feat_seasons(tmp)
    if rc!=0 or BASE not in got or not have<=got:
        if os.path.exists(tmp): os.remove(tmp)
        why=out.strip()[-400:] if rc!=0 else f"it came out with seasons {sorted(got)}"
        refuse(f"raw/feat.pkl lacks {BASE}, the season the baselines come from, and rebuilding it failed: {why}"); return False
    os.replace(tmp,FEAT)
    say(f"  raw/feat.pkl rebuilt with seasons {min(got)}-{max(got)}; the workflow commits it with the payload")
    return True

def check_shape(name,rows,need):
    if rows and not set(need)<=set(rows[0]): return f"{name} lacks {sorted(set(need)-set(rows[0]))}"
    return None

# the two files nflverse cannot have before the season does: the payload says which of them were
# not posted yet (not_posted), the audit then expects none of it, and the page says so
NOT_POSTED_KIND={STATS:'stats',INJURIES:'injuries'}

def payload_season(prev):
    """The season the published payload is of: its `season`, or for one baked before it carried
    that, the season its schedule's game ids name (2026_01_NE_SEA). An empty payload is this
    season's: there is nothing of another to keep out."""
    if prev.get('season'): return int(prev['season'])
    ids=[str(g.get('id') or '')[:4] for g in prev.get('sched') or []]
    ids=[x for x in ids if x.isdigit()]
    return int(max(set(ids),key=ids.count)) if ids else SEASON

def published(prev,name):
    """Does the published payload hold any of this season's stats (or injury report)? A 404 on a
    file the site has already published from is a source that vanished, and publishing without it
    would wipe it off the page; a 404 on one it never had is a file nflverse has not posted yet:
    before the season, and for the stats until the first games are processed (a day or so)."""
    if payload_season(prev)!=SEASON: return False      # last season's payload, at a rollover
    if name==STATS: return any((prev.get('stats') or {}).values())
    return any(str(r.get('season'))==str(SEASON) for r in prev.get('injuries') or [])

WEEK_FILE=re.compile(r'(?:wk(\d+)_lines|prices_wk(\d+)|gamelines_wk(\d+))\.csv$|dk_links_wk(\d+)\.json$')

def week_file_games(path):
    """the game ids a week file names: a CSV's game_id column, or the keys of dk_links_wk{W}.json
    (game|player|stat|side|point)"""
    if path.endswith('.json'):
        try: return {str(k).split('|')[0].strip() for k in json.load(open(path,encoding='utf-8'))}
        except Exception: return set()
    return {(r.get('game_id') or '').strip() for r in names.read_csv(path)}

def archive_other_seasons():
    """At a rollover, last season's price files leave data/ for data/archive/<season>/.

    The files are named by week only (wk5_lines.csv, prices_wk5.csv, gamelines_wk5.csv and
    DraftKings' ids, dk_links_wk5.json), so without this the new season's first pull would merge
    into last season's week-1 files. A
    week's files move together, and only when every game id in them is another season's; a lines
    file from before the lines carried their game goes with its prices file. The bake drops
    another season's rows wherever they are, so this keeps data/ tidy rather than correct."""
    weeks={}
    for fn in os.listdir(DATA):
        m=WEEK_FILE.match(fn)
        if m: weeks.setdefault(next(x for x in m.groups() if x),[]).append(fn)
    moved=[]
    for w,fns in sorted(weeks.items(),key=lambda x:int(x[0])):
        seen={g.split('_')[0] for fn in fns for g in week_file_games(os.path.join(DATA,fn))}
        seen.discard('')
        if not seen or str(SEASON) in seen: continue
        old='-'.join(sorted(seen)); dest=os.path.join(DATA,'archive',old); os.makedirs(dest,exist_ok=True)
        for fn in fns: os.replace(os.path.join(DATA,fn),os.path.join(dest,fn))
        moved.append(f"week {w} ({old})")
    pa=os.path.join(DATA,'priced_at.json')
    if moved and os.path.exists(pa):
        try:
            pr=json.load(open(pa,encoding='utf-8'))
            json.dump({k:v for k,v in sorted(pr.items()) if k.startswith(f"{SEASON}_")},open(pa,'w',encoding='utf-8'),indent=0)
        except Exception: pass
    if moved: say(f"  a new season: last season's price files moved to data/archive/ ({', '.join(moved)})")
    return moved

def read_raw(prev,gs):
    """The stats, injury report and roster the bake needs, read and checked before any credit is
    spent: a run these refuse must not buy prices it then throws away."""
    finished={r['game_id'] for r in gs if r['home_score'].strip()}
    srows=read_rows(STATS)
    bad=check_shape(STATS,srows,['player_id','week','season','season_type','game_id','team','position'])
    if bad: refuse(bad); return None
    stats={}; skipped_live=set()
    for r in srows:
        if r.get('season')!=str(SEASON) or r.get('season_type')!='REG': continue
        if r.get('game_id') and r['game_id'] not in finished: skipped_live.add(r['game_id']); continue
        if r.get('position','').upper() not in SKILL: continue
        row={}
        for c in STATCOLS:
            v=r.get(c,'')
            if c in ('player_id','player_display_name','position','season_type','team','opponent_team'): row[c]=v
            else:
                try: row[c]=float(v) if v!='' else 0
                except ValueError: row[c]=0
        stats.setdefault(str(int(float(r['week']))),[]).append(row)
    # a bake must never hold fewer games of stats than the one already published: that is a
    # failed or truncated download, not a quieter week, and publishing it wipes the season
    if payload_season(prev)==SEASON and prev.get('stats'):
        had={(w,r.get('team')) for w,rs in prev['stats'].items() for r in rs}
        now_={(w,r.get('team')) for w,rs in stats.items() for r in rs}
        lost=sorted(had-now_)
        if lost: refuse(f"the stats would shrink: {len(lost)} team-games the published payload has are missing ({', '.join(f'wk{w} {t}' for w,t in lost[:6])}); the published payload stays"); return None
    irows=read_rows(INJURIES)
    bad=check_shape(INJURIES,irows,['season','week','gsis_id','team','report_status','practice_status'])
    if bad: refuse(bad); return None
    rrows=read_rows(ROSTER)
    bad=check_shape(ROSTER,rrows,['gsis_id','team','status','position','full_name'])
    if bad or len(rrows)<1200 or len({r['team'] for r in rrows})<30: refuse(bad or f"{ROSTER} has {len(rrows)} rows over {len({r['team'] for r in rrows})} teams, not a whole league"); return None
    # the snap counts are never required: one in another shape is not read, and the last word stands
    snap_rows=read_rows(SNAPS) if os.path.exists(os.path.join(RAW,SNAPS)) else None
    bad=check_shape(SNAPS,snap_rows or [],SNAPCOLS)
    if bad: say(f"  {bad}: not read, and the published payload's word on who played is carried forward"); snap_rows=None
    return {'srows':srows,'stats':stats,'skipped_live':skipped_live,'irows':irows,'rrows':rrows,'snap_rows':snap_rows}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--no-odds',action='store_true'); ap.add_argument('--hours',type=float); ap.add_argument('--no-commit',action='store_true',help='accepted for the workflow; nothing commits here'); ap.add_argument('--local',action='store_true',help='allow the price pull off GitHub Actions'); ap.add_argument('--catch-up',action='store_true',help='price only the games up to the next pull that have no prices yet and have not kicked off: a dropped scheduled pull made up, nothing else spent')
    ap.add_argument('--offline',action='store_true',help='use the files already in raw/ (testing); a missing required file still refuses the run')
    a=ap.parse_args()
    now=datetime.datetime.now(datetime.timezone.utc)
    today=datetime.date.today(); say(f"weekly refresh {datetime.datetime.now():%Y-%m-%d %H:%M} ({today:%A}), season {SEASON}")
    pp=os.path.join(DATA,'payload.json')
    try: PUBLISHED[0]=open(pp,'rb').read(); prev=json.loads(PUBLISHED[0])
    except Exception: prev={}
    # 1. downloads
    got=download(a.offline)
    fetch_snaps(a.offline)
    # 2. the schedule first: it says whether the season has started, which the others need
    week=None; gs=[]; season_over=False; first_ko=None
    try:
        if not got.get(GAMES): raise IOError(got.get(GAMES+':err') or 'not downloaded')
        rows=read_rows(GAMES)
        bad=check_shape(GAMES,rows,['game_id','season','game_type','week','gameday','gametime','home_score','away_team','home_team'])
        if bad: raise IOError(bad)
        gs=[r for r in rows if r['season']==str(SEASON) and r['game_type']=='REG']
        if len(gs)<200: raise IOError(f"only {len(gs)} {SEASON} regular-season games in it")
        week,season_over,n_unplayed=current_week(gs)
        kos=[kickoff({'d':r['gameday'],'t':r['gametime']}) for r in gs]; kos=[k for k in kos if k]
        first_ko=min(kos) if kos else None
        fkos=[kickoff({'d':r['gameday'],'t':r['gametime']}) for r in gs if r['home_score'].strip()]; fkos=[k for k in fkos if k]
        first_final=min(fkos) if fkos else None
        say(f"  current week {week} ({n_unplayed} games still to play this season)"+(' -- the regular season is over' if season_over else ''))
    except Exception as e:
        refuse(f"schedule ({GAMES}): {e}; the week cannot be worked out, so nothing is baked")
        first_final=None
    started=bool(first_ko and now>=first_ko)
    not_posted=[]
    for name,(what,url,req) in RAW_FILES.items():
        if name==GAMES or got.get(name): continue
        err=got.get(name+':err','missing')
        if got.get(name) is None and name in NOT_POSTED_KIND and not published(prev,name):
            # a 404 on a file nothing has been published from yet: nflverse has not posted it.
            # The run publishes without it (the page says so), and once it is overdue the run
            # goes red after its commit, so a file that never comes is seen, not lived with
            not_posted.append(name)
            say(f"  {name}: not posted yet ({err}); none of this season's {what} has been published either, so the page goes on without it and says so")
            if name==INJURIES and started:
                problems.append(f"{name} ({what}) is not posted yet, {(now-first_ko).total_seconds()/3600:.0f}h after the season's first kickoff: the page marks nobody out")
            if name==STATS and first_final and (now-first_final).total_seconds()>48*3600:
                problems.append(f"{name} ({what}) is not posted yet, {(now-first_final).total_seconds()/3600:.0f}h after the season's first game: no game of the season is graded")
        elif name==DEPTH and got.get(name) is None and not started and str(prev.get('depth_dt') or '')<f"{SEASON}-03-01":
            # nflverse starts the season's charts in the summer: until the first kickoff last
            # season's chart is carried forward (the game pages say its date), with no red run
            say(f"  {name}: not posted yet ({err}); before the season last season's chart is carried forward, and the game pages say its date")
        elif req: refuse(f"download {name} ({what}): {err}. A required source: nothing is published from this run, and the last good payload stays live")
        else: problems.append(f"download {name} ({what}): {err}. The last payload's depth charts are carried forward; the page shows their date")
    if blocked(): return finish(a)
    # 2b. a rollover: last season's price files out of the way of this season's first pull
    archive_other_seasons()
    # 2c. the files the bake reads, checked now, before a credit is spent on prices
    raw=read_raw(prev,gs)
    if blocked(): return finish(a)
    # 2d. the rosters, depth charts and this season's schedule, rebuilt before the pull: the pull
    # names its games from this schedule (at a rollover the published one is last season's), and
    # a run payload.py cannot finish is refused before a credit is spent. Its baselines come from
    # raw/feat.pkl's BASE season, which the first run of a new season adds (features_ready)
    if not features_ready(a.offline): return finish(a)
    rc,out=run([PY,'payload.py'],HERE,'payload')
    for line in out.splitlines():
        if line.startswith(('players','depth','build')): say('  '+line.strip())
    if rc!=0: refuse('payload.py failed, so the rosters and schedule could not be rebuilt'); return finish(a)
    # 3. prices
    window=pull_window(catch_up=a.catch_up)     # None: a catch-up leaves it to the pull still on its way
    if a.no_odds: say("  price pull skipped (--no-odds)")
    elif season_over: say("  price pull skipped: the regular season is over")
    elif not os.environ.get('GITHUB_ACTIONS') and not a.local: say("  price pull skipped: credits are spent only by the props workflow (pass --local to pull from this machine)")
    elif not os.environ.get('ODDS_API_KEY'): say("  price pull skipped: ODDS_API_KEY is not set in this environment"); problems.append("no ODDS_API_KEY; prices not pulled")
    elif window is None: say(f"  catch-up skipped: the last scheduled pull's slot was {hours_since_last_pull():.1f}h ago and may still be on its way")
    else:
        hours=a.hours or window
        if a.catch_up: say(f"  catch-up: pricing only week {week} games within {hours:.0f}h that have no prices yet and have not kicked off")
        else: say(f"  pricing week {week} games kicking off within {hours:.0f}h, which reaches the next scheduled pull however late it lands")
        rc,out=run([PY,'oddsfetch.py','--week',str(week),'--hours',f'{hours:.1f}']+(['--missing'] if a.catch_up else []),DATA,'oddsfetch')
        for line in out.splitlines():
            if any(k in line for k in ('credits','main lines','threshold prices','matched','kicked off','priced ')): say('  '+line.strip())
        left=re.findall(r'remaining (\d+)',out); used=re.findall(r'credits used (\d+)',out)
        # every call prints the balance, so more than one reading means at least one game was
        # actually priced. A run that matched nothing must not overwrite the last real pull.
        if rc==0 and len(used)>1:
            spent=int(used[-1])-int(used[0])
            json.dump({'at':now.strftime('%Y-%m-%dT%H:%M'),'week':week,'credits_left':int(left[-1]) if left else None,'credits_spent':spent},
                      open(os.path.join(DATA,'pricepull.json'),'w',encoding='utf-8'))
        elif rc==0: say('  nothing kicks off before the next pull; no credits spent')
    # 3b. the odds-API balance. /v4/sports does not count against the quota.
    rc,out=run([PY,'credits.py'],DATA,'credits',soft=True)
    say('  '+(out.strip().splitlines()[-1] if out.strip() else 'balance not checked'))
    # 4. bake
    try: bake(pp,prev,gs,week,season_over,now,raw,not_posted)
    except Exception as e:
        import traceback; traceback.print_exc()
        refuse(f"bake: {e}")
    if blocked(): return finish(a)
    # 5. assemble + audit: the audit checks the payload against the raw files just downloaded
    rc,out=run([PY,'assemble.py'],HERE,'assemble')
    rc,out=run(['node','audit.js'],HERE,'audit',env=dict(ENV,PROPS_AUDIT_RAW='1'))
    clean,audit=audit_verdict(out)
    say('  '+audit)
    if not clean:
        problems.append('AUDIT NOT CLEAN: '+audit+'\n'+'\n'.join(l for l in out.splitlines() if l.strip().startswith(('FAIL','ERROR')))[:3000])
    else: suggestions_record(a.offline)
    return finish(a)

def suggestions_record(offline=False):
    """The suggestions record (suggest_ledger.js, whose docstring has the rules): the panel's four
    suggested parlays on its default choices, taken from the published page on the payload this run
    baked, rewritten while their wave's kickoff is to come, frozen from it and graded after, in
    data/suggest_ledger.json, which the workflow commits with the rest of props/data. Only after a
    clean audit, and never a reason to refuse the run or turn it red: the payload is what the site
    needs, the record is a record of it. When the script refuses (its guard found a frozen entry moved,
    the page or the Elo files would not load) it has already put the last good ledger back; that is
    said in the report, and a file left unreadable by a run that died mid-write is put back here.

    A leg on a player with no stat line is graded as the page grades it, by the payload's snaps (the
    bake's who_played): graded on zero when he took a snap, void when his club's snaps are in without
    him, and otherwise void only when the week's injury report had him Out, else it waits."""
    path=os.path.join(DATA,'suggest_ledger.json')
    try: before=open(path,'rb').read()
    except OSError: before=None
    rc,out=run(['node','suggest_ledger.js'],HERE,'suggestions record',soft=True)
    last=[l.strip() for l in out.splitlines() if l.startswith('suggest ledger:')]
    if rc==0:
        say('  '+(last[-1] if last else 'suggest ledger: ran')); return
    try:
        json.load(open(path,encoding='utf-8'))
    except (OSError,ValueError):
        try:
            if before is None:
                if os.path.exists(path): os.remove(path)
            else: open(path,'wb').write(before)
        except OSError as e: print(f"could not put the suggestions record back: {e}")
    fails=[l.strip() for l in out.splitlines() if l.startswith('FAIL')][:5]
    say('  suggestions record not updated, the last good ledger stays (the publish goes on): '+(last[-1] if last else out.strip()[-300:])+''.join('\n    '+f for f in fails))

# DraftKings' own ids for the outcomes a price pull read (oddsfetch.py writes them, with the betslip
# links, to dk_links_wk{W}.json), baked into the payload as `dk` keyed the way the page names a leg,
# so the parlay card can open a parlay on DraftKings' betslip:
#   dk[week][game] = {'event': DraftKings' event id,
#                     '<pid>|<stat>|over|<point>' (and under): a player's line, the book's point,
#                     '<pid>|any_td': his touchdown (the book's Yes),
#                     'team:<ABBR>|ml', 'team:<ABBR>|ats|<point>' (the team's own handicap),
#                     'game|total|over|<point>' (and under),
#                     'at': when the game's player prices (and so these ids) were read, priced_at.json,
#                     'glat': when its moneylines, spreads and totals were, gamelines_wk{W}.csv's pulled_at}
# An id names one outcome at one number (a spread or total spells its number out, a player's line
# carries its point in the id's tail), so a line DraftKings has moved since is not on the slip: the
# card dates what it opens by the older of at and glat, and says every leg lands only while that read
# is under a day old (the rule g.ls follows for the game lines). Each key is the leg's own key (part2.js legKey) without the game, then its side and the book's point
# written as the page writes a number (dk_point). A player is the one the same name rule places the
# price rows on (pool.match, within the game); a name it does not place, a team defence's touchdown and
# a key two book names would give two ids are left out. Only games still to come, so only the weeks
# with one: a started game's ids are in-play ones, and no leg of it can be added. Only the ids: the
# card rebuilds the links (https://sportsbook.draftkings.com/?outcomes=<sid>+<sid>, '#' as %23).
DK_STATS={'passing_yards','passing_tds','attempts','completions','passing_interceptions','rushing_yards','carries','receptions','receiving_yards','any_td'}

def dk_point(x):
    """a point as JavaScript's String(number) writes it: 79.5, 80, -3 (the card looks the key up
    with String(+leg.k))"""
    f=float(x)
    if f!=f or f in (float('inf'),float('-inf')): raise ValueError(x)
    return str(int(f)) if f.is_integer() else repr(f)

def dk_key(parts,g,match):
    """the payload's key for one entry of dk_links_wk{W}.json (its key split on '|'), or None"""
    gid=g['id']
    if len(parts)==2 and parts[1]=='event': return 'event'
    if len(parts)!=5: return None
    _,who,stat,side,point=(p.strip() for p in parts)
    try:
        if who=='game':
            team={'away':g['a'],'home':g['h']}.get(side)
            if stat=='ml' and team: return f"team:{team}|ml"
            if stat=='spread' and team and point: return f"team:{team}|ats|{dk_point(point)}"
            if stat=='total' and side in ('Over','Under') and point: return f"game|total|{side.lower()}|{dk_point(point)}"
            return None
        if stat not in DK_STATS or not who or names.is_team_row(who): return None
        if stat=='any_td':
            if side!='Yes': return None
            tail='any_td'
        elif side in ('Over','Under') and point: tail=f"{stat}|{side.lower()}|{dk_point(point)}"
        else: return None
    except (ValueError,TypeError): return None
    pid,_how=match(who,int(g['w']),gid)
    return f"{pid}|{tail}" if pid else None

def dk_ids(data,byid,to_come,match):
    """(dk, how many ids, the keys dropped because two book names gave them two ids) from every
    dk_links_wk{W}.json in data: the ids of the games in to_come, keyed by dk_key. match is
    pool.match. A file that will not read costs the card its button for that week, nothing else."""
    out={}; clash=set()
    for fn in sorted(os.listdir(data)):
        m=re.match(r'dk_links_wk(\d+)\.json$',fn)
        if not m: continue
        try: links=json.load(open(os.path.join(data,fn),encoding='utf-8'))
        except Exception as e:
            say(f"  {fn} not read ({e}): no DraftKings ids for week {m.group(1)}"); continue
        if not isinstance(links,dict): continue
        for key,v in links.items():
            parts=str(key).split('|'); gid=parts[0].strip(); g=byid.get(gid)
            sid=str(v.get('sid') or '').strip() if isinstance(v,dict) else ''
            if not g or gid not in to_come or not sid: continue
            k=dk_key(parts,g,match)
            if not k: continue
            game=out.setdefault(str(int(g['w'])),{}).setdefault(gid,{})
            if (gid,k) in clash: continue
            if k in game and game[k]!=sid: del game[k]; clash.add((gid,k)); continue
            game[k]=sid
    for w in list(out):
        out[w]={gid:ids for gid,ids in out[w].items() if ids}
        if not out[w]: del out[w]
    n=sum(len(ids) for gs in out.values() for ids in gs.values())
    # when each game's ids were read: its player prices' pull, and the slate's game lines (a game's
    # player ids are read once, often on the Saturday before a Sunday game, so they can be a day and
    # more old at kickoff; the card says so rather than promise every leg lands)
    played,glines=dk_read_times(data)
    for gs in out.values():
        for gid,ids in gs.items():
            kinds={'game' if (k=='event' or k.startswith(('team:','game|'))) else 'player' for k in ids}
            if 'player' in kinds and played.get(gid): ids['at']=played[gid]
            if 'game' in kinds and glines.get(gid): ids['glat']=glines[gid]
    return out,n,sorted(clash)

def dk_stamp(s):
    """a read time as the files write it (2026-10-17T05:17Z, or with an offset), written
    2026-10-17T05:17Z, or None"""
    try: t=datetime.datetime.fromisoformat(str(s or '').strip().replace('Z','+00:00'))
    except ValueError: return None
    if t.tzinfo is None: t=t.replace(tzinfo=datetime.timezone.utc)
    return t.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')

def dk_read_times(data):
    """({game: when its player prices were last read}, {game: when its game lines were}) from
    data/priced_at.json and every gamelines_wk{W}.csv's pulled_at: oddsfetch.py writes a game's ids
    in the same pull as each, and a game priced again replaces both. A file that will not read, or a
    row with no time, leaves that game's read undated, and the card says so"""
    played={}; glines={}
    try:
        pr=json.load(open(os.path.join(data,'priced_at.json'),encoding='utf-8'))
        if isinstance(pr,dict): played={g:t for g,t in ((g,dk_stamp(v)) for g,v in pr.items()) if t}
    except Exception: pass
    for fn in sorted(os.listdir(data)):
        if not re.match(r'gamelines_wk(\d+)\.csv$',fn): continue
        try: rows=names.read_csv(os.path.join(data,fn))
        except Exception: continue
        for r in rows:
            gid=(r.get('game_id') or '').strip(); t=dk_stamp(r.get('pulled_at'))
            if gid and t: glines[gid]=t
    return played,glines

# Who took part in a finished game. nflverse writes a player's week only when he has a stat, so a
# receiver who played and was never targeted has no row, and the page used to read no row as "did not
# play" and void his leg. DraftKings grades a player who takes part in one play on what he did: Tory
# Horton (SEA, week 5 of 2026) ran 11 offensive snaps with no target, and his receptions over 1.5 lost
# at the book while the page showed it void. About 15% of receiver games and 37% of tight-end games at
# 15-35% of snaps have no row, so the projections never saw those games either, and the low overs hit
# 43% where the model said 66%. The snap counts say who played: a snap of any kind (offence, defence,
# special teams) is taking part. Each row is placed on a player by its PFR id through this season's
# roster file (its pfr_id), else by its name within its game (names.Pool, the price rows' rule) when
# that player played for the row's club; nflverse's players.csv places none the two miss (2026 weeks
# 1-5: every skill-position row with a snap is placed this way) and is a 7 MB download, so it is not
# read. A club's snaps count only once its stats are in, and a club with a skill-position row that
# cannot be placed is left out (its players with no stat line wait, as if its snaps were not in),
# since a player missing from its list would otherwise be voided.
SNAP_WAIT=72   # hours after kickoff before a finished game's missing snap counts turn the run red

def who_played(snap_rows,srows,rrows,stats,sched,pool,shown):
    """(snaps, zero, unplaced) from the snap counts.

    snaps: {week: {game: {club: [ids]}}}, a club for every game whose snap counts and stats are both
    in, holding the players the page projects (a position the book prices, or a player it shows) who
    took a snap and have no stat line. The page settles a leg on a player with no stat line by it
    (settleLeg): in the list, on zero; his club there and he is not, void; no word, it waits (or is
    void if the week's injury report had him Out).
    zero: {week: [rows]}, a stat row of zeros, in the stats' own shape and marked from_snaps, for each of
    them who took a snap in his role (on offence; a kicker, on special teams), so the projections and
    the Track Record see the game. Not for a snap on defence or special teams alone.
    unplaced: 'name (game club)' for each skill-position row with a snap that no player takes."""
    games={g['id']:g for g in sched}
    stats_in={(w,r.get('team')) for w,rs in stats.items() for r in rs}
    has_line={(r.get('game_id'),r.get('player_id')) for r in srows if r.get('season')==str(SEASON) and r.get('season_type')=='REG'}
    pfr={}; pos={}; full={}
    for r in rrows:
        g=(r.get('gsis_id') or '').strip()
        if not g: continue
        p=(r.get('pfr_id') or '').strip()
        if p and p not in ('NA','None'): pfr.setdefault(p,g)
        pos[g]=(r.get('position') or '').strip().upper(); full[g]=(r.get('full_name') or '').strip()
    for r in srows:
        g=(r.get('player_id') or '').strip()
        if g and not pos.get(g): pos[g]=(r.get('position') or '').strip().upper()
        if g and not full.get(g): full[g]=(r.get('player_display_name') or '').strip()
    def num(v):
        try: return float(v)
        except (TypeError,ValueError): return 0.0
    clubs={}; unplaced={}; zero={}; zeroed=set()
    for r in snap_rows:
        gid=(r.get('game_id') or '').strip(); g=games.get(gid); team=(r.get('team') or '').strip()
        if not g or team not in (g['h'],g['a']) or (r.get('game_type') or 'REG')!='REG': continue
        w=str(int(g['w']))
        if (w,team) not in stats_in: continue        # nothing of the club's game is graded yet
        ids=clubs.setdefault((w,gid,team),set())
        off,de,st=num(r.get('offense_snaps')),num(r.get('defense_snaps')),num(r.get('st_snaps'))
        if off+de+st<=0: continue
        ppos=(r.get('position') or '').strip().upper()
        pid=pfr.get((r.get('pfr_player_id') or '').strip())
        if not pid and ppos in SKILL:
            m,_how=pool.match(r.get('player') or '',int(w),gid)
            if m and pool.team_in(int(w),m)==team: pid=m
        if not pid:
            if ppos in SKILL: unplaced.setdefault((w,gid,team),[]).append((r.get('player') or '').strip())
            continue
        ps=pos.get(pid) or ppos
        if not (ps in SKILL or pid in shown) or (gid,pid) in has_line: continue
        ids.add(pid)
        if ps in SKILL and (st if ps=='K' else off)>0 and (gid,pid) not in zeroed:
            zeroed.add((gid,pid))
            row={c:0.0 for c in STATCOLS}
            row.update(player_id=pid,player_display_name=full.get(pid) or (r.get('player') or '').strip(),position=ps,
                       season=float(SEASON),week=float(w),season_type='REG',team=team,opponent_team=g['a'] if team==g['h'] else g['h'],from_snaps=1)
            zero.setdefault(w,[]).append(row)
    snaps={}
    for (w,gid,team),ids in sorted(clubs.items()):
        if (w,gid,team) in unplaced: continue
        snaps.setdefault(w,{}).setdefault(gid,{})[team]=sorted(ids)
    return snaps,zero,sorted(f"{n} ({gid} {team})" for (w,gid,team),ns in unplaced.items() for n in ns)

def carry_snaps(prev,stats,srows,sched):
    """(snaps, zero) carried from the published payload when this run has no snap counts to read: its
    clubs whose stats are still in, and its zero rows for a player who still has no stat line (a stat
    corrected in since is his real row, and the zero goes)"""
    if payload_season(prev)!=SEASON: return {},{}
    stats_in={(w,r.get('team')) for w,rs in stats.items() for r in rs}
    has_line={(r.get('game_id'),r.get('player_id')) for r in srows if r.get('season')==str(SEASON) and r.get('season_type')=='REG'}
    gid_of={(str(int(g['w'])),t):g['id'] for g in sched for t in (g['h'],g['a'])}
    snaps={}
    for w,gs in (prev.get('snaps') or {}).items():
        for gid,cl in gs.items():
            for team,ids in cl.items():
                if (w,team) in stats_in and gid_of.get((w,team))==gid:
                    snaps.setdefault(w,{}).setdefault(gid,{})[team]=[p for p in ids if (gid,p) not in has_line]
    zero={}
    for w,rs in (prev.get('stats') or {}).items():
        for r in rs:
            gid=gid_of.get((w,r.get('team')))
            if r.get('from_snaps') and (w,r.get('team')) in stats_in and gid and (gid,r.get('player_id')) not in has_line: zero.setdefault(w,[]).append(r)
    return snaps,zero

def snaps_overdue(snaps,stats,sched,now):
    """'game club' for each club whose stats are in and whose game kicked off more than SNAP_WAIT hours
    ago with no snap counts in the payload: a leg on a player with no stat line there waits on them"""
    stats_in={(w,r.get('team')) for w,rs in stats.items() for r in rs}
    late=[]
    for g in sched:
        ko=kickoff(g); w=str(int(g['w']))
        if not ko or (now-ko).total_seconds()<SNAP_WAIT*3600: continue
        for t in (g['a'],g['h']):
            if (w,t) in stats_in and t not in ((snaps.get(w) or {}).get(g['id']) or {}): late.append(f"{g['id']} {t}")
    return late

def bake(pp,prev,gs,week,season_over,now,raw,not_posted=()):
    pay=json.load(open(pp,encoding='utf-8'))
    byid={g['id']:g for g in pay['sched']}      # this season's games: nothing of another season is baked
    # a rollover: the published payload is last season's, so none of its lines, nor the dates
    # they were priced, carry into this one (payload.py carries every key it does not rebuild)
    if payload_season(prev)!=SEASON:
        pay['mkt']={}; pay['mkt_meta']={}
        say(f"  a new season: season {payload_season(prev)}'s main lines are not carried into {SEASON}")
    started={gid for gid,g in byid.items() if (kickoff(g) or now)<=now}
    open_games={gid for gid,g in byid.items() if int(g['w'])==week and gid not in started}
    # DraftKings' moneylines, spreads and totals over nflverse's, but only while fresh: a snapshot
    # more than a day older than the game's kickoff (or than now, for a game still to come) gives
    # way to nflverse's line, which is the Pick'ems board's and moves every day. The game carries
    # where its lines came from (ls, lat), and the page says so.
    pull=json.load(open(os.path.join(DATA,'pricepull.json'),encoding='utf-8')) if os.path.exists(os.path.join(DATA,'pricepull.json')) else {}
    hit=stale=0
    for fn in sorted(os.listdir(DATA)):
        m=re.match(r'gamelines_wk(\d+)\.csv$',fn)
        if not m: continue
        for r in names.read_csv(os.path.join(DATA,fn)):
            g=byid.get(r['game_id'])
            if not g: continue
            at=(r.get('pulled_at') or '').strip()
            if not at and pull.get('week')==int(m.group(1)) and pull.get('at'): at=pull['at']+'Z'
            ko=kickoff(g) or now
            try: t=datetime.datetime.fromisoformat(at.replace('Z','+00:00')) if at else None
            except ValueError: t=None
            if t is not None and t.tzinfo is None: t=t.replace(tzinfo=datetime.timezone.utc)
            # a played game's row from before the rows carried their time keeps the book's line,
            # so the grading of a week already played does not move under it
            fresh=(t is not None and (min(now,ko)-t).total_seconds()<=24*3600) or (t is None and ko<=now)
            if not fresh: stale+=1; g['ls']='nflverse'; continue
            nv_tot=g.get('tot')
            for fld,col in (('mla','away_moneyline'),('mlh','home_moneyline'),('spa','away_spread_odds'),('sph','home_spread_odds'),('sp','spread_line'),('tot','total_line')):
                v=(r.get(col) or '').strip()
                if v:
                    try: g[fld]=float(v)
                    except ValueError: pass
            # a total's over and under prices go with its number: DraftKings' own where its row has
            # them; a DraftKings total without them, on a number nflverse did not price, has no price
            # on file, so the page shows it as an estimate and no suggestion is built on it
            if (r.get('total_line') or '').strip():
                ou=[(r.get(c) or '').strip() for c in ('over_odds','under_odds')]
                try: g['tov'],g['tou']=float(ou[0]),float(ou[1])
                except ValueError:
                    if g.get('tot')!=nv_tot: g.pop('tov',None); g.pop('tou',None)
            g['ls']='dk'
            if t is not None: g['lat']=t.strftime('%Y-%m-%dT%H:%MZ')
            hit+=1
    say(f"  game lines: DraftKings on {hit} game(s), nflverse on {stale} where DraftKings' were more than a day old")
    for k,fn in (('price_pull','pricepull.json'),('credits','credits.json')):
        try: pay[k]=json.load(open(os.path.join(DATA,fn),encoding='utf-8'))
        except Exception: pass
    # player stats: only games that games.csv shows as finished (read_raw); a game in progress is
    # never graded, and a bake with fewer games than the published one was refused before the pull
    srows,stats,skipped_live=raw['srows'],raw['stats'],raw['skipped_live']
    pay['stats']=stats
    # the injury report: this week's in full (every position: the Elo tab reads it too), and the
    # Outs and Doubtfuls of earlier weeks for the positions the page projects, so a past week is
    # graded on its own report and a player out last week is known this week
    irows=raw['irows']
    inj=[]; cur=0
    for r in irows:
        if r.get('season')!=str(SEASON) or (r.get('game_type') or r.get('season_type') or 'REG')!='REG': continue
        try: wk=int(float(r.get('week') or 0))
        except ValueError: continue
        st=(r.get('report_status') or '').strip()
        if wk==week: cur+=1
        elif not (wk<week and st in OUT_STATUS and (r.get('position') or '').upper() in SKILL): continue
        o={c:(r.get(c) or '').strip() for c in INJCOLS if c!='injury'}
        o['week']=str(wk); o['injury']=(r.get('report_primary_injury') or r.get('practice_primary_injury') or '').strip()
        inj.append(o)
    pay['injuries']=inj
    # every skill player's roster status and team, today's: the page takes players on a reserve
    # list or released off the board, practice-squad players off the starters, and puts a
    # player traded or signed elsewhere on his new team
    rrows=raw['rrows']
    # [team, status, name, the week the row is for, then his football name with the surname where it
    # differs (null when only the next is there), then his legal form, his first name with the
    # surname, where that is neither (names.names_of)]: INA (a game-day inactive) holds for that week
    # only; the audit checks a book's name against the names the entry carries the way the matcher
    # does, the printed ones before the legal form
    def entry(r):
        e=[r['team'],r['status'],r['full_name'],int(float(r.get('week') or 0))]
        printed,legal=names.names_of(r)
        fb=[n for n in printed if names.norm(n)!=names.norm(r['full_name'])]
        if legal: e+=[fb[0] if fb else None,legal]
        elif fb: e.append(fb[0])
        return e
    # a skill position on the roster, or any player the page can show (his stats, last season's
    # table, the depth chart) whatever position the roster gives him: the page rules a player out
    # as "on no roster" when the table lacks him, so it must not lack one who is on a roster
    shown={r.get('player_id') for r in srows if (r.get('position') or '').upper() in SKILL}|{p['id'] for p in pay.get('players') or []}|set(pay.get('depth') or {})
    pay['roster']={r['gsis_id']:entry(r) for r in rrows if r.get('gsis_id') and ((r.get('position') or '').upper() in SKILL or r['gsis_id'] in shown)}
    # every week's main lines, matched within their own game
    pool=names.Pool(rrows,[r for r in srows if r.get('season')==str(SEASON) and r.get('season_type')=='REG'],pay['sched'])
    # who took part in each finished game (who_played): the payload's snaps, which settle a leg on a
    # player with no stat line, and a row of zeros for each who played in his role, so the record and
    # the projections see the game. With no snap counts this run, the published payload's word stands
    if raw.get('snap_rows') is not None:
        snaps,zero,unplaced=who_played(raw['snap_rows'],srows,rrows,stats,pay['sched'],pool,shown)
    else:
        snaps,zero=carry_snaps(prev,stats,srows,pay['sched']); unplaced=[]
    pay['snaps']=snaps
    pay['stats']={w:rs+zero.get(w,[]) for w,rs in stats.items()}
    nz=sum(len(v) for v in zero.values()); nlist=sum(len(ids) for gs in snaps.values() for cl in gs.values() for ids in cl.values())
    say(f"  who played ({'the snap counts' if raw.get('snap_rows') is not None else 'carried from the published payload'}): "
        f"{sum(len(cl) for gs in snaps.values() for cl in gs.values())} club-games in, {nlist} players with no stat line who took a snap, "
        f"{nz} of them in their role (a row of zeros each)")
    if unplaced: say(f"  snap counts no player takes, so their clubs' players with no stat line wait: {'; '.join(unplaced[:8])}{'...' if len(unplaced)>8 else ''}")
    late=snaps_overdue(snaps,stats,pay['sched'],now)
    if late: problems.append(f"no snap counts in for {len(late)} club-game(s) final more than {SNAP_WAIT}h ago ({', '.join(late[:6])}{'...' if len(late)>6 else ''}): a leg on a player with no stat line there waits"+(f"; snap rows no player takes: {'; '.join(unplaced[:6])}" if unplaced else ''))
    # the week files as they are in data/, and the same rows of this season's games only: a row
    # of another season's game (last season's files at a rollover) is never baked, whatever name
    # it carries, and never re-homed onto this season's game of the same week
    files={}; prices={}; foreign=0
    for fn in sorted(os.listdir(DATA)):
        m=re.match(r'prices_wk(\d+)\.csv$',fn)
        if not m: continue
        files[m.group(1)]=names.read_csv(os.path.join(DATA,fn))
        prices[m.group(1)]=[r for r in files[m.group(1)] if (r.get('game_id') or '').strip() in byid]
        foreign+=len(files[m.group(1)])-len(prices[m.group(1)])
    prices={w:rs for w,rs in prices.items() if rs}
    mkt={w:v for w,v in (pay.get('mkt') or {}).items()}; nl=0
    for fn in sorted(os.listdir(DATA)):
        m=re.match(r'wk(\d+)_lines\.csv$',fn)
        if not m: continue
        w=int(m.group(1)); rows=names.read_csv(os.path.join(DATA,fn))
        out,probs,notes,how=mktbuild.build_week(w,rows,files.get(str(w),[]),pool,open_games,set(byid))
        foreign+=how.get('another season',0)
        if out or str(w) in mkt: mkt[str(w)]=out
        nl+=sum(len(v) for v in out.values())
        problems.extend(probs)
        if notes: say(f"  week {w} lines: {len(notes)} not placed on a played game ({'; '.join(notes[:3])}{'...' if len(notes)>3 else ''})")
    # a week carried from the published payload keeps only its lines of this season's games
    for w in list(mkt):
        mkt[w]={pid:v for pid,v in ((pid,{st:L for st,L in sts.items() if not L.get('g') or L['g'] in byid}) for pid,sts in mkt[w].items()) if v}
        if not mkt[w]: del mkt[w]
    pay['mkt']=mkt; pay['mkt_v']=2
    if foreign: say(f"  not baked: {foreign} price and line rows of another season's games")
    # when each week's book lines were priced: the latest pull of any of its games
    try: priced=json.load(open(os.path.join(DATA,'priced_at.json'),encoding='utf-8'))
    except Exception: priced={}
    meta=pay.setdefault('mkt_meta',{})
    for w,rows in prices.items():
        at=[priced[g] for g in {r['game_id'] for r in rows} if g in priced]
        if at: meta[w]={'src':'DraftKings via the-odds-api','asof':max(at)[:10]}
    for w in list(meta):
        if w not in mkt and w not in prices: del meta[w]
    # every price row with the player it belongs to, so the page matches by id, not by name. On a
    # game still to come, a row no player takes is listed in the payload (unmatched) and logged; it
    # is a problem, and the run goes red after its commit, only when price_problems says so
    misses=[]; placed={}; rows_in={}; loose=set(); npid=0
    for w,rows in prices.items():
        for r in rows:
            if names.is_team_row(r.get('player')): continue
            gid=r.get('game_id'); to_come=gid in open_games
            if to_come: rows_in[gid]=rows_in.get(gid,0)+1
            pid,how=pool.match(r['player'],int(w),gid)
            if pid:
                r['pid']=pid; npid+=1
                if to_come:
                    placed.setdefault((gid,pid,r.get('market'),r.get('threshold')),set()).add(r['player'])
                    if how!='exact': loose.add(f"{r['player']} as {pool.who[pid][0][0]} ({how})")
            elif to_come: misses.append((r['player'],gid,how))
    unmatched,probs,notes=price_problems(misses,placed,rows_in)
    problems.extend(probs)
    if loose: say(f"  price rows placed on a player by his legal first name, a short first name or a nickname, or swapped words: {'; '.join(sorted(loose))}")
    # a name two players in the game share, taken as the only one of them the book prices (the
    # roster keeps a released defensive back of a receiver's name all season), main lines and prices
    split=sorted({f"{b} ({g}) as {pid}, not {', '.join(o)}" for (b,_,g),(pid,o) in pool.by_position.items() if g in open_games})
    if split: say(f"  a name two players in the game share, placed on the only one at a position the book prices: {'; '.join(split)}")
    for n in notes: say('  '+n)
    pay['prices']=prices; pay['unmatched']=unmatched
    # DraftKings' ids for the games still to come, for the parlay card's Open in DraftKings
    dk,ndk,clash=dk_ids(DATA,byid,set(byid)-started,pool.match)
    pay['dk']=dk
    say(f"  DraftKings ids: {ndk} on {sum(len(v) for v in dk.values())} game(s) still to come"+(f"; left out, two book names giving one key two ids: {'; '.join(g+' '+k for g,k in clash)}" if clash else ''))
    pay['season']=SEASON; pay['week']=week; pay['season_over']=season_over
    # the files nflverse has not posted yet: the audit expects none of them in the payload, and the
    # page says so rather than show an empty report as a quiet week
    pay['not_posted']=[NOT_POSTED_KIND[n] for n in RAW_FILES if n in not_posted]
    pay['baked_at']=now.isoformat(timespec='minutes')   # UTC with offset, so the page shows the right local time
    json.dump(pay,open(pp,'w',encoding='utf-8'),separators=(',',':'),ensure_ascii=False)
    if skipped_live: say(f"  not baked (no final score yet): {', '.join(sorted(skipped_live))}")
    say(f"  baked in: stats for weeks {', '.join(sorted(stats,key=int)) or 'none yet'} ({sum(len(v) for v in stats.values())} player-games), "
        f"{cur} injury rows for week {week} (+{len(inj)-cur} earlier Outs), {len(pay['roster'])} roster statuses, "
        f"{nl} main lines, prices for weeks {', '.join(sorted(prices,key=int)) or 'none'} ({npid} rows placed on a player)")

# When the price rows no player takes are worth a person's attention. The book prices a touchdown
# on nearly everyone who may play (one row for a depth player, up to four for a starter: the
# touchdown, receptions, yards), so a game carries 52-70 player rows over about 30 names, and a
# signing or a practice-squad call-up the roster file has not caught up with leaves a row or four
# that nobody takes. That is the roster a day behind, not a fault, and it mends itself; every such
# row used to turn the run red (the pull of 11 October 2026 01:25 UTC did, over three rows), and
# the owner was mailed a failure for a page that was fine. A broken source looks different: a
# club's roster gone, its code changed, a name rule broken take a large share of a game's rows or
# many names at once. So a miss reports when its game's unplaced rows are more than MISS_SHARE of
# that game's player rows (more than any one player's four rows of a full game, so one signing
# priced in every market never trips it, while two starters or half a game do), or when more than
# MISS_NAMES names are unplaced across the games still to come (2026's weeks 1-5 replayed through
# the old matcher on today's roster leave at most four a week: the three names names.py now
# places, and a player the roster has since moved to another club; through this one, at most one).
MISS_SHARE=0.10
MISS_NAMES=4

def price_problems(misses,placed,rows_in):
    """(unmatched, problems, notes) for the price rows of the games still to come.

    misses: (book name, game, how) for each row no player took, how being pool.match's code.
    placed: (game, player, market, threshold) -> the book names placed there. rows_in: game -> its
    player rows. unmatched is every miss, for the payload (the audit holds every unplaced row of a
    game to come to it). Always a problem: an ambiguous name (it could be two players, so it is on
    neither), and two book names placed on one player's same price (one of them is someone else,
    and the page would show one price for both). An 'unmatched' name (nobody in the game by any
    rule) is a problem only past MISS_SHARE of its game's rows or MISS_NAMES names; otherwise a
    note for the log. The main lines are not judged here: mktbuild reports every one on a game to
    come that it cannot place, since the book posts a main line only for a player with a role
    (about half the names it prices), never for the depth players a roster a day behind misses."""
    unmatched=sorted({f"{b} ({g}): {h}" for b,g,h in misses})
    probs=[f"price row not placed on a player: {b} ({g}): {h}" for b,g,h in sorted(set(misses)) if h!='unmatched']
    for (g,pid,mk,k),books in sorted(placed.items(),key=lambda x:tuple(str(v) for v in x[0])):
        if len(books)>1: probs.append(f"price rows of {len(books)} names placed on one player's {mk} {k} in {g}: {', '.join(sorted(books))}: one of them is someone else")
    none_=[(b,g) for b,g,h in misses if h=='unmatched']
    who=sorted(set(none_))
    if not who: return unmatched,probs,[]
    per={}
    for b,g in none_: per[g]=per.get(g,0)+1
    big=sorted(g for g,n in per.items() if n>MISS_SHARE*rows_in.get(g,n))
    listed=', '.join(f"{b} ({g})" for b,g in who)
    if big or len(who)>MISS_NAMES:
        why=[f"{g} has {per[g]} of its {rows_in.get(g,per[g])} player price rows on no player (more than {MISS_SHARE:.0%})" for g in big]
        if len(who)>MISS_NAMES: why.append(f"{len(who)} names on no player in the games still to come (more than {MISS_NAMES})")
        probs.append(f"price rows on no player, too many to be a roster a day behind: {'; '.join(why)}: {listed}")
        return unmatched,probs,[]
    return unmatched,probs,[f"price rows on no player ({len(who)} name{'s' if len(who)>1 else ''}: nobody in the game by that name, a signing the roster file has not caught up with; in the payload's unmatched, not a problem): {listed}"]

PUBLISHED=[None]   # the payload as it stood before this run, put back when the run is refused

def finish(a):
    if blocked():
        say('  refused: nothing from this run is published, and the last good payload stays live')
        # the workflow will not commit, but a refused run leaves no half-built payload behind either
        if PUBLISHED[0] is not None:
            open(os.path.join(DATA,'payload.json'),'wb').write(PUBLISHED[0])
    print("\nREPORT")
    for s in report: print(s)
    try:
        mf=problems_file()
        if problems:
            with open(mf,'w',encoding='utf-8') as f: f.write('\n'.join(problems))
        elif os.path.exists(mf): os.remove(mf)
    except OSError as e: print(f"could not write the problems marker: {e}")
    if problems:
        print("PROBLEMS"); [print('  - '+p) for p in problems]
        print("this run is refused and publishes nothing" if blocked() else "this run will be marked failed after its commit")
    else: print("no problems")
    print(f"open: {os.path.join(PKG,'app','prop_model_2026.html')}")
    # a refusal stops here so nothing broken gets published; everything else is published
    # first and the job is failed afterwards, by the step that reads the marker
    return 1 if blocked() else 0

if __name__=='__main__': sys.exit(main())
