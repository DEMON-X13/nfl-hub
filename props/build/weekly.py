"""Weekly refresh, meant to run unattended on Thursday and Saturday mornings.

    python weekly.py                 (from pkg/build)
    python weekly.py --no-odds       skip the price pull
    python weekly.py --hours 36      override the price-pull window

What it does, in order, continuing past anything that fails and saying so at the end:
  1. downloads scores/lines, this season's player stats, rosters, injuries and depth charts
     from nflverse into raw/ (an old copy is kept if a download fails)
  2. works out the current week: the earliest week with an unplayed game
  3. if ODDS_API_KEY is set, pulls prices for games kicking off soon (36h on a Thursday,
     otherwise 120h) with data/oddsfetch.py, merges them into that week's files and bakes
     the main lines in with mktbuild.py
  4. rebuilds the payload (rosters, depth charts, schedule) and bakes in every week's player
     stats, this week's injury report and every price file, so the app needs no uploads
  5. assembles the page and runs the audit
  6. commits the result locally as DEMON
  7. prints a REPORT block
Nothing here ever prints the key.
"""
import os, sys, json, csv, subprocess, argparse, urllib.request, shutil, datetime, re
HERE=os.path.dirname(os.path.abspath(__file__)); PKG=os.path.dirname(HERE)
RAW=os.path.join(PKG,'raw'); DATA=os.path.join(PKG,'data'); RES=os.path.join(PKG,'research'); ROOT=os.path.dirname(PKG)
PY=sys.executable; ENV=dict(os.environ,PYTHONUTF8='1',PYTHONIOENCODING='utf-8')
SEASON=2026
FILES={'games.csv':'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv',
 'pw_2026.csv':'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv',
 'roster26.csv':'https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_2026.csv',
 'injuries26.csv':'https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2026.csv',
 'dc26.csv':'https://github.com/nflverse/nflverse-data/releases/download/depth_charts/depth_charts_2026.csv'}
STATCOLS=['player_id','player_display_name','position','season','week','season_type','team','opponent_team',
 'completions','attempts','passing_yards','passing_tds','passing_interceptions','carries','rushing_yards','rushing_tds',
 'receptions','targets','receiving_yards','receiving_tds','fg_att','fg_made','pat_made','pat_att',
 'fg_made_0_19','fg_made_20_29','fg_made_30_39','fg_made_40_49','fg_made_50_59','fg_made_60_']
INJCOLS=['season','week','team','gsis_id','full_name','position','report_status','game_status']
report=[]; problems=[]
def say(s): print(s,flush=True); report.append(s)
def run(args,cwd,label):
    r=subprocess.run(args,cwd=cwd,env=ENV,capture_output=True,text=True,encoding='utf-8',errors='replace')
    out=(r.stdout or '')+(r.stderr or '')
    if r.returncode!=0: problems.append(f"{label} failed (exit {r.returncode}): {out.strip()[-600:]}")
    return r.returncode,out

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--no-odds',action='store_true'); ap.add_argument('--hours',type=float); ap.add_argument('--no-commit',action='store_true')
    a=ap.parse_args()
    today=datetime.date.today(); say(f"weekly refresh {datetime.datetime.now():%Y-%m-%d %H:%M} ({today:%A})")
    # 1. downloads
    os.makedirs(RAW,exist_ok=True)
    for name,url in FILES.items():
        dest=os.path.join(RAW,name); tmp=dest+'.part'
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'prop-model-weekly/1.0'})
            with urllib.request.urlopen(req,timeout=180) as r, open(tmp,'wb') as f: shutil.copyfileobj(r,f)
            if os.path.getsize(tmp)<1000: raise IOError('empty response')
            os.replace(tmp,dest); say(f"  fetched {name} ({os.path.getsize(dest)//1024} KB)")
        except Exception as e:
            problems.append(f"download {name}: {e} (kept the previous copy)" if os.path.exists(dest) else f"download {name}: {e} and no previous copy")
            if os.path.exists(tmp): os.remove(tmp)
    # 2. current week
    week=None; gs=[]
    try:
        with open(os.path.join(RAW,'games.csv'),newline='',encoding='utf-8') as f:
            gs=[r for r in csv.DictReader(f) if r['season']==str(SEASON) and r['game_type']=='REG']
        unplayed=[int(r['week']) for r in gs if not r['home_score'].strip()]
        week=min(unplayed) if unplayed else max(int(r['week']) for r in gs)
        say(f"  current week {week} ({len(unplayed)} games still to play this season)")
    except Exception as e: problems.append(f"week detection: {e}"); week=1
    # 3. prices
    if a.no_odds: say("  price pull skipped (--no-odds)")
    elif not os.environ.get('ODDS_API_KEY'): say("  price pull skipped: ODDS_API_KEY is not set in this environment"); problems.append("no ODDS_API_KEY; prices not pulled")
    else:
        hours=a.hours or (36 if today.weekday()==3 else 120)
        rc,out=run([PY,'oddsfetch.py','--week',str(week),'--hours',str(hours)],DATA,'oddsfetch')
        for line in out.splitlines():
            if 'credits' in line or 'main lines' in line or 'threshold prices' in line or 'matched' in line: say('  '+line.strip())
        if rc==0 and os.path.exists(os.path.join(DATA,f'wk{week}_lines.csv')):
            rc2,out2=run([PY,'mktbuild.py',str(week),f'wk{week}_lines.csv','the-odds-api best of us',str(today)],DATA,'mktbuild')
            say('  '+out2.strip().splitlines()[-1] if out2.strip() else '  mktbuild: no output')
    # 4. payload + bake
    if not os.path.exists(os.path.join(RAW,'feat.pkl')):
        say("  raw/feat.pkl missing: building features (a few minutes)"); run([PY,'features.py'],RES,'features')
    rc,out=run([PY,'payload.py'],HERE,'payload')
    for line in out.splitlines():
        if line.startswith(('players','depth','build')): say('  '+line.strip())
    try:
        pp=os.path.join(DATA,'payload.json'); pay=json.load(open(pp,encoding='utf-8'))
        stats={}
        # only games that games.csv shows as finished: a game in progress must never be graded
        finished={r['game_id'] for r in gs if r['home_score'].strip()}
        skipped_live=set()
        with open(os.path.join(RAW,'pw_2026.csv'),newline='',encoding='utf-8') as f:
            for r in csv.DictReader(f):
                if r.get('season')!=str(SEASON) or r.get('season_type')!='REG': continue
                if r.get('game_id') and r['game_id'] not in finished: skipped_live.add(r['game_id']); continue
                if r.get('position','').upper() not in ('QB','RB','WR','TE','K','FB','HB'): continue
                row={}
                for c in STATCOLS:
                    v=r.get(c,'')
                    if c in ('player_id','player_display_name','position','season_type','team','opponent_team'): row[c]=v
                    else:
                        try: row[c]=float(v) if v!='' else 0
                        except ValueError: row[c]=0
                stats.setdefault(str(int(float(r['week']))),[]).append(row)
        pay['stats']=stats
        inj=[]
        ip=os.path.join(RAW,'injuries26.csv')
        if os.path.exists(ip):
            with open(ip,newline='',encoding='utf-8') as f:
                for r in csv.DictReader(f):
                    if r.get('season')==str(SEASON) and str(r.get('week','')).strip()==str(week): inj.append({c:r.get(c,'') for c in INJCOLS})
        pay['injuries']=inj
        prices={}
        for fn in sorted(os.listdir(DATA)):
            m=re.match(r'prices_wk(\d+)\.csv$',fn)
            if not m: continue
            with open(os.path.join(DATA,fn),newline='',encoding='utf-8') as f: prices[m.group(1)]=list(csv.DictReader(f))
        pay['prices']=prices
        pay['baked_at']=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='minutes')   # UTC with offset, so the page shows the right local time
        json.dump(pay,open(pp,'w',encoding='utf-8'),separators=(',',':'),ensure_ascii=False)
        if skipped_live: say(f"  not baked (no final score yet): {', '.join(sorted(skipped_live))}")
        say(f"  baked in: stats for weeks {', '.join(sorted(stats,key=int)) or 'none yet'} ({sum(len(v) for v in stats.values())} player-games), {len(inj)} injury rows for week {week}, prices for weeks {', '.join(sorted(prices,key=int)) or 'none'}")
    except Exception as e: problems.append(f"bake: {e}")
    # 5. assemble + audit
    rc,out=run([PY,'assemble.py'],HERE,'assemble')
    rc,out=run(['node','audit.js'],HERE,'audit')
    last=[l for l in out.splitlines() if 'checks,' in l]
    audit=last[-1].strip() if last else 'audit produced no summary line'
    say('  '+audit)
    if '0 failures' not in audit or '0 runtime errors' not in audit: problems.append('AUDIT NOT CLEAN: '+audit)
    try: os.remove(os.path.join(PKG,'app','app.js'))
    except OSError: pass
    # 6. commit
    if any(p.startswith('AUDIT') for p in problems): say('  not committed: the audit is not clean')
    elif not a.no_commit and shutil.which('git') and os.path.isdir(os.path.join(ROOT,'.git')):
        subprocess.run(['git','add','-A'],cwd=ROOT,capture_output=True)
        st=subprocess.run(['git','status','--porcelain'],cwd=ROOT,capture_output=True,text=True).stdout.strip()
        if st:
            msg=f"weekly refresh {today} week {week}\n\n"+'\n'.join(report)+"\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\n"
            r=subprocess.run(['git','-c','core.safecrlf=false','commit','-q','-F','-'],cwd=ROOT,input=msg,text=True,capture_output=True)
            say('  committed' if r.returncode==0 else f"  commit failed: {r.stderr.strip()[-300:]}")
        else: say('  nothing new to commit')
    # 7. report
    print("\nREPORT")
    for s in report: print(s)
    if problems:
        print("PROBLEMS"); [print('  - '+p) for p in problems]
    else: print("no problems")
    print(f"open: {os.path.join(PKG,'app','prop_model_2026.html')}")
    return 1 if any(p.startswith('AUDIT') for p in problems) else 0

if __name__=='__main__': sys.exit(main())
