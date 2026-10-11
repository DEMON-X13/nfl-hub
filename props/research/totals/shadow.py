"""The game-totals shadow: the frozen ratings candidate called on every game to come, frozen at
kickoff, graded after the final, and judged once against a bar set before its first call.

The study in this folder (README.md) found no points formula that beats the posted total, and the
site prices a total at the market's own chance. The ratings candidate (cand_ratings.py, the ratings
fade: mu = line + W * (model total - line), W = -0.25, sd refit each season) was level with the market
over 2024-2026 and strong on 2026's first 65 games, which the study's rule calls direction only. The
owner's call (2026-10-11): track it quietly from now on, against a bar written down before any of its
live calls exist. It is never shown on any page, never used in a suggestion, and nothing on the site
reads what this writes; it is turned on only if it passes, and only by a later change of its own.

What a call is. For the season of the games to come, cand_ratings.fit() on every played game of the
seasons before it (2010 on; the 2009 regular season seeds the first, as the study's dataset does), then
cand_ratings.rate() over the season's games with a line, each played game's score read straight from
games.csv (the frozen candidate read the same scores back from the season-to-date averages of the
teams' next rows), so a game is rated on every score from an earlier calendar date. Then, as
cand_ratings.predict() does: mu = line + W * (model total - line), sd the season's fitted sd, P(over) =
1 - Phi((line - mu) / sd). Beside it the market's chance: the no-vig chance of games.csv's over and
under prices at the same moment, i(over) / (i(over) + i(under)), none where either price is missing.
Only games.csv is read (about 2 MB): the candidate needs scores, schedules and lines, no play-by-play.
shadow_equiv.py proves these numbers are the research harness's own for cand_ratings, to 1e-9, on
every game of the development seasons.

The ledger (shadow/ledger.json). One call a game, keyed by game id: the line, the over and under
prices, both chances, mu, sd, the model total, the 3-point-edge pick (the study's rule: the model's
chance at least 3 points above the chance the price itself implies, margin left in, at the price of
the call, -110 where it is missing) and called_at, the run that set those numbers. A call is rewritten
by a run before kickoff whenever its numbers change, and frozen by the first run at or after kickoff
(by the clock, the kickoff the call holds or the one games.csv now gives, whichever is earlier):
after that it is never changed. After the final it is graded against its own line (the total, over,
under or push, and the pick's units). A game that kicks off without a call, or never had a line, has
none. A run that changes nothing writes nothing. The summary is a function of the calls alone.

The bar (BAR below, written into the ledger and README.md before the first live call, and held there
by shadow_check.py): decided once 285 games are graded over or under with a market chance, on the
first 285 in the order they were graded; PASS only if the model beats the market's no-vig chance on
both Brier and log loss with paired bootstrap 90% intervals wholly below zero, and its 3-point-edge
picks on those games are up in units; otherwise FAIL, and the tracking stops (no new calls; calls
already frozen are still graded). The verdict is written once and never revisited. Until then the
summary gives the running numbers and how many of the 285 are in, and never says passing.

Run (the betting job runs it after the models, update.yml, with the games.csv it has just downloaded):
    python3 props/research/totals/shadow.py [--games PATH] [--now ISO] [--ledger PATH]
Without --games it downloads nflverse's games.csv into data/shadow/ (gitignored). SHADOW_NOW stands in
for the clock and SHADOW_LEDGER for the ledger's path, for tests (test_shadow.py).
Exit 0: ledger written or unchanged. Exit 1: refused (games.csv missing, short or in a new shape, the
frozen candidate changed, the bar in the ledger not the one registered); nothing is written.
"""
import os, sys, json, hashlib, argparse, urllib.request
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
from scipy.stats import norm

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import cand_ratings as CR          # the frozen candidate, byte for byte (CAND_SHA256)

GAMES_URL = 'https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv'
DEFAULT_GAMES = os.path.join(HERE, 'data', 'shadow', 'games.csv')
LEDGER = os.path.join(HERE, 'shadow', 'ledger.json')
LEDGER_REL = 'props/research/totals/shadow/ledger.json'
CAND_FILE = os.path.join(HERE, 'cand_ratings.py')
CAND_SHA256 = '88af3991230557a9e5dc702dbf3d654ef221e91d78c7756fd905923c82c95f2e'
FIRST, WARM = 2010, 2009           # the study's dataset: rows from 2010, 2009 read for last season's carry
MIN_SEASON_GAMES = 250             # every season since 2009 has 267 or more: fewer is a cut-off download
EDGE, EST_PRICE = 0.03, -110       # the study's pick rule
CLIP = 1e-6                        # the harness's clip for log loss
N_BOOT, BOOT_SEED = 10000, 0
ET = ZoneInfo('America/New_York')
NEED = ['game_id', 'season', 'game_type', 'week', 'gameday', 'gametime', 'away_team', 'home_team',
        'away_score', 'home_score', 'location', 'total', 'total_line', 'over_odds', 'under_odds']

# The pre-registered bar. Set 2026-10-11, committed before the ledger's first call; shadow_check.py fails
# a ledger whose bar is not this one or not the one the last commit had.
BAR = {
    'games': 285,
    'sample': ('the first 285 frozen calls graded over or under (a push drops out, as in the study) that '
               'had the market\'s no-vig chance at the moment of the call, in the order they were graded '
               '(then kickoff, then game id)'),
    'pass_if': [
        'Brier score: the model\'s minus the market\'s no-vig chance\'s, its paired bootstrap 90% interval '
        '(10,000 resamples of the 285 games, seed 0, 5th to 95th percentile) wholly below 0',
        'log loss (chances clipped to 1e-6): the same, its interval wholly below 0',
        'the 3-point-edge picks on those 285 games are up in units (more than 0; no picks is not up), at '
        'the price of the call, -110 where it was missing',
    ],
    'otherwise': ('FAIL: the tracking stops (no new calls; calls already frozen are still graded) and the '
                  'formula is never shown on the site or used in a suggestion'),
    'if_pass': ('PASS makes it a candidate to turn on, by a change of its own; nothing on the site moves '
                'by itself, and until then it is never shown or used'),
    'before': ('no verdict before 285: until then the summary gives the running numbers and how many of the '
               '285 are in, never a verdict or a word of passing'),
}

CALL_FIELDS = ('season', 'week', 'game_type', 'away', 'home', 'kickoff', 'line', 'over_odds', 'under_odds',
               'p_model', 'p_market', 'mu', 'sd', 'model_total', 'pick', 'pick_price', 'pick_price_est',
               'called_at')


class Refuse(Exception):
    """An input is missing or wrong: nothing is written and the last ledger stays."""


# ----------------------------------------------------------------------------- small helpers
def now_utc(v=None):
    v = v or os.environ.get('SHADOW_NOW')
    return datetime.fromisoformat(v.replace('Z', '+00:00')).astimezone(timezone.utc) if v else datetime.now(timezone.utc)


def iso(t):
    return t.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def parse_iso(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))


def kickoff_utc(gameday, gametime):
    """games.csv's day and US Eastern clock time (13:00 where it has none, as the study) in UTC."""
    t = gametime if isinstance(gametime, str) and gametime else '13:00'
    return datetime.strptime(f'{gameday} {t}', '%Y-%m-%d %H:%M').replace(tzinfo=ET).astimezone(timezone.utc)


def num(x):
    """A games.csv number for JSON: None for a missing one, an int where it is whole."""
    if x is None:
        return None
    x = float(x)
    if not np.isfinite(x):
        return None
    return int(x) if x == int(x) else x


def price_ok(a):
    return a is not None and np.isfinite(float(a)) and float(a) != 0


def implied(a):
    a = float(a)
    return -a / (-a + 100.0) if a < 0 else 100.0 / (a + 100.0)


def payout(a):
    a = float(a)
    return 100.0 / -a if a < 0 else a / 100.0


def no_vig(oo, uo):
    if not (price_ok(oo) and price_ok(uo)):
        return None
    po, pu = implied(oo), implied(uo)
    return po / (po + pu)


def pick_for(p, oo, uo):
    """The study's pick (harness._picks): the side whose chance beats the chance its price implies by
    EDGE, the over first when both do and it is the larger edge; -110 where a price is missing.
    Returns (side, price, price_is_estimated) or (None, None, None)."""
    po = float(oo) if price_ok(oo) else EST_PRICE
    pu = float(uo) if price_ok(uo) else EST_PRICE
    eo, eu = p - implied(po), (1 - p) - implied(pu)
    if eo >= EDGE and eo >= eu:
        return 'over', num(po), not price_ok(oo)
    if eu >= EDGE:
        return 'under', num(pu), not price_ok(uo)
    return None, None, None


def result_of(total, line):
    return 'over' if total > line else 'under' if total < line else 'push'


def pick_units(pick, price, result):
    if pick is None:
        return None
    if result == 'push':
        return 0.0
    return round(payout(price), 6) if pick == result else -1.0


# ----------------------------------------------------------------------------- games.csv
def fetch_games(dest=DEFAULT_GAMES):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    last = None
    for i in range(3):
        try:
            with urllib.request.urlopen(GAMES_URL, timeout=120) as r:
                body = r.read()
            if len(body) < 100000:
                raise IOError(f'only {len(body)} bytes')
            tmp = dest + '.part'
            with open(tmp, 'wb') as fh:
                fh.write(body)
            os.replace(tmp, dest)
            return dest
        except Exception as e:          # a dropped connection: try again, then refuse
            last = e
    raise Refuse(f'games.csv did not download: {last}')


def load_games(path):
    """games.csv as the study's dataset reads it (build_dataset.load_games), with the columns the
    frozen candidate reads: kickoff (Eastern, naive), date, played, neutral, and last season's
    points for and against a game for each side's franchise and the league (the _ls columns, from
    the whole previous regular season), which seed the first training season."""
    if not os.path.exists(path):
        raise Refuse(f'no games.csv at {path}')
    g = pd.read_csv(path, low_memory=False)
    miss = [c for c in NEED if c not in g.columns]
    if miss:
        raise Refuse(f'games.csv has no {miss}: a new shape')
    g = g[g.season >= WARM].copy()
    g['gametime'] = g.gametime.fillna('13:00')
    g['kickoff'] = pd.to_datetime(g.gameday + ' ' + g.gametime)      # US Eastern, naive (the study's)
    g['date'] = g.gameday.astype(str)
    g['played'] = g.home_score.notna() & g.away_score.notna()
    g['neutral'] = (g.location == 'Neutral').astype(int)
    reg = g[(g.game_type == 'REG') & g.played]
    side = pd.concat([
        pd.DataFrame({'season': reg.season, 'fr': reg.home_team.map(CR.fr),
                      'pf': reg.home_score.astype(float), 'pa': reg.away_score.astype(float)}),
        pd.DataFrame({'season': reg.season, 'fr': reg.away_team.map(CR.fr),
                      'pf': reg.away_score.astype(float), 'pa': reg.home_score.astype(float)})], ignore_index=True)
    side['n'] = 1
    ls = side.groupby(['fr', 'season'])[['n', 'pf', 'pa']].sum().reset_index()
    ls['season'] = ls.season + 1
    ls['pf_pg_ls'] = ls.pf / ls.n
    ls['pa_pg_ls'] = ls.pa / ls.n
    lg = side.groupby('season')[['n', 'pf']].sum().reset_index()
    g = g.merge(pd.DataFrame({'season': lg.season + 1, 'lg_ppg_ls': lg.pf / lg.n}), on='season', how='left')
    for s in ('home', 'away'):
        g['fr_'] = g[f'{s}_team'].map(CR.fr)
        g = g.merge(ls[['fr', 'season', 'pf_pg_ls', 'pa_pg_ls']].rename(
            columns={'fr': 'fr_', 'pf_pg_ls': f'{s}_pf_pg_ls', 'pa_pg_ls': f'{s}_pa_pg_ls'}), on=['fr_', 'season'], how='left')
    g = g.drop(columns='fr_')
    unknown = set(g.home_team) | set(g.away_team)
    unknown = {t for t in unknown if CR.fr(t) not in CR.TI}
    if unknown:
        raise Refuse(f'games.csv names clubs the candidate does not know: {sorted(unknown)}')
    return g.sort_values(['kickoff', 'game_id']).reset_index(drop=True)


# ----------------------------------------------------------------------------- the frozen candidate
def fit_season(g, season):
    """cand_ratings.fit on every played game of the seasons before `season`, as the harness trains it."""
    G = g[g.season >= FIRST]
    train = G[(G.season < season) & G.played & G.total.notna()].copy()
    for s in range(WARM, season):
        n = int((g[g.season == s].played).sum())
        if n < MIN_SEASON_GAMES:
            raise Refuse(f'games.csv has {n} played games in {s}: a cut-off download')
    return CR.fit(train)


def season_calls(g, season, model=None, hide=()):
    """The frozen candidate's numbers for every game of `season` with a line, each from the ratings the
    earlier calendar dates left: cand_ratings.predict() with each played game's score read from games.csv
    instead of read back from the next rows (`hide`: game ids whose scores are treated as unknown, which
    shadow_equiv.py uses to give it the harness's own information). Returns (frame, model)."""
    m = model if model is not None else fit_season(g, season)
    G = g[g.season >= FIRST]
    t = G[(G.season == season) & G.total_line.notna()].sort_values(['kickoff', 'game_id']).reset_index(drop=True)
    order = np.argsort(t.kickoff.to_numpy(), kind='stable')
    ts = t.iloc[order].reset_index(drop=True).copy()
    known = ts.played.to_numpy(bool) & ~ts.game_id.isin(list(hide)).to_numpy(bool)
    ts['hp'] = np.where(known, ts.home_score.to_numpy(float), np.nan)
    ts['ap'] = np.where(known, ts.away_score.to_numpy(float), np.nan)
    ph, pa, _ = CR.rate(ts, m['state'])
    tot = np.empty(len(t))
    tot[order] = 2 * m['b'][0] + m['b'][1] * (ph + pa)
    L = t.total_line.to_numpy(float)
    mu = L + CR.W * (tot - L)
    sd = np.full(len(t), m['sd'])
    p = 1 - norm.cdf((L - mu) / sd)
    return pd.DataFrame({'game_id': t.game_id.to_numpy(), 'model_total': tot, 'mu': mu, 'sd': sd, 'p_over': p}), m


# ----------------------------------------------------------------------------- summary and the bar
def _boot_ci(d, n_boot=N_BOOT, seed=BOOT_SEED):
    """Paired bootstrap 90% interval of the mean of per-game differences: games resampled with
    replacement, the 5th and 95th percentiles of the resampled means."""
    d = np.asarray(d, float)
    rng = np.random.default_rng(seed)
    means = np.empty(n_boot)
    step = max(1, 4_000_000 // max(len(d), 1))
    for a in range(0, n_boot, step):
        b = min(n_boot, a + step)
        means[a:b] = d[rng.integers(0, len(d), size=(b - a, len(d)))].mean(1)
    return [round(float(np.percentile(means, 5)), 6), round(float(np.percentile(means, 95)), 6)]


def _scores(rows):
    """Brier and log loss of the model and the market on the same graded games, and their paired
    differences with 90% intervals."""
    o = np.array([1.0 if r['final']['result'] == 'over' else 0.0 for r in rows])
    p = np.clip(np.array([r['p_model'] for r in rows], float), CLIP, 1 - CLIP)
    q = np.clip(np.array([r['p_market'] for r in rows], float), CLIP, 1 - CLIP)
    bm, bq = (p - o) ** 2, (q - o) ** 2
    lm = -(o * np.log(p) + (1 - o) * np.log(1 - p))
    lq = -(o * np.log(q) + (1 - o) * np.log(1 - q))
    return {
        'model': {'brier': round(float(bm.mean()), 6), 'logloss': round(float(lm.mean()), 6)},
        'market': {'brier': round(float(bq.mean()), 6), 'logloss': round(float(lq.mean()), 6)},
        'brier_diff': round(float((bm - bq).mean()), 6), 'brier_diff_ci90': _boot_ci(bm - bq),
        'logloss_diff': round(float((lm - lq).mean()), 6), 'logloss_diff_ci90': _boot_ci(lm - lq),
    }


def _picks(rows):
    w = l = p = est = 0
    units = 0.0
    for r in rows:
        if r.get('pick') is None:
            continue
        res = r['final']['result']
        est += bool(r.get('pick_price_est'))
        if res == 'push':
            p += 1
        elif res == r['pick']:
            w += 1
        else:
            l += 1
        units += r['final']['units']
    return {'bets': w + l + p, 'won': w, 'lost': l, 'push': p, 'units': round(units, 6), 'at_est_price': est}


def _order(c):
    return (c['final']['graded_at'], c['kickoff'], c['game_id'])


def compared(calls):
    """The graded calls the bar counts: over or under, with the market's chance, in the bar's order."""
    rows = [dict(c, game_id=g) for g, c in calls.items()
            if c.get('final') and c['final']['result'] != 'push' and c.get('p_market') is not None]
    return sorted(rows, key=_order)


def standing(n, decision=None):
    if decision:
        return f"decided at {decision['games']} games on {decision['decided_at']}: {decision['verdict']}"
    return f"{n} of {BAR['games']} graded games toward the verdict; the bar is judged at {BAR['games']}, not before"


def summarize(calls, decision=None):
    """The ledger's summary: a function of the calls (and the decision once made) alone."""
    vals = list(calls.values())
    graded = [dict(c, game_id=g) for g, c in calls.items() if c.get('final')]
    cmp_ = compared(calls)
    s = {
        'calls': len(vals),
        'to_come': sum(1 for c in vals if not c.get('frozen')),
        'frozen_awaiting_final': sum(1 for c in vals if c.get('frozen') and not c.get('final')),
        'graded': len(graded),
        'pushes': sum(1 for c in graded if c['final']['result'] == 'push'),
        'graded_without_market_price': sum(1 for c in graded if c.get('p_market') is None),
        'compared': len(cmp_),
        'scores': _scores(cmp_) if cmp_ else None,
        'picks': _picks(graded),
        'standing': standing(len(cmp_), decision),
    }
    return s


def decide(calls, at):
    """The verdict, once BAR['games'] calls are in the sample: on the first BAR['games'] of them."""
    rows = compared(calls)
    n = BAR['games']
    if len(rows) < n:
        return None
    sample = rows[:n]
    sc = _scores(sample)
    pk = _picks(sample)
    ok = sc['brier_diff_ci90'][1] < 0 and sc['logloss_diff_ci90'][1] < 0 and pk['units'] > 0
    return {'verdict': 'PASS' if ok else 'FAIL', 'decided_at': iso(at), 'games': n, 'scores': sc, 'picks': pk,
            'sample': [r['game_id'] for r in sample]}


# ----------------------------------------------------------------------------- the run
def candidate_sha():
    with open(CAND_FILE, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def new_ledger(at):
    return {
        'what': ('The game-totals shadow (props/research/totals/shadow.py, README.md "The shadow"): the frozen '
                 'ratings candidate\'s call on each game to come, frozen at kickoff and graded after the final, '
                 'beside the market\'s no-vig chance at the same moment. Research only: no page reads this file '
                 'and nothing on the site uses it.'),
        'candidate': {'file': 'props/research/totals/cand_ratings.py', 'sha256': CAND_SHA256, 'W': CR.W,
                      'rule': 'mu = line + W * (model total - line); sd refit each season; P(over) = 1 - Phi((line - mu) / sd)'},
        'bar': BAR,
        'bar_registered': iso(at),
        'run_at': iso(at),
        'fits': {},
        'decision': None,
        'summary': None,
        'calls': {},
    }


def started(call, row, now):
    """A call freezes at the first run at or after its kickoff: the one it holds or the one games.csv
    now gives, whichever is earlier, or once games.csv has the final."""
    k = parse_iso(call['kickoff'])
    if row is not None:
        k = min(k, kickoff_utc(row.gameday, row.gametime))
        if row.played:
            return True
    return now >= k


def to_come(g, now):
    """Games still to come with a line: not played, kicking off after now."""
    ko = np.array([kickoff_utc(d, t) > now for d, t in zip(g.gameday, g.gametime)], bool)
    return g[ko & ~g.played.to_numpy(bool) & g.total_line.notna().to_numpy(bool)]


def make_call(row, r, now):
    line = float(row.total_line)
    oo, uo = num(row.over_odds), num(row.under_odds)
    p = round(float(r.p_over), 6)
    q = no_vig(oo, uo)
    side, price, est = pick_for(p, oo, uo)
    return {
        'season': int(row.season), 'week': int(row.week), 'game_type': str(row.game_type),
        'away': str(row.away_team), 'home': str(row.home_team), 'kickoff': iso(kickoff_utc(row.gameday, row.gametime)),
        'line': line, 'over_odds': oo, 'under_odds': uo,
        'p_model': p, 'p_market': None if q is None else round(q, 6),
        'mu': round(float(r.mu), 4), 'sd': round(float(r.sd), 4), 'model_total': round(float(r.model_total), 4),
        'pick': side, 'pick_price': price, 'pick_price_est': est,
        'called_at': iso(now), 'frozen': False, 'frozen_at': None, 'final': None,
    }


def same_call(a, b):
    return all(a.get(k) == b.get(k) for k in CALL_FIELDS if k != 'called_at')


def grade(call, row, now):
    h, a = int(row.home_score), int(row.away_score)
    res = result_of(h + a, call['line'])
    prev = call.get('final') or {}
    return {'home': h, 'away': a, 'total': h + a, 'result': res,
            'units': pick_units(call.get('pick'), call.get('pick_price'), res),
            'graded_at': prev.get('graded_at') or iso(now)}


def run(now=None, games_path=None, ledger_path=None, log=print):
    now = now_utc(now) if not isinstance(now, datetime) else now
    ledger_path = ledger_path or os.environ.get('SHADOW_LEDGER') or LEDGER
    sha = candidate_sha()
    if sha != CAND_SHA256:
        raise Refuse(f'cand_ratings.py is not the frozen candidate (sha256 {sha[:8]}, frozen {CAND_SHA256[:8]})')
    if games_path is None:
        games_path = fetch_games()
    g = load_games(games_path)

    old = None
    if os.path.exists(ledger_path):
        with open(ledger_path) as fh:
            old = json.load(fh)
        if old.get('bar') != BAR:
            raise Refuse('the bar in the ledger is not the one registered (BAR): nothing is written')
    L = json.loads(json.dumps(old)) if old else new_ledger(now)
    calls = L['calls']
    by_id = {r.game_id: r for r in g.itertuples(index=False)}
    n = {'made': 0, 'rewritten': 0, 'frozen': 0, 'graded': 0, 'regraded': 0, 'dropped': 0}

    # 1. freeze what has kicked off, grade what is final
    for gid in list(calls):
        c = calls[gid]
        row = by_id.get(gid)
        if not c.get('frozen'):
            if started(c, row, now):
                c['frozen'], c['frozen_at'] = True, iso(now)
                n['frozen'] += 1
            elif row is None:
                del calls[gid]                      # gone from the schedule before its kickoff: no call stands
                n['dropped'] += 1
                continue
        if c.get('frozen') and row is not None and row.played:
            f = grade(c, row, now)
            if c.get('final') != f:
                n['regraded' if c.get('final') else 'graded'] += 1
                c['final'] = f

    # 2. the verdict, once the sample is in; never revisited
    if not L.get('decision'):
        L['decision'] = decide(calls, now)
    stopped = bool(L.get('decision')) and L['decision']['verdict'] == 'FAIL'

    # 3. a call for every game to come (none once the bar has failed: the tracking stops)
    if stopped:
        for gid in [k for k, c in calls.items() if not c.get('frozen')]:
            del calls[gid]
            n['dropped'] += 1
    else:
        fut = to_come(g, now)
        for season in sorted(fut.season.unique()):
            earlier = g[(g.season < season) & ~g.played]
            if any(kickoff_utc(d, t) > now for d, t in zip(earlier.gameday, earlier.gametime)):
                log(f'season {season}: an earlier season still has games to come; no calls yet')
                continue
            frame, m = season_calls(g, int(season))
            L['fits'][str(season)] = {'b0': round(float(m['b'][0]), 6), 'b1': round(float(m['b'][1]), 6),
                                      'sd': round(float(m['sd']), 6),
                                      'trained_on': f'every played game {FIRST}-{season - 1}'}
            r_by = {r.game_id: r for r in frame.itertuples(index=False)}
            for row in fut[fut.season == season].itertuples(index=False):
                old_c = calls.get(row.game_id)
                if old_c and old_c.get('frozen'):
                    continue                        # frozen calls are never touched
                c = make_call(row, r_by[row.game_id], now)
                if old_c is None:
                    calls[row.game_id] = c
                    n['made'] += 1
                elif not same_call(old_c, c):
                    calls[row.game_id] = c
                    n['rewritten'] += 1

    L['calls'] = dict(sorted(calls.items(), key=lambda kv: (kv[1]['kickoff'], kv[0])))
    L['summary'] = summarize(L['calls'], L.get('decision'))

    def body(x):
        return json.dumps({k: v for k, v in x.items() if k != 'run_at'}, sort_keys=True)
    changed = old is None or body(old) != body(L)
    if changed:
        L['run_at'] = iso(now)
        os.makedirs(os.path.dirname(ledger_path), exist_ok=True)
        tmp = ledger_path + '.part'
        with open(tmp, 'w') as fh:
            json.dump(L, fh, indent=1)
            fh.write('\n')
        os.replace(tmp, ledger_path)
    report(L, n, changed, log)
    return L, n, changed


def report(L, n, changed, log=print):
    s = L['summary']
    log(f"shadow: {s['calls']} calls ({s['to_come']} to come, {s['frozen_awaiting_final']} frozen awaiting a final, "
        f"{s['graded']} graded, {s['pushes']} pushes) | this run: {n['made']} made, {n['rewritten']} rewritten, "
        f"{n['frozen']} frozen, {n['graded']} graded, {n['regraded']} regraded, {n['dropped']} dropped | "
        f"{'ledger written' if changed else 'nothing changed, nothing written'}")
    log(f"the bar (registered {L['bar_registered']}): decided at {BAR['games']} graded games ({BAR['sample']}); "
        f"PASS only if: " + '; '.join(BAR['pass_if']) + f". Otherwise {BAR['otherwise']}.")
    log(f"where it stands: {s['standing']}")
    if s['scores']:
        sc = s['scores']
        log(f"  on {s['compared']} games: Brier model {sc['model']['brier']:.4f} market {sc['market']['brier']:.4f} "
            f"(diff {sc['brier_diff']:+.4f}, 90% [{sc['brier_diff_ci90'][0]:+.4f}, {sc['brier_diff_ci90'][1]:+.4f}]); "
            f"log loss model {sc['model']['logloss']:.4f} market {sc['market']['logloss']:.4f} "
            f"(diff {sc['logloss_diff']:+.4f}, 90% [{sc['logloss_diff_ci90'][0]:+.4f}, {sc['logloss_diff_ci90'][1]:+.4f}])")
    pk = s['picks']
    log(f"  3-point-edge picks graded: {pk['won']}-{pk['lost']}-{pk['push']}, {pk['units']:+.2f} units"
        f"{' (' + str(pk['at_est_price']) + ' at -110 for a missing price)' if pk['at_est_price'] else ''}")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--games', help='games.csv to read (default: download nflverse\'s into data/shadow/)')
    ap.add_argument('--now', help='an ISO time standing in for the clock (or SHADOW_NOW)')
    ap.add_argument('--ledger', help='the ledger (default shadow/ledger.json, or SHADOW_LEDGER)')
    a = ap.parse_args(argv)
    try:
        run(a.now, a.games, a.ledger)
    except Refuse as e:
        print('shadow refused:', e, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
