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

   A row is drawn as the unit and its tag (the edge small beside it) on one line, then two equal
   columns, the offense's side and the defense's, each headed by its own label and rank ("SEA pass
   protection · 15th" | "DEN pass rush · 2nd") with its names, who is out and its numbers under it;
   the quarterback's and the run game's defense side is the pass or run defense's rank alone (it is
   rated as a defense, with no single unit's names). The owner's ask of 14 October 2026: the two
   sides of a meeting the same size, side by side.

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
     the label, the offense's words, the defense's words] */
  const ROWS = [
    ['qb', 'passD', 'Quarterback', 'passing offense', 'pass defense'],
    ['ol', 'front', 'Offensive line', 'pass protection', 'pass rush'],
    ['rb', 'runD', 'Running backs', 'run game', 'run defense'],
    ['rec', 'db', 'Receivers', 'receivers', 'coverage'],
  ];
  /* the defense's side of a row: a unit of its own (pass rush, coverage) or its rating against the
     pass or the run (no names of its own) */
  const faced = (O, k) => (k === 'passD' || k === 'runD') ? (O.vs && O.vs[k]) || null : O[k] || null;

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

  /* who plays, who does not, a quarterback in doubt and the numbers, for one side of a row */
  const NEXT_FROM = { chart: 'next on the chart', roster: 'next on the roster', usage: 'next by this season\'s dropbacks' };
  function side(u, isQB) {
    if (!u) return '';
    const names = list => (list || []).map(p => `${esc(p.n)} (${esc(p.pos)}${p.q ? ', ' + esc(p.q) : ''})`).join(', ');
    const out = u.out || [];
    let bits = '';
    if (u.who && u.who.length) bits += `<div class="ddwho">${names(u.who)}</div>`;
    if (out.length) bits += isQB && u.who && u.who[0]
      ? `<div class="ddout">${esc(u.who[0].n)} starts; ${out.map(p => `${esc(p.n)} is ${esc(p.why)}`).join(', ')}.</div>`
      : `<div class="ddout">Not playing: ${out.map(p => `${esc(p.n)} (${esc(p.pos)}), ${esc(p.why)}`).join('; ')}.</div>`;
    if (isQB && u.who && u.who[0]) {
      if (u.next) bits += `<div class="ddout">${esc(u.who[0].n)} may not start (${esc(u.who[0].q || 'in doubt')}); ${NEXT_FROM[u.next.from] || 'next on the chart'}: ${esc(u.next.n)}${u.next.q ? ` (${esc(u.next.q)})` : ''}.</div>`;
      else if (u.next_none) bits += `<div class="ddout">${esc(u.who[0].n)} may not start (${esc(u.who[0].q || 'in doubt')}); ${esc(u.next_none)}.</div>`;
    }
    const nums = (u.stats || []).map(([label, v, r, unit]) => v == null ? '' : `${esc(v)}${esc(unit || '')} ${esc(label)} (${ord(r)})`).filter(Boolean).join(' · ');
    if (nums) bits += `<div class="ddnum">${nums}</div>`;
    if (u.note) bits += `<div class="ddnote">${esc(u.note)}</div>`;
    return bits;
  }

  /* one possession: this offense's four rows against the defense. Returns { html, rows } where rows
     are [{ key, tag, cls, edge }], or null when the file has no units for either club */
  function possession(D, off, def) {
    if (!D || !D.units) return null;
    const U = D.units[club(off)], O = D.units[club(def)];
    if (!U || !O) return null;
    const rows = [];
    const html = ROWS.map(([key, dk, label, mine, theirs]) => {
      const u = U[key], v = faced(O, dk), t = rowTag(D, off, def, key);
      rows.push({ key, tag: t.tag, cls: t.cls, edge: t.edge });
      const why = t.edge == null ? '' : ` title="Edge ${sd(t.edge)}: ${esc(off)}'s ${mine} rating minus ${esc(def)}'s ${theirs}, in league standard deviations. The tag weighs it by ${t.w} (${sd(t.w * t.edge)}), by how much this matchup alone has predicted points; the rows overlap, so they are not to be added up"`;
      /* each side's heading: the club, what it is rated as and its rank */
      const head = (club, words, x) => `<div class="ddsl"><span class="ddsn">${esc(club)} ${words}</span><span class="ddsep" aria-hidden="true"> · </span><b class="ddrk">${x && x.rank != null ? ord(x.rank) : '–'}</b></div>`;
      /* the defense's side has names and numbers of its own only where it is a unit (pass rush, coverage) */
      const theirSide = dk === 'front' || dk === 'db' ? side(O[dk], false) : '';
      return `<div class="ddrow" data-dd="${key}" data-dd-off="${esc(off)}" data-dd-def="${esc(def)}">
        <div class="ddtop"><span class="ddunit">${label}</span><span class="ddtg">${t.edge == null ? '' : `<span class="ddedge">edge ${sd(t.edge)}</span>`}<span class="dtag ${t.cls}"${why}>${t.tag}</span></span></div>
        <div class="ddsides"><div class="ddside ddoff">${head(off, mine, u)}${side(u, key === 'qb') || '<div class="ddnote">No names in the file.</div>'}</div><div class="ddside dddef">${head(def, theirs, v)}${theirSide}</div></div>
      </div>`;
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

  /* what the rows rest on: the title of the snapshot's "Position matchups" label (escaped text, no markup) */
  function basis(D, a, h) {
    if (!D) return '';
    const U = D.units || {}, g = n => `${n} game${n === 1 ? '' : 's'}`, ua = U[club(a)], uh = U[club(h)];
    const games = [[a, ua], [h, uh]].filter(([, u]) => u && u.g26 != null).map(([t, u]) => `${esc(t)} ${g(u.g26)}`).join(', ');
    const TR = D.meta && D.meta.tags && D.meta.tags.rows, fw = v => String(+(+v).toFixed(2));
    const weighed = TR && TR.weights ? `, weighted by how much that matchup alone has predicted an offense's points (quarterback ${fw(TR.weights.qb)}, receivers ${fw(TR.weights.rec)}, line ${fw(TR.weights.ol)}, run game ${fw(TR.weights.rb)})` : '';
    return `League ranks from team stats, ${esc(D.basis || '')}${games ? `, plus this season's ${games}` : ''}. Each row rates the offense's unit and the defense's unit it plays on the same numbers; the tag is the offense's edge, its rating minus the defense's in league standard deviations${weighed}: Easy is ${TR ? TR.easy : 1.5} or more, Favorable ${TR ? TR.fav : 0.5} or more, Even within ${TR ? TR.fav : 0.5}, Tough and Very tough the same the other way. Each row is that matchup alone; the rows overlap, so they are not to be added up.${D.lineups ? ` ${esc(D.lineups)}.` : ''}`;
  }

  const API = { club, tagOf, ROWS, applies, rowTag, possession, headTag, basis, esc, ord };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.gsDeepDive = API;
})(typeof window !== 'undefined' ? window : this);
