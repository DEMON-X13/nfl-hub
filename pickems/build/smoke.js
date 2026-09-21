/* Check the built Pick'ems page.
 *
 *   node pickems/build/smoke.js        (from the hub root)
 *
 * Boots the real page against a stubbed state.json and payload.json: the Pick'ems board, the
 * call on each game, the prop model's prices that open underneath one, and the Props tab,
 * which is the prop model's Games tab running in this page. jsdom and PapaParse are borrowed
 * from props/build, so this needs no install of its own.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const Papa = require(path.join(ROOT, 'props', 'build', 'node_modules', 'papaparse'));
const HTML = fs.readFileSync(path.join(ROOT, 'pickems', 'index.html'), 'utf8');
const STATE = JSON.parse(fs.readFileSync(path.join(ROOT, 'betting', 'state.json'), 'utf8'));
const PAYLOAD = fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8');

const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
const wait = ms => new Promise(r => setTimeout(r, ms));

/* the shape the betting job publishes: a call on every game of the week it will predict */
function withPicks(st) {
  const s = JSON.parse(JSON.stringify(st));
  const graded = new Set(Object.keys(s.processed));
  const wk = Math.min(...s.schedule.filter(g => !graded.has(g.game_id)).map(g => +g.week));
  s.picks = {};
  for (const g of s.schedule) {
    if (+g.week !== wk || graded.has(g.game_id)) continue;
    s.picks[g.game_id] = { pick: g.home_team, pHome: 0.62, conf: 0.62, margin: 3.1 };
  }
  return { state: s, week: wk };
}

/* boot the page; resolves once the prop model says it is ready and the board has drawn */
function run(state, url = 'https://demon-x13.github.io/nfl-hub/pickems/') {
  return new Promise(resolve => {
    const errs = [], fetched = [];
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        w.addEventListener('error', e => errs.push(e.message));
        w.fetch = u => { const s = String(u); fetched.push(s.replace(/\?.*$/, ''));
          if (s.includes('state.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) });
          if (s.includes('payload.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(PAYLOAD) });
          return Promise.resolve({ ok: false, status: 404 }); };
        w.document.addEventListener('app-ready', () => setTimeout(() => resolve({ w, d: w.document, errs, fetched }), 300));
      } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, errs, fetched, timedOut: true }), 20000);
  });
}

(async () => {
  const { state, week } = withPicks(STATE);
  const { w, d, errs, fetched, timedOut } = await run(state);

  chk(!timedOut, 'the prop model never said app-ready');
  chk(errs.length === 0, 'the page threw: ' + errs.join('; '));
  chk(d.title === "X NFL Pick'ems" && /X NFL Pick'ems/.test(txt(d.querySelector('h1'))), 'the page is not headed Pick\'ems');

  /* the tab bar: the two tabs built so far, Pick'ems open, the rest of the prop model in the
     page but not on the bar */
  const tabs = [...d.querySelectorAll('#tabs button')].map(b => b.textContent.trim());
  chk(tabs.join('|') === "Pick'ems|Props", 'tabs are ' + tabs.join('|'));
  chk(!d.getElementById('tab-pickems').hidden && d.getElementById('tab-slate').hidden, 'Pick\'ems is not the open tab');
  for (const id of ['tab-slate', 'tab-parlay', 'tab-track', 'tab-week', 'tab-backup'])
    chk(!!d.getElementById(id), `the prop model's ${id} section is missing, and its listeners with it`);
  chk(!d.getElementById('buildTag'), 'the build tag is on the public header');

  /* ---- Pick'ems ---- */
  const cards = [...d.querySelectorAll('.pk-game')];
  const want = state.schedule.filter(g => +g.week === week).length;
  chk(cards.length === want, `expected ${want} games in week ${week}, got ${cards.length}`);
  chk(+d.getElementById('pkWeek').value === week, 'the board did not open on the week with calls to show');
  chk(/Week \d+ \d+–\d+/.test(txt(d.getElementById('pkWeekRec'))), 'no week record: ' + txt(d.getElementById('pkWeekRec')));
  chk(/Season \d+–\d+/.test(txt(d.getElementById('pkSeasonRec'))), 'no season record');

  /* the row is the betting app's: header, split bar, band, final-score cell */
  chk(!!d.querySelector('.pk-gamehead') && /Date.*Matchup.*Win probability.*Confidence.*Final score/.test(txt(d.querySelector('.pk-gamehead'))),
    'the column header is not the betting board\'s');
  chk(cards.every(c => c.querySelector('.pk-probrow .pk-prob .pk-a') && c.querySelector('.pk-probrow .pk-prob .pk-h')), 'a game is missing its split bar');
  chk(cards.every(c => /HIGH|MED|LOW|50\/50/.test(txt(c.querySelector('.pk-tier')))), 'a game is missing its confidence band');
  chk(cards.every(c => c.querySelector('.pk-ttag.pk-win')), 'no pick is marked on a matchup tag');
  chk(!d.querySelector('#tab-pickems .ttag'), 'a betting tag came through in the prop model\'s class names');
  chk(cards.every(c => c.querySelector('.pk-result')), 'a game is missing its final-score cell');
  const pend = cards.filter(c => /0 : 0/.test(txt(c.querySelector('.pk-result')))).length;
  const done = cards.filter(c => / won /.test(txt(c.querySelector('.pk-result')))).length;
  chk(pend + done === cards.length, `every result cell is either 0 : 0 or a result: ${pend} + ${done} of ${cards.length}`);
  const graded = cards.find(c => c.classList.contains('pk-played'));
  if (graded) chk(!!graded.querySelector('.pk-matchup .pk-res') && /Pick (hit|missed)/.test(txt(graded.querySelector('.pk-result'))),
    'a graded game shows no tick or cross and no Pick hit/missed');

  /* nothing is open until a game is clicked */
  chk(!d.querySelector('.pk-gbody'), 'a game was open before anything was clicked');

  /* open one and the prop model prices both sides, off its own state */
  const first = cards[0];
  first.click();
  await wait(60);
  const body = first.querySelector('.pk-gbody');
  chk(!!body, 'clicking a game opened nothing');
  const rows = body ? [...body.querySelectorAll('tr')] : [];
  chk(rows.length === 4, `expected to win and to cover for both sides, got ${rows.length} row(s): ${txt(body)}`);
  chk(rows.filter(r => /To win/.test(txt(r))).length === 2, 'both sides should have a to-win price');
  chk(rows.filter(r => /To cover/.test(txt(r))).length === 2, 'both sides should have a to-cover price');
  const pcts = rows.filter(r => /To win/.test(txt(r))).map(r => parseInt(txt(r.querySelector('.pk-pct')), 10));
  chk(Math.abs(pcts[0] + pcts[1] - 100) <= 1, `the two win chances do not add up: ${pcts.join(' + ')}`);
  chk(rows.every(r => /[-+]\d+est\./.test(txt(r).replace(/\s/g, ''))), 'a row is missing our own price');
  /* the same game priced by the prop model's own gameBet, on the same row */
  const gid = first.dataset.game, row = w.eval('S').sched.find(x => x.id === gid);
  const own = w.gameBet(row, row.a, 'ml');
  chk(own && Math.round(own.p * 100) === pcts[0], `the board's away win chance ${pcts[0]} is not the prop model's ${own && Math.round(own.p * 100)}`);
  chk(first.classList.contains('pk-open'), 'the card did not mark itself open');

  /* clicking inside the prices does not toggle; clicking the row does */
  first.querySelector('.pk-gbody').click();
  await wait(60);
  chk(!!first.querySelector('.pk-gbody'), 'clicking inside the prices closed them');
  first.click();
  await wait(60);
  chk(!first.querySelector('.pk-gbody'), 'clicking again did not close the game');

  /* ---- Props: the prop model's Games tab, as it is on its own site ---- */
  const propsBtn = [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'slate');
  propsBtn.click();
  await wait(60);
  chk(!d.getElementById('tab-slate').hidden && d.getElementById('tab-pickems').hidden, 'the Props tab did not open');
  chk(w.location.hash === '#slate', 'the Props tab did not become the address: ' + w.location.hash);
  const slateRows = d.querySelectorAll('#gamesList .game');
  chk(slateRows.length > 0, 'the Props tab has no games');
  const wk = +d.getElementById('weekSel').value;
  chk(slateRows.length === w.eval('S').sched.filter(g => +g.w === wk).length, `Props shows ${slateRows.length} games for week ${wk}`);
  for (const id of ['weekSel', 'weekRec', 'seasonRec', 'slateNow', 'slateEvery', 'slateStamp'])
    chk(!!d.getElementById(id), `the Games tab's ${id} is missing`);
  chk(/Week \d+ \d+–\d+/.test(txt(d.getElementById('weekRec'))), 'the prop model\'s week record is not drawn: ' + txt(d.getElementById('weekRec')));
  chk(txt(d.querySelector('#tab-slate .gamehead')).includes('Biggest projections'), 'the Games column header is not the prop model\'s');
  /* open a game: the prop model's own modal, with players in it */
  slateRows[0].click();
  await wait(100);
  const modal = d.getElementById('gameModal');
  chk(modal && !modal.hidden, 'clicking a game on the Props tab did not open the game');
  chk(txt(d.getElementById('gameView')).length > 200, 'the game modal is empty');
  chk(typeof w.closeGame === 'function', 'the prop model\'s closeGame is not on the page');
  w.closeGame();
  await wait(50);
  chk(modal.hidden, 'the game did not close');
  /* the Games tab's own state saved, under the prop model's own key */
  chk(!!w.localStorage.getItem('props_2026_v1'), 'the prop model did not save its state under its own key');

  /* back to the board by address */
  w.location.hash = '#pickems';
  await wait(60);
  chk(!d.getElementById('tab-pickems').hidden && d.getElementById('tab-slate').hidden, 'setting the address did not switch tabs');

  /* the page reads the two sites and bakes nothing */
  chk(fetched.includes('../betting/state.json') && fetched.includes('../props/data/payload.json'), 'the page did not fetch both sites: ' + fetched.join(', '));
  chk(!/const MKT=\{"|const PAY=\{grid:/.test(HTML), 'the page bakes data in, so it goes stale between builds');
  chk(!/api\.github\.com/.test(HTML), 'the page talks to the GitHub API');

  /* opened on #slate, the Props tab is the one showing */
  const s2 = await run(state, 'https://demon-x13.github.io/nfl-hub/pickems/#slate');
  chk(s2.errs.length === 0, 'the page threw opening on #slate: ' + s2.errs.join('; '));
  chk(!s2.d.getElementById('tab-slate').hidden && s2.d.getElementById('tab-pickems').hidden, 'opening on #slate did not open the Props tab');
  chk(s2.d.querySelectorAll('#gamesList .game').length > 0, 'opened on #slate, the Props tab has no games');

  /* a state with no published calls still draws the board */
  const bare = JSON.parse(JSON.stringify(STATE)); delete bare.picks;
  const b = await run(bare);
  chk(b.errs.length === 0, 'the page threw without published calls: ' + b.errs.join('; '));
  chk(b.d.querySelectorAll('.pk-game').length > 0, 'no board without published calls');

  console.log(`${checks} checks, ${fails.length} failures`);
  fails.forEach(f => console.log('  FAIL:', f));
  process.exit(fails.length ? 1 : 0);
})();
