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
     figures   each row's two sides show Elo against Elo (the owner's call, 16 October 2026): the
               offense's starting quarterback's own season Elo against the defense's Pass Defense, Pass
               Protection against Pass Rush, Run Offense against Run Defense, Pass Offense against Pass
               Defense, each the number elo/data/model.json's units (or players.json) has, the higher of
               two marked; a side with no Elo (a model.json without the table, a quarterback unranked or
               with no lineup for the game) shows its rank from units.json, as every side did before.
               eloWant() is this file's own reading of the Elo files; the tag stays the rows' rule above.
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

/* the Elo figures each row's two sides should show, read here on their own from the Elo files (M
   model.json, PL players.json, MU matchups.json; any may be null) for the offense off with the ball
   against def in the game gameId: { qb|ol|rb|rec: [offense, defense] }, each { elo, rank, of } or null
   where that side shows its rank instead. A table counts only where model.json's units.tables names it
   and the club has a finite elo; the quarterback is the first of the offense's expected lineup for this
   very game whom players.json has at QB, and only where he is ranked with a season Elo (se) */
const ELO_TABLES = { qb: ['QB', 'pass_def'], ol: ['pass_pro', 'pass_rush'], rb: ['run_off', 'run_def'], rec: ['pass_off', 'pass_def'] };
function eloWant(M, PL, MU, gameId, off, def) {
  const U = M && M.units, T = U && U.tables || {};
  const team = (k, t) => { const tab = T[k] ? U[k] : null, v = tab && tab[t];
    return v && typeof v.elo === 'number' && isFinite(v.elo) ? { elo: v.elo, rank: v.rank, of: Object.keys(tab).length } : null; };
  const qb = () => { const lu = MU && MU.lineups && MU.lineups[off], P = PL && PL.players || {};
    if (!lu || lu.game_id !== gameId) return null;
    for (const pid of lu.players || []) { const e = P[pid]; if (!e || e.group !== 'QB') continue;
      return e.rank != null && typeof e.se === 'number' && isFinite(e.se) ? { elo: e.se, rank: e.rank, of: PL.groups && PL.groups.QB ? PL.groups.QB.active : null } : null; }
    return null; };
  const W = {};
  for (const [k, [o, d]] of Object.entries(ELO_TABLES)) W[k] = [o === 'QB' ? qb() : team(o, off), team(d, def)];
  return W;
}

/* one possession's html as deepdive.js possession() writes it: the block's teams (data-dd-pos) and each
   row's key, its tags, the edge its tag's title gives, and its two sides in the order drawn (ddoff,
   dddef), each with the club, its title and the figures it shows (figs: { cls, v }, a rank b.ddrk or an
   Elo b.ddelo); ranks are the two sides' single figures in that order; text is what the row shows, its
   markup and titles taken off (its unit, the two clubs and figures, the defense's position and its tag:
   since 14 October 2026 a row names nobody and shows no other number, since 16 October 2026 it names the
   defense's position it faces and shows Elo); dpos is each .dddu the row draws */
function parse(html) {
  const parts = String(html || '').split('class="ddrow"'), pre = parts[0];
  const pos = /data-dd-pos="([^"]*)"/.exec(pre);
  const rows = parts.slice(1).map(seg => {
    const key = /^\s*data-dd="([^"]*)"/.exec(seg), tags = [...seg.matchAll(/class="dtag [a-z]+"[^>]*>([^<]*)</g)].map(m => m[1]);
    const edges = [...seg.matchAll(/title="Edge ([^:"]*):/g)].map(m => m[1].trim());
    const sides = seg.split('class="ddside ').slice(1).map(x => {
      const lab = /^[a-z]+"[^>]*><span class="ddsn">([^<]*)<\/span>/.exec(x), own = x.split(/class="ddside |class="dtag /)[0];
      const figs = [...own.matchAll(/<b class="(dd(?:rk|elo)[^"]*)">([^<]*)<\/b>/g)].map(m => ({ cls: m[1], v: m[2] }));
      return { side: (/^([a-z]+)"/.exec(x) || [])[1] || null, label: lab ? lab[1] : null, title: (/^[a-z]+" title="([^"]*)"/.exec(x) || [])[1] || null,
        figs, ranks: figs.map(f => f.v), better: (own.match(/gs-better/g) || []).length };
    });
    const text = seg.replace(/<div\s*$/, '').replace(/^[^>]*>/, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const dpos = [...seg.matchAll(/<span class="dddu">([^<]*)<\/span>/g)].map(m => m[1]);
    return { key: key ? key[1] : null, tags, tag: tags.length ? tags[0] : null, sides, text, dpos,
      ranks: sides.map(x => x.ranks.length === 1 ? x.ranks[0] : `${x.ranks.length} ranks`), edge: edges.length ? 'edge ' + edges[0] : null,
      edges: edges.length };
  });
  return { pos: pos ? pos[1] : null, rows, tags: rows.map(r => r.tag), preHasRank: /class="ddrk"|title="Edge /.test(pre) };
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
   the offense's then the defense's, each its own club and its rank the file's, the edge in the tag's
   title the file's, the defense's position it faces named once, after the defense's side (the owner's
   call, 16 October 2026: "for offense vs defense section, please put opposing positions for the defense"),
   and nothing else drawn: the row's text is its unit, the two clubs and figures, the defense's position and
   its tag, so no name, no one out and no other number (the owner's call, 14 October 2026). W is eloWant()
   for this possession (or null, every side a rank): a side W has shows exactly its Elo (b.ddelo), its
   title giving that Elo and its rank, the higher of two Elo marked gs-better and nothing else marked; a
   side W has not shows its rank from the file (b.ddrk), as before. DPOS is this file's own copy of the
   positions, never deepdive.js's */
const UNIT = { qb: 'Quarterback', ol: 'Offensive line', rb: 'Running backs', rec: 'Receivers' };
const DPOS = { qb: 'Pass defense', ol: 'Pass rush', rb: 'Run defense', rec: 'Coverage' };
const ESC = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function checkPossession(html, off, def, A, O, W) {
  const P = parse(html), f = [], at = `${off} v ${def}`;
  if (P.pos !== `${off}-${def}`) f.push(`${at}: the block is for ${P.pos} (want ${off}-${def})`);
  if (P.preHasRank) f.push(`${at}: a rank or an edge before the first row`);
  if (P.rows.map(r => r.key).join('|') !== KEYS.join('|')) return [...f, `${at}: rows ${P.rows.map(r => r.key).join(',') || 'none'} (want ${KEYS.join(',')})`];
  const multi = P.rows.filter(r => r.tags.length !== 1).map(r => `${r.key} ${r.tags.length}`);
  if (multi.length) f.push(`${at}: rows with other than one tag: ${multi.join(', ')}`);
  const want = rowTags(A, O).slice(0, 4);
  if (P.tags.join('|') !== want.join('|')) f.push(`${at} rows: ${P.tags.join(',')} (want the weighted ${want.join(',')})`);
  KEYS.forEach((u, i) => {
    const mine = A[u], theirs = faced(O, ROWS[i][1]), r = P.rows[i], E = (W && W[u]) || [null, null];
    /* each side's figure: its Elo where W has one, else its rank from the file */
    const ranks = [mine, theirs].map((x, j) => E[j] ? String(E[j].elo) : x && x.rank != null ? ord(x.rank) : '–');
    const kinds = E.map(e => e ? 'ddelo' : 'ddrk');
    const lead = E[0] && E[1] && E[0].elo !== E[1].elo ? (E[0].elo > E[1].elo ? 0 : 1) : -1;
    r.sides.forEach((x, j) => {
      if (j > 1) return;
      const nm = ['offense', 'defense'][j];
      if (x.figs.length === 1 && x.figs[0].cls.split(' ')[0] !== kinds[j]) f.push(`${at} ${u}: the ${nm}'s side shows ${x.figs[0].cls.split(' ')[0] === 'ddelo' ? 'an Elo' : 'a rank'}, ${x.figs[0].v} (want ${E[j] ? `its Elo, ${E[j].elo}` : `its rank, ${ranks[j]}: model.json has no Elo for it`})`);
      const marked = x.figs.some(g => / gs-better\b/.test(g.cls)) || x.better > 0;
      if (marked !== (lead === j)) f.push(`${at} ${u}: the ${nm}'s side is ${marked ? '' : 'not '}marked better (want the mark on ${lead < 0 ? 'neither: not two different Elo' : `the ${['offense', 'defense'][lead]}'s, the higher Elo`})`);
      if (E[j] && x.figs.length === 1 && x.figs[0].cls.split(' ')[0] === 'ddelo') {
        const t = x.title || '', rk = E[j].rank != null ? `${ord(E[j].rank)}${E[j].of ? ` of ${E[j].of}` : ''}` : null;
        if (!t.includes(`: Elo ${E[j].elo}`) || (rk && !t.includes(`, ${rk}`))) f.push(`${at} ${u}: the ${nm}'s side is titled '${t}' (want its Elo ${E[j].elo}${rk ? ` and its rank, ${rk}` : ''})`);
      }
    });
    if (r.sides.map(x => x.side).join('|') !== 'ddoff|dddef') f.push(`${at} ${u}: sides ${r.sides.map(x => x.side).join(',') || 'none'} (want the offense's, then the defense's)`);
    else if (!r.sides.every((x, j) => x.label === ESC([off, def][j]))) f.push(`${at} ${u}: sides headed '${r.sides.map(x => x.label).join("' | '")}' (want ${off}'s, then ${def}'s)`);
    if (r.ranks.join('|') !== ranks.join('|')) f.push(`${at} ${u}: ${E[0] || E[1] ? 'figures' : 'ranks'} ${r.ranks.join(' vs ')} (want ${ranks.join(' vs ')})`);
    if (r.dpos.join('|') !== DPOS[u]) f.push(`${at} ${u}: the defense's position reads '${r.dpos.join("' | '") || 'nothing'}' (want '${DPOS[u]}', once)`);
    const text = `${UNIT[u]} ${ESC(off)} ${ranks[0]} · ${ESC(def)} ${ranks[1]} ${DPOS[u]} ${r.tag}`;
    if (r.text !== text) f.push(`${at} ${u}: the row reads '${r.text}' (want '${text}' and nothing else: no name, no one out, no other number)`);
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

module.exports = { EXPECT, tagOf, rowTags, unweightedTags, headlineWant, eloWant, ELO_TABLES, parse, checkMeta, checkPossession, checkHead, checkOverall, ord, signed };
