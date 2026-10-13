/* The Elo tiers, as the site shows them. The betting app's source (shipped from nfl-model-lab,
   never edited here) has eight, Iron to Challenger at 1700. Two things change at build time,
   in the built app (betting/tools/build.js) and in the copy of the shields the Bets and Stats
   page lifts out of the source (nflbets/build/build.js):

   - Challenger becomes Elite. The Challenger is also one of the models on the Pick'em Record,
     and a Challenger shield beside the Challenger model read as the same thing.
   - A ninth tier above it, HOF, from 1750: two and a half standard deviations up on the
     ladder's bell curve (elo/build.py, THE LADDER), well under one player in a hundred. It is
     worn as a gem, not a shield: cut facets on an iridescent fill that turns slowly, with two
     sparks beside it.
   - A tier below Iron, Wood (the Wood League), under 1350, so the bottom of the ladder
     mirrors the top: Iron is 1350 to 1399 and Wood the rest, worn as a plain, flat wood shield
     with a little grain and nothing else.

   Every edit must land exactly once, so a change to the app that moves these lines stops the
   build rather than quietly dropping a tier. */
const GEM_DEFS = '<linearGradient id="tg-hof-gem" x1="0" y1="0" x2="1" y2="1">'
  + '<stop offset="0" stop-color="#67E8F9"/><stop offset=".38" stop-color="#A78BFA"/><stop offset=".7" stop-color="#F472B6"/><stop offset="1" stop-color="#FCD34D"/>'
  + '<animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;360 .5 .5" dur="8s" repeatCount="indefinite"/></linearGradient>';
const GEM = 'M4.6 3.2 H13.4 L17 7.6 L9 18.8 L1 7.6 Z';
const GEM_SVG = '<svg class="tierbadge tier-hof" viewBox="0 0 18 20" role="img" aria-label="HOF tier"><title>HOF tier (Elo 1750+)</title>'
  + `<path d="${GEM}" fill="none" stroke="#E879F9" stroke-width="2.4" stroke-linejoin="round" opacity=".45"/>`
  + `<path d="${GEM}" fill="url(#tg-hof-gem)" stroke="#5B21B6" stroke-width=".9" stroke-linejoin="round"/>`
  + '<path d="M1 7.6 H17 M4.6 3.2 L6.7 7.6 L9 3.2 L11.3 7.6 L13.4 3.2 M6.7 7.6 L9 18.8 L11.3 7.6" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".65" stroke-linejoin="round"/>'
  + '<path d="M5 3.8 H8.2 L6.5 7 H2.5 Z" fill="#fff" opacity=".5"/>'
  + '<path d="M15.4 .2 l.45 1.15 1.15.45-1.15.45-.45 1.15-.45-1.15-1.15-.45 1.15-.45z" fill="#F59E0B"/>'
  + '<path d="M2.2 13 l.3.8.8.3-.8.3-.3.8-.3-.8-.8-.3.8-.3z" fill="#F59E0B" opacity=".8"/></svg>';
const WOOD_SVG = '<svg class="tierbadge tier-wood" viewBox="0 0 18 20" role="img" aria-label="Wood tier"><title>Wood tier (Elo under 1350)</title>'
  + '<path d="M2 2 H16 V10 C16 15 12.5 17.5 9 19 C5.5 17.5 2 15 2 10 Z" fill="#9A7B56" stroke="#5E4630" stroke-width="1.1"/>'
  + '<path d="M3.5 6.2 C6 5.4 9 7 14.5 6 M3.4 10.4 C7 9.6 10 11.2 14.6 10.2 M5 14.4 C7.5 13.8 10 14.9 13 14.2" fill="none" stroke="#5E4630" stroke-opacity=".45" stroke-width=".7" stroke-linecap="round"/>'
  + '<ellipse cx="11.2" cy="8.3" rx="1.1" ry=".6" fill="none" stroke="#5E4630" stroke-opacity=".5" stroke-width=".6"/></svg>';
const EDITS = [
  ["const TIERS=[['Challenger',1700,'#7C3AED','#4C1D95'],",
   "const TIERS=[['HOF',1750,'#C084FC','#6D28D9'],['Elite',1700,'#7C3AED','#4C1D95'],", 'the tier list'],
  ['<defs>${TIERS.map(', '<defs>' + GEM_DEFS + '${TIERS.map(', 'the gem\'s gradient'],
  ["function tierBadge(elo){ const [name,min,fill,edge]=eloTier(elo); const i=TIERS.findIndex(t=>t[0]===name);",
   'function hofBadge(){ return ' + JSON.stringify(GEM_SVG) + '; }\n'
   + "function tierBadge(elo){ if(eloTier(elo)[0]==='HOF') return hofBadge(); const [name,min,fill,edge]=eloTier(elo); const i=TIERS.findIndex(t=>t[0]===name)-1;",
   'the badge: the gem for HOF, and the shields\' emblems kept on their tiers (HOF sits in front of them)'],
  ["['Iron',-Infinity,'#6B6B6B','#3A3A3A']];", "['Iron',1350,'#6B6B6B','#3A3A3A'],['Wood',-Infinity,'#9A7B56','#5E4630']];", 'Iron given a floor, and Wood below it'],
  ["if(eloTier(elo)[0]==='HOF') return hofBadge();", "if(eloTier(elo)[0]==='HOF') return hofBadge(); if(eloTier(elo)[0]==='Wood') return woodBadge();", 'the wood badge'],
  ["function hofBadge(){", 'function woodBadge(){ return ' + JSON.stringify(WOOD_SVG) + '; }\nfunction hofBadge(){', 'the wood badge itself'],
  /* the app's tier key (no page shows it now) names the bottom tier's range */
  ["${isFinite(t[1])?t[1]+'+':'&lt;1400'}", "${isFinite(t[1])?t[1]+'+':'&lt;1350'}", 'the key\'s range for Wood', 'app'],
];
module.exports = function patchTiers(src, where) {
  for (const [from, to, what, only] of EDITS) {
    if (only === 'app' && where !== 'the built app') continue;
    const n = src.split(from).length - 1;
    if (n !== 1) throw new Error(`the Elo tiers (${where}), ${what}: expected exactly one match, found ${n}`);
    src = src.replace(from, () => to);
  }
  return src;
};
