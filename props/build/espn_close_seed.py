"""DraftKings' main lines at kickoff for the games played before weekly.py's espn_close began keeping them (app v136),
recovered once from git.

From 20 October 2026 (app v125) the props job published DraftKings' lines read from ESPN for each game still to come
(PAY.espn) and dropped a game's read at its kickoff; from app v136 espn_close keeps its main lines then, for the props
tab's week and season record. A game that kicked off in between (week 7's Thursday game, Patriots at Bears) left no copy
in any payload since, but the payloads committed before its kickoff hold it. For each game of this season that has
kicked off by now and is not in the published payload's espn_close, this takes the espn block of the last
props/data/payload.json committed on the main line (origin/main's first parents) before its kickoff whose read of that
game is dated before the kickoff, cleaned by the page's rules (weekly.espn_block), and writes
props/data/espn_close_seed.json:

    {v:1, season, how, weeks:{w:{gid:{at, lines:{pid:{stat:line}}}}}, from:{gid:commit}}

espn_close takes a game from it only where it keeps none, so a seed never replaces a kept entry, and nothing is read at or
after a kickoff. Run by hand, never by a job (the job's checkout has no history), with history back to the first payload
that carried a read: git fetch --shallow-since=2026-10-19 origin main. Running it again writes the same file.

    python3 props/build/espn_close_seed.py [--check]     --check: say what it would write, write nothing
"""
import datetime, json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import weekly as W

ROOT = W.ROOT
OUT = os.path.join(W.DATA, 'espn_close_seed.json')
PAYLOAD = 'props/data/payload.json'


def git(*a):
    return subprocess.run(['git', '-C', ROOT, *a], check=True, capture_output=True, text=True).stdout


def main():
    check = '--check' in sys.argv[1:]
    now = datetime.datetime.now(datetime.timezone.utc)
    rules = W.espn_rules()
    pub = json.load(open(os.path.join(W.DATA, 'payload.json'), encoding='utf-8'))
    kept = ((pub.get('espn_close') or {}).get('weeks') or {}) if isinstance(pub.get('espn_close'), dict) else {}
    played = []
    for g in pub.get('sched') or []:
        ko = W.kickoff(g)
        if not g.get('id') or ko is None or (ko > now and not W.has_score(g)): continue
        if g['id'] in (kept.get(str(int(g['w']))) or {}): continue
        played.append((g, ko))
    commits = [ln.split(' ', 1) for ln in git('log', '--first-parent', '--format=%H %cI', 'origin/main', '--', PAYLOAD).split('\n') if ln.strip()]
    commits = [(h, datetime.datetime.fromisoformat(t)) for h, t in commits]
    if git('rev-parse', '--is-shallow-repository').strip() == 'true':
        print(f'note: the clone is shallow, its oldest payload commit {commits[-1][1].isoformat() if commits else "none"}: '
              'games played before it cannot be recovered (git fetch --shallow-since=2026-10-19 origin main)')
    cache, weeks, src = {}, {}, {}
    def at(h):
        if h not in cache:
            try: cache[h] = json.loads(git('show', f'{h}:{PAYLOAD}'))
            except Exception: cache[h] = None
        return cache[h]
    for g, ko in played:
        w = str(int(g['w']))
        for h, t in commits:                                   # newest first
            if t >= ko: continue
            p = at(h)
            if not p or W.payload_season(p) != W.SEASON: break
            e = ((p.get('espn') or {}).get('games') or {}).get(g['id'])
            if not isinstance(e, dict) or str(e.get('w')) != w:
                if 'espn' not in p: break                       # a payload from before the published read: none older
                continue
            b = W.espn_block(e.get('pl'), rules)
            bt = W.espn_time(b['at']) if b else None
            if bt is None or bt >= ko or not b['lines']: continue
            weeks.setdefault(w, {})[g['id']] = {'at': b['at'], 'lines': b['lines']}; src[g['id']] = h[:12]
            break
    weeks = {w: dict(sorted(weeks[w].items())) for w in sorted(weeks, key=int)}
    out = {'v': 1, 'season': W.SEASON,
           'how': "props/build/espn_close_seed.py: DraftKings' main lines as the last published read had them before kickoff, "
                  "recovered from git for the games played before weekly.py's espn_close began keeping them (app v136); "
                  "espn_close takes a game from here only where it keeps none. Written by the tool, never by hand.",
           'weeks': weeks, 'from': dict(sorted(src.items()))}
    n = sum(len(G) for G in weeks.values())
    for w, G in weeks.items():
        for gid, e in G.items():
            print(f"  week {w} {gid}: {sum(len(L) for L in e['lines'].values())} lines on {len(e['lines'])} players, read {e['at']} (commit {src[gid]})")
    missing = [g['id'] for g, _ in played if g['id'] not in src]
    print(f'{n} game(s) recovered; {len(missing)} played game(s) with no read before kickoff in history (before the published read, or no player lines)')
    if check: return
    if os.path.exists(OUT):
        old = json.load(open(OUT, encoding='utf-8'))
        for w, G in (old.get('weeks') or {}).items():
            for gid, e in G.items():
                if gid not in (weeks.get(w) or {}): out['weeks'].setdefault(w, {})[gid] = e; out['from'][gid] = (old.get('from') or {}).get(gid)
        out['weeks'] = {w: dict(sorted(out['weeks'][w].items())) for w in sorted(out['weeks'], key=int)}
        out['from'] = dict(sorted(out['from'].items()))
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1, ensure_ascii=False); f.write('\n')
    print('wrote', os.path.relpath(OUT, ROOT))


if __name__ == '__main__':
    main()
