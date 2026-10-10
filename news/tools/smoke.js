/* Smoke test for the tracker. Renders index.html in jsdom with the split css/js/data files,
   then asserts the counts and interactions that every change should keep working, and holds the
   generated files to the sources they come from:
     - the Deep Dive's lineups against the nflverse injury report, roster and schedule they were
       built from (tools/lineup-checks.js; the build's own snapshot in tools/.cache when it matches,
       a fresh download otherwise), and to the week the schedule says is current;
     - the rank chip against the X NFL Bets Team Rankings tab's own file, ../elo/data/model.json;
     - each team's stat bars against its own game count in results.js;
     - the live week's narrative: it never quotes the Deep Dive's or the rank chip's ranks, which
       move with every run while the narrative stays as written (on 2026-10-09, 146 of the 192 unit
       ranks the Week 5 file quoted had moved).
     - the fixed cases in tools/cases.js: the rules and their checks on weeks the real files produced
       (the Wednesday before a Thursday game, a quarterback with no healthy backup, the postseason's
       stat tables), each with the version a review caught fed to the checks, which must fail it.
   Run from news/:  npm ci && node tools/smoke.js
   The lineup checks need the nflverse files: when the build's snapshot is missing and the network
   is too, they fail, unless NEWS_SMOKE_OFFLINE=1 says to skip them (each skip is printed).          */
const fs = require('fs'), path = require('path');
const { JSDOM, requestInterceptor, VirtualConsole } = require('jsdom');
const { SEASON, siteRankQuote } = require('./lib');
const LC = require('./lineup-checks');

const ROOT = path.resolve(__dirname, '..');
const OFFLINE = process.env.NEWS_SMOKE_OFFLINE === '1';
const TYPES = { '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
const resources = { interceptors: [ requestInterceptor(req => {
  const u = new URL(req.url);
  if (u.protocol !== 'file:') return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });  // fonts, skipped
  let p = decodeURIComponent(u.pathname); if (p.length > 2 && p[2] === ':') p = p.slice(1);                       // strip leading slash before a drive letter
  try { return new Response(fs.readFileSync(p), { status: 200, headers: { 'Content-Type': TYPES[path.extname(p)] || 'text/plain' } }); }
  catch (e) { return new Response('', { status: 404 }); }
}) ] };

const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push('jsdomError: ' + e.message));
vc.on('error', m => errs.push('console.error: ' + m));

const indexPath = path.join(ROOT, 'index.html');
const dom = new JSDOM(fs.readFileSync(indexPath, 'utf8'), {
  url: 'file:///' + indexPath.split(path.sep).join('/'),
  runScripts: 'dangerously', resources, pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.scrollTo = () => {}; w.addEventListener('error', e => errs.push('window.error: ' + e.message));
    w.Element.prototype.scrollIntoView = function(){}; w.Element.prototype.scrollBy = function(){}; w.HTMLElement.prototype.scrollTo = function(){};
  }
});

let failed = 0;
const check = (label, ok, detail) => { console.log((ok ? 'ok   ' : 'FAIL ') + label + (detail !== undefined ? '  (' + detail + ')' : '')); if (!ok) failed++; };
const skip = (label, why) => console.log('SKIP ' + label + '  (' + why + ')');
const ord = v => v + ((x => ['th', 'st', 'nd', 'rd'][(x - 20) % 10] || ['th', 'st', 'nd', 'rd'][x] || 'th')(v % 100));

/* the narrative never quotes the site's own ranks (tools/lib.js siteRankQuote says which phrases) */
function narrativeStrings(week) {
  const out = [];
  const add = (where, v) => { if (typeof v === 'string' && v) out.push([where, v]); else if (Array.isArray(v)) v.forEach((x, i) => add(`${where}[${i}]`, x)); };
  add('headline', week.headline); add('intro', week.intro);
  (week.games || []).forEach(g => { const k = `${g.away}-${g.home}`; add(`${k} note`, g.note); add(`${k} preview`, g.preview); add(`${k} keys`, g.keys); });
  Object.entries(week.teams || {}).forEach(([t, e]) => ['headline', 'matchup', 'last', 'strengths', 'weaknesses', 'keys'].forEach(f => add(`${t} ${f}`, e && e[f])));
  return out;
}

dom.window.addEventListener('load', () => run().catch(e => { console.log('FAIL smoke test crashed  (' + (e && e.stack || e) + ')'); process.exit(1); }));

async function run() {
  const w = dom.window, d = w.document;
  const n = sel => d.querySelectorAll(sel).length;
  const click = sel => { const el = d.querySelector(sel); if (!el) throw new Error('missing ' + sel); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); return el; };
  const g = expr => w.eval(expr);   // top-level const/let live in script scope, not on window
  const ov = d.getElementById('ov');

  // Everything below is derived from whatever week is active, so the test keeps working as weeks are appended.
  const WK = g('currentWeek()'), T = g('T');
  const R = g('typeof RESULTS === "undefined" ? {} : RESULTS');
  const rec = ab => { let W = 0, L = 0, T2 = 0; for (const [k, [as, hs]] of Object.entries(R)) { const [aw, hm] = k.split(':')[1].split('-'); if (aw !== ab && hm !== ab) continue; const mine = hm === ab ? hs : as, theirs = hm === ab ? as : hs; if (mine > theirs) W++; else if (mine < theirs) L++; else T2++; } return W + '-' + L + (T2 ? '-' + T2 : ''); };
  const gameKey = x => x.away + '-' + x.home;
  const played = WK.games.filter(x => x.awayScore != null && x.homeScore != null).length;
  const first = WK.games[0], last = WK.games[WK.games.length - 1];
  const META = g('typeof UNITS26_META === "undefined" ? null : UNITS26_META');

  check('no script errors', errs.length === 0, errs.join(' | ') || 'none');
  check('shows the last week in data/weeks.js', g('ACTIVE') === g('WEEKS[WEEKS.length-1].id') && d.getElementById('barweek').textContent.includes(g('currentWeek().label')), d.getElementById('barweek').textContent);
  // a tile for every game on the slate: 16 most weeks, fewer on a bye week (Week 5 was the first, 15)
  check('a tile for every game on the slate', n('.slot') === WK.games.length && WK.games.length >= 13 && WK.games.length <= 16, n('.slot') + ' of ' + WK.games.length);
  check('no tabs, search, cards, or data tools on the page', n('.wtab') === 0 && !d.getElementById('q') && n('.card') === 0 && !d.getElementById('tools'));
  // one score per game that has a final, none on an upcoming slate, never more than the slate
  check('played games show a score', n('.slot .score') === played && played <= n('.slot'), n('.slot .score') + ' of ' + n('.slot'));
  // in the regular season the footer promises the next week; after week 18 it says the season is complete
  { const foot = d.querySelector('footer').textContent, over = g('seasonOver()');
    check('footer says what comes next', over ? /regular season is complete/.test(foot) : /New week posted each Wednesday/.test(foot), foot.trim()); }

  // the live week's narrative quotes no site ranks: the Deep Dive and rank chip show them, and move
  { const hits = narrativeStrings(WK).map(([k, v]) => [k, siteRankQuote(v)]).filter(([, q]) => q).map(([k, q]) => `${k}: "${q}"`);
    check('the live week quotes no Deep Dive or rank chip ranks', hits.length === 0, hits.length ? `${hits.length}: ${hits.slice(0, 4).join(' | ')}` : 'none'); }

  click('.slot[data-game="' + gameKey(first) + '"]');
  const title = d.getElementById('ovtitle') ? d.getElementById('ovtitle').textContent : '';
  check('game overlay opens', ov.classList.contains('on') && title.includes(T[first.away].name) && title.includes(T[first.home].name), title);
  // the header's line is the schedule's with its date (or the closing line), else the week file's, said so
  { const sub = d.querySelector('.ovhd .sub').textContent, L = g('typeof LINES === "undefined" ? null : LINES'), key = WK.id + ':' + gameKey(first);
    const done = first.awayScore != null && first.homeScore != null;
    if (L && L[key]) check('the line in the header is dated', sub.includes(`${L[key]} (${done ? 'closing line' : 'line '}`), sub);
    else check('the line in the header says when it was set', !first.line || sub.includes(`${first.line} (line when the week was posted`), sub); }
  check('both teams on one shared grid', n('.duo2 .tb.c1') === 1 && n('.duo2 .tb.c2') === 1 && n('.duo2 .r1') === 2 && n('.duo2 .r3.up') === 2 && n('.duo2 .r4.down') === 2);
  check('every row present for both teams', ['r1','r2','r3','r4','r5'].every(r => n('.duo2 .' + r) === 2) && n('.tbsec.n h5') === 2);
  check('keys to victory is a blue block per team', n('.duo2 .tb .tbsec.info.r5') === 2 && n('.duo2 .tbsec.info li') === 6, n('.duo2 .tbsec.info li') + ' keys');
  check('headlines carry a title for the one-line clamp', n('.tbhd .sub[title]') === 2);
  check('no setup section', ![...d.querySelectorAll('.ovbody .ovsec')].some(e => e.textContent.includes('How the game sets up')));
  check('record chips show the 2026 record', [...d.querySelectorAll('.tbhd .chips .pill:not(.big) b')].map(b => b.textContent).join(' ') === rec(first.away) + ' ' + rec(first.home) && d.querySelector('.tbhd .chips .pill:not(.big)').textContent.includes('2026'), [...d.querySelectorAll('.tbhd .chips .pill:not(.big)')].map(p => p.textContent).join(' | '));
  // the rank chip is the team's place on X NFL Bets' Team Rankings tab (../elo/data/model.json teams, by Elo,
  // ties in the file's order, as betting/tools/ratings_viz.js draws it). Until 2026-10-09 it was the Alpha
  // Model's Elo from ../betting/state.json, 6.4 places a team away from that tab.
  { const RK = g('typeof RANKS26 === "undefined" ? null : RANKS26'), SRC = g('typeof RANKS26_SRC === "undefined" ? null : RANKS26_SRC');
    const chips = [...d.querySelectorAll('.tbhd .chips .pill.big b')].map(b => b.textContent);
    check('rank chip shows ranks2026.js', !RK || chips.join(' ') === [first.away, first.home].map(t => ord(RK[t].rank)).join(' '), chips.join(' '));
    let M = null; try { M = JSON.parse(fs.readFileSync(path.resolve(ROOT, '..', 'elo', 'data', 'model.json'), 'utf8')); } catch (e) { /* no hub file */ }
    if (!RK || !M || !M.teams || Object.keys(M.teams).length < 32) skip('rank chip is the Team Rankings order', !RK ? 'no ranks2026.js' : 'no full team list in ../elo/data/model.json; the chip stays as it was');
    else {
      const ab = t => ({ LA: 'LAR', WSH: 'WAS', JAC: 'JAX', OAK: 'LV', SD: 'LAC', STL: 'LAR' })[t] || t;
      const tab = Object.entries(M.teams).map(([t, v]) => [ab(t), v.elo]).sort((a, b) => b[1] - a[1]).map(([t], i) => [t, i + 1]);
      const diffs = tab.map(([t, r]) => [t, r, RK[t] ? RK[t].rank : null]).filter(([, r, c]) => r !== c);
      const same = SRC && SRC.built_at === M.built_at;
      if (same || !SRC) check('rank chip is the Team Rankings order', !!SRC && diffs.length === 0, !SRC ? 'ranks2026.js names no source: it predates the Team Rankings chip, rebuild with node tools/context.js' : diffs.length ? diffs.slice(0, 6).map(([t, r, c]) => `${t} ${c} vs ${r}`).join(', ') : 'all 32');
      else {
        // the hub's file moved on since this build (the elo job runs daily): the order must still be that board's, a day behind at most
        const nT = tab.length, d2 = tab.reduce((a, [t, r]) => a + (RK[t] ? (RK[t].rank - r) ** 2 : nT * nT), 0), rho = 1 - 6 * d2 / (nT * (nT * nT - 1));
        check('rank chip is the Team Rankings order, a run behind', rho >= 0.9, `model.json rebuilt ${M.built_at} after the chip's ${SRC.built_at}; rank correlation ${rho.toFixed(3)}`);
      } } }
  // the preseason write-ups are gone from the page and from data/teams.js
  check('no preseason write-up', ![...d.querySelectorAll('.duo2 details')].some(x => /Preseason write-up/.test(x.textContent)) && g('TEAMS.every(t => !t.facts && !t.up && !t.down && !t.sub)'));
  // positions after player names, never doubled, and a name two rosters share at different positions only with the team the text names
  { const PL = g('typeof PLAYERS26 === "undefined" ? null : PLAYERS26');
    const text = [...d.querySelectorAll('.duo2 .tbsec li')].map(li => li.textContent).join(' \n ');
    if (PL) {
      const one = g('posScope() ? posScope().one : {}');
      const names = Object.entries(Object.assign({}, PL[first.home], PL[first.away])).filter(([nm]) => one[nm]).sort((a, b) => b[0].length - a[0].length);
      const hit = names.find(([nm]) => text.includes(nm));
      check('player names carry their position', !hit || new RegExp(hit[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "('s)? \\((QB|RB|WR|TE|FB|T|G|C|DE|DT|NT|OLB|ILB|MLB|LB|CB|FS|SS|S|DB|K|P|LS)\\)").test(text), hit ? hit[0] : 'no roster name in this game');
      check('positions are never doubled', !/\((QB|RB|WR|TE|CB|DE|DT|OLB|ILB|SS|FS|T|G|C)\) \((QB|RB|WR|TE|CB|DE|DT|OLB|ILB|SS|FS|T|G|C)\)/.test(text));
      // every game of the live week: a name two rosters share at different positions carries the position of the
      // team named just before it, else of the game's team that has him (on 2026-10-09 "the Rams' Byron Young"
      // read "(DT)", the Eagles' tackle's, in Philadelphia's game)
      const REF = g('TEAM_REF'), wp = g('withPos'), clash = g('posScope() ? posScope().clash : {}'), wrong = [];
      for (const gm of WK.games) for (const [, v] of narrativeStrings({ games: [gm], teams: Object.fromEntries([gm.away, gm.home].map(t => [t, (WK.teams || {})[t]])) })) {
        const html = wp(v, [gm.away, gm.home]).replace(/<[^>]+>/g, '');
        for (const [nm, at] of Object.entries(clash)) for (let i = html.indexOf(nm); i >= 0; i = html.indexOf(nm, i + 1)) {
          const tag = html.slice(i + nm.length).match(/^(?:'s|’s)? \(([A-Z]{1,4})\)/);
          if (!tag) continue;
          const ref = html.slice(0, i).slice(-60).match(REF.rx), team = ref && REF.refs[ref[1]];
          const mine = [gm.away, gm.home].filter(t => at[t]), want = team ? at[team] : (mine.length === 1 ? at[mine[0]] : undefined);
          if (tag[1] !== want) wrong.push(`${gm.away}-${gm.home}: ${ref ? ref[1] + "'s " : ''}${nm} (${tag[1]}), ${team ? team + ' has him at ' + (at[team] || 'no position') : 'should be ' + (want || 'untagged')}`);
        }
      }
      check("a position after another team's player is that team's", wrong.length === 0, wrong.slice(0, 3).join(' | ') || 'none');
    } }
  // Deep Dive: collapsed by default, six unit matchups per team, both open together
  { const U = g('typeof UNITS26 === "undefined" ? null : UNITS26');
    if (U && U[first.away] && U[first.home]) {
      const dds = [...d.querySelectorAll('.duo2 details.dd.r6')];
      check('deep dive under keys to victory, one per team', dds.length === 2 && dds.every(x => x.previousElementSibling && x.previousElementSibling.classList.contains('r5')), dds.length);
      check('deep dive starts closed', dds.every(x => !x.open));
      check('deep dive has six matchups each', dds.every(x => x.querySelectorAll('.ddrow').length === 6) && [...d.querySelectorAll('.dd .ddunit')].slice(0, 6).map(e => e.textContent).join('|') === 'Quarterback|Offensive line|Running backs|Receivers|Pass rush|Defensive backs');
      check('deep dive tags are the five levels', [...d.querySelectorAll('.dd .dtag')].every(e => ['Easy','Favorable','Even','Tough','Very tough'].includes(e.textContent)), [...new Set([...d.querySelectorAll('.dd .dtag')].map(e => e.textContent))].join(','));
      const qbRank = d.querySelector('.tb.c1 .dd .ddrow .ddvs b').textContent;
      check('deep dive ranks come from units2026.js', parseInt(qbRank, 10) === U[first.away].qb.rank, qbRank + ' vs ' + U[first.away].qb.rank);
      // the basis line gives the team's own 2026 game count (the Thursday teams have one more)
      if (U[first.away].g26 != null) { const b = dds[0].querySelector('.ddbasis').textContent;
        check("deep dive basis is the team's own 2026 game count", b.includes(`${first.away}'s ${U[first.away].g26} game`), b.slice(0, 120)); }
      else skip("deep dive basis is the team's own 2026 game count", 'units2026.js predates per-team game counts: rebuild with node tools/context.js');
      // each row's tag is the edge between the two ratings it shows, and the mirrored rows agree
      const LV = ['Very tough', 'Tough', 'Even', 'Favorable', 'Easy'];
      const tagOf = e => e >= 1.5 ? 'Easy' : e >= 0.5 ? 'Favorable' : e > -0.5 ? 'Even' : e > -1.5 ? 'Tough' : 'Very tough';
      const pairs = (A, O) => [[A.qb, O.vs.passD], [A.ol, O.front], [A.rb, O.vs.runD], [A.rec, O.db], [A.front, O.ol], [A.db, O.rec]].map(([u, v]) => tagOf(u.z - v.z));
      const shown = i => [...dds[i].querySelectorAll('.dtag')].map(e => e.textContent);
      const want = [pairs(U[first.away], U[first.home]), pairs(U[first.home], U[first.away])];
      check('deep dive tags are the edge between the ratings shown', shown(0).join('|') === want[0].join('|') && shown(1).join('|') === want[1].join('|'), shown(0).join(',') + ' / ' + want[0].join(','));
      const mirror = t => LV[4 - LV.indexOf(t)];
      check('mirrored rows agree: pass rush against pass protection, coverage against receivers', shown(0)[4] === mirror(shown(1)[1]) && shown(1)[4] === mirror(shown(0)[1]) && shown(0)[5] === mirror(shown(1)[3]) && shown(1)[5] === mirror(shown(0)[3]), shown(0).join(',') + ' / ' + shown(1).join(','));
      // every team's ratings: a full league of ranks per unit, a finite rating each
      const UN = ['qb', 'ol', 'rb', 'rec', 'front', 'db'];
      const teamsU = Object.keys(U);
      check('every unit ranks the whole league once', teamsU.length === 32 && UN.every(u => teamsU.map(t => U[t][u].rank).sort((a, b) => a - b).join() === Array.from({ length: 32 }, (_, i) => i + 1).join() && teamsU.every(t => isFinite(U[t][u].z))) && ['passD', 'runD'].every(k => teamsU.every(t => isFinite(U[t].vs[k].z))));
      // nobody listed to play is also listed as out, and every unit missing a starter says so on the page
      check('no player is both listed and out', teamsU.every(t => UN.every(u => !(U[t][u].out || []).some(p => (U[t][u].who || []).some(x => x.n === p.n)))));
      const dd = g('deepDive');
      const slateMiss = WK.games.flatMap(x => [[x.away, x.home], [x.home, x.away]]).filter(([a]) => U[a]).filter(([a, o]) => {
        const html = dd(a, o, 'r6'), rowsH = html.split('class="ddrow"').slice(1);
        return UN.some((u, i) => (U[a][u].out || []).length && !(rowsH[i] || '').includes('class="ddout"'))
          || ((U[a].qb.out || []).length && U[a].qb.who.length && !(rowsH[0] || '').includes(U[a].qb.who[0].n + ' starts;'));
      });
      check('a starter who is out is named on the page, on every game of the slate', slateMiss.length === 0, slateMiss.map(x => x[0]).join(',') || 'none');
      // a quarterback in doubt has the next one named beside him, on every game of the slate
      const NF = { chart: 'next on the chart: ', roster: 'next on the roster: ', usage: 'next by 2026 dropbacks: ' };
      const qbMiss = WK.games.flatMap(x => [[x.away, x.home], [x.home, x.away]]).filter(([a]) => U[a] && (U[a].qb.next || U[a].qb.next_none)).filter(([a, o]) => {
        const row = dd(a, o, 'r6').split('class="ddrow"')[1], q = U[a].qb;
        return !(q.next ? row.includes((NF[q.next.from] || NF.chart) + q.next.n) : row.includes(q.next_none));
      });
      check('a quarterback in doubt names the next one, on every game of the slate', qbMiss.length === 0, qbMiss.map(x => x[0]).join(',') || 'none');
      // the quarterback row on made-up states: a backup from the roster says so, and no backup is said, not left blank
      { const keep = JSON.stringify(U[first.away].qb), q = U[first.away].qb;
        q.who = [{ n: 'Zed Quux', pos: 'QB', q: 'questionable: ankle' }];
        q.next = { n: 'Quin Zorb', pos: 'QB', from: 'roster' }; delete q.next_none;
        const a = dd(first.away, first.home, 'r6').split('class="ddrow"')[1];
        q.next = null; q.next_none = 'no other quarterback on the roster can play (Quin Zorb is out (knee))';
        const b = dd(first.away, first.home, 'r6').split('class="ddrow"')[1];
        U[first.away].qb = JSON.parse(keep);
        check('the quarterback row says where the next one comes from, or that none can play',
          a.includes('Zed Quux may not start (questionable: ankle); next on the roster: Quin Zorb.') && b.includes('Zed Quux may not start (questionable: ankle); no other quarterback on the roster can play (Quin Zorb is out (knee)).'),
          a.match(/may not start[^<]*/) + ' | ' + b.match(/may not start[^<]*/)); }
      dds[0].open = true; dds[0].dispatchEvent(new w.Event('toggle'));
      check('opening one team opens the other', dds[1].open);
      dds[1].open = false; dds[1].dispatchEvent(new w.Event('toggle'));
      check('closing one team closes the other', !dds[0].open);
    } }
  check('eleven stat rows with divided bars', n('.ovbody .sbar') === 11 && n('.ovbody .sbar .half') === 22, n('.ovbody .sbar') + ' rows');
  check('stat labels in order', [...d.querySelectorAll('.ovbody .sbar .lb')].map(e => e.firstChild.textContent).join('|') === 'Point differential|Points per game|Points allowed|Yards per play|Yards per play allowed|Turnover margin|Sacks|Sacks allowed|Third down rate|Red zone TD rate|Explosive plays');
  // stat values are numbers, never dashes; before the first pull they are all zero, after it they are whatever the season says
  const svals = [...d.querySelectorAll('.ovbody .sv')].map(e => e.textContent.trim());
  { const S26 = g('typeof STATS26 === "undefined" ? {} : STATS26');
    const blanks = [first.away, first.home].reduce((n, t) => n + (S26[t] ? ['ppg','pa','ypp','yppa','to','sk','ska','third','rz','expl'].filter(k => S26[t][k] == null).length : 0), 0);
    const dashes = svals.filter(v => v === '–').length;
    check('2026 only: numeric stat values, a dash only where the stat file has none', svals.length > 0 && svals.every(v => v === '–' || /^[+-]?\d+(\.\d+)?%?$/.test(v)) && dashes <= blanks + 2, `${dashes} dashes, ${blanks} blank stats`);
    // each team's points per game and allowed are its first g finals in results.js, and the header says g.
    // A team the pull could not verify carries no g (pull-week.js verifyCounts) and the page claims no count for it
    const teams = Object.keys(S26).filter(t => S26[t].g != null), uncounted = Object.keys(S26).filter(t => S26[t].g == null);
    if (uncounted.length && teams.length) console.log(`     (${uncounted.join(', ')}: no verified game count in stats2026.js, so none is claimed or checked)`);
    if (teams.length) {
      const bad = teams.filter(t => {
        const games = Object.entries(R).map(([k, sc]) => { const [wk, p] = k.split(':'); const [a, h] = p.split('-'); return a === t ? [+wk.slice(2), sc[0], sc[1]] : h === t ? [+wk.slice(2), sc[1], sc[0]] : null; }).filter(Boolean).sort((x, y) => x[0] - y[0]).slice(0, S26[t].g);
        if (games.length !== S26[t].g) return true;
        const f = games.reduce((a, x) => a + x[1], 0) / (games.length || 1), ag = games.reduce((a, x) => a + x[2], 0) / (games.length || 1);
        return S26[t].g > 0 && (Math.abs(f - S26[t].ppg) > 0.06 || Math.abs(ag - S26[t].pa) > 0.06);
      });
      check("each team's stats are its own game count", bad.length === 0, bad.length ? bad.map(t => `${t} g=${S26[t].g} ppg ${S26[t].ppg}`).join(', ') : `${teams.length} teams`);
      const hd = d.querySelector('.ovbody .ovsub').textContent;
      check('the stat header gives both teams their game counts', [first.away, first.home].filter(t => S26[t] && S26[t].g != null).every(t => hd.includes(`${t} ${S26[t].g} game`)) && [first.away, first.home].filter(t => S26[t] && S26[t].g == null).every(t => !new RegExp(`\\b${t} \\d+ game`).test(hd)), hd);
    } else skip("each team's stats are its own game count", 'stats2026.js predates per-team game counts; the next pull-week.js run writes them'); }
  const anyStat = svals.some(v => !/^0%?$/.test(v)); const widths = [...d.querySelectorAll('.ovbody .half i')].map(x => x.style.width);
  check(anyStat ? 'bars drawn once stats exist' : 'empty bars when both sides are zero', anyStat ? widths.some(w => w && w !== '0%') : widths.every(w => w === '0%'));
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Escape closes overlay', !ov.classList.contains('on'));

  click('.slot[data-game="' + gameKey(last) + '"]');
  check('a second game opens', ov.classList.contains('on') && d.getElementById('ovtitle').textContent.includes(T[last.home].name));
  // records follow the results file, worked out here independently of the page: 0-0 before anyone plays, then whatever the season says
  { const want = rec(last.away) + ' ' + rec(last.home), got = [...d.querySelectorAll('.tbhd .chips .pill:not(.big) b')].map(b => b.textContent).join(' ');
    check('team records match the results file', got === want, got + ' vs ' + want); }
  click('#ovx');
  check('X closes overlay', !ov.classList.contains('on'));

  // positions, on made-up players: a name two rosters share at different positions takes the position of the team
  // named before it, else of the game's team that has him, else none
  { const before = g('JSON.stringify(PLAYERS26.PHI || null) + JSON.stringify(PLAYERS26.LAR || null)');
    g('PLAYERS26.PHI["Zed Quux"] = "DT"; PLAYERS26.LAR["Zed Quux"] = "OLB"; PLAYERS26.KC["Quin Zorb"] = "WR"; POS_SCOPE = undefined;');
    const got = g(`withPos("after the Rams' edge rusher Zed Quux had 2 sacks; Zed Quux again; Philadelphia's <strong>Zed Quux</strong> inside; Quin Zorb caught 3", ["PHI", "JAX"]) + " | " + withPos("Zed Quux", ["KC", "BUF"])`);
    check("a shared name takes the named team's position, then the game's", got === "after the Rams' edge rusher Zed Quux (OLB) had 2 sacks; Zed Quux (DT) again; Philadelphia's <strong>Zed Quux</strong> (DT) inside; Quin Zorb (WR) caught 3 | Zed Quux", got);
    g('delete PLAYERS26.PHI["Zed Quux"]; delete PLAYERS26.LAR["Zed Quux"]; delete PLAYERS26.KC["Quin Zorb"]; POS_SCOPE = undefined;');
    check('made-up players removed', g('JSON.stringify(PLAYERS26.PHI || null) + JSON.stringify(PLAYERS26.LAR || null)') === before); }

  // a week with no writeups still renders: numbers only, placeholder in Positives
  w.eval('WEEKS.push({id:"wk99", label:"Week 99", type:"recap", status:"live", dates:"", headline:"Synthetic", intro:"", games:[{away:"DET",home:"BUF",day:"Thu",time:"8:15 PM ET",kick:"2026-09-18T00:15:00Z",tv:"Prime Video",venue:"Highmark Stadium",awayScore:20,homeScore:24}], teams:{}}); show("wk99");');
  check('a later week takes over the page', n('.slot') === 1 && d.getElementById('barweek').textContent.includes('Week 99'));
  click('.slot');
  check('overlay works with no writeups', ov.classList.contains('on') && n('.duo2 .tbsec.empty') === 6 && n('.ovbody .sbar') === 11, n('.duo2 .tbsec.empty') + ' empty rows');
  // results file: a score for a Week 99 game flows into the week at load
  w.eval('RESULTS["wk99:DET-BUF"] = [3, 7]; WEEKS[WEEKS.length-1].games[0].awayScore = null; WEEKS[WEEKS.length-1].games[0].homeScore = null; applyResultsAgain();');
  check('results.js scores merge into a week', g('WEEKS[WEEKS.length-1].games[0].homeScore') === 7);
  check('footer date follows the week file', d.querySelector('footer').textContent.includes('Last updated'));
  // after week 18 the footer stops promising a next week
  w.eval('WEEKS.push({id:"wk18", label:"Week 18", type:"recap", status:"live", dates:"", headline:"", intro:"", games:[{away:"DET",home:"GB",day:"Sun",time:"1:00 PM ET",kick:"2027-01-10T18:00:00Z",tv:"",venue:"",awayScore:20,homeScore:24}], teams:{}}); show("wk18");');
  check('after week 18 the page says the regular season is complete', /regular season is complete/.test(d.querySelector('footer').textContent) && !/New week posted/.test(d.querySelector('footer').textContent), d.querySelector('footer').textContent.trim());
  check('no errors after interactions', errs.length === 0, errs.join(' | ') || 'none');

  // ---- the cases the rules and their checks must keep, each from a week the real files produced (tools/cases.js) ----
  for (const c of require('./cases').cases()) check(`case ${c.name}: ${c.label}`, c.ok, c.ok ? undefined : c.detail);

  // ---- the Deep Dive's lineups against the report, roster and schedule they were built from ----
  { const U = g('typeof UNITS26 === "undefined" ? null : UNITS26');
    let S = null, why = '';
    try { S = await LC.loadSources(path.join(ROOT, 'tools', '.cache', 'lineup-sources.json'), META, fs); } catch (e) { why = e.message; }
    if (!U) check('lineups: units2026.js loaded', false);
    else if (!S && OFFLINE) skip('lineups against the injury report, roster and schedule', 'NEWS_SMOKE_OFFLINE=1 and no build snapshot: ' + why);
    else if (!S) check('lineups: the injury report, roster and schedule could be read', false, why + ' (set NEWS_SMOKE_OFFLINE=1 to skip these checks offline)');
    else {
      const r = LC.check(U, META, S), RULES = {
        week: 'the lineups are for the schedule\'s current week', official: 'nobody listed whom the report rules Out or Doubtful',
        'q-dnp': 'nobody listed who is Questionable with no practice on the report', 'last-game': 'nobody listed who was Out last game and has not practised since',
        roster: 'nobody listed who is off the active roster, elsewhere, or inactive and not practising', espn: "nobody listed whom ESPN rules out before the team files",
        'espn-q-dnp': "nobody listed whom ESPN has Questionable and not practising on the last practice day, before the team files",
        'next-qb': 'a quarterback in doubt has the next one named' };
      console.log(`     (lineups checked against ${S.from}: ${r.listed} players listed for week ${r.week}${S.espn ? ', with ESPN\'s list' : ''})`);
      for (const [k, label] of Object.entries(RULES)) {
        if ((k === 'espn' || k === 'espn-q-dnp') && !S.espn) { skip('lineups: ' + label, 'no ESPN list in these sources'); continue; }
        const f = r.fails[k] || [];
        check('lineups: ' + label, f.length === 0, f.length ? `${f.length}: ${f.slice(0, 6).join('; ')}${S.from !== 'the build\'s own snapshot' && !/rebuild with/.test(f[0]) ? ' (rebuild with node tools/context.js)' : ''}` : undefined);
      }
    }
    // in the job the smoke runs straight after the build: the lineups must have been checked against this
    // run's own download (the build's snapshot, written by this run), not a kept file. units2026.js's own
    // stamp moves only when the Deep Dive changes, so it is not the proof of a run
    if (process.env.GITHUB_ACTIONS === 'true') check("the lineups were built and checked on this run's download", !!S && S.from === "the build's own snapshot" && !!S.run_at && Date.now() - Date.parse(S.run_at) < 6 * 3600e3,
      S ? `${S.from}${S.run_at ? ', written ' + S.run_at : ''}` : 'no sources');
  }

  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
}
