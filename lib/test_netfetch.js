/* lib/netfetch.js held to its cases on a local server (no network, no real waits):

     node lib/test_netfetch.js          # must end "0 failures"

   The same cases as lib/test_netfetch.py: three 500s then the file; a 404 at once with its status;
   a 500 every time, five tries and a FetchError; another 4xx at once; 429/503/502 tried again; a body
   the caller's check rejects tried again; a dropped connection and a stalled answer tried again; the
   run's budget; a status the caller adds (403) tried again with the next set of headers. */
'use strict';
const http = require('http');
const N = require('./netfetch');

const BODY = 'season,week,team\n' + '2026,6,LA\n'.repeat(50);
const plan = {}, hits = {}, uas = {};
const srv = http.createServer((req, res) => {
  const p = req.url; hits[p] = (hits[p] || 0) + 1; (uas[p] = uas[p] || []).push(req.headers['x-set'] || '');
  const seq = plan[p], act = seq.length > 1 ? seq.shift() : seq[0];
  if (act === 'reset') return req.socket.destroy();
  if (act === 'slow') return setTimeout(() => { try { res.end(BODY); } catch (e) {} }, 1500);
  const body = act === 'html' ? '<!DOCTYPE html><html>sign in</html>' + ' '.repeat(300) : act === 'empty' ? '' : BODY;
  const code = typeof act === 'number' ? act : 200;
  res.writeHead(code, { 'Content-Type': 'text/csv' }); res.end(code === 200 ? body : '');
});
const fails = [];
const check = (ok, w) => { console.log((ok ? '  ok   ' : '  FAIL ') + w); if (!ok) fails.push(w); };
const csvCheck = t => (t.length < 200 || /<html/i.test(t.slice(0, 300))) ? 'not a CSV' : null;

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  const run = async (p, answers, o = {}) => {
    plan[p] = answers.slice(); hits[p] = 0; const slept = [];
    N.budget.left = o.budget ?? N.BUDGET_MS; delete o.budget;
    try { const r = await N.fetchRetry(base + p, { sleep: ms => { slept.push(ms); }, log: () => {}, check: csvCheck, timeoutMs: 5000, ...o }); return { body: r.body, slept, n: hits[p] }; }
    catch (e) { return { err: e, slept, n: hits[p] }; }
  };
  console.log('lib/netfetch.js');
  let r = await run('/a.csv', [500, 500, 500, 200]);
  check(r.body === BODY && r.n === 4 && r.slept.join() === '5000,15000,30000', 'three 500s then the file: read on the fourth try, after 5, 15 and 30s');
  r = await run('/b.csv', [404]);
  check(r.err instanceof N.FetchError && r.err.status === 404 && r.n === 1 && !r.slept.length, 'a 404 is answered at once, with status 404');
  r = await run('/c.csv', [500]);
  check(r.err && r.err.status === 500 && r.err.tries === 5 && r.n === 5 && r.slept.join() === '5000,15000,30000,60000', 'a 500 every time: five tries, then a FetchError with status 500');
  check(r.err && /5 tries/.test(r.err.message) && /HTTP 500/.test(r.err.message), 'the error says what and how many tries: ' + (r.err && r.err.message));
  r = await run('/d.csv', [403]);
  check(r.err && r.err.status === 403 && r.n === 1, 'another 4xx (403) is not tried again');
  r = await run('/e.csv', [429, 503, 502, 200]);
  check(r.body === BODY && r.n === 4, '429, 503 and 502 are tried again');
  r = await run('/f.csv', ['empty', 'html', 200]);
  check(r.body === BODY && r.n === 3, "a body the caller's check rejects (empty, an HTML page) is tried again");
  r = await run('/g.csv', ['reset', 200]);
  check(r.body === BODY && r.n === 2, 'a dropped connection is tried again');
  r = await run('/h.csv', ['slow', 200], { timeoutMs: 400 });
  check(r.body === BODY && r.n === 2, 'a try with no answer within its timeout is tried again');
  r = await run('/i.csv', [500], { budget: 12000 });
  check(r.err && r.slept.join() === '5000,7000' && r.n === 3, "the run's retry budget caps the waits (12s left: 5, then 7, then no more tries)");
  r = await run('/j.csv', [500, 200], { budget: 0 });
  check(r.err && r.err.status === 500 && r.n === 1, 'with the budget spent a file gets one try');
  r = await run('/k.csv', [403, 200], { retryOn: [403], headers: [{ 'x-set': 'one' }, { 'x-set': 'two' }] });
  check(r.body === BODY && r.n === 2 && uas['/k.csv'].join() === 'one,two', 'a status the caller adds (403) is tried again, with the next set of headers');
  r = await run('/l.json', [500, 200], { read: res => res.text().then(t => ({ len: t.length })), check: null });
  check(r.body && r.body.len === BODY.length, 'a caller can read the body its own way');
  console.log(`${fails.length} failures`);
  srv.close(); process.exit(fails.length ? 1 : 0);
});
