#!/usr/bin/env python3
"""The one-shot 2026 test of the frozen free-data props model, exactly as PREREGISTRATION.md lays it down. It is run
once, after the preregistration is committed and merged, and its result is final: no model, line set, metric,
weight or bar may change after it has run.

What it scores, on 2026 weeks 1-7 (the data are named by git blob and SHA-256 in PREREGISTRATION.md):
  * the priced main lines: props/data/payload.json's `mkt`, weeks 1-6, at commit PRICED_COMMIT (the paid pull's
    main lines, both prices on file: DraftKings', week 1 the best of the US books), the market's chance their
    no-vig chance q = i(over) / (i(over) + i(under));
  * the priced anytime touchdowns: the same payload's `prices`, weeks 1-6, market any_td at threshold 1 with a
    player id (the Yes price; i its implied chance, the margin in), one price a player and game;
  * the price-free lines: props/data/espn_lines_2026.json at the same commit, every game of weeks 1-7 marked
    final, each player's closing DraftKings main line (the archive's close), on the ten main markets the models
    cover (kicking points and field goals made are not modelled).
A line is scored where its player's group and stat are covered by a frozen model (predict.Predictor.covered()),
predict.py made a candidate row for him in that game, and he played (a row in the 2026 build: a snap in his role
or on special teams), DraftKings voiding a prop on a player who does not play; a push drops out, and the model's
chance on a whole-number line is P(over) / (1 - P(push)). Every line left out is counted, by reason, pushes too.

The model's chance p is predict.py's, made week by week in predict mode (each week's rows from files before its
games), clipped to [0.001, 0.999]. The bar (PREREGISTRATION.md, section 5), every interval a paired bootstrap that
resamples whole games, B = 10,000, seed 0, its 5th to 95th percentile:
  main lines PASS only if all six hold:
    A1  priced: Brier of b = q + W (p - q), W = 0.25, minus Brier of q: interval wholly below 0;
    A2  priced: the same for log loss;
    A3  priced: in logit P(over) = alpha_stat + gamma logit q + beta (logit p - logit q), fitted by maximum
        likelihood with one intercept per stat, beta's interval wholly above 0 (the model's own information, apart
        from the market's chance and from any lean either has on a stat);
    A4  priced: the picks (each line's side with b times its decimal price above 1, flat $1) make at least what
        the market's no-vig chance expects of them, i.e. they lose no more than the vig: units - sum(q_side *
        decimal - 1) >= 0, with at least one pick;
    B1  price-free: the same blend toward the line's own even chance, e = 0.5 + W (p - 0.5) (the line is set at
        the market's median; the site's own chance on most of these lines is about 0.5), log loss of e minus log
        loss of 0.5: interval wholly below 0;
    B2  price-free: log loss of e minus log loss of each stat's own over rate in the test set (a constant per stat,
        chosen in hindsight and chosen again in every resample): interval wholly below 0.
  anytime touchdown PASS only if:
    C1  priced: in logit P(TD) = alpha_group + gamma logit i + beta (logit p - logit i), one intercept per position
        group (QB, RB, WR, TE), beta's interval wholly above 0.
Everything else it writes (per stat, per week, by kickoff day, the blend at other weights, calibration) is
description, never part of the verdict.

Guards (a real run refuses to start otherwise, and nothing of 2026 is downloaded or read before they pass):
  * the holdout is lifted only through fetch.py's rule: this program, PROPMODEL_LIFT_HOLDOUT the SHA-256 of
    PREREGISTRATION.md, committed, unmodified and on origin/main;
  * this file's folder is <repo>/props/research/propmodel, and every file PREREGISTRATION.md lists in section 3
    has its SHA-256 there: the files actually executing (this file, fetch.py, build_features.py, predict.py) are
    hashed where they were loaded from, and the two input blobs at PRICED_COMMIT are read from the same repo;
  * the libraries are requirements.txt's (LightGBM 4.7.0 and the rest), and the model files the manifest's;
  * it is at least WAIT_H hours past the last kickoff of weeks 1-7 (the archive's), so that the season's files
    hold every game with its stat corrections and snap counts;
  * one shot: results/oneshot_2026.json and its lines table do not exist and were never committed on any branch;
    no run marker (DATA/oneshot_2026.started.json) and no 2026 raw file is on disk, unless an earlier run of this
    test crashed and results/oneshot_2026_crashes.md, committed on origin/main, names that run's id.
It then writes the marker, downloads the 2026 files, and refuses (removing what it downloaded and the marker, so
that the next attempt downloads afresh; nothing has been scored) unless every 2026 game of weeks 1-7 the schedule
says was played has player stats and snap counts for both clubs, its play-by-play, and both clubs' weekly roster.

    PROPMODEL_LIFT_HOLDOUT=$(sha256sum PREREGISTRATION.md | cut -c1-64) \\
        .venv/bin/python -I oneshot_2026.py --data DIR --repo ../../..      # the test, once
    python3 -I oneshot_2026.py --data DIR --dry-run                         # the mechanics on 2025 stand-ins (no 2026)
The dry run builds stand-in inputs of the same shape from 2025 (lines at the player's last-three-game mean, made-up
prices, and one planted line for every exclusion rule) and runs every step but the guards and the download; its
numbers are in sample (the models were fitted on 2025) and mean nothing.
"""
import argparse, gzip, hashlib, json, math, os, platform, re, subprocess, sys, time
from types import SimpleNamespace
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_DEFAULT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
REL = 'props/research/propmodel'
sys.path.insert(0, HERE)
import fetch as F            # noqa: E402
import build_features as B   # noqa: E402
import predict as PR         # noqa: E402

SEASON = 2026
PRICED_WEEKS = [1, 2, 3, 4, 5, 6]
ESPN_WEEKS = [1, 2, 3, 4, 5, 6, 7]
PRICED_COMMIT = '575c980f2beb03c05913a727f216d7bf80435c1e'
PAYLOAD = 'props/data/payload.json'
ARCHIVE = 'props/data/espn_lines_2026.json'
W = 0.25
CLIP = (0.001, 0.999)
NBOOT, SEED, LEVEL = 10000, 0, 0.90
WAIT_H = 96                  # the run starts no earlier than this long after the last kickoff of weeks 1-7
LIBS = ('lightgbm', 'numpy', 'pandas', 'scipy', 'pyarrow')   # held to requirements.txt's pins in a real run
FROZEN_INPUTS = ('players.csv', 'games_to2025.csv')        # restored from frozen/inputs/ where DATA/raw lacks them
# the site's stat names -> the models' (payload mkt and the archive use the site's; scrim_yards is rush + rec yards)
STAT = {'passing_yards': 'passing_yards', 'rushing_yards': 'rushing_yards', 'receiving_yards': 'receiving_yards',
        'scrim_yards': 'rush_rec_yards', 'receptions': 'receptions', 'completions': 'completions',
        'attempts': 'attempts', 'passing_tds': 'passing_tds', 'passing_interceptions': 'passing_interceptions',
        'carries': 'carries'}
RESULT = os.path.join(HERE, 'results', 'oneshot_2026.json')
LINES_OUT = os.path.join(HERE, 'results', 'oneshot_2026_lines.csv')
CRASHES = os.path.join(HERE, 'results', 'oneshot_2026_crashes.md')
DRY_RESULT = os.path.join(HERE, 'results', 'oneshot_dryrun_2025.json')
MARKER = 'oneshot_2026.started.json'


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def sha256_file(p):
    with open(p, 'rb') as f:
        return sha256_bytes(f.read())


# --------------------------------------------------------------------------------------------- guards
def registered(prereg):
    """the `<sha256>  <path>` lines of PREREGISTRATION.md (paths from the repo root, or git:<commit>:<path>)"""
    out = {}
    for line in open(prereg, encoding='utf-8'):
        m = re.match(r'^([0-9a-f]{64})  (\S+)\s*$', line.rstrip('\n'))
        if m:
            out[m.group(2)] = m.group(1)
    return out


def git(repo, *args):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, text=True)


def git_blob(repo, commit, path):
    r = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{path}'], capture_output=True)
    if r.returncode:
        raise SystemExit(f'refused: cannot read {commit}:{path} ({r.stderr.decode()[:200]})')
    return r.stdout


def on_origin_main(repo, rel):
    """the path is tracked, unmodified, and the last commit that touched it is on origin/main"""
    if git(repo, 'ls-files', '--error-unmatch', rel).returncode or git(repo, 'status', '--porcelain', '--', rel).stdout.strip():
        return False
    last = git(repo, 'log', '-1', '--format=%H', '--', rel).stdout.strip()
    return bool(last) and git(repo, 'merge-base', '--is-ancestor', last, 'origin/main').returncode == 0


def pins():
    out = {}
    for line in open(os.path.join(HERE, 'requirements.txt'), encoding='utf-8'):
        m = re.match(r'^\s*([A-Za-z0-9_.-]+)==(\S+)', line)
        if m:
            out[m.group(1).lower()] = m.group(2)
    return out


def versions():
    from importlib import metadata
    v = {'python': platform.python_version()}
    for lib in LIBS + ('scikit-learn',):
        try:
            v[lib] = metadata.version(lib)
        except metadata.PackageNotFoundError:
            v[lib] = None
    return v


def check_versions():
    want, have = pins(), versions()
    bad = {k: {'here': have.get(k), 'pinned': want.get(k)} for k in LIBS if have.get(k) != want.get(k)}
    if bad:
        raise SystemExit(f'refused: not the pinned libraries (requirements.txt): {bad}')


def last_kickoff(arch, weeks):
    ks = [pd.Timestamp(g['kickoff']) for g in (arch.get('games') or {}).values()
          if int(g.get('w') or 0) in weeks and g.get('kickoff')]
    if not ks:
        raise SystemExit('refused: the archive gives no kickoff for weeks %s' % weeks)
    return max(ks)


def guard(repo, now=None):
    """every check that can be made before anything of 2026 is downloaded; returns the registered hashes, the
    payload, the archive and the hour the run may start"""
    if F.HOLDOUT_FROM != SEASON + 1:
        raise SystemExit('refused: the holdout is not lifted (fetch.py: PROPMODEL_LIFT_HOLDOUT)')
    if os.path.realpath(HERE) != os.path.realpath(os.path.join(repo, REL)):
        raise SystemExit(f'refused: this program runs from {HERE}, not from --repo\'s {REL}')
    reg = registered(os.path.join(HERE, 'PREREGISTRATION.md'))
    if not reg:
        raise SystemExit('refused: PREREGISTRATION.md lists no frozen files')
    bad, blobs = [], {}
    # the code actually executing, hashed where Python loaded it from
    for mod, name in ((sys.modules[__name__], 'oneshot_2026.py'), (F, 'fetch.py'), (B, 'build_features.py'),
                      (PR, 'predict.py')):
        fp = os.path.abspath(getattr(mod, '__file__', '') or '')
        if os.path.realpath(fp) != os.path.realpath(os.path.join(HERE, name)) or reg.get(f'{REL}/{name}') != sha256_file(fp):
            bad.append(f'{name} as loaded ({fp})')
    for path, h in reg.items():
        if path.startswith('git:'):
            _, commit, p = path.split(':', 2)
            blobs[p] = git_blob(repo, commit, p)
            got = sha256_bytes(blobs[p])
        else:
            fp = os.path.join(repo, path)
            got = sha256_file(fp) if os.path.exists(fp) else None
        if got != h:
            bad.append(path)
    if bad:
        raise SystemExit(f'refused: not the registered bytes: {bad}')
    if PAYLOAD not in blobs or ARCHIVE not in blobs:
        raise SystemExit('refused: PREREGISTRATION.md does not register the payload and the archive')
    pay, arch = json.loads(blobs[PAYLOAD]), json.loads(blobs[ARCHIVE])
    not_before = last_kickoff(arch, ESPN_WEEKS) + pd.Timedelta(hours=WAIT_H)
    now = now or pd.Timestamp.now(tz='UTC')
    if now < not_before:
        raise SystemExit(f'refused: too early; the test runs no earlier than {not_before.isoformat()} '
                         f'({WAIT_H} hours after the last kickoff of weeks 1-7)')
    for p in (RESULT, LINES_OUT):
        if os.path.exists(p):
            raise SystemExit(f'refused: {p} exists: the test has been run; it is run once')
        rel = os.path.relpath(p, repo)
        if git(repo, 'log', '--all', '--format=%H', '--', rel).stdout.strip():
            raise SystemExit(f'refused: {rel} has been committed on some branch: the test has been run; it is run once')
    return reg, pay, arch, not_before


def raw_2026(data):
    raw = os.path.join(data, 'raw')
    return sorted(fn for fn in (os.listdir(raw) if os.path.isdir(raw) else []) if re.search(r'2026\.(csv|parquet)$', fn))


def begin(data, repo, prereg_sha):
    """the run marker, written before anything of 2026 is downloaded. A marker or a 2026 raw file already on disk
    means 2026 was fetched before: refused, unless an earlier run of this test crashed and the committed crash note
    (results/oneshot_2026_crashes.md, on origin/main) names that run's id, when the run goes on with those files"""
    mp = os.path.join(data, MARKER)
    prior = json.load(open(mp)) if os.path.exists(mp) else None
    left = raw_2026(data)
    if prior or left:
        runs = (prior or {}).get('runs') or []
        rel = os.path.relpath(CRASHES, repo)
        note = open(CRASHES, encoding='utf-8').read() if os.path.exists(CRASHES) and on_origin_main(repo, rel) else ''
        if not runs or not note or runs[-1]['run_id'] not in note:
            raise SystemExit('refused: 2026 has been downloaded before (%s%s). If an earlier run of this test crashed, '
                             'name its run id in %s, commit and merge it with the fix; otherwise delete those files, '
                             'which no run of this test has read' % ('marker ' + mp if prior else 'no marker',
                                                                     ', files ' + ', '.join(left) if left else '', rel))
    runs = ((prior or {}).get('runs') or []) + [{'run_id': pd.Timestamp.now(tz='UTC').isoformat(timespec='seconds'),
                                                 'head': git(repo, 'rev-parse', 'HEAD').stdout.strip(),
                                                 'prereg_sha256': prereg_sha}]
    with open(mp, 'w') as f:
        json.dump({'runs': runs}, f, indent=1)
    return runs, prior is None


def cleanup(data):
    """a refused download or coverage check, on a first run: remove the 2026 files and the marker, so that the next
    attempt downloads afresh (nothing has been scored)"""
    gone = []
    for fn in raw_2026(data) + ['.games_all.download']:
        p = os.path.join(data, 'raw', fn)
        if os.path.exists(p):
            os.remove(p); gone.append(fn)
    mp = os.path.join(data, MARKER)
    if os.path.exists(mp):
        os.remove(mp); gone.append(MARKER)
    return gone


def restore_inputs(data, man):
    """players.csv and games_to2025.csv as the models were fitted on them, from the repo's copies, where DATA/raw
    lacks them (nflverse rewrites both, so a download would not be the same file)"""
    done = {}
    os.makedirs(os.path.join(data, 'raw'), exist_ok=True)
    for fn in FROZEN_INPUTS:
        p = os.path.join(data, 'raw', fn)
        if os.path.exists(p) and os.path.getsize(p) > 0:
            continue
        with open(os.path.join(HERE, 'frozen', 'inputs', fn + '.gz'), 'rb') as f:
            raw = gzip.decompress(f.read())
        if sha256_bytes(raw) != man['fitted_on']['raw_sha256'][fn]:
            raise SystemExit(f'refused: frozen/inputs/{fn}.gz is not the manifest\'s {fn}')
        with open(p + '.part', 'wb') as f:
            f.write(raw)
        os.replace(p + '.part', p)
        done[fn] = 'restored from frozen/inputs'
    return done


def raw_vs_manifest(data, man):
    """the 2010-2025 raw files on disk against the ones the models were fitted on (description: the test reads
    whatever DATA/raw holds, and a file downloaded again holds nflverse's later corrections)"""
    out = {'same': 0, 'differ': [], 'missing': []}
    for fn, h in sorted(man['fitted_on']['raw_sha256'].items()):
        p = os.path.join(data, 'raw', fn)
        if not os.path.exists(p):
            out['missing'].append(fn)
        elif sha256_file(p) != h:
            out['differ'].append(fn)
        else:
            out['same'] += 1
    return out


def games_history_diff(data):
    """the 2010-2025 lines of games_to2026.csv (which the test reads for every season) against games_to2025.csv
    (which the models were fitted on), line by line: description only"""
    def lines(p):
        with open(p, encoding='utf-8', newline='') as f:
            head = f.readline()
            return head, {ln.split(',', 1)[0]: ln for ln in f if ln[:4].isdigit() and int(ln[:4]) < SEASON}
    h5, a = lines(os.path.join(data, 'raw', 'games_to2025.csv'))
    h6, b = lines(F.games_path(data))
    changed = sorted(g for g in set(a) & set(b) if a[g] != b[g])
    return {'header_same': h5 == h6, 'games_fit': len(a), 'games_test': len(b), 'only_in_fit': sorted(set(a) - set(b))[:50],
            'only_in_test': sorted(set(b) - set(a))[:50], 'changed': len(changed), 'changed_games': changed[:50]}


def coverage(data, season, weeks):
    """every game of `weeks` the schedule says was played (both scores) must have player stats and snap counts for
    both clubs, its play-by-play, and both clubs' weekly roster for its week; a game with no score (not played) is
    listed. Only those columns are read."""
    g = pd.read_csv(F.games_path(data), usecols=['game_id', 'season', 'game_type', 'week', 'away_team', 'home_team',
                                                  'away_score', 'home_score'], low_memory=False)
    g = g[(g.season == season) & (g.game_type == 'REG') & g.week.isin(weeks)].copy()
    played = g.home_score.notna() & g.away_score.notna()

    def clubs(kind, wcol, tcol, typecol, typeval):
        x = pd.read_csv(F.path(data, kind, season), usecols=[wcol, tcol, typecol], low_memory=False)
        x = x[x[typecol] == typeval]
        return set(zip(x[wcol].astype(int), B.tn(x[tcol].astype(str))))
    have = {'stats': clubs('stats', 'week', 'team', 'season_type', 'REG'),
            'snap counts': clubs('snaps', 'week', 'team', 'game_type', 'REG'),
            'weekly roster': clubs('roster', 'week', 'team', 'game_type', 'REG')}
    pb = pd.read_parquet(F.path(data, 'pbp', season), columns=['game_id', 'season_type'])
    pbp_games = set(pb.game_id[pb.season_type == 'REG'])
    missing = []
    for r in g[played].itertuples(index=False):
        for kind, s in have.items():
            for t in (r.home_team, r.away_team):
                if (int(r.week), B.TEAM_NOW.get(t, t)) not in s:
                    missing.append(f'{r.game_id}: {kind} of {t}')
        if r.game_id not in pbp_games:
            missing.append(f'{r.game_id}: play-by-play')
    return {'weeks': list(weeks), 'games': int(len(g)), 'played': int(played.sum()),
            'not_played': sorted(g.game_id[~played]), 'missing': missing}


# --------------------------------------------------------------------------------------------- inputs
def american_implied(o):
    o = float(o)
    return 100.0 / (o + 100.0) if o > 0 else -o / (-o + 100.0)


def to_american(imp):
    """an implied chance as an American price (the dry run's made-up prices)"""
    return int(round(100 * (1 - imp) / imp)) if imp < 0.5 else int(round(-100 * imp / (1 - imp)))


def american_decimal(o):
    o = float(o)
    return 1 + (o / 100.0 if o > 0 else 100.0 / -o)


def priced_lines(pay):
    rows = []
    for w in PRICED_WEEKS:
        for pid, sts in (pay.get('mkt') or {}).get(str(w), {}).items():
            for st, e in sts.items():
                if st not in STAT:
                    rows.append(dict(week=w, pid=pid, site_stat=st, why='market not modelled')); continue
                try:
                    line, ov, un = float(e['line']), int(e['over']), int(e['under'])
                except (KeyError, TypeError, ValueError):
                    rows.append(dict(week=w, pid=pid, site_stat=st, stat=STAT[st], why='no two prices')); continue
                rows.append(dict(week=w, pid=pid, site_stat=st, stat=STAT[st], line=line, over=ov, under=un,
                                 game=e.get('g')))
    d = pd.DataFrame(rows)
    if 'why' not in d:
        d['why'] = None
    return d


def priced_td(pay):
    """one Yes price a player and game: a row repeated with the same price is kept once (the repeat counted as a
    duplicate), and a player given two different prices in one game (two book names placed on him) is left out"""
    rows = []
    for w in PRICED_WEEKS:
        for r in (pay.get('prices') or {}).get(str(w), []):
            if r.get('market') != 'any_td' or str(r.get('threshold')).strip() not in ('1', '1.0'):
                continue
            gid = r.get('game_id')
            if not r.get('pid'):
                rows.append(dict(week=w, pid=None, game=gid, why='no player id')); continue
            try:
                odds = int(float(r['odds']))
            except (KeyError, TypeError, ValueError):
                rows.append(dict(week=w, pid=r['pid'], game=gid, why='unreadable price')); continue
            rows.append(dict(week=w, pid=r['pid'], stat='any_td', odds=odds, game=gid, why=None))
    d = pd.DataFrame(rows, columns=['week', 'pid', 'stat', 'odds', 'game', 'why'])
    ok = d.why.isna()
    key = ['week', 'pid', 'game']
    n_prices = d[ok].groupby(key, dropna=False).odds.transform('nunique')
    two = n_prices.index[n_prices > 1]
    d.loc[two, 'why'] = 'two prices for one player'
    rep = d[d.why.isna()].duplicated(key + ['odds'], keep='first')
    d.loc[rep.index[rep], 'why'] = 'duplicate row'
    return d


def espn_lines(arch):
    rows = []
    for gid, g in (arch.get('games') or {}).items():
        if int(g.get('w') or 0) not in ESPN_WEEKS or not g.get('final'):
            continue
        wk = int(g['w'])
        lines = g.get('lines') or {}
        gone = {(c[0], c[1]) for c in (g.get('gone') or [])}
        conflict = {(c[0], c[1]) for c in (g.get('conflict') or [])}
        for pid, sts in lines.items():
            for st, v in sts.items():
                why = None
                if st not in STAT:
                    why = 'market not modelled'
                elif str(pid).startswith('espn:'):
                    why = 'player not mapped to an nflverse id'
                elif (pid, st) in conflict:
                    why = 'conflict (two numbers)'
                elif (pid, st) in gone:
                    why = 'withdrawn (gone)'
                elif not isinstance(v, (list, tuple)) or len(v) < 2 or v[1] is None:
                    why = 'no closing line'
                rows.append(dict(week=wk, game_id=gid, pid=pid, site_stat=st, stat=STAT.get(st),
                                 line=(float(v[1]) if why is None else np.nan), why=why))
        # the archive keeps a player and market listed at two numbers in `conflict` alone, never in `lines`
        for pid, st in sorted(conflict):
            if st in (lines.get(pid) or {}):
                continue
            rows.append(dict(week=wk, game_id=gid, pid=pid, site_stat=st, stat=STAT.get(st), line=np.nan,
                             why='market not modelled' if st not in STAT else 'conflict (two numbers)'))
    return pd.DataFrame(rows)


# ------------------------------------------------------------------------------------- predictions, outcomes
def all_predictions(data, season, weeks, predictor):
    preds, cands, summ = [], [], {}
    for w in weeks:
        rows, s = PR.week_rows(data, season, w, fetch=False)
        cands.append(rows[['season', 'week', 'game_id', 'pid', 'grp', 'team', 'g_weekday', 'kickoff_utc']]
                     .rename(columns={'g_weekday': 'weekday'}).assign(cand_src=rows.cand_src.values))
        p = predictor.predict_rows(rows)
        preds.append(p)
        summ[str(w)] = {k: s.get(k) for k in ('candidates_by_src', 'roster_carried', 'snaps', 'rows_without_game')}
        log('predicted', season, 'week', w, len(rows), 'candidates', len(p), 'predictions', s.get('candidates_by_src'))
    return pd.concat(preds, ignore_index=True), pd.concat(cands, ignore_index=True), summ


def outcomes(data, season):
    a = SimpleNamespace(data=data, first=2013, last=season, warmup_from=2010, out=None, no_fetch=True, cutoff=None,
                        compare=None, predict=None)
    full, _ = B.build(a)
    full = full[full.season == season]
    played = full[(full.role_played == 1) | (full.st_only == 1)]
    return played


def attach(lines, preds, cands, played, key):
    """the model's chance, his group and the outcome on each line; every line left out gets its reason"""
    L = lines.copy()
    if 'why' not in L:
        L['why'] = None
    cc = ['game_id', 'pid', 'grp', 'weekday', 'kickoff_utc']
    if key == 'week':      # payload lines carry the week; a player plays one game a week
        c = cands.drop_duplicates(['week', 'pid'])[['week'] + cc]
        L = L.merge(c, on=['week', 'pid'], how='left')
    else:
        c = cands.drop_duplicates(['game_id', 'pid'])[cc]
        L = L.merge(c, on=['game_id', 'pid'], how='left')
    if 'game' in L:
        clash = L.game.notna() & L.game_id.notna() & (L.game != L.game_id)
        L.loc[clash & L.why.isna(), 'why'] = 'line game is not his candidate game'
    L.loc[L.why.isna() & L.grp.isna(), 'why'] = 'no candidate row'
    pr = preds[['game_id', 'pid', 'stat', 'model', 'params']]
    L = L.merge(pr, on=['game_id', 'pid', 'stat'], how='left')
    L.loc[L.why.isna() & L.model.isna(), 'why'] = 'stat not covered for his group'
    ycols = {st: 'y_' + st for st in set(STAT.values()) | {'any_td'}}
    pl = played[['game_id', 'pid'] + sorted(set(ycols.values()))]
    L = L.merge(pl, on=['game_id', 'pid'], how='left', indicator='_pl')
    L.loc[L.why.isna() & (L._pl != 'both'), 'why'] = 'did not play (void)'
    L['y'] = np.nan
    for st, col in ycols.items():
        m = (L.stat == st) & (L._pl == 'both')
        L.loc[m, 'y'] = L.loc[m, col].astype(float)
    # the pull's timing, by kickoff day: a Sunday game's player prices were pulled on Saturday morning, a day or more
    # before kickoff; Thursday's and Monday's on the day (description only)
    L['kickoff_day'] = np.where(L.weekday.isna(), None, np.where(L.weekday == 'Sunday', 'sunday', 'other'))
    return L.drop(columns=['_pl'] + sorted(set(ycols.values())))


def model_chance(L):
    ov, pu = [], []
    for m, p, l in zip(L.model, L.params, L.line):
        if isinstance(p, str) and l == l:
            o, u = PR.p_over(m, p, l)
        else:
            o, u = np.nan, np.nan
        ov.append(o); pu.append(u)
    L['p_over_raw'] = ov
    L['p_push'] = pu
    L['p'] = np.clip(np.asarray(ov) / np.maximum(1 - np.asarray(pu), 1e-12), *CLIP)
    return L


def mark_push(L):
    """a line landed exactly on is a push: it drops out, counted by its reason"""
    L['yo'] = (L.y > L.line).astype(float).where(L.y.notna() & L.line.notna())
    L.loc[L.why.isna() & (L.y == L.line), 'why'] = 'push'
    return L


# ------------------------------------------------------------------------------------------- statistics
def logit(p):
    p = np.clip(np.asarray(p, float), 1e-12, 1 - 1e-12)
    return np.log(p / (1 - p))


def ll(p, y):
    p = np.clip(p, *CLIP)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))


def brier(p, y):
    return (p - y) ** 2


def boot_weights(games, nboot=NBOOT, seed=SEED):
    """a generator of game multiplicities: each resample draws the games with replacement"""
    codes, inv = np.unique(games, return_inverse=True)
    rng = np.random.default_rng(seed)
    G = len(codes)
    for _ in range(nboot):
        yield np.bincount(rng.integers(0, G, G), minlength=G)[inv].astype(float)


def interval(est, reps):
    lo, hi = np.quantile(reps, [(1 - LEVEL) / 2, 1 - (1 - LEVEL) / 2])
    return {'est': float(est), 'lo': float(lo), 'hi': float(hi), 'se': float(np.std(reps, ddof=1))}


def mean_diff(d, games):
    reps = np.array([np.sum(w * d) / np.sum(w) for w in boot_weights(games)])
    return interval(float(np.mean(d)), reps)


def logistic(X, y, wt=None, iters=50):
    wt = np.ones(len(y)) if wt is None else wt
    b = np.zeros(X.shape[1])
    for _ in range(iters):
        eta = np.clip(X @ b, -30, 30)
        mu = 1 / (1 + np.exp(-eta))
        g = X.T @ (wt * (y - mu))
        H = (X * (wt * mu * (1 - mu))[:, None]).T @ X + 1e-10 * np.eye(X.shape[1])
        step = np.linalg.solve(H, g)
        b = b + step
        if np.max(np.abs(step)) < 1e-10:
            break
    return b


def signal_test(y, ref, p, games, strata):
    """logit P(y) = alpha_s + gamma logit(ref) + beta (logit p - logit ref), one intercept per stratum s: beta and
    its game-bootstrap interval (a resample without a stratum leaves its intercept at 0, which nothing else reads)"""
    codes, si = np.unique(np.asarray(strata).astype(str), return_inverse=True)
    X = np.column_stack([np.eye(len(codes))[si], logit(ref), logit(p) - logit(ref)])
    est = logistic(X, y)
    reps = np.array([logistic(X, y, w)[-1] for w in boot_weights(games)])
    out = interval(est[-1], reps)
    out.update(gamma=float(est[-2]), alpha={str(c): float(a) for c, a in zip(codes, est[:len(codes)])})
    return out


def const_rate_diff(p, y, stat, games):
    """log loss of p minus log loss of each stat's own over rate (the hindsight constant, chosen again per resample)"""
    codes, si = np.unique(stat, return_inverse=True)

    def diff(w):
        sw = np.bincount(si, weights=w, minlength=len(codes))
        sy = np.bincount(si, weights=w * y, minlength=len(codes))
        c = np.clip(sy / np.maximum(sw, 1e-12), *CLIP)[si]
        return np.sum(w * (ll(p, y) - ll(c, y))) / np.sum(w)
    est = diff(np.ones(len(y)))
    reps = np.array([diff(w) for w in boot_weights(games)])
    return interval(est, reps)


def picks(b, q, ov, un, y):
    """each line's side with b x decimal > 1 (the better side if both), flat $1 at its price"""
    d_o = np.array([american_decimal(o) for o in ov]); d_u = np.array([american_decimal(u) for u in un])
    ev_o, ev_u = b * d_o - 1, (1 - b) * d_u - 1
    side = np.where((ev_o > 0) & (ev_o >= ev_u), 1, np.where(ev_u > 0, -1, 0))
    win = np.where(side == 1, y, 1 - y)
    dec = np.where(side == 1, d_o, d_u)
    fair = np.where(side == 1, q, 1 - q)
    units = np.where(side != 0, win * dec - 1, 0.0)
    exp_fair = np.where(side != 0, fair * dec - 1, 0.0)
    return side, units, exp_fair


def describe_calibration(p, y):
    order = np.argsort(p, kind='stable')
    return [{'n': int(len(ix)), 'said': float(p[ix].mean()), 'hit': float(y[ix].mean())} for ix in np.array_split(order, 10)]


# ---------------------------------------------------------------------------------------------- the test
def score(Pm, Td, Es):
    res = {'W': W, 'clip': CLIP, 'bootstrap': {'resamples': NBOOT, 'seed': SEED, 'level': LEVEL, 'unit': 'game'}}
    crit = {}
    # ---- priced main lines
    A = Pm[Pm.why.isna()].copy()
    y, p, q, g = A.yo.values, A.p.values, A.q.values, A.game_id.values
    b = q + W * (p - q)
    res['priced'] = {'n': int(len(A)), 'games': int(len(set(g))), 'over_rate': float(y.mean()) if len(A) else None,
                     'brier_model': float(brier(p, y).mean()), 'brier_market': float(brier(q, y).mean()),
                     'brier_blend': float(brier(b, y).mean()), 'll_model': float(ll(p, y).mean()),
                     'll_market': float(ll(q, y).mean()), 'll_blend': float(ll(b, y).mean()),
                     'mean_abs_p_minus_q': float(np.mean(np.abs(p - q)))} if len(A) else {'n': 0}
    if len(A):
        res['A1_brier_blend_minus_market'] = mean_diff(brier(b, y) - brier(q, y), g)
        res['A2_ll_blend_minus_market'] = mean_diff(ll(b, y) - ll(q, y), g)
        res['A3_signal'] = signal_test(y, q, p, g, A.stat.values)
        side, units, expf = picks(b, q, A.over.values, A.under.values, y)
        k = side != 0
        res['A4_picks'] = {'n': int(k.sum()), 'overs': int((side == 1).sum()), 'unders': int((side == -1).sum()),
                           'units': float(units[k].sum()), 'units_expected_at_fair': float(expf[k].sum()),
                           'excess': float(units[k].sum() - expf[k].sum()),
                           'roi': float(units[k].mean()) if k.any() else None}
        if k.any():
            res['A4_picks']['excess_per_pick'] = mean_diff((units - expf)[k], g[k])
        crit['A1'] = res['A1_brier_blend_minus_market']['hi'] < 0
        crit['A2'] = res['A2_ll_blend_minus_market']['hi'] < 0
        crit['A3'] = res['A3_signal']['lo'] > 0
        crit['A4'] = bool(k.any()) and res['A4_picks']['excess'] >= 0
        # description only
        res['priced_by_stat'] = {s: {'n': int((A.stat == s).sum()),
                                     'll_model_minus_market': float((ll(p, y) - ll(q, y))[A.stat.values == s].mean()),
                                     'll_blend_minus_market': float((ll(b, y) - ll(q, y))[A.stat.values == s].mean())}
                                 for s in sorted(A.stat.unique())}
        res['priced_by_week'] = {int(wk): float((ll(b, y) - ll(q, y))[A.week.values == wk].mean()) for wk in sorted(A.week.unique())}
        res['priced_by_kickoff_day'] = {}
        for day in sorted(A.kickoff_day.dropna().unique()):
            m = (A.kickoff_day == day).values
            if m.sum() >= 50 and len(set(g[m])) >= 5:
                res['priced_by_kickoff_day'][day] = {
                    'n': int(m.sum()), 'games': int(len(set(g[m]))),
                    'A1': mean_diff((brier(b, y) - brier(q, y))[m], g[m]),
                    'A2': mean_diff((ll(b, y) - ll(q, y))[m], g[m]),
                    'A3': signal_test(y[m], q[m], p[m], g[m], A.stat.values[m])}
        res['priced_blend_other_w'] = {str(ww): float((ll(q + ww * (p - q), y) - ll(q, y)).mean()) for ww in (0.1, 0.5, 1.0)}
        res['priced_calibration_model'] = describe_calibration(p, y)
    else:
        crit.update(A1=False, A2=False, A3=False, A4=False)
    # ---- price-free ESPN lines
    E = Es[Es.why.isna()].copy()
    y, p, g = E.yo.values, E.p.values, E.game_id.values
    e = 0.5 + W * (p - 0.5)
    res['espn'] = {'n': int(len(E)), 'games': int(len(set(g))), 'over_rate': float(y.mean()) if len(E) else None,
                   'over_rate_by_stat': {s: float(y[E.stat.values == s].mean()) for s in sorted(E.stat.unique())},
                   'll_blend': float(ll(e, y).mean()) if len(E) else None,
                   'll_model': float(ll(p, y).mean()) if len(E) else None, 'll_coin': math.log(2)}
    if len(E):
        res['B1_ll_blend_minus_coin'] = mean_diff(ll(e, y) - ll(np.full(len(y), 0.5), y), g)
        res['B2_ll_blend_minus_stat_rate'] = const_rate_diff(e, y, E.stat.values, g)
        crit['B1'] = res['B1_ll_blend_minus_coin']['hi'] < 0
        crit['B2'] = res['B2_ll_blend_minus_stat_rate']['hi'] < 0
        # description only: the model's own chance, unblended
        res['espn_model_unblended_minus_coin'] = float((ll(p, y) - math.log(2)).mean())
        res['espn_by_stat'] = {s: {'n': int((E.stat == s).sum()),
                                   'll_blend_minus_coin': float((ll(e, y) - math.log(2))[E.stat.values == s].mean()),
                                   'll_model_minus_coin': float((ll(p, y) - math.log(2))[E.stat.values == s].mean())}
                               for s in sorted(E.stat.unique())}
        X = np.column_stack([np.ones(len(y)), logit(p)])
        res['espn_slope_on_logit_p'] = {'alpha_beta': [float(v) for v in logistic(X, y)]}
        res['espn_calibration_model'] = describe_calibration(p, y)
    else:
        crit.update(B1=False, B2=False)
    # ---- priced anytime touchdowns
    T = Td[Td.why.isna()].copy()
    y, p, i, g = T.y.values.astype(float), T.p.values, T.i.values, T.game_id.values
    res['td'] = {'n': int(len(T)), 'games': int(len(set(g))), 'rate': float(y.mean()) if len(T) else None,
                 'mean_p': float(p.mean()) if len(T) else None, 'mean_implied': float(i.mean()) if len(T) else None,
                 'll_model': float(ll(p, y).mean()) if len(T) else None}
    if len(T):
        res['C1_signal'] = signal_test(y, i, p, g, T.grp.values)
        crit['C1'] = res['C1_signal']['lo'] > 0
        res['td_by_kickoff_day'] = {}
        for day in sorted(T.kickoff_day.dropna().unique()):
            m = (T.kickoff_day == day).values
            if m.sum() >= 50 and len(set(g[m])) >= 5:
                res['td_by_kickoff_day'][day] = {'n': int(m.sum()), 'games': int(len(set(g[m]))),
                                                 'C1': signal_test(y[m], i[m], p[m], g[m], T.grp.values[m])}
        res['td_calibration_model'] = describe_calibration(p, y)
    else:
        crit['C1'] = False
    res['criteria'] = {k: bool(v) for k, v in crit.items()}
    res['verdict'] = {'main_lines': 'PASS' if all(crit[k] for k in ('A1', 'A2', 'A3', 'A4', 'B1', 'B2')) else 'FAIL',
                      'anytime_td': 'PASS' if crit['C1'] else 'FAIL'}
    return res


def exclusions(L):
    return {str(k): int(v) for k, v in L.why.fillna('scored').value_counts().items()}


def run(data, season, pay, arch, predictor, out_path, lines_path, extra):
    weeks = sorted(set(PRICED_WEEKS) | set(ESPN_WEEKS))
    preds, cands, summ = all_predictions(data, season, weeks, predictor)
    played = outcomes(data, season)
    log('outcomes: played rows', len(played))
    Pm = mark_push(model_chance(attach(priced_lines(pay), preds, cands, played, 'week')))
    ok = Pm.over.notna() & Pm.under.notna() if 'over' in Pm else pd.Series(False, index=Pm.index)
    Pm['q'] = np.nan
    io = Pm.loc[ok, 'over'].map(american_implied); iu = Pm.loc[ok, 'under'].map(american_implied)
    Pm.loc[ok, 'q'] = io / (io + iu)
    Td = attach(priced_td(pay), preds, cands, played, 'week')
    tdp = preds[preds.stat == 'any_td'][['game_id', 'pid', 'p_ge1']].rename(columns={'p_ge1': 'p_td'})
    Td = Td.merge(tdp, on=['game_id', 'pid'], how='left')
    Td['y'] = (Td.y >= 1).astype(float).where(Td.y.notna())
    Td['i'] = Td.odds.map(american_implied, na_action='ignore')
    Td['p'] = np.clip(Td.p_td.values.astype(float), *CLIP)
    Es = mark_push(model_chance(attach(espn_lines(arch), preds, cands, played, 'game')))
    res = {'season': season, 'run_at': pd.Timestamp.now(tz='UTC').isoformat(timespec='seconds'), **extra,
           'predict_summaries': summ,
           'lines': {'priced_main': exclusions(Pm), 'priced_td': exclusions(Td), 'espn': exclusions(Es)}}
    res.update(score(Pm, Td, Es))
    with open(out_path, 'w') as f:
        json.dump(res, f, indent=1, default=str)
    keep = ['set', 'week', 'game_id', 'kickoff_day', 'pid', 'grp', 'stat', 'line', 'over', 'under', 'q', 'odds', 'i',
            'model', 'p_over_raw', 'p_push', 'p', 'y', 'yo', 'why']
    T = pd.concat([L.assign(set=nm) for nm, L in (('priced_main', Pm), ('priced_td', Td), ('espn', Es))],
                  ignore_index=True)
    T[[c for c in keep if c in T.columns]].to_csv(lines_path, index=False, float_format='%.6g')
    for nm, L in (('priced_main', Pm), ('priced_td', Td), ('espn', Es)):
        L.drop(columns=['params'], errors='ignore').to_parquet(os.path.join(data, f'oneshot_{season}_{nm}.parquet'), index=False)
    log('verdict', json.dumps(res['verdict']), 'criteria', json.dumps(res['criteria']))
    log('wrote', out_path, 'and', lines_path)
    return res


# ------------------------------------------------------------------------------------------- the dry run
def dry_inputs(data, season):
    """stand-in inputs of the real shapes, from 2025: payload-like mkt and prices (string thresholds and odds, rows
    with no 'pid' key), archive-like games (conflicts kept apart from `lines`). Lines at the player's last-three-game
    mean (p_<stat>_l3), rounded down to a half point, every fifth to a whole number (pushes); made-up prices around
    50/50; a made-up touchdown price from his career rate. Then one planted line, at least, for every exclusion
    rule. Mechanics only."""
    t = pd.read_parquet(os.path.join(data, 'features.parquet'), filters=[('season', '==', season)])
    t = t[t.grp.isin(['QB', 'RB', 'WR', 'TE']) & (t.week <= max(ESPN_WEEKS))]
    rng = np.random.default_rng(1)
    site = {'passing_yards': ('QB',), 'rushing_yards': ('QB', 'RB'), 'receiving_yards': ('RB', 'WR', 'TE'),
            'receptions': ('RB', 'WR', 'TE'), 'passing_tds': ('QB',), 'scrim_yards': ('RB',),
            'attempts': ('QB',), 'completions': ('QB',), 'carries': ('QB', 'RB'), 'passing_interceptions': ('QB',)}
    mkt, prices, games = {}, {}, {}
    n = 0
    for r in t.itertuples(index=False):
        for st, grps in site.items():
            if r.grp not in grps:
                continue
            l3 = getattr(r, 'p_%s_l3' % STAT[st], np.nan)
            if not (l3 == l3) or l3 < (0.4 if st in ('passing_tds', 'passing_interceptions') else 1.5):
                continue
            n += 1
            line = float(round(l3)) if n % 5 == 0 and l3 >= 1 else math.floor(l3) + 0.5
            qq = rng.uniform(0.42, 0.58)
            od, ud = (to_american(qq * 1.045), to_american((1 - qq) * 1.045))
            if r.week in PRICED_WEEKS and st in ('passing_yards', 'rushing_yards', 'receiving_yards', 'receptions', 'passing_tds'):
                mkt.setdefault(str(r.week), {}).setdefault(r.pid, {})[st] = {'line': line, 'over': od, 'under': ud,
                                                                            'n': r.name, 'g': r.game_id}
            gg = games.setdefault(r.game_id, {'w': int(r.week), 'final': True, 'lines': {}, 'td': [], 'conflict': [], 'gone': []})
            gg['lines'].setdefault(r.pid, {})[st] = [line, line, 'x']
        if r.week in PRICED_WEEKS:
            rate = r.p_any_td_car if r.p_any_td_car == r.p_any_td_car else 0.12
            odds = to_american(float(np.clip(rate * 1.15, 0.03, 0.8)))
            prices.setdefault(str(r.week), []).append({'game_id': r.game_id, 'player': r.name, 'market': 'any_td',
                                                       'threshold': '1', 'odds': ('+%d' % odds) if odds > 0 else str(odds),
                                                       'pid': r.pid})
    plant = {}
    # priced main lines: a stat not covered for his group (receivers' rushing yards), a player with no candidate
    # row (a made-up id), players who did not play (week-1 players given a week-2 line they missed), a line with no
    # second price, a market the models do not cover, a line placed on another game than his
    wr = t[(t.grp == 'WR') & (t.week == 2)].head(5)
    for r in wr.itertuples(index=False):
        mkt.setdefault('2', {}).setdefault(r.pid, {})['rushing_yards'] = {'line': 2.5, 'over': -110, 'under': -110,
                                                                         'n': r.name, 'g': r.game_id}
    mkt.setdefault('3', {})['00-9999999'] = {'receptions': {'line': 3.5, 'over': -110, 'under': -110, 'n': 'Nobody', 'g': None}}
    w1, w2 = set(t[t.week == 1].pid), set(t[t.week == 2].pid)
    gone_players = sorted(w1 - w2)[:5]
    for pid in gone_players:
        mkt.setdefault('2', {})[pid] = {'receptions': {'line': 1.5, 'over': -110, 'under': -110, 'n': pid, 'g': None}}
    mkt.setdefault('4', {})['00-9999998'] = {'receptions': {'line': 2.5, 'over': -110, 'n': 'Half', 'g': None}}
    k3 = sorted(mkt['3'])
    mkt['3'][k3[1]]['kick_pts'] = {'line': 7.5, 'over': -110, 'under': -110, 'n': 'Kicker', 'g': None}
    wk3_games = sorted(t[t.week == 3].game_id.unique())
    for pid in k3[2:4]:
        st0 = next(iter(mkt['3'][pid]))
        e = mkt['3'][pid][st0]
        e['g'] = next(gm for gm in wk3_games if gm != e['g'])
    # priced touchdowns: rows with no 'pid' key (several in a week: each counted), an unreadable price, a row
    # repeated with its price (kept once), and a player given two different prices (left out)
    for k in range(3):
        prices['1'].append({'game_id': prices['1'][k]['game_id'], 'player': 'Unplaced %d' % k, 'market': 'any_td',
                            'threshold': '1', 'odds': '+300'})
    prices['2'].append({'game_id': prices['2'][0]['game_id'], 'player': 'Unplaced 9', 'market': 'any_td',
                        'threshold': '1', 'odds': '+400'})
    prices['2'].append(dict(prices['2'][1], odds='n/a'))
    prices['3'].append(dict(prices['3'][0]))
    prices['4'].append(dict(prices['4'][0], odds='+999'))
    # price-free lines: a player kept by ESPN id alone, a conflict kept apart from `lines` (as the archive keeps
    # them), a withdrawn line (`gone`), a line with no close, a market the models do not cover, a stat not covered
    # for his group, a made-up player, and week-1 players given a week-2 game they missed
    g0, g1 = sorted(games)[:2]
    games[g0]['lines']['espn:123456'] = {'receptions': [3.5, 3.5, 'x']}
    pc = sorted(games[g0]['lines'])[1]
    sc = sorted(games[g0]['lines'][pc])[0]
    v = games[g0]['lines'][pc].pop(sc)
    if not games[g0]['lines'][pc]:
        del games[g0]['lines'][pc]
    games[g0]['conflict'].append([pc, sc, [v, [v[0] + 1, v[1] + 1, 'x']]])
    pg = sorted(games[g1]['lines'])[0]
    games[g1]['gone'].append([pg, sorted(games[g1]['lines'][pg])[0]])
    pn = sorted(games[g1]['lines'])[1]
    games[g1]['lines'][pn][sorted(games[g1]['lines'][pn])[0]] = [4.5, None, 'x']
    games[g1]['lines'][pn]['kick_pts'] = [7.5, 7.5, 'x']
    wr7 = t[(t.grp == 'WR') & (t.week == 7)].head(3)
    for r in wr7.itertuples(index=False):
        games[r.game_id]['lines'].setdefault(r.pid, {})['rushing_yards'] = [2.5, 2.5, 'x']
    games[g1]['lines']['00-9999997'] = {'receptions': [2.5, 2.5, 'x']}
    for pid in gone_players:
        tm = t[(t.pid == pid) & (t.week == 1)].team.iloc[0]
        g2 = t[(t.team == tm) & (t.week == 2)].game_id
        if len(g2):
            games[g2.iloc[0]]['lines'].setdefault(pid, {})['receptions'] = [1.5, 1.5, 'x']
    return {'mkt': mkt, 'prices': prices}, {'games': games}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'))
    ap.add_argument('--repo', default=REPO_DEFAULT, help='the nfl-hub checkout this folder is in, holding PRICED_COMMIT')
    ap.add_argument('--models', default=None)
    ap.add_argument('--dry-run', action='store_true', help='2025 stand-in data, mechanics only, no 2026')
    a = ap.parse_args()
    if not a.data:
        sys.exit('--data DIR is required')
    t0 = time.time()
    man = json.load(open(PR.MANIFEST))
    if a.dry_run:
        if os.environ.get('PROPMODEL_LIFT_HOLDOUT'):
            sys.exit('refused: the dry run never lifts the holdout; unset PROPMODEL_LIFT_HOLDOUT')
        season = SEASON - 1
        cov = coverage(a.data, season, ESPN_WEEKS)
        log('coverage', season, {k: (len(v) if isinstance(v, list) else v) for k, v in cov.items()})
        if cov['missing']:
            sys.exit(f'refused: {season} files lack {cov["missing"][:10]}')
        predictor = PR.Predictor(models_dir=a.models or os.path.join(a.data, 'frozen'))
        pay, arch = dry_inputs(a.data, season)
        run(a.data, season, pay, arch, predictor, DRY_RESULT, os.path.join(a.data, 'oneshot_2025_lines.csv'),
            {'dry_run': 'in sample on 2025 stand-in lines and made-up prices: mechanics only, the numbers mean nothing',
             'runtime': versions(), 'coverage': cov, 'models_source': predictor.sources,
             'raw_vs_manifest': raw_vs_manifest(a.data, man)})
    else:
        reg, pay, arch, not_before = guard(a.repo)
        check_versions()
        pre = os.path.join(HERE, 'PREREGISTRATION.md')
        prereg = {'sha256': sha256_file(pre),
                  'commits': [dict(zip(('commit', 'date', 'subject'), ln.split('\t', 2))) for ln in
                              git(a.repo, 'log', '--format=%H%x09%cI%x09%s', '--', f'{REL}/PREREGISTRATION.md').stdout.splitlines()],
                  'head': git(a.repo, 'rev-parse', 'HEAD').stdout.strip(),
                  'origin_main': git(a.repo, 'rev-parse', 'origin/main').stdout.strip()}
        restored = restore_inputs(a.data, man)
        runs, fresh = begin(a.data, a.repo, prereg['sha256'])
        log('run', runs[-1]['run_id'], '(first attempt)' if fresh else '(after a crash named in the crash note)')
        try:
            F.fetch(a.data, 2010, SEASON, 2013, log=log)
        except BaseException as e:   # noqa: B902 -- a download that fails or is stopped: nothing has been read
            gone = cleanup(a.data) if fresh else []
            raise SystemExit(f'refused: the download did not complete ({e!r}); nothing was scored; removed {gone}')
        try:
            cov = coverage(a.data, SEASON, ESPN_WEEKS)
        except Exception as e:      # a file of another shape: still nothing scored
            gone = cleanup(a.data) if fresh else []
            raise SystemExit(f'refused: the coverage check could not read the 2026 files ({e!r}); nothing was scored; '
                             f'removed {gone}')
        log('coverage', {k: (len(v) if isinstance(v, list) else v) for k, v in cov.items()})
        if cov['missing']:
            gone = cleanup(a.data) if fresh else []
            raise SystemExit(f'refused: the 2026 files do not cover every game of weeks 1-7 yet ({len(cov["missing"])} '
                             f'gaps, e.g. {cov["missing"][:8]}); nothing was scored; removed {gone}; run again later')
        predictor = PR.Predictor(models_dir=a.models or os.path.join(a.data, 'frozen'))
        raw = os.path.join(a.data, 'raw')
        extra = {'registered': reg, 'preregistration': prereg, 'runs': runs, 'runtime': versions(),
                 'netfetch_sha256': sha256_file(os.path.join(a.repo, 'lib', 'netfetch.py')),
                 'not_before': not_before.isoformat(), 'models_source': predictor.sources,
                 'restored_inputs': restored, 'raw_vs_manifest': raw_vs_manifest(a.data, man),
                 'games_history_vs_fit': games_history_diff(a.data), 'coverage': cov,
                 'raw_2026_sha256': {fn: sha256_file(os.path.join(raw, fn)) for fn in raw_2026(a.data)}}
        run(a.data, SEASON, pay, arch, predictor, RESULT, LINES_OUT, extra)
    log(f'done in {time.time() - t0:.0f}s')


if __name__ == '__main__':
    main()
