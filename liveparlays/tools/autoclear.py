"""Clear X's finished parlays from X Parlays the day after their last game.

    python liveparlays/tools/autoclear.py --games data/games.csv [--file liveparlays/parlays.json] [--today YYYY-MM-DD]

The owner's call (October 2026): a finished parlay stays on X Parlays, in full, on its game day and
the whole of the next day, then clears itself, on every device. This marks it in the file the way
Claude marks one by hand, "cleared": true, so it stays in the file as history and the page neither
draws it nor reads its games; "cleared_on" (the Eastern date) and "cleared_by": "auto" say when and
how, and nothing reads them.

A parlay is cleared when every one of its games has a final score in nflverse's games.csv (both
scores filled) and the day of its last game (games.csv's gameday, an Eastern date) is two or more
days before today in US Eastern time: a Sunday game's parlays clear on Tuesday, a Monday night's on
Wednesday, a Thursday's on Saturday. Nothing else is touched: a parlay already cleared, one with a
game that has no final yet, a game games.csv does not list, or a leg pointing at no game stays as it
is. The file is written only when a parlay was cleared, in its own style (json.dumps, one-space
indent, characters as they are), with "updated" moved to now, since that is when the page's list changed.

Run by the betting job (.github/workflows/update.yml) after update.js has downloaded games.csv;
test_autoclear.py beside it is its test.
"""
import argparse
import csv
import datetime as dt
import json
import sys
from zoneinfo import ZoneInfo

ET = ZoneInfo('America/New_York')


def finals(games_csv):
    """game_id -> (gameday as a date, final or not), from games.csv"""
    out = {}
    with open(games_csv, newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            gid = (r.get('game_id') or '').strip()
            if not gid:
                continue
            try:
                day = dt.date.fromisoformat((r.get('gameday') or '').strip())
            except ValueError:
                continue
            done = bool((r.get('home_score') or '').strip()) and bool((r.get('away_score') or '').strip())
            out[gid] = (day, done)
    return out


def to_clear(doc, fin, today):
    """the ids of the parlays to clear today, in the file's order"""
    games = doc.get('games') if isinstance(doc.get('games'), list) else []
    ids = []
    for p in doc.get('parlays') or []:
        if not isinstance(p, dict) or p.get('cleared') is True:
            continue
        legs = p.get('legs') if isinstance(p.get('legs'), list) else []
        if not legs:
            continue
        days = []
        for leg in legs:
            ix = leg.get('game') if isinstance(leg, dict) else None
            gid = games[ix] if isinstance(ix, int) and 0 <= ix < len(games) else None
            g = fin.get(gid)
            if not g or not g[1]:
                days = None
                break
            days.append(g[0])
        if days and (today - max(days)).days >= 2:
            ids.append(p.get('id'))
    return ids


def apply(doc, ids, today, now):
    for p in doc.get('parlays') or []:
        if isinstance(p, dict) and p.get('id') in ids and p.get('cleared') is not True:
            p['cleared'] = True
            p['cleared_on'] = today.isoformat()
            p['cleared_by'] = 'auto'
    doc['updated'] = now
    return doc


def dumps(doc):
    return json.dumps(doc, indent=1, ensure_ascii=False) + '\n'


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--games', required=True)
    ap.add_argument('--file', default='liveparlays/parlays.json')
    ap.add_argument('--today', help='the Eastern date to judge by (tests)')
    a = ap.parse_args(argv)
    now = dt.datetime.now(dt.timezone.utc)
    today = dt.date.fromisoformat(a.today) if a.today else now.astimezone(ET).date()
    with open(a.file, encoding='utf-8') as f:
        text = f.read()
    doc = json.loads(text)
    ids = to_clear(doc, finals(a.games), today)
    if not ids:
        print('autoclear: nothing to clear')
        return 0
    apply(doc, set(ids), today, now.strftime('%Y-%m-%dT%H:%M:%SZ'))
    with open(a.file, 'w', encoding='utf-8') as f:
        f.write(dumps(doc))
    print(f'autoclear: cleared {len(ids)}: ' + ', '.join(str(i) for i in ids))
    return 0


if __name__ == '__main__':
    sys.exit(main())
