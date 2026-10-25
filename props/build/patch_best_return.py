"""app v136: a level's "best return" is the best the search can tell apart, not the luckiest of a few thousand draws.

The independent recompute of 24-25 October 2026 (the owner's ask for every number checked) brute-forced every parlay
the rules allow on this week's sets and found three levels where a clearly better parlay cleared the same floor: Kansas
City at Seattle's Extreme (+8.2% expected return by the page's own full sums, the swap one leg), Cincinnati at
Baltimore's Extreme (+4.9%) and Miami at the Jets' Medium (+5.4%). The cause was the last step of pbBestReturn: the
beam's finalists, already ranked by its own score (pbEval: the parlay's chance from pairwise correlations, exact where
the legs are independent and close within one game, times pbDecApprox, the book's price the same way), were ranked again
on parlayProb with 6,000 draws times parlayDec with 4,000, whose noise on a 5-leg same-game parlay runs to 17% of its
expected return, more than the gaps between the finalists, so the pick tended to be whichever finalist drew luckiest.
The card says "best return that lands 25%+", and the numbers it shows were right; the choice was not the best.

Now the finalists keep the beam's own order (expected return where the level has a floor, chance for the likeliest),
and each is worked in full by pbExact, the first to clear the floor taken, as before. No draw is spent on the re-rank,
so a set builds a little faster. Nothing else moves: the pools, the beam, the floors, the fill order, the full sums the
card shows and the record grades."""
import io
FILES = {'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'the beam\'s own order (app v136)' not in T['p3'], 'patch_best_return.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p3', """    /* the finalists that clear the floor by the search's own score, best first, worked with the
       real sums on fewer draws; then the best in full, which is what the card shows and what the
       floor is held to */
    const top=[...fin.values()].filter(e=>!floor||e.pr>=floor*0.97).sort((a,b)=>((floor?b.ev-a.ev:b.pr-a.pr))||a.id.localeCompare(b.id)).slice(0,o.final)
      .map(e=>{ const L=pbOrder(e.legs), pr=parlayProb(L,6000).corr, d=parlayDec(L.map(l=>({leg:l,ml:l.price})),4000); return {e,sc:floor?pr*d:pr,ok:!floor||pr>=floor*0.97}; })
      .filter(x=>x.ok).sort((a,b)=>(b.sc-a.sc)||a.e.id.localeCompare(b.e.id));
    for(const x of top){ const r=pbExact(x.e.legs); if(!floor||r.corr>=floor) return r; }""",
     """    /* the finalists that clear the floor by the search's own score, in the beam's own order (app v136): its
       score is exact where the legs are independent and close within a game, where a re-rank on a few
       thousand draws was noisier than the gaps between them; then each in full, which is what the card shows
       and what the floor is held to, the first to clear it taken */
    const top=[...fin.values()].filter(e=>!floor||e.pr>=floor*0.97).sort((a,b)=>((floor?b.ev-a.ev:b.pr-a.pr))||a.id.localeCompare(b.id)).slice(0,o.final);
    for(const e of top){ const r=pbExact(e.legs); if(!floor||r.corr>=floor) return r; }""", 'pbBestReturn: the beam\'s own order')

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print('patched: app v136, a level\'s best return in the beam\'s own order')
