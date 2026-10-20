/* Check the X Parlays section of the built NFL Hub page (the site's root, index.html, since 17 October
 * 2026; nflbets/ until then).
 *
 *   node nflbets/build/smoke_live.js        (from the hub root)
 *
 * The section reads liveparlays/parlays.json, the scoreboard and the box scores, and draws one
 * list, X Parlays: the parlays in the file, the same on every device, read only everywhere. A
 * parlay the file marks cleared is not drawn. Every card has an X at its top right, the same for
 * every visitor: it asks "Clear this parlay?" and Clear takes the parlay off X Parlays in that
 * browser alone, kept under the section's own key (lp_cleared_here_v1) and sent nowhere (section
 * O). No device keeps a list of its own: the Parlay
 * Builder finishes a parlay as a card to download (nflbets/build/card.html), saved nowhere. There
 * is no owner, no sign-in and no shared store: the page writes nothing anywhere but the browser's
 * own storage. X Parlays is a tab of its own (#xparlays); the Parlay Builder (#parlay) is the builder
 * over its choices and the Top 30 lines (app v116), and Suggested Parlays (#suggest, app v111) each prime-time
 * game's own set of four levels, whose Finish opens the same card; since app v118 in two sections, Night games and the
 * Sunday slot (every Sunday game before 7 pm Eastern, one set), each with its record, and each unit with its own Elo
 * picks beside its model parlays, whose Finish (sp|<unit>:elo-<level>) opens the card as an Elo pick. The test boots the whole page against a stubbed file
 * and a stubbed ESPN, with the real payload and state, opens the X Parlays tab and checks what the section renders, on a
 * browser with nothing of its own and on one that carries what the retired owner and reader layers
 * left (their flags, their copies of the old shared document), which must show exactly the file
 * and lose none of its own. Every request every run makes is recorded: one to the retired store or
 * its sign-in services, or one that is not a read, fails the run. Section J is the card: Finish,
 * the window, the image (a canvas stubbed with a recorder, since jsdom draws nothing), every dollar
 * figure whole on a long shot, and that finishing writes nothing anywhere; Open in DraftKings and Share
 * link on made-up ids, a leg DraftKings has only at another number going on the slip at DraftKings'
 * number (app v109), named under the buttons, in the shared text and under its row in the builder, and
 * a leg with nothing to convert to named with why; since app v121 each leg on the slip with its own link, a row each
 * (a converted leg's saying what goes on), a same-game parlay mixed with other games given a button for each game's legs
 * in place of the one link, each dated by its own legs' read (one leg a game keeping its one link; the builder's line
 * on the mix exactly where the card's plan has one, counting only the legs on the slip), every button under the card a
 * 44px target by its one rule, the copy's word for one link, a link a game or none, and the pairs DraftKings refuses on
 * one slip (a quarterback's passing TDs with a teammate's touchdown, or over with the game total) named under the card's
 * buttons and the builder's legs, worked out here on the check's own copy of the rule; (J2, 19 October 2026) the card's
 * check of DraftKings' current lines as it opens, on an ESPN of the section's own that can hold or fail an answer: the
 * buttons waiting, the 10-second cap, the moved rule and a moved total, the requests the parlay's games' alone, on a
 * same-game parlay mixed with another game (a button a game once the check settles, none while it reads, the focus on
 * the waiting button moved to the first game's), and the check's line ending every note it settles, held on its own; and a
 * Suggested Parlays set finished from its own
 * tab (app v111), live and then locked from the record's entry, each of its legs with an Add of its
 * own; its Elo picks (app v118) finished as an Elo pick, live, locked from the record and as this browser's own;
 * and the Sunday slot's section held to its rule at the fixture's clock and through a slot of the fixture's own (not
 * up, live, locked, under way with nothing to add or finish, past). jsdom and PapaParse are borrowed from props/build; run npm ci there first.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const Papa = require(path.join(ROOT, 'props', 'build', 'node_modules', 'papaparse'));
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const PAYLOAD = fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8');
const STATE = fs.readFileSync(path.join(ROOT, 'betting', 'state.json'), 'utf8');
const URL_ = 'https://demon-x13.github.io/nfl-hub/#xparlays';
/* the Parlay Builder's address, where section J finishes a parlay as a card */
const URL_PB = 'https://demon-x13.github.io/nfl-hub/#parlay';
/* the retired store and its sign-in and token services: no page may ask any of them anything */
const RETIRED = /firebaseio\.com|firebasedatabase\.app|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|googleapis\.com\/identitytoolkit|store\.test/;
/* every request of every run, and the ones that broke the rule: a request to the retired store,
   or anything but a read */
const ALL_CALLS = [], BAD_CALLS = [];
const fails = []; let checks = 0;
const chk = (ok, msg) => { checks++; if (!ok) fails.push(msg); };
/* how the smoke ends, whichever way: the count, every failure, an exit code. A mistake in the
   smoke's own code stops it here with the stack (the .catch at the bottom), and a run still
   going after ten minutes (it takes about one) stops with what it has, so it never waits on
   the windows it left open */
let ended = false;
function finish(why) {
  if (ended) return; ended = true;
  if (why) { checks++; fails.push(why); }
  console.log(`${checks} checks, ${fails.length} failures`);
  fails.forEach(f => console.log('  FAIL:', f));
  process.exit(fails.length ? 1 : 0);
}
const SMOKE_LIMIT_MS = 10 * 60 * 1000;
setTimeout(() => finish(`the smoke did not finish in ${Math.round(SMOKE_LIMIT_MS / 1000)} s: stopped with what it had`), SMOKE_LIMIT_MS).unref();
/* nor does it pass by running out of things to wait on: with no window left open, a body stuck
   on a promise nothing will settle would end Node with exit 0 and no count */
process.on('beforeExit', () => finish('the smoke stopped before it finished: its body was waiting on something nothing would settle'));
const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
const knob = row => txt(row.querySelector('.knob'));
const lineAt = row => txt(row.querySelector('.lineLbl'));
const status = row => txt(row.querySelector('.status'));
const who = row => txt(row.querySelector('.who'));
const target = row => txt(row.querySelector('.tgt'));
const wait = ms => new Promise(r => setTimeout(r, ms));
/* (19 October 2026) the parlay card checks DraftKings' current lines as it opens: cardSettled waits until its DraftKings
   part is final (the read done, or its cap passed), and cardCheck is its check ({state, at, games}, null with no card
   open); a card without them (the card before that day) settles at once and has no check, so its checks fail, never throw */
const cardSettled = w => w.PARLAY_CARD && typeof w.PARLAY_CARD.checking === 'function' ? w.PARLAY_CARD.checking() : Promise.resolve();
const cardCheck = w => w.PARLAY_CARD && typeof w.PARLAY_CARD.checkState === 'function' ? w.PARLAY_CARD.checkState() : undefined;
/* (app v112) Suggested Parlays sets out one night at a time (the owner's call of 17 October 2026: "just show the next
   night game dont stack the mondy night game until monday morning"): the next prime-time night's games, from 6:00 AM
   Eastern on the morning after the latest prime-time night before it on the schedule (any week; none before it, at
   once). Worked out here on its own: a Thursday, Sunday or Monday kickoff at or after 7:00 pm Eastern is prime time,
   and Eastern time is read through the time zone database (Intl), never the page's own helpers */
const PRIME_NIGHT_L = { 4: 'Thursday night', 0: 'Sunday night', 1: 'Monday night' };
const primeL = g => !!g && /^\d{4}-\d\d-\d\d$/.test(g.d || '') && PRIME_NIGHT_L[new Date(g.d + 'T12:00:00Z').getUTCDay()] != null && /^\d\d:\d\d$/.test(g.t || '') && g.t >= '19:00';
const etOffL = ms => { const tz = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(new Date(ms)).find(p => p.type === 'timeZoneName');
  const m = tz && tz.value.match(/GMT([+-]\d+)/); return m ? +m[1] : -5; };
const etAtL = (day, hm) => { const naive = Date.parse(`${day}T${hm}:00Z`); let t = naive + 5 * 3600e3; for (let i = 0; i < 3; i++) t = naive - etOffL(t) * 3600e3; return t; };
const etSayL = ms => new Date(ms).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' ET';
/* when a night (its first game g, the schedule sched) goes up: null for at once, and the line the tab says until then */
const nightOpenL = (g, sched) => { const prev = sched.filter(x => primeL(x) && x.d < g.d).map(x => x.d).sort().pop() || null;
  return { prev, open: prev ? etAtL(new Date(Date.parse(prev + 'T12:00:00Z') + 86400e3).toISOString().slice(0, 10), '06:00') : null, pg: prev ? sched.filter(x => primeL(x) && x.d === prev).length : 0 }; };
/* (app v118) the Sunday slot, by the owner's rule of 19 October 2026 ("I would like it to have ELO picks for the slot of
   Sunday games", then "do a separate section for night games and then the sunday slot of games"), worked out here on its
   own: a week's Sunday games (the schedule's date, which is Eastern) kicking off before 7:00 pm Eastern, in kickoff order
   and the schedule's own on a tie, one set across them, id <season>_<WW>_SUN. It goes up as a night does (nightOpenL, on
   its first game: 6:00 AM Eastern on the morning after the latest prime-time night before its Sunday anywhere on the
   schedule; none, at once), locks 2 hours before its first kickoff, is under way from that kickoff to its last (shown as
   it locked, with nothing to add or finish) and off the tab after. The week it is looked for in is the page's own (the
   first with a game not final, a score or four hours past its kickoff, else the last: the props parts' liveWeek, copied
   here, its weeks the payload's), then the next, the first whose slot has a game still to kick off with no score.
   Eastern time through the time zone database (etAtL), never the page's kickoff, spOpenAt or spSlotNext */
const dowL = d => /^\d{4}-\d\d-\d\d$/.test(d || '') ? new Date(d + 'T12:00:00Z').getUTCDay() : null;
const etKickL = g => /^\d{4}-\d\d-\d\d$/.test(g.d || '') ? etAtL(g.d, g.t || '13:00') : NaN;
const scoredL = g => g.hs != null && g.as != null && isFinite(g.hs) && isFinite(g.as);
const finalL = (g, now) => scoredL(g) || (isFinite(etKickL(g)) && now >= etKickL(g) + 4 * 3600e3);
const liveWeekL = (weeks, sched, now) => { const ws = [...new Set(weeks.map(Number))].sort((a, b) => a - b);
  const w = ws.find(x => sched.some(g => +g.w === x && !finalL(g, now))); return w != null ? w : ws[ws.length - 1]; };
const slotL = (sched, wk, season) => {
  const G = sched.map((g, i) => ({ g, i })).filter(({ g }) => +g.w === +wk && dowL(g.d) === 0 && /^\d\d:\d\d$/.test(g.t || '') && g.t < '19:00' && isFinite(etKickL(g)))
    .sort((a, b) => (etKickL(a.g) - etKickL(b.g)) || (a.i - b.i)).map(x => x.g);
  if (!G.length) return null;
  const first = etKickL(G[0]);
  return { id: `${season}_${String(wk).padStart(2, '0')}_SUN`, w: +wk, games: G, first, last: Math.max(...G.map(etKickL)), lock: first - 2 * 3600e3, ...nightOpenL(G[0], sched) }; };
const slotNextL = (weeks, sched, now, season) => { const w0 = liveWeekL(weeks, sched, now);
  for (const wk of [w0, w0 + 1]) { const u = slotL(sched, wk, season); if (u && u.games.some(g => now < etKickL(g) && !scoredL(g))) return { ...u, up: u.open == null || now >= u.open }; }
  return null; };
/* a kickoff's day and time as a set's head says them ("Sun, Jan 3", "9:30 AM ET"), through Intl */
const etDayL = ms => new Date(ms).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' });
const etTimeL = ms => new Date(ms).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) + ' ET';
/* the Sunday slot's section of Suggested Parlays as drawn, held to the rule at the page's clock (now): after the night
   games' section, headed "Sunday slot", its record next; no slot to come, one line saying so (the regular season over,
   or no Sunday game of the page's week still to kick off) and no set; not up, one line naming it, its games and when its
   sets go up, word for word, and no set; up, its one unit (.sp-game.sp-slot, a group named by its h4: "Week N, K games",
   its first kickoff's day and the window of its kickoffs), with one line, word for word: live until its lock, then
   locked (the record's set, or this browser's own where the record has none: own), and from its first kickoff under
   way, when nothing in it can be added or finished. Every number and the games are the rule's; the problems, or none */
const slotHeldL = (d, U, now, wk, over, season, own) => {
  const bad = [], secs = [...d.querySelectorAll('#spSets > section.sp-sec')].map(s => s.dataset.spSec), sec = d.querySelector('#spSets section.sp-sec[data-sp-sec="slot"]');
  if (secs.join() !== 'night,slot') bad.push(`the sections are ${secs.join(', ') || 'none'}, not Night games then the Sunday slot`);
  if (!sec) return bad.concat('there is no Sunday slot section').join('; ');
  const h = sec.querySelector(':scope > h3.sp-sech'), rec = h && h.nextElementSibling;
  if (txt(h) !== 'Sunday slot' || !rec || !rec.matches('div.sp-rec[data-sp-recsec="slot"]')) bad.push(`the section is not headed "Sunday slot" with its own record under it: ${txt(h)}`);
  const el = sec.querySelector('[data-sp-wait]'), units = [...sec.querySelectorAll('.sp-game')], none = sec.querySelector('[data-sp-none="slot"]');
  if (!U) {
    const want = over ? `The ${season} regular season is over: no Sunday slot is left.` : `No Sunday game of week ${wk} is still to kick off.`;
    if (el || units.length || !none) bad.push(`no Sunday slot is to come, and the section draws ${el ? 'a wait line' : units.length ? 'a set' : 'no line saying so'}`);
    else if (txt(none) !== want) bad.push(`its line reads "${txt(none)}", not "${want}"`);
    return bad.length ? bad.join('; ') : null; }
  if (!U.up) {
    const want = `Next up: week ${U.w}’s Sunday slot, ${U.games.length} game${U.games.length === 1 ? '' : 's'}. Its sets go up ${etSayL(U.open)}, the morning after ${PRIME_NIGHT_L[dowL(U.prev)]}’s ${U.pg > 1 ? 'games' : 'game'}.`;
    if (!el) bad.push(`no wait line where the slot ${U.id} is not up until ${new Date(U.open).toISOString()}`);
    else { if (el.dataset.spWait !== new Date(U.open).toISOString().replace(/\.\d{3}Z$/, 'Z')) bad.push(`data-sp-wait ${el.dataset.spWait}, not ${new Date(U.open).toISOString()}`);
      if (el.dataset.spNext !== U.id) bad.push(`data-sp-next ${el.dataset.spNext}, not ${U.id}`);
      if (txt(el) !== want) bad.push(`it reads "${txt(el)}", not "${want}"`); }
    if (units.length || none) bad.push('a set or a none line is drawn beside it');
    return bad.length ? bad.join('; ') : null; }
  if (el || none) bad.push(`a ${el ? 'wait' : 'none'} line is drawn where the slot ${U.id} is up: ${txt(el || none)}`);
  const u = units[0];
  if (units.length !== 1 || u.dataset.spGame !== U.id || !u.classList.contains('sp-slot')) return bad.concat(`the section draws ${units.map(x => x.dataset.spGame).join(', ') || 'no unit'}, not the slot ${U.id}`).join('; ');
  const h4 = u.querySelector('.sp-hd h4'), sm = u.querySelector('.sp-hd small'), lastG = U.games[U.games.length - 1];
  const small = `${etDayL(U.first)} · ${etTimeL(U.first)}${etTimeL(etKickL(lastG)) !== etTimeL(U.first) ? ' to ' + etTimeL(etKickL(lastG)) : ''}`;
  if (!h4 || h4.id !== 'spg-' + U.id || u.getAttribute('aria-labelledby') !== 'spg-' + U.id || u.getAttribute('role') !== 'group' || txt(h4) !== `Week ${U.w}, ${U.games.length} game${U.games.length === 1 ? '' : 's'}` || txt(sm) !== small || u.querySelector('.sp-hd .pill'))
    bad.push(`the slot is not a group named by its h4, "Week ${U.w}, ${U.games.length} games", over "${small}": ${txt(u.querySelector('.sp-hd'))}`);
  const phase = now < U.lock ? 'live' : now < U.first ? (own ? 'own' : 'locked') : 'under', mark = 'Locked since ' + etSayL(U.lock) + '.';
  /* under way, the record's set as it locked, or (own: the record has none) this browser's own kept from before the
     first kickoff, said so, or none at all, since nothing is built of the page's own once the slot is under way */
  const ownNote = ' This browser’s own set: the site’s was not published in time, so the record does not grade it.', underAt = `${mark} Under way since ${etSayL(U.first)}.`;
  const wants = { live: [`Locks ${etSayL(U.lock)}, 2 hours before the first kickoff.`], own: [mark + ownNote], locked: [mark],
    under: own ? [underAt + ownNote, underAt + ' The site’s set was not published in time.'] : [underAt] }[phase];
  const ph = u.querySelector(':scope > p.sp-lock[data-sp-phase]');
  /* live with the tab off the screen: the set is not built until it is opened, and the unit says so (the page's rule) */
  const hidden = !!d.getElementById('tab-suggest') && d.getElementById('tab-suggest').hidden;
  const waitOk = phase === 'live' && hidden && !!ph && ph.dataset.spPhase === 'wait' && txt(ph) === 'Built when this tab is open.';
  if (!waitOk && (!ph || ph.dataset.spPhase !== phase || !wants.includes(txt(ph)))) bad.push(`its line is ${ph ? ph.dataset.spPhase + ' "' + txt(ph) + '"' : 'missing'}, not ${phase} "${wants.join('" or "')}"`);
  return bad.length ? bad.join('; ') : null; };
/* jsdom draws nothing, so the card's image is checked on a recorder: a canvas whose 2D context
   keeps every piece of text drawn on it (and the font it was drawn in), a toBlob that hands back a
   blob of the type asked for, a blob address, and a download that is an anchor clicked, recorded.
   Its measure is a wide face's: figures ($ + , . and digits) at 0.68 of the font size, as bold
   digits in the fallback faces phones and Chromium draw with when the page's fonts are not there,
   the rest at 0.55, so a figure that would be cut on a real canvas is cut on this one */
function stubDraw(w) {
  const rec = { texts: [], draws: [], canvases: [], blobs: [], clicks: [], urls: [] };
  const em = (x, font) => [...String(x)].reduce((a, ch) => a + (/[\d$+,.\u2212-]/.test(ch) ? 0.68 : 0.55), 0) * (parseFloat((String(font).match(/([\d.]+)px/) || [])[1]) || 10);
  w.HTMLCanvasElement.prototype.getContext = function (kind) {
    if (kind !== '2d') return null;
    rec.canvases.push(this);
    const st = { font: '10px sans-serif' };
    return new Proxy(st, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'measureText') return x => ({ width: em(x, t.font) });
        if (k === 'fillText') return x => { rec.texts.push(String(x)); rec.draws.push({ t: String(x), font: String(t.font) }); };
        if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
        return () => {};
      },
      set(t, k, v) { t[k] = v; return true; } });
  };
  w.HTMLCanvasElement.prototype.toBlob = function (cb, type) { const b = new w.Blob(['\x89PNG'], { type: type || 'image/png' }); rec.blobs.push(b); setTimeout(() => cb(b), 0); };
  w.URL.createObjectURL = b => { rec.urls.push(b); return 'blob:https://demon-x13.github.io/card'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { rec.clicks.push({ href: this.href, download: this.download, attached: this.isConnected }); };
  return rec;
}

const EARLY = '2026-09-20T17:00Z', LATE = '2026-09-20T20:25Z';
const ev = (id, date, away, home, state, as, hs) => ({ id, date,
  competitions: [{ status: { type: { state, shortDetail: state === 'post' ? 'Final' : (state === 'pre' ? '1:00 PM ET' : 'Q3 7:12') } },
    competitors: [{ homeAway: 'home', team: { abbreviation: home }, score: state === 'pre' ? undefined : String(hs) },
                  { homeAway: 'away', team: { abbreviation: away }, score: state === 'pre' ? undefined : String(as) }] }] });
const sb = state => ({ events: [ev('401', EARLY, 'CAR', 'ATL', state, 17, 20),
                                 ev('403', LATE, 'NO', 'BAL', state, 10, 14)] });
const SUM = { boxscore: { players: [
  { team: { abbreviation: 'ATL' }, statistics: [
    { name: 'passing', labels: ['C/ATT', 'YDS', 'AVG', 'TD', 'INT'], athletes: [{ athlete: { displayName: 'Michael Penix Jr.' }, stats: ['18/27', '241', '8.9', '2', '1'] }] },
    { name: 'rushing', labels: ['CAR', 'YDS', 'AVG', 'TD', 'LONG'], athletes: [{ athlete: { displayName: 'Bijan Robinson' }, stats: ['17', '86', '5.1', '1', '22'] }] },
    { name: 'receiving', labels: ['REC', 'YDS', 'AVG', 'TD', 'LONG', 'TGTS'], athletes: [
      { athlete: { displayName: 'Kyle Pitts' }, stats: ['2', '21', '10.5', '0', '12', '4'] },
      { athlete: { displayName: 'Bijan Robinson' }, stats: ['4', '31', '7.8', '0', '12', '5'] }] }] },
  { team: { abbreviation: 'CAR' }, statistics: [
    { name: 'rushing', labels: ['CAR', 'YDS', 'AVG', 'TD', 'LONG'], athletes: [{ athlete: { displayName: 'Chuba Hubbard' }, stats: ['12', '31', '2.6', '0', '9'] }] }] }] } };

const legF = (game, player, team, stat, line, side, main) => ({ game, player, team, stat, line, side, main });
const FILE = {
  updated: '2026-09-20T17:30:00Z',
  games: ['2026_02_CAR_ATL', '2026_02_NO_BAL'],
  parlays: [
    { id: 'night', week: 2, stake: 10, price: 200, payout: 30, legs: [
      legF(1, 'Derrick Henry', 'BAL', 'rushing_yards', 70.5, 'over', true)] },
    { id: 'early', week: 2, stake: 20, price: 580, payout: 136, note: 'sunday', legs: [
      legF(0, 'Bijan Robinson', 'ATL', 'rushing_yards', 43.5, 'over', true),
      legF(0, 'Chuba Hubbard', 'CAR', 'rushing_yards', 54.5, 'under', true),
      legF(0, 'Kyle Pitts', 'ATL', 'receptions', 3, 'over', false),
      legF(0, 'Michael Penix Jr.', 'ATL', 'passing_yards', 225.5, 'over', true)] }] };

/* the prop model's own key, from part2, as the build hands it to the page */
const PART2_SEASON = fs.readFileSync(path.join(ROOT, 'props', 'build', 'part2.js'), 'utf8').match(/const SEASON=(\d{4}), KEY='([^']+)';/);
const PROP_KEY = PART2_SEASON[2], SEA = +PART2_SEASON[1];
/* the kept Refresh odds read's own key (props_press_v1, app v108), which a press, and since 19 October 2026 the parlay
   card's check of DraftKings' lines, write */
const PRESS_KEY = 'props_press_v1';
/* the betting app's own key and season, which the X Bet Log's keys are named for */
const { BET_KEY, SEASON: BET_SEASON } = require(path.join(ROOT, 'betting', 'tools', 'build.js'));
/* the two models' own storage, written exactly as they write it */
const propBlob = () => JSON.stringify({ stake: 55, saved: [
  { id: 'mine', week: 2, stake: 15, price: 250, payout: 52, legs: [
    { gid: '2026_02_CAR_ATL', stat: 'receiving_yards', k: 20.5, side: 'over', main: true,
      name: 'Kyle Pitts', team: 'ATL', label: 'Over 20.5 receiving yards', week: 2 }] }] });
/* a parlay built but not saved: the prop model will not let it be locked without a price,
   so this is what a bet parlay usually looks like in storage on a Sunday */
/* the builder legs sit on a week that cannot have kicked off: the prop model drops a working leg
   whose game has started, which every real week-2 game has by now */
const workBlob = () => JSON.stringify({ stake: 40, saved: [], parlay: {
  '2026_02_CAR_ATL|bij|rushing_yards': { gid: '2026_18_CAR_ATL', pid: 'bij', stat: 'rushing_yards',
    k: 43.5, side: 'over', main: true, name: 'Bijan Robinson', team: 'ATL', week: 2 },
  '2026_02_NO_BAL|hen|rushing_yards': { gid: '2026_18_NO_BAL', pid: 'hen', stat: 'rushing_yards',
    k: 70.5, side: 'over', main: true, name: 'Derrick Henry', team: 'BAL', week: 2 } } });
const betBlob = () => JSON.stringify({ myPicks: {}, bets: {}, bank: { build: [
  { id: 'bb1', week: 2, type: 'parlay', stake: 25, legs: [
    { game_id: '2026_02_CAR_ATL', away: 'CAR', home: 'ATL', pick: 'ATL', ml: -150 },
    { game_id: '2026_02_NO_BAL', away: 'NO', home: 'BAL', pick: 'BAL', ml: 130 }] }] } });

/* the parlay file a run reads in place of the real one (file), what the scoreboard says (state:
   pre, in or post), whether ESPN and the file answer (espn, data), what the browser holds before
   the page opens (seed), the payload as changed for the run (pay), and the X Bet Log's file
   (xbets). esp, where given, answers ESPN first (a request it returns null for gets the rest of the stub):
   section J's own ESPN, which the parlay card reads DraftKings' current lines from as it opens. Every
   request is in calls, with its method; a request to the retired store, or one that is not a read, is
   refused and kept in BAD_CALLS, which fails the smoke. */
function run({ file = FILE, state = 'in', espn = 'ok', data = 'ok', seed = () => {}, pay = x => x, xbets = null, url = URL_, esp = null } = {}) {
  return new Promise(resolve => {
    const calls = [], methods = [];
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url,
      beforeParse(w) {
        w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
        try { seed(w); } catch (e) {}
        w.fetch = (u, o) => { const s = String(u), m = String((o && o.method) || 'GET').toUpperCase(); calls.push(s); methods.push(m); ALL_CALLS.push(m + ' ' + s);
          if (RETIRED.test(s) || m !== 'GET') { BAD_CALLS.push(m + ' ' + s); return Promise.reject(new TypeError('Failed to fetch')); }
          if (s.includes('parlays.json')) return data === 'ok'
            ? Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(file)) })
            : Promise.resolve({ ok: false, status: 404 });
          if (s.includes('xbets.json')) return Promise.resolve(xbets ? { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(xbets)) } : { ok: false, status: 404 });
          /* the page around the section: its own season and the betting model's */
          if (s.includes('payload.json')) return Promise.resolve({ ok: true, status: 200, json: async () => pay(JSON.parse(PAYLOAD)) });
          if (s.includes('state.json')) return Promise.resolve({ ok: true, status: 200, json: async () => JSON.parse(STATE) });
          if (!/espn\.com/.test(s)) return Promise.resolve({ ok: false, status: 404 });
          { const r = esp ? esp(s, o, w) : null; if (r) return r; }
          return espn === 'ok'
            ? Promise.resolve({ ok: true, status: 200, json: async () => s.includes('/summary?') ? SUM : sb(state) })
            : Promise.resolve({ ok: false, status: 403 });
        };
        /* the section draws once the prop model is up and its builder has been drawn */
        w.document.addEventListener('app-ready', () => setTimeout(() => resolve({ w, d: w.document, calls, methods }), 400));
      } });
    setTimeout(() => resolve({ w: dom.window, d: dom.window.document, calls, methods, timedOut: true }), 20000);
  });
}
/* everything a browser holds, key by key */
const allKeys = w => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; };

(async () => {
  // ---- A. the file is the page ----
  const { w, d, calls } = await run();
  chk(calls.some(u => /parlays\.json/.test(u)), 'the page never read the parlay file');
  chk(d.querySelectorAll('.savedp').length === 2, `expected 2 parlays from the file, got ${d.querySelectorAll('.savedp').length}`);
  const cards = [...d.querySelectorAll('.savedp')];
  const rows = [...cards[0].querySelectorAll('.sp-leg')];
  chk(rows.length === 4, `the early parlay should show 4 legs, showed ${rows.length}`);
  chk(knob(rows[0]) === '86' && lineAt(rows[0]) === '43.5' && status(rows[0]) === 'hit',
    'an over that cleared is wrong: ' + txt(rows[0]));
  chk(target(rows[0]) === '43.5+', 'an over does not read as a target: ' + target(rows[0]));
  chk(knob(rows[1]) === '31' && /to spare/.test(status(rows[1])), 'a live under is wrong: ' + txt(rows[1]));
  chk(target(rows[1]) === 'under 54.5', 'an under does not read as an under: ' + target(rows[1]));
  chk(knob(rows[2]) === '2' && lineAt(rows[2]) === '3' && status(rows[2]) === '1 to go', 'a rung is wrong: ' + txt(rows[2]));
  chk(who(rows[0]) === 'Bijan Robinson Rushing Yards', 'the row does not name the man and the stat: ' + who(rows[0]));
  chk(/17 car, 86 rush yds/.test(txt(rows[0])) && /4 rec, 31 rec yds on 5/.test(txt(rows[0])),
    'a player in two groups does not show both lines: ' + txt(rows[0]));
  chk(/18\/27, 241 pass yds, 2 TD, 1 INT/.test(txt(rows[3])), 'a passing line is wrong: ' + txt(rows[3]));
  chk(/CAR 17.20 ATL/.test(txt(cards[0].querySelector('.games'))) && /Q3 7:12/.test(txt(cards[0].querySelector('.games'))),
    'the score strip is wrong: ' + txt(cards[0].querySelector('.games')));
  chk(/\$20\.00/.test(txt(cards[0])) && /\+580/.test(txt(cards[0])), 'the money row is wrong');
  chk(/sunday/.test(txt(cards[0])), 'a note on a parlay is not shown');
  { const fill = rows[0].querySelector('.fill'), tick = rows[0].querySelector('.tick');
    chk(/width:\s*100/.test(fill.getAttribute('style')), 'a cleared over should fill the bar');
    chk(/left:\s*80/.test(tick.getAttribute('style')), 'the tick should sit at 80%'); }

  // ---- B. the order the day runs in ----
  chk(/Bijan Robinson/.test(who(cards[0].querySelector('.sp-leg'))), 'the early parlay should be first');
  chk(/Derrick Henry/.test(who(cards[1].querySelector('.sp-leg'))), 'the late parlay should be second');

  // ---- C. the file is X Parlays: nothing a browser holds is drawn, and nothing of it is written ----
  chk(!/api\.github\.com/.test(HTML), 'the page still talks to the GitHub API');
  {
    const seed = w => { w.localStorage.setItem(PROP_KEY, propBlob()); w.localStorage.setItem(BET_KEY, betBlob()); };
    /* the browser's own saved parlay, builder and betting slip are drawn nowhere, though every one
       stays in its storage, untouched, with an old my_parlays_v1 */
    const myOld = JSON.stringify({ lines: { 'prop|mine|0': 22.5 }, removed: { 'bet|bb1': 1 }, kept: {} });
    const vis = await run({ seed: w => { seed(w); w.localStorage.setItem('my_parlays_v1', myOld); } });
    chk(!vis.d.getElementById('myCard') && !vis.d.getElementById('myApp') && vis.d.querySelectorAll('.savedp').length === 2 && vis.d.querySelectorAll('#lpCard .savedp').length === 2,
      'a browser\'s own parlays are drawn beside X\'s, or a list of its own is in the page: ' + vis.d.querySelectorAll('.savedp').length + ' cards');
    chk(!/Your parlays/i.test(txt(vis.d.getElementById('tab-xparlays'))) && !/Kyle Pitts Receiving Yards/.test(txt(vis.d.getElementById('tab-xparlays')) + txt(vis.d.getElementById('tab-parlay'))), 'the X Parlays tab still says Your parlays, or the browser\'s own parlay is shown');
    chk([...vis.d.querySelectorAll('#lpCard .savedp .pill')].filter(x => /prop model|betting model/.test(txt(x))).length === 0, 'a parlay from the prop or betting model is drawn as X\'s');
    chk(vis.w.eval('S').saved.length === 1 && vis.w.eval('S').saved[0].id === 'mine' && JSON.parse(vis.w.localStorage.getItem(PROP_KEY)).saved[0].id === 'mine',
      'a browser\'s saved parlay was lost from its own storage');
    chk(vis.w.localStorage.getItem('my_parlays_v1') === myOld && vis.w.localStorage.getItem(BET_KEY) === betBlob(), 'a browser\'s my_parlays_v1 or betting key was rewritten');
    /* the browser's own copy of a parlay the file also has is not drawn: the file's is */
    const two = await run({ seed, file: { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'mine', week: 2, stake: 99, legs: [legF(0, 'Kyle Pitts', 'ATL', 'receiving_yards', 99.5, 'over', true)] }] } });
    chk(/\$99\.00/.test(txt(two.d.getElementById('lpCard'))) && !/\$15\.00/.test(txt(two.d.getElementById('tab-xparlays')) + txt(two.d.getElementById('tab-parlay'))), 'the placed copy is not X\'s, or the browser\'s own copy is drawn');
  }

  // ---- C2. a parlay still in this browser's builder is the browser's: not drawn in X Parlays ----
  {
    const b = await run({ seed: w => w.localStorage.setItem(PROP_KEY, workBlob()), file: { updated: null, games: [], parlays: [] } });
    chk(!b.d.querySelector('#lpCard .savedp') && txt(b.d.getElementById('app')) === 'Nothing to watch yet' && Object.keys(b.w.eval('S').parlay).length === 2,
      'a browser\'s builder parlay is drawn as one of X\'s, or the builder lost its legs: ' + txt(b.d.getElementById('app')));
    chk(!/in the builder|builder at kickoff/.test(txt(b.d.getElementById('lpCard'))), 'X Parlays still marks a parlay as in a builder');
  }

  // ---- C3. a builder parlay whose first game kicks off drops the leg, and nothing keeps a copy ----
  {
    /* Bijan's leg is on CAR at ATL, which has kicked off, so the builder drops it on load; the
       money line is on a game still to come and stays. The schedule is pinned so the case holds in
       any week of any season: CAR at ATL in the past, two other games in the future. */
    const G1 = `${SEA}_02_CAR_ATL`, P0 = JSON.parse(PAYLOAD), later = P0.sched.filter(x => x.id !== G1).slice(-2);
    const pin = P => { let r = P.sched.find(x => x.id === G1);
      if (!r) { r = { id: G1, w: 2, t: '13:00', a: 'CAR', h: 'ATL' }; P.sched.push(r); }
      r.d = '2000-01-02';
      for (const x of P.sched) if (later.some(y => y.id === x.id)) x.d = '2099-12-31';
      return P; };
    const L2 = later[0], L2key = `${L2.id}|team:${L2.h}|ml`;
    const atKick = () => JSON.stringify({ stake: 40, saved: [], parlay: {
      [`${G1}|00-0038542|rushing_yards`]: { gid: G1, pid: '00-0038542', stat: 'rushing_yards', k: 43.5, side: 'over', main: true,
        name: 'Bijan Robinson', team: 'ATL', week: 2 },
      [L2key]: { gid: L2.id, pid: 'team:' + L2.h, stat: 'ml', k: 0, side: 'over', main: false,
        name: L2.h, team: L2.h, grp: 'TEAM', week: L2.w } } });
    const kv = await run({ pay: pin, seed: w => w.localStorage.setItem(PROP_KEY, atKick()), file: { updated: null, games: [], parlays: [] } });
    chk(Object.keys(kv.w.eval('S').parlay).length === 1 && !!kv.w.eval('S').parlay[L2key], 'the builder should drop the leg whose game kicked off: ' + Object.keys(kv.w.eval('S').parlay).join(', '));
    chk(kv.w.localStorage.getItem('my_parlays_v1') === null && kv.w.localStorage.getItem('live_parlays_v1') === null && !kv.d.querySelector('.savedp') && typeof kv.w.lpKeep === 'undefined',
      'a builder at kickoff was kept, written or drawn: ' + kv.w.localStorage.getItem('live_parlays_v1'));
  }

  // ---- C4. two parlays in the file alike but for the side or the player are two parlays ----
  {
    const ml = (gi, team) => ({ game: gi, player: { ATL: 'Falcons', CAR: 'Panthers' }[team], team, stat: 'ml', line: 0, side: 'over', main: false });
    const file = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'falcons-over', week: 2, stake: 5, legs: [ml(0, 'ATL'), { game: 0, player: 'Total', team: 'ATL', stat: 'total', line: 36.5, side: 'over', main: true }] },
      { id: 'panthers-over', week: 2, stake: 5, legs: [ml(0, 'CAR'), { game: 0, player: 'Total', team: 'ATL', stat: 'total', line: 36.5, side: 'over', main: true }] },
      { id: 'pitts-3', week: 2, stake: 5, legs: [legF(0, 'Kyle Pitts', 'ATL', 'receptions', 3, 'over', true)] },
      { id: 'bijan-3', week: 2, stake: 5, legs: [legF(0, 'Bijan Robinson', 'ATL', 'receptions', 3, 'over', true)] }] };
    const x = await run({ file });
    const t = [...x.d.querySelectorAll('.savedp')].map(c => txt(c));
    chk(t.length === 4 && t.some(c => /Falcons To Win/.test(c)) && t.some(c => /Panthers To Win/.test(c)), 'the file\'s Falcons and Panthers parlays are not both drawn: ' + t.length + ' cards');
    chk(t.some(c => /Kyle Pitts Receptions/.test(c)) && t.some(c => /Bijan Robinson Receptions/.test(c)), 'two players at the same line were taken for one parlay');
  }

  // ---- C5. a player who did not play: the leg is void, not lost ----
  {
    /* An Atlanta player (out of the payload, so any season) is ruled Out for the week on the
       injury report the page reads, and is on no line of the final box score. A second has no
       such word: he is graded on nothing, and the row says he is not on the box score. The
       second is one the real payload says nothing about either (no row on any week's injury
       report, no roster status but active), so a real Out later in the season cannot void him. */
    const onSheet = ['Bijan Robinson', 'Kyle Pitts', 'Michael Penix Jr.', 'Chuba Hubbard'];
    const P0 = JSON.parse(PAYLOAD), reported = new Set((P0.injuries || []).map(r => r.gsis_id));
    const atl = P0.players.filter(x => x.t === 'ATL' && !onSheet.includes(x.n));
    const OUT = atl[0], QUIET = atl.find(x => x !== OUT && !reported.has(x.id) && (x.st == null || x.st === 'ACT'));
    const pay = P => { P.injuries = (P.injuries || []).concat([{ season: String(SEA), week: '2', gsis_id: OUT.id, report_status: 'Out', game_status: '' }]); return P; };
    const file = { updated: null, games: [`${SEA}_02_CAR_ATL`], parlays: [
      { id: 'dnp-over', week: 2, stake: 10, legs: [legF(0, OUT.n, 'ATL', 'receiving_yards', 50.5, 'over', true), legF(0, 'Bijan Robinson', 'ATL', 'rushing_yards', 43.5, 'over', true)] },
      { id: 'dnp-under', week: 2, stake: 10, legs: [legF(0, OUT.n, 'ATL', 'receptions', 4.5, 'under', true)] },
      { id: 'quiet', week: 2, stake: 10, legs: [legF(0, QUIET.n, 'ATL', 'receiving_yards', 30.5, 'over', true)] }] };
    const rx = n => new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const v = await run({ file, state: 'post', pay });
    const over = [...v.d.querySelectorAll('.savedp')].find(c => c.querySelectorAll('.sp-leg').length === 2);
    const drake = over && [...over.querySelectorAll('.sp-leg')].find(r => rx(OUT.n).test(who(r)));
    chk(!!drake && status(drake) === 'void' && txt(drake.querySelector('.res')) === 'V' && /did not play \(out\)/.test(txt(drake)),
      'a player ruled out and missing from the box score is not void: ' + (drake ? txt(drake) : 'no row'));
    chk(!!over && !/\bgone\b/.test(txt(over.querySelector('.sp-head'))) && /landed/.test(txt(over.querySelector('.sp-head'))) && /1 void/.test(txt(over.querySelector('.sp-head'))),
      'a parlay with a void leg and the rest won is not "landed, 1 void": ' + (over ? txt(over.querySelector('.sp-head')) : ''));
    const under = [...v.d.querySelectorAll('.savedp')].find(c => rx(OUT.n + ' Receptions').test(txt(c)));
    chk(!!under && status(under.querySelector('.sp-leg')) === 'void' && !/landed|gone/.test(txt(under.querySelector('.sp-head'))) && /\bvoid\b/.test(txt(under.querySelector('.sp-head'))),
      'an under on a player who did not play is graded instead of void: ' + (under ? txt(under.querySelector('.sp-head')) + ' / ' + status(under.querySelector('.sp-leg')) : ''));
    const quiet = [...v.d.querySelectorAll('.savedp')].find(c => [...c.querySelectorAll('.who')].some(x => rx(QUIET.n).test(txt(x))));
    chk(!!quiet && status(quiet.querySelector('.sp-leg')) === 'missed' && /not on the box score/.test(txt(quiet)) && /gone/.test(txt(quiet.querySelector('.sp-head'))),
      'a player with no word that he sat is not graded on nothing and said to be off the box score: ' + (quiet ? txt(quiet) : ''));
    /* the same leg while the game is on: void too, since he was ruled out */
    const live = await run({ file, state: 'in', pay });
    const d2 = [...live.d.querySelectorAll('.sp-leg')].find(r => rx(OUT.n + ' Receiving').test(who(r)));
    chk(!!d2 && status(d2) === 'void', 'a ruled-out player\'s leg is not void while the game is on: ' + (d2 ? status(d2) : ''));
    /* every game over: all three are under Finished; while it is on, only a gone one is, after every live one */
    const finOf = r => { const app = r.d.getElementById('app'), h = app.querySelector('.lp-done'), kids = [...app.children], at = h ? kids.indexOf(h) : Infinity;
      return [...app.querySelectorAll('.savedp')].map(c => ({ c, fin: kids.indexOf(c) > at })); };
    chk(finOf(v).length === 3 && finOf(v).every(x => x.fin), 'with every game over a parlay is not under Finished');
    chk(finOf(live).every(x => x.fin === /\bgone\b/.test(txt(x.c.querySelector('.sp-head')))),
      'with the game on, a parlay is under Finished though not gone, or a gone one is still among the live ones');
  }

  // ---- C6. the scoreboard asked for in each game's own season and week, playoffs too ----
  {
    const file = { updated: null, games: ['2026_02_CAR_ATL', '2026_20_CAR_ATL', '2026_22_CAR_ATL', '2027_01_CAR_ATL'], parlays: [
      { id: 'reg', week: 2, stake: 1, legs: [{ game: 0, player: 'Falcons', team: 'ATL', stat: 'ml', line: 0, side: 'over', main: false }] },
      { id: 'div', week: 20, stake: 1, legs: [{ game: 1, player: 'Falcons', team: 'ATL', stat: 'ml', line: 0, side: 'over', main: false }] },
      { id: 'sb', week: 22, stake: 1, legs: [{ game: 2, player: 'Falcons', team: 'ATL', stat: 'ml', line: 0, side: 'over', main: false }] },
      { id: 'next', week: 1, stake: 1, legs: [{ game: 3, player: 'Falcons', team: 'ATL', stat: 'ml', line: 0, side: 'over', main: false }] }] };
    const q = await run({ file });
    const sbq = q.calls.filter(u => /\/scoreboard\?/.test(u)).map(u => (u.match(/seasontype=\d+&week=\d+&dates=\d+/) || [''])[0]);
    for (const want of ['seasontype=2&week=2&dates=2026', 'seasontype=3&week=2&dates=2026', 'seasontype=3&week=5&dates=2026', 'seasontype=2&week=1&dates=2027'])
      chk(sbq.includes(want), 'the scoreboard was not asked for ' + want + ': ' + sbq.join(', '));
    chk(q.d.querySelectorAll('.sp-leg.team .gm').length === 4, 'a playoff or next-season game was not tracked: ' + q.d.querySelectorAll('.sp-leg.team .gm').length);
  }

  // ---- D. the buttons are gone ----
  for (const id of ['ghSave', 'ghLoad', 'send', 'paste', 'clearDone', 'tokIn'])
    chk(!d.getElementById(id), `the ${id} control is still on the page`);
  chk(!d.querySelector('[data-send]'), 'a sending control survived');
  chk(!!d.getElementById('now') && !d.getElementById('every') && !d.getElementById('ver') && !d.getElementById('clear'), 'Refresh now stays; the interval picker, the build pill and Clear settled go');
  /* the build stamp: the one thing that tells a stale cached copy from a broken one, in the markup now */
  chk(/^app v\d+/.test(txt(d.getElementById('buildTag'))), 'the page does not say which build it is');
  chk(!/Parlays marked/.test(txt(d.getElementById('lpCard'))), 'the old footer text is in the section');
  /* X Parlays is the whole of its own tab, opened at its address; the builder is the Parlay Builder
     tab's, first on it, over its choices and the Top 30 lines (#pbPanel, app v116), and Suggested Parlays (#suggest, app v111)
     is a tab of its own, without the builder: no list of a visitor's own anywhere */
  const lpc = d.getElementById('lpCard'), tx = d.getElementById('tab-xparlays'), tb = d.getElementById('tab-parlay'), ts = d.getElementById('tab-suggest');
  chk(!!lpc && !!tx && tx.firstElementChild === lpc && !lpc.nextElementSibling && !tx.hidden && tb.hidden && txt(d.querySelector('#tabs button[aria-selected="true"]')) === 'X Parlays'
    && tb.firstElementChild.id === 'parlayBody' && (tb.firstElementChild.nextElementSibling || {}).id === 'pbPanel' && !tb.querySelector('#lpCard')
    && !!ts && ts.hidden && (ts.firstElementChild || {}).id === 'spPanel' && !ts.querySelector('#parlayBody, #pbPanel, #lpCard')
    && !d.getElementById('suggModal') && !d.getElementById('myCard') && !d.getElementById('myApp') && !d.getElementById('myClear'),
    'X Parlays is not the whole of its own tab (opened on #xparlays), the builder is not first on the Parlay Builder\'s own tab over its choices, Suggested Parlays is not a tab of its own without the builder, or Your parlays is still in the page');
  chk(!/Your parlays/i.test(txt(tx)), 'the X Parlays tab still says Your parlays');
  { const body = d.body.cloneNode(true); body.querySelectorAll('script, style').forEach(n => n.remove());
    chk(/^X Parlays/.test(txt(lpc.querySelector('h2'))) && !/Live Parlays/i.test(body.textContent) && !/Live Parlays/i.test(d.title), 'the section is still called Live Parlays somewhere a reader sees it'); }
  chk(!d.getElementById('savedCard') && !d.getElementById('betParlays'), 'the old cards are still drawn');

  // ---- D1. X's parlays are read only on every device: nothing to delete, clear or bring back ----
  {
    const live = await run({ state: 'in' });
    chk(!live.d.getElementById('clear') && !live.d.getElementById('restoreAll'), 'Clear settled, or the way back, is still on the page');
    chk(/\[hidden\]\{display:none!important\}/.test(HTML), 'a hidden button is still drawn: the .btn display rule beats the hidden attribute without this');
    /* the one control a card carries is its X, which clears it on this device alone (section O) */
    chk(live.d.querySelectorAll('#lpCard .savedp').length === 2 && !live.d.querySelector('#lpCard [data-rm], #lpCard .hidebtn, #lpCard button:not(#now):not(.lp-x):not(#lpAskNo):not(#lpAskYes):not(#lpShowAll)'),
      'a placed parlay offers a delete, or X Parlays offers a control beside Refresh now and each card\'s X');
    /* the section only: the Props game list carries its own LIVE pill once a real game has kicked off */
    chk(!live.d.querySelector('#lpCard .pill.warn') && !/\d of \d in/.test(txt(live.d.getElementById('lpCard'))), 'a running parlay still carries the "n of m in" tag');
    chk(typeof live.w.LIVE_IO === 'undefined' && typeof live.w.NFLSYNC === 'undefined' && live.w.localStorage.getItem('live_parlays_v1') === null, 'the shared key (LIVE_IO) or the sync layer is still on the page, or the section wrote a key');
    const done = await run({ state: 'post' });
    chk(done.d.querySelectorAll('#lpCard .savedp').length === 2 && done.d.querySelectorAll('#lpCard .pill.ok, #lpCard .pill.bad').length === 2, 'a finished parlay should still be drawn and say landed or gone');   /* the section only: the Props list has its own FINAL pills */
    /* finished parlays stay in full view, last, under Finished with their count and when they
       clear themselves (the betting job's autoclear.py), and nothing is folded away */
    { const app = done.d.getElementById('app'), head = app.querySelector('.lp-done'), kids = [...app.children];
      chk(!!head && /^Finished/.test(txt(head)) && /^Finished2 · each clears itself the day after its last game$/.test(txt(head))
        && kids.indexOf(head) < kids.indexOf(app.querySelector('.savedp')) && !app.querySelector('details') && /None of X’s parlays is still live/.test(txt(app)),
        'finished parlays are not shown in full under "Finished" with their count and when they clear, with a line saying none is live: ' + txt(app).slice(0, 160)); }
    { const app = live.d.getElementById('app'), h = app.querySelector('.lp-done'), kids = [...app.children], at = h ? kids.indexOf(h) : Infinity;
      chk([...app.querySelectorAll('.savedp')].every(c => (kids.indexOf(c) > at) === /\bgone\b/.test(txt(c.querySelector('.sp-head')))),
        'mid-game a parlay is under Finished though it is not gone, or a gone one is still among the live ones'); }
    /* a browser's own parlays, settled or not, saved before: drawn nowhere, nothing offered to clear
       them, and kept in its storage as they were */
    const ownBlob = JSON.stringify({ stake: 5, saved: [
      { id: 'own-won', week: 2, stake: 5, price: 150, payout: 12.5, legs: [{ gid: '2026_02_CAR_ATL', stat: 'rushing_yards', k: 43.5, side: 'over', main: true, name: 'Bijan Robinson', team: 'ATL', week: 2 }] },
      { id: 'own-lost', week: 2, stake: 5, price: 150, payout: 12.5, legs: [{ gid: '2026_02_CAR_ATL', stat: 'rushing_yards', k: 20.5, side: 'under', main: true, name: 'Chuba Hubbard', team: 'CAR', week: 2 }] }] });
    const mine = await run({ state: 'post', seed: w => { w.localStorage.setItem(PROP_KEY, ownBlob); w.localStorage.setItem(BET_KEY, betBlob()); } });
    chk(mine.d.querySelectorAll('.savedp').length === 2 && mine.d.querySelectorAll('#lpCard .savedp').length === 2 && !mine.d.querySelector('[data-rm]'),
      'a browser\'s own settled parlays or betting slip are drawn, or offered to delete');
    chk(mine.w.eval('S').saved.map(p => p.id).join() === 'own-won,own-lost' && mine.w.localStorage.getItem(BET_KEY) === betBlob() && mine.w.localStorage.getItem('my_parlays_v1') === null,
      'a browser\'s own saved parlays or betting slip were touched, or a key of its own was written');
  }

  // ---- D2. the line X took is the file's: no pencil, nothing to correct on the page ----
  {
    const one = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'k', week: 2, stake: 5, legs: [
        legF(0, 'Kyle Pitts', 'ATL', 'receiving_yards', 41.5, 'over', true)] }] };
    const ro = await run({ file: one });
    chk(!ro.d.querySelector('#lpCard [data-edit], #lpCard [data-reset], #lpCard [data-stake-of], #lpCard .lineInput') && txt(ro.d.querySelector('#lpCard .lineLbl')) === '41.5' && target(ro.d.querySelector('#lpCard .sp-leg.prop')) === '41.5+',
      'a placed parlay\'s line or stake can be changed on the page, or the line drawn is not the file\'s');
    chk(!/moved from/.test(txt(ro.d.getElementById('lpCard'))), 'a line the file has is drawn as moved');
    /* a browser that kept a corrected line under the old shared key draws the file's line, not its own */
    const old = await run({ file: one, seed: w => w.localStorage.setItem('live_parlays_v1', JSON.stringify({ lines: { 'file|k|0': 60.5 }, removed: { 'file|k': 1 } })) });
    chk(old.d.querySelectorAll('#lpCard .savedp').length === 1 && txt(old.d.querySelector('#lpCard .lineLbl')) === '41.5',
      'a correction or a deletion the browser kept under the old shared key still changes X Parlays: ' + txt(old.d.getElementById('lpCard')).slice(0, 120));
  }

  // ---- K. a cleared parlay stays in the file as history and is not drawn, nor its games read ----
  {
    const file = { updated: '2026-10-10T17:28:45Z', games: ['2026_02_CAR_ATL', '2026_02_NO_BAL'], parlays: [
      { id: 'night', cleared: true, week: 2, stake: 10, price: 200, payout: 30, legs: [legF(1, 'Derrick Henry', 'BAL', 'rushing_yards', 70.5, 'over', true)] },
      FILE.parlays[1]] };
    const c = await run({ file });
    chk(c.d.querySelectorAll('#lpCard .savedp').length === 1 && !/Derrick Henry/.test(txt(c.d.getElementById('lpCard'))) && /Bijan Robinson/.test(txt(c.d.getElementById('lpCard'))),
      'a cleared parlay is drawn, or the one beside it is not: ' + c.d.querySelectorAll('#lpCard .savedp').length);
    chk(!c.calls.some(u => /\/summary\?event=403\b/.test(u)) && c.calls.filter(u => /\/summary\?event=401\b/.test(u)).length === 1, 'a cleared parlay\'s box score was read, or the other\'s was not: ' + c.calls.filter(u => u.includes('/summary?')).join(' '));
    /* the quiet line under the heading: the file's own word for when X's parlays last changed */
    { const up = txt(c.d.getElementById('lpUpdated')), want = new Date('2026-10-10T17:28:45Z').toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      chk(!!c.d.querySelector('#lpCard h2 + #lpUpdated') && up.includes('updated ' + want) && /^X.s placed parlays/.test(up), 'X Parlays does not say under its heading when the file last changed: ' + up); }
    /* every parlay cleared: the card says there is nothing to watch, and reads nothing from ESPN */
    const all = await run({ file: { updated: '2026-10-10T17:28:45Z', games: file.games, parlays: file.parlays.map(p => Object.assign({}, p, { cleared: true })) } });
    chk(txt(all.d.getElementById('app')) === 'Nothing to watch yet' && all.calls.filter(u => u.includes('/summary?')).length === 0,
      'with every parlay cleared X Parlays does not say there is nothing to watch, or read a box score: ' + txt(all.d.getElementById('app')));
    chk(/updated /.test(txt(all.d.getElementById('lpUpdated'))), 'with every parlay cleared the card lost its updated line');
    /* "cleared" means true and nothing else: a parlay marked false is drawn */
    const no = await run({ file: { updated: null, games: file.games, parlays: [Object.assign({}, FILE.parlays[0], { cleared: false })] } });
    chk(no.d.querySelectorAll('#lpCard .savedp').length === 1, 'a parlay marked cleared: false is not drawn');
  }

  // ---- L. the real file: every parlay X deleted is cleared, and the corrected line is in it ----
  {
    const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'liveparlays', 'parlays.json'), 'utf8'));
    chk(real.parlays.length >= 25 && real.parlays.filter(p => p.cleared === true).length >= 25, 'the 25 parlays X deleted are not kept in the file as cleared history');
    const sgp = real.parlays.find(p => p.id === 'w3-dk-sgp-5'), leg = sgp && sgp.legs[4];
    chk(!!leg && leg.player === 'Matthew Stafford' && leg.stat === 'passing_yards' && leg.side === 'under' && leg.line === 239.5,
      'the line X corrected (w3-dk-sgp-5, leg 4: Stafford\'s passing yards under) is not 239.5 in the file: ' + JSON.stringify(leg));
    /* drawn as it is when not cleared: the corrected line is what the leg is measured against */
    const shown = JSON.parse(JSON.stringify(real)); shown.parlays = shown.parlays.filter(p => p.id === 'w3-dk-sgp-5').map(p => Object.assign(p, { cleared: false }));
    const r = await run({ file: shown, state: 'post' });
    const row = [...r.d.querySelectorAll('#lpCard .sp-leg.prop')].find(x => /Matthew Stafford Passing Yards/.test(who(x)));
    chk(!!row && target(row) === 'under 239.5' && txt(row.querySelector('.lineLbl')) === '239.5', 'the corrected leg is not drawn on its line: ' + (row ? txt(row).slice(0, 120) : 'no row'));
    /* and as the file stands, X Parlays has nothing to watch */
    const now = await run({ file: real });
    if (!real.parlays.some(p => p.cleared !== true)) chk(txt(now.d.getElementById('app')) === 'Nothing to watch yet', 'with every parlay in the real file cleared, X Parlays does not say there is nothing to watch: ' + txt(now.d.getElementById('app')));
    chk(now.d.querySelectorAll('#lpCard .savedp').length === real.parlays.filter(p => p.cleared !== true).length, 'X Parlays does not draw exactly the real file\'s parlays that are not cleared');
  }

  // ---- N. a browser the retired layers left their mark on shows exactly the file, and keeps its own ----
  {
    /* what an owner's device or an old reader's carries: the owner link's secret, a sign-in session,
       the device id, the reader's mark, the rev it last saw, its copies of the old shared document
       (a merge base and a reader's last copy, each with a corrected line, and the section's key as the
       store last held it: the one line carried into the file, deletions and the slips it deleted), the
       X Bet Log's moved-in mark, its cache and a week that reached the store;
       and what is its own: the prop model's key, my_parlays_v1, the betting app's key and the log
       kept aside when it was shared */
    const xdoc = { prop: { saved: [{ id: 'x-old', week: 2, stake: 3, legs: [{ gid: '2026_02_CAR_ATL', stat: 'receptions', k: 3, side: 'over', main: true, name: 'Old Shared Receiver', team: 'ATL', week: 2 }] }], parlay: {} },
      live: { lines: { 'file|early|0': 50.5 }, removed: { 'file|night': 1 } } };
    const own = JSON.stringify({ stake: 25, saved: [{ id: 'own-1', week: 2, stake: 4, price: 300, payout: 16, legs: [{ gid: '2026_02_CAR_ATL', stat: 'receptions', k: 3, side: 'over', main: false, name: 'Own Receiver', team: 'ATL', week: 2 }] }], parlay: {} });
    const myOld = JSON.stringify({ lines: { 'prop|own-1|0': 4 }, removed: {}, kept: {} });
    const betOwn = JSON.stringify({ myPicks: {}, bets: { 1: { staked: 10, returned: 8.71, note: '' } }, bank: { lastAmt: 20, filter: 'all', build: [], mode: 'straight', deposit: 100 } });
    const pre = JSON.stringify({ at: '2026-10-10T17:28:44Z', bets: { 1: { staked: 10, returned: 8.71, note: '' } }, deposit: 100 });
    const OLD = {
      nflowner_v1: 'the-old-owner-secret', nflsync_owner_v1: JSON.stringify({ uid: 'u', refreshToken: 'rt', idToken: 'it', exp: 1 }), nflsync_device_v1: 'dabc',
      xparlays_v1: JSON.stringify({ at: '2026-10-10T05:00:00Z', dropped: 0 }), nflsync_v1: 'r-old',
      nflsync_base_v1: JSON.stringify({ rev: 'r-old', revs: ['r-old'], doc: xdoc, hist: [] }),
      xparlays_cache_v1: JSON.stringify({ rev: 'r-old', at: '2026-10-10T05:00:00Z', doc: xdoc }),
      live_parlays_v1: JSON.stringify({ lines: { 'file|w3-dk-sgp-5|4': 239.5 }, removed: { 'file|night': 1, 'file|w3-dk-sgp-5': 1, 'bet|s1': 1 }, bet: { dabc: [{ id: 's1', week: 2, type: 'parlay', stake: 1, legs: [] }] } }),
      ['xbets_joined_' + BET_SEASON]: JSON.stringify({ at: '2026-10-10T17:28:44Z', added: [1], differ: [] }), ['xbets_cache_' + BET_SEASON]: JSON.stringify({ weeks: { w1: { staked: 10, returned: 8.71, note: '' } } }),
      ['xbets_pending_' + BET_SEASON]: JSON.stringify({ at: '2026-10-10T17:28:44Z', ops: { 'weeks/w1': { staked: 10, returned: 8.71, note: '' } } }),
      [PROP_KEY]: own, my_parlays_v1: myOld, [BET_KEY]: betOwn, ['x_nfl_bets_preshare_' + BET_SEASON]: pre };
    /* the X Bet Log's file as it is, for this season: week 1 is the week waiting in the browser */
    const XB = Object.assign(JSON.parse(fs.readFileSync(path.join(ROOT, 'liveparlays', 'xbets.json'), 'utf8')), { season: BET_SEASON });
    XB.weeks = Object.assign({}, XB.weeks, { w1: { staked: 10, returned: 8.71, note: '' } });
    const o = await run({ seed: w => { for (const [k, v] of Object.entries(OLD)) w.localStorage.setItem(k, v); }, xbets: XB });
    await wait(300);
    const lp = o.d.getElementById('lpCard'), keys = allKeys(o.w);
    chk(!o.timedOut && lp.querySelectorAll('.savedp').length === 2 && !/Old Shared Receiver|Own Receiver/.test(txt(o.d.getElementById('tab-xparlays')) + txt(o.d.getElementById('tab-parlay'))) && txt(lp.querySelector('.lineLbl')) === '43.5',
      'a browser with the old owner\'s keys does not show exactly the file\'s parlays on the file\'s lines: ' + txt(lp).slice(0, 160));
    { const shown = o.d.body.cloneNode(true); shown.querySelectorAll('script, style').forEach(n => n.remove());
      chk(!o.d.querySelector('#ownerMark, #xpOwner, #xpSignIn, #xpSignOut, #xpSignInBox, #syncStamp') && !/\bowner\b|sign out|sign in|Not synced|Synced/i.test(txt(shown)),
        'a browser that was the owner\'s shows an owner mark, a sign-in or a sync stamp: ' + ((txt(shown).match(/.{0,60}(\bowner\b|sign out|sign in|Not synced|Synced).{0,60}/i) || [''])[0])); }
    chk(['nflowner_v1', 'nflsync_owner_v1', 'nflsync_device_v1', 'xparlays_v1', 'nflsync_v1', 'nflsync_base_v1', 'xparlays_cache_v1', 'live_parlays_v1', 'xbets_joined_' + BET_SEASON, 'xbets_cache_' + BET_SEASON, 'xbets_pending_' + BET_SEASON].every(k => !(k in keys)),
      'a flag or a copy the retired layers left was not taken out: ' + Object.keys(keys).join(', '));
    chk(keys.my_parlays_v1 === myOld && keys[BET_KEY] === betOwn && keys['x_nfl_bets_preshare_' + BET_SEASON] === pre && JSON.stringify(JSON.parse(keys[PROP_KEY]).saved) === JSON.stringify(JSON.parse(own).saved)
      && o.w.eval('S').saved.map(p => p.id).join() === 'own-1',
      'a browser\'s own data was touched: ' + JSON.stringify({ my: keys.my_parlays_v1 === myOld, bet: keys[BET_KEY] === betOwn, pre: keys['x_nfl_bets_preshare_' + BET_SEASON] === pre }));
    chk(typeof o.w.NFLSYNC === 'undefined' && typeof o.w.LIVE_IO === 'undefined' && o.w.XBETS && typeof o.w.XBETS.write === 'undefined' && typeof o.w.XBETS.signOut === 'undefined', 'the sync layer, the shared key or the X Bet Log\'s writer is still on the page');
    /* the builder finishes, on this browser too */
    chk(!!o.d.querySelector('#parlayBody') && !o.d.getElementById('pSave'), 'a browser that was the owner\'s still has Save and lock in the builder');
    /* what the old layers left that is not in the file (a line corrected on a parlay of the browser's
       own, a kept builder, a slip it never deleted, or a week that never reached the store) stays
       where it is, unread */
    const keep = { live_parlays_v1: JSON.stringify({ lines: { 'prop|own-1|0': 4.5 }, removed: {} }), ['xbets_pending_' + BET_SEASON]: JSON.stringify({ at: 'x', ops: { 'weeks/w6': { staked: 5, returned: 0, note: '' } } }) };
    const k2 = await run({ seed: w => { for (const [k, v] of Object.entries(keep)) w.localStorage.setItem(k, v); }, xbets: XB });
    await wait(300);
    const keys2 = allKeys(k2.w);
    chk(keys2.live_parlays_v1 === keep.live_parlays_v1 && keys2['xbets_pending_' + BET_SEASON] === keep['xbets_pending_' + BET_SEASON], 'a leftover holding something the files lack was deleted: ' + Object.keys(keys2).join(', '));
    for (const [what, v] of [['a kept builder', { kept: { k: { legs: [] } } }], ['a slip it never deleted', { removed: {}, bet: { d: [{ id: 's9', legs: [] }] } }], ['a key it never wrote', { lines: {}, other: 1 }],
      /* a line a browser corrected on one of X's placed parlays before the store (24 September), which
         the file does not have: on another leg, or on the carried leg at another number */
      ['a line corrected on another of X\'s legs', { lines: { 'file|w2-ml-3|0': 2.5 } }],
      ['the carried leg corrected to another number', { lines: { 'file|w3-dk-sgp-5|4': 250 }, removed: { 'file|w3-dk-sgp-5': 1 } }],
      ['the carried line beside one the file lacks', { lines: { 'file|w3-dk-sgp-5|4': 239.5, 'file|w4-dk-sgp-3|1': 6.5 } }]]) {
      const k3 = await run({ seed: w => w.localStorage.setItem('live_parlays_v1', JSON.stringify(v)) });
      chk(k3.w.localStorage.getItem('live_parlays_v1') === JSON.stringify(v), `the old shared key holding ${what} was deleted`); }
    /* the store's last section key as it stood, on its own, holds nothing the file lacks: it goes */
    { const v = { lines: { 'file|w3-dk-sgp-5|4': 239.5 }, removed: { 'file|w3-dk-sgp-5': 1 } };
      const k4 = await run({ seed: w => w.localStorage.setItem('live_parlays_v1', JSON.stringify(v)) });
      chk(k4.w.localStorage.getItem('live_parlays_v1') === null, 'the old shared key holding only the line the file carries and a deletion was kept'); }
  }

  // ---- O. the X on every card: Clear this parlay?, and it is cleared on this device alone ----
  /* Every visitor sees the same X Parlays, with an X at the top right of every card, live or
     settled. The X asks first; Cancel, Escape and a click outside clear nothing; Clear takes that
     parlay off X Parlays in this browser, kept under the section's own key (lp_cleared_here_v1:
     the ids, each with when it was cleared), pruned of ids the file no longer has or has cleared,
     and never sent anywhere. Another browser still sees it. */
  {
    const HK = 'lp_cleared_here_v1';
    const seedHere = list => w => w.localStorage.setItem(HK, JSON.stringify(list));
    const at = '2026-10-12T20:00:00.000Z';
    const key = w => w.localStorage.getItem(HK);
    const ids = w => { try { return (JSON.parse(key(w)) || []).map(x => x.id).join(); } catch (e) { return 'junk'; } };
    const shownIds = d => [...d.querySelectorAll('#lpCard .savedp')].map(c => c.getAttribute('data-lp-id')).join();
    const xOf = (d, id) => [...d.querySelectorAll('#lpCard [data-lp-clear]')].find(b => b.getAttribute('data-lp-clear') === id);
    const dlg = d => d.getElementById('lpAsk');
    const key0 = (w, k, el) => (el || w.document.activeElement || w.document.body).dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ bubbles: true }, k)));
    /* every card has its X, live and settled: a real button, named, at the card's top right */
    for (const st of ['in', 'post']) {
      const r = await run({ state: st });
      const cs = [...r.d.querySelectorAll('#lpCard .savedp')];
      chk(cs.length === 2 && cs.every(c => { const b = c.firstElementChild;
        return c.querySelectorAll('.lp-x').length === 1 && b && b.matches('button.lp-x[type="button"][data-lp-clear]') && b.getAttribute('aria-label') === 'Clear this parlay'
          && b.getAttribute('data-lp-clear') === c.getAttribute('data-lp-id') && !!b.querySelector('svg[aria-hidden="true"]') && !txt(b); }),
        `a card ${st === 'post' ? 'settled' : 'live'} has no X of its own at its top right named "Clear this parlay": ` + cs.map(c => c.innerHTML.slice(0, 80)).join(' | '));
      chk(dlg(r.d) && dlg(r.d).hidden && r.w.localStorage.getItem(HK) === null, 'the Clear this parlay? window is open on load, or the page wrote its key before anything was cleared');
      r.w.close();
    }
    /* the X's look: a 44px target at the top right, clear of the header's chips (the card's
       padding and the header's own room hold the X, so the chips wrap before it on a phone), in
       the page's own tokens, so the hub look carries it */
    { const rule = (h, sel) => { const m = h.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')); return m ? m[1] : ''; };
      for (const [name, h] of [['the page', HTML]]) {
        const x = rule(h, '#lpCard .lp-x'), head = rule(h, '#lpCard .sp-head'), card = rule(h, '#lpCard .savedp');
        const px = (s, p) => +((s.match(new RegExp('(?:^|;)' + p + ':(-?[\\d.]+)px')) || [])[1]);
        const padR = +((card.match(/padding:[\d.]+px ([\d.]+)px/) || [])[1]);
        chk(/position:absolute/.test(x) && px(x, 'width') >= 44 && px(x, 'height') >= 44 && px(x, 'top') >= 0 && px(x, 'right') >= 0 && /position:relative/.test(card)
          && padR + px(head, 'padding-right') >= px(x, 'right') + px(x, 'width') && /var\(--muted\)/.test(x) && /#lpCard \.lp-x:focus-visible\{[^}]*var\(--ring\)/.test(h),
          `${name}: the X is not a 44px target at the card's top right clear of the header, in the page's tokens with a focus ring: ` + x + ' / ' + head + ' / ' + card);
        /* the window scrolls, its panel centred by its own auto margins, so a panel taller than a
           phone on its side still reaches Clear with the page behind held still */
        chk(/#lpCard \.lp-dlg\{[^}]*overflow-y:auto/.test(h) && /#lpCard \.lp-dlg\{[^}]*align-items:flex-start/.test(h) && /#lpCard \.lp-dlg-panel\{[^}]*margin:auto/.test(h),
          `${name}: the Clear this parlay? window does not scroll when its panel is taller than the screen: ` + rule(h, '#lpCard .lp-dlg') + ' / ' + rule(h, '#lpCard .lp-dlg-panel'));
        chk(/#lpCard \.lp-dlg\{[^}]*position:fixed/.test(h) &&/#lpCard \.lp-dlg-panel\{[^}]*background:var\(--panel\)[^}]*color:var\(--ink\)/.test(h) && /#lpCard \.lp-dlg-btns \.btn\{[^}]*min-height:44px/.test(h)
          && /#lpCard \.lp-here \.btn\{[^}]*min-height:44px/.test(h),
          `${name}: the Clear this parlay? window is not over the page in the page's tokens, or its buttons or Show them again are under 44px`);
      }
    }
    /* the X asks; Cancel, Escape and a click outside clear nothing, and the focus goes back to the X */
    const A = await run({ state: 'in' });
    /* a page with no X and no window (an older build) fails here once, rather than throwing below */
    const canRun = !!xOf(A.d, 'early') && !!dlg(A.d) && !!A.d.getElementById('lpAskYes');
    chk(canRun, 'X Parlays has no X on its cards or no Clear this parlay? window: the rest of section O cannot run');
    if (canRun) {
    { const { w, d, calls, methods } = A, n0 = calls.length;
      chk(shownIds(d) === 'early,night', 'the cards are not the file\'s: ' + shownIds(d));
      for (const how of ['Cancel', 'Escape', 'a click outside']) {
        const x = xOf(d, 'early'); x.focus(); x.click();
        const D = dlg(d), panel = D && D.querySelector('[role="alertdialog"]');
        chk(!!D && !D.hidden && !!panel && panel.getAttribute('aria-modal') === 'true' && txt(d.getElementById(panel.getAttribute('aria-labelledby'))) === 'Clear this parlay?'
          && txt(d.getElementById('lpAskWhat')) === '4-leg parlay · week 2 · +580 · sunday'
          && /on this device only/.test(txt(panel)) && /nothing is sent anywhere/.test(txt(panel)) && /clear themselves for everyone the day after their last game/.test(txt(panel))
          && d.activeElement === d.getElementById('lpAskNo') && txt(d.getElementById('lpAskNo')) === 'Cancel' && txt(d.getElementById('lpAskYes')) === 'Clear' && d.body.classList.contains('modal-open'),
          `the X does not open "Clear this parlay?" naming the parlay (legs, week, price), saying it is this device only and that X's parlays clear themselves for everyone, with the focus on Cancel (${how}): ` + txt(panel));
        /* Tab stays inside: from Clear to Cancel, and back from Cancel to Clear */
        if (how === 'Cancel') {
          d.getElementById('lpAskYes').focus(); key0(w, { key: 'Tab' });
          const fwd = d.activeElement === d.getElementById('lpAskNo');
          key0(w, { key: 'Tab', shiftKey: true });
          chk(fwd && d.activeElement === d.getElementById('lpAskYes'), 'Tab leaves the Clear this parlay? window');
          d.getElementById('lpAskNo').click();
        } else if (how === 'Escape') key0(w, { key: 'Escape' });
        else {
          /* a click inside the window is not outside it */
          d.getElementById('lpAskText').click();
          chk(!D.hidden, 'a click inside the Clear this parlay? window closed it');
          D.click();
        }
        chk(D.hidden && shownIds(d) === 'early,night' && key(w) === null && !d.body.classList.contains('modal-open') && d.activeElement === xOf(d, 'early'),
          `${how} cleared the parlay, left the window open, wrote the key or did not give the focus back to the X: ` + JSON.stringify({ hidden: D.hidden, shown: shownIds(d), key: key(w), focus: d.activeElement && d.activeElement.outerHTML.slice(0, 60) }));
      }
      /* Clear: exactly that parlay leaves, kept in this browser's own key with when it was cleared,
         the focus on the X now in its place, and nothing sent anywhere */
      const before = Date.now();
      xOf(d, 'early').click(); d.getElementById('lpAskYes').click();
      let st = null; try { st = JSON.parse(key(w)); } catch (e) {}
      chk(dlg(d).hidden && shownIds(d) === 'night' && Array.isArray(st) && st.length === 1 && st[0].id === 'early' && Date.parse(st[0].at) >= before - 1000 && Date.parse(st[0].at) <= Date.now() + 1000,
        'Clear did not take exactly that parlay off X Parlays, kept in this browser under ' + HK + ' with when: ' + JSON.stringify({ shown: shownIds(d), st }));
      chk(d.activeElement === xOf(d, 'night'), 'after a Clear the focus is not on the X that takes its place: ' + (d.activeElement && d.activeElement.outerHTML.slice(0, 60)));
      chk(calls.length === n0 && methods.every(m => m === 'GET'), 'clearing a parlay sent a request, or the page sent something but a read: ' + calls.slice(n0).join(' '));
      /* one left: a quiet line says one is cleared here, with the way back */
      chk(/^You cleared 1 parlay on this device ?Show it again$/.test(txt(d.querySelector('#app .lp-here'))) && !/Nothing to watch yet/.test(txt(d.getElementById('app'))),
        'with one parlay cleared the card does not say so quietly at its foot: ' + txt(d.querySelector('#app .lp-here')));
      /* the other too: the card says so quietly, with Show them again, and not that there is nothing to watch */
      xOf(d, 'night').click(); d.getElementById('lpAskYes').click();
      chk(shownIds(d) === '' && ids(w) === 'early,night' && /^You cleared 2 parlays on this device ?Show them again$/.test(txt(d.getElementById('app')))
        && d.activeElement === d.getElementById('lpShowAll') && !d.querySelector('#app .empty'),
        'with every parlay cleared on this device the card does not say so quietly with Show them again (the focus on it): ' + txt(d.getElementById('app')));
      /* Show them again: no window, the list emptied (the key gone), every card back, and their games read again */
      const n1 = calls.length;
      d.getElementById('lpShowAll').click();
      chk(dlg(d).hidden && shownIds(d) === 'early,night' && key(w) === null && !d.querySelector('#app .lp-here') && d.activeElement === xOf(d, 'early'),
        'Show them again did not bring every parlay back at once and empty the list: ' + JSON.stringify({ shown: shownIds(d), key: key(w) }));
      await wait(300);
      chk(calls.slice(n1).some(u => /parlays\.json/.test(u)) && calls.slice(n1).some(u => /\/summary\?event=401\b/.test(u)) && methods.every(m => m === 'GET'),
        'Show them again did not read the parlays\' games again, or sent something but a read: ' + calls.slice(n1).join(' '));
      w.close(); }
    /* Escape with the window open closes it alone: no window beneath it closes too */
    { const r = await run({ state: 'in' }), { w, d } = r;
      xOf(d, 'night').click();
      let other = 0; d.addEventListener('keydown', e => { if (e.key === 'Escape') other++; });
      key0(w, { key: 'Escape' });
      chk(dlg(d).hidden && other === 0 && d.activeElement === xOf(d, 'night'), 'Escape on the Clear this parlay? window reached the page beneath it');
      w.close(); }
    /* a double tap on the X: the second tap, landing a moment after the window opened (on Clear,
       which can sit under the X on a phone, or on the backdrop), neither clears nor closes; a key's
       click (no pointer) and a tap after the moment do */
    { const r = await run({ state: 'in' }), { w, d } = r;
      const tap = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      xOf(d, 'early').click();
      tap(d.getElementById('lpAskYes'));
      chk(!dlg(d).hidden && shownIds(d) === 'early,night' && key(w) === null, 'a second tap on Clear just after the window opened cleared the parlay without the visitor answering');
      tap(dlg(d));
      chk(!dlg(d).hidden, 'a second tap on the backdrop just after the window opened closed it');
      await wait(450);
      tap(d.getElementById('lpAskYes'));
      chk(dlg(d).hidden && shownIds(d) === 'night' && ids(w) === 'early', 'a tap on Clear once the window has been open a moment did not clear the parlay');
      w.close(); }
    /* the window is X Parlays' own: leaving the tab closes it, clearing nothing, and nothing hidden
       keeps the page held still or takes its keys */
    { const r = await run({ state: 'in' }), { w, d } = r;
      xOf(d, 'early').click();
      w.location.hash = '#parlay'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await wait(60);
      chk(dlg(d).hidden && !d.body.classList.contains('modal-open') && shownIds(d) === 'early,night' && key(w) === null,
        'moving to another tab left the Clear this parlay? window open behind it, the page held still, or cleared the parlay');
      /* the focus on the Parlay Builder's own tab button, as the visitor who pressed it holds it: the
         tab bar is always there, where the tab's panel can have no control at all (once a week's
         games have all kicked off it says so and draws none, and the body, which cannot take the
         focus, left it on the hidden Cancel, so the check below read a Tab that moved nothing) */
      const b = d.querySelector('#tabs [data-tab="parlay"]'); try { b.focus(); } catch (e) {}
      chk(!!b && d.activeElement === b, 'the focus could not be put on the Parlay Builder\'s tab button, so Tab on another tab is not tried: ' + (d.activeElement && d.activeElement.outerHTML.slice(0, 60)));
      const was = d.activeElement; key0(w, { key: 'Tab' });
      chk(d.activeElement === was && d.activeElement !== d.getElementById('lpAskNo') && d.activeElement !== d.getElementById('lpAskYes'), 'Tab on another tab lands on the hidden window\'s buttons');
      let esc = 0; d.addEventListener('keydown', e => { if (e.key === 'Escape') esc++; });
      key0(w, { key: 'Escape' }, was);
      chk(esc === 1, 'Escape on another tab is taken by the hidden Clear this parlay? window');
      /* and the window open on a tab hidden without a hashchange closes at the next key */
      w.location.hash = '#xparlays'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await wait(60);
      xOf(d, 'night').click(); d.getElementById('tab-xparlays').hidden = true;
      let esc2 = 0; d.addEventListener('keydown', e => { if (e.key === 'Escape') esc2++; });
      key0(w, { key: 'Escape' }, d.body);
      chk(dlg(d).hidden && esc2 === 1 && !d.body.classList.contains('modal-open') && key(w) === null, 'a Clear this parlay? window left open on a hidden tab still takes the keys');
      w.close(); }
    /* two tabs of the site in one browser share its storage: a clear in one is not undone by the
       other's older copy of the list (its Refresh now, or its own clear), and the other follows it */
    { const A2 = await run({ state: 'in' }), B2 = await run({ state: 'in' });
      /* jsdom keeps a storage for each window: B's is set to what the shared storage holds once A writes */
      const share = () => { const v = A2.w.localStorage.getItem(HK); if (v === null) B2.w.localStorage.removeItem(HK); else B2.w.localStorage.setItem(HK, v); };
      xOf(A2.d, 'early').click(); A2.d.getElementById('lpAskYes').click(); share();
      B2.d.getElementById('now').click(); await wait(300);
      chk(ids(B2.w) === 'early', 'Refresh now in a second tab wrote its older list over a clear made in the first: ' + key(B2.w));
      xOf(B2.d, 'night').click(); B2.d.getElementById('lpAskYes').click();
      chk(ids(B2.w) === 'early,night', 'a clear in a second tab lost the first tab\'s clear: ' + key(B2.w));
      /* the storage event: the other tab redraws on what the storage now holds */
      B2.w.localStorage.setItem(HK, JSON.stringify([{ id: 'early', at }].slice(0, 1)));
      B2.w.dispatchEvent(new B2.w.StorageEvent('storage', { key: HK }));
      chk(shownIds(B2.d) === 'night', 'a tab does not follow a change another tab made to the cleared list: ' + shownIds(B2.d));
      /* Show them again brings back the ones this tab shows as cleared, not one another tab clears after */
      B2.w.localStorage.setItem(HK, JSON.stringify([{ id: 'early', at }, { id: 'night', at }]));
      B2.d.getElementById('lpShowAll').click();
      chk(ids(B2.w) === 'night' && shownIds(B2.d) === 'early', 'Show them again in one tab brought back a parlay another tab cleared after it last read the list: ' + key(B2.w));
      await wait(300); A2.w.close(); B2.w.close(); }
    /* "None of X's parlays is still live" is said of X's file only when nothing is cleared here: X's
       two live parlays cleared on this device, a third already lost mid-game (CAR 17, ATL 20 is past
       an under 36.5), and the line speaks only for the one shown */
    { const file = JSON.parse(JSON.stringify(FILE));
      file.parlays.push({ id: 'dead', week: 2, stake: 5, price: 150, payout: 12.5, legs: [{ game: 0, player: 'Total', team: 'ATL', stat: 'total', line: 36.5, side: 'under', main: true }] });
      const r = await run({ state: 'in', file, seed: seedHere([{ id: 'early', at }, { id: 'night', at }]) });
      const t = txt(r.d.getElementById('app'));
      chk(shownIds(r.d) === 'dead' && !/None of X’s parlays is still live/.test(t) && /None of the parlays shown here is still live/.test(t),
        'with X\'s live parlays cleared on this device the card says none of X\'s parlays is still live: ' + t.slice(0, 160));
      const r2 = await run({ state: 'in', file });
      chk(shownIds(r2.d) === 'early,night,dead' && !/still live/.test(txt(r2.d.getElementById('app'))),
        'with nothing cleared and two of X\'s parlays live the card says none is still live: ' + txt(r2.d.getElementById('app')).slice(0, 160));
      r.w.close(); r2.w.close(); }
    /* the same browser after a reload: the parlay stays cleared, and its games are not followed */
    { const r = await run({ state: 'in', seed: seedHere([{ id: 'early', at }]) });
      chk(shownIds(r.d) === 'night' && ids(r.w) === 'early' && /^You cleared 1 parlay on this device/.test(txt(r.d.querySelector('#app .lp-here'))),
        'after a reload the parlay cleared on this device is back, or the list was lost: ' + shownIds(r.d));
      chk(!r.calls.some(u => /\/summary\?event=401\b/.test(u)) && r.calls.some(u => /\/summary\?event=403\b/.test(u)),
        'the games of a parlay cleared on this device are still followed, or the other\'s are not: ' + r.calls.filter(u => u.includes('/summary?')).join(' '));
      r.w.close(); }
    /* a fresh browser has every parlay: a clear is that device's alone */
    { const r = await run({ state: 'in' });
      chk(shownIds(r.d) === 'early,night' && key(r.w) === null, 'a fresh browser does not see every parlay in the file: ' + shownIds(r.d));
      r.w.close(); }
    /* pruned: an id the file no longer has, and one the file has cleared for everyone, leave the list */
    { const file = JSON.parse(JSON.stringify(FILE)); file.parlays[0].cleared = true;     /* night, cleared by the file */
      const r = await run({ file, seed: seedHere([{ id: 'early', at }, { id: 'long-gone', at }, { id: 'night', at }]) });
      chk(ids(r.w) === 'early' && JSON.parse(key(r.w))[0].at === at && shownIds(r.d) === '' && /^You cleared 1 parlay on this device/.test(txt(r.d.getElementById('app'))),
        'the list was not pruned to the ids the file still has and has not cleared: ' + key(r.w));
      const r2 = await run({ file, seed: seedHere([{ id: 'long-gone', at }, { id: 'night', at }]) });
      chk(key(r2.w) === null && shownIds(r2.d) === 'early', 'a list of ids the file no longer shows is not taken out of the browser: ' + key(r2.w));
      /* a file that does not answer prunes nothing: it cannot say what is gone */
      const r3 = await run({ data: 404, seed: seedHere([{ id: 'early', at }, { id: 'long-gone', at }]) });
      chk(ids(r3.w) === 'early,long-gone', 'with the file unread the list was pruned anyway: ' + key(r3.w));
      /* junk under the key: the page draws every parlay, and the junk goes */
      const r4 = await run({ seed: w => w.localStorage.setItem(HK, '{not json') });
      chk(shownIds(r4.d) === 'early,night' && key(r4.w) === null, 'junk under the key broke X Parlays or stayed: ' + shownIds(r4.d));
      for (const x of [r, r2, r3, r4]) x.w.close(); }
    /* a browser the retired owner layer marked: its flags go, the cleared list is the visitor's and stays */
    { const OLD2 = { nflowner_v1: 'the-old-owner-secret', nflsync_owner_v1: JSON.stringify({ uid: 'u' }), xparlays_v1: JSON.stringify({ at: '2026-10-10T05:00:00Z', dropped: 0 }),
        xparlays_cache_v1: JSON.stringify({ rev: 'r-old' }), live_parlays_v1: JSON.stringify({ lines: { 'file|w3-dk-sgp-5|4': 239.5 }, removed: { 'file|night': 1 } }), [HK]: JSON.stringify([{ id: 'night', at }]) };
      const r = await run({ state: 'in', seed: w => { for (const [k, v] of Object.entries(OLD2)) w.localStorage.setItem(k, v); } });
      const keys = allKeys(r.w);
      chk(['nflowner_v1', 'nflsync_owner_v1', 'xparlays_v1', 'xparlays_cache_v1', 'live_parlays_v1'].every(k => !(k in keys)) && keys[HK] === OLD2[HK] && shownIds(r.d) === 'early'
        && r.d.querySelectorAll('#lpCard .lp-x').length === 1,
        'on a browser the retired owner layer marked, its flags stayed, or the cleared list was touched, or the card is not the same as anyone\'s: ' + JSON.stringify({ keys: Object.keys(keys), shown: shownIds(r.d) }));
      xOf(r.d, 'early').click(); r.d.getElementById('lpAskYes').click();
      chk(ids(r.w) === 'night,early' && shownIds(r.d) === '', 'on a browser the retired owner layer marked, Clear does not work as on any other');
      r.w.close(); }
    }
    A.w.close();
  }

  // ---- D3. the scoreboard chips carry the result ----
  {
    const chip = (file, state) => run({ file, state }).then(x => x.d.querySelector('.gm'));
    const ml = (gi, team) => ({ game: gi, player: team, team, stat: 'ml', line: 0, side: 'over', main: false });
    const winning = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'w', week: 2, stake: 1, legs: [ml(0, 'ATL')] }] };      /* ATL up 20-17 */
    const losing = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'l', week: 2, stake: 1, legs: [ml(0, 'CAR')] }] };
    chk(/\bgood\b/.test((await chip(winning, 'in')).className), 'a game being won is not green');
    chk(/\bbad\b/.test((await chip(losing, 'in')).className), 'a game being lost is not red');
    /* a prop-only game has no row of its own, so its chip is the strip above the legs */
    const propOnly = { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 'p', week: 2, stake: 1, legs: [
        legF(0, 'Bijan Robinson', 'ATL', 'rushing_yards', 400.5, 'over', true)] }] };
    const pc = await chip(propOnly, 'in');
    chk(/\btie\b/.test(pc.className), 'a leg still short with the game running is not yellow');
    chk(!!pc.closest('.games'), 'a prop-only game lost its score strip');
    /* a game total: CAR 17, ATL 20 is 37 points, clear of 36.5 over and short of 42.5 */
    const tot = (line, side) => ({ updated: null, games: ['2026_02_CAR_ATL'], parlays: [
      { id: 't', week: 2, stake: 1, legs: [{ game: 0, player: 'Total', team: 'ATL', stat: 'total', line, side, main: true }] }] });
    { const x = await run({ file: tot(36.5, 'over'), state: 'in' }), row = x.d.querySelector('.sp-leg');
      chk(!!row && target(row) === 'Over 36.5' && /Total Points/.test(txt(row)) && knob(row) === '+0.5', 'a game total over its line does not read Over 36.5, +0.5: ' + txt(row));
      chk(/\bgood\b/.test(row.querySelector('.gm').className) && x.calls.filter(u => u.includes('/summary?')).length === 0, 'a total being won is not green, or it fetched a box score');
      /* points only go up: an over past its line is won with the game still on */
      chk(txt(row.querySelector('.res')) === '\u2713', 'an over past its line mid-game is not checked off as won: ' + txt(row)); }
    { const x = await run({ file: tot(36.5, 'under'), state: 'in' }), row = x.d.querySelector('.sp-leg');
      chk(txt(row.querySelector('.res')) === '\u2717', 'an under the total has already passed mid-game is not marked lost: ' + txt(row)); }
    { const x = await run({ file: tot(42.5, 'over'), state: 'in' }), row = x.d.querySelector('.sp-leg');
      chk(!/[\u2713\u2717]/.test(txt(row.querySelector('.res'))), 'an over still short of its line mid-game was settled: ' + txt(row)); }
    { const x = await run({ file: tot(42.5, 'over'), state: 'post' }), row = x.d.querySelector('.sp-leg');
      chk(/\bloss\b/.test(row.querySelector('.res').className) && knob(row) === '-5.5', 'a total that finished under an over bet is not lost: ' + txt(row)); }
    { const x = await run({ file: tot(42.5, 'under'), state: 'post' }), row = x.d.querySelector('.sp-leg');
      chk(/\bwin\b/.test(row.querySelector('.res').className) && target(row) === 'Under 42.5', 'an under that finished under is not won: ' + txt(row)); }
    const pre = await chip(winning, 'pre');
    chk(!/good|bad|tie/.test(pre.className), 'a game that has not kicked off is coloured');
  }

  // ---- E. nought before kickoff ----
  const b4 = await run({ state: 'pre' });
  const first = [...b4.d.querySelectorAll('.savedp')][0].querySelector('.sp-leg');
  chk(/CAR 0.0 ATL/.test(txt(b4.d.querySelector('.games'))), 'before kickoff the strip should read 0-0');
  chk(knob(first) === '0', 'before kickoff a leg should read 0');
  chk(/0 car, 0 rush yds|0 rec, 0 rec yds/.test(txt(first)), 'before kickoff the stat line should be zeros: ' + txt(first));

  // ---- F. an empty file, and a missing one ----
  const e1 = await run({ file: { updated: null, games: [], parlays: [] } });
  /* empty says so and nothing else: no tour of where parlays come from */
  chk(txt(e1.d.getElementById('app')) === 'Nothing to watch yet', 'an empty page should say only "Nothing to watch yet": ' + txt(e1.d.getElementById('app')));
  chk(!e1.d.getElementById('restoreAll'), 'the way back is offered with nothing deleted');
  const e2 = await run({ data: 'fail' });
  chk(/could not be read/.test(txt(e2.d.querySelector('.note')) || ''), 'a missing file is not explained');

  // ---- G. ESPN down: the parlays still list, only the numbers are stale ----
  const g1 = await run({ espn: 'fail' });
  chk(g1.d.querySelectorAll('.savedp').length === 2, 'the parlays should list when the scores cannot load');
  chk(/not loading/.test(txt(g1.d.querySelector('.note')) || ''), 'a failed score fetch is not explained');

  // ---- H. light on ESPN ----
  const h1 = await run();
  const before = h1.calls.length;
  h1.d.dispatchEvent(new h1.w.Event('visibilitychange'));
  await wait(80);
  chk(h1.calls.length === before, 'returning to the tab fetched on its own');
  h1.d.getElementById('now').click();
  await wait(200);
  chk(h1.calls.length > before, 'Refresh now did not fetch');
  const h2 = await run({ state: 'post' });
  const sums = () => h2.calls.filter(u => u.includes('/summary?')).length;
  const n1 = sums();
  await h2.w.lpRefresh(); await wait(200);
  chk(sums() === n1, `a finished game's box score was fetched again (${n1} -> ${sums()})`);

  // ---- H2. a box score is only asked for where a player leg needs one ----
  {
    const mlOnly = { updated: null, games: ['2026_02_CAR_ATL', '2026_02_NO_BAL'], parlays: [
      { id: 'ml', week: 2, stake: 2, price: 142, payout: 4.84, legs: [
        { game: 0, player: 'Falcons', team: 'ATL', stat: 'ml', line: 0, side: 'over', main: false },
        { game: 1, player: 'Ravens', team: 'BAL', stat: 'ml', line: 0, side: 'over', main: false }] }] };
    const m = await run({ file: mlOnly });
    chk(m.calls.filter(u => u.includes('/summary?')).length === 0,
      'a parlay of moneylines fetched box scores it has no use for');
    const row = m.d.querySelector('.sp-leg');
    chk(/Falcons/.test(txt(row)) && /To Win/.test(txt(row)), 'a whole-game bet from the file is wrong: ' + txt(row));
    /* the score rides in the row as a chip; the last column is the clock and nothing else */
    const gm = row.querySelector('.gm');
    chk(!!gm && /CAR 17.20 ATL/.test(txt(gm)), 'the score chip is not in the row: ' + txt(gm || null));
    chk(!/Q3/.test(txt(gm)), 'the chip still carries the clock: ' + txt(gm));
    /* the clock sits where a player leg's clock sits, at the top right of the row */
    chk(txt(row.querySelector('.legtop .status')) === 'Q3 7:12', 'the clock is not in the status slot: ' + txt(row.querySelector('.legtop .status')));
    chk(!row.querySelector('.rs'), 'the team row still has a column of its own');
    /* and the row is built like a player row: a target, a name line and a bar */
    chk(!!row.querySelector('.legbody .legtop .tgt') && !!row.querySelector('.who') && !!row.querySelector('.pbar .knob'),
      'a team bet is not laid out like a player bet: ' + row.innerHTML.slice(0, 120));
    chk(/To Cover|To Win/.test(txt(row.querySelector('.who'))), 'the name line does not say what the bet is');
    chk(txt(row.querySelector('.lineLbl')) === 'line', 'the bar does not mark the line');
    chk(!/up \d|down \d/.test(txt(row)), 'the margin is still being said as well as shown: ' + txt(row));
    chk((txt(row).match(/Q3 7:12/g) || []).length === 1, 'the clock is in the row twice: ' + txt(row));
    chk(!m.d.querySelector('.games .gm'), 'a game already shown in a row is repeated in the strip above');
    chk(/\bgood\b/.test(gm.className), 'a team bet being won is not green');
    chk(/\bwin\b/.test(row.querySelector('.res').className), 'the marker on a bet being won is not green');
    const second = m.d.querySelectorAll('.sp-leg.team')[1];
    chk(txt(second.querySelector('.legtop .status')) === 'Q3 7:12', 'the second leg lost its clock: ' + txt(second));
    /* one game with a player leg must not drag in the box scores of the moneyline games */
    const mixed = JSON.parse(JSON.stringify(mlOnly));
    mixed.parlays.push({ id: 'pp', week: 2, stake: 1, legs: [
      legF(0, 'Bijan Robinson', 'ATL', 'rushing_yards', 43.5, 'over', true)] });
    const m2 = await run({ file: mixed });
    chk(m2.calls.filter(u => u.includes('/summary?')).length === 1,
      'one player leg fetched more box scores than there are games with player legs');
  }

  // ---- J. every device finishes a parlay: a card to download, saved nowhere ----
  {
    /* two legs on games of one week pinned to the far future, so no kickoff drops them in any
       week of any season: a team's money line and a player's main line, each with a book price */
    const P0 = JSON.parse(PAYLOAD), byWeek = {};
    for (const x of P0.sched) (byWeek[+x.w] = byWeek[+x.w] || []).push(x);
    const wk = Math.max(...Object.keys(byWeek).map(Number).filter(k => byWeek[k].length >= 2)), [g1, g2] = byWeek[wk];
    const other = P0.sched.find(x => +x.w !== wk);
    /* DraftKings' ids for the two legs, made up (the payload's dk, as weekly.py bakes it: week, game,
       then the leg's key without the game, its side and DraftKings' point), each with a '#', and when
       they were read: the player ids (at) two hours ago, the game lines (glat) five, so the card
       dates the link by the older and still says every leg lands (under a day) */
    const DK_ML = 'SMOKE1#ml_' + g1.h, DK_EV = '880001', DK_RBS = { over: 'SMOKE2#rush_645', under: 'SMOKE2#rush_645u' };
    const stamp = ago => new Date(Date.now() - ago).toISOString().slice(0, 16) + 'Z';
    /* a read time as the card dates it, worked out here: weekday, month, day, time, Eastern */
    const readTxt = s => new Date(s).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET';
    const AT_P = stamp(2 * 3600e3), AT_G = stamp(5 * 3600e3);
    const dkMade = (at = AT_P, glat = AT_G) => ({ [String(wk)]: { [g1.id]: { event: DK_EV, [`team:${g1.h}|ml`]: DK_ML, [`team:${g1.a}|ml`]: 'SMOKE1#ml_' + g1.a, glat },
      [g2.id]: { event: '880002', 'card-rb|rushing_yards|over|64.5': DK_RBS.over, 'card-rb|rushing_yards|under|64.5': DK_RBS.under, at, glat } } });
    /* the book's prices on both legs' lines, so the card has a fair chance to lead with: the first game's
       two moneylines, and the runner's main line over and under at 64.5 (at 63.5 in the second browser,
       so his leg is on a line the payload has moved and its fair chance is the one-sided estimate) */
    const RB_LINE = { over: 64.5, under: 63.5 }, ML_G1 = { a: 115, h: -135 }, RB_PX = { over: 105, under: -125 };
    const pin = (P, side = 'over') => { for (const x of P.sched) { if (x.id === g1.id || x.id === g2.id || (other && x.id === other.id)) { x.d = '2099-12-31'; x.t = '13:00'; }
        if (x.id === g1.id) { x.mla = ML_G1.a; x.mlh = ML_G1.h; } }
      P.mkt = P.mkt || {}; P.mkt[String(wk)] = Object.assign({}, P.mkt[String(wk)], { 'card-rb': { rushing_yards: { line: RB_LINE[side], over: RB_PX.over, under: RB_PX.under, n: 'Card Runner', g: g2.id } } });
      P.dk = dkMade(); return P; };
    const mlKey = `${g1.id}|team:${g1.h}|ml`, rbKey = `${g2.id}|card-rb|rushing_yards`;
    /* the runner's main line is an Over in the first browser and an Under in the second, so a card
       that opened DraftKings' Over for an Under (or the other way) fails one of them */
    const Side = side => side === 'under' ? 'Under' : 'Over';
    const builder = (side = 'over') => ({
      [mlKey]: { gid: g1.id, pid: 'team:' + g1.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.58, price: -135, src: 'real', mu: null, name: 'Home Side', pos: 'Game', grp: 'TEAM', team: g1.h, opp: g1.a, week: wk, label: 'To win' },
      [rbKey]: { gid: g2.id, pid: 'card-rb', stat: 'rushing_yards', k: 64.5, side, main: true, p: 0.52, price: 105, src: 'real', mu: 66, name: 'Card Runner', pos: 'RB', grp: 'RB', team: g2.h, opp: g2.a, week: wk, label: Side(side) + ' 64.5 rushing yards' } });
    const oldSaved = [{ id: 'saved-before', saved: '2026-09-01T00:00:00Z', week: 2, stake: 4, price: 300, payout: 16, legs: [
      { gid: '2026_02_CAR_ATL', stat: 'receptions', k: 3, side: 'over', main: false, name: 'Kyle Pitts', team: 'ATL', week: 2 }] }];
    const blob = side => JSON.stringify({ stake: 25, saved: oldSaved, parlay: builder(side) });
    const myOld = JSON.stringify({ lines: { 'prop|saved-before|0': 4 }, removed: {}, kept: {} });
    const all = w => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; };
    /* what finishing must leave as it was: every key but the prop model's own, which the model
       rewrites as it likes, and in that one the saved list and the builder; and but the kept Refresh odds read
       (props_press_v1), which the card's check of DraftKings' lines keeps as a press does (19 October 2026: held
       on its own, pressKept below) */
    const snap = x => { const a = all(x.w), pk = JSON.parse(a[PROP_KEY] || '{}'); delete a[PROP_KEY]; delete a[PRESS_KEY];
      return JSON.stringify({ a, saved: pk.saved, parlay: Object.keys(pk.parlay || {}).sort(), S: x.w.eval('JSON.stringify([S.saved, Object.keys(S.parlay).sort(), S.stake])') }); };
    /* every device finishes a parlay the same way: a plain browser, and one that was the owner's
       (the owner link's secret and a session still in it, which mean nothing now) */
    const wasOwner = w => { w.localStorage.setItem('nflowner_v1', 'the-old-owner-secret'); w.localStorage.setItem('nflsync_owner_v1', JSON.stringify({ uid: 'u', refreshToken: 'rt' })); };
    /* section J's ESPN. Since 19 October 2026 the card checks DraftKings' current lines as it opens, through the page's
       own Refresh odds reader, for the parlay's games alone (J2 below holds it). Here the press's scoreboard
       (scoreboard?dates=) has the pinned games under event ids of its own, dated far off so no clock a check moves
       passes them, with no DraftKings odds, and no player lines posted (a 404): the read changes nothing the checks
       stand on, and each card says when it checked. Every other ESPN request is the run's stub's */
    const EVT = { [g1.id]: '7101', [g2.id]: '7102' }, FAR = '2100-06-01T00:00Z';
    const sbEv = (x, id, odds) => ({ id, date: FAR, competitions: [{ competitors: [{ homeAway: 'home', team: { abbreviation: x.h } }, { homeAway: 'away', team: { abbreviation: x.a } }], ...(odds ? { odds: [odds] } : {}) }] });
    const jsonR = (code, body) => Promise.resolve({ ok: code === 200, status: code, headers: { get: () => null }, json: async () => JSON.parse(JSON.stringify(body)) });
    const NO_PROPS = { error: { message: 'No propBets found', code: 404 } };
    const jEsp = s => /\/scoreboard\?dates=/.test(s) ? jsonR(200, { events: [sbEv(g1, EVT[g1.id]), sbEv(g2, EVT[g2.id])] }) : /\/propBets\?/.test(s) ? jsonR(404, NO_PROPS) : null;
    /* what the card's reads kept in this browser is a press's: the kept read's own shape, of the pinned games alone */
    const pressKept = x => { const r = x.w.localStorage.getItem(PRESS_KEY); if (r == null) return true;
      try { const k = JSON.parse(r); return k.v === 1 && k.season === SEA && Object.keys(k.games || {}).every(id => id === g1.id || id === g2.id); } catch (e) { return false; } };
    /* DraftKings' betslip link for some ids, in that order, each '#' as %23 */
    const DKU = ids => 'https://sportsbook.draftkings.com/?outcomes=' + ids.map(x => x.replace(/#/g, '%23')).join('+');
    /* (19 October 2026: main's #302, the card's check of DraftKings' current lines as it opens, merged into app v121) once
       the card has checked, its note ends on one more paragraph, the check's own line (p[data-pc-dkcheck]): done,
       "Checked against DraftKings’ lines at <time>." (the oldest read of its games), or failed (a read that failed, or the
       cap passed), COULD; none where the card had nothing to read. This section's own copies of the two lines, word for
       word */
    const COULD = 'Could not check DraftKings’ current lines: a leg DraftKings has moved since its prices were read will not be on the slip.';
    const checked = t => `Checked against DraftKings’ lines at ${readTxt(t)}.`;
    /* the card's note as app v121 holds it: partsOf, its blocks in order, each by what it is, the check's line a block of
       its own ("check"); bodyOf, the same less the check's line at the note's end, which every v121 rule of the note's
       blocks is held to; and checkHeld, the check's line held on its own: none where want is null (the card had nothing
       to read), else exactly one, the note's last block, a paragraph of its words alone, done or failed as want says, word
       for word (done: dated by want.t, when its games were read). The problems, or none */
    const partsOf = el => [...el.children].map((e, i) => e.matches('p[data-pc-dkcheck]') ? 'check' : e.matches('p.pc-dkone') ? 'one' : e.matches('ul.pc-dklegs') ? 'legs' : e.matches('p[data-pc-dkclash]') ? 'clash'
      : e.matches('ul') && e.querySelector('[data-pc-dkmiss]') ? 'hand' : e.matches('ul') && e.querySelector('[data-pc-dkswap]') ? 'swap'
      : e.matches('p') && txt(e) === 'On DraftKings’ slip at its own line:' ? 'swaphead' : e.matches('p') && /^DraftKings prices /.test(txt(e)) ? 'swapprice'
      : i === 0 && e.matches('p') ? 'first' : e.tagName.toLowerCase() + '(?)').join(' ');
    const bodyOf = el => partsOf(el).replace(/(?:^| )check$/, '');
    const checkHeld = (el, want) => { const c = [...el.querySelectorAll('[data-pc-dkcheck]')], seen = c.map(x => x.outerHTML).join(' ') || 'none';
      if (!want) return c.length ? `the card had nothing to read, yet its note has a check's line: ${seen}` : null;
      if (want.st === 'done' && !(want.t > 0)) return `the card's games were read as its stand-in answers (the scoreboard, and no player lines posted), yet the page has no such read on record for one of them`;
      const words = want.st === 'done' ? checked(want.t) : COULD;
      if (c.length !== 1 || c[0] !== el.lastElementChild || c[0].tagName !== 'P' || c[0].children.length || c[0].getAttribute('data-pc-dkcheck') !== want.st || txt(c[0]) !== words)
        return `the note does not end on the check's one line, ${want.st}, "${words}": ${seen}${c.length && c[c.length - 1] !== el.lastElementChild ? ' (not the note\'s last block)' : ''}`;
      return null; };
    /* (app v121) where the legs on the slip mix a same-game parlay (two or more legs of one game) with legs of other games,
       DraftKings' betslip link does not open: a button for each game's legs, the games in the order their first legs come,
       each its legs in the card's order. Worked out here on its own: numsOwn, legs by number ("leg 2", "legs 1 and 3",
       "legs 1, 2 and 3"); readOwn, when the made-up ids a leg goes on at were read, by the case's own table as it planted it
       (a team's line and the total with its game's lines, glat; a player's with his game's prices, at; null where the
       table does not say), and oldestOwn, the oldest of some reads, null where one is undated; gamesIn, the games of the
       legs on the slip ({gid, name, ns, ids}; legs and ids in the card's order, an id null for a leg off the slip), each
       dated (at) by its own legs given the table; multiOf, whether they are such a mix */
    const numsOwn = ns => (ns.length === 1 ? 'leg ' : 'legs ') + (ns.length > 1 ? ns.slice(0, -1).join(', ') + ' and ' + ns[ns.length - 1] : ns[0]);
    const readOwn = (l, T) => { const D = ((T || {})[String(l.week || wk)] || {})[l.gid] || {}; return (['ml', 'ats', 'total'].includes(l.stat) ? D.glat : D.at) || null; };
    const oldestOwn = ats => !ats.length || ats.some(a => !a) ? null : ats.slice().sort((a, b) => Date.parse(a) - Date.parse(b))[0];
    const gamesIn = (sched, legs, ids, T) => { const out = [];
      legs.forEach((l, i) => { if (!ids[i]) return; let G = out.find(x => x.gid === l.gid);
        if (!G) { const g = sched.find(x => x.id === l.gid); out.push(G = { gid: l.gid, name: g ? `${g.a} at ${g.h}` : l.gid, ns: [], ids: [], reads: [] }); }
        G.ns.push(i + 1); G.ids.push(ids[i]); G.reads.push(readOwn(l, T)); });
      if (T) out.forEach(G => { G.at = oldestOwn(G.reads); });
      return out; };
    const multiOf = G => G.length > 1 && G.some(x => x.ids.length > 1);
    /* the note's first paragraph on such a mix, dated by the older read as the one link's is, promising nothing */
    const multiNote = (n, at, hand) => `${at ? 'DraftKings’ lines as read ' + readTxt(at) : 'When DraftKings’ lines were read is not recorded'}: these legs mix a same-game parlay with other games, and a DraftKings link with that mix does not open, so each of the ${n} games has a link of its own: open them one after another. Each opens its game’s legs as DraftKings had them ${at ? 'then' : 'when last read'}; a leg whose line DraftKings has moved or pulled since will not be on the slip, so check it before you bet.${hand ? ' Add by hand:' : ''}`;
    const gameTitle = (G, at) => `Opens ${numsOwn(G.ns)} (${G.name}) on DraftKings’ betslip, in a new tab, as DraftKings’ lines were ${at ? 'read ' + readTxt(at) : 'last read'}: a line moved or pulled since will not be on it, so check each leg is there`;
    /* Share link's DraftKings lines on such a mix: the line saying a link a game and why (and any legs to add by hand),
       each game's line, its link alone on the next, then the read */
    const multiLines = (G, at, hand) => `\nDraftKings betslip, a link for each game (a link mixing a same-game parlay with other games does not open)${hand ? `; add ${hand} by hand` : ''}:\n`
      + G.map(x => `${x.name}, ${numsOwn(x.ns)}:\n${DKU(x.ids)}`).join('\n') + `\nDraftKings lines as ${at ? 'read ' + readTxt(at) : 'last read'}: a leg whose line DraftKings has moved or pulled since will not be on the slip, so check it before you bet\n`;
    /* the game buttons as the card in d draws them, against the games worked out above (none: the row hidden and empty,
       Open in DraftKings straight before it and Share link straight after); a game dated by its own legs (gamesIn with the
       case's table) is titled with its own read, else with at. The problems, or none */
    const gameBtnsIn = (d, G, at) => { const gb = d.getElementById('pcDkGames'), dkA = d.getElementById('pcDk'), bad = [];
      if (!gb) return 'there is no place for the game buttons (#pcDkGames)';
      if (dkA.nextElementSibling !== gb || gb.nextElementSibling !== d.getElementById('pcLink') || !gb.closest('.pc-actions')) bad.push('the game buttons are not in the action row, where Open in DraftKings stands, before Share link');
      if (!G) { if (!gb.hidden || gb.children.length || gb.textContent.trim()) bad.push(`a plain parlay has game buttons: ${gb.outerHTML}`); return bad.length ? bad.join('; ') : null; }
      if (gb.hidden || gb.closest('[hidden]')) bad.push('the row of game buttons is hidden');
      if (!dkA.hidden) bad.push('Open in DraftKings, one link for every leg, is still shown');
      const bs = [...gb.children];
      if (bs.length !== G.length || !bs.every(b => b.matches('a.btn.pc-dkbtn[data-pc-dkgame]'))) bad.push(`it holds ${bs.map(b => b.outerHTML).join(' ') || 'nothing'}, not ${G.length} game buttons`);
      G.forEach((x, i) => { const b = bs[i];
        if (!b || b.getAttribute('data-pc-dkgame') !== x.gid || b.getAttribute('href') !== DKU(x.ids) || b.getAttribute('target') !== '_blank' || !/\bnoopener\b/.test(b.getAttribute('rel') || '')
          || txt(b) !== `Open ${x.name} in DraftKings` || b.getAttribute('title') !== gameTitle(x, 'at' in x ? x.at : at))
          bad.push(`button ${i + 1} is ${b ? b.outerHTML : 'missing'}, not ${x.name}'s ${numsOwn(x.ns)}, to ${DKU(x.ids)}, titled "${gameTitle(x, 'at' in x ? x.at : at)}"`); });
      return bad.length ? bad.join('; ') : null; };
    for (const [how, extra, side] of [['a plain browser', () => {}, 'over'], ['a browser that was the owner\'s', wasOwner, 'under']]) {
      const v = await run({ url: URL_PB, pay: P => pin(P, side), file: { updated: null, games: [], parlays: [] }, esp: jEsp, seed: w => { w.localStorage.setItem(PROP_KEY, blob(side)); w.localStorage.setItem('my_parlays_v1', myOld); extra(w); } });
      const DK_RB = DK_RBS[side], rbLabel = Side(side) + ' 64.5 rushing yards';
      const { w, d } = v, tab = d.getElementById('tab-parlay');
      const reads = () => v.methods.every(m => m === 'GET');
      const rec = stubDraw(w);
      /* the tab: the suggested parlays and the builder with its two legs, nothing of the visitor's own */
      chk(!d.getElementById('myCard') && !/Your parlays/i.test(txt(tab)) && !tab.hidden && !!d.getElementById('pbPanel') && !tab.querySelector('#lpCard') && d.querySelectorAll('#parlayBody tr.legrow').length === 2,
        `${how}: the Parlay Builder tab is not the suggested parlays and the builder with its two legs, or a list of the visitor's own is in it`);
      chk(!/saved-before|Kyle Pitts/.test(txt(tab)), `${how}: the visitor's saved parlay from before is drawn`);
      /* the builder says under a leg what DraftKings' slip will do with it only where it will not go on
         as built (app v109): both legs here have DraftKings' id at their own line, so no row says anything.
         slipRows: each builder row's line about the slip, by the leg's own label */
      const slipRows = () => [...d.querySelectorAll('#parlayBody .dkslip')].map(s => [s.closest('tr.legrow') ? txt(s.parentElement.querySelector('b')) : '(outside a leg row)', txt(s)]);
      chk(slipRows().length === 0, `${how}: the builder says a leg DraftKings has at its own line will not go on as built: ` + JSON.stringify(slipRows()));
      const fin = d.getElementById('pFinish');
      chk(!!fin && !d.getElementById('pSave') && /^Finish parlay$/.test(txt(fin)) && !fin.disabled, `${how}: the builder's save is not Finish parlay: ` + txt(d.querySelector('#parlayBody .actions')));
      if (!fin) continue;
      const before = snap(v), bad0 = BAD_CALLS.length;
      fin.click(); await wait(30); await cardSettled(w);
      const md = d.getElementById('pcModal'), view = d.getElementById('pcView'), q = w.PARLAY_CARD.quote();
      const price = w.eval('fmtML(decToML(PARLAY_CARD.quote().useDec))').replace('-', '−');
      chk(!!md && !md.hidden && d.body.classList.contains('modal-open') && md.querySelector('[role="dialog"][aria-modal="true"]'), `${how}: Finish did not open the card's window`);
      chk(['Home Side', 'To win', 'Card Runner', rbLabel, '−135', '+105'].every(t => txt(view).includes(t)), `${how}: the card is missing a leg, its market or its price: ` + txt(view));
      chk(txt(view.querySelector('.pc-price')) === price && new RegExp(`${q.useDec.toFixed(2)} decimal`).test(txt(view)) && txt(view).includes((100 / q.useDec).toFixed(1) + '% implied'),
        `${how}: the card's price is not the builder's: ${txt(view.querySelector('.pc-price'))} for ${price}`);
      { const pays = txt(d.querySelector('#parlayBody .bigp .payout')), m = [...view.querySelectorAll('.pc-money b')].map(txt);
        chk(m.length === 3 && m[0] === '$25.00' && m[1].replace(/,/g, '') === pays,
          `${how}: the card's stake or payout is not the builder's: ${m.join(' / ')} against ${pays}`); }
      /* the chance: the book's fair chance first, worked here from the prices pinned above (the money
         line's two sides with the margin out; the runner's over and under where his line is the
         payload's, else his price over the week's median overround, est.), the legs in different games
         so a plain product; then the model's and the price's. In the window, in the image and in the
         text Share link sends */
      const imp = a => a > 0 ? 100 / (a + 100) : -a / (-a + 100), pc1 = p => (p * 100).toFixed(1) + '%';
      const fML = imp(ML_G1.h) / (imp(ML_G1.h) + imp(ML_G1.a));
      /* the week's median overround on its two-sided player lines: the pinned week's own, the runner's among them */
      const twoSided = Object.values(Object.assign({}, P0.mkt && P0.mkt[String(wk)], { 'card-rb': { rushing_yards: { over: RB_PX.over, under: RB_PX.under } } }))
        .flatMap(o => Object.values(o)).filter(L => L && L.over && L.under).map(L => imp(L.over) + imp(L.under)).sort((a, b) => a - b);
      const vigP = twoSided.length % 2 ? twoSided[twoSided.length >> 1] : (twoSided[twoSided.length / 2 - 1] + twoSided[twoSided.length / 2]) / 2;
      const fRB = side === 'over' ? imp(RB_PX.over) / (imp(RB_PX.over) + imp(RB_PX.under)) : Math.max(0.001, Math.min(0.999, imp(105) / vigP));
      const fair = q.legs.reduce((a, l) => a * (l.stat === 'ml' ? fML : fRB), 1), est = side !== 'over';
      const line1 = `Fair chance all 2 land ${pc1(fair)}${est ? ' (est.)' : ''}`, line2 = `model says ${pc1(q.pr.corr)} · the price says ${(100 / q.useDec).toFixed(1)}%`;
      chk(!!q.fair && Math.abs(q.fair.p - fair) < 1e-12 && q.fair.est === est && txt(view.querySelector('.pc-chance')).startsWith(line1 + ' ' + line2)
        && /Est\.: a leg is priced on one side only/.test(txt(view.querySelector('.pc-chance'))) === est,
        `${how}: the card does not lead with the fair chance (${line1}), then the model's and the price's: ` + txt(view.querySelector('.pc-chance')));
      chk(new RegExp(`^${wk <= 18 ? 'Week ' + wk : '(Wild Card|Divisional|Conference|Super Bowl)'}`).test(txt(view.querySelector('.pc-sub'))) && /Dec 31/.test(txt(view.querySelector('.pc-sub')))
        && /NFL Hub/.test(txt(view)) && txt(view.querySelector('.pc-foot b')) === 'demon-x13.github.io/nfl-hub' && !/nfl-hub\/nflbets/.test(txt(view)), `${how}: the card has no week and date, or no mark and the site's address (its root, demon-x13.github.io/nfl-hub): ` + txt(view.querySelector('.pc-head')) + ' / ' + txt(view.querySelector('.pc-foot')));
      chk(d.activeElement === d.getElementById('pcDownload'), `${how}: the window did not take the focus`);
      /* Open in DraftKings: one link to DraftKings' betslip, the legs' own ids in the card's order
         joined by +, each '#' as %23, in a new tab; under the buttons, what it opens and each leg's
         own link (DraftKings documents no link for several outcomes, so one at a time is offered too): DKU, above */
      const order = q.legs.map(l => l.stat === 'ml' ? DK_ML : DK_RB);
      /* every leg on a line of its own in the shared text: its number, who, the bet and its price */
      const legsIn = t => q.legs.every((l, i) => new RegExp(`(^|\\n)${i + 1}\\. ${l.name}: ${l.label} \\([+-]\\d+\\)(\\n|$)`).test(t));
      const dkA = d.getElementById('pcDk'), note = () => d.getElementById('pcDkNote'), msg = () => txt(d.getElementById('pcMsg'));
      /* nothing promises that every leg will land: an id is DraftKings' outcome at one number, read once
         a game 12 to 35 hours before its kickoff, and DraftKings drops one whose line has moved since */
      const promises = t => /\bputs all\b|\bOpens all\b|\ball \d+ legs on\b|\(all \d+ legs\b|\bevery leg (lands|will)\b|\bat DraftKings’ own prices\b/i.test(t);
      /* what the note and the button say the link opens, dated by the read (or saying it is not recorded) */
      const opensNote = (which, at) => `${at ? 'DraftKings’ lines as read ' + readTxt(at) : 'When DraftKings’ lines were read is not recorded'}: Open in DraftKings opens ${which} as DraftKings had them ${at ? 'then' : 'when last read'}; a leg whose line DraftKings has moved or pulled since will not be on the slip, so check it before you bet.`;
      const opensTitle = (which, at) => `Opens ${which} on DraftKings’ betslip, in a new tab, as DraftKings’ lines were ${at ? 'read ' + readTxt(at) : 'last read'}: a line moved or pulled since will not be on it, so check each leg is there`;
      /* the shared text's DraftKings lines: what the link opens, the link alone on its line, the read */
      const slipLines = (head, url, at) => `\nDraftKings betslip (opens ${head}):\n${url}\nDraftKings lines as ${at ? 'read ' + readTxt(at) : 'last read'}: a leg whose line DraftKings has moved or pulled since will not be on the slip, so check it before you bet\n`;
      /* (app v121, the owner's call of 19 October 2026: "also thinking about maybe adding links for each individual one
         may reduce the issues?") with two or more legs on the slip, every leg's own link is a row of its own: "Each leg on
         its own:", then a list, each row "n. who, what" (a 44px target, by the card's CSS), opening that leg alone on
         DraftKings' betslip; after the note's first paragraph and the legs to add by hand, before the converted legs and
         the pairs DraftKings may refuse. The " One leg at a time: 1 · 2 · 3." the first paragraph ended on until then is
         gone. A leg that goes on at DraftKings' number (app v121's second round) says so in its row and its name, since
         its link opens that number: "n. who, what (on DraftKings as <what goes on>)"; a leg at its own line has no such
         words. noteParts: the note's blocks in order, each by what it is (partsOf, above: the check's line, which #302 ends
         every note on once the card has checked, a block of its own, "check"); noteBody, the same less that line at the
         note's end, which every block rule of app v121 below is held to */
      const noteParts = () => partsOf(note()), noteBody = () => bodyOf(note());
      /* the check's line this section's ESPN stand-in (jEsp) gives the open card, held on its own (checkBad): the stand-in's
         scoreboard lists the two pinned games alone, and no player lines are posted for either (a 404, read as none). So a
         card whose games to come (by the page's clock: kickoff ahead, no score) are all of the two is done, dated by the
         oldest read of them (the page's own record of when each was read, ESPN_OUT, each held to that answer and to the
         page's clock); one with any other game to come (the third game of (b) and (d) below, on no scoreboard of the
         stand-in's) could not check; one with no game to come had nothing to read, and has no line */
      const SB_OWN = [g1.id, g2.id];
      const checkWant = () => { const m = w.PARLAY_CARD.current(), sch = w.eval('S').sched, now = w.eval('Date.now()');
        const gids = [...new Set(((m && m.dkLegs) || []).map(l => l.gid))].filter(id => { const g = sch.find(x => x.id === id); return !!g && !scoredL(g) && now < etKickL(g); });
        if (!gids.length) return null;
        if (!gids.every(id => SB_OWN.includes(id))) return { st: 'failed' };
        const O = w.eval('ESPN_OUT'), o = gids.map(id => O[id]);
        return { st: 'done', t: o.every(x => x && x.st === 'none' && +x.when > 0 && +x.when <= now) ? Math.min(...o.map(x => +x.when)) : NaN }; };
      const checkBad = () => checkHeld(note(), checkWant());
      /* the note held to its blocks and every leg's own link: want, the legs on the slip in the card's order as
         [n, who, what, id, swap] (swap: what goes on at DraftKings' number, worked out by the case, or none), and which
         other blocks it has (the legs to add by hand, the converted legs, the pairs DraftKings may refuse), on the note less
         the check's line at its end (noteBody), which is held on its own (checkBad); the problems, or none */
      const legLinks = (want, { miss = 0, swaps = 0, clash = 0 } = {}) => {
        const bad = [], parts = noteBody(), shape = ['first', miss ? 'hand' : '', want.length > 1 ? 'one legs' : '', swaps ? 'swaphead swap swapprice' : '', clash ? 'clash' : ''].filter(Boolean).join(' ');
        if (parts !== shape) bad.push(`its blocks are "${noteParts()}", not "${shape}" and then the check's line`);
        { const cb = checkBad(); if (cb) bad.push(cb); }
        const first = note().firstElementChild;
        if (/One leg at a time/.test(txt(note())) || (first && first.querySelector('a'))) bad.push('its first paragraph still ends on "One leg at a time", or carries a link');
        const one = note().querySelectorAll('p.pc-dkone'), ul = note().querySelector('ul.pc-dklegs'), lis = ul ? [...ul.children] : [], links = note().querySelectorAll('a[data-pc-dkleg]');
        if (want.length < 2) { if (one.length || ul || links.length) bad.push(`with ${want.length} leg on the slip it lists the legs' own links`); }
        else {
          if (one.length !== 1 || txt(one[0]) !== 'Each leg on its own:' || one[0].nextElementSibling !== ul) bad.push(`the legs' own links are not headed "Each leg on its own:", the list straight after: ${one.length ? txt(one[0]) : 'no heading'}`);
          if (links.length !== want.length || lis.length !== want.length || !lis.every(li => li.tagName === 'LI' && li.children.length === 1 && li.firstElementChild.matches('a[data-pc-dkleg]')))
            bad.push(`the list is not a row a leg on the slip, each its link alone: ${ul ? ul.innerHTML.slice(0, 300) : 'no list'}`);
          want.forEach(([n, who, what, id, swap], i) => { const a = lis[i] && lis[i].firstElementChild, as = swap ? ` (on DraftKings as ${swap})` : '';
            if (!a || txt(a) !== `${n}. ${who}, ${what}${as}` || a.getAttribute('href') !== DKU([id]) || a.getAttribute('data-pc-dkleg') !== String(n) || a.getAttribute('target') !== '_blank'
              || !/\bnoopener\b/.test(a.getAttribute('rel') || '') || a.getAttribute('aria-label') !== `Open leg ${n}, ${who} ${what}${as}, in DraftKings`)
              bad.push(`row ${i + 1} is ${a ? a.outerHTML : 'missing'}, not leg ${n}, ${who}, ${what}${as}, to ${DKU([id])}`); });
          /* only a converted leg's row says what goes on at DraftKings' number */
          const said = lis.filter(li => / \(on DraftKings as /.test(txt(li)) || / \(on DraftKings as /.test((li.firstElementChild && li.firstElementChild.getAttribute('aria-label')) || '')).length;
          if (said !== want.filter(x => x[4]).length) bad.push(`${said} of its rows say what goes on at DraftKings' number, not the ${want.filter(x => x[4]).length} converted`); }
        return bad.length ? bad.join('; ') : null; };
      /* the legs on the slip as legLinks takes them: a quote's legs and the id each goes on at, in the card's order, and
         what each converted leg goes on as, by its number (swaps) */
      const slipOf = (legs, ids, swaps = {}) => legs.map((l, i) => [i + 1, l.name, l.label, ids[i], swaps[i + 1] || null]).filter(x => x[3]);
      { const css = [...d.querySelectorAll('style')].map(e => e.textContent).join('\n'), r = (css.match(/\.pc-dk ul\.pc-dklegs a\{([^}]*)\}/) || [])[1] || '';
        chk(/display:inline-flex/.test(r) && /min-height:44px/.test(r), `${how}: a leg's own link under the card's buttons is not a row with a 44px target: ` + (r || 'no rule')); }
      /* (app v121's second round) every button under the card a 44px target, its words centred in it, by one rule that
         leaves a hidden button alone (a display set on a hidden one would show it: Open in DraftKings is hidden where
         each game has its own button): .pc-actions .btn:not([hidden]). jsdom lays nothing out, so the rule's text is held,
         its selector and every declaration, as the legs' own links' rule is above; and that its selector reaches every
         button shown under the card and none hidden (actRule: here, where Share or save is hidden, and in (a), where Open
         in DraftKings is and each game has its own) */
      const ACT_SEL = '.pc-actions .btn:not([hidden])';
      { const css = [...d.querySelectorAll('style')].map(e => e.textContent).join('\n').replace(/\/\*[\s\S]*?\*\//g, ''), rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => [m[1].trim(), m[2]]);
        const r = (rules.find(([sel]) => sel.split(',').map(x => x.trim()).includes(ACT_SEL)) || [])[1] || '';
        const decl = Object.fromEntries(r.split(';').map(x => x.split(':').map(y => y.trim())).filter(x => x[0]));
        chk(decl['min-height'] === '44px' && decl.display === 'inline-flex' && decl['align-items'] === 'center' && decl['justify-content'] === 'center' && decl['box-sizing'] === 'border-box',
          `${how}: the card's buttons are not each a 44px target, their words centred, by the rule ${ACT_SEL}: ` + (r || 'no rule')); }
      /* the buttons under the card the rule's selector reaches wrongly (a shown one it misses, a hidden one it reaches), or none */
      const actRule = () => { const row = d.querySelector('#pcModal .pc-actions'), bs = row ? [...row.querySelectorAll('.btn')] : [];
        if (!bs.length) return 'no buttons under the card';
        const wrong = bs.filter(b => (b.hidden || !!b.closest('[hidden]')) === b.matches(ACT_SEL));
        return wrong.length ? wrong.map(b => (b.id || 'game ' + b.getAttribute('data-pc-dkgame')) + (b.hidden ? ' (hidden)' : ' (shown)')).join(', ') : null; };
      { const bad = actRule(), hid = [...d.querySelectorAll('#pcModal .pc-actions .btn')].filter(b => b.hidden).map(b => b.id).join();
        chk(!bad && hid === 'pcShare', `${how}: the 44px rule does not reach every button shown under the card, or reaches a hidden one (hidden here: ${hid || 'none'}): ` + bad); }
      /* (app v121, the owner's call of 19 October 2026: "the legs need to be part of the same game parlay only, and anytime
         there's a mix it bombs the hyperlink") where the legs on the slip mix a same-game parlay (two or more legs of one
         game) with legs of other games, DraftKings' betslip link does not open: there is no link for them all (Open in
         DraftKings is hidden) but, in its place before Share link, a button for each game's legs (#pcDkGames), the games
         in the order their first legs come, each its legs in the card's order. One leg a game is a plain parlay and keeps
         its one link. Worked out here on its own, by the section's helpers above (numsOwn, readOwn, oldestOwn, gamesIn,
         multiOf, multiNote, gameTitle, multiLines, gameBtnsIn): gamesOf, the games of the legs on the slip ({gid, name, ns,
         ids}), each game's button dated by its own legs (app v121's second round), the note and Share link by them all;
         given the case's table, gamesOf dates each game (at) by its own legs; gameBtns, the game buttons as drawn, against
         them (none: the row hidden and empty) */
      const gamesOf = (legs, ids, T) => gamesIn(w.eval('S').sched, legs, ids, T);
      const gameBtns = (G, at) => gameBtnsIn(d, G, at);
      /* the builder says so too (app v121): where its legs mix a same-game parlay with other games, and the parlay card is
         on the page (the hub; the prop model's own page has none), one line, word for word, naming how many games */
      const multiB = n => `These legs mix a same-game parlay with other games. DraftKings’ betslip link does not open that mix, so the parlay card gives each of the ${n} games a link of its own.`;
      /* (app v121's second round) the builder's line follows the card's plan: it counts only the legs that go on the slip,
         so it is there exactly where the card gives each game its own link, and names that many games. builderWant: the
         line builderNote should read, from the games of the legs on the slip as the case worked them out (gamesOf), or
         none */
      const builderWant = G => multiOf(G) ? `${G.length}:` + multiB(G.length) : null;
      const builderNote = k => { const e = [...d.querySelectorAll(`#parlayBody [data-pb-${k}]`)]; return e.length ? e.map(x => x.getAttribute(`data-pb-${k}`) + ':' + txt(x)).join(' | ') : null; };
      /* (b) one leg a game across two games, the money line and the runner's line here, is a plain parlay: one link for
         both, exactly as before app v121, no game buttons, and nothing in the builder about a mix */
      chk(!!dkA && !dkA.hidden && dkA.tagName === 'A' && dkA.getAttribute('href') === DKU(order) && dkA.getAttribute('target') === '_blank' && /\bnoopener\b/.test(dkA.getAttribute('rel') || '') && txt(dkA) === 'Open in DraftKings',
        `${how}: a parlay DraftKings has every leg of has no Open in DraftKings link to its betslip, in the card's order, in a new tab: ` + (dkA ? dkA.outerHTML : 'none'));
      /* Open in DraftKings, then the game buttons' place (hidden, empty), then Share link, in the action row */
      { const bad = gameBtns(null);
        chk(!!dkA && !!dkA.closest('.pc-actions') && !bad, `${how}: Open in DraftKings and Share link are not side by side in the action row, or a parlay of one leg a game has game buttons: ` + bad); }
      chk(builderNote('multigame') === null && builderNote('clash') === null, `${how}: the builder says a parlay of one leg a game mixes a same-game parlay with other games, or names a pair DraftKings refuses: ` + builderNote('multigame') + ' / ' + builderNote('clash'));
      chk(/opens the 2 legs as DraftKings had them then/.test(txt(note())) && [...note().querySelectorAll('a[data-pc-dkleg]')].map(a => a.getAttribute('href')).join(' ') === order.map(x => DKU([x])).join(' ')
        && [...note().querySelectorAll('a')].every(a => a.getAttribute('target') === '_blank' && /noopener/.test(a.getAttribute('rel') || '')) && !note().querySelector('[data-pc-dkmiss]'),
        `${how}: the note under the buttons does not say what the link opens, or does not give each leg's own link: ` + txt(note()));
      { const bad = legLinks(slipOf(q.legs, order));
        chk(!bad, `${how}: the note under the buttons does not list each leg's own link, a row each, after what the link opens: ` + bad); }
      /* the note is dated by the older read of the legs it opens (the game lines', five hours ago), and
         even so recent a read promises nothing: the legs as DraftKings had them then, and a line moved or
         pulled since is not on the slip. The button says the same */
      chk(txt(note()).startsWith(opensNote('the 2 legs', AT_G)) && dkA.getAttribute('title') === opensTitle('the 2 legs', AT_G) && !promises(txt(note()) + ' ' + dkA.getAttribute('title')),
        `${how}: a read five hours old is not dated by the older read, or the note or the button promises every leg will land: ` + txt(note()) + ' / ' + dkA.getAttribute('title'));
      /* Share link: one text, the DraftKings link inside it, and no url of its own (the owner, October
         2026: on an iPhone the share sheet hands the text and a url as two items, Messages draws the url
         as a card showing only the domain and the sheet's Copy drops it, so the link "compressed" or went
         missing). The text: a line for every leg, the stake and what it pays, the chances, what the link
         opens, the betslip link itself alone on its line (every id, in the card's order), when DraftKings'
         lines were read and that a line moved since will not be on the slip, and the site's address last.
         canShare is asked about the same title and text; a cancel does nothing; with no share sheet, one
         that fails or one that cannot share it, the same text is copied, by the clipboard or a hidden box;
         never the image */
      { const nav = w.navigator, def = (k, v) => Object.defineProperty(nav, k, { value: v, configurable: true });
        const shared = [], copied = [], asked = [], clicks0 = rec.clicks.length, blobs0 = rec.blobs.length, canv0 = rec.canvases.length;
        const cash = [...view.querySelectorAll('.pc-money b')].map(txt), link = d.getElementById('pcLink');
        def('share', async x => { shared.push(x); }); def('clipboard', { writeText: async t => { copied.push(t); } }); def('canShare', x => { asked.push(x); return true; });
        chk(!!link && !link.hidden && txt(link) === 'Share link', `${how}: the card has no Share link`);
        link.click(); await wait(30);
        const s0 = shared[0] || {}, t0 = s0.text || '';
        chk(t0.includes(`\n${line1} · ${line2}\nDraftKings betslip (`), `${how}: Share link does not send the fair chance first, then the model's and the price's, then the DraftKings link: ` + JSON.stringify(t0));
        chk(shared.length === 1 && !('url' in s0) && !s0.files && JSON.stringify(Object.keys(s0).sort()) === '["text","title"]',
          `${how}: Share link handed the share sheet a url (or anything) beside its title and text, which an iPhone shows as a bare domain or drops: ` + JSON.stringify(s0));
        chk(asked.length === 1 && JSON.stringify(asked[0]) === JSON.stringify({ title: s0.title, text: t0 }), `${how}: canShare was not asked about the title and the text alone: ` + JSON.stringify(asked));
        chk(t0.split('\n').includes(DKU(order)) && dkA.getAttribute('href') === DKU(order) && t0.includes(slipLines('the 2 legs as DraftKings had them', DKU(order), AT_G)),
          `${how}: Share link's text does not carry the whole betslip link (every id, in the card's order) alone on its line, under what it opens and over the read: ` + JSON.stringify(t0));
        chk(s0.title === '2-leg parlay ' + price.replace('−', '-') && legsIn(t0) && t0.includes(`Stake ${cash[0]} · Pays ${cash[1]}`) && /\nDraftKings lines as read [^\n]*\ndemon-x13\.github\.io\/nfl-hub$/.test(t0)
          && !/Add by hand/.test(t0) && !promises(t0 + '\n' + s0.title) && !/ est\.\)| fair\)|\(.*price\)$/.test(t0 + '\n' + s0.title),
          `${how}: Share link did not send the title, every leg (book prices, unlabelled), the stake and payout, the read and the site last, or it promises every leg: ` + JSON.stringify(s0));
        chk(copied.length === 0 && rec.clicks.length === clicks0 && rec.blobs.length === blobs0 && rec.canvases.length === canv0, `${how}: Share link copied as well, or drew or downloaded the image`);
        /* a share sheet that cannot share it: the same text, copied */
        def('canShare', x => { asked.push(x); return false; }); link.click(); await wait(30);
        chk(shared.length === 1 && copied.length === 1 && copied[0] === t0 && msg() === 'Link copied', `${how}: a share sheet that cannot share the text did not copy the same text instead: ` + JSON.stringify(copied));
        delete nav.canShare; copied.length = 0;
        def('share', async x => { shared.push(x); throw new w.DOMException('The user cancelled', 'AbortError'); });
        const at = d.activeElement; link.click(); await wait(30);
        chk(shared.length === 2 && copied.length === 0 && msg() === '' && !md.hidden && rec.clicks.length === clicks0 && rec.blobs.length === blobs0 && d.activeElement === at,
          `${how}: cancelling the share sheet did something: ` + JSON.stringify({ copied, msg: msg() }));
        def('share', async () => { throw new w.DOMException('Not allowed', 'NotAllowedError'); });
        link.click(); await wait(30);
        chk(copied.length === 1 && copied[0] === t0 && msg() === 'Link copied', `${how}: a share sheet that failed did not copy the same text, the link in it and once, instead: ` + JSON.stringify(copied));
        delete nav.share;
        link.click(); await wait(30);
        chk(copied.length === 2 && copied[1] === t0 && copied[1].split(DKU(order)).length === 2 && msg() === 'Link copied',
          `${how}: with no share sheet the clipboard did not get the same text, the DraftKings link in it once: ` + JSON.stringify(copied.slice(1)));
        delete nav.clipboard; const cmds = [], boxed = []; d.execCommand = c => { cmds.push(c); const ta = md.querySelector('textarea'); boxed.push(ta ? ta.value : null); return true; };
        const at2 = d.activeElement; link.click(); await wait(30);
        chk(cmds.join() === 'copy' && boxed[0] === t0 && msg() === 'Link copied' && !md.querySelector('textarea') && d.activeElement === at2, `${how}: without the clipboard call the same text was not copied by a hidden box, or the box or the focus was left behind: ` + cmds.join() + ' ' + JSON.stringify(boxed));
        delete d.execCommand;
        chk(rec.clicks.length === clicks0 && rec.blobs.length === blobs0 && rec.canvases.length === canv0 && reads(), `${how}: Share link drew or downloaded the image, or sent a request`); }
      /* a leg DraftKings has only at another number goes on the slip at DraftKings' number (app v109, the
         owner's call of 16 October 2026: every leg on the slip, never "add by hand" where it can be helped):
         the button opens every leg, and the note, the shared text and the builder's row say which leg goes
         on as what, and that DraftKings prices it at its own line. A leg with nothing to convert to is named
         with why, and the button says how many of the legs it opens; none at all: the button and Share link
         still open DraftKings, the game's page where every leg is in one game, else its NFL page, every leg
         named with why (the owner's Monday night, 12 October 2026: Share link sent only the site's address) */
      { const reopen = async () => { d.getElementById('pcClose').click(); await wait(10); d.getElementById('pFinish').click(); await wait(20); await cardSettled(w); };
        const nRb = q.legs.findIndex(l => l.pid === 'card-rb') + 1, shared = [];
        Object.defineProperty(w.navigator, 'share', { value: async x => { shared.push(x); }, configurable: true });
        /* the runner's own line gone from DraftKings' ids, two others in its place, 63.5 and 65. In the
           first browser his main line in PAY.mkt is 64.5, which DraftKings no longer has, so the closest
           number takes it (65, a point off where 63.5 is a point and a half); in the second it is 63.5, the
           page's main line, which DraftKings has, so that one does, though 65 is nearer his leg's 64.5 */
        const wantP = side === 'over' ? 65 : 63.5, wantId = side === 'over' ? 'SMOKE2#rush_65' : 'SMOKE2#rush_635', asRb = `${Side(side)} ${wantP} rushing yards`;
        const moved = q.legs.map(l => l.stat === 'ml' ? DK_ML : wantId);
        w.eval(`{ const E=PAY.dk['${wk}']['${g2.id}']; delete E['card-rb|rushing_yards|${side}|64.5']; E['card-rb|rushing_yards|${side}|63.5']='SMOKE2#rush_635'; E['card-rb|rushing_yards|${side}|65']='SMOKE2#rush_65'; } renderParlay()`);
        await wait(20);
        /* the builder says it first, on the runner's row alone */
        chk(JSON.stringify(slipRows()) === JSON.stringify([[rbLabel, 'On DraftKings as ' + asRb]]),
          `${how}: the builder does not say under the runner's leg that DraftKings' slip takes it as ${asRb}, or says it of another: ` + JSON.stringify(slipRows()));
        /* the prop model's own page has no parlay card, and its builder says nothing of DraftKings' slip */
        { const C = w.PARLAY_CARD; w.PARLAY_CARD = undefined; w.eval('renderParlay()'); await wait(20);
          const none = slipRows().length === 0; w.PARLAY_CARD = C; w.eval('renderParlay()'); await wait(20);
          chk(none, `${how}: with no parlay card (the prop model's own page) the builder still speaks of DraftKings' slip`); }
        await reopen();
        const swapOf = n => txt(note().querySelector(`[data-pc-dkswap="${n}"]`));
        chk(!dkA.hidden && dkA.getAttribute('href') === DKU(moved) && txt(dkA) === 'Open in DraftKings' && dkA.getAttribute('title') === opensTitle('the 2 legs', AT_G)
          && txt(note()).startsWith(opensNote('the 2 legs', AT_G)) && !note().querySelector('[data-pc-dkmiss]')
          && [...note().querySelectorAll('a[data-pc-dkleg]')].map(a => a.getAttribute('href')).join(' ') === moved.map(x => DKU([x])).join(' ')
          && note().querySelectorAll('[data-pc-dkswap]').length === 1 && swapOf(nRb) === `${nRb}. Card Runner, ${rbLabel}: goes on as ${asRb}`
          && txt(note()).includes('DraftKings prices a changed leg at its own line, so its slip’s payout can differ from this card’s.'),
          `${how}: with the runner's line at another number at DraftKings, the link does not put both legs on the slip (the runner at DraftKings' ${wantP}), or the note does not say he goes on as ${asRb} and that DraftKings prices him there: ` + txt(note()) + ' / ' + dkA.getAttribute('href') + ' / ' + txt(dkA));
        /* each leg's own link at the id it goes on at, the converted legs after the list */
        { const bad = legLinks(slipOf(q.legs, moved, { [nRb]: asRb }), { swaps: 1 }) || gameBtns(null);
          chk(!bad, `${how}: with the runner's line at another number at DraftKings, the legs' own links are not each at the id it goes on at (the runner's row saying he goes on as ${asRb}, the money line's nothing of the kind), before the converted legs: ` + bad); }
        chk(!/ now\b/.test(txt(note())) && !promises(txt(note()) + ' ' + dkA.getAttribute('title')), `${how}: the note says what DraftKings has "now", from a read that can be a day old, or promises every leg: ` + txt(note()));
        d.getElementById('pcLink').click(); await wait(30);
        chk(shared.length === 1 && !('url' in shared[0]) && shared[0].text.includes(slipLines('the 2 legs as DraftKings had them', DKU(moved), AT_G).slice(0, -1)
          + `\nOn DraftKings’ slip at its own line: leg ${nRb} as ${asRb} (DraftKings prices it at its own line, so its payout can differ)\n`)
          && !/Add by hand/.test(shared[0].text) && legsIn(shared[0].text) && !promises(shared[0].text),
          `${how}: Share link on a parlay with a leg at another number at DraftKings does not send the link to both and say the leg goes on as ${asRb}: ` + JSON.stringify(shared[0]));
        /* a read more than a day old (the Saturday pull, on Sunday afternoon): said as the five-hour read
           was, dated by it, and the shared text dates it; undated (a payload that does not say), the
           same, said so */
        const AT31 = stamp(31 * 3600e3);
        w.eval(`PAY.dk=${JSON.stringify(dkMade(AT31, stamp(30 * 3600e3)))}`); await reopen();
        chk(dkA.getAttribute('href') === DKU(order) && txt(note()).startsWith(opensNote('the 2 legs', AT31)) && dkA.getAttribute('title') === opensTitle('the 2 legs', AT31) && !promises(txt(note()) + ' ' + dkA.getAttribute('title')),
          `${how}: ids read 31 hours ago are promised as every leg landing, or the note or the button does not date the older read: ` + txt(note()) + ' / ' + dkA.getAttribute('title'));
        d.getElementById('pcLink').click(); await wait(30);
        chk(shared.length === 2 && !('url' in shared[1]) && shared[1].text.includes(slipLines('the 2 legs as DraftKings had them', DKU(order), AT31)) && !promises(shared[1].text),
          `${how}: Share link on ids a day and more old does not carry the link and say when DraftKings' lines were read: ` + JSON.stringify(shared[1]));
        w.eval(`PAY.dk=${JSON.stringify(dkMade(undefined, undefined))}; delete PAY.dk['${wk}']['${g2.id}'].at`); await reopen();
        chk(dkA.getAttribute('href') === DKU(order) && txt(note()).startsWith(opensNote('the 2 legs', null)) && dkA.getAttribute('title') === opensTitle('the 2 legs', null) && !promises(txt(note()) + ' ' + dkA.getAttribute('title')),
          `${how}: ids with no read time are promised as every leg landing, or the note does not say the time is not recorded: ` + txt(note()) + ' / ' + dkA.getAttribute('title'));
        d.getElementById('pcLink').click(); await wait(30);
        chk(shared.length === 3 && shared[2].text.includes(slipLines('the 2 legs as DraftKings had them', DKU(order), null)),
          `${how}: Share link on ids with no read time does not say they were the lines as last read: ` + JSON.stringify(shared[2]));
        shared.length = 0;
        /* a price that is not the book's (a rung at the model's estimate, which DraftKings has no id
           for) is labelled in the shared text as on the card, and so is the parlay's price; with a 2+
           touchdown rung beside it, four legs of which the link opens two: the text says which two it
           opens and which to add by hand, by number (the ids still undated: "as last read") */
        w.eval(`S.parlay['${g2.id}|card-rb|receiving_yards']=${JSON.stringify({ gid: g2.id, pid: 'card-rb', stat: 'receiving_yards', k: 100, side: 'over', main: false, p: 0.2, price: 210, src: 'est', mu: 40, name: 'Card Runner', pos: 'RB', grp: 'RB', team: g2.h, opp: g2.a, week: wk, label: '100+ receiving yards' })};`
          + ` S.parlay['${g2.id}|card-rb|any_td']=${JSON.stringify({ gid: g2.id, pid: 'card-rb', stat: 'any_td', k: 2, side: 'over', main: false, p: 0.08, price: 900, src: 'est', mu: null, name: 'Card Runner', pos: 'RB', grp: 'RB', team: g2.h, opp: g2.a, week: wk, label: '2+ touchdowns' })}; renderParlay()`);
        await wait(20); await reopen();
        { const qe = w.PARLAY_CARD.quote(), ne = qe.legs.findIndex(l => l.stat === 'receiving_yards') + 1, nt = qe.legs.findIndex(l => l.stat === 'any_td') + 1, pe = w.eval('fmtML(decToML(PARLAY_CARD.quote().useDec))');
          const onSlip = qe.legs.filter(l => l.stat === 'ml' || l.stat === 'rushing_yards').map(l => l.stat === 'ml' ? DK_ML : DK_RB), hand = [ne, nt].sort((a, b) => a - b);
          /* (app v121's second round) three of the four legs are the second game's, but the rung and the 2+ touchdowns have
             no id, so the legs on the slip are one a game (the money line, the runner's line), a plain parlay with one link:
             the builder draws no line about a mix (the rule before counted every leg, and drew one naming 2 games) */
          { const G2 = gamesOf(qe.legs, qe.legs.map(l => l.stat === 'ml' ? DK_ML : l.stat === 'rushing_yards' ? DK_RB : null));
            chk(G2.length === 2 && !multiOf(G2) && builderNote('multigame') === builderWant(G2),
              `${how}: the money line and the runner's line on the slip, his rung and 2+ touchdowns with no id beside them: the builder says the legs mix a same-game parlay with other games, though the card gives them one link: ` + builderNote('multigame')); }
          chk(qe.legs.length === 4 && /\+210\s*est\./.test(txt(d.getElementById('pcView'))) && /estimated price/.test(txt(d.querySelector('#pcView .pc-sub'))), `${how}: the card does not mark the rung's estimated price: ` + txt(d.getElementById('pcView')));
          /* a leg on no book price: no fair chance, the model's alone, and the card says why */
          chk(!!qe.fair && qe.fair.p === null && txt(d.querySelector('#pcView .pc-chance')) === `Model’s chance all 4 land ${(qe.pr.corr * 100).toFixed(1)}% · the price says ${(100 / qe.useDec).toFixed(1)}% No fair chance: it needs every leg’s book price`,
            `${how}: a parlay with a leg on no book price does not give the model's chance alone and say why: ` + txt(d.querySelector('#pcView .pc-chance')));
          /* the rung and the 2+ touchdowns have nothing to convert to here (no receiving line and no
             touchdown of his among DraftKings' ids), so they stay off the slip: the button says how many it
             opens, and the builder's rows say why, in the card's few words */
          chk(dkA.getAttribute('href') === DKU(onSlip) && txt(dkA) === 'Open 2 of 4 legs in DraftKings' && dkA.getAttribute('title') === opensTitle('2 of the 4 legs', null)
            && txt(note()).startsWith(opensNote('2 of the 4 legs', null)) && !note().querySelector('[data-pc-dkswap]'),
            `${how}: four legs with two on the slip: the button or the note is wrong: ` + txt(note()) + ' / ' + dkA.getAttribute('href') + ' / ' + txt(dkA));
          /* the two on the slip are one leg a game (the money line, the runner's line), a plain parlay: one link, the legs
             to add by hand, then each leg on the slip on its own */
          { const bad = legLinks(slipOf(qe.legs, qe.legs.map(l => l.stat === 'ml' ? DK_ML : l.stat === 'rushing_yards' ? DK_RB : null)), { miss: 1 }) || gameBtns(null);
            chk(!bad, `${how}: four legs with two on the slip, one a game: the note is not the link, the legs to add by hand and then each leg on the slip on its own, or there are game buttons: ` + bad); }
          { const want = [['100+ receiving yards', 'Not on DraftKings’ slip yet: no receiving yards line of his read'], ['2+ touchdowns', 'Not on DraftKings’ slip yet: no anytime TD of his read']];
            const got = slipRows().sort((x, y) => x[0] < y[0] ? -1 : 1);
            chk(JSON.stringify(got) === JSON.stringify(want), `${how}: the builder does not say under the rung and the 2+ touchdowns that they are not on DraftKings' slip yet, and why, or says it of another leg: ` + JSON.stringify(got)); }
          d.getElementById('pcLink').click(); await wait(30);
          const se = shared[0] || {};
          chk(new RegExp(`(^|\\n)${ne}\\. Card Runner: 100\\+ receiving yards \\(\\+210 est\\.\\)(\\n|$)`).test(se.text || '') && se.title === `4-leg parlay ${pe} (estimated price)`
            && (se.text || '').includes(`\nAdd by hand at DraftKings:\n${hand.map(n => n === ne ? `${ne}. Card Runner 100+ receiving yards (no receiving yards line of his read)` : `${nt}. Card Runner 2+ touchdowns (no anytime TD of his read)`).join('\n')}\n`) && /\(-135\)/.test(se.text || '') && /\nModel’s chance all 4 land [\d.]+% · the price says [\d.]+% · No fair chance: it needs every leg’s book price\n/.test(se.text || ''),
            `${how}: Share link sends an estimated price as if it were the book's, or does not name the legs to add by hand: ` + JSON.stringify(se));
          chk(!('url' in se) && (se.text || '').includes(slipLines(`2 of the 4 legs as DraftKings had them; add legs ${hand[0]} and ${hand[1]} by hand`, DKU(onSlip), null)) && !promises(se.text || ''),
            `${how}: Share link on four legs with two on the slip does not say it opens 2 of the 4 and which to add by hand, over the link: ` + JSON.stringify(se));
          /* DraftKings has him at other numbers: Over 24.5 and Over 39.5 receiving yards, and his anytime
             touchdown. The 100+ rung goes on as his Over at DraftKings' number nearest the rung's own
             (Over 99.5): 39.5; the 2+ touchdowns as the anytime touchdown. Every leg on the slip, each
             change named in the note, the shared text and the builder's rows, the button whole */
          w.eval(`{ const E=PAY.dk['${wk}']['${g2.id}']; E['card-rb|receiving_yards|over|24.5']='SMOKE2#rec_245'; E['card-rb|receiving_yards|over|39.5']='SMOKE2#rec_395'; E['card-rb|any_td']='SMOKE2#td'; } renderParlay()`);
          await wait(20);
          { const want = [['100+ receiving yards', 'On DraftKings as Over 39.5 receiving yards'], ['2+ touchdowns', 'On DraftKings as anytime touchdown']];
            const got = slipRows().sort((x, y) => x[0] < y[0] ? -1 : 1);
            chk(JSON.stringify(got) === JSON.stringify(want), `${how}: the builder does not say the rung goes on as Over 39.5 receiving yards and the 2+ touchdowns as the anytime touchdown, or says it of another leg: ` + JSON.stringify(got)); }
          const all4 = qe.legs.map(l => l.stat === 'ml' ? DK_ML : l.stat === 'rushing_yards' ? DK_RB : l.stat === 'receiving_yards' ? 'SMOKE2#rec_395' : 'SMOKE2#td');
          /* now every leg goes on, three of them the second game's: the builder says so, naming the 2 games */
          { const G2 = gamesOf(qe.legs, all4);
            chk(multiOf(G2) && builderNote('multigame') === builderWant(G2), `${how}: every leg on the slip, three of them the second game's and the money line the first's: the builder does not say, word for word, that the card gives each of the 2 games a link of its own: ` + builderNote('multigame')); }
          await reopen();
          /* the ids as planted for this case, the runner's game's player read time taken out above: the table each game's
             button is dated by (the first game's dated by its game lines, the second's undated) */
          const T4 = dkMade(); delete T4[String(wk)][g2.id].at;
          const asOf = { [ne]: 'Over 39.5 receiving yards', [nt]: 'anytime touchdown' }, sw = [ne, nt].sort((a, b) => a - b);
          /* (app v121) with every leg on the slip, three of the four are the runner's on the second game and the money line
             is on the first: a same-game parlay mixed with another game, which one DraftKings link does not open. So no link
             for all four: a button for each game's legs (the games as their first legs come), the note saying why, then
             every leg's own link and the converted legs. Undated here (the runner's read time taken out above) */
          const G4 = gamesOf(qe.legs, all4, T4), at4 = gid => (G4.find(x => x.gid === gid) || {}).at;
          /* an undated leg in one game gives that game's button "last read" while the other's stays dated (app v121's
             second round: each game's button by its own legs), and the note, by them all, is undated */
          chk(at4(g1.id) === AT_G && at4(g2.id) === null, `${how}: the case is not one game dated and the other undated: ` + JSON.stringify(G4));
          chk(multiOf(G4) && G4.length === 2 && !gameBtns(G4, null) && txt(note().firstElementChild) === multiNote(2, null) && !note().querySelector('[data-pc-dkmiss]')
            && [...note().querySelectorAll('[data-pc-dkswap]')].map(e => e.getAttribute('data-pc-dkswap') + ' ' + txt(e)).join(' | ')
              === sw.map(n => `${n} ${n}. Card Runner, ${n === ne ? '100+ receiving yards' : '2+ touchdowns'}: goes on as ${asOf[n]}`).join(' | ')
            && txt(note()).includes('DraftKings prices changed legs at its own lines, so its slip’s payout can differ from this card’s.')
            && ![...md.querySelectorAll('a[href]')].some(a => a.getAttribute('href') === DKU(all4)) && !promises(txt(note()) + ' ' + [...d.querySelectorAll('#pcDkGames a')].map(a => a.getAttribute('title')).join(' ')),
            `${how}: a rung and 2+ touchdowns DraftKings has at another number, beside the runner's line and the other game's money line, do not go on the slip as its Over 39.5 and its anytime touchdown by a button for each game, or the note does not say so: `
              + [gameBtns(G4, null), txt(note())].filter(Boolean).join(' / '));
          { const bad = legLinks(slipOf(qe.legs, all4, asOf), { swaps: 1 });
            chk(!bad, `${how}: four legs on the slip in two games: the note does not list every leg's own link (the rung's and the 2+ touchdowns' rows saying what each goes on as, the others nothing of the kind), before the converted legs: ` + bad); }
          shared.length = 0; d.getElementById('pcLink').click(); await wait(30);
          { const s4 = shared[0] || {}, t4 = s4.text || '';
            chk(shared.length === 1 && !('url' in s4) && t4.includes(multiLines(G4, null, null).slice(0, -1)
              + `\nOn DraftKings’ slip at its own line: ${sw.map(n => `leg ${n} as ${asOf[n]}`).join('; ')} (DraftKings prices them at its own line, so its payout can differ)\n`)
              && G4.every(x => t4.split('\n').includes(DKU(x.ids))) && !t4.includes(DKU(all4)) && !/DraftKings betslip \(opens/.test(t4)
              && !/Add by hand/.test(t4) && !promises(t4) && s4.title === `4-leg parlay ${pe} (estimated price)`,
              `${how}: Share link on four legs in two games, two at DraftKings' numbers, does not send a link for each game's legs and say which go on as what: ` + JSON.stringify(s4)); }
          w.eval(`{ const E=PAY.dk['${wk}']['${g2.id}']; delete E['card-rb|receiving_yards|over|24.5']; delete E['card-rb|receiving_yards|over|39.5']; delete E['card-rb|any_td']; }`); }
        w.eval(`S.parlay=${JSON.stringify(builder(side))}; renderParlay()`); await wait(20); shared.length = 0;
        /* the cases where a leg has no id: what the payload holds says why. The runner's main line is in
           PAY.mkt on the second game, a DraftKings player price on it, so for the cases of a game whose
           player prices have not been pulled it is taken out (and put back after), and the player legs
           are what the builder offers on such a game: est. rungs and an est. touchdown */
        const NFL = 'https://sportsbook.draftkings.com/leagues/football/nfl', PULLED = 'they are pulled on game day or the day before, Sunday’s afternoon and night games on Saturday morning, and never for Sunday’s early games (before 4pm ET)';
        const GAME_NP = 'its game’s DraftKings prices have not been pulled yet: ' + PULLED, PL_NP = 'DraftKings’ player prices for its game have not been pulled yet: ' + PULLED;
        /* a rung on a game not pulled yet: once it is, the rung goes on as his Over at DraftKings' line (app v109) */
        const RUNG = s => `; once they are, it goes on as his Over at DraftKings’ ${s} line, priced by DraftKings there`;
        const missOf = n => txt(note().querySelector(`[data-pc-dkmiss="${n}"]`));
        const unprice = () => w.eval(`window.__rbMkt=PAY.mkt['${wk}']['card-rb']; delete PAY.mkt['${wk}']['card-rb']`), reprice = () => w.eval(`PAY.mkt['${wk}']['card-rb']=window.__rbMkt`);
        const rung = { gid: g2.id, pid: 'card-rb', stat: 'receiving_yards', k: 25, side: 'over', main: false, p: 0.45, price: 150, src: 'est', mu: 22, name: 'Card Runner', pos: 'RB', grp: 'RB', team: g2.h, opp: g2.a, week: wk, label: '25+ receiving yards' };
        const td = Object.assign({}, rung, { stat: 'any_td', k: 1, p: 0.35, price: 185, mu: null, label: 'Scores a touchdown' });
        const rungKey = `${g2.id}|card-rb|receiving_yards`, tdKey = `${g2.id}|card-rb|any_td`;
        /* every leg on a line of its own in the shared text, and each to add by hand with its brief */
        const reEsc = x => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const legsOf = (qx, t) => qx.legs.every((l, i) => new RegExp(`(^|\\n)${i + 1}\\. ${reEsc(l.name)}: ${reEsc(l.label)} \\([+-]\\d+( est\\.)?\\)(\\n|$)`).test(t));
        const handOf = (qx, t, brief) => qx.legs.every((l, i) => t.includes(`\n${i + 1}. ${l.name} ${l.label} (${brief(l)})\n`));
        unprice();
        /* (b) legs in two games, neither with an id (dk baked, neither game's prices pulled yet): the
           button opens DraftKings' NFL page, every leg is named with why (a rung: and that once they are, it
           goes on as his Over at DraftKings' line), and Share link sends that page */
        w.eval(`S.parlay=${JSON.stringify({ [mlKey]: builder(side)[mlKey], [rungKey]: rung })}; renderParlay(); PAY.dk={}`); await wait(20); await reopen();
        { const qb = w.PARLAY_CARD.quote(), nR = qb.legs.findIndex(l => l.pid === 'card-rb') + 1, nM = qb.legs.findIndex(l => l.stat === 'ml') + 1;
          chk(qb.legs.length === 2 && !dkA.hidden && txt(dkA) === 'Open DraftKings' && dkA.getAttribute('href') === NFL && dkA.getAttribute('target') === '_blank' && /\bnoopener\b/.test(dkA.getAttribute('rel') || '')
            && dkA.getAttribute('title') === 'Opens DraftKings’ NFL page, in a new tab, to add the legs by hand' && !gameBtns(null)
            && txt(note()).startsWith('None of these legs can go on DraftKings’ betslip from here, so Open DraftKings opens its NFL page: add them there by hand.')
            && note().querySelectorAll('[data-pc-dkmiss]').length === 2 && missOf(nM).endsWith(': ' + GAME_NP) && missOf(nR).endsWith(': ' + GAME_NP + RUNG('receiving yards'))
            && !note().querySelector('a') && !d.getElementById('pcLink').hidden && noteBody() === 'first hand' && !checkBad(), `${how}: a parlay DraftKings has none of, over two games, does not offer DraftKings' NFL page, or does not name every leg and why (then the check's line): ` + txt(note()) + ' / ' + dkA.outerHTML + ' / ' + gameBtns(null) + ' / ' + noteParts() + ' / ' + checkBad());
          d.getElementById('pcLink').click(); await wait(30);
          const s2 = shared[0] || {};
          chk(shared.length === 1 && !('url' in s2) && (s2.text || '').includes(`\nDraftKings’ NFL page (add the legs by hand):\n${NFL}\nAdd by hand at DraftKings:\n`) && legsOf(qb, s2.text || '') && !/DraftKings lines/.test(s2.text || '') && /\ndemon-x13\.github\.io\/nfl-hub$/.test(s2.text || '')
            && handOf(qb, s2.text || '', () => 'its game’s prices are not pulled yet') && (s2.text || '').includes('\nAdd by hand at DraftKings:\n'),
            `${how}: Share link on a parlay DraftKings has none of, over two games, does not send DraftKings' NFL page and every leg to add by hand, with why: ` + JSON.stringify(s2));
          /* with no share sheet the same text is copied, and the card says "Link copied": its one link is DraftKings' NFL
             page (app v121's second round: "Links copied" only for a link a game, "Parlay copied" only for none) */
          { const nav = w.navigator, sh = nav.share, cp = []; delete nav.share; Object.defineProperty(nav, 'clipboard', { value: { writeText: async x => { cp.push(x); } }, configurable: true });
            d.getElementById('pcLink').click(); await wait(30); const said = msg();
            delete nav.clipboard; Object.defineProperty(nav, 'share', { value: sh, configurable: true });
            chk(cp.length === 1 && cp[0] === s2.text && said === 'Link copied', `${how}: with no share sheet, a parlay DraftKings has none of is not copied as the same text, its one link DraftKings' NFL page, with "Link copied": ` + JSON.stringify({ said, cp })); }
          shared.length = 0; }
        /* the Tab order is the same with the button standing for the NFL page */
        { const f = [...md.querySelectorAll('button,a[href],input,select,[tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && !el.hidden && !el.closest('[hidden]')).map(el => el.id).join(' ');
          chk(f === 'pcClose pcDk pcLink pcDownload pcAgain', `${how}: with no leg on the slip the card's controls are not Close, Open DraftKings, Share link, Download, Start over: ` + f); }
        /* a payload baked before ids (no dk at all): the old reason, and still DraftKings' NFL page */
        w.eval('delete PAY.dk'); await reopen();
        chk(!dkA.hidden && dkA.getAttribute('href') === NFL && [1, 2].every(n => missOf(n).endsWith(': no DraftKings ids were read for its game')),
          `${how}: a payload baked before DraftKings' ids does not keep its reason, or offers no DraftKings page: ` + txt(note()));
        /* (a) the owner's case: Monday night, the game's lines and page read (event, its money lines,
           spreads and total, glat) and none of its player prices yet (no at, nothing in PAY.mkt); a
           parlay of two player legs in it, an est. rung and an est. touchdown. Each says DraftKings'
           player prices for its game have not been pulled yet (the rung: and that once they are, it goes on
           as his Over at DraftKings' line), the button opens the game's page, and Share link sends that page
           with both legs to add */
        const gameOnly = { [String(wk)]: { [g2.id]: { event: '880002', [`team:${g2.h}|ml`]: 'G2#ml_h', [`team:${g2.a}|ml`]: 'G2#ml_a', [`team:${g2.h}|ats|-3`]: 'G2#ats_h', [`team:${g2.a}|ats|3`]: 'G2#ats_a',
          'game|total|over|54.5': 'G2#o', 'game|total|under|54.5': 'G2#u', glat: AT_G } } };
        w.eval(`PAY.dk=${JSON.stringify(gameOnly)}; S.parlay=${JSON.stringify({ [rungKey]: rung, [tdKey]: td })}; renderParlay()`); await wait(20); await reopen();
        { const qa = w.PARLAY_CARD.quote(), EV = 'https://sportsbook.draftkings.com/event/880002', nR = qa.legs.findIndex(l => l.stat === 'receiving_yards') + 1, nT = qa.legs.findIndex(l => l.stat === 'any_td') + 1;
          chk(qa.legs.length === 2 && !dkA.hidden && txt(dkA) === 'Open game in DraftKings' && dkA.getAttribute('href') === EV && dkA.getAttribute('title') === 'Opens the game’s page in DraftKings, in a new tab, to add the legs by hand'
            && txt(note()).startsWith('None of these legs can go on DraftKings’ betslip from here, so Open game in DraftKings opens the game’s page: add them there by hand.')
            && missOf(nT).endsWith(': ' + PL_NP) && missOf(nR).endsWith(': ' + PL_NP + RUNG('receiving yards')) && !note().querySelector('a') && noteBody() === 'first hand' && !checkBad() && !gameBtns(null),
            `${how}: the owner's case (game lines read, no player prices yet) does not say the player prices are not pulled yet, or does not open the game's DraftKings page (then the check's line): ` + txt(note()) + ' / ' + dkA.outerHTML + ' / ' + noteParts() + ' / ' + checkBad());
          d.getElementById('pcLink').click(); await wait(30);
          const sa = shared[0] || {};
          chk(shared.length === 1 && !('url' in sa) && (sa.text || '').includes(`\nDraftKings, the game’s page (add the legs by hand):\n${EV}\nAdd by hand on the game’s DraftKings page:\n`) && sa.title.startsWith('2-leg parlay ' + w.eval('fmtML(decToML(PARLAY_CARD.quote().useDec))')) && !/DraftKings lines/.test(sa.text || '') && legsOf(qa, sa.text || '')
            && (sa.text || '').includes('\nAdd by hand on the game’s DraftKings page:\n')
            && handOf(qa, sa.text || '', () => 'player prices for its game are not pulled yet'),
            `${how}: Share link in the owner's case does not send the game's DraftKings page with both legs to add by hand, and why: ` + JSON.stringify(sa));
          shared.length = 0;
          /* in the same game, a market the pull never reads says so, never that a pull will bring it */
          const mk = w.PARLAY_CARD.dkPlan([Object.assign({}, rung, { stat: 'carries', k: 15, label: '15+ carries' }), Object.assign({}, rung, { stat: 'kick_pts', k: 8, label: '8+ kicking points' }), Object.assign({}, rung, { stat: 'passing_interceptions', k: 1, label: '1+ interceptions' })]);
          chk(mk.miss.length === 3 && ['carries', 'kicking points', 'interceptions'].every((s, i) => (mk.miss[i].why || '').startsWith(`DraftKings’ ${s} lines are not read here (`) && mk.miss[i].brief === 'its market is not read here')
            && !mk.miss.some(x => /pulled/.test(x.why.split('(')[0])),
            `${how}: a market the pull never reads (carries, kicking points, interceptions) is said to come with the pull, or is not said to be unread: ` + JSON.stringify(mk.miss)); }
        /* (d) the same game with a player leg and its home money line: the slip opens the money line, the
           player leg is to add by hand, with why, and Share link sends the slip */
        w.eval(`S.parlay=${JSON.stringify({ [tdKey]: td, [`${g2.id}|team:${g2.h}|ml`]: Object.assign({}, builder(side)[mlKey], { gid: g2.id, pid: 'team:' + g2.h, team: g2.h, opp: g2.a }) })}; renderParlay()`); await wait(20); await reopen();
        { const qd = w.PARLAY_CARD.quote(), nP = qd.legs.findIndex(l => l.pid === 'card-rb') + 1;
          chk(qd.legs.length === 2 && !dkA.hidden && txt(dkA) === 'Open 1 of 2 legs in DraftKings' && dkA.getAttribute('href') === DKU(['G2#ml_h']) && /1 of the 2 legs/.test(txt(note()))
            && missOf(nP).endsWith(': ' + PL_NP) && note().querySelectorAll('[data-pc-dkmiss]').length === 1 && !note().querySelector('[data-pc-dkswap]') && !legLinks(slipOf(qd.legs, qd.legs.map(l => l.stat === 'ml' ? 'G2#ml_h' : null)), { miss: 1 }) && !gameBtns(null),
            `${how}: a money line beside a player leg whose prices are not pulled does not open the money line alone (Open 1 of 2 legs in DraftKings), or does not say why the other is left: ` + txt(note()) + ' / ' + dkA.getAttribute('href') + ' / ' + txt(dkA));
          chk(JSON.stringify(slipRows()) === JSON.stringify([['Scores a touchdown', 'Not on DraftKings’ slip yet: player prices for its game are not pulled yet']]),
            `${how}: the builder does not say under the unpulled touchdown that it is not on DraftKings' slip yet, and why, or says it of the money line: ` + JSON.stringify(slipRows()));
          d.getElementById('pcLink').click(); await wait(30);
          const sd = shared[0] || {};
          chk(shared.length === 1 && !('url' in sd) && (sd.text || '').includes(slipLines(`1 of the 2 legs as DraftKings had it; add leg ${nP} by hand`, DKU(['G2#ml_h']), AT_G)) && (sd.text || '').includes(`\nAdd by hand at DraftKings:\n${nP}. Card Runner Scores a touchdown (player prices for its game are not pulled yet)\n`),
            `${how}: Share link on a money line beside an unpulled player leg does not send the slip and the player leg to add by hand: ` + JSON.stringify(sd));
          shared.length = 0; }
        /* a leg the card prices from the book is never said to be unpulled or not offered: its price is
           DraftKings', so a missing id is said neutrally (a links file that would not read, a name two
           book rows gave two ids). The runner's main line on a book price in the owner's game (no at),
           with and without his line in PAY.mkt; and a money line under an empty dk on a game whose lines
           are DraftKings' (g.ls 'dk') */
        { const book = Object.assign({}, builder(side)[rbKey]);
          const nb = w.PARLAY_CARD.dkPlan([book]);
          chk(!nb.url && (nb.miss[0] || {}).why === 'not among the DraftKings lines read for its game', `${how}: a book-priced player leg with no id in a game with no player ids is said to be unpulled: ` + JSON.stringify(nb.miss));
          reprice(); const nb2 = w.PARLAY_CARD.dkPlan([Object.assign({}, book, { src: 'est' })]); unprice();
          chk(!nb2.url && (nb2.miss[0] || {}).why === 'not among the DraftKings lines read for its game', `${how}: a player leg in a game whose DraftKings player prices are in the payload is said to be unpulled: ` + JSON.stringify(nb2.miss));
          const g1At = `S.sched.find(x=>x.id===${JSON.stringify(g1.id)})`, lsWas = w.eval(`JSON.stringify(${g1At}.ls)`);
          w.eval(`PAY.dk={}; ${g1At}.ls='dk'`);
          const nl = w.PARLAY_CARD.dkPlan([Object.assign({}, builder(side)[mlKey])]);
          w.eval(`${g1At}.ls=${lsWas === undefined ? 'undefined' : lsWas}`);
          chk(!nl.url && (nl.miss[0] || {}).why === 'no DraftKings ids were read for its game', `${how}: a money line whose game lines are DraftKings' but with no ids is said to be unpulled: ` + JSON.stringify(nl.miss)); }
        /* (c) a player leg in a game whose player prices were read (at) with no id for him and no book
           price (an est. touchdown): DraftKings did not offer it then, dated; a rung with no line of his on
           its stat: DraftKings had none then, dated; the runner's book-priced main line with no id: neutral; and a game still to come
           with no ids under a payload that has dk */
        { const dkC = { [String(wk)]: { [g2.id]: Object.assign({}, gameOnly[String(wk)][g2.id], { 'card-xx|receptions|over|4.5': 'X#1', 'card-rb|carries|over|14.5': 'C#1', at: AT_P }) } };
          w.eval(`PAY.dk=${JSON.stringify(dkC)}`);
          const c = w.PARLAY_CARD.dkPlan([Object.assign({}, rung), Object.assign({}, td), Object.assign({}, builder(side)[rbKey])]), whyC = n => (c.miss.find(x => x.n === n) || {}).why || '';
          chk(!c.url && c.event === 'https://sportsbook.draftkings.com/event/880002' && c.home === c.event && whyC(1) === `DraftKings had no receiving yards line of his when its prices were read (${readTxt(AT_P)})` && (c.miss.find(x => x.n === 1) || {}).brief === 'no receiving yards line of his read'
            && whyC(2) === `DraftKings did not offer this line when its prices were read (${readTxt(AT_P)})` && (c.miss.find(x => x.n === 2) || {}).brief === 'DraftKings did not offer it when read'
            && whyC(3) === 'not among the DraftKings lines read for its game',
            `${how}: a player leg on a game whose player prices were read, with no id for him, does not say DraftKings did not offer it then, dated (or a book-priced one says so): ` + JSON.stringify(c.miss));
          /* a market the pull does not read is still opened where the payload has its id */
          const cc = w.PARLAY_CARD.dkPlan([Object.assign({}, rung, { stat: 'carries', k: 15, label: '15+ carries' })]);
          chk(cc.url === DKU(['C#1']) && !cc.miss.length, `${how}: a carries rung whose id the payload has does not open: ` + JSON.stringify(cc));
          const e = w.PARLAY_CARD.dkPlan([Object.assign({}, builder(side)[mlKey])]);
          chk(!e.url && !e.event && e.home === NFL && (e.miss[0] || {}).why === GAME_NP,
            `${how}: a game to come with no ids does not say its prices have not been pulled yet, or offers a page other than DraftKings' NFL page: ` + JSON.stringify(e)); }
        reprice();
        w.eval(`S.parlay=${JSON.stringify(builder(side))}; renderParlay()`); await wait(20); shared.length = 0;
        delete w.navigator.share;
        /* every kind of leg against made-up ids on the first pinned game: a team's line, the total, a
           touchdown, a main line, a rung (Over k-0.5, or Over k-1 where the book's line is whole); the legs
           DraftKings has only at another number, which go on at DraftKings' (app v109: a spread the same
           team's, a total the same side, a rung the player's Over at the number nearest Over k-0.5, 2+
           touchdowns the anytime touchdown); and the legs with nothing to convert to, with why (a money
           line and an anytime touchdown have no number: the other team's money line or another player's
           touchdown is never taken for them; a rung on a stat DraftKings has no Over of his on; a main
           line's other side). Then the newest read: a Refresh odds press dates each id it gave (ESPN_IDAT),
           and an id at another number read since the leg's own one takes the leg there. A game whose lines
           are nflverse's converts alike; a game that has kicked off opens nothing; the game's page when
           every leg is in one game */
        const G = w.eval('S.sched').find(x => x.id === g1.id), ls0 = G.ls, past = P0.sched.find(x => ![g1.id, g2.id, other && other.id].includes(x.id) && Date.parse(x.d + 'T23:59:00Z') < Date.now() - 864e5);
        const made = { [String(wk)]: { [g1.id]: { event: '990', [`team:${g1.h}|ats|-3`]: 'A#h', [`team:${g1.a}|ats|3.5`]: 'A#a', [`team:${g1.a}|ml`]: 'M#a', 'game|total|over|43.5': 'T#o', 'game|total|under|44.5': 'T#u',
          'p1|any_td': 'D#1', 'p3|any_td': 'D#3', 'p1|receptions|over|4.5': 'R#1', 'p1|receptions|under|4.5': 'R#u', 'p1|receiving_yards|over|59': 'Y#59', 'p2|rushing_yards|over|79.5': 'Z#79', 'p2|rushing_yards|over|80': 'Z#80',
          'p2|receptions|over|3.5': 'Q#o', at: AT_P, glat: AT_G } } };
        if (past) (made[String(past.w)] = made[String(past.w)] || {})[past.id] = { [`team:${past.h}|ml`]: 'P#1' };
        w.eval(`PAY.dk=${JSON.stringify(made)}`);
        const L = o => Object.assign({ gid: g1.id, week: wk, name: 'N', label: 'L', side: 'over', main: false }, o);
        const legs = [L({ pid: 'team:' + g1.h, stat: 'ats', k: -3, grp: 'TEAM' }), L({ pid: 'team:' + g1.a, stat: 'ats', k: 3, grp: 'TEAM' }),
          L({ pid: 'game', stat: 'total', k: 43.5, main: true, grp: 'TEAM' }), L({ pid: 'game', stat: 'total', side: 'under', k: 43.5, main: true, grp: 'TEAM' }),
          L({ pid: 'p1', stat: 'any_td', k: 1, grp: 'WR' }), L({ pid: 'p3', stat: 'any_td', k: 2, grp: 'WR' }), L({ pid: 'p1', stat: 'receptions', k: 4.5, main: true, grp: 'WR' }),
          L({ pid: 'p1', stat: 'receiving_yards', k: 60, grp: 'WR' }), L({ pid: 'p2', stat: 'rushing_yards', k: 80, grp: 'RB' }), L({ pid: 'p2', stat: 'rushing_yards', k: 100, grp: 'RB' }),
          L({ pid: 'team:' + g1.h, stat: 'ml', k: 0, grp: 'TEAM' }), L({ pid: 'p1', stat: 'receptions', side: 'under', k: 4.5, main: true, grp: 'WR' }),
          L({ pid: 'p2', stat: 'any_td', k: 1, grp: 'RB' }), L({ pid: 'p2', stat: 'any_td', k: 2, grp: 'RB' }), L({ pid: 'p1', stat: 'rushing_yards', k: 50, grp: 'WR' }),
          L({ pid: 'p2', stat: 'receptions', side: 'under', k: 3.5, main: true, grp: 'RB' })];
        const plan = ls => { w.eval(`S.sched.find(x=>x.id===${JSON.stringify(g1.id)}).ls=${JSON.stringify(ls)}`); return w.PARLAY_CARD.dkPlan(legs.map(l => Object.assign({}, l))); };
        /* what each plan holds, worked out above leg by leg: the ids in the card's order, the legs on the
           slip, each change as "n swap", each leg left off as "n why", and when each leg on it was read */
        const shape = p => ({ url: p.url, ok: p.ok.map(x => x.n).join(), swaps: (p.swaps || []).map(x => x.n + ' ' + x.swap).join(' | '), miss: p.miss.map(x => x.n + ' ' + x.why).join(' | '),
          at: p.ok.map(x => x.n + ' ' + (x.at ? new Date(x.at).toISOString().slice(0, 16) + 'Z' : '-')).join(' | '), event: p.event });
        const offered = `DraftKings did not offer this line when its prices were read (${readTxt(AT_P)})`;
        const want = (ids, swaps, at) => ({ url: DKU(ids), ok: '1,2,3,4,5,6,7,8,9,10,12', swaps: swaps.join(' | '),
          miss: ['11 not among the DraftKings lines read for its game', '13 ' + offered, `14 DraftKings did not offer his anytime touchdown when its prices were read (${readTxt(AT_P)}), and 2+ touchdowns goes on the slip only as that`, `15 DraftKings had no rushing yards line of his when its prices were read (${readTxt(AT_P)})`, '16 ' + offered].join(' | '),
          at: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map(n => n + ' ' + (at[n] || ([1, 2, 3, 4].includes(n) ? AT_G : AT_P))).join(' | '), event: 'https://sportsbook.draftkings.com/event/990' });
        const SW = ['2 +3.5', '4 Under 44.5', '6 anytime touchdown', '10 Over 80 rushing yards'];
        const IDS = ['A#h', 'A#a', 'T#o', 'T#u', 'D#1', 'D#3', 'R#1', 'Y#59', 'Z#79', 'Z#80', 'R#u'];
        const a = plan('dk');
        chk(JSON.stringify(shape(a)) === JSON.stringify(want(IDS, SW, {})),
          `${how}: a leg of some kind does not find its DraftKings id, does not go on at DraftKings' number where DraftKings has only another, or one with nothing to convert to does not say why: ` + JSON.stringify({ got: shape(a), want: want(IDS, SW, {}) }));
        /* the read the link stands on is the older of the two (the game lines'); no read, however recent,
           makes a promise of it (no fresh flag) */
        chk(!!a.read && a.read.toISOString().slice(0, 16) + 'Z' === AT_G && !('fresh' in a), `${how}: the plan is not dated by its older read, or still marks a recent read as one every leg lands on: ` + JSON.stringify({ read: a.read, fresh: a.fresh }));
        const b = plan('nflverse');
        chk(JSON.stringify(shape(b)) === JSON.stringify(shape(a)), `${how}: a team line on a game whose lines are nflverse's does not go on the slip at DraftKings' number as on one whose lines are DraftKings': ` + JSON.stringify(shape(b)));
        /* a leg priced from DraftKings' line read on ESPN (src dkline) is looked up like any other: its own
           line's id, else DraftKings' number for the same bet, else the reason that it was priced from that
           read and its id is not read */
        { const K = o => L(Object.assign({ pid: 'p1', stat: 'receptions', main: true, grp: 'WR', src: 'dkline' }, o));
          const one = (l, url, swaps, miss) => { const k = shape(w.PARLAY_CARD.dkPlan([l])), x = { url, ok: url ? '1' : '', swaps, miss, at: url ? '1 ' + AT_P : '', event: 'https://sportsbook.draftkings.com/event/990' };
            chk(JSON.stringify(k) === JSON.stringify(x), `${how}: a leg priced from DraftKings' line read on ESPN is not looked up like any other before it says its id is not read: ` + JSON.stringify({ got: k, want: x })); };
          one(K({ k: 4.5 }), DKU(['R#1']), '', '');
          one(K({ k: 5.5 }), DKU(['R#1']), '1 Over 4.5 receptions', '');
          one(K({ pid: 'p2', stat: 'passing_yards', k: 220.5, grp: 'QB' }), null, '', '1 price estimated from DraftKings’ line read on ESPN; its DraftKings id is not read'); }
        /* the newest read: a press read DraftKings' home spread at -3.5 an hour ago, after the pull's -3
           (five hours ago), so the -3 leg goes on at -3.5, dated by the press; the away spread at +7 an hour
           ago, so the +3 leg, with no id at its own number, takes the press's +7 over the pull's nearer
           +3.5; the under at 45.5, likewise over the pull's 44.5. The over keeps its own 43.5, which no
           read has moved */
        { const T1 = Date.now() - 3600e3, E = `PAY.dk['${wk}']['${g1.id}']`, H = `team:${g1.h}|ats|-3.5`, A7 = `team:${g1.a}|ats|7`;
          w.eval(`${E}[${JSON.stringify(H)}]='A#h35'; ${E}[${JSON.stringify(A7)}]='A#a7'; ${E}['game|total|under|45.5']='T#u455';`
            + ` ESPN_IDAT[${JSON.stringify(g1.id)}]={[${JSON.stringify(H)}]:${T1},[${JSON.stringify(A7)}]:${T1},'game|total|under|45.5':${T1}}`);
          const iso = new Date(T1).toISOString().slice(0, 16) + 'Z';
          const n1 = plan('dk'), w1 = want(['A#h35', 'A#a7', 'T#o', 'T#u455', ...IDS.slice(4)], ['1 -3.5', '2 +7', '4 Under 45.5', ...SW.slice(2)], { 1: iso, 2: iso, 4: iso });
          chk(JSON.stringify(shape(n1)) === JSON.stringify(w1),
            `${how}: a spread or total a press read at another number since the pull does not take the leg to the press's number, dated by the press: ` + JSON.stringify({ got: shape(n1), want: w1 }));
          /* the same press ten hours ago, before the pull's read of -3: the leg keeps its own line */
          w.eval(`ESPN_IDAT[${JSON.stringify(g1.id)}][${JSON.stringify(H)}]=${Date.now() - 10 * 3600e3}`);
          const n2 = plan('dk'), w2 = want(['A#h', 'A#a7', 'T#o', 'T#u455', ...IDS.slice(4)], ['2 +7', '4 Under 45.5', ...SW.slice(2)], { 2: iso, 4: iso });
          chk(JSON.stringify(shape(n2)) === JSON.stringify(w2),
            `${how}: a press read older than the pull's read of the leg's own line moved the leg off it: ` + JSON.stringify({ got: shape(n2), want: w2 }));
          w.eval(`delete ESPN_IDAT[${JSON.stringify(g1.id)}]; PAY.dk=${JSON.stringify(made)}`); }
        /* the same ids read 25 hours ago: dated by that read */
        made[String(wk)][g1.id].glat = stamp(25 * 3600e3); w.eval(`PAY.dk=${JSON.stringify(made)}`);
        { const c = plan('nflverse');
          chk(c.url === a.url && !('fresh' in c) && c.read.toISOString().slice(0, 16) + 'Z' === made[String(wk)][g1.id].glat, `${how}: ids read 25 hours ago are not dated by that read: ` + JSON.stringify({ read: c.read, fresh: c.fresh })); }
        w.eval(`S.sched.find(x=>x.id===${JSON.stringify(g1.id)}).ls=${JSON.stringify(ls0)}`);
        if (past) { const c = w.PARLAY_CARD.dkPlan([L({ gid: past.id, week: +past.w, pid: 'team:' + past.h, stat: 'ml', k: 0, grp: 'TEAM' })]);
          chk(!c.url && c.miss.length === 1 && /kicked off/.test(c.miss[0].why) && !c.event, `${how}: a leg whose game has kicked off is opened in DraftKings: ` + JSON.stringify(c)); }
        /* (app v121, the owner's calls of 19 October 2026: "the legs need to be part of the same game parlay only, and
           anytime there's a mix it bombs the hyperlink. also thinking about maybe adding links for each individual one may
           reduce the issues?", and "The book won't let you combine legs that depend on each other. If your parlay already
           has a receiver anytime TD, a team total, or the game total, adding the QB's passing TD over often gets blocked")
           on the builder's own made-up legs, each with a made-up id unless said:
           (a) two legs of the second game (the runner's line and its home money line) and the first game's money line: a
               same-game parlay mixed with another game. No link for all three: a button for each game's legs, the games in
               the order their first legs come, each its legs' ids in the card's order, titled with them and its own legs'
               oldest read (the two games read at different times; then the second game's player read undated, its button
               "last read" and the first's still dated); the note's mix paragraph word for word, dated by the oldest read of
               all; every leg's own link; Share link's text a link a game, each under its game's line and alone on its own,
               then the read, the same text by the clipboard and the hidden box with "Links copied", promising nothing (and
               a text with no link "Parlay copied"); the 44px rule reaching the game buttons and not the hidden Open in
               DraftKings; the Tab order through the game buttons; and the builder's line saying the card gives each game a
               link of its own, which the prop model's own page (no card) does not draw.
           (b) one leg a game across three games, the third game's money line beside the first two's legs: a plain parlay,
               one link for all three as before, no game buttons, nothing in the builder.
           (d) (a)'s three legs and the third game's money line with no id (its game's prices not pulled): a button only
               for each game with legs on the slip, the third leg to add by hand, named in the share's header, and the
               builder's line naming those 2 games (it follows the card's plan, which counts only the legs on the slip).
           (c) a quarterback's passing TDs with his teammate's anytime touchdown, his passing TDs over with the game's
               total, both, neither (his passing TDs under with the total, an opponent's touchdown and his own), and his
               under with the teammate's touchdown, off the slip: the pairs DraftKings may refuse on one slip, said word for
               word last in the card's note (but for the check's line after it, #302's, held on its own) by the legs'
               numbers and under the builder's legs by name, worked out here on
               the check's own copy of the rule (clashOwn); nothing said where there is no pair.
           The third game is week wk's third, else a game of another week whose clubs are not the first two's, moved into
           week wk for the cases; it is put back, and so are the builder, the ids and the share sheet, on every path */
        { const gameLegOwn = l => ['ml', 'ats', 'total'].includes(l.stat);
          const clashOwn = (a, b) => { if (!a || !b || a.gid !== b.gid) return null;
            const one = (qq, o) => gameLegOwn(qq) || qq.stat !== 'passing_tds' ? null : !gameLegOwn(o) && o.stat === 'any_td' && o.team === qq.team && o.pid !== qq.pid ? 'td' : qq.side !== 'under' && o.stat === 'total' ? 'total' : null;
            return one(a, b) || one(b, a); };
          const clashPairsOwn = legs => legs.flatMap((a, i) => legs.slice(i + 1).map((b, k) => [i, i + 1 + k, clashOwn(a, b)])).filter(x => x[2]);
          const CLASH_SAY = { td: 'a quarterback’s passing TDs with a teammate’s touchdown', total: 'a quarterback’s passing TDs over with the game total' };
          const ML2_ID = 'SMOKE5#ml_' + g2.h, ML3_ID = 'SMOKE7#ml_3', near = [g1.a, g1.h, g2.a, g2.h];
          const pick3 = byWeek[wk].find(x => x.id !== g1.id && x.id !== g2.id) || P0.sched.find(x => +x.w !== wk && !(other && x.id === other.id) && !near.includes(x.a) && !near.includes(x.h));
          const G3 = pick3 ? w.eval('S').sched.find(x => x.id === pick3.id) : null, was3 = G3 ? { w: G3.w, d: G3.d, t: G3.t } : null;
          const nav = w.navigator, def = (k, val) => Object.defineProperty(nav, k, { value: val, configurable: true });
          const keyOf = l => `${l.gid}|${l.pid}|${l.stat}`, B = (...legs) => Object.fromEntries(legs.map(l => [keyOf(l), l]));
          const mlOf = (g, name, price) => Object.assign({}, builder(side)[mlKey], { gid: g.id, pid: 'team:' + g.h, team: g.h, opp: g.a, name, price, week: wk });
          const RBL = builder(side)[rbKey], ML1 = builder(side)[mlKey], ML2 = mlOf(g2, 'Second Home', -120);
          const idOf = { [keyOf(ML1)]: DK_ML, [keyOf(RBL)]: DK_RB, [keyOf(ML2)]: ML2_ID };
          /* Share link pressed on a share sheet that takes it: what it was handed */
          const sheet = async () => { const got = []; def('share', async x => { got.push(x); }); def('canShare', () => true);
            d.getElementById('pcLink').click(); await wait(30); delete nav.share; delete nav.canShare; return got; };
          try {
            chk(!!G3, `${how}: no third game to make a parlay over three games from`);
            if (G3) {
              G3.w = wk; G3.d = '2099-12-31'; G3.t = '13:00';
              const ML3 = mlOf(G3, 'Third Side', -110);
              /* the two games read at different times: the first game's lines five hours ago (AT_G), the second game's
                 player prices two hours ago (AT_P) and its game lines an hour ago, so each game's button is dated by its
                 own legs (the first by its money line's game-line read, the second by the runner's player read) and the
                 note and Share link by the oldest of them all, the first game's */
              const AT_G2 = stamp(3600e3);
              const dkABC = dkMade(); dkABC[String(wk)][g2.id][`team:${g2.h}|ml`] = ML2_ID; dkABC[String(wk)][g2.id].glat = AT_G2;
              /* (a) */
              w.eval(`PAY.dk=${JSON.stringify(dkABC)}; S.parlay=${JSON.stringify(B(ML1, RBL, ML2))}; renderParlay()`); await wait(20);
              { const q0 = w.PARLAY_CARD.quote(), G0 = gamesOf(q0.legs, q0.legs.map(l => idOf[keyOf(l)]));
                chk(builderWant(G0) === '2:' + multiB(2) && builderNote('multigame') === builderWant(G0) && builderNote('clash') === null,
                  `${how}: (a) a same-game parlay beside another game's leg in the builder does not say, word for word, that the parlay card gives each of the 2 games a link of its own: ` + builderNote('multigame')); }
              { const C = w.PARLAY_CARD; w.PARLAY_CARD = undefined; w.eval('renderParlay()'); await wait(20);
                const none = builderNote('multigame'); w.PARLAY_CARD = C; w.eval('renderParlay()'); await wait(20);
                chk(none === null, `${how}: (a) with no parlay card (the prop model's own page) the builder still says the card gives each game a link of its own: ` + none); }
              /* (app v121, the review's round) a leg of another week beside them: the card cannot be finished (Finish waits
                 for the legs of one week), so the builder says nothing of the card's links, only that the legs are in
                 different weeks */
              { w.eval(`S.parlay=${JSON.stringify(B(ML1, RBL, ML2, Object.assign({}, ML3, { week: wk + 1 })))}; renderParlay()`); await wait(20);
                const two = builderNote('multigame'), wkLine = [...d.querySelectorAll('#parlayBody p')].some(p => /These legs are in different weeks/.test(txt(p)));
                w.eval(`S.parlay=${JSON.stringify(B(ML1, RBL, ML2))}; renderParlay()`); await wait(20);
                chk(two === null && wkLine, `${how}: (a) with a leg of another week beside them, the builder still says the parlay card gives each game a link of its own (or does not say the legs are in different weeks): ` + two); }
              await reopen();
              const qa = w.PARLAY_CARD.quote(), ids = qa.legs.map(l => idOf[keyOf(l)]), G = gamesOf(qa.legs, ids, dkABC), pa = w.PARLAY_CARD.dkPlan(qa.legs.map(l => ({ ...l })));
              chk(qa.legs.length === 3 && G.length === 2 && multiOf(G) && G.some(x => x.gid === g2.id && x.ids.length === 2), `${how}: (a) the fixture is not two legs of one game and one of another on the slip: ` + JSON.stringify(G));
              /* each game's own read, worked out from the table: the first game's AT_G, the second's AT_P, and the oldest of
                 all AT_G, so a button dated by every leg's oldest read is wrong for the second game */
              chk((G.find(x => x.gid === g1.id) || {}).at === AT_G && (G.find(x => x.gid === g2.id) || {}).at === AT_P && oldestOwn(G.flatMap(x => x.reads)) === AT_G && AT_P !== AT_G,
                `${how}: (a) the fixture's two games are not read at different times, the oldest the first's: ` + JSON.stringify(G.map(x => [x.gid, x.at])));
              /* the card's own plan, for what it did: no link for all three, a game each with its legs and its link */
              chk(!!pa && pa.multi === true && pa.url === null && Array.isArray(pa.clash) && !pa.clash.length
                && JSON.stringify((pa.games || []).map(x => [x.gid, x.name, x.ok.map(y => y.n), x.url])) === JSON.stringify(G.map(x => [x.gid, x.name, x.ns, DKU(x.ids)])),
                `${how}: (a) the card's plan for a same-game parlay mixed with another game is not a link a game and no link for all: ` + JSON.stringify(pa && { multi: pa.multi, url: pa.url, games: (pa.games || []).map(x => [x.gid, x.name, x.url]) }));
              { const bad = gameBtns(G, AT_G);
                chk(!bad, `${how}: (a) a same-game parlay mixed with another game does not get a button for each game's legs in place of the one link, each titled with its own game's oldest read: ` + bad); }
              /* the 44px rule reaches every game button and leaves Open in DraftKings, hidden, alone */
              { const bad = actRule();
                chk(!bad && dkA.hidden && !dkA.matches(ACT_SEL) && [...d.querySelectorAll('#pcDkGames a')].every(b => b.matches(ACT_SEL)),
                  `${how}: (a) the 44px rule does not reach every game button, or reaches the hidden Open in DraftKings: ` + bad); }
              chk(txt(note().firstElementChild) === multiNote(2, AT_G) && !note().querySelector('[data-pc-dkmiss], [data-pc-dkswap], [data-pc-dkclash]')
                && ![...md.querySelectorAll('a[href]')].some(a => a.getAttribute('href') === DKU(ids)) && !promises(txt(note()) + ' ' + [...d.querySelectorAll('#pcDkGames a')].map(a => a.getAttribute('title')).join(' ')),
                `${how}: (a) the note does not say, word for word and dated by the older read, that these legs mix a same-game parlay with other games and so have a link a game, or a link for all three is still offered: ` + txt(note()));
              { const bad = legLinks(slipOf(qa.legs, ids));
                chk(!bad, `${how}: (a) the note does not list every leg's own link after the paragraph on the mix: ` + bad); }
              /* Share link: a title and a text and no url field, canShare asked about the same; in the text every leg, a link
                 a game under its game's line, the read, the site last; and the same text copied, by the clipboard and by a
                 hidden box */
              { const asked = [], got = [];
                def('share', async x => { got.push(x); }); def('canShare', x => { asked.push(x); return true; });
                d.getElementById('pcLink').click(); await wait(30); delete nav.share; delete nav.canShare;
                const s = got[0] || {}, t = s.text || '';
                chk(got.length === 1 && JSON.stringify(Object.keys(s).sort()) === '["text","title"]' && asked.length === 1 && JSON.stringify(asked[0]) === JSON.stringify({ title: s.title, text: t })
                  && s.title === '3-leg parlay ' + w.eval('fmtML(decToML(PARLAY_CARD.quote().useDec))') && legsOf(qa, t) && t.includes(multiLines(G, AT_G, null)) && G.every(x => t.split('\n').includes(DKU(x.ids)))
                  && !t.includes(DKU(ids)) && !/DraftKings betslip \(opens|Add by hand/.test(t) && /\ndemon-x13\.github\.io\/nfl-hub$/.test(t) && !promises(t + '\n' + s.title),
                  `${how}: (a) Share link on a same-game parlay mixed with another game does not send a link for each game's legs, each under its game's line, then the read: ` + JSON.stringify(s));
                const copied = [], boxed = [];
                /* the card says what it copied: "Links copied" for a text with a link for each game (app v121's second
                   round; until then "Parlay copied", as for a text with no link), by the clipboard and by the hidden box */
                const said = [];
                def('clipboard', { writeText: async x => { copied.push(x); } }); d.getElementById('pcLink').click(); await wait(30); delete nav.clipboard; said.push(msg());
                d.execCommand = c => { const ta = md.querySelector('textarea'); boxed.push(ta ? ta.value : null); return c === 'copy'; };
                d.getElementById('pcLink').click(); await wait(30); delete d.execCommand; said.push(msg());
                chk(copied.length === 1 && copied[0] === t && boxed.length === 1 && boxed[0] === t && said.join(' | ') === 'Links copied | Links copied',
                  `${how}: (a) with no share sheet, the same text (a link a game) is not copied by the clipboard and by the hidden box, or the card does not say "Links copied": ` + JSON.stringify({ same: [copied[0] === t, boxed[0] === t], said, copied, boxed }));
                /* and a text with no link at all, the card's plan stood in with none (put back after, whatever happens):
                   "Parlay copied". (Every leg off the slip still sends DraftKings' NFL page or the game's, one link: "Link
                   copied", held in (b) of the cases with no id above) */
                { const m = w.PARLAY_CARD.current(), was = m && m.dk, cp = []; let saidN = null;
                  try { m.dk = { n: 0, ok: [], miss: [], games: [], each: [], swaps: [], clash: [], multi: false, url: null, event: null, home: null, read: null };
                    def('clipboard', { writeText: async x => { cp.push(x); } }); d.getElementById('pcLink').click(); await wait(30); saidN = msg(); }
                  finally { if (m) m.dk = was; delete nav.clipboard; }
                  chk(cp.length === 1 && !/draftkings\.com/.test(cp[0]) && saidN === 'Parlay copied', `${how}: (a) a text with no link is not copied as "Parlay copied": ` + JSON.stringify({ said: saidN, cp })); } }
              /* the Tab order: Close, a button for each game, Share link, Download, Start over, each leg's own link; and Tab
                 stays inside, both ways */
              { const foc = [...md.querySelectorAll('button,a[href],input,select,[tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && !el.hidden && !el.closest('[hidden]'));
                const seq = foc.map(el => el.id || (el.hasAttribute('data-pc-dkgame') ? 'game:' + el.getAttribute('data-pc-dkgame') : 'leg' + el.getAttribute('data-pc-dkleg'))).join(' ');
                const want = ['pcClose', ...G.map(x => 'game:' + x.gid), 'pcLink', 'pcDownload', 'pcAgain', ...slipOf(qa.legs, ids).map(x => 'leg' + x[0])].join(' ');
                chk(seq === want, `${how}: (a) the card's controls are not Close, a button for each game, Share link, Download, Start over, then each leg's own link: ${seq}, not ${want}`);
                const lastC = foc[foc.length - 1]; lastC.focus(); lastC.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
                const wrapped = d.activeElement === d.getElementById('pcClose');
                d.getElementById('pcClose').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
                chk(wrapped && d.activeElement === lastC, `${how}: (a) Tab leaves the card's window with the game buttons in it`); }
              /* an undated leg in one game: the runner's read time taken out of the second game's, so its button says "last
                 read" while the first game's stays dated by its own game lines; the note and Share link, by them all, are
                 undated */
              { const T = JSON.parse(JSON.stringify(dkABC)); delete T[String(wk)][g2.id].at;
                w.eval(`PAY.dk=${JSON.stringify(T)}; renderParlay()`); await wait(20); await reopen();
                const qu = w.PARLAY_CARD.quote(), idu = qu.legs.map(l => idOf[keyOf(l)]), Gu = gamesOf(qu.legs, idu, T), atU = gid => (Gu.find(x => x.gid === gid) || {}).at, bad = gameBtns(Gu, null);
                chk(Gu.length === 2 && atU(g1.id) === AT_G && atU(g2.id) === null && !bad && txt(note().firstElementChild) === multiNote(2, null),
                  `${how}: (a) with the second game's player read undated, its button does not say "last read" while the first's stays dated, or the note is not undated: ` + [bad, txt(note().firstElementChild)].filter(Boolean).join(' / '));
                const got = await sheet(), t = (got[0] || {}).text || '';
                chk(got.length === 1 && t.includes(multiLines(Gu, null, null)) && G.every(x => t.split('\n').includes(DKU(x.ids))),
                  `${how}: (a) with the second game's player read undated, Share link does not say the lines were as last read: ` + JSON.stringify(got[0])); }
              /* (b) */
              const dkB = JSON.parse(JSON.stringify(dkABC)); dkB[String(wk)][G3.id] = { [`team:${G3.h}|ml`]: ML3_ID, glat: AT_G };
              w.eval(`PAY.dk=${JSON.stringify(dkB)}; S.parlay=${JSON.stringify(B(ML1, RBL, ML3))}; renderParlay()`); await wait(20);
              chk(builderNote('multigame') === null, `${how}: (b) the builder says one leg a game across three games mixes a same-game parlay with other games: ` + builderNote('multigame'));
              await reopen();
              { const qb = w.PARLAY_CARD.quote(), idb = qb.legs.map(l => l.gid === G3.id ? ML3_ID : idOf[keyOf(l)]), Gb = gamesOf(qb.legs, idb), bad = gameBtns(null) || legLinks(slipOf(qb.legs, idb));
                chk(qb.legs.length === 3 && Gb.length === 3 && !multiOf(Gb) && !dkA.hidden && dkA.getAttribute('href') === DKU(idb) && txt(dkA) === 'Open in DraftKings' && dkA.getAttribute('title') === opensTitle('the 3 legs', AT_G)
                  && txt(note()).startsWith(opensNote('the 3 legs', AT_G)) && !bad,
                  `${how}: (b) one leg a game across three games is not one link for all three, as before, with no game buttons: ` + [bad, txt(note()), dkA.outerHTML].filter(Boolean).join(' / '));
                const got = await sheet(), t = (got[0] || {}).text || '';
                chk(got.length === 1 && t.includes(slipLines('the 3 legs as DraftKings had them', DKU(idb), AT_G)) && !/a link for each game/.test(t),
                  `${how}: (b) Share link on one leg a game across three games does not send the one link for all three: ` + JSON.stringify(got[0])); }
              /* (d) the builder's line follows the card's plan (app v121's second round): it names the 2 games with legs on
                 the slip, the card's buttons, never the third, whose leg has no id (until then it counted every leg's game,
                 and named 3) */
              w.eval(`PAY.dk=${JSON.stringify(dkABC)}; S.parlay=${JSON.stringify(B(ML1, RBL, ML2, ML3))}; renderParlay()`); await wait(20);
              { const q0 = w.PARLAY_CARD.quote(), G0 = gamesOf(q0.legs, q0.legs.map(l => l.gid === G3.id ? null : idOf[keyOf(l)]));
                chk(builderWant(G0) === '2:' + multiB(2) && builderNote('multigame') === builderWant(G0),
                  `${how}: (d) a same-game parlay beside another game's leg on the slip and a third game's leg with no id: the builder does not say, word for word, that the card gives each of the 2 games a link of its own: ` + builderNote('multigame')); }
              await reopen();
              { const qd = w.PARLAY_CARD.quote(), idd = qd.legs.map(l => l.gid === G3.id ? null : idOf[keyOf(l)]), Gd = gamesOf(qd.legs, idd, dkABC), n3 = qd.legs.findIndex(l => l.gid === G3.id) + 1;
                const bad = gameBtns(Gd, AT_G) || legLinks(slipOf(qd.legs, idd), { miss: 1 });
                chk(qd.legs.length === 4 && Gd.length === 2 && multiOf(Gd) && !Gd.some(x => x.gid === G3.id) && !bad && txt(note().firstElementChild) === multiNote(2, AT_G, true)
                  && note().querySelectorAll('[data-pc-dkmiss]').length === 1 && missOf(n3) === `${n3}. Third Side, To win: ${GAME_NP}`,
                  `${how}: (d) a same-game parlay mixed with another game, beside a third game's leg with no id, does not get a button only for each game with legs on the slip, and that leg to add by hand: ` + [bad, txt(note())].filter(Boolean).join(' / '));
                const got = await sheet(), t = (got[0] || {}).text || '';
                chk(got.length === 1 && t.includes(multiLines(Gd, AT_G, 'leg ' + n3)) && t.includes(`\nAdd by hand at DraftKings:\n${n3}. Third Side To win (its game’s prices are not pulled yet)\n`) && legsOf(qd, t) && !promises(t) && !/DraftKings betslip \(opens/.test(t),
                  `${how}: (d) Share link does not send a link for each game with legs on the slip, saying which leg to add by hand, and that leg with why: ` + JSON.stringify(got[0])); }
            }
            /* (c) every leg on the second game; the passer and the runner are of its home club, the visitor of the other */
            const QB = { gid: g2.id, pid: 'card-qb', stat: 'passing_tds', k: 1.5, side: 'over', main: true, p: 0.5, price: -120, src: 'real', mu: 1.6, name: 'Card Passer', pos: 'QB', grp: 'QB', team: g2.h, opp: g2.a, week: wk, label: 'Over 1.5 passing TDs' };
            const QBU = Object.assign({}, QB, { side: 'under', price: 100, label: 'Under 1.5 passing TDs' });
            const RBT = { gid: g2.id, pid: 'card-rb', stat: 'any_td', k: 1, side: 'over', main: false, p: 0.35, price: 185, src: 'real', mu: null, name: 'Card Runner', pos: 'RB', grp: 'RB', team: g2.h, opp: g2.a, week: wk, label: 'Scores a touchdown' };
            const OPT = Object.assign({}, RBT, { pid: 'card-opp', name: 'Card Visitor', team: g2.a, opp: g2.h, price: 210 });
            const QBT = Object.assign({}, RBT, { pid: 'card-qb', name: 'Card Passer', pos: 'QB', grp: 'QB', price: 600, label: 'Scores a rushing or receiving TD (not a TD pass)' });
            const TOT = { gid: g2.id, pid: 'game', stat: 'total', k: 44.5, side: 'over', main: true, p: 0.5, price: -110, src: 'real', mu: 44.5, name: 'Game Total', pos: 'Game', grp: 'TEAM', team: g2.a, opp: g2.h, week: wk, label: 'Over 44.5 points' };
            const cIds = { 'card-qb|passing_tds|over|1.5': 'SMOKE6#ptd_o', 'card-qb|passing_tds|under|1.5': 'SMOKE6#ptd_u', 'card-rb|any_td': 'SMOKE6#rb_td', 'card-opp|any_td': 'SMOKE6#opp_td', 'card-qb|any_td': 'SMOKE6#qb_td', 'game|total|over|44.5': 'SMOKE6#tot_o' };
            const cId = l => cIds[l.stat === 'total' ? `game|total|${l.side}|${l.k}` : l.stat === 'any_td' ? `${l.pid}|any_td` : `${l.pid}|${l.stat}|${l.side}|${l.k}`];
            const dkC = dkMade(); Object.assign(dkC[String(wk)][g2.id], cIds);
            const cases = [['his passing TDs over with his teammate’s touchdown', [QB, RBT], true, 'td'], ['his passing TDs over with the game total', [QB, TOT], true, 'total'],
              ['his passing TDs over with his teammate’s touchdown and the game total', [QB, RBT, TOT], true, 'td,total'], ['his passing TDs under with the total, an opponent’s touchdown and his own', [QBU, TOT, OPT, QBT], true, ''],
              ['his passing TDs under with his teammate’s touchdown, off the slip', [QBU, RBT], false, 'td']];
            for (const [what, legs, onSlip, kinds] of cases) {
              w.eval(`PAY.dk=${JSON.stringify(onSlip ? dkC : {})}; S.parlay=${JSON.stringify(B(...legs))}; renderParlay()`); await wait(20);
              const qc = w.PARLAY_CARD.quote(), pairs = clashPairsOwn(qc.legs);
              chk(qc.legs.length === legs.length && pairs.map(x => x[2]).sort().join() === kinds, `${how}: (c) ${what}: the check's own rule finds ${pairs.map(x => x[2]).join() || 'no pair'}, not ${kinds || 'no pair'}`);
              const wantB = pairs.length ? `${pairs.length}:DraftKings may refuse ${pairs.length === 1 ? 'this pair' : 'these pairs'} on one slip: ${pairs.map(([i, j, k]) => `${qc.legs[i].name}, ${qc.legs[i].label}, with ${qc.legs[j].name}, ${qc.legs[j].label} (${CLASH_SAY[k]})`).join('; ')}.` : null;
              chk(builderNote('clash') === wantB && builderNote('multigame') === null, `${how}: (c) ${what}: the builder does not say, word for word, which pairs DraftKings may refuse on one slip: ${builderNote('clash')}, not ${wantB}`);
              await reopen();
              const ids = qc.legs.map(l => onSlip ? cId(l) : null), cl = [...d.querySelectorAll('#pcDkNote [data-pc-dkclash]')];
              const wantC = pairs.length ? `DraftKings may refuse ${pairs.length === 1 ? 'this pair' : 'these pairs'} on one slip: ${pairs.map(([i, j, k]) => `legs ${i + 1} and ${j + 1} (${CLASH_SAY[k]})`).join('; ')}.` : null;
              const bad = (onSlip ? legLinks(slipOf(qc.legs, ids), { clash: pairs.length }) : noteBody() === 'first hand' + (pairs.length ? ' clash' : '') ? checkBad() : `its blocks are "${noteParts()}"`) || gameBtns(null);
              chk(cl.length === (wantC ? 1 : 0) && (!wantC || (txt(cl[0]) === wantC && cl[0].getAttribute('data-pc-dkclash') === String(pairs.length))) && !bad
                && (onSlip ? !dkA.hidden && dkA.getAttribute('href') === DKU(ids) : txt(dkA) === 'Open DraftKings'),
                `${how}: (c) ${what}: the card's note does not say, word for word and last, which pairs DraftKings may refuse on one slip (${wantC || 'none'}): ` + [bad, cl.map(txt).join(' | ') || 'no line', dkA.getAttribute('href')].filter(Boolean).join(' / '));
              /* the card's own plan, for what it did: the same pairs, by the legs' numbers */
              const pc = w.PARLAY_CARD.dkPlan(qc.legs.map(l => ({ ...l })));
              chk(JSON.stringify(pc.clash) === JSON.stringify(pairs.map(([i, j, k]) => [i + 1, j + 1, k])), `${how}: (c) ${what}: the card's plan holds the pairs ${JSON.stringify(pc.clash)}, not ${JSON.stringify(pairs.map(([i, j, k]) => [i + 1, j + 1, k]))}`);
            }
          } finally {
            if (G3 && was3) { G3.w = was3.w; G3.d = was3.d; G3.t = was3.t; }
            delete nav.share; delete nav.canShare; delete nav.clipboard; delete d.execCommand;
            w.eval(`PAY.dk=${JSON.stringify(dkMade())}; S.parlay=${JSON.stringify(builder(side))}; renderParlay()`); await wait(20); } }
        w.eval(`PAY.dk=${JSON.stringify(dkMade())}`); await reopen();
        chk(dkA.getAttribute('href') === DKU(order) && d.activeElement === d.getElementById('pcDownload'), `${how}: the card did not come back whole with the DraftKings ids put back`); }
      /* the image */
      d.getElementById('pcDownload').click(); await wait(60);
      const file = rec.clicks[0] && rec.clicks[0].download;
      chk(rec.clicks.length === 1 && new RegExp(`^parlay-${wk <= 18 ? 'week' + wk : 'playoffs-week' + wk}-2legs\\.png$`).test(file) && /^blob:/.test(rec.clicks[0].href) && rec.clicks[0].attached,
        `${how}: Download did not save the card as a named PNG: ` + JSON.stringify(rec.clicks));
      chk(rec.urls.length === 1 && rec.urls[0].type === 'image/png' && rec.canvases.length === 1 && rec.canvases[0].width === 1080 && rec.canvases[0].height > 2 * 400,
        `${how}: the download is not a PNG drawn at twice the card's size: ` + (rec.urls[0] && rec.urls[0].type) + ' ' + (rec.canvases[0] && rec.canvases[0].width));
      chk(['Home Side', 'To win', 'Card Runner', rbLabel, '−135', '+105', price, '2-leg parlay', 'NFL HUB', '$25.00'].every(t => rec.texts.some(x => x.includes(t))) && rec.texts.includes('demon-x13.github.io/nfl-hub') && !rec.texts.some(x => /nfl-hub\/nflbets/.test(x)),
        `${how}: the image does not carry every leg, the price, the stake and the mark: ` + rec.texts.join(' | '));
      chk(!rec.texts.some(x => /DraftKings|Share link/.test(x)), `${how}: the image carries the DraftKings link or the Share link: ` + rec.texts.join(' | '));
      { const all = rec.texts.join('');
        chk(all.includes(line1) && all.includes(line2), `${how}: the image does not lead its chance with the fair chance (${line1}), then the model's and the price's: ` + rec.texts.filter(x => /chance|says|%/.test(x)).join(' | ')); }
      chk(new RegExp('Saved as ' + file).test(txt(d.getElementById('pcMsg'))), `${how}: the window does not say the image was saved`);
      /* Escape closes it, and the focus goes back to Finish; the builder keeps its legs */
      d.getElementById('pcDownload').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      chk(md.hidden && !d.body.classList.contains('modal-open') && d.activeElement === d.getElementById('pFinish') && Object.keys(w.eval('S').parlay).length === 2,
        `${how}: Escape did not close the window, give the focus back to Finish, or the builder lost its legs`);
      /* Tab stays inside the window, both ways. The order is Close, Open in DraftKings, Share link,
         Download, Start over, then the note's own link for each leg under the buttons, the last (a button
         for each game in Open in DraftKings' place where a same-game parlay is mixed with other games: (a)
         above) */
      d.getElementById('pFinish').click(); await wait(20);
      const foc = [...md.querySelectorAll('button,a[href],input,select,[tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && !el.hidden && !el.closest('[hidden]'));
      const seq = foc.map(el => el.id || 'leg' + el.getAttribute('data-pc-dkleg')).join(' ');
      chk(seq === 'pcClose pcDk pcLink pcDownload pcAgain leg1 leg2', `${how}: the card's controls are not in the order Close, Open in DraftKings, Share link, Download, Start over, each leg's link: ` + seq);
      const lastC = foc[foc.length - 1];
      lastC.focus(); lastC.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      const wrapped = d.activeElement === d.getElementById('pcClose');
      d.getElementById('pcClose').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
      chk(wrapped && d.activeElement === lastC, `${how}: Tab leaves the card's window`);
      /* a click outside the card closes it too, and so does Close */
      md.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(10);
      chk(md.hidden, `${how}: a click outside the card did not close its window`);
      d.getElementById('pFinish').click(); await wait(10); d.getElementById('pcClose').click();
      chk(md.hidden, `${how}: Close did not close the card's window`);
      /* the share sheet, where the browser can share a file: the same PNG, by name */
      { const shared = []; Object.defineProperty(w.navigator, 'canShare', { value: () => true, configurable: true });
        Object.defineProperty(w.navigator, 'share', { value: async x => { shared.push(x); }, configurable: true });
        d.getElementById('pFinish').click(); await wait(20);
        chk(!d.getElementById('pcShare').hidden && /\bgo\b/.test(d.getElementById('pcShare').className) && d.activeElement === d.getElementById('pcShare'),
          `${how}: a browser that can share a file is not offered the share sheet first`);
        d.getElementById('pcShare').click(); await wait(60);
        const f = shared[0] && shared[0].files && shared[0].files[0];
        chk(!!f && f.name === file && f.type === 'image/png' && rec.clicks.length === 1, `${how}: the share sheet was not handed the card's PNG: ` + (f ? f.name + ' ' + f.type : 'nothing shared'));
        d.getElementById('pcClose').click();
        delete w.navigator.canShare; delete w.navigator.share; }
      /* finishing wrote nothing: not the saved list, not the builder, no key, not the store */
      chk(snap(v) === before && pressKept(v) && reads() && BAD_CALLS.length === bad0 && w.localStorage.getItem('my_parlays_v1') === myOld && w.localStorage.getItem('live_parlays_v1') === null,
        `${how}: finishing a parlay changed what the browser keeps, or sent something other than a read (${v.methods.filter(m => m !== 'GET').length} writes)`);
      chk(w.eval('S').saved.map(p => p.id).join() === 'saved-before' && ![...d.querySelectorAll('#tab-parlay .savedp')].some(c => /Card Runner/.test(txt(c))), `${how}: a finished parlay went into the saved list or onto the page`);
      /* the builder changed and finished again is the new parlay */
      w.eval('S.stake=40; save(); renderParlay()'); await wait(20);
      d.getElementById('pFinish').click(); await wait(20);
      chk(txt(d.querySelector('#pcView .pc-money b')) === '$40.00', `${how}: the card did not follow the builder's new stake`);
      d.getElementById('pcClose').click();
      /* a long shot: every dollar figure whole, thousands marked, in the window and on the image.
         The window's tiles may wrap but never cut (no ellipsis, no clipping, none narrower than
         its figure); the image's figures step down a size to fit three across, and a figure too
         wide even so takes a second row of tiles, the card that much taller */
      { const fmt = x => '$' + x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const css = [...d.querySelectorAll('style')].map(e => e.textContent).join('\n');
        const rules = [...css.matchAll(/\.pc-money(?:\s+(?:b|div))?\s*\{([^}]*)\}/g)].map(x => x[1]);
        chk(rules.length >= 3 && !rules.some(r => /ellipsis|overflow\s*:\s*hidden|min-width\s*:\s*0/.test(r)),
          `${how}: the window's money tiles can cut a figure: ` + rules.filter(r => /ellipsis|overflow|min-width/.test(r)).join(' / '));
        const shot = async (stake, bp) => {
          w.eval(`S.stake=${stake}; S.bookPrice=${bp}; save(); renderParlay()`); await wait(20);
          d.getElementById('pFinish').click(); await wait(20);
          const q = w.PARLAY_CARD.quote(), want = [fmt(stake), fmt(stake * q.useDec), '+' + fmt(stake * q.useDec - stake)];
          const win = [...d.querySelectorAll('#pcView .pc-money b')].map(txt), n0 = rec.draws.length, c0 = rec.canvases.length;
          d.getElementById('pcDownload').click(); await wait(60);
          const drawn = rec.draws.slice(n0).filter(x => /\$/.test(x.t)), cv = rec.canvases[c0];
          d.getElementById('pcClose').click();
          return { want, win, drawn, h: cv ? cv.height : 0,
            whole: want.every(x => drawn.some(y => y.t === x)) && !drawn.some(y => y.t.includes('\u2026')),
            px: Math.min(...drawn.map(y => parseFloat((y.font.match(/([\d.]+)px/) || [])[1]) || 0)) }; };
        const a = await shot(20, 88000);
        chk(a.want[2] === '+$17,600.00' && a.win.join('|') === a.want.join('|'), `${how}: the window does not show a long shot's stake, payout and profit whole: ${a.win.join(' / ')} for ${a.want.join(' / ')}`);
        chk(a.whole && a.px >= 14 && a.px < 19, `${how}: the image cut a long shot's figures, or did not step them down to fit: ` + a.drawn.map(y => y.t + ' @' + y.font.split(' ')[1]).join(' | '));
        const b = await shot(100000, 500000);
        chk(b.whole && b.win.join('|') === b.want.join('|') && b.h === a.h + 2 * 66,
          `${how}: a figure too wide for three tiles across was cut, or the tiles did not take a second row (${a.h} then ${b.h} px): ` + b.drawn.map(y => y.t + ' @' + y.font.split(' ')[1]).join(' | '));
        w.eval('S.stake=40; S.bookPrice=null; save(); renderParlay()'); await wait(20);
        d.getElementById('pFinish').click(); await wait(20); }
      /* Start over empties the builder, and only the builder */
      d.getElementById('pcAgain').click(); await wait(30);
      chk(md.hidden && Object.keys(w.eval('S').parlay).length === 0 && !d.getElementById('pFinish') && w.eval('S').saved.map(p => p.id).join() === 'saved-before' && reads(),
        `${how}: Start over did not clear the builder alone`);
      /* the focus on the Parlay Builder's choices, or with no game to build from (no choices drawn) on the chosen tab's
         button: never the page's body (the review of 19 October 2026) */
      { await wait(60); const want = d.querySelector('#pbPanel [data-pb-mix]') || d.querySelector('#tabs button[aria-selected="true"]');
        chk(!!want && d.activeElement === want && d.activeElement !== d.body && d.activeElement !== d.getElementById('pcAgain'), `${how}: after Start over the focus is lost: ` + (d.activeElement === d.body ? 'the page\'s body' : d.activeElement ? d.activeElement.outerHTML.slice(0, 80) : 'nothing')); }
      /* two weeks in the builder cannot be one parlay: Finish says so, as Save did */
      w.eval(`S.parlay=${JSON.stringify(builder(side))}; S.parlay['other|team:${other ? other.h : 'X'}|ml']=${JSON.stringify({ gid: other ? other.id : 'x', pid: 'team:' + (other ? other.h : 'X'), stat: 'ml', k: 0, side: 'over', main: false, p: 0.5, price: 100, src: 'real', name: 'Elsewhere', pos: 'Game', grp: 'TEAM', team: other ? other.h : 'X', opp: other ? other.a : 'Y', week: other ? +other.w : wk + 1, label: 'To win' })}; save(); renderParlay()`);
      await wait(20);
      chk(!!d.getElementById('pFinish') && d.getElementById('pFinish').disabled && /same week to finish/.test(d.getElementById('pFinish').title), `${how}: a builder across two weeks can be finished`);
      /* Suggested Parlays (#suggest, app v111, the owner's call of 16 October 2026): each Thursday, Sunday
         and Monday night game of the week gets its own Safe, Medium, Aggressive and Extreme, and a level
         finishes the same way the builder does, its legs, its price and its chance, on the amount in the
         Parlay Builder's Bet amount box, the builder's own stake, which every level pays on. The sets'
         own rules (prime time, the levels, the lock, a player ruled out) are held to the engine in props'
         audit and smoke.js; here the set is a fixed one on the second pinned game, moved to Thursday 31
         December 2099 at 8:15 pm Eastern so it is a Thursday night game, so the card is checked on any
         day: first live (its lock, 2 hours before kickoff, is far off), then locked, from a record entry
         made up here, on the page's clock moved to an hour before that kickoff. Its two legs are the
         game's home money line and the runner's main line, each with DraftKings' id at its own line */
      { const KICK = Date.UTC(2100, 0, 1, 1, 15), LOCK = KICK - 2 * 3600e3;   /* 8:15 pm EST, UTC-5; the lock 6:15 pm */
        const ML_G2 = { a: 115, h: -135 }, DK_ML2 = { h: 'SMOKE3#ml_' + g2.h, a: 'SMOKE3#ml_' + g2.a };
        const mlKey2 = `${g2.id}|team:${g2.h}|ml`, fid = `${g2.id}:safe`;
        const ml2 = { gid: g2.id, pid: 'team:' + g2.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.58, price: ML_G2.h, src: 'real', mu: null, name: 'Home Side', pos: 'Game', grp: 'TEAM', team: g2.h, opp: g2.a, week: wk, label: 'To win' };
        const setLegs = [ml2, builder(side)[rbKey]].map(l => Object.assign({ key: l.gid + '|' + l.pid + '|' + l.stat }, l));
        const WHY = 'Only 2 legs in this game: a parlay takes one leg a player, and one side and one total a game.';
        const dk = dkMade(); dk[String(wk)][g2.id][`team:${g2.h}|ml`] = DK_ML2.h; dk[String(wk)][g2.id][`team:${g2.a}|ml`] = DK_ML2.a;
        /* (app v118) the Elo picks' two made-up players beside the runner, each with DraftKings' id at his own line */
        const DK_WR = 'SMOKE4#rec_555', DK_TE = 'SMOKE4#rcp_35';
        dk[String(wk)][g2.id]['card-wr|receiving_yards|over|55.5'] = DK_WR; dk[String(wk)][g2.id]['card-te|receptions|over|3.5'] = DK_TE;
        /* a unit other than this game (the Sunday slot below) is built from the set made up for it there (window.__spOther),
           and with none, all four levels empty */
        w.eval(`(()=>{ const g=S.sched.find(x=>x.id===${JSON.stringify(g2.id)}); g.d='2099-12-31'; g.t='20:15'; g.mla=${ML_G2.a}; g.mlh=${ML_G2.h};
          PAY.dk=${JSON.stringify(dk)};
          pbGames=function(){ return S.sched.filter(x=>x.id===${JSON.stringify(g2.id)}); };
          spBuild=function(g){ if(g.id!==${JSON.stringify(g2.id)}){ const o=typeof window.__spOther==='function'?window.__spOther(g):null; if(o) return o;
              const why='Nothing in this smoke\\u2019s made-up sets for this unit.';
              return {gid:g.id,pref:0,thin:0,mkt:0,far:0,farDk:0,noId:0,moved:0,plGames:1,plNoId:0,tiers:[['safe','Safe',2,0],['med','Medium',3,0.25],['aggr','Aggressive',4,0.12],['xtrm','Extreme',5,0.05]].map(([id,label,n,floor])=>({id,label,n,floor,why}))}; }
            return {gid:g.id,pref:2,thin:0,mkt:0,far:0,farDk:0,noId:0,moved:0,plGames:1,plNoId:0,tiers:[
            {id:'safe',label:'Safe',n:2,floor:0,legs:${JSON.stringify(setLegs)},corr:0.41,indep:0.38,dec:3.1,thin:0,mkt:0,fair:{p:0.33,est:false,miss:0}},
            {id:'med',label:'Medium',n:3,floor:0.25,why:${JSON.stringify(WHY)}},{id:'aggr',label:'Aggressive',n:4,floor:0.12,why:${JSON.stringify(WHY)}},{id:'xtrm',label:'Extreme',n:5,floor:0.05,why:${JSON.stringify(WHY)}}]}; };
          SP_CACHE=new Map(); renderParlay(); })()`);
        await wait(20);
        /* (app v118) each unit's Elo picks (the owner's call of 19 October 2026): the ELO tab's four levels on the unit's
           games alone, which window.eloUnit hands Suggested Parlays, made up here as the set is (the rule itself is held
           by elo/check_tab.js and the nflbets smoke; here, what the tab and the card do with what it hands over). This
           game's Safe is two players' main lines, the runner's and a receiver's, each with its Elo chance (pe) and
           DraftKings' id at its own line, its Elo chance all land and its price the builder's own sums on them; the record's
           (below) the runner's and a tight end's, so the two are told apart; the other three levels empty, saying why, as
           eloUnit hands an empty level over. A unit not made up here gets four empty levels. Stood in below, with spOn,
           and put back with it */
        const PO = w.eval('pbOrder'), PP = w.eval('parlayProb'), PD = w.eval('parlayDec');
        const eloLeg = (gid, pid, stat, k, price, pe, name, team, opp, grp, words) => ({ key: `${gid}|${pid}|${stat}`, gid, pid, stat, k, side: 'over', main: true, p: 0.55, pe, price, src: 'real', mu: k, name, pos: grp, grp, team, opp, week: wk, label: `Over ${k} ${words}` });
        const ELO_EMPTY = [['med', 'Medium', 3, 0.25], ['aggr', 'Aggressive', 4, 0.12], ['xtrm', 'Extreme', 5, 0.05]];
        const eloWhy = (where, n, m = 2) => `Only ${m} player${m === 1 ? '' : 's'} ${where} qualif${m === 1 ? 'ies' : 'y'}: this level takes ${n}.`;
        const eloSafe = (legs, fair) => { const L = PO(legs).map(l => ({ ...l })), p = PP(L.map(l => ({ ...l, p: l.pe }))).corr, dec = PD(L.map(l => ({ leg: l, ml: l.price })));
          return { id: 'elo-safe', label: 'Safe', n: 2, floor: 0.35, legs: L, p, dec, ...(fair != null ? { fair: { p: fair, est: false } } : {}) }; };
        const eloSet = (safe, where) => ({ tiers: [safe, ...ELO_EMPTY.map(([id, label, n, floor]) => ({ id: 'elo-' + id, label, n, floor, why: eloWhy(where, n) }))], candidates: safe ? 2 : 0 });
        const RB_E = eloLeg(g2.id, 'card-rb', 'rushing_yards', 64.5, 105, 0.58, 'Card Runner', g2.h, g2.a, 'RB', 'rushing yards');
        const WR_E = eloLeg(g2.id, 'card-wr', 'receiving_yards', 55.5, -115, 0.62, 'Card Catcher', g2.a, g2.h, 'WR', 'receiving yards');
        const TE_E = eloLeg(g2.id, 'card-te', 'receptions', 3.5, -125, 0.66, 'Card End', g2.h, g2.a, 'TE', 'receptions');
        const NIGHT_E = eloSafe([RB_E, WR_E], 0.30);
        /* the Sunday slot's made-up sets, filled in by the slot's own block below: its game ids (sorted) and its Elo picks */
        const SLOT_E = { ids: null, safe: null };
        const eloStand = (gids, o) => { const ids = [...(gids || [])].map(String).sort().join(), where = (o && o.where) || 'on your picks';
          const r = ids === g2.id ? eloSet(NIGHT_E, where) : SLOT_E.ids && ids === SLOT_E.ids ? eloSet(SLOT_E.safe, where)
            : { tiers: [['safe', 'Safe', 2, 0.35], ...ELO_EMPTY].map(([id, label, n, floor]) => ({ id: 'elo-' + id, label, n, floor, why: eloWhy(where, n, 0) })), candidates: 0 };
          return w.JSON.parse(JSON.stringify(r)); };
        /* the Sunday slot's section at the fixture's own clock, before anything stands in for the tab's rules: the rule
           worked out here (slotNextL) on the schedule as the fixture has it, every number and word the rule's. The
           fixture's own slot, with its live, locked and under-way sets, is made up further down */
        const slotNow = () => { const now = w.eval('Date.now()'), S0 = w.eval('S'), weeks = w.eval('PAY.sched').map(g => g.w);
          return { now, U: slotNextL(weeks, S0.sched, now, SEA), wk: liveWeekL(weeks, S0.sched, now), over: S0.sched.length > 0 && S0.sched.every(g => finalL(g, now)) }; };
        { const s = slotNow(), bad = slotHeldL(d, s.U, s.now, s.wk, s.over, SEA, true);
          chk(!bad, `${how}: at the fixture's clock, the Sunday slot's section is not as its rule has it (${s.U ? s.U.id + (s.U.up ? ' up' : ' not up') : 'none to come, week ' + s.wk}): ` + bad); }
        /* the night rule on this set as the page has it, before anything stands in for it: the Thursday night game is
           the next night, and goes up on the morning after the last prime-time night before it on the schedule (the
           season's own last one), so until then the tab names it and says when, and draws no set; once that morning
           has come, its set. Then the tab's one question of which games it sets out (spOn) is stood in by every
           prime-time game, so the card checks below hold on any day; put back at the end */
        { const S0 = w.eval('S'), G0 = S0.sched.find(x => x.id === g2.id), no = nightOpenL(G0, S0.sched), up = no.open == null || w.eval('Date.now()') >= no.open;
          /* (app v118) in the Night games section: the Sunday slot's has a wait line and a set of its own */
          const NS = '#spSets section.sp-sec[data-sp-sec="night"]';
          const el = d.querySelector(`${NS} [data-sp-wait]`), on = [...d.querySelectorAll(`${NS} .sp-game[data-sp-game]`)].map(x => x.dataset.spGame).join();
          const TNl = w.eval('TEAM_NAMES'), say = `Next up: Thursday night, ${TNl[g2.a] || g2.a} at ${TNl[g2.h] || g2.h}.` + (no.open != null ? ` Its set goes up ${etSayL(no.open)}, the morning after ${PRIME_NIGHT_L[new Date(no.prev + 'T12:00:00Z').getUTCDay()]}’s ${no.pg > 1 ? 'games' : 'game'}.` : '');
          chk(primeL(G0) && (up ? on === g2.id && !el : on === '' && !!el && el.dataset.spWait === new Date(no.open).toISOString().replace(/\.\d{3}Z$/, 'Z') && el.dataset.spNext === g2.id && txt(el) === say && w.eval('spTier')(fid) === null),
            `${how}: by the night rule the Thursday night game's set is ${up ? 'up' : 'not up until ' + new Date(no.open).toISOString()}, and the tab ${on ? 'sets out ' + on : el ? 'says "' + txt(el) + '"' : 'draws neither a set nor a line'}${up ? '' : ', not "' + say + '"'}`); }
        /* (app v118) and the Elo picks each unit is handed (eloStand above), put back with spOn */
        const realNow0 = w.Date.now;
        w.__eloUnitL = w.eloUnit; w.eloUnit = eloStand;
        w.eval('window.__spOnL=spOn; spOn=function(){ return spGames(); }; SP_SHOWN=null; renderParlay()'); await wait(20);
        /* (put back whatever happens below, in its own slot) */
        try {
        const tabBtn = t => d.querySelector(`#tabs [data-tab="${t}"]`), sp = d.getElementById('tab-suggest');
        tabBtn('suggest').click(); await wait(30);
        chk(!!sp && !sp.hidden && tab.hidden && w.location.hash === '#suggest' && txt(d.querySelector('#tabs button[aria-selected="true"]')) === 'Suggested Parlays' && !!sp.querySelector('#spPanel') && !sp.querySelector('#parlayBody'),
          `${how}: the Suggested Parlays tab did not open on its own address (#suggest) with its panel and without the builder`);
        const set = () => d.querySelector(`#spPanel [data-sp-game="${g2.id}"]`);
        /* (app v113, the owner's call of 17 October 2026: "in suggest parlays, get rid of all the long paragraph
           description stuff") the lock line is one short line, and a set draws no lead, foot or record sentence, and
           no line under a level saying why a leg is not a Value pick or a total is there */
        chk(!!set() && txt(set().querySelector('[data-sp-phase="live"]')) === 'Locks Thu 6:15 PM ET, 2 hours before kickoff.',
          `${how}: the Thursday night game's set does not say in one short line that it is live until its lock, 2 hours before kickoff: ` + txt(set()));
        chk(!!set() && ![...set().querySelectorAll('p.pb-thin')].some(p => !p.classList.contains('pb-espnline') && !p.classList.contains('sp-upd')) && !sp.querySelector('#spHead .pb-lead, #spSets .pb-foot, #spSets .sp-rec p, #spHead .sp-rec')
          && !/Refresh odds updates it until then|is not a Value pick|are not Value picks|One night is shown at a time|Each set is built from its game|The record starts with this change/.test(txt(sp.querySelector('#spHead')) + ' ' + txt(sp.querySelector('#spSets'))),
          `${how}: Suggested Parlays still draws one of its long paragraphs (a lead, a foot, the record's sentence or a level's why-line): ` + txt(sp.querySelector('#spSets')).slice(0, 200));
        const tb = d.querySelector(`#spPanel [data-pc-finish="sp|${fid}"]`);
        chk(!!tb && /^Finish$/.test(txt(tb)) && !!d.querySelector(`#spPanel [data-sp-add="${fid}"]`) && !d.querySelector(`#spPanel [data-pc-finish="sp|${g2.id}:med"]`) && !d.querySelector(`#spPanel [data-sp-add="${g2.id}:med"]`)
          && txt(set() && set().querySelector('.pb-tier.med .pb-why')) === WHY,
          `${how}: a set's level has no Finish and Add to builder, or an empty level offers one or does not say why`);
        /* (app v121) only the Sunday slot's cards name their game (a night game's set is the game, named in its head) */
        chk(!!set() && !set().querySelector('.pb-tgame, [data-pb-tgame]'), `${how}: a night game's cards name their game, as only the Sunday slot's do: ` + (set() ? [...set().querySelectorAll('.pb-tgame, [data-pb-tgame]')].map(txt).join(' | ') : 'no set'));
        /* (app v118) the unit's two kinds of level, in this order: "Model parlays" over its four cards, then "Elo picks"
           over the four Elo cards, elo-safe to elo-xtrm (the Elo picks are each unit's own since that day, no longer one
           section at the tab's foot over the Parlay Builder's ticks); the Elo Safe's two legs each with an Add, its Add to
           builder and Finish named for the unit and the level (sp|<unit>:elo-safe); the empty three saying why, "in this
           game", with neither. Nothing is left of the old section (#pbElo, its Add, its "elo|" Finish, its wait line), and
           with no record and no backtest read (this smoke's fetch stub serves neither) each section's record is hidden */
        { const tierId = c => c.dataset.pbTier || [...c.classList].find(k => k !== 'pb-tier' && k !== 'none');
          const parts = set() ? [...set().children].filter(x => x.matches('h5.sp-sub, div.pb-tiers')).map(x => `${x.tagName.toLowerCase()}:${x.dataset.spKind}:${x.tagName === 'H5' ? txt(x) : [...x.children].filter(c => c.matches('.pb-tier')).map(tierId).join('+')}`).join(' / ') : '';
          const wantParts = 'h5:model:Model parlays / div:model:safe+med+aggr+xtrm / h5:elo:Elo picks / div:elo:elo-safe+elo-med+elo-aggr+elo-xtrm';
          const E = k => set() && set().querySelector(`.pb-tiers[data-sp-kind="elo"] > .pb-tier.${k}`);
          chk(parts === wantParts, `${how}: the unit does not draw its model parlays and then its Elo picks, each under its own heading: ${parts}`);
          chk(!!E('elo-safe') && E('elo-safe').querySelectorAll('[data-pb-leg]').length === 2 && !!E('elo-safe').querySelector(`[data-sp-add="${g2.id}:elo-safe"]`)
            && /^Finish$/.test(txt(E('elo-safe').querySelector(`[data-pc-finish="sp|${g2.id}:elo-safe"]`)))
            && ELO_EMPTY.every(([id, , n]) => !!E('elo-' + id) && txt(E('elo-' + id).querySelector('.pb-why')) === eloWhy('in this game', n) && !E('elo-' + id).querySelector('[data-sp-add], [data-pc-finish], [data-pb-leg]')),
            `${how}: the unit's Elo Safe has not its two legs' Adds, an Add to builder and a Finish named sp|${g2.id}:elo-safe, or an empty Elo level does not say why in this game, or offers a button: ` + (set() ? txt(set().querySelector('.pb-tiers[data-sp-kind="elo"]')).slice(0, 300) : 'no set'));
          chk(!d.getElementById('pbElo') && !d.querySelector('[data-pb-elo-add], [data-pc-finish^="elo|"], [data-pb-elo-wait], #spSets [data-sp-elo-wait]'),
            `${how}: something of the Elo picks' old section is still on the page (#pbElo, its Add, its "elo|" Finish or its wait line), or the unit waits on the Elo ratings it was handed`);
          const recs = [...d.querySelectorAll('#spSets .sp-rec')].map(r => `${r.dataset.spRecsec}:${r.hidden ? 'hidden' : 'shown'}:${r.previousElementSibling && r.previousElementSibling.matches('h3.sp-sech') ? txt(r.previousElementSibling) : '-'}`).join(' / ');
          chk(recs === 'night:hidden:Night games / slot:hidden:Sunday slot' && !d.querySelector('#spHead .sp-rec, #spHead [data-sp-rec], #spRec'),
            `${how}: with no record and no backtest, the two sections' records are not each hidden under their own heading, or a record is at the tab's head: ${recs}`); }
        /* each leg of a set has its own Add, 44px, named for the leg, pressed while the leg is in the
           builder: the runner's main line is (the builder holds it from above), the home money line is not */
        const legBtn = key => set() && set().querySelector(`[data-pb-tier="safe"] [data-pb-leg="${key}"]`);
        { const css = [...d.querySelectorAll('style')].map(e => e.textContent).join('\n'), r = (css.match(/\.pb-legadd\{([^}]*)\}/) || [])[1] || '';
          const a = legBtn(mlKey2), b = legBtn(rbKey);
          chk(/min-height:44px/.test(r) && /min-width:44px/.test(r) && set().querySelectorAll('[data-pb-tier="safe"] [data-pb-leg]').length === 2
            && !!a && a.tagName === 'BUTTON' && a.getAttribute('aria-pressed') === 'false' && txt(a) === 'Add' && a.getAttribute('aria-label') === 'Add Home Side, To win, to the builder'
            && !!b && b.getAttribute('aria-pressed') === 'true' && txt(b) === 'Added' && b.getAttribute('aria-label') === `Remove Card Runner, ${rbLabel}, from the builder`,
            `${how}: a set's legs do not each have an Add of 44px named for the leg, pressed only where the leg is in the builder: ` + [a, b].map(x => x ? x.outerHTML : 'none').join(' | ')); }
        const cash = () => [...d.querySelectorAll('#pcView .pc-money b')].map(txt).join(' | ');
        if (tb) { tb.click(); await wait(20);
          chk(!md.hidden && txt(d.querySelector('#pcView .pc-kick')) === `Safe parlay · ${g2.a} at ${g2.h}` && txt(d.querySelector('#pcView .pc-price')) === '+210'
            && ['Home Side', 'To win', '−135', 'Card Runner', rbLabel, '+105'].every(t => txt(d.getElementById('pcView')).includes(t))
            && txt(d.querySelector('#pcView .pc-chance')).startsWith('Fair chance all 2 land 33.0% model says 41.0% · the price says ')
            && cash() === '$40.00 | $124.00 | +$84.00' && d.getElementById('pcAgain').hidden,
            `${how}: the set's card is not its game, legs, price, chance and the $40 amount it pays on (with no Start over, which is the builder's): ` + txt(d.getElementById('pcView')));
          const tA = d.getElementById('pcDk');
          chk(!tA.hidden && tA.getAttribute('href') === 'https://sportsbook.draftkings.com/?outcomes=' + [DK_ML2.h, DK_RB].map(x => x.replace(/#/g, '%23')).join('+') && /opens the 2 legs as DraftKings had them then/.test(txt(d.getElementById('pcDkNote'))),
            `${how}: the set's card does not open its legs in DraftKings in the level's order: ` + tA.getAttribute('href'));
          /* a set is one game's legs: one link, no game buttons, and each leg's own link listed (app v121) */
          { const bad = gameBtns(null) || legLinks([[1, 'Home Side', 'To win', DK_ML2.h], [2, 'Card Runner', rbLabel, DK_RB]]);
            chk(!bad, `${how}: the set's card, one game's legs, has game buttons, or does not list each leg's own link: ` + bad); }
          d.getElementById('pcDownload').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          chk(md.hidden && d.activeElement === tb, `${how}: Escape on the card did not close it, or the focus did not go back to the set's Finish`); }
        /* (the review of 19 October 2026) a level the tab no longer draws when its card closes (the card's read re-picked
           the set, say): the focus goes back to its set's Add to builder, else (none of the set's buttons left) the set's
           heading, else (the set gone) the chosen tab's button, and never the builder's Finish on the hidden Parlay
           Builder tab or the page's body. Each made here by taking those buttons out of the tab, which is drawn again after */
        if (tb) {
          const unit = () => d.querySelector(`#spPanel [data-sp-game="${g2.id}"]`), esc = () => d.getElementById('pcDownload').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          const at = () => d.activeElement ? (d.activeElement === d.body ? 'body' : d.activeElement.id || d.activeElement.getAttribute('data-sp-add') || d.activeElement.getAttribute('data-tab') || d.activeElement.outerHTML.slice(0, 60)) : 'none';
          const gone = [];
          for (const [step, cut, want, what] of [
            ['its Finish gone', () => { const f = unit() && unit().querySelector(`[data-pc-finish="sp|${fid}"]`); if (f) f.remove(); }, () => d.querySelector(`#spPanel [data-sp-add="${fid}"]`), 'the same level\'s Add to builder'],
            ['every button of its set gone', () => { if (unit()) unit().querySelectorAll('[data-sp-add], [data-pc-finish]').forEach(b => b.remove()); }, () => d.getElementById('spg-' + g2.id), 'its set\'s heading'],
            ['its set gone', () => { if (unit()) unit().remove(); }, () => tabBtn('suggest'), 'the chosen tab\'s button (Suggested Parlays)']]) {
            const f = d.querySelector(`#spPanel [data-pc-finish="sp|${fid}"]`); if (f) { f.click(); await wait(20); await cardSettled(w); }
            cut(); esc(); await wait(20);
            const t = want();
            if (!(f && md.hidden && !!t && d.activeElement === t && !d.activeElement.closest('[hidden]') && tabBtn('suggest').getAttribute('aria-selected') === 'true')) gone.push(`${step}: the focus is on ${at()}, not ${what}`);
            w.eval('SP_CACHE=new Map(); SP_SHOWN=null; renderParlay()'); await wait(30); }
          chk(!gone.length, `${how}: a level the tab no longer draws when its card closes does not give the focus back to its set or the tab: ` + gone.join(' | ')); }
        /* an amount of the visitor's own in the Bet amount box, on the Parlay Builder tab: the set pays on
           it, Finish opens the card on it, and Add to builder leaves it in the builder, whose own Finish
           is on it too */
        { const box = d.getElementById('pbStake'), pay = () => { const p = set() && set().querySelector('[data-pb-tier="safe"] [data-pb-pay]'); return p ? txt(p.querySelector('b')) + ' / ' + txt(p.querySelector('span')) : 'no payout'; };
          chk(!!box && box.value === '40' && pay() === '$124.00 / $40 pays', `${how}: the Parlay Builder has no Bet amount box on the builder's $40, or the set does not pay on it: ${box ? box.value : 'no box'} / ${pay()}`);
          if (box) {
            tabBtn('parlay').click(); await wait(20);
            box.value = '12.5'; box.dispatchEvent(new w.Event('input')); box.dispatchEvent(new w.Event('change')); await wait(20);
            tabBtn('suggest').click(); await wait(30);
            chk(w.eval('S.stake') === 12.5 && d.getElementById('pbStake').value === '12.50' && pay() === '$38.75 / $12.50 pays', `${how}: $12.50 typed in the Bet amount box is not what the set pays on: ${pay()}`);
            const f2 = d.querySelector(`#spPanel [data-pc-finish="sp|${fid}"]`);
            if (f2) { f2.click(); await wait(20); }
            chk(!!f2 && !md.hidden && cash() === '$12.50 | $38.75 | +$26.25', `${how}: Finish on the set did not open the card on the Bet amount: ` + cash());
            d.getElementById('pcClose').click();
            const add = d.querySelector(`#spPanel [data-sp-add="${fid}"]`);
            if (add) { add.click(); await wait(30); }
            const q = w.PARLAY_CARD.quote(), pS = d.getElementById('pStake'), inB = Object.keys(w.eval('S').parlay).sort().join();
            chk(!!add && inB === [mlKey2, rbKey].sort().join() && !!q && q.stake === 12.5 && !!pS && pS.value === '12.50' && d.activeElement === d.querySelector(`#spPanel [data-sp-add="${fid}"]`),
              `${how}: Add to builder did not leave exactly the set's legs in the builder on the Bet amount, or lost the focus: ${inB} / ${q ? q.stake : 'no builder'}`);
            d.getElementById('pFinish').click(); await wait(20);
            const fmt = x => '$' + x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            chk(!md.hidden && !!q && cash() === ['$12.50', fmt(12.5 * q.useDec), '+' + fmt(12.5 * q.useDec - 12.5)].join(' | '), `${how}: the builder's Finish after Add to builder is not on the Bet amount: ` + cash());
            d.getElementById('pcClose').click();
            /* one leg's Add takes that leg out of the builder and puts it back, by the builder's own path
               (the home money line priced at the game's own moneyline), the focus kept on it */
            const a1 = legBtn(mlKey2); if (a1) { a1.click(); await wait(30); }
            const a2 = legBtn(mlKey2);
            chk(!!a1 && Object.keys(w.eval('S').parlay).join() === rbKey && !!a2 && a2.getAttribute('aria-pressed') === 'false' && a2.getAttribute('aria-label') === 'Add Home Side, To win, to the builder' && d.activeElement === a2,
              `${how}: a leg's Add, pressed while the leg is in the builder, did not take that leg alone out, or lost the focus: ` + Object.keys(w.eval('S').parlay).join());
            if (a2) { a2.click(); await wait(30); }
            const a3 = legBtn(mlKey2), L = w.eval('S').parlay[mlKey2];
            chk(!!L && Object.keys(w.eval('S').parlay).length === 2 && L.price === ML_G2.h && L.src === 'real' && L.stat === 'ml' && L.team === g2.h
              && !!a3 && a3.getAttribute('aria-pressed') === 'true' && txt(a3) === 'Added' && a3.getAttribute('aria-label') === 'Remove Home Side, To win, from the builder' && d.activeElement === a3,
              `${how}: a leg's Add did not put that leg in the builder at the game's own moneyline, or does not read Added with the focus on it: ` + JSON.stringify(L)); } }
        /* (app v118) an Elo pick's Finish (data-pc-finish="sp|<unit>:elo-<level>") opens the card on the level as the tab
           shows it, as an Elo pick: its kicker "<Label> Elo pick · <game>", every leg with its book price, the price its
           sums give, the chance the Elo's (the book's fair chance first, then "Elo says" and the price's), what the Bet
           amount pays, and both legs on DraftKings' slip at their own ids, in the card's order; Escape gives the focus back
           to the Finish. Its Add to builder leaves exactly its legs in the builder, the focus kept on it. eloCard: what the
           card holds, against a level (t, its legs as drawn) and its fair chance, the Elo chance worked by the builder's own
           sums on the legs' Elo chances (pe) */
        const fmtL = p => p > 0 ? '+' + p : '−' + Math.abs(p), mny2 = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const DK_OF = { 'card-rb': DK_RBS.over, 'card-wr': DK_WR, 'card-te': DK_TE };
        const eloCard = (t, fair, kick, stake, dkIds) => { const view = d.getElementById('pcView'), lis = view ? [...view.querySelectorAll('.pc-legs > li')] : [], bad = [];
          const L = PO(t.legs.map(l => ({ ...l }))), p = PP(L.map(l => ({ ...l, p: l.pe }))).corr, dec = PD(L.map(l => ({ leg: l, ml: l.price })));
          if (md.hidden) return 'the card did not open';
          if (txt(view.querySelector('.pc-kick')) !== kick) bad.push(`its kicker is "${txt(view.querySelector('.pc-kick'))}", not "${kick}"`);
          const pr = w.eval('fmtML')(w.eval('decToML')(dec)).replace('-', '−'); if (txt(view.querySelector('.pc-price')) !== pr) bad.push(`its price is ${txt(view.querySelector('.pc-price'))}, not ${pr}`);
          if (lis.length !== L.length || !L.every(l => lis.some(li => txt(li.querySelector('.pc-who')) === l.name && txt(li.querySelector('.pc-what')) === l.label && txt(li.querySelector('.pc-lp')).startsWith(fmtL(l.price)))))
            bad.push(`its legs are ${lis.map(li => txt(li)).join(' | ')}, not ${L.map(l => l.name + ' ' + l.label + ' ' + fmtL(l.price)).join(' | ')}`);
          const ch = `Fair chance all ${L.length} land ${(fair * 100).toFixed(1)}% Elo says ${(p * 100).toFixed(1)}% · the price says ${(100 / dec).toFixed(1)}%`;
          if (!txt(view.querySelector('.pc-chance')).startsWith(ch)) bad.push(`its chance reads "${txt(view.querySelector('.pc-chance'))}", not "${ch}"`);
          if (cash() !== `${mny2(stake)} | ${mny2(stake * dec)} | +${mny2(stake * dec - stake)}`) bad.push(`it pays ${cash()} on ${mny2(stake)}`);
          if (dkIds) { const want = 'https://sportsbook.draftkings.com/?outcomes=' + lis.map(li => dkIds[(L.find(l => l.name === txt(li.querySelector('.pc-who'))) || {}).pid] || 'none').map(x => x.replace(/#/g, '%23')).join('+');
            if (d.getElementById('pcDk').getAttribute('href') !== want) bad.push(`Open in DraftKings is ${d.getElementById('pcDk').getAttribute('href')}, not ${want}`); }
          return bad.length ? bad.join('; ') : null; };
        { const ef = d.querySelector(`#spPanel [data-pc-finish="sp|${g2.id}:elo-safe"]`);
          if (ef) { ef.click(); await wait(20); }
          const bad = ef ? eloCard(NIGHT_E, 0.30, `Safe Elo pick · ${g2.a} at ${g2.h}`, 12.5, DK_OF) : 'no Finish on the Elo Safe';
          chk(!bad, `${how}: Finish on the night game's Elo Safe does not open the card on it as an Elo pick: ` + bad);
          if (ef) { d.getElementById('pcDownload').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            chk(md.hidden && d.activeElement === ef, `${how}: Escape on an Elo pick's card did not close it, or the focus did not go back to its Finish`); }
          const ea = d.querySelector(`#spPanel [data-sp-add="${g2.id}:elo-safe"]`);
          if (ea) { ea.click(); await wait(30); }
          const inB = Object.keys(w.eval('S').parlay).sort().join();
          chk(!!ea && inB === NIGHT_E.legs.map(l => l.key).sort().join() && d.activeElement === d.querySelector(`#spPanel [data-sp-add="${g2.id}:elo-safe"]`),
            `${how}: an Elo pick's Add to builder did not leave exactly its legs in the builder, or lost the focus: ${inB}`); }
        /* locked: from 2 hours before kickoff the set is the site's, the record's entry for the game (the
           props job's suggest_ledger.json, its prime map, made up here: this smoke's fetch stub serves no
           record), taken before the lock on other legs than the live set's, the away money line and the
           runner's line; the page's clock is moved to an hour before kickoff (Date.now alone: kickoff()
           reads the schedule's own times) and set back after */
        { const realNow = w.Date.now, kIso = new Date(KICK).toISOString().replace(/\.\d{3}Z$/, 'Z'), taken = new Date(KICK - 5.25 * 3600e3).toISOString().replace(/\.\d{3}Z$/, 'Z');
          const legOut = (l, fair) => ({ gid: l.gid, week: wk, pid: l.pid, team: l.team, grp: l.grp, stat: l.stat, k: l.k, side: l.side, main: !!l.main, price: l.price, src: 'real', name: l.name, label: l.label, p: l.p, fair, fair_est: false, thin: false, market: false });
          const away = { gid: g2.id, pid: 'team:' + g2.a, team: g2.a, grp: 'TEAM', stat: 'ml', k: 0, side: 'over', main: false, price: ML_G2.a, name: 'Away Side', label: 'To win', p: 0.5 };
          /* the Safe pair as the job keeps it: its chance and price the builder's sums on its legs, rounded as the
             record rounds them (4 places, 3); the card states the builder's own sums on the legs as kept, which Add
             to builder then pays, never the rounded figures */
          const safeLegs = [legOut(away, 0.45), legOut(builder(side)[rbKey], 0.5)], L2 = w.eval('pbOrder')(safeLegs.map(l => ({ ...l, key: `${l.gid}|${l.pid}|${l.stat}` })));
          const pj = w.eval('parlayProb')(L2).corr, dj = w.eval('parlayDec')(L2.map(l => ({ leg: l, ml: l.price }))), mny = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          /* (app v118) the record's Elo picks for the game beside its set, as the job keeps them (spTierOut): each leg with
             its Elo chance (pe), the level's Elo chance all land and its price rounded as the record rounds them, its fair
             chance the book's at the lock; the runner's line and the tight end's, so the record's are told from the live
             ones (the runner's and the receiver's) */
          const eloOut = l => ({ gid: l.gid, week: wk, pid: l.pid, team: l.team, grp: l.grp, stat: l.stat, k: l.k, side: l.side, main: !!l.main, price: l.price, src: 'real', name: l.name, label: l.label, p: l.p, pe: l.pe, fair: null, fair_est: false, thin: null, market: null });
          const REC_E = eloSafe([RB_E, TE_E], 0.27);
          const eloRec = [{ id: 'elo-safe', label: 'Safe', n: 2, floor: 0.35, legs: REC_E.legs.map(eloOut), p: Math.round(REC_E.p * 1e4) / 1e4, fair: 0.27, fair_est: false, dec: Math.round(REC_E.dec * 1e3) / 1e3, likeliest: false, thin: 0, mkt: 0 },
            ...ELO_EMPTY.map(([id, label, n, floor]) => ({ id: 'elo-' + id, label, n, floor, why: eloWhy('in this game', n) }))];
          const entry = { season: SEA, week: wk, gid: g2.id, away: g2.a, home: g2.h, kickoff: kIso, lock: new Date(LOCK).toISOString().replace(/\.\d{3}Z$/, 'Z'), baked_at: taken, pool: {}, taken_at: taken,
            tiers: [{ id: 'safe', label: 'Safe', n: 2, floor: 0, legs: safeLegs, p: Math.round(pj * 1e4) / 1e4, fair: 0.25, fair_est: false, dec: Math.round(dj * 1e3) / 1e3, likeliest: false, thin: 0, mkt: 0 },
              ...[['med', 'Medium', 3, 0.25], ['aggr', 'Aggressive', 4, 0.12], ['xtrm', 'Extreme', 5, 0.05]].map(([id, label, n, floor]) => ({ id, label, n, floor, why: WHY }))], elo: eloRec };
          const recKey = `${SEA}|${String(wk).padStart(2, '0')}|${kIso}|${g2.id}`;
          w.eval(`PB_REC=${JSON.stringify({ prime: { [recKey]: entry } })}; PB_REC_DONE=true; PB_REC_STATE=spState();`);
          w.Date.now = () => KICK - 3600e3;
          w.eval('renderParlay()'); await wait(30);
          /* (app v118) with a record read, each section's record is drawn under its own heading, a row for the model's
             parlays and one for the Elo picks, each "None graded yet" where nothing of it is graded (this entry has no
             grade yet, and the Sunday slot no entry), and no record at the tab's head */
          { const rows = sec => { const r = d.querySelector(`#spSets section.sp-sec[data-sp-sec="${sec}"] > h3.sp-sech + div.sp-rec[data-sp-recsec="${sec}"]`);
              return !r ? 'no record under its heading' : r.hidden ? 'hidden' : [...r.querySelectorAll(':scope > .bar[data-sp-reckind]')].map(b => `${b.dataset.spReckind}:${txt(b.querySelector('.sp-reck'))}:${[...b.querySelectorAll('[data-sp-rec]')].map(x => x.dataset.spRec + '=' + txt(x)).join('+')}`).join(' / '); };
            const want = sec => `model:Model parlays:${sec}:model:none=None graded yet / elo:Elo picks:${sec}:elo:none=None graded yet`;
            chk(rows('night') === want('night') && rows('slot') === want('slot') && !d.querySelector('#spHead .sp-rec, #spHead [data-sp-rec]'),
              `${how}: with a record read and nothing graded, a section's record is not its two rows saying none is graded yet, under its heading: ${rows('night')} | ${rows('slot')}`); }
          const ph = set() && set().querySelector('[data-sp-phase]');
          /* (app v113) one short line: the record's set is the one shown (its legs, below), "Locked since Thu 6:15 PM ET." */
          chk(!!ph && ph.getAttribute('data-sp-phase') === 'locked' && txt(ph) === 'Locked since Thu 6:15 PM ET.' && !!ph.querySelector('.sp-lockmark') && txt(ph.querySelector('.sp-lockmark')) === 'Locked',
            `${how}: an hour before kickoff the set is not marked Locked in one short line, "Locked since Thu 6:15 PM ET.": ` + txt(ph));
          const lf = d.querySelector(`#spPanel [data-pc-finish="sp|${fid}"]`);
          if (lf) { lf.click(); await wait(20); }
          chk(!!lf && !md.hidden && txt(d.querySelector('#pcView .pc-kick')) === `Safe parlay · ${g2.a} at ${g2.h}` && txt(d.querySelector('#pcView .pc-price')) === w.eval('fmtML')(w.eval('decToML')(dj)).replace('-', '−')
            && ['Away Side', '+115', 'Card Runner', rbLabel, '+105'].every(t => txt(d.getElementById('pcView')).includes(t)) && !txt(d.getElementById('pcView')).includes('Home Side')
            && txt(d.querySelector('#pcView .pc-chance')).startsWith(`Fair chance all 2 land 25.0% model says ${(pj * 100).toFixed(1)}% · the price says `)
            && cash() === `${mny(12.5)} | ${mny(12.5 * dj)} | +${mny(12.5 * dj - 12.5)}`
            && d.getElementById('pcDk').getAttribute('href') === 'https://sportsbook.draftkings.com/?outcomes=' + [DK_ML2.a, DK_RB].map(x => x.replace(/#/g, '%23')).join('+'),
            `${how}: Finish on a locked set does not open the record's set, its legs, price, chance and the amount: ` + txt(d.getElementById('pcView')) + ' / ' + d.getElementById('pcDk').getAttribute('href'));
          /* the focus goes back to the set's Finish: the button that opened the card, or the one standing for it where the
             card's check of DraftKings' lines (a press, as it opens) redrew the tab under it */
          if (lf) { d.getElementById('pcClose').click(); chk(d.activeElement === lf || d.activeElement === d.querySelector(`#spPanel [data-pc-finish="sp|${fid}"]`), `${how}: closing the locked set's card did not give the focus back to its Finish`); }
          /* (its own game alone: a real prime-time game whose lock has passed with no entry in the record planted here,
             as Sunday night's game from 22:20 UTC, is the page's own and kept, rightly; the check read the whole key
             until the night of 18 October 2026, when it failed on main for that) */
          { let kept = null; try { kept = JSON.parse(w.localStorage.getItem('props_sp_lock_v1') || 'null'); } catch (e) { kept = 'junk'; }
            chk(kept !== 'junk' && !(kept && kept.games && kept.games[g2.id]), `${how}: a locked set the record has was kept in the browser as the page's own`); }
          /* the record keeps both legs as Value picks (thin false, no total): the locked card marks each Value (app v112) */
          chk(!!set() && [...set().querySelectorAll('[data-pb-tier="safe"] .pb-legs li')].length === 2 && [...set().querySelectorAll('[data-pb-tier="safe"] .pb-legs li')].every(li => li.querySelectorAll('i.pb-valmark').length === 1 && txt(li.querySelector('i.pb-valmark')) === 'Value')
            && !/\bthin[ -]edge\b|\bno edge\b/i.test(txt(set())), `${how}: the locked set's legs, kept as Value picks, are not each marked Value, or the set still says thin edge or no edge`);
          /* (app v118) the locked Elo picks are the record's too (its entry's elo), drawn under the set's, with no line saying
             they are this browser's own; Finish on the Elo Safe opens the card on the record's legs, its Elo chance worked
             again by the builder's own sums on their Elo chances as kept, its fair chance the one kept */
          const eSafe = () => set() && set().querySelector('.pb-tiers[data-sp-kind="elo"] [data-pb-tier="elo-safe"]');
          const keptG = () => { let k = null; try { k = JSON.parse(w.localStorage.getItem('props_sp_lock_v1') || 'null'); } catch (e) { return 'junk'; } return k && k.games ? k.games[g2.id] || null : null; };
          chk(!!eSafe() && /Card Runner/.test(txt(eSafe())) && /Card End/.test(txt(eSafe())) && !/Card Catcher/.test(txt(eSafe())) && !set().querySelector('[data-sp-phase="eloown"]'),
            `${how}: an hour before kickoff the Elo picks drawn are not the record's (the runner's and the tight end's lines), or say they are this browser's own: ` + txt(eSafe()));
          { const ef = eSafe() && eSafe().querySelector(`[data-pc-finish="sp|${g2.id}:elo-safe"]`);
            if (ef) { ef.click(); await wait(20); }
            const bad = ef ? eloCard({ legs: REC_E.legs }, 0.27, `Safe Elo pick · ${g2.a} at ${g2.h}`, 12.5, DK_OF) : 'no Finish on the locked Elo Safe';
            chk(!bad, `${how}: Finish on the locked Elo Safe does not open the card on the record's Elo pick: ` + bad);
            if (ef) d.getElementById('pcClose').click(); }
          /* where the record's entry carries no Elo picks (one taken before the job took them), the page builds its own at
             the lock, once, and keeps them in the browser beside nothing of the game's set (the set is the record's), with
             one line saying so, word for word; Finish opens the card on them. An entry that carries them then takes their
             place, and the browser keeps none */
          { const { elo: _none, ...noElo } = entry;
            w.eval(`PB_REC=${JSON.stringify({ prime: { [recKey]: noElo } })}; PB_REC_STATE=spState(); renderParlay()`); await wait(30);
            const line = set() && set().querySelector('p.sp-lock[data-sp-phase="eloown"]'), kg = keptG();
            chk(!!line && txt(line) === 'This browser’s own Elo picks: the site’s were not published in time, so the record does not grade them.' && txt(set().querySelector('[data-sp-phase]')) === 'Locked since Thu 6:15 PM ET.'
              && !!kg && kg !== 'junk' && kg.eloOwn === true && Array.isArray(kg.elo) && kg.elo.map(t => t && t.id).join() === 'elo-safe,elo-med,elo-aggr,elo-xtrm' && Array.isArray(kg.elo[0].legs) && kg.elo[0].legs.map(l => l.pid).sort().join() === 'card-rb,card-wr'
              && !kg.own && !kg.tiers && /Card Catcher/.test(txt(eSafe())) && !/Card End/.test(txt(eSafe())),
              `${how}: with no Elo picks in the record's entry, the page's own are not drawn, kept in the browser alone (beside the record's set) and said in one line: ${txt(line)} / ${JSON.stringify(kg).slice(0, 200)}`);
            const ef = eSafe() && eSafe().querySelector(`[data-pc-finish="sp|${g2.id}:elo-safe"]`);
            if (ef) { ef.click(); await wait(20); }
            const bad = ef ? eloCard(NIGHT_E, 0.30, `Safe Elo pick · ${g2.a} at ${g2.h}`, 12.5, DK_OF) : 'no Finish on this browser\'s own Elo Safe';
            chk(!bad, `${how}: Finish on this browser's own locked Elo Safe does not open the card on it: ` + bad);
            if (ef) d.getElementById('pcClose').click();
            w.eval(`PB_REC=${JSON.stringify({ prime: { [recKey]: entry } })}; PB_REC_STATE=spState(); renderParlay()`); await wait(30);
            const kg2 = keptG();
            chk(kg2 !== 'junk' && !(kg2 && (kg2.elo || kg2.eloOwn || kg2.own)) && !!eSafe() && /Card End/.test(txt(eSafe())) && !/Card Catcher/.test(txt(eSafe())) && !set().querySelector('[data-sp-phase="eloown"]'),
              `${how}: the record's Elo picks, once read, did not take the place of this browser's own: ${JSON.stringify(kg2).slice(0, 200)} / ${txt(eSafe())}`); }
          w.Date.now = realNow; w.eval('PB_REC=null; renderParlay()'); await wait(20); }
        /* (app v118) the Sunday slot (the owner's call of 19 October 2026: "I would like it to have ELO picks for the slot of
           Sunday games"), on a slot of the fixture's own: week wk's games but the two pinned above moved to Sunday 3 January
           2100, the first at 9:30 am Eastern (a game abroad), the last two at 4:05 and 4:25 pm and the rest at 1:00, so by
           the rule it goes up at 6:00 am on the Friday after this Thursday night game and locks at 7:30 am on the Sunday.
           Its model Safe is the home money lines of its first two games, its Elo Safe two made-up players of those games
           (the stand-ins above read them from here), each pair priced by the builder's own sums, the rest empty. With no
           record read, the page's clock is moved through it: the Thursday an hour before this night game's kickoff (not
           up), the Saturday at noon (up, live), the Sunday at 8:00 am (locked, this browser's own set), at 10:00 am (under
           way) and at 5:00 pm (past its last kickoff). At each, the section is held to the rule worked out here (slotHeldL
           on slotNextL: its line word for word, its head, the games and every time the rule's); up and live, Finish on its
           Elo Safe opens the card as "Safe Elo pick · the Sunday slot", with the Elo chance and every leg, and on its model
           Safe as "Safe parlay · the Sunday slot"; locked, a leg's own Add puts the leg in as it was locked, never the line
           as it stands now; under way, its levels are drawn as they locked with nothing to add or finish, and before it is
           up, under way and after it, no level of it can be finished (spTier). The check fails unless it met all five.
           Everything moved is put back */
        { const S1 = w.eval('S'), mv = S1.sched.filter(x => +x.w === wk && x.id !== g1.id && x.id !== g2.id), was = mv.map(x => [x, x.d, x.t, x.mlh]);
          try {
            chk(mv.length >= 2, `${how}: week ${wk} has ${mv.length} games beside the two pinned ones, too few to make a Sunday slot of`);
            mv.forEach((x, i) => { x.d = '2100-01-03'; x.t = i === 0 ? '09:30' : i === mv.length - 1 ? '16:25' : i === mv.length - 2 && mv.length >= 4 ? '16:05' : '13:00'; });
            const U0 = slotL(S1.sched, wk, SEA), G = U0 ? U0.games : [], TN = w.eval('TEAM_NAMES'), phases = [];
            if (U0 && G.length >= 2) {
              const mlLeg = (g, price, p) => ({ key: `${g.id}|team:${g.h}|ml`, gid: g.id, pid: 'team:' + g.h, stat: 'ml', k: 0, side: 'over', main: false, p, price, src: 'real', mu: null, name: TN[g.h] || g.h, pos: 'Game', grp: 'TEAM', team: g.h, opp: g.a, week: wk, label: 'To win' });
              /* (app v121, the owner's call of 19 October 2026: "the legs need to be part of the same game parlay only") each
                 of the slot's levels is one game's legs: its model Safe the first game's home money line and its total, its
                 Elo Safe two players of the second game, so each card names its own game */
              const totLeg = g => ({ key: `${g.id}|game|total`, gid: g.id, pid: 'game', stat: 'total', k: 44.5, side: 'over', main: true, p: 0.55, price: -110, src: 'real', mu: 44.5, name: `${TN[g.a] || g.a} at ${TN[g.h] || g.h}`, pos: 'Game', grp: 'TEAM', team: g.a, opp: g.h, week: wk, label: 'Over 44.5 points' });
              const ML = PO([mlLeg(G[0], -150, 0.64), totLeg(G[0])]).map(l => ({ ...l })), mc = PP(ML).corr, mdec = PD(ML.map(l => ({ leg: l, ml: l.price })));
              const MLL = ML.find(l => l.stat === 'ml');
              /* the money line's game's home money line as it stands now, moved off the locked leg's price (put back below) */
              G.find(g => g.id === MLL.gid).mlh = -180;
              const SWHY = 'Only 2 legs in any one game of the Sunday slot: a parlay takes one game’s legs, one leg a player, and one side and one total a game.';
              const slotSet = { pref: 2, thin: 0, mkt: 0, far: 0, farDk: 0, noId: 0, moved: 0, plGames: 1, plNoId: 0, tiers: [{ id: 'safe', label: 'Safe', n: 2, floor: 0, legs: ML, corr: mc, indep: mc, dec: mdec, thin: 0, mkt: 0, fair: { p: 0.5, est: false, miss: 0 } },
                ...[['med', 'Medium', 3, 0.25], ['aggr', 'Aggressive', 4, 0.12], ['xtrm', 'Extreme', 5, 0.05]].map(([id, label, n, floor]) => ({ id, label, n, floor, why: SWHY }))] };
              SLOT_E.ids = G.map(g => g.id).sort().join();
              SLOT_E.safe = eloSafe([eloLeg(G[1].id, 'slot-qb', 'passing_yards', 224.5, -110, 0.6, 'Slot Passer', G[1].h, G[1].a, 'QB', 'passing yards'),
                eloLeg(G[1].id, 'slot-wr', 'receiving_yards', 59.5, 100, 0.57, 'Slot Catcher', G[1].a, G[1].h, 'WR', 'receiving yards')], 0.33);
              /* a slot card with legs names its game in its head, right after the legs pill: "<away> at <home> · <its kickoff
                 in Eastern time>", data-pb-tgame its id (app v121); an empty level and a night game's cards none. tgameOf: the
                 problems on unit u's level id, whose legs are of game g (null: no legs) */
              const tgameOf = (u, id, g) => { const c = u && u.querySelector(`.pb-tiers[data-sp-kind="${/^elo-/.test(id) ? 'elo' : 'model'}"] > .pb-tier.${id}`), s = c ? [...c.querySelectorAll('.pb-tgame, [data-pb-tgame]')] : [];
                if (!c) return `no ${id} card`;
                if (!g) return s.length ? `the empty ${id} names a game` : null;
                const want = `${TN[g.a] || g.a} at ${TN[g.h] || g.h} · ${etSayL(etKickL(g))}`;
                return s.length === 1 && s[0].matches('.pb-th > span.pb-tgame') && s[0].getAttribute('data-pb-tgame') === g.id && txt(s[0]) === want && !!s[0].previousElementSibling && s[0].previousElementSibling.matches('span.pill')
                  ? null : `the ${id} card names ${s.map(x => x.outerHTML).join(' ') || 'no game'}, not "${want}" (${g.id}) after its legs pill`; };
              w.__spOther = g => g && g.slot && Array.isArray(g.games) && g.games.map(x => x.id).sort().join() === SLOT_E.ids ? w.JSON.parse(JSON.stringify({ gid: g.id, ...slotSet })) : null;
              const sid = U0.id, moments = [['the Thursday an hour before the night game', KICK - 3600e3], ['the Saturday at noon', etAtL('2100-01-02', '12:00')],
                ['the Sunday at 8:00 am', etAtL('2100-01-03', '08:00')], ['the Sunday at 10:00 am', etAtL('2100-01-03', '10:00')], ['the Sunday at 5:00 pm', etAtL('2100-01-03', '17:00')]];
              for (const [when, t] of moments) {
                w.Date.now = () => t; w.eval('SP_SHOWN=null; renderParlay()'); await wait(30);
                const s = slotNow(), bad = slotHeldL(d, s.U, s.now, s.wk, s.over, SEA, true);
                const ph = !s.U ? 'none' : !s.U.up ? 'wait' : t < s.U.lock ? 'live' : t < s.U.first ? 'locked' : 'under';
                phases.push(ph);
                chk(!bad, `${how}: ${when}, the Sunday slot's section is not as its rule has it (${s.U ? s.U.id + ' ' + ph : 'none to come, week ' + s.wk}): ` + bad);
                const u = d.querySelector(`#spSets [data-sp-game="${sid}"]`), fin = ['safe', 'med', 'aggr', 'xtrm'].flatMap(id => [id, 'elo-' + id]).filter(id => w.eval('spTier')(`${sid}:${id}`) != null);
                if (ph === 'wait' || ph === 'none' || ph === 'under')
                  chk(!fin.length && !(u && u.querySelector('[data-sp-add], [data-pc-finish], [data-pb-leg]')), `${how}: ${when}, the Sunday slot (${ph}) still lets ${fin.join(', ') || 'a card of it'} be added or finished`);
                if (ph === 'locked') {
                  /* a leg's own Add on the locked slot puts that leg in as it was locked, its line and price, never the line
                     as it stands now: the first leg's game has its home money line moved to -180 since (put back below),
                     its locked leg is at its own price */
                  w.eval('S.parlay={}; save(); renderParlay()'); await wait(20);
                  const key = MLL.key, uu = d.querySelector(`#spSets [data-sp-game="${sid}"]`), b = uu && uu.querySelector(`.pb-tier[data-pb-tier="safe"] [data-pb-leg="${key}"]`);
                  if (b) { b.click(); await wait(30); }
                  const L = w.eval('S').parlay[key];
                  chk(!!b && !!L && L.price === MLL.price && L.stat === 'ml' && L.team === MLL.team && Object.keys(w.eval('S').parlay).length === 1,
                    `${how}: ${when}, a leg's own Add on the locked Sunday slot does not put that leg in as it was locked (${fmtL(MLL.price)}), but ${L ? 'at ' + fmtL(L.price) : 'nothing'}`);
                  w.eval('S.parlay={}; save(); renderParlay()'); await wait(20); }
                if (ph === 'under')
                  chk(!!u && ['safe', 'elo-safe'].every(id => !!u.querySelector(`.pb-tier[data-pb-tier="${id}"] .pb-legs li`)) && !u.querySelector('.pb-acts'),
                    `${how}: ${when}, the Sunday slot under way does not show its levels as they locked, with no Add to builder or Finish: ` + txt(u).slice(0, 200));
                if (ph === 'live') {
                  { const bad = [['safe', G[0]], ['elo-safe', G[1]], ['med', null], ['elo-med', null]].map(([id, g]) => tgameOf(u, id, g)).filter(Boolean);
                    chk(!bad.length, `${how}: ${when}, the Sunday slot's cards do not each name their own game after the legs pill, or an empty level names one: ` + bad.join('; ')); }
                  const ef = u && u.querySelector(`[data-pc-finish="sp|${sid}:elo-safe"]`);
                  if (ef) { ef.click(); await wait(20); }
                  const bad2 = ef ? eloCard(SLOT_E.safe, 0.33, 'Safe Elo pick · the Sunday slot', 12.5, null) : 'no Finish on its Elo Safe';
                  chk(!bad2, `${how}: ${when}, Finish on the Sunday slot's Elo Safe does not open the card on it as an Elo pick: ` + bad2);
                  if (ef) d.getElementById('pcClose').click();
                  /* the tab as the card's check of DraftKings' lines (a press, as the card opens) redrew it under the card */
                  const mf = d.querySelector(`#spSets [data-sp-game="${sid}"] [data-pc-finish="sp|${sid}:safe"]`);
                  if (mf) { mf.click(); await wait(20); }
                  chk(!!mf && !md.hidden && txt(d.querySelector('#pcView .pc-kick')) === 'Safe parlay · the Sunday slot' && d.querySelectorAll('#pcView .pc-legs > li').length === 2 && ML.every(l => txt(d.getElementById('pcView')).includes(l.name)) && !gameBtns(null),
                    `${how}: ${when}, Finish on the Sunday slot's model Safe does not open the card on it: ` + txt(d.querySelector('#pcView .pc-head')));
                  if (mf) d.getElementById('pcClose').click(); }
              }
            }
            chk(phases.join() === 'wait,live,locked,under,none', `${how}: the fixture's Sunday slot did not pass through each of its phases by the rule (${phases.join(', ') || 'no slot made'}): the check met fewer than it holds`);
          } finally { was.forEach(([x, dd, tt, mh]) => { x.d = dd; x.t = tt; if (mh === undefined) delete x.mlh; else x.mlh = mh; }); SLOT_E.ids = null; w.__spOther = null; w.Date.now = realNow0; w.eval('SP_CACHE=new Map(); SP_SHOWN=null; renderParlay()'); await wait(20); } }
        } finally { w.Date.now = realNow0; w.eloUnit = w.__eloUnitL; delete w.__eloUnitL; w.__spOther = null; w.eval('PB_REC=null; spOn=window.__spOnL; delete window.__spOnL; SP_SHOWN=null; renderParlay()'); }
        await wait(20);
        chk(w.eval('S').saved.map(p => p.id).join() === 'saved-before' && reads(), `${how}: finishing a suggestion saved it`); }
    }
    /* ---- J2. the card checks DraftKings' current lines as it opens (19 October 2026, the owner on Monday night's
       Commanders at 49ers: "same thing again.... put in that link and its only showing" one leg of four, the other
       three ids the morning's pull had read at numbers DraftKings had moved off by the evening). A parlay of seven legs
       on the two pinned games, each with DraftKings' id at its own line as the pull read it (the player ids two hours
       ago, the game lines five): the first game's total, Over 43.5, and on the second the runner's rushing yards main
       line (Over 64.5), a receiver's receiving yards main line (Over 55.5), his receptions (Over 5.5) and his anytime
       touchdown, a tight end's 4+ receptions (a rung: DraftKings' Over 3.5) and his 2+ touchdowns (on his anytime
       touchdown). This ESPN answers the card's read with DraftKings' total moved to 44.5 (its over and under with ids of
       their own), the runner's line moved to 66.5 and the tight end's to 4.5, the receiver's receiving yards where the
       pull had them, no receptions line of his at all (the id stands: a read with no line says nothing) and his
       touchdown offered, each player under an ESPN id of his own; the first game has no player lines posted, and a third
       game of the week (the payload's own, pinned to the far future and its score taken off, else one made up between
       two clubs the two games do not have) is on the scoreboard and never asked about. Its answers can be held (until the
       check lets them go, or a request's own timeout aborts it, as a real fetch is), and the scoreboard can fail. Every
       expectation is worked out here from those made-up lines, the moved rule's words, the cap (10 seconds, on the real
       clock) and the card's own lines, the check's own copies. After the review of 19 October 2026: the note while the
       card reads (the waiting line alone, no leg's link), a rung moved off its own number naming its own bet, the page
       redrawn once a read, the page kept from scrolling under a card that waited for a press, the focus a redraw takes
       found again, the outcome in the status line, a stale read never painting a newer card, and a payload baked before
       ids still read.
       Merged with app v121 (the owner's calls of 19 October 2026: "the legs need to be part of the same game parlay only,
       and anytime there's a mix it bombs the hyperlink"): the seven legs are the first game's total beside six legs of the
       second, a same-game parlay mixed with another game, the owner's own case, so once the check settles the card has no
       link for them all but a button for each game's legs (the games in the order their first legs come, each its legs in
       the card's order, titled with its own game's oldest read), the note's first paragraph the mix's, and Share link a
       link a game; while it reads, the game buttons stay hidden and only the waiting Open in DraftKings is shown (the read
       can change the plan), and the focus on it then goes to the first game's button. Each held here at every stage on
       this check's own made-up ids and its own copy of the plan (the section's gamesIn, gameBtnsIn, multiNote,
       multiLines), the note's blocks (partsOf) and the check's line (checkHeld) */
    {
      const CAP_MS = 10000, FRESH_MS = 2 * 60e3;
      const ID = { tot: 'J2#o435', totU: 'J2#u435', tot2: 'J2#o445', tot2U: 'J2#u445', rb: 'J2#rb645', rbU: 'J2#rb645u', wr: 'J2#wr555', wrRec: 'J2#wrrec55', wrTd: 'J2#wrtd', te: 'J2#te35', teTd: 'J2#tetd' };
      const AID = { 'card-rb': '9101', 'card-wr': '9102', 'card-te': '9103' }, EV3 = '7103';
      /* the third game: the week's own, else one made up between two clubs neither pinned game has */
      const g3r = (byWeek[wk] || []).find(x => x !== g1 && x !== g2), used = new Set([g1.a, g1.h, g2.a, g2.h]);
      const pair3 = g3r ? null : (P0.sched.find(x => !used.has(x.a) && !used.has(x.h) && x.a !== x.h) || {});
      const g3 = g3r || { id: `${SEA}_${String(wk).padStart(2, '0')}_${pair3.a}_${pair3.h}`, w: wk, a: pair3.a, h: pair3.h };
      const dk2 = () => ({ [String(wk)]: {
        [g1.id]: { event: '880001', 'game|total|over|43.5': ID.tot, 'game|total|under|43.5': ID.totU, glat: AT_G },
        [g2.id]: { event: '880002', 'card-rb|rushing_yards|over|64.5': ID.rb, 'card-rb|rushing_yards|under|64.5': ID.rbU, 'card-wr|receiving_yards|over|55.5': ID.wr,
          'card-wr|receptions|over|5.5': ID.wrRec, 'card-wr|any_td': ID.wrTd, 'card-te|receptions|over|3.5': ID.te, 'card-te|any_td': ID.teTd, at: AT_P, glat: AT_G } } });
      const pin2 = P => { pin(P, 'over');
        for (const x of P.sched) { if (x.id === g1.id) { x.tot = 43.5; x.tov = -110; x.tou = -110; }
          /* the three games readable at any hour of any season: to come, with no score */
          if (x.id === g1.id || x.id === g2.id || x.id === g3.id) { delete x.hs; delete x.as; }
          if (x.id === g3.id) { x.d = '2099-12-31'; x.t = '13:00'; } }
        if (!g3r) P.sched.push({ id: g3.id, w: wk, d: '2099-12-31', t: '13:00', a: g3.a, h: g3.h });
        P.espn_ids = Object.fromEntries(Object.entries(AID).map(([pid, aid]) => [aid, pid])); P.dk = dk2(); return P; };
      const L2 = o => Object.assign({ gid: g2.id, side: 'over', main: true, src: 'real', pos: 'WR', grp: 'WR', team: g2.h, opp: g2.a, week: wk }, o);
      const totKey = `${g1.id}|game|total`, wrKey = `${g2.id}|card-wr|receiving_yards`, wrRecKey = `${g2.id}|card-wr|receptions`;
      const legs2 = {
        [totKey]: { gid: g1.id, pid: 'game', stat: 'total', k: 43.5, side: 'over', main: true, p: 0.5, price: -110, src: 'real', mu: 43.5, name: `${g1.a} at ${g1.h}`, pos: 'Game', grp: 'TEAM', team: g1.a, opp: g1.h, week: wk, label: 'Over 43.5 points' },
        [rbKey]: builder('over')[rbKey],
        [wrKey]: L2({ pid: 'card-wr', stat: 'receiving_yards', k: 55.5, p: 0.53, price: -110, mu: 58, name: 'Card Receiver', label: 'Over 55.5 receiving yards' }),
        [wrRecKey]: L2({ pid: 'card-wr', stat: 'receptions', k: 5.5, p: 0.5, price: -115, mu: 5.6, name: 'Card Receiver', label: 'Over 5.5 receptions' }),
        [`${g2.id}|card-wr|any_td`]: L2({ pid: 'card-wr', stat: 'any_td', k: 1, main: false, p: 0.36, price: 175, mu: null, name: 'Card Receiver', label: 'Scores a touchdown' }),
        [`${g2.id}|card-te|receptions`]: L2({ pid: 'card-te', stat: 'receptions', k: 4, main: false, p: 0.45, price: 120, src: 'est', mu: 3.6, name: 'Card End', pos: 'TE', grp: 'TE', label: '4+ receptions' }),
        [`${g2.id}|card-te|any_td`]: L2({ pid: 'card-te', stat: 'any_td', k: 2, main: false, p: 0.05, price: 1400, src: 'est', mu: null, name: 'Card End', pos: 'TE', grp: 'TE', label: '2+ touchdowns' }) };
      /* the ESPN of this check: what the card's read is answered, held or failed */
      const net = { hold: null, fail: false, log: [] };
      const gate = () => { let go; const p = new Promise(r => { go = r; }); return { p, go }; };
      const ath = aid => ({ $ref: `http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${SEA}/athletes/${aid}?lang=en&region=us` });
      const items = [{ type: { id: '12' }, athlete: ath(AID['card-rb']), current: { target: { value: 66.5 } } }, { type: { id: '12' }, athlete: ath(AID['card-rb']), current: { target: { value: 66.5 } } },
        { type: { id: '13' }, athlete: ath(AID['card-wr']), current: { target: { value: 55.5 } } }, { type: { id: '31' }, athlete: ath(AID['card-wr']) },
        { type: { id: '14' }, athlete: ath(AID['card-te']), current: { target: { value: 4.5 } } }];
      const lk = (ev, oc) => ({ href: `https://sportsbook.draftkings.com/gateway?preurl=${encodeURIComponent(`https://sportsbook.draftkings.com/event/${ev}?outcomes=${encodeURIComponent(oc)}`)}` });
      const odds1 = { provider: { id: '100' }, total: { over: { close: { line: 'o44.5', odds: '-110', link: lk('880001', ID.tot2) } }, under: { close: { line: 'u44.5', odds: '-110', link: lk('880001', ID.tot2U) } } } };
      const answer = s => { if (/\/scoreboard\?dates=/.test(s)) return net.fail ? [500, {}] : [200, { events: [sbEv(g1, EVT[g1.id], odds1), sbEv(g2, EVT[g2.id]), sbEv(g3, EV3)] }];
        const m = /\/events\/(\d+)\/competitions\/\d+\/odds\/100\/propBets\?/.exec(s);
        if (m) return m[1] === EVT[g2.id] ? [200, { count: items.length, pageIndex: 1, pageSize: 1000, pageCount: 1, items }] : [404, NO_PROPS];
        return [404, {}]; };
      const esp2 = (s, o) => { if (!/\/scoreboard\?dates=|sports\.core\.api\.espn\.com/.test(s)) return null;
        net.log.push(s); const [code, body] = answer(s), h = net.hold;
        if (!h) return jsonR(code, body);
        return new Promise((res, rej) => { h.p.then(() => res(jsonR(code, body)));
          const sg = o && o.signal; if (sg) sg.addEventListener('abort', () => rej(new Error('The operation was aborted'))); }); };
      const v = await run({ url: URL_PB, pay: pin2, file: { updated: null, games: [], parlays: [] }, esp: esp2,
        seed: x => x.localStorage.setItem(PROP_KEY, JSON.stringify({ stake: 25, saved: [], parlay: legs2 })) });
      const { w, d } = v, rec = stubDraw(w), md = d.getElementById('pcModal'), dkA = d.getElementById('pcDk'), link = d.getElementById('pcLink');
      const note = () => d.getElementById('pcDkNote'), msg = () => txt(d.getElementById('pcMsg')), ckS = () => cardCheck(w) || {}, how = 'the card\'s check of DraftKings\' lines';
      const shared = []; Object.defineProperty(w.navigator, 'share', { value: async x => { shared.push(x); }, configurable: true });
      /* how often the page under the card is drawn again for a read: the page's own espnRedraw, counted */
      w.eval('window.__rd=0; { const r0=window.espnRedraw; window.espnRedraw=function(){ window.__rd++; return r0.apply(this,arguments); }; }');
      const q = w.PARLAY_CARD.quote(), L = q ? q.legs : [], nOf = (pid, stat) => L.findIndex(l => l.pid === pid && l.stat === stat) + 1, NL = Object.keys(legs2).length;
      const n = { tot: nOf('game', 'total'), rb: nOf('card-rb', 'rushing_yards'), wr: nOf('card-wr', 'receiving_yards'), wrRec: nOf('card-wr', 'receptions'), wrTd: nOf('card-wr', 'any_td'), te: nOf('card-te', 'receptions'), teTd: nOf('card-te', 'any_td') };
      chk(L.length === NL && Object.values(n).every(x => x > 0) && !!d.getElementById('pFinish') && !d.getElementById('pFinish').disabled, `${how}: the builder does not hold the ${NL} made-up legs ready to finish: ` + L.map(l => l.pid + ' ' + l.stat).join(', '));
      chk(w.eval(`!!S.sched.find(x=>x.id===${JSON.stringify(g3.id)}&&!gameStarted(x)&&!hasScore(x))`), `${how}: the third game of the week (${g3.id}), which the card must never ask about, is not one to come on the page, so the check could not tell`);
      if (L.length === NL) {
        /* the ids the slip takes, in the card's order (null for a leg on no slip): the pull's, before the read; after it,
           the total on the read's Over 44.5 and the runner and the tight end on no slip. PRE and POST: the ids alone */
        const idsBy = m => [...Array(NL)].map((_, i) => m[Object.keys(n).find(k => n[k] === i + 1)] || null);
        const PRE_IDS = idsBy({ tot: ID.tot, rb: ID.rb, wr: ID.wr, wrRec: ID.wrRec, wrTd: ID.wrTd, te: ID.te, teTd: ID.teTd }), POST_IDS = idsBy({ tot: ID.tot2, wr: ID.wr, wrRec: ID.wrRec, wrTd: ID.wrTd, teTd: ID.teTd });
        const PRE = PRE_IDS.filter(Boolean), POST = POST_IDS.filter(Boolean);
        /* (app v121) the card's own plan, worked out here: the games of the legs on the slip as their first legs come in the
           card's order, each with its ids in that order and dated by its own legs from the case's table (gamesIn): before
           the read, dk2's own (the first game's total on its game lines, AT_G; the second game's legs on its player prices,
           AT_P); after it, the total on the read's id, dated by the read that gave it (postT: the page's record of that
           read, ESPN_IDAT, held below to the read's own time). One leg of the first game and six of the second: a same-game
           parlay mixed with another game, so a button a game, no link for them all, and the note and Share link dated by
           the oldest read of all (AT_G before the read; AT_P after it, the read's own being newer). The status line once
           the check is done (said): what the one link opens, or on a mix what the games' links open, by this check's own
           count of the games with legs on the slip and of the legs */
        const gOf = (G, gid) => G.find(x => x.gid === gid) || { ids: [], ns: [] };
        const G_PRE = gamesIn(w.eval('S').sched, L, PRE_IDS, dk2());
        const TOT2_KEY = 'game|total|over|44.5', postT = () => w.eval(`espnIdAt(${JSON.stringify(g1.id)}, ${JSON.stringify(TOT2_KEY)})`);
        const gPost = () => { const T = dk2(), t = postT(); T[String(wk)][g1.id].glat = isFinite(t) && t > 0 ? new Date(t).toISOString() : null; return gamesIn(w.eval('S').sched, L, POST_IDS, T); };
        const WAIT = 'Checking DraftKings’ current lines for this parlay’s games…', FIRST = 'Checking DraftKings’ lines first…';
        const said = (ok, of, games = 1) => `DraftKings’ lines checked: ${games > 1 ? `the ${games} games’ links open` : 'Open in DraftKings opens'} ${ok === of ? (of === 1 ? 'the leg' : `the ${of} legs`) : `${ok} of the ${of} legs`}.`;
        /* the note's blocks (partsOf), the check's line held on its own (checkHeld): before the read, the mix's paragraph,
           every leg's own link and the 2+ touchdowns on his anytime touchdown; after it, the runner and the tight end to add
           by hand besides, and the total at its new number too */
        const PRE_PARTS = 'first one legs swaphead swap swapprice check', POST_PARTS = 'first hand one legs swaphead swap swapprice check';
        /* the row of game buttons, its first (the game of the card's first leg), and the row hidden and empty, as it is while
           the card reads (the read can change the plan) */
        const gb = () => d.getElementById('pcDkGames'), firstGame = () => gb() && gb().querySelector('[data-pc-dkgame]');
        const gbOff = () => !!gb() && gb().hidden && !gb().children.length && !gb().textContent.trim();
        /* every leg's own link in the note, by its address, against some ids */
        const legHrefs = () => [...note().querySelectorAll('a[data-pc-dkleg]')].map(a => a.getAttribute('href')).join(' '), eachOf = ids => ids.map(x => DKU([x])).join(' ');
        const focusIs = () => d.activeElement === d.body ? 'the page\'s body' : d.activeElement ? (d.activeElement.id || d.activeElement.getAttribute('data-pc-dkgame') || d.activeElement.outerHTML.slice(0, 80)) : 'nothing';
        /* the moved rule's words: a main line, or a rung whose DraftKings line moved to its own number (k-0.5 or the whole
           k-1), added by hand there; a rung moved to any other, its own bet named and the main line said to be another */
        const movedWhy = (stat, at, k, main) => `DraftKings has moved his ${stat} line to ${at} since its prices were read (${readTxt(AT_P)}), and its slip drops a moved line: `
          + (main || at === k - 0.5 || at === k - 1 ? `add it by hand at ${at}` : `add ${k}+ ${stat} by hand (DraftKings’ Over ${at} is another bet)`);
        const movedBrief = (at, k, main) => main || at === k - 0.5 || at === k - 1 ? `moved to ${at} since it was read` : `moved to ${at} since it was read; add ${k}+ by hand, not Over ${at}`;
        const moved = (key, who, what, stat, at, k, main) => `${n[key]}. ${who}, ${what}: ` + movedWhy(stat, at, k, main);
        const RB_MOVED = moved('rb', 'Card Runner', 'Over 64.5 rushing yards', 'rushing yards', 66.5, 64.5, true), TE_MOVED = moved('te', 'Card End', '4+ receptions', 'receptions', 4.5, 4, false);
        const missOf = k => txt(note().querySelector(`[data-pc-dkmiss="${n[k]}"]`)), swapOf = k => txt(note().querySelector(`[data-pc-dkswap="${n[k]}"]`));
        const idle = () => !dkA.hasAttribute('aria-disabled') && !dkA.hasAttribute('aria-busy') && !dkA.hasAttribute('role') && !dkA.hasAttribute('tabindex') && !link.hasAttribute('aria-disabled') && !link.hasAttribute('aria-busy');
        /* while the card reads: the button waiting, Share link too, and the note its waiting line alone, with no leg's own
           link (the plan before the read may stand on ids the read finds dead), no list and no check line; and (app v121)
           no game button, the row hidden and empty, though the plan before the read is a mix */
        const waitingNow = () => ckS().state === 'busy' && !dkA.hidden && txt(dkA) === 'Checking DraftKings’ lines…' && !dkA.hasAttribute('href') && dkA.getAttribute('aria-disabled') === 'true' && dkA.getAttribute('aria-busy') === 'true'
          && link.getAttribute('aria-disabled') === 'true' && txt(note()) === WAIT && note().querySelectorAll('p').length === 1 && !!note().querySelector('[data-pc-dkwait]')
          && !note().querySelector('[data-pc-dkleg], a[href], [data-pc-dkmiss], [data-pc-dkswap], [data-pc-dkcheck], [data-pc-dkread]') && gbOff();
        const isSb = u => /\/scoreboard\?dates=/.test(u), evOf = u => (/\/events\/(\d+)\/competitions\//.exec(u) || [])[1] || null;
        const wkQ = wk <= 18 ? `seasontype=2&week=${wk}` : `seasontype=3&week=${wk >= 22 ? 5 : wk - 18}`;
        const slipRows = () => Object.fromEntries([...d.querySelectorAll('#parlayBody tr.legrow')].map(r => [txt((r.querySelectorAll('td')[1] || r).querySelector('b')), (x => x ? txt(x) : null)(r.querySelector('small.dkslip'))]));
        const espnIdle = async () => { for (let i = 0; i < 400 && w.eval('ESPN_RUN.busy'); i++) await wait(25); await wait(40); };
        const S0 = w.eval('JSON.stringify([S.parlay, S.saved, S.stake])');
        const keys0 = Object.keys(all(w)).filter(k => k !== PROP_KEY && k !== PRESS_KEY).sort().join();
        /* the fixture: the first game's total on its game lines beside six legs of the second on its player prices, each game
           read at its own time, the first game's the older */
        chk(G_PRE.length === 2 && multiOf(G_PRE) && JSON.stringify(gOf(G_PRE, g1.id).ids) === JSON.stringify([ID.tot]) && gOf(G_PRE, g2.id).ids.length === 6
          && gOf(G_PRE, g1.id).at === AT_G && gOf(G_PRE, g2.id).at === AT_P && oldestOwn([AT_G, AT_P]) === AT_G,
          `${how}: the fixture is not the first game's total beside six legs of the second, a same-game parlay mixed with another game, each game read at its own time: ` + JSON.stringify(G_PRE));
        /* (a) the scoreboard fails: the buttons work on the plan as it was, every leg on the pull's own id, a button a game
           (one for the first game's total, one for the second game's six legs in the card's order, in the order their first
           legs come) and no link for them all, the note the mix's paragraph and every leg's own link, and the card says it
           could not check, the note's last line and its status line; the read asked for the scoreboard once a game and
           nothing else */
        net.fail = true; let n0 = net.log.length;
        d.getElementById('pFinish').click(); await wait(20); await cardSettled(w); await wait(10);
        { const bad = gameBtnsIn(d, G_PRE, null), cb = checkHeld(note(), { st: 'failed' });
          chk(!md.hidden && ckS().state === 'failed' && idle() && dkA.hidden && !bad && txt(note().firstElementChild) === multiNote(2, AT_G) && partsOf(note()) === PRE_PARTS && !cb
            && legHrefs() === eachOf(PRE) && swapOf('teTd') === `${n.teTd}. Card End, 2+ touchdowns: goes on as anytime touchdown` && note().querySelectorAll('[data-pc-dkswap]').length === 1 && !note().querySelector('[data-pc-dkmiss]')
            && ![...md.querySelectorAll('a[href]')].some(a => a.getAttribute('href') === DKU(PRE)) && msg() === COULD,
            `${how}: with ESPN's scoreboard failing (500) the card does not give each game a button on the pull's ids (the first game's total; the second game's six legs, in the card's order), its note the mix's paragraph and every leg's own link, ending on the line (and its status line) saying it could not check: `
              + [ckS().state, bad, cb, partsOf(note()), txt(note()).slice(-220), msg()].filter(Boolean).join(' / ')); }
        chk(net.log.slice(n0).length === 2 && net.log.slice(n0).every(u => isSb(u) && u.includes(`dates=${SEA}&${wkQ}&`)), `${how}: with the scoreboard failing, the read asked for more than the parlay's week's scoreboard once a game: ` + net.log.slice(n0).join(' | '));
        d.getElementById('pcClose').click(); await wait(10); net.fail = false;
        /* (b) the read held: the buttons wait (their words, no address, aria-disabled and aria-busy, a press of either doing
           nothing but Share link's saying the card is checking first) while Download works, the note says only that it is
           checking, and no game button is shown; past the cap they work on the plan as it stands, a button a game, and the
           card says it could not check; let go after the cap, the read still updates the same card, the page under it
           drawn once for its two games. The focus, on the waiting Open in DraftKings, goes to the first game's button at
           the cap; then, on the receiver's own link in the note, it stays there through the read's redraw */
        net.hold = gate(); n0 = net.log.length;
        const tOpen = Date.now(); d.getElementById('pFinish').click(); await wait(30);
        w.eval('window.__rd=0');
        chk(waitingNow(), `${how}: while the card reads, Open in DraftKings does not wait ("Checking DraftKings’ lines…", no address, aria-disabled and aria-busy), Share link is not aria-disabled, the note is not its waiting line alone with no leg's own link, or a game button shows: ` + dkA.outerHTML + ' / ' + link.outerHTML + ' / ' + note().innerHTML + ' / ' + (gb() ? gb().outerHTML : 'no #pcDkGames'));
        /* (app v121) the game buttons stay hidden, and empty, until the check settles: the plan before the read is a mix, but
           the read can change it, so only the waiting Open in DraftKings stands in the action row */
        chk(gbOff() && !md.querySelector('#pcDkGames a, a[data-pc-dkgame]') && !dkA.hidden, `${how}: while the card reads, the game buttons of the plan before the read are shown (or Open in DraftKings, waiting, is not), before the check settles: ` + (gb() ? gb().outerHTML : 'no #pcDkGames') + ' / ' + dkA.outerHTML);
        { const ev = new w.MouseEvent('click', { bubbles: true, cancelable: true }), went = dkA.dispatchEvent(ev); link.click(); await wait(30);
          chk(!went && shared.length === 0 && !md.hidden && msg() === FIRST && ckS().state === 'busy', `${how}: while the card reads, a press of Open in DraftKings did something, or one of Share link did more than say "${FIRST}": ` + JSON.stringify({ went, shared: shared.length, msg: msg() })); }
        { const c0 = rec.clicks.length; d.getElementById('pcDownload').click(); await wait(80);
          chk(rec.clicks.length === c0 + 1 && ckS().state === 'busy' && !md.hidden, `${how}: Download does not work at once while the card reads`); }
        { const f = [...md.querySelectorAll('button,a[href],input,select,[tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && !el.hidden && !el.closest('[hidden]'))
            .map(el => el.id || (el.hasAttribute('data-pc-dkgame') ? 'game:' + el.getAttribute('data-pc-dkgame') : 'leg' + el.getAttribute('data-pc-dkleg'))).join(' ');
          chk(f === 'pcClose pcDk pcLink pcDownload pcAgain', `${how}: while the card reads its controls are not Close, Open in DraftKings (waiting, in its place, no game button), Share link, Download and Start over alone: ` + f); }
        chk(net.log.slice(n0).length === 1 && isSb(net.log[n0]), `${how}: the held read asked for more than its first game's scoreboard: ` + net.log.slice(n0).join(' | '));
        dkA.focus();
        /* the cap, on the real clock: still waiting a second and a half before it, and past it within a few seconds of its
           time (on a loaded machine Node runs a timer from the loop's own clock, which can lag the real one, so the card's
           and this check's timers are each held only to that much) */
        await wait(Math.max(0, CAP_MS - 1500 - (Date.now() - tOpen)));
        const early = ckS().state, earlyWait = waitingNow(), tEarly = Date.now() - tOpen;
        for (let i = 0; i < 240 && ckS().state === 'busy'; i++) await wait(25);
        chk(early === 'busy' && earlyWait, `${how}: the card stopped waiting for its read before its 10-second cap, or did not wait as it should (${early} at ${tEarly} ms${earlyWait ? '' : ', not waiting as above: ' + txt(dkA) + ' / ' + txt(note()).slice(0, 120)})`);
        const wrLink = () => note().querySelector(`a[data-pc-dkleg="${n.wr}"]`);
        { const bad = gameBtnsIn(d, G_PRE, null), cb = checkHeld(note(), { st: 'failed' });
          chk(ckS().state === 'late' && idle() && dkA.hidden && !bad && txt(note().firstElementChild) === multiNote(2, AT_G) && partsOf(note()) === PRE_PARTS && !cb && legHrefs() === eachOf(PRE) && msg() === COULD && !!wrLink(),
            `${how}: past its 10-second cap the card does not give each game a button on the plan as it stood, with the note's mix paragraph and every leg's own link, or does not say (in the note's last line and its status line) it could not check: `
              + [ckS().state, bad, cb, partsOf(note()), txt(note()).slice(-200), msg()].filter(Boolean).join(' / ')); }
        /* the focus that was on the waiting Open in DraftKings, hidden now, is on the first game's button (the game of the
           card's first leg), never left on a hidden control or the page's body */
        chk(!!firstGame() && firstGame().getAttribute('data-pc-dkgame') === (G_PRE[0] || {}).gid && d.activeElement === firstGame() && md.contains(d.activeElement),
          `${how}: past the cap, the focus that was on the waiting Open in DraftKings did not move to the first game's button (${(G_PRE[0] || {}).gid}): ` + focusIs());
        link.click(); await wait(30);
        { const t = (shared[0] || {}).text || '';
          chk(shared.length === 1 && !('url' in shared[0]) && t.includes(multiLines(G_PRE, AT_G, null)) && G_PRE.every(x => t.split('\n').includes(DKU(x.ids))) && !t.includes(DKU(PRE)) && !/DraftKings betslip \(opens|Add by hand/.test(t),
            `${how}: past the cap Share link does not send the plan as it stands, each game's link alone on its line under the mix's header, then the read: ` + JSON.stringify(shared[0] || null)); }
        if (wrLink()) wrLink().focus();
        const tGo = w.Date.now(); net.hold.go(); net.hold = null; await espnIdle(); for (let i = 0; i < 400 && ckS().state === 'late'; i++) await wait(25); const tDone = w.Date.now();
        const OUT = w.eval('ESPN_OUT'), whens = [g1.id, g2.id].map(id => OUT[id] && OUT[id].when), t1 = Math.min(...whens);
        /* the plan after the read, a button a game: the first game's total on the read's new id, dated by the read that gave
           it (within the read's own time), the second game's four legs DraftKings still has, the moved runner and tight end
           off the slip; still a mix of a same-game parlay with another game */
        const ok = POST.length, G_POST = gPost(), tIdat = postT();
        chk(G_POST.length === 2 && multiOf(G_POST) && JSON.stringify(gOf(G_POST, g1.id).ids) === JSON.stringify([ID.tot2]) && gOf(G_POST, g2.id).ids.length === 4 && tIdat >= tGo && tIdat <= tDone
          && oldestOwn(G_POST.map(x => x.at)) === AT_P,
          `${how}: after the read, this check's own plan is not the first game's total on the read's id (read between ${tGo} and ${tDone}: ${tIdat}) beside four legs of the second, its oldest read the second game's player prices: ` + JSON.stringify(G_POST));
        { const bad = gameBtnsIn(d, G_POST, null);
          chk(ckS().state === 'done' && idle() && dkA.hidden && !bad,
            `${how}: once the read let go after the cap answers, the card does not give each game a button on the ${ok} legs DraftKings still has (the first game's total at its new number on the read's id, the second game's four), each titled with its own game's oldest read: ` + [ckS().state, bad].filter(Boolean).join(' / ')); }
        chk(msg() === said(ok, NL, G_POST.length), `${how}: once the read is done the card's status line does not say what the games' links open now (${said(ok, NL, G_POST.length)}): ` + msg());
        chk(w.eval('window.__rd') === 1, `${how}: the page under the card was drawn ${w.eval('window.__rd')} times for the card's read of its two games, not once when the last was read`);
        chk(missOf('rb') === RB_MOVED && missOf('te') === TE_MOVED && note().querySelectorAll('[data-pc-dkmiss]').length === 2,
          `${how}: a player's main line and a rung DraftKings has moved since the pull read their ids are not left off, each with the moved rule's words (the rung, moved off its own number, naming its own bet): ` + JSON.stringify([missOf('rb'), missOf('te')]));
        chk(swapOf('tot') === `${n.tot}. ${g1.a} at ${g1.h}, Over 43.5 points: goes on as Over 44.5` && swapOf('teTd') === `${n.teTd}. Card End, 2+ touchdowns: goes on as anytime touchdown` && note().querySelectorAll('[data-pc-dkswap]').length === 2,
          `${how}: the total DraftKings has moved does not go on at its new number on the read's id, said so, or the 2+ touchdowns not as his anytime touchdown: ` + [...note().querySelectorAll('[data-pc-dkswap]')].map(txt).join(' | '));
        { const cb = checkHeld(note(), { st: 'done', t: t1 });
          chk(whens.every(t => t >= tGo && t <= tDone) && !cb && partsOf(note()) === POST_PARTS && txt(note().firstElementChild) === multiNote(2, AT_P, true),
            `${how}: the note is not the mix's paragraph (dated by the oldest read of all), the legs to add by hand, every leg's own link and the converted legs, ending on when the card checked DraftKings' lines (${checked(t1)}): `
              + [cb, partsOf(note()), txt(note().firstElementChild), txt(note()).slice(-200)].filter(Boolean).join(' / ')); }
        chk(!!wrLink() && d.activeElement === wrLink() && wrLink().getAttribute('href') === DKU([ID.wr]) && md.contains(d.activeElement) && d.body.classList.contains('modal-open'),
          `${how}: the focus did not stay on the receiver's own link through the read's redraw, his unmoved line lost its id, or the page under the card was let scroll again`);
        { const got = net.log.slice(n0), sbs = got.filter(isSb), evs = got.filter(u => !isSb(u)).map(evOf);
          chk(sbs.length === 2 && sbs.every(u => u.includes(`dates=${SEA}&${wkQ}&`)) && evs.slice().sort().join() === [EVT[g1.id], EVT[g2.id]].sort().join() && !got.some(u => u.includes('/events/' + EV3 + '/')) && got.every(u => isSb(u) || /\/propBets\?/.test(u)),
            `${how}: the card's read did not ask for exactly the parlay's games (its week's scoreboard once a game and each game's own player lines), or asked about another game: ` + got.map(u => u.replace(/https:\/\/[^/]+/, '').slice(0, 90)).join(' | ')); }
        link.click(); await wait(30);
        { const t2 = (shared[1] || {}).text || '', hand = [n.rb, n.te].sort((a, b) => a - b);
          chk(shared.length === 2 && t2.includes(multiLines(G_POST, AT_P, numsOwn(hand))) && G_POST.every(x => t2.split('\n').includes(DKU(x.ids))) && !t2.includes(DKU(POST)) && !/DraftKings betslip \(opens/.test(t2)
            && t2.includes(`\n${n.rb}. Card Runner Over 64.5 rushing yards (${movedBrief(66.5, 64.5, true)})`) && t2.includes(`\n${n.te}. Card End 4+ receptions (${movedBrief(4.5, 4, false)})`)
            && t2.includes(`On DraftKings’ slip at its own line: ${[['tot', 'Over 44.5'], ['teTd', 'anytime touchdown']].sort((a, b) => n[a[0]] - n[b[0]]).map(([k, x]) => `leg ${n[k]} as ${x}`).join('; ')} (DraftKings prices them at its own line, so its payout can differ)`),
            `${how}: Share link's text does not give each game's link to the ${ok} legs DraftKings still has, alone on its line under the mix's header (saying which legs to add by hand), and name the two DraftKings has moved, each with the moved rule's few words: ` + JSON.stringify(t2)); }
        /* the builder's rows say it too, from the card's own plan, as the read's redraw drew them; the receiver's receptions,
           which the read has no line for, on his id with nothing under it */
        { const r = slipRows(), want = { 'Over 43.5 points': 'On DraftKings as Over 44.5', 'Over 64.5 rushing yards': `Not on DraftKings’ slip yet: ${movedBrief(66.5, 64.5, true)}`, 'Over 55.5 receiving yards': null,
            'Over 5.5 receptions': null, 'Scores a touchdown': null, '4+ receptions': `Not on DraftKings’ slip yet: ${movedBrief(4.5, 4, false)}`, '2+ touchdowns': 'On DraftKings as anytime touchdown' };
          chk(Object.keys(want).every(k => r[k] === want[k]), `${how}: the builder's rows do not say what DraftKings' slip does with each leg after the card's read: ` + JSON.stringify(r)); }
        /* the anytime touchdown and 2+ touchdowns have no number to move: on their ids whatever the read says (the tight
           end's touchdown is not among the read's at all); the receiver's receptions, with no line of his in the read, keep
           his id; every leg's own link is the plan's */
        chk(!missOf('wrTd') && !missOf('teTd') && !missOf('wrRec') && [...note().querySelectorAll('a[data-pc-dkleg]')].map(a => a.getAttribute('href')).join(' ') === POST.map(x => DKU([x])).join(' '),
          `${how}: an anytime touchdown, 2+ touchdowns or a line the read has none for was taken for a moved line, or a leg's own link is not the plan's`);
        /* the moved rule on legs of the check's own, on the read as it stands: the runner's 67+ (DraftKings' Over 66.5, so
           his moved line is the same bet) added by hand at 66.5; his 70+ naming its own bet; and with the read of his game
           older than the pull (the read's time moved back three hours, put back after), his main line on the pull's id */
        { const R = (k, lbl) => ({ gid: g2.id, pid: 'card-rb', stat: 'rushing_yards', k, side: 'over', main: false, p: 0.4, price: 150, src: 'est', mu: 66, name: 'Card Runner', pos: 'RB', grp: 'RB', team: g2.h, opp: g2.a, week: wk, label: lbl });
          const one = l => { const p = w.PARLAY_CARD.dkPlan([l]); return p && p.each && p.each[0] ? { id: p.each[0].id || null, why: p.each[0].why || null, brief: p.each[0].brief || null } : {}; };
          const r67 = one(R(67, '67+ rushing yards')), r70 = one(R(70, '70+ rushing yards'));
          chk(!r67.id && r67.why === movedWhy('rushing yards', 66.5, 67, false) && r67.brief === movedBrief(66.5, 67, false) && !r70.id && r70.why === movedWhy('rushing yards', 66.5, 70, false) && r70.brief === movedBrief(66.5, 70, false),
            `${how}: a rung DraftKings' moved main line is the same bet for (67+ at 66.5) is not said to add by hand at 66.5, or one it is not (70+) does not name its own bet: ` + JSON.stringify([r67, r70]));
          const back = w.eval(`(()=>{ const W=ESPN_LIVE[String(${wk})], e=W&&W[${JSON.stringify(g2.id)}]; if(!e) return null; const was=e.at; e.at=new Date(Date.parse(${JSON.stringify(AT_P)})-3*3600e3).toISOString(); return was; })()`);
          let rOld = {}; if (back != null) { try { rOld = one(legs2[rbKey]); } finally { w.eval(`ESPN_LIVE[String(${wk})][${JSON.stringify(g2.id)}].at=${JSON.stringify(back)}`); } }
          chk(back != null && rOld.id === ID.rb && !rOld.why, `${how}: ` + (back == null ? 'the card read no player lines of the second game, so an id the pull read after that read could not be held' : 'an id the pull read after the newest read of his game\'s lines was taken for a dead one: ' + JSON.stringify(rOld))); }
        /* nothing of the visitor's own moved: the builder, the saved list and the stake, and no key but the prop model's own
           and the kept read, which is a press's */
        chk(w.eval('JSON.stringify([S.parlay, S.saved, S.stake])') === S0 && Object.keys(all(w)).filter(k => k !== PROP_KEY && k !== PRESS_KEY).sort().join() === keys0 && pressKept(v)
          && w.localStorage.getItem(PRESS_KEY) != null && JSON.stringify(JSON.parse(w.localStorage.getItem(PROP_KEY)).parlay) === JSON.stringify(JSON.parse(S0)[0]),
          `${how}: the card's read wrote to the visitor's builder, saved list or stake, or kept anything but a press's read`);
        /* (c) opened again within two minutes: nothing read, and the same plan and line at once */
        d.getElementById('pcClose').click(); await wait(10);
        { const n3 = net.log.length; d.getElementById('pFinish').click(); const st = ckS().state; await wait(30);
          const bad = gameBtnsIn(d, G_POST, null), cb = checkHeld(note(), { st: 'done', t: t1 });
          chk(net.log.length === n3 && st === 'done' && idle() && dkA.hidden && !bad && !cb && partsOf(note()) === POST_PARTS && missOf('rb') === RB_MOVED,
            `${how}: opened again within two minutes, the card read again or did not stand at once on the read a moment ago (a button a game, the note ending on that read): ` + JSON.stringify({ asked: net.log.slice(n3), st, bad, cb, parts: partsOf(note()) })); }
        d.getElementById('pcClose').click(); await wait(10);
        /* the reads above made three minutes ago (the page's own record of them, moved back), so a card opened now reads again */
        const older = (ids = [g1.id, g2.id]) => w.eval(`for (const id of ${JSON.stringify(ids)}) if (ESPN_OUT[id]) ESPN_OUT[id].when -= ${FRESH_MS + 60e3}`);
        const setParlay = async o => { w.eval(`S.parlay=${JSON.stringify(o)}; save(); renderParlay()`); await wait(20); };
        /* (b2) the check settling into the mix's plan before its cap: a card opened three minutes after the last read reads
           again, waiting with no game button; the focus on its waiting Open in DraftKings when the read ends goes to the
           first game's button (the game of the card's first leg), never left on the hidden Open in DraftKings or the page's
           body, and the status line says what the games' links open */
        older(); net.hold = gate();
        d.getElementById('pFinish').click(); await wait(30);
        { const busy = ckS().state === 'busy' && waitingNow(); dkA.focus(); const on = d.activeElement === dkA;
          net.hold.go(); net.hold = null; await espnIdle(); await cardSettled(w); await wait(20);
          const G = gPost(), f = firstGame(), bad = gameBtnsIn(d, G, null);
          chk(busy && on && ckS().state === 'done' && dkA.hidden && !bad && !!f && f.getAttribute('data-pc-dkgame') === (G[0] || {}).gid && d.activeElement === f && msg() === said(POST.length, NL, G.length),
            `${how}: a card that waited, the focus on its waiting Open in DraftKings, did not move the focus to the first game's button (${(G[0] || {}).gid}) when its read ended in the mix's plan, or did not say what the games' links open: `
              + JSON.stringify({ busy, on, st: ckS().state, bad, focus: focusIs(), msg: msg() })); }
        d.getElementById('pcClose').click(); await wait(10);
        /* (d) a card closed before its read ends is never drawn again from it, and the focus that went back to Finish
           stays there though the read's redraw replaces that button */
        older(); net.hold = gate();
        d.getElementById('pFinish').click(); await wait(30);
        chk(ckS().state === 'busy', `${how}: a card opened three minutes after the last read did not read again`);
        d.getElementById('pcClose').click(); await wait(10);
        { const was = [dkA.outerHTML, gb().outerHTML, note().innerHTML].join('|'), back = d.activeElement === d.getElementById('pFinish');
          net.hold.go(); net.hold = null; await espnIdle();
          chk(back && md.hidden && cardCheck(w) === null && [dkA.outerHTML, gb().outerHTML, note().innerHTML].join('|') === was && d.activeElement === d.getElementById('pFinish') && !!d.activeElement,
            `${how}: a card closed before its read ended was drawn again from it, opened again, or the focus left Finish when the read redrew the page`); }
        /* (e) a second card opened while the first one's read runs shows its own leg, waits for that read (a press already
           running), then stands on its own game's read: the receiver's line alone, on its id */
        const oneLeg = () => d.querySelectorAll('#pcView .pc-legs > li').length === 1;
        const oneNote = () => txt(note()).includes('opens the leg as DraftKings had it') && note().querySelectorAll('a[data-pc-dkleg]').length === 0;
        const onePlan = () => oneLeg() && oneNote() && idle() && txt(dkA) === 'Open in DraftKings' && dkA.getAttribute('href') === DKU([ID.wr]) && !dkA.hidden && !gameBtnsIn(d, null);
        older(); net.hold = gate();
        d.getElementById('pFinish').click(); await wait(30);
        d.getElementById('pcClose').click(); await wait(10);
        await setParlay({ [wrKey]: legs2[wrKey] });
        d.getElementById('pFinish').click(); await wait(30);
        chk(ckS().state === 'busy' && oneLeg() && waitingNow(), `${how}: a second card opened while the first one's read runs does not show its own leg, waiting: ` + txt(note()).slice(0, 200));
        { const n5 = net.log.length; net.hold.go(); net.hold = null; await espnIdle(); await cardSettled(w); await espnIdle();
          chk(!md.hidden && ckS().state === 'done' && onePlan() && !!note().querySelector('[data-pc-dkcheck="done"]') && d.body.classList.contains('modal-open')
            && ckS().games.join() === g2.id && net.log.slice(n5).filter(u => !isSb(u)).map(evOf).includes(EVT[g2.id]) && !net.log.some(u => u.includes('/events/' + EV3 + '/')),
            `${how}: the second card did not end on its own plan (the receiver's line on its id) after reading its own game, or the first card's read drew on it: ` + txt(dkA) + ' ' + dkA.getAttribute('href') + ' / ' + txt(note()).slice(0, 200)); }
        d.getElementById('pcClose').click(); await wait(10);
        /* (e2) an older card's read never paints a newer card, though both are open in turn and the newer one is done at
           once: the receiver's card read a moment ago (so it is done at once when opened again), the seven-leg card opened
           on its other game read afresh and closed while that read is held, the receiver's card opened again, and then the
           held read let go: the receiver's card keeps its own one-leg plan to the end */
        older(); await setParlay({ [wrKey]: legs2[wrKey] });
        d.getElementById('pFinish').click(); await wait(30); await cardSettled(w); await espnIdle();
        chk(ckS().state === 'done' && ckS().games.join() === g2.id && onePlan(), `${how}: the receiver's card did not read its game and stand on its own plan: ` + ckS().state);
        d.getElementById('pcClose').click(); await wait(10);
        older([g1.id]); await setParlay(legs2);
        net.hold = gate();
        d.getElementById('pFinish').click(); await wait(30);
        const busy7 = ckS().state === 'busy';
        d.getElementById('pcClose').click(); await wait(10);
        await setParlay({ [wrKey]: legs2[wrKey] });
        { const n6 = net.log.length; d.getElementById('pFinish').click(); const st = ckS().state; await wait(30);
          chk(busy7 && st === 'done' && net.log.length === n6 && onePlan(), `${how}: with its game read a moment ago, the receiver's card opened again did not stand at once on its own plan with nothing read: ` + JSON.stringify({ busy7, st, asked: net.log.slice(n6) })); }
        net.hold.go(); net.hold = null; await espnIdle(); await wait(60);
        chk(!md.hidden && ckS().state === 'done' && onePlan() && txt(dkA) === 'Open in DraftKings' && !/of 7 legs|7 legs/.test(txt(dkA) + ' ' + txt(note())),
          `${how}: the seven-leg card's read, let go after that card closed, painted its plan on the receiver's card open since: ` + txt(dkA) + ' ' + dkA.getAttribute('href') + ' / ' + txt(note()).slice(0, 200));
        d.getElementById('pcClose').click(); await wait(10);
        /* (g) a card opened while a press of Refresh odds on its own game runs waits for it and stands on it, reading
           nothing itself, and the page under it stays held (the press's redraw closes the game window and lets body's
           modal-open go, which the card puts back): the press here is the page's own, on the receiver's game */
        older(); await setParlay({ [wrKey]: legs2[wrKey] });
        net.hold = gate();
        { const n7 = net.log.length; w.eval(`espnRefresh(${JSON.stringify(g2.id)})`); await wait(20);
          d.getElementById('pFinish').click(); await wait(30);
          const st = ckS().state, asked0 = net.log.length - n7;
          net.hold.go(); net.hold = null; await espnIdle(); await cardSettled(w); await wait(40);
          const asked = net.log.slice(n7);
          chk(st === 'busy' && !md.hidden && ckS().state === 'done' && onePlan() && !!note().querySelector('[data-pc-dkcheck="done"]') && d.body.classList.contains('modal-open')
            && asked0 === 1 && asked.filter(isSb).length === 1 && asked.filter(u => !isSb(u)).map(evOf).join() === EVT[g2.id],
            `${how}: a card opened during a press of its game did not wait for it and stand on it, read again itself, or let the page under it scroll: ` + JSON.stringify({ st, end: ckS().state, modal: d.body.classList.contains('modal-open'), asked: asked.map(u => u.replace(/https:\/\/[^/]+/, '').slice(0, 70)) })); }
        d.getElementById('pcClose').click(); await wait(10);
        /* (h) a payload baked before ids (no PAY.dk; put back on every path) still reads: the first game's total goes on at
           DraftKings' number on the id the read found, which the press keeps in the PAY.dk it makes */
        older([g1.id]); await setParlay({ [totKey]: legs2[totKey] });
        { const n8 = net.log.length; w.eval('window.__dkWas=PAY.dk; delete PAY.dk');
          let st = '', asked = [], sw = '', made = false, href = '';
          try { d.getElementById('pFinish').click(); await wait(30); await cardSettled(w); await espnIdle();
            st = ckS().state; asked = net.log.slice(n8); sw = txt(note().querySelector('[data-pc-dkswap="1"]')); href = dkA.getAttribute('href'); made = w.eval('!!PAY.dk&&DK_PRESS_MADE.has(PAY.dk)');
          } finally { if (!md.hidden) d.getElementById('pcClose').click(); w.eval('PAY.dk=window.__dkWas; delete window.__dkWas'); await wait(10); }
          chk(st === 'done' && asked.filter(isSb).length === 1 && asked.filter(isSb).every(u => u.includes(`dates=${SEA}&${wkQ}&`)) && asked.filter(u => !isSb(u)).map(evOf).join() === EVT[g1.id]
            && href === DKU([ID.tot2]) && sw === `1. ${g1.a} at ${g1.h}, Over 43.5 points: goes on as Over 44.5` && made,
            `${how}: on a payload baked before ids the card did not read its game (one scoreboard and that game alone) and put the total on at DraftKings' number on the read's id: ` + JSON.stringify({ st, href, sw, made, asked: asked.map(u => u.replace(/https:\/\/[^/]+/, '').slice(0, 70)) })); }
        await setParlay(legs2);
        /* (f) Start over works at once while the card reads, and the read ending after it opens nothing and fills no
           builder; the focus it gave to the Parlay Builder's choices is found again on them when the read's redraw draws
           them again, never left on the page's body. The choices are drawn only while the page's own week has a game to
           come, so where it has none at this hour (a Monday night under way, the season's end) one of its games is moved
           to the far future, its score taken off, for this step alone */
        const lwMoved = w.eval(`(()=>{ if(pbGames().length) return null; const W=currentWeek(), G=gamesIn(W), g=G.find(x=>!gameFinal(x))||G[0]; if(!g) return null;
          window.__lwWas={g,d:g.d,t:g.t,hs:g.hs,as:g.as}; g.d='2099-12-31'; g.t='13:00'; delete g.hs; delete g.as; PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); renderParlay(); return g.id; })()`);
        await wait(20);
        chk(!!d.querySelector('#pbPanel [data-pb-mix]'), `${how}: the Parlay Builder draws no choices${lwMoved ? ` though ${lwMoved} was moved to the far future` : ''}, so Start over's focus could not be held`);
        older(); net.hold = gate();
        d.getElementById('pFinish').click(); await wait(30);
        d.getElementById('pcAgain').click(); await wait(30);
        { const ok0 = md.hidden && Object.keys(w.eval('S').parlay).length === 0, mix0 = d.activeElement, on0 = !!mix0 && mix0.hasAttribute('data-pb-mix');
          net.hold.go(); net.hold = null; await espnIdle(); await wait(40);
          const a = d.activeElement;
          chk(ok0 && md.hidden && Object.keys(w.eval('S').parlay).length === 0 && cardCheck(w) === null, `${how}: Start over did not work at once while the card read, or the read ending after it opened the card or filled the builder`);
          chk(on0 && !!a && a !== d.body && a.isConnected && a.hasAttribute('data-pb-mix') && a.getAttribute('data-pb-mix') === mix0.getAttribute('data-pb-mix') && !a.closest('[hidden]'),
            `${how}: after Start over, the read's redraw left the focus on ${a === d.body ? 'the page\'s body' : a ? a.outerHTML.slice(0, 80) : 'nothing'}, not on the Parlay Builder's choice it was on${on0 ? (mix0.isConnected ? ' (that one was not drawn again, so the check did not meet the case)' : '') : ' (Start over did not put it there)'}`); }
        if (lwMoved) w.eval('{ const o=window.__lwWas; o.g.d=o.d; o.g.t=o.t; if(o.hs!=null) o.g.hs=o.hs; if(o.as!=null) o.g.as=o.as; delete window.__lwWas; }');
        chk(v.methods.every(m => m === 'GET'), `${how}: the card's read sent something other than a read`);
      }
    }

  }

  // ---- I. the file's own shape is what a person would write ----
  const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'liveparlays', 'parlays.json'), 'utf8'));
  chk(Array.isArray(real.games) && Array.isArray(real.parlays), 'liveparlays/parlays.json is not the shape the page reads');
  chk(typeof real.how === 'string' && /stat/.test(real.how) && /cleared/.test(real.how) && /Claude/.test(real.how), 'the file does not explain how to edit itself, or how a parlay is cleared');
  { const xb = JSON.parse(fs.readFileSync(path.join(ROOT, 'liveparlays', 'xbets.json'), 'utf8'));
    chk(typeof xb.how === 'string' && /Claude/.test(xb.how) && /staked/.test(xb.how) && /deposit/.test(xb.how) && Number.isInteger(xb.season) && xb.weeks && typeof xb.weeks === 'object'
      && Object.entries(xb.weeks).every(([k, v]) => /^w([1-9]|1\d|2[0-2])$/.test(k) && v.staked >= 0 && v.returned >= 0 && typeof v.note === 'string' && !/[<>]/.test(v.note))
      && (xb.deposit === null || xb.deposit >= 0) && !isNaN(Date.parse(xb.updated)),
      'liveparlays/xbets.json is not the shape the X Bet Log reads, or does not explain how to edit itself'); }
  const shaped = await run({ file: { updated: null, games: ['2026_02_CAR_ATL'], parlays: [
    { id: 'x', week: 2, stake: 5, legs: [legF(0, 'Bijan Robinson', 'ATL', 'rushing_yards', 43.5, 'over', true)] }] } });
  chk(shaped.d.querySelectorAll('.sp-leg').length === 1, 'a hand-written parlay did not render');
  chk(knob(shaped.d.querySelector('.sp-leg')) === '86', 'a hand-written parlay is not tracked');

  // ---- M. no run asked the retired store anything, and nothing any run sent was a write ----
  chk(ALL_CALLS.length > 100 && BAD_CALLS.length === 0, 'a page asked the retired store or its sign-in services, or sent a write: ' + BAD_CALLS.slice(0, 5).join(' | '));
  chk(!/firebaseio|identitytoolkit|securetoken/.test(HTML), 'the built page still names the retired store or its sign-in services');

  finish();
})().catch(e => finish('the smoke threw: ' + (e && e.stack || e)));
