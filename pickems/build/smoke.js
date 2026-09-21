/* Check the built Pick'ems page.
 *
 *   node pickems/build/smoke.js        (from the hub root)
 *
 * Drives the real page against a stubbed state.json: the board, the call on each game, and
 * the prop model's prices that open underneath one. jsdom is borrowed from props/build, so
 * this needs no install of its own.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const HTML = fs.readFileSync(path.join(ROOT, 'pickems', 'index.html'), 'utf8');
const STATE = JSON.parse(fs.readFileSync(path.join(ROOT, 'betting', 'state.json'), 'utf8'));

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

function run(state) {
  return new Promise(resolve => {
    const errs = [];
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true,
      url: 'https://demon-x13.github.io/nfl-hub/pickems/',
      beforeParse(w) {
        w.addEventListener('error', e => errs.push(e.message));
        w.fetch = u => String(u).includes('state.json')
          ? Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) })
          : Promise.resolve({ ok: false, status: 404 });
      } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, errs }), 700);
  });
}

(async () => {
  const { state, week } = withPicks(STATE);
  const { d, errs } = await run(state);

  chk(errs.length === 0, 'the page threw: ' + errs.join('; '));
  const cards = [...d.querySelectorAll('.game')];
  const want = state.schedule.filter(g => +g.week === week).length;
  chk(cards.length === want, `expected ${want} games in week ${week}, got ${cards.length}`);
  chk(+d.getElementById('weekSel').value === week, 'the page did not open on the week with calls to show');
  chk(/Week \d+ \d+–\d+/.test(txt(d.getElementById('weekRec'))), 'no week record: ' + txt(d.getElementById('weekRec')));
  chk(/Season \d+–\d+/.test(txt(d.getElementById('seasonRec'))), 'no season record');

  /* the row is the betting app's: header, split bar, band, final-score cell */
  chk(!!d.querySelector('.gamehead') && /Date.*Matchup.*Win probability.*Confidence.*Final score/.test(txt(d.querySelector('.gamehead'))),
    'the column header is not the betting board\'s');
  chk(cards.every(c => c.querySelector('.probrow .prob .a') && c.querySelector('.probrow .prob .h')), 'a game is missing its split bar');
  chk(cards.every(c => /HIGH|MED|LOW|50\/50/.test(txt(c.querySelector('.tier')))), 'a game is missing its confidence band');
  chk(cards.every(c => c.querySelector('.ttag.win')), 'no pick is marked on a matchup tag');
  chk(cards.every(c => c.querySelector('.result')), 'a game is missing its final-score cell');
  const pend = cards.filter(c => /0 : 0/.test(txt(c.querySelector('.result')))).length;
  const done = cards.filter(c => / won /.test(txt(c.querySelector('.result')))).length;
  chk(pend + done === cards.length, `every result cell is either 0 : 0 or a result: ${pend} + ${done} of ${cards.length}`);
  const graded = cards.find(c => c.classList.contains('played'));
  if (graded) chk(!!graded.querySelector('.matchup .res') && /Pick (hit|missed)/.test(txt(graded.querySelector('.result'))),
    'a graded game shows no tick or cross and no Pick hit/missed');

  /* nothing is open until a game is clicked */
  chk(!d.querySelector('.gbody'), 'a game was open before anything was clicked');

  /* open one and the prop model prices both sides */
  const first = cards[0];
  first.click();
  await wait(60);
  const body = first.querySelector('.gbody');
  chk(!!body, 'clicking a game opened nothing');
  const rows = body ? [...body.querySelectorAll('tr')] : [];
  chk(rows.length === 4, `expected to win and to cover for both sides, got ${rows.length} row(s)`);
  chk(rows.filter(r => /To win/.test(txt(r))).length === 2, 'both sides should have a to-win price');
  chk(rows.filter(r => /To cover/.test(txt(r))).length === 2, 'both sides should have a to-cover price');
  /* the two to-win chances are the two sides of one game and have to add up */
  const pcts = rows.filter(r => /To win/.test(txt(r))).map(r => parseInt(txt(r.querySelector('.pct')), 10));
  chk(Math.abs(pcts[0] + pcts[1] - 100) <= 1, `the two win chances do not add up: ${pcts.join(' + ')}`);
  chk(rows.every(r => /[-+]\d+est\./.test(txt(r).replace(/\s/g, ''))), 'a row is missing our own price');
  chk(first.classList.contains('open'), 'the card did not mark itself open');

  /* clicking inside the prices does not toggle; clicking the row does */
  first.querySelector('.gbody').click();
  await wait(60);
  chk(!!first.querySelector('.gbody'), 'clicking inside the prices closed them');
  first.click();
  await wait(60);
  chk(!first.querySelector('.gbody'), 'clicking again did not close the game');

  /* the page reads the two sites and writes nothing */
  chk(!/localStorage\.setItem|localStorage\.removeItem/.test(HTML), 'the page writes to local storage');
  chk(!/api\.github\.com/.test(HTML), 'the page talks to the GitHub API');
  chk((HTML.match(/fetch\(/g) || []).length === 1, 'the page should make exactly one fetch, for state.json');

  /* a state with no published calls still draws the board */
  const bare = JSON.parse(JSON.stringify(STATE)); delete bare.picks;
  const b = await run(bare);
  chk(b.errs.length === 0, 'the page threw without published calls: ' + b.errs.join('; '));
  chk(b.d.querySelectorAll('.game').length > 0, 'no board without published calls');

  console.log(`${checks} checks, ${fails.length} failures`);
  fails.forEach(f => console.log('  FAIL:', f));
  process.exit(fails.length ? 1 : 0);
})();
