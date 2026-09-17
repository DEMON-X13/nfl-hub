"""Swap the ladders for main lines, and pull DraftKings' own game lines.

Measured on Detroit at Buffalo, of the 18 legs that cleared the suggestion bar,
15 were main lines and 3 were ladder rungs. The ladders cost three of the seven
credits a game and carry a much fatter hold, so the model rarely beats them. The
three alternate markets come out and two main markets nobody had a real price for
go in: receptions, and passing touchdowns.

Game lines come from a different endpoint. Player props need /events/{id}/odds,
billed per market per region per event. Moneylines and spreads come from the bulk
/odds endpoint, billed per market per region for the whole slate -- 2 credits for
every game at once, not 2 a game. That is why they are worth having at
DraftKings' own numbers even on a free tier.

Worst five-week window: 6 player markets x 73 games + 2 x 3 pulls x 5 weeks = 468
of 500.
"""
from pathlib import Path

HERE = Path(__file__).parent
O = HERE.parent / 'data' / 'oddsfetch.py'
W = HERE / 'weekly.py'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---- the market set ----
sub1(O, """# default pull, 7 credits a game. Live check 2026-09-13: the alternate markets carry Over prices
# only, so the main line (both sides, needed for anchoring) has to come from the base market.
DEFAULT=['player_pass_yds','player_rush_yds','player_reception_yds',
 'player_pass_yds_alternate','player_rush_yds_alternate','player_reception_yds_alternate',
 'player_anytime_td']""",
     """# Default pull, 6 credits a game, all main lines plus anytime touchdown. The three
# alternate ladders were dropped on 2026-09-17: on Detroit at Buffalo they supplied 3
# of the 18 legs that cleared the suggestion bar while costing 3 of 7 credits, because
# a rung carries far more hold than a main line and the model rarely beats it. The
# rungs are still shown on the page at the model's own estimate; they just cannot be
# picked by a suggestion, which is the honest outcome without a real price.
DEFAULT=['player_pass_yds','player_rush_yds','player_reception_yds',
 'player_receptions','player_pass_tds','player_anytime_td']""")
sub1(O, """FULL_EXTRA=['player_receptions','player_receptions_alternate','player_pass_tds','player_pass_attempts',
 'player_pass_completions','player_pass_interceptions','player_rush_attempts',
 'player_pass_tds_alternate','player_rush_attempts_alternate','player_pass_attempts_alternate',
 'player_pass_completions_alternate']""",
     """FULL_EXTRA=['player_receptions_alternate','player_pass_attempts',
 'player_pass_completions','player_pass_interceptions','player_rush_attempts',
 'player_pass_yds_alternate','player_rush_yds_alternate','player_reception_yds_alternate',
 'player_pass_tds_alternate','player_rush_attempts_alternate','player_pass_attempts_alternate',
 'player_pass_completions_alternate']""")

# ---- game lines, from the bulk endpoint ----
sub1(O, "def game_ids(pay,week):",
     '''def game_lines(key,book,regions,ids):
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
                        if nm==home: row['spread_line']=float(point); row['home_spread_odds']=int(price)
                        elif nm==away: row['away_spread_odds']=int(price)
        if len(row)>1: out.append(row)
    return out

def game_ids(pay,week):''')

sub1(O, """    ap.add_argument('--regions',default='us'); ap.add_argument('--book',default='draftkings',""",
     """    ap.add_argument('--regions',default='us'); ap.add_argument('--no-game-lines',action='store_true',help='skip the moneyline and spread pull (saves 2 credits for the whole slate)'); ap.add_argument('--book',default='draftkings',""")

sub1(O, """    prices=[{'game_id':gid,'player':player,'market':stat,'threshold':k,'odds':price} for (gid,player,stat,k),price in sorted(alts.items())]""",
     """    if not a.no_game_lines and not a.sample and key:
        try:
            gl=game_lines(key,book,a.regions,ids)
            n=merge_csv(f'gamelines_wk{a.week}.csv',
                        ['game_id','away_moneyline','home_moneyline','spread_line','away_spread_odds','home_spread_odds'],
                        lambda r:r['game_id'],gl,{r['game_id'] for r in gl})
            print(f"gamelines_wk{a.week}.csv: {len(gl)} games from this pull, {n} in the file")
        except Exception as e:
            print(f"   game lines not pulled: {e}",file=sys.stderr)
    prices=[{'game_id':gid,'player':player,'market':stat,'threshold':k,'odds':price} for (gid,player,stat,k),price in sorted(alts.items())]""")

# ---- bake them over the nflverse numbers ----
sub1(W, """        for k,fn in (('price_pull','pricepull.json'),('credits','credits.json')):""",
     """        # DraftKings' own moneylines and spreads, over the nflverse ones payload.py wrote
        gl={}
        for fn in sorted(os.listdir(DATA)):
            m=re.match(r'gamelines_wk(\\d+)\\.csv$',fn)
            if not m: continue
            with open(os.path.join(DATA,fn),newline='',encoding='utf-8') as f:
                for r in csv.DictReader(f): gl[r['game_id']]=r
        if gl:
            byid={g['id']:g for g in pay['sched']}; hit=0
            for gid,r in gl.items():
                g=byid.get(gid)
                if not g: continue
                for fld,col in (('mla','away_moneyline'),('mlh','home_moneyline'),
                                ('spa','away_spread_odds'),('sph','home_spread_odds'),('sp','spread_line')):
                    v=(r.get(col) or '').strip()
                    if v:
                        try: g[fld]=float(v)
                        except ValueError: pass
                hit+=1
            say(f"  game lines from DraftKings applied to {hit} game(s)")
        for k,fn in (('price_pull','pricepull.json'),('credits','credits.json')):""")

print('markets swapped; DraftKings game lines pulled and baked')
