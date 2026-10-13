/* The one download rule the NFL jobs' Node steps share (betting/tools/update.js, the Season Tracker's
   news/tools/lib.js and pull-week.js); lib/netfetch.py is the same rule for Python, and its docstring
   says why (13 October 2026: three 500s in a row on one nflverse file refused the Elo job's run, which
   passed on a re-run an hour later).

     tried again    HTTP 408, 425, 429 and any 5xx (and any status a caller adds in `retryOn`, as the
                    Season Tracker adds 403 for ESPN, which refuses one set of headers and takes another);
                    a timeout, a reset or refused connection, a body cut off part way; and a body the
                    caller's `check` rejects (an empty file, an HTML page in place of a CSV)
     answered       a 404 and every other 4xx, at once: the error carries `status`, so a caller that
     at once        reads a 404 as "not posted yet" still can
     waits          5, 15, 30 and 60 seconds (five tries over nearly two minutes), every wait out of one
                    budget for the whole process (ten minutes), so an outage still fails the run in minutes;
                    with the budget spent a file gets one try
     timeout        each try, body included, is abandoned after `timeoutMs` (three minutes), so a stalled
                    transfer cannot hold a job until GitHub's six-hour limit

   fetchRetry(url, opts) resolves to { body, res } (body read by opts.read: 'text', the default, 'json'
   or 'buffer') or rejects with a FetchError saying what the last try got, how many tries were made and
   over how long. opts.headers is one set of headers, or a list tried in turn, a try at a time.
   lib/test_netfetch.js holds it to its cases on a local server. */
'use strict';

const WAITS_MS = [5000, 15000, 30000, 60000];
const BUDGET_MS = 600000;
const budget = { left: BUDGET_MS };

class FetchError extends Error {
  constructor(msg, status, tries) { super(msg); this.name = 'FetchError'; this.status = status ?? null; this.tries = tries; }
}

const transient = (status, extra = []) => status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599) || extra.includes(status);
const short = u => { try { return new URL(u).pathname.split('/').pop() || u; } catch (e) { return u; } };
const dur = ms => ms < 90000 ? `${Math.round(ms / 1000)}s` : `${(ms / 60000).toFixed(1)} min`;
const what = e => e instanceof FetchError || e?.httpStatus ? e.message : (e?.name === 'TimeoutError' || e?.name === 'AbortError') ? 'no answer within the timeout'
  : [e?.message, e?.cause?.code || e?.cause?.message].filter(Boolean).join(': ');

async function fetchRetry(url, opts = {}) {
  const waits = opts.waits || WAITS_MS, timeoutMs = opts.timeoutMs || 180000, extra = opts.retryOn || [];
  const sleep = opts.sleep || (ms => new Promise(r => setTimeout(r, ms)));
  const log = opts.log || (m => console.log(m));
  const sets = Array.isArray(opts.headers) ? opts.headers : [opts.headers || {}];
  const name = opts.name || short(url), start = Date.now();
  let last, status = null, i = 0;
  for (i = 0; i <= waits.length; i++) {
    try {
      const res = await (opts.fetch || fetch)(url, { headers: sets[i % sets.length], redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
      status = res.status;
      if (!res.ok) {
        try { await res.body?.cancel(); } catch (e) { /* the error page is not read */ }
        const e = new Error(`HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''}`); e.httpStatus = res.status;
        if (!transient(res.status, extra)) throw new FetchError(`${name}: ${e.message}`, res.status, i + 1);
        throw e;
      }
      const read = opts.read || 'text';
      const body = typeof read === 'function' ? await read(res) : read === 'json' ? await res.json() : read === 'buffer' ? Buffer.from(await res.arrayBuffer()) : await res.text();
      const bad = opts.check && opts.check(body);
      if (bad) { status = null; throw new Error(bad); }
      if (i) log(`  ${name}: had on try ${i + 1}`);
      return { body, res };
    } catch (e) {
      if (e instanceof FetchError) throw e;
      last = e; if (!e.httpStatus) status = null;
    }
    if (i < waits.length) {
      const w = Math.min(waits[i], budget.left);
      if (w <= 0 && waits[i] > 0) { log(`  ${name}: ${what(last)}; the run has spent its retry budget, so no more tries`); break; }
      log(`  ${name}: ${what(last)}; trying again in ${Math.round(w / 1000)}s (try ${i + 2} of ${waits.length + 1})`);
      budget.left -= w;
      await sleep(w);
    }
  }
  const tries = Math.min(i + 1, waits.length + 1);
  throw new FetchError(`${name}: ${what(last)}, on ${tries} ${tries === 1 ? 'try' : 'tries'} over ${dur(Date.now() - start)} (the host or the network; the next run tries again)`, status, tries);
}

module.exports = { fetchRetry, FetchError, WAITS_MS, BUDGET_MS, budget, transient };
