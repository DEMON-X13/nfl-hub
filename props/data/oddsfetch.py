"""Pull NFL player-prop prices from the-odds-api.com (hyphens) into the two files the app uses.

STATUS: written 2026-09-13 against the documented v4 API; NOT yet run against the live service,
because no key was available. Run --events first, which costs no credits, and check the output.

Usage (never put the key on the command line; the shell history would keep it):
    set ODDS_API_KEY=...            (Windows)      export ODDS_API_KEY=...   (mac/linux)
    python oddsfetch.py --events                    list this week's events, free
    python oddsfetch.py --week 2                    write wk2_lines.csv and prices_wk2.csv
    python oddsfetch.py --week 2 --sample saved.json   parse a saved event response instead (no key)

    python oddsfetch.py --week 2 --teams NE,SEA          only the games those teams play (Thursday)
Outputs (in data/), MERGED into existing files for the week so a Thursday pull and a Saturday
pull add up; a game pulled twice keeps the newer prices:
    wk{W}_lines.csv    stat,player,line,over,under   main lines: the point where over and under are
                       closest to even, best price each side.
                       Feed it to mktbuild.py:  python mktbuild.py W wk{W}_lines.csv "the-odds-api" YYYY-MM-DD
    prices_wk{W}.csv   game_id,player,market,threshold,odds   every Over as the app's X+ rungs.
                       Upload it on the Weekly Update tab as the price sheet for week W.
Credits: one event request costs (markets requested) x (regions); the free tier is 500 a MONTH,
about 115 a week. The default pull is 7 markets a game (main line and ladder for passing,
rushing and receiving yards, plus anytime TD): 7 credits a game, ~112 for a 16-game week split
across a Thursday and a Saturday pull. That is the free tier almost exactly; a month with five
game weeks runs short at the end. --full adds receptions, attempts, completions, TDs,
interceptions and carries at 18 a game, which needs a paid tier. Every call prints what is left.
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

def game_lines(key,book,regions,ids):
    """Moneylines and spreads for the whole slate in one call. The bulk /odds endpoint
    is billed per market per region, not per event, so this is 2 credits for every game
    at once. Returns rows keyed to the app's game ids."""
    data=get('/odds',{'regions':regions,'markets':'h2h,spreads','oddsFormat':'american'},key)
    out=[]
    for ev in data:
        gid=ids.get((TEAMS.get(ev.get('away_team')),TEAMS.get(ev.get('home_team'))))
        if not gid: continue
        away,home=ev.get('away_team'),ev.get('home_team')
        row={'game_id':gid}
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
        if len(row)>1: out.append(row)
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
    mains[(player,stat)][point][side]; every Over (and anytime-TD Yes) goes to alts as an X+ rung.
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
                    mains[(player,stat)][float(point)][name].append(int(price))
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
        w=csv.DictWriter(f,fieldnames=header); w.writeheader()
        for r in old.values(): w.writerow(r)
    return len(old)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--week',type=int); ap.add_argument('--events',action='store_true')
    ap.add_argument('--sample',help='a saved event-odds JSON (list of events) to parse instead of calling the API')
    ap.add_argument('--regions',default='us'); ap.add_argument('--no-game-lines',action='store_true',help='skip the moneyline and spread pull (saves 2 credits for the whole slate)'); ap.add_argument('--book',default='draftkings',help="only this bookmaker's prices; 'all' for the best across the market, which you cannot actually bet"); ap.add_argument('--full',action='store_true',help='also pull attempts, completions, TDs, interceptions, carries (15 credits a game)')
    ap.add_argument('--teams',help='comma-separated abbreviations; only games involving them (e.g. NE,SEA for the Thursday game)')
    ap.add_argument('--hours',type=float,help='only games kicking off within this many hours (36 on Thursday morning, 120 on Saturday)')
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
    now=datetime.now(timezone.utc)
    book=None if a.book=='all' else a.book
    for ev in events:
        gid=ids.get((TEAMS.get(ev.get('away_team')),TEAMS.get(ev.get('home_team'))))
        if not gid: continue
        if a.hours:
            try: ko=datetime.fromisoformat(str(ev.get('commence_time','')).replace('Z','+00:00'))
            except ValueError: ko=None
            if ko and (ko-now).total_seconds()>a.hours*3600: continue
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
    for (player,stat),pts in mains.items():
        if stat=='any_td': continue
        m=main_from_ladder(pts)
        if m: lines.append({'stat':stat,'player':player,'line':m[1],'over':m[2],'under':m[3]})
    n=merge_csv(f'wk{a.week}_lines.csv',['stat','player','line','over','under'],lambda r:(r['stat'],r['player']),lines)
    print(f"wk{a.week}_lines.csv: {len(lines)} main lines from this pull, {n} in the file")
    if not a.no_game_lines and not a.sample and key:
        try:
            gl=game_lines(key,book,a.regions,ids)
            n=merge_csv(f'gamelines_wk{a.week}.csv',
                        ['game_id','away_moneyline','home_moneyline','spread_line','away_spread_odds','home_spread_odds'],
                        lambda r:r['game_id'],gl,{r['game_id'] for r in gl})
            print(f"gamelines_wk{a.week}.csv: {len(gl)} games from this pull, {n} in the file")
        except Exception as e:
            print(f"   game lines not pulled: {e}",file=sys.stderr)
    prices=[{'game_id':gid,'player':player,'market':stat,'threshold':k,'odds':price} for (gid,player,stat,k),price in sorted(alts.items())]
    done={p['game_id'] for p in prices}
    n=merge_csv(f'prices_wk{a.week}.csv',['game_id','player','market','threshold','odds'],lambda r:(r['game_id'],r['player'],r['market'],str(r['threshold'])),prices,done)
    print(f"prices_wk{a.week}.csv: {len(prices)} threshold prices from this pull, {n} in the file (upload on the Weekly Update tab)")
    print(f"next: python mktbuild.py {a.week} wk{a.week}_lines.csv \"{a.book if book else 'best of '+a.regions}\" {datetime.now(timezone.utc).date()}")

if __name__=='__main__': main()
