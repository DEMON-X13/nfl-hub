"""Tables from qb_q_starts.py's rows.csv. Usage: python3 -I qb_q_tables.py <out dir>"""
import json
import math
import sys

import pandas as pd

OUT = sys.argv[1]
R = pd.read_csv(f'{OUT}/rows.csv', low_memory=False)
assert R.season.max() <= 2025
lines = []
summary = {}


def p(s=''):
    lines.append(s)
    print(s)


def wilson(k, n, z=1.959963984540054):
    if n == 0:
        return (float('nan'), float('nan'), float('nan'))
    ph = k / n
    den = 1 + z * z / n
    c = (ph + z * z / (2 * n)) / den
    h = z * math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n)) / den
    return (ph, max(0.0, c - h), min(1.0, c + h))


def fmt(k, n):
    r, lo, hi = wilson(k, n)
    if n == 0:
        return '      -               '
    return f'{100*r:5.1f}% [{100*lo:4.1f}, {100*hi:5.1f}]'


PRAC = ['Full', 'Limited', 'Did Not Participate', 'other']


def binom_two_sided(k, n):
    # exact two-sided sign test, p = 0.5
    if n == 0:
        return float('nan')
    pk = [math.comb(n, i) / 2 ** n for i in range(n + 1)]
    obs = pk[k]
    return min(1.0, sum(q for q in pk if q <= obs * (1 + 1e-9)))




def table(df, title, key):
    p(title)
    p(f'  {"last practice":22s} {"n":>4s} {"started":>7s} {"played":>6s} {"ST":>3s} {"no":>4s}   {"start rate, Wilson 95%":24s} {"played at all":24s} {"games.csv starter":24s}')
    p(f'  {"":22s} {"":>4s} {"":>7s} {"no st.":>6s} {"only":>3s} {"snap":>4s}')
    out = {}
    for g in PRAC + ['all']:
        d = df if g == 'all' else df[df.practice == g]
        n = len(d)
        if n == 0 and g != 'all':
            continue
        k = int((d.outcome == 'started').sum())
        pl = int((d.outcome == 'played, did not start').sum())
        st = int((d.outcome == 'special teams only').sum())
        ns = int((d.outcome == 'no snap row').sum())
        anyp = k + pl
        gc = int(d.gc_started.sum())
        p(f'  {g:22s} {n:4d} {k:7d} {pl:6d} {st:3d} {ns:4d}   {fmt(k, n):24s} {fmt(anyp, n):24s} {fmt(gc, n):24s}')
        r, lo, hi = wilson(k, n)
        ra, loa, hia = wilson(anyp, n)
        rg, log_, hig = wilson(gc, n)
        out[g] = dict(n=n, started=k, played_no_start=pl, st_only=st, no_snap=ns, start_rate=round(r, 4), ci=[round(lo, 4), round(hi, 4)],
                      played_rate=round(ra, 4), played_ci=[round(loa, 4), round(hia, 4)], gc_start_rate=round(rg, 4), gc_ci=[round(log_, 4), round(hig, 4)])
    summary[key] = out
    p()


A = R[R.population == 'incumbent']
B = R[R.population == 'incumbent (games.csv)']

p('QUESTIONABLE STARTING QUARTERBACKS: DO THEY START? NFL regular season 2013-2025 (the 2026 files are never opened)')
p('incumbent = the QB with the most offense snaps in the club\'s previous game that season (known before kickoff).')
p('started = led the club\'s QB offense snaps this game (PFR snap counts); played no st. = offense snaps but not the most;')
p('ST only = a snap row with no offense snap; no snap = no snap row (inactive, or dressed and unused).')
p('games.csv starter = the incumbent is nflverse games.csv\'s home_qb_id/away_qb_id for the game (a second reading of "started").')
p('Questionable meant "50-50" before 2016 (Probable existed); from 2016 Probable was dropped and Questionable is the')
p('"uncertain to play" tag the site reads today, so 2016-2025 is the era that matches the rule being considered.')
p('=' * 130)
for lab, d in (('2013-2025', A), ('2016-2025', A[A.season >= 2016]), ('2013-2015', A[A.season <= 2015])):
    table(d[d.status == 'Questionable'], f'[A] Questionable incumbent, {lab}', f'Q {lab}')
for lab, d in (('2013-2025', A), ('2016-2025', A[A.season >= 2016])):
    table(d[d.status == 'Doubtful'], f'[A] Doubtful incumbent (sanity check), {lab}', f'D {lab}')
table(A[A.status == 'Out'], '[A] Out incumbent (sanity check), 2013-2025', 'Out 2013-2025')
table(A[A.status == 'Probable'], '[A] Probable incumbent (2013-2015 only; context), 2013-2025', 'P 2013-2025')
table(A[A.status == 'practice report only'], '[A] incumbent on the practice report with no game status, 2013-2025', 'none 2013-2025')
d = A[A.status == 'not on report']
k = int((d.outcome == 'started').sum())
p(f'[A] incumbent not on that week\'s report at all, 2013-2025: {k}/{len(d)} started, {fmt(k, len(d))}')
summary['not on report'] = dict(n=len(d), started=k)
p()

p('=' * 130)
p('BY SEASON, Questionable incumbent: started/n by last practice (start rate)')
p(f'  {"season":6s} ' + ' '.join(f'{g:>22s}' for g in ['Full', 'Limited', 'Did Not Participate', 'other', 'all']))
bys = {}
for y in range(2013, 2026):
    d = A[(A.season == y) & (A.status == 'Questionable')]
    cells = []
    for g in ['Full', 'Limited', 'Did Not Participate', 'other', 'all']:
        e = d if g == 'all' else d[d.practice == g]
        k, n = int((e.outcome == 'started').sum()), len(e)
        bys.setdefault(str(y), {})[g] = [k, n]
        cells.append(f'{k:3d}/{n:<3d} ' + (f'{100*k/n:5.1f}%' if n else '     -') + '       ')
    p(f'  {y:<6d} ' + ' '.join(f'{c:>22s}' for c in cells))
summary['by season Q'] = bys
p()
p('BLOCKS OF SEASONS, Questionable incumbent (labelled information; not used to choose anything)')
blk = {}
for lo_, hi_ in ((2013, 2015), (2016, 2018), (2019, 2021), (2022, 2025)):
    d = A[(A.season >= lo_) & (A.season <= hi_) & (A.status == 'Questionable')]
    cells = []
    for g in ['Full', 'Limited', 'Did Not Participate']:
        e = d[d.practice == g]
        k, n = int((e.outcome == 'started').sum()), len(e)
        blk[f'{lo_}-{hi_} {g}'] = [k, n]
        cells.append(f'{g}: {k}/{n} {fmt(k, n)}')
    p(f'  {lo_}-{hi_}  ' + '   '.join(cells))
summary['blocks Q'] = blk
p()
p('BY SEASON, Doubtful incumbent: started/n')
p('  ' + '  '.join(f'{y}: {int((A[(A.season == y) & (A.status == "Doubtful")].outcome == "started").sum())}/{int(((A.season == y) & (A.status == "Doubtful")).sum())}' for y in range(2013, 2026)))
p()

p('=' * 130)
p('DEPTH CHART: for a Questionable incumbent, who started? "next QB on chart" = the top QB on that week\'s chart other than')
p('the incumbent (weekly chart through 2024; 2025 the last daily snapshot before kickoff).')
dc = {}
for lab, d0 in (('2013-2025', A), ('2016-2025', A[A.season >= 2016])):
    for g in ['Limited', 'Did Not Participate', 'Full']:
        d = d0[(d0.status == 'Questionable') & (d0.practice == g)]
        if not len(d):
            continue
        vc = d.who_started.value_counts().to_dict()
        nst = d[d.who_started != 'incumbent']
        k_next = int((nst.who_started == 'next QB on chart').sum())
        hc = d.chart_rank.fillna(0).astype(int).value_counts().sort_index().to_dict()
        p(f'  Q + {g}, {lab}: n={len(d)}  who started: {vc}')
        p(f'      incumbent\'s rank among the chart\'s QBs (0 = not on it / no chart): {hc}')
        p(f'      when the incumbent did not start ({len(nst)}): the next QB on the chart started {k_next}, {fmt(k_next, len(nst))}')
        p(f'      the next QB on the chart started, of all {len(d)}: {int((d.who_started == "next QB on chart").sum())}, {fmt(int((d.who_started == "next QB on chart").sum()), len(d))}')
        dc[f'{g} {lab}'] = dict(n=len(d), who_started=vc, chart_rank=hc, not_started=len(nst), next_started_when_not=k_next)
summary['depth chart'] = dc
p()
p('  Q + Limited 2013-2025, where the incumbent did not start: the game, the incumbent, who started, the chart\'s next QB')
d = A[(A.status == 'Questionable') & (A.practice == 'Limited') & (A.who_started != 'incumbent')]
for r in d.sort_values(['season', 'week', 'team']).itertuples():
    p(f'    {r.season} wk{r.week:<2d} {r.team:3s} {r.name:22s} {r.outcome:22s} off snaps {int(r.off_snaps):3d}  started: {r.starter_name:22s} chart next: {r.chart_next_name:22s} [{r.who_started}]')
p()

p('=' * 130)
p('SENSITIVITY: the incumbent read from games.csv (the previous game\'s home_qb_id/away_qb_id, i.e. the QB who started it')
p('even if he left early); outcome still "led QB offense snaps" (and the games.csv starter column beside it).')
for lab, d in (('2013-2025', B), ('2016-2025', B[B.season >= 2016])):
    table(d[d.status == 'Questionable'], f'[B] Questionable incumbent (games.csv), {lab}', f'B Q {lab}')
table(B[B.status == 'Doubtful'], '[B] Doubtful incumbent (games.csv), 2013-2025', 'B D 2013-2025')

C = R[R.population == 'chart QB1']
p('=' * 130)
p('SENSITIVITY: the QB at the top of that week\'s depth chart (every club-game, week 1 and a club\'s first game included;')
p('weekly chart through 2024, 2025 the last daily snapshot before kickoff).')
for lab, d in (('2013-2025', C), ('2016-2025', C[C.season >= 2016])):
    table(d[d.status == 'Questionable'], f'[C] Questionable chart QB1, {lab}', f'C Q {lab}')
table(C[C.status == 'Doubtful'], '[C] Doubtful chart QB1, 2013-2025', 'C D 2013-2025')
cgf = pd.read_csv(f'{OUT}/club_games.csv', low_memory=False)[['game_id', 'team', 'inc']]
C2 = C.merge(cgf, on=['game_id', 'team'], how='left')
C2['role'] = [('club\'s first game' if not isinstance(i, str) else ('the incumbent' if i == g else 'not the incumbent (did not lead the previous game)'))
              for i, g in zip(C2.inc, C2.gsis)]
p('[C] by whether chart QB1 was also the incumbent (led the previous game): Questionable chart QB1, start rate, and naming the')
p('    starter IN (chart QB1) against OUT (the chart\'s next QB the report does not rule out)')
cdec = {}
for lab, e0 in (('2013-2025', C2), ('2016-2025', C2[C2.season >= 2016])):
    for g in ['Limited', 'Did Not Participate', 'Full']:
        for role, e in e0[(e0.status == 'Questionable') & (e0.practice == g)].groupby('role'):
            n = len(e)
            k = int((e.outcome == 'started').sum())
            ko = int(e.next_avail_started.sum())
            p(f'  {lab} Q + {g:20s} {role:52s} n={n:3d}  IN right {k:3d} {fmt(k, n)}  OUT right {ko:3d} {fmt(ko, n)}')
            cdec[f'{lab} {g} {role}'] = dict(n=n, in_right=k, out_right=ko)
        e = e0[(e0.status == 'Questionable') & (e0.practice == g)]
        n = len(e); k = int((e.outcome == 'started').sum()); ko = int(e.next_avail_started.sum())
        pv = binom_two_sided(min(k, ko), k + ko)
        p(f'  {lab} Q + {g:20s} {"all chart QB1":52s} n={n:3d}  IN right {k:3d} {fmt(k, n)}  OUT right {ko:3d} {fmt(ko, n)}  sign test p={pv:.4f}')
        cdec[f'{lab} {g} all'] = dict(n=n, in_right=k, out_right=ko, sign_p=round(pv, 4))
summary['chart QB1 by role'] = cdec
p()
p('=' * 130)
p('SPLITS of Q + Limited (2013-2025 and 2016-2025): by the game\'s weekday (a Thursday game\'s report is an estimate)')
g = pd.read_csv(sys.argv[2], low_memory=False)[['game_id', 'weekday']] if len(sys.argv) > 2 else None
if g is not None:
    A2 = A.merge(g, on='game_id', how='left')
    for lab, d0 in (('2013-2025', A2), ('2016-2025', A2[A2.season >= 2016])):
        d = d0[(d0.status == 'Questionable') & (d0.practice == 'Limited')]
        for wd, e in d.groupby(d.weekday.eq('Thursday').map({True: 'Thursday', False: 'not Thursday'})):
            k = int((e.outcome == 'started').sum())
            p(f'  {lab} {wd:13s}: {k}/{len(e)} started, {fmt(k, len(e))}')
p()

p('=' * 130)
p('NAMING THE STARTER: rule IN (expect the Questionable incumbent) against rule OUT (expect the next QB on that week\'s chart')
p('whom the report does not rule out, Out or Doubtful). Correct = the expected QB led the club\'s QB offense snaps.')
p('Sign test on the games where exactly one of the two rules was right.')
dec = {}
for lab, d0 in (('2013-2025', A), ('2016-2025', A[A.season >= 2016])):
    for g in ['Limited', 'Did Not Participate', 'Full', 'Limited or Did Not Participate']:
        d = d0[(d0.status == 'Questionable') & ((d0.practice.isin(['Limited', 'Did Not Participate'])) if g.startswith('Limited or') else (d0.practice == g))]
        n = len(d)
        kin = int((d.outcome == 'started').sum())
        kout = int(d.next_avail_started.sum())
        pv = binom_two_sided(min(kin, kout), kin + kout)
        p(f'  Q + {g:31s} {lab}: n={n:3d}  IN right {kin:3d} {fmt(kin, n)}   OUT right {kout:3d} {fmt(kout, n)}   neither {n-kin-kout:2d}   sign test p={pv:.4f}')
        dec[f'{g} {lab}'] = dict(n=n, in_right=kin, out_right=kout, neither=n - kin - kout, sign_p=round(pv, 4))
summary['in vs out'] = dec
p()

p('=' * 130)
p('EXPLORATORY SPLITS of Q + Limited incumbents (evidence only; nothing here is used to choose a rule)')
d = A[(A.status == 'Questionable') & (A.practice == 'Limited')].copy()
d['prev_full'] = d.prev_off_pct.fillna(0) >= 0.95
for lab, e0 in (('2013-2025', d), ('2016-2025', d[d.season >= 2016])):
    for v, e in e0.groupby('prev_full'):
        k = int((e.outcome == 'started').sum())
        p(f'  {lab} previous game offense snap share {">= 95%" if v else "<  95%"}: {k:3d}/{len(e):<3d} started, {fmt(k, len(e))}')


def inj_group(s):
    s = str(s).lower()
    if 'concussion' in s or 'head' in s:
        return 'concussion/head'
    if any(w in s for w in ('hand', 'thumb', 'finger', 'wrist', 'shoulder', 'elbow', 'arm', 'forearm')):
        return 'throwing side: hand/arm/shoulder'
    if any(w in s for w in ('ankle', 'foot', 'knee', 'toe', 'hamstring', 'calf', 'hip', 'groin', 'quad', 'leg', 'achilles')):
        return 'lower body'
    if any(w in s for w in ('rib', 'chest', 'back', 'oblique', 'abdomen', 'neck')):
        return 'trunk: ribs/chest/back'
    return 'other/illness/none given'


d['inj_group'] = d.injury.map(inj_group)
for g_, e in d.groupby('inj_group'):
    k = int((e.outcome == 'started').sum())
    p(f'  2013-2025 injury {g_:34s}: {k:3d}/{len(e):<3d} started, {fmt(k, len(e))}')
p()
json.dump(summary, open(f'{OUT}/summary.json', 'w'), indent=1)
open(f'{OUT}/tables.txt', 'w').write('\n'.join(lines) + '\n')
