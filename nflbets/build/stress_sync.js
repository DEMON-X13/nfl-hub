/* Stress the sync layer: three of X's devices and one visitor's on one stubbed store, many times over.
 *
 *   node nflbets/build/stress_sync.js [seed]       (from the hub root; build the page first)
 *
 * Run it after any change to nflbets/build/sync.js (a run takes a minute or two). The three
 * owner's devices (each marked by the smoke's own owner link secret) make sixty random moves
 * between them -- saving a parlay, deleting one it can see, changing its stake, going to the
 * background (no polls), losing and regaining its signal -- while the store answers every request
 * after a random delay of up to 0.4 s, so requests cross and writes race for real. The visitor's
 * device makes moves of its own in the same stream -- saving and deleting its own parlays,
 * changing its stake, losing its signal -- and looks at X's every so often. Then every device
 * comes back and looks a few times. It fails unless the store and every owner's device hold the
 * same parlays and stake, every parlay saved and not deleted is there, none deleted came back, the
 * visitor's device never wrote to the store, its view of X's parlays is the store's, and none of
 * its own parlays went into X's. The scripted versions of these races are in smoke.js; this is the
 * same thing at random.
 */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { JSDOM } = require(path.join(ROOT, 'props', 'build', 'node_modules', 'jsdom'));
const Papa = require(path.join(ROOT, 'props', 'build', 'node_modules', 'papaparse'));
const HTML = fs.readFileSync(path.join(ROOT, 'nflbets', 'index.html'), 'utf8');
const STATE = fs.readFileSync(path.join(ROOT, 'betting', 'state.json'), 'utf8');
const PAYLOAD = fs.readFileSync(path.join(ROOT, 'props', 'data', 'payload.json'), 'utf8');
const PARLAYS = fs.readFileSync(path.join(ROOT, 'liveparlays', 'parlays.json'), 'utf8');
const URL0 = 'https://store.test/nflhub';   /* nflbets/sync.json is answered with this, so the real store is never touched */
/* the owner link, checked against a secret of the stress run's own (the site's real one is not in the repository) */
const SECRET = 'stress-owner-secret', HASH = require('crypto').createHash('sha256').update(SECRET).digest('hex');
const WEBCRYPTO = require('crypto').webcrypto, { TextEncoder: NodeTextEncoder } = require('util');
const seed = +(process.argv[2] || 1); let rs = seed; const rnd = () => { rs = (rs * 1103515245 + 12345) % 2147483648; return rs / 2147483648; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const store = { node: null, puts: 0 };
const ok = (body) => ({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(body)) });
function storeFetch(s, o, net) {
  if (/sync\.json/.test(s)) return Promise.resolve(ok({ url: URL0, ownerHash: HASH }));
  if (!s.startsWith('https://store.test/')) return null;
  if (net.down) return Promise.reject(new TypeError('Failed to fetch'));
  if (o && o.method && o.method !== 'GET') net.writes++;
  if (!s.startsWith(URL0)) return Promise.resolve(ok(null));     /* the X Bet Log's document: empty */
  const p = s.slice(URL0.length).replace(/\?.*$/, '');
  return wait(rnd() * 400).then(() => {
    if (o && o.method === 'PUT') { store.node = JSON.parse(o.body); store.puts++; return ok(null); }
    if (p === '/rev.json') return ok(store.node ? store.node.rev : null);
    if (p === '/doc.json') return ok(store.node ? store.node.doc : null);
    return { ok: false, status: 404, json: async () => null };
  });
}
function boot(net, owner) {
  return new Promise(resolve => {
    const dom = new JSDOM(HTML, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/nflbets/', beforeParse(w) {
      w.Papa = Papa; w.confirm = () => true; w.alert = () => {}; w.scrollTo = () => {};
      Object.defineProperty(w, 'crypto', { value: WEBCRYPTO, configurable: true }); w.TextEncoder = NodeTextEncoder;
      if (owner) w.localStorage.setItem('nflowner_v1', SECRET);
      w.fetch = (u, o) => { const s = String(u); const r = storeFetch(s, o, net); if (r) return r;
        if (s.includes('state.json')) return Promise.resolve(ok(JSON.parse(STATE)));
        if (s.includes('payload.json')) return Promise.resolve(ok(JSON.parse(PAYLOAD)));
        if (s.includes('parlays.json')) return Promise.resolve(ok(JSON.parse(PARLAYS)));
        return Promise.resolve({ ok: false, status: 404, json: async () => null }); };
      w.document.addEventListener('app-ready', () => setTimeout(() => resolve(w), 300)); } });
  });
}
(async () => {
  /* three of X's devices, then the visitor's */
  const nets = [{ down: false, writes: 0 }, { down: false, writes: 0 }, { down: false, writes: 0 }, { down: false, writes: 0 }];
  const W = [];
  for (let i = 0; i < 4; i++) { W.push(await boot(nets[i], i < 3)); await wait(700); }
  const V = W[3];
  const roles = W.map(w => w.NFLSYNC.role());
  const added = new Set(), deleted = new Set(), vAdded = new Set(), vDeleted = new Set(); let k = 0;
  const g = (() => { const S = W[0].eval('S'); const wk = Math.max(...S.sched.map(x => +x.w)); return S.sched.find(x => +x.w === wk); })();
  const leg = { gid: g.id, pid: 'team:' + g.h, stat: 'ml', k: 0, side: 'over', main: false, p: 0.5, price: -110, src: 'real', name: g.h, team: g.h, pos: 'Game', grp: 'TEAM', week: g.w, label: 'To win' };
  const setVis = (w, v) => { Object.defineProperty(w.document, 'visibilityState', { value: v, configurable: true }); w.document.dispatchEvent(new w.Event('visibilitychange')); };
  for (let step = 0; step < 60; step++) {
    const i = Math.floor(rnd() * 4), w = W[i], S = w.eval('S'), r = rnd(), own = i < 3;
    const re = own ? /^p\d+$/ : /^v\d+$/;
    if (r < 0.45) { const id = (own ? 'p' : 'v') + (k++); (own ? added : vAdded).add(id); S.saved.push({ id, saved: 'x', week: g.w, stake: 1, payout: 2, price: 100, legs: [leg] }); w.eval('save(); renderParlay();'); }
    else if (r < 0.6) { const mine = S.saved.filter(p => re.test(p.id)); if (mine.length) { const x = mine[Math.floor(rnd() * mine.length)]; (own ? deleted : vDeleted).add(x.id); S.saved = S.saved.filter(p => p.id !== x.id); w.eval('save(); renderParlay();'); } }
    else if (r < 0.75) { S.stake = 1 + Math.floor(rnd() * 99); w.eval('save();'); }
    else if (r < 0.82) { setVis(w, w.document.visibilityState === 'hidden' ? 'visible' : 'hidden'); }
    else if (r < 0.88) { nets[i].down = !nets[i].down; if (!nets[i].down) w.dispatchEvent(new w.Event('online')); }
    else if (!own) await w.NFLSYNC.poll();
    await wait(rnd() * 900);
  }
  /* everyone back, visible and online, and let it settle */
  for (let i = 0; i < 4; i++) { nets[i].down = false; setVis(W[i], 'visible'); W[i].dispatchEvent(new W[i].Event('online')); }
  for (let r = 0; r < 4; r++) { await wait(9000); for (const w of W) await w.NFLSYNC.poll(); }
  await wait(3000);
  const docIds = new Set(JSON.parse(store.node.doc.json).prop.saved.map(p => p.id));
  const views = W.slice(0, 3).map(w => new Set(w.eval('S').saved.map(p => p.id)));
  const want = [...added].filter(id => !deleted.has(id));
  const lost = want.filter(id => !docIds.has(id)), back = [...deleted].filter(id => docIds.has(id));
  const agree = views.every(v => v.size === docIds.size && [...v].every(id => docIds.has(id)));
  const stakes = W.slice(0, 3).map(w => w.eval('S').stake), stakeDoc = JSON.parse(store.node.doc.json).prop.stake;
  /* the visitor: wrote nothing, sees X's parlays as the store holds them, kept its own apart */
  const x = V.NFLSYNC.x(), vx = new Set(((x && x.prop && x.prop.saved) || []).map(p => p.id));
  const readerSees = vx.size === docIds.size && [...vx].every(id => docIds.has(id));
  const vOwn = new Set(V.eval('S').saved.map(p => p.id)), vWant = [...vAdded].filter(id => !vDeleted.has(id));
  const leaked = [...docIds].filter(id => /^v\d+$/.test(id));
  const vKept = vWant.every(id => vOwn.has(id)) && [...vOwn].every(id => /^v\d+$/.test(id));
  console.log(`seed ${seed}: roles ${roles.join('/')}; added ${added.size}, deleted ${deleted.size}, store holds ${docIds.size}, puts ${store.puts}; lost ${lost.join(',') || 'none'}; came back ${back.join(',') || 'none'}; owner's devices agree ${agree}; stakes ${stakes.join('/')} store ${stakeDoc}; recovered ${W.slice(0, 3).map(w => w.NFLSYNC.state().recovered).join('/')}; `
    + `visitor wrote ${nets[3].writes}, sees the store's ${readerSees}, own ${vOwn.size} of ${vWant.length} kept ${vKept}, leaked into X's ${leaked.join(',') || 'none'}`);
  for (const w of W) w.close();
  process.exit(roles.join() !== 'owner,owner,owner,reader' || lost.length || back.length || !agree || stakes.some(s => s !== stakeDoc)
    || nets[3].writes || !readerSees || !vKept || leaked.length ? 1 : 0);
})().catch(e => { console.log('the stress run threw: ' + (e && e.stack || e)); process.exit(1); });
