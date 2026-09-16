"""How much of the odds-API allowance is gone, and how much is left.

    python credits.py            prints the balance and writes data/credits.json

Every the-odds-api response carries x-requests-used and x-requests-remaining. The
sports list at /v4/sports is documented as not counting against the quota, so this
reads the balance without spending anything: run it as often as you like. The check
is the proof, not the claim -- the "used" figure it reports does not move between
two runs back to back.

Needs ODDS_API_KEY in the environment. Prints nothing sensitive: never the key.
"""
import os, sys, json, urllib.request, urllib.parse, urllib.error, datetime

URL = 'https://api.the-odds-api.com/v4/sports'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'credits.json')


def check(key):
    req = urllib.request.Request(f'{URL}?apiKey={urllib.parse.quote(key)}',
                                 headers={'User-Agent': 'prop-model/1.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        used = r.headers.get('x-requests-used')
        left = r.headers.get('x-requests-remaining')
        if used is None and left is None:
            raise RuntimeError('no quota headers on the response')
        return (int(used) if used is not None else None,
                int(left) if left is not None else None)


def main():
    key = os.environ.get('ODDS_API_KEY')
    if not key:
        print('ODDS_API_KEY is not set in this environment; balance not checked', file=sys.stderr)
        return 1
    try:
        used, left = check(key)
    except urllib.error.HTTPError as e:
        print(f'odds API said HTTP {e.code}; balance not checked', file=sys.stderr)
        return 1
    except Exception as e:
        print(f'could not reach the odds API ({e}); balance not checked', file=sys.stderr)
        return 1
    rec = {'at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M'),
           'used': used, 'left': left}
    json.dump(rec, open(OUT, 'w', encoding='utf-8'), indent=1)
    total = (used + left) if (used is not None and left is not None) else None
    print(f"credits used {used}, remaining {left}" + (f" of {total} this month" if total else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())
