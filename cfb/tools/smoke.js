/* Boot cfb/index.html in jsdom against the published cfb/state.json and news.json, walk every
   tab, then hold the state to what it was built from.

    node cfb/tools/smoke.js        (from the hub root or from cfb/tools)

   Must end "0 failures". Checks are against the page's invariants and against reality (the
   clock, the schedule, the injury report the news was written from, the last publish), never
   against what the week's data happens to offer: an off week, a lean slate, opening day, a day
   with no injury report, a game already played or postponed must not fail it. What needs a
   case the week may not have (a game kicking off, a line gone stale, a time not set, a score
   under way, a postponement) is played on a copy of the state with those games made up.

   The page runs in America/Los_Angeles (CFB_SMOKE_TZ to change it): a kickoff whose time is
   not set is dated midnight Eastern by ESPN, which is the evening before out west.

   The files: CFB_STATE and CFB_NEWS (default the published ones); the last publish, for the
   frozen-call checks, is CFB_PREV_STATE or else `git show HEAD:cfb/state.json` (in the job,
   the commit the run started from). A state or news file older than the job that writes
   schema 2 skips the checks on what only the new job writes, and says so; CFB_SMOKE_STRICT=1
   (the workflow sets it) fails them instead. */
'use strict';
process.env.TZ = process.env.CFB_SMOKE_TZ || 'America/Los_Angeles';
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM } = require('jsdom');
const C = require('./season');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(process.env.CFB_HTML || path.join(ROOT, 'index.html'), 'utf8');   // CFB_HTML: another page, for the gate's own tests
const STATE_PATH = process.env.CFB_STATE || path.join(ROOT, 'state.json');
const NEWS_PATH = process.env.CFB_NEWS || path.join(ROOT, 'news.json');
const STATE = fs.readFileSync(STATE_PATH, 'utf8');
const S = JSON.parse(STATE);
const NEWS = fs.existsSync(NEWS_PATH) ? fs.readFileSync(NEWS_PATH, 'utf8') : null;
const STRICT = process.env.CFB_SMOKE_STRICT === '1';

const fails = []; let checks = 0; const skipped = [];
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
const skip = msg => { if (STRICT) chk(false, 'strict: ' + msg); else skipped.push(msg); };
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
const wait = ms => new Promise(r => setTimeout(r, ms));
const isPh = id => !(Number(id) > 0);
const phGame = g => !!g.placeholder || isPh(g.home) || isPh(g.away);
const tbdOf = g => g.tbd === true || (g.tbd === undefined && g.state === 'pre' && /^TBD$/i.test(g.detail || ''));
const inWeek = (st, g) => st.week === 'post' ? g.type === 3 : g.type === 2 && g.week === st.week;
const runOf = st => st.run || C.stamp(Date.parse(st.published));
const RUN_MS = Date.parse(runOf(S));
/* the page's rule, said independently: a line read at the job's last run */
const fresh = (st, g) => !!g.line && (st.run ? g.line.at === st.run : Math.abs(Date.parse(st.published) - Date.parse(g.line.at || 0)) < 3600e3);
const etDay = iso => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' });
/* a game still to be played at the run: not final, not called off, not one ESPN no longer lists,
   not a scheduled game ESPN left two days past its kickoff */
const openAt = (g, runMs) => g.state !== 'final' && g.state !== 'postponed' && !g.gone && !(g.state === 'pre' && Date.parse(g.date) < runMs - 2 * 864e5);
const HOLD_MS = 24 * 3600e3;          // a line ESPN left out, read within this long before kickoff, is held for the grade

/* the page in jsdom, over a state and news file, with the clock at nowMs and ESPN's scoreboard
   answering `espn` (events) */
async function boot({ state = STATE, news = NEWS, nowMs = RUN_MS, espn = [], store = null } = {}) {
  const errors = [];
  const dom = new JSDOM(HTML.replace(/<link[^>]*fonts[^>]*>/g, ''), {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/cfb/',
    beforeParse(w) {
      const RD = w.Date;
      class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(nowMs); } static now() { return nowMs; } }
      w.Date = FD;
      if (store) w.localStorage.setItem('cfb_v1', JSON.stringify(store));
      w.fetch = async url => {
        if (String(url).startsWith('state.json')) return { ok: true, json: async () => JSON.parse(state) };
        if (String(url).startsWith('news.json')) return news ? { ok: true, json: async () => JSON.parse(news) } : { ok: false, status: 404 };
        if (String(url).includes('espn.com')) return { ok: true, json: async () => ({ events: espn }) };
        return { ok: false, status: 404 };
      };
      w.addEventListener('error', e => errors.push(e.message));
    },
  });
  await wait(300);
  const w = dom.window, d = w.document;
  return { w, d, $: id => d.getElementById(id), errors };
}
const tab = (P, name) => P.d.querySelector(`#tabs button[data-tab="${name}"]`).click();
const scope = (P, id, s) => P.d.querySelector(`#${id} button[data-scope="${s}"]`).click();
const card = (P, id) => P.d.querySelector(`#games .game[data-id="${id}"]`);
const listed = P => [...P.d.querySelectorAll('#plLines button[data-leg]')].map(b => b.dataset.leg.split('|')[0]);

async function main() {
  /* ---------- the page at the moment the job published ---------- */
  const P = await boot();
  const { w, d, $ } = P;
  chk(P.errors.length === 0, 'runtime errors: ' + P.errors.join(' | '));
  chk(/season/.test(txt($('stamp'))), 'header stamp says the season: ' + txt($('stamp')));
  chk(txt($('buildTag')).startsWith('cfb v'), 'build tag on the header');

  /* Games: the current week opens, with a card per game and the model's chance on each side */
  chk($('weekSel').value === String(S.week), `week selector opens on the current week (${$('weekSel').value} vs ${S.week})`);
  const wk = S.games.filter(g => inWeek(S, g));
  const majors = wk.filter(g => S.teams[g.home].major || S.teams[g.away].major);
  let cards = d.querySelectorAll('#games .game');
  chk(cards.length === majors.length, `major-school filter shows ${majors.length} games, not ${cards.length}`);
  scope(P, 'scope', 'all');
  cards = d.querySelectorAll('#games .game');
  chk(cards.length === wk.length, `all-FBS filter shows ${wk.length} games, not ${cards.length}`);
  for (const c of cards) {
    if (c.dataset.placeholder) { chk(c.querySelectorAll('.wp').length === 0 && /to be decided/.test(txt(c)), 'a game against an opponent still to be decided shows no chances'); continue; }
    const wps = [...c.querySelectorAll('.wp')].map(x => parseInt(txt(x)));
    chk(wps.length === 2 && Math.abs(wps[0] + wps[1] - 100) <= 1, 'the two chances on a card add to 100: ' + wps.join('+'));
    chk(/Model spread/.test(txt(c)), 'a card shows the model spread');
  }
  /* the cards run in kickoff order, a game whose time is not set after the timed games of its day */
  const order = [...cards].map(c => S.games.find(g => g.id === c.dataset.id));
  chk(order.every((g, i) => i === 0 || Date.parse(order[i - 1].date) + (tbdOf(order[i - 1]) ? 86399e3 : 0) <= Date.parse(g.date) + (tbdOf(g) ? 86399e3 : 0)), 'the Games tab runs in kickoff order, a TBA time after its day\'s timed games');
  for (const g of wk.filter(tbdOf)) chk(txt(card(P, g.id)).includes(etDay(g.date)) && /time TBA/.test(txt(card(P, g.id))), `a game with no time set shows its Eastern day and "time TBA": ${g.id} ${txt(card(P, g.id).querySelector('.when'))}`);
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
  /* every button on the tab is on a game still to come with a line read at the last run */
  for (const b of d.querySelectorAll('#games button[data-leg]')) {
    const g = S.games.find(x => x.id === b.dataset.leg.split('|')[0]);
    chk(g && g.state === 'pre' && Date.parse(g.date) > RUN_MS && fresh(S, g), `a button is offered only on a game to come with a current line: ${b.dataset.leg}`);
  }
  /* a finished game shows its result; the rest offer legs only when a line exists */
  d.querySelector('#weekSel').value = '1'; d.querySelector('#weekSel').dispatchEvent(new w.Event('change'));
  const finals = [...d.querySelectorAll('#games .game')];
  chk(finals.length > 0 || !S.games.some(g => g.week === 1), 'week 1 renders');
  chk(finals.every(c => /call right|call wrong|no line yet|edge|no call|to be decided|Postponed/.test(txt(c))), 'every card carries a call, a result or the reason there is none');

  /* CFB News: a tile per game on the slate, each opening the breakdown window */
  tab(P, 'news');
  await wait(200);
  const N = NEWS ? JSON.parse(NEWS) : { games: [] };
  const tiles = d.querySelectorAll('#slate button[data-news]');
  chk(tiles.length === N.games.length, `a tile per game on the slate (${tiles.length} vs ${N.games.length})`);
  for (const t of tiles) chk(/Full breakdown/.test(txt(t)) && txt(t.querySelector('.hook')).length > 20, 'a tile carries a note and the breakdown link');
  if (tiles.length) {
    tiles[0].click();
    chk($('ov').classList.contains('on'), 'a tile opens the window');
    chk(d.querySelectorAll('#ovbox .tb').length === 2, 'the window has a block per team');
    chk(d.querySelectorAll('#ovbox .tb li').length >= 2, 'the blocks carry matchup bullets');
    chk(d.querySelectorAll('#ovbox .sbar').length >= 10, 'the stat breakdown has its bars');
    $('ovx').click();
    chk(!$('ov').classList.contains('on'), 'the window closes');
  }
  /* sacks are compared a game, not as season totals between teams with different games played */
  for (const n of N.games) {
    const b = [...tiles].find(t => t.dataset.news === n.id); if (!b) continue;
    b.click();
    const rows = [...d.querySelectorAll('#ovbox .sbar')].filter(r => /^Sacks/.test(txt(r.querySelector('.lb'))));
    chk(rows.length === 2 && rows.every(r => /per game/.test(txt(r.querySelector('.lb')))), `the window's sack rows say per game: ${n.id}`);
    const per = (s, k, kg) => s && (s[kg] ?? (s[k] !== null && s[k] !== undefined && s.gp ? Math.round(s[k] / s.gp * 10) / 10 : null));
    const want = [per(n.teams.away.stats, 'sk', 'skg'), per(n.teams.home.stats, 'sk', 'skg')];
    const shown = [...rows[0].querySelectorAll('.sv')].map(x => txt(x));
    chk(rows[0] && shown.every((v, i) => want[i] === null || want[i] === undefined ? v === '–' : Math.abs(parseFloat(v) - want[i]) < 0.051), `sacks a game shown as the season total over games played (${n.id}: ${shown} vs ${want})`);
    if (n.gaps && n.gaps.length) chk(/Not read/.test(txt($('ovgaps'))), `a window says which feeds were not read: ${n.id}`);
    if (n.stale) chk(/did not answer/.test(txt($('ovstale'))), `a preview carried from an earlier run says when it was written: ${n.id}`);
    for (const s of [n.teams.away.stats, n.teams.home.stats]) if (s && s.skg !== undefined && s.skg !== null && s.sk !== null && s.gp) chk(Math.abs(s.skg - s.sk / s.gp) < 0.051, `sacks a game are the season's sacks over games played (${n.id}: ${s.skg} vs ${s.sk}/${s.gp})`);
    $('ovx').click();
  }
  for (const n of N.games) {
    chk(!/losss|undefined|NaN|null/.test(n.note), 'a note reads cleanly: ' + n.note);
    for (const side of ['home', 'away']) for (const b of n.teams[side].bullets) chk(!/undefined|NaN|losss/.test(b), 'a bullet reads cleanly: ' + b);
  }
  newsChecks(N);

  /* Rankings */
  tab(P, 'rankings');
  const basis = S.rankings.cfp || S.rankings.ap;
  const rrows = d.querySelectorAll('#rankTable tbody tr');
  chk(!basis || rrows.length === basis.ranks.length, `rankings table has ${basis ? basis.ranks.length : 0} rows, not ${rrows.length}`);
  if (basis) chk(/Model/.test(txt(d.querySelector('#rankTable thead'))), 'rankings table has the model column');
  if (basis && basis.carried) chk(/did not carry this poll/.test(txt($('rankNote'))) && txt($('rankNote')).includes(new Date(basis.read).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })), 'a poll carried from the last publish says so, with its date');

  /* Power ratings */
  tab(P, 'ratings');
  const fbs = Object.values(S.teams).filter(t => t.fbs), major = fbs.filter(t => t.major);
  chk(d.querySelectorAll('#ratTable tbody tr').length === major.length, `ratings table shows the ${major.length} major schools`);
  $('ratMajor').checked = false; $('ratMajor').dispatchEvent(new w.Event('change'));
  chk(d.querySelectorAll('#ratTable tbody tr').length === fbs.length, `ratings table shows all ${fbs.length} FBS teams when asked`);
  chk(txt(d.querySelector('#ratTable tbody tr td')) === '1', 'ratings start at rank 1');

  /* Playoff */
  tab(P, 'playoff');
  chk(d.querySelectorAll('#bracket .seedline').length === 12, 'the bracket seats twelve teams');
  const autos = d.querySelectorAll('#bracket .auto').length;
  chk(S.playoff.bracket.set ? autos >= 5 : autos === 5, `five automatic bids in the bracket (${autos})`);
  chk(d.querySelectorAll('#poTable tbody tr').length > 0, 'playoff odds table has rows');
  chk(d.querySelectorAll('#standings details').length === Object.keys(S.playoff.standings).length, 'a standings block per conference');
  const sumTitle = Object.values(S.playoff.odds).reduce((a, o) => a + o.title, 0);
  chk(Math.abs(sumTitle - 1) < 0.02, 'national title chances sum to one: ' + sumTitle.toFixed(3));
  const sumPlayoff = Object.values(S.playoff.odds).reduce((a, o) => a + o.playoff, 0);
  chk(Math.abs(sumPlayoff - 12) < 0.2, 'playoff chances sum to twelve: ' + sumPlayoff.toFixed(2));
  for (const f of S.playoff.bracket.field.filter(x => x.out)) chk([...d.querySelectorAll('#bracket .seedline')].some(l => txt(l.querySelector('.seed')) === String(f.seed) && /\bout\b/.test(txt(l))), `an eliminated team is marked out in the bracket: ${f.team}`);

  /* Parlays: the week's lines still to come at this moment are offered, and only those */
  tab(P, 'parlays');
  const coming = S.games.filter(g => inWeek(S, g) && !phGame(g) && g.state === 'pre' && Date.parse(g.date) > RUN_MS && fresh(S, g) && (S.teams[g.home].major || S.teams[g.away].major));
  chk(d.querySelectorAll('#plLines tbody tr').length === Math.max(1, coming.length), `the Parlays tab lists the ${coming.length} lined games still to come`);
  if (coming.length) {
    chk(d.querySelectorAll('#plLines button[data-leg]').length >= coming.length, 'each listed game offers at least one button');
    const before = (JSON.parse(w.localStorage.getItem('cfb_v1') || '{}').legs || []).length;
    const pb = [...d.querySelectorAll('#plLines button[data-leg]')].find(b => !b.classList.contains('on'));
    pb.click();
    const after = (JSON.parse(w.localStorage.getItem('cfb_v1') || '{}').legs || []).length;
    chk(after >= before, 'a button on the Parlays tab adds a leg');
    chk(d.querySelectorAll('#legs .leg').length === after, 'the builder redraws with it');
  }
  const legs = JSON.parse(w.localStorage.getItem('cfb_v1') || '{}').legs || [];
  chk(d.querySelectorAll('#legs .leg').length === legs.length, 'the builder lists the legs');
  if (legs.length) {
    chk(/Parlay odds/.test(txt($('parlayTotals'))) && /Model/.test(txt($('parlayTotals'))), 'a parlay is priced with the model beside it');
    $('saveParlay').click();
    chk(d.querySelectorAll('#savedList .saved').length === 1, 'saving keeps the parlay');
    chk(/pending/.test(txt($('savedList'))), 'an unplayed parlay is pending');
    chk(JSON.parse(w.localStorage.getItem('cfb_v1')).legs.length === 0, 'saving empties the builder');
  }

  /* Record: the header and the tab lead with the calls made before kickoff, beside the book's favourite */
  tab(P, 'record');
  chk(new RegExp(`${S.record.su.w}-${S.record.su.l}`).test(txt($('recordTotals'))), 'record tab shows the straight-up record');
  chk(d.querySelectorAll('#recWeek tbody tr').length === Object.keys(S.record.byWeek).length, 'a row per graded week');
  chk(/Held out/.test(txt($('fitNote'))), 'the fit note reports the holdout');
  recordChecks(P);
  chk(P.errors.length === 0, 'runtime errors after walking: ' + P.errors.join(' | '));
  if ((S.notes || []).length) chk(!$('runNotes').hidden && S.notes.every(x => txt($('runNotes')).includes(x.slice(0, 40))), 'the run\'s notes (a feed carried, a poll dated) are on the page');

  await clockChecks();
  stateChecks();
  prevChecks();

  console.log(`${checks} checks, ${fails.length} failures`);
  for (const s of skipped) console.log('  SKIP ' + s);
  for (const f of fails) console.log('  FAIL ' + f);
  process.exit(fails.length ? 1 : 0);
}

/* ---------- the record, recomputed from the games ---------- */
function recordChecks(P) {
  const X = { live: { w: 0, l: 0 }, book: { w: 0, l: 0, n: 0 } };
  for (const r of S.games) {
    if (!r.result || !r.frozen) continue;
    r.result.su ? X.live.w++ : X.live.l++;
    const L = r.line; let fav = null;
    if (L && L.homeLine !== null && L.homeLine !== undefined && L.homeLine !== 0) fav = L.homeLine < 0 ? 'home' : 'away';
    else if (L && L.homeML != null && L.awayML != null && L.homeML !== L.awayML) fav = L.homeML < L.awayML ? 'home' : 'away';
    if (fav) { X.book.n++; (fav === 'home') === (r.hs > r.as) ? X.book.w++ : X.book.l++; }
  }
  chk(txt(P.$('stamp')).includes(`${X.live.w}-${X.live.l} SU called before kickoff`), `the header leads with the record called before kickoff (${X.live.w}-${X.live.l}): ${txt(P.$('stamp'))}`);
  if (X.book.n) chk(txt(P.$('recordTotals')).includes(`${X.book.w}-${X.book.l}`) && /DraftKings favourite/.test(txt(P.$('recordTotals'))), `the record tab sets DraftKings' favourite (${X.book.w}-${X.book.l}) beside the model`);
  if (S.record.live) {
    chk(S.record.live.su.w === X.live.w && S.record.live.su.l === X.live.l, `the job's record.live (${JSON.stringify(S.record.live.su)}) is the frozen calls' (${X.live.w}-${X.live.l})`);
    chk(S.record.book.book.w === X.book.w && S.record.book.book.l === X.book.l && S.record.book.games === X.book.n, `the job's book baseline is DraftKings' favourite on the same games (${JSON.stringify(S.record.book)})`);
  } else skip('state.json predates record.live: the job\'s split is not checked');
}

/* ---------- the news file against what it was written from ---------- */
function newsChecks(N) {
  if (!N.games.length) return;
  if (!(N.schema >= 2)) { skip('news.json predates schema 2: the leaders, injuries and headlines it was written from are not in it'); }
  const T = S.teams, G = new Map(S.games.map(g => [g.id, g]));
  const namesOf = t => [...new Set([t.name, t.short, (t.short || '').replace(/ St$/, ' State'), t.abbr && t.abbr.length > 3 ? t.abbr : null].filter(x => x && x.length > 2))].sort((a, b) => b.length - a.length);
  const esc = n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const word = (n, f = 'i') => new RegExp(`(^|[^a-z])${esc(n)}(?=$|[^a-z])`, f);
  const norm = n => String(n || '').toLowerCase().replace(/[.'’]/g, '').replace(/\s+(jr|sr|ii|iii|iv)$/, '').replace(/\s+/g, ' ').trim();
  for (const n of N.games) {
    const g = G.get(n.id);
    chk(!!g && !phGame(g), `a tile is a real game of the state: ${n.id}`);
    if (!g) continue;
    if (tbdOf(g) && n.schema >= 2) chk(n.tbd === true, `a tile for a game with no time set says so: ${n.id}`);
    /* a line held for the grade (ESPN left it out at this run) is cited as the last one read, never as today's */
    if (n.schema >= 2 && g.state === 'pre' && g.line && g.line.held && Date.parse(g.date) > RUN_MS && g.line.homeLine !== null && g.line.homeLine !== undefined) {
      chk(/last read/.test(n.line || ''), `the news cites a held line as the last one read: ${n.id} ${n.line}`);
      chk(['home', 'away'].every(sd => n.teams[sd].bullets.filter(b => /at DraftKings/.test(b)).every(b => /last line, read/.test(b))), `the news bullets cite a held line as the last one read: ${n.id}`);
    }
    /* an entry this writer wrote (a started game keeps the preview an older run wrote) */
    if (!(n.schema >= 2)) continue;
    for (const side of ['home', 'away']) {
      const id = n[side], opp = side === 'home' ? n.away : n.home, e = n.teams[side];
      for (const b of e.bullets) {
        chk(!/^<strong>Leaders\./.test(b), `the leaders bullet says they are season leaders: ${b.slice(0, 60)}`);
        if (/^<strong>Injuries\.<\/strong>/.test(b)) chk(!/\)\s*(active|probable)\b/i.test(b), `the injury bullet lists real statuses, not 'active': ${b}`);
      }
      /* a season leader the injury report has out is marked out */
      for (const l of e.leaders || []) {
        const inj = (e.injuries || []).find(i => norm(i.name) === norm(l.name));
        if (inj && /^out|injured reserve|suspend|season/i.test(inj.status)) {
          chk(!!l.out, `${l.name} (${T[id].abbr}) is ${inj.status} on the injury report and must be marked out beside his numbers`);
          chk(e.bullets.some(b => /Season leaders/.test(b) && b.includes(l.name) && /<em>/.test(b.split(l.name)[1] || '')), `the leaders bullet marks ${l.name} out`);
        }
      }
      for (const i of e.injuries || []) chk(!/^(active|probable)$/i.test(i.status), `the injury list carries no '${i.status}'`);
      /* the program's headlines name no opponent this team has already played (that was last week) */
      const played = S.games.filter(x => x.state === 'final' && x.id !== g.id && (x.home === id || x.away === id) && x.date < g.date).map(x => x.home === id ? x.away : x.home).filter(o => o !== opp);
      const strip = [...namesOf(T[id]), ...namesOf(T[opp])];
      for (const h of e.around || []) {
        let rest = h; for (const nm of strip) rest = rest.replace(word(nm, 'gi'), ' ');
        const hit = played.map(o => T[o]).filter(Boolean).flatMap(namesOf).find(nm => word(nm).test(rest));
        chk(!hit, `a headline on ${T[id].abbr}'s side names ${hit}, an opponent already played: ${h}`);
      }
    }
  }
}

/* ---------- the clock: a game that has kicked off is never offered ---------- */
async function clockChecks() {
  /* on the real week: the clock half way through its lined games still to come */
  const lined = S.games.filter(g => inWeek(S, g) && !phGame(g) && g.state === 'pre' && !tbdOf(g) && Date.parse(g.date) > RUN_MS && fresh(S, g)).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (lined.length >= 2) {
    const at = Date.parse(lined[Math.floor(lined.length / 2)].date) + 60e3;
    const P = await boot({ nowMs: at });
    tab(P, 'parlays'); scope(P, 'plScope', 'all');
    const ids = new Set(listed(P));
    chk([...ids].every(id => Date.parse(S.games.find(g => g.id === id).date) > at), `at ${new Date(at).toISOString()} the Parlays tab offers no game that has kicked off`);
    chk(lined.filter(g => Date.parse(g.date) > at).every(g => ids.has(g.id)), 'and still offers every lined game to come');
    chk(P.errors.length === 0, 'runtime errors with the clock moved: ' + P.errors.join(' | '));
  }

  /* on made-up games, whatever the week holds: kicked off by the clock, still to come, a line
     gone stale, a time not set, a score the job saw under way, a postponement */
  const F = JSON.parse(STATE);
  const run = RUN_MS; F.run = F.run || C.stamp(run);
  const pool = F.games.filter(g => !phGame(g) && F.teams[g.home].fbs && F.teams[g.away].fbs);
  const pick = pool.slice(0, 9).map(g => g.id);
  if (pick.length < 9) { chk(false, 'the state has nine FBS games to make the clock cases from'); return; }
  const day = ms => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const etMidnight = ms => { const d = day(ms); for (const h of [4, 5]) { const t = Date.parse(`${d}T0${h}:00:00Z`); if (day(t) === d && day(t - 3600e3) !== d) return t; } return Date.parse(`${d}T04:00:00Z`); };
  const at = run + 3 * 3600e3;
  const iso = ms => new Date(ms).toISOString().slice(0, 16) + 'Z';
  const lineAt = a => ({ book: 'DraftKings', details: 'X -3.5', total: 50.5, homeLine: -3.5, homeSpreadOdds: -110, awaySpreadOdds: -110, homeML: -160, awayML: 135, at: a });
  const make = (id, o) => { const g = F.games.find(x => x.id === id); Object.assign(g, { week: F.week === 'post' ? g.week : F.week, type: F.week === 'post' ? 3 : 2, state: 'pre', hs: null, as: null, detail: 'scheduled', result: undefined, frozen: F.run, cover: { home: 0.5, push: 0, away: 0.5 }, edge: 0, atsPick: null, line: null, tbd: undefined }, o); delete g.result; return g; };
  const a = make(pick[0], { date: iso(run + 2 * 3600e3), line: lineAt(F.run) });          // kicks off before the clock
  const b = make(pick[1], { date: iso(run + 6 * 3600e3), line: lineAt(F.run) });          // still to come
  const c = make(pick[2], { date: iso(run + 6 * 3600e3), line: lineAt(iso(run - 7 * 864e5)) });   // a line ESPN no longer carries
  const tb = make(pick[3], { date: iso(etMidnight(run + 6 * 3600e3)), detail: 'TBD', tbd: true });  // no time set, b's day
  const e = make(pick[4], { date: iso(run - 3600e3), state: 'live', detail: '2nd 5:00', hs: 7, as: 3, line: lineAt(F.run) });
  const f = make(pick[5], { date: iso(run + 6 * 3600e3), state: 'postponed', detail: 'Postponed', frozen: null });
  const h = make(pick[6], { date: iso(run + 30 * 60e3), line: lineAt(F.run) });           // ESPN will say under way
  const gn = make(pick[7], { date: iso(run - 5 * 3600e3), line: lineAt(iso(run - 26 * 3600e3)), carried: true, gone: true });   // ESPN dropped it after kickoff
  const hl = make(pick[8], { date: iso(run + 8 * 3600e3), line: Object.assign(lineAt(iso(run - 6 * 3600e3)), { held: true }) });  // ESPN left its line out at this run
  const FS = JSON.stringify(F);
  const store = { legs: [a, b].map(g => ({ game: g.id, side: 'home', kind: 'ml', odds: -160, line: null, p: 0.6, label: 'x', team: 'X', week: g.week, type: g.type })), saved: [], ui: { scope: 'all', plScope: 'all' } };
  const P = await boot({ state: FS, nowMs: at, store });
  chk(P.errors.length === 0, 'runtime errors on the made-up games: ' + P.errors.join(' | '));
  tab(P, 'games'); scope(P, 'scope', 'all');
  const has = g => !!card(P, g.id) && card(P, g.id).querySelectorAll('button[data-leg]').length > 0;
  chk(card(P, a.id) && !has(a) && /kicked off/.test(txt(card(P, a.id))), `a game whose kickoff has passed by the visitor's clock offers no bet and says it kicked off: ${txt(card(P, a.id))}`);
  chk(has(b), 'a game still to come with a current line offers its bets');
  chk(card(P, c.id) && !has(c) && /not current/.test(txt(card(P, c.id))), `a line older than the job's last run is shown dated and never offered: ${txt(card(P, c.id))}`);
  chk(card(P, tb.id) && /time TBA/.test(txt(card(P, tb.id))) && txt(card(P, tb.id).querySelector('.when')).includes(etDay(tb.date)), `a game with no time set shows its day in Eastern time and "time TBA", not the evening before: ${txt(card(P, tb.id) && card(P, tb.id).querySelector('.when'))} (${etDay(tb.date)})`);
  const ids = [...P.d.querySelectorAll('#games .game')].map(x => x.dataset.id);
  chk(ids.indexOf(tb.id) > ids.indexOf(b.id), 'a game with no time set sorts after the timed games of its day');
  chk(card(P, e.id) && /as of/.test(txt(card(P, e.id))), `a score the job saw under way is dated, not shown as live: ${txt(card(P, e.id) && card(P, e.id).querySelector('.when'))}`);
  chk(card(P, f.id) && !has(f) && /Postponed/.test(txt(card(P, f.id))), 'a postponed game offers no bet and says so');
  chk(card(P, gn.id) && !has(gn) && /no longer in ESPN/.test(txt(card(P, gn.id))), `a game ESPN dropped after kickoff says so and offers nothing: ${txt(card(P, gn.id) && card(P, gn.id).querySelector('.when'))}`);
  chk(card(P, hl.id) && !has(hl) && /not current/.test(txt(card(P, hl.id))) && !card(P, hl.id).querySelector('.tag.pick'), `a line held for the grade is shown dated, with no call and no price: ${txt(card(P, hl.id))}`);
  tab(P, 'parlays');
  const L = new Set(listed(P));
  chk(!L.has(a.id) && L.has(b.id) && !L.has(c.id) && !L.has(tb.id) && !L.has(e.id) && !L.has(f.id) && !L.has(gn.id) && !L.has(hl.id), `the Parlays tab offers only the game still to come with a current line (${[...L].filter(x => [a, b, c, tb, e, f, gn, hl].some(g => g.id === x))})`);
  /* the held line after kickoff: the call against it is shown, dated as the last line before kickoff */
  const P2 = await boot({ state: FS, nowMs: Date.parse(hl.date) + 60e3, store: { legs: [], saved: [], ui: { scope: 'all' } } });
  tab(P2, 'games'); scope(P2, 'scope', 'all');
  chk(card(P2, hl.id) && /the last before kickoff/.test(txt(card(P2, hl.id))) && !card(P2, hl.id).querySelector('button[data-leg]'), `after kickoff a held line says it was the last before kickoff: ${txt(card(P2, hl.id))}`);
  const legsNow = JSON.parse(P.w.localStorage.getItem('cfb_v1')).legs.map(l => l.game);
  chk(!legsNow.includes(a.id) && legsNow.includes(b.id) && !P.$('legsNote').hidden, `a leg on a game that kicked off leaves the builder, and the builder says so (${legsNow})`);
  /* ESPN read in the browser: a game it has under way shows its score */
  const ev = { id: h.id, competitions: [{ competitors: [{ homeAway: 'home', score: '14' }, { homeAway: 'away', score: '10' }], status: { type: { state: 'in', name: 'STATUS_IN_PROGRESS', shortDetail: '2nd 3:00' } } }] };
  const Q = await boot({ state: FS, nowMs: at, espn: [ev], store: { legs: [], saved: [], ui: { scope: 'all' } } });
  tab(Q, 'games'); scope(Q, 'scope', 'all');
  chk(card(Q, h.id) && /2nd 3:00/.test(txt(card(Q, h.id))) && /14/.test(txt(card(Q, h.id))) && !card(Q, h.id).querySelector('button[data-leg]'), `on load the page reads ESPN's scores for a week under way: ${txt(card(Q, h.id))}`);
  /* the news tile of a game that has kicked off says so; one with no time set shows its Eastern day */
  if (NEWS) {
    const N = JSON.parse(NEWS);
    if (N.games.length >= 2) {
      N.games[0].id = a.id; N.games[0].kick = a.date; N.games[0].home = a.home; N.games[0].away = a.away;
      N.games[1].id = tb.id; N.games[1].kick = tb.date; N.games[1].home = tb.home; N.games[1].away = tb.away; N.games[1].tbd = true;
      const R = await boot({ state: FS, news: JSON.stringify(N), nowMs: at });
      tab(R, 'news'); await wait(200);
      const tile = id => R.d.querySelector(`#slate button[data-news="${id}"]`);
      chk(tile(a.id) && /Kicked off/.test(txt(tile(a.id).querySelector('.when'))), `a news tile whose game has kicked off says so: ${txt(tile(a.id) && tile(a.id).querySelector('.when'))}`);
      chk(tile(tb.id) && txt(tile(tb.id).querySelector('.when')).includes(etDay(tb.date)) && /time TBA/.test(txt(tile(tb.id))), `a news tile with no time set shows its Eastern day: ${txt(tile(tb.id) && tile(tb.id).querySelector('.when'))}`);
    }
  }
}

/* ---------- the state against reality: the schedule, the clock, the season ---------- */
function stateChecks() {
  const run = runOf(S);
  for (const g of S.games) {
    chk(g.pHome > 0 && g.pHome < 1, `chance in (0,1) on ${g.id}`);
    chk(isFinite(g.mu) && g.mu !== null, `an expected margin on ${g.id} (${g.state}, frozen ${g.frozen})`);
    if (g.line && g.line.homeLine !== null) chk(g.cover && Math.abs(g.cover.home + g.cover.push + g.cover.away - 1) < 0.01, `cover chances sum to one on ${g.id} (${g.state}, mu ${g.mu}, line ${JSON.stringify(g.line)}, cover ${JSON.stringify(g.cover)})`);
    if (g.state === 'final' && !phGame(g)) chk(!!g.result, `a final game is graded: ${g.id}`);
    /* college football has overtime: a 'final' that is a tie is a postponed or cancelled game read as played */
    if (g.state === 'final') chk(g.hs !== g.as, `a final is not a tie (${g.id} ${g.hs}-${g.as}: ESPN files a postponement under 'post' at 0-0)`);
    if (g.state !== 'final') chk(!g.result, `only a final game is graded: ${g.id} (${g.state})`);
    if (phGame(g)) chk(!g.result && !g.line, `a game against an opponent still to be decided is neither called against a line nor graded: ${g.id}`);
    if (g.state !== 'pre' && g.result && g.result.ats) chk(!!g.line, `an ATS grade has a line: ${g.id}`);
    /* a call against the spread is the model's margin against the line: the edge, and a side only
       where it reaches the threshold between two FBS teams */
    if (g.line && g.line.homeLine !== null && g.line.homeLine !== undefined) {
      chk(Math.abs(g.edge - (g.mu + g.line.homeLine)) < 0.06, `the edge on ${g.id} is the model's margin against the line (${g.edge} vs ${g.mu} + ${g.line.homeLine})`);
      const fbs = S.teams[g.home]?.fbs && S.teams[g.away]?.fbs;
      chk((g.atsPick || null) === (fbs && Math.abs(g.edge) >= S.atsEdge ? (g.edge > 0 ? 'home' : 'away') : null), `the call against the spread on ${g.id} follows its edge (${g.atsPick}, edge ${g.edge})`);
      if (g.result && g.result.ats !== undefined) {
        const c = g.hs - g.as + g.line.homeLine;
        const hc = c > 0 ? 'win' : c < 0 ? 'loss' : 'push';
        chk(g.result.ats === (g.atsPick ? (hc === 'push' ? 'push' : (hc === 'win') === (g.atsPick === 'home') ? 'win' : 'loss') : null), `the ATS grade on ${g.id} is its call on its line (${g.result.ats})`);
      }
    }
    if (g.state === 'final' && !phGame(g) && g.result && g.line && g.line.homeLine !== null && g.line.homeLine !== undefined) chk(g.result.ats !== undefined, `a final with a line is graded against it: ${g.id}`);
    if (g.heldLine) chk(g.state === 'postponed' && !g.line, `only a game called off keeps its line aside: ${g.id} (${g.state})`);
  }
  /* a line on a game still to come is the one ESPN carried at this run (a look-ahead number ESPN
     dropped weeks ago is not today's) */
  if (S.schema >= 2) {
    const R = Date.parse(run);
    /* the one exception: a line read at an earlier run within a day of kickoff, held so the game is
       graded on the last line before it (never offered: it is not this run's) */
    const held = g => !!g.line.held && Date.parse(g.line.at) < R && Date.parse(g.date) - Date.parse(g.line.at) <= HOLD_MS;
    const old = S.games.filter(g => g.state === 'pre' && g.line && Date.parse(g.date) > R && g.line.at !== run && !g.carried && !held(g));
    chk(old.length === 0, `${old.length} games still to come carry a line ESPN no longer shows (${old.slice(0, 3).map(g => g.id + ' read ' + g.line.at + (g.line.held ? ' held' : '')).join(', ')})`);
    for (const g of S.games.filter(x => x.state === 'pre' && x.line && x.line.at === run)) chk(!g.line.held, `a line read at this run is not marked held: ${g.id}`);
    for (const g of S.games.filter(x => x.carried)) chk((S.notes || []).some(n => /did not answer|no longer in ESPN/.test(n)), `a game carried from the last publish is explained in the run's notes: ${g.id}`);
  } else skip(`state.json predates schema 2: its ${S.games.filter(g => g.state === 'pre' && g.line && g.line.at !== run).length} lines older than its run are only checked on the page`);

  /* the current week is the first regular-season week with a game still to play, whatever the
     postseason has the same day (Army-Navy) */
  const open = S.games.filter(g => openAt(g, Date.parse(run)));
  const reg = open.filter(g => g.type === 2);
  const want = reg.length ? Math.min(...reg.map(g => g.week)) : 'post';
  chk(S.week === want, `the current week is the first with a regular-season game to play: ${want}, not ${S.week}`);
  if (S.phase) chk(S.phase === (reg.length ? (S.games.some(g => g.state === 'final') ? 'regular' : 'opening') : open.some(g => g.type === 3) ? 'postseason' : S.games.some(g => g.state === 'final') ? 'over' : 'opening'), `the phase (${S.phase}) is where the schedule says the season is`);

  /* the season is the clock's (August to January), and every regular-season game is in it */
  if (!process.env.CFB_SEASON) chk(S.season === C.seasonOf(Date.parse(S.published)), `the season (${S.season}) is the one ${S.published.slice(0, 10)} falls in (${C.seasonOf(Date.parse(S.published))})`);
  const outside = S.games.filter(g => g.type === 2 && !(g.date >= `${S.season}-08-01` && g.date < `${S.season + 1}-02-01`));
  chk(outside.length === 0, `every regular-season game is in the ${S.season} season (${outside.length} are not)`);

  /* the model's history reaches the season before this one (a new season appends the last) */
  try {
    const Hj = JSON.parse(fs.readFileSync(process.env.CFB_HISTORY || path.join(ROOT, 'data', 'history.json'), 'utf8'));
    const si = Hj.cols.indexOf('season'); const last = Hj.rows.reduce((m, r) => Math.max(m, r[si]), 0);
    chk(last >= S.season - 1, `data/history.json reaches ${S.season - 1}, the season before this one (it ends at ${last})`);
  } catch (e) { chk(false, 'data/history.json could not be read: ' + e.message); }

  /* the polls: once the season has a final between FBS teams there is an AP poll, read or carried */
  const begun = S.games.some(g => g.state === 'final' && S.teams[g.home]?.fbs && S.teams[g.away]?.fbs);
  if (begun) chk(!!(S.rankings && (S.rankings.ap || S.rankings.cfp)), 'the season is under way and a poll is on the page (read at this run, or carried and dated)');
  for (const [k, p] of Object.entries(S.rankings || {})) if (p.season) chk(+p.season === S.season, `the ${k} poll is this season's (${p.season})`);

  /* expected wins are the wins so far plus the chances in the real games left: a placeholder
     opponent (TBD) is not a win */
  const left = {};
  for (const g of S.games) {
    if (g.type !== 2 || phGame(g) || g.state === 'final' || g.state === 'postponed') continue;
    left[g.home] = (left[g.home] || 0) + g.pHome; left[g.away] = (left[g.away] || 0) + (1 - g.pHome);
  }
  let worst = null;
  if (!(S.schema >= 2)) { skip('state.json predates schema 2: expected wins (which counted a TBD opponent as a win) are not checked'); return playoffChecks(); }
  for (const [id, o] of Object.entries(S.playoff.odds)) {
    const t = S.teams[id]; if (!t) continue;
    const exp = t.w + (left[id] || 0); const off = Math.abs(o.expWins - exp);
    if (!worst || off > worst.off) worst = { id, off, got: o.expWins, exp };
  }
  chk(!worst || worst.off <= 0.25, `expected wins are wins so far plus the real games' chances (${worst && `${S.teams[worst.id].abbr}: ${worst.got} vs ${worst.exp.toFixed(2)}`})`);
  playoffChecks();
}
function playoffChecks() {
  /* the playoff: a team that has lost a playoff game has no title chance, a champion has all of it,
     and once the bracket is drawn the twelve in it are in */
  const cfp = S.games.filter(g => g.type === 3 && /college football playoff|\bCFP\b/i.test(g.note || '') && g.state === 'final' && !phGame(g) && g.hs !== null);
  for (const g of cfp) {
    const loser = g.hs > g.as ? g.away : g.home, winner = g.hs > g.as ? g.home : g.away;
    if (S.playoff.odds[loser]) chk(S.playoff.odds[loser].title === 0, `${S.teams[loser].abbr} lost a playoff game (${g.id}) and keeps a title chance of ${S.playoff.odds[loser].title}`);
    if (/national championship/i.test(g.note || '') && S.playoff.odds[winner]) chk(S.playoff.odds[winner].title === 1, `${S.teams[winner].abbr} won the title game and has a title chance of ${S.playoff.odds[winner].title}`);
  }
  /* the field is decided once the regular season is over, or once its conference title games are
     with nothing left to play before the last of them; from then on the odds play the bracket shown */
  const runMs = Date.parse(runOf(S));
  const titles = S.games.filter(g => g.type === 2 && /championship/i.test(g.note || ''));
  const titleDay = titles.length ? Math.max(...titles.map(g => Date.parse(g.date))) : null;
  const decided = !S.games.some(g => g.type === 2 && openAt(g, runMs)) || (titles.length > 0 && !titles.some(g => openAt(g, runMs)) && !S.games.some(g => g.type === 2 && openAt(g, runMs) && Date.parse(g.date) <= titleDay));
  if (S.schema >= 2) chk(!!S.playoff.bracket.final === decided, `the bracket is final (${S.playoff.bracket.final}) exactly when the schedule has decided the field (${decided})`);
  if (S.playoff.bracket.final && !S.playoff.bracket.set) {
    const seat = new Map(S.playoff.bracket.field.map(f => [f.team, f.seed]));
    const off = Object.entries(S.playoff.odds).filter(([id, o]) => o.playoff !== (seat.has(id) ? 1 : 0) || o.bye !== (seat.has(id) && seat.get(id) <= 4 ? 1 : 0));
    chk(seat.size === 12 && off.length === 0, `with the field decided the odds play the bracket shown: its twelve in, its top four on a bye, nobody else (${off.slice(0, 4).map(([id, o]) => `${S.teams[id] ? S.teams[id].abbr : id} ${o.playoff}/${o.bye}`).join(', ')})`);
  }
  if (S.playoff.bracket.set) {
    const field = new Set(S.playoff.bracket.field.map(f => f.team));
    const inGames = new Set(S.games.filter(g => g.type === 3 && /college football playoff|\bCFP\b/i.test(g.note || '')).flatMap(g => [g.home, g.away]).filter(id => !isPh(id)));
    chk(field.size === 12 && [...field].every(id => inGames.has(id)), 'the drawn bracket is the twelve teams in ESPN\'s playoff games');
    chk(Object.entries(S.playoff.odds).every(([id, o]) => o.playoff === (field.has(id) ? 1 : 0)), 'once the bracket is drawn, its twelve are in and nobody else is');
  }
}

/* ---------- against the last publish: nothing called or graded is lost or re-taken ---------- */
function prevChecks() {
  let prev = null;
  try {
    if (process.env.CFB_PREV_STATE === 'none') return;          // a first run: nothing published before it
    prev = process.env.CFB_PREV_STATE ? JSON.parse(fs.readFileSync(process.env.CFB_PREV_STATE, 'utf8'))
      : JSON.parse(execFileSync('git', ['show', 'HEAD:cfb/state.json'], { cwd: ROOT, maxBuffer: 1 << 28 }).toString());
  } catch (e) { skip(`the last publish could not be read (${e.message.split('\n')[0]})`); return; }
  if (prev.season !== S.season) return;
  const now = new Map(S.games.map(g => [g.id, g]));
  const run = Date.parse(runOf(S));
  let held = 0;
  for (const p of prev.games) {
    if (phGame(p)) continue;
    const n = now.get(p.id);
    const started = (n || p).state === 'live' || (n || p).state === 'final' || p.state === 'live' || p.state === 'final' || Date.parse((n || p).date) <= run;
    if (p.result) { chk(!!n && !!n.result, `a game the last publish graded is still graded: ${p.id}`); continue; }
    if (started && p.frozen) {
      held++;
      chk(!!n, `a game called before its kickoff is still in the state: ${p.id}`);
      if (!n) continue;
      /* a game called off after it was called keeps its call; its line is off the board but kept
         aside, so a game suspended and finished later is graded on it */
      const off = n.state === 'postponed', pl = p.line || p.heldLine || null;
      chk(n.frozen === p.frozen && n.pHome === p.pHome && (off ? !n.line && JSON.stringify(n.heldLine || null) === JSON.stringify(pl)
        : JSON.stringify(n.line) === JSON.stringify(pl) && (p.state === 'postponed' || n.atsPick === p.atsPick)),
        `the call and line frozen before ${p.id}'s kickoff are kept after it (frozen ${p.frozen} -> ${n.frozen}, line ${pl && pl.at} -> ${(n.line || n.heldLine) && (n.line || n.heldLine).at})`);
    }
  }
  const weekCount = st => { const m = {}; for (const g of st.games) if (!phGame(g)) { const k = g.type === 3 ? 'post' : g.week; m[k] = (m[k] || 0) + 1; } return m; };
  const a = weekCount(prev), b = weekCount(S);
  for (const k of Object.keys(a)) if (a[k] >= 4) chk((b[k] || 0) >= a[k] / 2, `week ${k} had ${a[k]} games at the last publish and has ${b[k] || 0} now`);
  /* a poll the last publish had this season is still on the page, read now or carried and dated */
  for (const k of Object.keys(prev.rankings || {})) chk(!!(S.rankings || {})[k], `the ${k} poll the last publish had is still in the state`);
  void held;
}

main().catch(e => { console.error(e); process.exit(1); });
