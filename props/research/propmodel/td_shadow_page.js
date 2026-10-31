#!/usr/bin/env node
/* The anytime-touchdown shadow's page reader (props/research/propmodel/README.md, "The touchdown shadow";
   PREREGISTRATION.md section 8). Research only: nothing on the site reads what this writes, and nothing the site
   draws moves because of it. It reads the published page; it never changes a file of the site.

   m is the chance the site states for a player's anytime touchdown: the number the published page draws on his
   "Scores one" row of a game's page on the Props tab (part3.js, renderGame's touchdown block: gpChance writes it
   unrounded as data-legchance), which is legChance of the leg renderGame builds, DraftKings' fair chance, real or
   estimated. This program boots the page itself, the root index.html a visitor loads, with props/build/suggest_ledger.js's
   own boot(): the window's clock held at the run's time, the payload just published served as the page fetches it, the
   checkout's other data files beside it, every other address 404 (so no ESPN request and no Odds API request), and an
   empty browser storage (no visitor's Refresh odds press, kept read or Pull is in play). It does not wait for the Elo
   files, which a touchdown's m does not read.

   For each game of the payload's published ESPN read (PAY.espn.games) still to come (on the schedule in the entry's
   week, no score, its kickoff after the clock) with a player block dated before its kickoff, every player on the
   block's anytime-touchdown list (pl.td, the athletes the props job's reader placed on a player) is looked up as the
   game's page draws him (rosterFor(g, true): the page with "Include backups" ticked), and his m is read three ways,
   which must agree exactly or nothing is written:
     1. the function route: legChance of the leg built exactly as renderGame builds it (oddsFor's real price, else
        plEst's: DraftKings' line read on ESPN priced by the formula, src 'dkline'), and legFairStated of the same leg
        deep-equal to it (no chance hook is set: nflbets/build/build.js refuses a page that sets one);
     2. the DOM: renderGame with every listed player open, his row's data-legchance read back as a number, equal to
        the function route's p to the bit (a double's shortest form round-trips), the row present exactly where the
        page has a touchdown row for him and the chance cell exactly where it states one, and the heading's
        projection (data-td-proj) his projection;
     3. the checks' own copy of the formula, props/build/espn_rule.js (the audit's and the smoke's): for a price from
        DraftKings' line the same price, the same fair chance (= m), the same branch and the same untested flag; for a
        real price the paid pull's own price and m its implied chance over the week's overround. A player the page
        did not price from his listing must be one the rule cannot price either.
   Any disagreement refuses the whole reader ("the page and espn_rule.js disagree on m"): it never writes a wrong m,
   and the shadow then makes no call that run.

   Each listed player is recorded with: name, team, grp; shown ('default' on the page as it opens, 'backups' only with
   Include backups, null not drawn); m (the DOM's number) and m_est; src ('real' or 'dkline'); price (the American
   price m is worked from); ov (the overround it is divided by: fairVig(week).player, else DK_EST.tdVig 1.0566, for
   a price from DraftKings' line; fairVig(week).player, else .all, for a real price); branch ('real', else the page's
   tdBranch on its own inputs: 'lined', 'backup' or 'model'); tested and alone (the model branch is untested and
   priced on the model alone); offered (description: pricedLegs, the page's rule for what a suggestion may take,
   holds the leg); p_site (description: the page's own projection, l.p, the heading's "projected N%"); inputs (the
   branch's inputs as the page read them: rush_line, rec_line, team_implied, complete, starter); and m_why where m is
   null, one of:
     'ruled out: not drawn'                     out, doubtful or held out (S.inactive): the page draws no row for him
     'not on the page'                          not in the page's roster for the game at all
     'nothing to project: no touchdown row'     drawn with no lines, or with no touchdown line
     'no stated chance: dash'                   a touchdown row whose chance cell is a dash
     'listed, but not priced from his listing'  on the list, yet the page prices him on the model's own estimate (src
                                                'est'), whose chance is a dash; espn_rule.js must agree it cannot price him
   Games of the read that are not called (off the schedule, moved to another week, kicked off or scored, no player
   block, a block dated at or after kickoff) are listed in skipped with why.

   The site's own verdicts, description only (the registered rule decides every grade, td_shadow.py): for each call in
   the ledger (--ledger, optional) that is frozen, ungraded and at least 90 hours past its kickoff, the page's own
   settleLeg on his anytime touchdown, mapped win -> 'td', loss -> 'no_td', 'void', null -> 'pending', with how it read
   him: settle (settleLeg's own word), stats_in (his game's stats loaded), stat_row (actualFor has a row for him),
   from_snaps (that row is one of zeros the bake made from the snap counts, as the payload's stats row says: the page's
   actuals do not keep the flag), any_td, took_part (tookPart) and reported_out (reportedOut).

   page.json: {v: 1, now, baked_at, payload_sha256, page: {app_build, page_hash, index_sha256}, season, current_week,
   espn_read_at, ledger_calls (null with no ledger read), games: {gid: {w, a, h, kickoff (the page's own, UTC ISO),
   read_at (the block's pl.at), out_st, td (the published list, deduplicated, in its order), players: {pid: {...}}}},
   skipped: {gid: why}, site: {ledger key: {result, how}}, counts}.

   Usage: node props/research/propmodel/td_shadow_page.js --payload P --now ISO --out page.json [--ledger L]
   Exit 0: written. Exit 1: refused, nothing written (any page.json already at --out is deleted first, so a stale one
   never stands in). The last line starts "td shadow page:". It needs nothing but props/build/node_modules (jsdom and
   papaparse, through suggest_ledger.js) and the repository's own files; it writes only --out. Required as a module it
   exports run() (boot, an optional patch of the window, read, close) and read() for the test. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HERE = __dirname, ROOT = path.resolve(HERE, '..', '..', '..');
const BUILD = path.join(ROOT, 'props', 'build');
const INDEX = path.join(ROOT, 'index.html');
/* a call's site verdict is read from 90 hours after its kickoff, so it is on hand when its grade comes due at 96 */
const SITE_AFTER_MS = 90 * 3600e3;
const WATCHDOG_MS = 150e3;
/* what the reader calls on the page (and what espn_rule.js reads of it: project, gameCtx, depthOf) */
const NEED = ['rosterFor', 'statLines', 'plEst', 'oddsFor', 'legChance', 'legFairStated', 'espnOf', 'espnGame', 'espnLineOf',
  'espnComplete', 'espnStarter', 'tdBranch', 'fairVig', 'pricedLegs', 'settleLeg', 'tookPart', 'reportedOut', 'actualFor',
  'gameStarted', 'hasScore', 'kickoff', 'renderGame', 'project', 'gameCtx', 'depthOf', 'currentWeek'];
const M_WHY = {
  out: 'ruled out: not drawn',
  absent: 'not on the page',
  none: 'nothing to project: no touchdown row',
  dash: 'no stated chance: dash',
  unpriced: 'listed, but not priced from his listing',
};
const BRANCHES = ['real', 'lined', 'backup', 'model'];

class Refuse extends Error {}
const refuse = why => { throw new Refuse(why); };
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const clip = p => Math.max(0.001, Math.min(0.999, p));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* the reading itself, on a page booted and ready (w: its window). o: {payload (parsed), payloadSha, indexSha, nowText,
   now (ms), ledger (parsed or null), errs, asked} from the boot. Synchronous from start to end, so nothing the page has
   pending (the Elo files, the scoreboard read) can run between the function route and the DOM. Throws Refuse */
function read(w, o) {
  const RULE = require(path.join(BUILD, 'espn_rule.js'));
  const P = n => w.eval(n);
  const PAY = P('typeof PAY==="undefined"?null:PAY');
  if (!PAY || PAY.baked_at !== o.payload.baked_at) refuse("the page did not load the payload (PAY.baked_at is not the payload's)");
  /* the boot's log of what the page asked, live: read before the reading and again after it */
  const askedAt = () => {
    const asked = o.asked || [];
    const core = asked.filter(u => /^https:\/\/sports\.core\.api\.espn\.com\//.test(String(u)));
    if (core.length) refuse(`the page asked ESPN for player lines (${core.length}: ${core[0]})`);
    const odds = asked.filter(u => /^https:\/\/api\.the-odds-api\.com\//.test(String(u)));
    if (odds.length) refuse(`the page asked The Odds API (${odds[0]})`);
  };
  askedAt();
  const missing = NEED.filter(n => P(`typeof ${n}`) !== 'function');
  if (missing.length) refuse('the page has no ' + missing.join(', '));
  if (P('typeof DK_EST') !== 'object' || !(P('DK_EST.tdVig') > 0)) refuse('the page has no DK_EST.tdVig');
  if (!w.document.getElementById('gameView')) refuse('the page has no #gameView');
  const errsAt = () => { if ((o.errs || []).length) refuse('the page threw: ' + o.errs.slice(0, 3).join('; ')); };
  errsAt();

  const f = {}; for (const n of NEED) f[n] = P(n);
  const S = P('S'), DK_EST = P('DK_EST'), rule = RULE.make(w);
  const now = o.now;
  if (P('Date.now()') !== now) refuse("the page's clock is not the run's");
  const mismatch = (gid, pid, what) => refuse(`the page and espn_rule.js disagree on m: ${gid} ${pid}: ${what}`);
  const E0 = PAY.espn;
  const E = E0 && typeof E0 === 'object' && E0.v === 1 && E0.games && typeof E0.games === 'object' && !Array.isArray(E0.games) ? E0.games : {};
  const games = {}, skipped = {};
  const ui0 = { showAll: S.ui.showAll, open: S.ui.open, game: S.ui.game };
  try {
    for (const gid of Object.keys(E).sort()) {
      const e = E[gid];
      if (!e || typeof e !== 'object' || Array.isArray(e)) { skipped[gid] = 'not an entry'; continue; }
      const g = (S.sched || []).find(x => x.id === gid);
      if (!g) { skipped[gid] = 'not on the schedule'; continue; }
      if (String(g.w) !== String(e.w)) { skipped[gid] = `read as week ${e.w}, on the schedule in week ${g.w}`; continue; }
      const k = f.kickoff(g), ko = k ? k.getTime() : NaN;
      if (!isFinite(ko)) { skipped[gid] = 'no kickoff on the schedule'; continue; }
      if (f.hasScore(g)) { skipped[gid] = 'has a score'; continue; }
      if (f.gameStarted(g) || ko <= now) { skipped[gid] = 'kicked off'; continue; }
      const pl = e.pl && typeof e.pl === 'object' && !Array.isArray(e.pl) ? e.pl : null;
      if (!pl || !Array.isArray(pl.td)) { skipped[gid] = e.out && e.out.st === 'none' ? 'no player block: DraftKings had posted none' : 'no player block'; continue; }
      const at = typeof pl.at === 'string' ? Date.parse(pl.at) : NaN;
      if (!isFinite(at) || at >= ko) { skipped[gid] = 'its player block is not dated before kickoff'; continue; }
      /* the page installs every such block at boot (espnPublished): one it did not is the page and the job out of order */
      const inst = f.espnGame(gid, g.w);
      if (!inst) refuse(`the page did not install the payload's ESPN read for ${gid} (the page and the job are out of order)`);
      const td = [...new Set(pl.td.filter(x => typeof x === 'string'))];
      const Rt = f.rosterFor(g, true), Rf = f.rosterFor(g, false);
      const findIn = (R, pid) => { for (const t of [g.a, g.h]) { const x = ((R[t] && R[t].players) || []).find(y => y.pl && y.pl.id === pid); if (x) return x; } return null; };
      const offered = new Set(f.pricedLegs([g]).filter(l => l.stat === 'any_td').map(l => l.pid));
      const V = f.fairVig(g.w);
      const players = {}, expect = {};
      for (const pid of td) {
        const x = findIn(Rt, pid), sp = (S.players && S.players[pid]) || null, ro = (PAY.roster && PAY.roster[pid]) || null;
        const r = { name: x ? x.pl.n : (sp && sp.n) || (ro && ro[2]) || null, team: x ? x.team : (sp && sp.team) || (ro && ro[0]) || null,
          grp: x ? x.pl.grp : (sp && sp.grp) || null, shown: x ? (findIn(Rf, pid) ? 'default' : 'backups') : null,
          m: null, m_est: null, src: null, price: null, ov: null, branch: null, tested: null, alone: null,
          offered: offered.has(pid), p_site: null, inputs: null, m_why: null };
        players[pid] = r;
        if (!x) {
          const off = S.inactive && S.inactive[pid];
          r.m_why = off ? M_WHY.out : M_WHY.absent;
          if (off && P('typeof inactiveWhy') === 'function') { try { r.why_out = String(P('inactiveWhy')(off)); } catch (err) { /* description only */ } }
          expect[pid] = { row: false };
          continue;
        }
        const l = f.statLines(x).find(y => y.prob);
        if (!l) { r.m_why = M_WHY.none; expect[pid] = { row: false }; continue; }
        r.p_site = l.p;
        const tod = f.oddsFor(g.id, pid, 'any_td', 1);
        const te = f.plEst(x, g, l, 'td', 1);
        /* the leg exactly as renderGame builds it */
        const leg = tod != null ? { gid: g.id, pid, stat: 'any_td', k: 1, side: 'over', main: false, price: tod, src: 'real', week: g.w }
          : { gid: g.id, pid, stat: 'any_td', k: 1, side: 'over', main: false, price: te.price, src: te.src, ...(te.src === 'dkline' ? { espn: f.espnOf(te) } : {}), week: g.w };
        const c = f.legChance(leg), cs = f.legFairStated(leg);
        if (!same(c, cs)) mismatch(gid, pid, `legChance ${JSON.stringify(c)} is not legFairStated ${JSON.stringify(cs)}`);
        if (c && (c.hook || !(c.p > 0 && c.p < 1))) mismatch(gid, pid, `legChance ${JSON.stringify(c)} is a hook's or out of range`);
        expect[pid] = { row: true, c, p_site: l.p };
        const team = x.team;
        const rq = { gid, week: g.w, pid, stat: 'any_td', k: 1, team };
        if (tod != null) {
          /* a real price (a pull by hand's, S.odds from PAY.prices): its implied chance over the week's overround */
          Object.assign(r, { src: 'real', price: tod, branch: 'real', tested: true, alone: false, ov: V.player || V.all || null });
          const rr = rule.real({ ...rq, main: false });
          if (!rr || rr.price !== tod) mismatch(gid, pid, `the page's real price ${tod} is not the rule's ${rr && rr.price}`);
          if (c) { if (!(r.ov > 0) || c.p !== clip(RULE.implied(tod) / r.ov)) mismatch(gid, pid, `m ${c.p} is not the real price ${tod} over ${r.ov}`); }
          else if (r.ov > 0) mismatch(gid, pid, `no chance stated for a real price ${tod} with an overround ${r.ov}`);
        } else if (te.src === 'dkline') {
          const inputs = { rush_line: f.espnLineOf(inst, pid, 'rushing_yards'), rec_line: f.espnLineOf(inst, pid, 'receiving_yards'),
            team_implied: x.ctx && isFinite(x.ctx.implied) ? x.ctx.implied : null, complete: !!f.espnComplete(inst, g, team), starter: !!f.espnStarter(x.pl, team) };
          const branch = f.tdBranch({ grp: x.pl.grp, rushLine: inputs.rush_line, recLine: inputs.rec_line, gameLined: inputs.complete, starter: inputs.starter });
          const ov = V.player || DK_EST.tdVig;
          Object.assign(r, { src: 'dkline', price: te.price, ov, branch, tested: !!te.tested, alone: !!te.alone, inputs });
          if (!BRANCHES.includes(branch) || branch === 'real') mismatch(gid, pid, `the page's branch is ${branch}`);
          if ((branch === 'model') !== !!te.alone) mismatch(gid, pid, `branch ${branch} but alone ${!!te.alone}`);
          /* the rule's own reading: its entry, lines, completeness, starter, branch, overround and price */
          const re = rule.entry(gid, g.w);
          const rb = RULE.tdBranch({ grp: x.pl.grp, rushLine: rule.line(re, pid, 'rushing_yards'), recLine: rule.line(re, pid, 'receiving_yards'),
            complete: !!re && rule.complete(re, g, team), starter: rule.starter(x.pl, team) });
          if (rb !== branch) mismatch(gid, pid, `branch ${branch} where the rule reads ${rb}`);
          if (rule.playerVig(g.w) !== ov) mismatch(gid, pid, `overround ${ov} where the rule reads ${rule.playerVig(g.w)}`);
          const d = rule.price(rq);
          if (!d) mismatch(gid, pid, `the page prices him at ${te.price} where the rule has no price`);
          if (d.price !== te.price) mismatch(gid, pid, `price ${te.price} where the rule says ${d.price}`);
          if (!c) mismatch(gid, pid, 'no chance stated for a price from his listing');
          if (d.fair !== c.p) mismatch(gid, pid, `m ${c.p} where the rule's fair chance is ${d.fair}`);
          if (d.alone !== !!te.alone || d.tested !== !!te.tested) mismatch(gid, pid, `alone/tested ${!!te.alone}/${!!te.tested} where the rule says ${d.alone}/${d.tested}`);
          if (c.p !== clip(RULE.implied(te.price) / ov)) mismatch(gid, pid, `m ${c.p} is not price ${te.price} over ${ov}`);
        } else {
          /* listed, yet priced on the model's own estimate (src 'est'): the rule must agree it cannot price him */
          const d = rule.price(rq);
          if (d) mismatch(gid, pid, `the rule prices him at ${d.price} where the page did not price him from his listing`);
          if (c) mismatch(gid, pid, `a chance ${c.p} stated for a price not from his listing (src ${te.src})`);
          r.m_why = M_WHY.unpriced;
        }
        if (!r.m_why && !c) r.m_why = M_WHY.dash;
      }
      /* the DOM: the game's page with backups shown and every listed player open */
      S.ui.showAll = true; S.ui.open = Object.assign({}, S.ui.open || {}); for (const pid of td) S.ui.open[pid] = true; S.ui.game = gid;
      f.renderGame();
      const view = w.document.getElementById('gameView');
      if (!view) refuse('the page has no #gameView after renderGame');
      const rows = new Map();
      for (const inp of view.querySelectorAll('input[data-leg][data-k="1"]')) {
        const key = inp.getAttribute('data-leg'); if (!/\|any_td$/.test(key)) continue;
        if (rows.has(key)) refuse(`the game's page draws ${key} twice`);
        rows.set(key, inp);
      }
      for (const pid of td) {
        const ex = expect[pid], inp = rows.get(`${gid}|${pid}|any_td`) || null;
        if (!!inp !== ex.row) mismatch(gid, pid, ex.row ? 'his touchdown row is not drawn' : 'a touchdown row is drawn where the page has none for him');
        if (!inp) continue;
        const tr = inp.closest('tr'), cell = tr && tr.querySelector('[data-legchance]');
        if (!!cell !== !!ex.c) mismatch(gid, pid, ex.c ? 'the row draws a dash where legChance states a chance' : 'the row states a chance where legChance has none');
        if (cell) {
          const v = +cell.getAttribute('data-legchance');
          if (v !== ex.c.p) mismatch(gid, pid, `the row states ${cell.getAttribute('data-legchance')} where legChance is ${ex.c.p}`);
          players[pid].m = v; players[pid].m_est = !!ex.c.est;
        }
        const blk = inp.closest('.statblk'), pj = blk && blk.querySelector('[data-td-proj]');
        if (!pj || +pj.getAttribute('data-td-proj') !== ex.p_site) mismatch(gid, pid, `the heading's projection ${pj && pj.getAttribute('data-td-proj')} is not ${ex.p_site}`);
      }
      for (const pid of td) { const r = players[pid]; if ((r.m == null) !== !!r.m_why) mismatch(gid, pid, `m ${r.m} beside m_why ${r.m_why}`); }
      games[gid] = { w: g.w, a: g.a, h: g.h, kickoff: k.toISOString(), read_at: typeof pl.at === 'string' ? pl.at : null,
        out_st: e.out && typeof e.out === 'object' && typeof e.out.st === 'string' ? e.out.st : null, td, players };
    }
  } finally {
    S.ui.showAll = ui0.showAll; S.ui.open = ui0.open; S.ui.game = ui0.game;
    try { const m = w.document.getElementById('gameModal'); if (m) m.hidden = true; } catch (err) { /* the window closes next */ }
  }
  errsAt();

  /* the site's own verdicts for calls coming due, description only */
  const site = {};
  const calls = o.ledger && o.ledger.calls && typeof o.ledger.calls === 'object' && !Array.isArray(o.ledger.calls) ? o.ledger.calls : {};
  for (const key of Object.keys(calls).sort()) {
    const c = calls[key];
    if (!c || typeof c !== 'object' || c.frozen !== true || c.grade) continue;
    const ko = Date.parse(c.kickoff); if (!isFinite(ko) || now < ko + SITE_AFTER_MS) continue;
    const parts = key.split('|');
    const gid = typeof c.game_id === 'string' ? c.game_id : parts[2], pid = typeof c.pid === 'string' ? c.pid : parts[3];
    const week = Number(c.week != null ? c.week : parts[1]);
    if (!gid || !pid || !(week >= 1)) { site[key] = { result: 'pending', how: { unread: 'the call names no game, player or week' } }; continue; }
    const leg = { gid, pid, stat: 'any_td', k: 1, side: 'over', main: false, week, ...(typeof c.team === 'string' && c.team ? { team: c.team } : {}) };
    const v = f.settleLeg(leg), a = f.actualFor(week, pid);
    /* the page's actuals keep no from_snaps (rowStats): the bake's row of zeros says it on the payload's own stats row */
    const raw = a ? ((PAY.stats && PAY.stats[String(week)]) || []).find(x => x && x.player_id === pid && (!x.season_type || x.season_type === 'REG')) : null;
    site[key] = { result: v === 'win' ? 'td' : v === 'loss' ? 'no_td' : v === 'void' ? 'void' : 'pending',
      how: { settle: v == null ? null : String(v), stats_in: !!(S.processedGames && S.processedGames[gid]), stat_row: !!a, from_snaps: !!(raw && Number(raw.from_snaps) > 0),
        any_td: a && a.any_td != null ? a.any_td : null, took_part: f.tookPart(leg), reported_out: !!f.reportedOut(week, pid) } };
  }
  errsAt();

  const counts = { games: Object.keys(games).length, listed: 0, with_m: 0, m_why: {}, branch: {}, shown: {}, src: {}, offered: 0, site: {} };
  const inc = (o2, k2) => { o2[k2] = (o2[k2] || 0) + 1; };
  for (const G of Object.values(games)) for (const r of Object.values(G.players)) {
    counts.listed++; if (r.m != null) counts.with_m++; if (r.offered) counts.offered++;
    if (r.m_why) inc(counts.m_why, r.m_why); if (r.branch) inc(counts.branch, r.branch); inc(counts.shown, String(r.shown)); if (r.src) inc(counts.src, r.src);
  }
  for (const s of Object.values(site)) inc(counts.site, s.result);
  askedAt();
  return { v: 1, now: o.nowText, baked_at: PAY.baked_at, payload_sha256: o.payloadSha,
    page: { app_build: P('typeof APP_BUILD==="string"?APP_BUILD:null'), page_hash: P('typeof PAGE_HASH==="string"?PAGE_HASH:null'), index_sha256: o.indexSha },
    season: PAY.season, current_week: f.currentWeek(), espn_read_at: E0 && typeof E0.read_at === 'string' ? E0.read_at : null,
    ledger_calls: o.ledger ? Object.keys(calls).length : null, games, skipped, site, counts };
}

/* boot the root page on a payload at a clock, optionally patch the window (the test's planted cases), read, close.
   opts: {payloadText, now (ISO), ledger (parsed or null), patch(w) optional}. Resolves to page.json's object; rejects
   with Refuse */
async function run(opts) {
  if (process.env.SUGGEST_PAGE) refuse("the reader boots the site's root index.html alone: unset SUGGEST_PAGE");
  const nowText = String(opts.now || ''), now = Date.parse(nowText);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(nowText) || !isFinite(now)) refuse(`--now ${nowText} is not an ISO time`);
  let payload;
  try { payload = JSON.parse(opts.payloadText); } catch (e) { refuse('the payload is not JSON'); }
  if (!payload || typeof payload !== 'object' || typeof payload.baked_at !== 'string') refuse('the payload has no baked_at');
  const SL = require(path.join(BUILD, 'suggest_ledger.js'));
  const indexSha = sha256(fs.readFileSync(INDEX));
  const { w, errs, asked } = await SL.boot(opts.payloadText, now);
  try {
    if (typeof opts.patch === 'function') opts.patch(w);
    return read(w, { payload, payloadSha: sha256(Buffer.from(opts.payloadText, 'utf8')), indexSha, nowText, now, ledger: opts.ledger || null, errs, asked });
  } finally { try { w.close(); } catch (e) { /* closing only */ } }
}

function args(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!/^--(payload|ledger|now|out)$/.test(k) || i + 1 >= argv.length) refuse(`usage: --payload P --now ISO --out page.json [--ledger L] (at ${k})`);
    a[k.slice(2)] = argv[++i];
  }
  if (!a.payload || !a.now || !a.out) refuse('usage: --payload P --now ISO --out page.json [--ledger L]');
  return a;
}

async function main(argv) {
  let out = null;
  try {
    const a = args(argv);
    out = a.out;
    try { fs.unlinkSync(out); } catch (e) { /* none there */ }
    const payloadText = fs.readFileSync(a.payload, 'utf8');
    let ledger = null;
    if (a.ledger && fs.existsSync(a.ledger)) {
      try { ledger = JSON.parse(fs.readFileSync(a.ledger, 'utf8')); } catch (e) { refuse(`the ledger ${a.ledger} is not JSON`); }
      if (!ledger || typeof ledger !== 'object' || (ledger.calls != null && (typeof ledger.calls !== 'object' || Array.isArray(ledger.calls)))) refuse(`the ledger ${a.ledger} has no calls map`);
    }
    const t0 = Date.now();
    const res = await run({ payloadText, now: a.now, ledger });
    const tmp = out + '.part';
    fs.writeFileSync(tmp, JSON.stringify(res, null, 1) + '\n');
    fs.renameSync(tmp, out);
    const C = res.counts;
    console.log(`td shadow page: written ${out} (${C.games} game${C.games === 1 ? '' : 's'}, ${C.listed} listed, ${C.with_m} with m; `
      + `${Object.keys(res.site).length} site verdict${Object.keys(res.site).length === 1 ? '' : 's'}; ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    return 0;
  } catch (e) {
    if (out) { try { fs.unlinkSync(out + '.part'); } catch (e2) { /* none */ } }
    console.log('td shadow page: refused: ' + (e instanceof Refuse ? e.message : (e && e.stack) || e));
    return 1;
  }
}

module.exports = { run, read, Refuse, M_WHY, NEED, BRANCHES, SITE_AFTER_MS };
if (require.main === module) {
  const wd = setTimeout(() => { console.log(`td shadow page: refused: the reader took more than ${WATCHDOG_MS / 1000} s`); process.exit(1); }, WATCHDOG_MS);
  main(process.argv.slice(2)).then(code => { clearTimeout(wd); process.exit(code); });
}
