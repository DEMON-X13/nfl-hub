/* Check the built X NFL Bets and Stats page (nflbets/).
 *
 *   node nflbets/build/smoke.js        (from the hub root)
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
const HTML = fs.readFileSync(path.join(ROOT, 'nflbets', 'index.html'), 'utf8');
const STATE = JSON.parse(fs.readFileSync(path.join(ROOT, 'betting', 'state.json'), 'utf8'));
const PARLAYS = fs.readFileSync(path.join(ROOT, 'liveparlays', 'parlays.json'), 'utf8');
const PAYLOAD = fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8');
const ELO_P = fs.readFileSync(path.join(ROOT, 'elo', 'data', 'players.json'), 'utf8');
const ELO_M = fs.readFileSync(path.join(ROOT, 'elo', 'data', 'model.json'), 'utf8');

const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
const wait = ms => new Promise(r => setTimeout(r, ms));
const TEAM = t => ({ LA: 'Rams', KC: 'Chiefs', IND: 'Colts', NYG: 'Giants' }[t] || t);

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

/* what ESPN's scoreboard says about the week: for the games the job has not graded, the
   first is over (the home side won 27-20), the second is on (the away side leads 14-10 in
   the third quarter), the rest have not kicked off. Graded games are final. */
function scoreboard(state, week) {
  const games = state.schedule.filter(g => +g.week === week);
  let n = 0;
  return { events: games.map(g => {
    const graded = !!state.processed[g.game_id];
    const kind = graded ? 'final' : (n++ === 0 ? 'post' : (n === 2 ? 'in' : 'pre'));
    const hs = kind === 'final' ? g.home_score : kind === 'post' ? 27 : kind === 'in' ? 10 : 0;
    const as = kind === 'final' ? g.away_score : kind === 'post' ? 20 : kind === 'in' ? 14 : 0;
    const st = kind === 'in' ? { state: 'in', shortDetail: 'Q3 5:44' } : kind === 'pre' ? { state: 'pre', shortDetail: '8:15 PM' } : { state: 'post', shortDetail: 'Final' };
    return { id: 'e' + g.game_id, date: g.gameday + 'T17:00Z', status: { type: st }, competitions: [{ competitors: [
      { homeAway: 'home', team: { abbreviation: g.home_team }, score: String(hs) },
      { homeAway: 'away', team: { abbreviation: g.away_team }, score: String(as) } ] }] };
  }) };
}

/* boot the page; resolves once the prop model says it is ready and the board has drawn */
/* a shared store for the sync layer, as a Firebase Realtime Database answers over REST: the
   node at <url> holds {rev, at, doc}, <url>/rev.json is the tag alone, <url>/doc.json the
   document, and a PUT to <url>.json replaces the node. Two devices are two runs on one store. */
const STORE_URL = 'https://store.test/nflhub';
function mkStore() { return { node: null, puts: [], revGets: 0, docGets: 0, fail: false }; }
const res = (status, body) => Promise.resolve({ ok: status < 300, status, json: async () => body });
function storeFetch(store, s, o) {
  if (/(^|\/)sync\.json/.test(s)) return res(200, { url: STORE_URL });
  if (!s.startsWith(STORE_URL)) return null;
  if (store.fail) return res(500, null);
  const p = s.slice(STORE_URL.length).replace(/\?.*$/, '');
  if (o && o.method === 'PUT') { const b = JSON.parse(o.body); store.node = b; store.puts.push(b); return res(200, null); }
  if (p === '/rev.json') { store.revGets++; return res(200, store.node ? store.node.rev : null); }
  if (p === '/doc.json') { store.docGets++; return res(200, store.node ? store.node.doc : null); }
  return res(404, null);
}
const storeDoc = store => store.node ? JSON.parse(store.node.doc.json) : null;

function run(state, url = 'https://demon-x13.github.io/nfl-hub/nflbets/', espn = null, noState = false, { sync = null, seed = null } = {}) {
  return new Promise(resolve => {
    const errs = [], fetched = [];
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        w.addEventListener('error', e => errs.push(e.message));
        if (seed) seed(w);
        w.fetch = (u, o) => { const s = String(u); fetched.push(s.replace(/\?.*$/, ''));
          if (sync) { const r = storeFetch(sync, s, o); if (r) return r; }
          if (s.includes('state.json')) return noState
            ? Promise.resolve({ ok: false, status: 404 })
            : Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) });
          if (s.includes('payload.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(PAYLOAD) });
          if (s.includes('parlays.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(PARLAYS) });
          if (s.includes('elo/data/players.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_P) });
          if (s.includes('elo/data/model.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(ELO_M) });
          if (espn && s.includes('/scoreboard')) { const wk = +(s.match(/week=(\d+)/) || [])[1]; return Promise.resolve({ ok: true, status: 200, json: async () => espn(wk) }); }
          return Promise.resolve({ ok: false, status: 404 }); };
        w.document.addEventListener('app-ready', () => setTimeout(() => resolve({ w, d: w.document, errs, fetched }), 300));
      } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, errs, fetched, timedOut: true }), 20000);
  });
}

(async () => {
  const { state, week } = withPicks(STATE);
  const { w, d, errs, fetched, timedOut } = await run(state, undefined, wk => scoreboard(state, wk));
  await wait(700);                                  /* the scoreboard is read once on load, after the prop model is up */

  chk(!timedOut, 'the prop model never said app-ready');
  chk(errs.length === 0, 'the page threw: ' + errs.join('; '));
  chk(d.title === 'X NFL Bets and Stats' && /X NFL Bets and Stats/.test(txt(d.querySelector('h1'))), 'the page is not headed X NFL Bets and Stats');

  /* the tab bar: the two tabs built so far, Pick'ems open, the rest of the prop model in the
     page but not on the bar */
  const tabs = [...d.querySelectorAll('#tabs button')].map(b => b.textContent.trim());
  chk(tabs.join('|') === "Pick'ems|Props|Parlay Builders|Power Ratings|Pick'em Record|Prop Record|Bet Log|Player Elo", 'tabs are ' + tabs.join('|'));
  chk(!d.querySelector('header a'), 'the header carries a link');
  chk(!d.getElementById('tab-pickems').hidden && d.getElementById('tab-slate').hidden, 'Pick\'ems is not the open tab');
  for (const id of ['tab-slate', 'tab-parlay', 'tab-track', 'tab-week', 'tab-backup'])
    chk(!!d.getElementById(id), `the prop model's ${id} section is missing, and its listeners with it`);
  chk(/^app v\d+ \u00b7 \d{4}-\d{2}-\d{2}$/.test(txt(d.getElementById('buildTag'))),
    'the page does not say which build it is: ' + txt(d.getElementById('buildTag')));

  /* ---- Pick'ems ---- */
  let cards = [...d.querySelectorAll('.pk-game')];
  const want = state.schedule.filter(g => +g.week === week).length;
  chk(cards.length === want, `expected ${want} games in week ${week}, got ${cards.length}`);
  chk(+d.getElementById('pkWeek').value === week, 'the board did not open on the week with calls to show');
  chk(/Week \d+ \d+–\d+/.test(txt(d.getElementById('pkWeekRec'))), 'no week record: ' + txt(d.getElementById('pkWeekRec')));
  chk(/Season \d+–\d+/.test(txt(d.getElementById('pkSeasonRec'))), 'no season record');

  /* the row is the betting app's: header, split bar, band, final-score cell */
  chk(!!d.querySelector('.pk-gamehead') && /Date.*Matchup.*Win probability.*Confidence.*Score prediction.*Final score/.test(txt(d.querySelector('.pk-gamehead'))),
    'the column header is not the betting board\'s');
  chk(cards.every(c => c.querySelector('.pk-probrow .pk-prob .pk-a') && c.querySelector('.pk-probrow .pk-prob .pk-h')), 'a game is missing its split bar');
  chk(cards.every(c => /HIGH|MED|LOW|50\/50/.test(txt(c.querySelector('.pk-tier')))), 'a game is missing its confidence band');
  chk(cards.every(c => c.querySelector('.pk-ttag.pk-win')), 'no pick is marked on a matchup tag');
  chk(!d.querySelector('#tab-pickems .ttag'), 'a betting tag came through in the prop model\'s class names');
  chk(cards.every(c => c.querySelector('.pk-result')), 'a game is missing its final-score cell');
  /* the score prediction: the model's margin split around the book's total, whole points */
  const PAYLOAD = JSON.parse(fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8'));
  let predOk = 0, predAll = 0;
  for (const c of cards) {
    const g = state.schedule.find(x => x.game_id === c.dataset.game), pk = state.picks[g.game_id] || state.processed[g.game_id];
    const row = PAYLOAD.sched.find(x => x.id === g.game_id);
    if (!pk || !row || row.tot == null) continue;
    predAll++;
    let hs = Math.round((row.tot + pk.margin) / 2), as = Math.round((row.tot - pk.margin) / 2);
    if (hs === as) { if (pk.pick === g.home_team) hs++; else as++; }
    if (txt(c.querySelector('.pk-pred .pk-psc')) === `${as}–${hs}`) predOk++;
  }
  chk(predAll > 0 && predOk === predAll, `score predictions are the model's margin around the book's total: ${predOk} of ${predAll}`);
  const pend = cards.filter(c => /0 : 0/.test(txt(c.querySelector('.pk-result')))).length;
  const done = cards.filter(c => / won /.test(txt(c.querySelector('.pk-result')))).length;
  const on = cards.filter(c => / leading |Tied /.test(txt(c.querySelector('.pk-result')))).length;
  chk(pend + done + on === cards.length, `every result cell is 0 : 0, a result or a game on now: ${pend} + ${done} + ${on} of ${cards.length}`);
  /* the scoreboard was read on load: a game the job has not reached shows what ESPN says */
  const ungraded = state.schedule.filter(g => +g.week === week && !state.processed[g.game_id]);
  chk(/scores \d/.test(txt(d.getElementById('pkStamp'))), 'the Pick\'ems stamp does not say when the scoreboard was read: ' + txt(d.getElementById('pkStamp')));
  if (ungraded.length) {
    const g0 = ungraded[0], c0 = cards.find(c => c.dataset.game === g0.game_id);
    chk(new RegExp(`${g0.home_team} won 20–27`).test(txt(c0.querySelector('.pk-result'))) && /Pick hit/.test(txt(c0.querySelector('.pk-result'))),
      'a game finished on the scoreboard does not read "HOME won 20–27 / Pick hit": ' + txt(c0.querySelector('.pk-result')));
    chk(!!c0.querySelector('.pk-tw.pk-home .pk-res.pk-ok') && c0.classList.contains('pk-played'), 'the scoreboard winner carries no tick');
    chk(c0.querySelector('.pk-result .pk-mwin').classList.contains('pk-ok'), 'a landed call is not green');
  }
  if (ungraded.length > 1) {
    const g1 = ungraded[1], c1 = cards.find(c => c.dataset.game === g1.game_id);
    chk(new RegExp(`${g1.away_team} leading 14–10`).test(txt(c1.querySelector('.pk-result'))) && /Q3 5:44/.test(txt(c1.querySelector('.pk-result'))),
      'a game on now does not read "AWAY leading 14–10 / Q3 5:44": ' + txt(c1.querySelector('.pk-result')));
    chk(c1.querySelector('.pk-result .pk-mwin').classList.contains('pk-bad') && !c1.querySelector('.pk-res'), 'a call behind is not red, or a game on now carries a mark');
  }
  /* the button reads again (the Live Parlays section reads the scoreboard too, so count the delta) */
  const sbReads = () => fetched.filter(u => u.includes('/scoreboard')).length;
  const sbBefore = sbReads();
  d.getElementById('pkNow').click();
  await wait(200);
  chk(sbReads() === sbBefore + 1, `Refresh scores did not read the scoreboard again: ${sbBefore} -> ${sbReads()}`);
  cards = [...d.querySelectorAll('.pk-game')];        /* the board is redrawn on every read */
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
  chk(!!body && !!body.querySelector('.gbets') && /Game bets/.test(txt(body.querySelector('.gbets h2'))), 'the opened game is not the prop model\'s Game bets card');
  chk(!body || !body.querySelector('.card'), 'the card chrome should come off inside the row');
  const rows = body ? [...body.querySelectorAll('tr')] : [];
  chk(rows.length === 4, `expected to win and to cover for both sides, got ${rows.length} row(s): ${txt(body)}`);
  chk(rows.filter(r => /To win/.test(txt(r))).length === 2, 'both sides should have a to-win price');
  chk(rows.filter(r => /To cover/.test(txt(r))).length === 2, 'both sides should have a to-cover price');
  const pcts = rows.filter(r => /To win/.test(txt(r))).map(r => parseInt(txt(r.querySelector('.pct')), 10));
  chk(Math.abs(pcts[0] + pcts[1] - 100) <= 1, `the two win chances do not add up: ${pcts.join(' + ')}`);
  chk(rows.every(r => /[-+]\d+est\./.test(txt(r).replace(/\s/g, ''))), 'a row is missing our own price');
  /* the same game priced by the prop model's own gameBet, on the same row */
  const gid = first.dataset.game, row = w.eval('S').sched.find(x => x.id === gid);
  const own = w.gameBet(row, row.a, 'ml');
  chk(own && Math.round(own.p * 100) === pcts[0], `the board's away win chance ${pcts[0]} is not the prop model's ${own && Math.round(own.p * 100)}`);
  chk(first.classList.contains('pk-open'), 'the card did not mark itself open');

  /* a line on a game that has not kicked off can be ticked onto the prop model's parlay */
  const started = gid => w.eval('gameStarted')(w.eval('S').sched.find(x => x.id === gid));
  chk(cards.every(c => started(c.dataset.game) === !c.querySelector('input[data-leg]') || !c.querySelector('.pk-gbody')), 'boxes and kickoffs disagree');
  const openCard = cards.find(c => !started(c.dataset.game));
  if (openCard) {
    if (openCard !== first) { first.click(); await wait(30); openCard.click(); await wait(60); }
    const boxes = [...openCard.querySelectorAll('input[data-leg]')];
    chk(boxes.length === 4 && boxes.every(b => !b.checked), `a game not yet kicked off should offer four unticked lines, got ${boxes.length}`);
    chk(/Tick one and it joins the parlay/.test(txt(openCard.querySelector('.gbets'))) && !!openCard.querySelector('.pk-tolegs a[href="#parlay"]'), 'no note pointing at Parlay Builders');
    const key = boxes[0].dataset.leg;
    boxes[0].click();
    await wait(60);
    const leg = w.eval('S').parlay[key];
    chk(!!leg && leg.grp === 'TEAM' && leg.stat === 'ml' && leg.label === 'To win', 'ticking To win did not put a team leg on the parlay: ' + JSON.stringify(leg));
    const box2 = openCard.querySelector(`input[data-leg="${key}"]`);
    chk(box2 && box2.checked && box2.closest('tr').classList.contains('on'), 'the ticked row does not show as on');
    chk(/1 from this game is on the parlay/.test(txt(openCard.querySelector('.pk-tolegs'))), 'the note does not count the leg');
    chk(/1-leg parlay/.test(txt(d.getElementById('parlayBody'))) && txt(d.getElementById('parlayBody')).includes(leg.name), 'the Parlay Builders tab does not show the leg');
    box2.click();
    await wait(60);
    chk(!w.eval('S').parlay[key], 'unticking did not take the leg off the parlay');
    chk(/Parlay Builder/.test(txt(d.getElementById('parlayBody'))), 'the builder still shows a parlay after unticking');
    if (openCard !== first) { openCard.click(); await wait(30); first.click(); await wait(60); }
  } else chk(cards.every(c => started(c.dataset.game)), 'no game offered lines although one has not kicked off');
  const lockedCard = cards.find(c => started(c.dataset.game));
  if (lockedCard) { const wasOpen = lockedCard === first; if (!wasOpen) { lockedCard.click(); await wait(60); }
    chk(!lockedCard.querySelector('input[data-leg]') && !lockedCard.querySelector('.pk-tolegs') && /How each side did/.test(txt(lockedCard.querySelector('.gbets'))), 'a game that kicked off still offers lines');
    /* resolved the way the game's own page resolves it: a tick or a cross on every line once the score is in */
    const scored = w.eval('hasScore')(w.eval('S').sched.find(x => x.id === lockedCard.dataset.game));
    const marks = [...lockedCard.querySelectorAll('td.pick .res')];
    chk(marks.length === 4, `a kicked-off game should mark four lines, got ${marks.length}`);
    if (scored) chk(marks.every(m => /win|loss/.test(m.className) || /push/.test(txt(m))) && lockedCard.querySelectorAll('tr.hit, tr.miss').length >= 2, 'a game with a score is not marked won or lost line by line');
    else chk(marks.every(m => txt(m) === '–'), 'a game without a score should show dashes, not results');
    if (!wasOpen) { lockedCard.click(); await wait(30); } }

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
  for (const id of ['weekSel', 'weekRec', 'seasonRec', 'slateNow'])
    chk(!!d.getElementById(id), `the Games tab's ${id} is missing`);
  for (const id of ['slateEvery', 'slateDot'])
    chk(!d.getElementById(id), `the Games tab's ${id} should be gone`);
  chk(txt(d.getElementById('slateStamp')) === '', 'the Props stamp says something before the scoreboard is read: ' + txt(d.getElementById('slateStamp')));
  d.getElementById('slateNow').click();
  await wait(300);
  chk(/scores \d/.test(txt(d.getElementById('slateStamp'))), 'Refresh scores on the Props tab left no stamp: ' + txt(d.getElementById('slateStamp')));
  chk(/Week \d+ \d+–\d+/.test(txt(d.getElementById('weekRec'))), 'the prop model\'s week record is not drawn: ' + txt(d.getElementById('weekRec')));
  chk(txt(d.querySelector('#tab-slate .gamehead')).includes('Biggest projections'), 'the Games column header is not the prop model\'s');
  /* open a game: the prop model's own modal, with players in it */
  slateRows[0].click();
  await wait(100);
  const modal = d.getElementById('gameModal');
  chk(modal && !modal.hidden, 'clicking a game on the Props tab did not open the game');
  chk(txt(d.getElementById('gameView')).length > 200, 'the game modal is empty');
  /* a game here is its players: the Game bets card is the Pick'ems tab's job now */
  chk(!d.querySelector('#gameView .gbets') && !/Game bets/.test(txt(d.getElementById('gameView'))), 'the game view still carries the Game bets card');
  chk(d.querySelectorAll('#gameView .plrbtn').length > 0, 'the game view shows no players');
  chk(typeof w.closeGame === 'function', 'the prop model\'s closeGame is not on the page');
  w.closeGame();
  await wait(50);
  chk(modal.hidden, 'the game did not close');
  /* the Games tab's own state saved, under the prop model's own key */
  chk(!!w.localStorage.getItem('props_2026_v1'), 'the prop model did not save its state under its own key');

  /* ---- Parlay Builders: the prop model's Parlay Builder, suggestions, saved parlays and all ---- */
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'parlay').click();
  await wait(60);
  chk(!d.getElementById('tab-parlay').hidden && d.getElementById('tab-slate').hidden, 'the Parlay Builders tab did not open');
  chk(w.location.hash === '#parlay', 'the Parlay Builders tab did not become the address');
  const pb = d.getElementById('parlayBody');
  /* the suggestions are behind a button in a window, so the builder heads the tab */
  chk(!d.getElementById('suggCard') && !!d.getElementById('suggOpen'), 'the suggestions are still taking up the tab');
  chk(/Parlay Builder|-leg parlay/.test(txt(pb.firstElementChild.querySelector('h2'))), 'the builder is not the first card: ' + txt(pb.firstElementChild));
  d.getElementById('suggOpen').click();
  await wait(60);
  chk(!d.getElementById('suggModal').hidden && !!d.querySelector('#suggView #suggCard'), 'the suggestions window did not open');
  d.getElementById('suggClose').click();
  await wait(60);
  chk(d.getElementById('suggModal').hidden, 'the suggestions window would not close');
  chk(!/one line per stat per player|pulled from the odds market twice a week/.test(txt(pb)) && !pb.querySelector('.card ul'), 'the how-to list is still under the builder');
  /* ---- Live Parlays: the live page's section, where the Saved parlays card was ---- */
  const lp = d.getElementById('lpCard');
  chk(!!lp && lp.closest('#tab-parlay') && lp.previousElementSibling && lp.previousElementSibling.id === 'parlayBody', 'the Live Parlays section is not under the builder');
  chk(!d.getElementById('savedCard') && !d.getElementById('betParlays'), 'the old Saved parlays or betting-slips card is still drawn beside the section');
  chk(!!lp.querySelector('#now') && !!lp.querySelector('#stamp') && !!lp.querySelector('#app'), 'the section is missing its controls');
  const fileCount = JSON.parse(PARLAYS).parlays.length;
  chk(lp.querySelectorAll('.savedp').length >= fileCount, `the section shows ${lp.querySelectorAll('.savedp').length} parlays; the file alone holds ${fileCount}`);
  chk([...lp.querySelectorAll('.savedp .pill')].some(x => /in the repository/.test(txt(x))), 'the file parlays are not labelled');
  /* a saved parlay is watched the moment it is saved: no sending */
  { const S = w.eval('S'); const before = lp.querySelectorAll('.savedp').length;
    const g = S.sched.find(x => x.id === (cards[0] && cards[0].dataset.game)) || S.sched[0];
    S.saved.push({ id: 'live-smoke', saved: new Date().toISOString(), week: g.w, stake: 3, payout: 9, price: 200,
      legs: [{ gid: g.id, stat: 'ml', k: 0, side: 'over', main: false, name: TEAM(g.h), team: g.h, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win', p: 0.55, price: -120, src: 'real' }] });
    w.eval('save(); renderParlay();');
    await wait(80);
    chk(lp.querySelectorAll('.savedp').length === before + 1, 'a saved parlay did not appear in the section on its own');
    const mine = [...lp.querySelectorAll('.savedp')].find(c => /prop model/.test(txt(c.querySelector('.pill'))));
    chk(!!mine, 'the saved parlay is not labelled as the prop model\'s');
    /* and deleting it here deletes the parlay itself */
    mine.querySelector('[data-rm]').click();
    await wait(80);
    chk(!S.saved.some(p => p.id === 'live-smoke'), 'deleting a saved parlay in the section left it in the saved list');
    chk(lp.querySelectorAll('.savedp').length === before, 'the deleted parlay is still drawn');
    const st = JSON.parse(w.localStorage.getItem('live_parlays_v1') || '{}');
    chk(!(st.removed && st.removed['prop|live-smoke']), 'a deleted saved parlay was written to the device deletions instead of deleted'); }
  chk(!/\bplan\b/i.test(txt(pb)), 'a week plan section is in the builder');

  /* ---- Pick'em Record: the betting app's Records tab, in a frame filled when first opened ---- */
  /* the betting site has no pages: the app is inside this page, and nothing points outside it */
  chk(!/betting\/(admin|index)\.html/.test(HTML), 'the page still points at a betting page');
  chk(!fs.existsSync(path.join(ROOT, 'betting', 'admin.html')) && !fs.existsSync(path.join(ROOT, 'betting', 'index.html')) && !fs.existsSync(path.join(ROOT, 'props', 'admin.html')) && !fs.existsSync(path.join(ROOT, 'props', 'index.html')),
    'a retired props or betting page is back in the repository');
  const recFrame = d.querySelector('#tab-record iframe.pk-frame');
  chk(!!recFrame && !recFrame.getAttribute('srcdoc') && !recFrame.getAttribute('src'), 'the Records frame should not be filled before its tab is opened');
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'record').click();
  await wait(60);
  chk(!d.getElementById('tab-record').hidden && d.getElementById('tab-ratings').hidden, 'the Pick\'em Record tab did not open');
  chk(w.location.hash === '#record', 'the Pick\'em Record tab did not become the address');
  /* the frame is filled from the page itself, opened on its tab, reading the season from
     the betting site's data */
  const adminHtml = recFrame.getAttribute('srcdoc') || '';
  chk(adminHtml.length > 100000 && /const MODEL = /.test(adminHtml), 'the Records frame was not filled with the betting app: ' + adminHtml.length + ' chars');
  chk(/^<!DOCTYPE html>/i.test(adminHtml.trim()), 'the framed app does not start with its doctype');
  chk(/<head>\s*<script>window\.EMBED_TAB="record";window\.STATE_URL='\.\.\/betting\/state\.json';<\/script>/.test(adminHtml), 'the framed app is not told its tab and its season path');
  chk(/html\.embed header,html\.embed #tabs\{display:none\}/.test(adminHtml) && /classList\.add\('embed'\)/.test(adminHtml),
    'the framed app has no embed mode, so the frame would show its header and tab bar');
  chk(/data-tab="record"/.test(adminHtml), 'the framed app has no Records tab');
  chk(!/betting\/(admin|index)\.html/.test(adminHtml) && !/<\/script>[\s\S]*const BET_APP=/.test(adminHtml), 'the framed app carries a copy of itself or points at a betting page');

  /* ---- Prop Record: the prop model's Track Record, market and line-type filters and all ---- */
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'track').click();
  await wait(60);
  chk(!d.getElementById('tab-track').hidden && d.getElementById('tab-record').hidden, 'the Prop Record tab did not open');
  chk(w.location.hash === '#track', 'the Prop Record tab did not become the address');
  chk(/Track record/.test(txt(d.querySelector('#tab-track h2'))), 'the Track Record card is not there');
  chk(!!d.getElementById('trackMarket') && !!d.getElementById('trackKind') && d.getElementById('trackMarket').options.length > 1, 'the Track Record filters are missing or empty');
  chk(txt(d.getElementById('trackBody')).length > 100, 'the track record is empty');
  chk(!!d.querySelector('#trackBody table') || /Nothing graded yet/.test(txt(d.getElementById('trackBody'))), 'the track record has neither a table nor its empty note');

  /* ---- Power Ratings: the betting site's Power Ratings tab, framed ---- */
  const ratFrame = d.querySelector('#tab-ratings iframe.pk-frame');
  chk(!!ratFrame && !ratFrame.getAttribute('srcdoc'), 'the Power Ratings frame should not be filled before its tab is opened');
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'ratings').click();
  await wait(60);
  chk(!d.getElementById('tab-ratings').hidden && d.getElementById('tab-parlay').hidden, 'the Power Ratings tab did not open');
  chk(w.location.hash === '#ratings', 'the Power Ratings tab did not become the address');
  chk(/window\.EMBED_TAB="ratings";/.test(ratFrame.getAttribute('srcdoc') || ''), 'the Power Ratings frame is not opened on its tab');
  chk(/data-tab="ratings"/.test(adminHtml), 'the framed app has no Power Ratings tab');

  /* ---- Bet Log: the betting site's Bet Log tab, framed, on the same browser store ---- */
  const betFrame = d.querySelector('#tab-bets iframe.pk-frame');
  chk(!!betFrame && !betFrame.getAttribute('srcdoc'), 'the Bet Log frame should not be filled before its tab is opened');
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'bets').click();
  await wait(60);
  chk(!d.getElementById('tab-bets').hidden && d.getElementById('tab-track').hidden, 'the Bet Log tab did not open');
  chk(w.location.hash === '#bets', 'the Bet Log tab did not become the address');
  chk(/window\.EMBED_TAB="bets";/.test(betFrame.getAttribute('srcdoc') || ''), 'the Bet Log frame is not opened on its tab');
  chk(/data-tab="bets"/.test(adminHtml) && /id="betSave"/.test(adminHtml), 'the framed app has no Bet Log tab with its form');
  /* every framed tab is the same app on this page's origin, so one store: a bet logged in either place is in both */
  chk([...d.querySelectorAll('iframe.pk-frame')].every(f => /^(record|ratings|bets)$/.test(f.dataset.embed) && !f.dataset.src && !f.getAttribute('src')), 'a framed tab is not one of the betting app\'s tabs, or points outside the page');
  chk((HTML.match(/const BET_APP=/g) || []).length === 1, 'the betting app should be in the page exactly once');

  /* back to the board by address */
  w.location.hash = '#pickems';
  await wait(60);
  chk(!d.getElementById('tab-pickems').hidden && d.getElementById('tab-slate').hidden, 'setting the address did not switch tabs');

  /* the page reads the two sites and bakes nothing */
  chk(fetched.includes('../betting/state.json') && fetched.includes('../props/data/payload.json'), 'the page did not fetch both sites: ' + fetched.join(', '));
  chk(!/const MKT=\{"|const PAY=\{grid:/.test(HTML), 'the page bakes data in, so it goes stale between builds');
  chk(!/api\.github\.com/.test(HTML), 'the page talks to the GitHub API');

  /* opened on #slate, the Props tab is the one showing */
  const s2 = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#slate');
  chk(s2.errs.length === 0, 'the page threw opening on #slate: ' + s2.errs.join('; '));
  chk(!s2.d.getElementById('tab-slate').hidden && s2.d.getElementById('tab-pickems').hidden, 'opening on #slate did not open the Props tab');
  chk(s2.d.querySelectorAll('#gamesList .game').length > 0, 'opened on #slate, the Props tab has no games');

  /* a state with no published calls still draws the board */
  const bare = JSON.parse(JSON.stringify(STATE)); delete bare.picks;
  const b = await run(bare);
  chk(b.errs.length === 0, 'the page threw without published calls: ' + b.errs.join('; '));
  chk(b.d.querySelectorAll('.pk-game').length > 0, 'no board without published calls');

  /* the betting tabs do not depend on this tab's fetch: with state.json gone they still frame */
  const noState = await run(state, undefined, null, true);
  [...noState.d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'ratings').click();
  await wait(60);
  const ff = noState.d.querySelector('#tab-ratings iframe.pk-frame');
  chk(!!ff && /window\.EMBED_TAB="ratings";/.test(ff.getAttribute('srcdoc') || ''),
    'with the season unreachable the framed tabs should still be filled');
  /* and with no scoreboard to read, the stamp says so and the board stands */
  await wait(700);
  chk(/scores not loading/.test(txt(b.d.getElementById('pkStamp'))) && b.d.getElementById('pkStamp').classList.contains('bad'), 'an unreachable scoreboard is not said: ' + txt(b.d.getElementById('pkStamp')));
  chk(b.d.querySelectorAll('.pk-game').length > 0 && b.errs.length === 0, 'an unreachable scoreboard broke the board');

  /* ---- Player Elo: the ratings and the roster model, read from elo/data ---- */
  { const eloP = JSON.parse(ELO_P), eloM = JSON.parse(ELO_M);
    chk(fetched.includes('../elo/data/players.json') && fetched.includes('../elo/data/model.json'), 'the page did not read the Elo files');
    [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'elo').click();
    await wait(80);
    chk(!d.getElementById('tab-elo').hidden && w.location.hash === '#elo', 'the Player Elo tab did not open');
    const body = d.getElementById('peBody');
    chk(body.querySelectorAll('.card').length === 2, 'the Elo tab should draw its rankings and weights cards and nothing else: ' + body.querySelectorAll('.card').length);
    chk(![...body.querySelectorAll('h2')].some(h => /season by season/.test(txt(h))), 'the season-by-season card is still on the Elo tab');
    chk(!body.querySelector('.pe-calls') && ![...body.querySelectorAll('h2')].some(h => /^\d{4} so far/.test(txt(h))), 'the week\'s calls or the season record are still on the Elo tab; they live on Pick\'em Record');
    const posBtns = [...body.querySelectorAll('.pe-pos button')];
    chk(posBtns.map(b => b.dataset.pos).join() === eloM.groups.join(), 'the position picker does not list every rated group: ' + posBtns.map(b => b.dataset.pos).join());
    const rankRows = () => [...body.querySelectorAll('.card')].find(c => /Rankings/.test(txt(c.querySelector('h2')))).querySelectorAll('tbody tr');
    chk(rankRows().length === 10, 'the rankings should open on the top ten: ' + rankRows().length);
    chk(txt(rankRows()[0]).includes(eloP.groups.QB.top[0].name) && txt(rankRows()[0]).includes(String(eloP.groups.QB.top[0].elo)), 'the top quarterback is not first: ' + txt(rankRows()[0]));
    chk(rankRows()[0].querySelector('svg.pe-spark') !== null, 'the season trend line is missing');
    chk([...rankRows()].every(tr => tr.querySelector('svg.tierbadge') && /Challenger|Master|Diamond|Platinum|Gold|Silver|Bronze|Iron/.test(txt(tr))), 'a ranked player has no tier shield on the team scale');
    chk(!!d.querySelector('#peDefs svg defs linearGradient[id^="tg-"]'), 'the tier shields have no gradient definitions on the page');
    /* the sidelined are out of the rankings and listed where they would have stood */
    chk(eloM.groups.every(g => Array.isArray(eloP.groups[g].sidelined)), 'a group has no sidelined list');
    { const sideIds = new Set(eloM.groups.flatMap(g => eloP.groups[g].sidelined.map(x => x.id)));
      chk(eloM.groups.every(g => eloP.groups[g].top.every(r => !sideIds.has(r.id))), 'a sidelined player is still ranked');
      const withSide = eloM.groups.find(g => eloP.groups[g].sidelined.some(x => x.would_rank <= 10));
      if (withSide) { posBtns.find(b => b.dataset.pos === withSide).click(); await wait(40);
        const note = [...body.querySelectorAll('.pe-note')].find(p => /Not ranked/.test(txt(p)));
        const first = eloP.groups[withSide].sidelined.find(x => x.would_rank <= 10);
        chk(!!note && txt(note).includes(first.name) && txt(note).includes(first.why), 'the sidelined are not listed under the rankings: ' + (note ? txt(note).slice(0, 120) : 'no note')); }
      chk(eloM.groups.every(g => eloP.groups[g].sidelined.every(x => /reserve|free agent|practice squad|retired|out|list|suspended/i.test(x.why))), 'a sidelined player has no reason'); }
    posBtns.find(b => b.dataset.pos === 'DL').click(); await wait(40);
    chk(txt(rankRows()[0]).includes(eloP.groups.DL.top[0].name), 'switching to the defensive line did not redraw the rankings');
    /* a ranked player's shield and place stand in front of his name on his builder leg; a team leg has none */
    { const S = w.eval('S'), top = eloP.groups.QB.top[0]; const wk = Math.max(...S.sched.map(x => +x.w)); const g = S.sched.find(x => +x.w === wk);
      const key = g.id + '|' + top.id + '|passing_yards';
      S.parlay[key] = { gid: g.id, pid: top.id, stat: 'passing_yards', k: 200, side: 'over', main: false, p: 0.5, price: -110, src: 'est', name: top.name, pos: 'QB', grp: 'QB', week: g.w, label: '200+ pass yds' };
      S.parlay[g.id + '|team:' + g.h + '|ml'] = { gid: g.id, pid: 'team:' + g.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.55, price: -120, src: 'real', name: TEAM(g.h), team: g.h, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win' };
      w.eval('renderParlay()'); await wait(80);
      const rows = [...d.querySelectorAll('#parlayBody tr.legrow')];
      const mine = rows.find(tr => txt(tr).includes(top.name)), team = rows.find(tr => txt(tr).includes(TEAM(g.h)) && !txt(tr).includes(top.name));
      chk(!!mine && !!mine.querySelector('td.plr .pe-badge svg.tierbadge') && new RegExp('#' + top.rank + '\\b').test(txt(mine.querySelector('.pe-badge'))), 'the top quarterback\'s builder leg has no shield and place: ' + (mine ? txt(mine).slice(0, 80) : 'no leg'));
      chk(mine.querySelector('td.plr').firstElementChild.classList.contains('pe-badge'), 'the badge is not in front of the name');
      chk(!!team && !team.querySelector('.pe-badge'), 'a team leg got a player badge');
      chk(!!d.getElementById('peDefs') && d.querySelectorAll('#peDefs defs, #peBody defs').length === 1, 'the shield gradients are not defined exactly once on the page');
      w.eval('renderParlay()'); await wait(80);
      chk(d.querySelectorAll('#parlayBody tr.legrow .pe-badge').length === 1, 'a redraw doubled or lost the badge');
      /* market + form: a second price on a leg the book has priced, none on an estimated or team leg */
      chk(!mine.querySelector('.pe-alt') && !team.querySelector('.pe-alt'), 'an estimated or team leg got a market + form price');
      const wr = eloP.groups.WR.top[0], key2 = g.id + '|' + wr.id + '|receiving_yards';
      S.parlay[key2] = { gid: g.id, pid: wr.id, stat: 'receiving_yards', k: 70, side: 'over', main: true, p: 0.55, price: -115, src: 'real', name: wr.name, pos: 'WR', grp: 'WR', week: g.w, label: '70+ rec yds' };
      S.parlay[key] = Object.assign({}, S.parlay[key], { price: -110, src: 'real', side: 'under' });
      w.eval('renderParlay()'); await wait(80);
      const rows2 = [...d.querySelectorAll('#parlayBody tr.legrow')];
      const wrRow = rows2.find(tr => txt(tr).includes(wr.name)), qbRow = rows2.find(tr => txt(tr).includes(top.name));
      const altOf = tr => tr && tr.querySelector('.pe-alt') ? +tr.querySelector('.pe-alt').dataset.p : null;
      chk(altOf(wrRow) > 0.5 && altOf(wrRow) < 0.75 && /market \+ form \d+%/.test(txt(wrRow.querySelector('.pe-alt'))), 'a top receiver\'s over at -115 should carry a market + form price above the book\'s: ' + altOf(wrRow));
      chk(altOf(qbRow) !== null && altOf(qbRow) < w.eval('mlProb')(-110), 'a top quarterback\'s under should price below the book\'s chance: ' + altOf(qbRow));
      chk(/Market \+ form/.test(txt(d.querySelector('#parlayBody .pe-altsum')) || '') && /\d+\.\d% to all land/.test(txt(d.querySelector('#parlayBody .pe-altsum'))), 'the builder does not sum the market + form chances: ' + txt(d.querySelector('#parlayBody .pe-altsum')));
      w.eval('renderParlay()'); await wait(80);
      chk(d.querySelectorAll('#parlayBody .pe-alt').length === 2 && d.querySelectorAll('#parlayBody .pe-altsum').length === 1, 'a redraw doubled or lost the second prices');
      delete S.parlay[key]; delete S.parlay[key2]; delete S.parlay[g.id + '|team:' + g.h + '|ml']; w.eval('save(); renderParlay()'); await wait(80); }
    /* the Props game view: the same shield on a ranked player's row */
    { [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'slate').click(); await wait(60);
      const S = w.eval('S'); const top = eloP.groups.QB.top[0];
      const g = S.sched.find(x => (x.h === top.team || x.a === top.team) && !w.eval('gameStarted')(x)) || S.sched.find(x => x.h === top.team || x.a === top.team);
      S.ui.game = g.id; w.eval('renderGame()'); await wait(120);
      const row = d.querySelector(`button.plrbtn[data-open="${top.id}"]`);
      chk(!!row && !!row.querySelector('.who .pe-badge svg.tierbadge') && new RegExp('#' + top.rank + '\\b').test(txt(row.querySelector('.pe-badge'))), 'the top quarterback\'s row in the Props game view has no shield: ' + (row ? txt(row).slice(0, 80) : 'no row for ' + top.name + ' in ' + g.id));
      chk(row.querySelector('.who').firstElementChild.classList.contains('pe-badge'), 'the shield is not in front of the name on the game view');
      chk(d.querySelectorAll(`button.plrbtn[data-open="${top.id}"] .pe-badge`).length === 1, 'the game view row has more than one shield');
      w.eval('renderGame()'); await wait(60);
      chk(d.querySelectorAll(`button.plrbtn[data-open="${top.id}"] .pe-badge`).length === 1, 'redrawing the game doubled or lost the shield');
      S.ui.game = null; w.eval('renderSlate()'); }
    /* the Prop Record grades the three chances on every book line, week by week */
    { [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'track').click(); await wait(80);
      const card = d.querySelector('#trackBody .pe-track');
      chk(!!card && card === d.getElementById('trackBody').firstElementChild, 'the market + form card is not at the top of the Prop Record');
      const trs = card ? [...card.querySelectorAll('tbody tr')] : [];
      const weeksGraded = new Set(w.eval('trackRecord()').filter(r => r.kind === 'main' && r.imp != null).map(r => r.w));
      chk(trs.length === weeksGraded.size + 1 && /^All/.test(txt(trs[trs.length - 1])), `the card should have a row per graded week and an All row: ${trs.length} rows for ${weeksGraded.size} weeks`);
      chk(trs.every(tr => tr.querySelectorAll('td').length === 11 && /0\.\d{3}/.test(txt(tr))), 'a row lacks its eleven cells or its Brier scores');
      w.eval('renderTrack()'); await wait(40);
      chk(d.querySelectorAll('#trackBody .pe-track').length === 1, 'redrawing the Prop Record doubled the card');
      [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'elo').click(); await wait(40); }
    d.getElementById('peMore').click(); await wait(40);
    chk(rankRows().length === Math.min(25, eloP.groups.DL.top.length), 'Show the top 25 did not: ' + rankRows().length);
    const wts = [...body.querySelectorAll('.card')].find(c => /What each position is worth/.test(txt(c.querySelector('h2'))));
    chk(!!wts && wts.querySelectorAll('.pe-w div').length === eloM.groups.length, 'the weights card does not show one weight per group');
    chk(!!wts && wts.querySelectorAll('.pe-heat tbody tr').length === Object.keys(eloM.by_season).length, 'the by-season table is not one row per season');
    chk(/walk-forward/.test(txt(d.getElementById('peWalkRec'))), 'the tab bar does not carry the walk-forward record: ' + txt(d.getElementById('peWalkRec')));
    /* the data has the shape the tab relies on */
    chk(eloM.groups.every(g => eloP.groups[g] && eloP.groups[g].top.length >= 10 && eloP.groups[g].top.every(r => r.elo > 1300 && r.elo < 1800)), 'a group has fewer than ten rated players or a rating out of range');
    chk(Object.values(eloM.walk_forward).every(x => x.accuracy > 0.5 && x.games > 0), 'the walk-forward record should beat a coin on every season: ' + JSON.stringify(eloM.walk_forward));
    chk(eloM.coef.QB > 0 && eloM.coef.DB > 0, 'the fitted weights lost their sign');
    [...d.querySelectorAll('#tabs button')].find(x => x.dataset.tab === 'pickems').click(); await wait(40); }

  /* ---- Sync: one document for every device ---- */
  /* with no store address the page runs on this browser alone, and says so */
  chk(fetched.includes('sync.json'), 'the page never read nflbets/sync.json for the store address');
  chk(w.NFLSYNC && w.NFLSYNC.state().live === false && w.NFLSYNC.state().url === null, 'with sync.json unreachable the page should be local-only');
  chk(/Not synced/.test(txt(d.getElementById('syncStamp'))), 'the header does not say the page is not synced: ' + txt(d.getElementById('syncStamp')));
  const PROP_KEY = 'props_2026_v1';
  /* a game that has not kicked off, so the builder keeps the leg */
  const openGame = S => { const wk = Math.max(...S.sched.map(x => +x.w)); return S.sched.find(x => +x.w === wk); };
  const teamLeg = g => ({ gid: g.id, pid: 'team:' + g.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.55, price: -120, src: 'real',
    name: TEAM(g.h), team: g.h, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win' });
  const settle = () => wait(900);
  { const store = mkStore();
    /* device A, first to open the page on an empty store: whatever it makes seeds the document */
    const A = await run(state, undefined, null, false, { sync: store });
    chk(!A.timedOut && A.errs.length === 0, 'device A broke: ' + A.errs.join('; '));
    chk(A.w.NFLSYNC.state().live === true && A.w.NFLSYNC.state().url === STORE_URL, 'device A did not come up synced: ' + JSON.stringify(A.w.NFLSYNC.state()));
    await settle();
    chk(/^Synced/.test(txt(A.d.getElementById('syncStamp'))), 'device A\'s header does not say Synced: ' + txt(A.d.getElementById('syncStamp')));
    const SA = A.w.eval('S'), gA = openGame(SA), key = gA.id + '|team:' + gA.h + '|ml';
    SA.parlay[key] = teamLeg(gA);
    SA.saved.push({ id: 'sync-1', saved: new Date().toISOString(), week: gA.w, stake: 3, payout: 9, price: 200, legs: [teamLeg(gA)] });
    A.w.eval('save(); renderParlay();');
    await settle();
    const docA = storeDoc(store);
    chk(!!docA && docA.prop && docA.prop.parlay && !!docA.prop.parlay[key], 'the builder leg was not written to the store: ' + JSON.stringify(docA));
    chk(!!docA && docA.prop.saved && docA.prop.saved.some(p => p.id === 'sync-1'), 'the saved parlay was not written to the store');
    chk(!!docA && docA.prop.stake === SA.stake, 'the stake was not written to the store');
    chk(!!docA && !('players' in docA.prop) && !('sched' in docA.prop) && !('odds' in docA.prop), 'the store holds more than what the visitor made');
    chk(store.node && typeof store.node.doc.json === 'string' && store.node.rev && store.node.doc.rev === store.node.rev, 'the store node is not {rev, at, doc:{rev, at, json}}');
    chk(/^Synced/.test(txt(A.d.getElementById('syncStamp'))), 'after a push the header does not say Synced: ' + txt(A.d.getElementById('syncStamp')));
    chk(/changed .* checked \d/.test(txt(A.d.getElementById('syncStamp'))), 'the header does not say when the document changed and when the page last checked: ' + txt(A.d.getElementById('syncStamp')));
    /* a poll after its own push reads the tag alone and fetches nothing */
    const dg = store.docGets, puts = store.puts.length;
    await A.w.NFLSYNC.poll();
    chk(store.docGets === dg && store.puts.length === puts, 'a poll with nothing changed fetched the document or pushed it again');
    /* device B opens the page fresh and sees exactly what A made, in the builder and in the section */
    const B = await run(state, 'https://demon-x13.github.io/nfl-hub/nflbets/#parlay', null, false, { sync: store });
    chk(!B.timedOut && B.errs.length === 0, 'device B broke: ' + B.errs.join('; '));
    await settle();
    const SB = B.w.eval('S');
    chk(!!SB.parlay[key], 'device B did not get the builder leg');
    chk(SB.saved.some(p => p.id === 'sync-1'), 'device B did not get the saved parlay');
    chk(new RegExp(TEAM(gA.h)).test(txt(B.d.getElementById('parlayBody'))), 'device B\'s builder does not show the leg');
    const lpB = B.d.getElementById('lpCard');
    chk([...lpB.querySelectorAll('.savedp .pill')].some(x => /in the builder/.test(txt(x))), 'device B\'s section does not show the builder parlay');
    chk([...lpB.querySelectorAll('.savedp .pill')].some(x => /prop model/.test(txt(x))), 'device B\'s section does not show the saved parlay');
    chk(store.puts.length === puts, 'device B pushed on opening, with nothing of its own to add');
    /* B deletes the saved parlay in the section and deletes a file parlay; A sees both on its next look */
    const mine = [...lpB.querySelectorAll('.savedp')].find(c => /prop model/.test(txt(c.querySelector('.pill'))));
    mine.querySelector('[data-rm]').click();
    const filep = [...lpB.querySelectorAll('.savedp')].find(c => /in the repository/.test(txt(c.querySelector('.pill'))));
    filep.querySelector('[data-rm]').click();
    await settle();
    const docB = storeDoc(store);
    chk(!!docB && !docB.prop.saved.some(p => p.id === 'sync-1'), 'B\'s deletion of the saved parlay did not reach the store');
    chk(!!docB && Object.keys(docB.live.removed).length === 1, 'B\'s deletion of a file parlay did not reach the store: ' + JSON.stringify(docB && docB.live));
    const shownA = () => A.d.getElementById('lpCard').querySelectorAll('.savedp').length;
    const beforeA = shownA();
    await A.w.NFLSYNC.poll(); await settle();
    chk(!SA.saved.some(p => p.id === 'sync-1'), 'A still has the saved parlay B deleted');
    chk(shownA() === beforeA - 2, `A's section did not follow B's two deletions (${beforeA} -> ${shownA()})`);
    chk(JSON.parse(A.w.localStorage.getItem('live_parlays_v1')).removed && Object.keys(JSON.parse(A.w.localStorage.getItem('live_parlays_v1')).removed).length === 1, 'A\'s copy of the section key did not take B\'s deletion');
    chk(JSON.parse(A.w.localStorage.getItem(PROP_KEY)).saved.length === 0, 'A\'s browser copy of the prop state did not take B\'s deletion');
    /* A drops the builder leg; B follows */
    delete SA.parlay[key]; A.w.eval('save(); renderParlay();');
    await settle(); await B.w.NFLSYNC.poll(); await wait(200);
    chk(!SB.parlay[key], 'B still has the builder leg A dropped');
    chk(!new RegExp(TEAM(gA.h)).test(txt(B.d.getElementById('parlayBody'))), 'B\'s builder still shows the leg A dropped');
    /* A brings the deleted file parlay back; B follows */
    const restore = A.d.getElementById('lpCard').querySelector('#restoreAll') || null;
    if (restore) { restore.click(); await settle(); await B.w.NFLSYNC.poll(); await wait(200);
      chk(Object.keys(JSON.parse(B.w.localStorage.getItem('live_parlays_v1')).removed).length === 0, 'B did not follow A\'s restore'); }
    /* device C opens while the store is down: it must not push its empty builder over the document, and it takes the document when the store is back */
    store.fail = true;
    SB.parlay[key] = teamLeg(gA); B.w.eval('save(); renderParlay();');
    store.fail = false; await settle(); store.fail = true;
    const C = await run(state, undefined, null, false, { sync: store });
    chk(!C.timedOut && C.errs.length === 0, 'device C broke: ' + C.errs.join('; '));
    chk(C.w.NFLSYNC.state().live === false && C.w.NFLSYNC.state().ok === false, 'device C should be waiting on the store: ' + JSON.stringify(C.w.NFLSYNC.state()));
    chk(/Sync failed/.test(txt(C.d.getElementById('syncStamp'))), 'device C\'s header does not say the store is unreachable: ' + txt(C.d.getElementById('syncStamp')));
    const SC = C.w.eval('S'), putsC = store.puts.length;
    SC.saved.push({ id: 'offline', saved: new Date().toISOString(), week: gA.w, stake: 1, payout: 2, price: 100, legs: [teamLeg(gA)] });
    C.w.eval('save(); renderParlay();'); await settle();
    chk(store.puts.length === putsC, 'device C pushed while it had never read the document');
    store.fail = false; await C.w.NFLSYNC.poll(); await wait(200);
    chk(C.w.NFLSYNC.state().live === true && !!SC.parlay[key], 'device C did not take the document once the store answered: ' + JSON.stringify(C.w.NFLSYNC.state()));
    chk(/^Saving/.test(txt(C.d.getElementById('syncStamp'))), 'device C\'s header does not say it is saving the parlay it made offline: ' + txt(C.d.getElementById('syncStamp')));
    /* what C made while the store was down was its first document, so it joins rather than yields */
    await settle();
    chk(/^Synced/.test(txt(C.d.getElementById('syncStamp'))), 'device C\'s header does not say Synced once the store answers');
    chk(SC.saved.some(p => p.id === 'offline') && !!storeDoc(store) && storeDoc(store).prop.saved.some(p => p.id === 'offline'), 'the parlay C made while the store was down did not join the document');
    /* device D has a browser copy from before sync and opens on an empty store: its copy seeds the document */
    const fresh = mkStore();
    const blob = JSON.parse(A.w.localStorage.getItem(PROP_KEY)); blob.saved = [{ id: 'old-device', saved: new Date().toISOString(), week: gA.w, stake: 2, payout: 4, price: 100, legs: [teamLeg(gA)] }];
    const D = await run(state, undefined, null, false, { sync: fresh, seed: w => w.localStorage.setItem(PROP_KEY, JSON.stringify(blob)) });
    chk(!D.timedOut && D.errs.length === 0, 'device D broke: ' + D.errs.join('; '));
    await settle();
    chk(D.w.eval('S').saved.some(p => p.id === 'old-device'), 'device D lost its own saved parlay to an empty store');
    chk(!!storeDoc(fresh) && storeDoc(fresh).prop.saved.some(p => p.id === 'old-device'), 'device D\'s browser copy did not seed the empty store');
    /* a correction to a line in the section travels too */
    const edit = D.d.getElementById('lpCard').querySelector('[data-edit]');
    if (edit) { edit.click(); const inp = D.d.getElementById('lpCard').querySelector('input.lineInput'); inp.value = '44.5';
      inp.dispatchEvent(new D.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await settle();
      chk(!!storeDoc(fresh) && Object.values(storeDoc(fresh).live.lines).includes(44.5), 'a corrected line did not reach the store: ' + JSON.stringify(storeDoc(fresh) && storeDoc(fresh).live)); }
    else chk(false, 'no line to correct in device D\'s section');
    /* device E also has a browser copy from before sync, but opens on the store D already seeded: its
       parlays join the document instead of being replaced by it, its builder stands in for D's empty
       one, its deletion in the section is kept, and D sees all of it on its next look */
    const blobE = JSON.parse(A.w.localStorage.getItem(PROP_KEY)); blobE.saved = [{ id: 'other-device', saved: new Date().toISOString(), week: gA.w, stake: 5, payout: 15, price: 200, legs: [teamLeg(gA)] }];
    blobE.parlay = { [key]: teamLeg(gA) };
    const putsE = fresh.puts.length;
    const E = await run(state, undefined, null, false, { sync: fresh, seed: w => { w.localStorage.setItem(PROP_KEY, JSON.stringify(blobE));
      w.localStorage.setItem('live_parlays_v1', JSON.stringify({ lines: {}, removed: { 'file|gone-before-sync': 1 } })); } });
    chk(!E.timedOut && E.errs.length === 0, 'device E broke: ' + E.errs.join('; '));
    await settle();
    const SE = E.w.eval('S'), docE = storeDoc(fresh);
    chk(SE.saved.some(p => p.id === 'other-device') && SE.saved.some(p => p.id === 'old-device'), 'device E did not keep its own saved parlay beside the document\'s: ' + JSON.stringify(SE.saved.map(p => p.id)));
    chk(!!SE.parlay[key], 'device E\'s builder leg was replaced by the document\'s empty builder');
    chk(fresh.puts.length === putsE + 1, `device E should have pushed its join exactly once (${fresh.puts.length - putsE} pushes)`);
    chk(!!docE && docE.prop.saved.some(p => p.id === 'other-device') && docE.prop.saved.some(p => p.id === 'old-device'), 'device E\'s saved parlay did not join the document: ' + JSON.stringify(docE && docE.prop.saved.map(p => p.id)));
    chk(!!docE && !!docE.prop.parlay[key], 'device E\'s builder leg did not join the document');
    chk(!!docE && docE.live.removed['file|gone-before-sync'] === 1, 'device E\'s deletion from before sync did not join the document: ' + JSON.stringify(docE && docE.live));
    chk(E.w.NFLSYNC.state().joined === 1 && /^Synced/.test(txt(E.d.getElementById('syncStamp'))), 'device E is not synced after its join: ' + JSON.stringify(E.w.NFLSYNC.state()));
    chk(E.w.localStorage.getItem('nflsync_v1') === fresh.node.rev, 'device E did not remember the rev it wrote');
    await D.w.NFLSYNC.poll(); await settle();
    chk(D.w.eval('S').saved.some(p => p.id === 'other-device'), 'device D did not get the parlay E brought');
    /* device F has shared before (it remembers a rev) and holds a parlay the document lacks: another
       device deleted it, so the document wins and nothing is pushed */
    const blobF = JSON.parse(E.w.localStorage.getItem(PROP_KEY)); blobF.saved = blobF.saved.concat([{ id: 'ghost', saved: new Date().toISOString(), week: gA.w, stake: 1, payout: 2, price: 100, legs: [teamLeg(gA)] }]);
    const putsF = fresh.puts.length;
    const F = await run(state, undefined, null, false, { sync: fresh, seed: w => { w.localStorage.setItem(PROP_KEY, JSON.stringify(blobF)); w.localStorage.setItem('nflsync_v1', 'some-earlier-rev'); } });
    chk(!F.timedOut && F.errs.length === 0, 'device F broke: ' + F.errs.join('; '));
    await settle();
    chk(!F.w.eval('S').saved.some(p => p.id === 'ghost'), 'device F kept a parlay the document lacks although it had shared before');
    chk(fresh.puts.length === putsF && !storeDoc(fresh).prop.saved.some(p => p.id === 'ghost'), 'device F pushed a parlay another device had deleted');
    chk(F.w.localStorage.getItem('nflsync_v1') === fresh.node.rev, 'device F did not remember the rev it took');
    for (const x of [A, B, C, D, E, F]) x.w.close();
  }

  console.log(`${checks} checks, ${fails.length} failures`);
  fails.forEach(f => console.log('  FAIL:', f));
  process.exit(fails.length ? 1 : 0);
})();
