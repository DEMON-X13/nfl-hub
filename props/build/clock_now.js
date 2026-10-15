/* A check run as if it were another instant: PROPS_AUDIT_NOW for the props audit (audit.js), SMOKE_NOW
 * for the Bets and Stats page smoke (nflbets/build/smoke.js), each an ISO time ("2026-10-18T19:00Z").
 *
 * One offset, the named instant less the real clock at start, is laid on Node's Date (the constructor
 * with no argument and Date.now) and on the Date of every jsdom window the returned JSDOM class makes,
 * before the page's first script runs, so the page and the check read the same clock and both tick on
 * from the instant named. A check's own later moves of either clock (the audit's set-back to before
 * the week's last kickoff, a kickoff passed for one check) are laid over it as they are over the real
 * clock. Unset, nothing is touched: the JSDOM class comes back as it is and Node's Date stays native.
 *
 * It is how a past payload is audited at its own moment (props/build/test_audit_phases.py), and how a
 * check that turns on the hour (a Sunday at 3pm, a Monday night under way) is tried on any day. */
'use strict';
function shifted(RD, off) {
  /* now() reads RD and never `this`, so Date.now taken off the class and called bare still works */
  class D extends RD {
    constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); }
    static now() { return RD.now() + off; }
  }
  return D;
}
/* name: the environment variable; JSDOM: jsdom's own class. Returns the class to construct pages with. */
function jsdomAt(name, JSDOM) {
  const T = process.env[name];
  if (!T) return JSDOM;
  const at = Date.parse(T);
  if (!isFinite(at)) throw new Error(`${name}=${T} is not a time Date.parse can read`);
  const off = at - Date.now();
  globalThis.Date = shifted(Date, off);
  console.log(`clock: ${name} ${T}, the run's clock and every page's moved ${(off / 3600e3).toFixed(2)}h`);
  return class extends JSDOM {
    constructor(html, o = {}) {
      const bp = o.beforeParse;
      super(html, { ...o, beforeParse(w) { w.Date = shifted(w.Date, off); if (bp) bp(w); } });
    }
  };
}
module.exports = { jsdomAt, shifted };
