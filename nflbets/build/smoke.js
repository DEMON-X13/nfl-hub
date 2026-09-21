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
function run(state, url = 'https://demon-x13.github.io/nfl-hub/nflbets/', espn = null, noState = false) {
  return new Promise(resolve => {
    const errs = [], fetched = [];
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        w.addEventListener('error', e => errs.push(e.message));
        w.fetch = u => { const s = String(u); fetched.push(s.replace(/\?.*$/, ''));
          if (s.includes('state.json')) return noState
            ? Promise.resolve({ ok: false, status: 404 })
            : Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(state)) });
          if (s.includes('payload.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(PAYLOAD) });
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
  chk(tabs.join('|') === "Pick'ems|Props|Parlay Builders|Power Ratings|Pick'em Record|Prop Record|Bet Log", 'tabs are ' + tabs.join('|'));
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
  chk(!!d.querySelector('.pk-gamehead') && /Date.*Matchup.*Win probability.*Confidence.*Final score/.test(txt(d.querySelector('.pk-gamehead'))),
    'the column header is not the betting board\'s');
  chk(cards.every(c => c.querySelector('.pk-probrow .pk-prob .pk-a') && c.querySelector('.pk-probrow .pk-prob .pk-h')), 'a game is missing its split bar');
  chk(cards.every(c => /HIGH|MED|LOW|50\/50/.test(txt(c.querySelector('.pk-tier')))), 'a game is missing its confidence band');
  chk(cards.every(c => c.querySelector('.pk-ttag.pk-win')), 'no pick is marked on a matchup tag');
  chk(!d.querySelector('#tab-pickems .ttag'), 'a betting tag came through in the prop model\'s class names');
  chk(cards.every(c => c.querySelector('.pk-result')), 'a game is missing its final-score cell');
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
  /* the button reads again */
  d.getElementById('pkNow').click();
  await wait(200);
  chk(fetched.filter(u => u.includes('/scoreboard')).length === 2, 'Refresh scores did not read the scoreboard again: ' + fetched.filter(u => u.includes('/scoreboard')).length);
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
  chk(!!d.getElementById('savedCard'), 'the saved parlays card is missing');
  chk(!/\bplan\b/i.test(txt(pb)), 'a week plan section is in the builder');

  /* ---- Pick'em Record: the betting site's Records tab, framed, loaded when first opened ---- */
  const recFrame = d.querySelector('#tab-record iframe.pk-frame');
  chk(!!recFrame && !recFrame.getAttribute('src'), 'the Records frame should not load before its tab is opened');
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'record').click();
  await wait(60);
  chk(!d.getElementById('tab-record').hidden && d.getElementById('tab-ratings').hidden, 'the Pick\'em Record tab did not open');
  chk(w.location.hash === '#record', 'the Pick\'em Record tab did not become the address');
  /* the frame's address carries the betting job's publish time, so a new publish is a new
     address: a script-set frame never sees this page's hard refresh */
  const stamp = encodeURIComponent(String(state.published));
  chk(recFrame.getAttribute('src') === `../betting/admin.html?embed=1&v=${stamp}#record`,
    'the Records frame is not cache-busted on the betting publish time: ' + recFrame.getAttribute('src'));
  const adminHtml = fs.readFileSync(path.join(ROOT, 'betting', 'admin.html'), 'utf8');
  chk(/html\.embed header,html\.embed #tabs\{display:none\}/.test(adminHtml) && /classList\.add\('embed'\)/.test(adminHtml),
    'the betting page has no embed mode, so the frame would show its header and tab bar');
  chk(/data-tab="record"/.test(adminHtml), 'the betting admin page has no Records tab to frame');

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
  chk(!!ratFrame && !ratFrame.getAttribute('src'), 'the Power Ratings frame should not load before its tab is opened');
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'ratings').click();
  await wait(60);
  chk(!d.getElementById('tab-ratings').hidden && d.getElementById('tab-parlay').hidden, 'the Power Ratings tab did not open');
  chk(w.location.hash === '#ratings', 'the Power Ratings tab did not become the address');
  chk(ratFrame.getAttribute('src') === `../betting/admin.html?embed=1&v=${stamp}#ratings`, 'the Power Ratings frame is not cache-busted: ' + ratFrame.getAttribute('src'));
  chk(/data-tab="ratings"/.test(adminHtml), 'the betting admin page has no Power Ratings tab to frame');

  /* ---- Bet Log: the betting site's Bet Log tab, framed, on the same browser store ---- */
  const betFrame = d.querySelector('#tab-bets iframe.pk-frame');
  chk(!!betFrame && !betFrame.getAttribute('src'), 'the Bet Log frame should not load before its tab is opened');
  [...d.querySelectorAll('#tabs button')].find(b => b.dataset.tab === 'bets').click();
  await wait(60);
  chk(!d.getElementById('tab-bets').hidden && d.getElementById('tab-track').hidden, 'the Bet Log tab did not open');
  chk(w.location.hash === '#bets', 'the Bet Log tab did not become the address');
  chk(betFrame.getAttribute('src') === `../betting/admin.html?embed=1&v=${stamp}#bets`, 'the Bet Log frame is not cache-busted: ' + betFrame.getAttribute('src'));
  chk(/data-tab="bets"/.test(adminHtml) && /id="betSave"/.test(adminHtml), 'the betting admin page has no Bet Log tab with its form to frame');
  /* every framed tab is the same page, so one store: a bet logged in either place is in both */
  chk([...d.querySelectorAll('iframe.pk-frame')].every(f => /^\.\.\/betting\/admin\.html\?embed=1#/.test(f.dataset.src)), 'a framed tab points somewhere other than the betting admin page');

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
  chk(!!ff && ff.getAttribute('src') === '../betting/admin.html?embed=1#ratings',
    'with the season unreachable the framed tabs should still load, uncached: ' + (ff && ff.getAttribute('src')));
  /* and with no scoreboard to read, the stamp says so and the board stands */
  await wait(700);
  chk(/scores not loading/.test(txt(b.d.getElementById('pkStamp'))) && b.d.getElementById('pkStamp').classList.contains('bad'), 'an unreachable scoreboard is not said: ' + txt(b.d.getElementById('pkStamp')));
  chk(b.d.querySelectorAll('.pk-game').length > 0 && b.errs.length === 0, 'an unreachable scoreboard broke the board');

  console.log(`${checks} checks, ${fails.length} failures`);
  fails.forEach(f => console.log('  FAIL:', f));
  process.exit(fails.length ? 1 : 0);
})();
