/* The Deep Dive's headline and tags, held to the rules on their own: the smoke test runs these on the page
   it renders and on every game of the slate, and tools/cases.js on made-up teams, with the versions a
   review would catch fed in, which must fail. Nothing here is shared with tools/context.js or js/app.js:
   the constants below are this file's own copy, and the file's UNITS26_META.tags are held to them.

     rows      each row's tag is the edge (this unit's rating minus the one it faces, league SDs) times
               the row's weight, at 0.5 (Favorable) and 1.5 (Easy), Tough and Very tough the same the
               other way. The weight is the row's points per SD of edge fitted alone on 2012-2017 over the
               quarterback row's 1.929; the pass rush row takes the line's weight, coverage the receivers'.
     headline  this team's Overall Offense against the opponent's Overall Defense (elo/data/model.json
               `units`, as the ELO Ratings tab shows them), tagged by points = 11.9126 x (off.raw - def.raw)
               at 0.9645 and 2.8935 points, those points shown beside it and in the tag's title, signed,
               to a tenth; none when the file has no Overall ratings of the season.
   The constants are elo/tools/deepdive_vs_units.py's (it prints them and says whether context.js
   carries them).                                                                                    */
'use strict';

const EXPECT = {
  rows: { weights: { qb: 1, ol: 0.5956, rb: 0.3792, rec: 0.8925, front: 0.5956, db: 0.8925 }, fav: 0.5, easy: 1.5 },
  headline: { slope: 11.9126, fav: 0.9645, easy: 2.8935 },
};
const LV = ['Very tough', 'Tough', 'Even', 'Favorable', 'Easy'];
const tagOf = (x, fav, easy) => x >= easy ? 'Easy' : x >= fav ? 'Favorable' : x > -fav ? 'Even' : x > -easy ? 'Tough' : 'Very tough';
const ord = v => v + ((x => ['th', 'st', 'nd', 'rd'][(x - 20) % 10] || ['th', 'st', 'nd', 'rd'][x] || 'th')(v % 100));
const AB = { LA: 'LAR', WSH: 'WAS', JAC: 'JAX', OAK: 'LV', SD: 'LAC', STL: 'LAR' };
const club = t => AB[t] || t;

/* the six rows in the page's order: [this team's unit, the opponent's unit it faces] */
const ROWS = [['qb', 'passD'], ['ol', 'front'], ['rb', 'runD'], ['rec', 'db'], ['front', 'ol'], ['db', 'rec']];
const faced = (O, k) => (k === 'passD' || k === 'runD') ? O.vs[k] : O[k];
function rowTags(A, O) {
  const R = EXPECT.rows;
  return ROWS.map(([u, k]) => tagOf(R.weights[u] * (A[u].z - faced(O, k).z), R.fav, R.easy));
}
/* the old rule, kept to prove the checks fail it */
const unweightedTags = (A, O) => ROWS.map(([u, k]) => tagOf(A[u].z - faced(O, k).z, 0.5, 1.5));

function headlineWant(A, O, META) {
  const src = META && META.overall;
  if (!src || src.missing || !A.overall || !O.overall) return null;
  const off = A.overall.off, def = O.overall.def, H = EXPECT.headline, pts = H.slope * (off.raw - def.raw);
  return { tag: tagOf(pts, H.fav, H.easy), pts, off, def };
}

/* the Deep Dive's html as the page writes it (deepDive()): the headline (anything before the first row) and each row's tag */
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
function parse(html) {
  const parts = String(html || '').split('class="ddrow"'), pre = parts[0];
  const tagIn = s => { const m = /class="dtag [a-z]+"[^>]*>([^<]*)</.exec(s); return m ? m[1] : null; };
  const hi = pre.indexOf('class="ddhead"');
  let head = null;
  if (hi >= 0) {
    const seg = pre.slice(hi), vs = /class="ddhvs">([\s\S]*?)<span class="ddedge"/.exec(seg);
    const edge = /<span class="ddedge">([^<]*)</.exec(seg), title = /class="dtag [a-z]+" title="([^"]*)"/.exec(seg);
    head = { tag: tagIn(seg), text: vs ? strip(vs[1]) : '', edge: edge ? edge[1].trim() : null, title: title ? title[1] : null };
  }
  return { head, rows: parts.slice(1).map(tagIn), preHasVsB: /class="ddvs"[\s\S]*?<b>/.test(pre) };
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

/* one team's Deep Dive against the rules: its rows' weighted tags and its headline, from the data it was drawn from */
function checkDive(html, ab, opp, A, O, META) {
  const P = parse(html), f = [];
  const want = rowTags(A, O);
  if (P.rows.length !== 6) f.push(`${ab}: ${P.rows.length} rows`);
  else if (P.rows.join('|') !== want.join('|')) f.push(`${ab} rows: ${P.rows.join(',')} (want the weighted ${want.join(',')})`);
  if (P.preHasVsB) f.push(`${ab}: a .ddvs b before the first row`);
  const H = headlineWant(A, O, META);
  if (!H) { if (P.head) f.push(`${ab}: a headline with no Overall ratings of the season in the file (${(META && META.overall && META.overall.missing) || 'none for these teams'})`); }
  else if (!P.head) f.push(`${ab}: no headline though the file has ${ab}'s Overall Offense and ${opp}'s Overall Defense`);
  else {
    const text = `Overall Offense ${ord(H.off.rank)} (${H.off.elo}) vs ${opp} Overall Defense ${ord(H.def.rank)} (${H.def.elo})`;
    if (P.head.text !== text) f.push(`${ab} headline "${P.head.text}" (want "${text}")`);
    if (P.head.tag !== H.tag) f.push(`${ab} headline tag ${P.head.tag} (want ${H.tag}, ${H.pts.toFixed(2)} points)`);
    /* the points shown beside it and in the tag's title: the gap read as points, to a tenth, signed */
    const sp = (H.pts >= 0 ? '+' : '\u2212') + Math.abs(H.pts).toFixed(1);
    if (P.head.edge !== `about ${sp} pts`) f.push(`${ab} headline points "${P.head.edge}" (want "about ${sp} pts")`);
    if (!P.head.title || !P.head.title.includes(`about ${sp} points`)) f.push(`${ab} headline tag's title "${P.head.title}" does not give about ${sp} points`);
  }
  return f;
}

/* every team's Overall Offense and Defense against ../elo/data/model.json: exact on the build it names, of the
   season or absent, and a run behind (the elo job rebuilds daily) still that board's order */
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

module.exports = { EXPECT, LV, tagOf, rowTags, unweightedTags, headlineWant, parse, checkMeta, checkDive, checkOverall, ord };
