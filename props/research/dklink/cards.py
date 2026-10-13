"""The one-off link test, round two: DraftKings bet-slip links for the owner's four test cards
(legs.json). Game lines come from one bulk call (2 credits); each prop from its game's event call,
only the markets that game's legs need (about 7 credits). Writes cards.json; nothing reads it."""
import os, sys, json, urllib.request, urllib.parse
BASE = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl'
KEY = os.environ.get('ODDS_API_KEY') or sys.exit('ODDS_API_KEY not set')
OUT = os.path.dirname(os.path.abspath(__file__))
CARDS = json.load(open(os.path.join(OUT, 'legs.json')))
def get(path, **q):
    q.update(apiKey=KEY, regions='us', bookmakers='draftkings', oddsFormat='american', includeLinks='true', includeSids='true')
    with urllib.request.urlopen(f"{BASE}{path}?{urllib.parse.urlencode(q)}", timeout=60) as r:
        print(path, q.get('markets'), 'credits left', r.headers.get('x-requests-remaining')); return json.load(r)
games = get('/odds', markets='h2h,spreads')
TEAMS = {t for g in games for t in (g['home_team'], g['away_team'])}
def game_of(team): return next(g for g in games if team in (g['home_team'], g['away_team']))
# props: which players' games? find via event odds per needed market; the player's game is found by trying events
props = [l for c in CARDS.values() for l in c if l[1].startswith('player_')]
need = {}  # event id -> markets
ev_hint = {'Emanuel Wilson':'Seattle Seahawks','Jared Goff':'Detroit Lions','Omarion Hampton':'Los Angeles Chargers',
 'Tory Horton':'Seattle Seahawks','Cam Ward':'Tennessee Titans','Kevin Coleman Jr.':'Miami Dolphins',
 'Malik Washington':'Miami Dolphins','MarShawn Lloyd':'Green Bay Packers','Quinshon Judkins':'Cleveland Browns'}
for p in props: need.setdefault(game_of(ev_hint[p[0]])['id'], set()).add(p[1])
evodds = {eid: get(f'/events/{eid}/odds', markets=','.join(sorted(m))) for eid, m in need.items()}
def find(name, mkt, side, line):
    if mkt.startswith('player_'):
        bk = evodds[game_of(ev_hint[name])['id']]['bookmakers']
    else:
        bk = game_of(name)['bookmakers']
    m = next((m for b in bk for m in b['markets'] if m['key'] == mkt), None)
    outs = [o for o in (m or {}).get('outcomes', []) if (o.get('description') == name and o['name'] == side) if mkt.startswith('player_')] \
        if mkt.startswith('player_') else [o for o in (m or {}).get('outcomes', []) if o['name'] == name]
    if not outs: return None
    return min(outs, key=lambda o: abs((o.get('point') or 0) - (line or 0)))
res = {}
for card, legs in CARDS.items():
    rows = []
    for name, mkt, side, line in legs:
        o = find(name, mkt, side, line)
        rows.append({'leg': [name, mkt, side, line], 'point': o and o.get('point'), 'price': o and o.get('price'), 'sid': o and o.get('sid')})
        print(card, rows[-1])
    ids = [urllib.parse.quote(r['sid'], safe='') for r in rows if r['sid']]
    res[card] = {'legs': rows, 'link': 'https://sportsbook.draftkings.com/?outcomes=' + '+'.join(ids)}
json.dump(res, open(os.path.join(OUT, 'cards.json'), 'w'), indent=1)
