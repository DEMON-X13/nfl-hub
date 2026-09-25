/* Boot cfb/index.html in jsdom against the published cfb/state.json and walk every tab.

    node cfb/tools/smoke.js        (from the hub root or from cfb/tools)

   Must end "0 failures". Checks are against the page's invariants, never against what
   the week's data happens to offer: a lean week must not fail the job. */
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
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/cfb/',
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
  chk(txt($('buildTag')).startsWith('cfb v'), 'build tag on the header');

  /* Games: the current week opens, with a card per game and the model's chance on each side */
  chk($('weekSel').value === String(S.week), `week selector opens on the current week (${$('weekSel').value} vs ${S.week})`);
  const wk = S.games.filter(g => S.week === 'post' ? g.type === 3 : g.type === 2 && g.week === S.week);
  const majors = wk.filter(g => S.teams[g.home].major || S.teams[g.away].major);
  let cards = d.querySelectorAll('#games .game');
  chk(cards.length === majors.length, `major-school filter shows ${majors.length} games, not ${cards.length}`);
  d.querySelector('#scope button[data-scope="all"]').click();
  cards = d.querySelectorAll('#games .game');
  chk(cards.length === wk.length, `all-FBS filter shows ${wk.length} games, not ${cards.length}`);
  for (const c of cards) {
    const wps = [...c.querySelectorAll('.wp')].map(x => parseInt(txt(x)));
    chk(wps.length === 2 && Math.abs(wps[0] + wps[1] - 100) <= 1, 'the two chances on a card add to 100: ' + wps.join('+'));
    chk(/Model spread/.test(txt(c)), 'a card shows the model spread');
  }
  /* a leg can be added from a game that has a line and is still to come */
  const btn = d.querySelector('#games button[data-leg]');
  if (btn) {
    btn.click();
    chk(w.localStorage.getItem('cfb_v1') && JSON.parse(w.localStorage.getItem('cfb_v1')).legs.length === 1, 'clicking a line adds a leg to the browser store');
    chk(txt($('legCount')) === '1', 'the tab bar counts the leg');
    const same = btn.dataset.leg.split('|')[0];
    const other = [...d.querySelectorAll('#games button[data-leg]')].find(b => b.dataset.leg.split('|')[0] === same && b !== btn && !b.classList.contains('on'));
    if (other) { other.click(); chk(JSON.parse(w.localStorage.getItem('cfb_v1')).legs.length === 1, 'a second leg on the same game replaces the first'); }
  }
  /* a finished game shows its result; the rest offer legs only when a line exists */
  d.querySelector('#weekSel').value = '1'; d.querySelector('#weekSel').dispatchEvent(new w.Event('change'));
  const finals = [...d.querySelectorAll('#games .game')];
  chk(finals.length > 0 || !S.games.some(g => g.week === 1), 'week 1 renders');
  chk(finals.every(c => /call right|call wrong|no line yet|edge/.test(txt(c))), 'every card carries a call, a result or the reason there is none');

  /* Rankings */
  d.querySelector('#tabs button[data-tab="rankings"]').click();
  const basis = S.rankings.cfp || S.rankings.ap;
  const rrows = d.querySelectorAll('#rankTable tbody tr');
  chk(!basis || rrows.length === basis.ranks.length, `rankings table has ${basis ? basis.ranks.length : 0} rows, not ${rrows.length}`);
  if (basis) chk(/Model/.test(txt(d.querySelector('#rankTable thead'))), 'rankings table has the model column');

  /* Power ratings */
  d.querySelector('#tabs button[data-tab="ratings"]').click();
  const fbs = Object.values(S.teams).filter(t => t.fbs), major = fbs.filter(t => t.major);
  chk(d.querySelectorAll('#ratTable tbody tr').length === major.length, `ratings table shows the ${major.length} major schools`);
  $('ratMajor').checked = false; $('ratMajor').dispatchEvent(new w.Event('change'));
  chk(d.querySelectorAll('#ratTable tbody tr').length === fbs.length, `ratings table shows all ${fbs.length} FBS teams when asked`);
  const first = txt(d.querySelector('#ratTable tbody tr td'));
  chk(first === '1', 'ratings start at rank 1');

  /* Playoff */
  d.querySelector('#tabs button[data-tab="playoff"]').click();
  chk(d.querySelectorAll('#bracket .seedline').length === 12, 'the bracket seats twelve teams');
  chk(d.querySelectorAll('#bracket .auto').length === 5, 'five automatic bids in the bracket');
  chk(d.querySelectorAll('#poTable tbody tr').length > 0, 'playoff odds table has rows');
  chk(d.querySelectorAll('#standings details').length === Object.keys(S.playoff.standings).length, 'a standings block per conference');
  const sumTitle = Object.values(S.playoff.odds).reduce((a, o) => a + o.title, 0);
  chk(Math.abs(sumTitle - 1) < 0.02, 'national title chances sum to one: ' + sumTitle.toFixed(3));
  const sumPlayoff = Object.values(S.playoff.odds).reduce((a, o) => a + o.playoff, 0);
  chk(Math.abs(sumPlayoff - 12) < 0.2, 'playoff chances sum to twelve: ' + sumPlayoff.toFixed(2));

  /* Parlays: the leg added above is priced */
  d.querySelector('#tabs button[data-tab="parlays"]').click();
  const legs = JSON.parse(w.localStorage.getItem('cfb_v1') || '{}').legs || [];
  chk(d.querySelectorAll('#legs .leg').length === legs.length, 'the builder lists the legs');
  if (legs.length) {
    chk(/Parlay odds/.test(txt($('parlayTotals'))) && /Model/.test(txt($('parlayTotals'))), 'a parlay is priced with the model beside it');
    $('saveParlay').click();
    chk(d.querySelectorAll('#savedList .saved').length === 1, 'saving keeps the parlay');
    chk(/pending/.test(txt($('savedList'))), 'an unplayed parlay is pending');
    chk(JSON.parse(w.localStorage.getItem('cfb_v1')).legs.length === 0, 'saving empties the builder');
  }

  /* Record */
  d.querySelector('#tabs button[data-tab="record"]').click();
  chk(new RegExp(`${S.record.su.w}-${S.record.su.l}`).test(txt($('recordTotals'))), 'record tab shows the straight-up record');
  chk(d.querySelectorAll('#recWeek tbody tr').length === Object.keys(S.record.byWeek).length, 'a row per graded week');
  chk(/Held out/.test(txt($('fitNote'))), 'the fit note reports the holdout');

  /* state invariants the page relies on */
  for (const g of S.games) {
    chk(g.pHome > 0 && g.pHome < 1, `chance in (0,1) on ${g.id}`);
    if (g.line && g.line.homeLine !== null) chk(g.cover && Math.abs(g.cover.home + g.cover.push + g.cover.away - 1) < 0.01, `cover chances sum to one on ${g.id} (${g.state}, mu ${g.mu}, line ${JSON.stringify(g.line)}, cover ${JSON.stringify(g.cover)})`);
    if (g.state === 'final') chk(!!g.result, `a final game is graded: ${g.id}`);
    if (g.state !== 'pre' && g.result && g.result.ats) chk(!!g.line, `an ATS grade has a line: ${g.id}`);
  }
  chk(errors.length === 0, 'runtime errors after walking: ' + errors.join(' | '));
  console.log(`${checks} checks, ${fails.length} failures`);
  for (const f of fails) console.log('  FAIL ' + f);
  process.exit(fails.length ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
