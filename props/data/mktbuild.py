"""The book's main lines onto the players they belong to: wk{W}_lines.csv -> payload.json mkt[W].

weekly.py rebuilds every week's table from its lines file on every run (it costs nothing), so a
fix to the matching reaches the weeks already played as well as the coming one. A line is matched
only among the players of its own game (build/names.py: the season's roster, rookies included,
and the team each played for that week), never league-wide on a surname and an initial. Each
entry keeps the book's name (`n`) and the game (`g`) beside the price, so the audit can check
every line the page shows belongs to the player it is shown on.

Lines files written before the lines carried their game (weeks 1-5 of 2026) find it in the same
week's prices file, which has the game on every row; a name the prices do not place is matched
only exactly among the players who played that week.

Only this season's games are baked. The files are named by week alone, so at a rollover last
season's wk5_lines.csv sits where this season's week 5 will be: a row whose game is another
season's is dropped, never matched onto this season's game of the same week, and a row with no
game at all is trusted only when every game in its week's files is this season's.

By hand, from data/ (no credits; rewrites one week of payload.json):
    python mktbuild.py W wk{W}_lines.csv "DraftKings via the-odds-api" YYYY-MM-DD
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'build'))
import names  # noqa: E402


def build_week(week, lines, prices, pool, open_games=(), games=None):
    """{pid: {stat: {line, over, under, n, g}}}, plus what could not be placed.

    prices: the week's whole prices file, other seasons' rows included, so a name priced only in
    last season's game resolves to that game and is dropped rather than left without one.
    games: this season's game ids (None: every game the pool knows).
    problems: names on a game still to be played that matched nobody or more than one player
    (weekly.py reports them, so a run goes red rather than a line going missing quietly).
    notes: the same for games already played, and lines two rows gave the same player.
    how counts the rows by outcome; 'another season' is the rows dropped for their game."""
    where = names.game_of(prices)
    ids = {(r.get('game_id') or '').strip() for r in list(prices) + list(lines)} - {''}
    legacy_ok = games is None or (bool(ids) and ids <= set(games))
    out, problems, notes, how = {}, [], [], {}
    for r in lines:
        book = (r.get('player') or '').strip()
        if not book or names.is_team_row(book): continue
        gid = (r.get('game_id') or '').strip() or where.get(book)
        if games is not None and ((gid and gid not in games) or (not gid and not legacy_ok)):
            how['another season'] = how.get('another season', 0) + 1
            continue
        pid, h = pool.match(book, week, gid)
        how[h] = how.get(h, 0) + 1
        if not pid:
            msg = f"week {week} line {book} ({r.get('stat')}{', ' + gid if gid else ''}): {h}"
            (problems if gid in open_games else notes).append(msg)
            continue
        try:
            e = {'line': float(r['line']), 'over': int(float(r['over'])), 'under': int(float(r['under'])),
                 'n': book, 'g': gid or None}
        except (KeyError, ValueError):
            notes.append(f"week {week} line {book} {r.get('stat')}: unreadable price"); continue
        cur = out.setdefault(pid, {}).get(r['stat'])
        if cur and cur['n'] != book:
            notes.append(f"week {week}: {book} and {cur['n']} both matched {pid} {r['stat']}; kept {book}")
        out[pid][r['stat']] = e
    return out, problems, notes, how


def main():
    week = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    src = sys.argv[2] if len(sys.argv) > 2 else f'wk{week}_lines.csv'
    import season
    pp = os.path.join(HERE, 'payload.json')
    pay = json.load(open(pp, encoding='utf-8'))
    raw = os.path.join(os.path.dirname(HERE), 'raw')
    pool = names.Pool(names.read_csv(os.path.join(raw, season.ROSTER)), names.read_csv(os.path.join(raw, season.STATS)), pay['sched'])
    out, problems, notes, how = build_week(week, names.read_csv(src), names.read_csv(os.path.join(HERE, f'prices_wk{week}.csv')), pool,
                                           games={g['id'] for g in pay['sched']})
    pay.setdefault('mkt', {})[str(week)] = out
    if len(sys.argv) > 3:
        pay.setdefault('mkt_meta', {})[str(week)] = {'src': sys.argv[3], 'asof': sys.argv[4] if len(sys.argv) > 4 else ''}
    json.dump(pay, open(pp, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
    for m in problems + notes: print('  ' + m)
    print(f'week {week}: {sum(len(v) for v in out.values())} lines matched onto {len(out)} players ({how})')


if __name__ == '__main__': main()
