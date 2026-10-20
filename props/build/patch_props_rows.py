r"""app v122: the Props list's rows in the Matchups board's columns, and what they showed at the head of each game's page.

The owner, 20 October 2026, with three screenshots (a game's page on the Props tab with its head card, the one
holding "NE at CHI", marked; a row of the Props list; a row of the Matchups board): "on the first image inside a
matchup for the section I marked as a square, I want to add the info in the second picture, image A, and then on
the main page in props I want to change the matchup to look like image B. this is step 1 in a long process."

1. A game's head (gameHeadCard, in renderGame where the card with the two tags was). It carries what the list's row
   showed until this version, each figure under the list's own heading for it: Kickoff (the day and time, or the
   live score and clock once the scoreboard is read, or FINAL), Matchup (the two tags, a tick by the winner),
   Biggest projections (the three, passing, rushing and receiving, each against what the player did once the
   game's stats are in), Expected score (the score the game's projections stand on, gameCtx, whole points, and
   the actual score once there is one), Total pt and Vegas pick (the side with the bigger number and by how many,
   "even" where they are level, graded once the game is played; "no line yet, our model" where no line is posted).
   Every number is worked exactly as the row worked it, in the row's classes, so the audit's reading of the row
   (A2) reads the head the same way. It stacks in three columns at 980px and under, where the window is too narrow
   for the six side by side.

2. The list's rows (renderSlate's card) are the Matchups board's: Date (the day and the kickoff), Matchup (the
   pick's tag raised, a tick or a cross on the winner's tag once it has won, "vs" at a neutral site), Win
   probability (a bar in the two clubs' own colours, each side's percentage on it), Confidence (the board's band:
   HIGH from 75%, MED from 60%, LOW from 55%, else 50/50, with the favourite's chance), Score prediction and Final
   score (0 : 0 before kickoff; live, the side leading and the clock; played, the side that won and whether the
   pick hit). The numbers are this page's own lines, the ones a game's page prices from, a Refresh odds press
   included (slateCall): the home side's chance from the two moneylines with the book's margin taken out, else
   from the spread, a margin spread MARGIN_SD (13.5 points) about it, as the board reads its own from the betting
   job's copy of the same nflverse lines; with no line posted, the model's own chance (gameBet), the prediction
   saying so; a pick'em spread with no moneylines makes no call, as on the board. The prediction is the score the
   page has always shown (gameCtx), "even" where it is level. The bar's colours are the board's rule (probCols)
   on this page's own tag colours (slateCols), so a bar matches its row's tags. A neutral site is the board's
   reading where the hub's board has the game, else a 9:30am Eastern kickoff, one played abroad. The row is still
   a button that opens the game's page; the columns follow the board's at every width (the narrower columns from
   901 to 1,160px, one card a game at 900px and under).
"""
import io

FILES = {'p1': 'part1.html', 'p2': 'part2.js', 'p3': 'part3.js'}
T = {k: io.open(f, encoding='utf-8').read() for k, f in FILES.items()}
assert 'function gameHeadCard(' not in T['p3'], 'patch_props_rows.py has already been applied'


def sub1(k, old, new, what):
    assert T[k].count(old) == 1, f'{what}: expected the old text exactly once in {FILES[k]}, found {T[k].count(old)}'
    T[k] = T[k].replace(old, new)


sub1('p2', "const APP_BUILD='app v121 \\u00b7 2026-10-20';", "const APP_BUILD='app v122 \\u00b7 2026-10-20';", 'APP_BUILD')

# ---------------------------------------------------------------- part3: the row and the head
i = T['p3'].index("  const card=g=>{\n    const ca=gameCtx(g,g.a), ch=gameCtx(g,g.h), d=fmtDate(g);")
j = T['p3'].index("  /* the games still to play, live ones too, first in kickoff order; the finals under a heading */")
assert T['p3'].count("  const card=g=>{") == 1 and i < j
old_card = T['p3'][i:j]
assert 'gameHeadline(g).map(' in old_card and '<div class="chev">' in old_card
T['p3'] = T['p3'][:i] + r"""  /* (app v122) the Matchups board's row: the date, the matchup, the win probability, the confidence band, the
     score prediction and the final score; what the row showed until then is at the head of the game's page */
  const card=g=>{
    const c=slateCall(g), d=fmtDate(g), o=slateOutcome(g), fin=gameFinal(g), started=gameStarted(g);
    const pa=c?Math.round((1-c.pH)*100):50, ph=100-pa, pc=slateCols(g.a,g.h), [tc,tl]=c?slateTier(c.conf):['',''];
    const pick=c?c.pick:null, neu=slateNeutral(g);
    const win=o&&o.final&&o.as!==o.hs?(o.as>o.hs?g.a:g.h):null, hit=win&&c?c.pick===win:null;
    const mk=t=>win===t&&hit!=null?`<span class="sl-res ${hit?'sl-ok':'sl-bad'}" title="${hit?'Pick hit':'Pick missed'}">${hit?'✓':'✗'}</span>`:'';
    const tg=t=>pick===t?tag(t).replace('class="ttag"','class="ttag sl-win"'):tag(t);
    return `<button type="button" class="game${fin?' final':(started?' locked':'')}" data-game="${g.id}">
      <div class="when"><b>${d.day}</b>${d.t}</div>
      <div class="matchup"><span class="sl-tw sl-away">${tg(g.a)}${mk(g.a)}</span>${neu?'<span class="at neutral" title="Neutral site">vs</span>':'<span class="at">at</span>'}<span class="sl-tw sl-home">${tg(g.h)}${mk(g.h)}</span></div>
      <div class="sl-probrow" aria-label="${esc(g.a)} ${pa}%, ${esc(g.h)} ${ph}%">
        <span class="sl-tlab${pick===g.a?' sl-win':''}">${esc(g.a)}</span>
        <div class="sl-prob"><div class="sl-a" style="width:${pa}%;background:${pc[0].bg};color:${pc[0].ink}"><span class="${pick===g.a?'sl-w':''}">${pa>=14?pa+'%':''}</span></div><div class="sl-h" style="width:${ph}%;background:${pc[1].bg};color:${pc[1].ink}"><span class="${pick===g.h?'sl-w':''}">${ph>=14?ph+'%':''}</span></div></div>
        <span class="sl-tlab${pick===g.h?' sl-win':''}">${esc(g.h)}</span>
      </div>
      <div class="sl-conf">${c?`<span class="sl-tier sl-${tc}">${tl} ${Math.round(c.conf*100)}%</span>`:'<span class="sl-tier">no call yet</span>'}</div>
      <div class="sl-pred">${slatePred(g)}</div>
      <div class="sl-result">${slateResult(g,c)}</div>
    </button>`;
  };
""" + T['p3'][j:]

sub1('p3', """  html+=`
  <div class="card">
    <h2 style="display:flex;align-items:center;gap:10px;margin:0">${tag(g.a)}${winMark(g,g.a)} <span class="muted" style="font-family:var(--body);font-size:15px;font-weight:400">at</span> ${tag(g.h)}${winMark(g,g.h)}</h2>
  </div>`;
""", """  html+=gameHeadCard(g);
""", "renderGame's head card")

sub1('p3', """function renderSlate(){
  if(S.ui.game){""", r"""/* ---------- the games list's rows and a game's head (app v122) ----------
   The owner's call of 20 October 2026, with the list's row, the board's row and a game's page in three
   screenshots: the list's rows look like the Matchups board's, and what they showed until then goes to the
   head of each game's page. */

/* the call the list draws on a game, the board's rule on this page's own lines (the ones a game's page prices
   from, a Refresh odds press included): the home side's chance from the two moneylines with the book's margin
   taken out, else from the spread, a margin spread MARGIN_SD about it; with no line posted at all, the model's
   own chance (gameBet; src 'model'). null for a pick'em spread with no moneylines, which the board leaves
   without a call too. pick is the side at 50% or more, the home side on an even split, as on the board */
function slateCall(g){
  const ml=x=>x!=null&&isFinite(x)&&+x!==0, imp=x=>x<0?-x/(-x+100):100/(x+100);
  let pH=null, src='market';
  if(ml(g.mla)&&ml(g.mlh)){ const h=imp(+g.mlh), a=imp(+g.mla); pH=h/(h+a); }
  else if(g.sp!=null&&isFinite(g.sp)){ if(+g.sp!==0) pH=gbNorm(+g.sp/MARGIN_SD); }
  else { pH=gameBet(g,g.h,'ml').p; src='model'; }
  if(pH==null||!isFinite(pH)) return null;
  return {pH,pick:pH>=0.5?g.h:g.a,conf:Math.max(pH,1-pH),src};
}
/* the Matchups board's confidence band on the favourite's chance */
function slateTier(c){ const r=Math.round(c*100)/100; return r>=0.75?['high','HIGH']:r>=0.60?['med','MED']:r>=0.55?['low','LOW']:['coin','50/50']; }
/* the win-probability bar's two colours, the board's rule (probCols in tab_pickems.html) on this page's own
   tag colours: each side its tag's colour with its percentage in textOn's ink; where the two would read as one
   colour (two reds), the home side the first of its own colours that does not, else a slate */
function slateCols(a,h){
  const hsl=c=>{ const [r,g,b]=hex2rgb(c).map(v=>v/255), mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn;
    const hh=!d?0:mx===r?((g-b)/d+6)%6:mx===g?(b-r)/d+2:(r-g)/d+4; return [hh*60,d,(mx+mn)/2]; };
  const near=(x,y)=>{ const [h1,c1,l1]=hsl(x), [h2,c2,l2]=hsl(y), dh=Math.min(Math.abs(h1-h2),360-Math.abs(h1-h2));
    return c1<.15||c2<.15 ? c1<.15&&c2<.15&&Math.abs(l1-l2)<.15 : dh<28&&Math.abs(l1-l2)<.18; };
  const ca=tagBg(tagColor(a));
  let ch=tagBg(tagColor(h));
  if(near(ca,ch)) ch=teamCols(h).map(tagBg).find(c=>!near(ca,c))||'#475068';
  return [{bg:ca,ink:textOn(ca)},{bg:ch,ink:textOn(ch)}];
}
/* a game at a neutral site: the hub's Matchups board says so where it has the game (the betting job's
   schedule marks most of them Neutral); without it, a 9:30am Eastern kickoff, which is one played abroad */
function slateNeutral(g){
  try{ const B=window.pkBoard; if(B&&B.ST&&Array.isArray(B.ST.sched)&&typeof B.neutral==='function'){
    const r=B.ST.sched.find(x=>x.game_id===g.id); if(r) return !!B.neutral(r); } }catch(e){}
  return g.t==='09:30';
}
/* where a game stands: the payload's final score, else what the scoreboard said when Refresh scores last
   read it (LIVE); null before kickoff or with nothing read */
function slateOutcome(g){
  if(hasScore(g)) return {final:true,live:false,as:+g.as,hs:+g.hs,clock:''};
  const s=LIVE.slate?LIVE.games[g.id]:null;
  if(s&&s.as!=null&&s.hs!=null&&isFinite(s.as)&&isFinite(s.hs)&&s.state!=='pre')
    return {final:s.state==='post',live:s.state!=='post',as:+s.as,hs:+s.hs,clock:s.clock||''};
  return null;
}
/* the final-score cell: 0 : 0 to come; LIVE once kicked off with no scoreboard read, Final with none four hours
   on; on now, the side leading and the clock, in the pick's colour by whether it leads; played, the side that
   won and whether the pick hit */
function slateResult(g,c){
  const o=slateOutcome(g);
  if(!o){
    if(gameFinal(g)) return '<b class="sl-sc sl-pend">Final</b><span class="sl-sub">score with the next update</span>';
    if(gameStarted(g)) return '<b class="sl-sc sl-pend">LIVE</b><span class="sl-sub">Refresh scores reads it</span>';
    return '<b class="sl-sc sl-pend">0 : 0</b>';
  }
  const win=o.as>o.hs?g.a:(o.hs>o.as?g.h:null), score=`${num(o.as,0)}–${num(o.hs,0)}`;
  if(o.live){ const cls=!c||!win?'tie':(c.pick===win?'ok':'bad');
    return `<span class="sl-mwin sl-${cls}">${win?esc(win)+' leading '+score:'Tied '+score}</span><span class="sl-sub">${esc(o.clock)}</span>`; }
  const hit=c&&win?c.pick===win:null;
  return `<span class="sl-mwin sl-${hit==null?'tie':(hit?'ok':'bad')}">${win?esc(win)+' won '+score:'Tie '+score}</span><span class="sl-sub">${hit==null?'':(hit?'Pick hit':'Pick missed')}</span>`;
}
/* the score prediction: the score the game's projections stand on (gameCtx: the posted spread split around the
   posted total, or the model's own points with no line), each side rounded once, so the margin under it is the
   difference of the two numbers shown; "even" where they are level */
function slatePred(g){
  const ca=gameCtx(g,g.a), ch=gameCtx(g,g.h), sa=+ca.implied.toFixed(0), sh=+ch.implied.toFixed(0);
  const lead=sa>sh?g.a:g.h;
  const by=sa===sh?'<span class="sl-pby">even</span>'
    :`<span class="sl-pby">${tag(lead).replace('class="ttag"','class="ttag sl-mini"')} by ${Math.abs(sa-sh)}</span>`;
  return `<span class="sl-plab">Predicted</span><span class="sl-psc" title="${esc(g.a)} ${sa}, ${esc(g.h)} ${sh}: ${ca.src==='market'?`the posted spread split around the posted total of ${g.tot}`:'our model, no line posted yet'}">${sa}–${sh}</span>${by}${ca.src==='model'?'<span class="sl-sub">no line yet, our model</span>':''}`;
}
/* (app v122) a game's head on its page: what the list's row showed of the game until this version, each figure
   under the list's own heading for it: the kickoff (or the live score and clock, or FINAL), the matchup, the three
   biggest projections (each against what the player did once the game's stats are in), the score the game's
   projections stand on, its total and the pick it makes, every number worked as the row worked it */
function gameHeadCard(g){
  const ca=gameCtx(g,g.a), ch=gameCtx(g,g.h), d=fmtDate(g);
  /* the scores as the head shows them, rounded once: the pick and its margin are read from these,
     so "22 - 20" never reads "by 3" */
  const sa=+ca.implied.toFixed(0), sh=+ch.implied.toFixed(0);
  const started=gameStarted(g), fin=gameFinal(g);
  const lab=t=>`<span class="gh-lab">${t}</span>`;
  const lead=gameHeadline(g).map(x=>{
    const st={pass:'passing_yards',rush:'rushing_yards',rec:'receiving_yards'}[x.k];
    const a=fin?actualFor(g.w,x.v.pl.id):null;
    const av=a?a[st]:null;
    const band=av==null?'':hitBand(av,x.v.mu);
    return `<div><span class="cat">${x.k}</span><span class="nm">${esc(shortName(x.v.pl.n))}</span><span class="v">${x.v.mu.toFixed(0)}<em>yds</em>${
      av!=null?`<span class="va ${band}">${num(av,0)}<em>yds</em></span>`:(fin?'<span class="va pend">–</span>':'')}</span></div>`;}).join('');
  const pick=(()=>{
    if(sa===sh){ const even='<span class="none">–</span><small>even</small>';
      if(!hasScore(g)) return even;
      return even+`<small class="act">(${g.as===g.hs?'tie':`${g.as>g.hs?g.a:g.h} by ${Math.abs(g.as-g.hs)}`})</small>`; }
    const p=sa>sh?g.a:g.h, by=Math.abs(sa-sh);
    if(!hasScore(g)) return tag(p)+`<small>by ${by}</small>`+(ca.src==='model'?'<small class="muted">no line yet, our model</small>':'');
    if(g.as===g.hs) return tag(p)+`<small>by ${by}</small><small class="act">(tie)</small>`;
    const real=g.as>g.hs?g.a:g.h, right=real===p;
    return tag(p)+`<small>by ${by}</small><small class="act ${right?'right':'wrong'}">${right?'✓ ':'✗ '}${real} by ${Math.abs(g.as-g.hs)}</small>`;
  })();
  return `<div class="card ghead" data-ghead="${esc(g.id)}"><div class="gh-grid">
    <div class="gh-when">${lab('Kickoff')}<div class="when"><b>${d.day}</b>${fin?'<span class="pill ok">FINAL</span>'+liveWhen(g,true):(started?liveWhen(g):d.t)}</div></div>
    <div class="gh-match">${lab('Matchup')}<h2>${tag(g.a)}${winMark(g,g.a)} <span class="at">at</span> ${tag(g.h)}${winMark(g,g.h)}</h2></div>
    <div class="gh-lead">${lab('Biggest projections')}<div class="lead">${lead||'<span class="muted">No projections for this game yet</span>'}</div></div>
    <div class="tot">${lab('Expected score')}<b>${sa} – ${sh}</b><small>${g.a} / ${g.h}</small>${hasScore(g)?`<small class="act">(actual ${g.as} – ${g.hs})</small>`:liveScoreLine(g)}</div>
    <div class="totpts${ca.src==='model'?' assumed':''}">${lab('Total pt')}<b>${(ca.implied+ch.implied).toFixed(0)}</b><small>${ca.src==='market'?'points':'our model'}</small>${hasScore(g)?`<small class="act">(actual ${g.as+g.hs})</small>`:''}</div>
    <div class="winner">${lab('Vegas pick')}${pick}</div>
  </div></div>`;
}
function renderSlate(){
  if(S.ui.game){""", 'the new helpers before renderSlate')

# ---------------------------------------------------------------- part1: the column heads and the styles
sub1('p1', """      <div>Kickoff</div><div>Matchup</div><div class="c">Biggest projections</div>
      <div class="c">Expected score</div><div class="c">Total pt</div><div class="c">Vegas pick</div><div></div>""",
     """      <div>Date</div><div>Matchup</div><div class="c">Win probability</div>
      <div class="c">Confidence</div><div class="c">Score prediction</div><div class="c">Final score</div>""", 'the column heads')

sub1('p1', """/* game rows */
.gamehead,.game{display:grid;grid-template-columns:120px 175px 1fr 138px 78px 78px 26px;gap:14px;align-items:center}""",
     """/* game rows: the Matchups board's row (app v122), date, matchup, win probability, confidence, score
   prediction and final score, at the board's sizes, so the two tabs read as one page */
.gamehead,.game{display:grid;grid-template-columns:120px 175px minmax(274px,358px) 138px 136px 136px;gap:14px;align-items:center;justify-content:space-between}""",
     'the row grid')
sub1('p1', """.game:hover{box-shadow:var(--sh-md);transform:translateY(-1px)}
""", """.game:hover{box-shadow:var(--sh-md);transform:translateY(-1px)}
.game:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
""", 'the row focus')
sub1('p1', """.chev{text-align:right;color:var(--muted);font-size:20px}
""", """/* (app v122) the board's cells in this page's own names: the pick's tag raised, a tick or cross on the winner's,
   the split bar in the two clubs' colours, the band, the prediction and the final score */
.game .matchup .ttag{padding:4px 5px;min-width:40px;vertical-align:-1px}
.ttag.sl-win{font-weight:800;box-shadow:0 2px 6px -1px rgba(15,27,45,.35),inset 0 1px 0 rgba(255,255,255,.18)}
.matchup .at.neutral{color:var(--ink-2);font-weight:600}
.sl-tw{position:relative;display:inline-flex;flex:none}
.sl-res{position:absolute;top:-8px;width:16px;height:16px;border-radius:50%;background:var(--panel);border:1.5px solid currentColor;font-size:11px;font-weight:800;line-height:13px;text-align:center;font-family:var(--body);box-shadow:0 1px 2px rgba(15,27,45,.2)}
.sl-away .sl-res{left:-9px} .sl-home .sl-res{right:-9px}
.sl-res.sl-ok{color:var(--pick)} .sl-res.sl-bad{color:var(--miss)}
.sl-probrow{display:flex;align-items:center;gap:10px;padding:0 14px;justify-content:center;min-width:0}
.sl-tlab{font-family:var(--display);font-size:15px;font-weight:700;color:var(--muted);letter-spacing:.02em;flex:none;min-width:40px;text-align:center}
.sl-tlab.sl-win{color:var(--ink);font-weight:800}
.sl-probrow .sl-prob{flex:1;min-width:0}
.sl-prob{position:relative;height:28px;border-radius:999px;overflow:hidden;background:#E6EBF1;display:flex;box-shadow:inset 0 1px 3px rgba(15,27,45,.12)}
.sl-prob .sl-a,.sl-prob .sl-h{display:flex;align-items:center;padding:0 12px;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden}
.sl-prob .sl-a{justify-content:flex-start;border-right:1px solid rgba(15,27,45,.18)} .sl-prob .sl-h{justify-content:flex-end;margin-left:auto}
.sl-prob .sl-w{font-weight:800}
.sl-conf{text-align:center}
.sl-tier{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.06em;padding:4px 10px 4px 8px;border-radius:999px;background:#E9EEF4;color:var(--ink-2);white-space:nowrap}
.sl-tier::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.75}
.sl-tier.sl-high{background:var(--pick-soft);color:var(--pick)} .sl-tier.sl-med{background:var(--gold-soft);color:#8A5E05} .sl-tier.sl-coin{background:#FCECEA;color:#A8453A}
.sl-pred,.sl-result{text-align:center;line-height:1.2;white-space:nowrap}
.sl-pred .sl-psc{display:block;font-family:var(--display);font-size:17px;font-weight:700;color:var(--ink-2);letter-spacing:-.3px;font-variant-numeric:tabular-nums;margin-bottom:3px}
.sl-pred .sl-plab{display:none}
.sl-pred .sl-pby{display:flex;align-items:center;justify-content:center;gap:5px;font-size:11px;color:var(--muted);line-height:1.3}
.ttag.sl-mini{font-size:10px;padding:3px 5px;min-width:32px;border-radius:5px;border-width:1px}
.sl-sub{display:block;font-size:11px;color:var(--ink-2);line-height:1.3;white-space:normal}
.sl-sc{display:block;font-family:var(--display);font-size:20px;font-weight:700;color:var(--ink);letter-spacing:-.3px;font-variant-numeric:tabular-nums}
.sl-sc.sl-pend{color:var(--muted)}
.sl-result .sl-mwin{display:block;font-family:var(--display);font-size:15px;font-weight:700;letter-spacing:-.3px;font-variant-numeric:tabular-nums;margin-bottom:3px}
.sl-mwin.sl-ok{color:var(--pick)} .sl-mwin.sl-bad{color:var(--miss)} .sl-mwin.sl-tie{color:var(--ink-2)}
/* between the phone card and a wide screen the board's narrower columns, the bar taking what is left and its
   team labels dropped (the matchup names the teams), so the list never scrolls sideways */
@media(min-width:901px) and (max-width:1160px){
  .gamehead,.game{grid-template-columns:96px 146px minmax(150px,1fr) 104px 112px 136px;gap:10px;justify-content:normal}
  .gamehead{padding:0 12px 8px}
  .game{padding:13px 12px}
  .sl-probrow{padding:0 4px}
  .sl-probrow .sl-tlab{display:none}
}
/* (app v122) a game's head on its page: the list's row as it was, each figure under its heading, the six side by
   side on a wide window and in three columns at 980px and under */
.ghead .gh-grid{display:grid;grid-template-columns:minmax(104px,auto) minmax(130px,auto) minmax(250px,1fr) 120px 76px 108px;gap:12px 16px;align-items:start}
.ghead .gh-grid>div{min-width:0}
.gh-lab{display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 8px;line-height:1.25}
.ghead .tot .gh-lab,.ghead .totpts .gh-lab,.ghead .winner .gh-lab,.ghead .gh-lead .gh-lab{text-align:center}
.ghead h2{display:flex;align-items:center;gap:10px;margin:0;flex-wrap:wrap}
.ghead h2 .at{color:var(--ink-2);font-family:var(--body);font-size:15px;font-weight:400}
.ghead .when{color:var(--ink-2);font-size:12px;line-height:1.35}
.ghead .when b{color:var(--ink);font-weight:600;display:block;font-size:13px;margin-bottom:5px}
.ghead .gh-lead{display:flex;flex-direction:column;align-items:center}
.ghead .winner .ttag{font-size:13px}
@media(max-width:980px){
  .ghead .gh-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
  .ghead .gh-when{grid-column:1;grid-row:1}
  .ghead .gh-match{grid-column:2/4;grid-row:1}
  .ghead .gh-lead{grid-column:1/-1;grid-row:2;align-items:stretch;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:10px 0}
  .ghead .gh-lead .gh-lab{text-align:left}
  .ghead .lead div{grid-template-columns:34px minmax(0,1fr) auto}
  .ghead .tot{grid-column:1;grid-row:3} .ghead .totpts{grid-column:2;grid-row:3} .ghead .winner{grid-column:3;grid-row:3}
  .ghead .tot b,.ghead .totpts b{font-size:18px}
}
""", 'the board cells and the head card')

sub1('p1', """  .gamehead{display:none}
  /* one card per game, laid out explicitly so nothing lands in the wrong cell */
  .game{grid-template-columns:1fr 1fr auto;gap:6px 10px;padding:13px 14px}
  .game .when{grid-column:1/3;grid-row:1;display:flex;gap:8px;align-items:baseline}
  .game .when b{display:inline;font-size:13px}
  .game .winner{grid-column:3;grid-row:1/3;align-self:center;padding-left:6px}
  .matchup{grid-column:1/3;grid-row:2}
  .lead{grid-column:1/-1;grid-row:3;justify-self:stretch;margin-top:4px;
    border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:8px 0}
  .lead div{grid-template-columns:34px 1fr auto}
  .game .tot{grid-column:1;grid-row:4;text-align:left}
  .game .tot b{font-size:18px}
  .game .totpts{grid-column:2;grid-row:4;text-align:left}
  .game .totpts b{font-size:18px}
  .game .chev{display:none}
""", """  .gamehead{display:none}
  /* one card per game, laid out as the Matchups board lays its out, explicitly so nothing lands in the wrong cell */
  .game{grid-template-columns:1fr 1fr auto;gap:6px 10px;padding:13px 14px;justify-content:normal}
  .game .when{grid-column:1/3;grid-row:1;display:flex;gap:8px;align-items:baseline}
  .game .when b{display:inline;font-size:13px;margin:0}
  .game .sl-result{grid-column:3;grid-row:1/3;align-self:center;padding-left:6px}
  .game .matchup{grid-column:1/3;grid-row:2}
  .game .sl-probrow{grid-column:1/-1;grid-row:3;margin-top:4px;padding:0}
  .game .sl-conf{grid-column:1/3;grid-row:4;text-align:left}
  .game .sl-pred{grid-column:3;grid-row:4;text-align:right;padding-left:6px}
  .sl-pred .sl-psc{display:inline;font-size:15px;margin:0}
  .sl-pred .sl-plab{display:inline;font-size:11px;color:var(--muted);margin-right:6px}
  .sl-pred .sl-pby,.sl-pred .sl-sub{display:none}
""", 'the phone card')

assert '<div class="chev">' not in T['p3'] and 'chev' not in T['p1']

for k, f in FILES.items():
    io.open(f, 'w', encoding='utf-8').write(T[k])
print("patched: app v122, the Props list's rows in the Matchups board's columns and their old figures at each game's head")
