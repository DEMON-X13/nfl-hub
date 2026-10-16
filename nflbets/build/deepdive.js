/* The Deep Dive, as the Game snapshot's Offense vs defense card draws it: for one side with the ball,
   its four position matchups against the defense it faces, each tagged by its edge. One file, shared:
   nflbets/build/build.js inlines it into the page (window.gsDeepDive, read by snapshot.html), and the
   Season Tracker's job requires it (news/tools/smoke.js and cases.js hold its tags to
   news/tools/deepdive-checks.js on the real data and on made-up teams). It is pure: no page, no DOM,
   no fetch; it writes HTML strings from the data it is handed and escapes every word of it.

   The data is news/data/units.json, written by news/tools/context.js beside units2026.js:
     { units: { <club>: { g26, qb|ol|rb|rec|front|db: { rank, z, who[{id,n,pos,q?}], out?[{n,pos,why}],
                next?{n,pos,from,q?}, next_none?, note?, stats[[label,value,rank,unit?]] },
                vs: { passD:{rank,z}, runD:{rank,z} }, overall } },
       meta: UNITS26_META (season, week, built_at, tags { rows { weights, fav, easy }, headline { slope, fav, easy } }),
       basis: UNITS26_BASIS, lineups: UNITS26_LINEUPS }
   Its clubs are the tracker's codes (LAR, WAS, JAX); the board's (LA) go through club().

   A row is this offense's unit against the defense's unit it plays: the quarterback against the pass
   defense, the line against the pass rush, the backs against the run defense, the receivers against
   the coverage. The edge is the offense unit's rating minus the defense's, in league standard
   deviations; the tag weighs it by how much that matchup alone has predicted an offense's points
   (meta.tags.rows.weights), then 1.5 or more is Easy, 0.5 or more Favorable, within 0.5 Even, and
   Tough and Very tough the same the other way. The defense's own rows on the tracker (its pass rush
   against this line, its coverage against these receivers) are the same matchups seen from the other
   side, with the same weights, so they are drawn here as the right-hand side of the line's and the
   receivers' rows. The rows overlap and are never added up.

   A row is drawn compact and centred: the unit, the two sides' clubs and figures ("SEA 1532 · DEN
   1488", the offense's then the defense's), the defense's position it is up against (Pass defense, Pass
   rush, Run defense, Coverage: the owner's call, 16 October 2026, "for offense vs defense section, please
   put opposing positions for the defense") and the tag, the edge in its title. Nothing else: no names, no
   one out, no other number (the owner's call, 14 October 2026: who plays is the Starters card's, the
   numbers the Stat breakdown's). The file still carries the names, who is out and the numbers; the news
   job's smoke holds them to their sources.

   The figures are Elo against Elo (the owner's call, 16 October 2026: "please add in Offense vs defense
   their ELOs instead of the rankings when going through the position matchups"; asked what the offense
   side should show, he chose Elo on both sides, the offense's own tables built the way the defense's were,
   and the quarterback's own Elo on his row). Each is the number the ELO Ratings tab shows, from
   elo/data/model.json's `units` and players.json, read once by the page (window.eloFiles) and handed in,
   never baked in (eloSides):
     Quarterback     the offense's starting quarterback's season Elo (the first quarterback of its
                     expected lineup for this game, matchups.json `lineups`, as the Starters card shows
                     him) against the defense's Pass Defense
     Offensive line  Pass Protection against Pass Rush
     Running backs   Run Offense against Run Defense
     Receivers       Pass Offense against Pass Defense (the row still names the defense's position Coverage)
   The higher of the two wears the card's edge mark (gs-better); each side's title gives its rank and
   tier. The tag stays the Deep Dive's own, the tested formula on units.json's ratings, never recomputed
   from the Elo: the two can disagree, and each says what it is. Where model.json has no such table (an
   older file) or the quarterback has no season rating (unranked, or no lineup for this game), that side
   shows its rank from units.json as before, and no mark is drawn on a row unless both sides are Elo.

   The headline tag is the one the tracker put over its rows: this team's Overall Offense against the
   opponent's Overall Defense (elo/data/model.json `units`, which the card already shows), the gap read
   as points (meta.tags.headline: slope x (off.raw - def.raw)), Favorable from 0.9645, Easy from 2.8935. */
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ord = n => n + ((x => ['th', 'st', 'nd', 'rd'][(x - 20) % 10] || ['th', 'st', 'nd', 'rd'][x] || 'th')(n % 100));
  const sd = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);
  /* the tracker's club codes from the board's */
  const CLUB = { LA: 'LAR', WSH: 'WAS', JAC: 'JAX', OAK: 'LV', SD: 'LAC', STL: 'LAR' };
  const club = t => CLUB[t] || t;

  /* an edge (already weighted) to its tag: [class, words] */
  function tagOf(x, fav, easy) {
    if (x == null || !isFinite(x)) return ['even', 'Even'];
    if (x >= easy) return ['easy', 'Easy'];
    if (x >= fav) return ['fav', 'Favorable'];
    if (x > -fav) return ['even', 'Even'];
    if (x > -easy) return ['tough', 'Tough'];
    return ['vtough', 'Very tough'];
  }

  /* the four rows of one possession, in this order: [offense unit, how the defense's side is read,
     the label, the offense's words, the defense's words, the defense's position as the row names it] */
  const ROWS = [
    ['qb', 'passD', 'Quarterback', 'passing offense', 'pass defense', 'Pass defense'],
    ['ol', 'front', 'Offensive line', 'pass protection', 'pass rush', 'Pass rush'],
    ['rb', 'runD', 'Running backs', 'run game', 'run defense', 'Run defense'],
    ['rec', 'db', 'Receivers', 'receivers', 'coverage', 'Coverage'],
  ];
  /* the defense's side of a row: a unit of its own (pass rush, coverage) or its rating against the
     pass or the run (no names of its own) */
  const faced = (O, k) => (k === 'passD' || k === 'runD') ? (O.vs && O.vs[k]) || null : O[k] || null;

  /* the Elo of each row's two sides: [the offense's table, the defense's] by row, 'qb' the quarterback's
     own season Elo; each table must be named in units.tables (an older model.json has none) */
  const ELO = { qb: ['qb', 'pass_def'], ol: ['pass_pro', 'pass_rush'], rb: ['run_off', 'run_def'], rec: ['pass_off', 'pass_def'] };

  /* the offense's starting quarterback as the Starters card shows him: the first player of the club's
     expected lineup for this game (matchups.json lineups, only where it is for this game) whom
     players.json has at quarterback, with his season Elo and rank where he is ranked; else null */
  function starterQb(PL, MU, team, gameId) {
    const lu = MU && MU.lineups && MU.lineups[team], P = PL && PL.players;
    if (!lu || !P || lu.game_id !== gameId) return null;
    const pid = (lu.players || []).find(p => P[p] && P[p].group === 'QB');
    const e = pid && P[pid];
    if (!e || e.rank == null || e.se == null || !isFinite(e.se)) return null;
    const G = PL.groups && PL.groups.QB;
    return { pid, elo: +e.se, rank: e.rank, of: G && G.active != null ? G.active : null };
  }

  /* each row's two Elo figures for one possession: { qb|ol|rb|rec: [offense side, defense side] }, each
     side { elo, rank, of, what, tier, carried } or null where it falls back to the rank. M is model.json,
     PL players.json, MU matchups.json (each may be null); tier(elo) names a rating's tier (the page's
     pkEloTier), optional */
  function eloSides(M, PL, MU, gameId, off, def, tier) {
    const U = M && M.units, T = (U && U.tables) || {};
    const side = (k, t) => {
      const tab = T[k] && U[k], v = tab && tab[t];
      if (!v || v.elo == null || !isFinite(v.elo)) return null;
      return { elo: +v.elo, rank: v.rank, of: Object.keys(tab).length, what: T[k].label || k, tier: tier ? tier(+v.elo) || '' : '', carried: !v.games && !!v.carried };
    };
    const out = {};
    for (const [key, [ko, kd]] of Object.entries(ELO)) {
      let o = null;
      if (ko === 'qb') { const q = starterQb(PL, MU, off, gameId); if (q) o = { elo: q.elo, rank: q.rank, of: q.of, what: 'starting quarterback, this season', tier: tier ? tier(q.elo) || '' : '', carried: false }; }
      else o = side(ko, off);
      out[key] = [o, side(kd, def)];
    }
    return out;
  }

  /* is the file for this game's week? (the units are built for the schedule's current week alone) */
  function applies(D, season, week) {
    const m = D && D.meta;
    return !!(m && D.units && +m.season === +season && +m.week === +week);
  }

  /* the tag of one row, from the data alone: { cls, tag, edge, w } */
  function rowTag(D, off, def, key) {
    const U = D.units[club(off)], O = D.units[club(def)];
    const row = ROWS.find(r => r[0] === key); if (!U || !O || !row) return null;
    const u = U[key], v = faced(O, row[1]);
    const TR = (D.meta && D.meta.tags && D.meta.tags.rows) || null;
    const w = TR && TR.weights && isFinite(TR.weights[key]) ? +TR.weights[key] : 1;
    const edge = u && v && u.z != null && v.z != null ? u.z - v.z : null;
    const [cls, tag] = edge == null ? tagOf(null) : tagOf(w * edge, TR ? TR.fav : 0.5, TR ? TR.easy : 1.5);
    return { cls, tag, edge, w };
  }

  /* one possession: this offense's four rows against the defense. Returns { html, rows } where rows
     are [{ key, dpos, tag, cls, edge, elo: [offense, defense] }], or null when the file has no units for
     either club. A row is compact and centred: the offense's unit, each side's club and figure ("SEA
     1532 · DEN 1488", the offense's then the defense's, each side titled with what it is rated as), the
     defense's position it faces (.dddu, the owner's call of 16 October 2026) and the tag, whose title
     gives the edge, the two together at the row's end (.ddend); no names, no one out, no other number
     (the owner's call, 14 October 2026: who plays is the Starters card's, the numbers the Stat
     breakdown's). E is eloSides() for this possession: each side's figure its Elo (b.ddelo, the higher
     of two marked gs-better) where E has it, else its rank from the file (b.ddrk), as before 16 October
     2026; with no E every figure is a rank */
  function possession(D, off, def, E) {
    if (!D || !D.units) return null;
    const U = D.units[club(off)], O = D.units[club(def)];
    if (!U || !O) return null;
    const rows = [];
    const html = ROWS.map(([key, dk, label, mine, theirs, dpos]) => {
      const u = U[key], v = faced(O, dk), t = rowTag(D, off, def, key), [eo, ed] = (E && E[key]) || [null, null];
      rows.push({ key, dpos, tag: t.tag, cls: t.cls, edge: t.edge, elo: [eo ? eo.elo : null, ed ? ed.elo : null] });
      /* the higher Elo of the two, where both sides are Elo and they differ */
      const lead = eo && ed && eo.elo !== ed.elo ? (eo.elo > ed.elo ? 'o' : 'd') : null;
      const why = t.edge == null ? '' : ` title="Edge ${sd(t.edge)}: ${esc(off)}'s ${mine} rating minus ${esc(def)}'s ${theirs}, in league standard deviations. The tag weighs it by ${t.w} (${sd(t.w * t.edge)}), by how much this matchup alone has predicted points; the rows overlap, so they are not to be added up"`;
      /* one side: its club and its Elo, titled with what it is, its rank and its tier; or, with no Elo,
         its club and its rank, titled with what it is rated as */
      const one = (cls, c, words, x, e, better) => {
        if (e) {
          const at = [`Elo ${e.elo}`, e.rank != null ? `${ord(e.rank)}${e.of ? ` of ${e.of}` : ''}` : '', e.tier ? esc(e.tier) : '', e.carried ? 'no game yet, carried from last season' : ''].filter(Boolean).join(', ');
          return `<span class="ddside ${cls}" title="${esc(c)} ${esc(e.what)}: ${at}"><span class="ddsn">${esc(c)}</span> <b class="ddelo gs-v${better ? ' gs-better' : ''}">${e.elo}</b></span>`;
        }
        const rk = x && x.rank != null ? ord(x.rank) : '–';
        return `<span class="ddside ${cls}" title="${esc(c)} ${words}: ${rk}"><span class="ddsn">${esc(c)}</span> <b class="ddrk">${rk}</b></span>`; };
      return `<div class="ddrow" data-dd="${key}" data-dd-off="${esc(off)}" data-dd-def="${esc(def)}"><span class="ddunit">${label}</span> <span class="ddrks">${one('ddoff', off, mine, u, eo, lead === 'o')}<span class="ddsep" aria-hidden="true"> · </span>${one('dddef', def, theirs, v, ed, lead === 'd')}</span> <span class="ddend"><span class="dddu">${dpos}</span> <span class="dtag ${t.cls}"${why}>${t.tag}</span></span></div>`;
    }).join('');
    return { html: `<div class="dd" data-dd-pos="${esc(off)}-${esc(def)}">${html}</div>`, rows };
  }

  /* the Overall line's tag: this offense's Overall Offense against the defense's Overall Defense as
     points (meta.tags.headline), from the units the card shows ({raw}); null with no constants or no raw */
  function headTag(meta, offUnit, defUnit) {
    const H = meta && meta.tags && meta.tags.headline;
    if (!H || !offUnit || !defUnit || !isFinite(offUnit.raw) || !isFinite(defUnit.raw)) return null;
    const pts = H.slope * (offUnit.raw - defUnit.raw), [cls, tag] = tagOf(pts, H.fav, H.easy);
    return { cls, tag, pts, text: `${(pts >= 0 ? '+' : '−') + Math.abs(pts).toFixed(1)} pts`,
      title: `Overall Offense minus Overall Defense on the raw scale, about ${(pts >= 0 ? '+' : '−') + Math.abs(pts).toFixed(1)} points a game to this offense at ${H.slope} points a unit (fitted on ${H.fit || '2012-2017'}): Favorable from about ${(+H.fav).toFixed(1)}, Easy from about ${(+H.easy).toFixed(1)}` };
  }

  /* what the rows rest on: the title of the snapshot's "Position matchups" label (escaped text, no markup);
     elo true where the rows show Elo figures, which it then says */
  function basis(D, a, h, elo) {
    if (!D) return '';
    const U = D.units || {}, g = n => `${n} game${n === 1 ? '' : 's'}`, ua = U[club(a)], uh = U[club(h)];
    const games = [[a, ua], [h, uh]].filter(([, u]) => u && u.g26 != null).map(([t, u]) => `${esc(t)} ${g(u.g26)}`).join(', ');
    const TR = D.meta && D.meta.tags && D.meta.tags.rows, fw = v => String(+(+v).toFixed(2));
    const weighed = TR && TR.weights ? `, weighted by how much that matchup alone has predicted an offense's points (quarterback ${fw(TR.weights.qb)}, receivers ${fw(TR.weights.rec)}, line ${fw(TR.weights.ol)}, run game ${fw(TR.weights.rb)})` : '';
    const figs = elo ? "The figures are each side's Elo as the ELO Ratings tab shows it: the quarterback's own season Elo against Pass Defense, Pass Protection against Pass Rush, Run Offense against Run Defense, Pass Offense against Pass Defense, the higher marked; a side with no Elo shows its rank. " : '';
    return `${elo ? figs + 'The tags rest on league ranks' : 'League ranks'} from team stats, ${esc(D.basis || '')}${games ? `, plus this season's ${games}` : ''}. Each row rates the offense's unit and the defense's unit it plays on the same numbers; the tag is the offense's edge, its rating minus the defense's in league standard deviations${weighed}: Easy is ${TR ? TR.easy : 1.5} or more, Favorable ${TR ? TR.fav : 0.5} or more, Even within ${TR ? TR.fav : 0.5}, Tough and Very tough the same the other way. Each row is that matchup alone; the rows overlap, so they are not to be added up.${D.lineups ? ` ${esc(D.lineups)}.` : ''}`;
  }

  const API = { club, tagOf, ROWS, ELO, starterQb, eloSides, applies, rowTag, possession, headTag, basis, esc, ord };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.gsDeepDive = API;
})(typeof window !== 'undefined' ? window : this);
