/* The ELO Ratings tab's own gate: nflbets/build/tab_elo.html run in jsdom on elo/data, with the
 * page around it stubbed (the schedule, the clock, the shields), so what the tab does with the
 * files is checked on the job's run, before anything is committed.
 *
 *   node elo/check_tab.js                  (from the hub root; jsdom is borrowed from props/build)
 *   node elo/check_tab.js --data DIR --tab FILE      (tests: another build's files or tab)
 *
 * Each check is the tab's behaviour on any week's files, never this week's names:
 *   - a game that has kicked off leaves the Mismatches (it was promoted as this week's edge
 *     for a game already played), and a player's window says so;
 *   - a Mismatches bubble wears the same season shield as the player's ranking and badge
 *     (it wore the raw career rating's, so one card disagreed with itself);
 *   - a player the build counts out (out last week and not practising, say) is ruled out on
 *     the page, with the build's reason in his window;
 *   - the rankings say how far the season has got as the build words it, a questionable
 *     player carries a Q, and the bar splits the ELO Model's record into calls made before
 *     kickoff and backtest;
 *   - every ranked player has a trend line, one game in too (week 1's column was blank);
 *   - a player kept out of the players map is priced by nothing, but the Prop Record still
 *     reads the rating he took into each week he played (it graded those weeks at 1500);
 *   - Overall Offense and Overall Defense are two pills in the position row, each opening a table
 *     of the 32 teams in the file's rank order, ratings never rising, each with a shield, every
 *     stat's value and league rank the file's; the text gives the file's weights (summing to 100,
 *     and a copy with other weights shows those, so the page cannot carry its own) and names the
 *     stats that weigh nothing; a column sorts best first and back, # keeping the overall rank; a
 *     team's window lists every stat, its line, and its coming opponent when the file calls one;
 *     Close and Escape shut it; and a model.json from before the stats still draws the old columns;
 *   - the team table scrolls sideways inside its card at a desktop width, not only on a phone: it, or
 *     a box between it and the card, has overflow-x auto by a rule outside any media query (fifteen
 *     columns ran past the card at 1280 px and the whole page scrolled), and the team column can
 *     stick in that box: nothing between them clips, as the page's own rule clips every table. The
 *     page's stylesheet (props/build/part1.html) goes round the tab for this. jsdom lays nothing
 *     out and reads only the rules a desktop screen gets, so this is the style, not a measured width.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const DATA = arg('--data') || path.join(ROOT, 'elo', 'data');
const TAB = fs.readFileSync(arg('--tab') || path.join(ROOT, 'nflbets', 'build', 'tab_elo.html'), 'utf8');
const { JSDOM } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const read = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const P = read('players.json'), M = read('model.json');
const MU0 = fs.existsSync(path.join(DATA, 'matchups.json')) ? read('matchups.json') : null;

const fails = []; let checks = 0; const notes = [];
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
const wait = ms => new Promise(r => setTimeout(r, ms));
/* the tab's own word on whether a game has kicked off (a tab without it says no game ever has) */
const on = (w, gid) => typeof w.eloGameOn === 'function' ? w.eloGameOn(gid) : false;
/* the page's stylesheet, round the tab as on the site: a page-wide rule counts (every table is
   clipped there, for its rounded corners) */
const P1 = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part1.html'), 'utf8');
const PAGE_CSS = P1.includes('<style>') ? P1.slice(P1.indexOf('<style>'), P1.indexOf('</style>') + 8) : '';
/* an element's overflow both ways (jsdom keeps the shorthand apart from the longhands) */
const ov = (w, el) => { const c = w.getComputedStyle(el), o = c.getPropertyValue('overflow').trim().split(/\s+/).filter(Boolean);
  return [c.getPropertyValue('overflow-x') || o[0] || 'visible', c.getPropertyValue('overflow-y') || o[1] || o[0] || 'visible']; };
/* the box the team table scrolls in at a desktop width: the table itself or one between it and its
   card (the card scrolling would take its heading and text with it) */
const scroller = (w, card) => { const t = card && card.querySelector('table.pe-tt');
  for (let el = t; el && el !== card; el = el.parentElement) if (/^(auto|scroll)$/.test(ov(w, el)[0])) return el;
  return null; };
/* the team column sticks in that box only when nothing between them is a box of its own: any
   overflow but visible makes one, and a clipped table never scrolls, so the column never moves */
const sticks = (w, card) => { const sc = scroller(w, card), td = card && card.querySelector('tbody td.pe-tm');
  if (!sc || !td || w.getComputedStyle(td).getPropertyValue('position') !== 'sticky') return false;
  for (let el = td.parentElement; el && el !== sc; el = el.parentElement) if (ov(w, el).some(v => !/^(visible|clip)$/.test(v))) return false;
  return true; };

/* the page around the tab: the week's schedule with kickoffs on a clock the test moves */
function page(MU, opts) {
  const style = TAB.slice(TAB.indexOf('<style>'), TAB.indexOf('</style>') + 8);
  const section = TAB.slice(TAB.indexOf('<section id="tab-elo"'), TAB.indexOf('</section>') + 10);
  const script = TAB.slice(TAB.indexOf('<script>') + 8, TAB.lastIndexOf('</script>'));
  const week = MU && MU.week != null ? MU.week : 1;
  const dom = new JSDOM(`<!doctype html><html><head>${PAGE_CSS}${style}</head><body>
    <section id="tab-slate"><div id="slateView"><div class="bar"></div></div><select id="weekSel"><option value="${week}" selected>${week}</option></select></section>
    ${section}</body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const games = [...new Set(Object.values((MU && MU.players) || {}).map(v => v.game_id))].sort();
  w.__clock = { now: 0 };
  w.eval(`var S={sched:${JSON.stringify(games.map((id, i) => ({ id, w: week, k: 1000 * (i + 1) })))},inactive:{},ui:{},parlay:{},saved:[],stake:10};
    function gameStarted(g){ return window.__clock.now>=g.k; }
    function renderSlate(){}
    window.pkTierBadge=e=>'<svg class="tierbadge" data-elo="'+e+'"></svg>';
    window.pkEloTier=e=>[e>=1700?'Elite':e>=1600?'Diamond':e>=1500?'Gold':'Silver','', '#999'];
    window.pkTag=t=>'<span class="pk-ttag">'+t+'</span>';
    window.pkTierDefs='<svg><defs><linearGradient id="tg-x"></linearGradient></defs></svg>';`);
  const files = { 'players.json': P, 'model.json': (opts && opts.M) || M, 'matchups.json': MU };
  w.fetch = u => { const f = Object.keys(files).find(k => String(u).includes('elo/data/' + k));
    return Promise.resolve(f && files[f] ? { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(files[f])) } : { ok: false, status: 404 }); };
  w.eval(script);
  return { w, d: w.document, games };
}

(async () => {
  /* ---- the rankings card and the bar ---- */
  { const { w, d } = page(MU0); await wait(60);
    const pill = txt(d.querySelector('#peBody .card h2 .pill'));
    const want = `${P.season} ${P.through ? P.through : 'through week ' + P.through_week}`;
    chk(pill === want, `the rankings pill says "${pill}", the build says "${want}"`);
    if (P.through_week) chk(!/through week/.test(pill) || new RegExp('through week ' + P.through_week + '\\b').test(pill), 'the pill claims a week the build has not finished');
    const rec = M.record || {};
    if (rec.published && rec.published[0] + rec.published[1] > 0)
      chk(new RegExp(`${rec.published[0]}–${rec.published[1]} called before kickoff`).test(txt(d.getElementById('peCallRec'))),
        'the bar does not give the ELO Model\'s record on calls made before kickoff: ' + txt(d.getElementById('peCallRec')));
    void w; }
  /* a questionable player stays ranked, with a Q (checked with the top quarterback made
     questionable in this copy of the file only) */
  { const had = P.groups.QB.top[0].q; P.groups.QB.top[0].q = 'questionable (ankle), week 9';
    const { d } = page(MU0); await wait(60);
    const row = d.querySelector('#peBody tbody tr'), q = row && row.querySelector('.pe-q');
    chk(!!q && txt(q) === 'Q' && /questionable/.test(q.title), 'a questionable player has no Q in the rankings');
    if (had === undefined) delete P.groups.QB.top[0].q; else P.groups.QB.top[0].q = had; }
  /* every ranked player has a trend line, one game in too (in week 1 the whole column was
     blank: a line needs two points, and the season's start is the first); checked with the
     top quarterback cut to his first game in this copy of the file only */
  { const top = P.groups.QB.top[0], had = top.this_season;
    top.this_season = had.slice(0, 1);
    const { d } = page(MU0); await wait(60);
    const rows = [...d.querySelectorAll('#peBody .card tbody tr.pe-plrow')];
    chk(rows.length > 0 && rows.every(tr => tr.querySelector('svg.pe-spark')), 'a ranked player has no trend line: ' + rows.filter(tr => !tr.querySelector('svg.pe-spark')).map(tr => txt(tr).slice(0, 30)).join('; '));
    top.this_season = had; }
  /* a player kept out of the players map (out, or gone from his club) keeps his season so far
     for the Prop Record: the weeks he played are graded on the rating he took into each, not
     at 1500; and he is still priced by nothing (no market + form, no Elo picks) */
  { const past = Object.entries(P.past || {}).find(([, v]) => (v.h || []).length);
    if (!past) notes.push('nobody kept out of the players map has a game this season: the past-ratings check is skipped');
    else { const [pid, v] = past, { w } = page(MU0); await wait(60);
      chk(w.eloOf(pid) === null, `${pid} is out but the page would price him`);
      chk(w.eloPre(pid, v.h[0][0]) === v.s0 && w.eloPre(pid, v.h[0][0] + 1) === v.h[0][1],
        `the Prop Record would not grade ${pid}'s past weeks on the rating he took into them: ${w.eloPre(pid, v.h[0][0] + 1)} for ${v.h[0][1]}`); } }

  /* ---- Mismatches: kicked-off games leave, and the bubbles wear the season shield ---- */
  if (!MU0 || !MU0.players || !Object.keys(MU0.players).length) notes.push('no projections in this week\'s file: the Mismatches checks are skipped');
  else {
    const { w, d, games } = page(MU0); await wait(60);
    const before = w.eloMismatches();
    if (!before.length) notes.push('no mismatches this week: the Mismatches checks are skipped');
    else {
      chk(before.every(v => !on(w, v.game_id)), 'before any kickoff, a game is taken as started');
      /* the bubbles: the season shield, the one the ranking and the badge wear, or none */
      w.renderSlate(); await wait(20);
      const bubbles = [...d.querySelectorAll('#peMism .pe-mm-b')];
      chk(bubbles.length === Math.min(5, before.length), 'the Mismatches card did not draw its bubbles');
      /* while clubs have not filed their game statuses, the card says the starters can change */
      const rep = Object.values(MU0.reports || {}).filter(r => r.week === +MU0.week);
      const unfiled = rep.filter(r => !r.statuses_filed).length;
      chk(!unfiled || new RegExp(`filed for ${rep.length - unfiled} of ${rep.length} clubs`).test(txt(d.getElementById('peMism'))),
        'the Mismatches card does not say the game statuses are not all filed');
      for (const b of bubbles) {
        const pid = b.dataset.mmPid, e = P.players[pid], sh = b.querySelector('.pe-mm-sh svg.tierbadge');
        const want = e && e.se != null ? String(e.se) : null;
        chk(want === null ? !sh : (!!sh && sh.getAttribute('data-elo') === want),
          `a Mismatches bubble wears ${sh ? sh.getAttribute('data-elo') : 'no shield'} for ${e ? e.name : pid}, whose season shield is ${want}`);
      }
      /* the earliest game with a mismatch kicks off */
      const g0 = before[0].game_id, k0 = (w.eval('S.sched').find(x => x.id === g0) || {}).k;
      w.__clock.now = k0;
      const after = w.eloMismatches();
      chk(on(w, g0) === true, 'the tab does not see the game has kicked off');
      chk(!after.some(v => v.game_id === g0), `a game that has kicked off (${g0}) is still on the Mismatches`);
      chk(after.length > 0 || before.every(v => on(w, v.game_id)), 'the Mismatches lost games that have not kicked off');
      w.renderSlate(); await wait(20);
      chk(![...d.querySelectorAll('#peMism .pe-mm-b')].some(b => b.dataset.mmGame === g0), 'a kicked-off game is still a Mismatches bubble');
      /* a ranked player in that game: his window says the game has kicked off */
      const grp = ['QB', 'RB', 'WR', 'TE'].find(g => P.groups[g].top.some(r => (MU0.players[r.id] || {}).game_id === g0));
      if (grp) {
        const r = P.groups[grp].top.find(x => (MU0.players[x.id] || {}).game_id === g0);
        [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === grp).click(); await wait(20);
        const more = d.getElementById('peMore'); if (r.rank > 10 && more) { more.click(); await wait(20); }
        const tr = [...d.querySelectorAll('#peBody tr.pe-plrow')].find(x => x.dataset.pePl === r.id);
        if (tr) { tr.click(); await wait(20);
          chk(/has kicked off/.test(txt(d.getElementById('pePlView'))), `${r.name}'s window does not say his game has kicked off`);
          d.getElementById('pePlClose').click(); await wait(10); }
      } else notes.push('no ranked player in the first game with a mismatch: the window\'s kicked-off note is not checked');
      /* every game over: no card at all */
      w.__clock.now = 1e12; w.renderSlate(); await wait(20);
      chk(!w.eloMismatches().length && !d.getElementById('peMism'), 'with every game kicked off the Mismatches card still shows');
    }
  }

  /* ---- a player the build counts out is ruled out on the page, with the reason ---- */
  if (MU0) {
    const MU = JSON.parse(JSON.stringify(MU0));
    /* the top-ranked receiver with a projection is made "out last week, not practising" in a copy */
    const top = P.groups.WR.top.find(r => MU.players && MU.players[r.id]) || P.groups.WR.top[0];
    MU.out = Object.assign({}, MU.out, { [top.id]: 'out (hamstring) in week 4, not practising for week 5: counted out' });
    const { w, d } = page(MU); await wait(60);
    chk(w.eloRuledOut(top.id) === true, 'a player the build counts out is not ruled out on the page');
    chk(!w.eloMismatches().some(v => v.pid === top.id), 'a player the build counts out is still on the Mismatches');
    [...d.querySelectorAll('#peBody .pe-pos button')].find(b => b.dataset.pos === 'WR').click(); await wait(20);
    const row = [...d.querySelectorAll('#peBody tr.pe-plrow')].find(tr => tr.dataset.pePl === top.id);
    if (row) { row.click(); await wait(20);
      chk(/not practising/.test(txt(d.getElementById('pePlView'))), 'his window does not give the build\'s reason: ' + txt(d.getElementById('pePlView')).slice(0, 160)); }
  }

  /* ---- Overall Offense and Overall Defense: the two pills, the table, the sort, the window ---- */
  const U0 = M.units;
  if (!U0 || !U0.off || !Object.values(U0.off).some(v => v.games)) notes.push('no team has a rated game: the Overall Offense checks are skipped');
  else if (!U0.stats) chk(false, 'model.json\'s units carry no stats: an old build wrote them');
  else {
    /* the gate's own printing of a value and a rank, so the page's cannot vouch for itself */
    const show = (v, f) => v == null ? '–' : f === 'pct' ? (v * 100).toFixed(1) + '%' : f === 'epa' ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3) : f === 'f2' ? v.toFixed(2) : v.toFixed(1);
    const nth = n => n == null ? '' : n + ((n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
    const pill = (d, side) => [...d.querySelectorAll('#peBody .pe-pos button[data-unit]')].find(b => b.dataset.unit === side);
    const open = async (d, side) => { const b = pill(d, side); if (b) { b.click(); await wait(20); } return d.getElementById('peUnits'); };
    const { w, d } = page(MU0); await wait(60);
    const row = d.querySelector('#peBody .pe-pos');
    chk(!!row && [...row.querySelectorAll('button[data-unit]')].map(txt).join('|') === 'Overall Offense|Overall Defense',
      'the position row does not carry the Overall Offense and Overall Defense pills');
    for (const side of ['off', 'def']) {
      const card = await open(d, side), T = U0[side], teams = Object.keys(T), stats = U0.stats.filter(s => s.side === side);
      const name = side === 'off' ? 'Overall Offense' : 'Overall Defense';
      chk(!!card && txt(card.querySelector('h2')).startsWith(name), `the ${name} pill does not open its table`);
      if (!card) continue;
      chk(d.querySelectorAll('#peBody .card').length === 1 && !d.querySelector('#peBody tr.pe-plrow'), `${name} should take the player table's place, not sit beside it`);
      chk((card.querySelector('.pe-pos [aria-selected="true"]') || {}).dataset?.unit === side, `the ${name} pill is not shown selected`);
      chk(!!scroller(w, card), `${name}'s table has no sideways scroller at a desktop width: its columns run past the card and the page scrolls`);
      chk(sticks(w, card), `${name}'s team column cannot stick while the table scrolls: it is not sticky, or a box between it and the scroller clips`);
      const rows = () => [...card.ownerDocument.querySelectorAll('#peUnits tbody tr.pe-tmrow')];
      let R = rows();
      chk(R.length === teams.length && R.length === 32, `${name} has ${R.length} rows for ${teams.length} teams`);
      chk(R.every((tr, i) => T[tr.dataset.team] && T[tr.dataset.team].rank === i + 1 && txt(tr.querySelector('.pe-rank')) === String(i + 1)),
        `${name} is not in the file's rank order`);
      const elos = R.filter(tr => T[tr.dataset.team].games).map(tr => +txt(tr.querySelector('.pe-elo')));
      chk(elos.every((e, i) => !i || e <= elos[i - 1]), `${name}'s ratings rise down the table`);
      chk(R.every(tr => +txt(tr.querySelector('.pe-elo')) === T[tr.dataset.team].elo && tr.querySelector('.pe-shield svg.tierbadge')),
        `a ${name} rating is not the file's, or has no shield`);
      /* the columns are the file's stats in its order, and every value and rank on screen is the file's */
      const cols = [...card.querySelectorAll('thead th[data-sort]')].map(th => th.dataset.sort).filter(k => stats.some(s => s.key === k));
      chk(cols.join() === stats.map(s => s.key).join(), `${name}'s stat columns are not the file's stats: ${cols.join()}`);
      const bad = [];
      for (const tr of R) for (const s of stats) {
        const e = T[tr.dataset.team].stats[s.key], td = tr.querySelector(`td[data-stat="${s.key}"]`);
        const got = td ? [txt(td.querySelector('.pe-sv')), txt(td.querySelector('.pe-ord'))] : null;
        if (!got || got[0] !== show(e && e.v, s.fmt) || got[1] !== nth(e && e.rank)) bad.push(`${tr.dataset.team} ${s.key} ${got} for ${show(e && e.v, s.fmt)} ${nth(e && e.rank)}`);
      }
      chk(!bad.length, `${name} shows values or ranks that are not the file's: ${bad.slice(0, 3).join('; ')}`);
      /* the text names every weighted stat with its share, the shares sum to 100, and the stats
         that weigh nothing are named as such */
      const why = txt(card.querySelector('#peTeamsWhy')), weighted = stats.filter(s => s.weight);
      const shares = (why.match(/(\d+)%/g) || []).map(x => parseInt(x, 10));
      const said = s => why.toLowerCase().includes(`${s.label.toLowerCase()} ${s.weight}%`);
      chk(weighted.every(said) && shares.join() === weighted.map(s => s.weight).join()
        && shares.reduce((a, b) => a + b, 0) === 100, `${name}'s text does not give the file's weights summing to 100: ${shares.join(', ')}`);
      const zero = stats.filter(s => !s.weight), zt = txt(card.querySelector('#peTeamsZero'));
      chk(!zero.length || (zero.every(s => zt.includes(s.label)) && /weigh nothing/.test(zt)), `${name} does not say which stats weigh nothing, and why`);
      /* a stat's header sorts by it, best first, then the other way; # keeps the overall rank */
      const k = stats[1].key, th = () => card.ownerDocument.querySelector(`#peUnits thead th[data-sort="${k}"]`);
      th().click(); await wait(20);
      R = rows();
      const rk = tr => { const e = T[tr.dataset.team].stats[k]; return e && e.rank != null ? e.rank : 1e9; };
      chk(R.length === 32 && R.every((tr, i) => !i || rk(tr) >= rk(R[i - 1])) && R.every(tr => txt(tr.querySelector('.pe-rank')) === String(T[tr.dataset.team].rank)),
        `sorting ${name} by ${k} is not best first, or # lost the overall rank`);
      th().click(); await wait(20);
      R = rows();
      chk(R.every((tr, i) => !i || rk(tr) <= rk(R[i - 1])), `a second click on ${k} does not turn the order round`);
      card.ownerDocument.querySelector('#peUnits thead th[data-sort="rank"]').click(); await wait(20);
      R = rows();
      chk(R.every((tr, i) => T[tr.dataset.team].rank === i + 1), `# does not put ${name} back in rank order`);
      /* a team's window: every stat, both ranks, and the coming opponent when the file calls its game */
      const t = R[0].dataset.team; R[0].click(); await wait(20);
      const m = d.getElementById('peTmModal'), view = d.getElementById('peTmView');
      chk(!!m && !m.hidden && txt(view).includes(String(T[t].elo)) && view.querySelectorAll('.pe-pl-tiles div').length === 4, `a click on ${t} does not open its window`);
      chk([...view.querySelectorAll('tbody tr[data-stat]')].map(r => r.dataset.stat).join() === stats.map(s => s.key).join(), `${t}'s window does not list every stat`);
      chk(view.querySelector('.pe-tline svg') && view.querySelectorAll('.pe-tline circle').length === T[t].line.length + 1, `${t}'s window has no line game by game`);
      const N = M.next || {}, g = +N.season === +U0.season ? (N.games || []).find(x => { const p = String(x.game_id).split('_'); return p[2] === t || p[3] === t; }) : null;
      if (g) { const p = g.game_id.split('_'), opp = p[3] === t ? p[2] : p[3], other = U0[side === 'off' ? 'def' : 'off'][opp];
        chk(!!d.getElementById('peTmNext') && txt(d.getElementById('peTmNext')).includes(opp) && txt(d.getElementById('peTmNext')).includes(nth(other.rank)),
          `${t}'s window does not give its coming opponent ${opp} and that side's rank`); }
      else chk(!d.getElementById('peTmNext'), `${t}'s window names an opponent the file does not call`);
      d.getElementById('peTmClose').click(); await wait(10);
      chk(m.hidden, 'Close does not shut a team\'s window');
      rows()[1].click(); await wait(20);
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(10);
      chk(m.hidden, 'Escape does not shut a team\'s window');
    }
    /* back to a position: the player table returns */
    [...d.querySelectorAll('#peBody .pe-pos button[data-pos]')].find(b => b.dataset.pos === 'QB').click(); await wait(20);
    chk(!d.getElementById('peUnits') && d.querySelectorAll('#peBody tr.pe-plrow').length > 0 && d.querySelectorAll('#peBody .card').length === 1,
      'a position pill does not bring the player table back, alone (the teams are a pill away, not a card under it)');

    /* the weights are the file's, not the page's: a copy with other weights shows those */
    { const M2 = JSON.parse(JSON.stringify(M)), wts = [40, 30, 20, 5, 5];
      const ws = M2.units.stats.filter(s => s.side === 'off' && s.weight);
      ws.forEach((s, i) => { s.weight = wts[i] != null ? wts[i] : 0; M2.units.weights.off[s.key] = s.weight; });
      const { d: d2 } = page(MU0, { M: M2 }); await wait(60);
      const card = await open(d2, 'off'), why = txt(card && card.querySelector('#peTeamsWhy'));
      chk(ws.every(s => why.toLowerCase().includes(`${s.label.toLowerCase()} ${s.weight}%`)), 'the page does not read the weights from the file: ' + why.slice(0, 200)); }
    /* a model.json from before the stats (the page and the data ship apart) still draws, on the old columns */
    { const M3 = JSON.parse(JSON.stringify(M));
      delete M3.units.stats; delete M3.units.weights;
      for (const side of ['off', 'def']) for (const v of Object.values(M3.units[side])) delete v.stats;
      const { w: w3, d: d3 } = page(MU0, { M: M3 }); await wait(60);
      const card = await open(d3, 'off'), heads = card ? [...card.querySelectorAll('thead th')].map(txt).join('|') : '';
      const first = card && card.querySelector('tbody tr.pe-tmrow'), v = first && M3.units.off[first.dataset.team];
      chk(!!card && /Pts\/g/.test(heads) && /Yds\/g/.test(heads) && /EPA\/play/.test(heads) && v && txt(first).includes(String(v.ppg)),
        'an old-shaped model.json does not draw the old columns: ' + heads);
      chk(!!scroller(w3, card) && sticks(w3, card), 'the old columns\' table has no sideways scroller at a desktop width, or its team column cannot stick in it'); }
  }

  console.log(`elo tab check: ${checks} checks, ${fails.length} failures`);
  for (const n of notes) console.log('  note: ' + n);
  for (const f of fails) console.log('  FAIL: ' + f);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
