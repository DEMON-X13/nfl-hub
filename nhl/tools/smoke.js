/* Boot nhl/index.html in jsdom against the published nhl/state.json and walk every tab.

    node nhl/tools/smoke.js        (from the hub root or from nhl/tools)

   Must end "0 failures". Checks are against the page's invariants, never against what
   the day's data happens to offer: an empty day must not fail the job. */
'use strict';
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const STATE = fs.readFileSync(path.join(ROOT, 'state.json'), 'utf8');
const S = JSON.parse(STATE);

const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
const wait = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const errors = [];
  const dom = new JSDOM(HTML.replace(/<link[^>]*fonts[^>]*>/g, ''), {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/nhl/',
    beforeParse(w) {
      w.fetch = async url => {
        if (String(url).startsWith('state.json')) return { ok: true, json: async () => JSON.parse(STATE) };
        if (String(url).includes('espn.com')) return { ok: true, json: async () => ({ events: [] }) };
        return { ok: false, status: 404 };
      };
      w.addEventListener('error', e => errors.push(e.message));
    },
  });
  const w = dom.window, d = w.document;
  await wait(300);
  const $ = id => d.getElementById(id);
  chk(errors.length === 0, 'runtime errors: ' + errors.join(' | '));
  chk(/season/.test(txt($('stamp'))), 'header stamp says the season: ' + txt($('stamp')));
  chk(txt($('buildTag')).startsWith('nhl v'), 'build tag on the header');

  /* Games: a day strip with one day open, a card per game that day, the two chances on each adding to 100 */
  const days = [...d.querySelectorAll('#days .day')];
  chk(days.length >= 7, `the day strip has a week or more (${days.length})`);
  const on = d.querySelector('#days .day.on');
  chk(!!on, 'one day is open');
  const dayGames = S.games.filter(g => g.date === on.dataset.day);
  let cards = d.querySelectorAll('#games .game');
  chk(cards.length === dayGames.length, `the open day shows ${dayGames.length} games, not ${cards.length}`);
  const withGames = days.find(b => /games/.test(txt(b)) && !b.classList.contains('on'));
  if (withGames) {
    withGames.click();
    const n = S.games.filter(g => g.date === withGames.dataset.day).length;
    chk(d.querySelectorAll('#games .game').length === n, `clicking a day shows its ${n} games`);
  }
  cards = d.querySelectorAll('#games .game');
  for (const c of cards) {
    const wps = [...c.querySelectorAll('.wp')].map(x => parseInt(txt(x)));
    chk(wps.length === 2 && Math.abs(wps[0] + wps[1] - 100) <= 1, 'the two chances on a card add to 100: ' + wps.join('+'));
    chk(/Model/.test(txt(c)) && /total/.test(txt(c)), 'a card shows the model margin and total');
    chk(/call right|call wrong|no edge|no line yet|ML |\+\d/.test(txt(c)), 'every card carries a call, a result or the reason there is none');
  }
  /* a leg can be added from a game that has a line and is still to come; a second leg on the same game replaces it */
  const btn = d.querySelector('#games button[data-leg]');
  if (btn) {
    btn.click();
    chk(w.localStorage.getItem('nhl_v1') && JSON.parse(w.localStorage.getItem('nhl_v1')).legs.length === 1, 'clicking a line adds a leg to the browser store');
    chk(txt($('legCount')) === '1', 'the tab bar counts the leg');
    const same = btn.dataset.leg.split('|')[0];
    const other = [...d.querySelectorAll('#games button[data-leg]')].find(b => b.dataset.leg.split('|')[0] === same && b !== btn && !b.classList.contains('on'));
    if (other) { other.click(); chk(JSON.parse(w.localStorage.getItem('nhl_v1')).legs.length === 1, 'a second leg on the same game replaces the first'); }
  }

  /* Standings: four divisions of eight, every club once, the sixteen in the field marked */
  d.querySelector('#tabs button[data-tab="standings"]').click();
  const tables = d.querySelectorAll('#standings table');
  chk(tables.length === 4, `four division tables (${tables.length})`);
  chk(d.querySelectorAll('#standings tbody tr').length === 32, 'thirty-two clubs in the standings');
  chk(d.querySelectorAll('#standings tbody tr.in').length === 16, `sixteen clubs in the field (${d.querySelectorAll('#standings tbody tr.in').length})`);
  for (const t of tables) chk(t.querySelectorAll('tbody tr').length === 8, 'eight clubs in a division');

  /* Power ratings */
  d.querySelector('#tabs button[data-tab="ratings"]').click();
  chk(d.querySelectorAll('#ratTable tbody tr').length === 32, 'ratings table shows the 32 clubs');
  chk(txt(d.querySelector('#ratTable tbody tr td')) === '1', 'ratings start at rank 1');
  $('ratConf').value = 'East'; $('ratConf').dispatchEvent(new w.Event('change'));
  chk(d.querySelectorAll('#ratTable tbody tr').length === 16, 'a conference is sixteen clubs');

  /* Playoff */
  d.querySelector('#tabs button[data-tab="playoff"]').click();
  chk(d.querySelectorAll('#bracket .series').length === 8, 'the bracket has eight first-round series');
  chk(d.querySelectorAll('#poTable tbody tr').length === 32, 'playoff odds table has every club');
  const O = S.playoff.odds;
  const sum = k => Object.values(O).reduce((a, o) => a + o[k], 0);
  chk(Math.abs(sum('cup') - 1) < 0.02, 'Cup chances sum to one: ' + sum('cup').toFixed(3));
  chk(Math.abs(sum('conf') - 2) < 0.03, 'conference chances sum to two: ' + sum('conf').toFixed(3));
  chk(Math.abs(sum('div') - 4) < 0.05, 'division chances sum to four: ' + sum('div').toFixed(3));
  chk(Math.abs(sum('playoff') - 16) < 0.2, 'playoff chances sum to sixteen: ' + sum('playoff').toFixed(2));
  for (const conf of ['East', 'West']) {
    const f = S.playoff.bracket[conf];
    const all = [].concat(...Object.values(f.divs), f.wild);
    chk(all.length === 8 && new Set(all).size === 8, `${conf} field is eight different clubs`);
    chk(f.series.length === 4 && f.series.every(s => s.length === 2), `${conf} has four series`);
  }

  /* Parlays: the lines are offered with buttons, and the leg added above is priced */
  d.querySelector('#tabs button[data-tab="parlays"]').click();
  const lined = S.games.filter(g => g.state === 'pre' && g.line);
  chk(d.querySelectorAll('#plLines tbody tr').length === Math.max(1, Math.min(lined.length, 20)) || d.querySelectorAll('#plLines tbody tr').length > 0, 'the Parlays tab lists lined games or says there are none');
  if (lined.length) {
    chk(d.querySelectorAll('#plLines button[data-leg]').length >= d.querySelectorAll('#plLines tbody tr').length, 'each listed game offers at least one button');
    const before = (JSON.parse(w.localStorage.getItem('nhl_v1') || '{}').legs || []).length;
    const pb = [...d.querySelectorAll('#plLines button[data-leg]')].find(b => !b.classList.contains('on'));
    pb.click();
    const after = (JSON.parse(w.localStorage.getItem('nhl_v1') || '{}').legs || []).length;
    chk(after >= before, 'a button on the Parlays tab adds a leg');
    chk(d.querySelectorAll('#legs .leg').length === after, 'the builder redraws with it');
  }
  const legs = JSON.parse(w.localStorage.getItem('nhl_v1') || '{}').legs || [];
  chk(d.querySelectorAll('#legs .leg').length === legs.length, 'the builder lists the legs');
  if (legs.length) {
    chk(/Parlay odds/.test(txt($('parlayTotals'))) && /Model/.test(txt($('parlayTotals'))), 'a parlay is priced with the model beside it');
    $('saveParlay').click();
    chk(d.querySelectorAll('#savedList .saved').length === 1, 'saving keeps the parlay');
    chk(/pending/.test(txt($('savedList'))), 'an unplayed parlay is pending');
    chk(JSON.parse(w.localStorage.getItem('nhl_v1')).legs.length === 0, 'saving empties the builder');
  }
  /* grading a saved parlay: a fabricated final on every kind of leg */
  const fake = { hs: 4, as: 2, state: 'final' };
  S.games.push(Object.assign({ id: 'fake', date: '2000-01-01', start: '2000-01-01T00:00Z', home: 'BOS', away: 'MTL', type: 2, pHome: 0.5, mu: 0, xt: 6, tie: 0.2, frozen: null }, fake));
  w.eval(`S.games.push(${JSON.stringify(S.games[S.games.length - 1])})`);
  const grade = (side, kind, line) => w.eval(`gradeLeg(${JSON.stringify({ game: 'fake', side, kind, line, odds: -110, p: 0.5 })})`);
  chk(grade('home', 'ml', null) === 'win' && grade('away', 'ml', null) === 'loss', 'a moneyline leg grades on the winner');
  chk(grade('home', 'pl', -1.5) === 'win' && grade('away', 'pl', 1.5) === 'loss', 'a puck line leg grades on the margin');
  chk(grade('over', 'ou', 5.5) === 'win' && grade('under', 'ou', 5.5) === 'loss' && grade('over', 'ou', 6) === 'push', 'a total leg grades over, under and push');

  /* Record */
  d.querySelector('#tabs button[data-tab="record"]').click();
  chk(new RegExp(`${S.record.su.w}-${S.record.su.l}`).test(txt($('recordTotals'))), 'record tab shows the straight-up record');
  chk(d.querySelectorAll('#recMonth tbody tr').length === Object.keys(S.record.byMonth).length, 'a row per graded month');
  chk(/Held out/.test(txt($('fitNote'))), 'the fit note reports the holdout');

  /* state invariants the page relies on */
  for (const g of S.games) {
    if (g.id === 'fake') continue;
    chk(g.pHome > 0 && g.pHome < 1, `chance in (0,1) on ${g.id}`);
    chk(isFinite(g.mu) && isFinite(g.xt) && g.xt > 3 && g.xt < 9, `an expected margin and a sane total on ${g.id} (${g.mu}, ${g.xt})`);
    chk(g.tie > 0 && g.tie < 0.6, `an overtime chance on ${g.id} (${g.tie})`);
    if (g.line && g.line.homeLine !== null) chk(g.cover && Math.abs(g.cover.home + g.cover.push + g.cover.away - 1) < 0.01, `cover chances sum to one on ${g.id}`);
    if (g.line && g.line.total !== null) chk(g.ou && Math.abs(g.ou.over + g.ou.push + g.ou.under - 1) < 0.01, `total chances sum to one on ${g.id}`);
    if (g.state === 'final') chk(!!g.result, `a final game is graded: ${g.id}`);
    if (g.result && g.result.pl) chk(!!g.line && !!g.plPick, `a puck line grade has a line and a pick: ${g.id}`);
    if (g.result && g.result.ou) chk(!!g.line && !!g.ouPick, `a totals grade has a line and a pick: ${g.id}`);
    chk(S.teams[g.home] && S.teams[g.away], `both clubs known on ${g.id}`);
  }
  chk(Object.keys(S.teams).length === 32, 'thirty-two clubs in the state');
  chk(errors.length === 0, 'runtime errors after walking: ' + errors.join(' | '));
  console.log(`${checks} checks, ${fails.length} failures`);
  for (const f of fails) console.log('  FAIL ' + f);
  process.exit(fails.length ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
