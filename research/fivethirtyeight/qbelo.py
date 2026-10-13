"""Study 5: FiveThirtyEight's quarterback-adjusted NFL Elo ("qbelo"), rebuilt from nflverse data and run on
through 2025.

The owner (13 October 2026) asked whether FiveThirtyEight's NFL model can be replicated and kept going as
one of the site's projections, and said yes to "build the quarterback version as a study, test it on past
seasons against Alpha, the Joker and the ELO Model, then you decide whether it goes on the site".

    python3 -I research/fetch.py                     # games.csv and the play-by-play
    python3 -I research/fetch.py --fivethirtyeight   # 538's two files, the weekly player stats, the draft picks
    python3 -I research/fivethirtyeight/qbelo.py     # the checks, the five runs, results/ (about 20 seconds)
    python3 -I research/fivethirtyeight/compare.py   # against Alpha, the Joker and the ELO Model

Reads, through research/common.py (every season from 2026 on is held out and never read): games.csv from
1999, the play-by-play 1999-2025 (only to find each team's first quarterback dropback), nflverse's weekly
player stats 1999-2025 and its draft picks before 2026, FiveThirtyEight's own nfl_elo.csv and its nfl-elo-game
nfl_games.csv (each checked against its SHA-256), betting/joker/data/win_totals.csv for 2019-2025, and this
folder's locations.csv and venues.csv. Writes out/ (gitignored, game by game) and results/; results/facts.csv
holds every figure the README quotes that no other results file does.

"The page" below is 538's methodology, "How Our NFL Predictions Work" (2022 version; 538's own site is
gone, a full text copy is kept in github.com/bohndesverband/rfl-data, R/elo/README.md). "The file" is
538's nfl_elo.csv. Every rule here is the one that reproduces the file; results/rule_checks.csv says how
closely, and the README sums it up.

THE MODEL (units: Elo points; a VALUE point is 3.3 Elo points)

Forecast (team1 = the schedule's home team):
  D  = m * (E1 - E2 + adj1 - adj2 + H)          m = 1.2 in a playoff game, else 1 (it scales H too)
  p1 = 1 / (1 + 10^(-D/400))
  H  = home game (also a game moved inside the US or Canada, and a Super Bowl in a team's own stadium):
            B(season, date) + 4 * miles(away club's home, home club's home)/1000 + 25*(bye1 - bye2)
       regular-season game abroad: 25*(bye1 - bye2)
       Super Bowl at a neutral venue: from 2019 4*(miles(team2, venue) - miles(team1, venue))/1000, before
            2019 0; plus the bye term (it cancels)
       B = 55 (1999-2019, 2021), 33 (2020), 2022 by date (48.6781 to 50.4967); 2023 on: HFA_FWD, 48.6781
  update: E1 += 20*M*(r1 - p1), E2 -= the same; M = ln(max(|margin|,1)+1) * 2.2/(w*0.001 + 2.2),
          w = D if team1 won, -D if team2 won; a tie: M = ln(2)*2.2. D and p1 are the forecast's.
  new season: E = R/3 + (2/3)*(1171.4 + 40.71*W), R = (2/3)*E_last + 1505/3, W the team's preseason win
          total on a 16-game scale; with no win total, E = R. A new club starts at 1300.
Quarterback track:
  starter: the team's first dropback (pass, sack or scramble) by a player nflverse lists at QB; games.csv's
          named starter where the play-by-play has none.
  raw VALUE = -2.2*Att + 3.7*Cmp + PassYds/5 + 11.3*PassTD - 14.1*Int - 8*Sacked - 1.1*Carries
              + 0.6*RushYds + 15.9*RushTD, the starter's own weekly line
  game value gv = 3.3*(raw + R_opp), R_opp the opposing defence's adjustment (VALUE) before the game
  QB value: post = 0.9*pre + 0.1*gv; first start ever by draft pick; between seasons 1/4 toward X_s
          for 10-100 career starts
  team QB rating T: 0.95*T + 0.05*gv after every game; at a season's first game 2/9 T_end + 6/9 V(starter)
          + 1/9 X_s;  qb_adj = V - T. V is the starter's value from 2019; to 2018 (538's backfill) it is a copy
          of his value that is never reverted between seasons (updated after each game like the value itself)
  defence R: a rolling VALUE allowed against the league level (below); X_s the season's target value. The
          league level is X_s/3.3 to 2018 and held at 2019's from then on, as 538's live file had it
The plain Elo beside it is 538's 2014 system (its nfl-elo-game repo): K 20, home field 65 (0 at a neutral
site), the same margin multiplier, a third back to 1505 each summer, no QB, travel, rest or playoff term.

THE RUNS
  REBUILD      the model this study tests, nothing from 538 but its constants: from 1999 on nflverse's data
               (every club 1505 at 1999's first game, the Browns 1300; every quarterback valued by his draft
               pick at his first start from 1999, a warm-up: 2003 on is what is compared), the market's win totals from 2019
               (none before: the plain reversion), 538's home field through 2022 and HFA_FWD after,
               first-dropback starters (the starter as he turned out), no hand inputs
  LINES        REBUILD plus 538's own preseason half-win lines for 2004-2018, recovered from its file
  PROOF        538's own inputs 2003-2022 (its state entering 2003, its named quarterbacks and their raw
               VALUE, its preseason win totals and its hand entries): the rules alone, against its file
  SENSITIVITY  REBUILD with the 2023-2025 home field scaled with the league's home margin over the ten
               seasons before (c * M10), not held at 48.68
  PREGAME      REBUILD's ratings, game for game, each forecast made before kickoff with no team news: the
               starter is taken to be the team's previous one (that season's, or at a team's first game of a
               season the last one of the season before), in the team quarterback adjustment and in the
               season's opening team rating alike; a rookie is unknown until his first start. The ratings move
               after the game on the actual starter, as in REBUILD. It knows no injury, benching or signing
               announced before kickoff, so it is a lower bound: a forecast with the news lies between it and
               REBUILD, which knows the starter at kickoff
"""
import hashlib
import math
import os
import re
import sys
import unicodedata

import numpy as np
import pandas as pd
import pyarrow.parquet as pq

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
import common  # noqa: E402
import fetch  # noqa: E402  (stats_path and the 538 file's SHA-256: the paths fetch.py writes)

OUT = os.path.join(HERE, 'out')                    # gitignored
RES = os.path.join(HERE, 'results')
F538 = os.path.join(common.RAW, 'fivethirtyeight', 'nfl_elo.csv')
F538_GAMES = os.path.join(common.RAW, 'fivethirtyeight', 'nfl_games.csv')     # 538's own nfl-elo-game copy, 1920-2020
DRAFT = os.path.join(common.RAW, 'draft_picks.csv')
WINTOT = os.path.join(ROOT, 'betting', 'joker', 'data', 'win_totals.csv')
LOCS = os.path.join(HERE, 'locations.csv')
VENUES = os.path.join(HERE, 'venues.csv')
FIRST = 1999                                       # the run starts here (games.csv, stats, play-by-play)
LAST = common.HOLDOUT_FROM - 1                     # 2025: 2026 on is held out
COMPARED = common.FIRST                            # 2003: 1999-2002 is the warm-up
F538_LAST = 2022                                   # 538's last season

# ---------------------------------------------------------------- the constants (each checked: results/rule_checks.csv)
# K: the page, "the ideal K-factor for predicting future games is 20"; 538's nfl-elo-game code K = 20.0. The file's
# 2019-2022 qbelo updates follow K = 20 and the margin multiplier on the forecast's own D to 0.001 Elo in 99% of games.
K = 20.0
# the mean a rating returns to: the page and nfl-elo-game, "one-third of the way toward 1505"
MEAN = 1505.0
# plain Elo home field: nfl-elo-game's HFA = 65.0; the file's elo_prob1 is the plain rating gap + 65 (0 neutral)
PLAIN_HFA = 65.0
# the page: "multiplies EloDiff by 1.2 ... for playoff games"; in the file it scales the whole D, home term in
PO_MULT = 1.2
# the page: "a rest adjustment of 25 Elo points whenever a team is coming off of a bye week (including when
# top-seeded teams don't play during the opening week of the playoffs)"; the file steps by exactly 25
BYE = 25.0
# the page: "4 points of Elo for every 1,000 miles traveled"; great-circle miles between the clubs' home points
# with an Earth radius of 3,963 miles reproduce the file's 2019-2022 forecasts to under 0.001 Elo (locations.csv;
# results/rule_checks.csv, the forecast without 538's hand entries)
TRAVEL = 4.0
R_EARTH = 3963.0
# the bye term first shows in the file on 28 October 2019 (week 8's Monday night); before that in 2019, none
BYE_LIVE_FROM = '2019-10-28'
# 2019 is the first season 538 forecast live with the quarterback model; its file before that is a backfill,
# and several rules differ between the two (the bye, the defence, the QB value inside adj, the season target)
LIVE = 2019
# home field B: not given by the page before 2022 ("roughly 48 points" in 2022, "based on a rolling 10-year
# average of home-field advantage, and changes during the season"; 33 in 2020, the no-fans tweak). The file's
# own values: 55 through 2019 and in 2021, 33 in 2020, and in 2022 these steps by date (to 0.0001 Elo)
HFA_2022 = [('2022-09-01', 48.6781), ('2022-12-22', 48.7265), ('2023-01-07', 48.8347),
            ('2023-01-14', 50.1237), ('2023-01-21', 50.2688), ('2023-01-29', 50.4967)]
# 2023 on: 538 published nothing. REBUILD holds its last regular-season value; SENSITIVITY scales it instead
HFA_FWD = 48.6781
# the page: preseason Elo is last season's reverted 1/3 toward 1505 at 1/3 weight plus "Vegas-wins Elo" at 2/3.
# The conversion is not on the page; the file's 1999-2018 first ratings sit on the lattice 1171.4 + 40.71*W at
# half-win steps W (to 1e-8 Elo, every team but CLE 1999 and IND 2011)
MKT_A, MKT_B = 1171.4, 40.71
# the page: expansion clubs start at 1300 (the Texans in 2002; the Browns in 1999 in this run)
EXPANSION = 1300.0
# the page's VALUE formula (a regression on ESPN's Total QBR, says the page), on the starter's own weekly line
W_VALUE = dict(attempts=-2.2, completions=3.7, passing_yards=0.2, passing_tds=11.3,
               passing_interceptions=-14.1, sacks_suffered=-8.0, carries=-1.1, rushing_yards=0.6,
               rushing_tds=15.9)
# the page: "the rolling rating can be multiplied by 3.3 to get the number of Elo points"
TO_ELO = 3.3
# the page: QB rating "updated every 10 games (i.e., Rating_new = 0.9 x Rating_old + 0.1 x Game_VALUE)"
QB_W = 0.1
# the page: the team's rolling QB rating "updated every 20 games"; the file's weight is exactly 0.05 a game
TEAM_W = 0.05
# the defence's weight a game: 0.05 in the file (the page names "a rolling rating for team QB VALUE allowed"
# with no window or weight); recovered by replaying 538's own columns (raw VALUE = gv/3.3 - R)
DEF_W = 0.05
# the page: a rookie by draft position, "+113" for the first overall pick, 0 undrafted. The file: 0.45342 per
# pick under 250, fading in from 1970 (min(1, (season - 1970)/35)), floored at 0
ROOKIE_SLOPE = 0.45342
# the page: QBs with 10 to 100 career starts revert one-fourth toward "the average NFL QB start"
QB_REVERT = 0.25
INTL = ('LON', 'MEX', 'GER', 'FRA', 'SAO', 'DUB', 'MAD', 'BER', 'MEL', 'RIO')
# nflverse codes -> 538's franchise codes (538 keeps OAK for the Raiders, LAR, LAC, WSH, JAX throughout)
CODE = {'LA': 'LAR', 'STL': 'LAR', 'SD': 'LAC', 'LV': 'OAK', 'WAS': 'WSH', 'JAC': 'JAX'}


def code538(t):
    return CODE.get(t, t)


def hav(p, q, R=R_EARTH):
    la1, lo1, la2, lo2 = map(math.radians, (p[0], p[1], q[0], q[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def norm(n):
    if not isinstance(n, str):
        return ''
    n = unicodedata.normalize('NFKD', n).encode('ascii', 'ignore').decode()
    n = n.lower().replace('.', '').replace("'", '').replace('-', ' ')
    n = re.sub(r'\b(jr|sr|ii|iii|iv|v)\b', '', n)
    return re.sub(r'\s+', ' ', n).strip()


def last_name(n):
    p = norm(n).split(' ')
    return p[-1] if p else ''


def p_of(D):
    return 1.0 / (1.0 + 10 ** (-D / 400.0))


def mov_mult(D, margin):
    """538's margin-of-victory multiplier (nfl-elo-game's forecast.py): ln(max(pd,1)+1) * 2.2/(w*0.001+2.2), w the
    winner's side of D; a tie ln(2)*2.2."""
    if margin == 0:
        return math.log(2.0) * 2.2
    w = D if margin > 0 else -D
    return math.log(max(abs(margin), 1) + 1.0) * 2.2 / (w * 0.001 + 2.2)


def rookie_value(pick, season):
    """a quarterback's value at his first start ever: 0.45342*(250 - pick)*min(1, (season-1970)/35), 0 undrafted"""
    if pick is None or pick != pick:
        return 0.0
    return max(0.0, ROOKIE_SLOPE * (250 - pick) * min(1.0, (season - 1970) / 35))


# ---------------------------------------------------------------- loaders
def load_538():
    """538's nfl_elo.csv, as fetch.py keeps it: refused unless it is the file this study checked"""
    with open(F538, 'rb') as fh:
        digest = hashlib.sha256(fh.read()).hexdigest()
    if digest != fetch.F538_SHA256:
        raise SystemExit(f'{F538} is not the file this study checked (sha256 {digest}): run research/fetch.py --fivethirtyeight --force')
    e = pd.read_csv(F538)
    e = e[e.season < common.HOLDOUT_FROM].reset_index().rename(columns={'index': 'row'})
    e['playoff'] = e.playoff.fillna('')
    return e


def load_locations():
    """each franchise's home point as 538 measured it (locations.csv) and every venue's (venues.csv)"""
    L = pd.read_csv(LOCS).set_index('key')
    V = pd.read_csv(VENUES).set_index('stadium_id')
    return ({k: (float(r.lat), float(r.lon)) for k, r in L.iterrows()},
            {k: (float(r.lat), float(r.lon)) for k, r in V.iterrows()})


def home_point(loc, team, season):
    # 538's 2019 forecasts used its older table: the Rams at St. Louis, the Chargers at San Diego, the Raiders at
    # Oakland; its backfill and 2020-2022 the newer one (both LA clubs at SoFi, the Raiders at Las Vegas). The 49ers
    # stay at Candlestick throughout (538 never moved them to Santa Clara).
    if season == 2019 and team in ('LAR', 'LAC', 'OAK'):
        return loc[team + '19']
    return loc['LV' if team == 'OAK' else team]


def base_hfa(season, date, hfa_fwd=HFA_FWD):
    if season <= 2019 or season == 2021:
        return 55.0
    if season == 2020:
        return 33.0
    if season == 2022:
        b = HFA_2022[0][1]
        for d, v in HFA_2022:
            if date >= d:
                b = v
        return b
    return hfa_fwd[season] if isinstance(hfa_fwd, dict) else hfa_fwd


def load_stats():
    """(game_id, player_id) -> raw VALUE of the player's weekly line; the (game_id, team) pairs with any passer
    line; the ids nflverse ever lists at QB; player id -> display name"""
    val, has, qbs, names = {}, set(), set(), {}
    cols = ['player_id', 'player_display_name', 'position', 'game_id', 'team', 'completions', 'attempts',
            'passing_yards', 'passing_tds', 'passing_interceptions', 'interceptions', 'sacks_suffered', 'sacks',
            'carries', 'rushing_yards', 'rushing_tds']
    for y in range(FIRST, LAST + 1):
        s = pd.read_csv(fetch.stats_path(y), low_memory=False, usecols=lambda c: c in cols)
        if 'passing_interceptions' not in s.columns:
            s['passing_interceptions'] = s['interceptions']
        if 'sacks_suffered' not in s.columns:
            s['sacks_suffered'] = s['sacks']
        for c in W_VALUE:
            s[c] = pd.to_numeric(s[c], errors='coerce').fillna(0.0)
        s['raw'] = sum(w * s[c] for c, w in W_VALUE.items())
        for gid, pid, r in zip(s.game_id, s.player_id, s.raw):
            val[(gid, pid)] = float(r)
        p = s[(s.attempts > 0) | (s.sacks_suffered > 0)]
        has.update(zip(p.game_id, p.team.map(code538)))
        qbs.update(s.player_id[s.position == 'QB'])
        names.update(zip(s.player_id, s.player_display_name))
    return val, has, qbs, names


def load_first_qb(qbs):
    """(game_id, team) -> the first player nflverse lists at QB to drop back (pass, sack or scramble) for the team"""
    out = {}
    for y in range(FIRST, LAST + 1):
        t = pq.read_table(common.pbp_path(y), columns=['game_id', 'play_id', 'posteam', 'passer_player_id', 'passer_id']).to_pandas()
        t['pid'] = t.passer_player_id.fillna(t.passer_id)
        t = t[t.pid.isin(qbs) & t.posteam.notna()].sort_values(['game_id', 'play_id'])
        f = t.groupby(['game_id', 'posteam']).head(1)
        out.update({(g, code538(p)): q for g, p, q in zip(f.game_id, f.posteam, f.pid)})
    return out


def load_draft():
    """draft pick by gsis id; a quarterback without a gsis id by his normalised name"""
    d = pd.read_csv(DRAFT, low_memory=False)
    d = d[d.season < common.HOLDOUT_FROM]          # the held-out drafts are never read
    by_id = d.dropna(subset=['gsis_id']).drop_duplicates('gsis_id').set_index('gsis_id').pick.to_dict()
    q = d[(d.position == 'QB') & d.gsis_id.isna()]
    by_name = {}
    for n, p in zip(q.pfr_player_name, q.pick):
        by_name.setdefault(norm(n), p)
    return by_id, by_name


def wintotals_frame():
    """betting/joker/data/win_totals.csv, 2019-2025 (any 2026 row, and win_totals_2026.csv, are never read)"""
    w = pd.read_csv(WINTOT)
    w = w[w.season < common.HOLDOUT_FROM]
    return w[w.season.between(2019, LAST)].assign(t538=lambda d: d.team.map(code538))


def load_wintotals():
    """(season, 538 code) -> the market's expected wins on a 16-game scale (exp_wins * 16 / games), 2019-2025: 538
    put a 17-game season's total on its 16-game scale (its 2021-2022 openers follow it: results/facts.csv)"""
    w = wintotals_frame()
    return {(int(s), t): float(x) * 16.0 / float(g) for s, t, x, g in zip(w.season, w.t538, w.exp_wins, w.games)}


def load_games(loc, venue, first_qb, names):
    """every played game 1999-2025 in date order, with its site, distances, byes and starters"""
    g = common.games(FIRST)
    g = g[g.home_score.notna()].copy()
    g['h'] = g.home_team.map(code538)
    g['a'] = g.away_team.map(code538)
    own = g[g.location == 'Home'].groupby(['season', 'home_team']).stadium_id.agg(lambda x: x.value_counts().index[0]).to_dict()
    g = g.sort_values(['gameday', 'gametime', 'game_id']).reset_index(drop=True)
    recs = []
    for side, t in (('h', 'home_team'), ('a', 'away_team')):
        recs.append(pd.DataFrame({'i': g.index, 'side': side, 'team': g[t].map(code538), 'season': g.season,
                                  'week': g.week, 'date': pd.to_datetime(g.gameday)}))
    r = pd.concat(recs).sort_values(['team', 'season', 'date'])
    r['dgap'] = (r.date - r.groupby(['team', 'season']).date.shift()).dt.days
    r['wgap'] = r.week - r.groupby(['team', 'season']).week.shift()
    for side in ('h', 'a'):
        x = r[r.side == side].set_index('i')
        g['dgap_' + side] = x.dgap.reindex(g.index).values
        g['wgap_' + side] = x.wgap.reindex(g.index).values
    G = []
    for row in g.itertuples(index=False):
        s, date = int(row.season), row.gameday
        sid = row.stadium_id if isinstance(row.stadium_id, str) else ''
        own_h, own_a = own.get((s, row.home_team)), own.get((s, row.away_team))
        # the site, as 538 treated it: a Super Bowl in a participant's own stadium is that team's home game; a
        # 'Neutral' game abroad (games.csv writes some 2025 ones at the home club's own stadium id) is neutral; a
        # game moved inside the US or Canada (the 49ers in Arizona in 2020, a hurricane or snow move) stays a home
        # game, as in the file
        if row.game_type == 'SB':
            site = 'home' if sid == own_h else ('host_away' if sid == own_a else 'sb')
            if site == 'sb' and sid not in venue:
                raise SystemExit(f'{row.game_id}: venue {sid} is not in venues.csv')
        elif row.location == 'Neutral':
            site = 'neutral' if (sid[:3] in INTL or sid == own_h or not sid) else 'home'
        else:
            site = 'host_away' if (sid and sid == own_a and sid != own_h) else 'home'
        ph, pa = home_point(loc, row.h, s), home_point(loc, row.a, s)
        d_hv = d_av = 0.0
        if site == 'sb':
            d_hv, d_av = hav(ph, venue[sid]), hav(pa, venue[sid])

        def bye(dgap, wgap, rest):
            # the backfill (to 2018): 11 days or more since the team's last game of the season (its first game:
            # games.csv's rest, a week-1 bye); live, from 28 October 2019: no game in the previous week number
            # (playoffs in, so a top seed off the wild-card round has one); a team's first game then: none
            if s <= 2018:
                return int(dgap >= 11) if dgap == dgap else int(rest >= 11)
            if date < BYE_LIVE_FROM:
                return 0
            return int(wgap >= 2) if wgap == wgap else 0

        st = {}
        for sd, team, qid, qn in (('h', row.h, row.home_qb_id, row.home_qb_name), ('a', row.a, row.away_qb_id, row.away_qb_name)):
            fq = first_qb.get((row.game_id, team))
            st[sd] = (fq, names.get(fq, qn), 'pbp') if fq else (qid, qn, 'games.csv')
        G.append(dict(gid=row.game_id, season=s, week=int(row.week), date=date, po=row.game_type != 'REG',
                      gtype=row.game_type, home=row.home_team, away=row.away_team, h=row.h, a=row.a,
                      hs=float(row.home_score), as_=float(row.away_score),
                      kh=st['h'][0], ka=st['a'][0], nh=st['h'][1], na=st['a'][1], src_h=st['h'][2], src_a=st['a'][2],
                      gch=row.home_qb_id, gca=row.away_qb_id, gchn=row.home_qb_name, gcan=row.away_qb_name,
                      site=site, sid=sid, d_ha=hav(ph, pa), d_hv=d_hv, d_av=d_av,
                      bye_h=bye(row.dgap_h, row.wgap_h, row.home_rest), bye_a=bye(row.dgap_a, row.wgap_a, row.away_rest)))
    return G


def previous_starters(G):
    """PREGAME's expected starters: game id -> (home, away) quarterback who started the team's previous game, that
    season or, at its first game of a season, the season before (None at a team's first game in the data). It knows
    no injury, benching, trade or signing announced before kickoff, and no rookie until his first start."""
    last, out = {}, {}
    for g in G:
        out[g['gid']] = (last.get(g['h']), last.get(g['a']))
        last[g['h']], last[g['a']] = g['kh'], g['ka']
    return out


def home_term(g, hfa_fwd=HFA_FWD, site=None):
    """H for the schedule's home team (team1)"""
    s = g['season']
    site = site or g['site']
    b = base_hfa(s, g['date'], hfa_fwd)
    bye = BYE * (g['bye_h'] - g['bye_a'])
    if site == 'home':
        return b + TRAVEL * g['d_ha'] / 1000 + bye
    if site == 'host_away':
        return -(b + TRAVEL * g['d_ha'] / 1000) + bye
    if site == 'sb':
        # a neutral Super Bowl: the travel difference to the venue from the 2019 forecasts on, nothing before
        return (TRAVEL * (g['d_av'] - g['d_hv']) / 1000 if s >= LIVE else 0.0) + bye
    return bye          # a regular-season game abroad: the bye term alone (the file keeps it: 2016 HOU-OAK, 2017 NE-OAK)


def plain_home(g, site=None):
    return {'home': PLAIN_HFA, 'host_away': -PLAIN_HFA}.get(site or g['site'], 0.0)


def home_margin_10(season):
    """the mean home margin of games.csv's games at a home team's own ground (playoffs in) over the ten seasons
    before `season`: the SENSITIVITY run's measure of home field"""
    g = common.games(FIRST)
    g = g[(g.location == 'Home') & g.home_score.notna() & g.season.between(season - 10, season - 1)]
    return float((g.home_score - g.away_score).mean())


# ---------------------------------------------------------------- the engine
class Engine:
    """One forward run of the QB Elo and the plain Elo. `seed` (538's state entering 2003) and `hand` (538's own
    inputs) are for PROOF only; without them every value comes from the rules and nflverse."""

    def __init__(self, raw, has, draft, market=None, hfa_fwd=HFA_FWD, seed=None, hand=None, proxy=None):
        self.raw, self.has, self.market, self.hfa_fwd = raw, has, market or {}, hfa_fwd
        # PREGAME: game id -> (home, away) quarterback the forecast takes as the starter (the team's previous one);
        # the ratings still move on the actual starter, so the run's state is REBUILD's, game for game
        self.proxy = proxy or {}
        assert not (proxy and (seed or hand)), 'PREGAME runs on REBUILD alone'
        self.pick_id, self.pick_name = draft
        self.hand = hand or {}
        self.pick_ov = self.hand.get('pick', {})
        self.v, self.va, self.starts, self.last_season, self.reverted = {}, {}, {}, {}, {}
        self.T, self.Tseason, self.R, self.Rlast = {}, {}, {}, {}
        self.E, self.Eseason, self.P, self.Pseason = {}, {}, {}, {}
        self.sraw, self.sgv, self.X = {}, {}, {}
        self.seed = seed
        self.first_season = FIRST
        self.Xwarm = None
        if seed:
            self.first_season = seed['season']
            for k in ('v', 'va', 'starts', 'last_season', 'R', 'Rlast', 'sraw', 'X'):
                setattr(self, k, {kk: (list(vv) if isinstance(vv, list) else vv) for kk, vv in seed[k].items()})

    def Xs(self, s):
        """the season's target value X_s (Elo): to 2019, 3.3 x the mean of the three previous seasons' mean
        regular-season raw VALUE (every starter's line); from 2020, the mean of the three previous seasons' mean
        game value (playoffs in). Recovered from the file's between-season reversions, one value a season."""
        if s in self.X:
            return self.X[s]
        src = self.sraw if s <= LIVE else self.sgv
        prev = [y for y in range(s - 3, s) if y in src]
        if not prev:              # the unseeded warm-up only: 1999 has no earlier season, its own mean stands in
            return TO_ELO * self.Xwarm
        x = TO_ELO * np.mean([np.mean(self.sraw[y]) for y in prev]) if s <= LIVE else np.mean([np.mean(self.sgv[y]) for y in prev])
        self.X[s] = x
        return x

    def Lin(self, s):
        """the league level the defences move toward (VALUE): X_s/3.3 to 2018, X_2019/3.3 held from 2019"""
        return self.Xs(s) / TO_ELO if s < LIVE else self.Xs(LIVE) / TO_ELO

    def rookie(self, key, name, s):
        p = self.pick_ov.get(key, self.pick_id.get(key))
        if p is None or p != p:
            p = self.pick_name.get(norm(name))
        return rookie_value(p, s)

    def season_start(self, key, s):
        """a quarterback's first start of a new season: 1/4 toward X if he has 10 to 100 career starts (playoffs
        in), once per gap; X of the return season to 2019, of the season after his last from 2020"""
        ls = self.last_season[key]
        if ls >= s or self.reverted.get(key) == ls:
            return
        self.reverted[key] = ls
        if 10 <= self.starts[key] <= 100:
            xs = self.Xs(s) if s <= LIVE else self.Xs(max(ls + 1, LIVE))
            self.v[key] = (1 - QB_REVERT) * self.v[key] + QB_REVERT * xs
        if s >= LIVE:
            self.va[key] = self.v[key]

    def going_in(self, key, s):
        """the value a forecast reads for a quarterback who has started before (V: from 2019 his value, to 2018 the
        never-reverted copy), as season_start would leave it at his first start of season s, without changing any
        state: PREGAME's expected starter, who may not play"""
        v, va = self.v[key], self.va[key]
        ls = self.last_season[key]
        if ls < s and self.reverted.get(key) != ls:
            if 10 <= self.starts[key] <= 100:
                xs = self.Xs(s) if s <= LIVE else self.Xs(max(ls + 1, LIVE))
                v = (1 - QB_REVERT) * v + QB_REVERT * xs
            if s >= LIVE:
                va = v
        return v if s >= LIVE else va

    def run(self, G):
        hand = self.hand
        qb1 = hand.get('qb1', {})
        skip = hand.get('skip', set())
        extra = hand.get('extraH', {})
        no_upd = hand.get('no_update', set())
        upd_plain = hand.get('update_without_extra', set())
        site_ov = hand.get('site', {})
        out = []
        for g in G:
            s = g['season']
            if s < self.first_season:
                continue
            sides = [(g['h'], g['a'], g['kh'], g['nh']), (g['a'], g['h'], g['ka'], g['na'])]
            pre = []
            px = self.proxy.get(g['gid'], (None, None))
            for i, (team, opp, key, name) in enumerate(sides):
                # the starter's value going in: by draft pick at his first start ever, else reverted at his first
                # start of a new season
                if key not in self.v:
                    self.v[key] = self.va[key] = self.rookie(key, name, s)
                    self.starts[key] = 0
                    self.last_season[key] = s
                else:
                    self.season_start(key, s)
                self.last_season[key] = s
                # the team's QB rating at its first game of a season: the page's 1/3 last season's (itself 1/3 of
                # the way to X_s) and 2/3 the season's starter; the file: 2/9 T_end + 6/9 V + 1/9 X_s to 1e-10
                first, T_end = self.Tseason.get(team) != s, self.T.get(team)
                if first:
                    k1 = qb1.get((team, s), key)
                    if k1 != key and k1 in self.v:
                        self.season_start(k1, s)
                    else:
                        k1 = key
                    V1 = self.v[k1] if s >= LIVE else self.va[k1]
                    if self.seed and (team, s) in self.seed['T0']:
                        self.T[team] = self.seed['T0'][(team, s)]
                    elif team in self.T:
                        self.T[team] = (2 / 9) * self.T[team] + (6 / 9) * V1 + (1 / 9) * self.Xs(s)
                    else:
                        self.T[team] = (6 / 9) * V1 + (3 / 9) * self.Xs(s)
                    self.Tseason[team] = s
                # the opposing defence at its first game of a season: 2/3 of its end-of-season value (the last
                # game's update taken at the backfill's 0.95), moved by the change in the league level
                if opp in self.Rlast and self.Rlast[opp][0] != s:
                    ps, rb, g33 = self.Rlast[opp]
                    r_end = (1 - DEF_W) * rb + DEF_W * (self.Lin(ps) - g33)
                    d = (self.Lin(s) - self.Lin(ps)) if s <= LIVE else (self.Lin(LIVE) - self.Xs(s) / TO_ELO) / 2
                    self.R[opp] = (2 / 3) * (r_end + d)
                    self.Rlast[opp] = (s, None, None)
                # qb_adj = V - T: from 2019 V is the value itself; in the backfill a copy never reverted between
                # seasons (the file's adj and value_pre disagree exactly by that)
                V = self.v[key] if s >= LIVE else self.va[key]
                pr = dict(vp=self.v[key], adj=V - self.T[team], r=self.R.get(opp, 0.0), fk=key)
                # PREGAME's forecast: the expected starter's value against the team rating, the season's opening
                # team rating built on him too (as 538 built its own on the projected starter); nothing else moves
                fk = px[i]
                if self.proxy and fk is not None and fk != key and fk in self.v:
                    Vf = self.going_in(fk, s)
                    if not first:
                        Tf = self.T[team]
                    elif T_end is not None:
                        Tf = (2 / 9) * T_end + (6 / 9) * Vf + (1 / 9) * self.Xs(s)
                    else:
                        Tf = (6 / 9) * Vf + (3 / 9) * self.Xs(s)
                    pr.update(adj_f=Vf - Tf, fk=fk)
                else:
                    pr['adj_f'] = pr['adj']
                pre.append(pr)
            for team in (g['h'], g['a']):
                if self.Eseason.get(team) != s:
                    if self.seed and (team, s) in self.seed['E0']:
                        self.E[team] = self.seed['E0'][(team, s)]
                        self.P[team] = self.seed['P0'][(team, s)]
                    elif team in self.E:
                        rv = (2 / 3) * self.E[team] + MEAN / 3
                        W = self.market.get((s, team))
                        self.E[team] = rv if W is None else rv / 3 + (2 / 3) * (MKT_A + MKT_B * W)
                        self.P[team] = (2 / 3) * self.P[team] + MEAN / 3
                    else:
                        start = EXPANSION if s > FIRST or team == 'CLE' else MEAN
                        self.E[team] = self.P[team] = start
                    self.Eseason[team] = s
            site = site_ov.get(g['gid'], g['site'])
            H0 = home_term(g, self.hfa_fwd, site)
            H = H0 + extra.get(g['gid'], 0.0)
            m = PO_MULT if g['po'] else 1.0
            e1, e2 = self.E[g['h']], self.E[g['a']]
            core = e1 - e2 + pre[0]['adj'] - pre[1]['adj']
            D = m * (core + H)
            p = p_of(D)
            Dp = self.P[g['h']] - self.P[g['a']] + plain_home(g, site)
            pp = p_of(Dp)
            margin = g['hs'] - g['as_']
            r1 = 1.0 if margin > 0 else (0.0 if margin < 0 else 0.5)
            Du = m * (core + H0) if g['gid'] in upd_plain else D
            shift = 0.0 if g['gid'] in no_upd else K * mov_mult(Du, margin) * (r1 - p_of(Du))
            self.E[g['h']] += shift
            self.E[g['a']] -= shift
            sp = K * mov_mult(Dp, margin) * (r1 - pp)
            self.P[g['h']] += sp
            self.P[g['a']] -= sp
            rec = dict(gid=g['gid'], season=s, date=g['date'], week=g['week'], gtype=g['gtype'], po=g['po'],
                       home=g['home'], away=g['away'], h=g['h'], a=g['a'], hs=g['hs'], as_=g['as_'],
                       qbelo_h=e1, qbelo_a=e2, adj_h=pre[0]['adj'], adj_a=pre[1]['adj'],
                       vpre_h=pre[0]['vp'], vpre_a=pre[1]['vp'], H=H, D=D, p=p, elo_p=pp,
                       qh=g['kh'], qa=g['ka'], qhn=g['nh'], qan=g['na'])
            if self.proxy:
                # the forecast made before kickoff with the expected starters; the updates above used the real ones
                rec.update(p_pre=p_of(m * (e1 - e2 + pre[0]['adj_f'] - pre[1]['adj_f'] + H)),
                           adj_pre_h=pre[0]['adj_f'], adj_pre_a=pre[1]['adj_f'], xh=pre[0]['fk'], xa=pre[1]['fk'])
            for (team, opp, key, name), pr, sd in zip(sides, pre, ('h', 'a')):
                q = (g['gid'], key)
                if q in self.raw:
                    raw = self.raw[q]
                elif (g['gid'], team) in self.has:
                    raw = 0.0                 # a starter with no line: did not play (538's Cassel, 2015)
                else:
                    rec['gv_' + sd] = np.nan  # no passer line for the team at all: a data hole (1999-2002), no update
                    continue
                r0 = pr['r']
                gv = TO_ELO * (raw + r0)
                rec['gv_' + sd] = gv
                if (g['gid'], team) not in skip:
                    self.v[key] = (1 - QB_W) * pr['vp'] + QB_W * gv
                    self.va[key] = (1 - QB_W) * self.va[key] + QB_W * gv
                    self.T[team] = (1 - TEAM_W) * self.T[team] + TEAM_W * gv
                    self.starts[key] += 1
                # the defence: VALUE allowed against the league level; 538's backfill decays it (0.95), its live
                # code from 2019 adds without decay toward a level frozen at 2019's
                if s < LIVE:
                    self.R[opp] = (1 - DEF_W) * r0 + DEF_W * (self.Lin(s) - gv / TO_ELO)
                else:
                    self.R[opp] = r0 + DEF_W * (self.Lin(LIVE) - gv / TO_ELO)
                self.Rlast[opp] = (s, r0, gv / TO_ELO)
                if not g['po']:
                    self.sraw.setdefault(s, []).append(raw)
                self.sgv.setdefault(s, []).append(gv)
            out.append(rec)
        return pd.DataFrame(out)


# ---------------------------------------------------------------- 538's own columns: link, replay, seed
def link_538(E, G):
    """538 rows 1999-2022 -> games.csv game ids; swap = 1 where 538's team1 is the schedule's away team"""
    gg = pd.DataFrame([dict(gid=g['gid'], date=g['date'], h=g['h'], a=g['a']) for g in G])
    e = E[E.season >= FIRST][['row', 'date', 'team1', 'team2']]
    a = e.merge(gg, left_on=['date', 'team1', 'team2'], right_on=['date', 'h', 'a'], how='inner').assign(swap=0)
    b = e.merge(gg, left_on=['date', 'team1', 'team2'], right_on=['date', 'a', 'h'], how='inner').assign(swap=1)
    lk = pd.concat([a, b])[['row', 'gid', 'swap']]
    assert lk.row.is_unique and len(lk) == len(e), (len(lk), len(e))
    return lk


def name_map(E, G, lk):
    """538 QB name -> nflverse id: among the ids games.csv names and the first QB dropback at the same games, the
    most common one whose last name agrees (any, if none agrees)"""
    gi = {g['gid']: g for g in G}
    rows = []
    e = E.set_index('row')
    for r, gid, sw in lk.itertuples(index=False):
        g = gi[gid]
        hs = [(g['kh'], g['nh']), (g['gch'], g['gchn'])]
        as_ = [(g['ka'], g['na']), (g['gca'], g['gcan'])]
        for side, cands in zip(('1', '2'), (as_, hs) if sw else (hs, as_)):
            for qid, qn in cands:
                rows.append((e.at[r, 'qb' + side], qid, qn))
    d = pd.DataFrame(rows, columns=['name', 'qid', 'qn'])
    d['ok'] = [last_name(a) == last_name(b) for a, b in zip(d.name, d.qn)]
    m = {}
    for n, x in d.groupby('name'):
        y = x[x.ok] if x.ok.any() else x
        m[n] = y.qid.value_counts().index[0]
    return m


def long538(E, lo, hi):
    rows = []
    for s, o in (('1', '2'), ('2', '1')):
        rows.append(pd.DataFrame({
            'row': E.row, 'date': E.date, 'season': E.season, 'po': E.playoff != '', 'side': int(s),
            'team': E['team' + s], 'opp': E['team' + o], 'qb': E['qb' + s],
            'vpre': E['qb%s_value_pre' % s], 'adj': E['qb%s_adj' % s], 'gv': E['qb%s_game_value' % s],
            'vpost': E['qb%s_value_post' % s], 'qbelo_pre': E['qbelo%s_pre' % s], 'elo_pre': E['elo%s_pre' % s]}))
    L = pd.concat(rows, ignore_index=True)
    L = L[(L.season >= lo) & (L.season <= hi) & L.qb.notna()]
    return L.sort_values(['date', 'row', 'side']).reset_index(drop=True)


def stat(x, tol):
    """n, how many |x| are under tol (the bound the README quotes) and their share, median and max |x|"""
    a = np.abs(np.asarray(x, dtype=float))
    a = a[~np.isnan(a)]
    return dict(n=int(len(a)), tolerance=tol, n_within=int((a < tol).sum()), share_within=float((a < tol).mean()),
                median_abs=float(np.median(a)), max_abs=float(a.max()))


def resid(x, tol=0.01):
    d = stat(x, tol)
    return 'n=%d  share<%.2g %.4f  median %.4g  max %.4g' % (d['n'], tol, d['share_within'], d['median_abs'], d['max_abs'])


def fact(facts, key, value, what):
    """a figure the README quotes that no other results file holds: results/facts.csv"""
    facts.append(dict(fact=key, value=value, what=what))


def replay_538(E, n2p, checks_out, facts):
    """538's own QB columns, 1950-2022, through the rules: recovers X_s, runs the defence chain (538's raw VALUE =
    gv/3.3 - R), the never-reverted value copy and the team rating, checks them, and returns the state entering 2003
    (PROOF's seed) and 538's raw VALUE on each row"""
    L = long538(E, 1950, F538_LAST)
    L['key'] = [n2p.get(n, 'name:' + n) for n in L.qb]
    starts, last_post, last_season, xs, kept = {}, {}, {}, [], []
    for k, s, vp, vq in zip(L.key, L.season, L.vpre, L.vpost):
        if k in last_season and last_season[k] != s:
            if 10 <= starts[k] <= 100:
                xsea = s if s <= LIVE else max(last_season[k] + 1, LIVE)
                xs.append((xsea, s, (vp - (1 - QB_REVERT) * last_post[k]) / QB_REVERT))
            else:
                kept.append((s, vp - last_post[k]))
        starts[k] = starts.get(k, 0) + 1
        last_post[k] = vq
        last_season[k] = s
    xs = pd.DataFrame(xs, columns=['xsea', 's', 'x'])
    X = xs.groupby('xsea').x.median().to_dict()
    spread = xs.assign(d=lambda d: (d.x - d.xsea.map(X)))
    X[1950] = X[1951]                                  # 1950 has no season before it: a guess that washes out
    L19 = X[LIVE] / TO_ELO
    Lin = lambda s: X[s] / TO_ELO if s < LIVE else L19  # noqa: E731
    R, Rlast = {}, {}
    Rb = np.zeros(len(L))
    for i, (s, opp, gv) in enumerate(zip(L.season, L.opp, L.gv)):
        if opp in Rlast and Rlast[opp][0] != s:
            ps, rb, g33 = Rlast[opp]
            r_end = (1 - DEF_W) * rb + DEF_W * (Lin(ps) - g33)
            d = (Lin(s) - Lin(ps)) if s <= LIVE else (L19 - X[s] / TO_ELO) / 2
            R[opp] = (2 / 3) * (r_end + d)
        r0 = R.get(opp, 0.0)
        Rb[i] = r0
        R[opp] = (1 - DEF_W) * r0 + DEF_W * (Lin(s) - gv / TO_ELO) if s < LIVE else r0 + DEF_W * (L19 - gv / TO_ELO)
        Rlast[opp] = (s, r0, gv / TO_ELO)
        if s == 2002 and i + 1 < len(L) and L.season.iat[i + 1] == 2003:
            seedR, seedRlast = dict(R), dict(Rlast)
    L['R'] = Rb
    L['raw538'] = L.gv / TO_ELO - L.R
    sm = L[~L.po].groupby('season').raw538.mean()
    xchk = [TO_ELO * np.mean([sm[y] for y in range(s - 3, s)]) - X[s] for s in range(1999, LIVE + 1)]
    gm = L.groupby('season').gv.mean()
    xchk2 = [np.mean([gm[y] for y in range(s - 3, s)]) - X[s] for s in range(LIVE + 1, F538_LAST + 1)]
    upd = L.vpost - ((1 - QB_W) * L.vpre + QB_W * L.gv)
    # PROOF's seed: each QB's never-reverted value copy entering 2003, each team's QB rating at its first 2003 game
    va, seedT0 = {}, {}
    for r in L.itertuples(index=False):
        if r.season > 2003:
            break
        if r.key not in va:
            va[r.key] = r.vpre
        if r.season == 2003:
            seedT0.setdefault((r.team, 2003), va[r.key] - r.adj)
            continue
        va[r.key] = (1 - QB_W) * va[r.key] + QB_W * r.gv
    # the team QB rating's two rules on every season: V is the never-reverted copy to 2018, the value itself after
    ev, es, es_at, va2, Tl = [], [], [], {}, {}
    for r in L.itertuples(index=False):
        if r.key not in va2:
            va2[r.key] = r.vpre
        V = r.vpre if r.season >= LIVE else va2[r.key]
        Tpre = V - r.adj
        if r.team in Tl:
            ls, tpost = Tl[r.team]
            if ls == r.season:
                ev.append(Tpre - tpost)
            elif r.season >= 1952:
                es.append(Tpre - ((2 / 9) * tpost + (6 / 9) * V + (1 / 9) * X[r.season]))
                es_at.append((r.season, r.team))
        Tl[r.team] = (r.season, (1 - TEAM_W) * Tpre + TEAM_W * r.gv)
        va2[r.key] = (1 - QB_W) * va2[r.key] + QB_W * r.gv
    pre03 = L[L.season <= 2002]
    lastrow = pre03.groupby('key').tail(1).set_index('key')
    seed = dict(season=2003,
                v=lastrow.vpost.to_dict(), va={k: va[k] for k in lastrow.index},
                starts=pre03.groupby('key').size().to_dict(), last_season=lastrow.season.astype(int).to_dict(),
                R=seedR, Rlast=seedRlast,
                sraw={int(s): list(x) for s, x in L[(L.season.between(2000, 2002)) & ~L.po].groupby('season').raw538},
                X={int(s): X[s] for s in X if s <= 2003},
                T0=seedT0)
    first03 = L[L.season == 2003].groupby('team').head(1)
    seed['E0'] = {(t, 2003): q for t, q in zip(first03.team, first03.qbelo_pre)}
    seed['P0'] = {(t, 2003): q for t, q in zip(first03.team, first03.elo_pre)}
    kept = pd.DataFrame(kept, columns=['s', 'd'])
    c = checks_out
    c.append(dict(rule='QB value after a game: 0.9 x before + 0.1 x game value', constant='0.9 / 0.1',
                  checked_on="538's qb value_pre, game_value, value_post, every QB-game 1950-2022", unit='Elo',
                  **stat(upd, 2e-13)))
    c.append(dict(rule="QB between seasons, 10-100 career starts: 3/4 his value + 1/4 the season's X_s",
                  constant='0.75 / 0.25', checked_on="538's reversions 1951-2022: the X each implies, against one X a season",
                  unit='Elo', **stat(spread.d, 2e-9)))
    c.append(dict(rule='QB between seasons, under 10 or over 100 career starts: value unchanged', constant='none',
                  checked_on="538's value_pre at a QB's first start of a season against his last value_post, 1951-2022",
                  unit='Elo', **stat(kept.d, 1e-9)))
    c.append(dict(rule="X_s, to 2019: 3.3 x the mean of the 3 previous seasons' mean regular-season raw VALUE",
                  constant='3 seasons', checked_on="the X_s recovered above against 538's own raw VALUE, 1999-2019",
                  unit='Elo', **stat(xchk, 3e-10)))
    c.append(dict(rule="X_s, from 2020: the mean of the 3 previous seasons' mean game value (playoffs in)",
                  constant='3 seasons', checked_on="the X_s recovered above against 538's game values, 2020-2022",
                  unit='Elo', **stat(xchk2, 3e-10)))
    c.append(dict(rule="team QB rating after a game: 0.95 x before + 0.05 x the starter's game value", constant='0.95 / 0.05',
                  checked_on="538's V - adj within a season, 1950-2022 (V: the value from 2019, to 2018 a copy never reverted between seasons)",
                  unit='Elo', **stat(ev, 1e-9)))
    c.append(dict(rule="team QB rating at a season's first game: 2/9 last + 6/9 the starter's V + 1/9 X_s",
                  constant='2/9, 6/9, 1/9', checked_on="538's V - adj at each team's first game, 1952-2022 (V as above)", unit='Elo',
                  **stat(es, 0.01)))
    em = pd.DataFrame(es_at, columns=['season', 'team']).assign(d=es)
    em = em[em.d.abs() >= 0.01]
    m19 = em[em.season == LIVE]
    fact(facts, 'opener_team_rating_misses_2019', len(m19),
         "teams whose quarterback rating at 538's 2019 opener is 0.01 Elo or more off the season-start rule")
    fact(facts, 'opener_team_rating_misses_2019_max_elo', round(float(m19.d.abs().max()), 4), 'the largest of them, Elo')
    for r in em[em.season != LIVE].itertuples(index=False):
        fact(facts, 'opener_team_rating_miss_%s_%d' % (r.team, r.season), round(float(r.d), 2),
             "538's opening team quarterback rating off the season-start rule, Elo (built on its projected starter)")
    print("  X_s from 538's reversions (one a season): %s" % resid(spread.d))
    print('  X_s rule 1999-2019: %s; 2020-2022: %s' % (resid(xchk), resid(xchk2)))
    print('  QB value update: %s' % resid(upd))
    print('  team rating within a season: %s; at a season start: %s' % (resid(ev), resid(es)))
    print('  X (Elo): ' + ', '.join('%d %.4f' % (s, X[s]) for s in range(2017, 2023)))
    return seed, L, X


# ---------------------------------------------------------------- the rules on 538's published columns
def checks(E, G, lk, checks_out, facts):
    print("\n== the forecast and update rules on 538's published columns (1999-2022) ==")
    gi = {g['gid']: g for g in G}
    e = E.set_index('row')
    rows = []
    for r, gid, sw in lk.itertuples(index=False):
        g = gi[gid]
        x = e.loc[r]
        sg = -1 if sw else 1
        H = home_term(g) * sg
        Hp = plain_home(g) * sg
        m = PO_MULT if x.playoff else 1.0
        Dpub = 400 * math.log10(x.qbelo_prob1 / (1 - x.qbelo_prob1))
        Dr = m * (x.qbelo1_pre - x.qbelo2_pre + x.qb1_adj - x.qb2_adj + H)
        Dpl = x.elo1_pre - x.elo2_pre + Hp
        margin = x.score1 - x.score2
        r1 = 1.0 if margin > 0 else (0.0 if margin < 0 else 0.5)
        sh_pub = x.qbelo1_post - x.qbelo1_pre
        rows.append(dict(row=r, gid=gid, swap=sw, season=x.season, date=x.date, po=bool(x.playoff), neutral=x.neutral,
                         team1=x.team1, team2=x.team2, site=g['site'], m=m, dD=Dr - Dpub, dp=p_of(Dr) - x.qbelo_prob1,
                         dpl=p_of(Dpl) - x.elo_prob1,
                         du_pub=K * mov_mult(Dpub, margin) * (r1 - x.qbelo_prob1) - sh_pub,
                         du_rule=K * mov_mult(Dr, margin) * (r1 - p_of(Dr)) - sh_pub,
                         dpost_plain=x.elo1_post - x.elo1_pre - K * mov_mult(400 * math.log10(x.elo_prob1 / (1 - x.elo_prob1)), margin) * (r1 - x.elo_prob1),
                         bye1=g['bye_a'] if sw else g['bye_h'], bye2=g['bye_h'] if sw else g['bye_a']))
    C = pd.DataFrame(rows)
    hand = C.dD.abs().between(200, 300)
    live, back = C.season >= LIVE, C.season < LIVE
    tb = live & (C.season == 2020) & ((C.dD.abs() - 66.0).abs() < 0.01)
    c = checks_out
    rule = 'forecast: D = m(E1 - E2 + adj1 - adj2 + H), p = 1/(1 + 10^(-D/400))'
    const = 'm 1.2 playoffs; H: base, 4 per 1,000 miles, 25 a bye'
    c.append(dict(rule=rule, constant=const, checked_on="538's live forecasts 2019-2022, every game (D implied by qbelo_prob1)",
                  unit='Elo', **stat(C[live].dD, 0.01)))
    c.append(dict(rule=rule, constant=const, checked_on="the same, without 538's hand entries (+-250 resting starters, TB's 2020 road games)",
                  unit='Elo', **stat(C[live & ~hand & ~tb].dD, 0.001)))
    c.append(dict(rule=rule, constant=const, checked_on="538's backfill 1999-2018, without its +-250 hand entries", unit='Elo',
                  **stat(C[back & ~hand].dD, 0.01)))
    c.append(dict(rule=rule, constant=const, checked_on="538's backfill 1999-2018, in chance (qbelo_prob1)", unit='chance',
                  **stat(C[back].dp, 0.01)))
    c.append(dict(rule='update: E += 20 x M x (result - p), M the margin multiplier on the forecast\'s own D', constant='K 20',
                  checked_on="538's qbelo post - pre, 2019-2022", unit='Elo', **stat(C[live].du_pub, 0.001)))
    c.append(dict(rule='update: the same, on the rule\'s D (as the runs do)', constant='K 20',
                  checked_on="538's qbelo post - pre, 2019-2022", unit='Elo', **stat(C[live].du_rule, 0.001)))
    c.append(dict(rule='plain Elo forecast: H 65 at home, 0 at a neutral site, no playoff multiplier', constant='65',
                  checked_on="538's elo_prob1, 1999-2022", unit='chance', **stat(C.dpl, 1e-6)))
    c.append(dict(rule='plain Elo update: K 20, the margin multiplier', constant='K 20',
                  checked_on="538's elo post - pre, 1999-2022", unit='Elo', **stat(C.dpost_plain, 0.001)))
    for lab, x in [("1999-2018 (538's backfill)", C[back]), ("2019-2022 (538's live forecasts)", C[live])]:
        print('  forecast %-34s all: %s' % (lab, resid(x.dD)))
        print('  %-43s no +-250 hand term: %s' % ('', resid(x[~hand.loc[x.index]].dD)))
        print('  %-43s in chance: %s' % ('', resid(x.dp)))
    for s in range(LIVE, F538_LAST + 1):
        print('    %d: %s' % (s, resid(C[(C.season == s) & ~hand].dD)))
    print('  +-250 resting-starter hand terms (|dD| 200-300): %d games (%d in 2019-2022)' % (hand.sum(), (hand & live).sum()))
    big = C[live & (C.dD.abs() >= 0.01) & ~hand]
    tbb = (big.season == 2020) & ((big.dD.abs() - 66.0).abs() < 0.01)
    print('  2019-2022 forecasts off by 0.01 Elo or more besides those: %d, of which TB 2020 road games at exactly 66: %d; the other %d:'
          % (len(big), tbb.sum(), (~tbb).sum()))
    print('    ' + ', '.join('%s %+.2f' % (a, b) for a, b in zip(big[~tbb].gid, big[~tbb].dD)))
    nb = C[(C.site == 'neutral') & ~C.po & ((C.bye1 + C.bye2) > 0)]
    print('  regular-season games abroad with a team off a bye (the bye term kept): %s' % ', '.join(
        '%s dD %+.2f (without the bye term %+.2f)' % (a, b, b - BYE * (c1 - c2)) for a, b, c1, c2 in zip(nb.gid, nb.dD, nb.bye1, nb.bye2)))
    off = C[(C.neutral == 1) & (C.site == 'home') & ~C.gid.str.contains('_2[12]_')]
    print('  domestic moves 538 flagged neutral (the rule makes them home games): %s' % ', '.join('%s %+.1f' % (a, b) for a, b in zip(off.gid, off.dD)))
    for lab, x in [('1999-2018', C[back]), ('2019-2022', C[live])]:
        print('  update %-10s on the forecast\'s own D: %s' % (lab, resid(x.du_pub, 0.001)))
        print('  update %-10s on the rule\'s D:         %s' % (lab, resid(x.du_rule, 0.001)))
    print('  plain Elo: elo_prob1 with H = 65: %s; update: %s' % (resid(C.dpl, 1e-6), resid(C.dpost_plain, 0.001)))
    fact(facts, 'resting_starter_games_1999_2022', int(hand.sum()), "538's +-250 resting-starter hand entries, 1999-2022")
    fact(facts, 'resting_starter_games_2019_2022', int((hand & live).sum()), 'the same, 2019-2022')
    fact(facts, 'tb_2020_road_games', int(tbb.sum()), "Tampa Bay's 2020 road games with the home side's 33 reversed (66 apart)")
    fact(facts, 'domestic_moves_called_neutral', len(off), "games moved inside the US that 538 called neutral, 1999-2022: " + ', '.join(off.gid))
    fact(facts, 'domestic_moves_called_neutral_2019_2022', int((off.season >= LIVE).sum()), 'the same, 2019-2022')
    C.attrs['hand'] = int(hand.sum())
    C.attrs['hand_live'] = int((hand & live).sum())
    C.attrs['tb2020'] = int(tbb.sum())
    C.attrs['other_live'] = list(zip(big[~tbb].gid, big[~tbb].dD.round(2)))
    return C


def explain_misses(E, C, L):
    """538's 2019-2022 forecasts the rules miss by 0.01 Elo or more, each with what explains it: a +-250 hand entry,
    Tampa Bay's 2020 road games, 538's neutral flag on a game moved inside the US, or a forecast made with another
    quarterback of the team than the one the file names (his latest value in the file, the team rating as published:
    the miss gone to 0.01 Elo); else unexplained"""
    e = E.set_index('row')
    vals = L[L.season >= LIVE - 1].sort_values(['date', 'row', 'side'])
    rows = []
    for r in C[(C.season >= LIVE) & (C.dD.abs() >= 0.01)].itertuples(index=False):
        x = e.loc[r.row]
        why, other = 'unexplained', ''
        if 200 < abs(r.dD) < 300:
            why = 'resting starters: 250 by hand'
        elif r.season == 2020 and abs(abs(r.dD) - 66.0) < 0.01:
            why = "Tampa Bay 2020: the home side's 33 reversed"
        elif r.neutral == 1 and r.site == 'home':
            why = '538 called a game moved inside the US neutral'
        else:
            for side, sg in (('1', 1), ('2', -1)):
                T = x['qb%s_value_pre' % side] - x['qb%s_adj' % side]
                cand = vals[(vals.team == x['team' + side]) & (vals.season == x.season) & (vals.qb != x['qb' + side])]
                for qn, c in cand.groupby('qb'):
                    before = c[c.date < x.date]
                    v = before.vpost.iloc[-1] if len(before) else c.vpre.iloc[0]
                    if abs(r.dD + r.m * sg * ((v - T) - x['qb%s_adj' % side])) < 0.01:
                        why, other = 'forecast with another starter', '%s for %s (the file names %s)' % (qn, x['team' + side], x['qb' + side])
        rows.append(dict(game_id=r.gid, season=r.season, date=r.date, team1=r.team1, team2=r.team2, miss_elo=round(r.dD, 2),
                         why=why, detail=other))
    return pd.DataFrame(rows)


def market_checks(E, wt, checks_out, facts):
    """the preseason carry on 538's own first games; returns 538's half-win lines (1999-2018) and its implied win
    totals (the lines, then 2019-2022 continuous) for LINES and PROOF"""
    print("\n== the preseason carry (each team's first qbelo of a season) ==")
    rows = []
    for s in (1, 2):
        t = E[['date', 'season', 'team%d' % s, 'qbelo%d_pre' % s, 'qbelo%d_post' % s]].copy()
        t.columns = ['date', 'season', 'team', 'pre', 'post']
        rows.append(t)
    T = pd.concat(rows).sort_values(['team', 'date'])
    T['pp'] = T.groupby('team').post.shift()
    T['ps'] = T.groupby('team').season.shift()
    b = T[(T.season != T.ps) & T.pp.notna() & T.season.between(FIRST, F538_LAST)].copy()
    b['Rv'] = (2 / 3) * b.pp + MEAN / 3
    b['V'] = (b.pre - b.Rv / 3) * 1.5
    z = (b.V - MKT_A) / (MKT_B / 2)
    b['dist'] = (z - z.round()).abs() * MKT_B / 2
    b['W'] = z.round() / 2
    pre = b[b.season < LIVE]
    post = b[b.season >= LIVE].copy()
    post['W16'] = [wt.get((s, t)) for s, t in zip(post.season, post.team)]
    post = post[post.W16.notna()]
    lin = post.Rv / 3 + (2 / 3) * (MKT_A + MKT_B * post.W16)
    rm = lambda x: float(np.sqrt((np.asarray(x) ** 2).mean()))  # noqa: E731
    c = checks_out
    c.append(dict(rule="preseason: 1/3 last season's (reverted 1/3 to 1505) + 2/3 (1171.4 + 40.71 x win total)",
                  constant='1171.4, 40.71 a win', checked_on="538's first qbelo of each team's season, 1999-2018: the market rating it implies, against the half-win lattice",
                  unit='Elo', **stat(pre.dist, 1e-8)))
    c.append(dict(rule='preseason, the same with win_totals.csv (exp_wins x 16 / games)', constant='1171.4, 40.71 a win',
                  checked_on="538's first qbelo of each team's season, 2019-2022 (root mean square %.2f Elo; plain reversion alone %.2f)"
                  % (rm(post.pre - lin), rm(post.pre - post.Rv)), unit='Elo', **stat(post.pre - lin, 1.0)))
    print('  plain 1/3 reversion alone: %s' % resid(b.pre - b.Rv))
    print('  1999-2018: implied market rating on the half-win lattice 1171.4 + 40.71*W: %s' % resid(pre.dist))
    print('     off the lattice: %s' % ', '.join('%s %d' % (t, s) for t, s in zip(pre[pre.dist >= 0.01].team, pre[pre.dist >= 0.01].season)))
    print('  2019-2022 with win_totals.csv in the same rule: %s; rmse %.3f (plain reversion %.3f)' % (resid(post.pre - lin, 1.0), rm(post.pre - lin), rm(post.pre - post.Rv)))
    post['Wi'] = (post.V - MKT_A) / MKT_B
    print('     implied W against win_totals.csv: mean |diff| %.3f wins' % (post.Wi - post.W16).abs().mean())
    fact(facts, 'win_total_vs_538_mean_abs_wins', round(float((post.Wi - post.W16).abs().mean()), 3),
         "win_totals.csv (16-game scale) against the win total 538's 2019-2022 openers imply: mean |difference|, wins")
    fact(facts, 'win_total_vs_538_corr', round(float(np.corrcoef(post.Wi, post.W16)[0, 1]), 3), 'the same: correlation')
    wf = wintotals_frame().set_index(['season', 't538'])
    for y in (2021, 2022):
        q = post[post.season == y]
        raw_w = np.array([wf.at[(y, t), 'exp_wins'] for t in q.team])
        fact(facts, 'win_total_scale_%d_16game' % y, round(float((q.Wi - q.W16).mean()), 2),
             "538's %d openers: the win total they imply less win_totals.csv's x 16/17, mean, wins" % y)
        fact(facts, 'win_total_scale_%d_unscaled' % y, round(float((q.Wi - raw_w).mean()), 2),
             'the same against the 17-game total unscaled, mean, wins')
    ok = pre[pre.dist < 0.01]
    lines = {(int(s), t): w for s, t, w in zip(ok.season, ok.team, ok.W)}
    implied = dict(lines)
    bl = b[b.season >= LIVE]
    implied.update({(int(s), t): (v - MKT_A) / MKT_B for s, t, v in zip(bl.season, bl.team, bl.V)})
    return lines, implied


def hand_inputs(C, L538, n2p, lk, G):
    """538's own inputs that no rule produces, for PROOF only: its named QBs and their raw VALUE (gv/3.3 - R on its
    own columns), the +-250 resting-starter terms, Tampa Bay's 2020 road games (-66), three season-start QB1s, five
    week-18 starts left out of the QB tracks, four first values against its own rule, and its neutral flag"""
    sw = lk.set_index('row').swap
    gid = lk.set_index('row').gid
    extra, no_upd, upd_plain = {}, set(), set()
    for r, g, s, dd in zip(C.row, C.gid, C.season, C.dD):
        sgn = -1 if sw[r] else 1
        if 200 < abs(dd) < 300:
            extra[g] = -250.0 * np.sign(dd) * sgn
            # from 2021 the page: "neither team's rating changes" after a locked-seed game
            (no_upd if s >= 2021 else upd_plain).add(g)
        elif s == 2020 and abs(abs(dd) - 66.0) < 0.01:
            extra[g] = -dd * sgn          # Tampa Bay's 2020 road games: the home side's 33 flipped to -33
    site = {}
    for g, n, s in zip(C.gid, C.neutral, C.site):
        if n == 1 and s == 'home' and not re.search(r'_2[12]_', g):
            site[g] = 'neutral'
    qbn, rawq = {}, {}
    for r, side, key, raw in zip(L538.row, L538.side, L538.key, L538.raw538):
        if r not in gid.index:
            continue
        qbn[(r, side)] = key
        rawq[(gid[r], key)] = raw
    G2 = []
    by_gid = {g_: (int(r), int(s_)) for r, g_, s_ in lk.itertuples(index=False)}
    for g in G:
        if g['season'] > F538_LAST:
            break
        g = dict(g)
        if g['gid'] in by_gid:
            r, s_ = by_gid[g['gid']]
            k1, k2 = qbn.get((r, 1)), qbn.get((r, 2))
            kh, ka = (k2, k1) if s_ else (k1, k2)
            g['kh'], g['ka'] = kh or g['kh'], ka or g['ka']
        G2.append(g)
    qb1 = {('HOU', 2021): n2p['Deshaun Watson'], ('CLE', 2022): n2p['Deshaun Watson'], ('NYJ', 2022): n2p['Zach Wilson']}
    skip = {('2021_18_GB_DET', 'GB'), ('2022_18_LAC_DEN', 'LAC'), ('2022_18_TB_ATL', 'TB'),
            ('2022_18_NYG_PHI', 'PHI'), ('2022_18_NYG_PHI', 'NYG')}
    # first values 538 gave against its own rule: Pryor (2011 supplemental draft) pick 1's; three undrafted QBs pick 188's
    pick = {n2p['Terrelle Pryor']: 1, n2p['Devlin Hodges']: 188, n2p['David Blough']: 188, n2p['John Wolford']: 188}
    return G2, rawq, dict(extraH=extra, no_update=no_upd, update_without_extra=upd_plain, site=site, qb1=qb1, skip=skip,
                          pick=pick)


# ---------------------------------------------------------------- against 538, and the records
def orient(res, lk):
    """a run's rows in 538's orientation (team1/team2 as 538 has them), 538's row beside"""
    x = res.merge(lk, on='gid', how='left')
    sw = (x.swap == 1).values
    f = lambda a, b: np.where(sw, x[b], x[a])  # noqa: E731
    return pd.DataFrame({'gid': x.gid, 'row538': x.row, 'season': x.season, 'date': x.date, 'week': x.week,
                         'playoff': x.po, 'team1': f('h', 'a'), 'team2': f('a', 'h'), 'qb1': f('qhn', 'qan'),
                         'qb2': f('qan', 'qhn'), 'qb1_id': f('qh', 'qa'), 'qb2_id': f('qa', 'qh'),
                         'qbelo1_pre': f('qbelo_h', 'qbelo_a'), 'qbelo2_pre': f('qbelo_a', 'qbelo_h'),
                         'qb1_adj': f('adj_h', 'adj_a'), 'qb2_adj': f('adj_a', 'adj_h'),
                         'qbelo_prob1': np.where(sw, 1 - x.p, x.p), 'elo_prob1': np.where(sw, 1 - x.elo_p, x.elo_p),
                         'score1': f('hs', 'as_'), 'score2': f('as_', 'hs')})


def validate(o, E, run):
    """a run against 538's published qbelo_prob1, 2003-2022, by season and over blocks of seasons"""
    e = E.set_index('row')
    x = o[(o.season >= COMPARED) & (o.season <= F538_LAST) & o.row538.notna()].copy()
    for c in ['qbelo_prob1', 'qbelo1_pre', 'qbelo2_pre', 'qb1_adj', 'qb2_adj']:
        x['m_' + c] = e[c].reindex(x.row538.astype(int)).values
    x['dp'] = x.qbelo_prob1 - x.m_qbelo_prob1
    x['same'] = np.sign(x.qbelo_prob1 - 0.5) == np.sign(x.m_qbelo_prob1 - 0.5)
    x['dq'] = (np.abs(x.qbelo1_pre - x.m_qbelo1_pre) + np.abs(x.qbelo2_pre - x.m_qbelo2_pre)) / 2
    x['da'] = (np.abs(x.qb1_adj - x.m_qb1_adj) + np.abs(x.qb2_adj - x.m_qb2_adj)) / 2

    def summ(d, lab):
        return dict(run=run, seasons=lab, games=len(d), same_pick=round(float(d.same.mean()), 4),
                    picks_differ=int((~d.same).sum()), corr=round(float(np.corrcoef(d.qbelo_prob1, d.m_qbelo_prob1)[0, 1]), 4),
                    mean_abs_diff=round(float(d.dp.abs().mean()), 6), median_abs_diff=round(float(d.dp.abs().median()), 6),
                    max_abs_diff=round(float(d.dp.abs().max()), 6), within_1pt=round(float((d.dp.abs() < 0.01).mean()), 4),
                    mean_abs_rating_diff=round(float(d.dq.mean()), 2), mean_abs_adj_diff=round(float(d.da.mean()), 2))
    rows = [summ(d, str(s)) for s, d in x.groupby('season')]
    for a, b in [(COMPARED, 2018), (LIVE, F538_LAST), (COMPARED, F538_LAST)]:
        rows.append(summ(x[x.season.between(a, b)], '%d-%d' % (a, b)))
    return pd.DataFrame(rows)


def record(p, s1, s2):
    """picks right and wrong (a tie is no decision), ties, decided games with no pick (p exactly 0.5), Brier"""
    p, s1, s2 = (np.asarray(v, dtype=float) for v in (p, s1, s2))
    dec = s1 != s2
    pick = p != 0.5
    right = ((p > 0.5) & (s1 > s2)) | ((p < 0.5) & (s1 < s2))
    n = (dec & pick).sum()
    w = (right & dec & pick).sum()
    y = np.where(s1 > s2, 1.0, np.where(s1 < s2, 0.0, 0.5))
    return dict(games=int(len(p)), right=int(w), wrong=int(n - w), ties=int((~dec).sum()), no_pick=int((dec & ~pick).sum()),
                pct=round(float(w / n), 4) if n else None, brier=round(float(np.mean((p - y) ** 2)), 4))


def the_file(E, G, lk, facts):
    """538's nfl_elo.csv as read: its size and span, and its 1999-2022 games against games.csv's finals"""
    gi = {g['gid']: g for g in G}
    e = E.set_index('row')
    same = 0
    for r, gid, sw in lk.itertuples(index=False):
        g = gi[gid]
        s1, s2 = (g['as_'], g['hs']) if sw else (g['hs'], g['as_'])
        same += int(e.at[r, 'score1'] == s1 and e.at[r, 'score2'] == s2)
    fact(facts, 'f538_rows', len(E), "games in 538's nfl_elo.csv")
    fact(facts, 'f538_first_date', E.date.min(), 'its first game')
    fact(facts, 'f538_last_date', E.date.max(), 'its last game (the 2022 season\'s Super Bowl)')
    fact(facts, 'f538_first_qb_season', int(E[E.qb1.notna()].season.min()), 'the first season with quarterback columns')
    fact(facts, 'f538_rows_1999_2022', int((E.season >= FIRST).sum()), 'its games of 1999-2022')
    fact(facts, 'f538_linked_to_games_csv', len(lk), "those matched to a games.csv game on the same date with the same two teams")
    fact(facts, 'f538_same_score_as_games_csv', same, 'of those, with the same score as games.csv')


def mirror_check(E, facts):
    """the copy of nfl_elo.csv read here against 538's own nfl-elo-game repository (data/nfl_games.csv, 1920 to the
    2020 season): same games, same plain ratings and scores"""
    with open(F538_GAMES, 'rb') as fh:
        digest = hashlib.sha256(fh.read()).hexdigest()
    if digest != fetch.F538_GAMES_SHA256:
        raise SystemExit(f'{F538_GAMES} is not the file this study checked (sha256 {digest}): run research/fetch.py --fivethirtyeight --force')
    m = pd.read_csv(F538_GAMES)
    m = m[m.season < common.HOLDOUT_FROM]
    j = m.merge(E[['date', 'team1', 'team2', 'elo1_pre', 'elo2_pre', 'elo_prob1', 'score1', 'score2']],
                on=['date', 'team1', 'team2'], how='left', suffixes=('', '_538'), validate='one_to_one')
    hit = j.elo1_pre.notna()
    de = np.maximum((j.elo1 - j.elo1_pre).abs(), (j.elo2 - j.elo2_pre).abs())[hit]
    bad_score = int(((j.score1 != j.score1_538) | (j.score2 != j.score2_538))[hit].sum())
    dp = (j.elo_prob1 - j.elo_prob1_538).abs()
    off = j[hit & (dp > 1e-6)]
    fact(facts, 'nfl_elo_game_rows', len(m), "games in 538's nfl-elo-game data/nfl_games.csv")
    fact(facts, 'nfl_elo_game_matched', int(hit.sum()), "of those, found in nfl_elo.csv on the same date with the same two teams")
    fact(facts, 'nfl_elo_game_max_rating_diff', float(de.max()), 'the largest difference in either plain rating before the game, Elo')
    fact(facts, 'nfl_elo_game_score_mismatches', bad_score, 'games with a different score')
    fact(facts, 'nfl_elo_game_prob_diffs', len(off), 'games whose plain Elo chance differs by more than 1e-6: ' + '; '.join(
        '%s %s-%s %.3f against %.3f' % (r.date, r.team1, r.team2, r.elo_prob1, r.elo_prob1_538) for r in off.itertuples(index=False)))
    print("538's own nfl-elo-game file: %d games, %d in nfl_elo.csv; plain ratings max |diff| %g; score mismatches %d; chances apart: %d"
          % (len(m), hit.sum(), de.max(), bad_score, len(off)))


def starter_facts(G, raw, prev, facts):
    """games.csv's named starter against the first dropback, 2023-2025; and how often the starter is not the team's
    previous one (PREGAME's guess), and the previous one then did not play at all"""
    print("  games.csv's named starter against the first dropback, %d-%d (did not play: no line in the game's player stats):" % (F538_LAST + 1, LAST))
    for g in G:
        if g['season'] > F538_LAST:
            for gc, gcn, k, kn in ((g['gch'], g['gchn'], g['kh'], g['nh']), (g['gca'], g['gcan'], g['ka'], g['na'])):
                if gc != k:
                    print('    %s: games.csv %s (%s), first dropback %s' % (g['gid'], gcn, 'played' if (g['gid'], gc) in raw else 'did not play', kn))
    for y in range(F538_LAST + 1, LAST + 1):
        d = [(g['gid'], gc) for g in G if g['season'] == y for gc, k in ((g['gch'], g['kh']), (g['gca'], g['ka'])) if gc != k]
        fact(facts, 'gamescsv_starter_differs_%d' % y, len(d), "team-games of %d where games.csv's named starter is not the first quarterback to drop back" % y)
        fact(facts, 'gamescsv_starter_did_not_play_%d' % y, sum((gid, gc) not in raw for gid, gc in d),
             "of those, games.csv's named starter has no line in the game's player stats (he did not play)")
    for lab, words, keep in (('2003_2025', '2003-2025, playoffs in', lambda g: g['season'] >= COMPARED),
                             ('2021_2025_reg', "2021-2025 regular seasons, study 4's window", lambda g: 2021 <= g['season'] <= LAST and not g['po'])):
        n = ch = out = 0
        for g in G:
            if not keep(g):
                continue
            for x, k in zip(prev[g['gid']], (g['kh'], g['ka'])):
                n += 1
                if x != k:
                    ch += 1
                    out += int((g['gid'], x) not in raw)
        fact(facts, 'starter_changed_%s' % lab, ch, "team-games (%s) whose starter is not the team's previous starter, of %d" % (words, n))
        fact(facts, 'starter_changed_share_%s' % lab, round(ch / n, 4), 'the same, as a share')
        fact(facts, 'starter_changed_prev_did_not_play_%s' % lab, out, 'of those, the previous starter has no line in the game (did not play)')
        fact(facts, 'starter_changed_prev_did_not_play_share_%s' % lab, round(out / ch, 4), 'the same, as a share of the changes')


def preseason_facts(G, facts):
    """win_totals.csv's lines are preseason ones: against each team's regular-season win share of the season itself
    and of the season before"""
    w = {}
    for g in G:
        if g['po']:
            continue
        r = 1.0 if g['hs'] > g['as_'] else (0.0 if g['hs'] < g['as_'] else 0.5)
        for t, x in ((g['h'], r), (g['a'], 1 - r)):
            a = w.setdefault((g['season'], t), [0.0, 0])
            a[0] += x
            a[1] += 1
    wt = wintotals_frame()
    q = wt.exp_wins / wt.games
    now = np.array([w[(s, t)][0] / w[(s, t)][1] for s, t in zip(wt.season, wt.t538)])
    before = np.array([w[(s - 1, t)][0] / w[(s - 1, t)][1] for s, t in zip(wt.season, wt.t538)])
    fact(facts, 'win_total_corr_same_season', round(float(np.corrcoef(q, now)[0, 1]), 3),
         "win_totals.csv 2019-2025 (expected wins a game) against the team's win share in that regular season: correlation")
    fact(facts, 'win_total_corr_season_before', round(float(np.corrcoef(q, before)[0, 1]), 3),
         'the same against the season before')


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(RES, exist_ok=True)
    print('loading ...', flush=True)
    E = load_538()
    loc, venue = load_locations()
    raw, has, qbs, names = load_stats()
    first_qb = load_first_qb(qbs)
    G = load_games(loc, venue, first_qb, names)
    draft = load_draft()
    wt = load_wintotals()
    lk = link_538(E, G)
    n2p = name_map(E, G, lk)
    print("games.csv games %d-%d: %d; linked to 538's file (%d-%d): %d (%d with 538's team1 the schedule's away team)"
          % (FIRST, LAST, len(G), FIRST, F538_LAST, len(lk), lk.swap.sum()))
    rc, facts = [], []
    the_file(E, G, lk, facts)
    mirror_check(E, facts)

    # the starter rule against 538's named QB and games.csv's
    gi = {g['gid']: g for g in G}
    e = E.set_index('row')
    agree = []
    for r, gid, sw in lk.itertuples(index=False):
        g = gi[gid]
        for s538, sd in (('1', 'a' if sw else 'h'), ('2', 'h' if sw else 'a')):
            q = n2p.get(e.at[r, 'qb' + s538])
            agree.append((g['season'], g['k' + sd] == q, g['gc' + sd] == q, g['src_' + sd]))
    A = pd.DataFrame(agree, columns=['season', 'rule', 'gc', 'src'])
    rc.append(dict(rule="the starter: the team's first dropback (pass, sack or scramble) by a player nflverse lists at QB", constant='none',
                   checked_on="538's named QB, 1999-2022 team-games (games.csv's named starter instead: %d differ)" % (~A.gc).sum(),
                   unit='team-games', n=len(A), tolerance=None, n_within=int(A.rule.sum()), share_within=round(float(A.rule.mean()), 6),
                   median_abs=None, max_abs=None))
    print("starter: first QB dropback (games.csv's where the play-by-play has none: %d team-games) against 538's named QB, "
          "1999-2022: %d of %d differ; games.csv's named starter: %d differ" % ((A.src == 'games.csv').sum(), (~A.rule).sum(), len(A), (~A.gc).sum()))
    f = pd.DataFrame([(g['season'], s) for g in G if g['season'] > F538_LAST for s in (g['gch'] == g['kh'], g['gca'] == g['ka'])],
                     columns=['season', 'same'])
    print("  2023-%d: games.csv's named starter differs from the first QB dropback in %s team-games"
          % (LAST, f.groupby('season').same.apply(lambda s: int((~s).sum())).to_dict()))
    nr = sum(1 for g in G if g['season'] >= COMPARED for k in (g['kh'], g['ka']) if (g['gid'], k) not in raw)
    print('  starters %d-%d with no weekly line: %d' % (COMPARED, LAST, nr))
    prev = previous_starters(G)
    starter_facts(G, raw, prev, facts)

    print("\n== the QB track on 538's own columns (replay 1950-2022) ==")
    seed, L538, _ = replay_538(E, n2p, rc, facts)
    C = checks(E, G, lk, rc, facts)
    C.to_csv(os.path.join(OUT, 'checks_on_538_columns.csv'), index=False)
    miss = explain_misses(E, C, L538)
    miss.to_csv(os.path.join(RES, 'forecast_misses_2019_2022.csv'), index=False)
    print("\n538's 2019-2022 forecasts the rules miss by 0.01 Elo or more (results/forecast_misses_2019_2022.csv): %d" % len(miss))
    print(miss.groupby('why').size().to_string())
    lines, implied = market_checks(E, wt, rc, facts)
    preseason_facts(G, facts)

    # a QB's raw VALUE: 538's (gv/3.3 - R, R the defence chain replayed) against nflverse's weekly line
    Lr = L538[L538.season >= COMPARED].copy()
    Lr['gid'] = lk.set_index('row').gid.reindex(Lr.row).values
    Lr['nv'] = [raw.get((g, k)) for g, k in zip(Lr.gid, Lr.key)]
    m = Lr[Lr.nv.notna()]
    d = m.raw538 - m.nv
    for lo, hi in [(COMPARED, 2018), (LIVE, F538_LAST)]:
        msk = m.season.between(lo, hi)
        rc.append(dict(rule='game value: 3.3 x (raw VALUE of the weekly line + the opposing defence)',
                       constant='the VALUE weights, 3.3', checked_on="538's raw VALUE (gv/3.3 less the defence chain) against "
                       "nflverse's weekly line, %d-%d (mean |diff| %.2f Elo)" % (lo, hi, TO_ELO * d[msk].abs().mean()),
                       unit='VALUE', **stat(d[msk], 0.01)))
    print("\nnamed QB's raw VALUE, 538's (gv/3.3 - R) against nflverse's weekly line: share within 0.01, 2003-2018 %.4f"
          " (n %d), 2019-2022 %.4f (n %d); mean |diff| in Elo %.2f and %.2f"
          % ((d[m.season <= 2018].abs() < 0.01).mean(), (m.season <= 2018).sum(), (d[m.season >= LIVE].abs() < 0.01).mean(),
             (m.season >= LIVE).sum(), TO_ELO * d[m.season <= 2018].abs().mean(), TO_ELO * d[m.season >= LIVE].abs().mean()))
    # a QB's first value: his first start in 538's file from 1999, against the draft rule
    first = L538[L538.season >= FIRST].drop_duplicates('key')
    first = first[~first.key.isin(set(L538[L538.season < FIRST].key))]
    pid, pname = draft
    fp = [pid.get(k, pname.get(norm(q))) for k, q in zip(first.key, first.qb)]
    rd = first.vpre.values - np.array([rookie_value(p, s) for p, s in zip(fp, first.season)])
    off = first[np.abs(rd) >= 0.01]
    rc.append(dict(rule="first start ever: 0.45342 x (250 - pick) x min(1, (season - 1970)/35), floored at 0; undrafted 0",
                   constant='0.45342 a pick', checked_on="538's value_pre at each QB's first start, 1999-2022 (off: %s)" % ', '.join(off.qb),
                   unit='Elo', **stat(rd, 1e-9)))
    print('first starts 1999-2022 against the draft rule: %s; off: %s' % (resid(rd), ', '.join('%s %.2f' % (q, v) for q, v in zip(off.qb, off.vpre))))

    # ---- the runs
    print('\n== the runs ==', flush=True)
    m10 = {s: home_margin_10(s) for s in range(F538_LAST, LAST + 1)}
    c_hfa = HFA_FWD / m10[F538_LAST]
    hfa_sens = {s: c_hfa * m10[s] for s in range(F538_LAST + 1, LAST + 1)}
    print('SENSITIVITY home field: c = %.3f Elo per point (48.6781 / the 2012-2021 home margin %.4f); %s'
          % (c_hfa, m10[F538_LAST], ', '.join('%d %.2f' % (s, v) for s, v in hfa_sens.items())))
    fact(facts, 'hfa_2022_first', HFA_2022[0][1], "538's 2022 home field at the season's start, Elo (HFA_2022, which the forecast check reproduces)")
    fact(facts, 'hfa_2022_last', HFA_2022[-1][1], "538's home field at its last game, the 2022 season's Super Bowl, Elo")
    fact(facts, 'home_margin_2012_2021', round(m10[F538_LAST], 4), "games.csv's mean home margin at a home team's own ground, 2012-2021, points")
    fact(facts, 'sensitivity_elo_per_point', round(c_hfa, 2), "SENSITIVITY's scale: 538's 2022 home field over that margin, Elo a point")
    mk_lines = dict(wt)
    mk_lines.update({k: v for k, v in lines.items() if 2004 <= k[0] <= 2018})
    G2, raw538, hand = hand_inputs(C, L538, n2p, lk, G)
    raw_d = dict(raw)
    raw_d.update(raw538)
    xwarm = float(np.mean([raw.get((g['gid'], k), 0.0) for g in G if g['season'] == FIRST and not g['po'] for k in (g['kh'], g['ka'])]))
    runs = {}
    # REBUILD also makes PREGAME's forecasts (proxy): its ratings move on the actual starter, so they are REBUILD's
    for name, kw, games in [('REBUILD', dict(market=wt, proxy=prev), G),
                            ('LINES', dict(market=mk_lines), G),
                            ('SENSITIVITY', dict(market=wt, hfa_fwd=hfa_sens), G),
                            ('PROOF', dict(market=implied, seed=seed, hand=hand), G2)]:
        eng = Engine(raw_d if name == 'PROOF' else raw, has, draft, **kw)
        eng.Xwarm = xwarm
        runs[name] = eng.run(games)
        print('  %s: %d games' % (name, len(runs[name])), flush=True)

    # the warm-up: REBUILD against the same rules and inputs started from 538's own state entering 2003
    seeded = Engine(raw, has, draft, market=wt, seed=seed).run(G).set_index('gid')
    rb = runs['REBUILD'].set_index('gid')
    rb = rb[rb.season >= COMPARED]
    dp = (rb.p - seeded.p.reindex(rb.index)).abs()
    warm = pd.DataFrame({'season': rb.season, 'dp': dp, 'apart': np.sign(rb.p - 0.5) != np.sign(seeded.p.reindex(rb.index) - 0.5)})
    warm = warm.groupby('season').agg(games=('dp', 'size'), mean_abs_diff=('dp', 'mean'), max_abs_diff=('dp', 'max'),
                                      picks_differ=('apart', 'sum')).reset_index()
    warm.to_csv(os.path.join(RES, 'warmup.csv'), index=False, float_format='%.6f')
    print("\nREBUILD (from 1999) against the same run started from 538's state entering 2003:")
    print(warm.to_string(index=False))

    O = {k: orient(r, lk) for k, r in runs.items()}
    val = []
    for k in ('REBUILD', 'LINES', 'PROOF'):
        v = validate(O[k], E, k)
        val.append(v)
        print("\n%s against 538's published qbelo_prob1:" % k)
        print(v.drop(columns='run').to_string(index=False))
    val = pd.concat(val, ignore_index=True)
    val.to_csv(os.path.join(RES, 'validation.csv'), index=False)
    for k, o in O.items():
        mm = e.reindex(o.row538.fillna(-1).astype(int))
        o = o.copy()
        for c in ['qb1', 'qb2', 'qbelo1_pre', 'qbelo2_pre', 'qb1_adj', 'qb2_adj', 'qbelo_prob1', 'elo_prob1']:
            o['f538_' + c] = mm[c].values
        o.to_csv(os.path.join(OUT, '%s.csv' % k.lower()), index=False)

    # ---- every game 2003-2025, REBUILD and our plain Elo, 538's published chance beside
    R = runs['REBUILD']
    R = R[R.season >= COMPARED].merge(lk, on='gid', how='left')
    pub = e.reindex(R.row.fillna(-1).astype(int))
    sw = (R.swap == 1).values
    has538 = R.row.notna().values
    pick = lambda p: np.where(p > 0.5, R.home, np.where(p < 0.5, R.away, ''))  # noqa: E731
    qname = {}
    for g in G:
        qname[g['kh']], qname[g['ka']] = g['nh'], g['na']
    calls = pd.DataFrame({
        'game_id': R.gid, 'season': R.season, 'week': R.week, 'game_type': R.gtype, 'gameday': R.date,
        'home_team': R.home, 'away_team': R.away, 'home_score': R.hs.astype(int), 'away_score': R.as_.astype(int),
        'qbelo_p_home': R.p, 'qbelo_pick': pick(R.p), 'elo_p_home': R.elo_p, 'elo_pick': pick(R.elo_p),
        'home_qbelo': R.qbelo_h, 'away_qbelo': R.qbelo_a, 'home_field': R.H,
        'home_qb': R.qhn, 'away_qb': R.qan, 'home_qb_id': R.qh, 'away_qb_id': R.qa,
        'home_qb_adj': R.adj_h, 'away_qb_adj': R.adj_a,
        'qbelo_pregame_p_home': R.p_pre, 'qbelo_pregame_pick': pick(R.p_pre),
        'home_qb_pregame': R.xh.map(qname), 'away_qb_pregame': R.xa.map(qname),
        'f538_qbelo_p_home': np.where(has538, np.where(sw, 1 - pub.qbelo_prob1.values, pub.qbelo_prob1.values), np.nan),
        'f538_elo_p_home': np.where(has538, np.where(sw, 1 - pub.elo_prob1.values, pub.elo_prob1.values), np.nan)})
    for c in ('f538_qbelo', 'f538_elo'):
        calls[c + '_pick'] = np.where(calls[c + '_p_home'].isna(), '', pick(calls[c + '_p_home']))
    # six decimals: no chance in the file is nearer 0.5 than 0.000009, so a pick can be read off its chance
    calls.to_csv(os.path.join(RES, 'calls_2003_2025.csv'), index=False, float_format='%.6f')

    # ---- records by season, every game (playoffs in), a tie no decision
    rows = []
    blocks = [(str(s), s, s) for s in range(COMPARED, LAST + 1)]
    blocks += [('%d-%d' % (a, b), a, b) for a, b in [(COMPARED, LIVE - 1), (LIVE, F538_LAST), (COMPARED, F538_LAST),
                                                      (F538_LAST + 1, LAST), (COMPARED, LAST)]]
    lines_p = runs['LINES'].set_index('gid').p
    proof_p = runs['PROOF'].set_index('gid').p
    models = [('QB Elo (rebuild)', lambda c: c.qbelo_p_home, LAST),
              ('QB Elo (pregame starter)', lambda c: c.qbelo_pregame_p_home, LAST),
              ('Plain Elo (ours)', lambda c: c.elo_p_home, LAST),
              ("538's QB Elo (published)", lambda c: c.f538_qbelo_p_home, F538_LAST),
              ("538's plain Elo (published)", lambda c: c.f538_elo_p_home, F538_LAST),
              ("QB Elo (rebuild + 538's lines 2004-2018)", lambda c: lines_p.reindex(c.game_id).values, F538_LAST),
              ("QB Elo (fed 538's inputs)", lambda c: proof_p.reindex(c.game_id).values, F538_LAST)]
    for name, fn, hi in models:
        for lab, a, b in blocks:
            if b > hi:
                continue
            c = calls[calls.season.between(a, b)]
            rows.append(dict(model=name, season=lab, **record(fn(c), c.home_score, c.away_score)))
    rec = pd.DataFrame(rows)
    rec.to_csv(os.path.join(RES, 'records.csv'), index=False)
    print('\n== records, every game (playoffs in; a tie is no decision) ==')
    print(rec.pivot(index='season', columns='model', values='pct').to_string())
    print(rec[rec.season.str.contains('-')].to_string(index=False))

    # ---- SENSITIVITY: what the 2023-2025 home field moves
    S = runs['SENSITIVITY'].set_index('gid')
    sens = []
    for s in range(F538_LAST + 1, LAST + 1):
        c = calls[calls.season == s]
        ps = S.loc[c.game_id].p.values
        sens.append(dict(season=s, home_field_rebuild=HFA_FWD, home_field_sensitivity=round(hfa_sens[s], 2), games=len(c),
                         picks_differ=int((np.sign(ps - 0.5) != np.sign(c.qbelo_p_home - 0.5)).sum()),
                         mean_abs_diff=round(float(np.abs(ps - c.qbelo_p_home).mean()), 4),
                         max_abs_diff=round(float(np.abs(ps - c.qbelo_p_home).max()), 4),
                         **{'rebuild_' + k: v for k, v in record(c.qbelo_p_home, c.home_score, c.away_score).items() if k in ('right', 'wrong', 'brier')},
                         **{'sensitivity_' + k: v for k, v in record(ps, c.home_score, c.away_score).items() if k in ('right', 'wrong', 'brier')}))
    sens = pd.DataFrame(sens)
    sens.to_csv(os.path.join(RES, 'sensitivity.csv'), index=False)
    print('\n== SENSITIVITY: the 2023-2025 home field scaled with the ten-season home margin ==')
    print(sens.to_string(index=False))

    rc = pd.DataFrame(rc)
    for c in ('share_within', 'median_abs', 'max_abs'):
        rc[c] = [None if v is None or v != v else float('%.6g' % v) for v in rc[c]]
    rc.to_csv(os.path.join(RES, 'rule_checks.csv'), index=False)
    print('\n== rule checks (results/rule_checks.csv) ==')
    print(rc[['rule', 'checked_on', 'n', 'tolerance', 'n_within', 'share_within', 'median_abs', 'max_abs']].to_string(index=False, max_colwidth=60))
    facts = pd.DataFrame(facts)
    facts.to_csv(os.path.join(RES, 'facts.csv'), index=False)
    print('\n== facts the README quotes (results/facts.csv) ==')
    print(facts.to_string(index=False, max_colwidth=110))


if __name__ == '__main__':
    main()
