/* The Deep Dive's tags and the Overall line's tag, held to the rules on their own: the smoke test runs these
   on every game of the units' week as nflbets/build/deepdive.js draws it for X NFL Bets and Stats' Game
   snapshot, and tools/cases.js on made-up teams, with the versions a review would catch fed in, which must
   fail. Nothing here is shared with tools/context.js or deepdive.js: the constants below are this file's own
   copy, and the file's meta.tags (UNITS26_META.tags, units.json's meta) are held to them.

     rows      each row's tag is the edge (the offense unit's rating minus the defense unit it faces, league
               SDs) times the row's weight, at 0.5 (Favorable) and 1.5 (Easy), Tough and Very tough the
               same the other way. The weight is the row's points per SD of edge fitted alone on 2012-2017
               over the quarterback row's 1.929; the pass rush row takes the line's weight, coverage the
               receivers'. The snapshot draws one possession's four rows (quarterback, line, run game,
               receivers), the pass rush and the coverage as the defense's side of the line's and the
               receivers' rows: rowTags()'s first four.
     headline  the Overall line's tag: this team's Overall Offense against the opponent's Overall Defense
               (elo/data/model.json `units`, as the ELO Ratings tab and the snapshot show them), tagged by
               points = 11.9126 x (off.raw - def.raw) at 0.9645 and 2.8935 points, those points shown
               beside it ("-0.9 pts") and in the tag's title ("about -0.9 points"), signed, to a tenth;
               none when either side has no rating.
   The constants are elo/tools/deepdive_vs_units.py's (it prints them and says whether context.js
   carries them).                                                                                    */
'use strict';

const EXPECT = {
  rows: { weights: { qb: 1, ol: 0.5956, rb: 0.3792, rec: 0.8925, front: 0.5956, db: 0.8925 }, fav: 0.5, easy: 1.5 },
  headline: { slope: 11.9126, fav: 0.9645, easy: 2.8935 },
};
const tagOf = (x, fav, easy) => x >= easy ? 'Easy' : x >= fav ? 'Favorable' : x > -fav ? 'Even' : x > -easy ? 'Tough' : 'Very tough';
const ord = v => v + ((x => ['th', 'st', 'nd', 'rd'][(x - 20) % 10] || ['th', 'st', 'nd', 'rd'][x] || 'th')(v % 100));
/* a signed figure to a tenth, the minus a true minus sign, as the snapshot shows an edge or points */
const signed = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);

/* the six matchups: [this team's unit, the opponent's unit it faces]; the first four are one possession's rows */
const ROWS = [['qb', 'passD'], ['ol', 'front'], ['rb', 'runD'], ['rec', 'db'], ['front', 'ol'], ['db', 'rec']];
const KEYS = ['qb', 'ol', 'rb', 'rec'];
const faced = (O, k) => (k === 'passD' || k === 'runD') ? O.vs[k] : O[k];
function rowTags(A, O) {
  const R = EXPECT.rows;
  return ROWS.map(([u, k]) => tagOf(R.weights[u] * (A[u].z - faced(O, k).z), R.fav, R.easy));
}
/* the old rule, kept to prove the checks fail it */
const unweightedTags = (A, O) => ROWS.map(([u, k]) => tagOf(A[u].z - faced(O, k).z, 0.5, 1.5));

/* the Overall line's tag, from model.json's units ({ raw }): { tag, pts }, or null with no rating to read */
function headlineWant(off, def) {
  if (!off || !def || !isFinite(off.raw) || !isFinite(def.raw)) return null;
  const H = EXPECT.headline, pts = H.slope * (off.raw - def.raw);
  return { tag: tagOf(pts, H.fav, H.easy), pts };
}

/* one possession's html as deepdive.js possession() writes it: the block's teams (data-dd-pos) and each
   row's key, its tags, the edge in its top line, and its two sides in the order drawn (ddoff, dddef), each
   with the label and the rank its heading shows; ranks are the two sides' ranks in that order */
function parse(html) {
  const parts = String(html || '').split('class="ddrow"'), pre = parts[0];
  const pos = /data-dd-pos="([^"]*)"/.exec(pre);
  const rows = parts.slice(1).map(seg => {
    const key = /^\s*data-dd="([^"]*)"/.exec(seg), tags = [...seg.matchAll(/class="dtag [a-z]+"[^>]*>([^<]*)</g)].map(m => m[1]);
    const top = /class="ddtop">([\s\S]*?)<div class="ddsides">/.exec(seg), edge = top && /class="ddedge">([^<]*)</.exec(top[1]);
    const sides = seg.split('class="ddside ').slice(1).map(x => {
      const lab = /^[a-z]+"><div class="ddsl"><span class="ddsn">([^<]*)<\/span>/.exec(x), rk = [...x.matchAll(/<b class="ddrk">([^<]*)<\/b>/g)];
      return { side: (/^([a-z]+)"/.exec(x) || [])[1] || null, label: lab ? lab[1] : null, ranks: rk.map(m => m[1]) };
    });
    return { key: key ? key[1] : null, tags, tag: tags.length ? tags[0] : null, sides,
      ranks: sides.map(x => x.ranks.length === 1 ? x.ranks[0] : `${x.ranks.length} ranks`), edge: edge ? edge[1].trim() : null,
      edges: (seg.match(/class="ddedge"/g) || []).length };
  });
  return { pos: pos ? pos[1] : null, rows, tags: rows.map(r => r.tag), preHasRank: /class="ddrk"|class="ddedge"/.test(pre) };
}

/* the tag constants the file carries, against this file's own */
function checkMeta(META) {
  const T = META && META.tags, f = [];
  if (!T || !T.rows || !T.headline) return ['UNITS26_META.tags missing (rebuild with node tools/context.js)'];
  for (const [k, v] of Object.entries(EXPECT.rows.weights)) if (!T.rows.weights || T.rows.weights[k] !== v) f.push(`row weight ${k} ${T.rows.weights && T.rows.weights[k]} (want ${v})`);
  if (T.rows.weights && Object.keys(T.rows.weights).length !== 6) f.push(`row weights for ${Object.keys(T.rows.weights).join(',')}`);
  for (const k of ['fav', 'easy']) if (T.rows[k] !== EXPECT.rows[k]) f.push(`row ${k} ${T.rows[k]} (want ${EXPECT.rows[k]})`);
  for (const k of ['slope', 'fav', 'easy']) if (T.headline[k] !== EXPECT.headline[k]) f.push(`headline ${k} ${T.headline[k]} (want ${EXPECT.headline[k]})`);
  return f;
}

/* one possession as drawn (off with the ball against def; A and O their units) against the rules, from the
   data it was drawn from: its four rows in order, each with one tag, the weighted edge's, its two sides
   the offense's then the defense's, each headed by its own club and its rank the file's, and the edge in
   the row's top line the file's */
const ESC = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function checkPossession(html, off, def, A, O) {
  const P = parse(html), f = [], at = `${off} v ${def}`;
  if (P.pos !== `${off}-${def}`) f.push(`${at}: the block is for ${P.pos} (want ${off}-${def})`);
  if (P.preHasRank) f.push(`${at}: a rank or an edge before the first row`);
  if (P.rows.map(r => r.key).join('|') !== KEYS.join('|')) return [...f, `${at}: rows ${P.rows.map(r => r.key).join(',') || 'none'} (want ${KEYS.join(',')})`];
  const multi = P.rows.filter(r => r.tags.length !== 1).map(r => `${r.key} ${r.tags.length}`);
  if (multi.length) f.push(`${at}: rows with other than one tag: ${multi.join(', ')}`);
  const want = rowTags(A, O).slice(0, 4);
  if (P.tags.join('|') !== want.join('|')) f.push(`${at} rows: ${P.tags.join(',')} (want the weighted ${want.join(',')})`);
  KEYS.forEach((u, i) => {
    const mine = A[u], theirs = faced(O, ROWS[i][1]), r = P.rows[i];
    const ranks = [mine, theirs].map(x => x && x.rank != null ? ord(x.rank) : '–');
    if (r.sides.map(x => x.side).join('|') !== 'ddoff|dddef') f.push(`${at} ${u}: sides ${r.sides.map(x => x.side).join(',') || 'none'} (want the offense's, then the defense's)`);
    else if (!r.sides.every((x, j) => x.label && x.label.startsWith(ESC([off, def][j]) + ' '))) f.push(`${at} ${u}: sides headed '${r.sides.map(x => x.label).join("' | '")}' (want ${off}'s, then ${def}'s)`);
    if (r.ranks.join('|') !== ranks.join('|')) f.push(`${at} ${u}: ranks ${r.ranks.join(' vs ')} (want ${ranks.join(' vs ')})`);
    const edge = mine && theirs && isFinite(mine.z) && isFinite(theirs.z) ? `edge ${signed(mine.z - theirs.z)}` : null;
    if (r.edge !== edge || r.edges > (edge ? 1 : 0)) f.push(`${at} ${u}: "${r.edge}"${r.edges > 1 ? ` and ${r.edges - 1} more` : ''} (want ${edge ? `"${edge}"` : 'no edge'})`);
  });
  return f;
}

/* the Overall line's tag (deepdive.js headTag(): { tag, pts, text, title }, or null) against the rule, on
   model.json's units for this offense and the defense it faces */
function checkHead(tag, offUnit, defUnit, META, at = 'headline') {
  const W = headlineWant(offUnit, defUnit);
  if (!W) return tag ? [`${at}: tagged ${tag.tag} with no Overall rating on one side to read it from`] : [];
  if (!tag) return [`${at}: no tag though model.json rates both sides (want ${W.tag}, ${signed(W.pts)} points)${META && META.tags && META.tags.headline ? '' : '; the file carries no meta.tags.headline'}`];
  const f = [], sp = signed(W.pts);
  if (tag.tag !== W.tag) f.push(`${at} tag ${tag.tag} (want ${W.tag}, ${W.pts.toFixed(2)} points)`);
  if (!isFinite(tag.pts) || Math.abs(tag.pts - W.pts) > 1e-6) f.push(`${at} points ${tag.pts} (want ${W.pts})`);
  /* the points shown beside it and in the tag's title: the gap read as points, to a tenth, signed */
  if (tag.text !== `${sp} pts`) f.push(`${at} points shown "${tag.text}" (want "${sp} pts")`);
  if (!tag.title || !tag.title.includes(`about ${sp} points`)) f.push(`${at} tag's title "${tag.title}" does not give about ${sp} points`);
  return f;
}

/* every team's Overall Offense and Defense against ../elo/data/model.json: exact on the build it names, of the
   season or absent, and a run behind (the elo job rebuilds daily) still that board's order */
const AB = { LA: 'LAR', WSH: 'WAS', JAC: 'JAX', OAK: 'LV', SD: 'LAC', STL: 'LAR' };
const club = t => AB[t] || t;
function checkOverall(U, META, M, season) {
  const src = (META && META.overall) || null, teams = Object.keys(U || {}), f = [];
  const has = teams.filter(t => U[t].overall);
  if (!M) return { mode: 'no model.json', fails: has.length ? [`${has.length} clubs carry Overall ratings with no ../elo/data/model.json to hold them to`] : [] };
  const u = M.units;
  if (!u || !u.off || !u.def || +u.season !== season) {
    if (has.length || !src || !src.missing) f.push(`model.json's Overall ratings are ${u ? 'of ' + u.season : 'missing'}, not ${season}, yet ${has.length} clubs carry them${src && src.missing ? '' : ' and META.overall says none is missing'}`);
    return { mode: 'not of the season', fails: f };
  }
  if (!src || src.missing) return { mode: 'missing', fails: [`model.json has ${season}'s Overall ratings (built ${M.built_at}) but units2026.js has none${src && src.missing ? ` (${src.missing})` : ''}: rebuild with node tools/context.js`] };
  const want = s => { const W = {}; for (const [t, v] of Object.entries(u[s])) W[club(t)] = { elo: v.elo, rank: v.rank, raw: v.raw, games: v.games ?? null, ...('carried' in v ? { carried: v.carried } : {}) }; return W; };
  const W = { off: want('off'), def: want('def') };
  if (src.built_at === M.built_at) {
    if (+src.season !== season) f.push(`META.overall.season ${src.season}`);
    for (const s of ['off', 'def']) {
      if (Object.keys(W[s]).length !== 32) f.push(`model.json has ${Object.keys(W[s]).length} clubs' ${s}`);
      for (const t of teams) {
        const got = U[t].overall && U[t].overall[s];
        if (JSON.stringify(got || null) !== JSON.stringify(W[s][t] || null)) f.push(`${t} ${s} ${JSON.stringify(got || null)} vs model.json ${JSON.stringify(W[s][t] || null)}`);
      }
    }
    return { mode: 'same build', fails: f };
  }
  for (const s of ['off', 'def']) {
    const T = Object.keys(W[s]).filter(t => U[t] && U[t].overall), n = T.length;
    if (n < 32) { f.push(`only ${n} clubs carry Overall ${s} (rebuild with node tools/context.js)`); continue; }
    const d2 = T.reduce((a, t) => a + (U[t].overall[s].rank - W[s][t].rank) ** 2, 0), rho = 1 - 6 * d2 / (n * (n * n - 1));
    if (rho < 0.9) f.push(`Overall ${s} rank correlation ${rho.toFixed(3)} with model.json built ${M.built_at} (units2026.js has ${src.built_at})`);
  }
  return { mode: 'a run behind', fails: f };
}

module.exports = { EXPECT, tagOf, rowTags, unweightedTags, headlineWant, parse, checkMeta, checkPossession, checkHead, checkOverall, ord, signed };
