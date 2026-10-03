/* Smoke test for the built betting app: the string build.js returns, which nflbets/index.html
 * carries as the srcdoc of its Pick'em Record, Power Ratings and Bet Log frames.
 *
 *   node betting/tools/smoke.js
 *
 * Loads the built app in jsdom with fetch stubbed to serve betting/state.json, and checks:
 * the published season is shown, every tab but My Picks is there, a visitor's pick is kept in
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
    beforeParse(w2) { w2.Papa = { parse: () => ({ data: [], meta: { fields: [] } }) }; w2.fetch = async url => /elo\/data\/model\.json/.test(String(url)) ? { ok: true, status: 200, json: async () => JSON.parse(eloModel) } : ({ ok: /state\.json/.test(String(url)), status: 200, json: async () => JSON.parse(state) });
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
  for (const [where, re] of [['modelChart', /Running season accuracy after each week/], ['modelChart', /Early weeks bounce around/], ['injSuggest', /Two absences carry a measured effect/]])
    check(!re.test(da.getElementById(where).textContent), `admin: the note is still under ${where}`);
  { const rt = da.getElementById('ratingsTable');
    check(rt.parentElement.id === 'ratingsCard' && rt.parentElement.classList.contains('card') && rt.parentElement.parentElement.id === 'tab-ratings', 'admin: the ratings table is not in a card of its own');
    /* the ELO based model's ratings: every team, best first, each with its shield and its change since its last game */
    { const rows = [...rt.querySelectorAll('table.rt-v tbody tr')], vals = rows.map(tr => +tr.querySelector('.elocell b').textContent), want = JSON.parse(eloModel).teams;
      check(rows.length === 32 && rows.length === Object.keys(want).length && vals.every((v, i) => i === 0 || v <= vals[i - 1]), 'admin: Power Ratings does not show the ELO based model\'s 32 ratings, best first');
      check(Math.abs(vals.reduce((x, v) => x + v, 0) / vals.length - 1500) < 2, 'admin: the ELO based ratings do not average 1500');
      check(rows.every(tr => tr.children.length === 7 && tr.querySelector('.tierbadge') && tr.querySelector('.movecell .elomv') && /^\d+%$/.test(tr.querySelector('.rt-pct').textContent)), 'admin: every row should carry its tier shield, Elo change and chance against an average team');
      check(!rt.querySelector('[data-rv]') && !/Vegas|Model A/.test(rt.textContent), 'admin: Power Ratings still shows Vegas or a Model A switch');
      check(!!rt.querySelector('svg defs linearGradient[id^="tg-"]'), 'admin: the tier shields have no gradients to fill them');
      const T = e => a.window.eval('eloTier(' + e + ')[0]');
      check(T(1760) === 'HOF' && T(1720) === 'Elite' && T(1360) === 'Iron' && T(1300) === 'Wood' && /tier-hof/.test(a.window.eval('tierBadge(1760)')), 'admin: the built app does not carry the Wood to HOF ladder'); }
    check(!rt.querySelector('.tierlegend') && !/Elite 1700/.test(rt.textContent), 'admin: the tier key is still on the ratings table'); }
  const dv = dom.window.document;
  check(!!dv.querySelector('#tab-ratings #injCard #injSuggest') && !/Rank tags and the Elo change column/.test(dv.getElementById('ratingsTable').textContent), 'viewer: Power Ratings does not carry the absences table, or still carries the note');
  check(!da.getElementById('rebuildBtn') && !da.getElementById('resetBtn') && !!da.getElementById('exportBtn') && !!da.getElementById('importBtn'), 'admin: Backup keeps save and import, drops rebuild and reset');
  check(/your picks, Bet Log, bankroll and Bet Build/.test(da.getElementById('backupCard').textContent) && !!da.querySelector('#tab-bets #backupCard #exportBtn') && !!da.querySelector('#tab-bets #backupCard #importBtn'), 'admin: Save and Import are not on the Bet Log, or the card does not say what it covers');
  /* an import on the published page takes the visitor's entries from the file and keeps the published season */
  { const pub = JSON.stringify(a.window.eval('S.teams')), file = JSON.parse(JSON.stringify(a.window.eval('S')));
    file.teams = { OLD: { elo: 1 } }; file.myPicks = { imported_game: 'BUF' }; file.bets = { 7: { staked: 10, returned: 0, note: 'from the file' } };
    a.window.confirm = () => true;
    const inp = da.getElementById('importInput');
    Object.defineProperty(inp, 'files', { value: [{ text: async () => JSON.stringify(file) }], configurable: true });
    inp.dispatchEvent(new a.window.Event('change'));
    await sleep(100);
    const S2 = a.window.eval('S');
    check(S2.myPicks.imported_game === 'BUF' && S2.bets[7] && S2.bets[7].note === 'from the file' && JSON.stringify(S2.teams) === pub, 'admin: an import did not take the visitor\'s entries and keep the published season'); }
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
    /* graded: what the file graded, plus the coming week's calls whose games the season has scored */
    const gradedIds = EM.graded.filter(g => g.correct !== null).map(g => g.game_id)
      .concat(((EM.next && EM.next.games) || []).filter(g => { const p = SE.processed[g.game_id]; return p && p.result != null && p.result !== 0; }).map(g => g.game_id));
    check(gradedIds.every(id => { const p = SE.processed[id], n = ((EM.next && EM.next.games) || []).find(g => g.game_id === id);
      return !n || p.elo.correct === (n.pick === (p.result > 0 ? p.home : p.away)); }), 'embed: a coming-week Elo call was graded against the wrong winner');
    check(embedFetched.some(u => /\.\.\/elo\/data\/model\.json/.test(u)), 'embed: the Elo model was not read from ../elo/data/model.json');
    check(gradedIds.length > 0 && gradedIds.every(id => SE.processed[id] && SE.processed[id].elo && typeof SE.processed[id].elo.correct === 'boolean'), 'embed: the Elo model\'s graded calls are not on the processed games');
    check(Object.keys(SE.elo || {}).length >= EM.graded.length + ((EM.next && EM.next.games) || []).length, 'embed: S.elo does not carry the graded and coming calls');
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
    /* the Bet Log as a bankroll: a Balance view (the account from the deposit, its reference line
       labelled, the latest balance at the line's end) and a Weekly P&L view (a column a week from $0,
       each labelled with its signed amount, a week off saying so), switched in place; the balance
       first among the figures; the table's running total with the balance beside it */
    { const SB = e.window.eval('S'); const keepB = JSON.stringify(SB.bets || {}), keepK = JSON.stringify(SB.bank || {});
      const M = '\u2212', tx = el => el.textContent.replace(/\s+/g, ' ');
      SB.bets = { 1: { staked: 10, returned: 8.71, note: '' }, 3: { staked: 11, returned: 14.66, note: '' } };
      SB.bank = Object.assign({}, SB.bank || {}, { deposit: 100, betView: 'balance' }); e.window.eval('renderRecord()');
      let bc = de.getElementById('betChart');
      check(!!bc.querySelector('svg.bv-balance') && /Deposited \$100\.00/.test(tx(bc.querySelector('svg'))) && tx(bc.querySelector('.bv-end')) === '$102.37'
        && ['Start', 'Wk 1', 'Wk 2', 'Wk 3'].every(l => tx(bc.querySelector('svg')).includes(l)) && bc.querySelectorAll('svg circle').length === 3,
        'embed: the Balance view does not run Start to week 3 from the $100 deposit to $102.37, week 2 included: ' + tx(bc.querySelector('svg') || bc).slice(0, 160));
      check(bc.querySelector('.stat-strip .stat').classList.contains('bv-balance') && tx(bc.querySelector('.bv-balance b')) === '$102.37' && /\+\$2\.37/.test(tx(bc)) && /1 of 2/.test(tx(bc)), 'embed: the figures do not lead with the balance $102.37');
      bc.querySelector('[data-bv="pnl"]').click(); bc = de.getElementById('betChart');
      const ptxt = tx(bc.querySelector('svg') || bc);
      check(SB.bank.betView === 'pnl' && !!bc.querySelector('svg.bv-pnl') && ptxt.includes(M + '$1.29') && ptxt.includes('+$3.66') && /no bets/.test(ptxt) && bc.querySelectorAll('svg path').length === 2,
        'embed: the Weekly P&L view does not show a labelled column for weeks 1 and 3 and say week 2 had no bets: ' + ptxt.slice(0, 160));
      bc.querySelector('.bv-hit[data-i="2"]').dispatchEvent(new e.window.Event('mouseenter'));
      check(/Week 3/.test(tx(bc.querySelector('.bv-tip'))) && /Balance \$102\.37/.test(tx(bc.querySelector('.bv-tip'))), 'embed: hovering week 3 does not show its money and the balance: ' + tx(bc.querySelector('.bv-tip')));
      const bt = de.getElementById('betTable'), cells = i => [...bt.querySelectorAll('tbody tr')].map(tr => tr.children[i].textContent).join('|');
      check(cells(4) === M + '$1.29|+$2.37' && cells(5) === '$98.71|$102.37', 'embed: the table does not carry the running total and the balance: ' + cells(4) + ' / ' + cells(5));
      SB.bank.betView = 'balance'; de.getElementById('betDeposit').value = ''; de.getElementById('betDepositSave').click();
      check(SB.bank.deposit === null && tx(de.querySelector('#betChart .bv-balance b')) === '–' && /Break even/.test(tx(de.querySelector('#betChart svg'))) && ![...de.querySelectorAll('#betTable thead th')].some(th => th.textContent === 'Balance'), 'embed: without a deposit the chart does not fall back to break even');
      SB.bets = JSON.parse(keepB); SB.bank = JSON.parse(keepK); e.window.eval('renderRecord()'); }
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
  const plain = a.window.document.documentElement;
  check(!plain.classList.contains('embed'), 'a page opened normally is not embedded');
  console.log(fails ? `${fails} check(s) failed` : `betting app smoke test passed (${graded.length} graded games in the published state)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
