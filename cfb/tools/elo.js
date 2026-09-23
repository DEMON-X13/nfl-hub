/* The rating model: an Elo over every team that plays an FBS team, with a home-field
   term, a margin-of-victory multiplier and a preseason regression toward the group's
   base rating. Its win probability is the logistic of the rating gap; its spread is the
   gap divided by a fitted points-per-Elo, with a normal margin around that of fitted
   spread. fit.js chooses the parameters on 2014 to last season; update.js replays the
   history and this season with them, and this file is the whole model in both places.

   Conventions: `diff` is home minus away plus home field (zero on a neutral site), so a
   positive diff favours the home side; `homeLine` is the market's home number, negative
   when the home side is favoured; `mu` is the model's expected home margin. */
'use strict';

const DEFAULTS = { K: 40, carry: 0.7, hfa: 60, mov: true, fbsBase: 1500, fcsBase: 1200 };

const expected = diff => 1 / (1 + Math.pow(10, -diff / 400));

/* the standard normal, for cover probabilities */
function Phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422820 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return z >= 0 ? 1 - p : p;
}

class Elo {
  constructor(params = {}, fbsConfs = new Set()) {
    this.p = Object.assign({}, DEFAULTS, params);
    this.r = {};            // team id -> rating
    this.fbs = {};          // team id -> whether the team was FBS when last seen
    this.season = null;
    this.fbsConfs = fbsConfs;
  }
  isFbs(id, conf) { return conf ? this.fbsConfs.has(String(conf)) : !!this.fbs[id]; }
  base(id, conf) { return this.isFbs(id, conf) ? this.p.fbsBase : this.p.fcsBase; }
  rating(id, conf) {
    if (this.r[id] === undefined) this.r[id] = this.base(id, conf);
    return this.r[id];
  }
  /* between seasons every rating moves part of the way back to its base */
  newSeason(season) {
    if (this.season !== null && season !== this.season) {
      for (const id of Object.keys(this.r)) { const b = this.base(id); this.r[id] = b + (this.r[id] - b) * this.p.carry; }
    }
    this.season = season;
  }
  /* the model's view of a game before it is played */
  predict(g) {
    if (this.fbsConfs.size) { if (g.hconf) this.fbs[g.home] = this.fbsConfs.has(String(g.hconf)); if (g.aconf) this.fbs[g.away] = this.fbsConfs.has(String(g.aconf)); }
    const rh = this.rating(g.home, g.hconf), ra = this.rating(g.away, g.aconf);
    const diff = rh - ra + (g.neutral ? 0 : this.p.hfa);
    return { rh, ra, diff, pHome: expected(diff) };
  }
  /* rate a finished game; returns the pre-game view so a replay can keep it */
  play(g) {
    const pre = this.predict(g);
    const margin = g.hs - g.as;
    const s = margin > 0 ? 1 : margin < 0 ? 0 : 0.5;
    let mult = 1;
    if (this.p.mov) {
      const winnerDiff = margin >= 0 ? pre.diff : -pre.diff;
      mult = Math.log(Math.abs(margin) + 1) * (2.2 / (winnerDiff * 0.001 + 2.2));
    }
    const delta = this.p.K * mult * (s - pre.pHome);
    this.r[g.home] = pre.rh + delta; this.r[g.away] = pre.ra - delta;
    return Object.assign(pre, { margin, delta });
  }
}

/* the spread side of the model: margin = diff / ppe + b, fitted by least squares on
   (diff, margin) pairs, plus the standard deviation of what is left. The intercept
   carries what home field is worth in points beyond what it is worth in wins */
function fitSpread(pairs) {
  const n = pairs.length; let sx = 0, sy = 0;
  for (const [d, m] of pairs) { sx += d; sy += m; }
  const mx = sx / n, my = sy / n; let sxx = 0, sxy = 0;
  for (const [d, m] of pairs) { sxx += (d - mx) * (d - mx); sxy += (d - mx) * (m - my); }
  const slope = sxy / sxx, b = my - slope * mx;
  let se = 0;
  for (const [d, m] of pairs) { const e = m - (slope * d + b); se += e * e; }
  return { ppe: 1 / slope, b, sd: Math.sqrt(se / Math.max(1, n - 2)) };
}
const spreadOf = (diff, model) => diff / model.ppe + (model.b || 0);

/* cover, push and lose chances for the home side against a home line */
function coverProbs(mu, sd, homeLine) {
  if (homeLine === null || homeLine === undefined || !isFinite(homeLine)) return null;
  const at = -homeLine;                        // the home margin that lands exactly on the line
  const whole = Math.abs(at - Math.round(at)) < 1e-9;
  if (whole) {
    const push = Phi((at + 0.5 - mu) / sd) - Phi((at - 0.5 - mu) / sd);
    const cover = 1 - Phi((at + 0.5 - mu) / sd);
    return { cover, push, lose: 1 - cover - push };
  }
  const cover = 1 - Phi((at - mu) / sd);
  return { cover, push: 0, lose: 1 - cover };
}

const roundHalf = x => Math.round(x * 2) / 2;

module.exports = { Elo, DEFAULTS, expected, Phi, fitSpread, spreadOf, coverProbs, roundHalf };
