"""Price a same-game parlay the way a book does, and pull DraftKings' own numbers.

Two separate errors both made the app look more generous than DraftKings.

1. Pricing. We multiplied the leg prices. That is what a book pays for legs in
   different games, and wrong for legs in one: they overlap, so the chance they all
   land is higher than the product, the fair price is shorter, and the book holds
   more on top. Measured against two real DraftKings tickets on Detroit at Buffalo,
   multiplying gave 9.24 and 6.46 where DraftKings offered 6.25 and 5.05.
   Correlating the market's own implied chances closes most of that; SGP_HOLD is
   the remainder, fitted to those two tickets.

2. Prices. The pull took the best price across every US book, which no single book
   will ever offer, and built the main line from the best over at one book and the
   best under at another. For someone betting one book that inflates every edge.
   oddsfetch now filters to one bookmaker, DraftKings by default.

The multiplied figure stays on the page as "if the legs were unrelated", because
it is still the right number for a cross-game parlay and it shows what the overlap
is costing.
"""
from pathlib import Path

HERE = Path(__file__).parent
J = HERE / 'part3.js'
O = HERE.parent / 'data' / 'oddsfetch.py'
W = HERE / 'weekly.py'
A = HERE / 'audit.js'


def sub1(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (p.name, s.count(old), old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8', newline='\n')


# ---------------------------------------------------------------- 1. the maths
sub1(J, "/* ---------- suggested parlays: safe, medium, aggressive ----------",
     """/* ---------- what a book pays for a parlay ----------
   Legs in different games multiply: that is exactly what a book does. Legs in one
   game do not, because they overlap. The chance they all land is higher than the
   product, so the fair price is shorter, and the book holds more on a same-game
   ticket than on singles. So each game's legs are priced together from the
   market's own implied chances joined by our correlations, then cut by SGP_HOLD.

   SGP_HOLD is fitted to two real DraftKings tickets on Detroit at Buffalo
   (2026-09-17): correlating the market chances gave 8.05 and 5.79 where DraftKings
   offered 6.25 and 5.05, so 0.82 is the geometric mean of the two ratios. Two
   tickets is a thin sample and this wants refitting as more are collected. */
const SGP_HOLD=0.82;
function parlayDec(priced){
  const byGame={};
  for(const x of priced) (byGame[x.leg.gid]=byGame[x.leg.gid]||[]).push(x);
  let dec=1;
  for(const gid in byGame){
    const grp=byGame[gid];
    const mult=grp.reduce((a,x)=>a*(mlToDec(x.ml)||1),1);
    if(grp.length<2){ dec*=mult; continue; }
    const pj=parlayProb(grp.map(x=>({...x.leg,p:mlProb(x.ml)})),20000).corr;
    dec*=(pj>0&&isFinite(pj))?Math.min(mult,(1/pj)*SGP_HOLD):mult;   /* never pay more than multiplying */
  }
  return dec;
}
const sameGame=legs=>{ const g={}; for(const l of legs) g[l.gid]=(g[l.gid]||0)+1;
  return Object.values(g).some(n=>n>1); };

/* ---------- suggested parlays: safe, medium, aggressive ----------""")

# ---- the builder uses it, and shows the multiplied figure as the contrast ----
sub1(J, "  const bookDec=prices.reduce((a,p)=>a*(mlToDec(p.ml)||1),1);",
     """  const multDec=prices.reduce((a,p)=>a*(mlToDec(p.ml)||1),1);
  const bookDec=parlayDec(legs.map((l,i)=>({leg:l,ml:prices[i].ml})));
  const sg=sameGame(legs);""")

sub1(J, """      <span class="muted">${allBook?'Blank multiplies your real leg prices.':'Blank multiplies the estimated leg prices, which include a typical bookmaker cut.'}</span>""",
     """      <span class="muted">${sg?`Blank prices the legs that share a game together, the way a book does.`:(allBook?'Blank multiplies your real leg prices.':'Blank multiplies the estimated leg prices, which include a typical bookmaker cut.')}</span>""")

sub1(J, """      <div class="box tier ${confTier(pr.corr)[0]}"><b>${confTier(pr.corr)[1]}</b><span>confidence all ${legs.length} land</span></div>
    </div>`;""",
     """      <div class="box tier ${confTier(pr.corr)[0]}"><b>${confTier(pr.corr)[1]}</b><span>confidence all ${legs.length} land</span></div>
    </div>
    ${sg&&override==null?`<p class="muted" style="margin:10px 0 0;font-size:12px">Legs here share a game, so they are priced together rather than multiplied: multiplying them would say <b>$${(stake*multDec).toFixed(2)}</b>, which is what a book pays only when the legs are in different games. The estimate carries a same-game cut fitted to real DraftKings tickets; type your book's own parlay price above to override it.</p>`:''}`;""")

# ---- the game suggestion is always a same-game parlay ----
sub1(J, """  const val=cur.length<2?{legs:[],candidates:cands.length}
    :{legs:cur,candidates:cands.length,corr:parlayProb(cur,20000).corr,dec:dec(cur)};""",
     """  const val=cur.length<2?{legs:[],candidates:cands.length}
    :{legs:cur,candidates:cands.length,corr:parlayProb(cur,20000).corr,
      dec:parlayDec(cur.map(l=>({leg:l,ml:l.price}))),mult:dec(cur)};""")
# and it should chase the payout it will actually get, not the multiplied one
sub1(J, """      const next=[...cur,c], p=parlayProb(next,3000).corr;
      const forced=next.length<2;                                  /* a parlay needs two legs */
      if(!forced&&p<GAME_SUGGEST_FLOOR) continue;
      const score=p*dec(next);""",
     """      const next=[...cur,c], p=parlayProb(next,3000).corr;
      const forced=next.length<2;                                  /* a parlay needs two legs */
      if(!forced&&p<GAME_SUGGEST_FLOOR) continue;
      /* score on what a book would actually pay for these legs together */
      const score=p*parlayDec(next.map(l=>({leg:l,ml:l.price})));""")

sub1(J, """    <p class="muted gsugg-ft">Chance that every leg lands, correlations included. Tick a leg to put it on the parlay.</p></div>`;""",
     """    <p class="muted gsugg-ft">Chance that every leg lands, correlations included. These legs share a game, so the price is what a book pays for them together${s.mult&&s.mult>s.dec*1.02?`, not the ${fmtML(decToML(s.mult))} multiplying them would suggest`:''}. Tick a leg to put it on the parlay.</p></div>`;""")

# ------------------------------------------------------------- 2. one book only
sub1(O, """def parse_event(ev,gid,mains,alts):
    \"\"\"collect best prices from one event's bookmakers: every Over/Under at every point goes to
    mains[(player,stat)][point][side]; every Over (and anytime-TD Yes) goes to alts as an X+ rung\"\"\"
    for bk in ev.get('bookmakers',[]):""",
     """def parse_event(ev,gid,mains,alts,book=None):
    \"\"\"collect prices from one event: every Over/Under at every point goes to
    mains[(player,stat)][point][side]; every Over (and anytime-TD Yes) goes to alts as an X+ rung.
    With book set, only that bookmaker is read, because a best-of-the-market price is not one
    you can actually take and a main line built from one book's over and another's under is not
    a line anybody offers.\"\"\"
    for bk in ev.get('bookmakers',[]):
        if book and bk.get('key')!=book: continue""")

sub1(O, "    ap.add_argument('--regions',default='us');",
     "    ap.add_argument('--regions',default='us'); ap.add_argument('--book',default='draftkings',help=\"only this bookmaker's prices; 'all' for the best across the market, which you cannot actually bet\");")

s = O.read_text(encoding='utf-8')
assert s.count('parse_event(ev,gid,mains,alts); continue') == 1
s = s.replace('parse_event(ev,gid,mains,alts); continue', 'parse_event(ev,gid,mains,alts,book); continue')
assert s.count('parse_event(data,gid,mains,alts)') == 2, s.count('parse_event(data,gid,mains,alts)')
s = s.replace('parse_event(data,gid,mains,alts)', 'parse_event(data,gid,mains,alts,book)')
s = s.replace("    now=datetime.now(timezone.utc)\n", "    now=datetime.now(timezone.utc)\n    book=None if a.book=='all' else a.book\n", 1)
s = s.replace('print(f"next: python mktbuild.py {a.week} wk{a.week}_lines.csv \\"the-odds-api best of {a.regions}\\" {datetime.now(timezone.utc).date()}")',
              'print(f"next: python mktbuild.py {a.week} wk{a.week}_lines.csv \\"{a.book if book else \'best of \'+a.regions}\\" {datetime.now(timezone.utc).date()}")')
O.write_text(s, encoding='utf-8', newline='\n')

# the label the app shows for where its lines came from
sub1(W, """            rc2,out2=run([PY,'mktbuild.py',str(week),f'wk{week}_lines.csv','the-odds-api best of us',str(today)],DATA,'mktbuild')""",
     """            rc2,out2=run([PY,'mktbuild.py',str(week),f'wk{week}_lines.csv','DraftKings via the-odds-api',str(today)],DATA,'mktbuild')""")

# ---------------------------------------------------------------- 3. the audit
sub1(A, "  /* ---- O. one suggested parlay on the game page ---- */",
     """  /* ---- Q. same-game parlays are priced together, not multiplied ---- */
  { const g=openUpcoming(); const roster=rosterFor(g,false);
    const legsOf=n=>{ const out=[];
      for(const tm in roster) for(const x of roster[tm].players){
        for(const l of statLines(x)){ if(l.prob) continue;
          for(const r of l.rungs){ const od=F('oddsFor')(g.id,x.pl.id,l.stat,r.k);
            if(od!=null&&out.length<n) out.push({leg:{gid:g.id,pid:x.pl.id,stat:l.stat,grp:x.pl.grp,k:r.k,side:'over',p:r.p},ml:od}); } } }
      return out; };
    const pd=F('parlayDec');
    const two=legsOf(2);
    if(two.length===2){
      const mult=two.reduce((a,x)=>a*F('mlToDec')(x.ml),1);
      const sgp=pd(two);
      chk(sgp<=mult+1e-9,`a same-game parlay priced above multiplying: ${sgp} vs ${mult}`);
      chk(sgp>1,'a same-game parlay priced at or below the stake');
      /* the same two legs in different games must multiply exactly */
      const apart=[{...two[0]},{leg:{...two[1].leg,gid:'other_game'},ml:two[1].ml}];
      chk(Math.abs(pd(apart)-mult)<1e-9,'legs in different games are not multiplied');
      /* one leg is one price */
      chk(Math.abs(pd([two[0]])-F('mlToDec')(two[0].ml))<1e-9,'a single leg is not its own price');
      console.log(`Q. same-game pricing: 2 legs multiply to ${mult.toFixed(2)}, priced together ${sgp.toFixed(2)}`);
    } else chk(false,'no priced rungs to test same-game pricing with');
    chk(F('sameGame')([{gid:'a'},{gid:'a'}])===true&&F('sameGame')([{gid:'a'},{gid:'b'}])===false,'sameGame does not spot a shared game'); }

  /* ---- O. one suggested parlay on the game page ---- */""")

print('same-game pricing in, and the pull now reads DraftKings only')
