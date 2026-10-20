/* espn_read.js, the props job's read of DraftKings' lines on ESPN, held to its cases on a local server that answers
   as ESPN did (fixtures/espn/: week 6 of 2026's scoreboard, two games' player lines, three athletes and four clubs'
   rosters), with the real page assembled from this checkout's parts (as assemble.py does) and the published payload,
   its week 6 made three games still to come on the run's clock (Wednesday 14 October 2026, 20:00 UTC):
   SEA at DEN (on the scoreboard, its player lines posted), NYJ at NE (on it, none posted: a 404) and BUF at LV (not
   on it). No request leaves the machine, no credit is spent, props/raw is untouched (a scratch folder).

     A. the read: read.json's shape; SEA at DEN 'ok', its block exactly the page's own parse of the recorded lines
        for every athlete placed by the payload's ESPN ids (espn_rule.js, the audit's copy of the parse), every player
        of the block with how he was placed (id, name or nameKey) and the id ones on the payload's map, its game lines
        and DraftKings' ids from the scoreboard; NYJ at NE 'none', dated by the 404's own Date header; BUF at LV
        'failed', not on the scoreboard; nothing asked of ESPN outside the read
     B. the scoreboard refused (403) with the plain User-Agent is tried again with the next set of headers
     C. each answer recorded under the sha1 of its address with the page's _= cache-buster taken out, the address in
        it with no _=, and nothing but ESPN's two hosts asked of the network
     D. --offline replays them with the server gone: the same read; an answer missing is not reached ('failed')
     E. the deadline: a request ESPN never answers is settled at it, and the read still finishes (exit 0), that game
        'failed' and the read marked cut short
     F. a page with no espnReadWeek writes a skipped read (exit 0), which weekly.py makes a problem
     G. a page that is not there is a crash: exit 1, and no read.json
     H. no log line says "not posted yet (" or starts "BLOCKED" (the props gate reads those as nflverse's)

     node props/build/test_espn_read.js       must end "0 failures"  (about 20 seconds)
     ESPN_READ_UNDER_TEST=props/build/<a copy beside it> node props/build/test_espn_read.js   the same on a planted
                                              copy of the reader, to see a check fail */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), crypto = require('crypto'), cp = require('child_process');
const HERE = __dirname;
const READER = process.env.ESPN_READ_UNDER_TEST ? path.resolve(process.env.ESPN_READ_UNDER_TEST) : path.join(HERE, 'espn_read.js');
const ESPN = require('./espn_rule.js');
const FX = n => fs.readFileSync(path.join(HERE, 'fixtures', 'espn', n), 'utf8');
const SB = JSON.parse(FX('scoreboard_w6.json')), ITEMS = { '401872995': JSON.parse(FX('props_401872995.json')) }, ATH = JSON.parse(FX('athletes.json'));
const ROSTER = (() => { const [h, ...rows] = FX('roster.csv').trim().split(/\r?\n/); const k = h.split(','); return rows.map(r => Object.fromEntries(r.split(',').map((v, i) => [k[i], v]))); })();
const DATE = 'Wed, 14 Oct 2026 20:00:00 GMT', NOW = '2026-10-14T20:00:00Z';
const NOT_POSTED = /^\s*\S+: not posted yet \(/m;

const fails = []; let n = 0;
const check = (ok, what) => { n++; console.log((ok ? '  ok    ' : '  FAIL  ') + what); if (!ok) fails.push(what); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'test_espn_read_'));

/* the page, as assemble.py assembles it, and one with no reader */
const parts = f => fs.readFileSync(path.join(HERE, f), 'utf8');
const html = parts('part1.html') + "let PAY=null;\nconst DATA_URL='../data/payload.json';\n" + parts('part2.js') + '\n' + parts('part3.js') + '\n</script>\n</body>\n</html>\n';
const PAGE = path.join(tmp, 'page.html'); fs.writeFileSync(PAGE, html);
const NOREADER = path.join(tmp, 'noreader.html');
fs.writeFileSync(NOREADER, html.replace('async function espnReadWeek(', 'async function espnReadWeekGone(').replace('window.espnReadWeek=espnReadWeek;', ''));
/* the published payload, its week 6 three games still to come on the run's clock and every earlier game final */
const pay = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'data', 'payload.json'), 'utf8'));
const S = pay.season || 2026, id = (a, h) => `${S}_06_${a}_${h}`;
pay.sched = pay.sched.filter(g => +g.w !== 6).map(g => +g.w < 6 ? { ...g, hs: g.hs != null ? g.hs : 20, as: g.as != null ? g.as : 17 } : g);
pay.sched.push({ id: id('SEA', 'DEN'), w: 6, d: '2026-10-15', t: '20:15', a: 'SEA', h: 'DEN', sp: 2.5, tot: 40.5 },
  { id: id('NYJ', 'NE'), w: 6, d: '2026-10-18', t: '13:00', a: 'NYJ', h: 'NE', sp: 6.5, tot: 42.5 },
  { id: id('BUF', 'LV'), w: 6, d: '2026-10-18', t: '16:25', a: 'BUF', h: 'LV', sp: -3, tot: 47.5 });
pay.week = 6; delete pay.espn;
/* one athlete of SEA at DEN's lines taken off the payload's ESPN ids, so the reader places him by name (ESPN's athlete
   record, here from the roster fixture) */
const PER = ESPN.parse(ITEMS['401872995']);
const BYNAME = Object.keys(PER).find(a => pay.espn_ids && pay.espn_ids[a] && ROSTER.some(r => r.espn_id === a)) || null;
const BYNAME_PID = BYNAME ? pay.espn_ids[BYNAME] : null;
if (BYNAME) { pay.espn_ids = { ...pay.espn_ids }; delete pay.espn_ids[BYNAME]; }
const PAYLOAD = path.join(tmp, 'payload.json'); fs.writeFileSync(PAYLOAD, JSON.stringify(pay));

/* ESPN, at a local server: <base>/<host>/<path> */
const asked = []; let plan = {};
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), [, host] = u.pathname.split('/'), p = u.pathname.slice(host.length + 1) + u.search;
  asked.push({ host, p, ua: req.headers['user-agent'] || '' });
  const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json', Date: DATE }); res.end(body == null ? '' : JSON.stringify(body)); };
  if (/\/scoreboard\?/.test(p)) {
    if (plan.sb403 && /nfl-hub-props\/1\.0/.test(req.headers['user-agent'] || '')) return send(403, { error: 'refused' });
    return send(200, SB);
  }
  let m = /\/events\/(\d+)\/competitions\/\d+\/odds\/100\/propBets\?(.*)$/.exec(p);
  if (m) {
    if (plan.hang === m[1]) return;                                     /* never answered */
    const its = ITEMS[m[1]]; if (!its) return send(404, { error: { message: `No propBets found for eventId ${m[1]} and provider 100`, code: 404 } });
    const q = new URLSearchParams(m[2]), lim = +q.get('limit') || 25, size = lim > 1000 ? 25 : lim, pg = +q.get('page') || 1;
    return send(200, { count: its.length, pageIndex: pg, pageSize: size, pageCount: Math.ceil(its.length / size), items: its.slice((pg - 1) * size, pg * size) });
  }
  m = /\/athletes\/(\d+)\?/.exec(p);
  if (m) { const ro = ROSTER.find(r => r.espn_id === m[1]);
    return ATH[m[1]] ? send(200, ATH[m[1]]) : ro ? send(200, { id: m[1], fullName: ro.full_name, displayName: ro.full_name }) : send(404, { error: { code: 404 } }); }
  m = /\/teams\/(\w+)\/roster$/.exec(p);
  if (m) { const ab = { 26: 'SEA', 7: 'DEN', 20: 'NYJ', 17: 'NE' }[m[1]] || String(m[1]).toUpperCase();
    return send(200, { athletes: [{ position: 'offense', items: ROSTER.filter(r => r.team === ab && r.espn_id).map(r => ({ id: r.espn_id, fullName: r.full_name })) }] }); }
  send(404, {});
});

/* one run of the reader: {rc, out, read, ms} */
function reader(dir, env = {}, args = []) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const p = cp.spawn(process.execPath, [READER, ...args], { cwd: HERE,
      env: { ...process.env, PROPS_ESPN_DIR: dir, PROPS_ESPN_PAGE: PAGE, PROPS_ESPN_PAYLOAD: PAYLOAD, PROPS_ESPN_NOW: NOW, PROPS_ESPN_REPLAY: '', ...env } });
    let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
    p.on('close', rc => { let read = null; try { read = JSON.parse(fs.readFileSync(path.join(dir, 'read.json'), 'utf8')); } catch (e) {}
      resolve({ rc, out, read, ms: Date.now() - t0 }); });
  });
}
const sha = s => crypto.createHash('sha1').update(s).digest('hex');
const logs = [];

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    /* A, B, C: the read, online at the local server, the scoreboard refused once */
    const dir = path.join(tmp, 'a'); fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'read.json'), JSON.stringify({ v: 1, week: 6, read_at: '2026-10-01T00:00:00Z', games: {} }));   /* an earlier run's */
    plan = { sb403: true }; asked.length = 0;
    const A = await reader(dir, { PROPS_ESPN_BASE: base }); logs.push(A.out);
    const r = A.read, G = r && r.games || {};
    check(A.rc === 0 && r && r.v === 1 && r.week === 6, `A: the read is written, week 6, exit 0 (exit ${A.rc}): ${A.out.trim().split('\n').slice(-2).join(' | ')}`);
    const ra = r ? Date.parse(r.read_at) - Date.parse(NOW) : NaN;
    check(ra >= 0 && ra < 60000, `A: read_at is the run's clock as the read began, not an earlier run's (${r && r.read_at})`);
    check(Object.keys(G).sort().join() === [id('BUF', 'LV'), id('NYJ', 'NE'), id('SEA', 'DEN')].sort().join(), `A: one entry for each of week 6's games still to come: ${Object.keys(G)}`);
    const sd = G[id('SEA', 'DEN')] || {}, nn = G[id('NYJ', 'NE')] || {}, bl = G[id('BUF', 'LV')] || {};
    check(sd.out && sd.out.st === 'ok' && sd.out.at === new Date(DATE).toISOString() && sd.pl && sd.pl.at === sd.out.at, `A: SEA at DEN read 'ok', dated by ESPN's Date header: ${JSON.stringify(sd.out)}`);
    /* the block against the checks' own parse of the recorded lines, for every athlete the payload's ids place */
    const per = PER, byId = {};
    for (const [aid, pid] of Object.entries(pay.espn_ids || {})) if (per[aid]) byId[pid] = aid;
    if (BYNAME) byId[BYNAME_PID] = BYNAME;
    let same = 0; const bad = [];
    for (const [pid, aid] of Object.entries(byId)) {
      const want = per[aid], gotL = (sd.pl && sd.pl.lines || {})[pid] || {}, gotR = (sd.pl && sd.pl.rungs || {})[pid] || {}, gotT = (sd.pl && sd.pl.td || []).includes(pid);
      const sortR = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, [...o[k]].sort((x, y) => x - y)]));
      if (JSON.stringify(Object.fromEntries(Object.entries(want.lines).sort())) === JSON.stringify(Object.fromEntries(Object.entries(gotL).sort()))
        && JSON.stringify(sortR(want.rungs)) === JSON.stringify(sortR(gotR)) && !!want.td === gotT) same++;
      else bad.push(pid);
    }
    check(same === Object.keys(per).length && same >= 5 && !bad.length, `A: every athlete of the recorded lines, placed by the payload's ESPN ids or by name, carries exactly his recorded lines, rungs and touchdown (${same} of ${Object.keys(per).length}; wrong: ${bad.slice(0, 4)})`);
    const placed = sd.placed || {}, inBlock = new Set([...Object.keys(sd.pl && sd.pl.lines || {}), ...Object.keys(sd.pl && sd.pl.rungs || {}), ...(sd.pl && sd.pl.td || [])]);
    const noHow = [...inBlock].filter(pid => !placed[pid] || !['id', 'name', 'nameKey'].includes(placed[pid].how));
    const idWrong = Object.entries(placed).filter(([pid, x]) => x.how === 'id' && (pay.espn_ids || {})[x.aid] !== pid);
    check(inBlock.size >= 5 && !noHow.length && !idWrong.length, `A: each player of the block says how he was placed, the id ones on the payload's map (${inBlock.size} players; no record: ${noHow.slice(0, 3)}; off the map: ${idWrong.slice(0, 3).map(x => x[0])})`);
    const nm = BYNAME_PID && placed[BYNAME_PID], ro = BYNAME && ROSTER.find(x => x.espn_id === BYNAME);
    check(!!BYNAME && nm && nm.how === 'name' && nm.aid === BYNAME && nm.name === ro.full_name, `A: an athlete with no ESPN id on the payload is placed by name, and the read says so with ESPN's name: ${JSON.stringify(nm)} (${ro && ro.full_name})`);
    const want = ESPN.oddsOf(SB.events.find(e => e.id === '401872995'), { a: 'SEA', h: 'DEN' });
    check(sd.gl && want && JSON.stringify(sd.gl.lines) === JSON.stringify(want.lines) && sd.gl.at === new Date(DATE).toISOString() && Object.keys(sd.gl.ids || {}).length > 0 && /^\d+$/.test(sd.gl.event || ''),
      `A: SEA at DEN's game lines are the scoreboard's DraftKings lines, with their ids and the event: ${JSON.stringify(sd.gl).slice(0, 200)}`);
    check(nn.out && nn.out.st === 'none' && nn.out.at === new Date(DATE).toISOString() && nn.pl === null && nn.placed === null, `A: NYJ at NE's 404 is 'none', dated by the 404's own Date header, no block: ${JSON.stringify(nn.out)}`);
    check(bl.out && bl.out.st === 'failed' && /scoreboard/.test(bl.out.why || '') && bl.gl === null && bl.out.at === null, `A: BUF at LV, not on the scoreboard, 'failed', undated: ${JSON.stringify(bl.out)}`);
    const sbs = asked.filter(a => /\/scoreboard\?/.test(a.p));
    check(r && r.outside === 0 && r.deadline === false && r.replay === null && r.requests === asked.length - (sbs.length - 1), `A: nothing asked of ESPN outside the read, no deadline, every request the page made the server's (${r && r.requests} of ${asked.length}, one a retry)`);
    /* B */
    check(sbs.length === 2 && /nfl-hub-props\/1\.0/.test(sbs[0].ua) && !/nfl-hub-props/.test(sbs[1].ua), `B: the scoreboard refused (403) with the plain User-Agent is tried again with the next set: ${sbs.map(a => a.ua).join(' | ')}`);
    /* C */
    const recs = fs.readdirSync(dir).filter(f => /^[0-9a-f]{40}\.json$/.test(f)).map(f => ({ f, r: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));
    check(recs.length > 0 && recs.every(x => sha(x.r.url) === x.f.slice(0, 40) && !/[?&]_=/.test(x.r.url) && /^https:\/\/(site\.api|sports\.core\.api)\.espn\.com\//.test(x.r.url)),
      `C: ${recs.length} answers recorded, each under the sha1 of its ESPN address with no _= cache-buster`);
    const sbRec = recs.find(x => /\/scoreboard\?/.test(x.r.url)), nRec = recs.find(x => /401873001\/odds\/100\/propBets/.test(x.r.url));
    check(sbRec && sbRec.r.status === 200 && sbRec.r.date === DATE && nRec && nRec.r.status === 404 && nRec.r.date === DATE, `C: the scoreboard and the 404 recorded with their status and Date header`);
    check(asked.every(a => a.host === 'site.api.espn.com' || a.host === 'sports.core.api.espn.com'), `C: nothing but ESPN's two hosts asked: ${[...new Set(asked.map(a => a.host))]}`);

    /* D: replayed with the server gone */
    srv.close();
    const D = await reader(dir, {}, ['--offline']); logs.push(D.out);
    const strip = x => x && JSON.stringify(x.games);
    check(D.rc === 0 && D.read && strip(D.read) === strip(r) && D.read.replay === dir && D.read.requests === r.requests,
      `D: --offline replays the recordings with no server: the same read (exit ${D.rc}, ${D.read && D.read.requests} requests)`);
    const miss = recs.find(x => /401872995\/competitions\/401872995\/odds\/100\/propBets/.test(x.r.url));
    const dir2 = path.join(tmp, 'd2'); fs.mkdirSync(dir2);
    for (const x of recs) if (x !== miss) fs.copyFileSync(path.join(dir, x.f), path.join(dir2, x.f));
    const D2 = await reader(path.join(tmp, 'd2out'), { PROPS_ESPN_REPLAY: dir2 }); logs.push(D2.out);
    const g2 = D2.read && D2.read.games || {};
    check(D2.rc === 0 && g2[id('SEA', 'DEN')] && g2[id('SEA', 'DEN')].out.st === 'failed' && g2[id('SEA', 'DEN')].gl && g2[id('NYJ', 'NE')].out.st === 'none',
      `D: PROPS_ESPN_REPLAY with SEA at DEN's player lines missing: that game 'failed' (its game lines still read), the rest as recorded: ${JSON.stringify(g2[id('SEA', 'DEN')] && g2[id('SEA', 'DEN')].out)}`);
    check(!fs.readdirSync(dir2).includes('read.json') && fs.readdirSync(dir2).length === recs.length - 1, 'D: a replay writes nothing into the folder it replays');

    /* E: the deadline */
    await new Promise(res => { srv.listen(0, '127.0.0.1', res); });
    const base2 = `http://127.0.0.1:${srv.address().port}`;
    plan = { hang: '401872995' }; asked.length = 0;
    const E = await reader(path.join(tmp, 'e'), { PROPS_ESPN_BASE: base2, PROPS_ESPN_DEADLINE_MS: '4000' }); logs.push(E.out);
    const ge = E.read && E.read.games || {};
    check(E.rc === 0 && E.read && E.read.deadline === true && ge[id('SEA', 'DEN')].out.st === 'failed' && ge[id('NYJ', 'NE')].out.st === 'none' && E.ms < 15000,
      `E: a request ESPN never answers is settled at the deadline (4 s here) and the read finishes, that game 'failed' (exit ${E.rc}, ${E.ms} ms): ${JSON.stringify(ge[id('SEA', 'DEN')] && ge[id('SEA', 'DEN')].out)}`);
    const eRec = fs.readdirSync(path.join(tmp, 'e')).filter(f => /^[0-9a-f]{40}\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(path.join(tmp, 'e', f), 'utf8')).url);
    check(!eRec.some(u => /401872995\/competitions/.test(u)), 'E: an answer the deadline cut short is not recorded (a replay reads it as not reached too)');

    /* F: a page with no reader */
    const F = await reader(path.join(tmp, 'f'), { PROPS_ESPN_BASE: base2, PROPS_ESPN_PAGE: NOREADER }); logs.push(F.out);
    check(F.rc === 0 && F.read && /no espnReadWeek/.test(F.read.skipped || '') && F.read.read_at && !Object.keys(F.read.games).length,
      `F: a page with no espnReadWeek writes a skipped read and exits 0: ${JSON.stringify(F.read)}`);
    /* G: a crash */
    const Gr = await reader(path.join(tmp, 'g'), { PROPS_ESPN_BASE: base2, PROPS_ESPN_PAGE: path.join(tmp, 'no-such-page.html') }); logs.push(Gr.out);
    check(Gr.rc === 1 && !Gr.read, `G: a page that is not there is a crash: exit ${Gr.rc}, no read.json`);
    /* H */
    const all = logs.join('\n');
    check(!NOT_POSTED.test(all) && !/^\s*BLOCKED/m.test(all) && /^ESPN: /m.test(all), 'H: no log line says "not posted yet (" or starts "BLOCKED", and every one starts "ESPN"');
  } catch (e) { check(false, 'the test threw: ' + (e && e.stack || e)); }
  srv.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${n} checks, ${fails.length} failures`);
  process.exit(fails.length ? 1 : 0);
});
