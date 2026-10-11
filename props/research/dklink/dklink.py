"""A one-off test: can a DraftKings bet-slip link, from the odds API's includeLinks, load a parlay
from a QR code? Pulls tonight's ATL v BAL player props at DraftKings with links and ids (4 markets,
about 4 credits), finds the four legs of the owner's test card, and writes each leg's link, a combined
link for all four and a QR code for each into this folder. Nothing on the site reads any of it."""
import os, sys, json, urllib.request, urllib.parse
import qrcode

BASE = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl'
KEY = os.environ.get('ODDS_API_KEY') or sys.exit('ODDS_API_KEY not set')
OUT = os.path.dirname(os.path.abspath(__file__))
LEGS = [  # player, market, side, line
    ('Jahan Dotson', 'player_receptions', 'Under', 1.5),
    ('Justice Hill', 'player_rush_yds', 'Under', 11.5),
    ('Kyle Pitts', 'player_reception_yds', 'Over', 23.5),
    ('Tyler Huntley', 'player_pass_yds', 'Under', 174.5),
]

def get(path, **q):
    q['apiKey'] = KEY
    with urllib.request.urlopen(f"{BASE}{path}?{urllib.parse.urlencode(q)}", timeout=60) as r:
        print(path, 'credits left', r.headers.get('x-requests-remaining'))
        return json.load(r)

ev = next(e for e in get('/events') if {e['home_team'], e['away_team']} == {'Atlanta Falcons', 'Baltimore Ravens'})
odds = get(f"/events/{ev['id']}/odds", regions='us', bookmakers='draftkings', oddsFormat='american',
           markets=','.join(sorted({l[1] for l in LEGS})), includeLinks='true', includeSids='true')
json.dump(odds, open(os.path.join(OUT, 'raw.json'), 'w'), indent=1)
bk = next((b for b in odds.get('bookmakers', []) if b['key'] == 'draftkings'), None) or sys.exit('no DraftKings book')
print('book link', bk.get('link'), 'sid', bk.get('sid'))

found = []
for name, mkt, side, line in LEGS:
    m = next((m for m in bk['markets'] if m['key'] == mkt), None)
    outs = [o for o in (m or {}).get('outcomes', []) if o.get('description') == name and o['name'] == side]
    o = min(outs, key=lambda o: abs(o.get('point', 0) - line)) if outs else None
    found.append({'leg': f"{name} {side} {line} {mkt}", 'found': bool(o),
                  'point': o and o.get('point'), 'price': o and o.get('price'),
                  'link': o and o.get('link'), 'sid': o and o.get('sid'), 'market_link': m and m.get('link')})
    print(found[-1])

# a combined slip: DraftKings links carry the selection as ?outcomes=<id>; several are joined with '+'
ids, base = [], None
for f in found:
    if f['link'] and 'outcomes=' in f['link']:
        u = urllib.parse.urlsplit(f['link'])
        base = base or urllib.parse.urlunsplit((u.scheme, u.netloc, u.path, '', ''))
        ids.append(urllib.parse.quote(f['sid'], safe=''))  # '#' in an id must stay %23
combined = f"{base}?outcomes={'+'.join(ids)}" if ids else None
print('combined', combined)

def qr(url, fn):
    if url: qrcode.make(url, box_size=10, border=3).save(os.path.join(OUT, fn))
qr(combined, 'qr_all4.png')
for i, f in enumerate(found, 1): qr(f['link'], f'qr_leg{i}.png')
json.dump({'event': ev, 'legs': found, 'combined': combined}, open(os.path.join(OUT, 'links.json'), 'w'), indent=1)
