/* Smoke test for the built betting app: the string build.js returns, which nflbets/index.html
 * carries as the srcdoc of its Pick'em Record, Power Ratings and Bet Log frames.
 *
 *   node betting/tools/smoke.js
 *
 * Loads the built app in jsdom with fetch stubbed to serve betting/state.json, and checks:
 * the published season is shown, the private tabs are gone, a visitor's pick is kept in
 * their own storage and graded against the published result, and the embedded form (the
 * page around it sets window.EMBED_TAB and window.STATE_URL before the app runs) opens the
 * tab it is told to, headless, reading the season from where it is told.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const ROOT = path.resolve(__dirname, '..', '..');
const { buildApp } = require('./build.js');
const html = buildApp().replace(/<script src="https:\/\/cdnjs[^"]*"><\/script>/, '');
const state = fs.readFileSync(path.join(ROOT, 'betting', 'state.json'), 'utf8');
const eloModel = fs.readFileSync(path.join(ROOT, 'elo', 'data', 'model.json'), 'utf8');
for (const gone of ['index.html', 'admin.html'])
  if (fs.existsSync(path.join(ROOT, 'betting', gone))) throw new Error('betting/' + gone + ' is back; the betting site has no pages, the app lives in nflbets/index.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('  FAIL', m); } };

function load(picks) {
  const errors = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/betting/',
    beforeParse(w) {
      w.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) };
      w.fetch = async url => ({ ok: /state\.json/.test(String(url)), status: 200, json: async () => JSON.parse(state) });
      w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
      if (picks) w.localStorage.setItem('x_nfl_viewer_picks_2026', JSON.stringify(picks));
      w.addEventListener('error', e => errors.push(e.message));
    } });
  return { dom, errors };
}

(async () => {
  const published = JSON.parse(state);
  const graded = Object.keys(published.processed);
  const first = graded[0]; const p0 = published.processed[first];
  const winner = p0.result > 0 ? p0.home : p0.result < 0 ? p0.away : null;
  const loser = winner === p0.home ? p0.away : p0.home;

  // 1. fresh visitor
  const { dom, errors } = load(null); await sleep(300);
  const w = dom.window, d = w.document; const S = w.eval('S');
  check(errors.length === 0, 'no runtime errors: ' + errors.join('; '));
  check(Object.keys(S.processed).length === graded.length, `published season loaded (${Object.keys(S.processed).length} graded)`);
  /* My Picks is gone on purpose: the picks it held never left the browser that made them,
     and losing a week of them was the whole reason for dropping it. The key is untouched. */
  check([...d.querySelectorAll('#tabs button')].map(b => b.dataset.tab).join() === 'picks,bank,record,bets,ratings,upload,backup', 'every tab present but My Picks');
  check(!d.getElementById('tab-mine'), 'the My Picks section is gone with its tab');
  check(![...d.querySelectorAll('#tab-record th, .pickgrid th')].some(th => th.textContent.trim() === 'You'), 'no You column survives');
  check(!d.getElementById('rebuildBtn') && !d.getElementById('resetBtn') && !!d.getElementById('exportBtn'), 'Backup has save and import only');
  check(Object.keys(S.odds || {}).length > 0, 'published moneylines are available to the Parlay Builder tab');
  check(Object.keys(S.myPicks).length === 0 && Object.values(S.processed).every(p => p.myPick === null), 'a new visitor has no picks and inherits none of the owner\'s');
  { d.querySelector('#tabs button[data-tab="backup"]').click();
    const bs = d.getElementById('backupState');
    check(bs && bs.className !== 'err' && !/Everything you have entered/.test(bs.textContent), 'a visitor with no data gets no backup alarm: ' + (bs && bs.textContent.trim().slice(0, 60)));
    check(w.eval('myDataCount()') === 0, "myDataCount counts the visitor's own entries, not the published season"); }
  // the visitor picks the loser of the first graded game; save() should persist only picks
  S.myPicks[first] = loser; S.bank.lastAmt = 35; S.bets[1] = { staked: 20, returned: 35, note: 'visitor' }; w.eval('save()'); await sleep(400);
  const stored = JSON.parse(w.localStorage.getItem('x_nfl_viewer_picks_2026') || '{}');
  check(stored.myPicks && stored.myPicks[first] === loser, 'visitor pick saved to their own storage');
  check(stored.bank && stored.bank.lastAmt === 35 && stored.bets && stored.bets[1].returned === 35, 'visitor stake and bets saved to their own storage');
  check(w.localStorage.getItem('x_nfl_betting_model_2026_v1') === null, 'the full state is never written to the visitor\'s storage');

  // 2. returning visitor: pick graded against the published result
  const r2 = load({ myPicks: { [first]: loser }, bank: { lastAmt: 35, filter: 'all', build: [], mode: 'straight' }, bets: { 1: { staked: 20, returned: 35, note: 'visitor' } } }); await sleep(300);
  const S2 = r2.dom.window.eval('S');
  check(S2.processed[first].myPick === loser && S2.processed[first].myCorrect === (winner ? false : null), 'returning visitor: pick restored and graded as a miss');
  check(S2.bank.lastAmt === 35 && S2.bets[1] && S2.bets[1].returned === 35, 'returning visitor: stake and bets restored');
  check(r2.errors.length === 0, 'returning visitor: no runtime errors');
  const stamp = r2.dom.window.document.getElementById('saveState');
  await sleep(500);
  check(stamp && /^Updated /.test(stamp.textContent), 'page shows the publish time instead of an autosave note');
  r2.dom.window.eval('save()'); await sleep(500);
  check(/^Updated /.test(stamp.textContent), 'the publish time survives a save (no "Autosaved" on a published page)');
  { const S3 = r2.dom.window.eval('S'); S3.myPicks[first] = loser;
    r2.dom.window.document.querySelector('#tabs button[data-tab="backup"]').click();
    r2.dom.window.eval('renderBackupState()');
    const bs2 = r2.dom.window.document.getElementById('backupState');
    check(bs2.className === 'err' && /Everything you have entered/.test(bs2.textContent), 'a visitor who has picks does get the backup warning'); }

  // 3. the app on its own: same published season, every tab, private things from the same store
  const adminHtml = html;
  const a = new JSDOM(adminHtml, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/betting/admin.html',
    beforeParse(w2) { w2.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) }; w2.fetch = async url => ({ ok: /state\.json/.test(String(url)), status: 200, json: async () => JSON.parse(state) });
      w2.confirm = () => true; w2.alert = () => {}; w2.scrollTo = () => {};
      w2.localStorage.setItem('x_nfl_viewer_picks_2026', JSON.stringify({ myPicks: { [first]: loser }, bank: { lastAmt: 35, filter: 'all', build: [], mode: 'straight' }, bets: { 1: { staked: 20, returned: 35, note: 'visitor' } } })); } });
  await sleep(600);
  const SA = a.window.eval('S'); const da = a.window.document;
  check(Object.keys(SA.processed).length === graded.length, 'admin: published season loaded');
  check([...da.querySelectorAll('#tabs button')].map(b => b.dataset.tab).join() === 'picks,bank,record,bets,ratings,upload,backup', 'admin: every tab present but My Picks');
  check(!da.getElementById('tab-mine'), 'admin: the My Picks section is gone with its tab');
  check(![...da.querySelectorAll('#tab-record th, .pickgrid th')].some(th => th.textContent.trim() === 'You'), 'admin: no You column survives');
  check(!!da.getElementById('oddsFetch'), 'admin: moneylines card kept');
  check(SA.processed[first].myPick === loser && SA.bets[1].returned === 35 && SA.bank.lastAmt === 35, 'admin: picks, bets and stake come from the same browser store as the viewer');
  check(/straight-up, \d+ of \d+/.test(da.getElementById('recordStats').textContent) && !!da.querySelector('#modelChart svg'), 'admin: record and chart render from the published games');

  // Power Ratings carries the Impact absences table and not the rank-tag note
  // what the block says depends on the week's files, so the checks are on the shape: the element
  // is under Power Ratings; it carries the heading whenever the state has the files it is built
  // from; and its card is hidden exactly when it has nothing to say
  check(!!da.querySelector('#tab-ratings #injCard #injSuggest'), 'admin: Impact absences is not under Power Ratings');
  const injText = da.getElementById('injSuggest').textContent.trim();
  const injFiles = !!((SA.roster || SA.injuries) && SA.depth);
  check(!injFiles || /Impact absences, week \d+/.test(injText), 'admin: the state has the injury files but the absences block has no heading: ' + injText.slice(0, 80));
  check(!da.querySelector('#tab-upload #injSuggest'), 'admin: Impact absences is still on Data Upload too');
  check(!/Rank tags and the Elo change column/.test(da.getElementById('ratingsTable').textContent), 'admin: the rank-tag note is still under the ratings');
  check(da.getElementById('injCard').hidden === !injText, 'admin: the absences card is not hidden exactly when it is empty');
  for (const [where, re] of [['modelChart', /Running season accuracy after each week/], ['recordTable', /Early weeks bounce around/], ['injSuggest', /Two absences carry a measured effect/]])
    check(!re.test(da.getElementById(where).textContent), `admin: the note is still under ${where}`);
  check(!injFiles || /Impact absences, week \d+/.test(injText), 'admin: dropping the note took the absences heading with it');
  { const rt = da.getElementById('ratingsTable');
    check(rt.parentElement.id === 'ratingsCard' && rt.parentElement.classList.contains('card') && rt.parentElement.parentElement.id === 'tab-ratings', 'admin: the ratings table is not in a card of its own');
    check(rt.querySelectorAll('tbody tr').length === 32 && rt.querySelectorAll('tbody .tierbadge').length === 32, 'admin: every Elo should carry its tier shield');
    check(!rt.querySelector('.tierlegend') && !/Challenger 1700/.test(rt.textContent), 'admin: the tier key is still on the ratings table'); }
  const dv = dom.window.document;
  check(!!dv.querySelector('#tab-ratings #injCard #injSuggest') && !/Rank tags and the Elo change column/.test(dv.getElementById('ratingsTable').textContent), 'viewer: Power Ratings does not carry the absences table, or still carries the note');
  check(!da.getElementById('rebuildBtn') && !da.getElementById('resetBtn') && !!da.getElementById('exportBtn') && !!da.getElementById('importBtn'), 'admin: Backup keeps save and import, drops rebuild and reset');
  check(/your picks, Bet Log, bankroll and Bet Build/.test(da.getElementById('tab-backup').textContent), 'admin: Backup says what it covers');
  a.window.eval('S.lastBackup=Date.now()-3*86400000; S.lastBackupHow="downloaded"; save()'); await sleep(900);
  const kept = JSON.parse(a.window.localStorage.getItem('x_nfl_viewer_picks_2026') || '{}');
  check(kept.lastBackup && Date.now() - kept.lastBackup > 2 * 86400000, 'admin: the last-backup time is kept in the browser store');
  // 4. embedded: the X NFL Bets and Stats page sets the app into a srcdoc frame, one tab of it, headless.
  //    The frame has the page's address, so the season path is given and the tab is named.
  const embedFetched = [];
  const e = new JSDOM(adminHtml, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/nflbets/',
    beforeParse(w3) { w3.EMBED_TAB = 'record'; w3.STATE_URL = '../betting/state.json';
      w3.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) }; w3.fetch = async url => { embedFetched.push(String(url)); const u = String(url);
        if (/elo\/data\/model\.json/.test(u)) return { ok: true, status: 200, json: async () => JSON.parse(eloModel) };
        return { ok: /state\.json/.test(u), status: 200, json: async () => JSON.parse(state) }; };
      w3.confirm = () => true; w3.alert = () => {}; w3.scrollTo = () => {}; } });
  await sleep(600);
  const de = e.window.document;
  check(de.documentElement.classList.contains('embed'), 'embed: the page marks itself embedded');
  check(!de.getElementById('tab-record').hidden && de.getElementById('tab-picks').hidden, 'embed: EMBED_TAB opens the Records tab');
  check(/straight-up, \d+ of \d+/.test(de.getElementById('recordStats').textContent), 'embed: the record renders');
  check(embedFetched.some(u => u === '../betting/state.json'), 'embed: the season is not read from ../betting/state.json: ' + embedFetched.join(', '));
  check(/html\.embed header,html\.embed #tabs\{display:none\}/.test(adminHtml), 'embed: header and tab bar are hidden by the stylesheet');
  /* the Elo model rides along: read from elo/data/model.json beside the season, graded onto
     the games it called, and drawn on Records like the Joker */
  { const EM = JSON.parse(eloModel), SE = e.window.eval('S');
    const gradedIds = EM.graded.filter(g => g.correct !== null).map(g => g.game_id);
    check(embedFetched.some(u => /\.\.\/elo\/data\/model\.json/.test(u)), 'embed: the Elo model was not read from ../elo/data/model.json');
    check(gradedIds.length > 0 && gradedIds.every(id => SE.processed[id] && SE.processed[id].elo && typeof SE.processed[id].elo.correct === 'boolean'), 'embed: the Elo model\'s graded calls are not on the processed games');
    check(Object.keys(SE.elo || {}).length >= gradedIds.length + ((EM.next && EM.next.games) || []).length, 'embed: S.elo does not carry the graded and coming calls');
    /* the record's pictures: wins against Vegas (each model's wins minus the Vegas favourite's on
       the same games, week by week) and the week-by-week grid, the Elo model in both */
    const rec = de.getElementById('modelChart'), rtxt = rec.textContent.replace(/\s+/g, ' ');
    const want = gradedIds.filter(id => SE.processed[id].elo.correct).length;
    check(/Wins against Vegas/.test(rtxt) && !!rec.querySelector('svg.rv-chart') && !rec.querySelector('svg.wowchart'), 'embed: the record does not draw Wins against Vegas: ' + rtxt.slice(0, 120));
    check(new RegExp('ELO based ' + want + '\u2013' + (gradedIds.length - want)).test(rtxt), `embed: the legend should give ELO based ${want}\u2013${gradedIds.length - want}: ` + rtxt.slice(0, 300));
    check(rec.querySelectorAll('svg.rv-chart polyline[stroke="#E8730A"]').length === 1, 'embed: the Elo model has no line on the chart');
    /* Vegas is the baseline: the headline tiles are its record, and the old names are gone */
    { const win = r => r.result > 0 ? r.home : r.away, im = x => x < 0 ? -x / (-x + 100) : 100 / (x + 100);
      let c = 0, n = 0; for (const [gid, r] of Object.entries(SE.processed)) { if (r.result == null || r.result === 0) continue; const o = (SE.odds || {})[gid];
        if (!o || !o.home || !o.away) continue; const ph = im(o.home) / (im(o.home) + im(o.away)); n++; if ((ph >= 0.5 ? r.home : r.away) === win(r)) c++; }
      const tiles = de.getElementById('recordStats').textContent.replace(/\s+/g, ' ');
      check(n > 0 && tiles.includes(`Vegas straight-up, ${c} of ${n}`), `embed: the headline tiles should be Vegas's ${c} of ${n}: ` + tiles.slice(0, 120)); }
    check(!/Main Model|main model/.test(de.body.textContent), 'embed: the page still says Main Model somewhere');
    check(/= Vegas/.test(rec.querySelector('svg.rv-chart').textContent), 'embed: the zero line is not marked as Vegas');
    /* the Main Model against Vegas, counted here from the published games */
    { const win = r => r.result > 0 ? r.home : r.away, vp = r => !r.line ? null : (r.line > 0 ? r.home : r.away);
      let net = 0; for (const r of Object.values(SE.processed)) { if (r.correct === null || vp(r) === null) continue; net += (r.correct ? 1 : 0) - (vp(r) === win(r) ? 1 : 0); }
      const sg = net > 0 ? '+' + net : (net < 0 ? '\u2212' + Math.abs(net) : '0');
      check(rtxt.includes('Model A') && new RegExp('Model A \\d+\u2013\\d+ ' + sg.replace('+', '\\+') + ' vs Vegas').test(rtxt), `embed: Model A should read ${sg} vs Vegas: ` + rtxt.slice(0, 300)); }
    const gridRows = [...de.querySelectorAll('#recordTable table.rv-grid tbody tr')].map(tr => tr.querySelector('th').textContent.trim());
    check(gridRows.includes('ELO based') && gridRows.indexOf('ELO based') === gridRows.indexOf('The Joker') + 1 && gridRows[gridRows.length - 1] === 'Vegas', 'embed: the week-by-week grid rows are wrong: ' + gridRows.join('|'));
    { const eloRow = [...de.querySelectorAll('#recordTable table.rv-grid tbody tr')].find(tr => tr.querySelector('th').textContent.trim() === 'ELO based');
      check(!!eloRow && eloRow.querySelector('td.rv-season b').textContent === `${want}\u2013${gradedIds.length - want}`, 'embed: the grid\'s Elo season cell is wrong'); }
    de.getElementById('picksToggle').click(); await sleep(80);
    const gridHead = [...de.querySelector('.pickgrid').querySelectorAll('thead th')].map(th => th.textContent.trim());
    check(gridHead.includes('ELO based') && gridHead.includes('Model A') && !gridHead.includes('Main Model'), 'embed: the pick grid has no ELO based column: ' + gridHead.join('|'));
    const firstRow = de.querySelector('.pickgrid tbody tr');
    check(!!firstRow && firstRow.querySelectorAll('td').length === gridHead.length, 'embed: the pick grid rows do not match its columns');
    /* one week at a time: this week by default, the weeks before it in the picker, nothing beyond */
    const weeksAll = [...new Set(SE.schedule.map(g => +g.week))].sort((x, y) => x - y);
    const cur = weeksAll.find(w => SE.schedule.some(g => +g.week === w && g.result == null)) || weeksAll[weeksAll.length - 1];
    const sel = de.getElementById('picksWeek');
    check(!!sel && +sel.value === cur && /this week/.test(sel.selectedOptions[0].textContent), 'embed: the pick grid does not open on this week: ' + (sel && sel.selectedOptions[0].textContent));
    const opts = [...sel.options].map(o => +o.value);
    check(opts.length === cur && Math.max(...opts) === cur && Math.min(...opts) === 1, 'embed: the picker should offer weeks 1-' + cur + ' only: ' + opts.join(','));
    check(de.querySelectorAll('.pickgrid').length === 1, 'embed: more than one week of picks is drawn at once');
    const thisWeekGame = SE.schedule.find(g => +g.week === cur);
    check(!!thisWeekGame && de.querySelector('.pickgrid').textContent.includes(thisWeekGame.away_team + ' at ' + thisWeekGame.home_team), 'embed: the grid shown is not this week\'s');
    sel.value = String(cur - 1); sel.dispatchEvent(new e.window.Event('change', { bubbles: true })); await sleep(80);
    const prevGame = SE.schedule.find(g => +g.week === cur - 1);
    check(+de.getElementById('picksWeek').value === cur - 1 && de.querySelector('.pickgrid').textContent.includes(prevGame.away_team + ' at ' + prevGame.home_team), 'embed: picking the week before did not show it');
    /* a week part played (Thursday's game graded, Sunday's to come) is still this week */
    { const g = SE.schedule.find(x => +x.week === cur);
      e.window.eval(`(()=>{ const g=S.schedule.find(x=>x.game_id===${JSON.stringify(g.game_id)}); g.result=7; g.home_score=24; g.away_score=17;
        S.processed[g.game_id]={week:${cur},home:g.home_team,away:g.away_team,pick:g.home_team,conf:0.6,margin:3,pHome:0.6,result:7,correct:true,h:null,news:[]};
        S.picksWeek=null; renderRecord(); })()`); await sleep(80);
      const s2 = de.getElementById('picksWeek');
      check(!!s2 && +s2.value === cur && /this week/.test(s2.selectedOptions[0].textContent) && ![...s2.options].some(o => +o.value > cur),
        'embed: one graded game moved the picker past this week: ' + (s2 && s2.selectedOptions[0].textContent)); } }
  /* clicking a tab inside the frame must not throw on the address it cannot write */
  { let threw = null; e.window.addEventListener('error', ev => { threw = ev.message; });
    de.querySelector('#tabs button[data-tab="bets"]').click(); await sleep(50);
    check(!threw && !de.getElementById('tab-bets').hidden, 'embed: switching tabs inside the frame failed: ' + threw); }
  /* the old ?embed#tab form still works for a copy opened on its own */
  const e2 = new JSDOM(adminHtml, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/betting/app.html?embed=1#record',
    beforeParse(w4) { w4.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) }; w4.fetch = async url => ({ ok: /state\.json/.test(String(url)), status: 200, json: async () => JSON.parse(state) });
      w4.confirm = () => true; w4.alert = () => {}; w4.scrollTo = () => {}; } });
  await sleep(600);
  check(e2.window.document.documentElement.classList.contains('embed') && !e2.window.document.getElementById('tab-record').hidden, 'embed: ?embed#record on its own no longer works');
  const plain = a.window.document.documentElement;
  check(!plain.classList.contains('embed'), 'a page opened normally is not embedded');
  console.log(fails ? `${fails} check(s) failed` : `betting app smoke test passed (${graded.length} graded games in the published state)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
