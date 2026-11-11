#!/usr/bin/env python3
"""Add X's placed parlays to liveparlays/parlays.json from a few short lines of text.

Why: the owner sends a screenshot of each slip, and writing a parlay into the file by hand
(the game's place in the file's games list, each player as the site knows him, the stat's name,
the main-line flag, an id, the payout) was most of the time it took. Now a slip is a few lines,
read from a file or stdin, and this script works out the rest from props/data/payload.json (the
week's schedule and players) and refuses anything it cannot place, so a typo never reaches the
page.

One parlay a block, blocks apart by a blank line. The first line of a block is its head:

    $5 +650                      stake and American price (the payout is worked out)
    $1 +1300 pays 14 w9 note same game · +30% boost

  `pays N` sets the payout where a boost makes it differ from the price, `wN` the week (else the
  payload's current week), `note ...` runs to the end of the line, `id ...` names it.

Then one leg a line:

    Caleb Williams o227.5 pass yds     a main line, over or under (o / u / over / under)
    Bijan Robinson 80+ rush yds        a threshold, N or more (main false)
    Josh Allen td                      anytime touchdown (also: atd, anytime td)
    Josh Allen 2+ td                   two or more touchdowns
    BUF ml                             moneyline (a club code or nickname)
    KC -3.5                            spread (also: KC +3.5, KC -3.5 ats)
    BUF@MIN o44.5                      game total (or: BUF o44.5 total)

  Stats: pass yds, pass td, int, att, comp, rush yds, carries, rec, rec yds, rush+rec yds,
  targets, fg, fg att, kick pts (and the file's own names, passing_yards etc.).

    python3 liveparlays/tools/add.py slip.txt        # prints what it would add, writes nothing
    python3 liveparlays/tools/add.py slip.txt --write
    python3 liveparlays/tools/add.py --clear <id> --write
"""
import argparse, datetime, difflib, json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FILE = os.path.join(ROOT, 'liveparlays', 'parlays.json')
PAYLOAD = os.path.join(ROOT, 'props', 'data', 'payload.json')

NICK = {'ARI': 'Cardinals', 'ATL': 'Falcons', 'BAL': 'Ravens', 'BUF': 'Bills', 'CAR': 'Panthers',
        'CHI': 'Bears', 'CIN': 'Bengals', 'CLE': 'Browns', 'DAL': 'Cowboys', 'DEN': 'Broncos',
        'DET': 'Lions', 'GB': 'Packers', 'HOU': 'Texans', 'IND': 'Colts', 'JAX': 'Jaguars',
        'KC': 'Chiefs', 'LA': 'Rams', 'LAC': 'Chargers', 'LV': 'Raiders', 'MIA': 'Dolphins',
        'MIN': 'Vikings', 'NE': 'Patriots', 'NO': 'Saints', 'NYG': 'Giants', 'NYJ': 'Jets',
        'PHI': 'Eagles', 'PIT': 'Steelers', 'SEA': 'Seahawks', 'SF': '49ers', 'TB': 'Buccaneers',
        'TEN': 'Titans', 'WAS': 'Commanders'}
ALIAS = {'LAR': 'LA', 'WSH': 'WAS', 'JAC': 'JAX', 'NINERS': 'SF'}

STATS = {
    'passing_yards': ['pass yds', 'pass yards', 'passing yards', 'passing yds', 'py'],
    'passing_tds': ['pass td', 'pass tds', 'passing td', 'passing tds'],
    'passing_interceptions': ['int', 'ints', 'interception', 'interceptions'],
    'attempts': ['att', 'atts', 'attempts', 'pass att', 'pass attempts'],
    'completions': ['comp', 'comps', 'completions', 'pass comp'],
    'carries': ['car', 'carries', 'rush att', 'rush attempts'],
    'rushing_yards': ['rush yds', 'rush yards', 'rushing yards', 'rushing yds', 'ry'],
    'receptions': ['rec', 'recs', 'receptions', 'catches'],
    'receiving_yards': ['rec yds', 'rec yards', 'receiving yards', 'receiving yds', 'recy'],
    'scrim_yards': ['rush+rec yds', 'rush + rec yds', 'rush+rec', 'rush+rec yards', 'scrim yds',
                    'scrimmage yards'],
    'targets': ['tgt', 'targets'],
    'fg_made': ['fg', 'fgs', 'fg made', 'field goals', 'field goals made'],
    'fg_att': ['fg att', 'fga', 'field goal attempts'],
    'kick_pts': ['kick pts', 'kicking points', 'kicker points'],
    'any_td': ['td', 'tds', 'atd', 'anytime td', 'anytime touchdown', 'touchdown'],
}
STAT_OF = {}
for k, v in STATS.items():
    STAT_OF[k.replace('_', ' ')] = k
    STAT_OF[k] = k
    for a in v:
        STAT_OF[a] = k


def norm(n):
    n = unicodedata.normalize('NFD', str(n or '').lower())
    n = ''.join(c for c in n if not unicodedata.combining(c))
    n = re.sub(r"[.'’]", '', n).replace('-', ' ')
    n = re.sub(r'\b(jr|sr|ii|iii|iv|v)\b', '', n)
    return re.sub(r'\s+', ' ', n).strip()


class Bad(Exception):
    pass


def club(tok):
    t = tok.strip().upper()
    t = ALIAS.get(t, t)
    if t in NICK:
        return t
    for ab, nm in NICK.items():
        if nm.upper() == t:
            return ab
    return None


class World:
    def __init__(self, pay):
        self.pay = pay
        self.week = int(pay.get('week') or 0)
        self.sched = pay.get('sched') or []
        # the model's players first, then anyone else on an active roster (a leg tracks by his
        # name and club on ESPN's box score, so he need not be one the model projects)
        self.players = list(pay.get('players') or [])
        have = {p['id'] for p in self.players}
        self.off = {}
        for pid, r in (pay.get('roster') or {}).items():
            if pid in have or not isinstance(r, list) or len(r) < 3:
                continue
            if r[1] == 'ACT':
                self.players.append({'id': pid, 'n': r[2], 't': r[0]})
            else:
                self.off[norm(r[2])] = (r[2], r[0], r[1])

    def game(self, week, team):
        for g in self.sched:
            if int(g.get('w') or 0) == week and team in (g.get('a'), g.get('h')):
                return g
        raise Bad(f'{team} has no game in week {week}')

    def player(self, name, week):
        playing = {t for g in self.sched if int(g.get('w') or 0) == week for t in (g['a'], g['h'])}
        pool = [p for p in self.players if p.get('t') in playing]
        nm = norm(name)
        hit = [p for p in pool if norm(p['n']) == nm]
        if not hit:  # last name and first initial, as the page's nameKey reads
            parts = nm.split()
            if len(parts) >= 2:
                hit = [p for p in pool if norm(p['n']).split()[-1:] == parts[-1:]
                       and norm(p['n'])[:1] == parts[0][:1]]
        if len(hit) == 1:
            return hit[0]
        if len(hit) > 1:
            raise Bad(f'"{name}" is more than one player: ' + ', '.join(f"{p['n']} ({p['t']})" for p in hit))
        if nm in self.off:
            n, t, st = self.off[nm]
            why = {'RES': 'a reserve list', 'CUT': 'no roster (released)', 'INA': 'the inactive list',
                   'DEV': 'the practice squad'}.get(st, f'status {st}')
            raise Bad(f'{n} ({t}) is on {why}, not an active roster: check the slip')
        close = difflib.get_close_matches(nm, [norm(p['n']) for p in pool], n=3, cutoff=0.7)
        sug = [p['n'] + ' (' + p['t'] + ')' for p in pool if norm(p['n']) in close]
        raise Bad(f'no player "{name}" in week {week}' + (f'; did you mean {", ".join(sug)}?' if sug else ''))


HEAD = re.compile(r'^\$\s*(?P<stake>\d+(?:\.\d+)?)\s+(?P<price>[+-]\d+)(?P<rest>.*)$')


def parse_head(line, world):
    m = HEAD.match(line.strip())
    if not m:
        raise Bad(f'a parlay starts with its stake and price, like "$5 +650": got "{line}"')
    stake, price, rest = float(m['stake']), int(m['price']), m['rest']
    out = {'stake': stake, 'price': price, 'week': world.week, 'note': None, 'id': None, 'payout': None}
    nm = re.search(r'\bnote\s+(.*)$', rest)
    if nm:
        out['note'] = nm.group(1).strip()
        rest = rest[:nm.start()]
    for tok in re.findall(r'pays\s+\$?\d+(?:\.\d+)?|w\d+|id\s+\S+', rest):
        if tok.startswith('pays'):
            out['payout'] = float(re.sub(r'[^\d.]', '', tok))
        elif tok.startswith('id'):
            out['id'] = tok.split(None, 1)[1]
        else:
            out['week'] = int(tok[1:])
    if out['payout'] is None:
        dec = 1 + (price / 100 if price > 0 else 100 / -price)
        out['payout'] = round(stake * dec, 2)
    return out


def num(s):
    v = float(s)
    return int(v) if v == int(v) else v


def parse_leg(line, world, week):
    s = re.sub(r'\s+', ' ', line.strip())
    low = s.lower()
    # game total: BUF@MIN o44.5  /  BUF o44.5 total
    m = re.match(r'^(\S+)\s*(?:@|at|vs\.?)\s*(\S+)\s+(o|u|over|under)\s*(\d+(?:\.\d+)?)$', low)
    if m and club(m[1]) and club(m[2]):
        g = world.game(week, club(m[1]))
        return g, {'player': f"{NICK[g['a']]} at {NICK[g['h']]}", 'team': g['h'], 'stat': 'total',
                   'line': num(m[4]), 'side': 'under' if m[3][0] == 'u' else 'over', 'main': True}
    m = re.match(r'^(\S+)\s+(o|u|over|under)\s*(\d+(?:\.\d+)?)\s+(?:total|game total|pts)$', low)
    if m and club(m[1]):
        g = world.game(week, club(m[1]))
        return g, {'player': f"{NICK[g['a']]} at {NICK[g['h']]}", 'team': g['h'], 'stat': 'total',
                   'line': num(m[3]), 'side': 'under' if m[2][0] == 'u' else 'over', 'main': True}
    # moneyline / spread
    m = re.match(r'^(\S+)\s+(?:ml|moneyline|to win|win)$', low)
    if m and club(m[1]):
        t = club(m[1])
        g = world.game(week, t)
        return g, {'player': NICK[t], 'team': t, 'stat': 'ml', 'line': 0, 'side': 'over', 'main': False}
    m = re.match(r'^(\S+)\s+([+-]\d+(?:\.\d+)?)(?:\s+(?:ats|spread))?$', low)
    if m and club(m[1]):
        t = club(m[1])
        g = world.game(week, t)
        return g, {'player': NICK[t], 'team': t, 'stat': 'ats', 'line': num(m[2]), 'side': 'over', 'main': True}
    # player legs
    m = re.match(r'^(?P<name>.+?)\s+(?P<side>o|u|over|under)\s*(?P<k>\d+(?:\.\d+)?)\s+(?P<stat>.+)$', s, re.I)
    if m:
        side, k, stat, main = ('under' if m['side'][0].lower() == 'u' else 'over'), num(m['k']), m['stat'], True
    else:
        m = re.match(r'^(?P<name>.+?)\s+(?P<k>\d+)\s*\+\s*(?P<stat>.+)$', s)
        if m:
            side, k, stat, main = 'over', int(m['k']), m['stat'], False
        else:
            m = re.match(r'^(?P<name>.+?)\s+(?P<stat>td|tds|atd|anytime td|anytime touchdown|touchdown)$', s, re.I)
            if not m:
                raise Bad(f'cannot read the leg "{line}"')
            side, k, stat, main = 'over', 1, 'td', False
    st = STAT_OF.get(stat.lower().strip())
    if not st:
        raise Bad(f'unknown stat "{stat}" in "{line}"')
    if st == 'any_td':
        main = False
        side = 'over'
    if main and isinstance(k, int):
        raise Bad(f'"{line}": a main line is a half point (o227.5); write "{k}+" for {k} or more')
    p = world.player(m['name'], week)
    g = world.game(week, p['t'])
    return g, {'player': p['n'], 'team': p['t'], 'stat': st, 'line': k, 'side': side, 'main': main}


def slug(g):
    return (g['a'] + g['h']).lower()


def parse(text, world, data):
    blocks = [b for b in re.split(r'\n\s*\n', text.strip()) if b.strip()]
    used = {p.get('id') for p in data['parlays']}
    out = []
    for b in blocks:
        lines = [ln for ln in b.splitlines() if ln.strip() and not ln.strip().startswith('#')]
        head = parse_head(lines[0], world)
        legs = [parse_leg(ln, world, head['week']) for ln in lines[1:]]
        if not legs:
            raise Bad(f'"{lines[0]}" has no legs')
        seen = set()
        for _, l in legs:
            key = (l['player'], l['stat'], l['side'])
            if key in seen:
                raise Bad(f"{l['player']} {l['stat']} is in the parlay twice")
            seen.add(key)
        gids = []
        for g, _ in legs:
            if g['id'] not in gids:
                gids.append(g['id'])
        pid = head['id']
        if not pid:
            base = f"w{head['week']}-dk-" + (slug([g for g, _ in legs][0]) if len(gids) == 1 else 'mix') + f'-{len(legs)}'
            pid, n = base, 2
            while pid in used:
                pid, n = f'{base}-{n}', n + 1
        if pid in used:
            raise Bad(f'id {pid} is already in the file')
        used.add(pid)
        p = {'id': pid, 'week': head['week'], 'stake': num(head['stake']), 'price': head['price'],
             'payout': num(head['payout'])}
        if head['note']:
            p['note'] = head['note']
        p['legs'] = [(g['id'], l) for g, l in legs]
        out.append(p)
    return out


def merge(data, parlays):
    games = data['games']
    for p in parlays:
        legs = []
        for gid, l in p['legs']:
            if gid not in games:
                games.append(gid)
            legs.append(dict(game=games.index(gid), **l))
        p['legs'] = legs
        data['parlays'].append(p)


def show(p, games):
    print(f"{p['id']}: week {p['week']}, ${p['stake']} at {p['price']:+d}, pays ${p['payout']}"
          + (f" ({p['note']})" if p.get('note') else ''))
    for l in p['legs']:
        gid = games[l['game']]
        if l['stat'] in ('ml',):
            what = 'to win'
        elif l['stat'] == 'ats':
            what = f"{l['line']:+g}"
        elif l['stat'] == 'any_td':
            what = 'anytime TD' if l['line'] == 1 else f"{l['line']}+ TD"
        elif l['main']:
            what = f"{l['side']} {l['line']} {l['stat']}"
        else:
            what = f"{l['line']}+ {l['stat']}"
        print(f"  {l['player']} ({l['team']}, {gid}): {what}")


def write(data):
    data['updated'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    with open(FILE + '.tmp', 'w', encoding='utf-8') as f:
        f.write(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
    os.replace(FILE + '.tmp', FILE)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('slip', nargs='?', help='a text file of parlays (- or nothing for stdin)')
    ap.add_argument('--write', action='store_true', help='write the file (else only show what it would add)')
    ap.add_argument('--clear', nargs='+', metavar='ID', help='mark these parlays cleared')
    a = ap.parse_args()
    data = json.load(open(FILE, encoding='utf-8'))
    try:
        if a.clear:
            ids = {p['id'] for p in data['parlays']}
            for i in a.clear:
                if i not in ids:
                    raise Bad(f'no parlay {i}')
            today = datetime.date.today().isoformat()
            for p in data['parlays']:
                if p['id'] in a.clear and not p.get('cleared'):
                    p.update(cleared=True, cleared_on=today, cleared_by='hand')
                    print('cleared', p['id'])
        else:
            text = sys.stdin.read() if not a.slip or a.slip == '-' else open(a.slip, encoding='utf-8').read()
            world = World(json.load(open(PAYLOAD, encoding='utf-8')))
            new = parse(text, world, data)
            merge(data, new)
            for p in new:
                show(p, data['games'])
    except Bad as e:
        print('refused:', e, file=sys.stderr)
        sys.exit(1)
    if a.write:
        write(data)
        print('written', os.path.relpath(FILE, ROOT))
    else:
        print('(not written: add --write)')


if __name__ == '__main__':
    main()
