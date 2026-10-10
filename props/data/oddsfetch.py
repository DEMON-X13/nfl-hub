"""Pull NFL player-prop prices from the-odds-api.com (hyphens) into the files the payload is baked from.

Run by props/build/weekly.py on every price pull of .github/workflows/props.yml (the key is the
ODDS_API_KEY repository secret). By hand, run --events first, which costs no credits.

Usage (never put the key on the command line; the shell history would keep it):
    set ODDS_API_KEY=...            (Windows)      export ODDS_API_KEY=...   (mac/linux)
    python oddsfetch.py --events                    list this week's events, free
    python oddsfetch.py --week 2                    write wk2_lines.csv, prices_wk2.csv and gamelines_wk2.csv
    python oddsfetch.py --week 2 --sample saved.json   parse a saved event response instead (no key)

    python oddsfetch.py --week 2 --teams NE,SEA          only the games those teams play (Thursday)
    python oddsfetch.py --week 2 --hours 40 --missing    only games not yet priced and not yet started:
                       the catch-up weekly.py runs on every score-only run, so a scheduled pull that
                       GitHub dropped costs a game its prices only until the next run of the job
A game that has kicked off is never priced, in any mode: an in-play price is not a pre-game line.
A game priced less than REPRICE_HOURS ago is skipped too (--force prices it anyway), so a manual
pull followed by the scheduled one GitHub delivered hours late does not buy the same game twice,
nor do two pulls the same day whose windows overlap (each prices up to the next slot plus the
lateness allowance, so Saturday morning's pull reaches Saturday night's game, and Saturday
evening's would buy it again if it landed on time). A day apart, as the Wednesday and Thursday
pulls are for Thanksgiving's early game, the second pull's fresher prices are worth the credits.
Outputs (in data/), MERGED into existing files for the week so a Thursday pull and a Saturday
pull add up; a game pulled twice keeps the newer prices:
    wk{W}_lines.csv    game_id,stat,player,line,over,under   main lines: the point where over and
                       under are closest to even, best price each side. weekly.py matches every
                       week's file onto player ids on every run (mktbuild.py), within the game.
    prices_wk{W}.csv   game_id,player,market,threshold,odds   every Over as the app's X+ rungs.
                       weekly.py bakes every week's file into payload.json (prices); the app
                       reads it from there.
    gamelines_wk{W}.csv  the book's moneylines, spreads and totals for the slate, with the time of
                       the pull (--no-game-lines skips it). Pulled only when a game was priced.
    priced_at.json     when each game was last priced (the reprice guard above reads it)
Credits: one event request costs (markets requested) x (regions); the free tier is 500 a MONTH,
about 115 a week. The default pull is 6 markets a game (DEFAULT below: the main lines for
passing, rushing and receiving yards, receptions and passing TDs, plus anytime TD) and 3 for the
slate's game lines (moneyline, spread and total), about 7 credits a game, ~112 for a 16-game week
split across the week's pulls. That is the free tier almost exactly; a month with five game weeks
runs short at the end. A pull that prices no game spends nothing: the event list is free and the
game lines are pulled only with a game.
--full adds the alternate ladders and attempts, completions, interceptions and carries, which
needs a paid tier. Every call prints what is left.
"""
import os, sys, json, csv, math, argparse, urllib.request, urllib.parse, urllib.error, collections
from datetime import datetime, timezone

BASE='https://api.the-odds-api.com/v4/sports/americanfootball_nfl'
# the-odds-api market key -> the app's market key
MARKETS={'player_pass_yds':'passing_yards','player_pass_tds':'passing_tds','player_pass_attempts':'attempts',
 'player_pass_completions':'completions','player_pass_interceptions':'passing_interceptions',
 'player_rush_yds':'rushing_yards','player_rush_attempts':'carries','player_receptions':'receptions',
 'player_reception_yds':'receiving_yards','player_anytime_td':'any_td'}
# Default pull, 6 credits a game, all main lines plus anytime touchdown. The three
# alternate ladders were dropped on 2026-09-17: on Detroit at Buffalo they supplied 3
# of the 18 legs that cleared the suggestion bar while costing 3 of 7 credits, because
# a rung carries far more hold than a main line and the model rarely beats it. The
# rungs are still shown on the page at the model's own estimate; they just cannot be
# picked by a suggestion, which is the honest outcome without a real price.
DEFAULT=['player_pass_yds','player_rush_yds','player_reception_yds',
 'player_receptions','player_pass_tds','player_anytime_td']
FULL_EXTRA=['player_receptions_alternate','player_pass_attempts',
 'player_pass_completions','player_pass_interceptions','player_rush_attempts',
 'player_pass_yds_alternate','player_rush_yds_alternate','player_reception_yds_alternate',
 'player_pass_tds_alternate','player_rush_attempts_alternate','player_pass_attempts_alternate',
 'player_pass_completions_alternate']
# full team names as the API gives them -> nflverse abbreviations used in the schedule
TEAMS={'Arizona Cardinals':'ARI','Atlanta Falcons':'ATL','Baltimore Ravens':'BAL','Buffalo Bills':'BUF',
 'Carolina Panthers':'CAR','Chicago Bears':'CHI','Cincinnati Bengals':'CIN','Cleveland Browns':'CLE',
 'Dallas Cowboys':'DAL','Denver Broncos':'DEN','Detroit Lions':'DET','Green Bay Packers':'GB',
 'Houston Texans':'HOU','Indianapolis Colts':'IND','Jacksonville Jaguars':'JAX','Kansas City Chiefs':'KC',
 'Las Vegas Raiders':'LV','Los Angeles Chargers':'LAC','Los Angeles Rams':'LA','Miami Dolphins':'MIA',
 'Minnesota Vikings':'MIN','New England Patriots':'NE','New Orleans Saints':'NO','New York Giants':'NYG',
 'New York Jets':'NYJ','Philadelphia Eagles':'PHI','Pittsburgh Steelers':'PIT','San Francisco 49ers':'SF',
 'Seattle Seahawks':'SEA','Tampa Bay Buccaneers':'TB','Tennessee Titans':'TEN','Washington Commanders':'WAS'}

def get(path,params,key):
    q=dict(params); q['apiKey']=key
    url=f"{BASE}{path}?{urllib.parse.urlencode(q)}"
    req=urllib.request.Request(url,headers={'User-Agent':'prop-model/1.0'})
    with urllib.request.urlopen(req,timeout=60) as r:
        data=json.loads(r.read().decode('utf-8'))
        used=r.headers.get('x-requests-used'); left=r.headers.get('x-requests-remaining')
        if left is not None: print(f"   credits used {used}, remaining {left}",file=sys.stderr)
        return data

REPRICE_HOURS=12  # a game priced this recently is not bought again unless --force says so
GAMELINE_COLS=['game_id','away_moneyline','home_moneyline','spread_line','away_spread_odds','home_spread_odds','total_line','pulled_at']
def game_lines(key,book,regions,ids,now=None):
    """Moneylines, spreads and totals for the whole slate in one call. The bulk /odds endpoint
    is billed per market per region, not per event, so this is 3 credits for every game
    at once. The total comes with the spread so the page never sets one book's spread beside
    another source's total. Returns rows keyed to the app's game ids, stamped with the pull."""
    data=get('/odds',{'regions':regions,'markets':'h2h,spreads,totals','oddsFormat':'american'},key)
    return game_rows(data,book,ids,now)
def game_rows(data,book,ids,now=None):
    at=(now or datetime.now(timezone.utc)).strftime('%Y-%m-%dT%H:%MZ')
    out=[]
    for ev in data:
        gid=ids.get((TEAMS.get(ev.get('away_team')),TEAMS.get(ev.get('home_team'))))
        if not gid: continue
        away,home=ev.get('away_team'),ev.get('home_team')
        row={'game_id':gid,'pulled_at':at}
        for bk in ev.get('bookmakers',[]):
            if book and bk.get('key')!=book: continue
            for m in bk.get('markets',[]):
                for o in m.get('outcomes',[]):
                    nm,price,point=o.get('name'),o.get('price'),o.get('point')
                    if price is None: continue
                    if m.get('key')=='h2h':
                        row['away_moneyline' if nm==away else 'home_moneyline']=int(price)
                    elif m.get('key')=='spreads' and point is not None:
                        # nflverse's spread_line is positive when the home team is favoured;
                        # the API gives the home side's own handicap, which is negative then
                        if nm==home: row['spread_line']=-float(point); row['home_spread_odds']=int(price)
                        elif nm==away: row['away_spread_odds']=int(price)
                    elif m.get('key')=='totals' and point is not None and nm=='Over':
                        row['total_line']=float(point)
        if len(row)>2: out.append(row)
    return out

def game_ids(pay,week):
    """map (away, home) abbreviations to the app's game ids for the week"""
    return {(g['a'],g['h']):g['id'] for g in pay['sched'] if g['w']==week}

def threshold(point):
    """an Over at 249.5 is the app's 250+ rung; an Over at 250 (integer) is 251+"""
    p=float(point)
    return int(math.floor(p))+1 if p==math.floor(p) else int(math.ceil(p))

def implied(ml): return 100/(ml+100) if ml>0 else abs(ml)/(abs(ml)+100)
def parse_event(ev,gid,mains,alts,book=None):
    """collect prices from one event: every Over/Under at every point goes to
    mains[(gid,player,stat)][point][side]; every Over (and anytime-TD Yes) goes to alts as an X+ rung.
    With book set, only that bookmaker is read, because a best-of-the-market price is not one
    you can actually take and a main line built from one book's over and another's under is not
    a line anybody offers."""
    for bk in ev.get('bookmakers',[]):
        if book and bk.get('key')!=book: continue
        for m in bk.get('markets',[]):
            key=m.get('key',''); alt=key.endswith('_alternate'); base=key[:-10] if alt else key
            stat=MARKETS.get(base)
            if not stat: continue
            for o in m.get('outcomes',[]):
                player=o.get('description') or o.get('participant') or ''
                name=o.get('name',''); price=o.get('price'); point=o.get('point')
                if price is None or not player: continue
                if stat=='any_td':
                    if name=='Yes': alts[(gid,player,stat,1)]=max(alts.get((gid,player,stat,1),-10**9),int(price))
                    continue
                if point is None: continue
                if name=='Over':
                    k=threshold(point)
                    alts[(gid,player,stat,k)]=max(alts.get((gid,player,stat,k),-10**9),int(price))
                # the main line comes from the base market only: both sides, one book, one
                # market. An alternate ladder quotes Overs at its own points and letting
                # those into mains can hand back a main line no book actually posts.
                if name in ('Over','Under') and not alt:
                    mains[(gid,player,stat)][float(point)][name].append(int(price))
def main_from_ladder(pts):
    """the main line is the point where the best over and best under are closest to even"""
    best=None
    for point,sides in pts.items():
        if not sides['Over'] or not sides['Under']: continue
        ov,un=max(sides['Over']),max(sides['Under'])
        gap=abs(implied(ov)-implied(un))
        if best is None or gap<best[0]: best=(gap,point,ov,un)
    return best
def merge_csv(path,header,keyfn,rows,drop=None):
    """write rows over an existing file: keep old rows whose key is not being replaced.
    drop is a set of game_ids to clear out first. A pull covers a whole game, so any
    rung it does not quote is one this book does not offer, and leaving the previous
    pull's row there would mix two books' prices in one file."""
    old={}
    if os.path.exists(path):
        with open(path,newline='',encoding='utf-8') as f:
            for r in csv.DictReader(f):
                if drop and r.get('game_id') in drop: continue
                old[keyfn(r)]=r
    for r in rows: old[keyfn(r)]={k:str(v) for k,v in r.items()}
    with open(path,'w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=header,extrasaction='ignore'); w.writeheader()
        for r in old.values(): w.writerow(r)
    return len(old)
def merge_lines(path,rows,done):
    """the main lines, game by game: a game this pull priced replaces that game's rows, and a
    row written before the lines carried their game is dropped once the same player and stat
    come back with one"""
    new={(r['stat'],r['player']) for r in rows}
    old=[]
    if os.path.exists(path):
        with open(path,newline='',encoding='utf-8') as f:
            for r in csv.DictReader(f):
                gid=(r.get('game_id') or '').strip()
                if gid in done or (not gid and (r['stat'],r['player']) in new): continue
                old.append(r)
    out=old+[{k:str(v) for k,v in r.items()} for r in rows]
    with open(path,'w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=['game_id','stat','player','line','over','under'],extrasaction='ignore'); w.writeheader()
        for r in out: w.writerow(r)
    return len(out)
def read_priced(path='priced_at.json'):
    try: return json.load(open(path,encoding='utf-8'))
    except Exception: return {}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--week',type=int); ap.add_argument('--events',action='store_true')
    ap.add_argument('--sample',help='a saved event-odds JSON (list of events) to parse instead of calling the API')
    ap.add_argument('--regions',default='us'); ap.add_argument('--no-game-lines',action='store_true',help='skip the moneyline, spread and total pull (saves 3 credits for the whole slate)'); ap.add_argument('--book',default='draftkings',help="only this bookmaker's prices; 'all' for the best across the market, which you cannot actually bet"); ap.add_argument('--full',action='store_true',help='also pull the alternate ladders and attempts, completions, interceptions, carries (18 credits a game)')
    ap.add_argument('--teams',help='comma-separated abbreviations; only games involving them (e.g. NE,SEA for the Thursday game)')
    ap.add_argument('--hours',type=float,help='only games kicking off within this many hours (weekly.py passes the hours to the next scheduled pull)')
    ap.add_argument('--missing',action='store_true',help='only games with no prices in prices_wk{W}.csv that have not kicked off; nothing else is spent')
    ap.add_argument('--force',action='store_true',help=f'price a game even if it was priced less than {REPRICE_HOURS} hours ago')
    ap.add_argument('--now',help='pretend it is this UTC time (ISO), for testing the windows on saved events')
    ap.add_argument('--sample-gamelines',help='a saved /odds response to read the game lines from instead of calling the API')
    a=ap.parse_args()
    pay=json.load(open('payload.json',encoding='utf-8'))
    key=os.environ.get('ODDS_API_KEY')
    if a.sample:
        events=json.load(open(a.sample,encoding='utf-8'))
    else:
        if not key: sys.exit('set ODDS_API_KEY in the environment first (a free key from the-odds-api.com, with hyphens)')
        events=get('/events',{},key)
        print(f"{len(events)} upcoming events")
        if a.events:
            for e in events: print(f"  {e['commence_time'][:16]}  {e['away_team']} at {e['home_team']}  id {e['id']}")
            return
    if not a.week: sys.exit('--week W is required to write files')
    ids=game_ids(pay,a.week)
    if a.teams:
        want={t.strip().upper() for t in a.teams.split(',')}
        ids={k:v for k,v in ids.items() if k[0] in want or k[1] in want}
        print(f"limiting to {len(ids)} game(s) involving {', '.join(sorted(want))}")
    mains=collections.defaultdict(lambda: collections.defaultdict(lambda: collections.defaultdict(list)))
    alts={}; matched=0
    now=datetime.fromisoformat(a.now.replace('Z','+00:00')) if a.now else datetime.now(timezone.utc)
    book=None if a.book=='all' else a.book
    have=set()
    if a.missing and os.path.exists(f'prices_wk{a.week}.csv'):
        with open(f'prices_wk{a.week}.csv',newline='',encoding='utf-8') as f: have={r['game_id'] for r in csv.DictReader(f)}
    priced=read_priced()
    for ev in events:
        gid=ids.get((TEAMS.get(ev.get('away_team')),TEAMS.get(ev.get('home_team'))))
        if not gid: continue
        try: ko=datetime.fromisoformat(str(ev.get('commence_time','')).replace('Z','+00:00'))
        except ValueError: ko=None
        if a.hours and ko and (ko-now).total_seconds()>a.hours*3600: continue
        # never a game that has started, in any mode: its prices would be in-play ones
        if ko and ko<=now: print(f"   {gid}: kicked off {ko:%a %H:%M} UTC, not priced"); continue
        if a.missing and gid in have: continue
        last=priced.get(gid)
        if last and not a.force:
            try: age=(now-datetime.fromisoformat(last.replace('Z','+00:00'))).total_seconds()/3600
            except ValueError: age=None
            if age is not None and 0<=age<REPRICE_HOURS:
                print(f"   {gid}: priced {age:.1f}h ago, not bought again (--force to)"); continue
        matched+=1
        if a.sample: parse_event(ev,gid,mains,alts,book); continue
        for markets in ([DEFAULT] + ([FULL_EXTRA] if a.full else [])):
            try:
                data=get(f"/events/{ev['id']}/odds",{'regions':a.regions,'markets':','.join(markets),'oddsFormat':'american'},key)
                parse_event(data,gid,mains,alts,book)
            except urllib.error.HTTPError as err:
                body=err.read().decode('utf-8','replace')[:300]
                print(f"   {gid}: HTTP {err.code} for {len(markets)} markets ({body}); retrying one market at a time",file=sys.stderr)
                for mk in markets:
                    try:
                        data=get(f"/events/{ev['id']}/odds",{'regions':a.regions,'markets':mk,'oddsFormat':'american'},key)
                        parse_event(data,gid,mains,alts,book)
                    except urllib.error.HTTPError as e2:
                        print(f"   {gid}: {mk} not available ({e2.code})",file=sys.stderr)
    print(f"{matched} of {len(ids)} week-{a.week} games matched to API events")
    # main lines: the point where over and under are closest to even, best price each side
    lines=[]
    for (gid,player,stat),pts in mains.items():
        if stat=='any_td': continue
        m=main_from_ladder(pts)
        if m: lines.append({'game_id':gid,'stat':stat,'player':player,'line':m[1],'over':m[2],'under':m[3]})
    prices=[{'game_id':gid,'player':player,'market':stat,'threshold':k,'odds':price} for (gid,player,stat,k),price in sorted(alts.items())]
    done={p['game_id'] for p in prices}|{l['game_id'] for l in lines}
    n=merge_lines(f'wk{a.week}_lines.csv',lines,done)
    print(f"wk{a.week}_lines.csv: {len(lines)} main lines from this pull, {n} in the file")
    # the slate's game lines only with a game: a pull that prices nothing spends nothing
    if not a.no_game_lines and matched and (key or a.sample_gamelines):
        try:
            gl=game_rows(json.load(open(a.sample_gamelines,encoding='utf-8')),book,ids,now) if a.sample_gamelines else game_lines(key,book,a.regions,ids,now)
            n=merge_csv(f'gamelines_wk{a.week}.csv',GAMELINE_COLS,lambda r:r['game_id'],gl,{r['game_id'] for r in gl})
            print(f"gamelines_wk{a.week}.csv: {len(gl)} games from this pull, {n} in the file")
        except Exception as e:
            print(f"   game lines not pulled: {e}",file=sys.stderr)
    n=merge_csv(f'prices_wk{a.week}.csv',['game_id','player','market','threshold','odds'],lambda r:(r['game_id'],r['player'],r['market'],str(r['threshold'])),prices,done)
    print(f"prices_wk{a.week}.csv: {len(prices)} threshold prices from this pull, {n} in the file (weekly.py bakes it into the payload)")
    if done:
        stamp=now.strftime('%Y-%m-%dT%H:%MZ')
        for gid in done: priced[gid]=stamp
        json.dump(dict(sorted(priced.items())),open('priced_at.json','w',encoding='utf-8'),indent=0)
    print(f"next: weekly.py matches wk{a.week}_lines.csv onto the players (mktbuild.py) and bakes the payload")

if __name__=='__main__': main()
