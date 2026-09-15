/* Smoke test for the tracker. Renders index.html in jsdom with the split css/js/data files,
   then asserts the counts and interactions that every change should keep working.
   Run from the repo root:  npm install --no-save jsdom && node tools/smoke.js            */
const fs = require('fs'), path = require('path');
const { JSDOM, requestInterceptor, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
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

dom.window.addEventListener('load', () => {
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

  check('no script errors', errs.length === 0, errs.join(' | ') || 'none');
  check('shows the last week in data/weeks.js', g('ACTIVE') === g('WEEKS[WEEKS.length-1].id') && d.getElementById('barweek').textContent.includes(g('currentWeek().label')), d.getElementById('barweek').textContent);
  check('16 game tiles', n('.slot') === 16, n('.slot'));
  check('no tabs, search, cards, or data tools on the page', n('.wtab') === 0 && !d.getElementById('q') && n('.card') === 0 && !d.getElementById('tools'));
  // one score per game that has a final, none on an upcoming slate, never more than the slate
  check('played games show a score', n('.slot .score') === played && played <= n('.slot'), n('.slot .score') + ' of ' + n('.slot'));

  click('.slot[data-game="' + gameKey(first) + '"]');
  const title = d.getElementById('ovtitle') ? d.getElementById('ovtitle').textContent : '';
  check('game overlay opens', ov.classList.contains('on') && title.includes(T[first.away].name) && title.includes(T[first.home].name), title);
  check('both teams on one shared grid', n('.duo2 .tb.c1') === 1 && n('.duo2 .tb.c2') === 1 && n('.duo2 .r1') === 2 && n('.duo2 .r3.up') === 2 && n('.duo2 .r4.down') === 2);
  check('every row present for both teams', ['r1','r2','r3','r4','r5'].every(r => n('.duo2 .' + r) === 2) && n('.tbsec.n h5') === 2);
  check('keys to victory is a blue block per team', n('.duo2 .tb .tbsec.info.r5') === 2 && n('.duo2 .tbsec.info li') === 6, n('.duo2 .tbsec.info li') + ' keys');
  check('headlines carry a title for the one-line clamp', n('.tbhd .sub[title]') === 2);
  check('no setup section', ![...d.querySelectorAll('.ovbody .ovsec')].some(e => e.textContent.includes('How the game sets up')));
  check('record chips show the 2026 record', [...d.querySelectorAll('.tbhd .chips .pill:not(.big) b')].map(b => b.textContent).join(' ') === rec(first.away) + ' ' + rec(first.home) && d.querySelector('.tbhd .chips .pill:not(.big)').textContent.includes('2026'), [...d.querySelectorAll('.tbhd .chips .pill:not(.big)')].map(p => p.textContent).join(' | '));
  // power rank chip follows data/ranks2026.js (the betting model's Power Ratings board)
  { const RK = g('typeof RANKS26 === "undefined" ? null : RANKS26');
    const chips = [...d.querySelectorAll('.tbhd .chips .pill.big b')].map(b => b.textContent);
    check('rank chip is the power rank', !RK || chips.join(' ') === [first.away, first.home].map(t => RK[t].rank + ['th','st','nd','rd'][(RK[t].rank % 100 - 20) % 10] || '').join(' ') || chips.join(' ') === [first.away, first.home].map(t => String(RK[t].rank) + ((v => ['th','st','nd','rd'][(v - 20) % 10] || ['th','st','nd','rd'][v] || 'th')(RK[t].rank % 100))).join(' '), chips.join(' ')); }
  // positions after player names, scoped to the two teams, never doubled
  { const PL = g('typeof PLAYERS26 === "undefined" ? null : PLAYERS26');
    const text = [...d.querySelectorAll('.duo2 .tbsec li')].map(li => li.textContent).join(' \n ');
    if (PL) {
      const names = Object.entries(Object.assign({}, PL[first.home], PL[first.away])).sort((a, b) => b[0].length - a[0].length);
      const hit = names.find(([nm]) => text.includes(nm));
      check('player names carry their position', !hit || new RegExp(hit[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "('s)? \\((QB|RB|WR|TE|FB|T|G|C|DE|DT|NT|OLB|ILB|MLB|LB|CB|FS|SS|S|DB|K|P|LS)\\)").test(text), hit ? hit[0] : 'no roster name in this game');
      check('positions are never doubled', !/\((QB|RB|WR|TE|CB|DE|DT|OLB|ILB|SS|FS|T|G|C)\) \((QB|RB|WR|TE|CB|DE|DT|OLB|ILB|SS|FS|T|G|C)\)/.test(text));
    } }
  // Deep Dive: collapsed by default, six unit matchups per team, both open together
  { const U = g('typeof UNITS26 === "undefined" ? null : UNITS26');
    if (U && U[first.away] && U[first.home]) {
      const dds = [...d.querySelectorAll('.duo2 details.dd.r6')];
      check('deep dive under keys to victory, one per team', dds.length === 2 && dds.every(x => x.previousElementSibling && x.previousElementSibling.classList.contains('r5')), dds.length);
      check('deep dive starts closed', dds.every(x => !x.open));
      check('deep dive has six matchups each', dds.every(x => x.querySelectorAll('.ddrow').length === 6) && [...d.querySelectorAll('.dd .ddunit')].slice(0, 6).map(e => e.textContent).join('|') === 'Quarterback|Offensive line|Running backs|Receivers|Pass and run rush|Defensive backs');
      check('deep dive tags are the five levels', [...d.querySelectorAll('.dd .dtag')].every(e => ['Easy','Favorable','Even','Tough','Very tough'].includes(e.textContent)), [...new Set([...d.querySelectorAll('.dd .dtag')].map(e => e.textContent))].join(','));
      const qbRank = d.querySelector('.tb.c1 .dd .ddrow .ddvs b').textContent;
      check('deep dive ranks come from units2026.js', parseInt(qbRank, 10) === U[first.away].qb.rank, qbRank + ' vs ' + U[first.away].qb.rank);
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
    const dashes = svals.filter(v => v === '\u2013').length;
    check('2026 only: numeric stat values, a dash only where the stat file has none', svals.length > 0 && svals.every(v => v === '\u2013' || /^[+-]?\d+(\.\d+)?%?$/.test(v)) && dashes <= blanks + 2, `${dashes} dashes, ${blanks} blank stats`); }
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

  // a week with no writeups still renders: numbers only, placeholder in Positives
  w.eval('WEEKS.push({id:"wk99", label:"Week 99", type:"recap", status:"live", dates:"", headline:"Synthetic", intro:"", games:[{away:"DET",home:"BUF",day:"Thu",time:"8:15 PM ET",kick:"2026-09-18T00:15:00Z",tv:"Prime Video",venue:"Highmark Stadium",awayScore:20,homeScore:24}], teams:{}}); show("wk99");');
  check('a later week takes over the page', n('.slot') === 1 && d.getElementById('barweek').textContent.includes('Week 99'));
  click('.slot');
  check('overlay works with no writeups', ov.classList.contains('on') && n('.duo2 .tbsec.empty') === 6 && n('.ovbody .sbar') === 11, n('.duo2 .tbsec.empty') + ' empty rows');
  // results file: a score for a Week 99 game flows into the week at load
  w.eval('RESULTS["wk99:DET-BUF"] = [3, 7]; WEEKS[WEEKS.length-1].games[0].awayScore = null; WEEKS[WEEKS.length-1].games[0].homeScore = null; applyResultsAgain();');
  check('results.js scores merge into a week', g('WEEKS[WEEKS.length-1].games[0].homeScore') === 7);
  check('footer date follows the week file', d.querySelector('footer').textContent.includes('Last updated'));
  check('no errors after interactions', errs.length === 0, errs.join(' | ') || 'none');

  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
});
