/* PROPS_AUDIT_NOW=<ISO time>: the audit run as if it were then, Node's clock and the page's moved together
   (clock_now.js); unset, the real clock */
const JSDOM=require('./clock_now.js').jsdomAt('PROPS_AUDIT_NOW',require('jsdom').JSDOM); const fs=require('fs'); const Papa=require('papaparse');
const errs=[]; let mem=null; const calls=[];
/* the payload the page boots on: the published one, or (PROPS_AUDIT_PAYLOAD) a copy baked elsewhere,
   to try a change to the model's data before the job has baked it */
const PAYLOAD_FILE=process.env.PROPS_AUDIT_PAYLOAD||'../data/payload.json';
if(process.env.PROPS_AUDIT_PAYLOAD) console.log('payload: '+PAYLOAD_FILE);
const dom=new JSDOM(fs.readFileSync('../app/prop_model_2026.html','utf8'),
 /* a real origin, so window.localStorage exists: the app reads the betting model's key and
    writes the live page's watchlist, and neither can be exercised on about:blank */
 {url:'https://demon-x13.github.io/nfl-hub/props/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.Papa=Papa;w.NO_BAKED=true;w.fetch=(u,o)=>(calls.push({url:String(u),cache:o&&o.cache||null}),String(u).indexOf('payload.json')>=0)
   ? Promise.resolve({ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(PAYLOAD_FILE,'utf8'))})
   : Promise.reject(new Error('x'));   /* the payload is fetched now, not baked in */
  w.confirm=()=>true;w.alert=()=>{};w.scrollTo=()=>{};w.URL.createObjectURL=()=>'blob:x';
  w.storage={get:async()=>mem?{value:mem}:null,set:async(k,v)=>{mem=v;return true;}};
  w.addEventListener('error',e=>errs.push(e.message));}});
const w=dom.window,d=w.document;
const fails=[]; let checks=0;
const chk=(ok,msg)=>{checks++; if(!ok) fails.push(msg);};
/* BLOCKING AND WARNINGS. Every check is blocking (chk): a failure, like a runtime error, refuses the
   publish (weekly.py's audit_verdict reads the summary line as numbers). A check named here as a
   warning (W.<kind>) is counted beside the failures and never refuses: weekly.py publishes what it
   built and the job goes red after its commit, the warnings listed, as it does for a few unmatched
   price names. A check is a warning only when it is presentation on the week's own data and can be
   argued so: who is shown starting or listed, an ordering, which correctly priced parlay a level
   picks, the wording of a note, a rule went untested. Anything that could put a wrong number or
   wrong money on the page stays blocking: a price, line or leg on the wrong player or game, a
   chance, price, fair chance or payout that is not the builder's own sums, a leg under the book,
   far off it or kicked off, settlement and grading, the payload against its sources, the page not
   loading. A check run only on made-up data stays blocking too: only a change to the code can fail
   it, and a change to the code is run through the audit by hand before it lands. Seven of the ten
   NFL-job failures from 2 to 13 October 2026 were live data meeting a presentation case no check
   had seen (a game hand's High pair, LA's QB2, a tie, a top 25 of 24), each holding back the
   week's data until a fix landed.
   That premise holds only if a check never turns on the week it meets or the hour it runs, and on 15
   October 2026 two checks did (#270, #271: made-up ids merged into the payload's real ones). So every
   check, and above all a made-up one, keeps five rules, and test_audit_phases.py replays the audit on
   past payloads at their own moment (PROPS_AUDIT_NOW) and on a season played out to hold them:
   (a) Read only the page's clock (w.Date.now()). A move of the clock the rest of the run stands on
       (the set-back to before the week's last kickoff, below) moves Node's with it.
   (b) Pick a row or a player only from those the check can stand on: a player row with lines
       ('.plrbtn[data-open]'; a starter with nothing to project is drawn with none), a quarterback
       with something to project. A pick that finds none is W.coverage, never a blocking chk, and
       never a crash. Never assume a box's state: tick one ':not(:checked)', or empty the builder first.
   (c) Planted data goes on a fixture of its own: replace the structure wholesale (the press's id
       table), clear the real keys it would collide with first (M3's prices), or work the expectation
       out from the state as it stood before the plant (#271's paid ids). Never expect planted values
       to sit over a live structure.
   (d) The audit's own copy of a page rule carries the page's fallbacks (V[kind]||V.all).
   (e) A branch for no game to come must hold in the off-season too, where every game has a score
       and the set-back still leaves one "not started". */
const warns=[];
const WARN={
  starters:'who is shown starting or listed on a game page, and what his gap note says: each player\'s lines and prices are his own wherever he is shown, and V6 blocks a suggested leg on anyone the report, the roster or the inactive rule has out, worked out from the sources themselves',
  order:'an ordering on the page, no number in it',
  compose:'which correctly priced parlay a suggestion level or a game page hand picks, or what its card says about how it was chosen: every leg on it is still held, blocking, to a real price, never under the book or far off it, not kicked off, one line once, its chance, fair chance, price and payout to the builder\'s own sums, and any chance or payout floor its card states to its own numbers',
  wording:'the wording of a note or a reason in the suggestions panel: no number in it',
  coverage:'the week gave a made-up case nothing to stand on, so a rule went untested this run: nothing shown is wrong',
  panel:'the credit-pull panel, the owner\'s note of what the odds API cost: no price, line or chance in it',
  espn:'what DraftKings\' lines read on ESPN cover (a charted starter the read leaves without a line), or a line read far from the paid pull\'s on the same leg: every price worked from a read is held, blocking, to the rule (M8), and a leg with no line is priced by the model alone, est., as before',
  espnName:'(app v125) an ESPN athlete the published read placed by name on a player whose roster name shares only his surname with ESPN\'s (the name rule does not pass it): the player is held, blocking, to one of the game\'s two clubs and to that surname, and the page\'s own placement (one match only, never a player an ESPN id names or another athlete claims) is what every visitor\'s press has used since app v107; the owner reads the list to add a nickname',
};
const W=Object.fromEntries(Object.keys(WARN).map(k=>[k,(ok,msg)=>{checks++; if(!ok) warns.push({m:msg,k});}]));
/* what a tier pays on the amount bet, worked here rather than by the page's own helpers: the
   figure to the cent with its thousands marked, over "$25 pays" ("$12.50 pays", "$1,250 pays"),
   on the card's own decimal price */
const money=v=>'$'+(+v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const amtTxt=v=>'$'+v.toLocaleString('en-US',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2});
const payOk=(el,stake,dec)=>!!el&&+el.dataset.pbPay===dec&&isFinite(stake*dec)
  &&(el.querySelector('b')||{}).textContent===money(stake*dec)&&(el.querySelector('span')||{}).textContent===amtTxt(stake)+' pays';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  /* what the page asked for as it loaded, before any check moves its clock (a set reaching its lock on a
     clock moved here has the record read again, which P2 holds on its own) */
  const BOOT_CALLS=calls.slice();
  const S=w.eval('S'); const F=n=>w.eval(n);
  const [gameCtx,rosterFor,statLines,project,pOver,rungView,marketLine,marketMu,devigOver,bookImplied,probToAmerican,mlToDec,parlayProb,modelMargin,legRho,gameBet,settleLeg,gameMu,tdPlus]=
   ['gameCtx','rosterFor','statLines','project','pOver','rungView','marketLine','marketMu','devigOver','bookImplied','probToAmerican','mlToDec','parlayProb','modelMargin','legRho','gameBet','settleLeg','gameMu','tdPlus'].map(F);
  const PAY=F('PAY');
  /* a price from DraftKings' line read on ESPN by Refresh odds (app v107), worked by espn_rule.js on its own
     copy of the formula; takenPrice: a leg the panel, a game page's hands or the Elo picks may take, a real
     price (a player's main line only while it is still DraftKings' line: the read has the same number or
     none for him) or one priced from the read on a kind the estimate has been checked on, at the rule's
     own price and with no real price on file for that line */
  const ESPN=require('./espn_rule.js'), ESR=ESPN.make(w);
  const takenPrice=c=>(c.src==='real'&&(F('isGameLeg')(c)||!c.main||ESR.paidStands(c)))
    ||(c.src==='dkline'&&!F('isGameLeg')(c)&&(()=>{ const x=ESR.price(c); return ESR.takeable(x)&&x.price===c.price&&!ESR.real(c); })());
  /* DraftKings' betslip (app v109): a suggestion takes only legs DraftKings' betslip can take, by
     DraftKings' own outcome id at the leg's own line, wherever the payload carries ids (PAY.dk, baked by
     weekly.py's dk_ids from the paid pull; a payload baked before them suggests as before). The rule is
     worked here on its own from the keys CLAUDE.md gives for PAY.dk, never by the page's dkIdOf: a team's
     money line 'team:X|ml'; its spread at its own number 'team:X|ats|<line>'; the total
     'game|total|<over|under>|<points>'; the anytime touchdown '<pid>|any_td' (one touchdown only: no id
     is read for two or more); a player's main line '<pid>|<stat>|<over|under>|<line>'; a rung k or more
     as DraftKings' Over k-0.5, else the whole Over k-1 its price was read from. Each number is written as
     the page writes one (String(+x): 79.5, 80, -3). None once the game has kicked off. "Carries ids" is
     the payload's own dk (the one it booted on, or a table this audit plants in its place as the paid
     pull's); one a Refresh odds press makes on a payload without (to hold the game-line ids it read) is not.
     And per game: a game the table has no entry for in its week is taken as a payload without ids is
     (weekly.py bakes PAY.dk {} from Monday night's final until the next week's first pull, and nothing may
     go empty for want of ids no pull has read) */
  const BOOT_DK=!!PAY.dk&&typeof PAY.dk==='object', AUD_DK=new Set();
  const dkCarried=()=>{ const D=F('PAY').dk; return !!D&&typeof D==='object'&&(BOOT_DK||AUD_DK.has(D)); };
  const dkPt=x=>String(+x);
  const dkKeysOf=l=>{ const s=l.stat;
    if(s==='ml') return [l.pid+'|ml'];
    if(s==='ats') return [l.pid+'|ats|'+dkPt(l.k)];
    if(s==='total') return ['game|total|'+l.side+'|'+dkPt(l.k)];
    if(s==='any_td') return (l.k==null?1:+l.k)===1?[l.pid+'|any_td']:[];
    if(l.main) return [[l.pid,s,l.side,dkPt(l.k)].join('|')];
    return [[l.pid,s,'over',dkPt(+l.k-0.5)].join('|'),[l.pid,s,'over',dkPt(+l.k-1)].join('|')]; };
  /* (app v125) and by content: an entry carries the pull's ids only where it has the paid pull's time (at) or a
     player's key. An entry a read made (the props job's published read, a press, the parlay card's check) holds
     only event, glat and the game lines' team: and game| ids, so it never does, whatever object it is (the rule
     holds on a JSON copy of the table, and is worked here on the live one, never by the page's dkEntryCarries) */
  const dkEntryCarriesAud=E=>!!E&&typeof E==='object'&&((E.at!=null&&E.at!=='')||Object.keys(E).some(k=>!/^(team:|game\|)/.test(k)&&!['event','at','glat'].includes(k)));
  const dkEntryAud=(l,D=F('PAY').dk)=>{ const W0=D&&typeof D==='object'?D[String(l.week)]:null, E=W0&&typeof W0==='object'?W0[l.gid]:null;
    return E&&typeof E==='object'&&dkEntryCarriesAud(E)?E:null; };
  const dkIdAud=(l,D=F('PAY').dk)=>{ const E=dkEntryAud(l,D);
    if(!E) return null;
    const g=S.sched.find(x=>x.id===l.gid); if(g&&F('gameStarted')(g)) return null;
    for(const k of dkKeysOf(l)){ const v=Object.prototype.hasOwnProperty.call(E,k)?E[k]:null; if(typeof v==='string'&&v) return v; }
    return null; };
  /* a leg a suggestion may take, as far as DraftKings' ids go */
  const dkOk=l=>!dkCarried()||!dkEntryAud(l)||!!dkIdAud(l);
  /* DraftKings has the same bet at another number, with no id at the leg's own (the panel counts these
     apart: the parlay card would put them on at DraftKings' number): a spread under the team's
     'team:X|ats|', a total under 'game|total|<side>|', a player's main line under '<pid>|<stat>|<side>|',
     a rung under '<pid>|<stat>|over|', 2+ touchdowns his '<pid>|any_td'; a money line and the anytime
     touchdown have no number */
  const dkElseAud=(l,D=F('PAY').dk)=>{ const E=dkEntryAud(l,D); if(!E||dkIdAud(l,D)) return false;
    const g=S.sched.find(x=>x.id===l.gid); if(g&&F('gameStarted')(g)) return false;
    const str=v=>typeof v==='string'&&!!v;
    if(l.stat==='ml') return false;
    if(l.stat==='any_td') return (l.k==null?1:+l.k)>=2&&str(E[l.pid+'|any_td']);
    const near=l.stat==='ats'?l.pid+'|ats|':l.stat==='total'?'game|total|'+l.side+'|':[l.pid,l.stat,l.main?l.side:'over',''].join('|');
    return Object.keys(E).some(k=>k.startsWith(near)&&k.length>near.length&&isFinite(+k.slice(near.length))&&str(E[k])); };
  /* (app v119, the owner's call of 19 October 2026: "i dont want to include those in the parlay builder, only ones i can
     add via id") the Top lines take a leg only as every suggestion does, with DraftKings' id at its line where the
     payload carries ids (dkOk); from app v115 they kept a player's line from a Refresh odds read with none.
     readTopAud is the audit's own reading of such a leg (a tested kind DraftKings lists, at the rule's own price, with
     no paid price on file for that line), for M14, which holds that the list now leaves it out */
  const readTopAud=l=>!!l&&l.src==='dkline'&&!F('isGameLeg')(l)&&(()=>{ const x=ESR.price(l); return ESR.takeable(x)&&x.price===l.price&&!ESR.real(l); })();
  const dkTopOk=l=>dkOk(l);
  /* (app v127) a ladder bet, worked here on its own, never by the page's isLadder (the owner's call of 21 October 2026:
     "is it possible to not do ladders and just include Same Game Parlay eligible stuff"): a player's over at a number
     that is not his main line (a rung k+, "250+ passing yards", main false) or two or more touchdowns (the anytime
     touchdown at k 2 or more, k missing read as 1), on a stat the page projects (the audit's own list: DraftKings' player
     markets, M13's DK_PLAYER_AUD, and the two it projects and never offers, targets and FG attempts, which NL1 holds to
     the page's catalogue). A team bet, a game total and a leg on no stat the page projects (a visitor's builder may hold
     one the page cannot read, as section I's 'g|p|s') never are */
  const PLAYER_STATS_AUD=new Set(['passing_yards','completions','attempts','passing_tds','passing_interceptions','carries','rushing_yards','receptions','receiving_yards','scrim_yards','kick_pts','fg_made','any_td','targets','fg_att']);
  const ladderAud=l=>!!l&&typeof l==='object'&&PLAYER_STATS_AUD.has(l.stat)&&(l.stat==='any_td'?(+l.k||1)>=2:!l.main);
  /* a made-up id table standing in for the paid pull's, put in place of PAY.dk wholesale (rule (c)): an id
     for every line of the week with a real price on file, as the pull reads one with each price it buys
     (both money lines, each side's spread at its own number, the total's over and under, a player's main
     line over and under, a rung k+ priced as Over k-0.5, the anytime touchdown). keep(key) leaves an id
     out where it says no, for a table that gives some legs an id and not others. Registered as the
     pull's, so the page and these checks both read it as ids the payload carries */
  const dkFixture=(wk,tag,keep)=>{ let n=0; const D={}, at=new w.Date(w.Date.now()).toISOString(), pr=v=>v!=null&&isFinite(v)&&v!==0;
    const put=(E,k)=>{ if(k&&(!keep||keep(k))) E[k]=`0AUD${tag}${++n}`; };
    for(const g of S.sched.filter(g=>String(g.w)===String(wk))){ const E=D[g.id]={at,glat:at};
      if(pr(g.mla)) put(E,`team:${g.a}|ml`); if(pr(g.mlh)) put(E,`team:${g.h}|ml`);
      if(g.sp!=null&&isFinite(g.sp)){ if(pr(g.spa)) put(E,`team:${g.a}|ats|${dkPt(+g.sp)}`); if(pr(g.sph)) put(E,`team:${g.h}|ats|${dkPt(-g.sp)}`); }
      if(g.tot!=null&&isFinite(g.tot)){ if(pr(g.tov)) put(E,`game|total|over|${dkPt(g.tot)}`); if(pr(g.tou)) put(E,`game|total|under|${dkPt(g.tot)}`); }
      const O=(S.odds||{})[g.id]||{};
      for(const pid in O) for(const st in O[pid]) for(const k in (O[pid][st]||{})) if(pr(O[pid][st][k]))
        put(E,st==='any_td'?(+k===1?pid+'|any_td':null):[pid,st,'over',dkPt(+k-0.5)].join('|')); }
    const M=((F('PAY').mkt||{})[String(wk)])||{};
    for(const pid in M) for(const st in M[pid]){ const L=M[pid][st], E=L&&D[L.g]; if(!E) continue;
      if(pr(L.over)) put(E,[pid,st,'over',dkPt(L.line)].join('|')); if(pr(L.under)) put(E,[pid,st,'under',dkPt(L.line)].join('|')); }
    const T={[String(wk)]:D}; AUD_DK.add(T); return T; };
  /* put a table in place of PAY.dk (undefined: none, as a payload baked before ids), and back */
  const dkSet=v=>{ const P0=F('PAY'); if(v===undefined) delete P0.dk; else P0.dk=v; w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}'); };
  /* (app v125) the published read: the props job's own read of DraftKings' lines on ESPN, in the payload (PAY.espn and
     the schedule's game lines), which the page installs at boot (espnPublished: the player blocks into ESPN_LIVE, the
     game-line ids into PAY.dk). A check that plants prices or lines on a real game clears that game's published read
     first (unbake: its PAY.espn entry out, the page's espnPublished run again, which takes its block back out), and
     puts the payload's own back after (rebake), so nothing it plants is set over a live structure (rule (c)). BOOT_ESPN
     is the read as the payload booted with it */
  const BOOT_ESPN=JSON.stringify(PAY.espn===undefined?null:PAY.espn);
  const pubGamesAud=()=>{ const E=F('PAY').espn; return E&&typeof E==='object'&&E.v===1&&E.games&&typeof E.games==='object'?E.games:null; };
  const pubCaches=()=>w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}');
  /* the schedule's game lines the read set keep their numbers (nflverse's are not in the payload) but lose the read's
     marks (ls 'dk', lat, lsr 'espn'), so they read as lines no read made; rebake puts the marks back (UNB) */
  const UNB={};
  const unbake=ids=>{ const all=ids==null, set=new Set(all?[]:[].concat(ids)), G=pubGamesAud();
    if(G) for(const id of Object.keys(G)) if(all||set.has(id)) delete G[id];
    for(const g of S.sched) if((all||set.has(g.id))&&g.lsr==='espn'){ if(!UNB[g.id]) UNB[g.id]={ls:g.ls,lat:g.lat,lsr:g.lsr}; delete g.ls; delete g.lat; delete g.lsr; }
    F('espnPublished')(); pubCaches(); };
  /* (the read's ids go into the table the payload has now: a section that put back a copy of its own table stands it in) */
  const rebake=()=>{ const v=JSON.parse(BOOT_ESPN), P0=F('PAY'); if(v==null) delete P0.espn; else P0.espn=v;
    for(const id of Object.keys(UNB)){ const g=S.sched.find(x=>x.id===id); if(g) Object.assign(g,UNB[id]); delete UNB[id]; }
    w.eval("ESPN_PUB_DK=PAY.dk&&typeof PAY.dk==='object'?PAY.dk:null"); F('espnPublished')(); pubCaches(); };
  /* the audit's own reading of the published read of a game's player lines: its out 'ok' or 'none', of a game to come
     in its week, dated before its kickoff (as the page installs it); the time, or null */
  const pubOutAud=gid=>{ const G=pubGamesAud(), e=G&&Object.prototype.hasOwnProperty.call(G,gid)?G[gid]:null, g=S.sched.find(x=>x.id===gid);
    if(!e||typeof e!=='object'||!g||String(e.w)!==String(g.w)||F('gameStarted')(g)||F('hasScore')(g)) return null;
    const k=F('kickoff')(g), u=e.out, t=u&&typeof u.at==='string'?Date.parse(u.at):NaN;
    return u&&(u.st==='ok'||u.st==='none')&&isFinite(t)&&t>0&&!!k&&t<k.getTime()?t:null; };
  /* when DraftKings' lines for these games were last read from ESPN: a press's (or a kept read's) ok or none, or the
     published read's; null where none was */
  const lastReadAud=ids=>{ let t=0; const O=F('ESPN_OUT'); for(const id of ids){ const o=O[id]; if(o&&(o.st==='ok'||o.st==='none')&&isFinite(o.when)&&o.when>t) t=o.when; const p=pubOutAud(id); if(p&&p>t) t=p; } return t||null; };
  /* the checks open games that have not kicked off; between the week's last kickoff and its
     final reaching the data (a Monday night) there are none, so the page's clock goes back to
     an hour before that kickoff rather than the audit depending on the hour it runs */
  if(!S.sched.some(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w))){
    const wk=F('currentWeek')(), ks=S.sched.filter(x=>+x.w===wk).map(x=>F('kickoff')(x)).filter(Boolean).map(k=>k.getTime());
    /* Node's clock goes back with the page's: the checks date what they plant by it and hold the page's
       dates to it (M8), and the two an hour apart refused every run in that window */
    if(ks.length){ const off=Math.max(...ks)-3600e3-w.Date.now(), now0=w.Date.now.bind(w.Date), nodeNow0=Date.now; w.Date.now=()=>now0()+off; Date.now=()=>nodeNow0()+off; F('renderAll')();
      console.log(`clock: no game left to start, set back ${(-off/3600e3).toFixed(1)}h to before week ${wk}'s last kickoff`); } }
  /* open the first game that has not kicked off, in any open week (the audit must not depend on the date) */
  const openUpcoming=()=>{ const g=S.sched.filter(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w)).sort((a,b)=>(a.w-b.w)||((a.d+a.t).localeCompare(b.d+b.t)))[0];
    const ws=d.getElementById('weekSel'); if(ws.value!==String(g.w)){ ws.value=String(g.w); ws.dispatchEvent(new w.Event('change')); }
    d.querySelector('[data-game="'+g.id+'"]').click(); return g; };

  /* ---- A. every game, every week: context sane ---- */
  let nGames=0,nMkt=0,nModel=0;
  for(const g of S.sched){ nGames++;
    for(const t of [g.a,g.h]){ const c=gameCtx(g,t);
      chk(isFinite(c.implied)&&c.implied>=3&&c.implied<=45,`implied out of range ${g.id} ${t} ${c.implied}`);
      chk(isFinite(c.imp)&&Math.abs(c.imp)<=3,`imp z out of range ${g.id}`);
      if(c.src==='market') nMkt++; else nModel++;
    }
    const ca=gameCtx(g,g.a),ch=gameCtx(g,g.h);
    if(ca.src==='market'){ chk(Math.abs((ca.implied+ch.implied)-g.tot)<1e-6,`market total mismatch ${g.id}`);
      chk(Math.abs((ch.implied-ca.implied)-g.sp)<1e-6,`market spread mismatch ${g.id}`); }
    else { const m=modelMargin(g); chk(Math.abs((ch.implied-ca.implied)-m)<1e-6,`model margin not applied ${g.id}`); }
  }
  console.log(`A. game context: ${nGames} games, ${nMkt/2} priced by market, ${nModel/2} by our model`);

  /* ---- A2. the games list's rows and each game's head. Since app v122 a row is in the Matchups board's columns (the
     board itself went in app v128): its win
     probability the audit's own reading of the game's lines (the two moneylines with the book's margin out,
     else the spread about a 13.5-point margin, else, with no line posted, the model's margin about the same;
     a pick'em spread with no moneylines, no call), each side's share of the bar, the board's old band (HIGH from
     75%, MED from 60%, LOW from 55%, else 50/50) with the favourite's chance, the favourite's tag raised and
     no other; its prediction the scores gameCtx gives, each rounded once, the margin beside it the difference
     of the two shown and its tag the side with the bigger number, "even" with no tag where they are level;
     a game with a score, who won it and whether the pick hit; one without, 0 : 0 to come, LIVE once kicked off
     and Final four hours on, each the word alone (app v130: no line under it; no scoreboard read here). The head of a game's page carries what the row showed
     until then: the same scores, the total, the pick with its margin (or even) and gameHeadline's three
     biggest projections, under the list's own headings. Every rendered row of every week (a week not open
     yet renders none; the current week always has some), the head of every game of the current week, then
     two lines set on the rounding itself, row and head ---- */
  { const ws=d.getElementById('weekSel'), keep=ws.value; let rows=0, evens=0, calls=0, heads=0;
    const show=wk=>{ ws.value=String(wk); ws.dispatchEvent(new w.Event('change')); };
    const ncdf=z=>{ const t=1/(1+0.2316419*Math.abs(z)), dd=0.3989423*Math.exp(-z*z/2), q=dd*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274)))); return z>0?1-q:q; };
    const callAud=g=>{ const ml=x=>x!=null&&isFinite(x)&&+x!==0, imp=x=>x<0?-x/(-x+100):100/(x+100); let pH=null;
      if(ml(g.mla)&&ml(g.mlh)) pH=imp(+g.mlh)/(imp(+g.mlh)+imp(+g.mla));
      else if(g.sp!=null&&isFinite(g.sp)){ if(+g.sp!==0) pH=ncdf(+g.sp/13.5); }
      else pH=ncdf(F('modelMargin')(g)/13.5);
      if(pH==null||!isFinite(pH)) return null;
      const conf=Math.max(pH,1-pH), r=Math.round(conf*100)/100;
      return {pa:Math.round((1-pH)*100),pick:pH>=0.5?g.h:g.a,band:`${r>=0.75?'HIGH':r>=0.60?'MED':r>=0.55?'LOW':'50/50'} ${Math.round(conf*100)}%`}; };
    const scoresAud=g=>{ const ca=gameCtx(g,g.a), ch=gameCtx(g,g.h); return {A:+ca.implied.toFixed(0),H:+ch.implied.toFixed(0),T:(ca.implied+ch.implied).toFixed(0)}; };
    const tx=n=>((n||{}).textContent||'').trim();
    const readRow=b=>{ const sa=b.querySelector('.sl-prob .sl-a'), sh=b.querySelector('.sl-prob .sl-h'), pby=b.querySelector('.sl-pred .sl-pby');
      const m=tx(b.querySelector('.sl-pred .sl-psc')).match(/^(\d+)–(\d+)$/), by=tx(pby).match(/by (\d+)$/);
      return {wA:sa?parseFloat(sa.style.width):NaN,wH:sh?parseFloat(sh.style.width):NaN,tA:tx(sa),tH:tx(sh),band:tx(b.querySelector('.sl-conf .sl-tier')),
        raised:[...b.querySelectorAll('.matchup .ttag.sl-win')].map(tx),A:m?+m[1]:NaN,H:m?+m[2]:NaN,sc:tx(b.querySelector('.sl-pred .sl-psc')),
        even:tx(pby)==='even'&&!(pby&&pby.querySelector('.ttag')),by:by?+by[1]:null,lead:pby&&pby.querySelector('.ttag')?tx(pby.querySelector('.ttag')):null,res:tx(b.querySelector('.sl-result'))}; };
    const resAud=(g,c)=>{ if(F('hasScore')(g)){ const win=g.as>g.hs?g.a:(g.hs>g.as?g.h:null), sc=`${g.as}–${g.hs}`;
        return (win?`${win} won ${sc}`:`Tie ${sc}`)+(c&&win?(c.pick===win?'Pick hit':'Pick missed'):''); }
      return F('gameFinal')(g)?'Final':(F('gameStarted')(g)?'LIVE':'0 : 0'); };
    const rowBad=(g,r)=>{ const c=callAud(g), s=scoresAud(g), want=resAud(g,c), out=[];
      if(c){ calls++; if(r.wA!==c.pa||r.wH!==100-c.pa) out.push(`its bar ${r.wA}/${r.wH}, not ${c.pa}/${100-c.pa}`);
        if(r.tA!==(c.pa>=14?c.pa+'%':'')||r.tH!==(100-c.pa>=14?(100-c.pa)+'%':'')) out.push(`its bar reads "${r.tA}"/"${r.tH}"`);
        if(r.band!==c.band) out.push(`its band "${r.band}", not "${c.band}"`);
        if(r.raised.join()!==c.pick) out.push(`raised tag ${r.raised.join()||'none'}, not ${c.pick}`); }
      else { if(r.wA!==50||r.band!=='no call yet'||r.raised.length) out.push(`no call, yet "${r.band}" with ${r.raised.join()||'no'} tag raised`); }
      if(r.A!==s.A||r.H!==s.H) out.push(`its prediction "${r.sc}", not ${s.A}–${s.H}`);
      else if(s.A===s.H?!(r.even&&r.by==null):(r.even||r.by!==Math.abs(s.A-s.H)||r.lead!==(s.A>s.H?g.a:g.h))) out.push(`its prediction "${r.sc}" beside ${r.even?'"even"':`"${r.lead} by ${r.by}"`}`);
      if(want instanceof RegExp?!want.test(r.res):r.res!==want) out.push(`its final score "${r.res}", not ${want}`);
      return out; };
    for(const o of [...ws.options]){ show(o.value);
      for(const b of d.querySelectorAll('#gamesList .game[data-game]')){ rows++;
        const g=S.sched.find(x=>x.id===b.dataset.game), r=g?readRow(b):null; if(r&&r.even) evens++;
        const bad=g?rowBad(g,r):['no such game'];
        chk(!bad.length,`slate row ${b.dataset.game}: ${bad.join('; ')}`); } }
    chk(rows>0,'the slate rendered no game rows in any week');
    const rowCalls=calls;
    /* the head of a game's page, read as the row was read before app v122 */
    const HEADS=['Kickoff','Matchup','Biggest projections','Expected score','Total pt','Vegas pick'];
    const readHead=()=>{ const h=d.querySelector('#gameView .ghead'); if(!h) return null;
      const sc=tx(h.querySelector('.tot b')), m=sc.match(/^(\d+) – (\d+)$/), win=h.querySelector('.winner');
      const by=[...(win?win.querySelectorAll('small'):[])].map(x=>tx(x).match(/^by (\d+)$/)).find(Boolean);
      return {labs:[...h.querySelectorAll('.gh-lab')].map(tx),sc,A:m?+m[1]:NaN,H:m?+m[2]:NaN,T:tx(h.querySelector('.totpts b')),even:!!(win&&win.querySelector('.none')),
        by:by?+by[1]:null,pick:win&&win.querySelector('.ttag')?tx(win.querySelector('.ttag')):null,
        lead:[...h.querySelectorAll('.lead > div')].map(x=>`${tx(x.querySelector('.cat'))}|${tx(x.querySelector('.nm'))}|${(tx(x.querySelector('.v')).match(/^(\d+)yds/)||[])[1]}`).join(' ')}; };
    const headBad=g=>{ const H=readHead(), s=scoresAud(g), out=[]; if(!H) return ['no head card'];
      if(H.labs.join('|')!==HEADS.join('|')) out.push(`its headings ${H.labs.join(', ')}`);
      if(H.A!==s.A||H.H!==s.H) out.push(`its expected score "${H.sc}", not ${s.A} – ${s.H}`);
      else if(s.A===s.H?!(H.even&&H.by==null&&!H.pick):(H.even||H.by!==Math.abs(s.A-s.H)||H.pick!==(s.A>s.H?g.a:g.h))) out.push(`"${H.sc}" beside ${H.even?'"even"':`"${H.pick} by ${H.by}"`}`);
      if(H.T!==s.T) out.push(`its total ${H.T}, not ${s.T}`);
      const want=F('gameHeadline')(g).map(x=>`${x.k}|${F('shortName')(x.v.pl.n)}|${x.v.mu.toFixed(0)}`).join(' ');
      if(H.lead!==want) out.push(`its biggest projections "${H.lead}", not "${want}"`);
      return out; };
    { const cw=F('currentWeek')(), keepUi=JSON.stringify({game:S.ui.game,open:S.ui.open});
      try{ show(cw);
        for(const g of F('gamesIn')(cw)){ if(!F('weekOpen')(+g.w)) continue; S.ui.game=g.id; S.ui.open={}; F('renderGame')(); heads++;
          const bad=headBad(g); chk(!bad.length,`${g.id}'s page head: ${bad.join('; ')}`); } }
      finally { const ku=JSON.parse(keepUi); S.ui.game=ku.game; S.ui.open=ku.open||{}; F('closeGameModal')(); } }
    chk(heads>0,'no game of the current week drew its page head');
    /* 22.4 - 19.6 shows "22 - 20", whose margin is 2 though the unrounded gap rounds to 3; 21.3 -
       20.9 shows "21 - 21", which is even though one side leads: on the row and on the head */
    const g=S.sched.find(x=>F('weekOpen')(+x.w)), was={sp:g.sp,tot:g.tot};
    try{ for(const [tot,sp,want] of [[42,-2.8,'22|20|by 2'],[42.2,-0.4,'21|21|even']]){
        g.tot=tot; g.sp=sp; show(g.w);
        const b=d.querySelector(`#gamesList [data-game="${g.id}"]`), r=b?readRow(b):null;
        const got=r?`${r.A}|${r.H}|${r.even?'even':'by '+r.by}`:'(no row)';
        chk(!!r&&got===want&&!rowBad(g,r).length,`slate row on the rounding: lines ${tot}/${sp} show ${got}, not ${want}`);
        S.ui.game=g.id; S.ui.open={}; F('renderGame')(); const H=readHead(), gotH=H?`${H.A}|${H.H}|${H.even?'even':'by '+H.by}`:'(no head)';
        chk(!!H&&gotH===want&&!headBad(g).length,`page head on the rounding: lines ${tot}/${sp} show ${gotH}, not ${want}`);
        S.ui.game=null; F('closeGameModal')(); } }
    finally { g.sp=was.sp; g.tot=was.tot; S.ui.game=null; F('closeGameModal')(); show(keep); }
    console.log(`A2. slate rows: ${rows} rows over ${ws.options.length} weeks (${rowCalls} with a call, ${evens} even), each bar, band, pick, prediction and result the audit's own; ${heads} page heads carrying the row's old figures`); }

  /* ---- B. rosters: no duplicates, right teams, depth caps ---- */
  let nPl=0, dupes=0, wrongTeam=0, capViol=0, gaps=0;
  for(const g of S.sched){ const r=rosterFor(g,false);
    for(const team in r){ const seen=new Set(); const cnt={};
      for(const x of r[team].players){ nPl++;
        if(seen.has(x.pl.id)) dupes++; seen.add(x.pl.id);
        if(x.pl.team!==team) wrongTeam++;
        cnt[x.pl.grp]=(cnt[x.pl.grp]||0)+1; }
      const DEPTH={QB:1,RB:3,WR:4,TE:2,K:1};
      for(const gp in cnt) if(cnt[gp]>DEPTH[gp]) capViol++;
      gaps+=(r[team].gaps||[]).length; }
  }
  chk(dupes===0,`duplicate players on a page: ${dupes}`); chk(wrongTeam===0,`players on wrong team: ${wrongTeam}`); W.starters(capViol===0,`depth cap violations: ${capViol}`);
  console.log(`B. rosters: ${nPl} player-slots across the season, ${dupes} dupes, ${wrongTeam} wrong-team, ${capViol} over cap, ${gaps} flagged gaps`);

  /* ---- B2. next man up: a ruled-out QB1 hands the slot to the chart's QB2, not to an
     unranked player with enough projected usage. Any team with both on the chart will do: first
     one whose two have three games each; when none has (last season's table holds only a few
     weeks, as in a rollover tested before that season ends), one whose two are on its roster
     however few games the QB2 has, which the rule must hold for too ---- */
  { const D=PAY.depth||{}; let tried=0,ok=0,thin=false;
    for(const need of [3,0]){ if(tried) break; thin=need===0;
      for(const team of new Set(Object.values(D).map(d=>d[0]))){
        const q=id=>S.players[id]&&S.players[id].team===team&&(S.players[id].gp+S.players[id].base_gp)>=need;
        const one=Object.keys(D).find(id=>D[id][0]===team&&D[id][1]==='QB'&&D[id][2]===1&&q(id));
        const two=Object.keys(D).find(id=>D[id][0]===team&&D[id][1]==='QB'&&D[id][2]===2&&q(id));
        const g=S.sched.find(x=>x.a===team||x.h===team);
        if(!one||!two||!g) continue;
        tried++;
        S.inactive[one]=true;
        try{ const qb=rosterFor(g,false)[team].players.filter(x=>x.pl.grp==='QB');
          if(qb.length===1&&qb[0].pl.id===two) ok++;
          else W.starters(false,`${team}: with QB1 out the quarterback shown is ${qb.map(x=>x.pl.n).join(', ')||'nobody'}, not the chart's QB2 ${S.players[two].n}`);
        } finally { delete S.inactive[one]; }
        if(tried>=6) break;
      } }
    W.coverage(tried>0,'no team on the depth chart has a QB1 and a QB2 on its roster to test next man up with');
    console.log(`B2. next man up: ${ok} of ${tried} teams hand a ruled-out QB1's slot to the chart's QB2${thin?' (QB2s with under three games: last season is short)':''}`);
  }

  /* ---- B3. the chart's players with no history (payload.py carries them, app v104): every player
     the chart lists at a position the page projects, on a roster, is on the page, every club's QB2
     among them (Stidham and Richardson were missing, and a club whose QB1 was out started nobody).
     One with no game at all has nothing to project from: no line, no price, no headline, no place in
     a suggestion or a game hand, and, with the man above him ruled out, he starts, shown with thin
     history and a line saying there is nothing to bet on; so does a charted player moved up whose
     games give the model no workload (nothingToProject). The rule is held on a real club's QB2 made
     history-less here, on a game still to come or, with none left (a Monday night, the season's end),
     any game of the season, so it runs whatever the week holds. A payload baked before (it has no
     ina, which came with them) is said and its data checks skipped ---- */
  { const D=PAY.depth||{}, R=PAY.roster||{}, baked='ina' in PAY, POS=new Set(['QB','RB','WR','TE','K']), noH=F('noHistory');
    const on=id=>!!R[id]&&['ACT','DEV','INA'].includes(R[id][1]);
    const miss=Object.keys(D).filter(id=>POS.has(D[id][1])&&on(id)&&!S.players[id]).map(id=>`${D[id][3]} (${D[id][0]} ${D[id][1]}${D[id][2]})`);
    const clubs=[...new Set(Object.values(D).map(d=>d[0]))];
    const two=t=>Object.keys(D).find(id=>D[id][0]===t&&D[id][1]==='QB'&&D[id][2]===2);
    const noQB2=clubs.filter(t=>two(t)&&on(two(t))&&!S.players[two(t)]).map(t=>`${t} ${D[two(t)][3]}`);
    const nh=Object.values(S.players).filter(p=>noH(p));
    if(baked){ W.starters(!miss.length,`${miss.length} players on the chart and a roster are not on the page: ${miss.slice(0,5).join(', ')}`);
      W.starters(!noQB2.length,`clubs whose chart's QB2 is not on the page: ${noQB2.join(', ')}`);
      chk(nh.every(p=>{ const e=(PAY.players||[]).find(q=>q.id===p.id); return e&&!e.gp&&!e.cn&&D[p.id]; }),'a player with no history on the page is not a charted player the payload carries with none'); }
    /* every one with no game, in every game still to come: listed, never priced */
    const cw=F('currentWeek')(), open=S.sched.filter(g=>+g.w===cw&&!F('gameStarted')(g)); let seen=0; const leak=[];
    for(const g of open){ const r=rosterFor(g,true), ids=new Set();
      for(const t in r) for(const x of r[t].players) if(F('nothingToProject')(x)){ seen++; ids.add(x.pl.id); if(statLines(x).length) leak.push(`${x.pl.n}: lines`); }
      if(!ids.size) continue;
      for(const l of [...F('pricedLegs')([g]),...F('gameLegPool')(g)]) if(ids.has(l.pid)) leak.push(`${l.name}: ${l.label}`);
      for(const h of F('gameHeadline')(g)) if(ids.has(h.v.pl.id)) leak.push(`${h.v.pl.n}: a headline`); }
    chk(!leak.length,`a player with nothing to project is projected or priced: ${leak.slice(0,4).join('; ')}`);
    /* the rule, on a real club's QB2 made history-less, with his QB1 ruled out */
    let ruled=null;
    const both=t=>{ const o=Object.keys(D).find(id=>D[id][0]===t&&D[id][1]==='QB'&&D[id][2]===1); return o&&S.players[o]&&S.players[o].team===t&&two(t)&&S.players[two(t)]&&!S.inactive[two(t)]; };
    const g=[...open,...S.sched].find(g=>[g.a,g.h].some(both));
    if(g){ const T=[g.a,g.h].find(both);
      const one=Object.keys(D).find(id=>D[id][0]===T&&D[id][1]==='QB'&&D[id][2]===1), P2=S.players[two(T)];
      const keep=JSON.stringify({e5:P2.e5,e3:P2.e3,car:P2.car,py:P2.py,gp:P2.gp,base_gp:P2.base_gp,team:P2.team}), keepI=S.inactive[one], keepUi=JSON.stringify({game:S.ui.game,open:S.ui.open});
      try{ P2.gp=0; P2.base_gp=0; P2.team=T; for(const s in P2.e5){ P2.e5[s]=[0,0]; P2.e3[s]=[0,0]; P2.car[s]=[0,0]; P2.py[s]=null; }
        S.inactive[one]={week:cw,status:'Out',inj:'Thumb'}; w.eval('GAME_TIER_CACHE={}');
        const r=rosterFor(g,false)[T], qb=r.players.filter(x=>x.pl.grp==='QB'&&x.starter), x=r.players.find(x=>x.pl.id===P2.id);
        W.starters(qb.length===1&&qb[0].pl.id===P2.id,`${T}: QB1 ruled out and a QB2 with no history: the starter shown is ${qb.map(x=>x.pl.n).join(', ')||'nobody'}, not ${P2.n}`);
        W.starters(!r.gaps.some(gp=>gp.id===P2.id),`${T}: a QB2 with no history who starts is also in the gap note`);
        chk(!!x&&!statLines(x).length,'a QB2 with no history has lines');
        chk(![...F('pricedLegs')([g]),...F('gameLegPool')(g)].some(l=>l.pid===P2.id)&&!F('gameHeadline')(g).some(h=>h.v.pl.id===P2.id),'a QB2 with no history is priced, suggested or a headline');
        S.ui.game=g.id; S.ui.open={}; F('renderGame')();
        const row=d.querySelector(`#gameView [data-nohist="${P2.id}"]`);
        ruled=!!row&&/thin history/.test(row.textContent)&&((row.querySelector('.sum')||{}).textContent||'').trim()==='No lines: no games to project from'&&row.textContent.includes(P2.n)&&!d.querySelector(`#gameView [data-open="${P2.id}"]`);
        W.starters(ruled,`${T}: the game page does not show a QB2 with no history in his place, marked thin history, with no lines`);
      } finally { Object.assign(P2,JSON.parse(keep)); if(keepI) S.inactive[one]=keepI; else delete S.inactive[one]; w.eval('GAME_TIER_CACHE={}');
        const ku=JSON.parse(keepUi); S.ui.game=ku.game; S.ui.open=ku.open||{}; F('closeGameModal')(); }
      /* and a QB1 with no history, not ruled out (a rookie named the starter before his first game):
         he holds the slot with no lines, and his QB2 is not shown as the starter in his stead */
      const P1=S.players[one], keep1=JSON.stringify({e5:P1.e5,e3:P1.e3,car:P1.car,py:P1.py,gp:P1.gp,base_gp:P1.base_gp});
      if(!S.inactive[one]) try{ P1.gp=0; P1.base_gp=0; for(const s in P1.e5){ P1.e5[s]=[0,0]; P1.e3[s]=[0,0]; P1.car[s]=[0,0]; P1.py[s]=null; } w.eval('GAME_TIER_CACHE={}');
        const r=rosterFor(g,false)[T], qb=r.players.filter(x=>x.pl.grp==='QB'&&x.starter);
        chk(qb.every(x=>x.pl.id!==one||!statLines(x).length),`${T}: a QB1 with no history has lines`);
        W.starters(qb.length===1&&qb[0].pl.id===one,`${T}: a QB1 with no history, not ruled out: the starter shown is ${qb.map(x=>x.pl.n+(statLines(x).length?' (with lines)':'')).join(', ')||'nobody'}, not ${P1.n} with no lines`);
      } finally { Object.assign(P1,JSON.parse(keep1)); w.eval('GAME_TIER_CACHE={}'); }
      /* and a QB1 with one game, not ruled out (a rookie after his first start): counted in the chart's
         order he holds the slot, marked thin history; he was cut with his QB2 behind him and the club
         showed no quarterback. Nothing suggests him under three games: no priced leg, no game hand */
      const k1=JSON.stringify({gp:P1.gp,base_gp:P1.base_gp});
      if(!S.inactive[one]) try{ P1.gp=1; P1.base_gp=0; w.eval('GAME_TIER_CACHE={}');
        const r=rosterFor(g,false)[T], qb=r.players.filter(x=>x.pl.grp==='QB'&&x.starter);
        W.starters(qb.length===1&&qb[0].pl.id===one,`${T}: a QB1 with one game, not ruled out: the starter shown is ${qb.map(x=>x.pl.n).join(', ')||'nobody'}, not ${P1.n}`);
        chk(![...F('pricedLegs')([g]),...F('gameLegPool')(g)].some(l=>l.pid===one),`${T}: a QB1 with one game is priced or in a game hand's pool`);
      } finally { Object.assign(P1,JSON.parse(k1)); w.eval('GAME_TIER_CACHE={}'); } }
    W.coverage(!!g,'no game of the season has a club with a QB1 and a QB2 on the page to test a QB2 with no history on');
    console.log(`B3. the chart's players with no history: ${baked?`${nh.length} on the page, ${miss.length} charted players missing, every club's QB2 there`:'a payload baked before them (no ina): not compared'}; ${seen} with nothing to project listed in this week's open games, none projected or priced; ${g?`${[g.a,g.h].join('/')}: a history-less QB2 starts when QB1 is ruled out, a history-less QB1 holds his slot, each with no lines, and a one-game QB1 holds his, suggested nowhere`:'no game to test the rule on'}`);
  }

  /* ---- C. projections & ladders: finite, monotone, in range ---- */
  let nLines=0,nRungs=0,nonMono=0,badP=0,badMu=0,badEst=0,capTD=0;
  const wk=[1,5,12,18];
  for(const g of S.sched.filter(x=>wk.includes(x.w))){ const r=rosterFor(g,false);
    for(const team in r) for(const x of r[team].players){
      for(const l of statLines(x)){ nLines++;
        if(l.prob){ chk(l.p>0&&l.p<1,`td prob out of range ${x.pl.n}`);
          const MM=PAY.model[x.pl.grp]; const R=PAY.tdrate[x.pl.grp];
          if(R){ const mc=MM.carries?Math.max(project(x.pl,'carries',x.opp,x.ctx).mu,0):0, mr=MM.receptions?Math.max(project(x.pl,'receptions',x.opp,x.ctx).mu,0):0;
            const cap=1-Math.exp(-(mc*R.rush+mr*R.rec)*PAY.tdmult); if(l.p>cap+1e-9) capTD++; }
          continue; }
        if(!(isFinite(l.mu)&&l.mu>=0)) badMu++;
        let prev=2;
        for(const rg of l.rungs){ nRungs++;
          if(!(rg.p>0&&rg.p<1)) badP++;
          if(rg.p>prev+1e-9) nonMono++; prev=rg.p;
          const v=rungView(x.pl,l.stat,l.mu,rg.k,g.w);
          if(!(isFinite(v.est)&&v.est!==0)) badEst++;
          if(!(v.pMkt>0&&v.pMkt<1)) badEst++;
        }
        chk(l.rungs.length<=7&&l.rungs.length>=1,`rung count ${l.rungs.length} ${x.pl.n} ${l.stat}`);
        for(let i=1;i<l.rungs.length;i++) chk(l.rungs[i].k>l.rungs[i-1].k,`rungs not ascending ${x.pl.n} ${l.stat}`);
      }
    }
  }
  chk(nonMono===0,`non-monotone ladders: ${nonMono}`); chk(badP===0,`rung probs out of range: ${badP}`);
  chk(badMu===0,`bad projections: ${badMu}`); chk(badEst===0,`bad estimated prices: ${badEst}`); chk(capTD===0,`TD cap exceeded: ${capTD}`);
  console.log(`C. ladders: ${nLines} stat blocks, ${nRungs} rungs over weeks ${wk.join('/')}; non-monotone ${nonMono}, out-of-range ${badP}, bad est ${badEst}, TD cap breaches ${capTD}`);

  /* ---- D. market anchoring converges and main line adds up ---- */
  let nAnch=0,anchOff=0,maxOff=0,sumOff=0,estNear=[],mismatchTeam=0;
  const wk1={}; for(const g of S.sched) if(g.w===1){wk1[g.h]=g;wk1[g.a]=g;}
  for(const pid in PAY.mkt['1']){ const pl=S.players[pid]; if(!pl) continue;
    const g=wk1[pl.team]; if(!g){ mismatchTeam++; continue; }
    const opp=g.h===pl.team?g.a:g.h, ctx=gameCtx(g,pl.team);
    for(const stat in PAY.mkt['1'][pid]){ const L=PAY.mkt['1'][pid][stat];
      const pr=project(pl,stat,opp,ctx); if(!pr||pr.mu==null) continue; nAnch++;
      const target=devigOver(L.over,L.under); const muM=marketMu(pl,stat,pr.mu,1);
      const got=pOver(pl.grp,stat,muM,L.line); const off=Math.abs(got-target);
      if(off>0.005) anchOff++; maxOff=Math.max(maxOff,off); sumOff+=off;
      const pO=pOver(pl.grp,stat,pr.mu,L.line); chk(Math.abs(pO+(1-pO)-1)<1e-12,'over+under != 1');
      /* the estimate at the rung nearest the real line should be priced near the real line */
      const v=rungView(pl,stat,pr.mu,Math.round(L.line),1);
      if(v.est!=null) estNear.push({stat,est:v.est,real:L.over,k:Math.round(L.line),line:L.line});
    }
  }
  chk(anchOff===0,`anchoring failed to converge on ${anchOff} lines (max off ${maxOff.toFixed(4)})`);
  chk(mismatchTeam===0,`market lines on players with no wk1 game: ${mismatchTeam}`);
  const nearErr=estNear.map(e=>Math.abs(Math.log(mlToDec(e.est))-Math.log(mlToDec(e.real))));
  const medErr=nearErr.sort((a,b)=>a-b)[Math.floor(nearErr.length/2)];
  console.log(`D. anchoring: ${nAnch} real lines, converged within 0.5% on ${nAnch-anchOff}, mean miss ${(sumOff/nAnch*100).toFixed(3)}pts; estimate at the rung nearest the real line is off by median ${(medErr*100).toFixed(1)}% in decimal odds`);
  const worst=estNear.map(e=>({...e,err:Math.abs(Math.log(mlToDec(e.est))-Math.log(mlToDec(e.real)))})).sort((a,b)=>b.err-a.err).slice(0,3);
  worst.forEach(e=>console.log(`     worst: ${e.stat} rung ${e.k}+ est ${e.est} vs real over ${e.line} at ${e.real}`));

  /* ---- E0. the file itself is well formed ---- */
  const raw=require('fs').readFileSync('../app/prop_model_2026.html','utf8');
  chk((raw.match(/<style>/g)||[]).length===(raw.match(/<\/style>/g)||[]).length,'unbalanced <style> tags');
  chk((raw.match(/<script/g)||[]).length===(raw.match(/<\/script>/g)||[]).length,'unbalanced <script> tags');
  const cssText=raw.slice(raw.indexOf('<style>'),raw.indexOf('</style>'));
  chk(!/border-(bottom|top)-radius/.test(cssText),'invalid border-radius shorthand in CSS');
  chk(!/[^-a-z](color|background|border-color)\s*:\s*;/.test(cssText),'empty CSS value');
  chk(d.styleSheets.length>0&&d.styleSheets[0].cssRules.length>50,`stylesheet failed to parse (${d.styleSheets.length?d.styleSheets[0].cssRules.length:0} rules)`);
  console.log(`E0. document: ${d.styleSheets[0]?d.styleSheets[0].cssRules.length:0} CSS rules parsed, tags balanced`);

  /* ---- E. price math ---- */
  for(const p of [0.05,0.2,0.5,0.8,0.95]){ const a=probToAmerican(p); const back=a>0?100/(a+100):Math.abs(a)/(Math.abs(a)+100);
    chk(Math.abs(back-p)<0.01,`price round-trip ${p}->${a}->${back}`); }
  let prevI=0; for(let p=0.01;p<1;p+=0.01){ const i=bookImplied(p); chk(i>=prevI-1e-12,`bookImplied not monotone at ${p}`); prevI=i; chk(i>=p*0.99,`book implied below fair at ${p}`); }
  chk(Math.abs(bookImplied(0.5)-0.5325)<0.003,`main-line hold wrong: ${bookImplied(0.5)}`);
  console.log(`E. price math: round trips and monotone cut ok; implied at 50% = ${(bookImplied(0.5)*100).toFixed(2)}% (real -114 is 53.27%)`);

  /* ---- F. parlay math ---- */
  const mk=(pid,team,grp,stat,p,side,gid)=>({gid:gid||'g',pid,team,grp,stat,p,side});
  const one=parlayProb([mk('a','SEA','QB','passing_yards',0.6,'over')]);
  chk(Math.abs(one.corr-0.6)<0.01&&Math.abs(one.indep-0.6)<1e-9,`1-leg parlay != leg prob (${one.corr})`);
  const two=parlayProb([mk('a','SEA','QB','passing_yards',0.5,'over'),mk('b','SEA','WR','receiving_yards',0.5,'over')]);
  chk(two.corr>two.indep,'positively correlated legs not above independent');
  const twoU=parlayProb([mk('a','SEA','QB','passing_yards',0.5,'over'),mk('b','SEA','WR','receiving_yards',0.5,'under')]);
  chk(twoU.corr<twoU.indep,'over/under of correlated pair not below independent');
  const cross=parlayProb([mk('a','SEA','QB','passing_yards',0.5,'over','g1'),mk('b','KC','WR','receiving_yards',0.5,'over','g2')]);
  chk(Math.abs(cross.corr-cross.indep)<1e-9,'cross-game legs should be independent');
  const self=parlayProb([mk('a','SEA','RB','carries',0.5,'over'),mk('a','SEA','RB','rushing_yards',0.5,'over')]);
  chk(self.corr>0.35,`same-player carries+yards should be strongly linked (${self.corr.toFixed(3)})`);
  chk(legRho(mk('a','SEA','QB','passing_yards',0.5,'over'),mk('b','SEA','WR','receiving_yards',0.5,'over'))===legRho(mk('b','SEA','WR','receiving_yards',0.5,'over'),mk('a','SEA','QB','passing_yards',0.5,'over')),'rho not symmetric');
  console.log(`F. parlays: 1-leg=${one.corr.toFixed(3)}, QB+WR over/over ${two.indep.toFixed(3)}->${two.corr.toFixed(3)}, over/under ${twoU.indep.toFixed(3)}->${twoU.corr.toFixed(3)}, cross-game equal, same-RB ${self.corr.toFixed(3)}`);

  /* ---- J. game bets: to win, to cover ---- */
  { const gj=S.sched.find(x=>x.sp!=null); const gx={...gj,sp:3,tot:44};
    const hw=gameBet(gx,gx.h,'ml'), aw=gameBet(gx,gx.a,'ml'), hc=gameBet(gx,gx.h,'ats'), ac=gameBet(gx,gx.a,'ats');
    chk(Math.abs(hw.p+aw.p-1)<1e-9,'to-win chances do not sum to 1');
    chk(Math.abs(hc.p+ac.p-1)<1e-9,'to-cover chances do not sum to 1');
    chk(hc.line===-3&&ac.line===3,`cover lines wrong (${hc.line}, ${ac.line})`);
    chk(hw.p>0.02&&hw.p<0.98&&Math.abs(gameMu(gx)-(modelMargin(gx)+3)/2)<1e-9,'game mu is not halfway to the spread');
    chk(gameBet({...gx,sp:null},gx.h,'ats')===null&&gameBet({...gx,sp:null},gx.h,'ml')!==null,'no spread should drop the cover leg only');
    const better={...gx,sp:10}; chk(gameBet(better,better.h,'ml').p>hw.p,'a bigger home spread should raise the home win chance');
    const fin={...gx,hs:27,as:20}; S.sched.push({...fin,id:'jtest'});
    chk(settleLeg({gid:'jtest',team:fin.h,stat:'ml',k:0})==='win'&&settleLeg({gid:'jtest',team:fin.a,stat:'ml',k:0})==='loss','to-win settlement wrong');
    chk(settleLeg({gid:'jtest',team:fin.h,stat:'ats',k:-3})==='win'&&settleLeg({gid:'jtest',team:fin.h,stat:'ats',k:-7})==='push'&&settleLeg({gid:'jtest',team:fin.a,stat:'ats',k:3})==='loss','to-cover settlement wrong');
    S.sched.pop();
    chk(legRho({gid:'g',stat:'ml',team:'SEA',grp:'TEAM'},{gid:'g',stat:'ml',team:'KC',grp:'TEAM'})<0&&legRho({gid:'g',stat:'ml',team:'SEA',grp:'TEAM'},{gid:'g',pid:'p',stat:'passing_yards',team:'SEA',grp:'QB'})===0,'game-leg correlations wrong');
    /* the card is drawn under each game on the Pick'ems tab of the Bets and Stats page, which
       sends a tick through toggleLeg: draw it and tick it the same way */
    const gopen=S.sched.find(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w));
    const gbox=d.createElement('div'); gbox.innerHTML=F('gameBetsCard')(gopen,false);
    const gcb=gbox.querySelector('[data-leg$="|ml"]'); chk(!!gcb,'no to-win checkbox on the Game bets card');
    const gtick=()=>F('toggleLeg')(gcb.dataset.leg,+gcb.dataset.k,gopen,gcb.dataset.side||'over',gcb.dataset.main==='1');
    if(gcb){ gtick(); const L=Object.values(S.parlay).find(l=>l.stat==='ml'); chk(!!L&&L.grp==='TEAM'&&L.p>0&&L.p<1&&L.label==='To win','to-win leg did not land in the parlay');
      chk(/To win/.test(d.getElementById('parlayBody').textContent),'to-win leg not shown in the parlay builder');
      gtick(); chk(!Object.values(S.parlay).some(l=>l.stat==='ml'),'to-win leg did not come back out'); }
    console.log(`J. game bets: home win ${(hw.p*100).toFixed(0)}% at +3, cover ${(hc.p*100).toFixed(0)}%, settlement and toggling ok`); }

  /* ---- J2. the game total: over or under the posted points, priced, settled and correlated.
     Its chance is the market's own (props/research/totals/: no points model beat the posted total
     on 2024-2026): the over is its over and under prices with the margin out, i(o)/(i(o)+i(u)),
     and 50% without both, on made-up prices and on every game of the schedule; the model's points
     never enter it, however they move or with the payload's points model gone; TOTAL_SD prices
     only a number other than the posted one, Normal(posted total, 13.2) ---- */
  { const tb=F('totalBet'), mT=F('modelTotal'), SD=w.eval('TOTAL_SD'), gbN=F('gbNorm');
    const imp=a=>a>0?100/(a+100):-a/(-a+100), has=v=>v!=null&&isFinite(v)&&v!==0;
    const noVig=g=>has(g.tov)&&has(g.tou)?imp(g.tov)/(imp(g.tov)+imp(g.tou)):0.5;
    const gj=S.sched.find(x=>x.tot!=null)||S.sched[0], gx={...gj,tot:44.5}; delete gx.tov; delete gx.tou;
    const o=tb(gx,'over'), u=tb(gx,'under');
    chk(Math.abs(o.p+u.p-1)<1e-12&&o.line===44.5&&u.line===44.5,'over and under chances do not sum to 1 on the posted total');
    const badNv=[];
    for(const pr of [{tov:-105,tou:-115},{tov:-110,tou:-110},{tov:120,tou:-140},{tov:-250,tou:200},{tov:100,tou:100},{tov:-130},{tou:-130},{},{tov:0,tou:-110}]){
      const g={...gx,...pr}, a=tb(g,'over'), b=tb(g,'under'), want=noVig(g);
      if(!(Math.abs(a.p-want)<1e-12&&Math.abs(b.p-(1-want))<1e-12&&a.mu===44.5&&a.line===44.5)) badNv.push(`${JSON.stringify(pr)} gives ${a.p.toFixed(4)}, not ${want.toFixed(4)}`); }
    let nTot=0, nPriced=0;
    for(const g of S.sched){ const a=tb(g,'over');
      if(g.tot==null||!isFinite(g.tot)){ if(a!==null) badNv.push(`${g.id} has no total and is priced`); continue; }
      nTot++; if(has(g.tov)&&has(g.tou)) nPriced++;
      if(!(Math.abs(a.p-noVig(g))<1e-12&&a.mu===g.tot&&a.line===g.tot)) badNv.push(`${g.id} gives ${a.p.toFixed(4)}, not ${noVig(g).toFixed(4)}`); }
    chk(!badNv.length,`a total's chance is not the no-vig chance of its over and under prices (50% without both): ${badNv.slice(0,4).join('; ')}`);
    chk(Math.abs(o.p-0.5)<1e-12&&Math.abs(tb({...gx,tov:-105,tou:-115},'over').p-(105/205)/((105/205)+(115/215)))<1e-12,'a total with no price is not an even 50%, or -105/-115 is not 48.9% over');
    /* the model's points never enter the chance (nor the leg's): moved three ways, then with the
       payload's points model taken away, not one total's chance moves, while the points shown do */
    { const tl0=F('totalLeg'), withTot=S.sched.filter(g=>g.tot!=null&&isFinite(g.tot));
      const snap=()=>withTot.map(g=>[tb(g,'over').p,tb(g,'under').p,tl0(g,'over').p,tl0(g,'under').p].join()), before=snap();
      w.__keepMP=w.eval('modelPoints'); const keepPts=PAY.pts, moved=[], shown=[];
      for(const fake of ['function(){ return 3; }','function(){ return 45; }','function(t,o,h){ return h?40:5; }',null]){
        if(fake) w.eval('modelPoints='+fake); else { w.eval('modelPoints=window.__keepMP'); PAY.pts=null; }
        const now=snap(); withTot.forEach((g,i)=>{ if(now[i]!==before[i]) moved.push(`${g.id} (${fake||'no points model'})`); });
        shown.push(mT(gx).toFixed(1)); }
      PAY.pts=keepPts; w.eval('modelPoints=window.__keepMP'); delete w.__keepMP;
      chk(!moved.length,`the model's points moved a total's chance: ${moved.slice(0,4).join('; ')}`);
      chk(shown[0]==='6.0'&&shown[1]==='90.0'&&shown[2]==='45.0','the model\'s points shown are not modelPoints for the two sides: '+shown.join(', ')); }
    /* another number than the posted one: Normal about the posted total, TOTAL_SD; the posted number itself at the market's chance */
    { const pg={...gx,tov:-130,tou:110};
      chk(SD===13.2&&Math.abs(tb(gx,'over',47.5).p-(1-gbN(3/13.2)))<1e-12&&Math.abs(tb(gx,'under',41.5).p-gbN(-3/13.2))<1e-12&&tb(gx,'over',47.5).line===47.5&&tb(gx,'over',47.5).mu===44.5
        &&Math.abs(tb(pg,'over',44.5).p-noVig(pg))<1e-12&&Math.abs(tb(pg,'over',null).p-noVig(pg))<1e-12,'a total on another number is not priced Normal(posted total, 13.2), or the posted number not at the market\'s chance');
      chk(tb(gx,'over',50.5).p<tb(gx,'over',47.5).p&&tb({...gx,tot:null},'over')===null,'a higher number should be harder to go over, and no total no leg'); }
    /* settlement on a made-up final: 27-20 is 47 points */
    S.sched.push({...gx,id:'ttest',hs:27,as:20});
    const st=(side,k)=>settleLeg({gid:'ttest',stat:'total',side,k,team:gx.a});
    chk(st('over',44.5)==='win'&&st('under',44.5)==='loss'&&st('over',47)==='push'&&st('under',47)==='push'&&st('over',47.5)==='loss'&&st('under',47.5)==='win','a game total settles wrong on a 47-point final');
    S.sched.pop();
    /* settlement is the final's points against the line and nothing else: every hook either side of three finals */
    { const bad=[];
      for(const [hs,as] of [[27,20],[10,7],[0,0],[41,38]]){ S.sched.push({...gx,id:'ttest',hs,as}); const t=hs+as;
        for(const k of [t-1.5,t-1,t-0.5,t,t+0.5,t+1,t+1.5]) for(const side of ['over','under']){
          const want=t===k?'push':((side==='under'?t<k:t>k)?'win':'loss'), got=settleLeg({gid:'ttest',stat:'total',side,k,team:gx.a});
          if(got!==want) bad.push(`${side} ${k} on ${hs}-${as}: ${got}, not ${want}`); }
        S.sched.pop(); }
      chk(!bad.length,`a game total settles other than on the final's points against its line: ${bad.slice(0,4).join('; ')}`); }
    /* live: points only go up */
    const lg=F('liveGameLeg'), sc=(hs,as,state)=>({home:gx.h,away:gx.a,hs,as,state});
    chk(lg({stat:'total',side:'over',k:44.5,team:gx.a},sc(30,20,'live')).state==='hit'&&lg({stat:'total',side:'under',k:44.5,team:gx.a},sc(30,20,'live')).state==='missed'
      &&lg({stat:'total',side:'under',k:44.5,team:gx.a},sc(10,7,'post')).state==='hit'&&lg({stat:'total',side:'over',k:44.5,team:gx.a},sc(10,7,'live')).state==='live','a game total tracks wrong live');
    /* the leg: the book's price where the payload has one, -110 marked est. where it has none */
    const tl=F('totalLeg'), withP={...gx,tov:-105,tou:-115}, noP={...gx}; delete noP.tov; delete noP.tou;
    chk(tl(withP,'over').price===-105&&tl(withP,'over').src==='real'&&tl(withP,'under').price===-115&&tl(noP,'over').price===-110&&tl(noP,'over').src==='est'
      &&tl(withP,'over').key===tl(withP,'under').key&&/^Over 44\.5 points$/.test(tl(withP,'over').label)&&tl(withP,'over').grp==='TEAM','the total leg\'s price, its source, its label or its one key is wrong');
    chk(Math.abs(tl(withP,'over').p-noVig(withP))<1e-12&&Math.abs(tl(withP,'under').p-(1-noVig(withP)))<1e-12&&tl(noP,'over').p===0.5&&tl(withP,'over').mu===44.5,'the total leg does not carry the market\'s chance and the posted total');
    chk(F('isGameLeg')(tl(withP,'over')),'a game total is not a game leg');
    /* correlated with its game's passing and scoring lines, not with a win or a cover, nothing across games */
    const T={gid:'g',pid:'game',stat:'total',side:'over',grp:'TEAM',team:'SEA'};
    chk(legRho(T,{gid:'g',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA'})===w.eval('TOTAL_RHO')['QB:passing_tds']&&legRho({gid:'g',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA'},T)===legRho(T,{gid:'g',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA'})
      &&legRho(T,{gid:'g',stat:'ml',team:'SEA',grp:'TEAM'})===0&&legRho(T,{gid:'h',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA'})===0,'the total\'s correlations are wrong');
    { const a=parlayProb([{...T,p:0.5},{gid:'g',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA',p:0.5,side:'over'}]), b=parlayProb([{...T,side:'under',p:0.5},{gid:'g',pid:'q',stat:'passing_tds',grp:'QB',team:'SEA',p:0.5,side:'over'}]);
      chk(a.corr>a.indep+0.02&&b.corr<b.indep-0.02,'an over with a quarterback\'s touchdowns is not likelier together, or an under not less likely'); }
    /* on the Game bets card: both sides, one leg, the price as the card says */
    const gopen=S.sched.find(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w)&&x.tot!=null);
    if(gopen){ const keepP=JSON.stringify(S.parlay||{}); S.parlay={};
      const box=d.createElement('div'); box.innerHTML=F('gameBetsCard')(gopen,false);
      const ov=box.querySelector('[data-leg$="|game|total"][data-side="over"]'), un=box.querySelector('[data-leg$="|game|total"][data-side="under"]');
      chk(!!ov&&!!un&&+ov.dataset.k===gopen.tot&&ov.dataset.main==='1','the Game bets card does not offer the total over and under');
      { const blk=[...box.querySelectorAll('.statblk')].find(b=>/^Game total/.test(b.querySelector('h4').textContent)), pc=blk?[...blk.querySelectorAll('.pct')].map(x=>x.textContent):[];
        const want=[(noVig(gopen)*100).toFixed(0)+'%',((1-noVig(gopen))*100).toFixed(0)+'%'];
        chk(!!blk&&pc.join()===want.join()&&blk.querySelector('h4').textContent.includes(`model's points ${mT(gopen).toFixed(1)}`)&&blk.querySelector('h4').textContent.includes(`book line ${gopen.tot}`)
          &&!/The total's chance is the book's own|pulled halfway to the posted/.test(box.textContent),
          `the Game bets card does not show the total at the market's chance (${want.join('/')}) with the model's points as a display, or still explains it (app v130: no lead): ${blk?blk.textContent.replace(/\s+/g,' ').slice(0,120):'no total block'}`);
        /* (app v112) the card's note on what a suggested parlay does with a total; gone with the card's whole lead in
           app v130 (the owner's call of 22 October 2026: no descriptions anywhere), held gone */
        W.wording(!/takes a game total only where|Tick one and it joins the parlay|Chances come from our team ratings|How each side did/.test(box.textContent.replace(/\s+/g,' ')),
          `the Game bets card still carries its lead: "${(box.querySelector('p.muted')||{}).textContent||''}"`); }
      if(ov&&un){ const tick=cb=>F('toggleLeg')(cb.dataset.leg,+cb.dataset.k,gopen,cb.dataset.side,cb.dataset.main==='1');
        tick(ov); let L=S.parlay[ov.dataset.leg];
        chk(!!L&&L.stat==='total'&&L.side==='over'&&L.k===gopen.tot&&L.price===(gopen.tov!=null?gopen.tov:-110)&&L.src===(gopen.tov!=null?'real':'est')&&Math.abs(L.p-noVig(gopen))<1e-12,'ticking the over did not put the total on the parlay at its price and the market\'s chance');
        tick(un); L=S.parlay[ov.dataset.leg];
        chk(Object.keys(S.parlay).length===1&&L.side==='under','ticking the under did not take the over\'s place');
        chk(/Under [\d.]+ points/.test(d.getElementById('parlayBody').textContent),'the total is not shown in the builder');
        tick(un); chk(!S.parlay[ov.dataset.leg],'the total did not come back out'); }
      const locked=d.createElement('div'); locked.innerHTML=F('gameBetsCard')({...gopen,hs:24,as:20},true);
      chk(locked.querySelectorAll('.statblk').length===3&&!locked.querySelector('input[data-leg]'),'a kicked-off game\'s card does not mark the total with the two teams');
      S.parlay=JSON.parse(keepP); F('renderParlay')(); }
    console.log(`J2. game total: the market's chance on ${nTot} scheduled totals (${nPriced} with both prices, the rest 50%) and 9 made-up prices; the model's points (${mT(gx).toFixed(1)} on a sample game) moved 4 ways and never in it; another number at Normal(line, 13.2); settles over, under and push, live, priced, correlated, ticked one side at a time`); }

  /* ---- K. two or more touchdowns: still priced and settled (the records hold them), offered nowhere (app v127) ----
     The site offers no ladder bet since 21 October 2026 (the owner's call: "is it possible to not do ladders and just
     include Same Game Parlay eligible stuff"), 2+ touchdowns among them: a game page draws one touchdown box a player,
     toggleLeg puts on no 2+ touchdowns by any path, and the one box still puts on and takes off one touchdown */
  { const lam=-Math.log(0.5); chk(Math.abs(tdPlus(0.5,2)-(1-Math.exp(-lam)*(1+lam)))<1e-12&&Math.abs(tdPlus(0.5,1)-0.5)<1e-12,'tdPlus formula wrong');
    chk(tdPlus(0.6,2)<0.6&&tdPlus(0.6,3)<tdPlus(0.6,2)&&tdPlus(0.01,2)<0.001,'tdPlus not decreasing in k');
    const wk=Object.keys(S.actuals||{})[0]; const pid=wk?Object.keys(S.actuals[wk])[0]:null;
    if(pid){ const a=S.actuals[wk][pid]; const keep={...a}; a.tds=2; a.any_td=1;
      chk(settleLeg({week:+wk,pid,stat:'any_td',k:2})==='win'&&settleLeg({week:+wk,pid,stat:'any_td',k:3})==='loss'&&settleLeg({week:+wk,pid,stat:'any_td',k:1})==='win','2+ touchdown settlement wrong');
      delete a.tds; chk(settleLeg({week:+wk,pid,stat:'any_td',k:2})===null,'2+ on a yes/no-only stat line should stay pending'); Object.assign(a,keep); }
    const gk=openUpcoming();
    /* a starter with lines: one with nothing to project is drawn with none (no data-open), so no box */
    const rb=[...d.querySelectorAll('.plrbtn[data-open]')].find(b=>/RB1|WR1/.test(b.textContent));
    W.coverage(!!rb,`${gk.id} has no RB1 or WR1 with lines, so the touchdown boxes went untested`);
    let tdSaid='no RB1 or WR1 to open';
    if(rb){ const key=gk.id+'|'+rb.dataset.open+'|any_td', keepP=JSON.stringify(S.parlay||{}), toggle=F('toggleLeg');
      /* from no leg of his: a box is never assumed unticked (rule (b)) */
      delete S.parlay[key]; rb.click();
      const box=k=>d.querySelector(`.plrbody [data-leg="${key}"][data-k="${k}"]`);
      chk(!box(2)&&![...d.querySelectorAll('.plrbody [data-leg$="|any_td"]')].some(b=>+b.dataset.k>=2),`${gk.id}'s page draws a 2+ touchdown box: the site offers no ladder bet`);
      chk(!/Scores two or more/.test(d.getElementById('gameView').textContent),`${gk.id}'s page still draws a "Scores two or more" row`);
      toggle(key,2,gk,'over',false); chk(!S.parlay[key],'toggleLeg put 2+ touchdowns in the builder');
      const c1=box(1); chk(!!c1,`${gk.id}'s RB1 or WR1 has no touchdown box`);
      if(c1){ c1.checked=true; c1.dispatchEvent(new w.Event('change')); const L=S.parlay[key];
        chk(!!L&&L.stat==='any_td'&&L.k===1&&L.label===F('tdLabel')(L.grp,1)&&Object.values(S.parlay).filter(l=>l.stat==='any_td'&&l.pid===L.pid).length===1,`the touchdown box put on "${L&&L.label}" at k ${L&&L.k}, not one touchdown`);
        /* 2+ asked for over the one touchdown held: refused, the one touchdown left as it was */
        const was=JSON.stringify(S.parlay[key]); toggle(key,2,gk,'over',false);
        chk(JSON.stringify(S.parlay[key])===was,'toggleLeg moved the one-touchdown leg to 2+ touchdowns');
        const c1b=box(1); if(c1b){ c1b.checked=false; c1b.dispatchEvent(new w.Event('change')); }
        chk(!!c1b&&!S.parlay[key],'unticking the touchdown box left it on');
        tdSaid=`one box a player (one touchdown, on and off), no 2+ box, 2+ refused by toggleLeg`; }
      S.parlay=JSON.parse(keepP); F('renderParlay')(); }
    d.getElementById('backBtn').click();
    console.log(`K. touchdowns: P(2+|p=0.5)=${(tdPlus(0.5,2)*100).toFixed(1)}%, settlement ok; ${tdSaid}`); }

  /* ---- K2. a quarterback's anytime touchdown: his own run or catch, never a pass (app v102) ----
     The market and his stats carry it; its wording says what it is and a back's is unchanged; it
     settles on his rushing and receiving touchdowns alone, from a stats row and from the live box
     score; it moves with the total and with his own carries as TOTAL_RHO and corr.json say; and
     market + form is asked with the leg's stat (none on a quarterback's touchdown). Where the payload
     carries his model (model.QB.any_td, baked from data/final_model.json), every quarterback on a game
     to come has the leg, its chance the logit on featVec capped by his projected carries at tdrate.QB
     (x tdmult), worked here on its own; one with a book price is a priced leg at that price; and his
     game page heads the block as his own run or catch, with boxes that put the leg on worded so. The
     audit boots with NO_BAKED, so S.odds is empty here: the open weeks' own prices are ingested for
     these checks (and S.odds put back after), and where none of them prices a quarterback who can be
     suggested, one is planted at +235, so the priced leg is always held, never passed on nothing. A
     payload baked before the model has none: those checks are skipped and said, never failed. */
  { const MK=F('MKT'), GS=F('GRP_STATS'), TR=F('TOTAL_RHO'), tdLabel=F('tdLabel'), rowStats=F('rowStats'), espnStats=F('espnStats'),
      featVec=F('featVec'), dot=F('dot'), oddsFor=F('oddsFor'), pricedLegs=F('pricedLegs'), suggestable=F('suggestable');
    chk(MK.any_td.grps.includes('QB')&&GS.QB.includes('any_td'),'the anytime touchdown is not offered to a quarterback');
    const q1=tdLabel('QB',1), q2=tdLabel('QB',2);
    chk(/rushing or receiving TD/.test(q1)&&/not a TD pass/.test(q1)&&/2\+ rushing or receiving TDs/.test(q2)&&/not TD passes/.test(q2),`a quarterback's touchdown is not worded as his own run or catch: "${q1}", "${q2}"`);
    chk(tdLabel('RB',1)==='Scores a touchdown'&&tdLabel('WR',2)==='Scores 2+ touchdowns'&&tdLabel('TE',1)==='Scores a touchdown','a back\'s, receiver\'s or tight end\'s touchdown wording changed');
    /* settling, from a stats row as the file has it */
    { const row={attempts:'31',completions:'22',passing_yards:'262',passing_tds:'3',passing_interceptions:'0',carries:'6',rushing_yards:'24',rushing_tds:'0',receptions:'0',targets:'0',receiving_yards:'0',receiving_tds:'0'};
      const wk='99', pid='__qb_td__', had=S.actuals[wk];
      const at=r=>{ S.actuals[wk]={[pid]:rowStats(r)}; return [1,2,3].map(k=>settleLeg({week:+wk,pid,stat:'any_td',k,side:'over',grp:'QB'})).join(','); };
      const pass3=at(row), run1=at({...row,passing_tds:'1',rushing_tds:'1'}), both=at({...row,passing_tds:'0',rushing_tds:'1',receiving_tds:'1'});
      if(had===undefined) delete S.actuals[wk]; else S.actuals[wk]=had;
      chk(pass3==='loss,loss,loss',`three touchdown passes and no run should lose a quarterback's touchdown and his 2+: ${pass3}`);
      chk(run1==='win,loss,loss',`a quarterback's rushing touchdown (and one pass) should win his touchdown and lose his 2+: ${run1}`);
      chk(both==='win,win,loss',`a quarterback's run and catch should win his touchdown and his 2+: ${both}`); }
    /* and live, from the box score */
    { const box=(ptd,rtd)=>({boxscore:{players:[{team:{abbreviation:'WSH'},statistics:[
        {name:'passing',labels:['C/ATT','YDS','AVG','TD','INT'],athletes:[{athlete:{displayName:'Jayden Daniels'},stats:['21/30','255','8.5',String(ptd),'0']}]},
        {name:'rushing',labels:['CAR','YDS','AVG','TD','LONG'],athletes:[{athlete:{displayName:'Jayden Daniels'},stats:['7','48','6.9',String(rtd),'15']}]}]}]}});
      const e0=espnStats(box(3,0),'WAS','Jayden Daniels'), e1=espnStats(box(0,1),'WAS','Jayden Daniels');
      chk(e0&&e0.passing_tds===3&&e0.any_td===0&&e1&&e1.any_td===1,`live: a quarterback's touchdown passes counted, or his run not (${e0&&e0.any_td}, ${e1&&e1.any_td})`); }
    /* moving together: the total, his own lines, a parlay of them */
    const mq=(stat,pid)=>({gid:'gq',pid:pid||'q',team:'WAS',grp:'QB',stat,p:0.3,side:'over'}), tot={gid:'gq',pid:'game',team:'WAS',grp:'TEAM',stat:'total',p:0.5,side:'over'};
    chk(TR['QB:any_td']===0.09&&legRho(mq('any_td'),tot)===0.09&&legRho(tot,mq('any_td'))===0.09,'a quarterback\'s touchdown does not move with the total as TOTAL_RHO says');
    { const C=PAY.corr||{}, rc=C['self|QB:any_td|QB:carries'], rp=C['self|QB:any_td|QB:passing_tds'];
      if(rc==null) console.log('K2. corr.json in this payload has no quarterback touchdown pairs (baked before them): his legs move with nothing but the total');
      else { chk(rc>0&&legRho(mq('any_td'),mq('carries'))===rc&&legRho(mq('carries'),mq('any_td'))===rc,'a quarterback\'s touchdown and his carries are not correlated as corr.json says');
        chk(rp<0&&legRho(mq('passing_tds'),mq('any_td'))===rp,'a quarterback\'s touchdown and his touchdown passes are not correlated as corr.json says');
        const pp=parlayProb([{...mq('any_td'),p:0.3},{...mq('rushing_yards'),p:0.5}]); chk(pp.corr>pp.indep,'a quarterback\'s touchdown and his rushing yards on one parlay are not priced together'); } }
    /* market + form is asked with the stat */
    { let seen=null; const keepA=w.eloAltP, keepL=w.eloLoaded; w.eloAltP=(pid,side,price,src,stat)=>{ seen=stat; return null; }; w.eloLoaded=()=>true;
      const ok=F('formAgrees')({pid:'q',grp:'QB',stat:'any_td',side:'over',price:200,src:'real'});
      if(keepA===undefined) delete w.eloAltP; else w.eloAltP=keepA; if(keepL===undefined) delete w.eloLoaded; else w.eloLoaded=keepL;
      chk(seen==='any_td'&&ok===false,`formAgrees does not hand market + form the leg's stat (${seen})`); }
    const M=PAY.model.QB&&PAY.model.QB.any_td;
    if(!M) console.log('K2. quarterback touchdown: offered, worded, settled, correlated; this payload predates its model (no model.QB.any_td), so no quarterback has the leg yet and the projection checks are skipped until the props job rebakes');
    else {
      const R=PAY.tdrate.QB, MM=PAY.model.QB;
      chk(M.type==='logit'&&M.coef.length===15&&M.coef.every(isFinite),'model.QB.any_td is not a 15-number logit');
      chk(PAY.prior.QB&&PAY.prior.QB.any_td>0&&PAY.prior.QB.any_td<1,'prior.QB.any_td missing or not a chance');
      chk(!!R&&R.rush>0&&R.rush<0.2,'tdrate.QB missing: a quarterback\'s touchdown would go uncapped');
      const open=S.sched.filter(x=>!F('gameStarted')(x)&&F('weekOpen')(+x.w));
      const keepOdds=JSON.stringify(S.odds||{}); let planted=null, elig=0;
      for(const wk of new Set(open.map(g=>+g.w))) F('ingestOdds')((PAY.prices||{})[String(wk)]||[],wk);
      { const cand=[]; for(const g of open){ const r=rosterFor(g,false);
          for(const team in r) for(const x of r[team].players) if(x.pl.grp==='QB'&&x.gp>=3&&suggestable(x.pl.id)) cand.push({g,x}); }
        elig=cand.length;
        if(elig&&!cand.some(c=>oddsFor(c.g.id,c.x.pl.id,'any_td',1)!=null)){ const c=cand[0];
          ((S.odds[c.g.id]??={})[c.x.pl.id]??={}).any_td={'1':235}; planted=c.x.pl.n; } }
      const legs=pricedLegs(open);
      let nQ=0,nP=0,capped=0,mism=0,noLine=0,badLeg=0; const shown=[];
      for(const g of open){ const r=rosterFor(g,false);
        /* a quarterback the model has nothing to project for (no game last season or this, app v104)
           has no lines at all, this one included: B3 holds that */
        for(const team in r) for(const x of r[team].players){ if(x.pl.grp!=='QB'||F('nothingToProject')(x)) continue; nQ++;
          const l=statLines(x).find(s=>s.stat==='any_td'); if(!l){ noLine++; continue; }
          const p0=1/(1+Math.exp(-dot(M.coef,featVec(x.pl,'any_td',x.opp,x.ctx))));
          const mc=MM.carries?Math.max(dot(MM.carries.coef,featVec(x.pl,'carries',x.opp,x.ctx)),0):0, mr=MM.receptions?Math.max(dot(MM.receptions.coef,featVec(x.pl,'receptions',x.opp,x.ctx)),0):0;
          const cap=R?1-Math.exp(-(mc*R.rush+mr*R.rec)*(PAY.tdmult||1.5)):1, want=Math.min(p0,cap);
          if(cap<p0) capped++;
          if(!(Math.abs(l.p-want)<1e-12&&l.p>0&&l.p<1)) mism++;
          const od=oddsFor(g.id,x.pl.id,'any_td',1);
          if(od!=null&&x.gp>=3&&suggestable(x.pl.id)){ nP++; const L=legs.find(c=>c.pid===x.pl.id&&c.stat==='any_td');
            if(!(L&&L.price===od&&L.src==='real'&&L.p===l.p&&L.k===1&&L.side==='over'&&L.label===q1&&L.grp==='QB')) badLeg++;
            else if(shown.length<4) shown.push(`${x.pl.n} ${(l.p*100).toFixed(0)}% at ${od>0?'+':''}${od}`); } } }
      chk(nQ>0||!open.length,'no quarterback on a game to come');
      chk(noLine===0,`${noLine} quarterbacks on games to come with no touchdown line`);
      chk(mism===0,`${mism} quarterback touchdown chances are not the logit capped by his carries at tdrate.QB`);
      chk(badLeg===0,`${badLeg} quarterbacks with a book price on their touchdown have no priced leg at it, or one worded or priced otherwise`);
      chk(!elig||nP>=1,`${elig} quarterbacks on games to come could be suggested, and none of them with a book price on his touchdown was checked as a priced leg`);
      /* a real price's leg, that is (one priced from DraftKings' line read on ESPN is M8's to hold to the rule) */
      chk(legs.filter(c=>c.grp==='QB'&&c.stat==='any_td'&&c.src==='real').length===nP,'a quarterback touchdown leg in pricedLegs for a quarterback with no price on it, or twice');
      { const o=JSON.parse(keepOdds); for(const k of Object.keys(S.odds)) delete S.odds[k]; Object.assign(S.odds,o); }
      /* his game page: the block, its wording, its boxes */
      let page='no game to come';
      if(open.length){ const gq=openUpcoming(), roster=rosterFor(gq,false);
        const qx=Object.values(roster).flatMap(t=>t.players).find(x=>x.pl.grp==='QB'&&!F('nothingToProject')(x));
        const btn=qx&&d.querySelector(`.plrbtn[data-open="${qx.pl.id}"]`);
        if(btn){ btn.click();
          const key=gq.id+'|'+qx.pl.id+'|any_td', box=k=>d.querySelector(`.plrbody [data-leg="${key}"][data-k="${k}"]`);
          const blk=box(1)&&box(1).closest('.statblk'), h=blk&&blk.querySelector('h4');
          chk(!!h&&/^Rushing or receiving TD/.test(h.textContent.trim())&&((h.querySelector('em[data-qbtd]')||{}).textContent||'')==='not a TD pass',`a quarterback's touchdown block is not headed as his own run or catch, "not a TD pass": "${h&&h.textContent.trim()}"`);
          chk(!!box(1)&&/rushing or receiving touchdown/.test(box(1).getAttribute('aria-label')||''),'a quarterback\'s touchdown box does not say what it adds');
          /* (app v127) no 2+ box: the site offers no ladder bet; his one box puts on and takes off one touchdown, from no
             leg of his (rule (b)) */
          { const keepP=JSON.stringify(S.parlay||{}); if(S.parlay[key]){ delete S.parlay[key]; F('renderGame')(); }
            chk(!box(2)&&![...d.querySelectorAll(`.plrbody [data-leg="${key}"]`)].some(b=>+b.dataset.k>=2),'a 2+ box on a quarterback\'s touchdown: the site offers no ladder bet');
            F('toggleLeg')(key,2,gq,'over',false); chk(!S.parlay[key],'toggleLeg put a quarterback\'s 2+ touchdowns in the builder');
            if(box(1)){ box(1).checked=true; box(1).dispatchEvent(new w.Event('change'));
              const L1=S.parlay[key]; chk(!!L1&&L1.k===1&&L1.label===q1&&L1.grp==='QB',`his touchdown box put on "${L1&&L1.label}"`);
              if(box(1)){ box(1).checked=false; box(1).dispatchEvent(new w.Event('change')); } chk(!S.parlay[key],'unticking his touchdown left it on'); }
            S.parlay=JSON.parse(keepP); F('renderParlay')(); }
          page=`${qx.pl.n}'s game page heads it as his own run or catch and its boxes put on "${q1}"`; }
        else W.coverage(false,'no quarterback row on a game to come');
        d.getElementById('backBtn').click(); }
      console.log(`K2. quarterback touchdown: offered, worded, settled on his runs and catches only (a stats row and live), correlated; ${nQ} quarterbacks on games to come each with the leg, ${capped} held by his carries' cap, every chance the capped logit; ${nP} with a book price each a priced leg${planted?' (none on the open weeks\' prices, so one planted on '+planted+')':''}${shown.length?' ('+shown.join(', ')+')':''}; ${page}`); } }

  /* ---- G. state flow: upload, grade, rollover, backup round trip ---- */
  const g0=openUpcoming();
  chk(!d.getElementById('gameModal').hidden&&!d.getElementById('slateView').hidden,'game overlay did not open over the list');
  chk(d.body.classList.contains('modal-open'),'page scroll not locked behind the overlay');
  { const p0=d.querySelector('.plrbtn[data-open]'); W.coverage(!!p0,`${g0.id} has no player with lines to open`); if(p0) p0.click(); }
  const cb=d.querySelector('[data-leg]'); cb.checked=true; cb.dispatchEvent(new w.Event('change'));
  const legsBefore=Object.keys(S.parlay).length;
  /* the fixture is a week 1 of real rows; it takes the page's season, so a rollover (SEASON bumped
     in part2.js) needs no new fixture: ingestStats reads only rows of SEASON */
  const rows=Papa.parse(fs.readFileSync('../raw/fake_wk1.csv','utf8'),{header:true,skipEmptyLines:true}).data
    .map(x=>Object.assign(x,{season:String(F('SEASON'))}));
  const before=JSON.parse(JSON.stringify(S.players[Object.keys(S.players)[0]].e5));
  const r=F('ingestStats')(rows); F('renderAll')();
  chk(r.done.length>0,'week 1 not ingested');
  chk(Object.keys(S.processedGames).length===r.done.length,'games not tracked individually');
  chk(F('currentWeek')()===F('liveWeek')(),'current week should track the schedule, not uploads');
  chk(F('weekOpen')(F('liveWeek')())&&!F('weekOpen')(F('liveWeek')()+1),'week gating wrong');
  const r2=F('ingestStats')(rows); chk(r2.done.length===0&&r2.skipped.length===r.done.length,'re-upload was not skipped per game');
  /* a later file adding more games from the same week must still be accepted */
  { const wk=r.done[0].w;
    const more=rows.filter(x=>{const g=S.sched.find(y=>+y.w===+x.week&&(y.h===x.team||y.a===x.team)); return g&&!S.processedGames[g.id];});
    const r3=F('ingestStats')(more);
    chk(more.length===0||r3.done.length>0,'a second upload for the same week was wrongly skipped'); }
  chk(Object.keys(S.parlay).length===legsBefore,'parlay legs lost on upload');
  d.getElementById('backBtn').click();
  chk(d.getElementById('gameModal').hidden&&S.ui.game==null&&!d.body.classList.contains('modal-open'),'overlay did not close');
  chk(/\.modal\[hidden\]\s*\{\s*display\s*:\s*none/.test(raw),'stylesheet lacks the rule that lets the overlay actually hide');
  d.querySelector('[data-game="'+g0.id+'"]').click(); d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));
  chk(d.getElementById('gameModal').hidden,'Escape did not close the overlay');
  /* (app v126) the game's page is the Games tab's own window: leaving the tab closes it as its Back does (on the hub,
     Back or the address moved to another tab left it open on the hidden tab with body's modal-open, so that tab
     could not scroll), a focus left in it going to the chosen tab's button; and Escape acts on a game's page only
     where it is on the screen, so a key on another tab never touches the Games tab's state */
  { const tabB=t=>d.querySelector(`#tabs button[data-tab="${t}"]`), gm=d.getElementById('gameModal');
    const was=(d.querySelector('#tabs button[aria-selected="true"]')||tabB('slate')).dataset.tab;
    tabB('slate').click(); d.querySelector('[data-game="'+g0.id+'"]').click(); d.getElementById('backBtn').focus();
    chk(!gm.hidden&&S.ui.game===g0.id&&d.body.classList.contains('modal-open'),'a game did not open on the Games tab');
    tabB('track').click();
    chk(gm.hidden&&S.ui.game==null&&!d.body.classList.contains('modal-open')&&d.activeElement===tabB('track'),
      `leaving the Games tab left the game's page open (${!gm.hidden}, S.ui.game ${S.ui.game}), the page locked (${d.body.classList.contains('modal-open')}) or the focus off the tab's button`);
    S.ui.game=g0.id; S.ui.open={}; F('renderGame')(); const ui=JSON.stringify(S.ui);
    d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));
    chk(JSON.stringify(S.ui)===ui&&S.ui.game===g0.id,'Escape on another tab closed a game\'s page planted on the hidden Games tab');
    F('closeGame')(); tabB(was).click();
    chk(gm.hidden&&S.ui.game==null&&!d.body.classList.contains('modal-open'),'the planted game\'s page did not close');
    console.log(`G7. leaving the Games tab closes the game's page, the focus on the tab's button; Escape elsewhere touches nothing`); }
  const snap=JSON.stringify(S); const S2=JSON.parse(snap);
  chk(JSON.stringify(S2.parlay)===JSON.stringify(S.parlay)&&JSON.stringify(S2.processed)===JSON.stringify(S.processed),'backup round-trip changed state');
  /* ---- G5. Show stats: a player's season week by week, under his row, without opening his props ---- */
  { openUpcoming(); const b=d.querySelector('#gameView [data-stats]'); chk(!!b,'no Show stats button beside a player');
    if(b){ const pid=b.dataset.stats; b.click();
      const box=d.querySelector('#gameView .wkstats'), wks=Object.keys(S.actuals||{}).filter(w=>F('actualFor')(w,pid));
      chk(!!box&&box.querySelectorAll('tbody tr').length===wks.length&&(wks.length===0||!!box.querySelector('tfoot')),'Show stats did not list one row per week he has stats for');
      chk(!S.ui.open[pid],'Show stats opened the props as well');
      const b2=d.querySelector(`#gameView [data-stats="${pid}"]`); chk(/Hide stats/.test(b2.textContent),'the button does not offer to hide the stats');
      b2.click(); chk(!d.querySelector('#gameView .wkstats'),'Hide stats did not close the table');
      console.log(`G5. show stats: ${wks.length} week(s) listed for ${pid}, the props stayed shut, hides again`); }
    d.getElementById('backBtn').click(); }

  /* ---- G6. two on one team with the same last name and initial each keep their own box score ---- */
  { const es=F('espnStats');
    const sum={boxscore:{players:[{team:{abbreviation:'ATL'},statistics:[
      {name:'rushing',labels:['CAR','YDS','AVG','TD','LONG'],athletes:[
        {athlete:{displayName:'Bijan Robinson'},stats:['24','131','5.5','1','40']},
        {athlete:{displayName:'Brian Robinson Jr.'},stats:['6','22','3.7','0','9']}]}]}]}};
    const bij=es(sum,'ATL','Bijan Robinson'), bri=es(sum,'ATL','Brian Robinson');
    chk(bij&&bij.rushing_yards===131&&bij.carries===24&&bij.tds===1,'Bijan Robinson was handed someone else\'s rushing line: '+JSON.stringify(bij));
    chk(bri&&bri.rushing_yards===22&&bri.tds===0,'Brian Robinson was handed someone else\'s rushing line: '+JSON.stringify(bri));
    const aj=es({boxscore:{players:[{team:{abbreviation:'LAC'},statistics:[{name:'receiving',labels:['REC','YDS','AVG','TD','LONG','TGTS'],athletes:[{athlete:{displayName:'A.J. Brown'},stats:['5','70','14','0','30','8']}]}]}]}},'LAC','AJ Brown');
    chk(aj&&aj.receptions===5,'the initials fallback no longer matches "A.J." to "AJ"');
    console.log(`G6. box-score names: Bijan ${bij&&bij.rushing_yards} and Brian ${bri&&bri.rushing_yards} rushing yards kept apart, A.J./AJ still matched`); }

  console.log(`G. state flow: ingest ok, week stays on ${F('currentWeek')()} (schedule-driven), re-upload skipped, legs preserved, backup round-trips`);

  /* ---- G4. the list puts the games still to play first and the finals under a heading ---- */
  { const ws=d.getElementById('weekSel'), keep=ws.value, seen=[];
    for(const wk of ['1',String(F('currentWeek')())]){
      if(![...ws.options].some(o=>o.value===wk)) continue;
      ws.value=wk; F('renderSlate')();
      const kids=[...d.getElementById('gamesList').children].filter(n=>n.matches('.game,.slatesep'));
      const firstFinal=kids.findIndex(n=>n.matches('.game.final')), seps=kids.filter(n=>n.matches('.slatesep'));
      const lastTodo=kids.map(n=>n.matches('.game:not(.final)')).lastIndexOf(true);
      W.order(firstFinal<0||lastTodo<firstFinal,`week ${wk}: a game still to play sits below a final`);
      W.order(firstFinal<0?seps.length===0:(seps.length===1&&kids[firstFinal-1]===seps[0]),`week ${wk}: the Completed heading is missing, doubled or not right above the first final`);
      seen.push(`week ${wk} ${kids.filter(n=>n.matches('.game:not(.final)')).length} to play, ${kids.filter(n=>n.matches('.game.final')).length} final`); }
    ws.value=keep; F('renderSlate')();
    console.log(`G4. slate order: ${seen.join('; ')}`); }

  /* ---- G2. a played game's projections must not move once results land ---- */
  {
    const gp=S.sched.find(x=>x.w===1&&F('gameFinal')(x));
    if(gp){
      const H=S.headlines&&S.headlines['1']&&S.headlines['1'][gp.id];
      chk(!!H,'headline was not frozen for a finished game');
      if(H){ const live=F('gameHeadline')(gp);
        chk(JSON.stringify(live.map(x=>[x.k,x.v.pl.id,+x.v.mu.toFixed(4)]))===JSON.stringify(H.map(x=>[x.k,x.pid,+x.mu.toFixed(4)])),
          'headline drifted after results were loaded'); }
      const P=S.projections&&S.projections['1'];
      chk(P&&Object.keys(P).length>0,'projections were not frozen');
      const roster=rosterFor(gp,false); let drift=0,seen=0;
      for(const t in roster) for(const x of roster[t].players){
        const snap=P&&P[x.pl.id]; if(!snap) continue;
        for(const l of statLines(x)){ if(l.prob||snap[l.stat]==null||snap[l.stat].mu==null) continue;
          seen++; if(Math.abs(snap[l.stat].mu-l.mu)>1e-9) drift++; }
      }
      chk(seen>0,'no frozen projections to compare');
      console.log(`G2. frozen pre-game view: headline held, ${seen} stat projections stored, ${drift} differ from live (expected, live recomputes)`);
    }
  }

  /* ---- G3. track record: frozen chances score what was on screen ---- */
  {
    const TR=F('trackRecord')(), TS=F('trackSummary');
    chk(TR.length>0,'track record empty after grading');
    let badP=0,badHit=0,stored=0,faithful=0,off=0;
    for(const r of TR){ if(!(r.p>0&&r.p<1)) badP++; if(r.hit!==0&&r.hit!==1) badHit++; }
    chk(badP===0,`track record chances out of range: ${badP}`); chk(badHit===0,`track record hits not 0/1: ${badHit}`);
    const P1=S.projections['1']||{};
    for(const pid in P1) for(const stat in P1[pid]){ const sn=P1[pid][stat]; if(!sn||sn.mu==null) continue;
      chk(Array.isArray(sn.r)&&sn.r.length>=1,`rungs not frozen for ${pid} ${stat}`); stored++;
      const pl=S.players[pid]; if(!pl) continue;
      for(const [k,p] of sn.r){ faithful++; if(Math.abs(pOver(pl.grp,stat,sn.mu,k-0.5)-p)>6e-5) off++; }
      /* the paid pull's main line, else (app v136) DraftKings' line kept at kickoff for one of week 1's games, as gradeGame
         freezes it: a new season's week 1 has no paid line, and its opener's kept lines are in espn_close */
      if(sn.ml){ const L=marketLine(1,pid,stat), kept=!L&&S.sched.some(x=>+x.w===1&&F('closeLine')(x.id,pid,stat)===sn.ml[0]);
        chk(L?L.line===sn.ml[0]:kept,`frozen main line is neither the market table's nor one kept at kickoff ${pid} ${stat}`); }
    }
    chk(stored>0,'no frozen rungs found'); chk(off===0,`frozen rung chances disagree with the frozen projection: ${off} of ${faithful}`);
    const bands=[TR.filter(r=>r.p>=0.7),TR.filter(r=>r.p>=0.45&&r.p<0.7),TR.filter(r=>r.p<0.45)];
    chk(bands.reduce((a,b)=>a+b.length,0)===TR.length,'confidence bands do not partition the record');
    const t=TS(TR); chk(t.n===TR.length&&t.said>0&&t.said<1&&t.hit>=0&&t.hit<=1&&t.margin>0,'track summary malformed');
    /* a pre-v27 snapshot (projection only) must still score, from the same tables */
    const pid0=Object.keys(P1).find(p=>Object.values(P1[p]).some(x=>x.mu!=null));
    const keep=JSON.parse(JSON.stringify(P1[pid0]));
    for(const stat in P1[pid0]) if(P1[pid0][stat].mu!=null) P1[pid0][stat]={mu:P1[pid0][stat].mu};
    const TR2=F('trackRecord')(); P1[pid0]=keep;
    const a=TR.filter(r=>r.pid===pid0&&r.kind==='rung').map(r=>[r.stat,r.k,+r.p.toFixed(4),r.hit]).sort();
    const b=TR2.filter(r=>r.pid===pid0&&r.kind==='rung').map(r=>[r.stat,r.k,+r.p.toFixed(4),r.hit]).sort();
    chk(JSON.stringify(a)===JSON.stringify(b),'old-style snapshot scores differently from a frozen one');
    /* week 1 is graded on the fake file above; its main lines carry prices when the payload has
       any for week 1 (before the season's first pull it has none, and that is no failure) */
    const wk1Lines=Object.keys((w.eval('PAY').mkt||{})['1']||{}).length;
    const priced=TR.filter(r=>r.ml!=null); chk(!wk1Lines||priced.length>0,'no priced lines in the track record (built-in main lines should carry prices)');
    chk(priced.every(r=>r.imp>0&&r.imp<1&&isFinite(F('mlToDec')(r.ml))),'priced line with a bad implied chance');
    chk(priced.every(r=>r.kind!=='main'||marketLine(1,r.pid,r.stat)),'main-line price without a market line');
    chk(!!d.getElementById('lineNote'),'line-freshness note element missing');
    F('renderTrack')(); const body=d.getElementById('trackBody');
    chk(!priced.length||body.textContent.includes('Against the book'),'book table did not render');
    chk(body&&body.querySelectorAll('table').length>=(priced.length?4:3),'track record tab did not render its tables');
    chk(d.getElementById('trackMarket').options.length>1,'market filter not populated');
    const kinds={}; for(const r of TR) kinds[r.kind]=(kinds[r.kind]||0)+1;
    console.log(`G3. track record: ${priced.length} priced; ${TR.length} graded lines (${Object.entries(kinds).map(([k,v])=>k+' '+v).join(', ')}), said ${(t.said*100).toFixed(1)}% happened ${(t.hit*100).toFixed(1)}%, ${stored} snapshots carry frozen rungs, ${faithful} rung chances all match the frozen projection`);
  }
  /* ---- G3b. DraftKings' lines kept at kickoff (app v136): the record grades the model's side of them ----
     Since the paid pull ended (20 October 2026) PAY.mkt has no week past 6, and the props tab's Week and Season pills
     read 0-0 from week 7 on. weekly.py's espn_close keeps DraftKings' main lines as the last published read had them
     before kickoff (PAY.espn_close), and gradeGame and trackRecord grade on them where no paid line is. Planted on the
     week-1 final G2 graded, every stand-in put back: the kept line frozen into the snapshot with the model's chance at
     it, graded on the model's side with no price, counted by the week's pill, a paid line winning over it, another
     game's kept line and a junk one never read. Blocking: a number the page states. */
  { /* the real table first: every game of it this season's, on the schedule in that week, kicked off (or scored), each
       read before its kickoff, each line a half point above 0 and at most 1000 on a player id of the page's shape */
    { const C=PAY.espn_close, bad=[]; let n=0, m=0;
      if(C!=null){ if(C.v!==1||!C.weeks||typeof C.weeks!=='object') bad.push('not {v:1, weeks}');
        else for(const [wk,G] of Object.entries(C.weeks)) for(const [gid,e] of Object.entries(G||{})){ n++;
          const g=S.sched.find(z=>z.id===gid), ko=g&&F('kickoff')(g), t=Date.parse(e&&e.at);
          if(!g||String(+g.w)!==wk) { bad.push(gid+' is not a game of week '+wk); continue; }
          /* kicked off by the time the payload was baked (its baked_at, the run's own clock, which espn_close judged by),
             or scored: never the page's clock, which the audit moves back to before the week's last kickoff once none is
             left to start (the hours after Monday night's kickoff), where every game kept that night would read as to come */
          const bk=Date.parse(PAY.baked_at||''), kicked=isFinite(bk)?ko.getTime()<=bk:F('gameStarted')(g);
          if(!kicked&&!F('gameFinal')(g)) bad.push(gid+' had not kicked off when the payload was baked ('+PAY.baked_at+')');
          if(!(t<ko.getTime())) bad.push(gid+' was read at or after its kickoff ('+(e&&e.at)+')');
          for(const [pid,L] of Object.entries((e&&e.lines)||{})){ if(!/^(?!__proto__$)[A-Za-z0-9_.:\-]{1,40}$/.test(pid)) bad.push(gid+': player id '+pid);
            for(const [st,v] of Object.entries(L||{})){ m++; if(!(typeof v==='number'&&v>0&&v<=1000&&Number.isInteger(v*2))) bad.push(`${gid} ${pid} ${st} ${v}`); } } } }
      chk(!bad.length,'G3b: PAY.espn_close is not what the props job keeps: '+bad.slice(0,4).join('; '));
      console.log(`G3b. DraftKings' lines kept at kickoff on the payload: ${n} game(s), ${m} line(s)`); }
    const gp=S.sched.find(x=>x.w===1&&F('gameFinal')(x));
    if(!gp) console.log('G3b. no final in week 1 to plant on: skipped');
    else {
      const keepMkt=PAY.mkt, hadClose='espn_close' in PAY, keepClose=PAY.espn_close;
      const keepP=JSON.stringify((S.projections||{})['1']||{}), keepH=JSON.stringify(((S.headlines||{})['1']||{})[gp.id]||null);
      const wr=d.getElementById('weekRec'), sr=d.getElementById('seasonRec'), keepW=wr.innerHTML, keepS=sr.innerHTML;
      try{
        const roster=rosterFor(gp,true), A1=(S.actuals||{})['1']||{}; let x=null,l=null;
        for(const t in roster){ for(const y of roster[t].players){ const A=A1[y.pl.id]; if(!A) continue;
          const z=statLines(y).find(q=>!q.prob&&q.mu>0.5&&A[q.stat]!=null&&isFinite(A[q.stat])); if(z){ x=y; l=z; break; } } if(x) break; }
        chk(!!x,'G3b: no player of the week-1 final with a stat line to plant on');
        if(x){
          const pid=x.pl.id, stat=l.stat, v=A1[pid][stat], line=Math.floor(l.mu)+0.5;
          const other=S.sched.find(z=>z.w===1&&z.id!==gp.id), at='2026-09-01T00:00:00.000Z';
          const otherE=other?{[other.id]:{at,lines:{[pid]:{[stat]:line+10}}}}:{};
          PAY.mkt=Object.assign({},keepMkt||{},{'1':{}});
          PAY.espn_close={v:1,weeks:{'1':Object.assign({[gp.id]:{at,lines:{[pid]:{[stat]:line}}}},otherE)}};
          F('gradeGame')(gp);
          const sn=S.projections['1'][pid][stat], pO=+pOver(x.pl.grp,stat,sn.mu,line).toFixed(4);
          chk(Array.isArray(sn.ml)&&sn.ml[0]===line&&sn.ml[1]===pO,`G3b: the kept line ${line} was not frozen into ${pid}'s ${stat} snapshot with the model's chance ${pO}: ${JSON.stringify(sn.ml)}`);
          const rows=F('trackRecord')().filter(r=>r.w===1&&r.pid===pid&&r.stat===stat&&r.kind==='main');
          const over=pO>=0.5, hit=(over?v>line:v<line)?1:0;
          chk(rows.length===1&&rows[0].k===line&&rows[0].side===(over?'over':'under')&&rows[0].hit===hit&&Math.abs(rows[0].p-(over?pO:1-pO))<1e-9&&rows[0].ml==null&&rows[0].imp==null,
            `G3b: the record does not grade the model's side of the kept line with no price: ${JSON.stringify(rows)}`);
          F('renderRecords')(1);
          const m1=F('trackRecord')().filter(r=>r.kind==='main'&&+r.w===1);
          chk(m1.some(r=>r.pid===pid&&r.stat===stat)&&wr.textContent===`Week 1 ${m1.filter(r=>r.hit).length}–${m1.filter(r=>!r.hit).length}`,`G3b: the week pill does not count the kept line: ${wr.textContent}`);
          PAY.mkt['1']={[pid]:{[stat]:{line:line+1,over:-110,under:-110}}}; F('gradeGame')(gp);
          chk(S.projections['1'][pid][stat].ml&&S.projections['1'][pid][stat].ml[0]===line+1,'G3b: the kept line stood over the paid one');
          PAY.mkt['1']={};
          if(other){ PAY.espn_close={v:1,weeks:{'1':otherE}}; F('gradeGame')(gp);
            chk(!S.projections['1'][pid][stat].ml,'G3b: another game\'s kept line was read for this one'); }
          for(const junk of [{v:2,weeks:{'1':{[gp.id]:{at,lines:{[pid]:{[stat]:line}}}}}},{v:1,weeks:{'1':{[gp.id]:{at,lines:{[pid]:{[stat]:'7.5'}}}}}},{v:1,weeks:{'1':{[gp.id]:{at,lines:{[pid]:{[stat]:-3.5}}}}}},'junk',null]){
            PAY.espn_close=junk; F('gradeGame')(gp);
            chk(!S.projections['1'][pid][stat].ml,`G3b: a kept table that is not one was read: ${JSON.stringify(junk)}`); }
          console.log(`G3b. DraftKings' line kept at kickoff: ${x.pl.n}'s ${stat} at ${line} frozen, graded ${over?'over':'under'} (${hit?'hit':'miss'}) with no price and counted by the week's pill; a paid line wins, another game's and junk never read`);
        }
      } finally {
        PAY.mkt=keepMkt; if(hadClose) PAY.espn_close=keepClose; else delete PAY.espn_close;
        S.projections['1']=JSON.parse(keepP); const h=JSON.parse(keepH); if(h) S.headlines['1'][gp.id]=h;
        wr.innerHTML=keepW; sr.innerHTML=keepS; } } }
  /* ---- T1. the team model's ratings are this season's (25 October 2026) ----
     payload.py's team_grid: each club's elo, off_epa and d_off_epa from betting/state.json's teams (Alpha Model's ratings,
     the inputs the betting app's equation runs on), the file's preseason seed only for a club the state has not got whole,
     src saying which; the coefficients grid_model.json's own. Until that day every team bet stood on the preseason seeds.
     Held against the state on disk where the payload says it read it (a payload baked before reads as the seeds) */
  { const G=PAY.grid, fsT=require('fs'), pathT=require('path'), bad=[];
    const gm=JSON.parse(fsT.readFileSync(pathT.join(__dirname,'..','data','grid_model.json'),'utf8'));
    for(const k of ['coef','feats','intercept']) if(JSON.stringify(G[k])!==JSON.stringify(gm[k])) bad.push(k+' is not grid_model.json\'s');
    let st=null; try{ st=JSON.parse(fsT.readFileSync(pathT.join(__dirname,'..','..','betting','state.json'),'utf8')); }catch(e){}
    const src=G.src||null, fin=x=>typeof x==='number'&&isFinite(x);
    if(src&&src.teams==='betting/state.json'){
      /* the values against the state on disk only where it is the one the payload was baked from (its publish time):
         a replay of an older payload beside today's state holds the shape alone (each club the state's kind of
         number, n games, or exactly its seed) */
      const same=!!st&&st.published!=null&&st.published===src.published, T=(st&&st.teams)||{}; let on=0, seed=0;
      for(const [t,v] of Object.entries(G.teams||{})){
        if(same){ const s0=T[t]||{};
          if(['elo','off_epa','d_off_epa'].every(k=>fin(s0[k]))){ on++;
            if(Math.abs(v.elo-s0.elo)>0.006||Math.abs(v.off_epa-s0.off_epa)>6e-6||Math.abs(v.d_off_epa-s0.d_off_epa)>6e-6||v.n!==(+s0.n||0)) bad.push(`${t}: ${v.elo}/${v.off_epa}/${v.d_off_epa}, the state ${s0.elo}/${s0.off_epa}/${s0.d_off_epa}`); }
          else { seed++; if(JSON.stringify(v)!==JSON.stringify(gm.teams[t])) bad.push(t+': not on the state and not its seed'); } }
        else if(JSON.stringify(v)===JSON.stringify(gm.teams[t])&&!('n' in v&&v.n>0)) seed++;
        else if(['elo','off_epa','d_off_epa'].every(k=>fin(v[k]))&&Number.isInteger(v.n)) on++;
        else bad.push(t+': '+JSON.stringify(v)); }
      if(!same) console.log(`T1. betting/state.json on disk is not the one this payload was baked from (${src.published} against ${st&&st.published}): held to its shape`);
      if(on!==src.clubs||seed!==src.seeds) bad.push(`src says ${src.clubs} on the state and ${src.seeds} seeds, the table ${on} and ${seed}`);
      console.log(`T1. the team model's ratings: ${on} clubs on betting/state.json's, ${seed} on the preseason seed`); }
    else { if(JSON.stringify(G.teams)!==JSON.stringify(gm.teams)) bad.push('a payload with no src whose teams are not the seeds');
      console.log('T1. the team model\'s ratings: the preseason seeds (a payload baked before 25 October 2026, or the state did not read)'); }
    chk(!bad.length,'T1: the team model\'s ratings are not what payload.py takes: '+bad.slice(0,4).join('; ')); }
  /* ---- the rules a suggested leg keeps, worked here on their own (app v111) ----
     Since app v111 the suggestions are two things: Suggested Parlays (#suggest), each Thursday, Sunday and
     Monday night game's own Safe, Medium, Aggressive and Extreme from that game's lines alone, locked 2 hours
     before kickoff; and the Parlay Builder's Top 50 lines (Top 100 until app v113), every leg on the reader's ticks that qualifies as
     a suggestion's leg, ranked by what $1 on it is expected to make. M, M3, M4, M7, M8, M9 and M10 hold both,
     and the level engine the sets are built by (pbPool, pbTier, getPbTiers, kept as code), from the copies
     here, never the page's own reading:
       FAIRAUD   the book's fair chance (DraftKings' prices with the margin out; one side over the week's
                 typical overround, est.) and the far-off rule, M7's own copy, lifted out for the list and the sets
       kickAud   a game's kickoff instant from its Eastern date and time, through the time zone database
       primeAud  a prime-time game: a Thursday, Sunday or Monday kickoff at or after 7:00 pm US Eastern (the
                 owner's call, 16 October 2026: Thursday, Sunday and Monday night football, a Monday
                 doubleheader's both games; never a day game or a Saturday), read from that instant
       qualAud   the legs a suggestion may take on the ticks: a real price (or one from DraftKings' line read
                 by Refresh odds), 45-97%, at or above the price's implied chance, a player leg only once the
                 Elo files are in, none far off the market, DraftKings' id at its line where the payload
                 carries ids (dkOk; the Top lines too since app v119, which from app v115 kept a player's
                 leg from the read with none), preferred over the 3-point edge with
                 market + form agreeing and thin below it, and with Game total ticked each total at the
                 book's own chance, its own list
       topAud    the Top 50 lines from qualAud (app v112): the preferred legs first, the Value picks, then
                 the other lines, the thin legs and then the totals (after every thin leg, whatever each is
                 expected to make: a total priced on one side only is put at 50%, so at plus money it can be
                 expected to make more than a thin leg), each part by expected profit on $1 (chance times the
                 decimal price, less the $1), best first, at most TOP_N_AUD in all (50 since app v113: the owner's
                 "in parlay builder only do top 50 now instead of 100"); a row's group value or other.
                 Each bet once (sameBetAud): a ladder rung k+ (a player's over that is not his main line) is
                 the same bet as his main Over at k-0.5 on a half-point line, so where that main Over is among
                 the preferred or thin legs the rung is left out of every part and its slot goes to the next
                 line; a whole-number main line (Over 225 pushes at 225, where 226+ loses) and an Under main
                 line never take a rung's place (the owner, 17 October 2026: Patrick Mahomes's Over 224.5 and
                 225+ passing yards ranked 1 and 2). Dormant on the page's own lines since app v127, when pricedLegs
                 stopped making rungs (the site offers no ladder bet): M12 holds it on made-up lines that stand in
                 for pricedLegs, and NL1 that the week's list leaves no rung out because none reaches it */
  const FAIRAUD=(()=>{ const isG=F('isGameLeg'), FAR=w.eval('FAR_OFF');
    const imp=a=>a>0?100/(a+100):-a/(-a+100), px=v=>v!=null&&isFinite(v)&&v!==0, nv=(a,b)=>imp(a)/(imp(a)+imp(b));
    const med=a=>{ if(!a.length) return null; const s=[...a].sort((x,y)=>x-y), m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };
    /* the week's typical overround on its two-sided lines, by kind and over all of them */
    const vig=wk=>{ const by={player:[],ml:[],ats:[],total:[]}, M=F('PAY').mkt[String(wk)]||{};
      for(const pid in M) for(const st in M[pid]){ const L=M[pid][st]; if(L&&px(L.over)&&px(L.under)) by.player.push(imp(L.over)+imp(L.under)); }
      for(const g of S.sched.filter(g=>String(g.w)===String(wk))){ if(px(g.mla)&&px(g.mlh)) by.ml.push(imp(g.mla)+imp(g.mlh));
        if(g.sp!=null&&isFinite(g.sp)&&px(g.spa)&&px(g.sph)) by.ats.push(imp(g.spa)+imp(g.sph));
        if(g.tot!=null&&isFinite(g.tot)&&px(g.tov)&&px(g.tou)) by.total.push(imp(g.tov)+imp(g.tou)); }
      const o={all:med([...by.player,...by.ml,...by.ats,...by.total])}; for(const k in by) o[k]=med(by[k]); return o; };
    /* a leg's fair chance by the rule, on the price the builder gives it (legPrice) */
    const fairOf=l=>{ const lp=F('legPrice')(l);
      /* priced from DraftKings' line read on ESPN: the formula's own fair chance, est. (a touchdown's its
         price over the week's typical player overround), by espn_rule.js */
      if(lp&&lp.src==='dkline'&&px(lp.ml)){ const x=ESR.price(l); if(!x) return null;
        return x.kind==='td'?{p:Math.max(0.001,Math.min(0.999,imp(lp.ml)/ESR.playerVig(l.week))),est:true}:{p:x.fair,est:true}; }
      if(!lp||lp.src!=='real'||!px(lp.ml)) return null;
      const g=S.sched.find(x=>x.id===l.gid), u=l.side==='under';
      if(l.stat==='total'){ if(g&&g.tot!=null&&+l.k===+g.tot&&px(g.tov)&&px(g.tou)) return {p:u?nv(g.tou,g.tov):nv(g.tov,g.tou),est:false}; }
      else if(l.stat==='ml'||l.stat==='ats'){ if(g&&(l.team===g.h||l.team===g.a)){ const h=l.team===g.h, own=l.stat==='ml'?(h?g.mlh:g.mla):(h?g.sph:g.spa), oth=l.stat==='ml'?(h?g.mla:g.mlh):(h?g.spa:g.sph);
        if((l.stat==='ml'||(g.sp!=null&&+l.k===(h?-g.sp:+g.sp)))&&px(own)&&px(oth)) return {p:nv(own,oth),est:false}; } }
      else if(l.main){ const x=((F('PAY').mkt[String(l.week)]||{})[l.pid]||{})[l.stat]; if(x&&+x.line===+l.k&&px(x.over)&&px(x.under)) return {p:u?nv(x.under,x.over):nv(x.over,x.under),est:false}; }
      const V=vig(l.week), ov=V[isG(l)?l.stat:'player']||V.all; return ov>0?{p:Math.max(0.001,Math.min(0.999,imp(lp.ml)/ov)),est:true}:null; };
    const gap=l=>{ const f=fairOf(l); return f?l.p-f.p:null; }, isFar=l=>{ const x=gap(l); return x!=null&&x>=FAR-1e-9; };
    return {imp,px,nv,med,vig,fairOf,gap,isFar}; })();
  const kickAud=g=>{ const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(String(g&&g.d||'')), t=/^(\d\d):(\d\d)$/.exec(String(g&&g.t||'13:00')); if(!m||!t) return null;
    const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    for(const off of [4,5]){ const ms=Date.UTC(+m[1],+m[2]-1,+m[3],+t[1]+off,+t[2]), p=Object.fromEntries(fmt.formatToParts(ms).map(x=>[x.type,x.value]));
      if(`${p.year}-${p.month}-${p.day}`===g.d&&`${p.hour}:${p.minute}`===`${t[1]}:${t[2]}`) return ms; }
    return null; };
  const etAud=ms=>new Date(ms).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',minute:'2-digit'})+' ET';
  /* (app v125) the reason a tier gives with no player line on the ticked games (no paid pull, so no pull timing): when
     DraftKings' lines for them were last read from ESPN (the published read or a press: lastReadAud, the audit's own),
     or that they have not been, for the ticked games' ids */
  /* (app v130, the owner's call of 22 October 2026: no descriptions) the state alone, the read's time with it, in the
     one phrase a set's reasons are made of too: "no player lines yet (read Tue 8:07 AM ET)" */
  const noPlAud=ids=>{ const t=lastReadAud(ids);
    return t?`No player lines yet (read ${etAud(t)}).`:'Player lines not read yet.'; };
  const low1=s=>s[0].toLowerCase()+s.slice(1);
  const primeAud=g=>{ const k=kickAud(g); if(k==null) return false;
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(k).map(x=>[x.type,x.value]));
    return ['Thu','Sun','Mon'].includes(p.weekday)&&+p.hour>=19; };
  /* (app v112) the night rule, the audit's own copy (the owner's call of 17 October 2026: "just show the next night
     game dont stack the monday night game until monday morning"): of the prime-time games still to come, the tab
     sets out those of the first Eastern date (both games of a doubleheader), and only from 6:00 AM Eastern on the
     day after the latest prime-time night before that date anywhere on the schedule (any week, played or not);
     with none before it, at once. Every date and instant through the time zone database (Intl), never the page's
     spNight or its easternOffset */
  const etDateAud=ms=>{ const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(ms).map(x=>[x.type,x.value])); return `${p.year}-${p.month}-${p.day}`; };
  const dayAfterAud=dd=>new Date(Date.UTC(+dd.slice(0,4),+dd.slice(5,7)-1,+dd.slice(8,10)+1,12)).toISOString().slice(0,10);
  const nightRuleAud=(toCome,sched,now)=>{ const G=toCome.filter(primeAud).map(g=>({g,k:kickAud(g)})).sort((a,b)=>(a.k-b.k)||String(a.g.id).localeCompare(String(b.g.id)));
    if(!G.length) return {games:[],open:null,prev:null,up:false};
    const D=etDateAud(G[0].k), games=G.filter(x=>etDateAud(x.k)===D).map(x=>x.g);
    const prev=(sched||[]).filter(primeAud).map(g=>etDateAud(kickAud(g))).filter(x=>x<D).sort().pop()||null;
    const open=prev?kickAud({d:dayAfterAud(prev),t:'06:00'}):null;
    return {games,open,prev,prevN:prev?(sched||[]).filter(g=>primeAud(g)&&etDateAud(kickAud(g))===prev).length:0,up:open==null||now>=open}; };
  const isoAud=ms=>new Date(ms).toISOString().replace(/\.\d{3}Z$/,'Z');
  /* a check that holds the cards of every prime-time game to come, some of which the night rule hides, stands in
     the page's spOn (the one place the tab asks which games it sets out) to set out every game it builds
     (spGames), and puts it back; which games the tab really sets out is held in holdSets and M11 */
  /* each stand-in keeps the page's own function in a slot of its own (a closure here, never a shared window name), put
     back on every path; spOnPut sets the page's binding back */
  const spOnPut=w.eval('(function(f){ spOn=f; })');
  const spAllOn=f=>{ const keep=w.eval('spOn');
    try{ w.eval('spOn=function(){ return spGames(); }'); return f(); } finally { spOnPut(keep); } };
  /* (app v118) the Sunday slot, the audit's own copy of the rule (the owner's calls of 19 October 2026: "I would like it to
     have ELO picks for the slot of Sunday games", and "do a separate section for night games and then the sunday slot of
     games"): a week's Sunday games kicking off before 7:00 pm Eastern, in kickoff order (the schedule's on a tie), are one
     unit, <season>_<WW>_SUN. The tab is on the current week's slot (the earliest week with a game not final: a score, or
     four hours past its kickoff), else the next week's, whichever still has a game to kick off with no score; it is set
     out from 6:00 AM Eastern on the day after the latest prime-time night before its Sunday anywhere on the schedule
     (none before it: at once), locked 2 hours before its first kickoff, under way from that kickoff, and gone at its
     last. Every date and instant through the time zone database (kickAud, etDateAud, primeAud), never the page's
     spSlotUnit, spSlotNext, spOpenAt or currentWeek */
  const etWdHAud=ms=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(ms).map(x=>[x.type,x.value]));
  const scoredAud=g=>g.hs!=null&&g.as!=null&&isFinite(g.hs)&&isFinite(g.as);
  const slotGamesAud=(sched,wk)=>(sched||[]).map((g,i)=>({g,i,k:kickAud(g)})).filter(x=>+x.g.w===+wk&&x.k!=null&&(p=>p.weekday==='Sun'&&+p.hour<19)(etWdHAud(x.k)))
    .sort((a,b)=>(a.k-b.k)||(a.i-b.i)).map(x=>x.g);
  const liveWeekAud=(sched,now)=>{ const ws=[...new Set(F('PAY').sched.map(g=>+g.w))].sort((a,b)=>a-b);
    for(const wk of ws) if((sched||[]).some(g=>+g.w===wk&&!(scoredAud(g)||(kickAud(g)!=null&&now>=kickAud(g)+4*3600e3)))) return wk;
    return ws[ws.length-1]; };
  const slotRuleAud=(sched,now,cw)=>{ for(const wk of [cw,cw+1]){ const G=slotGamesAud(sched,wk); if(!G.length||!G.some(g=>now<kickAud(g)&&!scoredAud(g))) continue;
      const ks=G.map(kickAud), first=Math.min(...ks), last=Math.max(...ks), D=etDateAud(first);
      const prev=(sched||[]).filter(primeAud).map(g=>etDateAud(kickAud(g))).filter(x=>x<D).sort().pop()||null;
      const open=prev?kickAud({d:dayAfterAud(prev),t:'06:00'}):null, lock=first-2*3600e3, up=open==null||now>=open;
      return {w:+wk,id:`${F('SEASON')}_${String(wk).padStart(2,'0')}_SUN`,games:G,first,last,open,prev,prevN:prev?(sched||[]).filter(g=>primeAud(g)&&etDateAud(kickAud(g))===prev).length:0,lock,up,
        phase:!up?'wait':now<lock?'live':now<first?'locked':'under'}; }
    return null; };
  /* the slot the tab stands on now, by that rule on the page's clock and schedule; the token spState carries for it */
  const slotNowAud=()=>{ const now=w.Date.now(); return slotRuleAud(S.sched,now,liveWeekAud(S.sched,now)); };
  const slotTokAud=R=>'s='+(R?R.id+':'+({wait:'w',live:'l',locked:'k',under:'u'})[R.phase]:'');
  /* (app v129, the owner's call of 22 October 2026: "get rid of the Sunday slot record section -> all should be a part of
     'Night Games'") the tab is one section, Night games: the night games' sets (or the line before the next night is up,
     or that none is left), then the Sunday slot's (its set, .sp-slot, its line before it is up, whose data-sp-next is its
     <season>_<WW>_SUN id, or the line that none is left, data-sp-none="slot"). These pick each part out of it, and
     spPartsAud holds the order: every night part before every slot part, the slot's set the one unit marked .sp-slot */
  const SPN='#spPanel [data-sp-sec="night"]', SP_NG=`${SPN} [data-sp-game]:not(.sp-slot)`, SP_NW=`${SPN} [data-sp-wait]:not([data-sp-next$="_SUN"])`;
  /* (app v131) the Sunday slot is its own section again, Day games: its one part there */
  const SPD='#spPanel [data-sp-sec="slot"]', SP_SG=`${SPD} [data-sp-game].sp-slot`, SP_SW=`${SPD} [data-sp-wait][data-sp-next$="_SUN"]`, SP_SN=`${SPD} [data-sp-none="slot"]`;
  /* (app v132) Day games is not drawn on a Sunday from 4pm Eastern, worked here through Intl at the page's clock */
  const dayOffAud=()=>{ if(w.__dayStood) return false; const p={}; for(const x of new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'numeric',hourCycle:'h23'}).formatToParts(new Date(w.Date.now()))) p[x.type]=x.value; return p.weekday==='Sun'&&+p.hour>=16; };
  const spPartsAud=()=>{ const dd=w.document, A=[...dd.querySelectorAll(`${SP_NG},${SP_NW}`)], B=[...dd.querySelectorAll(`${SP_SG},${SP_SW},${SP_SN}`)], slotId=/^\d{4}_\d{2}_SUN$/;
    /* (app v132) Day games above Night games, its one part first; none on a Sunday from 4pm Eastern */
    if(dayOffAud()) return !B.length&&!dd.querySelector(SPD)&&!dd.querySelector(`${SPN} .sp-slot,${SPN} [data-sp-next$="_SUN"],${SPN} [data-sp-none]`);
    return B.length===1&&A.every(a=>B.every(b=>!!(b.compareDocumentPosition(a)&4)))&&!dd.querySelector(`${SPN} .sp-slot,${SPN} [data-sp-next$="_SUN"],${SPN} [data-sp-none]`)
      &&[...dd.querySelectorAll('#spPanel [data-sp-game]')].every(x=>x.classList.contains('sp-slot')===slotId.test(x.dataset.spGame||'')); };
  /* the slot's own words, worked here: its wait line, its head (its week and games, its first kickoff to its last, in
     Eastern time), and the line that says why a level of it is empty */
  /* (app v130) the wait line its state alone: which slot, and when its sets go up (no ", the morning after ...") */
  const slotWaitAud=R=>`Next up: week ${R.w}’s Sunday slot, ${R.games.length} game${R.games.length===1?'':'s'}. Sets go up ${etAud(R.open)}.`;
  const slotHeadAud=R=>{ const day=new Date(R.first).toLocaleDateString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric'}), t=ms=>new Date(ms).toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})+' ET';
    return {h:`Week ${R.w}, ${R.games.length} game${R.games.length===1?'':'s'}`,small:`${day} · ${t(R.first)}${t(R.last)!==t(R.first)?' to '+t(R.last):''}`}; };
  /* a check that holds the slot's cards before the tab sets it out stands in the page's spSlotNext to say it is up (its
     own answer otherwise), and puts it back on every path, as spAllOn does for the nights */
  const slotPut=w.eval('(function(f){ spSlotNext=f; })');
  const slotAllOn=f=>{ const keep=w.eval('spSlotNext'); w.__dayOff=w.eval('spDayOff');
    /* (app v132) and Day games drawn whatever the hour (it is off on a Sunday from 4pm Eastern) */
    try{ slotPut(function(){ const s=keep(); return s?{...s,up:true}:s; }); w.eval('spDayOff=function(){ return false; }'); w.__dayStood=true; return f(); } finally { slotPut(keep); w.eval('spDayOff=window.__dayOff'); w.__dayStood=false; } };
  const SPEC_AUD=[['safe','Safe',2,0],['med','Medium',3,0.25],['aggr','Aggressive',4,0.12],['xtrm','Extreme',5,0.05]];
  const ALL_U={k:{ml:true,ats:true,total:true,over:true,under:true},off:[]};
  const legIdAud=l=>l.key+'|'+l.side+'|'+l.k, ordAud=(a,b)=>legIdAud(a).localeCompare(legIdAud(b));
  const kindAud=l=>l.stat==='ml'||l.stat==='ats'||l.stat==='total'?l.stat:(l.side==='under'?'under':'over');
  const agreesAud=c=>{ if(typeof w.eloAltP!=='function'||c.grp==='TEAM') return true; if(typeof w.eloLoaded==='function'&&!w.eloLoaded()) return false;
    const a=w.eloAltP(c.pid,c.side,c.price,c.src,c.stat); return a!=null&&a-F('mlProb')(c.price)>=0.03; };
  /* top: the Top lines' own pool, the same rule since app v119 (from app v115 it kept a leg from the read with no id) */
  const qualAud=(games,u,top)=>{ const mlP=F('mlProb'), out={pref:[],thin:[],mkt:[],far:0,noId:0}, formOut=typeof w.eloLoaded==='function'&&!w.eloLoaded();
    const allow=l=>!!u.k[kindAud(l)]&&!u.off.includes(l.gid);
    for(const c of F('pricedLegs')(games)){
      if(!allow(c)||!(c.src==='real'||c.src==='dkline')||!isFinite(c.price)||c.price===0||!(c.p>=0.45&&c.p<0.97)||c.p-mlP(c.price)<0) continue;
      if(c.grp!=='TEAM'&&formOut) continue;
      if(FAIRAUD.isFar(c)){ out.far++; continue; }
      if(!dkOk(c)){ out.noId++; continue; }
      (c.p-mlP(c.price)>=0.03&&agreesAud(c)?out.pref:out.thin).push({...c,thin:!(c.p-mlP(c.price)>=0.03&&agreesAud(c))}); }
    if(u.k.total) for(const g of games) for(const side of ['over','under']){ const c=F('totalLeg')(g,side);
      if(c&&allow(c)&&c.src==='real'&&isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97){ if(dkOk(c)) out.mkt.push({...c,thin:false,market:true}); else out.noId++; } }
    return out; };
  /* a list cut as the search cuts it: past the cap, the likeliest half and the best-paying half */
  const capAud=(list,cap)=>{ list=[...list].sort(ordAud); if(list.length<=cap) return list;
    const by=f=>[...list].sort((a,b)=>(f(b)-f(a))||ordAud(a,b)), keep=new Map();
    for(const c of [...by(c=>c.p).slice(0,Math.ceil(cap/2)),...by(c=>c.p*(F('mlToDec')(c.price)||1)).slice(0,Math.floor(cap/2))]) keep.set(legIdAud(c),c);
    return [...keep.values()].sort(ordAud); };
  /* the main Over a leg is the same bet as (a rung k+ against a half-point main Over at k-0.5 among the preferred or
     thin legs), or null: worked from the legs on their own, never the page's once() */
  const sameBetAud=q=>{ const isG=F('isGameLeg'), half=k=>Number.isInteger(2*(+k))&&!Number.isInteger(+k), mains=new Map();
    for(const l of [...q.pref,...q.thin]) if(!isG(l)&&!!l.main&&l.side==='over'&&half(l.k)) mains.set([l.gid,l.pid,l.stat,+l.k+0.5].join('|'),l);
    return l=>(!isG(l)&&!l.main&&l.side==='over'&&mains.get([l.gid,l.pid,l.stat,+l.k].join('|')))||null; };
  /* the list's length, the audit's own copy of the page's PB_TOP_N (never read from the page): 30 since app v116, the
     owner's call of 18 October 2026, "its only showing top 30, but honestly top 30 is enough if you want to set it at
     that" (100 from app v111; 50 from app v113, "in parlay builder only do top 50 now instead of 100") */
  const TOP_N_AUD=30;
  /* the whole order (full), its first TOP_N_AUD (rows), and the rungs left out with the main line each is (dropped) */
  const topFullAud=(games,u)=>{ const q=qualAud(games,u,true), mlD=F('mlToDec'), same=sameBetAud(q), dropped=[];
    const once=list=>list.filter(l=>{ const m=same(l); if(m) dropped.push({rung:l,main:m}); return !m; });
    const rank=(list,grp,part)=>list.map(l=>{ const dec=mlD(l.price); return dec>1?{l,dec,win:dec-1,ev:l.p*dec-1,grp,part}:null; }).filter(Boolean)
      .sort((a,b)=>(b.ev-a.ev)||ordAud(a.l,b.l));
    const full=[...rank(once(q.pref),'value','pref'),...rank(once(q.thin),'other','thin'),...rank(once(q.mkt),'other','mkt')];
    return {q,same,dropped,full,rows:full.slice(0,TOP_N_AUD)}; };
  const topAud=(games,u)=>topFullAud(games,u).rows;
  /* (app v121) two legs of one game DraftKings will not take on one slip, the audit's own copy of the rule, worked from the
     legs alone and never by the page's dkClash or dkClashWhy. The owner, 19 October 2026: "If your parlay already has a
     receiver anytime TD, a team total, or the game total, adding the QB's passing TD over often gets blocked", and "Some
     combos contradict each other, like QB under 1.5 passing TDs alongside two of his receivers to score. The book rejects
     it outright". Of one game: a player's passing touchdowns (over or under, a main line or a rung) with an anytime
     touchdown of another player of his club ('td'), or his passing touchdowns over with the game's total ('total'),
     either leg first; null for any other pair, and for two legs of different games */
  const clashAud=(a,b)=>{ const isG=F('isGameLeg'); if(!a||!b||a.gid!==b.gid) return null;
    for(const [q,o] of [[a,b],[b,a]]){ if(isG(q)||q.stat!=='passing_tds') continue;
      if(!isG(o)&&o.stat==='any_td'&&o.team===q.team&&o.pid!==q.pid) return 'td';
      if(isG(o)&&o.stat==='total'&&q.side!=='under') return 'total'; }
    return null; };
  /* every such pair in a parlay, by the legs' places in it */
  const clashPairsAud=legs=>{ const out=[]; (legs||[]).forEach((a,i)=>legs.slice(i+1).forEach((b,k)=>{ const x=clashAud(a,b); if(x) out.push([i,i+1+k,x]); })); return out; };
  const clashTxt=legs=>clashPairsAud(legs).map(([i,j,x])=>`${legs[i].name} ${legs[i].label} with ${legs[j].name} ${legs[j].label} (${x})`).join('; ');
  /* a parlay that can be made: no line twice, one side (to win or to cover) and one total a game, one leg a player, and
     (app v121) no pair DraftKings will not take on one slip (clashAud) */
  const fitsAud=(cur,c)=>{ const isG=F('isGameLeg'); if(cur.some(l=>l.key===c.key)) return false;
    if(cur.some(l=>clashAud(l,c))) return false;
    if(isG(c)) return !cur.some(l=>isG(l)&&l.gid===c.gid&&(l.stat==='total')===(c.stat==='total'));
    return !cur.some(l=>!isG(l)&&l.pid===c.pid); };
  /* (app v121) whether a list of legs makes any parlay of n that can be made (fitsAud): since a pair DraftKings will not take
     can rule a size out, the count of players, sides and totals (a level's "the lines make n legs") is no longer the same
     as a parlay of n. true, false, or null where the search ran past its bound */
  const existsAud=(list,n,cap=200000)=>{ let seen=0, hit=false;
    const rec=(i0,cur)=>{ if(hit||seen>cap) return; if(cur.length===n){ hit=true; return; }
      for(let i=i0;i<list.length&&!hit;i++){ seen++; if(!fitsAud(cur,list[i])) continue; cur.push(list[i]); rec(i+1,cur); cur.pop(); } };
    rec(0,[]); return hit?true:seen>cap?null:false; };
  /* (app v121) the Sunday slot's rule, the audit's own copy (never the page's spSlotBetter or spSlotBuild): each level of
     the slot is the best of its games' own levels of that size: a parlay before none; one with no game total before one
     with one; one that meets its floor before the likeliest of its size; the fewer thin legs; then the better expected
     return (chance times price) where it met a floor, else the higher chance (Safe's, and a likeliest one's); and on a
     tie the earlier game of the slot. levels: each game's own level, in the slot's order (null or empty where it has none) */
  const slotKeyAud=(r,floor)=>[r.mkt?1:0,floor&&r.likeliest?1:0,r.thin||0];
  const slotBetterAud=(a,b,floor)=>{ const ka=slotKeyAud(a,floor), kb=slotKeyAud(b,floor);
    for(let i=0;i<ka.length;i++) if(ka[i]!==kb[i]) return ka[i]<kb[i];
    const v=r=>floor&&!r.likeliest?r.corr*r.dec:r.corr; return v(a)>v(b); };
  const slotBestAud=(levels,floor)=>{ let best=null; for(const r of levels) if(r&&r.legs&&r.legs.length&&(!best||slotBetterAud(r,best,floor))) best=r; return best; };
  /* the most legs of a list one parlay can hold by their count alone: one a player, and one side (to win or to cover) and
     one total a game; the audit's own count, never the page's pbMaxLegs */
  const maxAud=list=>{ const isG=F('isGameLeg'), pl=new Set(), gs=new Set(); for(const l of list||[]){ if(isG(l)) gs.add(l.gid+(l.stat==='total'?'|t':'|s')); else pl.add(l.pid); } return pl.size+gs.size; };
  /* (app v121, the review's round) the most legs of a list one parlay can take with no pair DraftKings will not take on one
     slip: the audit's own copy of the page's pbMaxFit, worked from the legs alone and never by it. A pair (clashAud) needs a
     player's passing touchdowns, so a player with another line takes that one; a player every one of whose legs is his
     passing touchdowns clashes with a teammate every one of whose legs is his anytime touchdown and, where none of his is
     an under, with the game's total. Those two kinds never clash among themselves, so the most a game keeps is its
     players, its side and its total less the most clashes that can be had at once with no leg in two (a maximum matching,
     by König's theorem). A level's totals fill (pbTotalsFill: as many totals as the legs with an edge, counted so, leave to
     fill) and the words of a level a game makes in number but not on one slip stand on it. It is what can really be had
     together (M16 holds it to existsAud, the audit's own enumeration, on its cases and its made-up games) but where a club
     has two players priced on passing touchdowns, one with an under and the other with an over and an anytime touchdown
     beside the total, which no club is (DraftKings prices one quarterback a club's passing touchdowns); where the audit
     asks whether a level can be made at all it asks the enumeration too */
  const fitAud=list=>{ const isG=F('isGameLeg'), games=new Map(); let all=0;
    for(const l of list||[]){ const G=games.get(l.gid)||{pl:new Map(),side:0,tot:0}; games.set(l.gid,G);
      if(isG(l)){ if(l.stat==='total') G.tot=1; else G.side=1; } else G.pl.set(l.pid,[...(G.pl.get(l.pid)||[]),l]); }
    for(const G of games.values()){ const P=[...G.pl.entries()];
      const qs=P.filter(([,ls])=>ls.every(l=>l.stat==='passing_tds')), os=P.filter(([,ls])=>ls.every(l=>l.stat==='any_td'));
      /* each such quarterback's clashes: his teammates' touchdowns, and the total unless he has an under */
      const nb=qs.map(([pid,ls])=>{ const r=os.filter(([o,ol])=>o!==pid&&ol[0].team===ls[0].team).map(([o])=>'p:'+o); if(G.tot&&ls.every(l=>l.side!=='under')) r.push('total'); return r; });
      const owner=new Map(), tryQ=(i,used)=>nb[i].some(v=>{ if(used.has(v)) return false; used.add(v);
        if(!owner.has(v)||tryQ(owner.get(v),used)){ owner.set(v,i); return true; } return false; });
      let matched=0; for(let i=0;i<qs.length;i++) if(tryQ(i,new Set())) matched++;
      all+=P.length+G.side+G.tot-matched; }
    return all; };
  /* (app v121, the review's round) why a level a game's legs make in number has no parlay that goes on one slip: since app
     v130 the reason alone, with no clause after it spelling out DraftKings' rule (CLASH_WHY_AUD went) */
  /* a game's day in US Eastern */
  const dayAud=g=>{ const k=kickAud(g); return k==null?null:new Date(k).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short'}); };
  /* (app v125) why a unit (a night game, or the Sunday slot: slot true) has no player line, as the rule words it: when
     DraftKings' lines for its games were last read from ESPN (lastReadAud: the published read or a press), or that
     they have not been; no paid-pull timing. The audit's own copy of the page's spNoPl */
  /* (app v130) the state alone, a night game's and the slot's alike: "no player lines yet (read Tue 8:07 AM ET)." */
  const spNoPlAud=(G,slot)=>{ const t=lastReadAud(G.map(g=>g.id));
    return t?`no player lines yet (read ${etAud(t)}).`:'player lines not read yet.'; };
  const SP_NO_ID='no player leg with a DraftKings id.';
  /* why a level of one game is empty, as the rule words it: too few legs, and why there are no player legs; (app v121, the
     review's round) with player legs and legs enough in number (maxAud), none that go together on one slip (fitAud). Each
     list cut as the set's search cuts it (SP_SEARCH) */
  const spWhyAud=(g,n,q)=>{ const isG=F('isGameLeg'), cap=w.eval('SP_SEARCH').cap, cut=[...capAud(q.pref,cap),...capAud(q.thin,cap),...capAud(q.mkt,cap)], m=maxAud(cut);
    const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in this game${q.noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in this game`;
    const pl=F('pricedLegs')([g]).filter(l=>!isG(l));
    if(!pl.some(dkOk)) return `${what}: `+(pl.length?SP_NO_ID:spNoPlAud([g],false));
    if(m>=n&&fitAud(cut)<n) return `No ${n} of this game’s legs go together on DraftKings’ slip.`;
    return `${what}.`; };
  /* (app v118) why a level of the Sunday slot is empty, as the rule words it: the slot's own words for too few legs, and
     (app v125) when its games' lines were last read from ESPN. (app v121) A parlay of the slot
     is one game's legs, so "too few" is of any one game: the most legs any one of its games makes (each cut as a night
     game's set is, SP_SEARCH), worked from the audit's own reading of each game (qualAud), and "that DraftKings' betslip
     can take" where any one game left legs out for want of an id; and (the review's round) with player legs and some game
     making legs enough in number, where none makes that many that go together on one slip (fitAud), that */
  const spWhySlotAud=(G,n)=>{ const isG=F('isGameLeg'), cap=w.eval('SP_SEARCH').cap; let m=0, f=0, noId=false;
    for(const x of G){ const q=qualAud([x],ALL_U), cut=[...capAud(q.pref,cap),...capAud(q.thin,cap),...capAud(q.mkt,cap)]; m=Math.max(m,maxAud(cut)); f=Math.max(f,fitAud(cut)); if(q.noId) noId=true; }
    const what=m<n?`${m?`Only ${m} leg${m===1?'':'s'}`:'No legs'} in any one game of the Sunday slot${noId?' that DraftKings’ betslip can take':''}`:`No ${n}-leg parlay in any one game of the Sunday slot`;
    const pl=F('pricedLegs')(G).filter(l=>!isG(l));
    if(!pl.some(dkOk)) return `${what}: `+(pl.length?SP_NO_ID:spNoPlAud(G,true));
    if(m>=n&&f<n) return `No ${n} legs of any one game of the Sunday slot go together on DraftKings’ slip.`;
    return `${what}.`; };
  /* every cache a suggestion stands on dropped (a check that changes the data under the same signature) */
  const dropCaches=()=>w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}');
  /* a leg's own Add: that leg's key, number and side, named for it, pressed while it is in the builder */
  const legAddOk=(b,l)=>{ if(!b) return false; const on=!!S.parlay[l.key]&&S.parlay[l.key].k===l.k&&S.parlay[l.key].side===l.side&&!!S.parlay[l.key].main===!!l.main;
    return b.tagName==='BUTTON'&&b.dataset.pbLeg===l.key&&b.dataset.k===String(l.k)&&b.dataset.side===l.side&&b.dataset.main===(l.main?'1':'0')&&b.getAttribute('aria-pressed')===String(on)
      &&b.getAttribute('aria-label')===`${on?'Remove':'Add'} ${l.name}, ${l.label}, ${on?'from':'to'} the builder`&&b.textContent===(on?'Added':'Add'); };
  /* the lock's own key in this browser, as the audit found it, put back at the end (rule (c)) */
  const SPK='props_sp_lock_v1', spKey0=(()=>{ try{ return w.localStorage.getItem(SPK); }catch(e){ return null; } })();
  const spKeyGet=()=>{ try{ return JSON.parse(w.localStorage.getItem(SPK)||'null'); }catch(e){ return 'junk'; } };
  const spKeyClear=()=>{ w.eval('SP_KEEP=null'); try{ w.localStorage.removeItem(SPK); }catch(e){} };
  /* ---- M. the suggestions: the Parlay Builder's Top 50 lines on what the reader ticks, Suggest
     Parlays' sets on each prime-time game, and the level engine both stand on ----
     Since app v111 (the owner's calls of 16 October 2026) the Parlay Builder tab is its controls (Bet
     amount, Refresh odds, Build from, the bet types, the games), the Top 50 lines on them, and the builder
     with a Refresh odds of its own; the four levels over every game, their locks, New legs and Reset are
     gone, and nothing of them may be left anywhere on the page. The levels are now each prime-time game's
     own (Suggested Parlays, holdSets): built from that game's lines alone on every bet type, whatever the
     boxes say, and held to the same rules as the levels always were. The engine (getPbTiers on the ticks)
     is still held below, as the sets are built by it. For the engine and each set:
     Held to its rules whatever the week offers: every tier has exactly its legs or says why; every
     leg is of a ticked kind and game, has not kicked off, carries a real price and is never rated
     below the book; one leg a line, a player and (for a game bet) a game; a tier's chance and price
     are the builder's own sums; thin legs only where the preferred legs could not fill the tier;
     and a pick that leaves fewer legs than a tier needs gets the reason, not a smaller parlay; and
     a game total (priced at the book's own chance, it has no edge) is in a tier only as the last
     fill, a market leg marked so, where the same level from the legs with an edge is empty, with
     one line saying so whenever Game total is ticked; and (app v109) wherever the payload carries
     DraftKings' ids, every leg a tier may take or holds has DraftKings' id at its own line, by the
     audit's own rule (dkOk), so it goes on DraftKings' betslip; and (app v121) no tier holds a pair
     DraftKings will not take on one slip, by the audit's own copy of the rule (clashAud), blocking, and
     one is empty only where no parlay of its size can be made of the legs (existsAud, which honours it).
     Run on the week as it is, and again on
     made-up lines (each starter's main line set off his own projection, a price on every total: -105/-115
     on half, +100/+100 with no margin and +110/+105 with less than none on the rest, and a made-up id
     table giving every priced line its id, as the pull reads one with each price) so the player legs and
     the totals are always tried. M9 holds the id rule itself, on made-up games with ids for some legs. */
  /* (app v118) the page's own half-minute look (pbWatch) is stopped from here: the sections below move the page's clock and
     plant the record as they go, and call the look (pbWatchTick) themselves where they hold it; a look on the real clock in
     between (it reads the record again for any unit at or past its lock it had not seen there) would read the stub's
     record over a planted one, at a moment that turns on how fast the run is */
  try{ w.eval('if(typeof pbWatch==="function"&&pbWatch.on){ clearInterval(pbWatch.on); }'); }catch(e){}
  /* the Top lines' check (holdTop, below), for the checks after M that hold the list too (M8 after its press, M14) */
  let holdTopF=null;
  { const tab=d.getElementById('tab-parlay'), panel=d.getElementById('pbPanel'), stab=d.getElementById('tab-suggest');
    d.querySelector('#tabs button[data-tab="parlay"]').click();
    /* (app v116, the owner, 18 October 2026: "that 5 leg parlay section can we move it up to the top of the page?") the
       builder first on its tab, the controls and the Top lines under it */
    chk(!!panel&&tab.firstElementChild===d.getElementById('parlayBody')&&d.getElementById('parlayBody').nextElementSibling===panel&&tab.children.length===2,'the builder is not at the top of the Parlay Builder tab, with its controls and Top lines under it and nothing else');
    /* Suggested Parlays: its own section and tab, after Games (the prop model's Props) and before the Parlay Builder */
    { const tb=[...d.querySelectorAll('#tabs button[data-tab]')].map(b=>b.dataset.tab), si=tb.indexOf('suggest');
      chk(!!stab&&!!d.getElementById('spPanel')&&stab.contains(d.getElementById('spPanel'))&&si>0&&tb[si-1]==='slate'&&tb[si+1]==='parlay'&&d.querySelector('#tabs button[data-tab="suggest"]').textContent==='Suggested Parlays',
        `Suggested Parlays is not a tab of its own (#tab-suggest, #spPanel), so named, between Games and the Parlay Builder: ${tb.join(', ')} (its button reads "${(d.querySelector('#tabs button[data-tab="suggest"]')||{}).textContent}")`);
      /* (app v112, the owner's call of 17 October 2026: "tab name suggest parlay should be Suggested Parlays") its
         heading too, and nothing a visitor reads names it by the old name */
      { F('renderSp')(); const h=d.querySelector('#spHead h2');
        const vis=d.body.cloneNode(true); vis.querySelectorAll('script,style').forEach(x=>x.remove());
        W.wording(!!h&&h.textContent==='Suggested Parlays'&&!/Suggest Parlays/.test(vis.textContent),`the tab's heading reads "${h?h.textContent:''}", or the page still names it by its old name, Suggest Parlays`); } }
    chk(!d.getElementById('suggModal')&&!d.getElementById('suggOpen')&&!d.getElementById('suggView')&&!/data-suggest-side|data-suggest-save|suggStake/.test(d.body.innerHTML),'the old Suggested parlays window or its switch is still in the page');
    /* the levels' locks, New legs and Reset (app v95) are gone, and nothing of them is left: no control on
       the page, and none of their state or functions (the owner's call, 16 October 2026) */
    { const left=['PB_VIEW','pbLocked','pbShownTier','pbTurn','pbFill','pbViewOf','pbWho','pbReset'].filter(n=>w.eval(`typeof ${n}`)!=='undefined');
      chk(!d.querySelector('[data-pb-lock],[data-pb-turn],[data-pb-reset]')&&!left.length&&!/data-pb-(lock|turn|reset)/.test(d.body.innerHTML),`the levels' locks, New legs or Reset are still in the page: ${left.join(', ')||'a control'}`); }
    /* the four levels over every game (#pbPanel's cards) and the all-games record under them are gone */
    chk(!d.querySelector('#pbPanel .pb-tier,#pbPanel [data-pb-add],#pbRec,#pbPanel #pbElo'),'the Parlay Builder still draws a level, Add to builder, the all-games record or the Elo picks');
    /* (the ticks, and the Top 50 lines' check, are defined for both branches below: M12 holds the list on made-up
       games whether or not the week has a game to come) */
    const U=()=>S.ui.pb, mlP=F('mlProb'), isG=F('isGameLeg'), pp=F('parlayProb'), pd=F('parlayDec');
    const SPEC=w.eval('PB_TIERS');
    const KINDS=['ml','ats','total','over','under'], kindOf=F('pbKind');
    const setKinds=ks=>{ for(const k of KINDS) U().k[k]=ks.includes(k); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()'); };
    /* the Top 50 lines (app v111), on the ticks as they stand: the page's list (getPbTop, and the list
       drawn under the controls) is exactly the audit's own (topAud: every qualifying leg, totals at the
       book's own chance with Game total ticked; since app v112 the preferred legs, the Value picks, before
       the other lines, the thin-edge legs and then the totals, each part ranked by expected profit on $1,
       best first, each bet once, at most TOP_N_AUD: 50 since app v113), each row in its group (data-pb-grp: value or other), drawn in two
       parts under their headings (Value picks, then Other lines, each with its count, the ranks running on
       across both: the second list starts where the first ends), with no Value pick a line saying so where
       the first part would be, a Value pick marked Value and no other row marked at all (thin edge and no
       edge are gone: the owner's call of 17 October 2026, "reverse tags"), and each row draws its leg, its
       price (est. where it is priced from DraftKings' line read by Refresh odds), the model's chance, the
       book's fair chance (FAIRAUD's), what $1 wins and what $1 is expected to make, and an Add of its own on
       that leg. Since app v112's second round, also on their own: no row is a ladder rung whose same bet, the
       player's half-point main Over, is among the qualifying preferred or thin legs (sameBetAud); each such
       main line is on the list exactly where its rank in the order without those rungs earns it; the slots the
       rungs leave go to the next lines (the list is still the first TOP_N_AUD of that order, never short of it); and
       every game total ranks after every thin-edge line, whatever each is expected to make. Blocking: every
       number, which legs, which part each is drawn in and its rank; W.wording the notes, the headings' words
       and the marks */
    const pc0=v=>(v*100).toFixed(0)+'%', m1=v=>(v<-0.0005?'−':'+')+'$'+Math.abs(v).toFixed(2), nrz=(a,b)=>a!=null&&b!=null&&Math.abs(a-b)<1e-9;
    let topRows=0, topLists=0, topOther=0, topNoValue=0, topSame=0, topSameCut=0, topTotAfter=0;
    const holdTop=(lab)=>{
      const u=U(), all=F('pbGames')(), games=all.filter(g=>!u.off.includes(g.id)), kinds=KINDS.filter(k=>u.k[k]);
      w.eval('PB_TOP_CACHE=new Map()'); const r=F('getPbTop')(), T=games.length&&kinds.length?topFullAud(games,u):{q:{pref:[],thin:[],mkt:[]},same:()=>null,dropped:[],full:[],rows:[]}, want=T.rows;
      topLists++; topRows+=want.length; topOther+=want.filter(x=>x.grp==='other').length; if(want.length&&!want.some(x=>x.grp==='value')) topNoValue++;
      { const at=r.rows.findIndex((x,i)=>!want[i]||legIdAud(x)!==legIdAud(want[i].l));
        chk(r.rows.length<=TOP_N_AUD&&r.rows.length===want.length&&at<0,
        `${lab}: the Top 30 lines are not the qualifying legs, the Value picks first, then the thin-edge lines, then the totals, each part ranked by expected profit on $1, each bet once: ${r.rows.length} rows where the rule gives ${want.length}${at>=0?`, row ${at+1} ${r.rows[at].name} ${r.rows[at].label} where the rule has ${want[at]?want[at].l.name+' '+want[at].l.label:'none'}`:''}`); }
      /* each bet once (app v112): no rung on the list whose same bet, the player's half-point main Over, qualifies */
      { const dup=r.rows.filter(x=>T.same(x));
        chk(!dup.length,`${lab}: the Top 30 lines list a ladder rung beside the same bet, the player's main Over on the half point: ${dup.slice(0,4).map(x=>{ const m=T.same(x); return `${x.name} ${x.label} (the same bet as ${m.label})`; }).join('; ')}`); }
      /* each main line a rung was left out for: on the list exactly where its rank earns it (its place in the order
         without those rungs), and off it only past the last place the list holds (TOP_N_AUD, the 50th); and the rungs' slots gone to the next lines */
      { const pos=new Map(T.full.map((x,i)=>[legIdAud(x.l),i])), seen=new Set(), bad=[];
        for(const {rung,main} of T.dropped){ const id=legIdAud(main); if(seen.has(id)) continue; seen.add(id); topSame++;
          const i=pos.has(id)?pos.get(id):-1, at=r.rows.findIndex(x=>legIdAud(x)===id);
          if(i>=TOP_N_AUD) topSameCut++;
          if(i<0||(i<TOP_N_AUD?at!==i:at>=0)) bad.push(`${main.name} ${main.label} (for ${rung.label}) ranks ${i<0?'nowhere':i+1} by the rule and is ${at<0?'not on the list':'row '+(at+1)}`); }
        chk(!bad.length,`${lab}: a main line a ladder rung was left out for is not on the Top 30 lines where its rank earns it: ${bad.slice(0,4).join('; ')}`);
        chk(r.rows.length===Math.min(TOP_N_AUD,T.full.length)&&r.rows.every((x,i)=>!!T.full[i]&&legIdAud(x)===legIdAud(T.full[i].l)),
          `${lab}: with ${T.dropped.length} ladder rung${T.dropped.length===1?'':'s'} left out as the same bet as a main line, the Top 30 lines are not the first ${Math.min(TOP_N_AUD,T.full.length)} of the order without them (${r.rows.length} rows of ${T.full.length}): their slots did not go to the next lines`);
        chk((r.same||0)===T.dropped.length,`${lab}: the Top 30 lines count ${r.same} ladder rungs left out as the same bet as a main line, where the rule leaves out ${T.dropped.length}`); }
      /* the totals after every thin-edge line, and the thin-edge lines after every Value pick, each row read by the
         audit's own pool (qualAud), never the page's marks */
      { const pm=new Map([...T.q.mkt.map(l=>[legIdAud(l),2]),...T.q.thin.map(l=>[legIdAud(l),1]),...T.q.pref.map(l=>[legIdAud(l),0])]), part=x=>{ const p=pm.get(legIdAud(x)); return p==null?-1:p; };
        const ps=r.rows.map(part), at=ps.findIndex((p,i)=>p<0||(i>0&&p<ps[i-1]));
        if(ps.includes(1)&&ps.includes(2)) topTotAfter++;
        chk(at<0,`${lab}: Top 30 row ${at+1} (${at>=0?r.rows[at].name+' '+r.rows[at].label:''}) is ${at>=0&&ps[at]<0?'no qualifying leg':`a ${['Value pick','thin-edge line','game total'][ps[at]]} after a ${['Value pick','thin-edge line','game total'][ps[at-1]]}`}: the Value picks come first, then the thin-edge lines, then every game total`); }
      chk(r.rows.every((x,i)=>!want[i]||(nrz(x.dec,want[i].dec)&&nrz(x.win,want[i].win)&&nrz(x.ev,want[i].ev)&&x.p===want[i].l.p&&x.price===want[i].l.price&&!!x.market===!!want[i].l.market&&!!x.thin===!!want[i].l.thin)),
        `${lab}: a Top 30 row's price, chance, what $1 wins or is expected to make, or its mark is not its leg's own`);
      chk(r.rows.every(x=>{ const g=all.find(y=>y.id===x.gid); return !FAIRAUD.isFar(x)&&dkTopOk(x)&&(x.grp==='TEAM'||F('suggestable')(x.pid))&&!!g&&!F('gameStarted')(g)&&!u.off.includes(x.gid)&&!!u.k[kindAud(x)]; }),`${lab}: a Top 30 line is far off the market, has no DraftKings id at its line (and is no player's line from a Refresh odds read the list keeps), is on a player who may not play, on a game under way or not ticked, or of a bet type not ticked`);
      chk(r.rows.every(x=>{ const f=FAIRAUD.fairOf(x); return f?(!!x.fc&&nrz(x.fc.p,f.p)&&x.fc.est===f.est):!x.fc; }),`${lab}: a Top 30 row's fair chance is not the book's by the rule`);
      F('renderPb')();
      const P=d.getElementById('pbPanel'), li=[...P.querySelectorAll('ol.pb-top > li.pb-trow')], fm=F('fmtML');
      if(!want.length) W.wording(!li.length&&!!P.querySelector('.pb-top-none')&&P.querySelector('.pb-top-none').textContent.length>10,`${lab}: with no line qualifying the list does not say why`);
      chk(li.length===want.length&&li.length<=TOP_N_AUD,`${lab}: the Top ${TOP_N_AUD} drawn has ${li.length} rows where ${want.length} qualify (at most ${TOP_N_AUD})`);
      /* (app v113) the heading states the list's length: Top 50 lines (a number the page states: blocking) */
      { const h2=P.querySelector('.pb-hd h2'); chk(!want.length||(!!h2&&h2.textContent===`Top ${TOP_N_AUD} lines`),`${lab}: the list is headed "${h2?h2.textContent:''}", not "Top ${TOP_N_AUD} lines"`); }
      /* the groups: no other line ranks over a Value pick, each row says its group, and the two parts are drawn
         under their headings, each holding exactly its rows, with its count, the second list starting where the
         first ends (app v112) */
      { const ix=want.findIndex(x=>x.grp==='other'), nV=ix<0?want.length:ix, nO=want.length-nV;
        chk(ix<0||want.slice(ix).every(x=>x.grp==='other'),`${lab}: the audit's own Top 30 mixes its groups`);
        chk(li.every((row,i)=>!want[i]||row.dataset.pbGrp===want[i].grp),`${lab}: a Top 30 row does not say its group (value, or other): ${li.map(x=>x.dataset.pbGrp).join(',').slice(0,120)} where the rule gives ${want.map(x=>x.grp).join(',').slice(0,120)}`);
        const hs=[...P.querySelectorAll('h3.pb-topsec')], ols=[...P.querySelectorAll('ol.pb-top')], hV=P.querySelector('h3.pb-topsec[data-pb-sec="value"]'), hO=P.querySelector('h3.pb-topsec[data-pb-sec="other"]');
        const oV=P.querySelector('ol.pb-top[data-pb-sec="value"]'), oO=P.querySelector('ol.pb-top[data-pb-sec="other"]'), pill=h=>{ const x=h&&h.querySelector('.pill'); return x?x.textContent:null; };
        const rowsOf=o=>o?[...o.querySelectorAll(':scope > li.pb-trow')].map(x=>+x.dataset.pbRow):[], seq=(a,n)=>Array.from({length:n},(_,i)=>a+i);
        const before=(a,b)=>!!a&&!!b&&!!(a.compareDocumentPosition(b)&w.Node.DOCUMENT_POSITION_FOLLOWING);
        if(!want.length) chk(!hs.length&&!ols.length,`${lab}: with no line qualifying, the list still draws a part (${hs.length} headings, ${ols.length} lists)`);
        else chk(hs.length===(nO?2:1)&&ols.length===(nV?1:0)+(nO?1:0)&&!!hV&&pill(hV)===(nV?String(nV):null)
            &&(nV?!!oV&&!oV.hasAttribute('start')&&JSON.stringify(rowsOf(oV))===JSON.stringify(seq(1,nV))&&before(hV,oV):!oV&&!P.querySelector('ol.pb-top[data-pb-sec="value"] li'))
            &&(nO?!!hO&&pill(hO)===String(nO)&&!!oO&&(nV?oO.getAttribute('start')===String(nV+1):!oO.hasAttribute('start'))&&JSON.stringify(rowsOf(oO))===JSON.stringify(seq(nV+1,nO))&&before(hO,oO)&&before(hV,hO)&&(!oV||before(oV,hO)):!hO&&!oO),
          `${lab}: the Top 30 lines are not drawn in their two parts, the ${nV} Value picks under "Value picks" (with their count) and then the ${nO} other lines under "Other lines" (with theirs, the list starting at ${nV+1}): headings ${hs.map(h=>h.dataset.pbSec+':'+pill(h)).join(',')}, lists ${ols.map(o=>o.dataset.pbSec+'@'+(o.getAttribute('start')||'-')+':'+rowsOf(o).length).join(',')}`);
        if(want.length){
          const hd=h=>h&&h.firstChild?h.firstChild.textContent.trim():'';
          W.wording(hd(hV)==='Value picks'&&(!hO||hd(hO)==='Other lines'),`${lab}: the Top 30's parts are not headed Value picks and Other lines: ${hs.map(h=>h.textContent).join(' / ')}`);
          const nv=P.querySelector('[data-pb-novalue]');
          W.wording(nV?!nv:(!!nv&&nv.textContent.replace(/\s+/g,' ').trim()==='No line on your picks is a Value pick right now.'),`${lab}: ${nV?'with Value picks on the list, it still says there are none':'with no Value pick on the list, it does not say so under the Value picks heading'}: "${nv?nv.textContent:''}"`);
          /* each part's line under its heading (app v112 to v129: what a Value pick is, and what the other lines miss);
             since app v130 (the owner's call of 22 October 2026: no descriptions) none, the Value picks' list straight
             under its heading and the other lines' under theirs */
          const sub=h=>{ const x=h&&h.nextElementSibling; return x&&x.classList.contains('pb-topsub')?x.textContent.replace(/\s+/g,' ').trim():null; };
          if(nV) W.wording(sub(hV)===null,`${lab}: a line under "Value picks" reads "${sub(hV)}"`);
          if(nO) W.wording(sub(hO)===null,`${lab}: a line under "Other lines" reads "${sub(hO)}"`);
          W.wording(!/The model rates each at least 3 points above|These miss a Value pick’s bar|A suggested parlay takes them only where/.test(P.textContent),`${lab}: the Top 30 still says what a Value pick is or what the other lines miss`); } }
      want.forEach(({l,dec,win,ev},i)=>{ const row=li[i]; if(!row) return; const q=s=>row.querySelector(s), f=FAIRAUD.fairOf(l), tx=row.textContent.replace(/\s+/g,' ');
        const priceTx=q('.pb-tc b')?q('.pb-tc b').textContent:'';
        chk(row.dataset.pbRow===String(i+1)&&(q('.pb-trk')||{}).textContent===String(i+1)&&tx.includes(l.name)&&tx.includes(l.label)
          &&priceTx===fm(l.price)+(l.src==='dkline'?' est.':'')&&!!q(`[data-pb-model="${l.p}"]`)&&q(`[data-pb-model="${l.p}"]`).textContent===pc0(l.p)
          &&(f?(!!q('[data-pb-fair]')&&nrz(+q('[data-pb-fair]').dataset.pbFair,f.p)&&q('[data-pb-fair]').textContent===pc0(f.p)):!q('[data-pb-fair]'))
          &&nrz(+(q('[data-pb-win]')||{dataset:{}}).dataset.pbWin,win)&&(q('[data-pb-win]')||{}).textContent===m1(win)
          &&nrz(+(q('[data-pb-ev]')||{dataset:{}}).dataset.pbEv,ev)&&(q('[data-pb-ev]')||{}).textContent===m1(ev),
          `${lab}: Top 30 row ${i+1} does not draw ${l.name} ${l.label} at ${fm(l.price)}${l.src==='dkline'?' est.':''}, model ${pc0(l.p)}, fair ${f?pc0(f.p):'none'}, ${m1(win)} won and ${m1(ev)} expected on $1: "${tx.slice(0,200)}"`);
        /* (app v114) the matchup bubble a leg's name opens is the hub's (nflbets/build/glance.js), not this page's: here the
           name is the row's own plain text, as before, and no row carries the bubble's button */
        { const nm=q('.nm'), own=nm?[...nm.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim():'';
          chk(own===l.name&&!row.querySelector('[data-glance], button.glance-name'),`${lab}: Top 30 row ${i+1}'s name is not its own plain text on the prop model's page, or the row carries the hub's matchup bubble: "${nm?nm.innerHTML.slice(0,120):''}"`); }
        { const vm=[...row.querySelectorAll('.pb-valmark')], val=want[i].grp==='value';
          W.wording((val?vm.length===1&&vm[0].textContent==='Value':!vm.length)&&!row.querySelector('.pb-thinmark')&&!/thin edge|no edge/i.test(tx)&&(!f||/fair/.test(tx)),`${lab}: Top 30 row ${i+1} (${l.name} ${l.label}) is not marked ${val?'Value, and that alone':'with no mark at all'}: "${tx.slice(0,160)}"`); }
        chk(legAddOk(q('[data-pb-leg]'),l),`${lab}: Top 30 row ${i+1} has no Add of its own on ${l.name} ${l.label}, named for it and pressed only while it is in the builder: ${q('[data-pb-leg]')?q('[data-pb-leg]').outerHTML.slice(0,240):'none'}`);
        /* (app v119) no row carries the line app v115 drew on a missing DraftKings id: no row lacks one (dkTopOk, above) */
        chk(!row.querySelector('[data-pb-slip], .pb-tslip'),`${lab}: Top 30 row ${i+1} (${l.name} ${l.label}, ${l.src}) carries a line on a missing DraftKings id, which app v119 took off`); });
      /* (app v112 to v129) a note said a game total is never a Value pick wherever Game total was ticked, and a lead over
         the choices and a foot under the list said the order, the bar and (app v127) that no ladder bet is listed;
         since app v130 (the owner's call of 22 October 2026: no descriptions) none of them is drawn, ticked or not */
      { const tx=P.textContent.replace(/\s+/g,' ');
        W.wording(!tx.includes('Game totals are never Value picks'),`${lab}: ${u.k.total?'Game total is ticked':'Game total is not ticked'} and the list still says a total is never a Value pick`);
        W.wording(!/thin edge|no edge|thin-edge/i.test(tx),`${lab}: the Parlay Builder still speaks of a thin edge or no edge, the tags app v112 took off`);
        W.wording(!P.querySelector('.pb-lead,.pb-foot')&&!/Choose what to build from|Every line has DraftKings’ own price|The Value picks come first|lines at most|no ladder bets, such as|Each bet is listed once|yards ladders/.test(tx),
          `${lab}: the list still draws its lead or its foot: "${((P.querySelector('.pb-lead,.pb-foot')||{}).textContent||'').slice(0,200)}"`); }
      return {r,want}; };
    holdTopF=holdTop;
    if(!F('pbGames')().length){ chk(/^(Regular season over\.|No week \d+ games left\.)$/.test((panel.querySelector('.pb-none')||{}).textContent||''),'with no game to come the panel does not say so'); console.log('M. suggested parlays: no game to come, and the panel says so'); }
    else {
    chk(!!d.getElementById('pbCard')&&d.querySelectorAll('#pbPanel [data-pb-mix]').length===3&&d.querySelectorAll('#pbPanel [data-pb-kind]').length===5,'the panel has no mix switch (All, Teams only, Players only) or not its five bet types');
    chk(!d.querySelector('#pbPanel [data-pc-finish],#spPanel [data-pc-finish]'),'Finish is offered on the prop model\'s own page, which has no parlay card');
    let built=0, said=0, legsSeen=0, thinSeen=0, corrTiers=0, likeliestSeen=0, likeliestWorked=0, combosWorked=0;
    /* "the likeliest" worked out in full. Where no two legs that could share a parlay move together
       (different games, or a game's side and its total), every parlay's chance is a plain product and
       parlayProb works it exactly, so every parlay of the tier's size with its count of thin legs
       is worked, and none may land likelier than the tier. That holds whatever the legs are priced
       at, so a fallback chosen by any other measure (the best return under the floor, say) fails
       it on the week's own picks, not only on made-up ones. Bounded, so a long list never stalls
       the audit (the week's spreads alone make a few hundred) */
    const fitsF=F('pbFits'), orderF=F('pbOrder'), rhoF=F('legRho'), LIKELY_CAP=250000;
    const noMovers=list=>{ for(let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++)
      if(fitsF([list[i]],list[j])&&Math.abs(rhoF(list[i],list[j]))>=0.03) return false; return true; };
    const likeliestOf=(list,n,thin,mk)=>{ let best=-1, legs=null, seen=0;
      const rec=(i0,cur,th)=>{ if(seen>LIKELY_CAP) return;
        if(cur.length===n){ if(th!==thin) return; seen++; const pr=F('parlayProb')(orderF(cur)).corr; if(pr>best){ best=pr; legs=cur.slice(); } return; }
        for(let i=i0;i<list.length;i++){ const c=list[i], th2=th+((mk?c.market:c.thin)?1:0); if(th2>thin||!fitsF(cur,c)) continue; cur.push(c); rec(i+1,cur,th2); cur.pop(); } };
      rec(0,[],0); return seen>LIKELY_CAP||!legs?null:{best,legs,seen}; };
    /* a level's best return over its floor, searched on its own (the search a level tries first),
       and what a card's rule says it is: Safe the likeliest pair, a level over its floor its best
       return, a level that fell back the likeliest parlay of its size */
    const bestRet=w.eval("typeof pbBestReturn==='function'?pbBestReturn:null");
    chk(!!bestRet,'the page has no search for a level\'s best return over its floor on its own (pbBestReturn)');
    const maxLegsOf=maxAud, pbIdOf=l=>l.key+'|'+l.side+'|'+l.k;
    const ruleFor=t=>t.likeliest?`the likeliest ${t.n} legs`:t.floor?`${Math.round(t.floor*100)}%+ by the model`:'the likeliest pair';
    /* the reason a tier gives with no player line on the ticked games (app v125: no paid pull, so no pull timing):
       when DraftKings' lines for them were last read from ESPN (the published read or a press: lastReadAud, the
       audit's own), or that they have not been, worked here for the ticked games' ids */
    /* (app v109, dormant since app v125: only a payload whose bake wrote paid ids) the reason with player prices on file
       and none DraftKings' betslip can take */
    const NO_ID='No player lines with a DraftKings id.';
    /* a card's own words, beyond its legs: the rule beside its name says what the parlay is, and
       nothing else on it speaks of the floor (the owner wants the chance and the price, no note):
       no paragraph but the thin-edge line, and no word of a floor outside the rule and the legs */
    const cardWords=(c,t,lab)=>{ const rule=c.querySelector('.pb-rule'), rest=c.cloneNode(true);
      rest.querySelectorAll('.pb-legs,.pb-thin,.pb-rule').forEach(x=>x.remove());
      W.wording(!!rule&&rule.textContent===ruleFor(t),`${lab}: the ${t.id} card's rule reads "${rule?rule.textContent:''}", not "${ruleFor(t)}"`);
      /* whatever the rule's wording, a chance it states is a number on the page: blocking */
      { const m=rule&&/(\d+)%\+ by the model/.exec(rule.textContent);
        chk(!m||t.corr>=m[1]/100-1e-12,`${lab}: the ${t.id} card says it lands ${m&&m[1]}%+ by the model, and its chance is ${(t.corr*100).toFixed(1)}%`); }
      W.wording(![...c.querySelectorAll('p')].some(p=>!p.classList.contains('pb-thin'))&&!/floor|usual|below|short of|of the time|%\+(?!\d)/i.test(rest.textContent),
        `${lab}: the ${t.id} card carries a note beside its chance and price: "${rest.textContent.replace(/\s+/g,' ').trim().slice(0,160)}"`); };
    /* a card leads with its fair chance, labelled so (est. where it is), whose chance it was chosen on
       beside it ("model says 26%"); with no fair chance, that chance alone, saying why */
    const fairShown=(c,t,lab,by)=>{ const first=c.querySelector('.pb-nums')&&c.querySelector('.pb-nums').firstElementChild, q=s=>first&&first.querySelector(s);
      const b=q('b'), sp=q('span'), sm=q('small'), ch=by==='Elo'?t.p:t.corr, Fr=t.fair, pc=v=>(v*100).toFixed(0)+'%';
      if(Fr&&Fr.p!=null) chk(!!b&&b.textContent===pc(Fr.p)&&!!sp&&sp.textContent===(Fr.est?'fair chance, est.':'fair chance')&&!!sm&&sm.textContent===`${by} says ${pc(ch)}`,
        `${lab}: the ${t.id} card does not lead with its fair chance ${pc(Fr.p)}${Fr.est?' (est.)':''} beside "${by} says ${pc(ch)}": "${first?first.textContent:'no figures'}"`);
      else chk(!!b&&b.textContent===pc(ch)&&!!sm&&/^no fair chance$/.test(sm.textContent),`${lab}: the ${t.id} card has no fair chance and does not say so beside the model's: "${first?first.textContent:'no figures'}"`); };
    /* every rule a tier keeps, on the picks as they stand */
    const hold=(lab)=>{
      const r=F('getPbTiers')(), games=F('pbGames')(), u=U();
      chk(r.tiers.length===4&&r.tiers.map(t=>t.id+t.n).join()===SPEC.map(s=>s[0]+s[2]).join(),`${lab}: the tiers are not Safe, Medium, Aggressive and Extreme at 2, 3, 4 and 5 legs`);
      const pool=games.length&&KINDS.some(k=>u.k[k])&&games.some(g=>!u.off.includes(g.id))?F('pbPool')(games.filter(g=>!u.off.includes(g.id))):{pref:[],thin:[],mkt:[]};
      const mkt=pool.mkt||[], maxLegs=maxAud([...pool.pref,...pool.thin,...mkt]);
      /* the market list: only totals, only with Game total ticked, each on a ticked game at the
         market's own chance (totalLeg's) on a real price, 45-97%, never thin */
      chk(mkt.every(c=>c.stat==='total'&&c.market===true&&c.thin===false&&c.src==='real'&&c.p>=0.45&&c.p<0.97&&!u.off.includes(c.gid)
        &&Math.abs(c.p-F('totalLeg')(S.sched.find(g=>g.id===c.gid),c.side).p)<1e-12)&&(!!u.k.total||!mkt.length),`${lab}: the market list holds something other than a ticked game's total at the market's chance, or holds one with Game total unticked`);
      /* the pool itself, whichever legs a tier happens to take: nothing under the book, no estimated
         price, nothing of a kind or game not ticked, a preferred leg only over the full bar */
      chk([...pool.pref,...pool.thin].every(c=>c.p>=mlP(c.price)&&takenPrice(c)&&!!u.k[kindOf(c)]&&!u.off.includes(c.gid)),`${lab}: a leg under the book, on an estimated price (or one from DraftKings' line on ESPN that is not the rule's, or of a kind never suggested), or of a kind or game not ticked is among the legs a tier may take`);
      chk(pool.pref.every(c=>c.p-mlP(c.price)>=0.03&&F('formAgrees')(c)),`${lab}: a preferred leg does not clear the 3-point bar and market + form`);
      /* a game total is priced at the book's own chance, so it is never among the legs a tier may take */
      chk([...pool.pref,...pool.thin].every(c=>c.stat!=='total'),`${lab}: a game total is among the legs a tier may take`);
      /* (app v109) wherever the payload carries DraftKings' ids, every leg a tier may take, the totals
         among them, and every leg on a tier has DraftKings' id at its own line, by the rule worked here */
      { const noId=[...pool.pref,...pool.thin,...mkt,...r.tiers.flatMap(t=>t.legs||[])].filter(l=>!dkOk(l));
        chk(!noId.length,`${lab}: ${noId.length} legs a level may take or holds have no DraftKings id at their line, so DraftKings' betslip cannot take them: ${noId.slice(0,4).map(l=>`${l.name} ${l.label} (${l.src})`).join(', ')}`); }
      /* no player prices on file for the ticked games, with player bets ticked: the reason a tier
         is empty, said as such (and never "tick more" under Players only, where no tick helps); where
         the payload carries ids, a game counts as priced for players only with a player leg DraftKings'
         betslip can take, and with player prices and none of those the reason is the ids (noId) */
      const pooled=pool.plGames!=null, plOn=!!(u.k.over||u.k.under), tmOn=!!(u.k.ml||u.k.ats);
      const plPriced=F('pricedLegs')(games.filter(g=>!u.off.includes(g.id))).filter(l=>!isG(l));
      const noPl=pooled&&plOn&&!plPriced.some(dkOk), noId=noPl&&plPriced.length>0;
      W.wording(!pooled||!!r.noPlayerPrices===noPl,`${lab}: the tiers say there are${r.noPlayerPrices?'':' not'} no player prices on file, and that is not so`);
      for(const t of r.tiers){ const [,,n,floor]=SPEC.find(s=>s[0]===t.id);
        if(!t.legs){ said++;
          W.wording(typeof t.why==='string'&&t.why.length>10,`${lab}: the ${t.id} tier is empty and does not say why`);
          if(maxLegs<n) W.wording(/^(Only \d+ legs?|No legs|No games|No bet types|No player lines|Player lines not read)/.test(t.why),`${lab}: ${maxLegs} legs on the picks and the ${n}-leg tier does not say there are too few: ${t.why}`);
          /* every level shows a parlay whenever the picks make that many legs: empty only when they do not (app v121: or
             when no parlay of that many can be made of them, a pair DraftKings will not take ruling it out) */
          W.compose(fitAud([...pool.pref,...pool.thin,...mkt])<n||existsAud([...pool.pref,...pool.thin,...mkt],n)===false,`${lab}: the ${t.id} tier is empty though the picks make ${maxLegs} legs, enough for ${n}: ${t.why}`);
          W.wording(!/of the time or more|lands \d+%/.test(t.why),`${lab}: the empty ${t.id} tier speaks of its floor, which every level now falls back from: ${t.why}`);
          if(pooled) W.wording(/no player lines yet \(read |player lines not read yet/i.test(t.why)===(noPl&&!noId)&&/no player lines with a DraftKings id/i.test(t.why)===noId&&(!noPl||tmOn||(t.why===(noId?NO_ID:noPlAud(games.filter(g=>!u.off.includes(g.id)).map(g=>g.id)))&&!/tick more/.test(t.why))),
            `${lab}: the empty ${t.id} tier ${noPl?(noId?'does not say plainly that no player leg on file has a DraftKings id yet':'does not say plainly that no player prices are on file yet'):'says no player prices are on file, and some are'}: ${t.why}`);
          continue; }
        built++; legsSeen+=t.legs.length;
        W.compose(t.legs.length===n,`${lab}: the ${t.id} tier has ${t.legs.length} legs, not ${n}`);
        /* a total only as the last fill: every total a market leg, counted, and only where the same
           level built from the legs with an edge alone is empty */
        chk(t.legs.every(l=>(l.stat==='total')===!!l.market)&&(t.mkt||0)===t.legs.filter(l=>l.market).length,`${lab}: the ${t.id} tier has a total that is not a market leg, or miscounts them`);
        if(t.mkt) W.compose(F('pbTier')(SPEC.find(s=>s[0]===t.id),{pref:pool.pref,thin:pool.thin,mkt:[]},new Map())===null,`${lab}: the ${t.id} tier took a game total where the legs with an edge make a parlay of its size`);
        chk(maxLegs>=n,`${lab}: a ${n}-leg ${t.id} tier from picks that only make ${maxLegs}`);
        for(const l of t.legs){ const g=S.sched.find(x=>x.id===l.gid);
          chk(!!u.k[kindOf(l)]&&!u.off.includes(l.gid)&&games.some(x=>x.id===l.gid),`${lab}: ${l.name} ${l.label} is of a kind or a game not ticked, or its game is not on the list`);
          chk(!!g&&!F('gameStarted')(g),`${lab}: ${l.name} ${l.label} is on a game that has kicked off`);
          chk(takenPrice(l)&&isFinite(l.price)&&l.price!==0&&l.p>=0.45&&l.p<0.97,`${lab}: ${l.name} ${l.label} has no real price (nor the rule's own from DraftKings' line on ESPN, on a kind it may take), or a chance out of 45-97%`);
          if(l.market) chk(l.stat==='total'&&l.thin===false,`${lab}: ${l.name} ${l.label} is a market leg that is not a total, or is marked thin`);
          else { chk(l.p>=mlP(l.price),`${lab}: ${l.name} ${l.label} is rated below the book (${(l.p*100).toFixed(1)}% against ${(mlP(l.price)*100).toFixed(1)}%)`);
            chk(l.thin===!(l.p-mlP(l.price)>=0.03&&F('formAgrees')(l)),`${lab}: ${l.name} ${l.label} is marked thin wrongly`); }
          if(l.thin) thinSeen++; }
        chk(new Set(t.legs.map(l=>l.key)).size===n,`${lab}: the ${t.id} tier has one line twice (or both sides of one)`);
        const gl=t.legs.filter(isG), pl=t.legs.filter(l=>!isG(l));
        const sides=gl.filter(l=>l.stat!=='total'), tots=gl.filter(l=>l.stat==='total');
        chk(new Set(sides.map(l=>l.gid)).size===sides.length&&new Set(tots.map(l=>l.gid)).size===tots.length,`${lab}: the ${t.id} tier has two sides, or two totals, on one game`);
        chk(new Set(pl.map(l=>l.pid)).size===pl.length,`${lab}: the ${t.id} tier has two legs on one player`);
        /* (app v121) no pair DraftKings will not take on one slip, by the audit's own copy of the rule (clashAud) */
        chk(!clashPairsAud(t.legs).length,`${lab}: the ${t.id} tier holds a pair DraftKings will not take on one slip: ${clashTxt(t.legs)}`);
        /* the card's numbers are the builder's own sums on the legs as the builder orders them */
        const order=t.legs.map(l=>l.key).join(), want=[...t.legs].sort((a,b)=>(a.week-b.week)||String(a.name).localeCompare(String(b.name))).map(l=>l.key).join();
        chk(order===want,`${lab}: the ${t.id} tier's legs are not in the builder's order`);
        chk(pp(t.legs).corr===t.corr&&pd(t.legs.map(l=>({leg:l,ml:l.price})))===t.dec,`${lab}: the ${t.id} tier's chance or price is not what parlayProb and parlayDec say`);
        /* its fair chance is the builder's own sum on its legs at their fair chances (est. where one
           is), and no leg on it is one the model rates FAR_OFF or more above its fair chance */
        { const fs=t.legs.map(l=>F('legFair')(l)), FAR=w.eval('FAR_OFF');
          chk(fs.every(Boolean)?(!!t.fair&&t.fair.p===pp(t.legs.map((l,i)=>({...l,p:fs[i].p}))).corr&&t.fair.est===fs.some(f=>f.est)):(!!t.fair&&t.fair.p===null&&t.fair.miss===fs.filter(f=>!f).length),
            `${lab}: the ${t.id} tier's fair chance ${t.fair?t.fair.p:'(none)'} is not parlayProb on its legs at their fair chances`);
          chk(t.legs.every((l,i)=>!fs[i]||l.p-fs[i].p<FAR-1e-9),`${lab}: the ${t.id} tier has a leg the model rates ${FAR*100} points or more above its fair chance: ${t.legs.filter((l,i)=>fs[i]&&l.p-fs[i].p>=FAR-1e-9).map(l=>l.name+' '+l.label).join(', ')}`); }
        /* blocking: a level not marked the likeliest says on its card that it lands its floor by the model */
        if(floor&&!t.likeliest) chk(t.corr>=floor,`${lab}: the ${t.id} tier lands ${(t.corr*100).toFixed(1)}%, under its ${floor*100}% floor, and is not marked the likeliest of its size, so its card says "lands ${Math.round(floor*100)}%+" of a parlay that does not`);
        W.compose(t.thin===t.legs.filter(l=>l.thin).length,`${lab}: the ${t.id} tier miscounts its thin legs`);
        /* a level falls back to the likeliest parlay of its size only when no parlay of that size
           clears its floor at any count of thin legs (its best-return search finds none), never
           Safe; it prefers the fewest thin legs, as Safe does: as many as the preferred legs leave */
        /* a level with a total was built on every leg with an edge as its base and the totals as fill: (app v121, the
           review's round) as many as those legs leave to fill counted as one parlay can take them (fitAud), a quarterback's
           passing TDs and his teammate's touchdown the room of one leg */
        const from=t.mkt?{pref:[...pool.pref,...pool.thin],thin:mkt}:{pref:pool.pref,thin:pool.thin}, fill=t.mkt?t.mkt:t.thin, kTop=t.mkt?Math.max(0,n-fitAud(from.pref)):undefined;
        /* every level with totals takes exactly as many as the legs with an edge leave to fill */
        if(t.mkt) W.compose(t.mkt===kTop,`${lab}: the ${t.id} tier takes ${t.mkt} totals where the legs with an edge leave ${kTop} to fill`);
        if(t.likeliest){ likeliestSeen++;
          W.compose(!!floor,`${lab}: Safe is marked as a fallback to the likeliest pair`);
          W.compose(!!bestRet&&bestRet(SPEC.find(s=>s[0]===t.id),from,new Map(),kTop)===null,`${lab}: the ${t.id} tier fell back to the likeliest ${n} legs though a ${n}-leg parlay clears its ${floor*100}% floor`);
          W.compose(fill===Math.max(0,n-fitAud(from.pref)),`${lab}: the likeliest ${n} legs take ${fill} ${t.mkt?'totals':'thin legs'} where the ${t.mkt?'legs with an edge':'preferred legs'} leave ${Math.max(0,n-fitAud(from.pref))} to fill`); }
        /* the likeliest pair, and a level's likeliest of its size, worked out in full where every
           parlay is a plain product: no parlay of its size with as many thin legs lands likelier */
        if(t.likeliest||!floor){ const all=[...from.pref,...from.thin];
          if(noMovers(all)){ const b=likeliestOf(all,n,fill,!!t.mkt);
            if(b){ likeliestWorked++; combosWorked+=b.seen;
              W.compose(t.corr>=b.best-1e-12,`${lab}: the ${t.id} tier, "${ruleFor(t)}", lands ${(t.corr*100).toFixed(2)}% (${t.legs.map(l=>l.name+' '+l.label).join(', ')}) where ${orderF(b.legs).map(l=>l.name+' '+l.label).join(', ')} land ${(b.best*100).toFixed(2)}% with as many thin legs (${b.seen} parlays of ${n} worked)`); } } }
        /* a level over its floor is the best-return search's own parlay, unchanged */
        else if(floor&&bestRet){ const b=bestRet(SPEC.find(s=>s[0]===t.id),from,new Map(),kTop);
          W.compose(!!b&&b.legs.map(pbIdOf).join()===t.legs.map(pbIdOf).join(),`${lab}: the ${t.id} tier is not its best return over its floor`); }
        /* thin legs only fill what the preferred could not */
        if(t.thin&&!t.likeliest) W.compose(!bestRet||bestRet(SPEC.find(s=>s[0]===t.id),{pref:pool.pref,thin:[]},new Map())===null,`${lab}: the ${t.id} tier took a thin leg the preferred legs did not need`);
        if(!floor&&pool.pref.length>=2){ /* Safe is the likeliest pair: the two likeliest preferred legs that fit together do not beat it */
          const s=[...pool.pref].sort((a,b)=>b.p-a.p), a=s[0], b=s.slice(1).find(x=>F('pbFits')([a],x));
          if(b&&!t.thin) W.compose(t.corr>=pp([a,b]).corr-0.01,`${lab}: Safe lands ${(t.corr*100).toFixed(1)}%, under the two likeliest legs together`); }
        /* the mixes: Teams only is game bets, Players only is players' lines */
        if(!u.k.over&&!u.k.under) chk(t.legs.every(isG),`${lab}: a player leg with neither player box ticked`);
        if(!u.k.ml&&!u.k.ats&&!u.k.total) chk(!t.legs.some(isG),`${lab}: a game bet with no team box ticked`); }
      /* the Top 50 lines on the same ticks: the legs these levels are searched from, uncapped and ranked */
      holdTop(lab);
      return r; };
    /* Suggested Parlays (app v111), on the data as it stands: the games given a set are exactly the week's
       prime-time games still to come (primeAud), and each set's four levels are built from that game's
       lines alone on every bet type (ALL_U, whatever the Parlay Builder's boxes say), held to every rule a
       level keeps (every prime-time game's set, shown or not: the props job takes, locks and grades each): each
       leg one of that game's own that qualifies (qualAud, worked here, the search's pool
       its cut, capAud), not kicked off, on a real price, 45-97%, never under the book, preferred and thin as
       the rule says, a total only as a market leg, DraftKings' id at its line where the payload carries ids,
       never on a player who may not play (V6's suggestable) or far off the market; one line once, one side
       and one total, one leg a player; the builder's order and its own sums (chance, price, fair chance); a
       level over its floor landing it; the likeliest of its size only where none of that size clears its
       floor (W.compose, by the page's own search at the set's widths, and worked out in full where every
       parlay is a plain product). Then (app v112) which games the tab sets out: the night rule's (nightRuleAud,
       worked here), drawn and no other, a level's Finish (spTier) naming only one of them, and until the night is
       up the line saying which game is next and when its set goes up (data-sp-wait, data-sp-next). Then each set
       as the tab draws it, those it sets out as they stand and the rest with spOn stood in (spAllOn), so every
       prime-time game's cards are held at any hour: the game, its lock (live before kickoff
       less 2 hours, the line saying when it locks; from then the set this browser built, kept, where the
       audit's page has no record), each level's legs with an Add of its own, a Value pick marked Value and no
       other leg marked, chance, price, payout on the Bet amount, fair chance first, and Add to builder. Blocking
       but the wording and the choice of parlay.
       (app v118) The same for the Sunday slot the tab stands on (slotRuleAud, worked here: the page's spSlotNext
       its unit, its games in the same order, up from the same instant): every leg on one of the slot's own games that
       qualifies (qualAud on them all), every rule above; its section drawn as the rule says (the line saying which slot
       is next and when its sets go up, the set from then, or the line that none is to come), the state's s= token the
       rule's, and its cards held as a night's, its opening stood in where it is not up yet (slotAllOn), with nothing to
       add or finish once its first game has kicked off. (app v121, the owner, 19 October 2026: "the legs need to be part
       of the same game parlay only, and anytime there's a mix it bombs the hyperlink") Each level of the slot is one
       game's legs, blocking; each of its games' own set is searched as a night game's is (that game's own legs that
       qualify, cut as SP_SEARCH cuts them) and held to the night sets' choice of parlay on that game's own pool; and the
       slot's level is its game's own level (spSet on that game) and no other game of the slot's own level beats it by
       the audit's own copy of the slot rule (slotBestAud), both W.compose; an empty level says so of any one game
       (spWhySlotAud, W.wording). Every level, a night's and the slot's, holds no pair DraftKings will not take on one
       slip (clashAud), blocking. And the tab's shape: its head, then the two sections, Night games
       and the Sunday slot, each its heading and its own record first; on this page, the prop model's own, with no
       ELO tab, no Elo picks (no #pbElo, no unit's Elo block) and each unit's model parlays under their heading */
    let setsBuilt=0, setLevels=0, setsSaid=0, setsLocked=0, setMktSeen=0, setThinSeen=0; const nightSaid=[];
    const SPS=w.eval('SP_SEARCH'), r4=v=>Math.round(v*1e4)/1e4, r3=v=>Math.round(v*1e3)/1e3;
    /* (maxAud, dayAud, spWhyAud and spWhySlotAud are the audit's own, before M, so M16 reads them too) */
    const nightAud=g=>({Thu:'Thursday night',Sun:'Sunday night',Mon:'Monday night'})[dayAud(g)];
    let slotsBuilt=0, slotLevels=0, slotsLocked=0, slotsNone=0, slotsUnderway=0; const slotSaid=[];
    const holdSets=(lab)=>{
      const now=w.Date.now(), mine=F('pbGames')().filter(primeAud), page=F('spGames')();
      chk(page.map(g=>g.id).join()===mine.map(g=>g.id).join(),`${lab}: Suggested Parlays has sets for ${page.map(g=>g.id).join(', ')||'no game'}, where the week's prime-time games to come are ${mine.map(g=>g.id).join(', ')||'none'}`);
      spKeyClear(); dropCaches();
      const out=[], idsOf=list=>list.map(legIdAud).sort().join();
      /* (app v118) the Sunday slot the tab stands on, by the audit's own rule (slotRuleAud), and the page's own answer
         for it (spSlotNext): the same unit, its games in the same order, up from the same instant */
      const SL=slotNowAud(), pSL=F('spSlotNext')(), gs=a=>(a||[]).map(g=>g.id).join();
      chk(SL?(!!pSL&&pSL.id===SL.id&&gs(pSL.games)===gs(SL.games)&&pSL.up===SL.up&&(pSL.open==null?null:+pSL.open)===SL.open):!pSL,
        `${lab}: the page's Sunday slot is ${pSL?`${pSL.id} (${gs(pSL.games)}), ${pSL.up?'up':'not up'}${pSL.open!=null?' from '+isoAud(pSL.open):''}`:'none'}, where the rule gives ${SL?`${SL.id} (${gs(SL.games)}), ${SL.up?'up':'not up'}${SL.open!=null?' from '+isoAud(SL.open):''}`:'none'}`);
      /* the units held: each prime-time game to come, and the slot (its games the audit's own) */
      const units=[...mine.map(g=>({g,G:[g],slot:null})),...(SL&&pSL&&pSL.id===SL.id?[{g:F('spUnit')(SL.id),G:SL.games,slot:SL}]:[])];
      for(const {g,G,slot} of units){ if(!g) continue;
        const gids=new Set(G.map(x=>x.id)), uname=slot?`week ${slot.w}'s Sunday slot`:`${g.a} at ${g.h}`;
        const s=F('spSet')(g.id), q=qualAud(G,ALL_U);
        /* (app v118) the Sunday slot under way: from its first kickoff the page builds and shows no set of its own (the
           locked one, the record's or kept, else its one line), finds none for a Finish and rebuilds no level, so its
           live build, which would stand on the games left, is held to nothing here; drawSlot holds what the tab shows */
        if(slot&&slot.phase==='under'){ slotsUnderway++; out.slot={g,s,q,R:slot}; continue; }
        if(slot) slotsBuilt++; else setsBuilt++;
        /* each game's own legs and the set it is searched from: a night game's, and (app v121) each of the slot's games',
           whose own set is built exactly as a night game's is (SP_SEARCH on that game's own legs), the slot's levels the
           best of theirs. Each game's pool is the audit's own reading of its legs that qualify, cut as the search cuts it */
        const per=G.map(x=>{ const qx=G.length===1?q:qualAud([x],ALL_U), px=F('pbPool')([x],w.eval('SP_ALL'),SPS), cut=[...capAud(qx.pref,SPS.cap),...capAud(qx.thin,SPS.cap),...capAud(qx.mkt,SPS.cap)];
          chk(idsOf(px.pref)===idsOf(capAud(qx.pref,SPS.cap))&&idsOf(px.thin)===idsOf(capAud(qx.thin,SPS.cap))&&idsOf(px.mkt)===idsOf(capAud(qx.mkt,SPS.cap)),
            `${lab}: ${x.id}'s set${slot?` (a game of ${uname})`:''} is searched from other legs than its own that qualify: ${px.pref.length}/${px.thin.length}/${px.mkt.length} preferred, thin and totals where the rule gives ${qx.pref.length}/${qx.thin.length}/${qx.mkt.length}`);
          return {x,q:qx,pool:px,cut,mx:maxAud(cut),s:slot?F('spSet')(x.id):s}; });
        const perOf=gid=>per.find(p=>p.x.id===gid)||null;
        chk(!!s&&s.tiers.length===4&&s.tiers.map(t=>t.id+t.n).join()===SPEC_AUD.map(x=>x[0]+x[2]).join(),`${lab}: ${g.id}'s set is not Safe, Medium, Aggressive and Extreme at 2, 3, 4 and 5 legs`);
        if(!s) continue;
        /* the boxes never move a set: with some unticked, the set is the one every box ticked builds */
        if(KINDS.some(k=>!U().k[k])||U().off.length){ const keepT=JSON.stringify(U()), sg=x=>JSON.stringify(x.tiers.map(t=>t.why||t.legs.map(legIdAud).join()+'@'+t.corr+'@'+t.dec));
          /* (app v121) the slot's levels are its games' own sets', each cached on its own, so each is forgotten too */
          const forget1=w.eval('(function(id){ SP_CACHE.delete(spSig(spUnit(id))); })'), forget=id=>{ forget1(id); if(slot) for(const x of G) forget1(x.id); };
          for(const k of KINDS) U().k[k]=true; U().off=[]; forget(g.id); const s2=F('spSet')(g.id); S.ui.pb=JSON.parse(keepT); forget(g.id);
          chk(!!s2&&sg(s2)===sg(F('spSet')(g.id)),`${lab}: ${g.id}'s set moves with the Parlay Builder's boxes`); }
        /* the most legs one parlay of the unit can hold (one game's: the slot's most is that of any one of its games) */
        const byId=new Map([...q.pref,...q.thin,...q.mkt].map(l=>[legIdAud(l),l])), mx=Math.max(0,...per.map(p=>p.mx));
        for(const t of s.tiers){ const sp=SPEC_AUD.find(x=>x[0]===t.id); if(!sp) continue; const [,,n,floor]=sp, gl=`${lab}, ${uname}: the ${t.id} level`;
          if(!t.legs){ if(!slot) setsSaid++;
            const why=slot?spWhySlotAud(G,n):spWhyAud(g,n,q);
            /* empty only where no game of the unit makes a parlay of n (app v121: of its players, sides and totals, and with
               no pair DraftKings will not take) */
            const can=per.filter(p=>fitAud(p.cut)>=n&&existsAud(p.cut,n)!==false);
            W.compose(!can.length,`${gl} is empty though ${slot?`${can.map(p=>p.x.id).join(', ')} of the slot make`:'the game\'s lines make'} ${slot?'':mx+' legs, '}a parlay of ${n}: ${t.why}`);
            if(slot) W.compose(per.every(p=>!p.s||!(p.s.tiers.find(x=>x.id===t.id)||{}).legs),`${gl} is empty though a game of the slot has a ${t.id} level of its own: ${per.filter(p=>p.s&&(p.s.tiers.find(x=>x.id===t.id)||{}).legs).map(p=>p.x.id).join(', ')}`);
            W.wording(t.why===why,`${gl} is empty and says "${t.why}", not "${why}"`);
            continue; }
          if(slot) slotLevels++; else setLevels++;
          /* (app v121) one game's legs, a game of the unit's own (the slot's: one of its games, every leg of it) */
          const xg=t.legs[0].gid, P=perOf(xg);
          chk(t.legs.every(l=>l.gid===xg)&&!!P,`${gl} holds legs of ${[...new Set(t.legs.map(l=>l.gid))].join(' and ')}: a parlay takes one game's legs${slot?', a game of the slot':''}`);
          chk(t.legs.length===n&&!!P&&P.mx>=n,`${gl} has ${t.legs.length} legs, not ${n}, or more than ${slot?'its game\'s':'the game\'s'} lines make (${P?P.mx:0})`);
          for(const l of t.legs){ const x=byId.get(legIdAud(l)), gg=S.sched.find(y=>y.id===l.gid);
            chk(gids.has(l.gid)&&!!x&&l.thin===x.thin&&!!x.market===!!l.market&&l.p===x.p&&l.price===x.price,`${gl} holds ${l.name} ${l.label}, which is not one of ${slot?'the slot\'s games\'':'this game\'s'} own legs that qualify, or not as the rule marks it (thin ${String(l.thin)} where the rule has ${String(x&&x.thin)})`);
            chk(!!gg&&!F('gameStarted')(gg)&&takenPrice(l)&&isFinite(l.price)&&l.price!==0&&l.p>=0.45&&l.p<0.97&&(l.market?l.stat==='total'&&!l.thin:l.p>=mlP(l.price)&&l.stat!=='total'),
              `${gl}: ${l.name} ${l.label} is on a game under way, on no real price, out of 45-97%, under the book, or a total that is not a market leg`);
            chk(dkOk(l)&&(isG(l)||F('suggestable')(l.pid))&&!FAIRAUD.isFar(l),`${gl}: ${l.name} ${l.label} has no DraftKings id at its line, is on a player who may not play, or is far off the market`); }
          /* one line once, one leg a player, and one side (to win or to cover) and one total */
          { const gl2=t.legs.filter(isG), pl=t.legs.filter(l=>!isG(l)), one=gl2.filter(l=>l.stat!=='total').length<=1&&gl2.filter(l=>l.stat==='total').length<=1;
            chk(new Set(t.legs.map(l=>l.key)).size===n&&one&&new Set(pl.map(l=>l.pid)).size===pl.length,`${gl} has one line twice, two sides or two totals of a game, or two legs on one player`); }
          /* (app v121) no pair DraftKings will not take on one slip (clashAud, the audit's own copy) */
          chk(!clashPairsAud(t.legs).length,`${gl} holds a pair DraftKings will not take on one slip: ${clashTxt(t.legs)}`);
          chk(t.legs.map(l=>l.key).join()===[...t.legs].sort((a,b)=>(a.week-b.week)||String(a.name).localeCompare(String(b.name))).map(l=>l.key).join(),`${gl}'s legs are not in the builder's order`);
          chk(pp(t.legs).corr===t.corr&&pd(t.legs.map(l=>({leg:l,ml:l.price})))===t.dec,`${gl}'s chance or price is not what parlayProb and parlayDec say`);
          { const fs=t.legs.map(l=>F('legFair')(l));
            chk(t.legs.every((l,i)=>{ const f=FAIRAUD.fairOf(l); return f?(!!fs[i]&&nrz(fs[i].p,f.p)&&fs[i].est===f.est):!fs[i]; })
              &&(fs.every(Boolean)?(!!t.fair&&t.fair.p===pp(t.legs.map((l,i)=>({...l,p:fs[i].p}))).corr&&t.fair.est===fs.some(f=>f.est)):(!!t.fair&&t.fair.p===null)),`${gl}'s fair chance is not parlayProb on its legs at the book's fair chances`); }
          if(floor&&!t.likeliest) chk(t.corr>=floor,`${gl} lands ${(t.corr*100).toFixed(1)}%, under its ${floor*100}% floor, and is not marked the likeliest of its size`);
          chk(t.thin===t.legs.filter(l=>l.thin).length&&(t.mkt||0)===t.legs.filter(l=>l.market).length&&(!t.likeliest||!!floor),`${gl} miscounts its thin legs or totals, or Safe is marked a fallback`);
          if(!P) continue;
          /* the choice of parlay, on its game's own pool, by the page's own search at a set's widths (W.compose) and in
             full where it can be: a night game's, and the slot's level's own game's */
          const pool=P.pool, from0={pref:pool.pref,thin:pool.thin}, gw=slot?`its game's (${xg})`:'the game\'s';
          /* (app v121, the review's round) the totals as many as the legs with an edge leave, counted as one parlay can take them (fitAud) */
          const from=t.mkt?{pref:[...pool.pref,...pool.thin],thin:pool.mkt}:from0, kTop=t.mkt?Math.max(0,n-fitAud(from.pref)):undefined;
          if(t.mkt) W.compose(F('pbTier')(sp,from0,new Map(),SPS)===null,`${gl} took a game total where ${gw} legs with an edge make a parlay of its size`);
          if(t.mkt) W.compose(t.mkt===kTop,`${gl} takes ${t.mkt} totals where ${gw} legs with an edge leave ${kTop} to fill`);
          if(t.likeliest) W.compose(!!bestRet&&bestRet(sp,from,new Map(),kTop,SPS)===null,`${gl} fell back to the likeliest ${n} legs though a ${n}-leg parlay of ${slot?'its game':'the game'} clears its ${floor*100}% floor`);
          else if(floor&&bestRet){ const b=bestRet(sp,from,new Map(),kTop,SPS); W.compose(!!b&&b.legs.map(legIdAud).join()===t.legs.map(legIdAud).join(),`${gl} is not its best return over its floor`); }
          if(t.likeliest||!floor){ const all=[...from.pref,...from.thin], fill=t.mkt?t.mkt:t.thin;
            if(noMovers(all)){ const b=likeliestOf(all,n,fill,!!t.mkt);
              if(b) W.compose(t.corr>=b.best-1e-12,`${gl}, "${ruleFor(t)}", lands ${(t.corr*100).toFixed(2)}% where ${orderF(b.legs).map(l=>l.name+' '+l.label).join(', ')} land ${(b.best*100).toFixed(2)}% with as many thin legs`); } }
          /* (app v121) the slot's level is its game's own level, and no other game of the slot's own level beats it by the
             slot's rule (slotBestAud, the audit's own copy; the earlier game on a tie): which correctly priced parlay is picked */
          if(slot){ const own=P.s&&P.s.tiers.find(x=>x.id===t.id), sig=x=>x&&x.legs?x.legs.map(legIdAud).join()+'@'+x.corr+'@'+x.dec:'none';
            W.compose(sig(own)===sig(t),`${gl} is not ${xg}'s own ${t.id} level (spSet on the game): ${sig(t)} where the game's own is ${sig(own)}`);
            const best=slotBestAud(per.map(p=>p.s&&p.s.tiers.find(x=>x.id===t.id)),floor);
            W.compose(!!best&&best.legs[0].gid===xg&&sig(best)===sig(t),`${gl} is ${xg}'s, where by the slot's rule the best of its games' own ${t.id} levels is ${best?best.legs[0].gid+"'s":'none'} (${sig(best)})`); } }
        if(slot) out.slot={g,s,q,R:slot}; else out.push({g,s,q}); }
      /* the tab as it draws them: which games it sets out, by the night rule worked here (app v118: in its Night games
         section; since app v129 the Sunday slot is in it too, after the night's sets, below) */
      F('renderSp')();
      const NS='#spPanel [data-sp-sec="night"]';
      const N=nightRuleAud(mine,S.sched,now), onG=N.up?N.games:[], ids=a=>a.map(g=>g.id).sort().join(), byK=a=>[...a].sort((x,y)=>(kickAud(x)-kickAud(y))||String(x.id).localeCompare(String(y.id))).map(g=>g.id).join();
      nightSaid.push(`${lab}: ${!mine.length?'no prime-time game to come':N.up?`${ids(onG)} set out${mine.length>onG.length?`, ${mine.length-onG.length} later game${mine.length-onG.length===1?'':'s'} not yet`:''}`:`the next night (${ids(N.games)}) not up until ${isoAud(N.open)}, said so`}`);
      /* (app v118) the tab's sections are each headed by its own record; the record is no longer at the tab's head, and
         this page, the prop model's own, with no ELO tab, draws no Elo picks (each unit's, .pb-tiers[data-sp-kind="elo"],
         which the hub's ELO tab fills) and no #pbElo, only each unit's model parlays under their heading. (app v129, the
         owner's call of 22 October 2026: "get rid of the Sunday slot record section -> all should be a part of 'Night
         Games'") one section, Night games, its record first, then the night's sets and then the Sunday slot's; no section
         of the Sunday slot's own (data-sp-sec="slot") anywhere */
      { const sets=d.getElementById('spSets'), kids=sets?[...sets.children]:[];
        const ORD=dayOffAud()?['all','night']:['all','slot','night'];
        /* (app v133) no fold: no details or summary on the tab */
        chk(!d.querySelector('#spSets details,#spSets summary'),`${lab}: Suggested Parlays still draws a folding section`);
        chk(!!d.querySelector('#spPanel > #spCard > #spHead')&&!!d.querySelector('#spPanel > #spCard > #spSets')&&kids.length===ORD.length&&kids.every((x,i)=>x.tagName==='SECTION'&&x.classList.contains('sp-sec')&&x.dataset.spSec===ORD[i])
          &&kids.every(x=>{ const h=x.firstElementChild, r=h&&h.nextElementSibling; return x.getAttribute('aria-labelledby')===`spsec-${x.dataset.spSec}`&&!!h&&h.tagName==='H3'&&h.classList.contains('sp-sech')&&h.id===`spsec-${x.dataset.spSec}`
            &&(x.dataset.spSec==='all'?!!r&&r.classList.contains('sp-rec')&&r.dataset.spRecsec==='all':!x.querySelector('.sp-rec')); })
          &&!d.getElementById('spRec')&&!d.querySelector('#spHead .sp-rec,#spHead [data-sp-rec]'),
          `${lab}: Suggested Parlays is not its head and the sections Record, Day games and Night games (no Day games on a Sunday from 4pm ET), each a plain section under its heading, no fold, the record in Record alone: ${kids.map(x=>x.tagName+(x.dataset.spSec?'['+x.dataset.spSec+']':'')).join(', ')||'no sections'}`);
        chk(spPartsAud(),`${lab}: the Night games section does not draw the night's sets (or their line) and then the Sunday slot's one part (its set, marked .sp-slot, its line before it is up, or the line that none is left), in that order`);
        W.wording(kids.map(x=>(x.querySelector('h3.sp-sech')||{}).textContent).join('|')===ORD.map(s=>({all:'Record',slot:'Day games',night:'Night games'})[s]).join('|'),`${lab}: the sections are not headed Record, Day games and Night games`);
        /* (app v132) no Extreme level drawn: a set's cards and its Elo picks Safe, Medium and Aggressive alone */
        /* (app v132) Extreme hidden by the stylesheet (jsdom lays nothing out, so the rule itself), and no Extreme pill */
        chk([...d.querySelectorAll('style')].some(x=>x.textContent.includes('#spSets .pb-tier.xtrm,#spSets .pb-tier.elo-xtrm{display:none}'))&&!d.querySelector('#spSets [data-sp-rec*="xtrm"]'),`${lab}: Suggested Parlays does not hide its Extreme cards, or counts an Extreme level`);
        /* the units that draw a set: not one waiting to go up or for the record, nor the Sunday slot under way with
           nothing to show (no record entry and nothing kept: its one line, held in drawSlot below) */
        const units=[...d.querySelectorAll('#spPanel .sp-game')].filter(b=>!b.querySelector('[data-sp-phase="wait"],[data-sp-phase="loading"]')&&!(F('spShown')(F('spUnit')(b.dataset.spGame))||{}).none);
        chk(!F('spEloOn')()&&!d.querySelector('#pbElo,#spPanel [data-sp-kind="elo"],#spPanel [data-sp-elo-wait]')
          &&units.every(b=>b.querySelectorAll('h5.sp-sub[data-sp-kind="model"]').length===1&&b.querySelectorAll('.pb-tiers[data-sp-kind="model"]').length===1&&b.querySelector('h5.sp-sub[data-sp-kind="model"]').nextElementSibling===b.querySelector('.pb-tiers[data-sp-kind="model"]')),
          `${lab}: the prop model's own page, which has no ELO tab, draws Elo picks (#pbElo, a unit's Elo block or its loading line), or a unit's model parlays are not under their heading`);
        W.wording(units.every(b=>b.querySelector('h5.sp-sub[data-sp-kind="model"]').textContent==='Model parlays'),`${lab}: a unit's model parlays are not headed Model parlays`); }
      { const pOn=F('spOn')(), drawnIds=[...d.querySelectorAll(SP_NG)].map(x=>x.dataset.spGame), say=`the night rule gives ${ids(onG)||'none'} (the next night ${ids(N.games)||'none'}, ${N.prev?`the night before it ${N.prev}, so up from ${isoAud(N.open)}`:'none before it, so up at once'})`;
        chk(ids(pOn)===ids(onG),`${lab}: Suggested Parlays sets out ${ids(pOn)||'no game'}, where ${say}`);
        chk([...drawnIds].sort().join()===ids(onG),`${lab}: Suggested Parlays draws sets for ${drawnIds.join(', ')||'no game'}, where ${say}`);
        W.order(drawnIds.join()===byK(onG),`${lab}: the night's sets are not drawn in kickoff order: ${drawnIds.join(', ')}`);
        /* a level's Finish names only a game on the screen */
        for(const {g} of out){ const t=(F('spShown')(g).tiers||[]).find(y=>y&&y.legs), x=t&&F('spTier')(`${g.id}:${t.id}`), on=onG.some(y=>y.id===g.id);
          if(t) chk(on?!!x&&x.legs.map(legIdAud).join()===t.legs.map(legIdAud).join():x===null,
            `${lab}: the ${t.id} level of ${g.a} at ${g.h}, ${on?'set out':'not set out yet'}, is ${x?'':'not '}found for its Finish (spTier)`); }
        const wt=d.querySelectorAll(SP_NW), w0=wt[0];
        if(mine.length&&!N.up){
          chk(wt.length===1&&w0.dataset.spWait===isoAud(N.open)&&[...String(w0.dataset.spNext||'').split(' ')].sort().join()===ids(N.games),
            `${lab}: with the next night (${ids(N.games)}) not up until ${isoAud(N.open)}, the tab does not say which game is next and when its set goes up: ${w0?w0.outerHTML.slice(0,300):'no line'}`);
          const TN=F('TEAM_NAMES'), nm=x=>`${TN[x.a]||x.a} at ${TN[x.h]||x.h}`, two=N.games.length>1;
          const want=`Next up: ${nightAud(N.games[0])}, ${N.games.map(nm).join(' and ')}. ${two?'Sets go':'Set goes'} up ${etAud(N.open)}.`;
          W.wording(!!w0&&w0.textContent===want,`${lab}: the line before the next night is up reads "${w0?w0.textContent:''}", not "${want}"`); }
        else chk(!wt.length,`${lab}: the tab says the next night is not up yet, where ${say}`); }
      const stake=w.eval('pbStake()'), fm=F('fmtML'), dml=F('decToML');
      const drawSets=list=>{ for(const {g,s,q} of list){ const box=d.querySelector(`${NS} [data-sp-game="${g.id}"]`), lock=kickAud(g)-2*3600e3, live=now<lock, gl=`${lab}, ${g.a} at ${g.h}`;
        /* which legs are Value picks, thin-edge legs and totals: the audit's own pool of the game (qualAud), never the
           page's thin and market flags (a preferred leg whose flag the page dropped would otherwise pass unmarked) */
        const qV=new Set(q.pref.map(legIdAud)), qT=new Set(q.thin.map(legIdAud)), qM=new Set(q.mkt.map(legIdAud));
        chk(!!box,`${gl}: Suggested Parlays draws no set for the game`); if(!box) continue;
        const v=F('spShown')(g), ph=box.querySelector('[data-sp-phase]');
        chk(v.phase===(live?'live':'locked')&&(live||v.own===!w.eval('PB_REC'))&&!!ph&&ph.dataset.spPhase===(live?'live':(v.own?'own':'locked')),
          `${gl}: the set is ${v.phase}${v.own?' (built here)':''} and drawn ${ph?ph.dataset.spPhase:'with no line'}, where its lock (${new Date(lock).toISOString()}) is ${live?'to come':'past'}`);
        chk(!!ph&&ph.textContent.includes(etAud(lock)),`${gl}: the set's line does not say it locks at ${etAud(lock)}: "${ph?ph.textContent:''}"`);
        /* (app v113, the owner's "get rid of all the long paragraph description stuff") one short line each: live, and past
           the lock this browser's own set (the audit's page has no record) or the record's */
        { const want=live?`Locks ${etAud(lock)}.`:v.own?`Locked since ${etAud(lock)}. This browser’s own set (not graded).`:`Locked since ${etAud(lock)}.`;
          W.wording(!!ph&&ph.textContent===want,`${gl}: the ${live?'live':v.own?'locked (this browser\'s own)':'locked'} set's line reads "${ph?ph.textContent:''}", not "${want}"`); }
        /* (app v118) its head an h4 under its section's h3, the unit labelled by it */
        W.wording((box.querySelector('h4')||{}).textContent===`${F('TEAM_NAMES')[g.a]||g.a} at ${F('TEAM_NAMES')[g.h]||g.h}`&&(box.querySelector('h4')||{}).id===`spg-${g.id}`&&box.getAttribute('aria-labelledby')===`spg-${g.id}`&&(box.querySelector('.sp-hd .pill')||{}).textContent===nightAud(g),`${gl}: the set is not headed with the game and its night`);
        /* locked: the set kept is the one built at the lock, its legs as built; its chance and price are the
           builder's own sums on the legs as kept (each leg's chance to 4 places), so what the card says is what
           Add to builder pays, and within the record's rounding of the set as built */
        const shown=live?s.tiers:v.tiers;
        if(!live){ setsLocked++; chk(shown.length===4&&shown.every((t,i)=>{ const b=s.tiers[i]; return t.id===b.id&&(b.legs?(!!t.legs&&t.legs.map(legIdAud).join()===b.legs.map(legIdAud).join()
              &&t.corr===pp(t.legs).corr&&t.dec===pd(t.legs.map(l=>({leg:l,ml:l.price})))&&Math.abs(t.corr-b.corr)<2e-3&&Math.abs(t.dec-b.dec)<=Math.max(2e-3,b.dec*2e-3)):!t.legs); }),
          `${gl}: the locked set this browser keeps is not the set built at the lock, or its chance and price are not the builder's sums on its legs`); }
        cardsHeld(box,shown,{g,qV,qT,qM,gl,ro:false}); } };
      /* each level's card of a unit, as drawn: its legs, each with an Add of its own named for it (none, nor Add to
         builder, nor Finish, where ro: the Sunday slot under way), its chance and price, its payout on the Bet amount, the
         Value mark on its Value picks alone, quiet, its fair chance first and its words */
      const cardsHeld=(box,shown,{g,qV,qT,qM,gl,ro,slot})=>{
        for(const t of shown){ const c=box.querySelector(`.pb-tier.${t.id}`), tl=`${gl}: the ${t.id} card`;
          if(!c){ chk(false,`${tl} is not drawn`); continue; }
          /* (app v121) a card of the Sunday slot names the game its legs are of, under its title, right after the legs'
             pill (data-pb-tgame its id; the game and its kickoff in Eastern time); a night's card, whose unit is its game,
             and an empty level name none */
          { const tg=[...c.querySelectorAll('.pb-tgame')], gg=t.legs&&t.legs.length?S.sched.find(x=>x.id===t.legs[0].gid):null, TN=F('TEAM_NAMES');
            const want=gg?`${TN[gg.a]||gg.a} at ${TN[gg.h]||gg.h} · ${etAud(kickAud(gg))}`:'';
            W.wording(slot&&gg?tg.length===1&&tg[0].dataset.pbTgame===gg.id&&tg[0].textContent===want&&!!tg[0].previousElementSibling&&tg[0].previousElementSibling.classList.contains('pill')&&tg[0].parentElement.classList.contains('pb-th'):!tg.length,
              `${tl} ${slot&&gg?`does not name its game under its title ("${want}", ${gg.id})`:'names a game'}: ${tg.map(x=>`"${x.textContent}" (${x.dataset.pbTgame})`).join(', ')||'none'}`); }
          if(!t.legs){ W.wording((c.querySelector('.pb-why')||{}).textContent===t.why&&!c.querySelector('[data-sp-add]'),`${tl} does not give its reason, or offers Add to builder`); continue; }
          const li=[...c.querySelectorAll('.pb-legs li')], tx=c.textContent.replace(/\s+/g,' ');
          chk(li.length===t.legs.length&&t.legs.every((l,i)=>li[i].textContent.includes(l.name)&&li[i].textContent.includes(l.label)&&(ro?!li[i].querySelector('[data-pb-leg]'):legAddOk(li[i].querySelector('[data-pb-leg]'),l)))
            &&tx.includes(`${(t.corr*100).toFixed(0)}%`)&&tx.includes(fm(dml(t.dec)))&&(ro?!c.querySelector('[data-sp-add],[data-pc-finish]'):!!c.querySelector(`[data-sp-add="${g.id}:${t.id}"]`)),
            ro?`${tl} does not show its legs, chance and price as it locked, or still offers an Add, Add to builder or Finish with its games under way`:`${tl} does not show its legs, each with an Add of its own named for it, its chance and price, or Add to builder`);
          chk(payOk(c.querySelector('[data-pb-pay]'),stake,t.dec),`${tl} does not pay the Bet amount (${amtTxt(stake)}) times its price ${t.dec}`);
          /* (app v112) a Value pick (a preferred leg of the audit's own pool) wears Value, and no other leg any mark.
             (app v113) a set's card is quiet (and since app v130 every card, pbMktLine and pbThinLine gone): it draws no
             line saying why it holds a total and none saying why a leg is not a Value pick, whatever it holds; the Value
             mark says it, and the est. line (a price that is an estimate) and a ruled-out level's Updated line stay */
          const nMk=t.legs.filter(l=>qM.has(legIdAud(l))).length, nTh=t.legs.filter(l=>qT.has(legIdAud(l))).length; if(nMk) setMktSeen++; if(nTh) setThinSeen++;
          chk(t.legs.every((l,i)=>{ const vm=li[i].querySelectorAll('.pb-valmark'), val=qV.has(legIdAud(l));
              return (val?vm.length===1&&vm[0].textContent==='Value':!vm.length)&&!li[i].querySelector('.pb-thinmark')&&!/thin edge|no edge/i.test(li[i].textContent); })
            &&!/(it is|they are) not (a )?Value picks?: (it is|they are) here because/.test(tx),
            `${tl} does not mark Value its Value picks alone (${t.legs.map(l=>qV.has(legIdAud(l))?'V':'-').join('')}: ${li.map(x=>x.querySelectorAll('.pb-valmark').length?'V':'-').join('')}), or still draws the line on why it holds ${nMk?'its totals':'a total, with none'}, which a set's cards no longer draw`);
          { const th=[...c.querySelectorAll('p.pb-thin:not(.pb-espnline):not(.sp-upd)')];
            W.wording(!th.length&&!/not (a )?Value picks?: the model rates/.test(tx),
              `${tl} holds ${nTh} thin leg${nTh===1?'':'s'} and still draws a line under its legs: "${th.map(p=>p.textContent).join(' / ')}"`); }
          fairShown(c,t,gl,'model'); cardWords(c,t,gl); } };
      { const onIds=new Set(onG.map(g=>g.id)), shownOut=out.filter(x=>onIds.has(x.g.id)), hidOut=out.filter(x=>!onIds.has(x.g.id));
        drawSets(shownOut);
        /* the games the night rule hides, drawn with spOn stood in: their cards are what the tab draws once their night is up */
        if(hidOut.length) spAllOn(()=>{ F('renderSp')(); drawSets(hidOut); });
        if(hidOut.length) F('renderSp')(); }
      /* (app v118) the Sunday slot as the tab draws it, by the audit's own rule (slotRuleAud): before it is set out, its
         section's one line saying which slot is next and when its sets go up (data-sp-wait the instant, data-sp-next its
         id), and its Finish found for no level; from then to its last kickoff its set, live, locked (this browser's own
         set, the audit's page having no record) and, from its first kickoff, under way: shown as it locked with nothing
         to add or finish (no leg's Add, no Add to builder, no Finish, spTier null for every level); with none to come,
         the line that says so. Then its cards as the tab draws them once it is up, its opening stood in where it is not
         (slotAllOn): blocking but the words and the choice of parlay, as a night's */
      { const SS=SPD, boxes=[...d.querySelectorAll(SP_SG)], wt=[...d.querySelectorAll(SP_SW)], nn=d.querySelector(SP_SN);
        const tok=(F('spState')().split(',').find(x=>x.startsWith('s='))||'(none)');
        chk(tok===slotTokAud(SL),`${lab}: the page's state carries ${tok} for the Sunday slot, where the rule gives ${slotTokAud(SL)}`);
        /* (app v132) Day games off on a Sunday from 4pm Eastern: nothing of the slot's drawn */
        if(dayOffAud()){ chk(!boxes.length&&!wt.length&&!nn&&!d.querySelector(SPD),`${lab}: on a Sunday from 4pm Eastern Day games is still drawn`); slotSaid.push(`${lab}: Day games off (Sunday from 4pm ET)`); }
        /* (app v129) with the season over the night games' line says so once and the slot draws nothing */
        else if(!SL){ const over=F('seasonOver')();
          chk(!boxes.length&&!wt.length&&(over?!nn:!!nn),`${lab}: with no Sunday slot to come${over?' and the season over':''}, the slot's part draws ${boxes.length?'a set':wt.length?'a wait line':over?'a line':'no line saying so'}`);
          const cw=liveWeekAud(S.sched,now), want=`No Sunday game left in week ${cw}.`;
          if(!over) W.wording(!!nn&&nn.textContent===want,`${lab}: with no Sunday slot to come, its section reads "${nn?nn.textContent:''}", not "${want}"`);
          slotSaid.push(`${lab}: none to come`); }
        else if(!SL.up){ chk(!boxes.length&&!nn&&wt.length===1&&wt[0].dataset.spWait===isoAud(SL.open)&&wt[0].dataset.spNext===SL.id,
            `${lab}: with ${SL.id} not set out until ${isoAud(SL.open)}, the slot's section does not draw its one line saying which slot is next and when its sets go up: ${wt[0]?wt[0].outerHTML.slice(0,300):boxes.length?'a set drawn':'no line'}`);
          W.wording(!!wt[0]&&wt[0].textContent===slotWaitAud(SL),`${lab}: the line before the Sunday slot is up reads "${wt[0]?wt[0].textContent:''}", not "${slotWaitAud(SL)}"`);
          if(out.slot) for(const t of out.slot.s.tiers.filter(t=>t.legs)) chk(F('spTier')(`${SL.id}:${t.id}`)===null,`${lab}: the ${t.id} level of ${SL.id}, not set out yet, is found for its Finish (spTier)`);
          slotSaid.push(`${lab}: ${SL.id} (${SL.games.length} games) waited for, up from ${isoAud(SL.open)}`); }
        else { chk(boxes.length===1&&boxes[0].dataset.spGame===SL.id&&boxes[0].classList.contains('sp-slot')&&!wt.length&&!nn,`${lab}: with ${SL.id} up (${SL.phase}), the slot's section draws ${boxes.map(b=>b.dataset.spGame).join(', ')||'no set'}${wt.length?' and a wait line':''}`);
          slotSaid.push(`${lab}: ${SL.id} (${SL.games.length} games) ${SL.phase}`); }
        const drawSlot=({g,s,q,R})=>{ const box=d.querySelector(`${SS} [data-sp-game="${g.id}"]`), gl=`${lab}, week ${R.w}'s Sunday slot`, ph0=now<R.lock?'live':now<R.first?'locked':'under';
          const qV=new Set(q.pref.map(legIdAud)), qT=new Set(q.thin.map(legIdAud)), qM=new Set(q.mkt.map(legIdAud));
          chk(!!box,`${gl}: Suggested Parlays draws no set for it`); if(!box) return;
          const v=F('spShown')(g), ph=box.querySelector('[data-sp-phase]'), want=ph0==='live'?'live':ph0==='under'?'under':(v.own?'own':'locked'), noRec=!w.eval('PB_REC');
          /* locked, this page (no record) builds its own once; under way it builds nothing (a set built then would be of
             the games left), and holdSets emptied the browser's key first, so with no record there is nothing to show */
          const ownOk=ph0==='live'?true:ph0==='under'?(noRec?(v.none===true&&!v.own&&!v.tiers):!v.none):v.own===noRec;
          chk(v.phase===(ph0==='live'?'live':'locked')&&ownOk&&!!v.under===(ph0==='under')&&!!ph&&ph.dataset.spPhase===want,
            `${gl}: the set is ${v.phase}${v.own?' (built here)':''}${v.under?' (under way)':''} and drawn ${ph?ph.dataset.spPhase:'with no line'}, where its lock (${isoAud(R.lock)}) and first kickoff (${isoAud(R.first)}) make it ${ph0}`);
          chk(!!ph&&ph.textContent.includes(etAud(R.lock))&&(ph0!=='under'||ph.textContent.includes(etAud(R.first))),`${gl}: the set's line does not say it locks at ${etAud(R.lock)}${ph0==='under'?`, under way since ${etAud(R.first)}`:''}: "${ph?ph.textContent:''}"`);
          { const wantL=ph0==='live'?`Locks ${etAud(R.lock)}.`:ph0==='under'?`Locked since ${etAud(R.lock)}. Under way since ${etAud(R.first)}.${v.none?' Not published in time.':v.own?' This browser’s own set (not graded).':''}`
              :v.own?`Locked since ${etAud(R.lock)}. This browser’s own set (not graded).`:`Locked since ${etAud(R.lock)}.`;
            W.wording(!!ph&&ph.textContent===wantL,`${gl}: the ${ph0} set's line reads "${ph?ph.textContent:''}", not "${wantL}"`); }
          { const H=slotHeadAud(R), h=box.querySelector('.sp-hd h4'), sm=box.querySelector('.sp-hd small'), pl=[...box.querySelectorAll('.sp-hd .pill')];
            W.wording(!!h&&h.id===`spg-${g.id}`&&box.getAttribute('aria-labelledby')===h.id&&h.textContent===H.h&&!!sm&&sm.textContent===H.small&&pl.length===1&&pl[0].textContent==='Sunday slot',`${gl}: the slot is headed "${h?h.textContent:''}" "${pl.map(x=>x.textContent).join('|')}" "${sm?sm.textContent:''}", not "${H.h}" "Sunday slot" "${H.small}"`); }
          /* under way with nothing to show: its line alone, no card, nothing to add or finish, and no level found */
          if(v.none){ slotsNone++;
            chk(ph0==='under'&&!box.querySelector('.pb-tier,.pb-tiers,h5.sp-sub,[data-sp-add],[data-pb-leg],[data-pc-finish]'),`${gl}: with the site's set not published in time, the slot ${ph0==='under'?'still draws a card, a heading or a button':'is said to have nothing to show before its first kickoff'}`);
            for(const t of (s?s.tiers:[]).filter(t=>t.legs)) chk(F('spTier')(`${g.id}:${t.id}`)===null,`${gl}: the ${t.id} level, under way with the site's set not published in time, is found for its Finish (spTier)`);
            return; }
          const shown=ph0==='live'?s.tiers:v.tiers;
          /* locked, the set kept is the one built at the lock (nothing has kicked off); under way the live build stands on
             the games left, so a set kept is held to the builder's own sums on its legs alone */
          if(ph0==='under'){ slotsLocked++; chk(shown.length===4&&shown.every((t,i)=>t.id===SPEC_AUD[i][0]&&(!t.legs||(t.corr===pp(t.legs).corr&&t.dec===pd(t.legs.map(l=>({leg:l,ml:l.price})))))),
            `${gl}: under way, the set this browser kept is not its four levels at the builder's sums on their legs`); }
          else if(ph0!=='live'){ slotsLocked++; chk(shown.length===4&&shown.every((t,i)=>{ const b=s.tiers[i]; return t.id===b.id&&(b.legs?(!!t.legs&&t.legs.map(legIdAud).join()===b.legs.map(legIdAud).join()
                &&t.corr===pp(t.legs).corr&&t.dec===pd(t.legs.map(l=>({leg:l,ml:l.price})))&&Math.abs(t.corr-b.corr)<2e-3&&Math.abs(t.dec-b.dec)<=Math.max(2e-3,b.dec*2e-3)):!t.legs); }),
            `${gl}: the locked set this browser keeps is not the set built at the lock, or its chance and price are not the builder's sums on its legs`); }
          cardsHeld(box,shown,{g,qV,qT,qM,gl,ro:ph0==='under',slot:true});
          if(ph0==='under') chk(!box.querySelector('[data-sp-add],[data-pb-leg],[data-pc-finish]'),`${gl}: under way since its first kickoff, the slot still offers an Add, an Add to builder or a Finish`);
          /* its Finish (spTier) finds each level with its own legs, the slot named, until its first kickoff; none after */
          for(const t of shown.filter(t=>t.legs)){ const x=F('spTier')(`${g.id}:${t.id}`);
            chk(ph0==='under'?x===null:(!!x&&x.legs.map(legIdAud).join()===t.legs.map(legIdAud).join()),`${gl}: the ${t.id} level, ${ph0}, is ${x?'':'not '}found for its Finish (spTier)`);
            if(x) W.wording(x.game==='the Sunday slot',`${gl}: the ${t.id} level's Finish names it "${x.game}", not the Sunday slot`); } };
        if(out.slot){ if(SL.up&&!dayOffAud()) drawSlot(out.slot); else { slotAllOn(()=>{ F('renderSp')(); drawSlot(out.slot); }); F('renderSp')(); } } }
      /* (app v113, the owner's "get rid of all the long paragraph description stuff. we dont need to clutter the page") the
         tab's lead under its heading and the foot under the sets are gone, and nothing of their paragraphs is left */
      { const box=['#spHead','#spSets'].map(s=>d.querySelector('#spPanel '+s)).filter(Boolean), tx=box.map(x=>x.textContent).join(' ').replace(/\s+/g,' ');
        const left=box.flatMap(x=>[...x.querySelectorAll('.pb-lead,.pb-foot,.sp-rec-line')]);
        W.wording(box.length===2&&!left.length&&!/A leg marked Value is one of the model’s best|where none of that size gets there, the likeliest of that size|One night is shown at a time|The record starts with this change/.test(tx),
          `${lab}: Suggested Parlays still draws its long paragraphs (the lead, the foot or the record's sentence): ${left.map(x=>'.'+[...x.classList].join('.')).join(', ')||'their words'} "${(left[0]||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,200)}"`); }
      return out; };
    const keepU=JSON.stringify(U());
    /* the week as it is: its prime-time games' sets, and their absence said where there are none */
    { const sets=holdSets('this week');
      /* (a week with no Thursday, Sunday or Monday night game to come, as the divisional round, the conference
         championships and the Super Bowl are, leaves nothing untested: M10 holds every rule on made-up games each
         run, so it is said here and never warned, which would turn every run of those weeks red) */
      if(!sets.length) console.log('  (this week has no prime-time game still to come, so no set of the week\'s own was held; M10 holds them on made-up games)');
      if(!sets.length) W.wording(/No night game left in week \d+\.|Regular season over\./.test(d.getElementById('spPanel').textContent),'with no prime-time game to come, Suggested Parlays does not say so'); }
    /* the week as it is, under each mix, then one game, then none, then no bet types */
    for(const [m,ks] of [['all',KINDS],['teams',['ml','ats','total']],['players',['over','under']]]){
      d.querySelector(`#pbPanel [data-pb-mix="${m}"]`).click();
      chk(KINDS.every(k=>U().k[k]===ks.includes(k))&&d.querySelector(`#pbPanel [data-pb-mix="${m}"]`).classList.contains('on')&&d.querySelectorAll('#pbPanel [data-pb-mix].on').length===1,`the ${m} mix did not set its boxes, or does not show as chosen`);
      chk([...d.querySelectorAll('#pbPanel [data-pb-kind]')].every(cb=>cb.checked===ks.includes(cb.dataset.pbKind)),`the ${m} mix's boxes are not ticked to match`);
      hold('this week, '+m); }
    /* the week's spreads alone, as the owner ticked them: a level whose floor no parlay of its size
       reaches is the likeliest of that size (hold holds it to the rule) */
    setKinds(['ats']); hold('this week, spreads only');
    /* a set is the game's own on every bet type, whatever the boxes say: the same with Spread alone ticked */
    holdSets('this week, with Spread alone ticked');
    /* and the week's moneylines alone, and Teams only on the first four games: each a pick where a
       level may fall back, and hold works every likeliest tier out in full against every parlay of
       its size (a game's side and its total are unrelated, so every parlay is a plain product) */
    setKinds(['ml']); hold('this week, moneylines only');
    { const g4=F('pbGames')(); setKinds(['ml','ats','total']); U().off=g4.slice(4).map(g=>g.id); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()');
      hold('this week, teams only, the first four games'); U().off=[]; }
    setKinds(KINDS); F('renderPb')();
    /* a box changed by hand: the mix it makes, or no mix lit at all; there is no Custom tag (the
       boxes say what is ticked) */
    d.querySelector('#pbPanel [data-pb-mix="all"]').click();
    { const cb=d.querySelector('#pbPanel [data-pb-kind="total"]'); cb.checked=false; cb.dispatchEvent(new w.Event('change'));
      const P=d.getElementById('pbPanel');
      chk(U().k.total===false&&!P.querySelector('[data-pb-mix].on')&&!P.querySelector('[data-pb-mix][aria-pressed="true"]')&&[...P.querySelectorAll('[data-pb-kind]')].every(x=>x.checked===(x.dataset.pbKind!=='total')),'unticking a box under All leaves a mix lit, or the boxes do not show it');
      chk(!P.querySelector('.pb-custom')&&!/\bCustom\b/.test(P.textContent),'a box changed by hand still shows a Custom tag beside the mix switch');
      w.eval('store.set(S)'); chk(JSON.parse(mem).ui.pb.k.total===false,'the bet types are not kept in the browser\'s own state (S.ui.pb)');
      const c2=d.querySelector('#pbPanel [data-pb-kind="total"]'); c2.checked=true; c2.dispatchEvent(new w.Event('change'));
      chk(d.querySelector('#pbPanel [data-pb-mix="all"]').classList.contains('on'),'ticking the box back does not read as All again');
      for(const k of ['over','under']){ const c=d.querySelector(`#pbPanel [data-pb-kind="${k}"]`); c.checked=false; c.dispatchEvent(new w.Event('change')); }
      chk(d.querySelector('#pbPanel [data-pb-mix="teams"]').classList.contains('on'),'the boxes of Teams only, ticked by hand, do not read as Teams only'); }
    d.querySelector('#pbPanel [data-pb-mix="all"]').click();
    const games=F('pbGames')();
    chk(d.querySelectorAll('#pbPanel [data-pb-game]').length===games.length&&games.every(g=>!F('gameStarted')(g)),'the games list is not this week\'s games still to kick off');
    if(games.length){
      /* None, then one game */
      d.querySelector('#pbPanel [data-pb-games="none"]').click();
      chk(U().off.length>=games.length&&F('getPbTiers')().tiers.every(t=>!t.legs&&/No games ticked/.test(t.why)),'None did not untick every game, or the tiers did not say no game is ticked');
      d.querySelector('#pbPanel [data-pb-games="all"]').click();
      chk(games.every(g=>!U().off.includes(g.id)),'All did not tick every game back');
      const one=games[0];
      for(const g of games.slice(1)){ const c=d.querySelector(`#pbPanel [data-pb-game="${g.id}"]`); c.checked=false; c.dispatchEvent(new w.Event('change')); }
      chk(U().off.length===games.length-1&&!U().off.includes(one.id),'unticking the games one by one did not leave one ticked');
      hold('one game');
      /* Teams only on one game: a side and its total make two legs at most, so Safe is that pair or
         says why, and every bigger level says there are too few, "that DraftKings' betslip can take" exactly where
         the audit's own count has legs on the game left out for want of an id at their line (on a Sunday morning
         an early game's spread and total are nflverse's numbers, where DraftKings' ids are at its own: the props
         job's refused run of 18 October 2026, issue #290, which the old wording failed) */
      d.querySelector('#pbPanel [data-pb-mix="teams"]').click();
      const r1=hold('one game, teams only'), idP1=qualAud([one],U()).noId>0?' that DraftKings’ betslip can take':'';
      const few1=new RegExp(`^(Only [12] legs?|No legs) on your picks${idP1}: tick more games or bet types\\.$`);
      chk(r1.tiers.every(t=>t.n===2&&t.legs?t.legs.filter(l=>l.stat==='total').length===1&&t.legs.filter(l=>l.stat!=='total').length===1:(!t.legs&&few1.test(t.why))),'one game\'s team bets did not make at most a side and its total, or a level too big for them did not say there are too few legs: '+r1.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));
      d.querySelector('#pbPanel [data-pb-games="all"]').click(); d.querySelector('#pbPanel [data-pb-mix="all"]').click(); }
    setKinds([]); { const r0=F('getPbTiers')(); chk(r0.tiers.every(t=>!t.legs&&/No bet types ticked/.test(t.why)),'with no bet type ticked the tiers did not say so'); }
    setKinds(KINDS); F('renderPb')();
    /* ---- the same on made-up lines: every player leg kind and the totals in play ---- */
    { const cw=F('currentWeek')(), keepM=JSON.stringify(PAY.mkt[String(cw)]||null), keepT=S.sched.map(g=>[g.tov,g.tou]);
      const M=(PAY.mkt[String(cw)]=PAY.mkt[String(cw)]||{}); let nL=0;
      /* (app v125) the made-up lines stand alone: the week's published read cleared (put back below), so a planted main
         line is not one the read has DraftKings at another number for (rule (c)) */
      unbake(games.map(g=>g.id));
      games.forEach((g,gi)=>{ if(gi%2===0){ g.tov=-105; g.tou=-115; } else if(gi%4===1){ g.tov=100; g.tou=100; } else { g.tov=110; g.tou=105; }
        const ro=rosterFor(g,false);
        for(const tm in ro) ro[tm].players.forEach((x,i)=>{ if(!x.starter) return;
          for(const l of statLines(x)){ if(l.prob||!(l.mu>2)) continue;
            /* every other starter's line well under his projection (an over the model likes), the rest well over it (an under) */
            const ln=(i%2?Math.floor(l.mu*1.25):Math.floor(l.mu*0.8))+0.5;
            ((M[x.pl.id]??={})[l.stat])={line:ln,over:-112,under:-108,n:x.pl.n,g:g.id}; nL++; } }); });
      /* (app v109) the pull reads DraftKings' id with each price it buys: a made-up table of them, an id
         for every priced line of the week (the made-up ones among them), in place of the payload's own,
         so every rule below still meets player legs and totals a suggestion may take */
      const keepDk=F('PAY').dk; dkSet(dkFixture(cw,'M'));
      for(const [m,ks] of [['all',KINDS],['teams',['ml','ats','total']],['players',['over','under']],['overs',['over']],['unders',['under']],['totals',['total']]]){ setKinds(ks); hold('made-up lines, '+m); }
      /* one game, players only: every leg of a tier shares that game, so the tier's chance and
         price are worked by the copula's draws and hold() holds them to parlayProb and parlayDec
         on correlated legs (legs from different games are a plain product, the same on any
         number of draws, so the week's own tiers cannot tell a short cut). The game is the one
         with the most made-up player lines on file */
      if(games.length){
        const plLegs=g=>F('pricedLegs')([g],true).filter(l=>!isG(l)).length;
        const g1=[...games].sort((a,b)=>(plLegs(b)-plLegs(a))||String(a.id).localeCompare(String(b.id)))[0];
        U().off=games.filter(g=>g.id!==g1.id).map(g=>g.id); setKinds(['over','under']);
        const r1=hold(`made-up lines, one game (${g1.a} @ ${g1.h}), players only`);
        corrTiers=r1.tiers.filter(t=>t.legs&&pp(t.legs).pairs.length>0).length;
        /* a game with a dozen made-up lines on starters always has two that move together */
        W.coverage(plLegs(g1)<12||corrTiers>0,`one game's made-up player lines (${plLegs(g1)} of them) built no tier with legs that move together, so nothing holds a same-game tier to parlayProb`);
        U().off=[]; }
      setKinds(KINDS);
      const rA=F('getPbTiers')();
      W.coverage(!games.length||rA.tiers.some(t=>t.legs&&t.legs.some(l=>!isG(l))),'with made-up lines on every starter no tier has a player leg');
      /* the sets on the made-up lines: every player leg kind in play on each prime-time game */
      const setsM=holdSets('made-up lines');
      /* M6 (app v111). The levels' locks, New legs and Reset are gone (held at the top of M). In their
         place each leg has an Add of its own, on the Top 50 lines and on every set: it puts that leg alone
         into the builder by the builder's own toggle (toggleLeg, so it is priced as a game page's tick is),
         reads Added while it is in, keeps the focus, and a second press takes it out; at least 44px. A set's
         Add to builder puts exactly its legs in the builder on the Bet amount, the builder showing its chance
         and paying what it said. On the made-up lines, so the list has player legs to add */
      { const keepP=JSON.stringify(S.parlay||{}), keepB=S.bookPrice, keepS=S.stake; let addSaid=[];
        try{
          const tryAdd=(box,lab)=>{ S.parlay={}; S.bookPrice=null; F('renderParlay')();
            const b0=d.querySelector(`${box} [data-pb-leg]`); if(!b0) return false;
            const key=b0.dataset.pbLeg, k=b0.dataset.k, side=b0.dataset.side, main=b0.dataset.main==='1', sel=`${box} [data-pb-leg="${key}"][data-k="${k}"][data-side="${side}"]`;
            chk(w.getComputedStyle(b0).minHeight==='44px'&&w.getComputedStyle(b0).minWidth==='44px',`${lab}: a leg's own Add is not 44px: ${w.getComputedStyle(b0).minHeight} by ${w.getComputedStyle(b0).minWidth}`);
            b0.focus(); b0.click();
            const L=S.parlay[key], b1=d.querySelector(sel);
            chk(Object.keys(S.parlay).length===1&&!!L&&String(L.k)===k&&L.side===side&&!!L.main===main&&d.querySelectorAll('#parlayBody tr.legrow').length===1,`${lab}: a leg's Add did not put exactly that leg in the builder: ${JSON.stringify(Object.keys(S.parlay))}`);
            chk(!!b1&&b1.getAttribute('aria-pressed')==='true'&&b1.textContent==='Added'&&/^Remove .+, from the builder$/.test(b1.getAttribute('aria-label')||'')&&d.activeElement===b1,`${lab}: once added, the leg's Add does not read Added, pressed, named to remove it, with the focus on it`);
            /* the builder's own toggle: the same leg, the same price, as a tick on its game page gives; a leg of a
               set past its lock (2 hours before its kickoff, by the page's clock) goes in as the set locked it */
            const gEl=b0.closest('[data-sp-game]'), tEl=b0.closest('[data-pb-tier]'), gS=gEl&&S.sched.find(g=>g.id===gEl.dataset.spGame);
            if(gS&&tEl&&w.eval('Date.now()')>=kickAud(gS)-7200e3){ const t=(F('spShown')(gS).tiers||[]).find(x=>x&&x.id===tEl.dataset.pbTier), sl=t&&t.legs&&t.legs.find(l=>l.key===key&&String(l.k)===k&&l.side===side);
              chk(!!sl&&['gid','pid','stat','k','side','main','p','price','src','label','name'].every(f=>JSON.stringify(L[f])===JSON.stringify(sl[f])),`${lab}: the Add on a leg of a locked set did not put it in the builder as the set locked it: ${JSON.stringify(L)} against ${JSON.stringify(sl)}`); }
            else { const viaAdd=JSON.stringify(L); S.parlay={}; F('toggleLeg')(key,+k,S.sched.find(g=>g.id===key.split('|')[0]),side,main);
              chk(JSON.stringify(S.parlay[key])===viaAdd,`${lab}: the leg's Add did not put it in the builder as the builder's own toggle does: ${viaAdd} against ${JSON.stringify(S.parlay[key])}`); }
            F('renderParlay')(); const b2=d.querySelector(sel); if(b2){ b2.focus(); b2.click(); }
            const b3=d.querySelector(sel);
            chk(!S.parlay[key]&&!!b3&&b3.getAttribute('aria-pressed')==='false'&&b3.textContent==='Add'&&d.activeElement===b3,`${lab}: a second press of the leg's Add did not take it out of the builder, or lost the focus`);
            addSaid.push(lab); return true; };
          /* (app v113 to v129) the empty builder pointed to the list by its length; (app v130, the owner's call of 22
             October 2026: no descriptions) it says "No legs yet." alone */
          { S.parlay={}; S.bookPrice=null; F('renderParlay')(); const tx=(d.getElementById('parlayBody')||{textContent:''}).textContent.replace(/\s+/g,' ');
            W.wording(tx.includes('No legs yet.')&&!/Open a game, click a player|or add a parlay from Suggested Parlays|Each leg lands here/.test(tx),`the empty builder does not say "No legs yet." alone: "${tx.slice(0,240)}"`); }
          W.coverage(tryAdd('#pbPanel','a Top 30 line'),'with made-up lines on every starter the Top 30 lines have no line to add');
          /* (app v112) the sets with spOn stood in (spAllOn): the Add is held on a set whichever night the tab shows */
          spAllOn(()=>{ F('renderParlay')();
          if(setsM.length&&d.querySelector('#spPanel [data-pb-leg]')) tryAdd('#spPanel','a set\'s leg');
          /* a set's Add to builder: exactly its legs, on the Bet amount, priced as the set was */
          const S0=setsM.find(x=>x.s.tiers.some(t=>t.legs)), t=S0&&[...F('spShown')(S0.g).tiers].reverse().find(x=>x.legs);
          if(t){ const g=S0.g, fid=`${g.id}:${t.id}`;
            S.parlay={'stale|p|x':{gid:'stale',pid:'p',stat:'x',k:1,side:'over',name:'Stale',week:cw,p:0.5,price:-110}}; S.stake=37.5; F('save')(); F('renderParlay')();
            const btn=d.querySelector(`#spPanel [data-sp-add="${fid}"]`);
            chk(!!btn&&payOk(d.querySelector(`#spPanel [data-sp-game="${g.id}"] .pb-tier.${t.id} [data-pb-pay]`),37.5,t.dec),`the ${t.id} level of ${g.a} at ${g.h} does not pay $37.50 times its price on a $37.50 Bet amount`);
            if(btn){ btn.focus(); btn.click(); }
            const keys=Object.keys(S.parlay), body=d.getElementById('parlayBody').textContent.replace(/\s+/g,' '), pS=d.getElementById('pStake'), po=d.querySelector('#parlayBody .payout');
            chk(keys.length===t.legs.length&&t.legs.every(l=>S.parlay[l.key]&&S.parlay[l.key].k===l.k&&S.parlay[l.key].side===l.side&&!!S.parlay[l.key].main===!!l.main),'a set\'s Add to builder did not put exactly its legs in the builder');
            chk(body.includes(`${t.legs.length}-leg parlay`)&&body.includes((t.corr*100).toFixed(1)+'%'),'the builder does not show the set\'s chance after Add to builder');
            chk(S.stake===37.5&&!!pS&&pS.value==='37.50'&&!!po&&po.textContent==='$'+(37.5*t.dec).toFixed(2),`a set's Add to builder did not carry the Bet amount: the builder is on ${pS?pS.value:'no stake'} and pays ${po?po.textContent:'nothing'}, the set $${(37.5*t.dec).toFixed(2)} on $37.50`);
            const b2=d.querySelector(`#spPanel [data-sp-add="${fid}"]`);
            chk(!!b2&&/In the builder/.test(b2.textContent)&&d.activeElement===b2,'the set does not say it is in the builder, or the focus left its Add to builder');
            addSaid.push(`${t.label} of ${g.a} at ${g.h} added whole`); }
          else W.coverage(false,'with made-up lines no prime-time game of the week built a level to add to the builder (M10 holds it on a made-up game)'); });
        } finally { S.parlay=JSON.parse(keepP); S.bookPrice=keepB; S.stake=keepS; F('save')(); F('renderParlay')(); }
        console.log(`M6. each leg's own Add: ${addSaid.join('; ')||'nothing to add'}`); }
      chk(!F('pricedLegs')(games,true).some(l=>l.stat==='total')&&!F('pricedLegs')(games).some(l=>l.stat==='total'),'a game total is among the legs the game pages\' hands or the Elo picks are built from');
      /* only Game total ticked, every total priced (-105/-115, +100/+100 with no margin, +110/+105
         with less than none): every level a game makes legs for is built, of totals only, each a
         market leg; under All on the same prices the legs with an edge fill every level, so no total */
      { setKinds(['total']); const rT=F('getPbTiers')(), nT=new Set(F('pbPool')(games).mkt.map(l=>l.gid)).size;
        chk(rT.tiers.every(t=>t.n>nT?!t.legs:(!!t.legs&&t.legs.every(l=>l.stat==='total'&&l.market)&&t.mkt===t.n&&!t.thin)),
          'with only Game total ticked and every total priced, a level was not built of totals alone: '+rT.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));
        hold('made-up lines, Game total alone');
        setKinds(KINDS); const rAll=F('getPbTiers')();
        chk(rAll.tiers.every(t=>!t.legs||!t.mkt||F('pbTier')(SPEC.find(s=>s[0]===t.id),{...F('pbPool')(games),mkt:[]},new Map())===null),'under All a level took a total though the legs with an edge make it'); }
      /* a total never stands where a leg with an edge could (the second review's case): two thin
         moneylines on two games and three totals at -120, both moneylines and one total landing
         22%, under Medium's 25%, where one moneyline and two totals clear it. Medium and Aggressive
         keep both moneylines and take only the totals left to fill */
      { const wk=F('currentWeek')(), mk=(g,o)=>({gid:g,week:wk,k:0,main:true,src:'real',grp:'TEAM',pos:'Game',...o});
        const thinL=[mk('gA',{key:'gA|team:AAA|ml',pid:'team:AAA',stat:'ml',side:'over',team:'AAA',name:'AAA',label:'To win',p:0.93,price:-1000,thin:true}),
          mk('gB',{key:'gB|team:BBB|ml',pid:'team:BBB',stat:'ml',side:'over',team:'BBB',name:'BBB',label:'To win',p:0.46,price:130,thin:true})];
        const tots=['gA','gB','gC'].map(g=>mk(g,{key:g+'|game|total',pid:'game',stat:'total',side:'over',k:44.5,team:'X'+g,name:g+' total',label:'Over 44.5 points',p:0.5217,price:-120,thin:false,market:true}));
        for(const id of ['med','aggr']){ const s=SPEC.find(x=>x[0]===id), r=F('pbTier')(s,{pref:[],thin:thinL,mkt:tots},new Map());
          chk(!!r&&r.legs.filter(l=>l.stat==='ml').length===2&&r.mkt===s[2]-2,`a total took the place of a moneyline with an edge on the ${id} level: ${r?r.legs.map(l=>l.name+' '+l.label).join(', '):'none'}`); } }
      /* market + form gates the player legs once the Elo tab is on the page */
      w.eloLoaded=()=>false; w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()');
      chk(F('getPbTiers')().tiers.every(t=>!t.legs||t.legs.every(isG))&&F('getPbTop')().rows.every(isG)&&F('spGames')().every(g=>F('spSet')(g.id).tiers.every(t=>!t.legs||t.legs.every(isG))),'before the Elo files load a player leg is suggested, on a level, the Top 30 lines or a set');
      w.eloLoaded=()=>true; w.eloAltP=()=>0.01; w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()');
      chk(F('pbPool')(games).pref.every(isG),'a player leg market + form rates under the book is not marked thin');
      hold('market + form against every player leg'); holdSets('market + form against every player leg');
      delete w.eloAltP; delete w.eloLoaded; w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()');
      /* a game that kicks off leaves the list and every tier */
      if(games.length>1){ const g0=games[0], k0=F('kickoff')(g0).getTime(), off=k0+60e3-w.Date.now(), now0=w.Date.now;
        w.Date.now=()=>now0.call(w.Date)+off; F('renderParlay')();
        chk(!d.querySelector(`#pbPanel [data-pb-game="${g0.id}"]`)&&F('getPbTiers')().tiers.every(x=>!x.legs||x.legs.every(l=>l.gid!==g0.id))&&F('getPbTop')().rows.every(l=>l.gid!==g0.id)
          &&!F('spGames')().some(g=>g.id===g0.id)&&!d.querySelector(`#spPanel [data-sp-game="${g0.id}"]`)&&![...d.querySelectorAll('#pbPanel [data-pb-leg]')].some(b=>b.dataset.pbLeg.split('|')[0]===g0.id),
          'a game that has kicked off is still on the games list, in a level, on the Top 30 lines or given a set');
        w.Date.now=now0; F('renderParlay')();
        chk(!!d.querySelector(`#pbPanel [data-pb-game="${g0.id}"]`),'the game did not come back with the clock'); }
      if(keepM==='null') delete PAY.mkt[String(cw)]; else PAY.mkt[String(cw)]=JSON.parse(keepM);
      S.sched.forEach((g,i)=>{ g.tov=keepT[i][0]; g.tou=keepT[i][1]; if(g.tov==null) delete g.tov; if(g.tou==null) delete g.tou; });
      dkSet(keepDk); rebake();
      console.log(`M. Top ${TOP_N_AUD} lines: ${topLists} lists held on as many sets of ticks, ${topRows} rows in their two parts (${topRows-topOther} Value picks, ${topOther} other lines after them, the totals after every thin-edge line, ${topTotAfter} lists with both; ${topNoValue} lists with no Value pick; each bet once, ${topSame} main lines a ladder rung was left out for, ${topSameCut} of them past the ${TOP_N_AUD}th; M12 holds both on made-up games); Suggested Parlays: ${setsBuilt} sets of the week's prime-time games, ${setLevels} levels built and ${setsSaid} that said why, ${setsLocked} drawn locked, ${setThinSeen} cards with a thin leg and ${setMktSeen} with a total drawn quiet (no line on either); ${nightSaid.join('; ')}; the Sunday slot: ${slotsBuilt} sets held, ${slotLevels} levels built, ${slotsLocked} drawn locked or under way${slotsUnderway?` (${slotsUnderway} under way, its live build not held: the page builds none then)`:''}${slotsNone?`, ${slotsNone} under way with the site's set not published in time (its line alone)`:''}; ${slotSaid.join('; ')}`);
      console.log(`M. suggested parlays: ${built} tiers built and ${said} that said why, ${legsSeen} legs, ${thinSeen} thin, ${corrTiers} of one game's tiers on legs that move together, over this week's ${games.length} games and ${nL} made-up player lines`); }
    /* the thin-edge line is gone (app v130, the owner's call of 22 October 2026: "i dont want any descriptions
       anywhere"): no card says why a leg is not a Value pick, for any kind of leg, with market + form on or off, as it
       did until then on a card not drawn quiet. Since app v112 (the owner's call of 17 October 2026, "reverse tags")
       the marks are reversed: a Value pick (a preferred leg, thin false and not a total) wears Value, a thin leg and a
       total no mark at all, and an Elo pick's legs (pricedLegs', which say neither) none; worked on cards of the audit's
       own (blocking: made-up data) */
    { const C=F('pbTierCard'), base={gid:'gT',name:'Thin',label:'a leg',price:-110,p:0.53,week:F('currentWeek')(),thin:true,side:'over',k:0,main:false};
      const tm={...base,key:'gT|team:AAA|ml',pid:'team:AAA',stat:'ml',grp:'TEAM'}, pl={...base,key:'gT|p1|receiving_yards',pid:'p1',stat:'receiving_yards',grp:'WR'};
      const line=legs=>{ const x=d.createElement('div'); x.innerHTML=C({id:'safe',label:'Safe',n:legs.length,floor:0,legs,corr:0.3,dec:3,thin:legs.filter(l=>l.thin).length});
        const p=x.querySelector('.pb-thin'); return p?p.textContent.replace(/\s+/g,' '):''; };
      const MF=/market \+ form/;
      const cases=[];
      for(const form of [false,true]){
        if(form) w.eloLoaded=()=>true; else delete w.eloLoaded;
        cases.push([`form ${form?'on':'off'}, a team bet`,line([tm]),t=>t==='']);
        cases.push([`form ${form?'on':'off'}, two team bets`,line([tm,{...tm,key:'gU|team:BBB|ats',gid:'gU',stat:'ats'}]),t=>t==='']);
        cases.push([`form ${form?'on':'off'}, a player leg`,line([pl]),t=>t===''&&!MF.test(t)]);
        cases.push([`form ${form?'on':'off'}, a team bet and a player leg`,line([tm,pl]),t=>t==='']);
        cases.push([`form ${form?'on':'off'}, a team bet and two player legs`,line([tm,pl,{...pl,key:'gT|p2|receptions',pid:'p2',stat:'receptions'}]),t=>t==='']);
        cases.push([`form ${form?'on':'off'}, no thin leg`,line([{...tm,thin:false},{...pl,thin:false}]),t=>t==='']); }
      delete w.eloLoaded; w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()');
      for(const [lab,t,ok] of cases) chk(ok(t),`a card with no thin-edge line any more still draws one, ${lab}: "${t}"`);
      /* the Value mark, reversed (app v112): pbIsValue on its own cases, then the marks a card draws */
      const isV=w.eval("typeof pbIsValue==='function'?pbIsValue:null"); let nMark=0;
      chk(!!isV,'the page has no reading of a Value pick (pbIsValue)');
      if(isV) for(const [l,want,lab] of [[{thin:false},true,'a preferred leg'],[{thin:true},false,'a thin leg'],[{thin:false,market:true},false,'a game total'],[{},false,'a leg that says neither (an Elo pick\'s)'],
          [{thin:undefined},false,'thin undefined'],[{thin:0},false,'thin 0'],[null,false,'no leg'],[{thin:false,market:false},true,'a preferred leg, market false']]){ nMark++;
        chk(isV(l)===want,`pbIsValue on ${lab} says ${isV(l)}, not ${want}`); }
      const tot=(gid,side)=>({key:gid+'|game|total',gid,pid:'game',stat:'total',k:44.5,side,main:false,price:-110,p:0.5,week:F('currentWeek')(),thin:false,market:true,name:gid+' total',label:(side==='over'?'Over':'Under')+' 44.5 points',grp:'TEAM'});
      const card=(legs,o)=>{ const x=d.createElement('div'); x.innerHTML=C({id:'safe',label:'Safe',n:legs.length,floor:0,legs,corr:0.3,dec:3,thin:legs.filter(l=>l.thin).length,mkt:legs.filter(l=>l.market).length},o); return x; };
      const marks=x=>[...x.querySelectorAll('.pb-legs li')].map(li=>{ const v=li.querySelectorAll('.pb-valmark'); return v.length===1&&v[0].textContent==='Value'?'V':v.length?'?':'-'; }).join('');
      const noOld=x=>!x.querySelector('.pb-thinmark')&&!/thin edge|no edge/i.test(x.textContent);
      { const vT={...tm,thin:false,key:'gV|team:VVV|ml',gid:'gV',pid:'team:VVV'}, x=card([vT,pl,tot('gW','over')]), th=[...x.querySelectorAll('p.pb-thin')].map(p=>p.textContent.replace(/\s+/g,' ')); nMark++;
        chk(marks(x)==='V--'&&noOld(x)&&!th.length&&!/not (a )?Value picks?|own chance with its margin out/.test(x.textContent),
          `a card of a Value pick, a thin leg and a total does not mark the Value pick alone (${marks(x)}), still speaks of a thin edge or no edge, or still draws a line on them: ${th.join(' / ')}`); }
      { const x=card([{...tm,thin:false},tot('gW','over'),tot('gX','under')],{mktWhy:'this game’s other legs do not make a parlay of this size'}), th=[...x.querySelectorAll('p.pb-thin')].map(p=>p.textContent.replace(/\s+/g,' ')); nMark++;
        chk(marks(x)==='V--'&&noOld(x)&&!th.length&&!/not (a )?Value picks?|own chance with its margin out/.test(x.textContent),
          `a card with two totals (handed the old reason) still draws a line on why they are not Value picks, or marks one: ${marks(x)} ${th.join(' / ')}`); }
      /* (app v113, the owner's "get rid of all the long paragraph description stuff") a Suggested Parlays set's card was
         quiet (pbTierCard's o.quiet), and since app v130 every card is: drawn with o.quiet or without, it draws no line on
         why a leg is not a Value pick or why a total is there, its marks the same, and the est. line on a leg priced from
         DraftKings' line read on ESPN stays, in its few words (a price that is an estimate is money) */
      { const vT={...tm,thin:false,key:'gV|team:VVV|ml',gid:'gV',pid:'team:VVV'}, eL={...pl,key:'gT|p3|receiving_yards',pid:'p3',name:'Est',thin:true,src:'dkline',espn:{at:'2026-10-17T12:00:00.000Z'}};
        const loud=card([vT,pl,tot('gW','over')],{mktWhy:'this game’s other legs do not make a parlay of this size'}), q1=card([vT,pl,tot('gW','over')],{quiet:true,mktWhy:'this game’s other legs do not make a parlay of this size'}), q2=card([vT,pl,eL,tot('gW','over'),tot('gX','under')],{quiet:true,mktWhy:'this game’s other legs do not make a parlay of this size'});
        const lines=x=>[...x.querySelectorAll('p.pb-thin')].map(p=>({cls:[...p.classList].join('.'),tx:p.textContent.replace(/\s+/g,' ')}));
        const why=/not (a )?Value picks?: (the model rates|(it is|they are) here because)/; nMark+=3;
        chk(marks(loud)==='V--'&&noOld(loud)&&!lines(loud).length&&!why.test(loud.textContent),`a card drawn without o.quiet, with a thin leg and a total, still draws a line on them (no card does since app v130), or marks them otherwise (${marks(loud)}): ${JSON.stringify(lines(loud))}`);
        chk(marks(q1)==='V--'&&noOld(q1)&&!lines(q1).length&&!why.test(q1.textContent),`a quiet card (a set's) of a Value pick, a thin leg and a total still draws a line on them, or marks them otherwise (${marks(q1)}): ${JSON.stringify(lines(q1))}`);
        { const wantE=`Price est. from DraftKings’ line, read ${etAud(Date.parse(eL.espn.at))}.`;
          chk(marks(q2)==='V----'&&lines(q2).length===1&&lines(q2)[0].cls==='pb-thin.pb-espnline'&&/^Price est\. from DraftKings’ line/.test(lines(q2)[0].tx)&&!why.test(q2.textContent),
            `a quiet card with a leg priced from DraftKings' line read on ESPN does not keep its est. line alone: ${JSON.stringify(lines(q2))}`);
          W.wording(!!lines(q2)[0]&&lines(q2)[0].tx===wantE,`the est. line reads "${lines(q2)[0]&&lines(q2)[0].tx}", not "${wantE}"`); } }
      /* an Elo pick's legs come from pricedLegs, with no thin or market: none is marked, on the Elo picks' own card */
      { const {thin:_a,...eT}=tm, {thin:_b,...eP}=pl, x=card([eT,eP],{chance:0.4,chanceBy:'Elo chance',by:'Elo',kind:'elo',add:'data-pb-elo-add="elo2"',legP:l=>l.p}); nMark++;
        chk(marks(x)==='--'&&noOld(x)&&!x.querySelector('p.pb-thin'),`an Elo pick's legs are marked (${marks(x)}), or its card speaks of a thin edge or a Value pick`); }
      console.log(`M2. thin edge: no line under a tier for any kind of leg, ${cases.length} cases; the Value mark: ${nMark} cases (a Value pick alone marked, never a thin leg, a total or an Elo pick's leg; every card quiet, drawing neither line and keeping its est. line)`); }
    /* no player prices on file yet (before the week's pulls): Players only says so on every tier,
       and so does a mix with team bets where a tier cannot be filled; the note does not repeat it */
    if(games.length){ const cw=F('currentWeek')(), keepO=JSON.stringify(S.odds||{}), keepM=JSON.stringify(PAY.mkt[String(cw)]||null);
      for(const g of games){ if(S.odds) delete S.odds[g.id]; }
      /* (app v125) and no published read of their lines: the games' PAY.espn entries cleared (unbake), put back below */
      delete PAY.mkt[String(cw)]; U().off=[]; unbake(games.map(g=>g.id));
      const NO_PL=noPlAud(games.map(g=>g.id)), noPlLow=low1(NO_PL);
      setKinds(['over','under']); const rP=hold('no player prices, players only'); F('renderPb')();
      const tx=d.getElementById('pbPanel').textContent.replace(/\s+/g,' ');
      chk(!F('pricedLegs')(games,true).some(l=>!isG(l))&&rP.noPlayerPrices&&rP.tiers.every(t=>!t.legs&&t.why===NO_PL),
        'with no player price on file, Players only does not say so on every tier: '+rP.tiers.map(t=>t.why).join(' / '));
      chk(!/tick more/.test(tx)&&!/No line on your picks has a real sportsbook price/.test(tx),'with no player price on file, Players only still says to tick more, or repeats it in the note');
      setKinds(KINDS); const rA=hold('no player prices, all');
      /* each prime-time set: no player leg, and each empty level says when its game's player prices come */
      { const sets=holdSets('no player prices');
        chk([...sets,...(sets.slot?[sets.slot]:[])].every(({s})=>s.tiers.every(t=>!t.legs||t.legs.every(isG))),'with no player price on file a set (a night\'s or the Sunday slot\'s) holds a player leg'); }
      chk(rA.noPlayerPrices&&rA.tiers.every(t=>t.legs?t.legs.every(isG):t.why.endsWith(', and '+noPlLow)),'with no player price on file, All builds a player leg, or an empty tier does not say no player prices are on file: '+rA.tiers.map(t=>t.why||'built').join(' / '));
      /* a level built with no player price on file says nothing of the missing player legs, so the
         panel does, whenever one is built; and player bets with Game total build their levels from
         the totals, with that note */
      /* (app v130, the owner's call of 22 October 2026: no descriptions) the note is the state alone, the levels' own
         words: "No player lines yet (read Tue 8:07 AM ET)." (the list's p.pb-note, word for word) */
      const PL_NOTE=NO_PL, plNoted=()=>[...d.querySelectorAll('#pbPanel p.pb-note')].some(p=>p.textContent===PL_NOTE);
      F('renderPb')(); W.wording(plNoted()===(F('getPbTop')().rows.length>0),'with no player price on file and All ticked, the note that the list has no player lines is missing, or shows with no line listed');
      /* a level needs two legs, so only where two or more games have a priced total (a one-game
         Monday has one, and builds nothing) */
      setKinds(['over','under','total']); const rPT=hold('no player prices, player bets and Game total'), nTot=new Set(F('pbPool')(games).mkt.map(l=>l.gid)).size; F('renderPb')();
      chk((nTot<2||rPT.tiers.some(t=>t.legs))&&rPT.tiers.every(t=>!t.legs||t.legs.every(l=>l.market))&&F('getPbTop')().rows.every(l=>l.market),
        'with no player price on file, player bets and Game total do not build their levels, and list their lines, from the totals alone: '+rPT.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));
      W.wording(plNoted()===(F('getPbTop')().rows.length>0),'with no player price on file, player bets and Game total do not say the list has no player lines');
      setKinds(KINDS);
      /* All on one game: its team bets make two legs at most (a side and its total), so only Safe
         can be built, and every bigger level says both why: too few legs, and no player prices yet */
      U().off=games.slice(1).map(g=>g.id); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()'); const r1=hold('no player prices, all, one game');
      /* (the id phrase exactly where the audit's own count has legs on the game left out for want of an id, as above) */
      const idP3=qualAud([games[0]],U()).noId>0?' that DraftKings’ betslip can take':'', few3=new RegExp(`^(Only [12] legs?|No legs) on your picks${idP3}, and `), noPl1=low1(noPlAud([games[0].id]));
      chk(r1.tiers.every(t=>t.n===2&&t.legs?t.legs.every(isG):(!t.legs&&few3.test(t.why)&&t.why.endsWith(', and '+noPl1))),
        'with no player price on file, All on one game does not give both reasons on every tier: '+r1.tiers.map(t=>t.why||'built').join(' / '));
      U().off=[];
      S.odds=JSON.parse(keepO); if(keepM==='null') delete PAY.mkt[String(cw)]; else PAY.mkt[String(cw)]=JSON.parse(keepM); rebake();
      w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()'); F('renderPb')();
      console.log(`M3. no player prices yet: Players only says so on all 4 tiers; All ${rA.tiers.filter(t=>t.legs).length} built on team bets, ${rA.tiers.filter(t=>!t.legs).length} saying why; All on one game gives both reasons on all 4`); }
    /* M4. every level shows a parlay of its size whenever the picks make that many legs. Held on
       made-up games standing in for the week's (pbGames and pricedLegs stood in for, and PAY.dk by a
       made-up id table giving every leg its id, so the levels are built as before ids), so it holds
       on any day of the week, a lone Monday game included: ten games to come with only Spread
       ticked, as the owner had it. Eight have a preferred cover, priced so that the likeliest legs
       and the best-paying ones are not the same: four the model rates 57% to 58.5% at -115 (3.5 to
       5 points over the price) on the odd games, four it rates 46.5% to 48% at +140 (4.8 to 6.3
       points over) on the even ones, so a fallback chosen by the best return under the floor, or
       by the first games on the list, takes other legs than the likeliest. Two more are thin, 59%
       and 58.8% at -135 (under 2 points over), likelier than any preferred leg. Every game has a
       moneyline at 75% that must never show (Moneyline is not ticked), and one cover is under the
       book. So three legs land at most 20.3% and four 11.8% at any count of thin legs, short of
       Medium's 25% and Aggressive's 12%, and the four likeliest preferred with the best-paying
       +140 land 5.3%, over Extreme's 5%. Each tier is held to a brute force over every parlay of
       its size on the pool, worked with the builder's own sums (legs in different games: a plain
       product, exact): Safe the likeliest pair; Medium and Aggressive the likeliest of their size
       with the fewest thin legs (the three and four likeliest -115 covers, 19.5% and 11.1%, though
       thin legs would land likelier and the +140 covers would return more), marked likeliest and
       ruled "the likeliest N legs" with no note, no parlay of their size clearing the floor;
       Extreme its best return over 5%, as before. Then three games ticked (Aggressive and Extreme
       too few legs, the only empties), and two preferred with two thin (the likeliest take as few
       thin legs as fill them). */
    { const cw=F('currentWeek')(), keepU4=JSON.stringify(U());
      /* the page's pbGames and pricedLegs, and its id table, kept in slots of their own and put back on every path */
      w.__m4Keep=w.eval('[pbGames, pricedLegs]'); const dkKeep4=F('PAY').dk;
      try{
      const G=Array.from({length:10},(_,i)=>({id:`2099_${String(cw).padStart(2,'0')}_A${i}_H${i}`,w:cw,a:'A'+i,h:'H'+i,d:`2099-01-0${1+(i%7)}`,t:'13:00'}));
      const leg=(g,team,stat,p,price)=>({key:`${g.id}|team:${team}|${stat}`,gid:g.id,pid:'team:'+team,stat,k:stat==='ml'?0:-3.5,side:'over',main:false,p,price,src:'real',mu:null,
        name:'Made-up '+team,pos:'Game',grp:'TEAM',team,opp:team===g.h?g.a:g.h,week:cw,label:stat==='ml'?'To win':'To cover -3.5'});
      /* each game's cover: the model's chance and the price (the even games pay more, the odd are likelier, the last two thin) */
      const COVER=[[0.48,140],[0.585,-115],[0.475,140],[0.58,-115],[0.47,140],[0.575,-115],[0.465,140],[0.57,-115],[0.59,-135],[0.588,-135]];
      w.__m4Games=G;
      w.__m4Legs=[...G.map((g,i)=>leg(g,g.h,'ats',COVER[i][0],COVER[i][1])),...G.map(g=>leg(g,g.a,'ml',0.75,-150)),leg(G[1],G[1].a,'ats',0.50,-150)];
      w.eval('pbGames=function(){ return window.__m4Games; }; pricedLegs=function(games){ return window.__m4Legs.filter(l=>(games||[]).some(g=>g.id===l.gid)).map(l=>({...l})); };');
      /* (app v109) DraftKings' ids for every made-up leg, at its own line, in place of the payload's own
         table (rule (c)), so the levels below are built as they were before ids: M9 takes some away */
      { const D={}; let n=0; for(const l of w.__m4Legs) for(const k of dkKeysOf(l)) ((D[l.gid]??={at:'2099-01-01T00:00Z'})[k]=`0AUDM4${++n}`);
        const T={[String(cw)]:D}; AUD_DK.add(T); dkSet(T); }
      const fits=F('pbFits'), order=F('pbOrder');
      const combos=(list,n)=>{ const out=[], rec=(i0,cur)=>{ if(cur.length===n){ out.push(cur.slice()); return; }
        for(let i=i0;i<list.length;i++){ if(!fits(cur,list[i])) continue; cur.push(list[i]); rec(i+1,cur); cur.pop(); } }; rec(0,[]); return out; };
      /* every parlay of n legs on the pool, worked as the builder works it: the likeliest with the
         fewest thin legs, the likeliest of all, how many clear the floor, and the best return of
         those with the fewest thin legs (the floor search's own order) */
      const brute=(pool,n,floor)=>{ const all=combos([...pool.pref,...pool.thin],n).map(c=>{ const L=order(c), pr=pp(L).corr, dec=pd(L.map(l=>({leg:l,ml:l.price})));
          return {pr,ev:pr*dec,thin:L.filter(l=>l.thin).length}; });
        const k=Math.min(...all.map(c=>c.thin)), clear=all.filter(c=>c.pr>=floor), kc=Math.min(...clear.map(c=>c.thin));
        return {n:all.length,k,likeliest:Math.max(...all.filter(c=>c.thin===k).map(c=>c.pr)),best:Math.max(...all.map(c=>c.pr)),clear:clear.length,
          bestRet:clear.length?Math.max(...clear.filter(c=>c.thin===kc).map(c=>c.ev)):null}; };
      const seen=[];
      const run4=(lab,off,want)=>{ U().k={ml:false,ats:true,total:false,over:false,under:false}; U().off=off.map(i=>G[i].id); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()');
        const r=F('getPbTiers')(), pool=F('pbPool')(G.filter(g=>!U().off.includes(g.id))), m=maxLegsOf([...pool.pref,...pool.thin]);
        chk(pool.pref.concat(pool.thin).every(l=>l.stat==='ats'&&l.p>=F('mlProb')(l.price)),`${lab}: a moneyline (not ticked) or a cover under the book is among the legs`);
        /* each level drawn by the card the sets draw theirs with (pbTierCard), held to what it says */
        const cardOf=t=>{ const x=d.createElement('div'); x.innerHTML=F('pbTierCard')(t); return x.firstElementChild; };
        for(const t of r.tiers){ const [,,n,floor]=SPEC.find(s=>s[0]===t.id), c=cardOf(t), got=t.legs?(t.likeliest?'likeliest':floor?'floor':'pair'):'empty';
          chk(got===want[t.id],`${lab}: the ${t.id} tier is ${got}, not ${want[t.id]}${t.why?': '+t.why:''}`);
          if(!t.legs){ chk(m<n&&t.why===`Only ${m} legs on your picks: tick more games or bet types.`&&!!c&&c.textContent.includes(t.why),`${lab}: the ${t.id} tier is empty with ${m} legs on the picks for its ${n}: ${t.why}`); continue; }
          const b=brute(pool,n,floor), tol=1e-12; seen.push(`${t.id} ${(t.corr*100).toFixed(1)}%${t.likeliest?' (likeliest)':''}`);
          chk(t.legs.length===n&&t.legs.every(l=>l.stat==='ats'&&!U().off.includes(l.gid))&&pp(t.legs).corr===t.corr&&pd(t.legs.map(l=>({leg:l,ml:l.price})))===t.dec,
            `${lab}: the ${t.id} tier is not ${n} ticked covers at the builder's own chance and price`);
          if(!floor) chk(!t.likeliest&&t.thin===b.k&&t.corr>=b.likeliest-tol,`${lab}: Safe lands ${(t.corr*100).toFixed(2)}% with ${t.thin} thin, not the likeliest pair (${(b.likeliest*100).toFixed(2)}% with ${b.k} thin)`);
          else if(t.likeliest) chk(b.clear===0&&t.thin===b.k&&t.corr>=b.likeliest-tol,
            `${lab}: the ${t.id} tier fell back to ${(t.corr*100).toFixed(2)}% with ${t.thin} thin legs: ${b.clear} of ${b.n} ${n}-leg parlays clear ${floor*100}%, the likeliest with ${b.k} thin lands ${(b.likeliest*100).toFixed(2)}%`);
          else chk(t.corr>=floor&&t.corr*t.dec>=b.bestRet-tol,`${lab}: the ${t.id} tier is not the best return over ${floor*100}% (${(t.corr*t.dec).toFixed(4)} against ${b.bestRet})`);
          if(t.likeliest) chk(b.best<floor,`${lab}: a ${n}-leg parlay lands ${(b.best*100).toFixed(2)}%, over the ${t.id} floor, and the tier fell back`);
          chk(!!c&&c.querySelectorAll('.pb-legs li').length===n&&c.textContent.includes(`${(t.corr*100).toFixed(0)}%`)&&c.textContent.includes(F('fmtML')(F('decToML')(t.dec))),`${lab}: the ${t.id} card does not show its legs, chance and price`);
          if(c) cardWords(c,t,lab); }
        /* the same picks always give the same parlays */
        w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()'); const r2=F('getPbTiers')();
        chk(r2.tiers.map(t=>t.legs?t.legs.map(pbIdOf).join():t.why).join('~')===r.tiers.map(t=>t.legs?t.legs.map(pbIdOf).join():t.why).join('~'),`${lab}: the same picks built other parlays the second time`);
        return {r}; };
      const A=run4('ten made-up games, Spread only',[],{safe:'pair',med:'likeliest',aggr:'likeliest',xtrm:'floor'});
      chk(['med','aggr'].every(id=>{ const t=A.r.tiers.find(x=>x.id===id); return t&&t.legs&&!t.thin; }),'ten made-up games: the likeliest 3 or 4 legs took a thin leg the preferred legs did not need');
      /* the likeliest 3 and 4 are the -115 covers on the odd games; the made-up prices do what they
         are for: the best return of each size, under the floor, is the +140 covers instead, so a
         fallback chosen by return (or by the first games on the list) cannot pass for the likeliest */
      { const poolA=F('pbPool')(G), teams=c=>c.map(l=>l.team).sort().join();
        for(const [id,n,want] of [['med',3,'H1,H3,H5'],['aggr',4,'H1,H3,H5,H7']]){ const t=A.r.tiers.find(x=>x.id===id);
          chk(!!t&&!!t.legs&&teams(t.legs)===want&&Math.abs(t.corr-t.legs.reduce((a,l)=>a*l.p,1))<1e-12,`ten made-up games: ${id} is ${t&&t.legs?teams(t.legs):'empty'}, not the likeliest covers ${want}`);
          const byRet=combos(poolA.pref,n).map(c=>({c,ev:c.reduce((a,l)=>a*l.p*F('mlToDec')(l.price),1)})).sort((a,b)=>b.ev-a.ev)[0];
          chk(!!byRet&&teams(byRet.c)!==want,`ten made-up games: the best-paying ${n} covers are the likeliest too (${byRet?teams(byRet.c):'none'}), so the case cannot tell a fallback by return from the likeliest`); } }
      run4('three made-up games, Spread only',[3,4,5,6,7,8,9],{safe:'pair',med:'likeliest',aggr:'empty',xtrm:'empty'});
      const C=run4('two preferred and two thin, Spread only',[2,3,4,5,6,7],{safe:'pair',med:'likeliest',aggr:'likeliest',xtrm:'empty'});
      chk(C.r.tiers.filter(t=>t.legs).map(t=>t.thin).join()==='0,1,2','two preferred and two thin: the likeliest take more thin legs than fill them: '+C.r.tiers.filter(t=>t.legs).map(t=>t.id+' '+t.thin).join(', '));
      /* M9. DraftKings' betslip (app v109): wherever the payload carries ids, a level takes only legs
         DraftKings has an id for at their own line, so every leg it suggests goes on DraftKings' betslip.
         On the made-up games, with a made-up id table of their own in place of PAY.dk (rule (c)): ids for
         some legs and not others, and decoys under the keys a wrong rule would read (a cover at another
         number and the other team's, the other team's money line, a main line's other side and another
         number, a rung at its own number, the anytime touchdown for a 2+ rung). Worked here on its own:
         each leg's id by the audit's key rule (dkIdAud, each case's answer written out beside it), and what
         the panel takes with no ids at all (PAY.dk taken away, a payload baked before them, which suggests
         as before) as the reference: the pool is that pool less the legs with no id, the count the panel
         gives of those left out is theirs, and the levels are what the reference builds from the legs with
         an id alone. Then no player id at all: no level has a player leg, and the reason says so. Made-up
         data, so blocking (the wording warns) */
      { const keepU9=JSON.stringify(U()), imp9=a=>a>0?100/(a+100):-a/(-a+100), at9=(price,edge)=>({price,p:+(imp9(price)+edge).toFixed(4)});
        const pl=(g,pid,stat,o)=>({gid:g.id,pid,stat,side:'over',main:false,src:'real',mu:50,name:'Made-up '+pid,pos:'WR',grp:'WR',team:g.h,opp:g.a,week:cw,key:`${g.id}|${pid}|${stat}`,...o});
        const team9=[...G.map((g,i)=>[leg(g,g.h,'ats',COVER[i][0],COVER[i][1]),i%2===0]),...G.map((g,i)=>[{...leg(g,g.a,'ml',0.66,-150)},i<5])];
        const play9=[
          [pl(G[0],'aud-p1','receiving_yards',{k:64.5,main:true,...at9(-115,0.04),label:'Over 64.5 receiving yards'}),true],
          [pl(G[1],'aud-p1b','receiving_yards',{k:64.5,main:true,side:'under',...at9(-105,0.04),label:'Under 64.5 receiving yards'}),false],
          [pl(G[2],'aud-p2','receptions',{k:4.5,main:true,...at9(-110,0.04),label:'Over 4.5 receptions'}),false],
          [pl(G[3],'aud-p3','receiving_yards',{k:50,...at9(-150,0.04),label:'50+ receiving yards'}),true],
          [pl(G[4],'aud-p4','rushing_yards',{k:40,...at9(-130,0.04),label:'40+ rushing yards'}),true],
          [pl(G[5],'aud-p5','receiving_yards',{k:75,...at9(-120,0.04),label:'75+ receiving yards'}),false],
          [pl(G[6],'aud-p6','any_td',{k:1,mu:null,...at9(-110,0.04),label:'Scores a touchdown'}),true],
          [pl(G[7],'aud-p7','any_td',{k:2,mu:null,...at9(-110,0.04),label:'Scores 2+ touchdowns'}),false]];
        const L9=[...team9,...play9].map(x=>x[0]), want9=new Map([...team9,...play9].map(([l,y])=>[pbIdOf(l),y]));
        /* two totals, each with only one side's id */
        const tg=[G[8],G[9]], keepTg=tg.map(g=>[g.tot,g.tov,g.tou]); tg.forEach(g=>{ g.tot=44.5; g.tov=-110; g.tou=-110; });
        let nI=0; const T9={}, E=g=>(T9[g.id]??={at:'2099-01-01T00:00Z',glat:'2099-01-01T00:00Z'}), id=()=>'0AUDM9'+(++nI);
        G.forEach((g,i)=>{ if(i%2===0) E(g)[`team:${g.h}|ats|-3.5`]=id(); else { E(g)[`team:${g.h}|ats|-4.5`]=id(); E(g)[`team:${g.a}|ats|3.5`]=id(); }
          if(i<5) E(g)[`team:${g.a}|ml`]=id(); else E(g)[`team:${g.h}|ml`]=id(); });
        E(G[8])['game|total|over|44.5']=id(); E(G[9])['game|total|under|44.5']=id(); E(G[8])['game|total|under|45.5']=id();
        E(G[0])['aud-p1|receiving_yards|over|64.5']=id();
        E(G[1])['aud-p1b|receiving_yards|over|64.5']=id();
        E(G[2])['aud-p2|receptions|over|5.5']=id(); E(G[2])['aud-p2|receptions|under|4.5']=id();
        E(G[3])['aud-p3|receiving_yards|over|49.5']=id();
        E(G[4])['aud-p4|rushing_yards|over|39']=id();
        E(G[5])['aud-p5|receiving_yards|over|75']=id(); E(G[5])['aud-p5|receiving_yards|under|74.5']=id();
        E(G[6])['aud-p6|any_td']=id();
        E(G[7])['aud-p7|any_td']=id();
        const FIX9={[String(cw)]:T9}, FIX9t={[String(cw)]:Object.fromEntries(Object.entries(T9).map(([gid,e])=>[gid,Object.fromEntries(Object.entries(e).filter(([k])=>/^(team:|game\||at$|glat$)/.test(k)))]))};
        AUD_DK.add(FIX9); AUD_DK.add(FIX9t);
        const ids9=list=>list.map(pbIdOf).sort().join(), sig9=r=>r.tiers.map(t=>t.legs?t.legs.map(pbIdOf).join()+'@'+t.corr+'@'+t.dec:'empty').join('~');
        let nIn=0, nOut=0, nNone=0, nMoved=0, tiersSaid='';
        try{
          w.__m4Legs=L9; setKinds(KINDS); U().off=[];
          dkSet(FIX9); const has=l=>!!dkIdAud(l,FIX9);
          /* the audit's key rule against each case's answer: the cases are what they say */
          const wrong=L9.filter(l=>has(l)!==want9.get(pbIdOf(l)));
          chk(!wrong.length,`DraftKings' ids on the made-up legs: the audit's own rule reads ${wrong.map(l=>l.name+' '+l.label+(has(l)?' with':' without')+' an id').join(', ')}, against the case`);
          const tot9=side=>F('totalLeg')(G[8],side), tot9b=side=>F('totalLeg')(G[9],side);
          chk(has(tot9('over'))&&!has(tot9('under'))&&has(tot9b('under'))&&!has(tot9b('over')),'DraftKings\' ids on the made-up totals: the audit\'s own rule does not read one side of each');
          /* the reference: no ids at all, as a payload baked before them */
          dkSet(undefined); const pool0=F('pbPool')(G); setKinds(['over','under']); const rOld=F('getPbTiers')(); setKinds(KINDS);
          dkSet(FIX9); const pool1=F('pbPool')(G);
          const all0=[...pool0.pref,...pool0.thin];
          nIn=all0.filter(has).length; nOut=all0.length-nIn;
          /* the legs the panel counts as left out for want of an id: these and the totals with none, apart
             where DraftKings has the bet at another number (each case's answer: G[odd]'s home cover, held at
             -3.5 with an id at -4.5; aud-p2's Over 4.5 at 5.5; aud-p5's 75+ at Over 75; aud-p7's 2+ at his
             anytime touchdown; G[8]'s Under 44.5 at 45.5) */
          { const out0=[...all0,...pool0.mkt].filter(l=>!has(l)); nMoved=out0.filter(l=>dkElseAud(l,FIX9)).length; nNone=out0.length-nMoved;
            const mvKeys=out0.filter(l=>dkElseAud(l,FIX9)).map(l=>l.stat==='ats'||l.stat==='total'||l.stat==='ml'?l.gid+'|'+l.stat+'|'+l.side:l.pid).sort().join(), wantMv=[...new Set(out0.filter(l=>(l.stat==='ats'&&G.indexOf(G.find(g=>g.id===l.gid))%2===1)||(l.stat==='total'&&l.gid===G[8].id&&l.side==='under')).map(l=>l.gid+'|'+l.stat+'|'+l.side)
              .concat(out0.filter(l=>['aud-p2','aud-p5','aud-p7'].includes(l.pid)).map(l=>l.pid)))].sort().join();
            chk(nMoved>0&&nNone>0&&mvKeys===wantMv,`DraftKings' ids at another number on the made-up legs: the audit's own rule reads ${mvKeys} as moved, against the cases' ${wantMv} (${nNone} with none)`); }
          chk(nOut>0&&all0.some(l=>!isG(l)&&has(l))&&all0.some(l=>!isG(l)&&!has(l))&&pool0.mkt.some(has)&&pool0.mkt.some(l=>!has(l))&&rOld.tiers.some(t=>t.legs&&t.legs.some(l=>!has(l))),
            `the made-up legs do not put legs with and without a DraftKings id, players and totals among them, in the pool and on a level with no ids carried, so the case cannot tell the rule (${nIn} with, ${nOut} without)`);
          chk(ids9(pool1.pref)===ids9(pool0.pref.filter(has))&&ids9(pool1.thin)===ids9(pool0.thin.filter(has))&&ids9(pool1.mkt)===ids9(pool0.mkt.filter(has)),
            `with ids for some made-up legs, the legs a level may take are not those it takes with no ids carried less the ones DraftKings has no id for: ${ids9([...pool1.pref,...pool1.thin,...pool1.mkt]).slice(0,300)}`);
          /* a game the table has no entry for is taken as a payload without ids is (weekly.py bakes PAY.dk {}
             between Monday night's final and the next week's first pull): G[1]'s entry taken out, its legs are
             back as with none carried and the rest as before; and an empty table takes every leg */
          { const FIX9g={[String(cw)]:Object.fromEntries(Object.entries(T9).filter(([gid])=>gid!==G[1].id))}, E0={}; AUD_DK.add(FIX9g); AUD_DK.add(E0);
            const take=l=>l.gid===G[1].id||has(l);
            dkSet(FIX9g); const pg=F('pbPool')(G); dkSet(E0); const pe=F('pbPool')(G); dkSet(FIX9);
            chk([...pool0.pref,...pool0.thin,...pool0.mkt].some(l=>l.gid===G[1].id&&!has(l))
              &&ids9(pg.pref)===ids9(pool0.pref.filter(take))&&ids9(pg.thin)===ids9(pool0.thin.filter(take))&&ids9(pg.mkt)===ids9(pool0.mkt.filter(take)),
              `with no ids for one made-up game in the table, its legs are not taken as with no ids carried, or the rest not as before: ${ids9([...pg.pref,...pg.thin,...pg.mkt]).slice(0,300)}`);
            chk(ids9([...pe.pref,...pe.thin,...pe.mkt])===ids9([...pool0.pref,...pool0.thin,...pool0.mkt])&&!pe.noId,`with an empty id table (the week's first pull still to come), the levels' lines are not those with no ids carried: ${pe.noId} left out`); }
          /* the levels, under team and player bets and under Players only: what the reference builds from the
             legs with an id alone (game totals left out, as a total's chance is its two prices', which the
             reference could not keep with one side gone) */
          for(const ks of [['ml','ats','over','under'],['over','under']]){ setKinds(ks);
            const r1=F('getPbTiers')(), lab9=ks.length===2?'Players only':'team and player bets';
            chk(r1.tiers.every(t=>!t.legs||t.legs.every(has)),`${lab9}: a made-up level holds a leg DraftKings has no id for at its line: `+r1.tiers.filter(t=>t.legs).map(t=>t.legs.filter(l=>!has(l)).map(l=>l.name+' '+l.label).join(', ')).join(' / '));
            w.__m4Legs=L9.filter(has); dkSet(undefined); const r0=F('getPbTiers')(); w.__m4Legs=L9; dkSet(FIX9);
            chk(sig9(r1)===sig9(r0),`${lab9}: with ids for some made-up legs, the levels are not what a payload with no ids builds from the legs with an id alone: ${sig9(r1).slice(0,240)} against ${sig9(r0).slice(0,240)}`);
            if(ks.length===2){ chk(r1.tiers.some(t=>t.legs&&t.legs.some(l=>!isG(l))),'with ids for some made-up player legs, no level takes one');
              tiersSaid=r1.tiers.map(t=>t.legs?`${t.id} ${t.legs.length}`:`${t.id} empty`).join(', '); } }
          /* the list says how many lines it left out for want of an id, and why: the count is a number on the
             page; and the list itself is the legs with an id alone, ranked (holdTop) */
          setKinds(KINDS); holdTop('made-up games with ids for some legs'); F('renderPb')();
          { const pn=d.getElementById('pbPanel').cloneNode(true), el=pn.querySelector('#pbElo'); if(el) el.remove();
            /* (app v130, the owner's call of 22 October 2026: no descriptions) the state alone: "2 lines left out: no
               DraftKings id." and "1 line left out: DraftKings has it at another number." (the why and where to add them gone) */
            const tx=pn.textContent.replace(/\s+/g,' '), m=/(\d+) lines? left out: no DraftKings id\./.exec(tx), mv=/(\d+) lines? left out: DraftKings has (?:it|them) at another number\./.exec(tx);
            W.wording(!!m&&!!mv&&!/A player’s line read from ESPN carries no id|still on the game pages|Refresh odds reads DraftKings’ current spreads|the list takes only lines|to add by hand/.test(tx),
              `with ids for some made-up legs, the list does not say lines are left out for want of a DraftKings id, at another number and with none, in a few words: ${(tx.match(/\d+ lines? (is |are )?left out[^.]*\./g)||['nothing']).join(' ')}`);
            chk((m?+m[1]:0)===nNone&&(mv?+mv[1]:0)===nMoved,`the list says ${m?m[1]:0} lines are left out for want of a DraftKings id and ${mv?mv[1]:0} for DraftKings having them at another number, where ${nNone} and ${nMoved} are`); }
          /* no player id at all: the levels are built from team bets, and say why there is no player leg */
          dkSet(FIX9t); setKinds(['over','under']);
          const rP=F('getPbTiers')();
          chk(rP.tiers.every(t=>!t.legs),'with no DraftKings id on any made-up player leg, Players only built a level: '+rP.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));
          W.wording(!!rP.noPlayerPrices&&rP.tiers.every(t=>t.why===NO_ID),'with no DraftKings id on any made-up player leg, Players only does not say so on every level: '+rP.tiers.map(t=>t.why).join(' / '));
          setKinds(['ml','ats','over','under']); const rT=F('getPbTiers')(); holdTop('made-up games with no player id'); F('renderPb')();
          chk(rT.tiers.some(t=>t.legs)&&rT.tiers.every(t=>!t.legs||t.legs.every(l=>isG(l)&&has(l))),'with no DraftKings id on any made-up player leg, a level holds a player leg or a team leg with no id, or none is built: '+rT.tiers.map(t=>t.why||t.legs.map(l=>l.label).join('+')).join(' / '));
          W.wording([...d.querySelectorAll('#pbPanel p.pb-note')].some(p=>p.textContent===NO_ID),'with no DraftKings id on any made-up player leg, the list does not say "'+NO_ID+'"');
          /* and with no ids carried, the same legs suggest as before: player legs DraftKings has no id for among them */
          dkSet(undefined); setKinds(['over','under']); const rN=F('getPbTiers')();
          chk(rN.tiers.some(t=>t.legs&&t.legs.some(l=>!isG(l)&&!has(l))),'with no DraftKings ids carried, Players only does not suggest as before ids: no level takes a made-up player leg the partial table has no id for');
        } finally { tg.forEach((g,i)=>{ [g.tot,g.tov,g.tou]=keepTg[i]; }); S.ui.pb=JSON.parse(keepU9); dkSet(dkKeep4); F('renderPb')(); }
        console.log(`M9. DraftKings' betslip: on made-up games with ids for some legs (${nIn} of the ${nIn+nOut} legs a level could take with none carried), the pool is the rest less those, the levels are what the legs with an id alone build (Players only: ${tiersSaid}), the count left out is said (${nNone} with none, ${nMoved} at another number); a game with no ids, and an empty table, taken as before ids; no player id leaves Players only empty and says why; with no ids carried the levels suggest as before`); }
      console.log(`M4. every level a parlay: ten made-up games, Spread only: ${seen.slice(0,4).join(', ')}; three games: Aggressive and Extreme empty for too few legs; two preferred and two thin: the likeliest take 1 and 2 thin legs; ${likeliestSeen} tiers of the week's own picks fell back to the likeliest; ${likeliestWorked} likeliest tiers (Safe's pair included) worked out in full against ${combosWorked} parlays of their size`);
      } finally {
      dkSet(dkKeep4);
      w.eval('pbGames=window.__m4Keep[0]; pricedLegs=window.__m4Keep[1]; PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map();'); delete w.__m4Keep; delete w.__m4Games; delete w.__m4Legs;
      S.ui.pb=JSON.parse(keepU4); F('renderPb')(); } }
    /* with no game to come the panel says so and offers nothing: the regular season over, or every game of the week under way */
    /* (app v118) the Sunday slot stood in too (spSlotNext, none to come), as no game to come leaves none: its part of the
       Night games section says so (app v129: the slot's own section went) */
    { w.__pbKeep=w.eval('[pbGames, seasonOver, spSlotNext]');
      try{
      w.eval('pbGames=function(){ return []; }; seasonOver=function(){ return true; }; spSlotNext=function(){ return null; }; renderParlay();');
      const sp=d.getElementById('spPanel'), slotTx=()=>((d.querySelector(SP_SN)||{}).textContent||'');
      chk((panel.querySelector('.pb-none')||{}).textContent==='Regular season over.'&&!panel.querySelector('[data-pb-mix],.pb-tier,[data-pb-add],[data-pb-leg]')&&!sp.querySelector('[data-sp-game],.pb-tier,[data-sp-add],[data-pb-leg],[data-sp-wait]'),'with the season over the panel does not say so, or the list or Suggested Parlays still offers something');
      W.wording(/Regular season over\./.test(sp.textContent),'with the season over Suggested Parlays does not say so');
      chk((dayOffAud()?!slotTx():slotTx()==='Regular season over.')&&spPartsAud(),'with the season over, the Day games section does not say so in its one line');
      w.eval('seasonOver=function(){ return false; }; renderParlay();');
      chk(/^No week \d+ games left\.$/.test((panel.querySelector('.pb-none')||{}).textContent||'')&&!sp.querySelector('[data-sp-game],[data-sp-wait]'),'with every game of the week under way the panel does not say so, or Suggested Parlays still offers a set');
      W.wording(/No night game left in week \d+\./.test(sp.textContent)&&(dayOffAud()||/^No Sunday game left in week \d+\.$/.test(slotTx())),'with every game of the week under way Suggested Parlays does not say so, for its night games and for its Sunday slot');
      } finally { w.eval('pbGames=window.__pbKeep[0]; seasonOver=window.__pbKeep[1]; spSlotNext=window.__pbKeep[2];'); delete w.__pbKeep; } }
    S.ui.pb=JSON.parse(keepU); F('save')(); F('renderParlay')(); }
    /* ---- M12. the Top 50 lines on made-up games: each bet once, and the totals after every thin-edge line (app v112) ----
       The owner, 17 October 2026: "why there are several instances of this where it's only a half yard difference? i
       find it hard to believe that draft kings would let me bet both on the same parlay" (Patrick Mahomes's Over 224.5
       and 225+ passing yards ranked 1 and 2 at -113). A ladder rung k+ is the same bet as the player's main Over at
       k-0.5 on a half-point line, so where that main Over qualifies (preferred or thin) the rung is left out of the
       list, the main line kept wherever it ranks, and its slot goes to the next line; and a game total, put at 50%
       where it is priced on one side only, can be expected to make more than a thin-edge line at plus money, so its
       place is set, after every thin-edge line, never left to the sort. Held on games and lines of the audit's own
       (rule (c): pbGames and pricedLegs stood in for, each in a slot of its own and put back on every path, the games
       put on the schedule for the run and taken off after), so it holds whatever the week offers, run whether or not
       the week has a game still to come (with every game under way, and in the off-season, too), each case's answer
       written beside it:
         A  one game, every bet type ticked: Made-up t1's Over 224.5 passing yards and 225+ (the same bet: the rung
            left out); t2's Over 225 and 226+ (a whole-number line pushes at 225, where 226+ loses: both kept); t3's
            Under 54.5 rushing yards and 55+ (an Under is not the rung's bet: both kept); t4's Over 4.5 receptions thin
            and 5+ a Value pick (the rung left out, the main line kept among the other lines); t5's Over 49.5 a Value
            pick and 50+ thin (the rung left out); t6's Over 64.5 under the book and 65+ (no main line qualifies: the
            rung kept); t1's 225+ in a second game (another game: kept); three thin-edge lines and a thin money line,
            each expected to make under 3 cents on $1; and the game's total priced on the over alone at +120, put at
            50%, expected to make 10 cents, which must still rank after every thin-edge line
         B  more lines than the list holds (TOP_N_AUD, 50 from app v113 and 30 since app v116; 103 here once the rungs
            are out): eight players each with a Value-pick main Over and its rung at the top of the list (eight slots
            freed), 94 lines under them, and a thin main Over and its rung expected to make the least of all (its main
            line ranking past the 30th, off the list, the rung left out all the same): the list is exactly the first 30
            of the order without the rungs, so the lines ranked 23 to 30 there, which the rungs would have pushed off,
            are on it, the 31st is not, and the total, last of all, is not
       Since app v127 the page's own pricedLegs makes no rung (the site offers no ladder bet), so no rung reaches the list
       from the week's lines (NL1); the rule stays in the page, dormant, and these made-up lines, standing in for
       pricedLegs, are what hold it.
       Blocking: which lines, their order and every number (holdTop on each, and the cases' answers); W.wording the words */
    { const cw=F('currentWeek')(), pad=String(cw).padStart(2,'0'), keepU12=JSON.stringify(F('pbUi')()), keepF12=w.eval('[pbGames, pricedLegs]'), putF12=w.eval('(function(a,b){ pbGames=a; pricedLegs=b; })');
      const GP={id:`2099_${pad}_AUP_AUQ`,w:cw,a:'AUP',h:'AUQ',d:'2099-01-04',t:'13:00',tot:44.5,tov:120};
      const GQ={id:`2099_${pad}_AUR_AUS`,w:cw,a:'AUR',h:'AUS',d:'2099-01-04',t:'13:00'};
      const pl=(g,pid,stat,k,side,main,p,price,label)=>({key:`${g.id}|${pid}|${stat}`,gid:g.id,pid,stat,k,side,main,p,price,src:'real',mu:null,name:'Made-up '+pid,pos:'WR',grp:'AUD',team:g.h,opp:g.a,week:cw,label});
      const tm=(g,team,p,price)=>({key:`${g.id}|team:${team}|ml`,gid:g.id,pid:'team:'+team,stat:'ml',k:0,side:'over',main:false,p,price,src:'real',mu:null,name:'Made-up '+team,pos:'Game',grp:'TEAM',team,opp:team===g.h?g.a:g.h,week:cw,label:'To win'});
      const id12=(g,pid,stat,side,k)=>`${g.id}|${pid}|${stat}|${side}|${k}`, ids12=rows=>rows.map(x=>legIdAud(x.l||x));
      const LA12=[pl(GP,'t1','passing_yards',224.5,'over',true,0.60,-113,'Over 224.5 passing yards'),pl(GP,'t1','passing_yards',225,'over',false,0.60,-113,'225+ passing yards'),
        pl(GP,'t2','passing_yards',225,'over',true,0.58,-110,'Over 225 passing yards'),pl(GP,'t2','passing_yards',226,'over',false,0.57,-110,'226+ passing yards'),
        pl(GP,'t3','rushing_yards',54.5,'under',true,0.58,-110,'Under 54.5 rushing yards'),pl(GP,'t3','rushing_yards',55,'over',false,0.52,110,'55+ rushing yards'),
        pl(GP,'t4','receptions',4.5,'over',true,0.53,-110,'Over 4.5 receptions'),pl(GP,'t4','receptions',5,'over',false,0.56,-105,'5+ receptions'),
        pl(GP,'t5','receiving_yards',49.5,'over',true,0.58,-110,'Over 49.5 receiving yards'),pl(GP,'t5','receiving_yards',50,'over',false,0.53,-110,'50+ receiving yards'),
        pl(GP,'t6','receiving_yards',64.5,'over',true,0.40,-110,'Over 64.5 receiving yards'),pl(GP,'t6','receiving_yards',65,'over',false,0.56,-110,'65+ receiving yards'),
        pl(GQ,'t1','passing_yards',225,'over',false,0.60,-113,'225+ passing yards'),
        pl(GP,'t7','rushing_yards',30.5,'over',true,0.535,-110,'Over 30.5 rushing yards'),pl(GP,'t8','receptions',2.5,'over',true,0.54,-115,'Over 2.5 receptions'),tm(GP,'AUQ',0.56,-125)];
      const dropA=[id12(GP,'t1','passing_yards','over',225),id12(GP,'t4','receptions','over',5),id12(GP,'t5','receiving_yards','over',50)].sort();
      const keptA=[id12(GP,'t1','passing_yards','over',224.5),id12(GP,'t2','passing_yards','over',225),id12(GP,'t2','passing_yards','over',226),id12(GP,'t3','rushing_yards','under',54.5),id12(GP,'t3','rushing_yards','over',55),
        id12(GP,'t4','receptions','over',4.5),id12(GP,'t5','receiving_yards','over',49.5),id12(GP,'t6','receiving_yards','over',65),id12(GQ,'t1','passing_yards','over',225)];
      const totA=`${GP.id}|game|total|over|44.5`;
      /* B: eight Value-pick pairs at the top, 94 lines under them, a thin pair last */
      const LB12=[...Array.from({length:8},(_,i)=>[pl(GQ,'b'+i,'receiving_yards',40+i+0.5,'over',true,0.61,-110,`Over ${40+i+0.5} receiving yards`),pl(GQ,'b'+i,'receiving_yards',41+i,'over',false,0.61,-110,`${41+i}+ receiving yards`)]).flat(),
        ...Array.from({length:94},(_,i)=>pl(GQ,'f'+i,'receptions',3.5,'over',true,+(0.53+(i%30)*0.002).toFixed(3),-110,'Over 3.5 receptions')),
        pl(GQ,'z1','rushing_yards',9.5,'over',true,0.525,-110,'Over 9.5 rushing yards'),pl(GQ,'z1','rushing_yards',10,'over',false,0.525,-110,'10+ rushing yards')];
      let said12=[];
      try{
        S.sched.push(GP,GQ); w.__t12G=[GP,GQ]; w.__t12L=LA12;
        w.eval(`pbGames=function(){ return window.__t12G.filter(g=>!gameStarted(g)&&!hasScore(g)); };
          pricedLegs=function(games){ return window.__t12L.filter(l=>(games||[]).some(g=>g.id===l.gid&&!gameStarted(g))&&(l.grp==='TEAM'||suggestable(l.pid))).map(l=>({...l})); };`);
        U().off=[]; setKinds(KINDS);
        /* A */
        { const T=topFullAud([GP,GQ],U()), dropped=T.dropped.map(x=>legIdAud(x.rung)).sort();
          /* the audit's own rule against the case's answers: the cases are what they say */
          chk(JSON.stringify(dropped)===JSON.stringify(dropA)&&keptA.every(id=>T.full.some(x=>legIdAud(x.l)===id)),`each bet once on the made-up game: the audit's own rule leaves out ${dropped.join(', ')||'nothing'} and keeps ${keptA.filter(id=>T.full.some(x=>legIdAud(x.l)===id)).length} of ${keptA.length}, against the case`);
          const thinEv=T.full.filter(x=>x.part==='thin').map(x=>x.ev), tot=T.full.find(x=>legIdAud(x.l)===totA);
          chk(!!tot&&thinEv.length>=4&&thinEv.every(e=>e<tot.ev),`the made-up total on one price is not expected to make more than every thin-edge line (${tot?tot.ev.toFixed(3):'none'} against ${thinEv.map(e=>e.toFixed(3)).join(', ')}), so the case cannot tell the totals' place from the sort`);
          const {r}=holdTop('made-up lines, each bet once and a total on one price'), got=r.rows.map(legIdAud);
          chk(dropA.every(id=>!got.includes(id))&&keptA.every(id=>got.includes(id))&&r.same===dropA.length,`the Top 30 lines on the made-up game do not leave out exactly the rungs that are the same bet as a main Over (${dropA.filter(id=>got.includes(id)).join(', ')||'none'} listed, ${keptA.filter(id=>!got.includes(id)).join(', ')||'none'} missing, ${r.same} counted)`);
          const ti=got.indexOf(totA), lastThin=Math.max(...r.rows.map((x,i)=>T.q.thin.some(l=>legIdAud(l)===legIdAud(x))?i:-1));
          chk(ti===got.length-1&&lastThin>=0&&lastThin<ti,`the total on one price at +120 is row ${ti+1} of ${got.length}, where it comes after every thin-edge line (the last at row ${lastThin+1})`);
          said12.push(`A: ${dropA.length} rungs left out as their main Over's bet, ${keptA.length} lines kept (a whole-number line, an Under, a main line under the book and another game among them), the total on one price after ${thinEv.length} thin-edge lines`); }
        /* B */
        w.__t12L=LB12; w.eval('PB_TOP_CACHE=new Map()');
        { const N=TOP_N_AUD, T=topFullAud([GP,GQ],U()), hit=T.full.slice(N-8,N).map(x=>legIdAud(x.l)), next=T.full[N]?legIdAud(T.full[N].l):null, zM=id12(GQ,'z1','rushing_yards','over',9.5), zR=id12(GQ,'z1','rushing_yards','over',10);
          chk(T.dropped.length===9&&T.full.length===103+(T.q.mkt.length)&&T.full.length>N+8&&T.full.findIndex(x=>legIdAud(x.l)===zM)>=N,`the made-up long list does not leave out its nine rungs (${T.dropped.length}) with ${103+T.q.mkt.length} lines left, more than the ${N} the list holds, and the thin main line past the ${N}th, so the case cannot tell the freed slots or the cap`);
          const {r}=holdTop(`made-up lines, more than ${N} with eight rungs at the top`), got=r.rows.map(legIdAud);
          chk(got.length===N&&JSON.stringify(got)===JSON.stringify(T.full.slice(0,N).map(x=>legIdAud(x.l)))&&hit.every(id=>got.includes(id))&&!!next&&!got.includes(next)&&!got.includes(zM)&&!got.includes(zR)&&!got.includes(`${GP.id}|game|total|over|44.5`),
            `with eight rungs at the top left out, the Top ${N} lines are not exactly the first ${N} of the order without them (the lines ranked ${N-7} to ${N} among them, the ${N+1}st not), or the thin pair or the total is on it (${got.length} rows; ${hit.filter(id=>!got.includes(id)).length} of the 8 missing; the ${N+1}st ${next&&got.includes(next)?'listed':'not listed'})`);
          /* drawn: exactly N rows, the cap, never the length of the order */
          { const li=[...d.querySelectorAll('#pbPanel ol.pb-top > li.pb-trow')];
            chk(li.length===N&&li.length<T.full.length,`with ${T.full.length} lines in the order, the Top ${N} lines draw ${li.length} rows`); }
          said12.push(`B: ${T.full.length} lines once the ${T.dropped.length} rungs are out, exactly the first ${N} listed and drawn, the 8 their slots went to (ranked ${N-7} to ${N}) among them, the ${N+1}st and a main line past it off the list with its rung, the total last of all off it`); }
      } catch(e){ chk(false,'M12 threw: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' ')); }
      finally {
        putF12(keepF12[0],keepF12[1]); delete w.__t12G; delete w.__t12L;
        for(const id of [GP.id,GQ.id]){ const i=S.sched.findIndex(g=>g.id===id); if(i>=0) S.sched.splice(i,1); }
        S.ui.pb=JSON.parse(keepU12); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()'); F('renderPb')(); }
      console.log(`M12. the Top ${TOP_N_AUD} lines on made-up games, each bet once, the totals last and the list cut at ${TOP_N_AUD}: ${said12.join('; ')||'did not run'}`); }
  }

  /* ---- M13. only the bets DraftKings offers (app v113) ----
     The owner, 17 October 2026: "there are certain bets in the props that are not part of draft kings like for FG
     attempts. i only want to show legs that draft kings does." The audit's own copy of what DraftKings posts, never the
     page's NO_BET: the player markets the page's reader of DraftKings' lines on ESPN reads (passing yards, completions,
     attempts, passing touchdowns, interceptions, carries, rushing yards, receptions, receiving yards, rush + rec yards,
     kicking points, field goals made) and the anytime touchdown (DK_PLAYER_AUD), and a game's moneyline, spread and
     total (DK_GAME_AUD); and what the model projects that DraftKings does not post (NOT_DK_AUD: targets, and FG
     attempts since app v113), still projected (a kicker's FG attempts carry his field goals made and kicking points)
     and never a line or a leg. Held:
       the copy  every stat the page projects (GRP_STATS) is one or the other, and the reader's markets (ESPN_MAIN,
                 ESPN_MILE and the anytime touchdown) are the copy's player markets, so a market added on either side
                 is said
       the week  every game of the week, played or to come: no line its page draws (statLines, and every stat block,
                 tile and line box with every player opened; since app v127 no ladder is drawn), no leg pricedLegs gives (the
                 levels, the Top 50, the sets and the Elo picks are built from it), none a game page's hands may take
                 or hold (gameLegPool, gameTiers), none on the Top 50, a set or the all-games levels, and none in the
                 builder, on a bet outside the copy
       made up   a Monday night game of two made-up clubs (rule (c): on the schedule for the run, pbGames stood in and
                 two made-up kickers in S.players, their prices in PAY.mkt and S.odds and a made-up id table in place
                 of PAY.dk, every cache dropped, all put back on every path, so it holds in any week and the
                 off-season): each kicker's FG attempts and field goals made each given a main line priced 6 points
                 under the model's chance on one side, a rung price and DraftKings' ids, so either would be a Value pick
                 the betslip can take; field goals made (a DraftKings market) reaches his game page, pricedLegs, the
                 hands' pool, the Top 50, the set and, by the page's own boxes and Adds, the builder (so the case can
                 tell), and FG attempts reaches none of them
     Blocking: which lines and legs (a line or leg on a bet DraftKings does not post) */
  { const DK_PLAYER_AUD=['passing_yards','completions','attempts','passing_tds','passing_interceptions','carries','rushing_yards','receptions','receiving_yards','scrim_yards','kick_pts','fg_made','any_td'];
    const DK_GAME_AUD=['ml','ats','total'], NOT_DK_AUD=['targets','fg_att'], OK=new Set([...DK_PLAYER_AUD,...DK_GAME_AUD]);
    const said13=[], statOf=key=>String(key||'').split('|')[2], isG=F('isGameLeg');
    const offLeg=l=>!!l&&!OK.has(l.stat), offKey=k=>!OK.has(statOf(k)), nm=l=>`${l.name} ${l.label} (${l.stat})`;
    const LBL=Object.fromEntries(NOT_DK_AUD.map(s=>[s,(F('MKT')[s]||{}).lbl||s]));
    /* the copy against the page's own projected stats and its reader of DraftKings' lines */
    { const GS=F('GRP_STATS'), proj=[...new Set(Object.values(GS).flat())], loose=proj.filter(s=>!DK_PLAYER_AUD.includes(s)&&!NOT_DK_AUD.includes(s));
      chk(!loose.length,`the page projects ${loose.join(', ')}, which the audit's copy neither has as a DraftKings market nor as a bet DraftKings does not post`);
      const rd=new Set([...Object.values(F('ESPN_MAIN')),...Object.values(F('ESPN_MILE')),'any_td']), cp=new Set(DK_PLAYER_AUD);
      chk([...rd].every(s=>cp.has(s))&&[...cp].every(s=>rd.has(s)),`the page's reader of DraftKings' lines reads ${[...rd].sort().join(', ')}, where the audit's copy of DraftKings' player markets is ${[...cp].sort().join(', ')}`);
      chk(NOT_DK_AUD.every(s=>!rd.has(s)&&proj.includes(s)),`a bet the audit's copy has DraftKings not posting is read from DraftKings' lines, or is no longer projected: ${NOT_DK_AUD.join(', ')}`); }
    /* what a game's page draws with every player opened (since app v127 it draws no ladder: S's to hold): its line
       boxes' stats, and the stat blocks' and tiles' names */
    const pageOf=g=>{ const keepUi=JSON.stringify({game:S.ui.game,open:S.ui.open,all:S.ui.showAll}), out={legs:[],names:[],adds:[]};
      try{ const r=rosterFor(g,true); S.ui.open={}; for(const t in r) for(const x of r[t].players) S.ui.open[x.pl.id]=true;
        S.ui.showAll=true; S.ui.game=g.id; F('renderGame')(); const V=d.getElementById('gameView');
        out.legs=[...V.querySelectorAll('[data-leg]')].map(b=>b.dataset.leg); out.adds=[...V.querySelectorAll('[data-pb-leg]')].map(b=>b.dataset.pbLeg);
        out.names=[...V.querySelectorAll('.statblk h4,.tile .tl')].map(h=>(h.firstChild?h.firstChild.textContent:'').trim()); }
      finally { const ku=JSON.parse(keepUi); S.ui.game=ku.game; S.ui.open=ku.open||{}; S.ui.showAll=ku.all; F('closeGameModal')(); }
      return out; };
    const holdGames=(games,lab)=>{ const bad=[], open=games.filter(g=>!F('gameStarted')(g)&&!F('hasScore')(g)); let nLines=0, nLegs=0;
      for(const g of games){ const r=rosterFor(g,true);
        for(const t in r) for(const x of r[t].players) for(const l of statLines(x)){ nLines++; if(!OK.has(l.stat)) bad.push(`${x.pl.n}'s ${l.stat} line on ${g.id}'s page`); }
        const P=pageOf(g); nLines+=P.legs.length;
        for(const k of [...P.legs,...P.adds]) if(offKey(k)) bad.push(`a line box on ${g.id}'s page for ${k}`);
        for(const s of NOT_DK_AUD) if(P.names.includes(LBL[s])) bad.push(`a "${LBL[s]}" block on ${g.id}'s page`); }
      const legs=[...F('pricedLegs')(games),...open.flatMap(g=>F('gameLegPool')(g))];
      for(const g of open){ const H=F('gameTiers')(g); for(const id of ['high','med','low']) if(H&&H[id]) legs.push(...H[id].legs); }
      nLegs=legs.length; for(const l of legs) if(offLeg(l)) bad.push(`${nm(l)}, a leg of pricedLegs or a game's hands`);
      chk(!bad.length,`${lab}: a line or leg on a bet DraftKings does not post: ${[...new Set(bad)].slice(0,6).join('; ')}`);
      return {nLines,nLegs}; };
    /* the suggestions and the builder as they stand: the Top 50 on every box, the sets, the all-games levels, S.parlay */
    const holdSugg=lab=>{ const keepU=JSON.stringify(F('pbUi')()), bad=[]; let n=0;
      try{ const u=F('pbUi')(); for(const k in u.k) u.k[k]=true; u.off=[]; dropCaches();
        for(const l of F('getPbTop')().rows){ n++; if(offLeg(l)) bad.push(nm(l)+' on the Top 30'); }
        for(const t of F('getPbTiers')().tiers) for(const l of (t.legs||[])){ n++; if(offLeg(l)) bad.push(nm(l)+' on an all-games level'); }
        for(const g of F('spGames')()){ const s=F('spSet')(g.id), v=F('spShown')(g); for(const t of [...(s?s.tiers:[]),...(v&&v.tiers||[])]) for(const l of ((t&&t.legs)||[])){ n++; if(offLeg(l)) bad.push(nm(l)+` on ${g.id}'s set`); } }
        F('renderParlay')(); spAllOn(()=>F('renderSp')());
        for(const b of d.querySelectorAll('#pbPanel [data-pb-leg],#spPanel [data-pb-leg]')){ n++; if(offKey(b.dataset.pbLeg)) bad.push(`an Add for ${b.dataset.pbLeg}`); }
        F('renderSp')();
        for(const [k,l] of Object.entries(S.parlay||{})){ n++; if(offKey(k)||offLeg(l)) bad.push(`${l.name} ${l.label} in the builder`); } }
      finally { S.ui.pb=JSON.parse(keepU); dropCaches(); F('renderParlay')(); }
      chk(!bad.length,`${lab}: a suggestion, a list line or a builder leg on a bet DraftKings does not post: ${[...new Set(bad)].slice(0,6).join('; ')}`);
      return n; };
    /* the week as it stands */
    try{ const cw=F('currentWeek')(), wk=S.sched.filter(g=>+g.w===cw), h=holdGames(wk,'this week'), n=holdSugg('this week');
      said13.push(`this week's ${wk.length} games: ${h.nLines} lines on their pages and ${h.nLegs} legs priced or in a hand's pool, ${n} suggested, listed or in the builder, none outside DraftKings' markets`); }
    catch(e){ chk(false,'M13 (the week) threw: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' ')); }
    /* two made-up kickers on a made-up Monday night game */
    { const cw=F('currentWeek')(), pad=String(cw).padStart(2,'0'), PAY0=F('PAY');
      /* its total priced on both sides, so a level the kickers' legs cannot fill takes it as the last fill (the set's
         cards, quiet since app v113, then draw no line on why it is there) */
      const GK={id:`2099_${pad}_AUJ_AUK`,w:cw,a:'AUJ',h:'AUK',d:'2099-01-05',t:'20:15',sp:-3,tot:44.5,tov:-105,tou:-115};
      const keepF=w.eval('[pbGames]'), putF=w.eval('(function(a){ pbGames=a; })'), keepU=JSON.stringify(F('pbUi')()), keepDk=PAY0.dk, keepMk=JSON.stringify((PAY0.mkt||{})[String(cw)]||null);
      const keepO=JSON.stringify((S.odds||{})[GK.id]||null), keepPar=JSON.stringify(S.parlay||{}), keepBP=S.bookPrice, keepTab=d.getElementById('tab-suggest').hidden;
      const KS=[['aud-k1','AUK','AUJ','Made-up Kicker One'],['aud-k2','AUJ','AUK','Made-up Kicker Two']];
      const base={fg_att:2.1,fg_made:1.8,kick_pts:7.6};
      const mkK=([id,team,,n])=>{ const st=w.eval('GRP_STATS').K, pv=s=>{ const P=PAY0.prior&&PAY0.prior.K&&PAY0.prior.K[s]; return P!=null&&isFinite(P)&&P>0?P:base[s]||1; };
        return {id,n,pos:'K',grp:'K',team,gp:8,base_gp:17,e5:Object.fromEntries(st.map(s=>[s,[pv(s),1]])),e3:Object.fromEntries(st.map(s=>[s,[pv(s),1]])),
          car:Object.fromEntries(st.map(s=>[s,[pv(s)*40,40]])),py:Object.fromEntries(st.map(s=>[s,pv(s)]))}; };
      const imp=a=>a>0?100/(a+100):-a/(-a+100), am=q=>q>=0.5?-Math.round(100*q/(1-q)):Math.round(100*(1-q)/q);
      let ran=false;
      try{
        S.sched.push(GK); for(const k of KS) S.players[k[0]]=mkK(k);
        w.__m13G=[GK]; w.eval('pbGames=function(){ return window.__m13G.filter(g=>!gameStarted(g)&&!hasScore(g)); };');
        /* each kicker's FG attempts and field goals made: a main line at his projection's half point, the side the
           model likes priced 6 points under its chance (the other side under the book), a rung at 2 and an id for each */
        const M=((PAY0.mkt??={})[String(cw)]??={}), O=((S.odds??={})[GK.id]={}), E={at:new w.Date(w.Date.now()).toISOString(),glat:new w.Date(w.Date.now()).toISOString()}; let nId=0;
        const r=rosterFor(GK,false), xs=[...r[GK.a].players,...r[GK.h].players].filter(x=>KS.some(k=>k[0]===x.pl.id));
        chk(xs.length===2,`the made-up kickers are not on their made-up clubs' rosters for the game (${xs.length} of 2): FG attempts no longer projected for a kicker?`);
        const want=[];
        for(const x of xs) for(const s of ['fg_att','fg_made']){ const pr=F('project')(x.pl,s,x.opp,x.ctx), mu=pr&&pr.mu;
          if(!(mu>0)) continue; const line=Math.max(0.5,Math.floor(mu)+0.5), pO=F('pOver')('K',s,mu,line), over=pO>=0.5, pS=over?pO:1-pO;
          const pr1=am(Math.max(0.40,Math.min(0.9,pS-0.06))), pr2=am(Math.min(0.95,(1-pS)+0.08));
          M[x.pl.id]={...(M[x.pl.id]||{}),[s]:{line,over:over?pr1:pr2,under:over?pr2:pr1,n:x.pl.n,g:GK.id}};
          ((O[x.pl.id]??={})[s]={'2':150});
          for(const side of ['over','under']) E[`${x.pl.id}|${s}|${side}|${String(+line)}`]='0AUDM13'+(++nId);
          E[`${x.pl.id}|${s}|over|1.5`]=E[`${x.pl.id}|${s}|over|1.5`]||'0AUDM13'+(++nId);
          want.push({pid:x.pl.id,stat:s,side:over?'over':'under',line,p:pS}); }
        for(const side of ['over','under']) E[`game|total|${side}|${String(+GK.tot)}`]='0AUDM13'+(++nId);
        const T13={[String(cw)]:{[GK.id]:E}}; AUD_DK.add(T13); dkSet(T13); dropCaches();
        chk(want.filter(x=>x.stat==='fg_made').length===2&&want.filter(x=>x.stat==='fg_att').length===2&&want.every(x=>x.p>=0.45&&x.p<0.97),
          `the made-up kickers' lines are not each a line the model rates 45-97% on one side (${JSON.stringify(want)}), so the case cannot tell`);
        /* the control: field goals made reaches every place; FG attempts none */
        const has=(list,s)=>list.some(l=>l&&l.stat===s&&KS.some(k=>k[0]===l.pid));
        const pl0=F('pricedLegs')([GK]), pool0=F('gameLegPool')(GK), P=pageOf(GK);
        const u=F('pbUi')(); for(const k in u.k) u.k[k]=true; u.off=[]; dropCaches();
        const top=F('getPbTop')().rows, set=F('spSet')(GK.id), setLegs=set?set.tiers.flatMap(t=>t.legs||[]):[];
        chk(has(pl0,'fg_made')&&P.legs.some(k=>statOf(k)==='fg_made')&&P.names.includes((F('MKT').fg_made||{}).lbl)&&has(pool0,'fg_made')&&has(top,'fg_made')&&has(setLegs,'fg_made'),
          `the made-up kickers' field goals made, a DraftKings market priced as a Value pick with its ids, does not reach ${[has(pl0,'fg_made')?'':'pricedLegs',P.legs.some(k=>statOf(k)==='fg_made')?'':'his game page\'s line boxes',has(pool0,'fg_made')?'':'the hands\' pool',has(top,'fg_made')?'':'the Top 30',has(setLegs,'fg_made')?'':'the set'].filter(Boolean).join(', ')}, so the case cannot tell`);
        holdGames([GK],'a made-up Monday night game with two kickers');
        /* the set's level holding the game's total, drawn quiet: no line on why the total is there, none on thin legs */
        { const tT=set&&set.tiers.find(t=>t.legs&&t.legs.some(l=>l.stat==='total'));
          d.getElementById('tab-suggest').hidden=false;
          const q=spAllOn(()=>{ F('renderSp')(); const c=tT&&d.querySelector(`#spPanel [data-sp-game="${GK.id}"] .pb-tier.${tT.id}`);
            return c?{n:c.querySelectorAll('p.pb-thin:not(.pb-espnline):not(.sp-upd)').length,tx:c.textContent.replace(/\s+/g,' ')}:null; });
          F('renderSp')();
          chk(!!tT&&!!q&&!q.n&&!/(it is|they are) here because|not (a )?Value picks?: the model rates/.test(q.tx),`the made-up set's ${tT?tT.id:'(no level with a total)'} level, holding the game's total, ${!tT?'is not built, so the case cannot tell':!q?'is not drawn':'still draws a line on why the total is there or why a leg is not a Value pick'}: "${q?q.tx.slice(0,240):''}"`);
          if(tT) said13.push(`the set's ${tT.label} level takes the game's total as its last fill and is drawn quiet`); }
        { const bad=[...pl0,...pool0,...top,...setLegs].filter(offLeg).map(nm);
          for(const k of [...P.legs,...P.adds]) if(offKey(k)) bad.push('a line box for '+k);
          if(P.names.includes(LBL.fg_att)) bad.push(`a "${LBL.fg_att}" block on the game page`);
          chk(!bad.length,`the made-up kickers' FG attempts, priced as a Value pick with DraftKings' ids, are offered: ${[...new Set(bad)].slice(0,6).join('; ')}`); }
        /* the builder, by the page's own paths: every line box on the game page ticked, every Add on the Top 50 and
           the set pressed, and the set's Add to builder */
        S.parlay={}; S.bookPrice=null; F('save')();
        { const keepUi=JSON.stringify({game:S.ui.game,open:S.ui.open});
          try{ S.ui.open={'aud-k1':true,'aud-k2':true}; S.ui.game=GK.id; F('renderGame')();
            const boxes=[...d.querySelectorAll('#gameView [data-leg]')].map(b=>[b.dataset.leg,b.dataset.k,b.dataset.side]);
            for(const [lg,k,side] of boxes){ const b=d.querySelector(`#gameView [data-leg="${lg}"][data-k="${k}"][data-side="${side}"]`); if(b&&!b.checked) b.click(); } }
          finally { const ku=JSON.parse(keepUi); S.ui.game=ku.game; S.ui.open=ku.open||{}; F('closeGameModal')(); } }
        const fromPage=Object.values(S.parlay).map(l=>l.stat);
        S.parlay={}; F('renderParlay')();
        /* each Add found again after the one before it (a press redraws the list) */
        for(const [lg,k,side] of [...d.querySelectorAll('#pbPanel [data-pb-leg]')].map(b=>[b.dataset.pbLeg,b.dataset.k,b.dataset.side])){
          const b=d.querySelector(`#pbPanel [data-pb-leg="${lg}"][data-k="${k}"][data-side="${side}"]`); if(b&&b.getAttribute('aria-pressed')!=='true') b.click(); }
        d.getElementById('tab-suggest').hidden=false; spAllOn(()=>{ F('renderSp')(); const t=set&&set.tiers.find(x=>x.legs); const b=t&&d.querySelector(`#spPanel [data-sp-add="${GK.id}:${t.id}"]`); if(b) b.click(); });
        const fromAdds=Object.values(S.parlay).map(l=>l.stat);
        F('renderParlay')(); const rows=[...d.querySelectorAll('#parlayBody tr.legrow')].map(x=>x.textContent);
        chk(fromPage.includes('fg_made')&&fromAdds.includes('fg_made')&&![...fromPage,...fromAdds].some(s=>!OK.has(s))&&!rows.some(t=>new RegExp(LBL.fg_att,'i').test(t)),
          `the builder, filled by the made-up game's line boxes (${fromPage.join(', ')||'none'}) and by the Top 30's and the set's Adds (${fromAdds.join(', ')||'none'}), takes no field goals made or takes a bet DraftKings does not post`);
        holdSugg('a made-up Monday night game with two kickers');
        said13.push(`a made-up Monday night game, two made-up kickers each with FG attempts and field goals made priced as Value picks with ids: field goals made on the game page, priced, in the hands' pool, on the Top 30, in the set and the builder; FG attempts on none`);
        ran=true;
      } catch(e){ chk(false,'M13 (the made-up kickers) threw: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' ')); }
      finally {
        putF(keepF[0]); delete w.__m13G; for(const k of KS) delete S.players[k[0]];
        { const i=S.sched.findIndex(g=>g.id===GK.id); if(i>=0) S.sched.splice(i,1); }
        if(keepMk==='null') delete PAY0.mkt[String(cw)]; else PAY0.mkt[String(cw)]=JSON.parse(keepMk);
        if(keepO==='null') delete S.odds[GK.id]; else S.odds[GK.id]=JSON.parse(keepO);
        dkSet(keepDk); S.ui.pb=JSON.parse(keepU); S.parlay=JSON.parse(keepPar); S.bookPrice=keepBP; d.getElementById('tab-suggest').hidden=keepTab;
        dropCaches(); F('save')(); F('renderParlay')(); }
      if(!ran) said13.push('the made-up kickers did not run'); }
    console.log(`M13. only the bets DraftKings offers (the audit's copy: ${DK_PLAYER_AUD.length} player markets, the reader's, and the moneyline, spread and total; ${NOT_DK_AUD.join(' and ')} projected and never offered): ${said13.join('; ')}`); }

  /* ---- M10. Suggested Parlays on made-up prime-time games (app v111): which games, the levels in full,
     and the lock ----
     The owner's calls of 16 October 2026: a set of Safe, Medium, Aggressive and Extreme for each Thursday,
     Sunday and Monday night game on its own, "absolute best suggestions", and "the ability to refresh odds up
     until 2 hours before the game before it locks", a level whose player is ruled out after the lock built
     again, "that level only". Held here on games and lines of the audit's own (rule (c): pbGames and
     pricedLegs stood in for, the games put on the schedule for the run and taken off after, the page's clock
     set to each moment the checks need and put back), so it holds on any day of the year:
       the rule    which kickoffs are prime time, page and audit (primeAud, through the time zone database)
                   alike, each case's answer written beside it
       the levels  a Monday doubleheader (GA 7:15 pm, GB 8:15 pm ET) and a 4:30 pm game (GN, never given a
                   set). Every leg in one game, priced by the builder's own sums; the made-up players' lines
                   do not move together (no correlation for their made-up position), so every parlay is a
                   plain product and each level is worked out in full here, against every parlay of its size:
                   Safe the likeliest pair, the others the best return over their floor with the fewest thin
                   legs, else the likeliest of their size (GA's nine legs, where Medium has no parlay over 25%,
                   and GB's eighteen, past the beam's width, where only a search as wide as the set's finds them)
       the lock    live before kickoff less 2 hours (a press re-picks it: the lines moved under the same
                   publish); from the lock, with no record, the set this browser built at the lock, kept in its
                   own key (props_sp_lock_v1) through a press and a reload; with the record's entry for the game
                   (taken before the lock, of this season and kickoff), the record's set, the same through a
                   press; an entry taken at or after the lock, of another season or another kickoff not used; a
                   ruled-out player's level, and that level only, built again from the lines at hand, said so
                   and kept; the record's own replacement winning over the page's; and a game that kicks off
                   leaving the tab and the key
     Blocking: which games, which legs, every number, the phase; W.wording the words */
  { const cw=F('currentWeek')(), pad=String(cw).padStart(2,'0'), isG=F('isGameLeg'), pp=F('parlayProb'), pd=F('parlayDec'), order=F('pbOrder'), mlP=F('mlProb');
    const setVar=(n,v)=>w.eval(`(function(v){ ${n}=v; })`)(v), now0=w.Date.now, at=ms=>{ w.Date.now=()=>ms; }, r4=v=>Math.round(v*1e4)/1e4, r3=v=>Math.round(v*1e3)/1e3;
    const isoZ=ms=>new Date(ms).toISOString().replace(/\.\d{3}Z$/,'Z');
    /* the rule on its own cases */
    let nRule=0;
    for(const [dd,tt,want,lab] of [['2099-01-01','20:15',true,'a Thursday night'],['2099-01-01','19:00',true,'a Thursday at 7:00 pm'],['2099-01-01','18:59',false,'a Thursday at 6:59 pm'],
      ['2026-11-26','16:30',false,'Thanksgiving\'s late afternoon game'],['2026-11-26','20:20',true,'Thanksgiving night'],['2025-12-25','13:00',false,'a Christmas Thursday day game'],['2025-12-25','20:15',true,'a Christmas Thursday night'],
      ['2026-12-25','20:15',false,'a Christmas Friday night'],['2099-01-04','20:20',true,'a Sunday night'],['2099-01-04','16:25',false,'a Sunday late afternoon game'],['2099-01-04','13:00',false,'a Sunday 1 pm game'],
      ['2026-11-01','20:20',true,'a Sunday night after the clocks go back'],['2099-01-05','19:15',true,'a Monday doubleheader\'s first game'],['2099-01-05','20:15',true,'a Monday night'],
      ['2099-01-03','20:00',false,'a Saturday night'],['2099-01-02','20:15',false,'a Friday night'],['2024-12-25','16:30',false,'a Christmas Wednesday game']]){ nRule++;
      const g={d:dd,t:tt}; chk(F('spPrime')(g)===want&&primeAud(g)===want,`the prime-time rule on ${lab} (${dd} ${tt} ET): the page says ${F('spPrime')(g)}, the audit's own ${primeAud(g)}, the case ${want}`); }
    /* the made-up games and their lines */
    const GA={id:`2099_${pad}_AUA_AUH`,w:cw,a:'AUA',h:'AUH',d:'2099-01-05',t:'19:15',mla:120,mlh:-140,sp:2.5,spa:-110,sph:-110};
    const GB={id:`2099_${pad}_AUB_AUC`,w:cw,a:'AUB',h:'AUC',d:'2099-01-05',t:'20:15',mla:105,mlh:-125,sp:1.5,spa:-105,sph:-115};
    const GN={id:`2099_${pad}_AUN_AUM`,w:cw,a:'AUN',h:'AUM',d:'2099-01-05',t:'16:30',mla:110,mlh:-130,sp:2.5,spa:-110,sph:-110};
    const pl=(g,pid,stat,k,p,price,lab)=>({key:`${g.id}|${pid}|${stat}`,gid:g.id,pid,stat,k,side:'over',main:false,p,price,src:'real',mu:null,name:'Made-up '+pid,pos:'WR',grp:'AUD',team:g.h,opp:g.a,week:cw,label:lab});
    const tm=(g,team,stat,k,p,price)=>({key:`${g.id}|team:${team}|${stat}`,gid:g.id,pid:'team:'+team,stat,k,side:'over',main:false,p,price,src:'real',mu:null,name:'Made-up '+team,pos:'Game',grp:'TEAM',team,opp:team===g.h?g.a:g.h,week:cw,label:stat==='ml'?'To win':`To cover ${k>0?'+':''}${k}`});
    const LA=[tm(GA,'AUH','ml',0,0.62,-140),tm(GA,'AUA','ats',2.5,0.56,-110),pl(GA,'aud-a1','receptions',4,0.66,-160,'4+ receptions'),pl(GA,'aud-a2','receiving_yards',50,0.55,-105,'50+ receiving yards'),
      pl(GA,'aud-a3','rushing_yards',40,0.50,110,'40+ rushing yards'),pl(GA,'aud-a4','any_td',1,0.47,130,'Scores a touchdown'),pl(GA,'aud-a5','receptions',6,0.48,120,'6+ receptions'),
      pl(GA,'aud-a6','receiving_yards',80,0.46,140,'80+ receiving yards'),pl(GA,'aud-a7','passing_yards',250,0.60,-130,'250+ passing yards')];
    const am=imp=>imp>=0.5?-Math.round(100*imp/(1-imp)):Math.round(100*(1-imp)/imp);
    const LB=[tm(GB,'AUC','ml',0,0.585,-125),tm(GB,'AUB','ats',1.5,0.54,-105),...Array.from({length:16},(_,i)=>{ const p=+(0.46+((i*7)%11)*0.02).toFixed(2), e=i%4===3?0.015:0.03+((i*5)%7)*0.004;
      return pl(GB,'aud-b'+i,['receptions','receiving_yards','rushing_yards','passing_yards'][i%4],[3,40,30,200][i%4]+i,p,am(p-e),`made-up line ${i}`); })];
    const LN=[tm(GN,'AUM','ml',0,0.6,-130),pl(GN,'aud-n1','receptions',4,0.66,-160,'4+ receptions'),pl(GN,'aud-n2','receptions',5,0.6,-130,'5+ receptions')];
    w.__spG=[GN,GA,GB]; w.__spL=[...LA,...LB,...LN];
    const keepF=w.eval('[pbGames, pricedLegs]'), keepTab=d.getElementById('tab-suggest').hidden, keepPar=JSON.stringify(S.parlay||{}), keepBP=S.bookPrice, keepS=S.stake, INJ=F('INJ'), keepInj=INJ['aud-a7'];
    /* (the backtest, app v118, is left to the page's own fetch, with the options the page gave it) */
    const fetch0=w.fetch, loadRec=async body=>{ w.fetch=(u,o)=>/suggest_ledger/.test(String(u))?Promise.resolve(body===404?{ok:false,status:404,json:async()=>{throw new Error('404');}}:{ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(body))}):fetch0(u,o);
      try{ await w.pbRecLoad(); } finally { w.fetch=fetch0; } };
    let said=[];
    try{
      S.sched.push(GA,GB,GN);
      w.eval(`pbGames=function(){ return window.__spG.filter(g=>!gameStarted(g)&&!hasScore(g)); };
        pricedLegs=function(games){ return window.__spL.filter(l=>(games||[]).some(g=>g.id===l.gid&&!gameStarted(g))&&(l.grp==='TEAM'||suggestable(l.pid))).map(l=>({...l})); };`);
      const kA=kickAud(GA), kB=kickAud(GB), lockA=kA-7200e3, lockB=kB-7200e3;
      chk(F('spLockAt')(GA)===lockA&&F('spLockAt')(GB)===lockB,`the made-up games lock at ${F('spLockAt')(GA)} and ${F('spLockAt')(GB)}, not 2 hours before their kickoffs (${lockA}, ${lockB})`);
      /* every parlay of n legs of a game, worked by the builder's own sums; the level by the rule */
      const brute=(legs,n,floor)=>{ const all=[], rec=(i0,cur)=>{ if(cur.length===n){ const L=order(cur.map(l=>({...l}))), pr=pp(L).corr, dec=pd(L.map(l=>({leg:l,ml:l.price})));
            all.push({L,pr,dec,ev:pr*dec,thin:L.filter(l=>l.thin).length,id:L.map(legIdAud).sort().join()}); return; }
          for(let i=i0;i<legs.length;i++){ if(!fitsAud(cur,legs[i])) continue; cur.push(legs[i]); rec(i+1,cur); cur.pop(); } };
        rec(0,[]); if(!all.length) return null;
        const top=(list,f)=>{ const m=Math.max(...list.map(f)); return {best:list.filter(c=>f(c)>=m-1e-12),m}; };
        const km=Math.min(...all.map(c=>c.thin)), lk=top(all.filter(c=>c.thin===km),c=>c.pr);
        if(!floor) return {kind:'pair',...lk,n:all.length};
        const clear=all.filter(c=>c.pr>=floor);
        if(clear.length){ const kc=Math.min(...clear.map(c=>c.thin)); return {kind:'floor',...top(clear.filter(c=>c.thin===kc),c=>c.ev),n:all.length}; }
        return {kind:'likeliest',...lk,n:all.length}; };
      /* a game's set held to the levels worked out in full on its legs as the rule marks them (qualAud) */
      const holdFull=(g,lab)=>{ const q=qualAud([g],ALL_U), legs=[...q.pref,...q.thin], s=F('spSet')(g.id); let worked=0;
        chk(!!s&&s.tiers.length===4,`${lab}: no set of four levels`); if(!s) return null;
        for(const [id,,n,floor] of SPEC_AUD){ const t=s.tiers.find(x=>x.id===id), b=brute(legs,n,floor);
          if(!b){ chk(!!t&&!t.legs,`${lab}: the ${id} level has legs where the game's lines make no ${n}-leg parlay`); continue; }
          worked+=b.n; const kind=t&&t.legs?(t.likeliest?'likeliest':floor?'floor':'pair'):'empty', f=b.kind==='floor'?(x=>x.corr*x.dec):(x=>x.corr);
          chk(kind===b.kind&&!!t.legs&&Math.abs(f(t)-b.m)<1e-12&&b.best.some(c=>c.id===t.legs.map(legIdAud).sort().join())&&t.thin===b.best[0].thin,
            `${lab}: the ${id} level is ${kind} at ${t&&t.legs?(f(t)).toFixed(6):'-'} (${t&&t.legs?t.legs.map(l=>l.name+' '+l.label).join(', '):t&&t.why}), where every ${n}-leg parlay of the game (${b.n}) worked out gives ${b.kind} at ${b.m.toFixed(6)}: ${b.best[0].L.map(l=>l.name+' '+l.label).join(', ')}`); }
        return {s,worked}; };
      const sig=s=>JSON.stringify(s.map(t=>t.legs?t.legs.map(legIdAud).join()+'@'+t.corr+'@'+t.dec:'empty'));
      /* the phase each game's set is drawn in, and its cards' legs */
      const drawn=g=>{ const box=d.querySelector(`#spPanel [data-sp-game="${g.id}"]`); if(!box) return null; const ph=box.querySelector('[data-sp-phase]');
        return {box,phase:ph&&ph.dataset.spPhase,line:ph?ph.textContent:'',tiers:SPEC_AUD.map(([id])=>{ const c=box.querySelector(`.pb-tier.${id}`); return c?[...c.querySelectorAll('.pb-legs li [data-pb-leg]')].map(b=>b.dataset.pbLeg+'|over|'+b.dataset.k).join():null; })}; };
      const tierIds=s=>s.map(t=>t.legs?order(t.legs).map(legIdAud).join():null);
      /* each drawn card's legs: a Value pick (qualAud's preferred, worked here) marked Value and that alone, every other
         leg (a thin-edge leg, a total) no mark at all; counted, so a case can require both kinds to be seen */
      const markHeld=pairs=>{ let nV=0, nO=0; const ok=pairs.every(([g,f,dr])=>{ const V=new Set(qualAud([g],ALL_U).pref.map(legIdAud));
          return !!f&&!!dr&&f.s.tiers.every(t=>{ if(!t.legs) return true; const c=dr.box.querySelector(`.pb-tier.${t.id}`), li=c?[...c.querySelectorAll('.pb-legs li')]:[];
            return li.length===t.legs.length&&t.legs.every((l,i)=>{ const v=V.has(legIdAud(l)), m=li[i].querySelectorAll('.pb-valmark'); if(v) nV++; else nO++;
              return (v?m.length===1&&m[0].textContent==='Value':!m.length)&&!li[i].querySelector('.pb-thinmark')&&!/thin edge|no edge/i.test(li[i].textContent); }); }); });
        return {ok,nV,nO}; };
      const keyNow=()=>spKeyGet();
      spKeyClear(); setVar('PB_REC',null); setVar('PB_REC_DONE',true); dropCaches();
      /* 1. three hours before GA: both sets live, GN given none; the hidden tab builds nothing until opened */
      at(kA-3*3600e3); d.getElementById('tab-suggest').hidden=true; F('renderParlay')();
      chk(F('spGames')().map(g=>g.id).join()===[GA.id,GB.id].join(),`the made-up games given a set are ${F('spGames')().map(g=>g.id).join(', ')}, not the two Monday night games alone`);
      { const dA=drawn(GA), dB=drawn(GB);
        chk(!!dA&&!!dB&&dA.phase==='wait'&&dB.phase==='wait'&&!d.querySelector('#spPanel .pb-tier')&&w.eval('SP_CACHE.size')===0&&!drawn(GN),'with Suggested Parlays not on the screen, a set was built, drawn, or given to the 4:30 pm game');
        W.wording(!!dA&&dA.line==='Built when this tab is open.','a hidden set does not say it is built when the tab is open'); }
      d.querySelector('#tabs button[data-tab="suggest"]').click();
      const fA=holdFull(GA,'GA, three hours out'), fB=holdFull(GB,'GB, three hours out');
      { const dA=drawn(GA), dB=drawn(GB);
        chk(!!dA&&dA.phase==='live'&&dA.line.includes(etAud(lockA))&&!!dB&&dB.phase==='live'&&dB.line.includes(etAud(lockB))&&!drawn(GN),`opened three hours before GA, the sets are not drawn live with when they lock (${etAud(lockA)}, ${etAud(lockB)}), or GN is given one`);
        chk(!!fA&&JSON.stringify(dA.tiers)===JSON.stringify(tierIds(fA.s.tiers)),'GA\'s live set is not drawn as built');
        /* (app v112) on each card a Value pick (a leg with the 3-point edge, qualAud's preferred) wears Value and no
           other leg any mark */
        { const m=markHeld([[GA,fA,dA],[GB,fB,dB]]);
          chk(m.ok&&m.nV>0,`the made-up games' live cards do not mark Value exactly the legs with the 3-point edge (${m.nV} Value picks, ${m.nO} other legs)`);
          said.push(`${m.nV} Value picks marked and ${m.nO} other legs unmarked`); }
        /* (app v113) the lock's line is one short line, and the tab draws no foot or lead */
        W.wording(dA.line===`Locks ${etAud(lockA)}.`,`GA's live line reads "${dA&&dA.line}", not "Locks ${etAud(lockA)}."`);
        W.wording(!d.querySelector('#spSets .pb-foot,#spHead .pb-lead,#spHead .sp-rec-line'),'Suggested Parlays still draws its foot under the sets, its lead or the record\'s sentence'); }
      chk(!!fA&&fA.s.tiers.some(t=>t.likeliest)&&fA.s.tiers.some(t=>t.floor&&t.legs&&!t.likeliest),'GA\'s made-up lines do not give both a level that falls back to the likeliest and one over its floor, so the case cannot tell them apart');
      /* a press before the lock re-picks the set: a line moved under the same publish (ESPN_SEQ, as a press moves it) */
      const moveA=v=>{ const l=w.__spL.find(x=>x.pid==='aud-a1'); l.p=v; }, liveA0=sig(fA.s.tiers);
      moveA(0.72); w.eval('ESPN_SEQ++'); dropCaches(); F('renderParlay')();
      { const f2=holdFull(GA,'GA after a press before the lock'); chk(!!f2&&sig(f2.s.tiers)!==liveA0&&JSON.stringify(drawn(GA).tiers)===JSON.stringify(tierIds(f2.s.tiers)),'a press before the lock did not re-pick GA\'s set'); }
      moveA(0.66); w.eval('ESPN_SEQ++'); dropCaches(); F('renderParlay')();
      /* (app v112) a thin-edge leg on a live card wears no mark: a press makes three of GA's lines thin (each still at
         or above the book, under the 3-point edge), so its Value picks, a side and two players, make no parlay of 4 or
         5 and its Aggressive and Extreme take thin legs; each drawn unmarked, every Value pick marked Value, and both
         seen, so the unmarked half of the rule always runs. The lines put back after, on every path */
      { const thinA=[['aud-a2',{p:0.53}],['aud-a4',{p:0.45}],['aud-a6',{price:125}]], keepL=thinA.map(([pid])=>{ const l=w.__spL.find(x=>x.pid===pid); return [l,{p:l.p,price:l.price}]; });
        try{ for(const [pid,o] of thinA) Object.assign(w.__spL.find(x=>x.pid===pid),o); w.eval('ESPN_SEQ++'); dropCaches(); F('renderParlay')();
          const f=holdFull(GA,'GA with three of its lines thin'), dr=drawn(GA), q=qualAud([GA],ALL_U), T=new Set(q.thin.map(legIdAud)), m=markHeld([[GA,f,dr]]);
          const nThin=f?f.s.tiers.reduce((a,t)=>a+(t.legs?t.legs.filter(l=>T.has(legIdAud(l))).length:0),0):0;
          chk(['aud-a2','aud-a4','aud-a6'].every(pid=>q.thin.some(l=>l.pid===pid))&&!!dr&&dr.phase==='live'&&nThin>0,`with three of GA's lines made thin, its live set takes no thin-edge leg (${nThin}), so the case cannot hold one unmarked`);
          chk(m.ok&&m.nV>0&&m.nO>=nThin&&m.nO>0,`with three of GA's lines thin, its live cards do not mark Value exactly the legs with the 3-point edge, every thin-edge leg unmarked (${m.nV} Value picks, ${m.nO} other legs, ${nThin} thin)`);
          /* (app v113) and a set's cards are quiet: no line under the legs saying why the thin ones are not Value picks */
          { const th=dr?[...dr.box.querySelectorAll('.pb-tier p.pb-thin:not(.pb-espnline):not(.sp-upd)')]:[];
            chk(!!dr&&nThin>0&&!th.length&&!/not (a )?Value picks?: the model rates/.test(dr.box.textContent),`with three of GA's lines thin, its live cards still draw a line on why a leg is not a Value pick, which a set's cards no longer draw: ${th.map(p=>p.textContent).join(' / ').slice(0,240)}`); }
          said.push(`with three of GA's lines thin, ${m.nO} thin-edge legs drawn unmarked beside ${m.nV} Value picks`); }
        finally { for(const [l,o] of keepL) Object.assign(l,o); w.eval('ESPN_SEQ++'); dropCaches(); F('renderParlay')(); } }
      /* 2. an hour and a half before GA: GA locked, GB still live; no record, so this browser builds GA's set once and keeps it */
      at(kA-1.5*3600e3); F('renderParlay')();
      const own=F('spSet')(GA.id).tiers, K1=keyNow(), e1=K1&&K1.games&&K1.games[GA.id];
      { const dA=drawn(GA), dB=drawn(GB);
        chk(!!dA&&dA.phase==='own'&&dA.line.includes(etAud(lockA))&&!!dB&&dB.phase==='live',`at GA's lock with no record, GA is drawn ${dA&&dA.phase} and GB ${dB&&dB.phase}, not the set built here and live`);
        chk(!!e1&&K1.v===1&&+K1.season===F('SEASON')&&e1.own===true&&e1.kickoff===isoZ(kA)&&Array.isArray(e1.tiers)&&e1.tiers.length===4&&!(GB.id in K1.games)
          &&e1.tiers.every((t,i)=>own[i].legs?(Array.isArray(t.legs)&&t.legs.map(l=>`${l.gid}|${l.pid}|${l.stat}|${l.side}|${l.k}`).join()===own[i].legs.map(l=>`${l.key}|${l.side}|${l.k}`).join()&&t.p===r4(own[i].corr)&&t.dec===r3(own[i].dec)):!t.legs),
          `at GA's lock with no record, this browser does not keep the set it built, and that alone, under ${SPK}: ${String(JSON.stringify(K1)).slice(0,300)}`);
        chk(JSON.stringify(dA.tiers)===JSON.stringify(tierIds(own)),'GA\'s locked set as this browser built it is not the set at the lock');
        { const want=`Locked since ${etAud(lockA)}. This browser’s own set (not graded).`;
          W.wording(dA.line===want,`GA's own locked set's line reads "${dA.line}", not "${want}"`); } }
      const ownIds=JSON.stringify(drawn(GA).tiers);
      /* a press after the lock changes nothing of it; GB, still live, is re-picked */
      /* GB's Safe pair loses a leg: the line under the book once the press has moved it, so GB's set must move */
      { const pidB=(F('spSet')(GB.id).tiers[0].legs||[]).map(l=>l.pid).find(x=>/^aud-b/.test(x)), moveB=w.__spL.find(x=>x.pid===pidB), pB=moveB?moveB.p:null, gB0=JSON.stringify(drawn(GB).tiers);
        moveA(0.72); if(moveB) moveB.p=0.3; w.eval('ESPN_SEQ++'); dropCaches(); F('renderParlay')();
        chk(JSON.stringify(drawn(GA).tiers)===ownIds&&drawn(GA).phase==='own',"a press after GA's lock changed its set");
        chk(!!moveB&&JSON.stringify(drawn(GB).tiers)!==gB0&&!JSON.stringify(drawn(GB).tiers).includes(pidB+'|'),`a press before GB's lock, which put ${pidB} under the book, did not re-pick its set`);
        /* a reload: the set comes back from the key, on the moved lines */
        spKeyClear(); w.localStorage.setItem(SPK,JSON.stringify(K1)); dropCaches(); F('renderParlay')();
        chk(JSON.stringify(drawn(GA).tiers)===ownIds&&drawn(GA).phase==='own','a reload after GA\'s lock did not show the set this browser kept');
        moveA(0.66); if(moveB) moveB.p=pB; w.eval('ESPN_SEQ++'); dropCaches(); F('renderParlay')(); }
      /* still reading the record: the locked set waits for it */
      setVar('PB_REC_DONE',false); F('renderSp')();
      chk(drawn(GA).phase==='loading'&&!drawn(GA).box.querySelector('.pb-tier'),'a locked set did not wait for the record');
      W.wording(drawn(GA).line===`Locked since ${etAud(lockA)}. Loading the site’s set…`,`a locked set waiting for the record reads "${drawn(GA).line}", not "Locked since ${etAud(lockA)}. Loading the site’s set…"`);
      setVar('PB_REC_DONE',true);
      /* 3. the record's entry for GA: its set, the same for everyone, through a press; this browser's own given up */
      const E=(tiers,o)=>({season:F('SEASON'),week:cw,gid:GA.id,away:GA.a,home:GA.h,kickoff:isoZ(kA),lock:isoZ(lockA),baked_at:'2099-01-05T12:00:00Z',taken_at:isoZ(lockA-3*3600e3),pool:{pref:7,thin:2,mkt:0},tiers,...(o||{})});
      const LOut=legs=>legs.map(l=>({gid:l.gid,week:l.week,pid:l.pid,team:l.team,grp:l.grp,stat:l.stat,k:l.k,side:l.side,main:false,price:l.price,src:'real',name:l.name,label:l.label,p:l.p,fair:null,fair_est:false,thin:!!(LA.find(x=>x.key===l.key)&&qualAud([GA],ALL_U).thin.some(x=>x.key===l.key)),market:false}));
      const lvOf=(id,keys,lk)=>{ const sp=SPEC_AUD.find(x=>x[0]===id), legs=order(keys.map(k=>LA.find(l=>l.pid===k||l.pid==='team:'+k)));
        return {id,label:sp[1],n:sp[2],floor:sp[3],legs:LOut(legs),p:r4(pp(legs).corr),fair:null,fair_est:false,dec:r3(pd(legs.map(l=>({leg:l,ml:l.price})))),likeliest:!!lk,thin:0,mkt:0}; };
      const recTiers=[lvOf('safe',['AUA','aud-a2']),lvOf('med',['aud-a7','aud-a2','aud-a4'],true),lvOf('aggr',['AUH','aud-a1','aud-a2','aud-a6'],true),lvOf('xtrm',['AUH','aud-a1','aud-a2','aud-a4','aud-a6'],true)];
      const recKey=`${F('SEASON')}|${pad}|${isoZ(kA)}|${GA.id}`, REC={how:'made up',entries:{},prime:{[recKey]:E(recTiers)}};
      const recIds=recTiers.map(t=>t.legs.map(l=>`${l.gid}|${l.pid}|${l.stat}|over|${l.k}`).join());
      await loadRec(REC); F('renderParlay')();
      { const dA=drawn(GA), K2=keyNow();
        chk(dA.phase==='locked'&&JSON.stringify(dA.tiers)===JSON.stringify(recIds),`with the record's entry for GA, its locked set is not the record's: ${dA.phase} ${JSON.stringify(dA.tiers)}`);
        chk(!K2||!K2.games||!K2.games[GA.id]||(!K2.games[GA.id].own&&!K2.games[GA.id].tiers),'with the record\'s entry for GA, this browser still keeps a set of its own for it');
        /* each level as the record has it: its chance, price and payout on the Bet amount */
        const stake=w.eval('pbStake()');
        /* (the chance and price worked out again on the record's legs by the builder's own sums, as the builder
           will price them after Add to builder: the record's own figures are rounded) */
        for(const t of recTiers){ const c=dA.box.querySelector(`.pb-tier.${t.id}`), tx=c?c.textContent.replace(/\s+/g,' '):'';
          const kept=t.legs.map(l=>({...l,key:`${l.gid}|${l.pid}|${l.stat}`,mu:null})), sp=pp(order(kept)).corr, sd=pd(order(kept).map(l=>({leg:l,ml:l.price})));
          chk(!!c&&Math.abs(sp-t.p)<2e-3&&Math.abs(sd-t.dec)<2e-3&&tx.includes(`${(sp*100).toFixed(0)}%`)&&tx.includes(F('fmtML')(F('decToML')(sd)))&&payOk(c.querySelector('[data-pb-pay]'),stake,sd),
            `the record's ${t.id} level of GA is not drawn at its own chance, price and payout, the builder's sums on its legs`); }
        W.wording(dA.line===`Locked since ${etAud(lockA)}.`,`GA's locked set from the record reads "${dA.line}", not "Locked since ${etAud(lockA)}."`); }
      /* a press after the lock: the record's set stands */
      moveA(0.72); w.eval('ESPN_SEQ++'); dropCaches(); F('renderParlay')();
      chk(JSON.stringify(drawn(GA).tiers)===JSON.stringify(recIds)&&drawn(GA).phase==='locked','a press after the lock changed the record\'s set for GA');
      moveA(0.66); w.eval('ESPN_SEQ++'); dropCaches(); F('renderParlay')();
      /* its Add to builder puts exactly the record's legs in the builder */
      { S.parlay={}; S.bookPrice=null; F('renderParlay')(); const b=d.querySelector(`#spPanel [data-sp-add="${GA.id}:aggr"]`); if(b) b.click();
        const want=recTiers[2].legs.map(l=>`${l.gid}|${l.pid}|${l.stat}`).sort().join();
        chk(Object.keys(S.parlay).sort().join()===want&&(F('spTier')(`${GA.id}:aggr`)||{legs:[]}).legs.map(l=>l.key).sort().join()===want,'the record\'s Aggressive level of GA did not go into the builder as it is drawn');
        S.parlay={}; F('renderParlay')(); }
      /* a locked leg's own Add puts that leg in as the record locked it (its line, price and chance), never the
         line as it stands now (toggleLeg's reading); Added while it is in, and a second press takes it off */
      { S.parlay={}; S.bookPrice=null; F('renderParlay')();
        const l=recTiers[2].legs[1], key=`${l.gid}|${l.pid}|${l.stat}`, sel=`#spPanel [data-sp-game="${GA.id}"] .pb-tier.aggr [data-pb-leg="${key}"][data-side="${l.side}"]`, b=d.querySelector(sel);
        if(b){ b.focus(); b.click(); }
        const x=S.parlay[key], b1=d.querySelector(sel);
        chk(!!b&&Object.keys(S.parlay).length===1&&!!x&&x.k===l.k&&x.side===l.side&&x.price===l.price&&x.p===l.p&&x.label===l.label&&!!b1&&b1.textContent==='Added'&&b1.getAttribute('aria-pressed')==='true'&&d.activeElement===b1,
          `the Add on a leg of the record's locked set for GA did not put that leg in as it was locked: ${JSON.stringify(x&&[x.k,x.side,x.price,x.p])} against ${JSON.stringify([l.k,l.side,l.price,l.p])}`);
        if(b1) b1.click();
        chk(!S.parlay[key]&&(d.querySelector(sel)||{}).textContent==='Add','a second press of a locked leg\'s Add did not take it off the builder');
        S.parlay={}; F('renderParlay')(); }
      /* an entry not taken before the lock, of another season or of another kickoff is not the site's locked set */
      for(const [lab,e] of [['taken at the lock',E(recTiers,{taken_at:isoZ(lockA)})],['of another season',E(recTiers,{season:F('SEASON')-1})],['of another kickoff',E(recTiers,{kickoff:isoZ(kA+3600e3)})]]){
        spKeyClear(); await loadRec({how:'made up',prime:{[recKey]:e}}); dropCaches(); F('renderParlay')();
        chk(drawn(GA).phase==='own',`a record entry for GA ${lab} was taken for the site's locked set`); }
      /* a set that reaches its lock with the page open has the record read again (pbWatchTick, the page's
         half-minute look), with no-store, since the job may have taken the game's entry after the page loaded:
         read at GB's lock less a minute (GB live, no entry for it), the clock moved past GB's lock, one look
         asks once and draws GB as the record's set; a second look asks nothing. A read again that fails keeps
         the record read before */
      { const recB={how:'made up',prime:{[recKey]:E(recTiers),[`${F('SEASON')}|${pad}|${isoZ(kB)}|${GB.id}`]:{...E(SPEC_AUD.map(([id,label,n,floor])=>({id,label,n,floor,why:'No parlay of this size in this game.'}))),gid:GB.id,away:GB.a,home:GB.h,kickoff:isoZ(kB),lock:isoZ(lockB),taken_at:isoZ(lockB-3600e3)}}};
        at(lockB-60e3); spKeyClear(); await loadRec(REC); dropCaches(); F('renderParlay')();
        const live0=drawn(GB).phase; let asked=[];
        const fetchA=w.fetch; w.fetch=(u,o)=>{ if(/suggest_ledger/.test(String(u))){ asked.push(o&&o.cache); return Promise.resolve({ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(recB))}); } return fetchA(u,o); };
        try{
          at(lockB+60e3); w.pbWatchTick(); await sleep(30);
          const one=asked.slice(), dB=drawn(GB);
          w.pbWatchTick(); await sleep(30);
          chk(live0==='live'&&one.length===1&&one[0]==='no-store'&&asked.length===1&&!!dB&&dB.phase==='locked'&&dB.tiers.every(t=>!t||!t.length),
            `a set reaching its lock with the page open did not have the record read again, once with no-store, and drawn as the record's: ${live0} then ${dB&&dB.phase}, asked ${JSON.stringify(asked)}`);
          /* a read again that fails keeps the record read before */
          w.fetch=(u,o)=>/suggest_ledger/.test(String(u))?Promise.resolve({ok:false,status:500,json:async()=>{ throw new Error('500'); }}):fetchA(u,o);
          await w.pbRecLoad(true);
          chk(!!w.eval('PB_REC')&&!!w.eval('PB_REC').prime[`${F('SEASON')}|${pad}|${isoZ(kB)}|${GB.id}`]&&drawn(GB).phase==='locked','a read of the record again that failed threw away the record read before');
        } finally { w.fetch=fetchA; }
        at(kA-1.5*3600e3); }
      /* 4. a player ruled out after the lock: the level holding him, and that level only, built again */
      spKeyClear(); await loadRec(REC); dropCaches(); F('renderParlay')();
      INJ['aud-a7']={k:'out',t:'OUT',title:'Out'}; dropCaches(); F('renderParlay')();
      const rep1=(keyNow()||{games:{}}).games[GA.id];
      { const dA=drawn(GA), q=qualAud([GA],ALL_U), b=brute([...q.pref,...q.thin],3,0.25), u=dA.box.querySelector('.pb-tier.med [data-sp-upd]');
        chk(dA.phase==='locked'&&[0,2,3].every(i=>dA.tiers[i]===recIds[i])&&!!dA.tiers[1]&&!/aud-a7/.test(dA.tiers[1])&&!!b&&b.best.some(c=>c.L.map(l=>`${l.key}|over|${l.k}`).join()===dA.tiers[1]),
          `with aud-a7 ruled out after the lock, GA's Medium was not built again on the lines at hand, or another level moved: ${JSON.stringify(dA.tiers)}`);
        chk(!!u&&u.dataset.spUpd==='aud-a7'&&!dA.box.querySelector('.pb-tier:not(.med) [data-sp-upd]'),'the level built again is not marked with the player ruled out, or another level is');
        chk(!!rep1&&!!rep1.rep&&!!rep1.rep.med&&rep1.rep.med.pid==='aud-a7'&&!!rep1.rep.med.tier&&Object.keys(rep1.rep).length===1&&!rep1.own,`the page's own replacement of GA's Medium is not kept in this browser beside the record's set: ${String(JSON.stringify(rep1)).slice(0,240)}`);
        { const want=rep1&&rep1.rep&&rep1.rep.med?`Updated in this browser: Made-up aud-a7 held out (${etAud(Date.parse(rep1.rep.med.at))}).`:null;
          W.wording(!!u&&!!want&&u.textContent===want,`the replaced level's line reads "${u&&u.textContent}", not "${want}"`); } }
      /* a reload keeps the same replacement, made when it was */
      { const ids1=JSON.stringify(drawn(GA).tiers); at(kA-1.4*3600e3); w.eval('SP_KEEP=null'); dropCaches(); F('renderParlay')(); const K3=keyNow();
        chk(JSON.stringify(drawn(GA).tiers)===ids1&&K3.games[GA.id].rep.med.at===rep1.rep.med.at,'a reload did not keep the replacement made before it'); }
      /* the record's own replacement for the same player wins over the page's, which is dropped */
      { const med2=lvOf('med',['aud-a1','aud-a2','aud-a4'],true), upd={pid:'aud-a7',name:'Made-up aud-a7',reason:'ruled out',at:isoZ(lockA+600e3)};
        await loadRec({how:'made up',prime:{[recKey]:E([recTiers[0],{...med2,updated:upd},recTiers[2],recTiers[3]],{updates:[{tier:'med',...upd}]})}}); dropCaches(); F('renderParlay')();
        const dA=drawn(GA), u=dA.box.querySelector('.pb-tier.med [data-sp-upd]'), K4=keyNow();
        chk(dA.tiers[1]===med2.legs.map(l=>`${l.gid}|${l.pid}|${l.stat}|over|${l.k}`).join()&&!!u&&u.dataset.spUpd==='aud-a7'&&!(K4&&K4.games&&K4.games[GA.id]&&K4.games[GA.id].rep&&K4.games[GA.id].rep.med),
          'the record\'s own replacement of GA\'s Medium does not stand over the page\'s, or the page\'s is still kept');
        W.wording(!!u&&u.textContent===`Updated: Made-up aud-a7 ruled out (${etAud(Date.parse(upd.at))}).`,`the record's replacement line reads "${u&&u.textContent}", not "Updated: Made-up aud-a7 ruled out (${etAud(Date.parse(upd.at))})."`); }
      if(keepInj===undefined) delete INJ['aud-a7']; else INJ['aud-a7']=keepInj;
      /* 5. GA kicks off: it leaves the tab, and the next write of the key prunes it */
      at(kA+60e3); spKeyClear(); w.localStorage.setItem(SPK,JSON.stringify({v:1,season:F('SEASON'),games:{[GA.id]:{kickoff:isoZ(kA),own:true,at:isoZ(lockA),tiers:recTiers,rep:{}}}}));
      await loadRec(404); dropCaches(); F('renderParlay')();
      { const K5=keyNow();
        chk(!drawn(GA)&&F('spGames')().map(g=>g.id).join()===GB.id&&drawn(GB).phase==='own'&&!!K5&&!!K5.games[GB.id]&&!K5.games[GA.id],`once GA kicked off it is still on the tab or in this browser's key, or GB is not locked as this browser built it: ${JSON.stringify(Object.keys((K5||{}).games||{}))}`); }
      said=[`${nRule} kickoffs by the rule`,`GA ${fA?fA.worked:0} and GB ${fB?fB.worked:0} parlays worked out in full`,...said,'live, own, the record\'s, waiting for the record, a press and a reload after the lock, a ruled-out level, the record\'s replacement, a kickoff pruning the key'];
    } catch(e){ chk(false,'M10 threw: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' ')); }
    finally {
      w.Date.now=now0; for(const id of [GA.id,GB.id,GN.id]){ const i=S.sched.findIndex(g=>g.id===id); if(i>=0) S.sched.splice(i,1); }
      w.__spK=keepF; w.eval('pbGames=window.__spK[0]; pricedLegs=window.__spK[1];'); delete w.__spK; delete w.__spG; delete w.__spL;
      if(keepInj===undefined) delete INJ['aud-a7']; else INJ['aud-a7']=keepInj;
      await loadRec(404); setVar('PB_REC_DONE',true);
      spKeyClear(); try{ if(spKey0!=null) w.localStorage.setItem(SPK,spKey0); }catch(e){}
      d.getElementById('tab-suggest').hidden=keepTab; d.querySelector('#tabs button[data-tab="parlay"]').click();
      S.parlay=JSON.parse(keepPar); S.bookPrice=keepBP; S.stake=keepS; dropCaches(); F('save')(); F('renderParlay')(); }
    console.log(`M10. Suggested Parlays on made-up prime-time games: ${said.join('; ')||'did not run'}`); }

  /* ---- M11. one night at a time (app v112, the owner's call of 17 October 2026: "just show the next night game
     dont stack the monday night game until monday morning") ----
     The tab sets out the games of the next prime-time night still to kick off (one Eastern date: both games of a
     doubleheader), and only from 6:00 AM Eastern on the day after the latest prime-time night before it on the
     schedule (any week, played or not; with none, at once); until then one line says which game is next and when
     its set goes up (data-sp-wait, the instant; data-sp-next, the games). A level's Finish (spTier) names only a
     game it sets out, and the state the page watches (spState) moves at the turn, so its half-minute look
     (pbWatchTick) redraws an open page then. The record is not the night rule's: every prime-time game's set is
     still built (spGames, spSet), which holdSets holds on the week's own. Held on a schedule of the audit's own
     (rule (c)): made-up nights in October and November 2019, before every game the payload holds, so no night of
     its own comes before them, with a Saturday night and a Sunday afternoon game (neither a prime-time night), a
     Monday doubleheader, a Thursday after it in the next week, and the Sunday the clocks went back; pbGames (that
     made-up week's games to come), pricedLegs and spSet stood in, the games put on the schedule and taken off
     after, and the page's clock set to each moment and put back. Each case's answer is written beside it, and the
     audit's own rule (nightRuleAud, through the time zone database) must give it too. Blocking: which games, the
     instant, the Finish, the redraw; W.wording the line's words */
  { const nowM=w.Date.now, at=ms=>{ w.Date.now=()=>ms; }, stab=d.getElementById('tab-suggest'), keepTab=stab.hidden, keepPar=JSON.stringify(S.parlay||{}), keepBP=S.bookPrice;
    const mk=(id,wk,dd,tt,a,h)=>({id:`2019_${wk}_${id}`,w:wk,d:dd,t:tt,a,h,mla:110,mlh:-130,sp:2.5,spa:-110,sph:-110});
    const T1=mk('T1',97,'2019-10-17','20:20','AT1','HT1'), SA=mk('SA',97,'2019-10-19','20:15','ASA','HSA'), SD=mk('SD',97,'2019-10-20','13:00','ASD','HSD'), S1=mk('S1',97,'2019-10-20','20:20','AS1','HS1');
    const M1a=mk('M1a',97,'2019-10-21','19:15','AMA','HMA'), M1b=mk('M1b',97,'2019-10-21','20:15','AMB','HMB'), T2=mk('T2',98,'2019-10-24','20:15','AT2','HT2');
    const T3=mk('T3',99,'2019-10-31','20:20','AT3','HT3'), S2=mk('S2',99,'2019-11-03','20:20','AS2','HS2'), M2=mk('M2',99,'2019-11-04','20:15','AM2','HM2');
    const FX=[T1,SA,SD,S1,M1a,M1b,T2,T3,S2,M2], Z=s=>Date.parse(s);
    const set=g=>{ const L=F('pbOrder')([{key:`${g.id}|team:${g.h}|ml`,gid:g.id,pid:'team:'+g.h,stat:'ml',k:0,side:'over',main:false,p:0.6,price:-130,src:'real',mu:null,name:'Night '+g.h,pos:'Game',grp:'TEAM',team:g.h,opp:g.a,week:g.w,label:'To win',thin:false},
        {key:`${g.id}|team:${g.a}|ats`,gid:g.id,pid:'team:'+g.a,stat:'ats',k:2.5,side:'over',main:false,p:0.56,price:-110,src:'real',mu:null,name:'Night '+g.a,pos:'Game',grp:'TEAM',team:g.a,opp:g.h,week:g.w,label:'To cover +2.5',thin:true}]);
      const why='Only 2 legs in this game.';
      return {gid:g.id,tiers:[{id:'safe',label:'Safe',n:2,floor:0,legs:L,corr:0.33,indep:0.33,dec:3.2,thin:1},{id:'med',label:'Medium',n:3,floor:0.25,why},{id:'aggr',label:'Aggressive',n:4,floor:0.12,why},{id:'xtrm',label:'Extreme',n:5,floor:0.05,why}]}; };
    let nCase=0, nTurn=0; const keepF=w.eval('[pbGames, pricedLegs, spSet]');
    try{
      S.sched.push(...FX); S.parlay={}; S.bookPrice=null; stab.hidden=false; spKeyClear();
      w.__m11={FX,sets:Object.fromEntries(FX.map(g=>[g.id,set(g)]))};
      /* the made-up week of the first made-up game still to come, as pbGames is the current week's */
      w.eval(`pbGames=function(){ const up=window.__m11.FX.filter(g=>!gameStarted(g)&&!hasScore(g)); return up.length?up.filter(g=>g.w===up[0].w):[]; };
        pricedLegs=function(){ return []; }; spSet=function(gid){ return window.__m11.sets[gid]||null; };`);
      const toCome=()=>FX.filter(g=>kickAud(g)>w.Date.now()), wkOf=()=>{ const u=toCome(); return u.length?u.filter(g=>g.w===u[0].w):[]; };
      /* (app v118) the nights are the tab's Night games section; the Sunday slot, M15's, its own section until app v129
         put it in the same one, after the nights (SP_NG and SP_NW leave it out) */
      const NS='#spPanel [data-sp-sec="night"]', idsS=a=>a.map(g=>g.id).sort().join(), drawnIds=()=>[...d.querySelectorAll(SP_NG)].map(x=>x.dataset.spGame).sort().join();
      const TN=F('TEAM_NAMES'), nm=g=>`${TN[g.a]||g.a} at ${TN[g.h]||g.h}`;
      /* [the moment, the games set out, or (when none) the night waited for and the instant it goes up and the line's words] */
      const CASES=[
        ['a first night with no prime-time night before it: up at once','2019-10-17T16:00:00Z',[T1]],
        ['Sunday night, the Friday before at 5:59 am ET (the night before it Thursday)','2019-10-18T09:59:00Z',null,[S1],'2019-10-18T10:00:00Z',`Next up: Sunday night, ${nm(S1)}. Set goes up Fri 6:00 AM ET.`],
        ['Sunday night, the Friday before at 6:00 am ET','2019-10-18T10:00:00Z',[S1]],
        ['Sunday night on the Saturday, a Saturday night game to come (not a prime-time night, so not the night before)','2019-10-19T16:00:00Z',[S1]],
        ['Monday\'s doubleheader after Sunday night\'s kickoff, 5:59 am ET Monday','2019-10-21T09:59:00Z',null,[M1a,M1b],'2019-10-21T10:00:00Z',`Next up: Monday night, ${nm(M1a)} and ${nm(M1b)}. Sets go up Mon 6:00 AM ET.`],
        ['Monday\'s doubleheader at 6:00 am ET Monday: both games together','2019-10-21T10:00:00Z',[M1a,M1b]],
        ['the doubleheader\'s second game, once the first has kicked off','2019-10-21T23:30:00Z',[M1b]],
        ['a Thursday after the Monday doubleheader, in the next week, 5:59 am ET Tuesday','2019-10-22T09:59:00Z',null,[T2],'2019-10-22T10:00:00Z',`Next up: Thursday night, ${nm(T2)}. Set goes up Tue 6:00 AM ET.`],
        ['that Thursday at 6:00 am ET Tuesday','2019-10-22T10:00:00Z',[T2]],
        ['Sunday night after a Thursday a week on, 5:59 am ET Friday (still EDT)','2019-11-01T09:59:00Z',null,[S2],'2019-11-01T10:00:00Z',`Next up: Sunday night, ${nm(S2)}. Set goes up Fri 6:00 AM ET.`],
        ['Monday night after the Sunday the clocks went back: 5:30 am EST, 10:30 UTC (6:00 am on the summer clock)','2019-11-04T10:30:00Z',null,[M2],'2019-11-04T11:00:00Z',`Next up: Monday night, ${nm(M2)}. Set goes up Mon 6:00 AM ET.`],
        ['that Monday at 6:00 am EST, 11:00 UTC','2019-11-04T11:00:00Z',[M2]]];
      for(const [lab,t,on,next,open,line] of CASES){ nCase++; const ms=Z(t); at(ms); dropCaches(); F('renderParlay')();
        const own=nightRuleAud(wkOf(),S.sched,ms), want=on||[], ownOn=own.up?own.games:[];
        chk(idsS(ownOn)===idsS(want)&&(on?true:idsS(own.games)===idsS(next)&&own.open===Z(open)),`M11, ${lab}: the audit's own night rule gives ${idsS(ownOn)||'none'} set out (the next night ${idsS(own.games)}, up from ${own.open!=null?isoAud(own.open):'the start'}), not the case's answer`);
        chk(idsS(F('spOn')())===idsS(want)&&drawnIds()===idsS(want),`M11, ${lab}: the tab sets out ${idsS(F('spOn')())||'no game'} and draws ${drawnIds()||'none'}, where the rule sets out ${idsS(want)||'none'}`);
        const wt=d.querySelectorAll(SP_NW);
        if(on) chk(!wt.length,`M11, ${lab}: the tab says the next night is not up yet, and it is`);
        else { chk(wt.length===1&&wt[0].dataset.spWait===open&&String(wt[0].dataset.spNext||'').split(' ').sort().join()===idsS(next),`M11, ${lab}: the tab does not say the next night is ${idsS(next)}, up from ${open}: ${wt[0]?wt[0].outerHTML.slice(0,300):'no line'}`);
          W.wording(!!wt[0]&&wt[0].textContent===line,`M11, ${lab}: the line reads "${wt[0]?wt[0].textContent:''}", not "${line}"`); }
        /* each set out drawn with its Safe level's Value pick marked Value and its thin leg unmarked, and (app v113) no
           line under it saying why that leg is not a Value pick: a set's cards are quiet (the made-up set holds one of each) */
        for(const g of want){ const c=d.querySelector(`${NS} [data-sp-game="${g.id}"] .pb-tier.safe`), L=w.__m11.sets[g.id].tiers[0].legs, li=c?[...c.querySelectorAll('.pb-legs li')]:[];
          chk(li.length===L.length&&L.every((l,i)=>{ const m=li[i].querySelectorAll('.pb-valmark'); return l.thin?!m.length:m.length===1&&m[0].textContent==='Value'; })&&!/thin edge|no edge/i.test(c.textContent),
            `M11, ${lab}: ${g.id}'s Safe card does not mark Value its Value pick alone`);
          W.wording(!!c&&!c.querySelector('p.pb-thin:not(.pb-espnline):not(.sp-upd)')&&!/is not a Value pick: the model rates/.test(c.textContent),`M11, ${lab}: ${g.id}'s Safe card still draws a line saying why its thin leg is not a Value pick, which a set's cards no longer draw`); }
        /* a level's Finish names only a game the tab sets out */
        for(const g of toCome().filter(primeAud)){ const x=F('spTier')(`${g.id}:safe`), sh=want.some(y=>y.id===g.id);
          chk(sh?!!x&&x.legs.map(legIdAud).join()===w.__m11.sets[g.id].tiers[0].legs.map(legIdAud).join():x===null,`M11, ${lab}: the Safe level of ${g.id}, ${sh?'set out':'not set out'}, is ${x?'':'not '}found for its Finish`); } }
      /* the turn on an open page: drawn a minute before 6:00 am ET with the next night waited for, then the page's
         half-minute look at 6:00 am redraws it with that night's sets, only because the games it sets out have
         moved (no game has kicked off in between), and a look after that redraws nothing */
      for(const [lab,before,turn,want] of [['Monday\'s doubleheader','2019-10-21T09:59:00Z','2019-10-21T10:00:00Z',[M1a,M1b]],['the Monday after the clocks went back','2019-11-04T10:59:00Z','2019-11-04T11:00:00Z',[M2]]]){ nTurn++;
        at(Z(before)); dropCaches(); F('renderParlay')();
        const st0=F('spState')(), gm0=F('pbGames')().map(g=>g.id).join(), drawn0=drawnIds(), stale0=F('pbStale')();
        at(Z(turn)); const st1=F('spState')(), gm1=F('pbGames')().map(g=>g.id).join(), stale1=F('pbStale')();
        w.pbWatchTick(); const drawn1=drawnIds(), node=d.querySelector(SP_NG); w.pbWatchTick();
        chk(!drawn0&&!stale0&&gm0===gm1&&st0!==st1&&stale1&&drawn1===idsS(want)&&d.querySelector(SP_NG)===node&&!F('pbStale')(),
          `M11, ${lab}: at the turn the page's state did not move, or its look did not redraw it once with the night's sets: drawn ${drawn0||'none'} then ${drawn1||'none'}, stale ${stale0} then ${stale1}, the games to come ${gm0===gm1?'the same':'moved'}`); }
    } catch(e){ chk(false,'M11 threw: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' ')); }
    finally {
      w.Date.now=nowM; for(const g of FX){ const i=S.sched.findIndex(x=>x.id===g.id); if(i>=0) S.sched.splice(i,1); }
      w.__m11k=keepF; w.eval('pbGames=window.__m11k[0]; pricedLegs=window.__m11k[1]; spSet=window.__m11k[2];'); delete w.__m11k; delete w.__m11;
      spKeyClear(); try{ if(spKey0!=null) w.localStorage.setItem(SPK,spKey0); }catch(e){}
      stab.hidden=keepTab; S.parlay=JSON.parse(keepPar); S.bookPrice=keepBP; dropCaches(); F('save')(); F('renderParlay')(); }
    console.log(`M11. one night at a time, on made-up nights of 2019: ${nCase} moments (a first night up at once; Sunday night up the Friday morning after Thursday's, a Saturday night and a Sunday afternoon game no night before it; Monday's doubleheader together from Monday 6:00 am, its second game alone once the first kicked off; a Thursday the Tuesday after; 6:00 am Eastern on either clock), each with its Finish; ${nTurn} turns redrawn by the page's own look`); }

  /* ---- M15. the Sunday slot (app v118, the owner's calls of 19 October 2026: "I would like it to have ELO picks for the
     slot of Sunday games", and "do a separate section for night games and then the sunday slot of games") ----
     Every Sunday game of a week kicking off before 7:00 pm Eastern (the 1pm and 4pm windows and a game abroad that
     morning) is one unit, <season>_<WW>_SUN, the last part of the tab's Night games section (its own section from app
     v118 until app v129: SP_SG, SP_SW and SP_SN pick it out): the current week's slot, else the next
     week's, whichever still has a game to kick off. Its set goes up at 6:00 AM Eastern on the day after the latest
     prime-time night before its Sunday on the schedule (none before it: at once), as a night's does, and until then one
     line says which slot is next and when its sets go up (data-sp-wait, the instant; data-sp-next, its id); it is live
     until 2 hours before its first kickoff, then locked (this browser's own set where the record has none, the record's
     slot entry where it has one, which a look at the lock reads again), and from its first kickoff to its last under
     way: shown as it locked with nothing to add or finish (no leg's Add, no Add to builder, no Finish, and spTier finds
     none of its levels); at its last kickoff it is gone, for the next week's line. The state the page watches (spState,
     its s= token) moves at each turn, so the half-minute look (pbWatchTick) redraws an open page once. Held on a
     schedule of the audit's own (rule (c)): made-up weeks in October and November 2019, before every game the payload
     holds, so no night of its own comes before them: a Sunday with no prime-time night before it, a week with a Thursday
     night, a Saturday night game (no prime-time night), a game abroad at 9:30 am, two at 1:00 pm (the schedule's order
     kept on the tie), one at 6:59 pm and a Sunday night game at 7:00 pm (prime time, not the slot), a week of two Sunday
     games, and the Sunday the clocks went back. The page's currentWeek (the made-up week of the first made-up game not
     final, as liveWeek reads a week), pricedLegs and spSet stood in, each in a slot of its own and put back on every
     path, the games put on the schedule and taken off after, the page's clock set to each moment and put back, and the
     record read through a stub that answers for it alone. Each moment's answer is written beside it, and the audit's own
     rule (slotRuleAud, through the time zone database) must give it too. Blocking: which games, the unit's id, the
     instant, the phase, what can be added or finished, the levels kept and the record's, the token, the redraw;
     W.wording the words */
  { const nowM=w.Date.now, at=ms=>{ w.Date.now=()=>ms; }, stab=d.getElementById('tab-suggest'), keepTab=stab.hidden, keepPar=JSON.stringify(S.parlay||{}), keepBP=S.bookPrice;
    const mk=(id,wk,dd,tt)=>({id:`2019_${wk}_${id}`,w:wk,d:dd,t:tt,a:'A'+id,h:'H'+id,mla:110,mlh:-130,sp:2.5,spa:-110,sph:-110});
    /* week 96, a Sunday alone; week 97, Thursday night, a Saturday night game, the slot (09:30 abroad, two at 13:00 with
       E2 before E1 on the schedule, 18:59), Sunday night at 19:00 and Monday night; week 98, Thursday, two Sunday games,
       Sunday and Monday nights; week 99, the same around the Sunday the clocks went back */
    const A1=mk('A1',96,'2019-10-13','13:00'), A2=mk('A2',96,'2019-10-13','16:25');
    const T1=mk('T1',97,'2019-10-17','20:20'), SA=mk('SA',97,'2019-10-19','20:15'), L1=mk('L1',97,'2019-10-20','09:30'), E2=mk('E2',97,'2019-10-20','13:00'), E1=mk('E1',97,'2019-10-20','13:00'),
      LT=mk('LT',97,'2019-10-20','18:59'), N7=mk('N7',97,'2019-10-20','19:00'), M7=mk('M7',97,'2019-10-21','20:15');
    const T2=mk('T2',98,'2019-10-24','20:15'), B1=mk('B1',98,'2019-10-27','13:00'), B2=mk('B2',98,'2019-10-27','16:05'), N8=mk('N8',98,'2019-10-27','20:20'), M8=mk('M8',98,'2019-10-28','20:15');
    const T3=mk('T3',99,'2019-10-31','20:20'), C1=mk('C1',99,'2019-11-03','13:00'), C2=mk('C2',99,'2019-11-03','16:25'), N9=mk('N9',99,'2019-11-03','20:20'), M9=mk('M9',99,'2019-11-04','20:15');
    const FX=[A1,A2,T1,SA,L1,E2,E1,LT,N7,M7,T2,B1,B2,N8,M8,T3,C1,C2,N9,M9], Z=s=>Date.parse(s), SEA=F('SEASON'), sid=wk=>`${SEA}_${wk}_SUN`;
    /* the made-up sets: a home side to win on each game, priced -125 and -120 where the schedule has -130, so a leg put in
       at the line as it stands now (toggleLeg's reading) is told from one put in as it was locked; a night game's Safe its
       home side and its away cover, the slot's Safe and Medium across its first games in kickoff order */
    const legOf=(g,p,price)=>({key:`${g.id}|team:${g.h}|ml`,gid:g.id,pid:'team:'+g.h,stat:'ml',k:0,side:'over',main:false,p,price,src:'real',mu:null,name:'Slot '+g.h,pos:'Game',grp:'TEAM',team:g.h,opp:g.a,week:g.w,label:'To win',thin:false});
    const lvl=(id,legs)=>{ const sp=SPEC_AUD.find(x=>x[0]===id), why=`Made up: no ${sp[2]}-leg parlay.`;
      if(!legs||legs.length!==sp[2]) return {id,label:sp[1],n:sp[2],floor:sp[3],why};
      const L=F('pbOrder')(legs), pr=F('parlayProb')(L); return {id,label:sp[1],n:sp[2],floor:sp[3],legs:L,corr:pr.corr,indep:pr.indep,dec:F('parlayDec')(L.map(l=>({leg:l,ml:l.price}))),thin:0,mkt:0,likeliest:!!sp[3]&&pr.corr<sp[3]}; };
    const slotSet=(G,pick)=>{ const P=[[0.62,-125],[0.6,-120],[0.58,-115]], L=G.slice(0,3).map((g,i)=>legOf(g,...P[i])), o=pick||[0,1];
      return {gid:null,tiers:[lvl('safe',o.map(i=>L[i]).filter(Boolean)),lvl('med',L.length>=3?L:null),lvl('aggr',null),lvl('xtrm',null)]}; };
    const nightSet=g=>({gid:g.id,tiers:[lvl('safe',[legOf(g,0.6,-125),{...legOf(g,0.56,-110),key:`${g.id}|team:${g.a}|ats`,pid:'team:'+g.a,stat:'ats',k:2.5,name:'Slot '+g.a,team:g.a,opp:g.h,label:'To cover +2.5'}]),lvl('med',null),lvl('aggr',null),lvl('xtrm',null)]});
    const SETS={}; for(const g of FX) if(primeAud(g)) SETS[g.id]=nightSet(g);
    for(const wk of [96,97,98,99]){ const G=slotGamesAud(FX,wk); SETS[sid(wk)]={...slotSet(G),gid:sid(wk)}; }
    /* the stand-ins' own week: that of the first made-up game not final (a score, or four hours past its kickoff), as the
       page's liveWeek reads one; the last made-up week once every one is */
    const cwAud=now=>{ const up=FX.filter(g=>!(scoredAud(g)||now>=kickAud(g)+4*3600e3)); return up.length?up[0].w:FX[FX.length-1].w; };
    const keepF=w.eval('[currentWeek, pricedLegs, spSet]'), fetch0=w.fetch, asked=[];
    /* (app v132) the slot's own moments, Sunday evenings among them: Day games drawn whatever the hour (off on a Sunday
       from 4pm Eastern, held on the week as it stands) */
    w.__dayOff15=w.eval('spDayOff'); w.eval('spDayOff=function(){ return false; }'); w.__dayStood=true;
    /* the record answered by a stub of its own (the backtest left to the page's fetch, which answers nothing here) */
    let recBody=404; const recStub=(u,o)=>{ if(/suggest_ledger/.test(String(u))){ asked.push(o&&o.cache); return Promise.resolve(recBody===404?{ok:false,status:404,json:async()=>{throw new Error('404');}}:{ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(recBody))}); } return fetch0(u,o); };
    const SS=SPD, slotBox=()=>d.querySelector(SP_SG), tokOf=()=>(F('spState')().split(',').find(x=>x.startsWith('s='))||'(none)');
    const legsDrawn=box=>SPEC_AUD.map(([id])=>{ const c=box&&box.querySelector(`.pb-tier.${id}`); return c&&c.querySelector('.pb-legs')?[...c.querySelectorAll('.pb-legs li')].map(li=>li.textContent.replace(/\s+/g,' ').trim()).join(' | '):null; });
    const legsOf=tiers=>tiers.map(t=>t&&t.legs?t.legs.map(l=>l.gid+'|'+l.pid+'|'+l.stat).join():null);
    let nCase=0, nTurn=0; const said15=[];
    try{
      S.sched.push(...FX); S.parlay={}; S.bookPrice=null; stab.hidden=false; spKeyClear();
      w.__m15={FX,SETS,cw:cwAud};
      w.eval(`currentWeek=function(){ return window.__m15.cw(Date.now()); };
        pricedLegs=function(){ return []; }; spSet=function(gid){ return window.__m15.SETS[gid]||null; };`);
      w.fetch=recStub; await w.pbRecLoad(); w.fetch=fetch0;
      /* the moments, in order: [what, the moment, the slot's week or null for none, its phase, the instant it goes up (wait),
         its games] */
      const CASES=[
        ['a Sunday with no prime-time night before it on the schedule: up at once','2019-10-12T12:00:00Z',96,'live',null,[A1,A2]],
        ['that Sunday at its last kickoff, 4:25 pm ET: gone, the next week\'s slot waited for','2019-10-13T20:25:00Z',97,'wait','2019-10-18T10:00:00Z',[L1,E2,E1,LT]],
        ['Friday 5:59 am ET, the morning after Thursday night','2019-10-18T09:59:00Z',97,'wait','2019-10-18T10:00:00Z',[L1,E2,E1,LT]],
        ['Friday 6:00 am ET: up','2019-10-18T10:00:00Z',97,'live',null,[L1,E2,E1,LT]],
        ['the Saturday, a Saturday night game to come (no prime-time night)','2019-10-19T16:00:00Z',97,'live',null,[L1,E2,E1,LT]],
        ['Sunday 7:29 am ET, a minute before its lock (2 hours before the 9:30 am game abroad)','2019-10-20T11:29:00Z',97,'live',null,[L1,E2,E1,LT]],
        ['Sunday 7:30 am ET: locked, this browser\'s own set','2019-10-20T11:30:00Z',97,'locked',null,[L1,E2,E1,LT]],
        ['Sunday 9:30 am ET, its first kickoff: under way','2019-10-20T13:30:00Z',97,'under',null,[L1,E2,E1,LT]],
        ['Sunday 6:58 pm ET, still under way before its 6:59 pm game','2019-10-20T22:58:00Z',97,'under',null,[L1,E2,E1,LT]],
        ['Sunday 6:59 pm ET, its last kickoff: gone, with Sunday night\'s 7:00 pm game no part of it','2019-10-20T22:59:00Z',98,'wait','2019-10-25T10:00:00Z',[B1,B2]],
        ['the Sunday the clocks went back: Friday 5:59 am EDT','2019-11-01T09:59:00Z',99,'wait','2019-11-01T10:00:00Z',[C1,C2]],
        ['that Sunday at 10:59 am EST, a minute before its lock (1:00 pm EST less 2 hours)','2019-11-03T15:59:00Z',99,'live',null,[C1,C2]],
        ['11:00 am EST: locked','2019-11-03T16:00:00Z',99,'locked',null,[C1,C2]],
        ['1:00 pm EST: under way','2019-11-03T18:00:00Z',99,'under',null,[C1,C2]],
        ['4:25 pm EST, its last kickoff, no later week: none','2019-11-03T21:25:00Z',null,null,null,[]]];
      for(const [lab,t,wk,phase,open,games] of CASES){ nCase++; const ms=Z(t); at(ms); dropCaches(); F('renderParlay')();
        const R=slotRuleAud(S.sched,ms,cwAud(ms)), gl=`M15, ${lab}`, ids=a=>a.map(g=>g.id).join();
        /* the audit's own rule gives the case's answer */
        chk(wk==null?!R:(!!R&&R.w===wk&&R.id===sid(wk)&&R.phase===phase&&ids(R.games)===ids(games)&&(phase!=='wait'||R.open===Z(open))),
          `${gl}: the audit's own rule gives ${R?`${R.id} (${ids(R.games)}) ${R.phase}${R.open!=null?', up from '+isoAud(R.open):''}`:'none'}, not the case's answer`);
        /* the page's own answer is the rule's */
        const pS=F('spSlotNext')();
        chk(R?(!!pS&&pS.id===R.id&&ids(pS.games)===ids(R.games)&&pS.up===R.up&&(pS.open==null?null:+pS.open)===R.open):!pS,
          `${gl}: the page's Sunday slot is ${pS?`${pS.id} (${ids(pS.games)}), ${pS.up?'up':'not up'}`:'none'}, where the rule gives ${R?`${R.id} (${ids(R.games)}), ${R.up?'up':'not up'}`:'none'}`);
        chk(tokOf()===slotTokAud(R),`${gl}: the page's state carries ${tokOf()} for the Sunday slot, where the rule gives ${slotTokAud(R)}`);
        const box=slotBox(), wt=[...d.querySelectorAll(SP_SW)], nn=d.querySelector(SP_SN), lv=R?SETS[R.id].tiers.filter(x=>x.legs):[];
        /* (app v129) in the one Night games section, after the night's sets, and no section of its own */
        chk(spPartsAud(),`${gl}: the Sunday slot is not the one last part of the Night games section, after the night's sets, or has a section of its own`);
        if(!R){ chk(!box&&!wt.length&&!!nn,`${gl}: with no slot to come its section draws ${box?'a set':wt.length?'a wait line':'no line saying so'}`);
          W.wording(!!nn&&nn.textContent===`No Sunday game left in week ${cwAud(ms)}.`,`${gl}: the slot's section reads "${nn?nn.textContent:''}"`);
          for(const g of [L1,C1]) chk(F('spTier')(`${sid(g.w)}:safe`)===null,`${gl}: a gone slot's Safe is found for its Finish`); continue; }
        if(phase==='wait'){ chk(!box&&!nn&&wt.length===1&&wt[0].dataset.spWait===open&&wt[0].dataset.spNext===R.id,`${gl}: the slot's section does not say ${R.id} is next, up from ${open}: ${wt[0]?wt[0].outerHTML.slice(0,300):box?'a set drawn':'no line'}`);
          W.wording(!!wt[0]&&wt[0].textContent===slotWaitAud(R),`${gl}: the line reads "${wt[0]?wt[0].textContent:''}", not "${slotWaitAud(R)}"`);
          for(const x of lv) chk(F('spTier')(`${R.id}:${x.id}`)===null,`${gl}: the ${x.id} level of the slot, not set out yet, is found for its Finish`);
          continue; }
        /* set out: the unit, its line, its head, its cards and what can be added or finished */
        const ph=box&&box.querySelector('[data-sp-phase]'), v=F('spShown')(F('spUnit')(R.id)), want=phase==='live'?'live':phase==='under'?'under':(v.own?'own':'locked');
        chk(!!box&&box.dataset.spGame===R.id&&box.classList.contains('sp-slot')&&!wt.length&&!nn&&!!ph&&ph.dataset.spPhase===want&&(phase!=='locked'||v.own),
          `${gl}: the slot's section draws ${box?box.dataset.spGame+' '+(ph?ph.dataset.spPhase:'with no line'):'no set'}, where ${R.id} is ${phase}${phase==='locked'?' (this browser\'s own set, the record having none)':''}`);
        { const wantL=phase==='live'?`Locks ${etAud(R.lock)}.`:phase==='under'?`Locked since ${etAud(R.lock)}. Under way since ${etAud(R.first)}.${v.none?' Not published in time.':v.own?' This browser’s own set (not graded).':''}`:`Locked since ${etAud(R.lock)}. This browser’s own set (not graded).`;
          W.wording(!!ph&&ph.textContent===wantL,`${gl}: the slot's line reads "${ph?ph.textContent:''}", not "${wantL}"`);
          const H=slotHeadAud(R), h=box&&box.querySelector('.sp-hd h4'), sm=box&&box.querySelector('.sp-hd small');
          const pl=box?[...box.querySelectorAll('.sp-hd .pill')]:[];
          W.wording(!!h&&h.textContent===H.h&&!!sm&&sm.textContent===H.small&&pl.length===1&&pl[0].textContent==='Sunday slot',`${gl}: the slot is headed "${h?h.textContent:''}" "${pl.map(x=>x.textContent).join('|')}" "${sm?sm.textContent:''}", not "${H.h}" "Sunday slot" "${H.small}"`); }
        if(!box) continue;
        const shown=phase==='live'?SETS[R.id].tiers:(v.tiers||[]);
        chk(JSON.stringify(legsOf(shown))===JSON.stringify(legsOf(SETS[R.id].tiers)),`${gl}: the slot's ${phase} set is not the one built for it${phase==='live'?'':' and kept at its lock'}`);
        for(const x of shown.filter(y=>y&&y.legs)){ const c=box.querySelector(`.pb-tier.${x.id}`), f=F('spTier')(`${R.id}:${x.id}`);
          if(phase==='under') chk(!!c&&c.querySelectorAll('.pb-legs li').length===x.legs.length&&!c.querySelector('[data-pb-leg],[data-sp-add],[data-pc-finish]')&&f===null,
            `${gl}: under way, the slot's ${x.id} level is not drawn as it locked with nothing to add or finish, or is found for its Finish`);
          else chk(!!c&&x.legs.every(l=>!!c.querySelector(`[data-pb-leg="${l.key}"][data-side="${l.side}"]`))&&!!c.querySelector(`[data-sp-add="${R.id}:${x.id}"]`)&&!!f&&f.legs.map(legIdAud).join()===x.legs.map(legIdAud).join(),
            `${gl}: the slot's ${x.id} level is not drawn with each leg's Add and Add to builder, or not found for its Finish with its own legs`); }
        if(phase==='under') chk(!box.querySelector('[data-sp-add],[data-pb-leg],[data-pc-finish]'),`${gl}: under way, the slot still offers an Add, an Add to builder or a Finish`);
        /* at its lock with no record: the set this browser built kept under the slot's id and first kickoff; and a locked
           leg's own Add, and the level's Add to builder, put each leg in as it was locked (its price, -125 or -120, where the
           schedule says -130 now), never as the line stands now */
        if(phase==='locked'){ const K=spKeyGet(), e=K&&K.games&&K.games[R.id];
          chk(!!e&&e.own===true&&e.kickoff===isoAud(R.first)&&Array.isArray(e.tiers)&&JSON.stringify(e.tiers.map(x=>x.legs?x.legs.map(l=>l.gid+'|'+l.pid+'|'+l.stat).join():null))===JSON.stringify(legsOf(SETS[R.id].tiers)),
            `${gl}: at the slot's lock with no record, this browser does not keep the set it built under ${R.id} and its first kickoff: ${String(JSON.stringify(e)).slice(0,240)}`);
          const t0=shown.find(y=>y.id==='safe'), l1=t0&&t0.legs[1], key=l1&&l1.key, sel=`${SP_SG} .pb-tier.safe [data-pb-leg="${key}"][data-side="over"]`;
          S.parlay={}; F('renderParlay')(); const b=key&&d.querySelector(sel); if(b){ b.focus(); b.click(); }
          const x=key&&S.parlay[key];
          chk(!!b&&!!x&&Object.keys(S.parlay).length===1&&x.price===l1.price&&x.p===l1.p&&x.k===l1.k,`${gl}: the Add on a leg of the slot's locked Safe did not put it in as it was locked (${l1&&l1.name} at ${l1&&l1.price}, ${l1&&l1.p}): ${x?`at ${x.price}, ${x.p}`:'nothing put in'}`);
          S.parlay={}; F('renderParlay')();
          const ab=d.querySelector(`${SP_SG} [data-sp-add="${R.id}:safe"]`); if(ab) ab.click();
          chk(!!ab&&Object.keys(S.parlay).length===t0.legs.length&&t0.legs.every(l=>!!S.parlay[l.key]&&S.parlay[l.key].price===l.price&&S.parlay[l.key].p===l.p),`${gl}: the slot's locked Safe's Add to builder did not put its legs in as they were locked`);
          S.parlay={}; F('renderParlay')(); }
        said15.push(`${t.slice(5,16)} ${R.id.slice(5)} ${phase}`); }
      /* the turns on an open page, each on the record read as the page last read it (none): drawn a minute before, then the
         page's half-minute look at the turn redraws it once, because the slot's token in the state it watches has moved
         (the opening, the lock, the first kickoff, the last), and a second look redraws nothing. At the lock the look reads
         the record again, once, with no-store, and the record's slot entry (taken before the lock) is then the set drawn,
         locked, for every visitor, through to its games under way */
      const recSet=slotSet(slotGamesAud(FX,97),[0,2]), recOut=recSet.tiers.map(x=>F('spTierOut')(x));
      const REC={how:'made up',prime:{},slot:{[`${SEA}|97|${isoAud(kickAud(L1))}|${sid(97)}`]:{season:SEA,week:97,gid:sid(97),kickoff:isoAud(kickAud(L1)),lock:isoAud(kickAud(L1)-7200e3),baked_at:'2019-10-20T09:00:00Z',taken_at:'2019-10-20T09:00:00Z',games:slotGamesAud(FX,97).map(g=>g.id),pool:{pref:4,thin:0,mkt:0},tiers:recOut}}};
      chk(JSON.stringify(legsOf(recSet.tiers))!==JSON.stringify(legsOf(SETS[sid(97)].tiers)),'M15: the record\'s made-up slot set is the page\'s own, so the case cannot tell them apart');
      /* [the turn, a minute before it, the turn, the slot's token before and after, whether it is a lock (the record read
         again), the record the read again answers with (the first lock's: its slot entry; the second's: none, so this
         browser's own set stands)] */
      for(const [lab,before,turn,s0,s1,lockT,rec] of [['the opening','2019-10-18T09:59:00Z','2019-10-18T10:00:00Z',`s=${sid(97)}:w`,`s=${sid(97)}:l`,false,null],
          ['the lock','2019-10-20T11:29:00Z','2019-10-20T11:30:00Z',`s=${sid(97)}:l`,`s=${sid(97)}:k`,true,REC],
          ['the first kickoff','2019-10-20T13:29:00Z','2019-10-20T13:30:00Z',`s=${sid(97)}:k`,`s=${sid(97)}:u`,false,null],
          ['the last kickoff','2019-10-20T22:58:00Z','2019-10-20T22:59:00Z',`s=${sid(97)}:u`,`s=${sid(98)}:w`,false,null],
          ['the lock after the clocks went back','2019-11-03T15:59:00Z','2019-11-03T16:00:00Z',`s=${sid(99)}:l`,`s=${sid(99)}:k`,true,null]]){ nTurn++;
        at(Z(before)); if(lab==='the opening'||lab==='the lock after the clocks went back'){ spKeyClear(); recBody=404; } dropCaches();
        /* the record read now, as a load would (PB_REC_STATE: which side of its lock the slot was on when it was read) */
        w.fetch=recStub; await w.pbRecLoad(); w.fetch=fetch0; F('renderParlay')();
        const st0=tokOf(), stale0=F('pbStale')(), n0=asked.length;
        at(Z(turn)); const st1=tokOf(), stale1=F('pbStale')();
        if(rec) recBody=REC;
        w.fetch=recStub;
        try{ w.pbWatchTick(); const node=d.querySelector(SS)&&d.querySelector(SS).firstElementChild; w.pbWatchTick();
          const one=asked.length-n0, same=!!node&&d.querySelector(SS)&&d.querySelector(SS).firstElementChild===node, stale2=F('pbStale')();
          await sleep(30);
          chk(st0===s0&&st1===s1&&!stale0&&stale1&&same&&!stale2,`M15, ${lab}: the slot's token moved ${st0} to ${st1} (the rule: ${s0} to ${s1}), stale ${stale0} then ${stale1}, or the page's look did not redraw it once`);
          chk(lockT?(one===1&&asked[asked.length-1]==='no-store'):one===0,`M15, ${lab}: the look asked for the record ${one} time${one===1?'':'s'}${lockT?', not once with no-store':', where no set reached its lock'}`); }
        finally { w.fetch=fetch0; }
        const R=slotRuleAud(S.sched,Z(turn),cwAud(Z(turn))), box=slotBox(), ph=box&&box.querySelector('[data-sp-phase]');
        if(rec){ const v=F('spShown')(F('spUnit')(sid(97)));
          const sTx=legsDrawn(box)[0]||'';
          chk(!!ph&&ph.dataset.spPhase==='locked'&&!v.own&&v.ledger&&JSON.stringify(legsOf(v.tiers))===JSON.stringify(legsOf(recSet.tiers))&&sTx.includes('Slot HE1')&&!sTx.includes('Slot HE2'),
            `M15, ${lab}: read again at the lock, the record's slot entry is not the set drawn, locked: ${ph?ph.dataset.spPhase:'no line'}, ${JSON.stringify(legsOf(v.tiers||[]))}`);
          W.wording(!!ph&&ph.textContent===`Locked since ${etAud(R.lock)}.`,`M15, ${lab}: the record's locked slot reads "${ph?ph.textContent:''}", not "Locked since ${etAud(R.lock)}."`); }
        if(lab==='the first kickoff'){ const v=F('spShown')(F('spUnit')(sid(97)));
          chk(!!ph&&ph.dataset.spPhase==='under'&&!!v.under&&JSON.stringify(legsOf(v.tiers))===JSON.stringify(legsOf(recSet.tiers))&&!box.querySelector('[data-sp-add],[data-pb-leg],[data-pc-finish]')&&F('spTier')(`${sid(97)}:safe`)===null,
            `M15, ${lab}: under way, the slot is not the record's set as it locked, with nothing to add or finish`); }
        if(lockT&&!rec){ const v=F('spShown')(F('spUnit')(sid(99)));
          chk(!!ph&&ph.dataset.spPhase==='own'&&v.own&&JSON.stringify(legsOf(v.tiers))===JSON.stringify(legsOf(SETS[sid(99)].tiers)),`M15, ${lab}: read again at the lock and the record holding no entry for it, the slot is not this browser's own set: ${ph?ph.dataset.spPhase:'no line'}`); }
        if(lab==='the last kickoff') chk(!box&&!!d.querySelector(`${SP_SW}[data-sp-next="${sid(98)}"]`),`M15, ${lab}: at its last kickoff the slot is still drawn, or the next week's is not waited for`); }
      said15.push(`${nTurn} turns redrawn once by the page's own look, the record read again at the lock and its slot entry drawn`);
    } catch(e){ chk(false,'M15 threw: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' ')); }
    finally {
      w.Date.now=nowM; w.fetch=fetch0; for(const g of FX){ const i=S.sched.findIndex(x=>x.id===g.id); if(i>=0) S.sched.splice(i,1); }
      w.__m15k=keepF; w.eval('currentWeek=window.__m15k[0]; pricedLegs=window.__m15k[1]; spSet=window.__m15k[2];'); delete w.__m15k; delete w.__m15;
      w.eval('spDayOff=window.__dayOff15'); w.__dayStood=false;
      recBody=404; w.fetch=recStub; try{ await w.pbRecLoad(); } finally { w.fetch=fetch0; }
      spKeyClear(); try{ if(spKey0!=null) w.localStorage.setItem(SPK,spKey0); }catch(e){}
      stab.hidden=keepTab; S.parlay=JSON.parse(keepPar); S.bookPrice=keepBP; dropCaches(); F('save')(); F('renderParlay')(); }
    console.log(`M15. the Sunday slot, on made-up weeks of 2019: ${nCase} moments (${said15.join('; ')})`); }

  /* ---- M16. one game's legs a parlay, and no pair DraftKings will not take on one slip (app v121) ----
     The owner, 19 October 2026, after reading how DraftKings builds a same-game parlay: "If your parlay already has a
     receiver anytime TD, a team total, or the game total, adding the QB's passing TD over often gets blocked", and "Some
     combos contradict each other, like QB under 1.5 passing TDs alongside two of his receivers to score. The book rejects
     it outright"; then "i think also the legs need to be part of the same game parlay only, and anytime there's a mix it
     bombs the hyperlink". Held on a made-up week of the audit's own (rule (c): week 93, its games on the schedule in
     January 2099, so always still to come, at any hour of the week and in the off-season; pricedLegs stood in with made-up
     lines on made-up players, each a real price with an edge and none far off the market, none moving with another (no
     correlation for their made-up group), so every parlay is a plain product and every level is worked out in full here;
     no DraftKings id table for the week, as a payload baked before ids; every stand-in put back on every path):
       the rule      the audit's own copy (clashAud) and the page's dkClashWhy on the same cases, each answer written
                     beside it: a quarterback's passing TDs over or under, a main line or a rung, with a teammate's
                     touchdown, either leg first; over with the game total, either side of it; and none for his passing
                     TDs under with the total, with an opponent's touchdown or his own, with a teammate's touchdown in
                     another game, for his passing yards, or for a teammate's touchdown with the total
       the nights    a Thursday, a Monday doubleheader and a Sunday night game, each set worked out in full against every
                     parlay of each size by the audit's own copy of a set's rule (the levels of M10, the game's total the
                     last fill) on the parlays that can be made (fitsAud), and each case says what the rule is held on:
                     GQ's likeliest pair without the rule is its quarterback's passing TDs over with his receiver's
                     touchdown (the rule's is his passing TDs with the opponent's receiver's touchdown), and its Extreme
                     takes his passing TDs with the total; GT's Aggressive without the rule pairs his passing TDs over with
                     the total alone; GV's likeliest pair without the rule is his passing TDs under with his receiver's
                     touchdown; GU's Aggressive keeps his passing TDs under with the total, which the rule allows. No
                     level holds a pair (clashAud). (The review's round) GN, a third Monday night game, whose quarterback's
                     only line is his passing TDs over, beside his receiver's touchdown and his club to win: its Medium is
                     the side, the touchdown and the total, the totals fill counted as one slip takes the legs (fitAud),
                     where counted by number alone (as before the round) it was empty; its Aggressive empty, as no 4 of
                     its legs go on one slip, saying so in the round's words; every empty level's words the audit's own
                     (spWhyAud, W.wording)
       the count     the audit's own count of the legs one parlay can take (fitAud), on its own cases with each answer
                     written beside it, held to the audit's own enumeration (existsAud) and the page's pbMaxFit there, and
                     to the enumeration on every made-up game's lists
       the hands     no hand of any made-up game holds a pair, and GH's High, where the best pair without the rule is its
                     quarterback's passing TDs with his receiver's touchdown, is the best pair the rule allows
       the slot      four Sunday games before 7:00 pm Eastern (1:00, 4:05, and two at 4:25 alike leg for leg), and a Sunday
                     night game that is no part of it; the best parlay across its games beats every one game's (so a slot
                     searched across its games, as before app v121, fails here). Every level of the slot one game's legs,
                     that game's own level (worked in full, as a night's), and the best of its games' own levels by the
                     audit's own copy of the slot rule (slotBestAud), each case's answer written beside it: Safe the
                     likelier pair, the earlier of the two alike; Medium and Aggressive the better return of those that
                     meet their floor, never the likeliest that returns more; Extreme the one with no game total, though
                     the likeliest of its size; and each card of the slot names its game. (The review's round) The slot's
                     Safe built again (spRebuild) with the player it holds ruled out in the open page, the sets' cache left
                     as it is (no signature reads the report): the level holds no leg of his and is the best of the slot's
                     games' own Safe levels on the lines as they stand, worked out in full (S3's, where his game's own is
                     now its next pair), where a level read off the games' cached sets kept him
       the slot 2    week 94's Sunday slot of two games, each its side, a quarterback whose only line is his passing TDs
                     over, his receiver's touchdown and its total: four legs a game in number, three on one slip. Each level
                     the best of its games' own worked out in full; Medium a game's side, touchdown and total; Aggressive
                     empty, saying no 4 legs of any one game of the slot go together on DraftKings' slip; Extreme too few
       the builder   a parlay holding both pairs says so under its legs, the pairs in the builder's order and words; this
                     page, which has no parlay card, says nothing of a same-game parlay mixed with another game's leg
     Blocking (made-up data); W.wording the words */
  { const WK=93, WK2=94, isG=F('isGameLeg'), pp=F('parlayProb'), pd=F('parlayDec'), order=F('pbOrder'), said16=[], SEA=F('SEASON');
    /* the rule on its own cases: the audit's copy gives each case's answer, and so does the page */
    { const P=o=>({gid:'g1',pid:'qb',team:'AAA',stat:'passing_tds',side:'over',main:true,k:1.5,...o}), TDL=o=>P({pid:'wr',stat:'any_td',main:false,k:1,...o}), TOT=o=>({gid:'g1',pid:'game',team:'BBB',stat:'total',side:'over',main:true,k:44.5,...o});
      const C=[['his passing TDs over with a teammate\'s touchdown',P(),TDL(),'td'],['the same, the touchdown first',TDL(),P(),'td'],
        ['his passing TDs under with a teammate\'s touchdown',P({side:'under'}),TDL(),'td'],['a rung of his passing TDs (2+) with a teammate\'s touchdown',P({main:false,k:2}),TDL(),'td'],
        ['his passing TDs over with the game total over',P(),TOT(),'total'],['his passing TDs over with the game total under',P(),TOT({side:'under'}),'total'],['the total first',TOT(),P(),'total'],
        ['his passing TDs under with the game total',P({side:'under'}),TOT(),null],['his passing TDs with an opponent\'s touchdown',P(),TDL({team:'BBB'}),null],
        ['his passing TDs with his own touchdown',P(),TDL({pid:'qb'}),null],['his passing TDs with a teammate\'s touchdown in another game',P(),TDL({gid:'g2'}),null],
        ['his passing yards with a teammate\'s touchdown',P({stat:'passing_yards',k:249.5}),TDL(),null],['a teammate\'s touchdown with the game total',TDL(),TOT(),null],
        ['his passing TDs with his club to win',P(),{gid:'g1',pid:'team:AAA',team:'AAA',stat:'ml',side:'over',k:0},null]];
      const dkWhy=w.eval("typeof dkClashWhy==='function'?dkClashWhy:null"); chk(!!dkWhy,'M16: the page has no pair rule of its own (dkClashWhy)');
      let nR=0; for(const [lab,a,b,want] of C){ nR++; const mine=clashAud(a,b), page=dkWhy?dkWhy(a,b):undefined;
        chk(mine===want&&page===want,`M16, the pair rule on ${lab}: the audit's own copy says ${mine}, the page ${page}, the case ${want}`); }
      said16.push(`${nR} cases of the pair rule`); }
    /* (the review's round) the count of the legs one parlay can take, on its own cases, each answer written beside it: the
       audit's own count (fitAud), the audit's own enumeration (existsAud: a parlay of that many, none of one more) and the
       page's pbMaxFit each give it */
    { const L=(pid,team,stat,side,o)=>({gid:'g1',pid,team,stat,side,k:stat==='passing_tds'?1.5:stat==='total'?44.5:1,main:true,...o}), kd=l=>({...l,key:`${l.gid}|${l.pid}|${l.stat}|${l.side}|${l.k}`});
      const QB=o=>L('qb','AAA','passing_tds','over',o), WR=o=>L('wr','AAA','any_td','over',{main:false,...o}), TE=o=>WR({pid:'te',...o}), TOT=o=>L('game','BBB','total','over',o), ML=o=>L('team:AAA','AAA','ml','over',{k:0,...o});
      const C=[['his passing TDs over (his only line), a teammate\'s touchdown and his club to win',[QB(),WR(),ML()],2],
        ['the same with the game\'s total',[QB(),WR(),ML(),TOT()],3],['his passing TDs over with the total',[QB(),TOT()],1],['his passing TDs under with the total',[QB({side:'under'}),TOT()],2],
        ['his passing TDs under, a teammate\'s touchdown and the total',[QB({side:'under'}),WR(),TOT()],2],
        ['his passing TDs over and his passing yards, a teammate\'s touchdown and the total',[QB(),QB({stat:'passing_yards',k:249.5}),WR(),TOT()],3],
        ['his passing TDs 2+ and under 1.5, a teammate\'s touchdown and the total',[QB({main:false,k:2}),QB({side:'under'}),WR(),TOT()],2],
        ['two teammates\' touchdowns and the total',[QB(),WR(),TE(),TOT()],3],
        ['both clubs\' quarterbacks and receivers, and the total',[QB(),QB({pid:'qb2',team:'BBB'}),WR(),WR({pid:'wr2',team:'BBB'}),TOT()],3],
        ['a teammate with his touchdown and his receiving yards, and the total',[QB(),WR(),WR({stat:'receiving_yards',k:59.5,main:true}),TOT()],2],
        ['an opponent\'s touchdown and his club to win',[QB(),WR({team:'BBB'}),ML()],3],
        ['the first case beside a second game\'s side',[QB(),WR(),ML(),ML({gid:'g2'})],3]];
      const pageFit=w.eval("typeof pbMaxFit==='function'?pbMaxFit:null"); chk(!!pageFit,'M16: the page has no count of the legs one parlay can take (pbMaxFit)');
      let nF=0; for(const [lab,legs,want] of C){ nF++; const list=legs.map(kd), mine=fitAud(list), page=pageFit?pageFit(list):undefined, ex=[existsAud(list,want),existsAud(list,want+1)];
        chk(mine===want&&page===want&&ex[0]===true&&ex[1]===false,`M16, the count on ${lab}: the audit's own count ${mine}, the page's ${page}, the audit's enumeration a parlay of ${want} ${ex[0]} and of ${want+1} ${ex[1]}, the case ${want}`); }
      said16.push(`${nF} cases of the count`); }
    /* the made-up games: a Thursday night (GU), a Saturday night game (GH, held for its hands), the Sunday slot's four (S1 at
       1:00, S4 at 4:05, S2 and S3 at 4:25, S2 first on the schedule), Sunday night (GV, no part of the slot) and a Monday
       doubleheader (GT at 7:15, GQ at 8:15); every total -110 both ways */
    const mk=(a,h,dd,tt,mla,mlh)=>({id:`2099_${WK}_${a}_${h}`,w:WK,a,h,d:dd,t:tt,mla,mlh,tot:44.5,tov:-110,tou:-110});
    const GU=mk('AWA','AWH','2099-01-01','20:15',130,-150), GH=mk('AHA','AHH','2099-01-03','20:15',-105,-115);
    const S1=mk('AXA','AXH','2099-01-04','13:00',-140,120), S4=mk('ABA','ABH','2099-01-04','16:05',-125,105), S2=mk('AYA','AYH','2099-01-04','16:25',155,-175), S3=mk('AZA','AZH','2099-01-04','16:25',155,-175);
    const GV=mk('AVA','AVH','2099-01-04','20:20',120,-140), GT=mk('ATA','ATH','2099-01-05','19:15',130,-150), GQ=mk('AQA','AQH','2099-01-05','20:15',150,-170);
    /* (the review's round) a third Monday night game (GN), and week 94's Sunday slot of two games (SA at 1:00, SB at 4:25) */
    const GN=mk('ANA','ANH','2099-01-05','21:30',130,-150), mk2=(...x)=>{ const g=mk(...x); return {...g,id:g.id.replace(`_${WK}_`,`_${WK2}_`),w:WK2}; };
    const SA=mk2('APA','APH','2099-01-11','13:00',130,-150), SB=mk2('ARA','ARH','2099-01-11','16:25',130,-150);
    const FX=[GU,GH,S1,S4,S2,S3,GV,GT,GQ,GN,SA,SB], SLOT=[S1,S4,S2,S3], SLOT2=[SA,SB], NIGHTS=[GU,GV,GT,GQ,GN];
    const pl=(g,id,team,stat,k,side,main,p,price,label)=>({key:`${g.id}|aud16-${id}|${stat}`,gid:g.id,pid:'aud16-'+id,stat,k,side,main,p,price,src:'real',mu:null,name:'Made-up '+id,pos:'WR',grp:'AUD',team,opp:team===g.h?g.a:g.h,week:WK,label});
    const ml=(g,p)=>({key:`${g.id}|team:${g.h}|ml`,gid:g.id,pid:'team:'+g.h,stat:'ml',k:0,side:'over',main:false,p,price:g.mlh,src:'real',mu:null,name:'Made-up '+g.h,pos:'Game',grp:'TEAM',team:g.h,opp:g.a,week:WK,label:'To win'});
    const TDo=(g,id,p,pr)=>pl(g,id,g.h,'passing_tds',1.5,'over',true,p,pr,'Over 1.5 passing TDs'), TDu=(g,id,p,pr)=>pl(g,id,g.h,'passing_tds',1.5,'under',true,p,pr,'Under 1.5 passing TDs');
    const PY=(g,id,k,p,pr)=>pl(g,id,g.h,'passing_yards',k,'over',true,p,pr,`Over ${k} passing yards`), TD=(g,id,team,p,pr)=>pl(g,id,team,'any_td',1,'over',false,p,pr,'Scores a touchdown');
    const RG=(g,id,team,stat,k,p,pr,lbl)=>pl(g,id,team,stat,k,'over',false,p,pr,`${k}+ ${lbl}`);
    const L16=[
      /* GQ: his passing TDs over the likeliest and the best-paying leg, his receiver's touchdown next, the opponent's receiver's after */
      TDo(GQ,'q1',0.80,-230),PY(GQ,'q1',249.5,0.60,-120),TD(GQ,'q2',GQ.h,0.76,-210),TD(GQ,'q3',GQ.a,0.72,-200),ml(GQ,0.67),
      /* GT and GU: three legs a parlay can hold (the quarterback, the opponent's receiver, a side), so Aggressive takes the total */
      TDo(GT,'t1',0.78,-220),PY(GT,'t1',239.5,0.60,-120),RG(GT,'t2',GT.a,'receptions',5,0.66,-150,'receptions'),ml(GT,0.64),
      TDu(GU,'u1',0.78,-220),PY(GU,'u1',229.5,0.55,-105),RG(GU,'u2',GU.a,'receptions',5,0.66,-150,'receptions'),ml(GU,0.64),
      TDu(GV,'v1',0.80,-230),PY(GV,'v1',219.5,0.60,-120),TD(GV,'v2',GV.h,0.76,-210),RG(GV,'v3',GV.a,'receiving_yards',60,0.63,-130,'receiving yards'),ml(GV,0.62),
      /* GH: at plus money, his passing TDs and his receiver's touchdown the best pair a High hand could take */
      TDo(GH,'h1',0.60,105),TD(GH,'h2',GH.h,0.60,105),RG(GH,'h3',GH.a,'receptions',4,0.61,-110,'receptions'),ml(GH,0.58),
      /* the slot: S1 five legs at plus money (each of its parlays of 3 to 5 the likeliest of its size, returning the most);
         S4 four nearer evens (its Medium and Aggressive the best returns that meet their floor); S2 and S3 alike, four
         heavy favourites (the likeliest pair) */
      RG(S1,'x1',S1.h,'receptions',5,0.55,120,'receptions'),RG(S1,'x2',S1.h,'receiving_yards',70,0.545,120,'receiving yards'),RG(S1,'x3',S1.a,'rushing_yards',60,0.54,120,'rushing yards'),RG(S1,'x4',S1.a,'receptions',6,0.535,120,'receptions'),ml(S1,0.53),
      RG(S4,'z1',S4.h,'receptions',4,0.66,-125,'receptions'),RG(S4,'z2',S4.h,'rushing_yards',50,0.65,-120,'rushing yards'),RG(S4,'z3',S4.a,'receiving_yards',40,0.63,-110,'receiving yards'),ml(S4,0.56),
      ...[[S2,'s2'],[S3,'s3']].flatMap(([g,x])=>[RG(g,x+'y1',g.h,'receptions',6,0.80,-230,'receptions'),RG(g,x+'y2',g.h,'receiving_yards',50,0.78,-220,'receiving yards'),RG(g,x+'y3',g.a,'rushing_yards',40,0.74,-190,'rushing yards'),ml(g,0.70)]),
      /* (the review's round) GN, SA and SB: a side, a quarterback whose only line is his passing TDs over, and his receiver's
         touchdown, with the game's total on the schedule. Without the pair rule his passing TDs and the touchdown are the
         likeliest pair; with it, the side and his passing TDs; Medium (the side, the touchdown and the total) lands over its
         floor on GN and SA, and under it on SB */
      TDo(GN,'n1',0.80,-230),TD(GN,'n2',GN.h,0.76,-210),ml(GN,0.70),
      ...[TDo(SA,'pa1',0.80,-230),TD(SA,'pa2',SA.h,0.76,-210),ml(SA,0.70),TDo(SB,'pb1',0.78,-220),TD(SB,'pb2',SB.h,0.74,-210),ml(SB,0.66)].map(l=>({...l,week:WK2}))];
    /* a parlay that can be made without the pair rule: fitsAud as it was before app v121, for each case to show what it holds */
    const fitsNoRule=(cur,c)=>{ if(cur.some(l=>l.key===c.key)) return false;
      if(isG(c)) return !cur.some(l=>isG(l)&&l.gid===c.gid&&(l.stat==='total')===(c.stat==='total'));
      return !cur.some(l=>!isG(l)&&l.pid===c.pid); };
    /* one game's level of n legs, the audit's own copy of a set's rule, worked out in full: every parlay of n of its legs with
       an edge that can be made (fits); Safe the likeliest pair, the others the best return over their floor, else the
       likeliest of their size, each with the fewest thin legs; where the legs with an edge make no parlay of n, the game's
       total as the last fill, exactly as many as those legs leave to fill: (the review's round) counted as one slip takes
       them (fitAud), and without the pair rule (fitsNoRule, as before app v121) by their number alone (maxAud) */
    const level16=(q,n,floor,fits)=>{ const edge=[...q.pref,...q.thin];
      const all=(legs,fillOf)=>{ const out=[], rec=(i0,cur)=>{ if(cur.length===n){ const L=order(cur.map(l=>({...l}))), pr=pp(L).corr, dec=pd(L.map(l=>({leg:l,ml:l.price})));
            out.push({L,pr,dec,ev:pr*dec,fill:L.filter(fillOf).length,thin:L.filter(l=>l.thin).length,mkt:L.filter(l=>l.market).length,id:L.map(legIdAud).sort().join()}); return; }
          for(let i=i0;i<legs.length;i++){ if(!fits(cur,legs[i])) continue; cur.push(legs[i]); rec(i+1,cur); cur.pop(); } };
        rec(0,[]); return out; };
      const top=(list,f)=>{ const m=Math.max(...list.map(f)); return {best:list.filter(c=>f(c)>=m-1e-12),m}; };
      const pick=c=>{ if(!c.length) return null; const km=Math.min(...c.map(x=>x.fill)), lk=top(c.filter(x=>x.fill===km),x=>x.pr);
        if(!floor) return {kind:'pair',...lk};
        const clear=c.filter(x=>x.pr>=floor);
        if(clear.length){ const kc=Math.min(...clear.map(x=>x.fill)); return {kind:'floor',...top(clear.filter(x=>x.fill===kc),x=>x.ev)}; }
        return {kind:'likeliest',...lk}; };
      const r=pick(all(edge,l=>!!l.thin)); if(r||!q.mkt.length) return r;
      const kTop=Math.max(0,n-(fits===fitsNoRule?maxAud:fitAud)(edge));
      return pick(all([...edge,...q.mkt],l=>!!l.market).filter(x=>x.mkt===kTop)); };
    /* a level worked out here, as the slot's rule reads one */
    const asLvl=b=>b?{legs:b.best[0].L,corr:b.best[0].pr,dec:b.best[0].dec,thin:b.best[0].thin,mkt:b.best[0].mkt,likeliest:b.kind==='likeliest'}:null;
    const kindsOf=legs=>clashPairsAud(legs).map(x=>x[2]).sort().join('+');
    const names=legs=>(legs||[]).map(l=>`${l.name} ${l.label}`).join(', ');
    /* a page level held to the audit's own working of it: its kind, its number, its legs among the best, its thin legs and totals */
    const held=(t,b,n,lab)=>{ const kind=t&&t.legs?(t.likeliest?'likeliest':t.floor?'floor':'pair'):'empty';
      if(!b){ chk(kind==='empty',`${lab} is ${kind} (${t&&t.legs?names(t.legs):''}) where no parlay of ${n} of the game's legs can be made`); return; }
      const f=b.kind==='floor'?(x=>x.corr*x.dec):(x=>x.corr), id=t&&t.legs?t.legs.map(legIdAud).sort().join():'', c=b.best.find(x=>x.id===id);
      chk(kind===b.kind&&!!c&&Math.abs(f(t)-b.m)<1e-12&&t.thin===c.thin&&(t.mkt||0)===c.mkt,
        `${lab} is ${kind} at ${t&&t.legs?f(t).toFixed(6):'-'} (${t&&t.legs?names(t.legs):t&&t.why}), where every parlay of ${n} that can be made worked out gives ${b.kind} at ${b.m.toFixed(6)}: ${names(b.best[0].L)}`); };
    const keepF=w.eval('[pricedLegs, spSlotNext]'), stab=d.getElementById('tab-suggest'), keepTab=stab.hidden, keepPar=JSON.stringify(S.parlay||{}), keepBP=S.bookPrice;
    try{
      S.sched.push(...FX); w.__m16L=L16;
      w.eval(`pricedLegs=function(games){ return window.__m16L.filter(l=>(games||[]).some(g=>g.id===l.gid&&!gameStarted(g))&&(l.grp==='TEAM'||suggestable(l.pid))).map(l=>({...l})); };`);
      dropCaches();
      /* every made-up line qualifies as the case means it to: a Value pick (the 3-point edge), none far off the market */
      { const q=qualAud(FX,ALL_U), bad=L16.filter(l=>!q.pref.some(x=>legIdAud(x)===legIdAud(l)));
        chk(!bad.length&&q.mkt.length===2*FX.length&&!q.far,`M16: the made-up lines are not each a Value pick, and every game's total on the market list (${names(bad)||'every line a Value pick'}; ${q.mkt.length} totals, ${q.far} far off), so the cases cannot tell`); }
      /* the nights: every level worked out in full, with the pair rule and without it */
      /* (the review's round) the audit's own count (fitAud) is what its own enumeration finds, on every made-up game's legs
         with an edge and with the total: a parlay of that many legs, and none of one more */
      { const bad=[]; for(const g of FX){ const q=qualAud([g],ALL_U), edge=[...q.pref,...q.thin];
          for(const list of [edge,[...edge,...q.mkt]]){ const f=fitAud(list); if(existsAud(list,f)!==true||existsAud(list,f+1)!==false) bad.push(`${g.id} (${list.length} legs): ${f}`); } }
        chk(!bad.length,`M16: the audit's own count of the legs one parlay can take is not what its own enumeration finds: ${bad.join('; ')}`); }
      const CASE={[GQ.id]:{safe:'td',med:'td',aggr:'td',xtrm:'td+total'},[GT.id]:{aggr:'total'},[GV.id]:{safe:'td',med:'td',aggr:'td',xtrm:'td'},[GU.id]:{},[GN.id]:{safe:'td',med:'td',aggr:'td+total'}};
      let nWorked=0;
      for(const g of NIGHTS){ const q=qualAud([g],ALL_U), s=F('spSet')(g.id), gl=`M16, ${g.a} at ${g.h}`;
        chk(primeAud(g)&&F('spPrime')(g),`${gl} is not a prime-time game, so the case is not a night's set`);
        chk(!!s&&s.tiers.length===4,`${gl}: no set of four levels`); if(!s) continue;
        for(const [id,,n,floor] of SPEC_AUD){ const t=s.tiers.find(x=>x.id===id), b=level16(q,n,floor,fitsAud), b0=level16(q,n,floor,fitsNoRule), want=CASE[g.id][id]||'';
          /* what the case stands on: without the rule the level's best holds the pair named (and only where named) */
          chk(want?(!!b0&&b0.best.every(c=>kindsOf(c.L)===want)):(!b0||b0.best.every(c=>!kindsOf(c.L))),`${gl}: without the pair rule the ${id} level's best is ${b0?names(b0.best[0].L):'none'}, holding ${b0?kindsOf(b0.best[0].L)||'no pair':'nothing'} where the case stands on ${want||'no pair'}, so it cannot tell`);
          held(t,b,n,`${gl}: the ${id} level`); nWorked++;
          chk(!t||!t.legs||!clashPairsAud(t.legs).length,`${gl}: the ${id} level holds a pair DraftKings will not take on one slip: ${t&&t.legs?clashTxt(t.legs):''}`);
          /* an empty level says why in the audit's own words (spWhyAud) */
          if(t&&!t.legs){ const why=spWhyAud(g,n,q); W.wording(t.why===why,`${gl}: the empty ${id} level says "${t.why}", not "${why}"`); } }
        /* (the review's round) GN: its quarterback's only line is his passing TDs over, so his passing TDs and his receiver's
           touchdown are the room of one leg (three legs with an edge, two on one slip; four with the total, three on one
           slip). Medium is the side, the touchdown and the total, one total as those legs, counted so, leave to fill (by
           their number alone none, and the level was empty); Aggressive is empty, no 4 of its legs going on one slip (the
           enumeration's, blocking through held), and says so in the round's words */
        if(g===GN){ const edge=[...q.pref,...q.thin], all=[...edge,...q.mkt], md=s.tiers.find(x=>x.id==='med'), ag=s.tiers.find(x=>x.id==='aggr');
          chk(edge.length===3&&maxAud(edge)===3&&fitAud(edge)===2&&maxAud(all)===4&&fitAud(all)===3&&existsAud(all,3)===true&&existsAud(all,4)===false,
            `${gl}: its legs do not make 3 with an edge (2 on one slip) and 4 with the total (3 on one slip, and no parlay of 4), so the case cannot tell: ${names(all)}`);
          chk(!!md&&!!md.legs&&md.mkt===1&&md.legs.some(l=>l.stat==='ml')&&md.legs.some(l=>l.pid==='aud16-n2')&&md.legs.some(l=>l.stat==='total')&&!md.legs.some(l=>l.pid==='aud16-n1'),
            `${gl}: Medium is not its side, the receiver's touchdown and the total (one total): ${md&&md.legs?names(md.legs):md&&md.why}`);
          const want=`No 4 of this game’s legs go together on DraftKings’ slip.`;
          W.wording(!!ag&&!ag.legs&&ag.why===want,`${gl}: the empty Aggressive says "${ag&&ag.why}", not "${want}"`); }
        /* GQ's Safe takes his passing TDs with the opponent's receiver's touchdown (a pair of two clubs is no pair); GU's
           Aggressive keeps his passing TDs under with the total (the rule's total is of his passing TDs over) */
        if(g===GQ){ const t=s.tiers.find(x=>x.id==='safe'); chk(!!t&&!!t.legs&&t.legs.some(l=>l.pid==='aud16-q1'&&l.stat==='passing_tds')&&t.legs.some(l=>l.pid==='aud16-q3'),`${gl}: Safe is not his passing TDs with the opponent's receiver's touchdown: ${t&&t.legs?names(t.legs):''}`); }
        if(g===GU){ const t=s.tiers.find(x=>x.id==='aggr'); chk(!!t&&!!t.legs&&t.legs.some(l=>l.stat==='passing_tds'&&l.side==='under')&&t.legs.some(l=>l.stat==='total'),`${gl}: Aggressive does not keep his passing TDs under with the game total: ${t&&t.legs?names(t.legs):''}`); } }
      { const nmG=id=>{ const g=FX.find(x=>x.id===id); return `${g.a} at ${g.h}`; }, held0=Object.entries(CASE).filter(([,c])=>Object.keys(c).length).map(([id,c])=>`${nmG(id)}'s ${Object.keys(c).join(', ')}`);
        said16.push(`${NIGHTS.length} night games' sets worked out in full (${nWorked} levels; without the rule ${held0.join('; ')} hold a pair, and the rule leaves ${nmG(GU.id)}'s passing TDs under with the total; ${nmG(GN.id)}'s Medium its side, touchdown and total, its Aggressive empty for want of 4 legs on one slip)`); }
      /* the hands: none holds a pair; GH's High the best pair the rule allows, where without it the best is the pair */
      { const bad=[]; let nH=0;
        for(const g of FX){ const T=F('gameTiers')(g); for(const id of ['high','med','low']) if(T&&T[id]){ nH++; if(clashPairsAud(T[id].legs).length) bad.push(`${g.id}'s ${id} hand: ${clashTxt(T[id].legs)}`); } }
        chk(!bad.length,`M16: a game page's hand holds a pair DraftKings will not take on one slip: ${bad.join('; ')}`);
        const pool=F('gameLegPool')(GH), T=F('gameTiers')(GH);
        const fitsH=(a,b,rule)=>a.key!==b.key&&!(a.grp==='TEAM'&&b.grp==='TEAM')&&(!rule||!clashAud(a,b));
        const bestPair=rule=>{ for(const [fd,mp] of [[2,0.35],[1,0]]){ let best=null;
            for(let i=0;i<pool.length;i++) for(let j=i+1;j<pool.length;j++){ const a=pool[i], b=pool[j]; if(!fitsH(a,b,rule)) continue;
              const pr=pp([a,b],2500).corr, dd=pd([{leg:a,ml:a.price},{leg:b,ml:b.price}],1500); if(dd<fd||pr<mp) continue;
              if(!best||pr*dd>best.ev) best={ev:pr*dd,L:[a,b],relaxed:fd===1}; }
            if(best) return best; }
          return null; };
        const b0=bestPair(false), b=bestPair(true), h=T&&T.high;
        chk(pool.length===4&&!!b0&&!b0.relaxed&&kindsOf(b0.L)==='td',`M16: without the pair rule GH's best High pair is ${b0?names(b0.L):'none'} (${pool.length} lines in its pool), not his passing TDs with his receiver's touchdown at +100 or more and 35% or more, so the case cannot tell`);
        chk(!!h&&!!b&&!h.relaxed&&!b.relaxed&&!clashPairsAud(h.legs).length&&Math.abs(h.corr*h.dec-b.ev)<1e-12,`M16: GH's High hand is ${h?names(h.legs):'none'}${h?` returning ${(h.corr*h.dec).toFixed(6)}`:''}, where the best pair the rule allows returns ${b?b.ev.toFixed(6):'-'} (${b?names(b.L):'none'})`);
        said16.push(`${nH} hands of ${FX.length} games, none holding a pair, GH's High the best pair the rule allows`); }
      /* the Sunday slot: its games, then each level one game's own, the best by the slot's rule */
      const SID=`${SEA}_${WK}_SUN`, u=F('spUnit')(SID), ids=a=>(a||[]).map(g=>g.id).join();
      chk(!!u&&u.slot&&ids(u.games)===ids(SLOT)&&ids(slotGamesAud(S.sched,WK))===ids(SLOT),`M16: the made-up week's Sunday slot is ${u?ids(u.games):'none'} (the audit's own rule: ${ids(slotGamesAud(S.sched,WK))}), not its four Sunday games before 7:00 pm Eastern in kickoff order, the schedule's on a tie, without Sunday night's`);
      const per=SLOT.map(x=>{ const q=qualAud([x],ALL_U), s=F('spSet')(x.id);
        return {x,q,s,b:Object.fromEntries(SPEC_AUD.map(([id,,n,floor])=>[id,level16(q,n,floor,fitsAud)]))}; });
      /* each game's own set, worked out in full as a night's */
      for(const P of per) for(const [id,,n] of SPEC_AUD) held(P.s&&P.s.tiers.find(x=>x.id===id),P.b[id],n,`M16, the slot's game ${P.x.a} at ${P.x.h}: its own ${id} level`);
      /* the slot's rule on the levels worked here gives each case's answer */
      const WANT={safe:S2,med:S4,aggr:S4,xtrm:S1}, ss=F('spSet')(SID);
      chk(!!ss&&ss.tiers.length===4,'M16: the made-up Sunday slot has no set of four levels');
      for(const [id,,n,floor] of SPEC_AUD){ const best=slotBestAud(per.map(P=>asLvl(P.b[id])),floor), g=WANT[id], gl=`M16, the Sunday slot's ${id} level`;
        chk(!!best&&best.legs[0].gid===g.id,`${gl}: the audit's own slot rule gives ${best?best.legs[0].gid:'none'}, not the case's ${g.id}`);
        const t=ss&&ss.tiers.find(x=>x.id===id);
        chk(!!t&&!!t.legs&&t.legs.every(l=>l.gid===g.id),`${gl} holds ${t&&t.legs?[...new Set(t.legs.map(l=>l.gid))].join(' and ')+"'s legs":'no parlay'}, not one game's, ${g.id}'s: ${t&&t.legs?names(t.legs):t&&t.why}`);
        held(t,per.find(P=>P.x===g).b[id],n,gl);
        chk(!!t&&!!t.legs&&!clashPairsAud(t.legs).length,`${gl} holds a pair DraftKings will not take on one slip`); }
      /* what the cases stand on: S2 and S3 alike (the tie to the earlier); S1's likeliest Medium and Aggressive return more
         than the levels that meet their floor (a rule on the return alone takes S1); S1's Extreme the likeliest of its
         size, every other game's taking the total (a rule on the floor first takes S4) */
      { const lv=(P,id)=>asLvl(P.b[id]), [P1,P4,P2,P3]=per, ev=x=>x.corr*x.dec;
        chk(['safe','med','aggr','xtrm'].every(id=>{ const a=lv(P2,id), b=lv(P3,id); return a&&b&&a.corr===b.corr&&a.dec===b.dec; }),'M16: the slot\'s two games alike are not alike level for level, so the tie cannot tell');
        chk(['med','aggr'].every(id=>{ const a=lv(P1,id), b=lv(P4,id); return a&&b&&a.likeliest&&!b.likeliest&&ev(a)>ev(b); }),'M16: S1\'s Medium and Aggressive are not the likeliest of their size returning more than S4\'s, so the floor before the return cannot tell');
        chk(lv(P1,'xtrm')&&lv(P1,'xtrm').likeliest&&!lv(P1,'xtrm').mkt&&[P4,P2,P3].every(P=>{ const x=lv(P,'xtrm'); return x&&!x.likeliest&&x.mkt===1; }),'M16: S1\'s Extreme is not the likeliest of its size with no total where the other games\' meet their floor with one, so the total first cannot tell');
        /* and a slot searched across its games, as before: its best pair, and its best Medium over its floor, are of two games */
        const U16=per.flatMap(P=>[...P.q.pref,...P.q.thin]), xb=n=>{ let best=null; const rec=(i0,cur)=>{ if(cur.length===n){ const L=order(cur.map(l=>({...l}))), pr=pp(L).corr, dec=pd(L.map(l=>({leg:l,ml:l.price}))), v=n===2?pr:(pr>=0.25?pr*dec:-1);
              if(!best||v>best.v) best={v,L}; return; } for(let i=i0;i<U16.length;i++){ if(!fitsAud(cur,U16[i])) continue; cur.push(U16[i]); rec(i+1,cur); cur.pop(); } }; rec(0,[]); return best; };
        const two=xb(2), three=xb(3), oneOf=b=>!!b&&new Set(b.L.map(l=>l.gid)).size>1;
        chk(oneOf(two)&&oneOf(three)&&two.v>lv(P2,'safe').corr&&three.v>ev(lv(P4,'med')),`M16: the best parlays across the slot's games (${two?names(two.L):'none'}; ${three?names(three.L):'none'}) do not beat every one game's, so the case cannot tell a slot of one game's legs from one across them`);
        said16.push(`the Sunday slot (${SLOT.length} games, its best pair and Medium across games beating any one game's): Safe ${WANT.safe.a} at ${WANT.safe.h} (the earlier of two alike), Medium and Aggressive ${WANT.med.a} at ${WANT.med.h} (over the likeliest returning more), Extreme ${WANT.xtrm.a} at ${WANT.xtrm.h} (no total, though the likeliest), each one game's own level`); }
      /* each card of the slot names its game, as the tab draws it (the slot stood in as up, put back after) */
      { const keepN=w.eval('spSlotNext'); stab.hidden=false;
        /* (app v132) Day games drawn whatever the hour (off on a Sunday from 4pm Eastern) */
        w.__dayOff16=w.eval('spDayOff'); w.eval('spDayOff=function(){ return false; }'); w.__dayStood=true;
        try{ w.eval(`spSlotNext=function(){ const u=spSlotUnit(${WK}); return u?{...u,open:null,prev:null,up:true}:null; };`); F('renderSp')();
          const box=d.querySelector(`${SP_SG}[data-sp-game="${SID}"]`), TN=F('TEAM_NAMES');
          chk(!!box,`M16: the made-up Sunday slot (${SID}) is not drawn with its set`);
          for(const [id] of SPEC_AUD){ const g=WANT[id], c=box&&box.querySelector(`.pb-tier.${id}`), tg=c?[...c.querySelectorAll('.pb-th .pb-tgame')]:[];
            chk(tg.length===1&&tg[0].dataset.pbTgame===g.id,`M16: the slot's ${id} card does not name its game, ${g.id}: ${tg.map(x=>x.dataset.pbTgame).join(', ')||'none'}`);
            W.wording(!!tg[0]&&tg[0].textContent===`${TN[g.a]||g.a} at ${TN[g.h]||g.h} · ${etAud(kickAud(g))}`,`M16: the slot's ${id} card names its game "${tg[0]?tg[0].textContent:''}"`); } }
        finally { slotPut(keepN); w.eval('spDayOff=window.__dayOff16'); w.__dayStood=false; stab.hidden=keepTab; F('renderSp')(); } }
      /* (the review's round) week 94's Sunday slot: each game four legs in number and three on one slip, so its Aggressive
         is empty in the round's words; each level the best of its games' own, worked out in full */
      { const SID2=`${SEA}_${WK2}_SUN`, u2=F('spUnit')(SID2), s2=F('spSet')(SID2), gl0=`M16, week ${WK2}'s Sunday slot`;
        chk(!!u2&&u2.slot&&ids(u2.games)===ids(SLOT2)&&ids(slotGamesAud(S.sched,WK2))===ids(SLOT2),`${gl0} is ${u2?ids(u2.games):'none'} (the audit's own rule: ${ids(slotGamesAud(S.sched,WK2))}), not ${ids(SLOT2)}`);
        const per2=SLOT2.map(x=>{ const q=qualAud([x],ALL_U), edge=[...q.pref,...q.thin]; return {x,q,edge,b:Object.fromEntries(SPEC_AUD.map(([id,,n,floor])=>[id,level16(q,n,floor,fitsAud)]))}; });
        chk(per2.every(P=>P.edge.length===3&&maxAud(P.edge)===3&&fitAud(P.edge)===2&&maxAud([...P.edge,...P.q.mkt])===4&&fitAud([...P.edge,...P.q.mkt])===3&&existsAud([...P.edge,...P.q.mkt],4)===false),
          `${gl0}: its games' legs do not each make 3 with an edge (2 on one slip) and 4 with the total (3 on one slip, no parlay of 4), so the case cannot tell`);
        chk(!!s2&&s2.tiers.length===4,`${gl0} has no set of four levels`);
        const got=[];
        for(const [id,,n,floor] of SPEC_AUD){ const t=s2&&s2.tiers.find(x=>x.id===id), best=slotBestAud(per2.map(P=>asLvl(P.b[id])),floor), gl=`${gl0}: its ${id} level`;
          if(!best){ held(t,null,n,gl); const why=spWhySlotAud(SLOT2,n); W.wording(!!t&&t.why===why,`${gl} is empty and says "${t&&t.why}", not "${why}"`); got.push(`${id} empty`); continue; }
          chk(!!t&&!!t.legs&&t.legs.every(l=>l.gid===best.legs[0].gid),`${gl} is not one game's, ${best.legs[0].gid}'s: ${t&&t.legs?names(t.legs):t&&t.why}`);
          held(t,per2.find(P=>P.x.id===best.legs[0].gid).b[id],n,gl); got.push(`${id} ${best.legs[0].gid.split('_').slice(2).join(' at ')}'s`); }
        /* the cases: Medium SA's side, touchdown and total (over its floor, where SB's lands under it); Aggressive's words the
           round's; Extreme too few legs in any one game */
        { const md=s2&&s2.tiers.find(x=>x.id==='med'), ag=s2&&s2.tiers.find(x=>x.id==='aggr'), xt=s2&&s2.tiers.find(x=>x.id==='xtrm');
          chk(!!md&&!!md.legs&&md.mkt===1&&!md.likeliest&&md.legs.every(l=>l.gid===SA.id)&&md.legs.some(l=>l.pid==='aud16-pa2')&&md.legs.some(l=>l.stat==='ml')&&md.legs.some(l=>l.stat==='total'),
            `${gl0}: Medium is not SA's side, its receiver's touchdown and the total, over its floor: ${md&&md.legs?names(md.legs):md&&md.why}`);
          const wantA=`No 4 legs of any one game of the Sunday slot go together on DraftKings’ slip.`, wantX='Only 4 legs in any one game of the Sunday slot.';
          W.wording(!!ag&&!ag.legs&&ag.why===wantA,`${gl0}: the empty Aggressive says "${ag&&ag.why}", not "${wantA}"`);
          W.wording(!!xt&&!xt.legs&&xt.why===wantX,`${gl0}: the empty Extreme says "${xt&&xt.why}", not "${wantX}"`); }
        said16.push(`week ${WK2}'s Sunday slot (four legs a game, three on one slip): ${got.join(', ')}`); }
      /* (the review's round) the slot's Safe built again (spRebuild) for the player it holds ruled out in the open page: the
         report is read by no signature, so the sets' cache is left as it is and still holds him; the level built again holds
         no leg of his and is the best of the slot's games' own Safe levels on the lines as they stand, worked out in full */
      { const INJ=F('INJ'), t0=ss&&ss.tiers.find(x=>x.id==='safe'), out=t0&&t0.legs?t0.legs.find(l=>!isG(l)):null, had=!!out&&Object.prototype.hasOwnProperty.call(INJ,out.pid), keep=out?INJ[out.pid]:undefined;
        chk(!!out&&out.gid===S2.id,`M16: the slot's Safe (${t0&&t0.legs?names(t0.legs):'none'}) holds no player of S2's, so the case cannot tell`);
        if(out){ try{
          INJ[out.pid]={k:'out',t:'OUT',title:'Out'};
          const cached=F('spSet')(SID).tiers.find(x=>x.id==='safe'), gl=`M16, the slot's Safe built again with ${out.name} ruled out`;
          chk(F('suggestable')(out.pid)===false&&!!cached&&!!cached.legs&&cached.legs.some(l=>l.pid===out.pid),`${gl}: the slot's cached set no longer holds him, or he is still one a suggestion may take, so the case cannot tell a level built from the cache from one built on the lines as they stand`);
          const r=F('spRebuild')(SID,'safe'), per3=SLOT.map(x=>({x,b:level16(qualAud([x],ALL_U),2,0,fitsAud)})), best=slotBestAud(per3.map(P=>asLvl(P.b)),0);
          chk(!!r&&!!r.legs&&!r.legs.some(l=>l.pid===out.pid),`${gl} still holds him: ${r&&r.legs?names(r.legs):r&&r.why}`);
          chk(!!best&&best.legs[0].gid===S3.id,`${gl}: the audit's own slot rule gives ${best?best.legs[0].gid+"'s":'none'}, not the case's S3's`);
          chk(!!r&&!!r.legs&&!!best&&r.legs.every(l=>l.gid===best.legs[0].gid),`${gl} is not ${best?best.legs[0].gid:'-'}'s: ${r&&r.legs?names(r.legs):''}`);
          held(r,best?per3.find(P=>P.x.id===best.legs[0].gid).b:null,2,gl);
          said16.push(`the slot's Safe built again with ${out.name} ruled out, the cache left as it is: S3's, holding none of his`);
        } finally { if(had) INJ[out.pid]=keep; else delete INJ[out.pid]; dropCaches(); } } }
      /* the builder: GQ's game total over, his passing TDs over and his receiver's touchdown (both pairs), and GT's side */
      { const tot=F('totalLeg')(GQ,'over'), q1=L16.find(l=>l.pid==='aud16-q1'&&l.stat==='passing_tds'), q2=L16.find(l=>l.pid==='aud16-q2'), mT=L16.find(l=>l.gid===GT.id&&l.stat==='ml');
        S.parlay={}; S.bookPrice=null; for(const l of [tot,q1,q2,mT]) S.parlay[l.key]={...l}; F('renderParlay')();
        const legs=F('parlayLegs')(), cp=clashPairsAud(legs), body=d.getElementById('parlayBody'), el=body&&body.querySelector('[data-pb-clash]');
        /* (app v130, the owner's call of 22 October 2026: no descriptions) each pair named, without the kind of pair after it */
        const nm=l=>`${l.name}, ${l.label}`;
        const want=`DraftKings may refuse ${cp.length===1?'this pair':'these pairs'} on one slip: ${cp.map(([i,j])=>`${nm(legs[i])}, with ${nm(legs[j])}`).join('; ')}.`;
        chk(cp.length===2&&cp.map(x=>x[2]).sort().join()==='td,total'&&!!el&&el.dataset.pbClash==='2',`M16: the builder holding his passing TDs with the total and with his receiver's touchdown does not say it holds ${cp.length} pairs DraftKings may refuse: ${el?el.outerHTML.slice(0,240):'no line'}`);
        W.wording(!!el&&el.textContent===want,`M16: the builder's line on the pairs reads "${el?el.textContent:''}", not "${want}"`);
        chk(!body.querySelector('[data-pb-multigame]'),'M16: the prop model\'s own page, which has no parlay card, says the card gives each game a link of its own');
        /* with neither pair, no line */
        delete S.parlay[q1.key]; F('renderParlay')();
        chk(!d.querySelector('#parlayBody [data-pb-clash]'),'M16: with no pair left in the builder, it still says DraftKings may refuse one');
        said16.push('the builder says both pairs, in its order and words, and nothing of a mix of games on this page'); }
    } catch(e){ chk(false,'M16 threw: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' ')); }
    finally {
      w.__m16k=keepF; w.eval('pricedLegs=window.__m16k[0]; spSlotNext=window.__m16k[1];'); delete w.__m16k; delete w.__m16L;
      for(const g of FX){ const i=S.sched.findIndex(x=>x.id===g.id); if(i>=0) S.sched.splice(i,1); }
      stab.hidden=keepTab; S.parlay=JSON.parse(keepPar); S.bookPrice=keepBP; dropCaches(); F('save')(); F('renderParlay')(); }
    console.log(`M16. one game's legs a parlay, and no pair DraftKings will not take on one slip, on a made-up week: ${said16.join('; ')}`); }

  /* ---- M7. the book's fair chance, and legs far off it ----
     A leg's fair chance is DraftKings' own: where both sides of its line are priced (a player's main
     line, a game's two moneylines or spread prices on the leg's number, the total's over and under),
     that side's no-vig chance; where one side is, the price's implied chance over the week's median
     overround on two-sided lines of its kind (every kind where the week has none of its own), marked
     est.; with no real price, none. Worked here on its own from the payload and held, on made-up lines,
     to legFair; a parlay's is parlayProb on its legs at their fair chances (legs in one game moving
     together). Then, on made-up lines built so that some legs are FAR_OFF (15 points) or more above
     their fair chance and some are not: no such leg in the panel's pool, its count the panel's note,
     none on a level or a game page's hand, each flagged on the game page and in the builder, and the
     builder's summary leading with the fair chance. Holds on any week: a lean one, one game left, no
     player prices of its own (the made-up lines stand in for them). */
  { const cw=F('currentWeek')(), FAR=w.eval('FAR_OFF'), LF=F('legFair'), PF=F('parlayFair'), pp=F('parlayProb'), isG=F('isGameLeg'), toML=F('probToAmerican');
    /* the rule's own copy, lifted out before M (FAIRAUD), so the Top 50 lines and the sets are held to it too */
    const {imp,px,nv,vig,fairOf,gap,isFar}=FAIRAUD, near=(a,b)=>a!=null&&b!=null&&Math.abs(a-b)<1e-12;
    const g0=S.sched.filter(g=>+g.w===cw).sort((a,b)=>String(a.id).localeCompare(String(b.id)))[0];
    const keepM=JSON.stringify(PAY.mkt[String(cw)]||null), keepO=JSON.stringify(S.odds||{}), KF=['sp','tot','mla','mlh','spa','sph','tov','tou'], keepG=S.sched.map(g=>KF.map(k=>g[k]));
    const keepDk7=F('PAY').dk;
    /* (app v125) the made-up prices and lines stand alone on the week's games: their published read cleared, put back at
       the end (rule (c)) */
    unbake(S.sched.filter(g=>+g.w===cw).map(g=>g.id));
    const restore=()=>{ if(keepM==='null') delete PAY.mkt[String(cw)]; else PAY.mkt[String(cw)]=JSON.parse(keepM); S.odds=JSON.parse(keepO); dkSet(keepDk7);
      S.sched.forEach((g,i)=>KF.forEach((k,j)=>{ if(keepG[i][j]===undefined) delete g[k]; else g[k]=keepG[i][j]; })); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}'); };
    let ruleCases=0;
    try{
      /* ---- the rule, one leg at a time, on made-up prices for a game of the week ---- */
      const M=(PAY.mkt[String(cw)]=PAY.mkt[String(cw)]||{});
      M['audit-p1']={receptions:{line:4.5,over:-130,under:110,n:'Audit One',g:g0.id}};
      Object.assign(g0,{sp:3.5,tot:44.5,mla:150,mlh:-170,spa:-105,sph:-115,tov:-120,tou:100});
      ((S.odds[g0.id]??={})['audit-p1']={receptions:{'6':150},any_td:{'1':180}});
      const base={gid:g0.id,week:cw,src:'real',name:'Audit',pos:'WR',grp:'WR',team:g0.a,opp:g0.h,p:0.6};
      const pl=o=>({...base,pid:'audit-p1',stat:'receptions',key:g0.id+'|audit-p1|'+(o.stat||'receptions'),...o});
      const tm=(team,o)=>({...base,pid:'team:'+team,team,opp:team===g0.h?g0.a:g0.h,grp:'TEAM',pos:'Game',side:'over',main:false,...o});
      const one=(lab,l,want)=>{ ruleCases++; const got=LF(l), own=fairOf(l);
        chk(want===null?got===null&&own===null:(!!got&&!!own&&near(got.p,want.p)&&near(own.p,want.p)&&got.est===want.est&&own.est===want.est),
          `fair chance, ${lab}: the page says ${got?got.p+(got.est?' est.':''):'none'}, the rule ${want?want.p+(want.est?' est.':''):'none'}`); };
      const V=vig(cw);
      one('a main line\'s over, both sides priced',pl({k:4.5,main:true,side:'over',price:-130}),{p:nv(-130,110),est:false});
      one('a main line\'s under, both sides priced',pl({k:4.5,main:true,side:'under',price:110}),{p:nv(110,-130),est:false});
      chk(near(LF(pl({k:4.5,main:true,side:'over',price:-130})).p,F('devigOver')(-130,110))&&near(LF(pl({k:4.5,main:true,side:'over',price:-130})).p+LF(pl({k:4.5,main:true,side:'under',price:110})).p,1),'a main line\'s fair chances are not devigOver\'s, or its two sides do not make one');
      one('a main line the payload has moved',pl({k:5.5,main:true,side:'over',price:-130}),{p:imp(-130)/V.player,est:true});
      one('a ladder rung with a book price',pl({k:6,main:false,side:'over',price:150}),{p:imp(150)/V.player,est:true});
      one('an anytime touchdown with a book price',pl({stat:'any_td',k:1,main:false,side:'over',price:180}),{p:imp(180)/V.player,est:true});
      one('a rung on an estimated price',pl({k:7,main:false,side:'over',price:200,src:'est'}),null);
      one('the away side to win, both priced',tm(g0.a,{stat:'ml',k:0,price:150}),{p:nv(150,-170),est:false});
      one('the home side to win, both priced',tm(g0.h,{stat:'ml',k:0,price:-170}),{p:nv(-170,150),est:false});
      one('the home side to cover its own number',tm(g0.h,{stat:'ats',k:-3.5,price:-115}),{p:nv(-115,-105),est:false});
      one('the away side to cover another number',tm(g0.a,{stat:'ats',k:4.5,price:-125}),{p:imp(-125)/V.ats,est:true});
      one('the total\'s over, both priced',{...base,key:g0.id+'|game|total',pid:'game',stat:'total',k:44.5,side:'over',main:true,price:-120,grp:'TEAM'},{p:nv(-120,100),est:false});
      one('the total\'s under, both priced',{...base,key:g0.id+'|game|total',pid:'game',stat:'total',k:44.5,side:'under',main:true,price:100,grp:'TEAM'},{p:nv(100,-120),est:false});
      one('a team bet on an estimated price',tm(g0.a,{stat:'ml',k:0,price:150,src:'est'}),null);
      g0.mlh=null; one('the away side to win, its other side unpriced',tm(g0.a,{stat:'ml',k:0,price:150}),{p:imp(150)/(vig(cw).ml||vig(cw).all),est:true}); g0.mlh=-170;
      /* no two-sided player line that week: the week's every two-sided line; none at all: no fair chance */
      { const keep=PAY.mkt[String(cw)]; delete PAY.mkt[String(cw)]; const Va=vig(cw);
        one('a rung in a week with no player main line',pl({k:6,main:false,side:'over',price:150}),Va.all>0?{p:imp(150)/Va.all,est:true}:null);
        PAY.mkt[String(cw)]=keep; }
      one('a rung in a week with no line at all',{...pl({k:6,main:false,side:'over',price:150}),gid:'2099_99_AAA_BBB',week:99},null);
      /* a parlay's fair chance: parlayProb on its legs at their fair chances, two legs of one team moving together */
      { const qb={...base,pid:'audit-qb',stat:'passing_yards',grp:'QB',pos:'QB',k:250.5,main:true,side:'over',price:-110,key:g0.id+'|audit-qb|passing_yards'};
        M['audit-qb']={passing_yards:{line:250.5,over:-110,under:-110,n:'Audit QB',g:g0.id}};
        const wr={...pl({k:4.5,main:true,side:'over',price:-130}),stat:'receiving_yards',key:g0.id+'|audit-p1|receiving_yards'};
        M['audit-p1'].receiving_yards={line:4.5,over:-130,under:110,n:'Audit One',g:g0.id};
        const legs=[qb,wr], f=PF(legs), byFair=pp(legs.map(l=>({...l,p:fairOf(l).p}))).corr;
        chk(!!f&&f.p===byFair&&f.est===false&&pp(legs).pairs.length>0,`a same-game parlay's fair chance ${f&&f.p} is not parlayProb on its legs at their fair chances (${byFair}), or its legs do not move together`);
        const f2=PF([qb,pl({k:6,main:false,side:'over',price:150})]);
        chk(!!f2&&f2.est===true&&f2.p!=null,'a parlay with a rung priced on one side is not marked est.');
        const f3=PF([qb,pl({k:7,main:false,side:'over',price:200,src:'est'})]);
        chk(!!f3&&f3.p===null&&f3.miss===1,'a parlay with a leg on an estimated price has a fair chance'); }
      restore();

      /* ---- far off the market: made-up lines on every starter of the week's games to come, one in
         three priced so the book's fair chance on the model's side is 25 points under the model's (far
         off), one in three 6 points under (an edge, not far), the rest at -112/-108 ---- */
      const games=F('pbGames')();
      if(!games.length) console.log('M7. fair chance: '+ruleCases+' cases of the rule; no game to come for the far-off checks');
      else {
        const MM=(PAY.mkt[String(cw)]=PAY.mkt[String(cw)]||{}); let j=0, nFar=0, nNear=0;
        for(const g of games){ const ro=rosterFor(g,false);
          for(const tm in ro) ro[tm].players.forEach(x=>{ if(!x.starter) return;
            for(const l of statLines(x)){ if(l.prob||!(l.mu>2)) continue;
              const ln=Math.floor(l.mu)+0.5, pO=pOver(x.pl.grp,l.stat,l.mu,ln), ov=pO>=0.5, ps=ov?pO:1-pO, kind=j++%3;
              let over=-112, under=-108;
              if(kind<2){ const fs=Math.max(0.05,Math.min(0.9,ps-(kind===0?0.25:0.06))), fo=ov?fs:1-fs; over=toML(fo*1.03); under=toML((1-fo)*1.03); }
              ((MM[x.pl.id]??={})[l.stat])={line:ln,over,under,n:x.pl.n,g:g.id}; } }); }
        /* (app v109) DraftKings' ids for the made-up lines, as the pull reads one with each price, in place
           of the payload's table: the far-off rule is held on legs a suggestion could otherwise take */
        dkSet(dkFixture(cw,'M7'));
        const U=S.ui.pb, keepU=JSON.stringify(U);
        for(const k of ['ml','ats','total','over','under']) U.k[k]=true; U.off=[]; w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}');
        /* the pool: no leg far off, and the count the panel gives is the legs left out for it alone */
        const pool=F('pbPool')(games), mlP=F('mlProb'), formOut=typeof w.eloLoaded==='function'&&!w.eloLoaded();
        const left=F('pricedLegs')(games).filter(c=>F('pbAllows')(c)&&takenPrice(c)&&isFinite(c.price)&&c.price!==0&&c.p>=0.45&&c.p<0.97&&c.p-mlP(c.price)>=0&&!(c.grp!=='TEAM'&&formOut)&&isFar(c));
        nFar=left.length; nNear=[...pool.pref,...pool.thin].filter(c=>!isG(c)).length;
        W.coverage(nFar>0&&nNear>0,`the made-up lines did not put both far-off legs (${nFar}) and player legs within ${FAR*100} points of the market (${nNear}) on the picks`);
        chk([...pool.pref,...pool.thin].every(c=>!isFar(c))&&pool.far===nFar,`the panel's pool holds a leg far off the market, or counts ${pool.far} left out where ${nFar} are`);
        const r=F('getPbTiers')();
        chk(r.far===nFar&&r.tiers.every(t=>!t.legs||t.legs.every(l=>!isFar(l))),'a level holds a leg far off the market, or the tiers do not carry the count');
        /* the Top 50 lines: no far leg, and the list says how many it left out and why (the count is a number) */
        { w.eval('PB_TOP_CACHE=new Map()'); const top=F('getPbTop')(); F('renderPb')(); const tx=d.getElementById('pbPanel').textContent.replace(/\s+/g,' ');
          chk(top.far===nFar&&top.rows.every(l=>!isFar(l)),`the Top 30 lines hold a line far off the market, or count ${top.far} left out where ${nFar} are`);
          chk(tx.includes(`${nFar} line${nFar===1?'':'s'} left out: far off the market.`),
            `the list does not say how many lines it left out far off the market (${nFar}): `+(tx.match(/\d+ lines? (is |are )?left out[^.]*\./)||['nothing'])[0]);
          /* (app v130, the owner's call of 22 October 2026: no descriptions) the count and "far off the market" alone */
          W.wording(!/the model rates (it|each) 15 points or more above|still on the game pages, flagged far off the market|have not held up this season/.test(tx),'the list still says why its far-off lines are left out and where they are'); }
        /* every set's levels: none holds a far leg, and each card leads with its fair chance (fairShown is held
           in holdSets too), its labels free to wrap, its floor said to be on the model's chance */
        { spKeyClear(); const stab=d.getElementById('tab-suggest'), keepH=stab.hidden; stab.hidden=false; let nC=0;
          /* every prime-time game's cards, those the night rule hides drawn with spOn stood in (spAllOn), and (app v118) the
             Sunday slot's, its opening stood in where it is not up yet (slotAllOn) */
          try{ spAllOn(()=>slotAllOn(()=>{ F('renderSp')(); const SL=slotNowAud(), su=SL&&F('spUnit')(SL.id);
            for(const g of [...F('spGames')(),...(su?[su]:[])]){ const v=F('spShown')(g), nm=g.slot?`week ${g.w}'s Sunday slot`:`${g.a} at ${g.h}`;
              for(const t of (v.tiers||[]).filter(t=>t.legs)){ const c=d.querySelector(`#spPanel [data-sp-game="${g.id}"] .pb-tier.${t.id}`); nC++;
                chk(t.legs.every(l=>!isFar(l)),`the ${t.id} level of ${nm} holds a leg far off the market`);
                chk(!!c&&c.querySelector('.pb-nums').firstElementChild.classList.contains('pb-chance')&&!c.querySelector('[data-pb-far]'),`the ${t.id} card of ${nm} does not lead with its chance, or flags a leg far off`);
                /* the chance's label and the model's figure wrap inside their box: four levels side by side just
                   over 1100px leave it about 85px, and "FAIR CHANCE, EST." in 10px capitals is about 98 */
                chk(!!c&&['.pb-chance span','.pb-chance small'].every(q=>{ const el=c.querySelector(q); return !el||w.getComputedStyle(el).whiteSpace==='normal'; }),`the ${t.id} card's fair-chance label is held to one line, and can run out of its box`);
                chk(!!c&&(!t.floor||t.likeliest||c.querySelector('.pb-rule').textContent.endsWith(' by the model')),`the ${t.id} card does not say its floor is on the model's chance`); } } })); }
          finally{ stab.hidden=keepH; F('renderSp')(); }
          W.coverage(nC>0||!F('spGames')().length,'the made-up lines built no level on a prime-time game to hold the far-off rule to'); }
        /* a game page's hands: no leg far off, and each hand's fair chance parlayProb on its legs at theirs */
        let hands=0;
        for(const g of games.slice(0,3)){ const T=F('gameTiers')(g);
          chk(F('gameLegPool')(g).every(c=>!isFar(c)),`a game page's leg pool (${g.id}) holds a leg far off the market`);
          for(const id of ['high','med','low']){ const t=T[id]; if(!t) continue; hands++;
            const fs=t.legs.map(l=>LF(l));
            chk(t.legs.every(l=>!isFar(l)),`the ${id} hand of ${g.id} holds a leg far off the market`);
            chk(fs.every(Boolean)?(!!t.fair&&t.fair.p===pp(t.legs.map((l,i)=>({...l,p:fs[i].p})),20000).corr):(!!t.fair&&t.fair.p===null),`the ${id} hand of ${g.id}: its fair chance is not parlayProb on its legs at theirs`); } }
        /* (app v109) a game page's hands take only legs DraftKings has an id for at their own line, where the
           payload carries ids: with every other id of the made-up table taken away, the first game's pool
           is the pool it has with no ids carried (a payload baked before them) less the legs the table has
           no id for, by the audit's own rule, and no hand holds one of those */
        let handsIds='';
        { const gH=games[0], full=F('PAY').dk; let i=0; const half=dkFixture(cw,'M7h',()=>i++%2===0), hasH=l=>!!dkIdAud(l,half);
          const idsH=list=>list.map(l=>l.key+'|'+l.side+'|'+l.k+(l.main?'|m':'')).sort().join();
          try{ dkSet(undefined); const p0=F('gameLegPool')(gH);
            dkSet(half); const p1=F('gameLegPool')(gH), T=F('gameTiers')(gH);
            W.coverage(p0.some(hasH)&&p0.some(l=>!hasH(l)),`the made-up lines gave ${gH.id}'s hands no legs both with a DraftKings id and without one, so the hands' id rule went untested`);
            chk(idsH(p1)===idsH(p0.filter(hasH)),`${gH.id}'s hands' pool, with ids for some of its legs, is not its pool with no ids carried less the legs DraftKings has none for: ${p1.length} legs against ${p0.filter(hasH).length}`);
            chk(['high','med','low'].every(id=>!T[id]||T[id].legs.every(hasH)),`a hand of ${gH.id} holds a leg DraftKings has no id for at its line`);
            handsIds=`; ${gH.id}'s hands' pool ${p1.length} of ${p0.length} legs with ids for half the lines`; }
          finally{ dkSet(full); } }
        /* flagged on the game page: a far-off main line of a starter, his game opened on him */
        const farL=F('pricedLegs')(games).filter(l=>l.main&&!isG(l)&&isFar(l)).sort((a,b)=>String(a.key+a.side).localeCompare(String(b.key+b.side)))[0];
        const nearL=[...pool.pref,...pool.thin].filter(l=>!isG(l)&&l.main).sort((a,b)=>String(a.key+a.side).localeCompare(String(b.key+b.side)))[0];
        let flagged='no far-off main line to open';
        if(farL){ const keepUi=JSON.stringify({game:S.ui.game,open:S.ui.open});
          S.ui.game=farL.gid; S.ui.open={[farL.pid]:true}; F('renderGame')();
          const view=d.getElementById('gameView'), notes=[...view.querySelectorAll('p.faroff[data-far]')].map(p=>p.textContent.replace(/\s+/g,' '));
          const f=fairOf(farL), want=`${farL.side==='under'?'Under':'Over'} ${farL.k} model ${Math.round(farL.p*100)}% · market ${Math.round(f.p*100)}%: far off the market`;
          /* every far-off line of his shown (main lines both sides, the touchdown on a book price; since app v127 a game
             page draws no ladder) and no other */
          const his=F('pricedLegs')([S.sched.find(g=>g.id===farL.gid)]).filter(l=>l.pid===farL.pid&&(l.main||l.stat==='any_td')&&isFar(l));
          chk(notes.includes(want)&&notes.length===his.length&&view.querySelectorAll('tr.far').length===his.length,`the game page does not flag ${farL.name}'s far-off line as "${want}", or flags ${notes.length} where ${his.length} are far off: ${notes.join(' / ')}`);
          flagged=`${farL.name} ${farL.label} flagged on his game page`;
          const ku=JSON.parse(keepUi); S.ui.game=ku.game; S.ui.open=ku.open||{}; F('closeGameModal')(); }
        /* the other far-off flags: a touchdown on a book price (one-sided, so est.), planted 25 points under the model's
           chance on a starter of a game to come; and the Game bets card's to win and to cover, priced so the book's fair
           chance on the model's side is 25 points under it, the other side's lines not flagged. (app v127) A ladder rung
           priced the same way beside it draws no row and no flag: the site offers no ladder bet, and the old box's
           choice to show the ladders (S.ui.showRungs) is planted on to hold that nothing reads it */
        const gF=games[0], roF=rosterFor(gF,false), pick=[];
        for(const tm in roF) roF[tm].players.forEach(x=>{ if(!x.starter) return; const ls=statLines(x), td=ls.find(l=>l.prob&&l.p>=0.2), ld=ls.find(l=>!l.prob&&l.rungs.some(r=>r.p>=0.3&&r.p<0.97));
          if(td) pick.push({x,td,ld,r:ld?ld.rungs.find(r=>r.p>=0.3&&r.p<0.97):null}); });
        const V=vig(cw), vp=V.player||V.all;
        if(pick.length&&vp>0){ const {x,td,ld,r}=pick.sort((a,b)=>(!!b.r-!!a.r)||String(a.x.pl.id).localeCompare(String(b.x.pl.id)))[0];
          const pTD=toML(Math.max(0.02,td.p-0.25)*vp), O=((S.odds[gF.id]??={})[x.pl.id]??={});
          O.any_td={...(O.any_td||{}),'1':pTD}; if(r) O[ld.stat]={...(O[ld.stat]||{}),[String(r.k)]:toML(Math.max(0.02,r.p-0.25)*vp)};
          const legTD={gid:gF.id,pid:x.pl.id,stat:'any_td',k:1,side:'over',main:false,p:td.p,price:pTD,src:'real',week:gF.w};
          const fT=fairOf(legTD);
          const keepUi=JSON.stringify({game:S.ui.game,open:S.ui.open});
          S.ui.showRungs=true; S.ui.game=gF.id; S.ui.open={[x.pl.id]:true}; F('renderGame')();
          const view=d.getElementById('gameView'), notes=[...view.querySelectorAll('p.faroff[data-far]')].map(p=>p.textContent.replace(/\s+/g,' '));
          const wantT=`Scores one model ${Math.round(td.p*100)}% · market ${Math.round(fT.p*100)}% est.: far off the market`;
          chk(!!fT&&fT.est&&isFar(legTD)&&notes.includes(wantT)&&view.querySelectorAll('tr.far').length===notes.length&&notes.length>=1,
            `a far-off touchdown on a book price is not flagged on its game page ("${wantT}"): ${notes.join(' / ')||'no flag'}`);
          if(r) chk(!view.querySelector('tr.rung')&&![...view.querySelectorAll(`input[data-leg="${gF.id}|${x.pl.id}|${ld.stat}"]`)].some(b=>b.dataset.main!=='1')&&!notes.some(t=>t.startsWith(r.k+'+')),
            `the ${r.k}+ ${ld.stat} rung priced far off the market on ${x.pl.n} draws a row, a box or a flag on his game page: the site offers no ladder bet`);
          else W.coverage(false,`${x.pl.n} has no ladder rung to price, so a priced rung drawing no row went untested`);
          delete S.ui.showRungs; const ku=JSON.parse(keepUi); S.ui.game=ku.game; S.ui.open=ku.open||{}; F('closeGameModal')(); }
        else W.coverage(false,'no starter of a game to come has a touchdown to plant a far-off price on');
        { const g=gF; if(g.sp==null||!isFinite(g.sp)) g.sp=3.5;
          const side=kind=>[g.a,g.h].map(t=>({t,b:gameBet(g,t,kind)})).sort((a,b)=>b.b.p-a.b.p)[0];
          const mlS=side('ml'), atS=side('ats'), fM=Math.max(0.05,mlS.b.p-0.25), fA=Math.max(0.05,atS.b.p-0.25), hM=mlS.t===g.h, hA=atS.t===g.h;
          const own=f=>toML(f*1.03), oth=f=>toML((1-f)*1.03);
          if(hM){ g.mlh=own(fM); g.mla=oth(fM); } else { g.mla=own(fM); g.mlh=oth(fM); }
          if(hA){ g.sph=own(fA); g.spa=oth(fA); } else { g.spa=own(fA); g.sph=oth(fA); }
          w.eval('GAME_TIER_CACHE={}');
          const box=d.createElement('div'); box.innerHTML=F('gameBetsCard')(g,false);
          const notes=[...box.querySelectorAll('p.faroff[data-far]')].map(p=>p.textContent.replace(/\s+/g,' '));
          const fm=nv(hM?g.mlh:g.mla,hM?g.mla:g.mlh), fa=nv(hA?g.sph:g.spa,hA?g.spa:g.sph), ln=atS.b.line;
          const want=[`To win model ${Math.round(mlS.b.p*100)}% · market ${Math.round(fm*100)}%: far off the market`,`To cover ${ln>0?'+':''}${ln} model ${Math.round(atS.b.p*100)}% · market ${Math.round(fa*100)}%: far off the market`];
          chk(want.every(x=>notes.includes(x))&&notes.length===2&&box.querySelectorAll('tr.far').length===2,
            `the Game bets card does not flag a far-off to win and to cover (and only those): ${notes.join(' / ')||'no flag'}`); }
        /* (app v124) the game page draws its hands no more: their fair chance is held on the engine above
           (gameTiers' fair, against parlayFair on their legs), and no card is drawn to read it from */
        flagged+='; a far-off touchdown, to win and to cover flagged, a rung priced far off drawing no row';
        /* the builder: the far-off leg flagged in its row, the near one not; the summary leads with the fair chance */
        if(farL&&nearL){ const keepP=JSON.stringify(S.parlay||{}), keepB=S.bookPrice, put=l=>{ const {key,thin,...x}=l; S.parlay[key]=x; };
          S.parlay={}; S.bookPrice=null; put(farL); if(nearL.key!==farL.key) put(nearL); F('renderParlay')();
          const legs=F('parlayLegs')(), fr=PF(legs), body=d.getElementById('parlayBody'), rows=[...body.querySelectorAll('tr.legrow')];
          const pr=pp(legs.map(l=>({...l,side:l.side||'over'}))).corr, hero=body.querySelector('.bigp .hero');
          chk(rows.length===legs.length&&legs.every((l,i)=>{ const ff=fairOf(l), fl=rows[i].querySelector('small.faroff'); return isFar(l)?!!fl&&fl.textContent===`model ${Math.round(l.p*100)}% · market ${Math.round(ff.p*100)}%${ff.est?' est.':''}: far off the market`:!fl; })
            &&legs.every((l,i)=>{ const lf=rows[i].querySelector('.legfair'), ff=fairOf(l); return !!lf&&lf.textContent===`fair ${(ff.p*100).toFixed(0)}%${ff.est?' est.':''}`; }),
            'the builder does not flag its far-off leg (and only it), or does not give each leg its fair chance: '+rows.map(r=>r.textContent.replace(/\s+/g,' ')).join(' / '));
          chk(!!fr&&fr.p!=null&&!!hero&&hero.querySelector('b').textContent===(fr.p*100).toFixed(1)+'%'&&hero.querySelector('span').textContent===`fair chance all ${legs.length} land${fr.est?', est.':''}`&&hero.querySelector('small').textContent===`model says ${(pr*100).toFixed(1)}%`,
            'the builder\'s summary does not lead with the fair chance, the model\'s beside it: '+(hero?hero.textContent:'no summary'));
          /* (app v130, the owner's call of 22 October 2026: no descriptions) nothing in the builder explains it: no line
             under its heading, no sentence beside the book price box, no note on the fair chance or on legs of one game,
             and no "What it means" column or foot on the pairs table */
          W.wording(!body.querySelector('.fair-note')&&!/Every leg has to land|Blank (prices|multiplies)|The fair chance is the book's|Legs here share a game, so they are priced together|What it means|tend to happen (in the same game|at each other)|Measured across 2019 to 2024/.test(body.textContent),
            'the builder still draws a description: '+((body.textContent.replace(/\s+/g,' ').match(/(Every leg has to land|Blank (prices|multiplies)|The fair chance is the book's|Legs here share a game|What it means|tend to happen|Measured across)[^.]{0,80}/)||['?'])[0]));
          /* the confidence tile rates the fair chance, and says so: the far-off leg alone, its chance set in
             the builder where the model's tier and the fair chance's differ */
          { const tile=()=>d.querySelector('#parlayBody .bigp .box.tier'), ct=F('confTier'), f1=fairOf(farL).p, pm=f1<0.45?0.72:f1<0.7?0.85:0.3;
            const {key,thin,...one}=farL; S.parlay={[key]:{...one,p:pm}}; F('renderParlay')();
            const t1=tile(), [c1,l1]=ct(f1);
            chk(ct(pm)[0]!==c1&&!!t1&&t1.classList.contains(c1)&&t1.querySelector('b').textContent===l1&&t1.querySelector('span').textContent==='confidence all 1 land, on the fair chance',
              `the builder's confidence tile does not rate the fair chance (${(f1*100).toFixed(1)}%: ${l1}) where the model's ${(pm*100).toFixed(0)}% is ${ct(pm)[1]}: `+(t1?t1.textContent:'no tile')); }
          /* a leg on no book price: the model's chance alone, saying why */
          /* (app v127) a main line off the market's number, so no ladder: until then a rung, which the site offers no more */
          const est={gid:farL.gid,pid:farL.pid,stat:farL.stat,k:Math.floor(+farL.k)+3.5,side:'over',main:true,p:0.3,price:250,src:'est',mu:farL.mu,name:farL.name,pos:farL.pos,grp:farL.grp,team:farL.team,opp:farL.opp,week:farL.week,label:'est leg'};
          S.parlay={}; put(nearL); S.parlay[farL.gid+'|'+farL.pid+'|zz_est']={...est}; F('renderParlay')();
          const h2=d.querySelector('#parlayBody .bigp .hero');
          /* (app v130, the owner's call of 22 October 2026: no descriptions) "no fair chance" alone, and no note under the tiles */
          chk(!!h2&&/^model's chance all 2 land$/.test(h2.querySelector('span').textContent)&&h2.querySelector('small').textContent==='no fair chance'&&!d.querySelector('#parlayBody .fair-note')&&!/so this is the model's chance alone|The fair chance needs a book price/.test(d.getElementById('parlayBody').textContent),
            'with a leg on no book price the builder does not show the model\'s chance alone beside "no fair chance": '+(h2?h2.textContent:'no summary'));
          { const t2=d.querySelector('#parlayBody .bigp .box.tier'), p2=pp(F('parlayLegs')().map(l=>({...l,side:l.side||'over'}))).corr, [c2,l2]=F('confTier')(p2);
            chk(!!t2&&t2.classList.contains(c2)&&t2.querySelector('b').textContent===l2&&t2.querySelector('span').textContent==='confidence all 2 land, on the model’s chance',
              'with no fair chance the builder\'s confidence tile does not rate the model\'s chance and say so: '+(t2?t2.textContent:'no tile')); }
          S.parlay=JSON.parse(keepP); S.bookPrice=keepB; F('save')(); F('renderParlay')(); }
        S.ui.pb=JSON.parse(keepU);
        console.log(`M7. fair chance: ${ruleCases} cases of the rule, and on made-up lines ${nFar} legs far off the market left out (${nNear} player legs kept), none on a level or on ${hands} game hands; ${flagged}; the builder flags it and leads with the fair chance${handsIds}`); }
    } finally { restore(); rebake(); F('renderParlay')(); } }

  /* ---- M8. Refresh odds: DraftKings' lines read from ESPN in the browser, on a press (app v107) ----
     The page reads ESPN only when a visitor presses Refresh odds (part3.js espnRefresh), never on load
     or on a timer, and holds what it read in memory (ESPN_LIVE, ESPN_GL, outside S). Every check here
     runs on the reader itself, fed ESPN's recorded answers in fixtures/espn/ (week 6 of 2026 as ESPN gave
     it on 15 October: the scoreboard, the player lines of SEA at DEN and NYJ at NE, three athletes'
     records, the roster's ESPN ids) through a fetch stub, or a feed made here from their shapes on the
     payload's own games still to come, so it holds in any week and never touches the network.
     Blocking: no request to ESPN without a press, every request no-store with no header of its own;
     the reader's reading of the recorded answers is the checks' own (espn_rule.js parse, oddsOf: the type
     ids, a main line's twins kept once and two different lines dropped, the milestones as k+, the
     touchdown list, the game lines by club and never by home and away, DraftKings' ids), every page to
     its pageCount at limit 1000 with a cache-buster, a 404 no lines posted, a junk or short answer or a
     failure leaving the game as it was; athletes placed by PAY.espn_ids, else by name within the game's
     two clubs (an athlete's record, or the clubs' rosters with many to place) on a player no ESPN id
     names and no other athlete claims (a planted "Gary Wilson" never takes Garrett Wilson's lines), else
     left out; a game
     at or past its kickoff not read, and a read its kickoff passes during thrown away; a press reads the
     week (a game's page that game alone), applies DraftKings' game lines where newer and its ids beside
     the paid pull's, each dated by the read that saw it (espnIdAt; the pull's glat kept), never saves what
     it read, and a press while one runs does nothing; the levels and a game's hands right after a press
     are what a build on the read gives, never the ones cached before it; and a reload (the press's game
     lines put back, its read dropped) sends a leg it priced in the builder back to the published price on
     its line, else the model's estimate. Then every price
     the page works from the read, on every player of the game read: the rule's (espn_rule.js, its own
     copy of the formula's constants), within -1000 and +2000, a main line's two sides summing to one
     plus its margin, a ladder falling as it climbs, a count ladder on a paid line at the read's number
     anchored on that line's de-vig; the precedence (a paid line the read has at the same
     number stays real, one it has moved goes est. at the read's number, a rung the pull priced stays
     real, the game lines real at the read's prices); where the page chooses legs a dkline leg only of a
     tested kind, at the rule's price and fair chance, under the panel's own band, edge and far-off rules
     (a game page's hands under the far-off rule too) and V6's (pickOk, takenPrice), never an untested one
     or a model-only estimate but in a game page's hands, and (app v109) wherever the payload carries
     DraftKings' ids only a leg with DraftKings' id at its own line (dkOk, the audit's own rule), so never
     one from the read, which ESPN gives no id; held again with PAY.dk taken away, a payload baked before
     ids, where the read's legs are suggested as before; a leg ticked takes the same price; a read in play
     never used and a game kicked off offering nothing. And (app v108, M8g) the read kept in this browser
     under its own key (props_press_v1): the press writes v 1 and the page's season with an entry for each
     game it read, each with what a reload must put back (what its reads did to the game lines, d: each field
     a read set with its value and that read's own time, the value null where one dropped it; every id the read gave or found as the pull had it
     with the read's time, the pull's glat else the read's, the event; all worked out by the checks from the
     scoreboard and the paid pull as the press found it, simReads), the published lines it was read over
     (their hashes, worked out here) and ESPN_LIVE's player lines for it, none of it in S as saved; a reload on
     the same window, from the page as a load finds it, makes no request and puts back exactly the press's
     player lines, game lines, ids and their read times, the levels and a game's hands coming out as right
     after the press; two presses in one load (the week's, then a game page's whose scoreboard lacks the money
     line and has moved the spread and total) are kept and put back as the page showed them after both, every
     game's lines, ls and lat, ESPN_GL (d with it), PAY.dk and ESPN_IDAT exactly; two reads in one load
     bringing a spread (and, on its own, a total) back to the published number with no prices: kept as d with
     the two prices null, and a reload shows that number with no price, the published ones never back, ESPN_GL
     as the reads left it and its bets priced as after the reads; a game read twice with two DraftKings events,
     on a game the pull gave none: the first read's kept and put back, the event the page used; what each read
     found (ESPN_OUT) put back with the half it describes, an 'ok' only with its player lines and a 'none' with
     none; a read that found no player lines posted and read no game lines kept as that alone and put back,
     its status line and the Parlay Builder's empty levels saying so; a read the press left off (older than the
     published lines) keeps no lines and a reload puts none back. The time rule (round 4): a half stands over
     the publish it was read over, or over a newer one where the read is later than that publish's own time
     for it (the game lines' DraftKings pull, g.lat where ls is 'dk', else the bake; the player prices' paid
     pull, PAY.dk's at, else the bake), each case with the other time of the pair on the far side: a newer
     publish moving the total with its pull later than the read sets the game lines aside (the player lines
     standing; a read of the game lines alone said to have given way), earlier stands with the kept d replayed
     on its lines (a field no read set the newer publish's, a number kept without prices dropping the newer
     one's two where its number differs) and the key written back over its hash; the same on DraftKings' lines
     with no pull time and on lines that are not DraftKings', by the bake; a rebake of the same lines never
     sets a read aside, on lines that are not DraftKings' too; the player half the same by the paid pull's time
     or the bake, its legs priced from the read as after the press where it stands; a kickoff sets all of it
     aside; each half set aside named in ESPN_ASIDE, the key written back without it, its time (the half's
     latest read) held in ESPN_KEEP_GONE by half ({gl, pl}); a value of another season, another version, not
     JSON or with no games object puts nothing back and empties the key; no schedule leaves the key as it was;
     a DraftKings id or id key, a player id or a line the page never writes is dropped and never reaches PAY.dk
     or ESPN_LIVE, "__proto__" among them (a player, an id key or a game: never an own key or a prototype of
     anything put back, and nothing set on the page's built-ins); a game id not of the schedule's shape
     ("__proto__", "constructor", "toString", "hasOwnProperty", lower case, a part more), each planted as a game
     of the schedule too, skipped by the restore and dropped by the write; a game line kept as no number
     dropped (the published one standing) and the rest replayed as kept; a half dated after the page's clock
     (gl.at, an idat, glat, pl.at) is dropped and the rest put back, and loses a merge to a real read; an entry
     for a game not on the schedule or in another week is dropped; two tabs' writes merge half by half, each
     game's game lines and its player lines (with their plsig and what that read found) from whichever side read
     them later, a game-line half with no lines and no ids never displacing one with lines and a later read that
     found no player lines keeping the lines the other side read, so a tab whose latest press failed the player
     lines never puts its older copy over another tab's newer one, and a half a load set aside is never taken
     back while the other half still is; and a save of the visitor's state with no room empties the key and
     saves on its second try, the read not written again that load. Round 5: each game-line field by its own
     read's time, so over a newer publish only the fields read after it stand, as a read would put them (two
     reads, the money lines at t1 and the spread at t2, over a publish pulled between them: its money lines and
     the second read's spread; a number kept without prices keeping that publish's real prices on its own number,
     dropping them on another, a kept null price pair the same), and over the publish read over everything exactly
     as after the reads; a kept line of the page's shape alone ([value, time], the time not after its read's); a
     'none' player read lending its other side's lines only over the same publish; a write carrying the browser's
     copy of a game this tab's schedule no longer offers (kicked off or scored there, not on it) as it stands, and a
     restore pruning one not on, or kicked off on, the publish it loads; a kept player line or rung on a half point
     above 0 and at most 1000, at most 40 rungs a stat; and a 'none' put back for a day at most (DK_EST.staleHours). Round 6: a
     builder game leg keeping its add-time price only while its own price field stands, with a value, among what the
     load's reads did (two reads, the money lines and total at t1 and the spread at t2, legs ticked after each, reloaded
     over the same publish and over newer ones pulled between, before and after the reads; and a cover whose price a later
     read dropped); the merge's player block the later of the two sides' over the same publish, never borrowed over
     another; what a reload does not put back (an 'ok' whose player lines were dropped, a 'none' a day old) pruned from the
     key and from another tab's copy; and a money line, spread or total kept as null dropped, the published one standing,
     a null price pair replayed, and lat over a newer publish the latest field the replay put. Each case of the kept read runs in a guard
     of its own (kcase): a throw is a failed check with its message, and the page is put back after it (the
     schedule, the lines, PAY.dk and baked_at, the main lines, the clock, the key, the ESPN_* state), its
     built-in prototypes with it (protoClean), so a case that breaks the page fails its checks and never ends
     the audit without its summary line, which weekly.py reads as a refused run. With no game still to come
     (the off-season) the press's checks on the week, the kept read's with them, are skipped and logged,
     never warned. Warnings (W.wording): the status lines' and the cards' words. */
  { const cw=F('currentWeek')(), fmt=F('fmtML'), isG=F('isGameLeg'), FAR=w.eval('FAR_OFF'), imp=ESPN.implied, P=()=>F('PAY'), txt=e=>e?e.textContent:'', SEASON=F('SEASON');
    const FX=n=>JSON.parse(fs.readFileSync('fixtures/espn/'+n,'utf8'));
    const SB0=FX('scoreboard_w6.json'), IT0={'401872995':FX('props_401872995.json'),'401873001':FX('props_401873001.json')}, ATH0=FX('athletes.json');
    const ROS0=Papa.parse(fs.readFileSync('fixtures/espn/roster.csv','utf8'),{header:true,skipEmptyLines:true}).data;
    const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v)), same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    const sortObj=o=>Object.fromEntries(Object.keys(o||{}).sort().map(k=>[k,o[k]]));
    const normPer=p=>Object.keys(p).sort().map(a=>[a,sortObj(p[a].lines),sortObj(p[a].rungs),!!p[a].td]);
    const normBlock=b=>b&&[sortObj(b.lines),Object.keys(b.rungs||{}).sort().map(k=>[k,sortObj(b.rungs[k])]),[...(b.td||[])].sort()];
    const near=(a,b)=>a!=null&&b!=null&&Math.abs(a-b)<1e-12, PB_BAND=[0.45,0.97];
    let nParse=0, nPx=0, nDom=0, nPick=0, nTog=0, nReq=0; const untested={};
    /* the network as the page sees it: ESPN's hosts answered here, everything else as before */
    const net={log:[],route:()=>({code:500,body:{}}),gate:null,date:null};
    const realFetch=w.fetch, esp=u=>/^https:\/\/(site|sports\.core)\.api\.espn\.com\//.test(u);
    const answer=r=>({ok:r.code===200,status:r.code,headers:{get:k=>String(k).toLowerCase()==='date'&&net.date!=null?new Date(net.date).toUTCString():null},
      json:async()=>{ if(r.junk) throw new SyntaxError('Unexpected token < in JSON'); return clone(r.body); }});
    const stub=async(u,o)=>{ u=String(u); if(!esp(u)) return realFetch(u,o);
      net.log.push({url:u,cache:o&&o.cache||null,headers:o&&o.headers||null,method:(o&&o.method)||'GET'});
      if(net.gate) await net.gate;
      const r=net.route(u)||{code:500,body:{}}; if(r.before) r.before();
      if(r.reject) throw new TypeError('Failed to fetch');
      return answer(r); };
    const props=u=>{ const m=/\/events\/(\d+)\/competitions\/\d+\/odds\/100\/propBets\?(.*)$/.exec(u); return m?{eid:m[1],q:new URLSearchParams(m[2])}:null; };
    const page=(its,q)=>{ const lim=+q.get('limit')||25, size=lim>1000?25:lim, pg=+q.get('page')||1;
      return {code:200,body:{count:its.length,pageIndex:pg,pageSize:size,pageCount:Math.ceil(its.length/size),items:its.slice((pg-1)*size,pg*size)}}; };
    const rosterOf=id=>{ const ab={'26':'SEA','7':'DEN','20':'NYJ','17':'NE'}[id]||String(id).toUpperCase(); return {code:200,body:{athletes:[{position:'offense',items:ROS0.filter(r=>r.team===ab&&r.espn_id).map(r=>({id:r.espn_id,fullName:r.full_name}))}]}}; };
    /* the recorded answers, as ESPN gave them */
    const recorded=u=>{ const p=props(u); if(p){ const its=IT0[p.eid]; return its?page(its,p.q):{code:404,body:{error:{message:`No propBets found for eventId ${p.eid} and provider 100`,code:404}}}; }
      if(/\/scoreboard\?/.test(u)) return {code:200,body:SB0};
      let m=/\/athletes\/(\d+)\?/.exec(u); if(m) return ATH0[m[1]]?{code:200,body:ATH0[m[1]]}:{code:404,body:{error:{code:404}}};
      m=/\/teams\/(\w+)\/roster$/.exec(u); if(m) return rosterOf(m[1]);
      return {code:404,body:{}}; };
    const reset=()=>w.eval('ESPN_LIVE={}; ESPN_OUT={}; ESPN_NAMES={}; ESPN_IDAT={}; ESPN_SEQ++; PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}');
    /* the game lines a press applied, put back as published */
    const unapply=()=>{ const GL=F('ESPN_GL'); for(const id of Object.keys(GL)){ const g=S.sched.find(x=>x.id===id); if(!g) continue;
      for(const k of F('ESPN_GL_KEYS')){ if(GL[id].orig[k]===undefined) delete g[k]; else g[k]=GL[id].orig[k]; } } w.eval('ESPN_GL={}'); };
    const clock0=w.Date.now; let clockOff=0; const setClock=t=>{ clockOff=t-clock0.call(w.Date); w.Date.now=()=>clock0.call(w.Date)+clockOff; };
    const keepIds=P().espn_ids, keepNames=clone(F('ESPN_NAMES')), added=[];
    /* (app v108) the read kept in this browser: its key, and the page's keeping state as M8 found it, put back after */
    const LS=w.localStorage, KK=F('ESPN_KEEP_KEY'), lsGet=()=>{ try{ return LS.getItem(KK); }catch(e){ return null; } }, setVar=(n,v)=>w.eval(`(function(v){ ${n}=v; })`)(v);
    const key0=lsGet(), keep0={ESPN_KEPT:clone(F('ESPN_KEPT')),ESPN_ASIDE:clone(F('ESPN_ASIDE')),ESPN_KEEP_GONE:clone(F('ESPN_KEEP_GONE')),ESPN_KEEP_OFF:F('ESPN_KEEP_OFF')};
    /* the page's built-ins as M8 found them. A kept value may never set anything on them: on 16 October 2026 a
       kept game "__proto__" did (espnRestore's ESPN_KEEP_GONE['__proto__'] is Object.prototype, and the
       times of its halves were set there as gl and pl), every for-in on the page then read them (rosterFor's
       clubs, buildNorm's stats), and the audit stopped with no summary line. protoClean() takes out whatever
       was added and names it, so a check fails on it and the rest of the audit runs on clean built-ins */
    const PROTOS=[['Object.prototype',w.Object.prototype],['Array.prototype',w.Array.prototype],['Function.prototype',w.Function.prototype],['Object',w.Object]];
    const protoOwn0=PROTOS.map(([,o])=>new Set(Reflect.ownKeys(o)));
    const protoClean=()=>{ const hit=[]; PROTOS.forEach(([n,o],i)=>{ for(const k of Reflect.ownKeys(o)) if(!protoOwn0[i].has(k)){ hit.push(`${n}.${String(k)}`); try{ delete o[k]; }catch(e){} } }); return hit; };
    let nKeep=0;
    try{
      /* M8a. nothing asked of ESPN before a press: not on load (the audit's own fetch saw none), not on
         any draw of the slate, a game's page or the panel */
      chk(!calls.some(c=>esp(c.url)),'the page asked ESPN for something on its own before any press: '+calls.filter(c=>esp(c.url)).map(c=>c.url).slice(0,3).join(' '));
      /* (app v125) M8 holds the press and the kept read on a payload with no published read: every game's PAY.espn
         entry cleared (unbake) here and put back after M8 (rebake); the published read and its precedence are M17's */
      unbake();
      w.fetch=stub;
      F('renderAll')(); for(const g of F('pbGames')().slice(0,3)){ S.ui.game=g.id; F('renderGame')(); } S.ui.game=null; F('closeGameModal')(); F('renderPb')();
      await sleep(300);
      chk(net.log.length===0,`the page asked ESPN for ${net.log.length} thing(s) with no press of Refresh odds: ${net.log.slice(0,3).map(x=>x.url).join(' ')}`);
      { const gs=F('pbGames')(), pb=d.querySelector('#pbPanel [data-espn-refresh="week"]'), so=d.querySelector('#slateOdds [data-espn-refresh="week"]');
        const pub=`Prices as published ${F('espnWhen')(P().baked_at)}.`;
        W.wording(!gs.length||(!!pb&&txt(d.querySelector('#pbPanel [data-espn-status="week"]'))===pub),`the Parlay Builder has no Refresh odds button with its status line saying the published prices before a press: ${pb?txt(d.querySelector('#pbPanel [data-espn-status]')):'no button'}`);
        W.wording(!gs.length||d.getElementById('weekSel').value!==String(cw)||(!!so&&!d.getElementById('slateOdds').hidden),'the Props tab has no Refresh odds button over its game list');
        if(gs.length){ S.ui.game=gs[0].id; F('renderGame')(); const gb=d.querySelector(`#gameView [data-espn-refresh="${gs[0].id}"]`), st=d.querySelector(`#gameView [data-espn-status="${gs[0].id}"]`);
          W.wording(!!gb&&!!st&&st.getAttribute('aria-live')==='polite'&&txt(st)===pub,`${gs[0].id}'s page has no Refresh odds button for the game with its status line`); S.ui.game=null; F('closeGameModal')(); } }

      /* M8b. the reader's reading of the recorded player lines, against the checks' own */
      for(const [eid,items] of Object.entries(IT0)){ const got=F('espnParseItems')(items), want=ESPN.parse(items); nParse++;
        chk(same(normPer(got.per),normPer(want)),`the reader reads event ${eid}'s recorded player lines otherwise than the checks do: ${JSON.stringify(normPer(got.per)).slice(0,300)}`);
        const nMain=Object.values(want).reduce((s,a)=>s+Object.keys(a.lines).length,0), twins=items.filter(it=>ESPN.TYPES.main[String(it.type.id)]).length;
        chk(got.counts.main===nMain&&(twins===0||twins>=nMain),`event ${eid}: ${got.counts.main} main lines read from ${twins} items where the twins make ${nMain}`); }
      { const it=IT0['401872995'], a=it.find(x=>String(x.type.id)==='8'), aid=/athletes\/(\d+)/.exec(a.athlete.$ref)[1];
        const clash=[...it,{...clone(a),current:{target:{value:a.current.target.value+10}}}], one=F('espnParseItems')(it).per[aid];
        chk(!('passing_yards' in F('espnParseItems')(clash).per[aid].lines)&&same(sortObj(F('espnParseItems')(clash).per[aid].lines),sortObj(ESPN.parse(clash)[aid].lines)),'two different main lines for one player and stat are not both left out');
        chk(same(F('espnParseItems')([...it,clone(a),clone(a)]).per[aid],one),'a main line\'s twin items read as more than one line');
        const m=it.find(x=>ESPN.TYPES.mile[String(x.type.id)]), mid=/athletes\/(\d+)/.exec(m.athlete.$ref)[1], ms=ESPN.TYPES.mile[String(m.type.id)];
        chk((F('espnParseItems')(it).per[mid].rungs[ms]||[]).includes(m.current.target.value),`a milestone (${ms} ${m.current.target.value}+) is not read as its rung`);
        const odd=[{type:{id:'8'},current:{target:{value:250.5}}},{type:{id:'29'},athlete:{$ref:'http://x/athletes/1'},current:{target:{value:0.5}}},{type:{id:'8'},athlete:{$ref:'http://x/athletes/2'},current:{target:{value:'n/a'}}}];
        chk(!Object.keys(F('espnParseItems')(odd).per).some(k=>k==='1'||(F('espnParseItems')(odd).per[k].lines.passing_yards)),'an item with no athlete, of a market the page does not read, or with no number, is read'); }

      /* M8c. DraftKings' game lines on the recorded scoreboard, by club */
      { const ev=SB0.events.find(e=>String(e.id)==='401872995'), g={a:'SEA',h:'DEN'}, got=F('espnOdds')(ev,g), want=ESPN.oddsOf(ev,g);
        chk(!!got&&!!want&&same(sortObj(got.lines),sortObj(want.lines))&&same(sortObj(got.ids),sortObj(want.ids))&&got.event===want.event&&want.event==='34118277'&&want.lines.sp===-2.5&&want.lines.mla===-142&&want.lines.tot===40.5,
          `the reader reads the recorded SEA at DEN game lines otherwise than the checks do: ${JSON.stringify(got)} against ${JSON.stringify(want)}`);
        const sw=clone(ev), c=sw.competitions[0], o=c.odds.find(x=>String(x.provider.id)==='100');
        for(const x of c.competitors) x.homeAway=x.homeAway==='home'?'away':'home';
        for(const k of ['moneyline','pointSpread']) [o[k].home,o[k].away]=[o[k].away,o[k].home];
        const gs=F('espnOdds')(sw,g);
        chk(!!gs&&same(sortObj(gs.lines),sortObj(got.lines))&&same(sortObj(gs.ids),sortObj(got.ids)),'with ESPN\'s home and away the other way round (a neutral site), the game lines are not read by club: '+JSON.stringify(gs&&gs.lines));
        chk(F('espnOdds')(ev,{a:'KC',h:'BUF'})===null,'a scoreboard event of other clubs gives a game its lines');
        const ny=SB0.events.find(e=>String(e.id)==='401873001'), gn={a:'NYJ',h:'NE'};
        chk(same(sortObj(F('espnOdds')(ny,gn).lines),sortObj(ESPN.oddsOf(ny,gn).lines)),'the recorded NYJ at NE game lines are not the checks\' reading'); }

      /* M8d. every page to its pageCount, and the answers that leave a game as it was */
      { const pad=[...IT0['401872995'],...Array.from({length:1100},()=>({type:{id:'98'},current:{target:{value:1.5}}}))];
        net.route=u=>{ const p=props(u); return p?page(p.eid==='401872995'?pad:(IT0[p.eid]||[]),p.q):{code:404,body:{}}; };
        net.log=[]; const r=await F('espnProps')('401872995'), us=net.log.map(x=>x.url);
        chk(r.st==='ok'&&r.items.length===pad.length&&us.length===2&&us.every((u,i)=>/[?&]limit=1000(&|$)/.test(u)&&new RegExp(`[?&]page=${i+1}(&|$)`).test(u)&&/[?&]_=\d+/.test(u)),
          `a read of two pages did not read both at limit 1000 with a cache-buster, or lost items: ${r.st} ${r.items&&r.items.length} of ${pad.length}; ${us.join(' ')}`);
        chk(net.log.every(x=>x.cache==='no-store'&&!x.headers&&x.method==='GET'),'a request to ESPN is not a plain no-store GET (a header of its own would ask for a preflight)');
        const cases=[['a 404 ("No propBets found")',{code:404,body:{error:{message:'No propBets found for eventId 1 and provider 100',code:404}}},'none'],
          ['a body that is not JSON',{code:200,junk:true},'failed'],['an answer with no items or pageCount',{code:200,body:{count:3,data:[]}},'failed'],
          ['pages of 25 (the limit ignored)',{code:200,body:{count:2000,pageIndex:1,pageSize:25,pageCount:80,items:pad.slice(0,25)}},'failed'],
          ['a 500',{code:500,body:{}},'failed'],['no answer at all',{reject:true},'failed']];
        for(const [what,ans,st] of cases){ net.route=()=>ans; const x=await F('espnProps')('1'); chk(x.st===st,`${what} reads as ${x.st}, not ${st}`); } }

      /* M8e. the athletes placed, and one game's read whole, on the recorded answers */
      { const ids={}; for(const r of ROS0) if(r.espn_id) ids[r.espn_id]=r.gsis_id;
        const stand=(id,n,team,grp)=>{ if(!S.players[id]){ S.players[id]={id,n,team,grp:grp||'WR',pos:grp||'WR',gp:0,base_gp:0,e5:{},e3:{},car:{},py:{}}; added.push(id); } };
        const mcc=Object.values(S.players).find(p=>p.n==='Malik McClain'&&(p.team==='NYJ'||p.team==='NE'));
        if(!mcc) stand('00-AUDIT-MCC','Malik McClain','NYJ');
        const mccId=mcc?mcc.id:'00-AUDIT-MCC';
        net.route=recorded; P().espn_ids=ids; reset();
        const ny=SB0.events.find(e=>String(e.id)==='401873001'), gn={id:'audit-nyj-ne',a:'NYJ',h:'NE',w:cw};
        const per=ESPN.parse(IT0['401873001']);
        net.log=[]; const pl=await F('espnPlace')(F('espnParseItems')(IT0['401873001']).per,gn,ny);
        chk(pl['3046439']==='00-0033090'&&pl['4569618']==='00-0037740'&&pl['4682509']===mccId&&Object.keys(pl).length===Object.keys(per).length
          &&net.log.length===1&&/\/athletes\/4682509\?/.test(net.log[0].url),
          `the NYJ at NE athletes are not placed by their ESPN ids and Malik McClain (no id) by his name within the game, on one look-up: ${JSON.stringify(pl)} ${net.log.map(x=>x.url).join(' ')}`);
        stand('00-AUDIT-DUP','Malik McClain','NE'); reset();
        const pl2=await F('espnPlace')(F('espnParseItems')(IT0['401873001']).per,gn,ny);
        chk(!('4682509' in pl2),'a name two players of the game share is placed on one of them');
        delete S.players['00-AUDIT-DUP']; added.splice(added.indexOf('00-AUDIT-DUP'),1);
        reset(); net.route=u=>/\/athletes\//.test(u)?{code:200,body:{id:'4682509',fullName:'Nobody Ofthisgame'}}:recorded(u);
        const pl3=await F('espnPlace')(F('espnParseItems')(IT0['401873001']).per,gn,ny);
        chk(!('4682509' in pl3)&&Object.keys(pl3).length===2,'an athlete whose name is no player of the game\'s is placed anyway');
        /* a name never lands on a player an ESPN id names, nor on one another athlete's name has taken:
           ARI's Mack Wilson Sr. (no id in the map, and a lower ESPN id) shares surname and initial with
           Michael Wilson, whose own id the map holds. Planted here as "Gary Wilson" (a lower id, on the
           touchdown list alone) beside the recorded Garrett Wilson (NYJ, 4569618): placed on no one, and
           Garrett Wilson's own lines and ladders kept whole, with the map and with no map at all */
        { const gw=ids['4569618'], fake='1000001', ath=id=>({$ref:`http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${SEASON}/athletes/${id}?lang=en&region=us`});
          if(!S.players[gw]) stand(gw,'Garrett Wilson','NYJ');
          const its=[...IT0['401873001'],{type:{id:'31'},athlete:ath(fake)}], per5=F('espnParseItems')(its).per, own=per5['4569618'];
          const named=u=>{ const m=/\/athletes\/(\d+)\?/.exec(u); if(m){ if(m[1]===fake) return {code:200,body:{id:fake,fullName:'Gary Wilson'}};
            const r=ROS0.find(x=>x.espn_id===m[1]); if(r) return {code:200,body:{id:m[1],fullName:r.full_name}}; } return recorded(u); };
          for(const [how,map] of [['with the map',ids],['with no ESPN ids',null]]){
            if(map) P().espn_ids=map; else delete P().espn_ids; reset(); net.route=named;
            const pl5=await F('espnPlace')(per5,gn,ny), b5=F('espnBlock')(per5,pl5,w.Date.now());
            chk(S.players[gw].team!=='NYJ'||(!(fake in pl5)&&pl5['4569618']===gw&&same(sortObj(b5.lines[gw]),sortObj(own.lines))&&same(b5.rungs[gw],own.rungs)),
              `${how}, an athlete of surname and initial alike ("Gary Wilson", ${fake}) is placed on Garrett Wilson, whom ${map?'the map names by his own id':'his own name places'}, or takes his lines: ${JSON.stringify({placed:pl5[fake]||null,lines:b5.lines[gw]||null})}`); }
          P().espn_ids=ids; }
        /* no ESPN ids at all (a payload baked before them): the clubs' rosters, two requests, and each
           athlete on the player of his name in the game */
        delete P().espn_ids; reset(); net.route=recorded; net.log=[];
        const both={...F('espnParseItems')(IT0['401872995']).per,...F('espnParseItems')(IT0['401873001']).per}, sd={a:'SEA',h:'DEN'}, ev=SB0.events.find(e=>String(e.id)==='401872995');
        const pl4=await F('espnPlace')(both,sd,ev), want={};
        for(const aid of Object.keys(both)){ const r=ROS0.find(x=>x.espn_id===aid); const p=r&&S.players[r.gsis_id]; if(p&&(p.team==='SEA'||p.team==='DEN')&&p.n===r.full_name) want[aid]=r.gsis_id; }
        chk(same(sortObj(pl4),sortObj(want))&&net.log.length===2&&net.log.every(x=>/\/teams\/(7|26|den|sea)\/roster$/.test(x.url)),
          `with no ESPN ids, ${Object.keys(both).length} athletes are not placed by name from the two clubs' rosters on two requests: ${JSON.stringify(pl4)} against ${JSON.stringify(want)}; ${net.log.map(x=>x.url).join(' ')}`);
        /* one game's read whole: the block the page keeps is the checks' own, dated by the answer's Date
           where the browser can read it, else by the clock; a kickoff before or during it drops it */
        P().espn_ids=ids; reset(); net.route=recorded;
        const ko=w.Date.now()+3*3600e3, gs={id:'audit-sea-den',a:'SEA',h:'DEN',w:cw}, T0=Math.floor((w.Date.now()-60e3)/1000)*1000;
        net.date=T0; const r1=await F('espnReadGame')({g:gs,ev,ko,eid:'401872995'}); net.date=null;
        const placed={}; for(const aid of Object.keys(ESPN.parse(IT0['401872995']))) if(ids[aid]) placed[aid]=ids[aid];
        chk(r1.st==='ok'&&same(normBlock(r1.block),normBlock(ESPN.block(ESPN.parse(IT0['401872995']),placed,ids)))&&r1.block.at===new Date(T0).toISOString(),
          `the recorded SEA at DEN read is not kept as the checks read it, dated by its answer: ${r1.st} ${JSON.stringify(normBlock(r1.block)).slice(0,200)} at ${r1.block&&r1.block.at}`);
        const t1=w.Date.now(), r2=await F('espnReadGame')({g:gs,ev,ko,eid:'401872995'});
        chk(r2.st==='ok'&&Date.parse(r2.block.at)>=t1-5&&Date.parse(r2.block.at)<=w.Date.now()+5,'a read with no Date the page can read is not dated by the browser\'s clock');
        chk((await F('espnReadGame')({g:gs,ev,ko:w.Date.now()-1,eid:'401872995'})).st==='kicked','a game whose kickoff has passed is read');
        net.route=u=>({...recorded(u),before:()=>setClock(ko+60e3)});
        const r3=await F('espnReadGame')({g:gs,ev,ko,eid:'401872995'}); setClock(clock0.call(w.Date)); w.Date.now=clock0;
        chk(r3.st==='kicked','a read its game\'s kickoff passed during is kept');
        net.route=()=>({code:404,body:{error:{code:404}}}); chk((await F('espnReadGame')({g:gs,ev,ko,eid:'401872995'})).st==='none','a 404 is not read as no lines posted');
        net.route=()=>({code:200,junk:true}); chk((await F('espnReadGame')({g:gs,ev,ko,eid:'401872995'})).st==='failed','a junk answer is not a failed read'); }

      /* M8f. a press on the payload's own games still to come, on a feed made here from the recorded shapes */
      const games=F('pbGames')();
      /* no game still to come (between the last final and the next week's schedule, the off-season): the
         press's checks on the week are skipped, as M7's are, and the reader's on the recorded answers above stand */
      if(!games.length) console.log('M8. no game still to come: the press checks on the week, and those on the read it keeps in this browser (props_press_v1), are skipped (the reader is held above on ESPN\'s recorded answers)');
      if(games.length){ const g0=games[0], gN=games[1], gF=games[2], gJ=games[3], gK=games[4], wk=String(g0.w);
        const keep={dk:clone(P().dk), mkt:clone(P().mkt[wk]), odds:clone(S.odds), parlay:clone(S.parlay), pb:clone(S.ui.pb)};
        const before={}; for(const g of games) before[g.id]=Object.fromEntries(F('ESPN_GL_KEYS').map(k=>[k,g[k]]));
        const trueG0=clone(before[g0.id]);
        const injPlant=[];
        try{
          const toE={WAS:'WSH',LA:'LAR'}, eab=t=>toE[t]||t, fA=v=>v>0?'+'+v:String(v), fL=v=>v>0?'+'+v:String(v);
          const evOf=(g,i)=>{ const dkev=String(70000+i), home=eab(g.h), away=eab(g.a), swap=i===1;
            const lk=oc=>({href:`https://sportsbook.draftkings.com/gateway?wpsrc=413&preurl=${encodeURIComponent(`https://sportsbook.draftkings.com/event/${dkev}?outcomes=0AU${i}${oc}`)}`});
            const mlA=-131-i, mlH=111+i, spA=-(1.5+(i%3)), tot=40.5+i;
            const cmp=swap?[{homeAway:'home',team:{abbreviation:away,id:'2'+i}},{homeAway:'away',team:{abbreviation:home,id:'1'+i}}]:[{homeAway:'home',team:{abbreviation:home,id:'1'+i}},{homeAway:'away',team:{abbreviation:away,id:'2'+i}}];
            const hs=swap?{ml:mlA,sp:spA}:{ml:mlH,sp:-spA}, as=swap?{ml:mlH,sp:-spA}:{ml:mlA,sp:spA};
            return {id:String(9100+i),date:(g===gK?new Date(w.Date.now()-60e3):F('kickoff')(g)).toISOString(),competitions:[{competitors:cmp,odds:[{provider:{id:'100',name:'DraftKings'},
              moneyline:{home:{close:{odds:fA(hs.ml),link:lk('MH')}},away:{close:{odds:fA(as.ml),link:lk('MA')}}},
              pointSpread:{home:{close:{line:fL(hs.sp),odds:'-103',link:lk('SH')}},away:{close:{line:fL(as.sp),odds:'-117',link:lk('SA')}}},
              total:{over:{close:{line:'o'+tot,odds:'-105',link:lk('TO')}},under:{close:{line:'u'+tot,odds:'-115',link:lk('TU')}}}}]}]}; };
          const evs=games.map(evOf), evOfG=g=>evs[games.indexOf(g)];
          /* g0's money lines, spread and total as the read will have them, so the read leaves them where
             they were and only the press itself can make its hands stale or fresh (gameSuggestSig reads them) */
          { const o0=ESPN.oddsOf(evs[0],g0).lines; for(const k of ['mla','mlh','sp','tot']){ g0[k]=o0[k]; before[g0.id][k]=o0[k]; } }
          /* the read of g0: every starter's lines at the floor of his projection and a half, every other
             rung, the touchdowns; one backup on the touchdown list alone; one player's ESPN id left out
             of PAY.espn_ids (placed by his name), one athlete no player of the game's */
          const R0=F('rosterFor')(g0,true), mainT=Object.fromEntries(Object.entries(ESPN.TYPES.main).map(([k,v])=>[v,k])), mileT=Object.fromEntries(Object.entries(ESPN.TYPES.mile).map(([k,v])=>[v,k]));
          const items=[], ids={}; let n=0, backup=null, byName=null;
          const ath=aid=>({$ref:`http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${SEASON}/athletes/${aid}?lang=en&region=us`});
          for(const tm in R0) for(const x of R0[tm].players){ const ls=F('statLines')(x); if(!ls.length) continue; const aid=String(5000000+(++n));
            const st=ls.find(l=>l.prob);
            if(!x.starter&&st&&!backup&&x.pl.grp!=='QB'){ backup=x; ids[aid]=x.pl.id; items.push({type:{id:'31'},athlete:ath(aid)}); continue; }
            if(!x.starter) continue;
            if(!byName&&x.pl.grp==='WR') byName={x,aid}; else ids[aid]=x.pl.id;
            for(const l of ls){ if(l.prob){ items.push({type:{id:'31'},athlete:ath(aid)}); continue; }
              const L=Math.max(0.5,Math.floor(l.mu)+0.5);
              if(mainT[l.stat]) for(let t=0;t<2;t++) items.push({type:{id:mainT[l.stat]},athlete:ath(aid),current:{target:{value:L}},lastUpdated:'2026-01-01T00:00Z'});
              if(mileT[l.stat]) l.rungs.filter((r,i)=>i%2===0).forEach(r=>items.push({type:{id:mileT[l.stat]},athlete:ath(aid),current:{target:{value:r.k}}})); } }
          items.push({type:{id:'13'},athlete:ath('5999999'),current:{target:{value:33.5}}});
          const per0=ESPN.parse(items), lineOf=(pid,st)=>{ const aid=Object.keys(ids).find(a=>ids[a]===pid)||(byName&&byName.x.pl.id===pid?byName.aid:null); return aid&&per0[aid]?per0[aid].lines[st]:null; };
          /* the precedence: one player's paid line at the read's number (stays real), another's at a
             number the read has moved (goes est.), a rung the pull priced (until app v127 kept real; since, no leg:
             the site offers no ladder bet), a paid id kept */
          const xs=[]; for(const tm in R0) for(const x of R0[tm].players) if(x.starter) xs.push(x);
          const yd=['passing_yards','rushing_yards','receiving_yards'];
          const pick=skip=>{ for(const x of xs){ if(skip.includes(x.pl.id)||x.gp<3||!F('suggestable')(x.pl.id)) continue; const l=F('statLines')(x).find(l=>!l.prob&&yd.includes(l.stat)&&lineOf(x.pl.id,l.stat)!=null); if(l) return {x,l}; } return null; };
          const A=pick([byName&&byName.x.pl.id]), B=A&&pick([A.x.pl.id,byName&&byName.x.pl.id]);
          const M=(P().mkt[wk]??={});
          if(A){ (M[A.x.pl.id]??={})[A.l.stat]={line:lineOf(A.x.pl.id,A.l.stat),over:-118,under:-104,n:A.x.pl.n,g:g0.id}; }
          if(B){ (M[B.x.pl.id]??={})[B.l.stat]={line:lineOf(B.x.pl.id,B.l.stat)+3,over:-110,under:-110,n:B.x.pl.n,g:g0.id}; }
          const C=xs.filter(x=>x.gp>=3&&F('suggestable')(x.pl.id)).map(x=>({x,l:F('statLines')(x).find(l=>!l.prob&&yd.includes(l.stat)&&l.rungs.length>2)})).find(o=>o.l&&(!A||o.x!==A.x)&&(!B||o.x!==B.x));
          const Ck=C&&C.l.rungs[2].k; if(C) ((((S.odds[g0.id]??={})[C.x.pl.id]??={})[C.l.stat]??={})[String(Ck)]=250);
          /* a count ladder anchored on DraftKings' own fair chance: a paid receptions line at the read's
             number, priced lopsided, so its ladder is set by that line's de-vig and never the formula's */
          const Dx=xs.map(x=>({x,l:F('statLines')(x).find(l=>!l.prob&&l.stat==='receptions'&&l.rungs.length>1)})).find(o=>o.l&&lineOf(o.x.pl.id,'receptions')!=null&&![A,B,C].some(z=>z&&z.x===o.x)&&(!byName||byName.x!==o.x));
          if(Dx) (M[Dx.x.pl.id]??={}).receptions={line:lineOf(Dx.x.pl.id,'receptions'),over:-140,under:115,n:Dx.x.pl.n,g:g0.id};
          const paidKey=`team:${g0.a}|ml`, D0=((P().dk??={})[wk]??={}); (D0[g0.id]??={})[paidKey]='PAIDID';
          /* planted as the paid pull's ids, so the payload carries ids from here, whatever it was baked with */
          AUD_DK.add(P().dk);
          /* and two more paid-pull shapes, whatever the week's pulls hold: one paid id the read finds as the
             pull had it (g0's home money line: kept, and dated by the read), and one game the read covers
             with no paid ids at all (its event and glat are the press's). Any game but g0 and the one
             kicked off will do; a week with one game left (a Monday) has none, and g0 itself is held to
             that shape after the press, below, on its own copy of the read */
          const homeKey=`team:${g0.h}|ml`, foundId=ESPN.oddsOf(evs[0],g0).ids[homeKey]; if(foundId) D0[g0.id][homeKey]=foundId;
          const gB=games.find(g=>g!==g0&&g!==gK)||null; if(gB) delete D0[gB.id];
          W.coverage(!!foundId,`the press's made-up read of ${g0.id} has no home money-line id, so a paid id the read finds as the pull had it went untested`);
          /* a starter the read prices, made Questionable here: no leg from the read may be built on him (V6) */
          const Q=xs.find(x=>x.gp>=3&&F('suggestable')(x.pl.id)&&![A,B,C].some(o=>o&&o.x===x)&&(!byName||byName.x!==x)&&lineOf(x.pl.id,(F('statLines')(x).find(l=>!l.prob&&ESPN.TESTED.main.includes(l.stat))||{}).stat)!=null);
          if(Q){ injPlant.push([Q.pl.id,F('INJ')[Q.pl.id]]); F('INJ')[Q.pl.id]={k:'q',t:'Q',title:'Questionable (made up by the audit)'}; }
          W.coverage(!!(A&&B&&C&&Dx&&backup&&byName&&Q),`the press's made-up read found no player for every case (paid line kept ${!!A}, moved ${!!B}, a rung the pull priced ${!!C}, a count ladder on a paid line ${!!Dx}, backup ${!!backup}, by name ${!!byName}, Questionable ${!!Q})`);
          /* the made-up read's own id table alone: the payload's real one (which the job bakes) already
             gives the by-name starter his real ESPN id, so merged in it would leave nobody to place by name
             and the check would turn on the week's data (it refused the props run of 15 October 2026) */
          P().espn_ids={...ids};
          net.route=u=>{ if(/\/scoreboard\?/.test(u)) return {code:200,body:{events:evs}};
            const p=props(u); if(p){ const g=games[evs.findIndex(e=>e.id===p.eid)];
              if(g===g0) return page(items,p.q); if(g===gN) return {code:404,body:{error:{message:'No propBets found',code:404}}};
              if(g===gF) return {reject:true}; if(g===gJ) return {code:200,junk:true};
              return {code:404,body:{error:{message:'No propBets found',code:404}}}; }
            const m=/\/athletes\/(\d+)\?/.exec(u); if(m) return byName&&m[1]===byName.aid?{code:200,body:{id:m[1],fullName:byName.x.pl.n}}:{code:200,body:{id:m[1],fullName:'Nobody Ofthisgame'}};
            return {code:404,body:{}}; };
          reset(); F('renderPb')();
          /* g0's page drawn before the press, so its hands stand cached on the published prices */
          const lvSig=r=>JSON.stringify(r.tiers.map(t=>t.why||t.legs.map(l=>[l.key,l.side,l.k,l.price,l.src]))), hdSig=t=>JSON.stringify(['high','med','low'].map(id=>t[id]?t[id].legs.map(l=>[l.key,l.side,l.k,l.price,l.src]):null));
          /* (app v111) the Top 50 lines and each prime-time game's set, built before the press too, so their caches stand on the published prices */
          const topSig=r=>JSON.stringify(r.rows.map(l=>[l.key,l.side,l.k,l.price,l.src])), setSig=()=>JSON.stringify([...F('spGames')().map(g=>g.id),...(slotNowAud()?[slotNowAud().id]:[])].map(id=>{ const x=F('spSet')(id); return [id,x?x.tiers.map(t=>t.why||t.legs.map(l=>[l.key,l.side,l.k,l.price,l.src])):null]; }));
          S.ui.game=g0.id; F('renderGame')(); const hands0=hdSig(F('gameTiers')(g0)), levels0=lvSig(F('getPbTiers')()), top0=topSig(F('getPbTop')()), sets0=setSig(); S.ui.game=null; F('closeGameModal')();
          /* the press: the Parlay Builder's button, a second press while it runs, then the read */
          const dkPre=clone(P().dk);   /* the paid pull's ids as the press finds them (a reload's, below) */
          let release; net.gate=new Promise(r=>release=r); net.log=[];
          const btn=d.querySelector('#pbPanel [data-espn-refresh="week"]'); btn.focus(); btn.click(); await sleep(10);
          const busyTxt=txt(d.querySelector('#pbPanel [data-espn-status="week"]'));
          W.wording(/^Reading DraftKings’ lines from ESPN… \d+ of \d+ games?$/.test(busyTxt),'the status line does not say a read is under way: '+busyTxt);
          d.querySelector('#pbPanel [data-espn-refresh="week"]').click(); await sleep(10);
          const t0=w.Date.now(); net.gate=null; release();
          for(let i=0;i<200&&w.eval('ESPN_RUN.busy');i++) await sleep(25);
          const urls=net.log.map(x=>x.url), sbN=urls.filter(u=>/\/scoreboard\?/.test(u)).length, OUT=F('ESPN_OUT'), LV=F('ESPN_LIVE');
          nReq=urls.length;
          /* (app v108) what the press kept in this browser, and the published lines it was read over, as it left them */
          const kept1=lsGet(), sig1=Object.fromEntries(games.map(g=>[g.id,{gl:F('espnGlSig')(g),pl:F('espnPlSig')(g)}]));
          /* the levels and hands the page has right after the press, before any cache of the checks' own is
             dropped: what a build from nothing gives on the read, never what stood before it (the press
             drops PB_CACHE and GAME_TIER_CACHE, and ESPN_SEQ is in pbDataSig and gameSuggestSig) */
          /* the est. marks drawn: the Top 50 lines' (each a leg priced from DraftKings' line read by the press),
             and the sets' on Suggested Parlays, where (app v118) each unit's Elo picks (.pb-tiers[data-sp-kind="elo"],
             drawn on the hub by its ELO tab with the same cards) may take a leg priced from the read, and theirs are
             never a set's model parlays */
          const estTop=()=>d.querySelectorAll('#pbPanel ol.pb-top i.est').length;
          const estAll=()=>[...d.querySelectorAll('#spPanel .pb-tier .pb-legs li .pr i.est')], estLv=()=>estAll().filter(e=>!e.closest('[data-sp-kind="elo"]')).length;
          /* planted before the count and kept through the main check, so the count is held whatever the
             week's Elo picks take: a unit of the audit's own at the foot of the sets (taken out after, on every path)
             holding an Elo pick of the page's own card, as the hub draws a unit's, with a leg priced from the read;
             its est. mark is drawn and the levels' count does not take it in (this page, with no ELO tab, draws no
             Elo picks of its own, so a count that took them in would pass) */
          { const host=d.getElementById('spSets'), el=host?d.createElement('div'):null, nAll0=estAll().length, nLv0=estLv();
            let rNow, drawn, hNow, rNew, hNew, topNow, topNew, setsNow, setsNew;
            if(!el) W.coverage(false,'Suggested Parlays has no sets to plant a unit\'s Elo pick in');
            try{
              if(el){ const leg={key:g0.id+'|00-AUDIT-ELO|receptions',gid:g0.id,week:+wk,pid:'00-AUDIT-ELO',name:'Planted Elopick',label:'Over 3.5 receptions',stat:'receptions',k:3.5,side:'over',main:true,
                    p:0.5,price:120,src:'dkline',grp:'WR',pos:'WR',team:g0.h,opp:g0.a,espn:{at:new w.Date(w.Date.now()).toISOString(),fair:0.45,tested:true,listed:true}};
                el.className='sp-game'; el.dataset.spGame='aud-elo-plant'; host.appendChild(el);
                el.innerHTML=`<h5 class="sp-sub" data-sp-kind="elo">Elo picks</h5><div class="pb-tiers" data-sp-kind="elo">${F('pbTierCard')({id:'elo-safe',label:'Safe',n:1,legs:[leg],p:0.5,dec:2.2,fair:null},{chance:0.5,chanceBy:'Elo chance',by:'Elo',kind:'sp',add:'data-sp-add="aud-elo-plant:elo-safe"',legP:l=>l.p,quiet:true})}</div>`;
                chk(estAll().length===nAll0+1&&estLv()===nLv0,`an Elo pick's leg priced from the read is counted with the sets' est. marks, or not drawn est.: ${estLv()} of ${estAll().length} against the sets' ${nLv0}`); }
              rNow=F('getPbTiers')(); topNow=F('getPbTop')(); drawn=estTop(); setsNow=setSig(); hNow=F('gameTiers')(g0);
              w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}');
              rNew=F('getPbTiers')(); topNew=F('getPbTop')(); setsNew=setSig(); hNew=F('gameTiers')(g0);
              const nDk=topNew.rows.filter(l=>l.src==='dkline').length;
              chk(lvSig(rNow)===lvSig(rNew)&&topSig(topNow)===topSig(topNew)&&setsNow===setsNew&&drawn===nDk,`right after the press, the levels, the Top 30 lines or a set are not what a build on the read gives (stale from before it), or the list drawn shows ${drawn} lines marked est. where the read gives ${nDk}: ${topSig(topNow).slice(0,160)} against ${topSig(topNew).slice(0,160)}`); }
            finally{ if(el) el.remove(); }
            chk(hdSig(hNow)===hdSig(hNew),`right after the press, ${g0.id}'s hands (its lines unmoved by the read) are not what a build on the read gives, but the published ones: ${hdSig(hNow).slice(0,160)} against ${hdSig(hNew).slice(0,160)}`);
            /* (app v109) where the payload carries DraftKings' ids, a leg priced from the read has none (ESPN
               gives none for a player's line) and suggests nowhere, and g0's own lines are held where the read
               has them: its hands cannot move on the read, so only the levels' staleness is looked for (the
               hands' is held, blocking, above all the same, and looked for on a payload baked before ids) */
            const dkNow=dkCarried();
            W.coverage((lvSig(rNew)!==levels0||topSig(topNew)!==top0||setsNew!==sets0)&&(dkNow||(hdSig(hNew)!==hands0&&['high','med','low'].some(id=>hNew[id]&&hNew[id].legs.some(l=>l.src==='dkline')))),`the press left the levels${dkNow?'':` or ${g0.id}'s hands`} as they were before it${dkNow?'':', or no hand took a leg from the read'}: whether ${dkNow?'they go':'either goes'} stale went untested`); }
          chk(sbN===1&&urls.some(u=>/\/scoreboard\?dates=\d{4}&seasontype=[23]&week=\d+&_=\d+$/.test(u)),`a press asked for the scoreboard ${sbN} times (a second press while one runs must do nothing), or not in ESPN's numbering of the week: ${urls.filter(u=>/scoreboard/.test(u)).join(' ')}`);
          chk(net.log.every(x=>x.cache==='no-store'&&!x.headers),'a press made a request that is not a plain no-store GET');
          const want={[g0.id]:'ok'}; if(gN) want[gN.id]='none'; if(gF) want[gF.id]='failed'; if(gJ) want[gJ.id]='failed'; if(gK) want[gK.id]='kicked';
          chk(Object.entries(want).every(([id,st])=>OUT[id]&&OUT[id].st===st),`the press's games did not end as read, no lines posted, not reached, a junk answer and kicked off: ${JSON.stringify(Object.fromEntries(Object.keys(want).map(id=>[id,OUT[id]&&OUT[id].st])))}`);
          chk(!gK||!urls.some(u=>{ const p=props(u); return p&&p.eid===evOfG(gK).id; }),'a game whose kickoff had passed by ESPN\'s scoreboard was read');
          const placed0={...Object.fromEntries(Object.entries(ids))}; if(byName) placed0[byName.aid]=byName.x.pl.id;
          const blk=LV[wk]&&LV[wk][g0.id];
          chk(!!blk&&same(normBlock(blk),normBlock(ESPN.block(per0,placed0,P().espn_ids)))&&Date.parse(blk.at)>=t0-5&&Date.parse(blk.at)<F('kickoff')(g0).getTime(),
            `the press did not keep ${g0.id}'s read as the checks read it (placed by id, one by name, one left out), dated before kickoff: ${JSON.stringify(normBlock(blk)).slice(0,240)}`);
          chk(Object.keys(LV[wk]||{}).every(id=>id===g0.id||(OUT[id]&&OUT[id].st==='ok')),'a game no lines were read for has a read kept');
          /* the game lines and DraftKings' ids: the read's where newer, by club, real; a kicked-off game's left alone */
          for(const g of games){ const o=ESPN.oddsOf(evOfG(g),g), pre=before[g.id];
            if(g===gK){ chk(F('ESPN_GL_KEYS').every(k=>same(g[k],pre[k])),`${g.id}, kicked off before it was read, had its game lines changed`); continue; }
            chk(!!o&&Object.entries(o.lines).every(([k,v])=>g[k]===v)&&g.ls==='dk'&&Math.abs(Date.parse(g.lat)-t0)<60e3,`${g.id}'s game lines are not DraftKings' as the press read them: ${JSON.stringify(F('ESPN_GL_KEYS').map(k=>g[k]))} against ${JSON.stringify(o&&o.lines)}`);
            const D=((P().dk||{})[wk]||{})[g.id]||{};
            /* what the paid pull had before the press (the week's real ids, which the job bakes, and the one
               the checks plant): a press never replaces one, so each key keeps it and takes the read's only
               where the pull had none. Until 15 October 2026 this held only the planted id, and the first
               real ids the job baked for a game to come (SEA at DEN's) refused two props runs */
            const kd0=(((keep.dk||{})[wk]||{})[g.id]||{}), kd=g===gB?{}:g===g0?{...kd0,[paidKey]:'PAIDID',...(foundId?{[homeKey]:foundId}:{})}:kd0, paidAt=k=>kd[k];
            chk(!!o&&D.event===(kd.event||o.event)&&Object.entries(o.ids).every(([k,v])=>D[k]===(paidAt(k)!=null?paidAt(k):v))&&Object.entries(kd).every(([k,v])=>k==='glat'||same(D[k],v))&&!!D.glat,
              `${g.id}'s DraftKings ids from the press are not beside the paid pull's (every one kept as it was, none replaced): ${JSON.stringify(D)}`);
            /* each id the read gave is dated by the read (espnIdAt, which the parlay card reads), the paid
               pull's glat left as it was (it dates the ids the read did not see), and a paid id at a key the
               read gave another id is the pull's, undated by the read (one the read found as it was is dated) */
            { const at=k=>F('espnIdAt')(g.id,k);
              chk((kd.glat?D.glat===kd.glat:!!D.glat)&&Object.keys(o.ids).every(k=>paidAt(k)!=null&&paidAt(k)!==o.ids[k]?at(k)==null:Math.abs(at(k)-t0)<60e3),
                `${g.id}'s DraftKings ids are not each dated by the read that saw them (the pull's glat ${kd.glat||'none'} now ${D.glat}; ${Object.keys(o.ids).map(k=>k+' '+at(k)).join(', ')})`); } }
          /* one game to come: the no-paid-ids shape on g0 itself, its paid entry taken out and the press's own
             espnApplyGame run on its read a second later; everything it touches is put back */
          if(!gB){ const D1=P().dk[wk], IA=F('ESPN_IDAT'), GL=F('ESPN_GL'), keepE=D1[g0.id], keepIA=clone(IA[g0.id]), keepGL=clone(GL[g0.id]), keepL={lat:g0.lat,ls:g0.ls};
            try{ delete D1[g0.id]; delete IA[g0.id]; const T=w.Date.now()+1000, o=ESPN.oddsOf(evOfG(g0),g0);
              F('espnApplyGame')(g0,F('espnOdds')(evOfG(g0),g0),T); const E=D1[g0.id]||{};
              chk(!!o&&E.event===o.event&&Object.entries(o.ids).every(([k,v])=>E[k]===v&&F('espnIdAt')(g0.id,k)===T)&&Date.parse(E.glat)===T,
                `${g0.id} with no paid DraftKings ids: the press did not give it the read's event, ids and glat, each dated by the read: ${JSON.stringify(E)}`); }
            finally{ D1[g0.id]=keepE; if(keepIA===undefined) delete IA[g0.id]; else IA[g0.id]=keepIA; if(keepGL===undefined) delete GL[g0.id]; else GL[g0.id]=keepGL; Object.assign(g0,keepL); } }
          { const tl=F('pricedLegs')(games).filter(l=>l.grp==='TEAM'&&l.gid===g0.id), o=ESPN.oddsOf(evOfG(g0),g0).lines;
            chk(tl.length>0&&tl.every(l=>l.src==='real'&&l.price===(l.stat==='ml'?(l.team===g0.h?o.mlh:o.mla):(l.team===g0.h?o.sph:o.spa))),`${g0.id}'s team bets are not at the press's DraftKings prices: ${tl.map(l=>l.label+' '+l.price+' '+l.src).join(', ')}`); }
          /* never saved: what save() writes is the published game lines and no read */
          F('save')(); await sleep(400);
          { const sv=JSON.parse(mem||'{}'), s0=(sv.sched||[]).find(x=>x.id===g0.id)||{};
            chk(F('ESPN_GL_KEYS').every(k=>same(s0[k],before[g0.id][k]))&&!/0AU0|5000001|ESPN_LIVE/.test(mem||''),`what the page saves carries the press's game lines or read: ${JSON.stringify(F('ESPN_GL_KEYS').map(k=>s0[k]))}`);
            /* (app v108) nor anything the press kept under its own key: every game's published lines in S, none
               of the key's DraftKings ids or player lines, and no trace of the key itself */
            let kvS=null; try{ kvS=JSON.parse(kept1); }catch(e){}
            const leak=[], ms=mem||'', has=x=>ms.includes(x)||ms.includes(JSON.stringify(x).slice(1,-1)); if(/props_press_v1|ESPN_KEPT|plsig/.test(ms)) leak.push('the key itself');
            for(const [gid,e] of Object.entries((kvS&&kvS.games)||{})){ const sg=(sv.sched||[]).find(x=>x.id===gid)||{};
              if(before[gid]&&!F('ESPN_GL_KEYS').every(k=>same(sg[k],before[gid][k]))) leak.push(gid+'\'s game lines');
              for(const v of Object.values((e&&e.gl&&e.gl.ids)||{})) if(typeof v==='string'&&v.length>3&&ms.includes(v)) leak.push(gid+'\'s id '+v);
              if(e&&e.pl&&Object.keys(e.pl.lines||{}).length&&has(JSON.stringify(e.pl.lines))) leak.push(gid+'\'s player lines'); }
            chk(!!kvS&&!leak.length,`what the page saves with the visitor's state carries what the press kept under ${KK}: ${kvS?leak.join(', '):'(no key written)'}`); }
          chk(F('pbDataSig')().endsWith('|e'+w.eval('ESPN_SEQ')),'the suggestions do not stand on the press (ESPN_SEQ in pbDataSig)');
          W.wording(d.activeElement&&d.activeElement.dataset&&d.activeElement.dataset.espnRefresh==='week'&&!!d.activeElement.closest('#pbPanel'),'the focus did not stay on the Parlay Builder\'s Refresh odds button through the redraw');
          { const st=txt(d.querySelector('#pbPanel [data-espn-status="week"]')), nN=Object.values(want).filter(s=>s==='none').length+games.filter(g=>!want[g.id]).length, nF=[gF,gJ].filter(Boolean).length;
            const exp0=`DraftKings via ESPN, read ${F('espnClock')(Date.parse(blk&&blk.at))} · player prices est.`+(nN?` · ${nN} game${nN===1?'':'s'} with no player lines yet`:'')+(nF?` · couldn’t read player lines for ${nF} game${nF===1?'':'s'}`:''), exp=/\.$/.test(exp0)?exp0:exp0+'.';
            W.wording(st===exp,`the status line after the press reads "${st}", not "${exp}"`); }
          /* M8g. (app v108) the read kept in this browser (part3.js espnKeepPut, espnKeepWrite, espnRestore;
             ESPN_KEEP_KEY 'props_press_v1'), on the press's own made-up read above and on values made here
             from it: what the press wrote; a reload on the same window putting back exactly what the press
             had, with no request; each rule that sets a kept read aside, and (round 4) the time rule that lets
             one stand over a newer publish, with what the reads did replayed on its lines; the merge of two
             tabs' writes; and a save of the visitor's state with no room. Each reload starts from the page as a load finds it (the
             published game lines, the paid pull's ids as the press found them, nothing read, no cache) and the
             page is put back after to the press's own state, the key too (rule (c)). Blocking: what is kept,
             put back, set aside or written; W.wording: the status line's words */
          { const c0=checks, KEYS=F('ESPN_GL_KEYS'), linesOf=g=>Object.fromEntries(KEYS.map(k=>[k,g[k]])), sched0=S.sched;
            const deep=v=>Array.isArray(v)?v.map(deep):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,deep(v[k])])):v), canon=v=>JSON.stringify(deep(v)===undefined?null:deep(v));
            const parse=s=>{ try{ return JSON.parse(s); }catch(e){ return null; } }, kv=parse(kept1), read=games.filter(g=>g!==gK);
            const inLive=(L,gid)=>Object.values(L||{}).some(W=>W&&typeof W==='object'&&Object.prototype.hasOwnProperty.call(W,gid));
            const dkOf=(D,gid)=>canon(((D||{})[wk]||{})[gid]||null);
            const iso=t=>new Date(t).toISOString(), NUM8=['mla','mlh','sp','spa','sph','tot','tov','tou'];
            const glValid=t=>t!=null&&isFinite(Date.parse(t));
            /* the event a reload must put back: PAY.dk's as the page holds it after its reads, the paid pull's where it had
               one, else the first read's (espnApplyGame sets it only where the game has none), a string or null */
            const evKept=(...evs)=>{ const v=evs.find(x=>x); return typeof v==='string'?v:null; };
            /* what one read of g's scoreboard (o, the checks' own reading, at its time) leaves to keep: the game's
               lines as the page shows them where the read's stand (ESPN_GL has the game: the made-up read gives all
               eight, so they are its scoreboard's), else none; each id it gave where the paid pull had none or
               found as the pull had it, at the read's time (a paid id at a key the read gave another is the pull's
               and stays undated); glat the pull's, else the read's where it dated an id; the event as PAY.dk holds it
               after the read (the paid pull's, else the read's: a read sets it only where the game has none). Worked
               out from the paid pull as the press found it (dkPre) and never from espnKeepPut */
            const keptGl=(g,o,at)=>{ const paid=(((dkPre||{})[wk]||{})[g.id])||{}, ids={}, idat={};
              for(const [k,v] of Object.entries(o.ids)) if(paid[k]==null||paid[k]===v){ ids[k]=v; idat[k]=at; }
              /* the lines what the read did to them (round 4: d, each field it set), on the lines published at the press */
              const pub=before[g.id]||linesOf(g), pubAt=Date.parse(pub.lat||'')||Date.parse(P().baked_at||'')||0;
              return {lines:simReads(pub,[{lines:o.lines,at}],pubAt).d,ids,idat,glat:glValid(paid.glat)?(typeof paid.glat==='string'?paid.glat:null):(Object.keys(ids).length?iso(at):null),event:evKept(paid.event,o.event)}; };
            const glAt0=kv&&kv.games&&read[0]&&kv.games[read[0].id]&&kv.games[read[0].id].gl?kv.games[read[0].id].gl.at:null;
            /* (round 4 of 16 October 2026) the rules the checks hold the kept read to, each written here from what the
               page says it does and never by calling its keep functions back:
               - the published lines a half was read over: a hash of the ten game-line fields the page publishes
                 (glSigOf), and of the paid pull's time for the game with every main line the payload carries for it
                 (plSigOf), FNV-1a as the page hashes;
               - what a run of reads does to a game's lines (simReads): a read newer than the lines on the page sets
                 each field it has (a money line, a number with both its prices) and drops the two prices of a number
                 it read without them where that number moved; ls 'dk' and lat its time. d records each field a read
                 set as [its value, that read's time] (round 5: each field by its own read's time), the value null
                 where one dropped it;
               - a kept d put back over a publish (replay, round 5): over the publish it was read over, literally (each
                 pair's value set, a null one gone: exactly the page after the reads); over a newer one, only the
                 fields whose own read is later than that publish's time, as a read would put them (a money line set; a
                 number with both its prices set with them, or without them dropping the publish's two only where the
                 publish has another number, so a kept null price never takes the publish's real prices off its own
                 number); ls 'dk' and lat the latest field put, and what ESPN_GL's d then holds (D);
               - what a reload writes back for an entry that stands whole over the same publish (keptBack): the entry
                 as the page writes it, plsig only beside a player half (it describes that half alone) */
            const fnv=s=>{ let h=0x811c9dc5; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; } return h.toString(16); };
            const glSigOf=L=>fnv(KEYS.map(k=>L[k]==null?'':String(L[k])).join('|'));
            const plSigOf=gid=>{ const E=((P().dk||{})[wk]||{})[gid], M=(P().mkt||{})[wk], rows=[];
              if(M&&typeof M==='object') for(const pid of Object.keys(M).sort()){ const r=M[pid]; if(r&&typeof r==='object') for(const st of Object.keys(r).sort()){ const L=r[st]; if(L&&L.g===gid) rows.push([pid,st,L.line,L.over,L.under].join(',')); } }
              /* (app v125) and the published read of the game's player lines, where the payload carries one for it in its
                 week: its pl.at, out.st and out.at (PAY.espn, as the audit reads it; none, the string as before) */
              const PE=P().espn, PG=PE&&typeof PE==='object'&&PE.v===1&&PE.games&&typeof PE.games==='object'&&Object.prototype.hasOwnProperty.call(PE.games,gid)?PE.games[gid]:null;
              const pub=PG&&typeof PG==='object'&&String(PG.w)===String(wk)?'|espn:'+String(PG.pl&&PG.pl.at||'')+':'+String(PG.out&&PG.out.st||'')+':'+String(PG.out&&PG.out.at||''):'';
              return fnv(String(E&&E.at||'')+'|'+rows.join(';')+pub); };
            const simReads=(pub,reads,prev0)=>{ const g={...pub}, d={}; let prev=prev0, at=null;
              for(const r of reads){ const L=r.lines||{}; if(!Object.keys(L).length||!(r.at>prev)) continue;
                const set=(k,v)=>{ d[k]=[v,r.at]; g[k]=v; }, dropK=k=>{ d[k]=[null,r.at]; delete g[k]; };
                if(L.mla!=null) set('mla',L.mla); if(L.mlh!=null) set('mlh',L.mlh);
                for(const [n,a,b] of [['sp','spa','sph'],['tot','tov','tou']]) if(L[n]!=null){ const same0=g[n]===L[n]; set(n,L[n]);
                  if(L[a]!=null&&L[b]!=null){ set(a,L[a]); set(b,L[b]); } else if(!same0){ dropK(a); dropK(b); } }
                g.ls='dk'; g.lat=iso(r.at); prev=r.at; at=r.at; }
              return {lines:g,d,at}; };
            const replayD=(pub,d,since,same)=>{ const g={...pub}, D={}, on=NUM8.filter(k=>Object.prototype.hasOwnProperty.call(d,k)&&(same||d[k][1]>since)), has=k=>on.includes(k);
              if(!on.length) return {lines:g,D,at:null};
              const put=(k,x)=>{ D[k]=x; if(x[0]===null) delete g[k]; else g[k]=x[0]; };
              if(same) for(const k of on) put(k,d[k]);
              else { for(const k of ['mla','mlh']) if(has(k)&&d[k][0]!==null) put(k,d[k]);
                for(const [n,a,b] of [['sp','spa','sph'],['tot','tov','tou']]){ if(!has(n)||d[n][0]===null) continue;
                  if(has(a)&&has(b)&&d[a][0]!==null&&d[b][0]!==null){ put(a,d[a]); put(b,d[b]); }
                  else if(pub[n]!==d[n][0]){ put(a,[null,d[n][1]]); put(b,[null,d[n][1]]); }
                  put(n,d[n]); } }
              const ts=Object.values(D).map(x=>x[1]); if(!ts.length) return {lines:{...pub},D,at:null};
              const at=Math.max(...ts); g.ls='dk'; g.lat=iso(at); return {lines:g,D,at}; };
            const replay=(pub,d,since,same)=>replayD(pub,d,since,same).lines;
            /* the time a publish's game lines are judged by (round 4): the DraftKings pull's (lat, where its lines are
               DraftKings'), else the bake, which over the lines a read was read over is no time at all (0) */
            const sinceOf=(pub,bk,same)=>{ const lat=pub&&pub.ls==='dk'?Date.parse(pub.lat||''):NaN; return isFinite(lat)?lat:(same?0:(Date.parse(bk||'')||0)); };
            const vals=d=>Object.fromEntries(Object.entries(d||{}).map(([k,x])=>[k,Array.isArray(x)?x[0]:x]));
            const keptBack=e=>{ if(!e) return e; const o={w:e.w}; if(e.gl) o.gl=e.gl; if(e.pl) o.pl=e.pl; if(e.out) o.out=e.out; if((e.pl||e.out)&&typeof e.plsig==='string') o.plsig=e.plsig; return o; };
            const keptBackAll=G=>Object.fromEntries(Object.entries(G||{}).map(([k,e])=>[k,keptBack(e)]));

            /* a reload on this window: the page as a load finds it, the key as raw, a tweak (returning its
               undo), espnRestore, and look() on the page as the restore left it; then the press's state again */
            const bk0g=P().baked_at;
            const post={lines:Object.fromEntries(S.sched.map(g=>[g.id,linesOf(g)])),dk:P().dk,ESPN_LIVE:F('ESPN_LIVE'),ESPN_GL:F('ESPN_GL'),ESPN_OUT:F('ESPN_OUT'),ESPN_IDAT:F('ESPN_IDAT'),
              ESPN_KEPT:F('ESPN_KEPT'),ESPN_ASIDE:F('ESPN_ASIDE'),ESPN_KEEP_GONE:F('ESPN_KEEP_GONE'),ESPN_KEEP_OFF:F('ESPN_KEEP_OFF')};
            const drop=()=>w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}');
            const toLoad=()=>{ for(const g of S.sched){ const o=post.ESPN_GL[g.id]; if(o) for(const k of KEYS){ if(o.orig[k]===undefined) delete g[k]; else g[k]=o.orig[k]; } }
              P().dk=clone(dkPre); w.eval('ESPN_LIVE={}; ESPN_GL={}; ESPN_OUT={}; ESPN_IDAT={}; ESPN_ASIDE={}; ESPN_KEPT={}; ESPN_KEEP_GONE={}; ESPN_KEEP_OFF=false'); drop(); };
            const backToPost=()=>{ if(S.sched!==sched0) S.sched=sched0; for(const g of S.sched){ const L=post.lines[g.id]; if(L) for(const k of KEYS){ if(L[k]===undefined) delete g[k]; else g[k]=L[k]; } }
              P().dk=post.dk; for(const n of ['ESPN_LIVE','ESPN_GL','ESPN_OUT','ESPN_IDAT','ESPN_KEPT','ESPN_ASIDE','ESPN_KEEP_GONE','ESPN_KEEP_OFF']) setVar(n,post[n]);
              try{ if(kept1==null) LS.removeItem(KK); else LS.setItem(KK,kept1); }catch(e){} w.Date.now=clock0;
              /* the bake's time as the press found it: a newer publish a case made (round 4) never outlives its reload */
              if(bk0g===undefined) delete P().baked_at; else P().baked_at=bk0g; drop(); };
            const reload=(raw,tweak,look,lab)=>{ let undo=null; const o={pub:{},lines:{},dk:{},dk0:null,ESPN_LIVE:{},ESPN_GL:{},ESPN_OUT:{},ESPN_IDAT:{},ESPN_ASIDE:{},ESPN_KEPT:{},GONE:{},kg:{},n:0,req:0,proto:[]};
              try{ toLoad(); if(raw==null) LS.removeItem(KK); else LS.setItem(KK,raw);
                undo=tweak?tweak():null;
                o.pub=Object.fromEntries(games.map(g=>[g.id,linesOf(g)])); o.dk0=canon(P().dk); o.bk=P().baked_at;
                net.log=[]; const nc=calls.length;
                try{ o.n=F('espnRestore')(); }catch(e){ o.err=String(e&&e.stack||e); }
                o.req=net.log.length+(calls.length-nc);
                o.lines=Object.fromEntries(games.map(g=>[g.id,linesOf(g)])); o.dk=P().dk;
                for(const n of ['ESPN_LIVE','ESPN_GL','ESPN_OUT','ESPN_IDAT','ESPN_ASIDE','ESPN_KEPT']) o[n]=F(n); o.GONE=clone(F('ESPN_KEEP_GONE'))||{};
                o.key=lsGet(); o.kv=parse(o.key); o.kg=(o.kv&&o.kv.games)||{};
                if(look) look(o);
              } catch(e){ o.err=String(e&&e.stack||e); }
              finally{ if(undo) try{ undo(); }catch(e){}
                try{ backToPost(); }catch(e){ o.err=(o.err?o.err+'; ':'')+'the page not put back: '+e; }
                o.proto=protoClean();
                chk(!o.proto.length,`${lab||'a reload'} set ${o.proto.join(', ')} on the page's built-in prototypes (every for-in on the page then reads them): a kept value reached a prototype`); }
              return o; };
            const nothing=(r,gid)=>!inLive(r.ESPN_LIVE,gid)&&!r.ESPN_GL[gid]&&!r.ESPN_IDAT[gid]&&!r.ESPN_OUT[gid]&&same(r.lines[gid],r.pub[gid])&&dkOf(r.dk,gid)===dkOf(dkPre,gid);
            const why=r=>`${r.err?'threw '+r.err.split('\n')[0]+'; ':''}${r.proto&&r.proto.length?'set '+r.proto.join(', ')+' on the built-ins; ':''}${r.req} request(s); put back ${r.n} game(s); ESPN_ASIDE ${JSON.stringify(r.ESPN_ASIDE)}; ESPN_KEEP_GONE ${JSON.stringify(r.GONE)}; key ${String(r.key).slice(0,120)}`;
            /* each case below in a guard of its own: a throw is a failed check with its message, never the audit's
               end, and whatever the case changed is put back after it (the schedule, every game's lines, PAY.dk and
               the week's main lines, the page's clock, the key, the ESPN_* state, the network stub, ESPN_RUN) with
               the page's built-ins: a case that breaks the page can fail only its own checks */
            const names0=clone(F('ESPN_NAMES')), run0g=clone(F('ESPN_RUN')), route0g=net.route, mkt0g=JSON.stringify((P().mkt||{})[wk]||null);
            const putMkt=()=>{ const want=JSON.parse(mkt0g), M0=(P().mkt||{})[wk]; if(JSON.stringify(M0||null)===mkt0g) return;
              if(!want){ delete P().mkt[wk]; return; } if(!M0){ P().mkt[wk]=want; return; }
              for(const k of Object.keys(M0)) if(!(k in want)) delete M0[k]; for(const [k,v] of Object.entries(want)) if(JSON.stringify(M0[k])!==JSON.stringify(v)) M0[k]=v; };
            const kcase=async(lab,fn)=>{
              try{ await fn(); }
              catch(e){ chk(false,`${lab}: the check threw ${String(e&&e.stack||e).split('\n').slice(0,2).join(' ')}`); }
              finally{ try{ net.route=route0g; net.gate=null; setVar('ESPN_RUN',clone(run0g)); setVar('ESPN_NAMES',clone(names0)||{}); putMkt(); if(bk0g===undefined) delete P().baked_at; else P().baked_at=bk0g; backToPost(); }
                catch(e){ chk(false,`${lab}: the page could not be put back to the press's state after it: ${e}`); }
                const pz=protoClean(); chk(!pz.length,`${lab}: left ${pz.join(', ')} set on the page's built-in prototypes, which every for-in on the page then reads`); } };

            /* 1. what the press wrote: v 1 and the page's season, an entry for every game the press read
               (each but the one kicked off), each with what a reload must put back (the game lines as the page
               shows them, the ids the read gave or found with its time, glat and the event: keptGl, worked out
               here), the published lines it was read over (espnGlSig, espnPlSig as the press left them), the
               player lines ESPN_LIVE holds for it and what the read found */
            await kcase('what the press kept',async()=>{
            chk(!!kv&&kv.v===1&&kv.season===SEASON&&!!kv.games&&typeof kv.games==='object'&&!Array.isArray(kv.games)&&same(Object.keys(kv.games).sort(),read.map(g=>g.id).sort()),
              `after the press, ${KK} is not {v:1, season ${SEASON}} with an entry for each game the press read: ${String(kept1).slice(0,200)}`);
            for(const g of read){ const e=kv&&kv.games?kv.games[g.id]:null, o=ESPN.oddsOf(evOfG(g),g), b=(LV[wk]||{})[g.id], GLg=F('ESPN_GL')[g.id], ow=OUT[g.id], x=o&&GLg?keptGl(g,o,GLg.at):null;
              chk(!!e&&e.w===wk&&!!e.gl&&!!x&&same(sortObj(vals(x.lines)),sortObj(o.lines))&&Object.values(x.lines).every(p=>p[1]===GLg.at)&&canon(e.gl.lines)===canon(x.lines)&&canon(e.gl.ids)===canon(x.ids)&&canon(e.gl.idat)===canon(x.idat)
                &&e.gl.glat===x.glat&&e.gl.event===x.event&&e.gl.at===GLg.at&&Math.abs(e.gl.at-t0)<60e3&&e.gl.at===glAt0&&Object.keys(x.idat).every(k=>F('espnIdAt')(g.id,k)===x.idat[k]),
                `the press kept ${g.id}'s game lines otherwise than the page shows them after it (its scoreboard's lines, each id it gave or found as the pull had it dated by the read, the pull's glat else the read's, its event): ${JSON.stringify(e&&e.gl)} against ${JSON.stringify(x)}`);
              { const gs=glSigOf(before[g.id]||{}), ps=plSigOf(g.id);
                chk(!!e&&!!e.gl&&e.gl.sig===gs&&e.plsig===ps,`the press kept ${g.id}'s read over other published lines than the page had (the game lines' hash ${gs}, the player prices' ${ps}, worked out here): ${e&&e.gl&&e.gl.sig} ${e&&e.plsig}`); }
              chk(!!e&&(b?canon(e.pl)===canon(b):e.pl===undefined),`the press kept ${g.id}'s player lines otherwise than ESPN_LIVE holds them: ${String(JSON.stringify(e&&e.pl)).slice(0,160)}`);
              chk(!!e&&(ow&&(ow.st==='ok'||ow.st==='none')?!!e.out&&e.out.st===ow.st:e.out===undefined),`the press kept what it found for ${g.id} as ${JSON.stringify(e&&e.out)}, where the read ${ow?ow.st:'found nothing'}`); }
            if(gK) chk(!kv||!kv.games||!(gK.id in kv.games),`the press kept a read of ${gK.id}, kicked off before it was read`); });


            /* 2. a reload with the press's read kept: no request, and exactly the press's player lines, game
               lines, ids and their read times, the key written back as it was, and the levels and g0's hands
               as right after the press */
            await kcase(`a reload with the press's read kept`,async()=>{
            drop(); const lvA=lvSig(F('getPbTiers')()), hdA=hdSig(F('gameTiers')(g0));
            const r2=reload(kept1,null,o=>{ o.lv=lvSig(F('getPbTiers')()); o.hd=hdSig(F('gameTiers')(g0)); o.st=F('espnStatus')(null); });
            chk(!r2.err&&r2.req===0&&r2.n===read.length,`a reload with the press's read kept did not put back its ${read.length} games with no request: ${why(r2)}`);
            chk(canon(r2.ESPN_LIVE)===canon(post.ESPN_LIVE),`a reload did not put back exactly the press's player lines: ${canon(r2.ESPN_LIVE).slice(0,200)} against ${canon(post.ESPN_LIVE).slice(0,200)}`);
            { const bad=games.filter(g=>!same(r2.lines[g.id],post.lines[g.id]));
              chk(!bad.length,`a reload did not put back the press's game lines on ${bad.map(g=>g.id+' '+JSON.stringify(r2.lines[g.id])+' against '+JSON.stringify(post.lines[g.id])).join('; ').slice(0,300)}`); }
            chk(canon(r2.dk)===canon(post.dk)&&canon(r2.ESPN_IDAT)===canon(post.ESPN_IDAT),`a reload did not put back the press's DraftKings ids beside the paid pull's, each dated by its read: ${canon(((r2.dk||{})[wk])).slice(0,200)} ${canon(r2.ESPN_IDAT).slice(0,160)}`);
            /* written back as the press kept it, plsig beside a player half only (keptBack) */
            chk(!!r2.kv&&canon(r2.kg)===canon(keptBackAll(kv&&kv.games)),`a reload wrote the kept read back otherwise than the press kept it: ${String(r2.key).slice(0,200)}`);
            chk(r2.lv===lvA,`after a reload, the Parlay Builder's levels are not the ones on the press's read: ${String(r2.lv).slice(0,160)} against ${lvA.slice(0,160)}`);
            chk(r2.hd===hdA,`after a reload, ${g0.id}'s hands are not the ones on the press's read: ${String(r2.hd).slice(0,160)} against ${hdA.slice(0,160)}`);
            W.wording(!!r2.st&&/^DraftKings via ESPN( for \d+ of \d+ games( \([^)]*\))?)?, read /.test(r2.st)&&!/newer prices published since/.test(r2.st),`after a reload with the read standing, the status line reads "${r2.st}"`);
            /* and a load does it before the page is first drawn: boot() calls espnRestore() ahead of its first
               renderAll() (a boot here would replace S under every check after M8, so its order is held instead) */
            { const src=String(F('boot')), iR=src.indexOf('espnRestore()'), iD=src.indexOf('renderAll()');
              chk(iR>=0&&iD>=0&&iR<iD,`a load does not put a kept read back before the page is first drawn: boot() calls ${iR<0?'no espnRestore()':'espnRestore() after renderAll()'}`); }
            });

            /* 3. the time rule (round 4 of 16 October 2026). A kept half stands over the publish it was read over, or over
               a newer one where the read is later than that publish's own time for the half: for the game lines the
               DraftKings pull's (g.lat, where the game's lines are DraftKings'), else the bake (PAY.baked_at); for the
               player lines the paid pull's for the game (PAY.dk's at), else the bake. Until round 4 any change of the
               published lines set a read aside, so a read made in a tab left open across a publish was lost on the next
               reload and the status line said it gave way to prices published since. Each case is a newer publish (P2)
               made on the reload from the one the press read over (P1), its time for the half set either side of the
               read's own and the other time of the pair (the bake, or the pull) on the far side, so a rule that read the
               wrong one fails. The times are the kept read's own (gl.at, pl.at, out's when), so the cases hold in any
               week and at any hour. Game lines:
               (a) P2 moves g0's total with a DraftKings pull later than the read (the bake earlier): the game lines aside
                   (nothing of them, their ids or event), the player lines standing, ESPN_ASIDE and ESPN_KEEP_GONE naming
                   the game lines alone, the key and another tab's copy written over without them; and g0 kept as its game
                   lines alone (the entry the page writes where the player read failed): nothing of it stands, and the
                   status lines say it gave way;
               (b) the same with the pull earlier than the read (the bake later: a tab left open across a publish): the
                   read stands over P2, its d replayed on P2's lines (replay), ESPN_GL holding P2's lines as published,
                   the ids and player lines as the press left them, and the key written back over P2 (its hash);
               (c) P2 moves g0's total on DraftKings' lines with no pull time, and on lines that are not DraftKings': the
                   bake later than the read, aside; earlier, standing as in (b);
               (d) the same lines rebaked later than the read: standing exactly as the press left it (and in its own case
                   below, on a publish whose lines are not DraftKings', where the bake is the only time there is) */
            const bump=(g,k,dd)=>{ const v=g[k]; g[k]=typeof v==='number'&&isFinite(v)?v+dd:(k==='tot'?41.5:-150); };
            /* the times of a kept entry's halves: ESPN_KEEP_GONE holds, by half ({gl, pl}), the times of the halves a load
               set aside, so a write never takes one back from another tab's copy and never refuses the other half for it.
               The player half's time is its latest read's: its lines' or, later, the read that found what it found (out's
               when; round 4, as the page's merge ranks it) */
            const atOf=e=>({gl:e&&e.gl?e.gl.at:0,pl:Math.max(e&&e.pl?Date.parse(e.pl.at)||0:0,e&&e.out&&isFinite(e.out.when)?+e.out.when:0)}), kAt=atOf(kv&&kv.games&&kv.games[g0.id]);
            const goneIs=(r,gid,hs,at)=>{ const G=r.GONE[gid]; return !!G&&same(Object.keys(G).sort(),[...hs].sort())&&hs.every(h=>G[h]===at[h]); };
            const k0e=kv&&kv.games&&kv.games[g0.id], gAt=k0e&&k0e.gl?k0e.gl.at:NaN, plAt=kAt.pl, plRead=k0e&&k0e.pl?Date.parse(k0e.pl.at):NaN;
            const setBk=t=>{ P().baked_at=iso(t); };
            /* P2 for the game lines: g0's total moved, its lines DraftKings' pulled at lat (ls 'dk' with no lat where lat is
               undefined, not DraftKings' at all where it is null), the bake at bk */
            const p2gl=(lat,bk)=>()=>{ bump(g0,'tot',1); if(lat===null){ delete g0.ls; delete g0.lat; } else { g0.ls='dk'; if(lat===undefined) delete g0.lat; else g0.lat=iso(lat); } setBk(bk); return null; };
            /* the reload, with the status lines, P2's own hashes, and another tab's copy (the raw value put back in the
               browser after the restore and written over by this load) */
            const reloadT=(raw,tweak,look,lab)=>reload(raw,tweak,o=>{ o.st=F('espnStatus')(null); o.st0=F('espnStatus')(g0.id); o.ps2=plSigOf(g0.id); if(look) look(o);
              try{ LS.setItem(KK,raw); }catch(e){} o.w2=F('espnKeepWrite')(); o.k2=(parse(lsGet())||{}).games||{}; },lab);
            /* g0's game lines standing over P2 */
            /* (round 5) over a newer publish the kept d is put back as a read would put it, each field by its own read's
               time (replayD); the press's read is one read of all eight with their prices, so each field stands */
            const glStands=(lab,r)=>{ const pub=r.pub[g0.id], RD=replayD(pub,k0e.gl.lines,sinceOf(pub,r.bk,false),false), want=RD.lines, GLr=r.ESPN_GL[g0.id], a=r.ESPN_ASIDE[g0.id]||{}, G=r.GONE[g0.id]||{};
              chk(!r.err&&r.req===0&&RD.at===gAt&&canon(r.lines[g0.id])===canon(want)&&!!GLr&&canon(GLr.orig)===canon(pub)&&GLr.at===RD.at&&canon(GLr.d)===canon(RD.D)&&!('gl' in a)&&!('gl' in G),
                `${lab}: ${g0.id}'s kept game lines, read later than that publish's own time for them, did not stand over it (the kept d replayed on its lines, ESPN_GL holding those as published): ${JSON.stringify(r.lines[g0.id])} against ${JSON.stringify(want)}; ESPN_GL ${String(JSON.stringify(GLr||null)).slice(0,220)}; ${why(r)}`);
              chk(!r.err&&dkOf(r.dk,g0.id)===dkOf(post.dk,g0.id)&&canon(r.ESPN_IDAT[g0.id]||null)===canon(post.ESPN_IDAT[g0.id]||null)&&canon((r.ESPN_LIVE[wk]||{})[g0.id]||null)===canon((post.ESPN_LIVE[wk]||{})[g0.id]||null),
                `${lab}: ${g0.id}'s DraftKings ids or player lines were not put back as the press left them: ${why(r)}`);
              const kg=r.kg[g0.id];
              chk(!!kg&&!!kg.gl&&kg.gl.sig===glSigOf(pub)&&canon({...kg.gl,sig:null})===canon({...k0e.gl,lines:RD.D,at:RD.at,sig:null}),
                `${lab}: the key written back does not hold ${g0.id}'s game lines as kept, over the newer publish's lines (their hash ${glSigOf(pub)}, worked out here): ${String(JSON.stringify(kg&&kg.gl)).slice(0,240)}`);
              W.wording(!/gave way/.test(r.st0||'')&&!/gave way/.test(r.st||''),`${lab}: a status line says ${g0.id}'s earlier read gave way where it stands: "${r.st0}" / "${r.st}"`); };
            /* g0's game lines set aside by P2, its player lines (the full entry) standing */
            const glAside=(lab,r)=>{ const a=r.ESPN_ASIDE[g0.id]||null, b0=(post.ESPN_LIVE[wk]||{})[g0.id];
              chk(!r.err&&r.req===0&&same(r.lines[g0.id],r.pub[g0.id])&&!r.ESPN_GL[g0.id]&&!r.ESPN_IDAT[g0.id]&&dkOf(r.dk,g0.id)===dkOf(dkPre,g0.id)&&!!a&&a.gl===gAt&&!('pl' in a),
                `${lab}: a reload put ${g0.id}'s kept game lines or their ids back, or ESPN_ASIDE does not name its game lines alone at their read's time: ${why(r)}`);
              chk(goneIs(r,g0.id,['gl'],kAt),`${lab}: ESPN_KEEP_GONE does not hold ${g0.id}'s game lines' time alone: ${JSON.stringify(r.GONE[g0.id]||null)} against {gl:${kAt.gl}}`);
              chk(!(r.kg[g0.id]&&r.kg[g0.id].gl)&&r.w2===true&&!(r.k2[g0.id]&&r.k2[g0.id].gl),`${lab}: the key written back, or another tab's copy of the press's read written over by this load, still holds ${g0.id}'s game lines: ${String(JSON.stringify(r.kg[g0.id]||null)).slice(0,160)} / ${String(JSON.stringify(r.k2[g0.id]||null)).slice(0,160)}`);
              chk(!r.err&&(b0?canon((r.ESPN_LIVE[wk]||{})[g0.id])===canon(b0)&&!!r.kg[g0.id]&&canon(r.kg[g0.id].pl)===canon(b0):!inLive(r.ESPN_LIVE,g0.id)),
                `${lab}: with ${g0.id}'s game lines set aside, its player lines did not stand, or were not written back: ${why(r)}`);
              W.wording(!/gave way/.test(r.st0)&&!/gave way/.test(r.st),`${lab}: with ${g0.id}'s player lines still standing, a status line says its earlier read gave way: "${r.st0}" / "${r.st}"`);
              const rest=read.filter(g=>g!==g0&&!same(r.lines[g.id],post.lines[g.id]));
              chk(!rest.length,`${lab}: with ${g0.id}'s game lines set aside, the other games' kept game lines were not put back: ${rest.map(g=>g.id).join(', ')}`); };
            await kcase(`the time rule: game lines`,async()=>{
              if(!(k0e&&k0e.gl&&isFinite(gAt))){ W.coverage(false,`the press kept no game lines for ${g0.id}: the time rule on game lines went untested`); return; }
              /* g0 kept as its game lines alone: the entry the page writes for a game whose player read failed */
              const vG=clone(kv); delete vG.games[g0.id].pl; delete vG.games[g0.id].out; const rawG=JSON.stringify(vG);
              { const lab=`a newer publish moving ${g0.id}'s total with a DraftKings pull later than the read (the bake earlier)`;
                glAside(lab,reloadT(kept1,p2gl(gAt+1000,gAt-1000),null,lab));
                const r=reloadT(rawG,p2gl(gAt+1000,gAt-1000),null,lab+', its read kept as its game lines alone');
                chk(!r.err&&r.req===0&&nothing(r,g0.id)&&!r.ESPN_KEPT[g0.id]&&!(g0.id in r.kg)&&!(g0.id in r.k2)&&!!r.ESPN_ASIDE[g0.id]&&r.ESPN_ASIDE[g0.id].gl===gAt&&goneIs(r,g0.id,['gl'],kAt),
                  `${lab}, ${g0.id}'s read kept as its game lines alone: something of it stood, was written back or came back from another tab's copy, or ESPN_ASIDE and ESPN_KEEP_GONE do not name its game lines: ${why(r)}`);
                W.wording(/newer prices published since your read of 1 game\b/.test(r.st)&&/newer prices published since your read(?! of)/.test(r.st0||''),
                  `${lab}, ${g0.id}'s kept read wholly given way: the status lines do not say so: "${r.st}" / "${r.st0}"`); }
              { const lab=`a newer publish moving ${g0.id}'s total with a DraftKings pull earlier than the read (the bake later: a tab left open across a publish)`;
                glStands(lab,reloadT(kept1,p2gl(gAt-1000,gAt+1000),null,lab));
                const r=reloadT(rawG,p2gl(gAt-1000,gAt+1000),null,lab+', its read kept as its game lines alone');
                chk(!r.err&&r.req===0&&canon(r.lines[g0.id])===canon(replay(r.pub[g0.id],k0e.gl.lines,sinceOf(r.pub[g0.id],r.bk,false),false))&&!r.ESPN_ASIDE[g0.id]&&!!r.kg[g0.id]&&!!r.kg[g0.id].gl&&r.kg[g0.id].gl.sig===glSigOf(r.pub[g0.id]),
                  `${lab}, ${g0.id}'s read kept as its game lines alone: it did not stand over the newer publish, or was not written back over its lines: ${JSON.stringify(r.lines[g0.id])}; ${why(r)}`);
                W.wording(!/gave way/.test(r.st)&&!/gave way/.test(r.st0),`${lab}, its read kept as its game lines alone: a status line says it gave way where it stands: "${r.st}" / "${r.st0}"`); }
              for(const [kind,lat] of [['DraftKings\' lines with no pull time',undefined],['lines that are not DraftKings\'',null]]){
                glAside(`a newer publish moving ${g0.id}'s total on ${kind}, baked later than the read`,reloadT(kept1,p2gl(lat,gAt+1000),null,`a newer publish on ${kind}, baked later`));
                glStands(`a newer publish moving ${g0.id}'s total on ${kind}, baked earlier than the read`,reloadT(kept1,p2gl(lat,gAt-1000),null,`a newer publish on ${kind}, baked earlier`)); }
              { const lab=`the same lines rebaked later than the read`;
                const r=reloadT(kept1,()=>{ setBk(Math.max(gAt,plAt)+3600e3); return null; },null,lab);
                const bad=games.filter(g=>!same(r.lines[g.id],post.lines[g.id]));
                chk(!r.err&&r.req===0&&r.n===read.length&&!bad.length&&canon(r.ESPN_GL)===canon(post.ESPN_GL)&&canon(r.ESPN_LIVE)===canon(post.ESPN_LIVE)&&canon(r.dk)===canon(post.dk)&&canon(r.ESPN_IDAT)===canon(post.ESPN_IDAT)
                  &&canon(r.ESPN_ASIDE)==='{}'&&canon(r.kg)===canon(keptBackAll(kv&&kv.games)),
                  `${lab}: the kept read did not stand exactly as the press left it (a rebake with the same lines never sets a read aside): ${bad.map(g=>g.id).join(', ')}; ${why(r)}`);
                W.wording(!/gave way/.test(r.st)&&!/gave way/.test(r.st0),`${lab}: a status line says the earlier read gave way: "${r.st}" / "${r.st0}"`); }
            });
            /* the player half: P2 moves g0's published player prices (the paid pull's time for it, or one of its main lines
               in the payload, with the pull's time set either side of the read or taken out) with the pull later than the
               read (the bake earlier), or with no pull time and the bake later: the player lines aside, what the read found
               with them, the game lines standing; with the pull earlier (the bake later), or no pull time and the bake
               earlier: they stand over P2, the key written back over its hash, and (P2 moving the pull's time alone) its
               legs priced from the read exactly as after the press */
            const legSig=()=>{ drop(); return JSON.stringify(F('pricedLegs')([g0]).map(l=>JSON.stringify([l.key,l.side,l.k,l.price,l.src,typeof l.p==='number'?+l.p.toFixed(9):null])).sort()); };
            const mainMove=()=>{ const Mw=(P().mkt[wk]??={}); let hit=null;
              for(const p of Object.keys(Mw)) for(const s of Object.keys(Mw[p]||{})) if(!hit&&Mw[p][s]&&Mw[p][s].g===g0.id) hit=Mw[p][s];
              if(hit){ const was=hit.over; hit.over=was===-110?-115:-110; return ()=>{ hit.over=was; }; }
              Mw['00-AUDIT-ROW']={receptions:{line:3.5,over:-110,under:-110,n:'Audit Row',g:g0.id}}; return ()=>{ delete Mw['00-AUDIT-ROW']; }; };
            const atSet=t=>{ const E=((P().dk[wk]??={})[g0.id]??={}); if(t==null) delete E.at; else E.at=iso(t); };
            const plStands=(lab,r,legs0)=>{ const b0=(post.ESPN_LIVE[wk]||{})[g0.id], kg=r.kg[g0.id], a=r.ESPN_ASIDE[g0.id]||{};
              chk(!r.err&&r.req===0&&!!b0&&canon((r.ESPN_LIVE[wk]||{})[g0.id])===canon(b0)&&canon(r.ESPN_OUT[g0.id]||null)===canon(k0e.out||null)&&!('pl' in a)&&same(r.lines[g0.id],post.lines[g0.id])&&!!r.ESPN_GL[g0.id],
                `${lab}: ${g0.id}'s kept player lines, read later than that publish's own time for them, did not stand over it (with what the read found, and its game lines): ${why(r)}`);
              chk(!!kg&&canon(kg.pl)===canon(b0)&&canon(kg.out||null)===canon(k0e.out||null)&&kg.plsig===r.ps2&&!!kg.gl,
                `${lab}: the key written back does not hold ${g0.id}'s player lines and what the read found over the newer publish's player prices (their hash ${r.ps2}, worked out here): ${String(JSON.stringify(kg||null)).slice(0,200)}`);
              if(legs0!=null) chk(!r.err&&r.legs===legs0,`${lab}: ${g0.id}'s legs are not priced from the read as after the press: ${String(r.legs).slice(0,200)} against ${legs0.slice(0,200)}`);
              W.wording(!/gave way/.test(r.st0||''),`${lab}: ${g0.id}'s page says its earlier read gave way where it stands: "${r.st0}"`); };
            const plAside=(lab,r)=>{ const a=r.ESPN_ASIDE[g0.id]||null, ids0=((k0e&&k0e.gl)||{}).ids||{}, D=((r.dk||{})[wk]||{})[g0.id]||{}, Dp=((post.dk||{})[wk]||{})[g0.id]||{};
              chk(!r.err&&r.req===0&&!inLive(r.ESPN_LIVE,g0.id)&&!r.ESPN_OUT[g0.id]&&!!a&&a.pl===plAt&&!('gl' in a)&&same(r.lines[g0.id],post.lines[g0.id])&&!!r.ESPN_GL[g0.id]
                &&Object.keys(ids0).every(k=>D[k]===Dp[k]),`${lab}: a reload put ${g0.id}'s kept player lines or what the read found back, or not its game lines and ids, or ESPN_ASIDE does not name its player lines alone at their latest read's time: ${why(r)}`);
              chk(!!r.kg[g0.id]&&!r.kg[g0.id].pl&&!r.kg[g0.id].out&&!!r.kg[g0.id].gl,`${lab}: the key written back holds ${g0.id}'s player lines or what that read found, or not its game lines: ${String(JSON.stringify(r.kg[g0.id]||null)).slice(0,160)}`);
              chk(goneIs(r,g0.id,['pl'],kAt),`${lab}: ESPN_KEEP_GONE does not hold ${g0.id}'s player lines' time alone, the half set aside: ${JSON.stringify(r.GONE[g0.id]||null)} against {pl:${kAt.pl}}`);
              W.wording(!/gave way/.test(r.st0),`${lab}: ${g0.id}'s game page says its earlier read gave way where its game lines stand: "${r.st0}"`); };
            await kcase(`the time rule: player lines`,async()=>{
              if(!(k0e&&k0e.pl&&isFinite(plRead)&&k0e.gl)){ W.coverage(false,`the press kept no player lines for ${g0.id}: the time rule on player lines went untested`); return; }
              const legs0=legSig(), later=plAt+1000, earlier=plRead-1000;
              const T=(lab,tw)=>reloadT(kept1,tw,o=>{ o.legs=legSig(); },lab);
              plAside(`the paid pull's time for ${g0.id} later than its player read (the bake earlier)`,T('a pull later',()=>{ atSet(later); setBk(earlier); return null; }));
              plStands(`the paid pull's time for ${g0.id} earlier than its player read (the bake later)`,T('a pull earlier',()=>{ atSet(earlier); setBk(later); return null; }),legs0);
              plAside(`one of ${g0.id}'s main lines moved in the payload, the paid pull's time later than its player read`,T('a main line, pull later',()=>{ atSet(later); setBk(earlier); return mainMove(); }));
              plStands(`one of ${g0.id}'s main lines moved in the payload, the paid pull's time earlier than its player read`,T('a main line, pull earlier',()=>{ atSet(earlier); setBk(later); return mainMove(); }),null);
              plAside(`one of ${g0.id}'s main lines moved, the pull giving no time for it and the bake later than its player read`,T('a main line, no pull time, baked later',()=>{ atSet(null); setBk(later); return mainMove(); }));
              plStands(`one of ${g0.id}'s main lines moved, the pull giving no time for it and the bake earlier than its player read`,T('a main line, no pull time, baked earlier',()=>{ atSet(null); setBk(earlier); return mainMove(); }),null);
            });
            /* the page's clock past g0's kickoff: nothing of it, and the key written back without it */
            await kcase(`a kickoff`,async()=>{
            { const k0c=F('kickoff')(g0).getTime(), r=reload(kept1,()=>{ setClock(k0c+60e3); return ()=>{ w.Date.now=clock0; }; });
              chk(!r.err&&r.req===0&&nothing(r,g0.id)&&!(g0.id in r.kg)&&!r.ESPN_KEPT[g0.id],`with the page's clock past ${g0.id}'s kickoff, a reload put something of its kept read back, or wrote it back: ${why(r)}`);
              chk(goneIs(r,g0.id,['gl','pl'],kAt),`with the page's clock past ${g0.id}'s kickoff, ESPN_KEEP_GONE does not hold both its halves' times: ${JSON.stringify(r.GONE[g0.id]||null)}`); }
            });
            /* a value the page does not write: nothing put back and the key emptied */
            await kcase(`a kept value the page does not write`,async()=>{
            for(const [lab,raw] of [['of another season',JSON.stringify({...kv,season:SEASON-1})],['of another version (v 2)',JSON.stringify({...kv,v:2})],['that is not JSON',`{"v":1,"season":${SEASON},"games":{`],
                ['whose games are a list',JSON.stringify({...kv,games:Object.values((kv&&kv.games)||{})})],['whose games are not an object',JSON.stringify({...kv,games:'x'})]]){
              const r=reload(raw);
              chk(!r.err&&r.req===0&&!r.n&&canon(r.ESPN_LIVE)==='{}'&&canon(r.ESPN_GL)==='{}'&&canon(r.ESPN_IDAT)==='{}'&&canon(r.ESPN_OUT)==='{}'&&games.every(g=>same(r.lines[g.id],r.pub[g.id]))&&canon(r.dk)===r.dk0&&r.key===null,
                `a kept value ${lab}: a reload put something back, or left the key: ${why(r)}`); }
            });
            /* no schedule to stand on: nothing done, and the key left exactly as it was */
            await kcase(`no schedule`,async()=>{
            { let sch=null; const r=reload(kept1,()=>{ sch=S.sched; S.sched=[]; return ()=>{ S.sched=sch; }; });
              chk(!r.err&&r.req===0&&!r.n&&r.key===kept1&&canon(r.ESPN_LIVE)==='{}'&&canon(r.ESPN_GL)==='{}'&&canon(r.ESPN_IDAT)==='{}'&&games.every(g=>same(r.lines[g.id],r.pub[g.id]))&&canon(r.dk)===r.dk0,
                `with no schedule, a reload put something back or touched the key: ${why(r)}`); }
            });
            /* a kept entry with parts the page never writes: a DraftKings id that is not one, or under a key
               that is not one, a game line or a player's line that is not a number, a player id with a quote:
               each part dropped, never in PAY.dk or ESPN_LIVE, and the rest of the entry put back whole */
            await kcase(`the parts of a kept entry the page never writes`,async()=>{
            const e0k=kv&&kv.games&&kv.games[g0.id];
            if(e0k&&e0k.gl&&e0k.pl){
              { const v=clone(kv), e0=v.games[g0.id];
                Object.assign(e0.gl.ids,{'game|total|over|99.5':'<img src=x>','game|total|under|99.5':'javascript:x','team:SEA|ml"><b>x</b>':'0AUBADKEY','ml':'0AUBADKEY2'});
                /* (round 5) each kept line is [its value, its read's time]: a value that is not a number, a bare value, a
                   time after the read's own (gl.at) or not a time, or a pair of three, is not one the page writes */
                const tA=e0.gl.at; Object.assign(e0.gl.lines,{mla:['+999',tA],mlh:[null,tA],tov:[-104,tA+5000],tou:-116,spa:[-108,'AUDITT'],sph:[-112,tA,1]});
                Object.assign(e0.pl.lines,{'00-0"><img src=x>':{receiving_yards:61.5},'00-AUDIT-STR':{receiving_yards:'55.5'},'00-AUDIT-INF':{receiving_yards:'AUDITINF'},'00-AUDIT-NEG':{receiving_yards:-3}});
                e0.pl.rungs['00-0"x']={receiving_yards:[50]}; e0.pl.rungs['00-AUDIT-STR']={receiving_yards:['40',null]}; e0.pl.td=[...e0.pl.td,'00-0"x',7];
                const r=reload(JSON.stringify(v).replace('"AUDITINF"','1e999'));
                chk(!r.err&&r.req===0&&canon(r.dk)===canon(post.dk)&&!/<img|javascript:|0AUBADKEY/.test(JSON.stringify(r.dk))&&canon(r.ESPN_IDAT)===canon(post.ESPN_IDAT),
                  `a kept DraftKings id that is not one, or under a key that is not one, reached PAY.dk on a reload, or the entry's own ids did not: ${why(r)}`);
                chk(canon(r.ESPN_LIVE)===canon(post.ESPN_LIVE),`a kept player id with a quote, or a line that is not a number, reached ESPN_LIVE on a reload, or the rest of ${g0.id}'s player lines did not: ${canon((r.ESPN_LIVE[wk]||{})[g0.id]).slice(0,240)}`);
                /* the kept d replayed (round 4, espnKeepLines): a money line kept as "+999" is not a value the page writes,
                   so it is dropped with the rest of what the page never writes and the field is one no read set (the
                   published one stands); so is a money line kept as null (round 6: a read drops only a price, a number
                   read without its prices, never a money line, spread or total); the other six as kept */
                const PRICE=new Set(['spa','sph','tov','tou']), kl=e0.gl.lines, okT=t=>typeof t==='number'&&isFinite(t)&&t>0&&t<=tA, dC=Object.fromEntries(NUM8.filter(k=>{ const x=Object.prototype.hasOwnProperty.call(kl,k)?kl[k]:undefined;
                  return Array.isArray(x)&&x.length===2&&(x[0]===null?PRICE.has(k):(typeof x[0]==='number'&&isFinite(x[0])))&&okT(x[1]); }).map(k=>[k,kl[k]]));
                const wantL=replay(r.pub[g0.id],dC,0,true), L0=Object.fromEntries(Object.entries(r.lines[g0.id]).filter(([,x])=>x!==undefined));
                chk(['mla','mlh','tov','tou','spa','sph'].every(k=>!(k in dC))&&canon(r.lines[g0.id])===canon(wantL)&&L0.mla===r.pub[g0.id].mla&&L0.mlh===r.pub[g0.id].mlh&&['tov','tou','spa','sph'].every(k=>L0[k]===r.pub[g0.id][k])&&games.every(g=>g===g0||same(r.lines[g.id],post.lines[g.id])),
                  `a kept game line the page never writes (a value that is not a number, a null money line, a bare value, a time after its read's or not a time, a pair of three) was applied on a reload, or the rest were not put back exactly as kept: ${JSON.stringify(r.lines[g0.id])} against ${JSON.stringify(wantL)}`); }
              /* a player id "__proto__" (in the lines, the ladders and the touchdown list), an id key "__proto__" and
                 a game "__proto__" beside g0's (fix 1 of 16 October 2026: ESPN_KEEP_PID let it through): dropped as
                 any other id the page never writes, never an own key or the prototype of anything put back or kept
                 (ESPN_LIVE and its week, g0's read, ESPN_KEPT, ESPN_KEEP_GONE), nor in what is written back; the
                 read's lines own and plain (a for-in over them, as espnComplete makes, finds only the players read) */
              { const v=clone(kv), e0=v.games[g0.id];
                e0.pl.lines.AUDITPROTO={receiving_yards:62.5,passing_yards:201.5}; e0.pl.rungs.AUDITPROTO={receiving_yards:[40,50]}; e0.pl.td=[...e0.pl.td,'AUDITPROTO']; e0.gl.ids.AUDITPROTO='0AUPROTO';
                v.games.AUDITPROTOG=clone(kv.games[g0.id]);
                const forIn=o=>{ const a=[]; if(o&&typeof o==='object') for(const k in o) a.push(k); return a.sort(); };
                const plain=o=>!!o&&typeof o==='object'&&Object.getPrototypeOf(o)===w.Object.prototype&&!Object.prototype.hasOwnProperty.call(o,'__proto__');
                const r=reload(JSON.stringify(v).split('"AUDITPROTO"').join('"__proto__"').split('"AUDITPROTOG"').join('"__proto__"'),null,o=>{ const b=(o.ESPN_LIVE[wk]||{})[g0.id], kp=o.ESPN_KEPT[g0.id];
                  o.pp=b?{lp:plain(b.lines),rp:plain(b.rungs),li:forIn(b.lines),ri:forIn(b.rungs),td:[...(b.td||[])]}:null;
                  o.holders=[['ESPN_LIVE',o.ESPN_LIVE],['ESPN_LIVE['+wk+']',o.ESPN_LIVE[wk]||{}],['ESPN_KEPT',o.ESPN_KEPT],['ESPN_KEEP_GONE',F('ESPN_KEEP_GONE')],['ESPN_ASIDE',o.ESPN_ASIDE],['ESPN_IDAT',o.ESPN_IDAT],
                    ['the kept read\'s lines',kp&&kp.pl?kp.pl.lines:{}],['the kept read\'s ladders',kp&&kp.pl?kp.pl.rungs:{}],['the kept ids',kp&&kp.gl?kp.gl.ids:{}]].filter(([,x])=>!plain(x)).map(([n])=>n); });
                const b0=post.ESPN_LIVE[wk][g0.id];
                chk(!r.err&&!!r.pp&&r.pp.lp&&r.pp.rp&&same(r.pp.li,Object.keys(b0.lines).sort())&&same(r.pp.ri,Object.keys(b0.rungs).sort())&&!r.pp.td.includes('__proto__')&&canon(r.ESPN_LIVE)===canon(post.ESPN_LIVE),
                  `a kept player id "__proto__" reached ESPN_LIVE on a reload (${g0.id}'s lines ${r.pp?(r.pp.lp?'plain':'on another prototype')+', for-in '+JSON.stringify(r.pp.li.filter(k=>!(k in b0.lines))):'missing'}; ladders ${r.pp?(r.pp.rp?'plain':'on another prototype'):'missing'}; touchdowns ${r.pp?JSON.stringify(r.pp.td.filter(p=>!b0.td.includes(p))):'missing'})${r.err?'; threw '+r.err.split('\n')[0]:''}`);
                chk(!r.err&&canon(r.dk)===canon(post.dk)&&!/0AUPROTO/.test(JSON.stringify(r.dk)),`a kept DraftKings id under the key "__proto__" reached PAY.dk on a reload: ${why(r)}`);
                chk(!r.err&&!!r.holders&&!r.holders.length&&r.n===read.length&&!/__proto__/.test(String(r.key))&&canon(r.kg)===canon(keptBackAll(kv&&kv.games)),
                  `a kept "__proto__" (a player, an id key or a game) is an own key or the prototype of ${r.holders&&r.holders.length?r.holders.join(', '):'something'} after a reload, or is written back, or the rest was not put back and written back as the press kept it: ${why(r)}`);
                /* nor anything set on the page's built-ins: a game "__proto__" not on the schedule is set aside whole, and
                   ESPN_KEEP_GONE['__proto__'] read as a plain object's own key is Object.prototype, so the times of its
                   halves landed there as gl and pl (round 3 of 16 October 2026) and every for-in on the page read them:
                   the page's first draw then threw (buildNorm), and the audit stopped with no summary line */
                chk(!r.proto.length,`a kept game "__proto__" set ${r.proto.join(', ')} on the page's built-ins on a reload (espnRestore's ESPN_KEEP_GONE[gid] for gid "__proto__" is Object.prototype): every for-in on the page then reads them, and a load with this value in ${KK} throws on its first draw`); } }
            else W.coverage(false,`the press kept no read of ${g0.id} with game and player lines both, so the parts a kept entry may not carry went untested`);
            });
            /* an entry for a game the schedule does not have, beside g0's own: dropped, g0's put back; and g0's
               entry in another week than the schedule's: dropped */
            await kcase(`a kept entry for a game not on the schedule or of another week`,async()=>{
            { const v=clone(kv); if(v&&v.games&&v.games[g0.id]) v.games['audit-not-a-game']=clone(v.games[g0.id]);
              const r=reload(JSON.stringify(v));
              chk(!r.err&&r.req===0&&!inLive(r.ESPN_LIVE,'audit-not-a-game')&&!r.ESPN_KEPT['audit-not-a-game']&&!('audit-not-a-game' in r.kg)
                &&canon(r.ESPN_LIVE)===canon(post.ESPN_LIVE)&&same(r.lines[g0.id],post.lines[g0.id]),`a kept entry for a game the schedule does not have was put back or written back, or ${g0.id}'s beside it was not put back: ${why(r)}`);
              chk(!r.GONE[g0.id],`beside a kept entry for a game the schedule does not have, ${g0.id}'s is set aside in ESPN_KEEP_GONE: ${JSON.stringify(r.GONE)}`); }
            { const v=clone(kv); if(v&&v.games&&v.games[g0.id]) v.games[g0.id].w=String(+g0.w>=22?1:+g0.w+1);
              const r=reload(JSON.stringify(v));
              chk(!r.err&&r.req===0&&nothing(r,g0.id)&&!r.ESPN_KEPT[g0.id]&&!(g0.id in r.kg)&&read.filter(g=>g!==g0).every(g=>same(r.lines[g.id],post.lines[g.id])),
                `a kept entry for ${g0.id} in another week than the schedule's was put back or written back, or the other games' were not: ${why(r)}`);
              chk(goneIs(r,g0.id,['gl','pl'],kAt),`a kept entry for ${g0.id} in another week is not set aside whole in ESPN_KEEP_GONE: ${JSON.stringify(r.GONE[g0.id]||null)}`); }
            });

            /* a kept half dated after the page's clock (fix 4 of 16 October 2026) is not a time the page wrote:
               that half is dropped and the rest of the entry put back. g0's gl.at two hours ahead: none of its game
               lines, ids or event, its player lines and the other games' standing; one id's idat two hours ahead and
               another's past Date's range: each id put back as the pull or the read had it and never dated at that
               time, nothing thrown; glat two hours ahead, on a game the pull gave no glat (taken out of the load's
               copy here): never in PAY.dk, the earliest read of its ids in its place; pl.at two hours ahead: no
               player lines, its game lines and ids standing. Each on values made from the press's own */
            await kcase(`a kept half dated after the page's clock`,async()=>{
            const e0g=kv&&kv.games&&kv.games[g0.id];
            if(e0g&&e0g.gl){ const ahead=w.Date.now()+2*3600e3, late=t=>t!=null&&+t>w.Date.now()+60e3, b0=(post.ESPN_LIVE[wk]||{})[g0.id];
              { const v=clone(kv); v.games[g0.id].gl.at=ahead; const r=reload(JSON.stringify(v));
                chk(!r.err&&r.req===0&&same(r.lines[g0.id],r.pub[g0.id])&&!r.ESPN_GL[g0.id]&&!r.ESPN_IDAT[g0.id]&&dkOf(r.dk,g0.id)===dkOf(dkPre,g0.id)
                  &&(b0?canon((r.ESPN_LIVE[wk]||{})[g0.id])===canon(b0):!inLive(r.ESPN_LIVE,g0.id))&&read.filter(g=>g!==g0).every(g=>same(r.lines[g.id],post.lines[g.id]))&&!(r.kg[g0.id]&&r.kg[g0.id].gl),
                  `a kept read of ${g0.id} whose game lines are dated two hours after the page's clock: a reload put some of its game lines, ids or event back (or wrote them back), or not its player lines and the other games': ${why(r)}`); }
              const ks=Object.keys(e0g.gl.idat||{});
              if(ks.length){ const v=clone(kv), k1=ks[0], k2=ks[1]; v.games[g0.id].gl.idat[k1]=ahead; if(k2) v.games[g0.id].gl.idat[k2]=9e15;
                const r=reload(JSON.stringify(v),null,o=>{ o.idAt=Object.fromEntries([k1,k2].filter(Boolean).map(k=>[k,F('espnIdAt')(g0.id,k)])); });
                const D=((r.dk||{})[wk]||{})[g0.id]||{}, Dp=((post.dk||{})[wk]||{})[g0.id]||{}, IA=r.ESPN_IDAT[g0.id]||{}, IAp=post.ESPN_IDAT[g0.id]||{};
                chk(!r.err&&r.req===0&&!!r.idAt&&[k1,k2].filter(Boolean).every(k=>D[k]===Dp[k]&&!late(IA[k])&&!late(r.idAt[k]))&&ks.slice(2).every(k=>IA[k]===IAp[k])
                  &&same(r.lines[g0.id],post.lines[g0.id])&&canon(r.ESPN_LIVE)===canon(post.ESPN_LIVE)&&!late(Date.parse(D.glat)),
                  `a kept id of ${g0.id} dated two hours after the page's clock (${k1}), or past Date's range (${k2||'none'}), reached ESPN_IDAT at that time, or the id, its glat or the rest of the read was not put back: ${k1} ${IA[k1]}${k2?', '+k2+' '+IA[k2]:''}, glat ${D.glat}; ${why(r)}`); }
              else W.coverage(false,`the press kept no dated id for ${g0.id}: an id dated after the page's clock went untested`);
              { const v=clone(kv); v.games[g0.id].gl.glat=iso(ahead);
                const r=reload(JSON.stringify(v),()=>{ const E=((P().dk||{})[wk]||{})[g0.id]; if(E) delete E.glat; return null; });
                const D=((r.dk||{})[wk]||{})[g0.id]||{}, IA=Object.values(r.ESPN_IDAT[g0.id]||{});
                chk(!r.err&&r.req===0&&(IA.length?Date.parse(D.glat)===Math.min(...IA):D.glat===undefined)&&!late(Date.parse(D.glat))&&same(r.lines[g0.id],post.lines[g0.id])&&canon(r.ESPN_IDAT)===canon(post.ESPN_IDAT),
                  `a kept glat for ${g0.id} two hours after the page's clock reached PAY.dk on a game the pull gave none, or the earliest read of its ids is not in its place: ${D.glat} against ${IA.length?iso(Math.min(...IA)):'none'}; ${why(r)}`); }
              if(e0g.pl){ const v=clone(kv); v.games[g0.id].pl.at=iso(ahead); const r=reload(JSON.stringify(v));
                chk(!r.err&&r.req===0&&!inLive(r.ESPN_LIVE,g0.id)&&same(r.lines[g0.id],post.lines[g0.id])&&dkOf(r.dk,g0.id)===dkOf(post.dk,g0.id)&&canon(r.ESPN_IDAT[g0.id])===canon(post.ESPN_IDAT[g0.id])
                  &&!!r.kg[g0.id]&&!r.kg[g0.id].pl&&!!r.kg[g0.id].gl,
                  `a kept read of ${g0.id} whose player lines are dated two hours after the page's clock: a reload put them back (or wrote them back), or not its game lines and ids: ${why(r)}`);
                /* D. (round 3) what the read found goes back with the half it describes: an 'ok' whose player lines were
                   dropped is not put back (the status line would count the game read). (round 5) Whether the key carries it
                   is the merge's (the stored copy's player half, read later than this load's none): it is never put back */
                chk(!r.err&&!r.ESPN_OUT[g0.id]&&!!r.kg[g0.id]&&!r.kg[g0.id].pl,`a kept read of ${g0.id} whose player lines were dropped (dated two hours after the page's clock) put its 'ok' back in ESPN_OUT, or wrote player lines back: ${JSON.stringify(r.ESPN_OUT[g0.id]||null)}, written ${JSON.stringify((r.kg[g0.id]||{}).pl||null).slice(0,120)}`); }
              else W.coverage(false,`the press kept no player lines for ${g0.id}: player lines dated after the page's clock went untested`); }
            else W.coverage(false,`the press kept no game lines for ${g0.id}: a kept half dated after the page's clock went untested`);
            });

            /* D. what each read found (ESPN_OUT), put back on a reload with the half it describes (round 3 of 16 October
               2026): every game's as the press kept it ('ok' with its player lines, 'none' where none were posted, nothing
               where the read failed); g0 kept as its game lines with what its read found 'none': put back; and g0 kept
               with 'ok' and its player lines dated two hours after the page's clock, so dropped: not put back, not
               written back. Each on values made from the press's own */
            await kcase(`what a kept read found, put back with the half it describes`,async()=>{
              const e0=kv&&kv.games&&kv.games[g0.id];
              { const r=reload(kept1), bad=read.filter(g=>{ const ke=kv&&kv.games&&kv.games[g.id]; return ke&&ke.out?canon(r.ESPN_OUT[g.id])!==canon(ke.out):!!r.ESPN_OUT[g.id]; });
                chk(!r.err&&!bad.length,`a reload did not put back what each read found as the press kept it (ESPN_OUT): ${bad.map(g=>g.id+' '+JSON.stringify(r.ESPN_OUT[g.id]||null)+' against '+JSON.stringify((kv.games[g.id]||{}).out||null)).join('; ').slice(0,300)} ${why(r)}`); }
              if(!(e0&&e0.gl&&e0.pl&&e0.out)){ W.coverage(false,`the press kept no read of ${g0.id} with its game lines, player lines and what it found: what a read found put back went untested`); return; }
              { const v=clone(kv), none={st:'none',why:'DraftKings has posted no player lines for it yet',sb:false,when:w.Date.now()-60e3}; delete v.games[g0.id].pl; v.games[g0.id].out=none;
                const r=reload(JSON.stringify(v));
                chk(!r.err&&r.req===0&&canon(r.ESPN_OUT[g0.id])===canon(none)&&!!r.kg[g0.id]&&canon(r.kg[g0.id].out)===canon(none)&&!inLive(r.ESPN_LIVE,g0.id)&&same(r.lines[g0.id],post.lines[g0.id]),
                  `${g0.id} kept as its game lines with what its read found "none" (no player lines posted): a reload did not put that back in ESPN_OUT and write it back, or not its game lines: ${JSON.stringify(r.ESPN_OUT[g0.id]||null)}; ${why(r)}`); }
              { const v=clone(kv); v.games[g0.id].pl.at=iso(w.Date.now()+2*3600e3); v.games[g0.id].out={...e0.out,st:'ok'};
                const r=reload(JSON.stringify(v));
                chk(!r.err&&r.req===0&&!r.ESPN_OUT[g0.id]&&!inLive(r.ESPN_LIVE,g0.id)&&!!r.kg[g0.id]&&!!r.kg[g0.id].gl&&!r.kg[g0.id].pl&&same(r.lines[g0.id],post.lines[g0.id]),
                  `${g0.id} kept with an 'ok' read whose player lines were dropped (dated two hours after the page's clock): a reload put the 'ok' back in ESPN_OUT (the game counted as read with no player lines), or player lines back, or not its game lines: ${JSON.stringify(r.ESPN_OUT[g0.id]||null)}; ${why(r)}`);
                /* and a reload of what that wrote back puts the 'ok' back no more than the first did */
                const r2=reload(r.key);
                chk(!r2.err&&r2.req===0&&!r2.ESPN_OUT[g0.id]&&!inLive(r2.ESPN_LIVE,g0.id)&&same(r2.lines[g0.id],post.lines[g0.id]),
                  `${g0.id} kept with an 'ok' read whose player lines were dropped: a second reload, of what the first wrote back, put the 'ok' or player lines back, or not its game lines: ${JSON.stringify(r2.ESPN_OUT[g0.id]||null)}; ${why(r2)}`); } });

            /* two presses in one load, then a reload (fix 2 of 16 October 2026: a reload put back only the last
               scoreboard read). From the page as a load finds it: the week's press, then one on g0's page whose
               scoreboard has no money line for g0 and its spread and total moved (new numbers, prices and ids).
               The page then shows g0's money lines from the first read and its spread and total from the second,
               with every id each read gave or found dated by that read: the key must hold exactly that (worked out
               here from the two scoreboards and the paid pull as the press found it), and a reload, with no
               request, put back every game's lines, ls and lat, ESPN_GL, PAY.dk (ids, event, glat), ESPN_IDAT and
               the player lines exactly as right after the two presses. The page is put back after (backToPost) */
            await kcase(`two presses in one load`,async()=>{
            { const ev0=evOfG(g0), ev1=clone(ev0), od1=ev1.competitions[0].odds.find(x=>String(x.provider.id)==='100'), run0=clone(F('ESPN_RUN')), route0=net.route;
              const relink=(c,tag)=>{ c.link={href:String(c.link.href).replace(/0AU(\d+)/,tag+'$1')}; };
              /* the first read's money lines moved off the published ones (g0's were set to the made-up read's
                 above), so a reload that loses them shows on the page's lines and not on the key alone */
              for(const s of ['home','away']){ const c=od1.moneyline[s].close, v=F('espnAmerican')(c.odds); od1.moneyline[s].close={...c,odds:fA(v<0?v-10:v+10)}; relink(od1.moneyline[s].close,'0AW'); }
              const ev2=clone(ev1), od2=ev2.competitions[0].odds.find(x=>String(x.provider.id)==='100');
              delete od2.moneyline;
              { const n=F('espnLineNum')(od2.pointSpread.away.close.line)-1;
                od2.pointSpread.away.close={...od2.pointSpread.away.close,line:fL(n),odds:'-112'}; od2.pointSpread.home.close={...od2.pointSpread.home.close,line:fL(n===0?0:-n),odds:'-108'};
                const t2=F('espnLineNum')(od2.total.over.close.line)+1;
                od2.total.over.close={...od2.total.over.close,line:'o'+t2,odds:'-108'}; od2.total.under.close={...od2.total.under.close,line:'u'+t2,odds:'-112'};
                for(const c of [od2.pointSpread.away.close,od2.pointSpread.home.close,od2.total.over.close,od2.total.under.close]) relink(c,'0AV'); }
              const o1=ESPN.oddsOf(ev1,g0), o2=ESPN.oddsOf(ev2,g0);
              let snap=null, kept2=null, err2=null;
              try{ toLoad(); LS.removeItem(KK);
                net.route=u=>/\/scoreboard\?/.test(u)?{code:200,body:{events:evs.map(e=>e===ev0?ev1:e)}}:route0(u);
                await F('espnRefresh')(); const tA=(F('ESPN_GL')[g0.id]||{}).at;
                await sleep(5);
                net.route=u=>/\/scoreboard\?/.test(u)?{code:200,body:{events:evs.map(e=>e===ev0?ev2:e)}}:route0(u);
                await F('espnRefresh')(g0.id); net.route=route0;
                snap={lines:Object.fromEntries(games.map(g=>[g.id,linesOf(g)])),GL:canon(F('ESPN_GL')),dk:canon(P().dk),IA:canon(F('ESPN_IDAT')),LIVE:canon(F('ESPN_LIVE')),tA,tB:(F('ESPN_GL')[g0.id]||{}).at};
                kept2=lsGet(); }
              catch(e){ err2=String(e&&e.stack||e); }
              finally{ net.route=route0; setVar('ESPN_RUN',run0); backToPost(); }
              const want=o1&&o2?{...o1.lines,...o2.lines}:null, sh=snap&&snap.lines[g0.id];
              const pubG0=(post.ESPN_GL[g0.id]||{}).orig||post.lines[g0.id]||{}, moved=!!o1&&!!o2&&o1.lines.mla!==pubG0.mla&&o1.lines.mlh!==pubG0.mlh&&!('mla' in o2.lines)&&!('mlh' in o2.lines)&&o2.lines.sp!==o1.lines.sp&&o2.lines.tot!==o1.lines.tot&&o2.lines.spa!=null&&o2.lines.tov!=null;
              chk(!err2&&!!snap&&moved&&snap.tB>snap.tA&&NUM8.every(k=>sh[k]===want[k])&&sh.ls==='dk'&&Date.parse(sh.lat)===snap.tB,
                `two presses in one load (the week's, then ${g0.id}'s page with no money line and its spread and total moved): the page does not show the first read's money lines and the second's spread and total: ${err2?err2.split('\n')[0]:JSON.stringify(sh)} against ${JSON.stringify(want)}`);
              if(snap&&want){ const e2=(((parse(kept2)||{}).games)||{})[g0.id], paid=(((dkPre||{})[wk]||{})[g0.id])||{}, wIds={}, wIdat={};
                for(const [o,t] of [[o1,snap.tA],[o2,snap.tB]]) for(const [k,v] of Object.entries(o.ids)) if(paid[k]==null||paid[k]===v){ wIds[k]=v; wIdat[k]=t; }
                const wGlat=glValid(paid.glat)?(typeof paid.glat==='string'?paid.glat:null):(Object.keys(wIds).length?iso(snap.tA):null);
                /* (round 5) each field with its own read's time: the money lines the first read's, the rest the second's */
                const wD=simReads(pubG0,[{lines:o1.lines,at:snap.tA},{lines:o2.lines,at:snap.tB}],Date.parse(pubG0.lat||'')||Date.parse(P().baked_at||'')||0).d;
                chk(!!e2&&!!e2.gl&&canon(vals(wD))===canon(want)&&wD.mla[1]===snap.tA&&wD.sp[1]===snap.tB&&canon(e2.gl.lines)===canon(wD)&&canon(e2.gl.ids)===canon(wIds)&&canon(e2.gl.idat)===canon(wIdat)&&e2.gl.at===snap.tB&&e2.gl.glat===wGlat&&e2.gl.event===evKept(paid.event,o1.event,o2.event),
                  `after two presses in one load, ${KK} keeps ${g0.id}'s game lines otherwise than the page shows them (the first read's money lines, the second's spread and total, each with its own read's time), or not every id each read gave or found at its own read's time: ${JSON.stringify(e2&&e2.gl)} against ${JSON.stringify({lines:wD,ids:wIds,idat:wIdat,glat:wGlat,event:evKept(paid.event,o1.event,o2.event)})}`);
                const r=reload(kept2,null,o=>{ o.GL=canon(F('ESPN_GL')); o.IA=canon(F('ESPN_IDAT')); o.dkc=canon(P().dk); o.LIVE=canon(F('ESPN_LIVE')); });
                const bad=games.filter(g=>!same(r.lines[g.id],snap.lines[g.id]));
                chk(!r.err&&r.req===0&&!bad.length,`after two presses in one load, a reload did not put back ${bad.length?bad.map(g=>g.id).join(', '):'every game'}'s lines, ls and lat as the presses left them, with no request: ${bad.slice(0,2).map(g=>JSON.stringify(r.lines[g.id])+' against '+JSON.stringify(snap.lines[g.id])).join('; ')} ${why(r)}`);
                chk(!r.err&&r.GL===snap.GL,`after two presses in one load, a reload did not put back ESPN_GL (each game's published lines and its read's time) as the presses left it: ${String(r.GL).slice(0,200)} against ${snap.GL.slice(0,200)}`);
                chk(!r.err&&r.dkc===snap.dk&&r.IA===snap.IA,`after two presses in one load, a reload did not put back PAY.dk (ids, event, glat) and ESPN_IDAT as the presses left them: ${canon(JSON.parse(r.dkc||'null')&&JSON.parse(r.dkc)[wk]&&JSON.parse(r.dkc)[wk][g0.id]).slice(0,200)} ${String(r.IA).slice(0,200)} against ${canon(JSON.parse(snap.dk)&&JSON.parse(snap.dk)[wk]&&JSON.parse(snap.dk)[wk][g0.id]).slice(0,200)} ${snap.IA.slice(0,200)}`);
                chk(!r.err&&r.LIVE===snap.LIVE,`after two presses in one load, a reload did not put back the player lines as the presses left them: ${String(r.LIVE).slice(0,160)} against ${snap.LIVE.slice(0,160)}`); } }
            });

            /* two reads of g0's scoreboard in one load, from the page as a load finds it, each through g0's own page
               (that game alone); plant() runs on the load first and again on the reload, so the published lines the
               reads were taken over are the ones the reload finds. What the page shows after both (look() too), what
               it kept, and a reload of that, with no request */
            const odOf=e=>e.competitions[0].odds.find(x=>String(x.provider.id)==='100');
            const twoReads=async(ev1,ev2,plant,look)=>{ const ev0=evOfG(g0), out={err:null};
              try{ toLoad(); LS.removeItem(KK); if(plant) plant(); out.pub=linesOf(g0); out.dkPub=clone(((P().dk||{})[wk]||{})[g0.id]||null);
                for(const [i,ev] of [ev1,ev2].entries()){ net.route=u=>/\/scoreboard\?/.test(u)?{code:200,body:{events:evs.map(e=>e===ev0?ev:e)}}:route0g(u);
                  if(i) await sleep(5); await F('espnRefresh')(g0.id); out['t'+i]=(F('ESPN_GL')[g0.id]||{}).at; }
                net.route=route0g; drop(); out.lines=linesOf(g0); out.dk=clone(((P().dk||{})[wk]||{})[g0.id]||null); out.GL0=clone(F('ESPN_GL')[g0.id]||null); if(look) out.look=look(); out.kept=lsGet(); }
              catch(e){ out.err=String(e&&e.stack||e); }
              finally{ net.route=route0g; setVar('ESPN_RUN',clone(run0g)); backToPost(); }
              if(!out.err) out.r=reload(out.kept,plant?()=>{ plant(); return null; }:null,o=>{ drop(); o.dkG=clone(((P().dk||{})[wk]||{})[g0.id]||null); o.GL0=clone(F('ESPN_GL')[g0.id]||null); if(look) o.look=look(); },'a reload after two reads in one load');
              return out; };
            /* A. (round 3 of 16 October 2026: a reload put the kept game lines back through espnApplyGame's merge, which
               keeps a published price where the number comes back to the published one). The first read moves g0's
               spread off the published number, with its prices; the second brings it back to the published number with
               no prices, so the page shows that number with spa and sph gone (espnApplyGame: a number read without its
               prices drops the old ones, unless unmoved since the last read). A reload must show exactly that: no
               published price back, ls 'dk', lat the second read's time, and the spread bets priced as after the
               reads (none: a team bet needs a book price). Then the same on its own for the total (tov and tou gone, the
               total legs at the estimated -110 and an even chance). The published prices are planted on the load
               (spa -108, sph -112, tov -104, tou -116), so a week whose game has none still shows the difference */
            const legsNow=()=>({ats:F('pricedLegs')([g0]).filter(l=>l.stat==='ats').map(l=>[l.key,l.k,l.price,l.src,+l.p.toFixed(9)]),
              tot:['over','under'].map(sd=>{ const l=F('totalLeg')(g0,sd); return l?[l.k,l.price,l.src,+l.p.toFixed(9)]:null; })});
            for(const kind of ['spread','total']) await kcase(`two reads in one load, the second bringing ${g0.id}'s ${kind} back to the published number with no prices`,async()=>{
              const PUB={spa:-108,sph:-112,tov:-104,tou:-116}, ks=kind==='spread'?['spa','sph']:['tov','tou'], plant=()=>{ for(const k of ks) g0[k]=PUB[k]; };
              toLoad(); const pubN=kind==='spread'?g0.sp:g0.tot; backToPost();
              const ev1=clone(evOfG(g0)), ev2=clone(evOfG(g0)), d1=odOf(ev1), d2=odOf(ev2);
              if(kind==='spread'){ const n1=pubN-1;
                d1.pointSpread.away.close={...d1.pointSpread.away.close,line:fL(n1),odds:'-125'}; d1.pointSpread.home.close={...d1.pointSpread.home.close,line:fL(n1===0?0:-n1),odds:'+105'};
                d2.pointSpread.away.close={...d2.pointSpread.away.close,line:fL(pubN)}; d2.pointSpread.home.close={...d2.pointSpread.home.close,line:fL(pubN===0?0:-pubN)};
                delete d2.pointSpread.away.close.odds; delete d2.pointSpread.home.close.odds; }
              else { d1.total.over.close={...d1.total.over.close,line:'o'+(pubN+1),odds:'-125'}; d1.total.under.close={...d1.total.under.close,line:'u'+(pubN+1),odds:'+105'};
                d2.total.over.close={...d2.total.over.close,line:'o'+pubN}; d2.total.under.close={...d2.total.under.close,line:'u'+pubN};
                delete d2.total.over.close.odds; delete d2.total.under.close.odds; }
              const o1=ESPN.oddsOf(ev1,g0).lines, o2=ESPN.oddsOf(ev2,g0).lines, nk=kind==='spread'?'sp':'tot';
              const made=isFinite(pubN)&&o1[nk]!==pubN&&ks.every(k=>typeof o1[k]==='number')&&o2[nk]===pubN&&ks.every(k=>!(k in o2));
              const t=await twoReads(ev1,ev2,plant,legsNow), sh=t.lines||{};
              chk(!t.err&&made&&t.t1>t.t0&&sh[nk]===pubN&&ks.every(k=>sh[k]===undefined)&&sh.ls==='dk'&&Date.parse(sh.lat)===t.t1,
                `two reads in one load, the second bringing ${g0.id}'s ${kind} back to the published ${pubN} with no prices: the page does not show that number with ${ks.join(' and ')} gone, ls 'dk' and the second read's time: ${t.err?t.err.split('\n')[0]:JSON.stringify(sh)} (published ${JSON.stringify(t.pub)}; reads ${JSON.stringify(o1)} then ${JSON.stringify(o2)})`);
              const lw=t.look||{}, r=t.r||{err:'no reload'}, rl=r.lines?r.lines[g0.id]||{}:{};
              chk(kind==='spread'?!!lw.ats&&lw.ats.length===0:!!lw.tot&&lw.tot.every(l=>!!l&&l[1]===F('TOTAL_EST')&&l[2]==='est'&&Math.abs(l[3]-0.5)<1e-9),
                `two reads in one load leaving ${g0.id}'s ${kind} at the published number with no prices: its bets are not priced as a number with no book price (${kind==='spread'?'no spread bet':'the total at an estimated '+F('TOTAL_EST')+' and an even chance'}): ${JSON.stringify(lw)}`);
              chk(!r.err&&r.req===0&&same(rl,t.lines)&&ks.every(k=>rl[k]===undefined)&&!ks.some(k=>Object.values(rl).includes(PUB[k]))&&rl.ls==='dk'&&Date.parse(rl.lat)===t.t1,
                `after two reads in one load left ${g0.id}'s ${kind} at the published number with no prices, a reload shows its lines otherwise (a published price back, or not ls 'dk' at the second read's time): ${JSON.stringify(rl)} against ${JSON.stringify(t.lines)}; ${why(r)}`);
              chk(!r.err&&canon(r.look)===canon(t.look),`after two reads in one load left ${g0.id}'s ${kind} at the published number with no prices, a reload prices its bets otherwise than the page did after the reads: ${JSON.stringify(r.look)} against ${JSON.stringify(t.look)}`);
              /* (round 4) what is kept is what the reads did (d), worked out here from the two scoreboards on the published
                 lines (simReads): every field the reads set with its value, and the number's two prices null, dropped by the second; ESPN_GL's d
                 the same; and a reload over the same publish puts ESPN_GL back exactly as the reads left it */
              { const e=(((parse(t.kept)||{}).games)||{})[g0.id], sim=t.pub?simReads(t.pub,[{lines:o1,at:t.t0},{lines:o2,at:t.t1}],Date.parse(t.pub.lat||'')||Date.parse(P().baked_at||'')||0):null;
                chk(!t.err&&!!sim&&!!e&&!!e.gl&&canon(e.gl.lines)===canon(sim.d)&&!!t.GL0&&canon(t.GL0.d)===canon(sim.d)&&ks.every(k=>!!sim.d[k]&&sim.d[k][0]===null&&sim.d[k][1]===t.t1)&&canon(t.lines)===canon(sim.lines),
                  `two reads in one load, the second bringing ${g0.id}'s ${kind} back to the published number with no prices: ${KK} keeps its game lines otherwise than what the reads did (each field set with its value, ${ks.join(' and ')} null), or ESPN_GL's d does: ${JSON.stringify(e&&e.gl&&e.gl.lines)} / d ${JSON.stringify(t.GL0&&t.GL0.d)} against ${JSON.stringify(sim&&sim.d)}`);
                chk(!r.err&&!!t.GL0&&canon(r.GL0)===canon(t.GL0),`after two reads in one load left ${g0.id}'s ${kind} at the published number with no prices, a reload over the same publish did not put ESPN_GL back as the reads left it (the published lines, the read's time, d): ${String(JSON.stringify(r.GL0)).slice(0,240)} against ${String(JSON.stringify(t.GL0)).slice(0,240)}`);
                /* (round 5) the kept null price pair over a newer publish (its pull before both reads, the bake after): on that
                   same number with its own prices, the newer publish's real prices stand (a read of the number without
                   prices leaves them); on another number, they are dropped */
                if(sim&&!t.err) for(const [lab2,n2] of [['on that same number',pubN],['on another number',pubN+1]]){
                  const rP=reload(t.kept,()=>{ plant(); g0[nk]=n2; g0[ks[0]]=-120; g0[ks[1]]=100; g0.ls='dk'; g0.lat=iso(t.t0-1000); setBk(t.t1+1000); return null; },null,'a reload over a newer publish');
                  const wantP=rP.pub?replay(rP.pub[g0.id],sim.d,t.t0-1000,false):null, LP=(rP.lines||{})[g0.id]||{};
                  chk(!rP.err&&rP.req===0&&!!wantP&&canon(LP)===canon(wantP)&&LP[nk]===pubN&&(n2===pubN?LP[ks[0]]===-120&&LP[ks[1]]===100:ks.every(k=>LP[k]===undefined))&&LP.ls==='dk'&&Date.parse(LP.lat)===t.t1,
                    `${g0.id}'s kept read of its ${kind} back at ${pubN} with its two prices dropped, over a newer publish ${lab2} with its own prices (its pull before both reads): ${n2===pubN?'the newer publish\'s real prices did not stand':'its prices were not dropped'}: ${JSON.stringify(LP)} against ${JSON.stringify(wantP)}; ${why(rP)}`); } } });
            /* B. (round 3: the kept event was the latest read's, where the page uses the first). g0 with no event from the
               paid pull (taken out of the load's copy), read twice with two DraftKings event ids in its bet links: the
               page takes the first read's (espnApplyGame sets it only where the game has none) and keeps it, and a
               reload puts back that event, PAY.dk's entry as the page had it after the reads */
            await kcase(`a game read twice with two DraftKings event ids, on a game the paid pull gave none`,async()=>{
              const E1='81000001', E2='82000002', ev1=clone(evOfG(g0)), ev2=clone(evOfG(g0));
              const reEv=(ev,id)=>{ const od=odOf(ev); for(const m of ['moneyline','pointSpread','total']) for(const sd of Object.keys(od[m]||{})){ const c=od[m][sd]&&od[m][sd].close; if(c&&c.link) c.link={href:String(c.link.href).replace(/event%2F\d+/,'event%2F'+id)}; } };
              reEv(ev1,E1); reEv(ev2,E2);
              const plant=()=>{ const E=((P().dk||{})[wk]||{})[g0.id]; if(E) delete E.event; };
              const t=await twoReads(ev1,ev2,plant), a=ESPN.oddsOf(ev1,g0), b=ESPN.oddsOf(ev2,g0), e=(((parse(t.kept)||{}).games)||{})[g0.id], r=t.r||{err:'no reload'};
              chk(!t.err&&a.event===E1&&b.event===E2&&!(t.dkPub&&t.dkPub.event)&&!!t.dk&&t.dk.event===E1,
                `${g0.id}, with no event from the paid pull and read twice with the events ${E1} then ${E2}: the page does not use the first read's: ${t.err?t.err.split('\n')[0]:JSON.stringify(t.dk&&t.dk.event)} (the reads give ${a.event}, ${b.event})`);
              chk(!!e&&!!e.gl&&e.gl.event===E1,`${g0.id} read twice with the events ${E1} then ${E2}: ${KK} keeps the event ${JSON.stringify(e&&e.gl&&e.gl.event)}, not the page's ${E1}`);
              chk(!r.err&&r.req===0&&!!r.dkG&&r.dkG.event===E1&&canon(r.dkG)===canon(t.dk),
                `after a reload, ${g0.id}'s DraftKings entry is not the one the page used after reading it twice (the event ${E1}, the first read's): ${JSON.stringify(r.dkG)} against ${JSON.stringify(t.dk)}; ${why(r)}`); });

            /* a read the press left off (fix 3 of 16 October 2026: one was kept and put back on a reload). g0 as a
               game with no DraftKings lines of its own (a planted copy: its ls and lat taken out, so the published
               lines date from the bake), pressed on its page with the page's clock an hour before PAY.baked_at:
               the read is older than the published lines, so the press leaves them (no ESPN_GL entry) and keeps no
               lines for g0 (gl.lines {}); a reload on the same publish puts none back, the ids the read gave or
               found standing as the press left them. The page and its clock are put back after */
            await kcase(`a read the press left off`,async()=>{
            { const run0=clone(F('ESPN_RUN')), tBk=Date.parse(P().baked_at), plant=()=>{ delete g0.ls; delete g0.lat; };
              if(!isFinite(tBk)) W.coverage(false,'the payload has no baked_at: a read older than the published lines went untested');
              else { let snap=null, kept3=null, err3=null;
                try{ toLoad(); LS.removeItem(KK); plant(); const pub=linesOf(g0);
                  setClock(Math.min(tBk,clock0.call(w.Date))-3600e3); net.log=[];
                  await F('espnRefresh')(g0.id); w.Date.now=clock0;
                  snap={pub,lines:linesOf(g0),GL:!!F('ESPN_GL')[g0.id],dk:canon((((P().dk||{})[wk])||{})[g0.id]||null),IA:canon(F('ESPN_IDAT')[g0.id]||null),n:net.log.filter(x=>/\/scoreboard\?/.test(x.url)).length};
                  kept3=lsGet(); }
                catch(e){ err3=String(e&&e.stack||e); }
                finally{ w.Date.now=clock0; setVar('ESPN_RUN',run0); backToPost(); }
                const e3=(((parse(kept3)||{}).games)||{})[g0.id];
                chk(!err3&&!!snap&&snap.n===1&&!snap.GL&&same(snap.lines,snap.pub),`a press whose read is older than ${g0.id}'s published lines (the page's clock before the bake, the game with no DraftKings lines of its own) applied its lines: ${err3?err3.split('\n')[0]:JSON.stringify(snap&&snap.lines)} against ${JSON.stringify(snap&&snap.pub)}`);
                chk(!!e3&&!!e3.gl&&canon(e3.gl.lines)==='{}',`a read the press left off (older than ${g0.id}'s published lines) is kept with game lines to put back: ${JSON.stringify(e3&&e3.gl)}`);
                const r=reload(kept3,()=>{ plant(); return null; });
                chk(!r.err&&r.req===0&&!!snap&&same(r.lines[g0.id],r.pub[g0.id])&&!r.ESPN_GL[g0.id]&&dkOf(r.dk,g0.id)===snap.dk&&canon(r.ESPN_IDAT[g0.id]||null)===snap.IA,
                  `a reload put back game lines of a read the press left off (older than ${g0.id}'s published lines), or not the ids it gave or found as the press left them: ${JSON.stringify(r.lines[g0.id])} against ${JSON.stringify(r.pub[g0.id])}; ${why(r)}`); } }
            });

            /* (round 4 of 16 October 2026) a press of g0's page alone, its scoreboard event evX (and propsR for g0's
               player lines, else the press's own), from the page as a load finds it with plant() on the published lines
               first: the lines the press found and left, ESPN_GL's entry, what it found and read, what it kept, and P1's
               player-price hash; the page put back after (the reloads are the case's own) */
            const pressG0=async(evX,plant,propsR)=>{ const ev0=evOfG(g0), out={err:null};
              try{ toLoad(); LS.removeItem(KK); if(plant) plant(); out.pub=linesOf(g0); out.pubAt=Date.parse(g0.lat||'')||Date.parse(P().baked_at||'')||0;
                net.route=u=>{ if(/\/scoreboard\?/.test(u)) return {code:200,body:{events:evs.map(e=>e===ev0?evX:e)}};
                  const p=props(u); if(propsR&&p&&p.eid===String(evX.id)) return propsR(u); return route0g(u); };
                await F('espnRefresh')(g0.id); net.route=route0g;
                out.t=(F('ESPN_GL')[g0.id]||{}).at; out.lines=linesOf(g0); out.GL=clone(F('ESPN_GL')[g0.id]||null); out.OUT=clone(F('ESPN_OUT')[g0.id]||null);
                out.LIVE=clone((F('ESPN_LIVE')[wk]||{})[g0.id]||null); out.kept=lsGet(); out.e=(((parse(out.kept)||{}).games)||{})[g0.id]||null; out.ps=plSigOf(g0.id); }
              catch(e){ out.err=String(e&&e.stack||e); }
              finally{ net.route=route0g; setVar('ESPN_RUN',clone(run0g)); backToPost(); }
              return out; };
            /* the read's game lines at a moved spread (one off the published number) with its prices, or at the published
               number with none, and no money line: the scoreboard's DraftKings odds on a copy of g0's event */
            const evLines=(sp,spPrices)=>{ const ev=clone(evOfG(g0)), od=odOf(ev); delete od.moneyline;
              od.pointSpread.away.close={...od.pointSpread.away.close,line:fL(sp)}; od.pointSpread.home.close={...od.pointSpread.home.close,line:fL(sp===0?0:-sp)};
              if(spPrices){ od.pointSpread.away.close.odds='-125'; od.pointSpread.home.close.odds='+105'; } else { delete od.pointSpread.away.close.odds; delete od.pointSpread.home.close.odds; }
              return ev; };
            /* D4. the kept d replayed over a newer publish. (i) A read with no money line and the spread one off the
               published number with its prices: d holds the six it set (worked out here, simReads) and no money line; over a
               newer publish whose money lines and total moved, its DraftKings pull earlier than the read (the bake later),
               the money lines are the newer publish's and the six the read's. (ii) A read of the spread at the published
               number with no prices and no money line: d holds the number and no price, so over the same publish the
               published prices stand exactly as after the read; over a newer publish whose spread moved, its own two prices
               are dropped, as a read of that number without them does. The published spread prices are planted (spa -108,
               sph -112), so a week whose game has none still shows them */
            await kcase(`a kept read's d replayed over a newer publish`,async()=>{
              const PUB={spa:-108,sph:-112}, plantP=()=>{ Object.assign(g0,PUB); };
              toLoad(); const pubN=g0.sp; backToPost();
              if(!(typeof pubN==='number'&&isFinite(pubN))){ W.coverage(false,`${g0.id} has no published spread: a kept d replayed over a newer publish went untested`); return; }
              { const ev=evLines(pubN-1,true), o=ESPN.oddsOf(ev,g0).lines, t=await pressG0(ev,plantP);
                const sim=t.err?null:simReads(t.pub,[{lines:o,at:t.t}],t.pubAt);
                chk(!t.err&&!!sim&&isFinite(t.t)&&!('mla' in o)&&!('mlh' in o)&&!!t.e&&!!t.e.gl&&canon(t.e.gl.lines)===canon(sim.d)&&!!t.GL&&canon(t.GL.d)===canon(sim.d)&&canon(t.lines)===canon(sim.lines)&&!('mla' in sim.d)&&Object.values(sim.d).every(x=>x[1]===t.t),
                  `a read of ${g0.id} with no money line and its spread moved: ${KK} keeps its game lines otherwise than what the read did (each field it set, no money line), or ESPN_GL's d does, or the page shows otherwise: ${t.err?t.err.split('\n')[0]:JSON.stringify(t.e&&t.e.gl&&t.e.gl.lines)} / d ${JSON.stringify(t.GL&&t.GL.d)} against ${JSON.stringify(sim&&sim.d)}`);
                if(!t.err&&t.e&&t.e.gl){
                  const r=reload(t.kept,()=>{ plantP(); bump(g0,'mla',-7); bump(g0,'mlh',7); bump(g0,'tot',2); g0.ls='dk'; g0.lat=iso(t.t-1000); setBk(t.t+1000); return null; },null,'a reload over a newer publish');
                  const want=r.pub?replay(r.pub[g0.id],sim.d,t.t-1000,false):null, L=(r.lines||{})[g0.id]||{};
                  chk(!r.err&&r.req===0&&!!want&&canon(L)===canon(want)&&L.mla===r.pub[g0.id].mla&&L.mlh===r.pub[g0.id].mlh&&Object.keys(sim.d).every(k=>sim.d[k][0]===null?L[k]===undefined:L[k]===sim.d[k][0])&&L.ls==='dk'&&Date.parse(L.lat)===t.t,
                    `${g0.id}'s kept read with no money line, over a newer publish moving its money lines and total (its pull earlier than the read): the money lines are not the newer publish's and every field the read set the read's: ${JSON.stringify(L)} against ${JSON.stringify(want)}; ${why(r)}`); } }
              { const ev=evLines(pubN,false), o=ESPN.oddsOf(ev,g0).lines, t=await pressG0(ev,plantP);
                const sim=t.err?null:simReads(t.pub,[{lines:o,at:t.t}],t.pubAt);
                chk(!t.err&&!!sim&&o.sp===pubN&&!('spa' in o)&&!!t.e&&!!t.e.gl&&canon(t.e.gl.lines)===canon(sim.d)&&!('spa' in sim.d)&&!('sph' in sim.d)&&!!sim.d.sp&&sim.d.sp[0]===pubN&&sim.d.sp[1]===t.t&&t.lines.spa===PUB.spa&&t.lines.sph===PUB.sph,
                  `a read of ${g0.id}'s spread at the published number with no prices: ${KK} keeps otherwise than the number alone, or the page does not keep the published prices: ${t.err?t.err.split('\n')[0]:JSON.stringify(t.e&&t.e.gl&&t.e.gl.lines)} against ${JSON.stringify(sim&&sim.d)}; shown ${JSON.stringify(t.lines)}`);
                if(!t.err&&t.e&&t.e.gl){
                  const r1=reload(t.kept,()=>{ plantP(); return null; },o2=>{ o2.GL0=clone(F('ESPN_GL')[g0.id]||null); },'a reload over the same publish');
                  chk(!r1.err&&r1.req===0&&same((r1.lines||{})[g0.id],t.lines)&&canon(r1.GL0)===canon(t.GL),
                    `${g0.id}'s kept read of its spread at the published number with no prices, over the same publish: a reload does not show exactly what the read left (the published prices standing), or ESPN_GL otherwise: ${JSON.stringify((r1.lines||{})[g0.id])} against ${JSON.stringify(t.lines)}; ESPN_GL ${String(JSON.stringify(r1.GL0)).slice(0,200)} against ${String(JSON.stringify(t.GL)).slice(0,200)}; ${why(r1)}`);
                  const r2=reload(t.kept,()=>{ plantP(); g0.sp=pubN+1; g0.spa=-120; g0.sph=100; g0.ls='dk'; g0.lat=iso(t.t-1000); setBk(t.t+1000); return null; },null,'a reload over a newer publish');
                  const want=r2.pub?replay(r2.pub[g0.id],sim.d,t.t-1000,false):null, L=(r2.lines||{})[g0.id]||{};
                  chk(!r2.err&&r2.req===0&&!!want&&canon(L)===canon(want)&&L.sp===pubN&&L.spa===undefined&&L.sph===undefined,
                    `${g0.id}'s kept read of its spread at the published number with no prices, over a newer publish whose spread moved (its pull earlier than the read): the newer publish's spread prices are kept beside the read's number: ${JSON.stringify(L)} against ${JSON.stringify(want)}; ${why(r2)}`);
                  /* (round 5) and over a newer publish on that same number with its own prices: they stand, as a read of the
                     number without prices leaves them */
                  const r3=reload(t.kept,()=>{ plantP(); g0.sp=pubN; g0.spa=-120; g0.sph=100; g0.ls='dk'; g0.lat=iso(t.t-1000); setBk(t.t+1000); return null; },null,'a reload over a newer publish');
                  const want3=r3.pub?replay(r3.pub[g0.id],sim.d,t.t-1000,false):null, L3=(r3.lines||{})[g0.id]||{};
                  chk(!r3.err&&r3.req===0&&!!want3&&canon(L3)===canon(want3)&&L3.sp===pubN&&L3.spa===-120&&L3.sph===100&&L3.ls==='dk'&&Date.parse(L3.lat)===t.t,
                    `${g0.id}'s kept read of its spread at the published number with no prices, over a newer publish on that same number with its own prices (its pull earlier than the read): the newer publish's real prices did not stand: ${JSON.stringify(L3)} against ${JSON.stringify(want3)}; ${why(r3)}`); } }
            });
            /* D5. a read over a publish whose lines are not DraftKings' (no ls or lat: the bake is their only time), then the
               same lines rebaked later than the read: the read stands exactly as the press left it (a rebake with the same
               lines never sets a read aside, so the bake's time is not the one to beat over the publish it was read over) */
            await kcase(`a read over lines that are not DraftKings', the same lines rebaked later`,async()=>{
              const plantN=()=>{ delete g0.ls; delete g0.lat; }, t=await pressG0(clone(evOfG(g0)),()=>{ plantN(); setBk(w.Date.now()-3600e3); });
              const sim=t.err?null:simReads(t.pub,[{lines:ESPN.oddsOf(evOfG(g0),g0).lines,at:t.t}],t.pubAt);
              chk(!t.err&&!!t.GL&&!!t.e&&!!t.e.gl&&canon(t.e.gl.lines)===canon(sim.d)&&Object.keys(sim.d).length>0,
                `a press of ${g0.id} over lines that are not DraftKings' did not apply and keep its read: ${t.err?t.err.split('\n')[0]:JSON.stringify(t.e&&t.e.gl)}`);
              if(t.err||!t.e||!t.e.gl) return;
              const r=reload(t.kept,()=>{ plantN(); setBk(Math.max(t.t,t.LIVE?Date.parse(t.LIVE.at):0,t.OUT?t.OUT.when:0)+3600e3); return null; },o=>{ o.GL0=clone(F('ESPN_GL')[g0.id]||null); },'a reload rebaked later');
              chk(!r.err&&r.req===0&&same((r.lines||{})[g0.id],t.lines)&&canon(r.GL0)===canon(t.GL)&&!(r.ESPN_ASIDE||{})[g0.id]&&canon(((r.ESPN_LIVE||{})[wk]||{})[g0.id]||null)===canon(t.LIVE),
                `${g0.id}'s kept read over lines that are not DraftKings', the same lines rebaked later than the read: it did not stand exactly as the press left it: ${JSON.stringify((r.lines||{})[g0.id])} against ${JSON.stringify(t.lines)}; ${why(r)}`);
            });
            /* D6. a press that found no player lines posted for g0 (its props 404) and read no game lines (no DraftKings odds
               on its scoreboard event): the entry the page keeps is what it found alone ({w, out 'none', plsig}: plsig P1's
               own hash, worked out here), and a reload puts back what it found (ESPN_OUT 'none'), writes it back, and the
               status line and the Parlay Builder's empty levels (players only, g0 alone, no book price on file) say
               DraftKings had posted none when Refresh odds last read them. Then the same with the paid pull's time later
               than that read: set aside, nothing put back or written back, and g0's status line says it gave way */
            await kcase(`a kept read that found no player lines posted, with no game lines read`,async()=>{
              const evN=clone(evOfG(g0)); evN.competitions[0].odds=[];
              const t=await pressG0(evN,null,()=>({code:404,body:{error:{message:'No propBets found',code:404}}})), e=t.e;
              chk(!t.err&&!!t.OUT&&t.OUT.st==='none'&&!t.GL&&!t.LIVE&&!!e&&e.w===wk&&!e.gl&&!e.pl&&!!e.out&&e.out.st==='none'&&e.out.when===t.OUT.when&&e.plsig===t.ps,
                `a press that found no player lines posted for ${g0.id} and read no game lines did not keep what it found alone, over P1's player prices: ${t.err?t.err.split('\n')[0]:JSON.stringify(e)} (ESPN_OUT ${JSON.stringify(t.OUT)})`);
              if(t.err||!e) return;
              const look=o=>{ o.st0=F('espnStatus')(g0.id);
                const keepO=JSON.stringify(S.odds||{}), keepU=JSON.stringify(S.ui.pb);
                try{ if(S.odds) delete S.odds[g0.id]; delete P().mkt[wk];
                  for(const k of ['ml','ats','total','over','under']) S.ui.pb.k[k]=k==='over'||k==='under'; S.ui.pb.off=games.filter(g=>g!==g0).map(g=>g.id); drop();
                  const rN=F('getPbTiers')(); o.pb={espn:!!rN.espnRead,none:!!rN.noPlayerPrices,empty:rN.tiers.every(x=>!x.legs),why:rN.tiers.map(x=>x.why)}; }
                finally{ S.odds=JSON.parse(keepO); S.ui.pb=JSON.parse(keepU); putMkt(); drop(); } };
              const r=reload(t.kept,null,look,'a reload of a read that found no player lines');
              const want={st:'none',why:e.out.why,sb:false,when:e.out.when};
              chk(!r.err&&r.req===0&&r.n>=1&&canon(r.ESPN_OUT[g0.id]||null)===canon(want)&&!inLive(r.ESPN_LIVE,g0.id)&&!r.ESPN_GL[g0.id]&&!!r.ESPN_KEPT[g0.id]&&!(r.ESPN_ASIDE||{})[g0.id]&&canon(r.kg[g0.id]||null)===canon(e),
                `${g0.id} kept as a read that found no player lines posted: a reload did not put back what it found (ESPN_OUT 'none') and write it back as kept: ESPN_OUT ${JSON.stringify(r.ESPN_OUT[g0.id]||null)}, written ${JSON.stringify(r.kg[g0.id]||null)}; ${why(r)}`);
              chk(!r.err&&!!r.pb&&r.pb.espn&&r.pb.none&&r.pb.empty,`${g0.id} kept as a read that found no player lines posted: after a reload the Parlay Builder (players only, ${g0.id} alone, no book price) does not stand on that read, or has a level: ${JSON.stringify(r.pb)}`);
              W.wording(/ · no player lines yet\./.test(r.st0||''),`after a reload of ${g0.id}'s read that found no player lines, its status line reads "${r.st0}"`);
              W.wording(!!r.pb&&r.pb.why.every(x=>/^No player lines yet \(read [^)]+ ET\)\.$/.test(x||'')),`after a reload of ${g0.id}'s read that found no player lines, the empty levels read: ${r.pb?r.pb.why.join(' / '):'(none)'}`);
              const rA=reload(t.kept,()=>{ atSet(e.out.when+1000); setBk(e.out.when-1000); return null; },o=>{ o.st0=F('espnStatus')(g0.id); },'a reload with a newer pull');
              chk(!rA.err&&rA.req===0&&!rA.ESPN_OUT[g0.id]&&!rA.ESPN_KEPT[g0.id]&&!(g0.id in rA.kg)&&!!rA.ESPN_ASIDE[g0.id]&&rA.ESPN_ASIDE[g0.id].pl===e.out.when&&goneIs(rA,g0.id,['pl'],{pl:e.out.when}),
                `${g0.id} kept as a read that found no player lines, the paid pull's time later than that read: a reload put it back or wrote it back, or ESPN_ASIDE and ESPN_KEEP_GONE do not name its player half at its time: ${why(rA)}`);
              W.wording(/newer prices published since your read(?! of)/.test(rA.st0||''),`${g0.id}'s read that found no player lines, set aside by a newer pull: its status line reads "${rA.st0}"`);
            });
            /* D7. a stored game id not of the schedule's shape (ESPN_KEEP_GID: four digits, two, two or three capitals
               twice): "__proto__", "constructor", "toString", "hasOwnProperty", g0's id in lower case and with a part
               more. Each planted as a game of the schedule too (a copy of g0 under that id, so the shape alone keeps it
               out) beside g0's kept entry: skipped by the restore and dropped by the write, never an own key of
               ESPN_KEPT, ESPN_ASIDE, ESPN_KEEP_GONE, ESPN_LIVE's week, ESPN_GL, ESPN_OUT, ESPN_IDAT or PAY.dk's week,
               none of them on another prototype, nothing set on the page's built-ins, every real game put back, and the
               key written back as the press kept it */
            await kcase(`a kept entry under a game id not of the schedule's shape`,async()=>{
              const e0=kv&&kv.games&&kv.games[g0.id]; if(!e0){ W.coverage(false,`the press kept no read of ${g0.id}: game ids not of the schedule's shape went untested`); return; }
              const BAD=['__proto__','constructor','toString','hasOwnProperty',g0.id.toLowerCase(),g0.id+'_X'];
              const v=clone(kv); BAD.forEach((b,i)=>{ v.games['AUDITBADGID'+i]=clone(e0); });
              let raw=JSON.stringify(v); BAD.forEach((b,i)=>{ raw=raw.split(JSON.stringify('AUDITBADGID'+i)).join(JSON.stringify(b)); });
              const own=(x,k)=>!!x&&typeof x==='object'&&Object.prototype.hasOwnProperty.call(x,k), plain=x=>!!x&&typeof x==='object'&&[w.Object.prototype,Object.prototype].includes(Object.getPrototypeOf(x));
              const r=reload(raw,()=>{ const sch=S.sched; S.sched=[...sch,...BAD.map(id=>({...clone(g0),id}))]; return ()=>{ S.sched=sch; }; },o=>{
                const H=[['ESPN_KEPT',o.ESPN_KEPT],['ESPN_ASIDE',o.ESPN_ASIDE],['ESPN_KEEP_GONE',F('ESPN_KEEP_GONE')],['ESPN_LIVE['+wk+']',o.ESPN_LIVE[wk]||{}],['ESPN_GL',o.ESPN_GL],['ESPN_OUT',o.ESPN_OUT],['ESPN_IDAT',o.ESPN_IDAT],['PAY.dk['+wk+']',((P().dk||{})[wk])||{}]];
                o.hit=[]; for(const [n,x] of H){ if(!plain(x)) o.hit.push(n+' on another prototype'); for(const b of BAD) if(own(x,b)) o.hit.push(n+'['+JSON.stringify(b)+']'); } },'a reload with game ids not of the schedule\'s shape');
              const inKey=BAD.filter(b=>own(r.kg,b));
              chk(!r.err&&r.req===0&&r.n===read.length&&!!r.hit&&!r.hit.length&&!r.proto.length&&!inKey.length&&canon(r.kg)===canon(keptBackAll(kv&&kv.games))&&canon(r.ESPN_LIVE)===canon(post.ESPN_LIVE),
                `kept entries under game ids not of the schedule's shape (${BAD.join(', ')}), each a game of the schedule: put back or written back (${[...(r.hit||[]),...inKey.map(b=>'the key\'s '+b)].join(', ')||'none'}), or set ${r.proto.join(', ')||'nothing'} on the built-ins, or the real games not put back and written back as kept: ${why(r)}`);
            });
            /* 4. the write's merge, on an ESPN_KEPT of its own: another tab's newer read of another game,
               written between two of this tab's writes, survives the next; a later read of the same game
               wins, from storage or from this tab, and an older one gives way; one another tab wrote dated two
               hours after the page's clock (fix 4) loses to a real read here. And where one side wins, a half it
               lacks is taken from the other (fix 5 of 16 October 2026): this tab's newer read of the game lines
               alone keeps the other tab's player lines, with their plsig and what that read found, and the other
               tab's newer one keeps this tab's; an entry this load set aside (ESPN_KEEP_GONE) lends nothing, in
               either half. Each entry is planted as the page writes one after its own reading of another tab's
               (espnKeptGame: idat {} and glat null beside the ids, the player lines' ids sorted, out's four
               fields), so what is written is held whole against the halves it must hold. Until 16 October 2026
               the planted entries lacked idat and glat and two of these failed on the page's own reading of them */
            await kcase(`the write's merge of two tabs`,async()=>{
            { const T=w.Date.now(), gO=games.find(g=>g!==g0)||S.sched.find(g=>g!==g0&&!F('gameStarted')(g)&&!F('hasScore')(g))||null;
              const ent=(g,at,ml)=>({w:String(g.w),gl:{at,lines:{mla:[ml,at]},ids:{},idat:{},glat:null,event:null,sig:'audit'}});
              const plOf=(at,pid)=>({at:iso(at),lines:{[pid]:{receiving_yards:50.5}},rungs:{[pid]:{receiving_yards:[40,60]}},td:[pid]}), outOf=at=>({st:'ok',why:'',sb:false,when:at});
              const got=()=>(parse(lsGet())||{}).games||null, put=(gid,e)=>{ const v=parse(lsGet())||{v:1,season:SEASON,games:{}}; v.games[gid]=e; v.saved=w.Date.now(); LS.setItem(KK,JSON.stringify(v)); };
              const mine=ent(g0,T-5000,-101);
              try{ setVar('ESPN_KEPT',{[g0.id]:clone(mine)}); setVar('ESPN_KEEP_GONE',{}); setVar('ESPN_KEEP_OFF',false); LS.removeItem(KK);
                F('espnKeepWrite')(); const s1=got();
                chk(!!s1&&same(Object.keys(s1),[g0.id])&&canon(s1[g0.id])===canon(mine),`this tab's kept read was not written as it holds it: ${String(JSON.stringify(s1)).slice(0,200)}`);
                if(gO){ const theirs=ent(gO,T-1000,-102); put(gO.id,theirs); F('espnKeepWrite')(); const s2=got();
                  chk(!!s2&&canon(s2[gO.id])===canon(theirs)&&canon(s2[g0.id])===canon(mine),`another tab's newer read of ${gO.id}, written between two of this tab's writes, did not survive the next: ${String(JSON.stringify(s2)).slice(0,240)}`); }
                else W.coverage(false,'no other game to come on the schedule: another tab\'s read of another game went untested');
                const later=ent(g0,T-100,-103); put(g0.id,later); F('espnKeepWrite')(); const s3=got();
                chk(!!s3&&canon(s3[g0.id])===canon(later),`another tab's later read of ${g0.id} gave way to this tab's older one: ${JSON.stringify(s3&&s3[g0.id])}`);
                const older=ent(g0,T-9000,-104); put(g0.id,older); F('espnKeepWrite')(); const s4=got();
                chk(!!s4&&canon(s4[g0.id])===canon(mine),`another tab's older read of ${g0.id} was kept over this tab's later one: ${JSON.stringify(s4&&s4[g0.id])}`);
                const ahead=ent(g0,T+2*3600e3,-107); put(g0.id,ahead); F('espnKeepWrite')(); const s5=got();
                chk(!!s5&&canon(s5[g0.id])===canon(mine),`another tab's read of ${g0.id} dated two hours after the page's clock won over this tab's real one: ${JSON.stringify(s5&&s5[g0.id])}`);
                /* the fill: each case from an empty key, this tab's entry in ESPN_KEPT and the other tab's in storage */
                const fill=(lab,mineE,theirsE,gone,wantE)=>{ setVar('ESPN_KEPT',{[g0.id]:clone(mineE)}); setVar('ESPN_KEEP_GONE',gone||{}); LS.removeItem(KK); put(g0.id,clone(theirsE));
                  const ok=F('espnKeepWrite')(), s=got();
                  chk(ok===true&&!!s&&canon(s[g0.id])===canon(wantE),`${lab}: ${String(JSON.stringify(s&&s[g0.id])).slice(0,300)} against ${String(JSON.stringify(wantE)).slice(0,300)}`); };
                { const mA={...ent(g0,T-1000,-111),plsig:'audit-mine'}, tA={...ent(g0,T-9000,-112),pl:plOf(T-9000,'00-AUDIT-PLA'),plsig:'audit-theirs',out:outOf(T-9000)};
                  fill(`this tab's newer read of ${g0.id}'s game lines alone, written over another tab's older read of both halves, did not keep the other tab's player lines with their plsig and what that read found`,
                    mA,tA,null,{w:mA.w,gl:mA.gl,pl:tA.pl,plsig:tA.plsig,out:tA.out}); }
                { const tB={...ent(g0,T-1000,-113),plsig:'audit-theirs'}, mB={...ent(g0,T-9000,-114),pl:plOf(T-9000,'00-AUDIT-PLB'),plsig:'audit-mine',out:outOf(T-9000)};
                  fill(`another tab's newer read of ${g0.id}'s game lines alone, written over this tab's older read of both halves, did not keep this tab's player lines with their plsig and what that read found`,
                    mB,tB,null,{w:tB.w,gl:tB.gl,pl:mB.pl,plsig:mB.plsig,out:mB.out}); }
                { const asideE={...ent(g0,T-6000,-116),pl:plOf(T-6000,'00-AUDIT-PLC'),plsig:'audit-aside',out:outOf(T-6000)}, gone={[g0.id]:{gl:T-5000,pl:T-5000}};
                  const mC={...ent(g0,T-1000,-115),plsig:'audit-mine'}, mD={w:String(g0.w),pl:plOf(T-1000,'00-AUDIT-PLD'),plsig:'audit-mine',out:outOf(T-1000)};
                  fill(`another tab's read of ${g0.id} this load set aside lent its player lines to this tab's read of the game lines alone`,mC,asideE,gone,mC);
                  fill(`another tab's read of ${g0.id} this load set aside lent its game lines to this tab's read of the player lines alone`,mD,asideE,gone,mD); }
                /* C. (round 3 of 16 October 2026: the merge took one whole entry a game, the later read's, and only filled the
                   halves it lacked) each half from whichever side read it later. This tab's latest press read g0's game
                   lines and failed its player lines, so its entry keeps the player lines of an earlier press (espnKeepPut
                   leaves them), while the browser holds another tab's newer player-lines read beside older game lines: what
                   is written takes this tab's game lines and the other tab's player lines, with their plsig and what that
                   read found. And the mirror for the game lines. Then a half this load set aside, alone: another tab's
                   player lines read at or before the time ESPN_KEEP_GONE holds for that half are never taken (this tab has
                   none to give), while its game lines, not set aside, are; and the mirror. Planted as the page writes */
                { const mE={...ent(g0,T-1000,-121),pl:plOf(T-9000,'00-AUDIT-PLM'),plsig:'audit-mine',out:outOf(T-9000)}, tE={...ent(g0,T-9000,-122),pl:plOf(T-5000,'00-AUDIT-PLT'),plsig:'audit-theirs',out:outOf(T-5000)};
                  fill(`this tab's newer read of ${g0.id}'s game lines, beside its older player lines, written over another tab's newer player lines: the written entry does not take this tab's game lines and the other tab's player lines with their plsig and what that read found`,
                    mE,tE,null,{w:mE.w,gl:mE.gl,pl:tE.pl,plsig:tE.plsig,out:tE.out});
                  const mF={...ent(g0,T-9000,-123),pl:plOf(T-1000,'00-AUDIT-PLM'),plsig:'audit-mine',out:outOf(T-1000)}, tF={...ent(g0,T-5000,-124),pl:plOf(T-9000,'00-AUDIT-PLT'),plsig:'audit-theirs',out:outOf(T-9000)};
                  fill(`this tab's newer read of ${g0.id}'s player lines, beside its older game lines, written over another tab's newer game lines: the written entry does not take the other tab's game lines and this tab's player lines with their plsig and what that read found`,
                    mF,tF,null,{w:mF.w,gl:tF.gl,pl:mF.pl,plsig:mF.plsig,out:mF.out});
                  const tG={...ent(g0,T-5000,-125),pl:plOf(T-5000,'00-AUDIT-PLT'),plsig:'audit-theirs',out:outOf(T-5000)}, mG={...ent(g0,T-9000,-126),plsig:'audit-mine'}, mH={w:String(g0.w),pl:plOf(T-9000,'00-AUDIT-PLM'),plsig:'audit-mine',out:outOf(T-9000)};
                  fill(`another tab's read of ${g0.id} whose player lines this load set aside (ESPN_KEEP_GONE's pl at their time): the written entry takes them back, or not its newer game lines, not set aside`,
                    mG,tG,{[g0.id]:{pl:T-5000}},{w:mG.w,gl:tG.gl,plsig:mG.plsig});
                  fill(`another tab's read of ${g0.id} whose game lines this load set aside (ESPN_KEEP_GONE's gl at their time): the written entry takes them back, or not its newer player lines, not set aside, with their plsig and what that read found`,
                    mH,tG,{[g0.id]:{gl:T-5000}},{w:mH.w,pl:tG.pl,plsig:tG.plsig,out:tG.out}); }
                /* (round 4 of 16 October 2026) a game-line half with no lines and no ids (its event alone: a read the press
                   left off, with no id) ranks below any with lines, whatever its time: another tab's newer one never
                   displaces this tab's older one with lines, nor this tab's newer one the other tab's. And a later player
                   read that found no player lines posted ('none') keeps the lines the other side read, as one tab keeps its
                   own across presses, with the later read's plsig and what it found; on either side. (round 5) Only where
                   the two were read over the same publish (the same plsig): a block read over another publish is never
                   lent, and the later read's plsig and what it found are written without it */
                { const bare=at=>({w:String(g0.w),gl:{at,lines:{},ids:{},idat:{},glat:null,event:'71234567',sig:'audit-bare'}});
                  const none=at=>({st:'none',why:'DraftKings has posted no player lines for it yet',sb:false,when:at});
                  const mI=ent(g0,T-9000,-131), tI=bare(T-1000);
                  fill(`another tab's newer read of ${g0.id} with no game lines and no ids (its event alone) displaced this tab's older one with lines`,mI,tI,null,{w:mI.w,gl:mI.gl});
                  const mJ=bare(T-1000), tJ=ent(g0,T-9000,-132);
                  fill(`this tab's newer read of ${g0.id} with no game lines and no ids (its event alone) displaced another tab's older one with lines`,mJ,tJ,null,{w:tJ.w,gl:tJ.gl});
                  for(const [ov,sM,sT] of [['over the same publish','audit-same','audit-same'],['over another publish','audit-mine','audit-theirs']]){ const lend=sM===sT;
                    const mK={...ent(g0,T-5000,-133),pl:plOf(T-9000,'00-AUDIT-PLK'),plsig:sM,out:outOf(T-9000)}, tK={w:String(g0.w),out:none(T-1000),plsig:sT};
                    fill(`another tab's newer read of ${g0.id} that found no player lines posted, written over this tab's older read of them ${ov}: the written entry ${lend?'does not keep':'keeps'} this tab's player lines${lend?'':', read over another publish,'} with the newer read's plsig and what it found`,
                      mK,tK,null,{w:mK.w,gl:mK.gl,...(lend?{pl:mK.pl}:{}),plsig:tK.plsig,out:tK.out});
                    const mL={w:String(g0.w),out:none(T-1000),plsig:sM}, tL={...ent(g0,T-5000,-134),pl:plOf(T-9000,'00-AUDIT-PLL'),plsig:sT,out:outOf(T-9000)};
                    fill(`this tab's newer read of ${g0.id} that found no player lines posted, written over another tab's older read of them ${ov}: the written entry ${lend?'does not keep':'keeps'} the other tab's player lines${lend?'':', read over another publish,'} with this tab's plsig and what it found`,
                      mL,tL,null,{w:mL.w,gl:tL.gl,...(lend?{pl:tL.pl}:{}),plsig:mL.plsig,out:mL.out}); } }
              } finally{ for(const n of ['ESPN_KEPT','ESPN_KEEP_GONE','ESPN_KEEP_OFF']) setVar(n,post[n]); try{ if(kept1==null) LS.removeItem(KK); else LS.setItem(KK,kept1); }catch(e){} } }
            });

            /* R5. (round 5 of 16 October 2026) the five changes of the fifth review, each on values made here and worked out
               from the stated rules; every case puts back what it changed (reload, twoReads and kcase put the page back).
               1. Each game-line field by its own read's time. Two reads of g0's page, the first (t1) moving its money lines
                  alone, the second (t2) its spread alone with its prices: kept as each field with its own read's time. Then
                  P2, a newer publish with its own money lines, its DraftKings pull between t1 and t2 and its bake after both
                  (so a rule that read the bake, or the latest read's time for every field, fails): the money lines P2's, the
                  spread t2's with its prices, the total P2's, lat t2, ESPN_GL's d the three fields t2 set and its at t2, and the
                  key written back over P2's hash with them, which a second reload over P2 puts back exactly; with P2's pull
                  before both reads, both stand; after both, the game lines are set aside. Over the same publish, everything
                  exactly as after the reads (and the null price pair the same, above: two reads back to the published number) */
            await kcase(`two reads moving different fields, then a newer publish between them`,async()=>{
              const ev1=clone(evOfG(g0)), ev2=clone(evOfG(g0)), d1=odOf(ev1), d2=odOf(ev2);
              delete d1.pointSpread; delete d1.total;
              for(const sd of ['home','away']){ const c=d1.moneyline[sd].close, v=F('espnAmerican')(c.odds); d1.moneyline[sd].close={...c,odds:fA(v<0?v-10:v+10)}; }
              delete d2.moneyline; delete d2.total;
              { const n=F('espnLineNum')(d2.pointSpread.away.close.line)-1;
                d2.pointSpread.away.close={...d2.pointSpread.away.close,line:fL(n),odds:'-125'}; d2.pointSpread.home.close={...d2.pointSpread.home.close,line:fL(n===0?0:-n),odds:'+105'}; }
              const o1=ESPN.oddsOf(ev1,g0).lines, o2=ESPN.oddsOf(ev2,g0).lines;
              const t=await twoReads(ev1,ev2,null,null), r=t.r||{err:'no reload'}, tA=t.t0, tB=t.t1;
              const made=!t.err&&Object.keys(o1).sort().join()==='mla,mlh'&&Object.keys(o2).sort().join()==='sp,spa,sph'&&o1.mla!==t.pub.mla&&o1.mlh!==t.pub.mlh&&o2.sp!==t.pub.sp&&tB>tA+2;
              const sim=made?simReads(t.pub,[{lines:o1,at:tA},{lines:o2,at:tB}],Date.parse(t.pub.lat||'')||Date.parse(P().baked_at||'')||0):null;
              const e=(((parse(t.kept)||{}).games)||{})[g0.id];
              chk(made&&!!e&&!!e.gl&&canon(e.gl.lines)===canon(sim.d)&&!!e.gl.lines.mla&&e.gl.lines.mla[1]===tA&&!!e.gl.lines.sp&&e.gl.lines.sp[1]===tB&&e.gl.at===tB&&!!t.GL0&&canon(t.GL0.d)===canon(sim.d)&&canon(t.lines)===canon(sim.lines),
                `two reads of ${g0.id}, the first moving its money lines alone and the second its spread alone with its prices: ${KK} does not keep each field with its own read's time, or the page does not show both: ${t.err?t.err.split('\n')[0]:JSON.stringify(e&&e.gl)} against ${JSON.stringify(sim&&sim.d)}; shown ${JSON.stringify(t.lines)}`);
              chk(!r.err&&r.req===0&&!!r.lines&&same(r.lines[g0.id],t.lines)&&!!r.GL0&&canon(r.GL0)===canon(t.GL0)&&!!r.kg[g0.id]&&canon(r.kg[g0.id].gl)===canon(e&&e.gl),
                `two reads of ${g0.id} moving different fields: a reload over the same publish did not put back exactly what the page showed after them (its lines, ESPN_GL, the key): ${JSON.stringify((r.lines||{})[g0.id])} against ${JSON.stringify(t.lines)}; ${why(r)}`);
              if(!made||!e||!e.gl) return;
              const P2=lat=>()=>{ bump(g0,'mla',-7); bump(g0,'mlh',7); g0.ls='dk'; g0.lat=iso(lat); setBk(tB+1000); return null; };
              const look=o=>{ o.GL0=clone(F('ESPN_GL')[g0.id]||null); };
              for(const [lab,lat] of [['between the two reads',Math.floor((tA+tB)/2)],['before both reads',tA-1000],['after both reads',tB+1000]]){
                const rP=reload(t.kept,P2(lat),look,'a reload over a newer publish'), pub=rP.pub&&rP.pub[g0.id]||{}, L=(rP.lines||{})[g0.id]||{}, kg=(rP.kg||{})[g0.id], RD=replayD(pub,e.gl.lines,lat,false);
                const nm=`${g0.id}'s two reads (money lines at t1, spread at t2) over a newer publish with its own money lines, its DraftKings pull ${lab}`;
                if(lat>tB){ chk(!rP.err&&rP.req===0&&same(L,pub)&&!rP.GL0&&!!rP.ESPN_ASIDE[g0.id]&&rP.ESPN_ASIDE[g0.id].gl===tB&&!(kg&&kg.gl),
                    `${nm}: the game lines were not set aside whole (nothing of them, ESPN_ASIDE naming them at t2, none written back): ${JSON.stringify(L)}; ${why(rP)}`); continue; }
                const ml=lat<tA?o1:pub;
                chk(!rP.err&&rP.req===0&&pub.mla!==o1.mla&&pub.mla!==t.pub.mla&&L.mla===ml.mla&&L.mlh===ml.mlh&&L.sp===o2.sp&&L.spa===o2.spa&&L.sph===o2.sph&&L.tot===pub.tot&&L.tov===pub.tov&&L.tou===pub.tou&&L.ls==='dk'&&Date.parse(L.lat)===tB&&canon(L)===canon(RD.lines),
                  `${nm}: the money lines are not ${lat<tA?'the first read\'s':'the newer publish\'s'}, or the spread not the second read's with its prices, or the total not the newer publish's, or lat not t2: ${JSON.stringify(L)} against ${JSON.stringify(RD.lines)}; ${why(rP)}`);
                chk(!rP.err&&!!rP.GL0&&canon(rP.GL0.orig)===canon(pub)&&rP.GL0.at===tB&&RD.at===tB&&canon(rP.GL0.d)===canon(RD.D)&&Object.keys(RD.D).length===(lat<tA?5:3),
                  `${nm}: ESPN_GL is not the newer publish's lines with the fields read after it (${lat<tA?'all five':'the second read\'s three'}) and t2: ${String(JSON.stringify(rP.GL0)).slice(0,300)} against d ${JSON.stringify(RD.D)}`);
                chk(!!kg&&!!kg.gl&&kg.gl.sig===glSigOf(pub)&&canon(kg.gl.lines)===canon(RD.D)&&kg.gl.at===RD.at,
                  `${nm}: the key written back does not hold the fields that stand, each at its own read's time, over the newer publish's hash (${glSigOf(pub)}, worked out here): ${String(JSON.stringify(kg&&kg.gl)).slice(0,300)}`);
                if(lat>tA){ const r2=reload(rP.key,P2(lat),look,'a second reload over the newer publish');
                  chk(!r2.err&&r2.req===0&&same((r2.lines||{})[g0.id],L)&&canon(r2.GL0)===canon(rP.GL0),
                    `${nm}: a second reload over it, of what the first wrote back, does not show the same: ${JSON.stringify((r2.lines||{})[g0.id])} against ${JSON.stringify(L)}; ${why(r2)}`); } }
            });
            /* 3. carried through. A write judges only the games this tab has its own entry for, on this tab's schedule: a
               game it has nothing of its own for, or one its schedule no longer offers (kicked off there, scored there, not
               on it), is the browser's copy carried as it stands (less a half this load set aside), even beside a newer read
               of this tab's own. A copy of the schedule is planted here with gS's kickoff two days back (or a score), and a
               game id of the schedule's shape no game has (gA). And each load's restore prunes the copy on the publish it
               loads: an entry for gA, or for gS kicked off on that publish, is set aside whole (both halves in
               ESPN_KEEP_GONE at their times), nothing of it put back or written back, every other game put back */
            await kcase(`a kept read of a game this tab's schedule no longer offers`,async()=>{
              /* gS another game the press read, else g0 itself (a Monday with one game left: rule (b), the case stands on
                 the row there is, with no warning) */
              const gS=read.find(g=>g!==g0)||g0, gA=g0.id.slice(0,8)+'AUA_AUB';
              chk(F('ESPN_KEEP_GID').test(gA)&&!S.sched.some(x=>x.id===gA),`the audit's made-up game id ${gA} is not of the schedule's shape or is a game of it`);
              const T=w.Date.now(), day=iso(T-2*86400e3).slice(0,10);
              const ent=(gid,at,ml,pid)=>({w:wk,gl:{at,lines:{mla:[ml,at]},ids:{},idat:{},glat:null,event:null,sig:'audit'},pl:{at:iso(at),lines:{[pid]:{receiving_yards:50.5}},rungs:{},td:[]},plsig:'audit',out:{st:'ok',why:'',sb:false,when:at}});
              const got=()=>(parse(lsGet())||{}).games||{};
              const sch0=S.sched, schWith=f=>S.sched.map(g=>g.id===gS.id?f({...g}):g);
              const write=(lab,sched,mine,theirs,gone,gid,want)=>{
                try{ S.sched=sched; setVar('ESPN_KEPT',mine); setVar('ESPN_KEEP_GONE',gone||{}); setVar('ESPN_KEEP_OFF',false);
                  LS.setItem(KK,JSON.stringify({v:1,season:SEASON,saved:T,games:theirs})); const ok=F('espnKeepWrite')(), s=got();
                  chk(ok===true&&canon(s[gid]||null)===canon(want),`${lab}: the write left ${gid} as ${String(JSON.stringify(s[gid]||null)).slice(0,260)}, not ${String(JSON.stringify(want)).slice(0,260)}`); }
                finally{ S.sched=sch0; } };
              try{
                const theirs=ent(gS.id,T-9000,-142,'00-AUDIT-CT'), mineS=ent(gS.id,T-1000,-141,'00-AUDIT-CM');
                write(`another tab's read of ${gS.id}, kicked off on this tab's schedule (planted two days back), beside this tab's newer read of it`,schWith(g=>{ g.d=day; g.t='13:00'; return g; }),{[gS.id]:clone(mineS)},{[gS.id]:clone(theirs)},null,gS.id,theirs);
                write(`another tab's read of ${gS.id}, scored on this tab's schedule, beside this tab's newer read of it`,schWith(g=>{ g.hs=24; g.as=17; return g; }),{[gS.id]:clone(mineS)},{[gS.id]:clone(theirs)},null,gS.id,theirs);
                const tA2=ent(gA,T-9000,-143,'00-AUDIT-CA');
                write(`another tab's read of ${gA}, a game this tab's schedule does not have, with nothing of this tab's own`,sch0,{},{[gA]:clone(tA2)},null,gA,tA2);
                write(`another tab's read of ${gA}, a game this tab's schedule does not have, beside a newer read of this tab's own`,sch0,{[gA]:clone(ent(gA,T-1000,-144,'00-AUDIT-CB'))},{[gA]:clone(tA2)},null,gA,tA2);
                { const want={...clone(tA2)}; delete want.gl;
                  write(`another tab's read of ${gA}, a game this tab's schedule does not have, its game lines set aside by this load`,sch0,{},{[gA]:clone(tA2)},{[gA]:{gl:T-9000}},gA,want); }
                /* and beside them, this tab's own read of g0 judged as before: it stands over an older copy */
                write(`this tab's newer read of ${g0.id} beside another tab's read of a game this tab's schedule does not have`,sch0,{[g0.id]:clone(ent(g0.id,T-1000,-145,'00-AUDIT-CC'))},{[g0.id]:clone(ent(g0.id,T-9000,-146,'00-AUDIT-CD')),[gA]:clone(tA2)},null,g0.id,ent(g0.id,T-1000,-145,'00-AUDIT-CC'));
              } finally{ S.sched=sch0; for(const n of ['ESPN_KEPT','ESPN_KEEP_GONE','ESPN_KEEP_OFF']) setVar(n,post[n]); try{ if(kept1==null) LS.removeItem(KK); else LS.setItem(KK,kept1); }catch(e){} }
              /* the restore's pruning, from the press's own kept read */
              const eS=kv&&kv.games&&kv.games[gS.id], aS=atOf(eS);
              { const v=clone(kv); v.games[gA]={...clone(kv.games[g0.id])}; const aA=atOf(v.games[gA]);
                const r=reload(JSON.stringify(v),null,null,'a reload with a kept read of a game not on the publish');
                const bad=read.filter(g=>!same(r.lines[g.id],post.lines[g.id]));
                chk(!r.err&&r.req===0&&r.n===read.length&&!(gA in r.kg)&&!r.ESPN_KEPT[gA]&&!inLive(r.ESPN_LIVE,gA)&&!r.ESPN_GL[gA]&&!r.ESPN_OUT[gA]&&!bad.length&&canon(r.kg)===canon(keptBackAll(kv.games)),
                  `a kept read of ${gA}, a game not on the publish the load finds: the restore put or wrote something of it back, or not every game of the schedule as kept: ${bad.map(g=>g.id).join(', ')}; ${why(r)}`);
                chk(goneIs(r,gA,['gl','pl'],aA),`a kept read of ${gA}, a game not on the publish: ESPN_KEEP_GONE does not set both its halves aside at their times: ${JSON.stringify(r.GONE[gA]||null)}`); }
              if(eS) for(const [how,f] of [['kicked off on the publish the load finds (its kickoff planted two days back)',g=>{ g.d=day; g.t='13:00'; return g; }],['scored on the publish the load finds',g=>{ g.hs=24; g.as=17; return g; }]]){
                const r=reload(kept1,()=>{ const sch=S.sched; S.sched=schWith(f); return ()=>{ S.sched=sch; }; },o=>{ const c=S.sched.find(x=>x.id===gS.id); o.cS=c?linesOf(c):null; },'a reload with a game '+how);
                const rest=read.filter(g=>g!==gS&&!same(r.lines[g.id],post.lines[g.id]));
                chk(!r.err&&r.req===0&&r.n===read.length-1&&!(gS.id in r.kg)&&!r.ESPN_KEPT[gS.id]&&!inLive(r.ESPN_LIVE,gS.id)&&!r.ESPN_GL[gS.id]&&!r.ESPN_OUT[gS.id]&&!!r.cS&&same(r.cS,r.pub[gS.id])&&!rest.length,
                  `a kept read of ${gS.id}, ${how}: the restore put or wrote something of it back, or not the other games: ${rest.map(g=>g.id).join(', ')}; ${why(r)}`);
                chk(goneIs(r,gS.id,['gl','pl'],aS),`a kept read of ${gS.id}, ${how}: ESPN_KEEP_GONE does not set both its halves aside at their times: ${JSON.stringify(r.GONE[gS.id]||null)}`); }
            });
            /* 4. bounds. A kept player line or rung is one ESPN lists: on a half point, above 0 and at most 1000 (one of
               1e9 held a game page's ladder up), and at most 40 rungs a stat. On g0's kept player lines: a receptions line of
               1e9 on one of its players, 2.3 and -1 on made-up players, 1000 kept beside a receiving yards line of 1000.5
               dropped; a rung of 1e9 added to one of its ladders, and a made-up ladder of 50 rungs: every number off that
               rule dropped, at most 40 rungs kept, each one planted, and the rest of the block put back and written back as
               the press kept it */
            await kcase(`a kept player line or rung ESPN would never list`,async()=>{
              const e0=kv&&kv.games&&kv.games[g0.id], b0=e0&&e0.pl;
              const p1=b0&&Object.keys(b0.lines||{})[0], r1=b0&&Object.keys(b0.rungs||{}).find(p=>Object.keys(b0.rungs[p]||{}).length), s1=r1&&Object.keys(b0.rungs[r1])[0];
              if(!p1||!r1){ W.coverage(false,`the press kept no player lines or ladders for ${g0.id}: the bounds on a kept line went untested`); return; }
              const okL=x=>typeof x==='number'&&isFinite(x)&&x>0&&x<=1000&&Number.isInteger(x*2);
              const v=clone(kv), B=v.games[g0.id].pl, L50=Array.from({length:50},(_,i)=>10+i);
              B.lines[p1]={...B.lines[p1],receptions:1e9}; Object.assign(B.lines,{'00-AUDIT-B2':{receptions:2.3},'00-AUDIT-B3':{receptions:-1},'00-AUDIT-B4':{receptions:1000,receiving_yards:1000.5},'00-AUDIT-B5':{receptions:0}});
              B.rungs[r1]={...B.rungs[r1],[s1]:[...B.rungs[r1][s1],1e9]}; B.rungs['00-AUDIT-B6']={receiving_yards:L50};
              /* what the rule keeps of the planted block, worked out here */
              const wantB=clone(B);
              for(const p of Object.keys(wantB.lines)){ const m=wantB.lines[p]; for(const st of Object.keys(m)) if(!okL(m[st])) delete m[st]; if(!Object.keys(m).length) delete wantB.lines[p]; }
              const r=reload(JSON.stringify(v),null,null,'a reload with player lines off ESPN\'s steps');
              const got=((r.ESPN_LIVE||{})[wk]||{})[g0.id], kgp=((r.kg||{})[g0.id]||{}).pl;
              const linesOk=!!got&&canon(got.lines)===canon(wantB.lines)&&!('receptions' in (got.lines[p1]||{}))&&!got.lines['00-AUDIT-B2']&&!got.lines['00-AUDIT-B3']&&!got.lines['00-AUDIT-B5']&&canon(got.lines['00-AUDIT-B4'])===canon({receptions:1000});
              const g6=got&&got.rungs&&got.rungs['00-AUDIT-B6']&&got.rungs['00-AUDIT-B6'].receiving_yards;
              const rungsOk=!!got&&canon(got.rungs[r1][s1])===canon(b0.rungs[r1][s1])&&Array.isArray(g6)&&g6.length===40&&new Set(g6).size===40&&g6.every(x=>L50.includes(x))
                &&Object.keys(got.rungs).filter(p=>p!=='00-AUDIT-B6').every(p=>canon(got.rungs[p])===canon(b0.rungs[p]))&&Object.keys(got.rungs).length===Object.keys(b0.rungs).length+1;
              chk(!r.err&&r.req===0&&linesOk,`a kept player line off ESPN's steps (1e9, 2.3, -1, 0, 1000.5) was put back, or one on them (1000) or the rest of ${g0.id}'s lines was not: ${JSON.stringify(got&&got.lines['00-AUDIT-B4'])} ${JSON.stringify(got&&got.lines[p1])}; ${why(r)}`);
              chk(!r.err&&rungsOk,`a kept ladder of ${g0.id} with a rung of 1e9, or of 50 rungs, was put back otherwise than ESPN lists (the 1e9 dropped, at most 40 rungs, each one planted), or the rest of its ladders otherwise than kept: ${JSON.stringify(got&&got.rungs[r1])} / ${g6?g6.length:'none'} rungs; ${why(r)}`);
              chk(!!kgp&&canon(kgp.lines)===canon(got&&got.lines)&&canon(kgp.rungs)===canon(got&&got.rungs),`the key written back does not hold ${g0.id}'s player lines as they were put back (the numbers off ESPN's steps dropped): ${String(JSON.stringify(kgp)).slice(0,200)}`);
            });
            /* 5. a read that found no player lines posted says so for a day at most (DK_EST.staleHours, by the page's clock):
               g0 kept with its game lines and a 'none' 23 hours old: put back; 25 hours old: not put back, and not said to have
               given way (the game lines standing, ESPN_ASIDE naming no player half); the same for a 'none' kept alone */
            await kcase(`a kept read that found no player lines posted, a day on`,async()=>{
              const e0=kv&&kv.games&&kv.games[g0.id], SH=F('DK_EST').staleHours;
              if(!(e0&&e0.gl)){ W.coverage(false,`the press kept no game lines for ${g0.id}: a 'none' a day old went untested`); return; }
              chk(SH===24,`DK_EST.staleHours is ${SH}, not the 24 hours the rule states`);
              for(const h of [23,25]) for(const alone of [false,true]){ const now=w.Date.now(), none={st:'none',why:'DraftKings has posted no player lines for it yet',sb:false,when:now-h*3600e3};
                const v=clone(kv); delete v.games[g0.id].pl; v.games[g0.id].out=none; if(alone) delete v.games[g0.id].gl;
                const r=reload(JSON.stringify(v),null,o=>{ o.st0=F('espnStatus')(g0.id); },`a reload of a 'none' ${h} hours old`), a=(r.ESPN_ASIDE||{})[g0.id]||{};
                const lab=`${g0.id} kept ${alone?'as':'with its game lines and'} a read that found no player lines posted ${h} hours before the page's clock`;
                if(h<SH) chk(!r.err&&r.req===0&&canon(r.ESPN_OUT[g0.id]||null)===canon(none)&&!!r.ESPN_KEPT[g0.id]&&(alone||same(r.lines[g0.id],post.lines[g0.id])),
                  `${lab}: a reload did not put it back (ESPN_OUT 'none'${alone?'':', its game lines'}): ${JSON.stringify(r.ESPN_OUT[g0.id]||null)}; ${why(r)}`);
                else chk(!r.err&&r.req===0&&!r.ESPN_OUT[g0.id]&&!('pl' in a)&&(alone?!r.ESPN_KEPT[g0.id]:same(r.lines[g0.id],post.lines[g0.id])&&!!r.ESPN_KEPT[g0.id]),
                  `${lab}: a reload put it back (ESPN_OUT ${JSON.stringify(r.ESPN_OUT[g0.id]||null)}), or set its player half aside as given way to a publish, or ${alone?'kept the game':'not its game lines'}: ${why(r)}`);
                W.wording(h<SH?/ · no player lines yet\b/.test(r.st0||''):!/no player lines yet|newer prices published since/.test(r.st0||''),`${lab}: its status line reads "${r.st0}"`); }
            });
            /* 5. no room to save the visitor's state beside a kept read (the storage stub refusing S's first save,
               the browser's own store too): save() empties the key and saves S on its second try, and the read
               is not written again on this load (ESPN_KEEP_OFF); with no kept read, a refused save is tried once */
            await kcase(`no room to save the visitor's state`,async()=>{
            { const KS=F('KEY'), set0=w.storage.set, si0=w.Storage.prototype.setItem; let refuse=0, tries=0;
              try{ LS.setItem(KK,kept1||JSON.stringify({v:1,season:SEASON,saved:0,games:{}}));
                w.storage.set=async(k,v)=>{ tries++; if(refuse>0) throw new Error('QuotaExceededError (made up by the audit)'); mem=v; return true; };
                w.Storage.prototype.setItem=function(k,v){ if(k===KS&&refuse>0){ refuse--; throw new w.DOMException('made up by the audit','QuotaExceededError'); } return si0.call(this,k,v); };
                refuse=1; tries=0; mem=null; F('save')(); await sleep(500);
                const off=F('ESPN_KEEP_OFF'), left=lsGet(), sv=parse(mem), said=txt(d.getElementById('saveState'));
                chk(tries===2&&left===null&&off===true&&!!sv&&Array.isArray(sv.sched),`with no room to save the visitor's state beside a kept read, save() did not empty ${KK} and save on a second try: ${tries} tries, the key ${left===null?'emptied':'kept'}, ESPN_KEEP_OFF ${off}, S ${sv?'saved':'not saved'}`);
                W.wording(said==='Autosaved',`after the kept read gave way to the visitor's state, the save line reads "${said}"`);
                const wr=F('espnKeepWrite')();
                chk(wr===false&&lsGet()===null,`after the kept read gave way to the visitor's state, it was written again on the same load`);
                setVar('ESPN_KEEP_OFF',false); LS.removeItem(KK); refuse=1; tries=0; F('save')(); await sleep(500);
                chk(tries===1&&F('ESPN_KEEP_OFF')===false,`with no kept read, a save with no room was tried ${tries} times, or turned the keeping off`);
              } finally{ w.storage.set=set0; w.Storage.prototype.setItem=si0; setVar('ESPN_KEEP_OFF',post.ESPN_KEEP_OFF); try{ if(kept1==null) LS.removeItem(KK); else LS.setItem(KK,kept1); }catch(e){}
                F('save')(); await sleep(400); } }
            });
            /* R6. (round 6 of 16 October 2026) the four changes of the sixth review, each on values made here and worked out
               from the stated rules, each in its own guard; every case puts back what it changed (reload and kcase put the
               page back; the builder, the key and the keeping state are put back here, and the save a tick in the builder
               sets off is let run on the builder put back) */
            const legKeyOf=(team,stat)=>stat==='total'?`${g0.id}|game|total`:`${g0.id}|team:${team}|${stat}`;
            /* a builder game leg's own price field, as the rule names it: its team's money line, its team's spread price,
               the over's or the under's total price */
            const fieldOf=l=>l.stat==='ml'?(l.team===g0.h?'mlh':'mla'):(l.stat==='ats'?(l.team===g0.h?'sph':'spa'):(l.side==='under'?'tou':'tov'));
            /* a game leg's price on lines L where no read stands on its field: its own number's price where L has one,
               else the model's estimate (the total's estimated price) */
            const pxOn=(l,L)=>{ const ok=v=>v!=null&&isFinite(v)&&v!==0, home=l.team===g0.h; let px=null;
              if(l.stat==='ml') px=home?L.mlh:L.mla; else if(l.stat==='ats'){ if((home?-L.sp:L.sp)===+l.k) px=home?L.sph:L.spa; } else if(L.tot===+l.k) px=l.side==='under'?L.tou:L.tov;
              return ok(px)?{ml:px,src:'real'}:{ml:l.stat==='total'?F('TOTAL_EST'):F('bookPrice')(l.p),src:'est'}; };
            /* the rule: the price it was added at while its own field stands, set or dropped, among what the reads did (D: the
               fields a restore puts back, worked out by replayD; in a load, what the reads set, simReads), else its price on
               the lines as they then are (L, worked out the same way) */
            const legWant=(l,D,L)=>{ const x=D[fieldOf(l)]; return Array.isArray(x)?{ml:l.price,src:l.src||'est'}:pxOn(l,L); };
            const pxNow=()=>Object.fromEntries(Object.entries(S.parlay||{}).map(([k,l])=>[k,F('legPrice')(l)]));
            /* presses of g0's page in one load, each with its own scoreboard event and a step run after it (a tick in the
               builder), from the page as a load finds it with plant() on the published lines first and an empty builder:
               the published lines, each read's time, what the page shows after, the builder's legs and their prices, and
               what it kept; the builder and the page put back after */
            const pressSteps=async(steps,plant)=>{ const ev0=evOfG(g0), out={err:null,t:[]}, keepP=JSON.stringify(S.parlay||{});
              try{ toLoad(); LS.removeItem(KK); if(plant) plant(); out.pub=linesOf(g0); out.pubAt=Date.parse(g0.lat||'')||Date.parse(P().baked_at||'')||0; S.parlay={};
                for(const [i,s] of steps.entries()){ net.route=u=>/\/scoreboard\?/.test(u)?{code:200,body:{events:evs.map(e=>e===ev0?s.ev:e)}}:route0g(u);
                  if(i) await sleep(5); await F('espnRefresh')(g0.id); out.t.push((F('ESPN_GL')[g0.id]||{}).at); if(s.then) s.then(); }
                net.route=route0g; drop(); out.lines=linesOf(g0); out.GL0=clone(F('ESPN_GL')[g0.id]||null); out.legs=clone(S.parlay); out.px=pxNow(); out.kept=lsGet(); }
              catch(e){ out.err=String(e&&e.stack||e); }
              finally{ net.route=route0g; setVar('ESPN_RUN',clone(run0g)); S.parlay=JSON.parse(keepP); backToPost(); }
              return out; };
            /* a reload of what the presses kept with the builder holding their legs, tw a tweak of the publish (or none) */
            const reloadLegs=(t,tw,lab)=>reload(t.kept,()=>{ const keepP=JSON.stringify(S.parlay||{}); S.parlay=clone(t.legs); const u=tw?tw():null; return ()=>{ if(u) u(); S.parlay=JSON.parse(keepP); }; },
              o=>{ drop(); o.px=pxNow(); o.GL0=clone(F('ESPN_GL')[g0.id]||null); },lab);
            const flushSave=async()=>{ try{ F('save')(); await sleep(400); }catch(e){} };
            const moveMl=d=>{ for(const sd of ['home','away']){ const c=d.moneyline[sd].close, v=F('espnAmerican')(c.odds); d.moneyline[sd].close={...c,odds:fA(v<0?v-10:v+10)}; } };
            const moveSp=(d,priced)=>{ const n=F('espnLineNum')(d.pointSpread.away.close.line)-1;
              d.pointSpread.away.close={...d.pointSpread.away.close,line:fL(n)}; d.pointSpread.home.close={...d.pointSpread.home.close,line:fL(n===0?0:-n)};
              if(priced){ d.pointSpread.away.close.odds='-125'; d.pointSpread.home.close.odds='+105'; } else { delete d.pointSpread.away.close.odds; delete d.pointSpread.home.close.odds; } };
            /* 1. a builder game leg by its own field (espnLegBack): a leg tagged with a read's time (gl) keeps the price it was
                  added at only while its own price field stands, with a value, among what the load's reads did (ESPN_GL's d);
                  until round 6 any read of its game standing kept it, so a reload over a newer publish that put back only
                  some fields kept an older read's price where its line was the publish's. Two reads of g0's page in one load:
                  the first (t1) moving its money lines and its total (one off the published number) with their prices, the
                  second (t2) its spread with its prices and the away team's money line alone (moved again); each team to win
                  and the over ticked after t1, the away team to cover after t2, each at its read's price. In the load all four
                  at those prices; reloaded over the same publish, every field stands and so do they; over a newer publish with
                  its own money lines and total (on the over's number, or on the published one: the over's number moved) and a
                  bake after both reads, its DraftKings pull between them: the fields t2 set stand (the away money line, the
                  spread), so the away team to win and the cover keep their prices (the away team's at t1's price, the one it
                  was added at), the home team to win and the over go to the publish's price on their number (or the estimate
                  where the number moved); its pull before both: all four stand; after both: none, each priced on the
                  publish. And a cover ticked after t1 at the published spread and
                  its published prices (planted), its price then dropped by a later read of the spread at another number with
                  no prices: its field stands as a null, so it is priced on the lines as they are (no price on its number: the
                  model's estimate), in the load and after a reload */
            await kcase(`a builder game leg kept by its own field`,async()=>{
              const kML=legKeyOf(g0.h,'ml'), kMA=legKeyOf(g0.a,'ml'), kT=legKeyOf(null,'total'), kS=legKeyOf(g0.a,'ats');
              try{
                const ev1=clone(evOfG(g0)), ev2=clone(evOfG(g0)), d1=odOf(ev1), d2=odOf(ev2);
                delete d1.pointSpread; moveMl(d1);
                { const T1=F('espnLineNum')(d1.total.over.close.line)+1; d1.total.over.close={...d1.total.over.close,line:'o'+T1,odds:'-104'}; d1.total.under.close={...d1.total.under.close,line:'u'+T1,odds:'-116'}; }
                delete d2.total; moveSp(d2,true);
                /* the second read's money line: the away team's alone, moved again (ESPN's side for each club, by its code) */
                { const sideOf=team=>(ev2.competitions[0].competitors.find(c=>c.team.abbreviation===eab(team))||{}).homeAway;
                  delete d2.moneyline[sideOf(g0.h)]; const c=d2.moneyline[sideOf(g0.a)].close, v=F('espnAmerican')(c.odds); d2.moneyline[sideOf(g0.a)].close={...c,odds:fA(v<0?v-20:v+20)}; }
                const o1=ESPN.oddsOf(ev1,g0).lines, o2=ESPN.oddsOf(ev2,g0).lines;
                const t=await pressSteps([{ev:ev1,then:()=>{ F('toggleLeg')(kML,0,g0,'over',false); F('toggleLeg')(kMA,0,g0,'over',false); F('toggleLeg')(kT,g0.tot,g0,'over',true); }},{ev:ev2,then:()=>{ F('toggleLeg')(kS,g0.sp,g0,'over',false); }}]);
                const [tA,tB]=t.t, L=t.legs||{}, lM=L[kML], lA=L[kMA], lT=L[kT], lS=L[kS], legs3=[lM,lT,lS,lA], keys3=[kML,kT,kS,kMA];
                const made=!t.err&&Object.keys(o1).sort().join()==='mla,mlh,tot,tou,tov'&&Object.keys(o2).sort().join()==='mla,sp,spa,sph'&&o1.mlh!==t.pub.mlh&&o1.mla!==t.pub.mla&&o2.mla!==o1.mla&&o1.tot!==t.pub.tot&&o2.sp!==t.pub.sp&&tB>tA+2
                  &&!!lM&&!!lA&&!!lT&&!!lS&&lM.gl===tA&&lA.gl===tA&&lT.gl===tA&&lS.gl===tB&&lM.price===o1.mlh&&lM.src==='real'&&lA.price===o1.mla&&lA.src==='real'&&lT.price===o1.tov&&lT.src==='real'&&+lT.k===o1.tot&&lS.price===o2.spa&&lS.src==='real'&&+lS.k===o2.sp;
                chk(made,`two reads of ${g0.id} (its money lines and total at t1, its spread with its prices and the away money line at t2), each team to win and the over ticked after t1 and the away team to cover after t2: the legs are not the reads' at their times: ${t.err?t.err.split('\n')[0]:JSON.stringify({o1,o2,t:t.t,legs:legs3.map(l=>l&&[l.stat,l.team,l.side,l.k,l.price,l.src,l.gl])})}`);
                if(!made) return;
                const e=(((parse(t.kept)||{}).games)||{})[g0.id], sim=simReads(t.pub,[{lines:o1,at:tA},{lines:o2,at:tB}],t.pubAt);
                chk(!!sim.d.mla&&sim.d.mla[1]===tB&&!!sim.d.mlh&&sim.d.mlh[1]===tA,`two reads of ${g0.id}: the audit's own reading does not have the away money line at t2 and the home one at t1: ${JSON.stringify(sim.d)}`);
                { const want=legs3.map(l=>legWant(l,sim.d,sim.lines)), got=keys3.map(k=>t.px[k]);
                  chk(want.every((x,i)=>x.ml===legs3[i].price&&x.src==='real')&&got.every((p,i)=>canon(p)===canon(want[i])),`${g0.id}'s builder legs from its two reads, in the load: legPrice gives ${JSON.stringify(got)}, not their add-time prices ${JSON.stringify(want)}`); }
                if(!(e&&e.gl)){ chk(false,`after two reads of ${g0.id} in one load, ${KK} keeps no game lines for it`); return; }
                const P2=(lat,tot2)=>()=>{ bump(g0,'mla',-7); bump(g0,'mlh',7); g0.tot=tot2; g0.tov=-112; g0.tou=-108; g0.ls='dk'; g0.lat=iso(lat); setBk(tB+1000); return null; };
                const runs=[['the same publish',null,null,[true,true,true,true]]];
                for(const [lab,lat,keep] of [['between the two reads',Math.floor((tA+tB)/2),[false,false,true,true]],['before both reads',tA-1000,[true,true,true,true]],['after both reads',tB+1000,[false,false,false,false]]])
                  for(const tot2 of [o1.tot,t.pub.tot]) runs.push([`a newer publish with its own money lines and its total on ${tot2===o1.tot?'the over\'s number':'the published number (the over\'s moved)'}, its DraftKings pull ${lab}`,lat,tot2,keep]);
                for(const [lab,lat,tot2,keep] of runs){
                  const r=reloadLegs(t,lat==null?null:P2(lat,tot2),'a reload with builder legs'), pub=(r.pub||{})[g0.id]||{}, same0=glSigOf(pub)===e.gl.sig;
                  const RD=replayD(pub,e.gl.lines,sinceOf(pub,r.bk,same0),same0), want=legs3.map(l=>legWant(l,RD.D,RD.lines)), got=keys3.map(k=>(r.px||{})[k]);
                  const kept=legs3.map(l=>Array.isArray(RD.D[fieldOf(l)]));
                  const nm=`${g0.id}'s builder legs from two reads (each team to win and the over at t1, the cover at t2), reloaded over ${lab}`;
                  /* the case is the one meant: the fields standing as stated, and where a team to win or the over does not stand,
                     its price the publish's own on its number (the over's moved: the estimate) */
                  chk(same(kept,keep)&&(lat==null?same0:(!same0&&(keep[0]||(want[0].ml===pub.mlh&&want[0].src==='real'&&pub.mlh!==lM.price))
                      &&(keep[3]||(want[3].ml===pub.mla&&want[3].src==='real'&&pub.mla!==lA.price))
                      &&(keep[1]||(tot2===o1.tot?want[1].ml===-112&&want[1].src==='real':want[1].ml===F('TOTAL_EST')&&want[1].src==='est')))),
                    `${nm}: the audit's own rule has the fields standing as ${JSON.stringify(kept)}, not ${JSON.stringify(keep)}, or the publish is not the one planted: d ${JSON.stringify(RD.D)}, the publish ${JSON.stringify(pub)}`);
                  chk(!r.err&&r.req===0&&got.every((p,i)=>canon(p)===canon(want[i])),
                    `${nm}: legPrice gives ${JSON.stringify(got)}, not ${JSON.stringify(want)} (a leg keeps its add-time price only while its own price field stands among what the reads did, else the publish's price on its number, or the estimate); ESPN_GL's d ${JSON.stringify(r.GL0&&r.GL0.d)}; ${why(r)}`); }
                /* its own field standing as a null: a leg added at the published price keeps it when a later read drops
                   that price (the final review of round 6: it fell to the estimate mid-load) */
                { const PUB={spa:-108,sph:-112}, plant=()=>{ Object.assign(g0,PUB); };
                  const e1=clone(evOfG(g0)), e2=clone(evOfG(g0)), c1=odOf(e1), c2=odOf(e2);
                  delete c1.pointSpread; delete c1.total; moveMl(c1); delete c2.moneyline; delete c2.total; moveSp(c2,false);
                  const q1=ESPN.oddsOf(e1,g0).lines, q2=ESPN.oddsOf(e2,g0).lines;
                  const t2=await pressSteps([{ev:e1,then:()=>{ F('toggleLeg')(kS,g0.sp,g0,'over',false); }},{ev:e2}],plant), lS2=(t2.legs||{})[kS], e2k=(((parse(t2.kept)||{}).games)||{})[g0.id];
                  const sim2=t2.err?null:simReads(t2.pub,[{lines:q1,at:t2.t[0]},{lines:q2,at:t2.t[1]}],t2.pubAt);
                  const madeN=!t2.err&&!!lS2&&lS2.gl===t2.t[0]&&lS2.price===PUB.spa&&lS2.src==='real'&&+lS2.k===t2.pub.sp&&q2.sp!=null&&q2.sp!==t2.pub.sp&&!('spa' in q2)&&!('sph' in q2)
                    &&!!sim2&&Array.isArray(sim2.d.spa)&&sim2.d.spa[0]===null&&!!e2k&&!!e2k.gl&&canon(e2k.gl.lines)===canon(sim2.d);
                  chk(madeN,`a cover of ${g0.id} ticked after a first read at the published spread and its price (${PUB.spa}), then a read of the spread at another number with no prices: not the case meant: ${t2.err?t2.err.split('\n')[0]:JSON.stringify({leg:lS2&&[lS2.k,lS2.price,lS2.src,lS2.gl],t:t2.t,q2,kept:e2k&&e2k.gl&&e2k.gl.lines})}`);
                  if(madeN){ const want=legWant(lS2,sim2.d,sim2.lines);
                    chk(want.src==='real'&&want.ml===PUB.spa&&canon(t2.px[kS])===canon(want),`a cover of ${g0.id} whose own price a later read dropped (its spread read at another number with no prices): in the load legPrice gives ${JSON.stringify(t2.px[kS])}, not ${JSON.stringify(want)} (its field stands, as a null: the price it was added at)`);
                    const r=reloadLegs(t2,()=>{ plant(); return null; },'a reload with a cover whose price a read dropped'), pub=(r.pub||{})[g0.id]||{}, RD=replayD(pub,e2k.gl.lines,0,true), wantR=legWant(lS2,RD.D,RD.lines);
                    chk(!r.err&&r.req===0&&glSigOf(pub)===e2k.gl.sig&&wantR.src==='real'&&wantR.ml===PUB.spa&&canon((r.px||{})[kS])===canon(wantR),
                      `a cover of ${g0.id} whose own price a later read dropped, reloaded over the same publish: legPrice gives ${JSON.stringify((r.px||{})[kS])}, not ${JSON.stringify(wantR)}; ESPN_GL's d ${JSON.stringify(r.GL0&&r.GL0.d)}; ${why(r)}`); } }
              } finally{ await flushSave(); }
            });
            /* 2. the write's merge, the player half: the block is the later (by its own read, pl.at) of the two sides' blocks read
                  over the same publish (plsig the later side's); until round 6 a later read that found no player lines kept its
                  tab's older block over a newer one the other tab had stored. On an ESPN_KEPT of this tab's and a stored copy of
                  another tab's, planted as the page writes them: this tab's later 'none' with its own older block, against a
                  stored newer block, keeps the stored block, with this tab's plsig and what it found; the mirror (the stored
                  side's later 'none' with its own older block, this tab's newer block) keeps this tab's; the later side's own
                  block, newer than the other's, stands; and over another publish (the two plsigs differ) the later side keeps
                  its own block and never borrows the other's. The game lines from whichever read them later, as before */
            await kcase(`the write's merge: the later block of the same publish`,async()=>{
              const T=w.Date.now(), glE=(at,ml)=>({at,lines:{mla:[ml,at]},ids:{},idat:{},glat:null,event:null,sig:'audit'});
              const plOf=(at,pid)=>({at:iso(at),lines:{[pid]:{receiving_yards:50.5}},rungs:{[pid]:{receiving_yards:[40,60]}},td:[pid]});
              const okAt=at=>({st:'ok',why:'',sb:false,when:at}), noneAt=at=>({st:'none',why:'DraftKings has posted no player lines for it yet',sb:false,when:at});
              const got=()=>(parse(lsGet())||{}).games||null;
              const fill=(lab,mineE,theirsE,wantE)=>{ setVar('ESPN_KEPT',{[g0.id]:clone(mineE)}); setVar('ESPN_KEEP_GONE',{}); setVar('ESPN_KEEP_OFF',false);
                LS.setItem(KK,JSON.stringify({v:1,season:SEASON,saved:T,games:{[g0.id]:clone(theirsE)}}));
                const ok=F('espnKeepWrite')(), s=got();
                chk(ok===true&&!!s&&canon(s[g0.id]||null)===canon(wantE),`${lab}: the write left ${String(JSON.stringify(s&&s[g0.id])).slice(0,300)}, not ${String(JSON.stringify(wantE)).slice(0,300)}`); };
              try{
                for(const [ov,sM,sT] of [['over the same publish','audit-same','audit-same'],['over another publish','audit-mine','audit-theirs']]){ const one=sM===sT;
                  const mA={w:wk,gl:glE(T-6000,-161),pl:plOf(T-9000,'00-AUDIT-R6M'),plsig:sM,out:noneAt(T-1000)}, tA={w:wk,gl:glE(T-7000,-162),pl:plOf(T-5000,'00-AUDIT-R6T'),plsig:sT,out:okAt(T-5000)};
                  fill(`this tab's later read of ${g0.id} that found no player lines posted, beside its own older block, written over another tab's newer block ${ov}: the written entry does not hold ${one?'the newer block':'this tab\'s own block (the other, read over another publish, is never borrowed)'} with this tab's plsig and what it found`,
                    mA,tA,{w:wk,gl:mA.gl,pl:one?tA.pl:mA.pl,plsig:sM,out:mA.out});
                  const tB={w:wk,gl:glE(T-6000,-163),pl:plOf(T-9000,'00-AUDIT-R6T'),plsig:sT,out:noneAt(T-1000)}, mB={w:wk,gl:glE(T-7000,-164),pl:plOf(T-5000,'00-AUDIT-R6M'),plsig:sM,out:okAt(T-5000)};
                  fill(`another tab's later read of ${g0.id} that found no player lines posted, beside its own older block, written over this tab's newer block ${ov}: the written entry does not hold ${one?'this tab\'s newer block':'the other tab\'s own block (this tab\'s, read over another publish, is never lent)'} with the other tab's plsig and what it found`,
                    mB,tB,{w:wk,gl:tB.gl,pl:one?mB.pl:tB.pl,plsig:sT,out:tB.out});
                  const mC={w:wk,gl:glE(T-6000,-165),pl:plOf(T-2000,'00-AUDIT-R6M'),plsig:sM,out:noneAt(T-1000)}, tC={w:wk,gl:glE(T-7000,-166),pl:plOf(T-5000,'00-AUDIT-R6T'),plsig:sT,out:okAt(T-5000)};
                  fill(`this tab's later read of ${g0.id} that found no player lines posted, beside its own block read after the other tab's ${ov}: the written entry does not hold this tab's own block`,
                    mC,tC,{w:wk,gl:mC.gl,pl:mC.pl,plsig:sM,out:mC.out}); }
              } finally{ for(const n of ['ESPN_KEPT','ESPN_KEEP_GONE','ESPN_KEEP_OFF']) setVar(n,post[n]); try{ if(kept1==null) LS.removeItem(KK); else LS.setItem(KK,kept1); }catch(e){} }
            });
            /* 3. what a reload does not put back is pruned from the key: what a read found, set aside as not put back (an 'ok'
                  whose player lines were dropped, a 'none' a day old), is marked in ESPN_KEEP_GONE (pl, at the half's time) so
                  the write leaves it out; until round 6 it was written back, unshown, until kickoff. g0 kept with an 'ok' whose
                  player lines are dated two hours after the page's clock, and kept with (and as) a 'none' 25 hours old: the key
                  written back, and another tab's copy of the same written over by this load, hold no such out (g0 its game
                  lines alone, or nothing), ESPN_KEEP_GONE holds the player half's time, and nothing says it gave way; a 'none'
                  23 hours old is put back and written back with its plsig */
            await kcase(`what a reload does not put back, pruned from the key`,async()=>{
              const e0=kv&&kv.games&&kv.games[g0.id], SH=F('DK_EST').staleHours;
              if(!(e0&&e0.gl&&e0.pl&&e0.out)){ W.coverage(false,`the press kept no read of ${g0.id} with its game lines, player lines and what it found: the pruning of what a reload does not put back went untested`); return; }
              const glOnly={w:e0.w,gl:e0.gl}, nul=x=>x===undefined?null:x;
              const pruned=(lab,r,wantKg,tPl)=>{ const G=r.GONE[g0.id]||{}, a=(r.ESPN_ASIDE||{})[g0.id]||{};
                chk(!r.err&&r.req===0&&!r.ESPN_OUT[g0.id]&&!inLive(r.ESPN_LIVE,g0.id)&&G.pl===tPl&&!('gl' in G)&&!('pl' in a),
                  `${lab}: a reload put back what the read found or its player lines, or ESPN_KEEP_GONE does not hold the player half at its time (${tPl}) alone, or ESPN_ASIDE says it gave way: ESPN_OUT ${JSON.stringify(r.ESPN_OUT[g0.id]||null)}, ESPN_KEEP_GONE ${JSON.stringify(r.GONE[g0.id]||null)}; ${why(r)}`);
                chk(canon(nul(r.kg[g0.id]))===canon(wantKg)&&r.w2===true&&canon(nul(r.k2[g0.id]))===canon(wantKg),
                  `${lab}: the key written back, or another tab's copy written over by this load, still holds what the read found: ${String(JSON.stringify(nul(r.kg[g0.id]))).slice(0,200)} / ${String(JSON.stringify(nul(r.k2[g0.id]))).slice(0,200)} against ${String(JSON.stringify(wantKg)).slice(0,200)}`); };
              { const v=clone(kv), now=w.Date.now(); v.games[g0.id].pl.at=iso(now+2*3600e3); v.games[g0.id].out={...e0.out,st:'ok'};
                const lab=`${g0.id} kept with an 'ok' read whose player lines were dropped (dated two hours after the page's clock)`;
                pruned(lab,reloadT(JSON.stringify(v),null,null,lab),glOnly,v.games[g0.id].out.when); }
              for(const h of [SH-1,SH+1]) for(const alone of [false,true]){ const now=w.Date.now(), none={st:'none',why:'DraftKings has posted no player lines for it yet',sb:false,when:now-h*3600e3};
                const v=clone(kv); delete v.games[g0.id].pl; v.games[g0.id].out=none; if(alone) delete v.games[g0.id].gl;
                const lab=`${g0.id} kept ${alone?'as':'with its game lines and'} a read that found no player lines posted ${h} hours before the page's clock`;
                const r=reloadT(JSON.stringify(v),null,null,lab);
                if(h<SH){ const want={w:e0.w,...(alone?{}:{gl:e0.gl}),out:none,plsig:r.ps2};
                  chk(!r.err&&r.req===0&&canon(r.ESPN_OUT[g0.id]||null)===canon(none)&&canon(nul(r.kg[g0.id]))===canon(want)&&r.w2===true&&canon(nul(r.k2[g0.id]))===canon(want),
                    `${lab}: a reload did not put it back and write it back with its plsig: ESPN_OUT ${JSON.stringify(r.ESPN_OUT[g0.id]||null)}, written ${String(JSON.stringify(nul(r.kg[g0.id]))).slice(0,200)} against ${String(JSON.stringify(want)).slice(0,200)}; ${why(r)}`); }
                else pruned(lab,r,alone?null:glOnly,none.when); }
            });
            /* 4. a read drops only a price (a number read without its prices), never a money line, spread or total: one kept as
                  [null, its read's time] is not one the page writes, so it is dropped and the published value stands, the rest
                  put back as kept (each of mla, mlh, sp and tot, on g0's kept read over the same publish); a null price pair
                  beside its number is replayed (over the same publish, the two gone and the number as kept; over a newer
                  publish on another number with its own prices, dropped there too). And over a newer publish the lines' lat is
                  the latest field the replay put: g0 kept with its money lines at t1 and its spread's two prices at t2 with no
                  spread number (only the fields a replay can put stand), over a publish pulled before t1: the money lines put,
                  lat t1, ESPN_GL and the load's own entry (ESPN_KEPT) at t1 (what the key then holds is the merge's: the
                  stored copy, its read at t2, ranks over the load's entry); and kept with those two prices alone: nothing
                  put, the published lines as they are and no ESPN_GL entry */
            await kcase(`a money line, spread or total kept as null`,async()=>{
              const e0=kv&&kv.games&&kv.games[g0.id];
              if(!(e0&&e0.gl&&e0.gl.lines&&Array.isArray(e0.gl.lines.sp)&&Array.isArray(e0.gl.lines.tot))){ W.coverage(false,`the press kept no spread and total read for ${g0.id}: a money line, spread or total kept as null went untested`); return; }
              const tA=e0.gl.at, PRICE=new Set(['spa','sph','tov','tou']), own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
              /* what the page keeps of kept lines, by the rule: [a number, or null for a price alone; a time at or before the read's] */
              const keptD=Lk=>Object.fromEntries(NUM8.filter(k=>{ const x=own(Lk,k)?Lk[k]:undefined;
                return Array.isArray(x)&&x.length===2&&(x[0]===null?PRICE.has(k):(typeof x[0]==='number'&&isFinite(x[0])))&&typeof x[1]==='number'&&isFinite(x[1])&&x[1]>0&&x[1]<=tA; }).map(k=>[k,Lk[k]]));
              const look=o=>{ o.GL0=clone(F('ESPN_GL')[g0.id]||null); };
              for(const nk of ['mla','mlh','sp','tot']){ const v=clone(kv); v.games[g0.id].gl.lines[nk]=[null,tA];
                const r=reload(JSON.stringify(v),null,look,`a reload with ${nk} kept as null`), pub=(r.pub||{})[g0.id]||{}, dC=keptD(v.games[g0.id].gl.lines), RD=replayD(pub,dC,0,true), L=(r.lines||{})[g0.id]||{}, kg=(r.kg||{})[g0.id];
                chk(!r.err&&r.req===0&&!(nk in dC)&&typeof pub[nk]==='number'&&L[nk]===pub[nk]&&canon(L)===canon(RD.lines)&&!!r.GL0&&canon(r.GL0.d)===canon(RD.D)&&!!kg&&!!kg.gl&&canon(kg.gl.lines)===canon(RD.D),
                  `${g0.id}'s ${nk} kept as [null, its read's time] (a read drops only a price): a reload over the same publish did not drop it and leave the published ${pub[nk]} standing with the rest put back and written back as kept: ${JSON.stringify(L)} against ${JSON.stringify(RD.lines)}; d ${JSON.stringify(r.GL0&&r.GL0.d)}; ${why(r)}`); }
              for(const [n,a,b] of [['sp','spa','sph'],['tot','tov','tou']]){ const v=clone(kv), Lk=v.games[g0.id].gl.lines; Lk[a]=[null,Lk[n][1]]; Lk[b]=[null,Lk[n][1]]; const dC=keptD(Lk);
                const r=reload(JSON.stringify(v),null,look,`a reload with ${a} and ${b} kept as null`), pub=(r.pub||{})[g0.id]||{}, RD=replayD(pub,dC,0,true), L=(r.lines||{})[g0.id]||{};
                chk(!r.err&&r.req===0&&own(dC,a)&&own(dC,b)&&L[a]===undefined&&L[b]===undefined&&L[n]===Lk[n][0]&&canon(L)===canon(RD.lines)&&!!r.GL0&&canon(r.GL0.d)===canon(RD.D),
                  `${g0.id}'s ${n} kept with its two prices null (a read of the number without them): a reload over the same publish did not replay them (the two gone, ${n} as kept): ${JSON.stringify(L)} against ${JSON.stringify(RD.lines)}; ${why(r)}`);
                const r2=reload(JSON.stringify(v),()=>{ g0[n]=Lk[n][0]+1; g0[a]=-120; g0[b]=100; g0.ls='dk'; g0.lat=iso(tA-1000); setBk(tA+1000); return null; },look,`a reload over a newer publish with ${a} and ${b} kept as null`);
                const pub2=(r2.pub||{})[g0.id]||{}, RD2=replayD(pub2,dC,tA-1000,false), L2=(r2.lines||{})[g0.id]||{};
                chk(!r2.err&&r2.req===0&&glSigOf(pub2)!==e0.gl.sig&&L2[a]===undefined&&L2[b]===undefined&&L2[n]===Lk[n][0]&&canon(L2)===canon(RD2.lines),
                  `${g0.id}'s ${n} kept with its two prices null, over a newer publish on another number with its own prices (pulled before the read): the publish's prices were not dropped beside the kept number: ${JSON.stringify(L2)} against ${JSON.stringify(RD2.lines)}; ${why(r2)}`); }
              { const t1=tA-60e3, P2=()=>{ bump(g0,'tot',1); g0.ls='dk'; g0.lat=iso(t1-1000); setBk(tA+1000); return null; };
                for(const withMl of [true,false]){ const v=clone(kv), G=v.games[g0.id].gl;
                  G.lines={...(withMl?{mla:[-151,t1],mlh:[131,t1]}:{}),spa:[-131,tA],sph:[111,tA]};
                  const r=reload(JSON.stringify(v),P2,look,'a reload over a newer publish, lat the latest field put'), pub=(r.pub||{})[g0.id]||{}, RD=replayD(pub,keptD(G.lines),t1-1000,false), L=(r.lines||{})[g0.id]||{};
                  if(withMl) chk(!r.err&&r.req===0&&glSigOf(pub)!==e0.gl.sig&&RD.at===t1&&canon(L)===canon(RD.lines)&&L.mla===-151&&L.mlh===131&&Date.parse(L.lat)===t1&&!!r.GL0&&r.GL0.at===t1&&canon(r.GL0.d)===canon(RD.D)&&!!r.ESPN_KEPT[g0.id]&&!!r.ESPN_KEPT[g0.id].gl&&r.ESPN_KEPT[g0.id].gl.at===t1,
                    `${g0.id} kept with its money lines at t1 and its spread's two prices alone at t2, over a newer publish pulled before t1: lat is not t1, the latest field the replay put (the two prices with no number put nothing), or ESPN_GL or what the load keeps (ESPN_KEPT) is not at t1: ${JSON.stringify(L)} against ${JSON.stringify(RD.lines)}; ESPN_GL ${String(JSON.stringify(r.GL0)).slice(0,200)}; kept at ${r.ESPN_KEPT[g0.id]&&r.ESPN_KEPT[g0.id].gl&&r.ESPN_KEPT[g0.id].gl.at}; ${why(r)}`);
                  else chk(!r.err&&r.req===0&&RD.at===null&&same(L,pub)&&!r.GL0,
                    `${g0.id} kept with its spread's two prices alone (no number), over a newer publish: a reload put something of its lines back (ls, lat or an ESPN_GL entry) where the replay puts nothing: ${JSON.stringify(L)} against ${JSON.stringify(pub)}; ESPN_GL ${String(JSON.stringify(r.GL0)).slice(0,200)}; ${why(r)}`); } }
            });
            drop(); nKeep=checks-c0; }
          /* the precedence, leg by leg */
          if(A){ const L=M[A.x.pl.id][A.l.stat], mo=F('mainOf')(A.x,g0,A.l.stat), lg=F('pricedLegs')([g0]).filter(l=>l.pid===A.x.pl.id&&l.stat===A.l.stat&&l.main);
            chk(mo&&mo.src==='real'&&lg.length===2&&lg.every(l=>l.src==='real'&&l.k===L.line&&l.price===(l.side==='under'?L.under:L.over)),`${A.x.pl.n}'s ${A.l.stat} line the press read at the paid pull's number does not keep its real price: ${lg.map(l=>l.label+' '+l.price+' '+l.src).join(', ')}`); }
          if(B){ const E=lineOf(B.x.pl.id,B.l.stat), mo=F('mainOf')(B.x,g0,B.l.stat), lg=F('pricedLegs')([g0]).filter(l=>l.pid===B.x.pl.id&&l.stat===B.l.stat&&l.main);
            chk(mo&&mo.src==='dkline'&&mo.was===E+3&&lg.length===2&&lg.every(l=>l.src==='dkline'&&l.k===E&&l.price===ESR.price({...l}).price),`${B.x.pl.n}'s ${B.l.stat} line DraftKings moved since the pull (${E+3} to ${E}) is not the read's, est.: ${lg.map(l=>l.label+' '+l.price+' '+l.src).join(', ')}`);
            S.ui.game=g0.id; S.ui.open={[B.x.pl.id]:true}; F('renderGame')();
            const h=[...d.querySelectorAll('#gameView .statblk h4')].find(e=>e.querySelector(`em.mline`)&&e.closest('.statblk').querySelector(`input[data-leg="${g0.id}|${B.x.pl.id}|${B.l.stat}"]`));
            chk(!!h&&txt(h.querySelector('em.mline'))===`DraftKings line ${E} (was ${E+3})`,`${B.x.pl.n}'s ${B.l.stat} on the game page does not name DraftKings' line ${E} and the paid pull's ${E+3}: ${h?txt(h):'no block'}`);
            S.ui.game=null; F('closeGameModal')(); }
          /* (app v127) a rung the pull priced at +250 is no leg after the press: no ladder bet in pricedLegs or the hands'
             pool (with every leg, as the ids leave them), by the audit's own reading of a ladder (ladderAud) */
          if(C){ const lad=[...F('pricedLegs')([g0]),...F('gameLegPool')(g0,true)].filter(l=>l.pid===C.x.pl.id&&(ladderAud(l)||(l.stat===C.l.stat&&!l.main)));
            chk(!lad.length,`${C.x.pl.n}'s ${Ck}+ ${C.l.stat}, priced by the pull at +250, or another ladder bet of his is a leg after the press: ${lad.map(l=>l.label+' '+l.price+' '+l.src).join(', ')}`); }

          /* every price the page works from the read, on every player, and the page drawing them */
          const leg=(g,x,stat,o)=>({gid:g.id,week:g.w,pid:x.pl.id,stat,team:x.team,opp:x.opp,...o});
          const stands=(g,x,stat)=>ESR.paidStands({gid:g.id,week:g.w,pid:x.pl.id,stat});
          const holdGame=(g,lab)=>{ const pe=F('espnGame')(g.id,g.w), oe=ESR.entry(g.id,g.w); let n=0;
            chk(!!pe===!!oe,`${lab}: the page ${pe?'reads':'does not read'} ${g.id}'s read, and the rule ${oe?'does':'does not'}`);
            if(!oe) return 0;
            const R=F('rosterFor')(g,true);
            for(const tm in R) for(const x of R[tm].players) for(const l of F('statLines')(x)){
              if(l.prob){ const te=F('plEst')(x,g,l,'td',1), own=ESR.price(leg(g,x,'any_td',{k:1,side:'over',main:false})); n++;
                chk(own?te.src==='dkline'&&te.price===own.price&&near(te.fair,own.fair):te.src==='est'&&te.price===F('bookPrice')(l.p),
                  `${lab}: ${x.pl.n}'s anytime touchdown is priced ${te.price} (${te.src}) where the rule says ${own?own.price+', from DraftKings\' line':F('bookPrice')(l.p)+', the model\'s'}`);
                if(own) chk(te.price>=-1000&&te.price<=2000,`${lab}: ${x.pl.n}'s anytime touchdown at ${te.price}, outside -1000 to +2000`);
                continue; }
              if(!stands(g,x,l.stat)){
                const both=['over','under'].map(side=>{ const pd=F('espnPrice')(x,g,l.stat,'main',null,side), own=ESR.price(leg(g,x,l.stat,{side,main:true})); n++;
                  chk(own?(!!pd&&pd.price===own.price&&near(pd.fair,own.fair)&&pd.line===own.line&&pd.tested===own.tested):!pd,
                    `${lab}: ${x.pl.n}'s ${l.stat} main line ${side} is ${pd?pd.price+' on '+pd.line:'not priced'} where the rule says ${own?own.price+' on '+own.line:'none'}`);
                  if(own&&!own.tested) untested[l.stat]=(untested[l.stat]||0)+1;
                  return own&&pd; });
                /* the page's own two prices: one plus the margin between them, inside DraftKings' range */
                if(both[0]&&both[1]){ const m={passing_yards:0.0566,rushing_yards:0.0566,receiving_yards:0.0566,scrim_yards:0.0566,passing_tds:0.0590}[l.stat]||0.0599, sum=imp(both[0].price)+imp(both[1].price);
                  chk(Math.abs(sum-(1+m))<0.004&&both.every(o=>o.price>=-1000&&o.price<=2000),`${lab}: ${x.pl.n}'s ${l.stat} main line's two sides (${both[0].price}, ${both[1].price}) do not sum to one plus its margin ${m} (${sum.toFixed(4)}), or one is outside -1000 to +2000`); } }
              const lad=[];
              for(const r of l.rungs){ const v=F('plEst')(x,g,l,'rung',r.k), own=ESR.price(leg(g,x,l.stat,{k:r.k,side:'over',main:false})); n++;
                chk(own?v.src==='dkline'&&v.price===own.price&&near(v.fair,own.fair)&&v.listed===own.listed&&v.tested===own.tested:v.src==='est'&&v.price===F('rungView')(x.pl,l.stat,l.mu,r.k,g.w).est,
                  `${lab}: ${x.pl.n}'s ${r.k}+ ${l.stat} is priced ${v.price} (${v.src}${v.src==='dkline'?(v.listed?', listed':', not listed'):''}) where the rule says ${own?own.price+(own.listed?', listed':', not listed'):'the model\'s estimate'}`);
                if(own){ chk(v.price>=-1000&&v.price<=2000,`${lab}: ${x.pl.n}'s ${r.k}+ ${l.stat} at ${v.price}, outside -1000 to +2000`); if(!own.tested&&!own.mainOver) untested[l.stat+' rung']=(untested[l.stat+' rung']||0)+1; }
                if(!F('oddsFor')(g.id,x.pl.id,l.stat,r.k)) lad.push({k:r.k,q:imp(v.price)}); }
              lad.sort((a,b)=>a.k-b.k);
              chk(lad.every((y,i)=>!i||y.q<=lad[i-1].q+1e-12),`${lab}: ${x.pl.n}'s ${l.stat} ladder does not fall as it climbs: ${lad.map(y=>y.k+'+ '+(y.q*100).toFixed(1)+'%').join(', ')}`); }
            return n; };
          /* (app v127) the old box's choice to show the ladders (S.ui.showRungs) is planted on, to hold that nothing reads it:
             no rung is drawn whatever the read lists */
          const domGame=(g,lab)=>{ const keepU=JSON.stringify({game:S.ui.game,open:S.ui.open,all:S.ui.showAll}); let n=0;
            try{ const R=F('rosterFor')(g,true), oe=ESR.entry(g.id,g.w);
              S.ui.showAll=true; S.ui.showRungs=true; S.ui.open={}; for(const tm in R) for(const x of R[tm].players) S.ui.open[x.pl.id]=true; S.ui.game=g.id; F('renderGame')();
              const view=d.getElementById('gameView'), st=view.querySelector(`[data-espn-status="${g.id}"]`);
              W.wording(!!st&&(!oe||txt(st).startsWith('DraftKings via ESPN, read ')),`${lab}: the game page's status line does not say when DraftKings' lines were read: ${st?txt(st):'none'}`);
              const estOk=(cell,own,what)=>{ n++;
                chk(!!cell&&cell.textContent===fmt(own.price)+'est.'&&cell.dataset.est==='dkline',`${lab}: ${what} shows "${cell?cell.textContent:'nothing'}" (${cell?cell.dataset.est:''}), not ${fmt(own.price)} est. from DraftKings' line`);
                W.wording(!!cell&&(own.listed?cell.title.startsWith('DraftKings’ line from ESPN, read '):cell.title.startsWith('Not on DraftKings'))&&cell.title.includes(own.tested||!own.listed?(own.listed?'typically within':'our estimate'):'untested'),`${lab}: ${what}'s title does not say what it is priced from: "${cell?cell.title:''}"`); };
              let estLines=0;
              for(const tm in R) for(const x of R[tm].players) for(const l of F('statLines')(x)){
                const key=`${g.id}|${x.pl.id}|${l.prob?'any_td':l.stat}`, row=s=>[...view.querySelectorAll(`input[data-leg="${key}"]${s}`)].map(i=>i.closest('tr')).find(tr=>tr&&!tr.closest('.gsugg'))||null;
                if(l.prob){ const own=ESR.price(leg(g,x,'any_td',{k:1,side:'over',main:false})), tr=row('[data-k="1"]');
                  if(own) estOk(tr&&tr.querySelector('td.num.est'),own,`${x.pl.n}'s anytime touchdown`);
                  else if(tr) chk(tr.querySelector('td.num.est').textContent===fmt(F('bookPrice')(l.p))+'est.',`${lab}: ${x.pl.n}'s anytime touchdown is not shown at the model's estimate`);
                  continue; }
                const real=stands(g,x,l.stat);
                for(const side of ['over','under']){ const tr=row(`[data-main="1"][data-side="${side}"]`), own=real?null:ESR.price(leg(g,x,l.stat,{side,main:true}));
                  if(real) chk(!!tr&&!tr.classList.contains('est-line'),`${lab}: ${x.pl.n}'s ${l.stat} ${side}, DraftKings' price on its current line, is not drawn as the book's`);
                  else if(own){ estLines++; chk(!!tr&&tr.classList.contains('est-line')&&tr.querySelector('.thr').textContent===`${side==='under'?'Under':'Over'} ${own.line}`&&tr.querySelector('td.num.book').textContent==='',`${lab}: ${x.pl.n}'s ${l.stat} ${side} ${own.line} from DraftKings' line is not drawn as its main line`);
                    estOk(tr&&tr.querySelector('td.num.est'),own,`${x.pl.n}'s ${l.stat} ${side} ${own.line}`); }
                  else chk(!tr,`${lab}: ${x.pl.n}'s ${l.stat} has a main line drawn with no line on file or read`); }
                for(const r of l.rungs){ const tr=row(`[data-k="${r.k}"]:not([data-main])`); n++;
                  chk(!tr,`${lab}: ${x.pl.n}'s ${r.k}+ ${l.stat} is drawn as a row on his game page: the site offers no ladder bet`); } }
              chk(view.querySelectorAll('tr.est-line').length===estLines,`${lab}: ${view.querySelectorAll('tr.est-line').length} main-line rows drawn from DraftKings' line where the rule gives ${estLines}`);
            } finally { const k=JSON.parse(keepU); S.ui.game=k.game; S.ui.open=k.open||{}; delete S.ui.showRungs; S.ui.showAll=k.all; F('closeGameModal')(); }
            return n; };
          /* where the page chooses legs: a real price only on its own line while it stands, one from the
             read only of a tested kind DraftKings lists at the rule's price and fair chance, a model-only
             estimate only in a game page's hands and only where no read prices the leg */
          const pickOk=(l,est)=>{ if(isG(l)) return true; const own=ESR.price(l), real=ESR.real(l);
            if(l.src==='real') return !!real&&real.price===l.price&&(!l.main||ESR.paidStands(l));
            if(l.src==='dkline'){ const f=F('legFair')(l), want=own&&(own.kind==='td'?Math.max(0.001,Math.min(0.999,imp(l.price)/ESR.playerVig(l.week))):own.fair);
              return !real&&ESR.takeable(own)&&own.price===l.price&&(!l.main||own.line===+l.k)&&!!f&&f.est===true&&near(f.p,want); }
            return l.src==='est'&&!!est&&(!own||!!real); };
          const holdPicks=(lab,gs)=>{ let n=0; const bad=(what,l)=>`${lab}: ${what} holds ${l.name} ${l.label} at ${l.price} (${l.src})${ESR.price(l)?', which DraftKings\' line on ESPN prices at '+ESR.price(l).price+(ESR.takeable(ESR.price(l))?'':', a kind never suggested'):''}${ESR.real(l)?', and the pull has '+ESR.real(l).price:''}`;
            /* V6's rule for a leg from the read: never on a player the suggestions may not build on */
            for(const l of F('pricedLegs')(gs)){ n++; chk(pickOk(l,false)&&(l.src!=='dkline'||F('suggestable')(l.pid)),bad('the lines the suggestions are built from',l)+(F('suggestable')(l.pid)?'':', a player who may not play')); }
            /* (app v109) wherever the payload carries ids, DraftKings' id at the leg's own line, by the
               audit's own rule: a leg priced from the read has none, so it is never suggested there */
            const idTxt=l=>dkOk(l)?'':', with no DraftKings id at its line for the betslip';
            const pool=F('pbPool')(gs); for(const l of [...pool.pref,...pool.thin,...(pool.mkt||[])]){ n++; chk(pickOk(l,false)&&dkOk(l),bad('the panel\'s pool',l)+idTxt(l));
              if(l.src==='dkline'){ const f=F('legFair')(l); chk(l.p>=PB_BAND[0]&&l.p<PB_BAND[1]&&l.p>=imp(l.price)&&!!f&&l.p-f.p<FAR-1e-9&&F('suggestable')(l.pid),
                `${lab}: the panel's pool holds ${l.name} ${l.label}, priced from DraftKings' line, outside the panel's rules (model ${(l.p*100).toFixed(1)}%, price ${l.price}, fair ${f?(f.p*100).toFixed(1):'none'}%, ${F('suggestable')(l.pid)?'':'a player who may not play'})`); } }
            /* a game page's hands keep off a leg from the read the model rates FAR_OFF or more above its estimated fair chance, as the panel does */
            const farOk=l=>{ if(l.src!=='dkline') return true; const f=F('legFair')(l); return !!f&&l.p-f.p<FAR-1e-9; }, farTxt=l=>{ const f=F('legFair')(l); return farOk(l)?'':`, far off its fair chance (model ${(l.p*100).toFixed(1)}%, fair ${f?(f.p*100).toFixed(1):'none'}%)`; };
            for(const g of gs){ for(const l of F('gameLegPool')(g)){ n++; chk(pickOk(l,true)&&farOk(l)&&dkOk(l)&&(l.src!=='dkline'||F('suggestable')(l.pid)),bad(`${g.id}'s hands' pool`,l)+farTxt(l)+idTxt(l)); }
              const T=F('gameTiers')(g); for(const id of ['high','med','low']) if(T[id]) for(const l of T[id].legs){ n++; chk(pickOk(l,true)&&farOk(l)&&dkOk(l),bad(`${g.id}'s ${id} hand`,l)+farTxt(l)+idTxt(l)); } }
            /* (app v111) the Top 50 lines and each prime-time set the games make, under the same rules as a level */
            w.eval('PB_TOP_CACHE=new Map()');
            /* (app v119) the Top lines too: every leg with its id where the payload carries them */
            for(const l of F('getPbTop')().rows){ n++; chk(pickOk(l,false)&&dkTopOk(l),bad('the Top 30 lines',l)+(dkTopOk(l)?'':idTxt(l))); }
            /* (app v118) and the Sunday slot, where any of its games is one of these */
            const SLp=slotNowAud(), suP=SLp&&SLp.games.some(g=>gs.some(x=>x.id===g.id))?F('spUnit')(SLp.id):null;
            const sets=[...F('spGames')().filter(g=>gs.some(x=>x.id===g.id)),...(suP?[suP]:[])].map(g=>({g,s:F('spSet')(g.id)}));
            for(const {g,s:x} of sets) for(const t of x.tiers) if(t.legs) for(const l of t.legs){ n++;
              chk(pickOk(l,false)&&dkOk(l)&&(l.src!=='dkline'||(F('suggestable')(l.pid)&&(()=>{ const f=F('legFair')(l); return l.p>=0.45&&l.p<0.97&&l.p>=imp(l.price)&&!!f&&l.p-f.p<FAR-1e-9; })())),bad(`${g.id}'s ${t.id} set level`,l)+idTxt(l)); }
            const r=F('getPbTiers')(); r.sets=sets;
            for(const t of r.tiers) if(t.legs) for(const l of t.legs){ n++; chk(pickOk(l,false)&&dkOk(l),bad(`the ${t.id} level`,l)+idTxt(l));
              if(l.src==='dkline'){ const f=F('legFair')(l); chk(l.p>=0.45&&l.p<0.97&&l.p>=imp(l.price)&&!!f&&l.p-f.p<FAR-1e-9&&F('suggestable')(l.pid)&&(l.p-imp(l.price)>=0.03&&F('formAgrees')(l))===!l.thin,
                `${lab}: the ${t.id} level holds ${l.name} ${l.label}, priced from DraftKings' line, outside the panel's rules (model ${(l.p*100).toFixed(1)}%, price ${l.price}, fair ${f?(f.p*100).toFixed(1):'none'}%, thin ${l.thin})`); } }
            return {n,r}; };
          const holdToggle=(g,lab)=>{ const keepP=JSON.stringify(S.parlay||{}), keepO=JSON.stringify(S.odds||{}), keepM=JSON.stringify((P().mkt||{})[String(g.w)]||null), keepG=S.ui.game; let n=0;
            try{ S.ui.game=null; const R=F('rosterFor')(g,false), xs2=[]; for(const tm in R) for(const x of R[tm].players) xs2.push(x);
              const tog=(key,k,side,main)=>F('toggleLeg')(key,k,g,side,main);
              const x1=xs2.find(x=>F('statLines')(x).some(l=>!l.prob&&ESR.takeable(ESR.price(leg(g,x,l.stat,{side:'over',main:true})))&&!stands(g,x,l.stat)));
              if(x1){ const l=F('statLines')(x1).find(l=>!l.prob&&ESR.takeable(ESR.price(leg(g,x1,l.stat,{side:'over',main:true})))&&!stands(g,x1,l.stat)), own=ESR.price(leg(g,x1,l.stat,{side:'under',main:true})), key=`${g.id}|${x1.pl.id}|${l.stat}`;
                S.parlay={}; tog(key,own.line,'under',true); const L=S.parlay[key]; n++;
                chk(!!L&&L.src==='dkline'&&L.price===own.price&&L.k===own.line&&L.main&&L.side==='under'&&!!L.espn&&near(L.espn.fair,own.fair)&&F('legPrice')(L).src==='dkline',`${lab}: ticking ${x1.pl.n}'s under ${own.line} ${l.stat} did not put it on the builder at ${own.price} from DraftKings' line`);
                const Mx=((P().mkt[String(g.w)]??={})[x1.pl.id]??={}); Mx[l.stat]={line:own.line,over:-120,under:100,n:x1.pl.n,g:g.id};
                S.parlay={}; tog(key,own.line,'under',true); const L2=S.parlay[key]; n++;
                chk(!!L2&&L2.src==='real'&&L2.price===100,`${lab}: with DraftKings' own price on its current line, ticking ${x1.pl.n}'s under did not take it (${L2&&L2.src} ${L2&&L2.price})`); }
              const x2=xs2.find(x=>F('statLines')(x).some(l=>!l.prob&&l.rungs.some(r=>{ const o=ESR.price(leg(g,x,l.stat,{k:r.k,side:'over',main:false})); return o&&!o.mainOver&&!F('oddsFor')(g.id,x.pl.id,l.stat,r.k); })));
              if(x2){ const l=F('statLines')(x2).find(l=>!l.prob&&l.rungs.some(r=>{ const o=ESR.price(leg(g,x2,l.stat,{k:r.k,side:'over',main:false})); return o&&!o.mainOver&&!F('oddsFor')(g.id,x2.pl.id,l.stat,r.k); }));
                const r=l.rungs.find(r=>{ const o=ESR.price(leg(g,x2,l.stat,{k:r.k,side:'over',main:false})); return o&&!o.mainOver&&!F('oddsFor')(g.id,x2.pl.id,l.stat,r.k); }), own=ESR.price(leg(g,x2,l.stat,{k:r.k,side:'over',main:false})), key=`${g.id}|${x2.pl.id}|${l.stat}`;
                /* (app v127) a rung DraftKings lists, priced from its line: toggleLeg puts no ladder bet on the
                   builder, nor with DraftKings' own price on file for it */
                S.parlay={}; tog(key,r.k,'over',false); n++;
                chk(!S.parlay[key],`${lab}: ticking ${x2.pl.n}'s ${r.k}+ ${l.stat}, priced from DraftKings' line at ${own.price}, put a ladder bet on the builder`);
                (((S.odds[g.id]??={})[x2.pl.id]??={})[l.stat]??={})[String(r.k)]=777; S.parlay={}; tog(key,r.k,'over',false); n++;
                chk(!S.parlay[key],`${lab}: with DraftKings' own price on file, ticking ${x2.pl.n}'s ${r.k}+ ${l.stat} put a ladder bet on the builder`); }
              const x3=xs2.find(x=>F('statLines')(x).some(l=>l.prob)&&ESR.price(leg(g,x,'any_td',{k:1,side:'over',main:false}))&&F('oddsFor')(g.id,x.pl.id,'any_td',1)==null);
              if(x3){ const own=ESR.price(leg(g,x3,'any_td',{k:1,side:'over',main:false})), key=`${g.id}|${x3.pl.id}|any_td`;
                S.parlay={}; tog(key,1,'over',false); const L=S.parlay[key]; n++;
                chk(!!L&&L.src==='dkline'&&L.price===own.price&&F('legPrice')(L).src==='dkline',`${lab}: ticking ${x3.pl.n}'s anytime touchdown did not put it on the builder at ${own.price} from DraftKings' line`);
                S.parlay={}; tog(key,2,'over',false); n++; chk(!S.parlay[key],`${lab}: toggleLeg put ${x3.pl.n}'s 2+ touchdowns on the builder`); }
              W.coverage(!!(x1&&x2&&x3),`${lab}: no player to tick a main line and a touchdown from DraftKings' line on, or a rung it lists to refuse`);
            } finally { S.parlay=JSON.parse(keepP); S.odds=JSON.parse(keepO); if(keepM==='null') delete P().mkt[String(g.w)]; else P().mkt[String(g.w)]=JSON.parse(keepM); S.ui.game=keepG; w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}'); F('renderParlay')(); }
            return n; };
          /* the est. marks drawn: each Top 50 line priced from DraftKings' line marked est. and no other, the list's
             note on them there exactly when one is; each set's level the same, its price "price, est." with one */
          /* (app v112) every set's cards, those the night rule hides drawn with spOn stood in (spAllOn) */
          const holdMarks=(lab,r)=>{ const stab=d.getElementById('tab-suggest'), keepH=stab.hidden, keepOn=w.eval('spOn'), keepSl=w.eval('spSlotNext'); const panel=d.getElementById('pbPanel'); let n=0, any=false;
            try{ stab.hidden=false; spKeyClear(); w.eval('spOn=function(){ return spGames(); }'); slotPut(function(){ const s=keepSl(); return s?{...s,up:true}:s; }); F('renderPb')();
            { const rows=F('getPbTop')().rows, li=[...panel.querySelectorAll('ol.pb-top > li.pb-trow')]; any=rows.some(l=>l.src==='dkline'); n++;
              chk(li.length===rows.length&&rows.every((l,i)=>!!li[i].querySelector('.pb-tc i.est')===(l.src==='dkline')),`${lab}: the Top 30 lines do not mark est. exactly their ${rows.filter(l=>l.src==='dkline').length} lines priced from DraftKings' line`); }
            for(const {g} of (r.sets||[])){ const v=F('spShown')(g), box=d.querySelector(`#spPanel [data-sp-game="${g.id}"]`);
              for(const t of (v.tiers||[])){ if(!t||!t.legs) continue; const c=box&&box.querySelector(`.pb-tier.${t.id}`), li=c?[...c.querySelectorAll('.pb-legs li')]:[], nd=t.legs.filter(l=>l.src==='dkline').length; n++;
                chk(li.length===t.legs.length&&t.legs.every((l,i)=>!!li[i].querySelector('.pr i.est')===(l.src==='dkline'))&&!!c&&c.querySelector('.pb-nums').children[1].querySelector('span').textContent===(nd?'price, est.':'price'),
                  `${lab}: ${g.id}'s ${t.id} card does not mark est. exactly its ${nd} legs priced from DraftKings' line, or its price "${nd?'price, est.':'price'}"`);
                W.wording(!!c&&!!c.querySelector('.pb-espnline')===nd>0,`${lab}: ${g.id}'s ${t.id} card's line on legs priced from DraftKings' line is ${nd?'missing':'there with none'}`); } }
            /* (app v130, the owner's call of 22 October 2026: no descriptions) the note is the state alone, in a set card's
               words: "Price est. from DraftKings’ line, read Tue 8:07 AM ET." */
            W.wording([...panel.querySelectorAll('p.pb-note')].some(p=>/^Price est\. from DraftKings’ line, read [^.]+ ET( \(\d+h ago\))?\.$/.test(p.textContent))===any&&!/A player line marked est\./.test(panel.textContent),`${lab}: the list's note on lines priced from DraftKings' line is ${any?'missing, or not the state alone':'there with none listed'}`);
            } finally { stab.hidden=keepH; spOnPut(keepOn); slotPut(keepSl); F('renderPb')(); }
            /* (app v124) a game page draws no hands, so there are no hand cards to mark */
            const dl=F('getPbTop')().rows.find(l=>l.src==='dkline');
            if(dl){ const keepP=JSON.stringify(S.parlay||{}); try{ const {key,thin,...one}=dl; S.parlay={[key]:one}; F('renderParlay')();
                const row=d.querySelector('#parlayBody tr.legrow'), lab2=row&&row.querySelectorAll('td')[4], lf=row&&row.querySelector('.legfair'), f=F('legFair')(dl); n++;
                chk(!!lab2&&lab2.textContent.trim()===`${fmt(dl.price)} est.`&&!!lf&&lf.textContent===`fair ${(f.p*100).toFixed(0)}% est.`,`${lab}: the builder does not mark ${dl.name} ${dl.label} est. with its estimated fair chance: "${lab2?lab2.textContent:''}" "${lf?lf.textContent:''}"`);
                W.wording(/^Price est\. from DraftKings’ line, read [^.]+ ET( \(\d+h ago\))?\.$/.test((d.querySelector('#parlayBody [data-espn-read]')||{}).textContent||''),`${lab}: the builder does not say, in a few words, that its price is estimated from DraftKings' line and when it was read: "${(d.querySelector('#parlayBody [data-espn-read]')||{}).textContent||''}"`); }
              finally{ S.parlay=JSON.parse(keepP); F('renderParlay')(); } }
            return n; };

          nPx+=holdGame(g0,'a press'); nDom+=domGame(g0,'a press');
          /* (app v109) twice: on the ids the payload carries (the paid pull's and the press's own game-line
             ids), where no leg priced from the read is suggested, having no id; and with PAY.dk taken away,
             as a payload baked before ids, which takes them as before, under the panel's rules */
          for(const pass of ['ids','none']){ const keepU=JSON.stringify(S.ui.pb), dkP=P().dk, nl=pass==='none'?', no ids carried':'';
            if(pass==='none') dkSet(undefined);
            try{ for(const [m,ks] of [['all',['ml','ats','total','over','under']],['players',['over','under']],['g0',['over','under']]]){ for(const k of ['ml','ats','total','over','under']) S.ui.pb.k[k]=ks.includes(k);
                S.ui.pb.off=m==='g0'?games.filter(g=>g!==g0).map(g=>g.id):[]; w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()');
                const {n,r}=holdPicks(`a press${nl}, ${m==='g0'?'players only on '+g0.id:m}`,m==='g0'?[g0]:games); nPick+=n; if(m!=='players') nPick+=holdMarks(`a press${nl}, ${m}`,r);
                /* (app v125) ids carried for g0: its entry carries the pull's ids by content (a press's own never does) */
                const g0Ids=dkCarried()&&!!dkEntryAud({week:g0.w,gid:g0.id});
                if(m==='g0'&&!g0Ids) W.coverage(r.tiers.some(t=>t.legs&&t.legs.some(l=>l.src==='dkline')),`with the press's read on ${g0.id} alone, no level holds a leg priced from it: ${r.tiers.map(t=>t.why||t.legs.map(l=>l.src).join('+')).join(' / ')}`);
                /* (app v115) with ids carried, a level and a set take no leg priced from the press's read (it has no DraftKings id),
                   and the Top lines are the audit's own (holdTop: since app v119 every row with its id) */
                if(m==='g0'&&g0Ids) chk(r.tiers.every(t=>!t.legs||t.legs.every(l=>l.src!=='dkline'))&&(r.sets||[]).every(({s:x})=>x.tiers.every(t=>!t.legs||t.legs.every(l=>l.src!=='dkline'))),`with ids carried, a level or a set takes a leg priced from the press's read, which has no DraftKings id`);
                if(holdTopF) holdTopF(`a press${nl}, ${m==='g0'?'players only on '+g0.id:m}`); } }
            finally{ if(pass==='none') dkSet(dkP); S.ui.pb=JSON.parse(keepU); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()'); F('renderPb')(); } }
          nTog+=holdToggle(g0,'a press');
          /* a game's page reads that game alone; the backup's touchdown 2 hours out (his club's lines
             complete: the backup branch) and 40 hours out (the model alone) */
          const k0=F('kickoff')(g0).getTime(), tdOf=x=>{ const R=F('rosterFor')(g0,true), y=[...R[g0.a].players,...R[g0.h].players].find(z=>z.pl.id===x.pl.id); return y&&F('plEst')(y,g0,F('statLines')(y).find(l=>l.prob),'td',1); };
          setClock(k0-2*3600e3); S.ui.game=g0.id; F('renderGame')(); net.log=[];
          const gb=d.querySelector(`#gameView [data-espn-refresh="${g0.id}"]`); if(gb){ gb.focus(); gb.click(); }
          for(let i=0;i<200&&w.eval('ESPN_RUN.busy');i++) await sleep(25);
          { const us=net.log.map(x=>x.url), pbs=us.filter(u=>props(u));
            chk(!!gb&&us.filter(u=>/\/scoreboard\?/.test(u)).length===1&&pbs.length>=1&&pbs.every(u=>props(u).eid===evOfG(g0).id),`${g0.id}'s page's button read more than that game: ${us.join(' ')}`);
            W.wording(d.activeElement&&d.activeElement.dataset&&d.activeElement.dataset.espnRefresh===g0.id,'the focus did not stay on the game page\'s Refresh odds button'); }
          const bk2=backup&&tdOf(backup), comp=backup&&ESR.complete(ESR.entry(g0.id,g0.w),g0,backup.team), own2=backup&&ESR.price({gid:g0.id,week:g0.w,pid:backup.pl.id,stat:'any_td',team:backup.team,opp:backup.opp,k:1,side:'over',main:false});
          setClock(k0-40*3600e3); if(gb){ const b2=d.querySelector(`#gameView [data-espn-refresh="${g0.id}"]`); b2.click(); }
          for(let i=0;i<200&&w.eval('ESPN_RUN.busy');i++) await sleep(25);
          const bk40=backup&&tdOf(backup);
          W.coverage(!!backup&&comp&&!ESR.complete(ESR.entry(g0.id,g0.w),g0,backup.team),'the press did not give a backup on the touchdown list beside a club with its lines complete, so the backup branch went untested');
          if(backup&&bk2&&bk40) chk(bk2.src==='dkline'&&bk40.src==='dkline'&&bk2.price!==bk40.price&&!!own2&&bk2.price===own2.price&&bk40.price===(ESR.price({gid:g0.id,week:g0.w,pid:backup.pl.id,stat:'any_td',team:backup.team,opp:backup.opp,k:1,side:'over',main:false})||{}).price,
            `a backup with no yards line (${backup.pl.n}) is priced ${bk2.price} with his club's lines complete and ${bk40.price} with them not: the two branches are one, or not the rule's`);
          nPx+=holdGame(g0,'a press 40 hours out');
          S.ui.game=null; F('closeGameModal')(); w.Date.now=clock0;
          /* a read taken in play is never used, and a game that has kicked off offers nothing */
          { const e=F('ESPN_LIVE')[wk][g0.id], at0=e.at; e.at=new Date(k0+60e3).toISOString(); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}');
            const tdx=xs.find(x=>F('statLines')(x).some(l=>l.prob)), l0=tdx&&F('statLines')(tdx).find(l=>l.prob);
            chk(!F('espnGame')(g0.id,g0.w)&&!ESR.entry(g0.id,g0.w)&&(!l0||F('plEst')(tdx,g0,l0,'td',1).src==='est'),`a read taken after ${g0.id}'s kickoff is used`);
            e.at=at0; setClock(k0+60e3); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}');
            try{ chk(!F('pricedLegs')([g0]).length&&!F('pbGames')().some(x=>x.id===g0.id),`${g0.id} offers a leg once it has kicked off`);
              S.ui.game=g0.id; F('renderGame')(); chk(!d.querySelector('#gameView td.num.est[data-est]')&&!d.querySelector('#gameView input[data-leg]')&&!d.querySelector('#gameView [data-espn-refresh]'),`${g0.id}'s page offers a price or a press once it has kicked off`); S.ui.game=null; F('closeGameModal')(); }
            finally{ w.Date.now=clock0; w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}'); } }
          /* a press that found no player lines for the games ticked: the levels say DraftKings had posted none */
          if(gN){ const keepO=JSON.stringify(S.odds||{}), keepM2=JSON.stringify((P().mkt||{})[wk]||null), keepU=JSON.stringify(S.ui.pb);
            try{ for(const x of games) if(S.odds) delete S.odds[x.id]; delete P().mkt[wk];
              for(const k of ['ml','ats','total','over','under']) S.ui.pb.k[k]=k==='over'||k==='under'; S.ui.pb.off=games.filter(g=>g!==gN).map(g=>g.id); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map()');
              const rN=F('getPbTiers')(), np=low1(noPlAud([gN.id]));
              chk(rN.noPlayerPrices&&rN.tiers.every(t=>!t.legs),'with a press that found no player lines for the games ticked and no price on file, a level has a player leg, or the panel does not say there are none');
              W.wording(rN.tiers.every(t=>t.why===np[0].toUpperCase()+np.slice(1))&&/^no player lines yet \(read [^)]+ ET\)\.$/.test(np),'with a press that found no player lines, the empty levels do not say there are none, and when they were read: '+rN.tiers.map(t=>t.why).join(' / '));
              /* the Top 50 lines on the same ticks: none, saying the same */
              { const tp=F('getPbTop')(); F('renderPb')(); const why=(d.querySelector('#pbPanel .pb-top-none')||{}).textContent||'';
                chk(!tp.rows.length&&tp.noPlayerPrices,'with a press that found no player lines for the games ticked and no price on file, the Top 30 lines list one');
                W.wording(why===np[0].toUpperCase()+np.slice(1),'with a press that found no player lines, the empty Top 30 lines do not say there are none: '+why); } }
            finally{ S.odds=JSON.parse(keepO); if(keepM2==='null') delete P().mkt[wk]; else P().mkt[wk]=JSON.parse(keepM2); S.ui.pb=JSON.parse(keepU); } }
          /* a reload returns the builder to the published prices: the press's game lines put back and its
             read dropped, as a reload finds them, a spread leg it priced goes to the game's published price
             on its own number (else the model's estimate), and a player's main line from the read to
             DraftKings' own price on that line where the pull has one, else the model's estimate */
          { const keepP=JSON.stringify(S.parlay||{});
            try{ w.Date.now=clock0; S.parlay={}; const gl0=F('ESPN_GL')[g0.id], kA=`${g0.id}|team:${g0.h}|ats`;
              F('toggleLeg')(kA,-g0.sp,g0,'over',false); const La=S.parlay[kA];
              const R=F('rosterFor')(g0,false), xs3=[]; for(const tm in R) for(const x of R[tm].players) xs3.push(x);
              const pk=x=>F('statLines')(x).find(l=>!l.prob&&ESR.takeable(ESR.price(leg(g0,x,l.stat,{side:'over',main:true})))&&!stands(g0,x,l.stat));
              const xm=xs3.find(x=>pk(x)), lm=xm&&pk(xm), om=lm&&ESR.price(leg(g0,xm,lm.stat,{side:'over',main:true})), kM=xm&&`${g0.id}|${xm.pl.id}|${lm.stat}`;
              if(xm) F('toggleLeg')(kM,om.line,g0,'over',true); const Lm=xm&&S.parlay[kM];
              chk(!!La&&!!gl0&&La.gl===gl0.at&&La.price===g0.sph&&F('legPrice')(La).ml===g0.sph,`a spread leg put in the builder from the press's lines does not carry the read's time and price: ${JSON.stringify(La)}`);
              const pub=before[g0.id]; W.coverage(!La||pub.sph!==La.price,`${g0.id}'s published home spread price is the press's (${La&&La.price}): whether a reload sends a game leg back went untested`); unapply(); w.eval('ESPN_LIVE={}; ESPN_IDAT={}; PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}');
              const pa=La&&F('legPrice')(La), onNum=!!La&&-pub.sp===+La.k&&pub.sph!=null&&isFinite(pub.sph)&&pub.sph!==0;
              chk(!!pa&&(onNum?(pa.src==='real'&&pa.ml===pub.sph):(pa.src==='est'&&pa.ml===F('bookPrice')(La.p))),`after a reload, a spread leg the press priced is at ${pa&&pa.ml} (${pa&&pa.src}), not the published ${onNum?pub.sph+' on its number':'model estimate'}`);
              if(Lm){ const pm=F('legPrice')(Lm), Mk=F('marketLine')(g0.w,xm.pl.id,lm.stat), real=Mk&&+Mk.line===+Lm.k?Mk.over:null, v=F('rungView')(xm.pl,lm.stat,Lm.mu,+Lm.k+0.5,g0.w);
                chk(real!=null?(pm.src==='real'&&pm.ml===real):(pm.src==='est'&&pm.ml===v.est),`after a reload, ${xm.pl.n}'s over ${Lm.k} ${lm.stat}, priced from the read, is at ${pm.ml} (${pm.src}), not ${real!=null?'DraftKings\' own '+real:'the model\'s estimate '+v.est}`); }
              W.coverage(!!Lm,'no player\'s main line from the read to put in the builder before a reload');
            } finally { S.parlay=JSON.parse(keepP); } }
          /* a press on one game's page: the week's status lines say it read that game alone (since app v130 with no "press
             Refresh odds here for the rest": the button is beside the line) */
          { reset(); w.Date.now=clock0; S.ui.game=g0.id; F('renderGame')(); const gb3=d.querySelector(`#gameView [data-espn-refresh="${g0.id}"]`); if(gb3) gb3.click();
            for(let i=0;i<200&&w.eval('ESPN_RUN.busy');i++) await sleep(25); S.ui.game=null; F('closeGameModal')(); F('renderPb')();
            const ids3=F('pbGames')().map(g=>g.id), st=txt(d.querySelector('#pbPanel [data-espn-status="week"]')), e=(F('ESPN_LIVE')[wk]||{})[g0.id], t=Math.max(Date.parse(e&&e.at)||0,(F('ESPN_GL')[g0.id]||{}).at||0);
            const exp=`DraftKings via ESPN for 1 of ${ids3.length} games (${g0.a} at ${g0.h}), read ${F('espnClock')(t)} · player prices est.`;
            W.wording(ids3.length<2||st===exp,`after a press on ${g0.id}'s page alone, the Parlay Builder's status line reads "${st}", not "${exp}"`); }
          /* (app v111) the builder and Suggested Parlays each have a Refresh odds of their own: the same read of the
             week (one scoreboard, no-store), the focus kept on the button pressed through the redraw */
          for(const [box,lab,tab] of [['#parlayBody','the builder','parlay'],['#spPanel','Suggested Parlays','suggest']]){
            reset(); w.Date.now=clock0; d.querySelector(`#tabs button[data-tab="${tab}"]`).click(); F('renderParlay')(); net.log=[];
            const b=d.querySelector(`${box} [data-espn-refresh="week"]`); if(b){ b.focus(); b.click(); }
            for(let i=0;i<200&&w.eval('ESPN_RUN.busy');i++) await sleep(25);
            const us=net.log.map(x=>x.url);
            chk(!!b&&us.filter(u=>/\/scoreboard\?/.test(u)).length===1&&net.log.every(x=>x.cache==='no-store'&&!x.headers),`${lab}'s Refresh odds did not read the week as the Parlay Builder's does: ${us.filter(u=>/scoreboard/.test(u)).length} scoreboards`);
            W.wording(!!d.activeElement&&!!d.activeElement.dataset&&d.activeElement.dataset.espnRefresh==='week'&&!!d.activeElement.closest(box),`the focus did not stay on ${lab}'s Refresh odds through the redraw`); }
          d.querySelector('#tabs button[data-tab="parlay"]').click();
        } finally {
          for(const [id,v] of injPlant){ if(v===undefined) delete F('INJ')[id]; else F('INJ')[id]=v; }
          try{ unapply(); }catch(e){ chk(false,'the press\'s game lines could not be put back after M8f: '+e); }
          reset(); w.eval('ESPN_RUN.busy=false'); for(const k of F('ESPN_GL_KEYS')){ if(trueG0[k]===undefined) delete g0[k]; else g0[k]=trueG0[k]; }
          if(keep.dk===undefined) delete P().dk; else P().dk=keep.dk;
          if(keep.mkt===undefined) delete P().mkt[wk]; else P().mkt[wk]=keep.mkt;
          S.odds=keep.odds; S.parlay=keep.parlay; S.ui.pb=keep.pb; S.ui.game=null; try{ F('closeGameModal')(); }catch(e){} } }
    } catch(e){ chk(false,'M8 threw: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' ')); }
    finally {
      w.fetch=realFetch; w.Date.now=clock0; net.gate=null;
      for(const [n,v] of Object.entries(keep0)) setVar(n,v);
      try{ if(key0==null) LS.removeItem(KK); else LS.setItem(KK,key0); }catch(e){}
      if(keepIds===undefined) delete P().espn_ids; else P().espn_ids=keepIds;
      for(const id of added) delete S.players[id];
      w.eval('ESPN_NAMES='+JSON.stringify(keepNames||{}));
      { const pz=protoClean(); chk(!pz.length,`after M8, the page's built-ins carry ${pz.join(', ')}, set by the page while M8 ran`); }
      try{ unapply(); reset(); rebake(); w.eval('PB_CACHE=new Map(); PB_TOP_CACHE=new Map(); SP_CACHE=new Map(); GAME_TIER_CACHE={}'); F('save')(); F('renderAll')(); }
      catch(e){ chk(false,'the page could not be drawn again after M8: '+String(e&&e.stack||e).split('\n').slice(0,2).join(' ')); } }
    console.log(`M8. Refresh odds: no request before a press; the reader on ESPN's recorded answers (${nParse} events read as the checks read them, two pages, the answers that leave a game alone, athletes by id, by name and by the clubs' rosters, a name never on a player an id names, a kickoff before and during a read); ${nReq?`a press on the week (${nReq} requests) and a game's page, the game lines and ids applied, each dated by its read, and never saved; the levels and hands fresh right after it, and a reload back on the published prices; the read kept in this browser (${nKeep} checks: written as the page shows it, put back on a reload with no request and the levels and hands as after the press, two presses put back as the page showed them after both, a spread and a total read back to the published number with no prices put back with none, the event the page used, what each read found put back with its half, a read the press left off putting nothing back, set aside for a published game line moved, a newer pull, a kickoff, a value of another season or not the page's, a game not on the schedule or in another week, left alone with no schedule, the parts the page never writes dropped ("__proto__" among them), a half dated after the page's clock dropped, two tabs' writes merged half by half and a half set aside never taken back, nothing set on the page's built-ins, given way to the visitor's state with no room, and (round 5) each game-line field by its own read's time over a newer publish, a block lent only over the same publish, a game the schedule no longer offers carried through a write and pruned by a restore, a line or rung off ESPN's steps dropped and at most 40 rungs, a 'none' for a day at most, and (round 6) a builder game leg kept by its own field, the later block of the same publish in the merge, what a reload does not put back pruned from the key, a money line, spread or total kept as null dropped and lat the latest field put); ${nPx} prices the rule's, ${nDom} drawn on the game page, ${nPick} chosen legs to the rule, ${nTog} ticks`:'no game to come, so no press on the week'}`);
    console.log(`M8. untested markets priced from the press (shown, never suggested): ${Object.keys(untested).length?Object.entries(untested).map(([k,v])=>k+' '+v).join(', '):'none'}`); }

  /* ---- M14. a Refresh odds press that moves DraftKings' player lines, on a made-up game of the audit's own (app v115) ----
     The owner, Sunday 18 October 2026: "any idea why the player props are not showing up in the top 50 anymore? :/". A
     press on a Sunday finds most of the player lines DraftKings had when the paid pull read them on Saturday morning
     moved; each line the read has at another number is priced there by the formula (src dkline, est.), and ESPN gives
     no DraftKings id for a player's line, so until app v115 the Top 50 lines left every one of them out wherever the
     payload carries ids (on 18 October's payload, a press moving every priced line half a point took the list from 43
     player lines to 7). From app v115 the Top lines alone kept them; since app v119 (the owner's call of 19 October
     2026: "i dont want to include those in the parlay builder, only ones i can add via id") they leave them out again,
     as everything that builds a parlay does. On a Monday night game of two made-up clubs with four made-up players (rule
     (c): on the schedule for the run, pbGames stood in, the players in S.players, the paid pull's main lines in PAY.mkt
     and a made-up id table for them in place of PAY.dk, the players' ESPN ids in place of PAY.espn_ids, the read
     answered by a fetch stub of the audit's own, and the page's ESPN state and its kept key put back, all on every path,
     so it holds in any week, at any hour and in the off-season). Each line the read moves is set where the model makes
     its over about 60%, with the pull's 2 points under it at -110 each way and DraftKings' ids there: the quarterback's
     passing yards, a receiver's receiving yards and a back's rushing yards (tested kinds), the quarterback's completions
     (untested); a second receiver's receptions read at the pull's own number (moved nothing) and his receiving yards,
     which the pull had no price for, read alone; the four on the read's touchdown list, the first receiver's yards
     ladder listed. Held:
       - before the press, and after a press whose read is the pull's own lines, the list is the pull's lines alone, the
         same rows at the same prices with their ids
       - after the press, the list is the audit's own (holdTop: topAud, no row with a line on a missing id); no leg on it
         without its DraftKings id, the moved lines neither at the read's number nor at the pull's old one, while the
         read gives moved tested lines and lines the pull had no price for that qualify but for the id (readTopAud), so
         the case can tell; no completions line anywhere; the unmoved receptions at the pull's price with its id
       - slip-only: no leg from the read with no id in a level (getPbTiers), the game's set (spSet), a hand's pool or a
         hand (gameLegPool, gameTiers)
       - the counts: the page's left out for want of an id the audit's own, and more than none
       - with no ids carried (PAY.dk taken away: a payload baked before them), the read's legs on the list as before, no
         row with the line
     Blocking (made-up data, rule (c)); the line's words W.wording, on holdTop */
  { const cw=F('currentWeek')(), pad=String(cw).padStart(2,'0'), PAY0=F('PAY'), said14=[], isG=F('isGameLeg'), clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
    const GM={id:`2099_${pad}_AUN_AUO`,w:cw,a:'AUN',h:'AUO',d:'2099-01-05',t:'20:15',sp:-3,tot:44.5,tov:-110,tou:-110};
    const PL=[['aud-q14','AUO','QB','Made-up Passer'],['aud-w14','AUN','WR','Made-up Catcher'],['aud-r14','AUN','RB','Made-up Runner'],['aud-v14','AUO','WR','Made-up Wideout']];
    const AID={'aud-q14':'99141001','aud-w14':'99141002','aud-r14':'99141003','aud-v14':'99141004'}, EID='99140001';
    const mkP=([id,team,grp,n])=>{ const st=w.eval('GRP_STATS')[grp]||[], pv=s=>{ const v=PAY0.prior&&PAY0.prior[grp]&&PAY0.prior[grp][s]; return v!=null&&isFinite(v)&&v>0?v:1; };
      return {id,n,pos:grp,grp,team,gp:8,base_gp:17,e5:Object.fromEntries(st.map(s=>[s,[pv(s),1]])),e3:Object.fromEntries(st.map(s=>[s,[pv(s),1]])),
        car:Object.fromEntries(st.map(s=>[s,[pv(s)*40,40]])),py:Object.fromEntries(st.map(s=>[s,pv(s)]))}; };
    /* what M14 stands in, each put back in the finally below whatever path it leaves by */
    const keepF=w.eval('[pbGames]'), putF=w.eval('(function(a){ pbGames=a; })'), keepU=JSON.stringify(F('pbUi')()), keepDk=PAY0.dk, keepMk=JSON.stringify((PAY0.mkt||{})[String(cw)]||null), keepIds=PAY0.espn_ids;
    const keepPar=JSON.stringify(S.parlay||{}), keepFetch=w.fetch, EV=['ESPN_LIVE','ESPN_GL','ESPN_OUT','ESPN_NAMES','ESPN_IDAT','ESPN_KEPT','ESPN_ASIDE','ESPN_KEEP_GONE','ESPN_KEEP_OFF','ESPN_RUN'];
    const setVar=(n,v)=>w.eval(`(function(v){ ${n}=v; })`)(v), keepE=Object.fromEntries(EV.map(n=>[n,clone(F(n))])), keepSeq=F('ESPN_SEQ');
    const KK=F('ESPN_KEEP_KEY'), key0=(()=>{ try{ return w.localStorage.getItem(KK); }catch(e){ return null; } })();
    const KINDS14=['ml','ats','total','over','under'], allOn=()=>{ const u=F('pbUi')(); for(const k of KINDS14) u.k[k]=true; u.off=[]; dropCaches(); };
    /* the read: a scoreboard of the one made-up event (no game lines on it) and its player lines, served by the stub */
    let items=[], nReq14=0; const esp=u=>/^https:\/\/(site|sports\.core)\.api\.espn\.com\//.test(u);
    const ans=(code,body)=>Promise.resolve({ok:code===200,status:code,headers:{get:()=>null},json:async()=>clone(body)});
    const stub=(u,o)=>{ u=String(u); if(!esp(u)) return keepFetch(u,o); nReq14++;
      if(/\/scoreboard\?/.test(u)) return ans(200,{events:[{id:EID,date:F('kickoff')(GM).toISOString(),competitions:[{competitors:[{homeAway:'home',team:{abbreviation:GM.h,id:'99142'}},{homeAway:'away',team:{abbreviation:GM.a,id:'99143'}}],odds:[]}]}]});
      const m=/\/events\/(\d+)\/competitions\/\d+\/odds\/100\/propBets\?(.*)$/.exec(u);
      if(m&&m[1]===EID){ const pg=+new URLSearchParams(m[2]).get('page')||1; return ans(200,{count:items.length,pageIndex:pg,pageSize:1000,pageCount:Math.max(1,Math.ceil(items.length/1000)),items:items.slice((pg-1)*1000,pg*1000)}); }
      return ans(404,{error:{code:404}}); };
    const mainT=Object.fromEntries(Object.entries(ESPN.TYPES.main).map(([k,v])=>[v,k])), mileT=Object.fromEntries(Object.entries(ESPN.TYPES.mile).map(([k,v])=>[v,k]));
    const ath=pid=>({$ref:`http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${F('SEASON')}/athletes/${AID[pid]}?lang=en&region=us`});
    /* read: {pid:{lines:{stat:L}, rungs:{stat:[k]}, td}} as ESPN's items, each main line's twin items as ESPN sends them */
    const itemsOf=read=>{ const out=[]; for(const [pid,r] of Object.entries(read)){ const a=ath(pid); if(r.td) out.push({type:{id:'31'},athlete:a});
      for(const [st,L] of Object.entries(r.lines||{})) out.push({type:{id:mainT[st]},athlete:a,current:{target:{value:L}}},{type:{id:mainT[st]},athlete:a,current:{target:{value:L}}});
      for(const [st,ks] of Object.entries(r.rungs||{})) for(const k of ks) out.push({type:{id:mileT[st]},athlete:a,current:{target:{value:k}}}); } return out; };
    const clearRead=()=>{ w.eval('ESPN_LIVE={}; ESPN_OUT={}; ESPN_NAMES={}; ESPN_IDAT={}; ESPN_SEQ++'); dropCaches(); };
    const press=async read=>{ items=itemsOf(read); clearRead(); await F('espnRefresh')(GM.id); dropCaches(); return !!((F('ESPN_LIVE')[String(cw)]||{})[GM.id]); };
    const legSig=l=>[l.key,l.side,l.k,l.price,l.src].join('|'), rowsSig=()=>{ allOn(); return F('getPbTop')().rows.map(legSig).join(';'); };
    let ran=false;
    try{
      S.sched.push(GM); for(const p of PL) S.players[p[0]]=mkP(p);
      w.__m14G=[GM]; w.eval('pbGames=function(){ return window.__m14G.filter(g=>!gameStarted(g)&&!hasScore(g)); };');
      PAY0.espn_ids=Object.fromEntries(Object.entries(AID).map(([pid,aid])=>[aid,pid]));
      const r0=rosterFor(GM,false), xs=[...r0[GM.a].players,...r0[GM.h].players].filter(x=>AID[x.pl.id]), X=pid=>xs.find(x=>x.pl.id===pid);
      chk(xs.length===4,`the made-up players are not on their made-up clubs' rosters for the game (${xs.map(x=>x.pl.id).join(', ')||'none'} of 4)`);
      /* each line where the model makes the over about 60% (the half point nearest it), the pull's 2 points under the moved ones */
      const at60=(pid,st)=>{ const x=X(pid), pr=x&&F('project')(x.pl,st,x.opp,x.ctx), mu=pr&&pr.mu; if(!(mu>0)) return null; let b=null;
        for(let L=0.5;L<Math.max(4,mu*3);L+=1){ const p=F('pOver')(x.pl.grp,st,mu,L); if(!b||Math.abs(p-0.6)<Math.abs(b.p-0.6)) b={L,p}; } return b?b.L:null; };
      const MOVED={'aud-q14':{passing_yards:at60('aud-q14','passing_yards')},'aud-w14':{receiving_yards:at60('aud-w14','receiving_yards')},'aud-r14':{rushing_yards:at60('aud-r14','rushing_yards')}};
      const UNT={'aud-q14':{completions:at60('aud-q14','completions')}}, STILL=at60('aud-v14','receptions'), ALONE=at60('aud-v14','receiving_yards');
      const lines=[...Object.values(MOVED),...Object.values(UNT)].flatMap(o=>Object.values(o));
      chk(lines.every(L=>L!=null&&L-2>=0.5)&&STILL!=null&&ALONE!=null,`the made-up players' lines could not be set where the model makes the over about 60%: ${JSON.stringify({MOVED,UNT,STILL,ALONE})}`);
      const PULL={}, M=((PAY0.mkt??={})[String(cw)]??={}), E={at:new w.Date(w.Date.now()-3600e3).toISOString(),glat:new w.Date(w.Date.now()-3600e3).toISOString()}; let nId=0;
      const pull=(pid,st,L)=>{ (PULL[pid]??={})[st]=L; M[pid]={...(M[pid]||{}),[st]:{line:L,over:-110,under:-110,n:S.players[pid].n,g:GM.id}};
        for(const side of ['over','under']) E[`${pid}|${st}|${side}|${dkPt(L)}`]='0AUDM14'+(++nId); };
      for(const [pid,o] of Object.entries({...MOVED,'aud-q14':{...MOVED['aud-q14'],...UNT['aud-q14']}})) for(const [st,L] of Object.entries(o)) pull(pid,st,L-2);
      pull('aud-v14','receptions',STILL);
      for(const side of ['over','under']) E[`game|total|${side}|${dkPt(GM.tot)}`]='0AUDM14'+(++nId);
      const T14={[String(cw)]:{[GM.id]:E}}; AUD_DK.add(T14); dkSet(T14); w.fetch=stub; allOn();
      /* before the press: the pull's lines alone, with their ids */
      const sig0=rowsSig(), top0=F('getPbTop')().rows;
      chk(top0.length>0&&top0.every(l=>l.src==='real'&&dkOk(l)),`before a press, the made-up game's Top 30 lines are not the pull's own lines with their ids: ${top0.map(l=>l.label+' '+l.src).join(', ')||'none'}`);
      if(holdTopF) holdTopF('a made-up game before a press');
      /* a press whose read is the pull's own lines: nothing moves, nothing changes */
      { const same={}; for(const [pid,o] of Object.entries(PULL)) same[pid]={lines:{...o}};
        const ok=await press(same);
        chk(ok&&rowsSig()===sig0,`a press whose read is the pull's own lines changes the made-up game's Top 30 lines (${ok?'read':'not read'}): ${rowsSig().slice(0,240)} against ${sig0.slice(0,240)}`); }
      /* the press that moves them */
      const R={'aud-q14':{lines:{passing_yards:MOVED['aud-q14'].passing_yards,completions:UNT['aud-q14'].completions},td:true},
        'aud-w14':{lines:{receiving_yards:MOVED['aud-w14'].receiving_yards},td:true,rungs:{receiving_yards:(()=>{ const x=X('aud-w14'), l=x&&F('statLines')(x).find(z=>z.stat==='receiving_yards'); return l?l.rungs.map(r=>r.k).filter(k=>Math.abs(k-0.5-MOVED['aud-w14'].receiving_yards)>1e-9):[]; })()}},
        'aud-r14':{lines:{rushing_yards:MOVED['aud-r14'].rushing_yards},td:true},
        'aud-v14':{lines:{receptions:STILL,receiving_yards:ALONE},td:true}};
      const read=await press(R);
      chk(read&&nReq14>=4,`the made-up game's press was not read (${nReq14} requests to the stub)`);
      allOn(); const r1=F('getPbTop')(), top=r1.rows, q=qualAud([GM],F('pbUi')(),true);
      if(holdTopF) holdTopF('a made-up game after a press that moves its lines');
      const isMoved=l=>!!l.main&&MOVED[l.pid]&&MOVED[l.pid][l.stat]!=null, readL=F('pricedLegs')([GM]).filter(l=>readTopAud(l)&&!dkOk(l));
      chk(top.every(l=>dkOk(l)),`after the press, the made-up game's Top 30 lines hold a line with no DraftKings id at its number (app v119 takes only lines the slip can take by id): ${top.filter(l=>!dkOk(l)).map(l=>`${l.name} ${l.label} ${l.price} ${l.src}`).join(', ')}`);
      chk(readL.some(isMoved)&&readL.some(l=>!isMoved(l)),`after the press, the read gives no moved tested line or no line the pull had no price for, so the case cannot tell: ${readL.map(l=>l.label+' '+l.src).join(', ')||'none'}`);
      chk(!top.some(l=>isMoved(l)&&+l.k===PULL[l.pid][l.stat]),`after the press, the Top 30 lines still offer a moved line at the pull's old number: ${top.filter(l=>isMoved(l)&&+l.k===PULL[l.pid][l.stat]).map(l=>l.name+' '+l.label).join(', ')}`);
      chk(![...F('pricedLegs')([GM]),...top].some(l=>l.stat==='completions'),'after the press, a completions line (an untested kind) is priced for the suggestions or on the Top 30 lines');
      chk(top.some(l=>l.pid==='aud-v14'&&l.stat==='receptions'&&l.main&&l.src==='real'&&+l.k===STILL&&!!dkIdAud(l)),`after the press, the receptions line the read left where the pull had it is not on the Top 30 lines at the pull's price with its id: ${top.filter(l=>l.pid==='aud-v14').map(l=>l.label+' '+l.src).join(', ')||'none of his'}`);
      chk(r1.noId===q.noId&&q.noId>0,`after the press, the made-up game's Top 30 lines count ${r1.noId} left out for want of a DraftKings id, where the audit's own are ${q.noId} (and must be more than none)`);
      /* slip-only: everything that builds a parlay */
      { const bad=[]; const noId=(where,legs)=>{ for(const l of legs||[]) if(!dkOk(l)) bad.push(`${l.name} ${l.label} (${l.src}) in ${where}`); };
        for(const t of F('getPbTiers')().tiers) noId(`the ${t.id} level`,t.legs);
        const s=F('spSet')(GM.id); for(const t of (s?s.tiers:[])) noId(`the set's ${t.id}`,t&&t.legs);
        noId('the hands\' pool',F('gameLegPool')(GM)); const H=F('gameTiers')(GM); for(const id of ['high','med','low']) if(H&&H[id]) noId(`the ${id} hand`,H[id].legs);
        chk(!bad.length&&!!s,`after the press, a leg from the read with no DraftKings id goes into something that builds a parlay${s?'':' (or the made-up Monday night game has no set)'}: ${bad.slice(0,5).join('; ')}`); }
      said14.push(`${top0.length} lines before the press and the same after one that moved nothing; after one that moved them, ${top.length} lines, all with ids, ${readL.length} lines from the read with no id left out, no completions line, the unmoved line with its id; none in a level, the set or a hand`);
      /* with no ids carried: the read's legs on the list as before, with no line */
      dkSet(undefined); allOn(); const topN=F('getPbTop')().rows;
      chk(topN.some(l=>l.src==='dkline'),'with no DraftKings ids carried, the made-up game\'s Top 30 lines take no leg from the read, as they did before ids');
      if(holdTopF) holdTopF('a made-up game after the press, no ids carried');
      F('renderPb')(); chk(!d.querySelector('#pbPanel [data-pb-slip]'),'with no DraftKings ids carried, a Top 30 row carries the line on a missing DraftKings id');
      said14.push(`with no ids carried, ${topN.filter(l=>l.src==='dkline').length} lines from the read listed as before ids, none with the line`);
      ran=true;
    } catch(e){ chk(false,'M14 threw: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' ')); }
    finally {
      w.fetch=keepFetch; putF(keepF[0]); delete w.__m14G; for(const p of PL) delete S.players[p[0]];
      { const i=S.sched.findIndex(g=>g.id===GM.id); if(i>=0) S.sched.splice(i,1); }
      if(keepMk==='null') delete PAY0.mkt[String(cw)]; else PAY0.mkt[String(cw)]=JSON.parse(keepMk);
      if(keepIds===undefined) delete PAY0.espn_ids; else PAY0.espn_ids=keepIds;
      for(const n of EV) setVar(n,keepE[n]); setVar('ESPN_SEQ',keepSeq+1);
      try{ if(key0==null) w.localStorage.removeItem(KK); else w.localStorage.setItem(KK,key0); }catch(e){}
      dkSet(keepDk);
      /* (app v125) the published blocks, put back as copies above, are the very objects the published read records again */
      try{ rebake(); }catch(e){ chk(false,'M14: the published read could not be put back: '+e); }
      S.ui.pb=JSON.parse(keepU); S.parlay=JSON.parse(keepPar); dropCaches(); F('save')(); F('renderParlay')(); }
    if(!ran) said14.push('did not run');
    console.log(`M14. a press that moves DraftKings' player lines, on a made-up Monday night game: ${said14.join('; ')}`); }

  /* ---- M17. the published read: the props job's own read of DraftKings' lines on ESPN (app v125) ----
     The owner, 20 October 2026: no scheduled paid pull; every visitor sees DraftKings' lines read from ESPN, which the
     props job reads itself on every run with the page's own reader (espnReadWeek) and publishes in the payload (PAY.espn,
     and the schedule's game lines marked lsr 'espn'), which the page installs at boot (espnPublished). On two made-up
     games of the audit's own (rule (c): on the schedule for the run, pbGames stood in, four made-up players in S.players
     with ESPN ids, PAY.espn and PAY.dk in place of the payload's, the read answered by a fetch stub of the audit's own,
     and every piece of the page's ESPN state, its kept key, the builder and the clock put back on every path, so it holds
     in any week, at any hour and in the off-season): a Monday night game GA with a published read of its game lines and
     its players' lines ('ok'), and a Tuesday game GB whose read found no player lines ('none'). Held, blocking:
       - espnPublished installs GA's block into ESPN_LIVE (the very object ESPN_PUB records), merges its game-line ids into
         an entry that never carries the pull's ids (the audit's own content rule), dates them by the read (espnIdAt), and
         writes no ESPN_GL, ESPN_OUT, ESPN_IDAT, kept key or S; espnPressed false, espnWasRead true for both games;
         idempotent; a game's entry taken out takes its block and the ids it added back out
       - a block or an out dated at or after kickoff, an entry of another week, a value of another version or not the
         page's shape: nothing installed, nothing thrown
       - dkline legs from it reach pricedLegs, the levels' pool and a level (players only), a game page's hands' pool, the
         Top 30 lines and a set, with no DraftKings id needed; the bug fixed in app v125: after a press over the bake's
         dk:{}, the same (a press's entry never carries the pull's ids)
       - a kept read older than the published one set aside (named in ESPN_ASIDE, its status saying it gave way), a newer
         one standing, one made over this very publish (the same plsig, the audit's own hash) standing, one newer than the
         published read and older than a paid pull published since set aside (the later of the two is the publish's
         time), a kept 'none' never hiding the published block
       - a press: espnPressed and its status; its game lines applied over the published read's whatever their time says,
         the page's clock moved back two days; the reader alone (espnReadWeek) touching none of the page's state, its
         blocks and game lines the press's own, a 'none' dated, and one answered at or after the kickoff 'kicked' (a
         second before it still a 'none'), as an 'ok' that late is: the job publishes nothing dated there, and a late
         'none' refused the run until the review of 21 October 2026
       - the status line's time the latest read of the player lines alone: a game-line read newer than them, or a game
         read for its game lines alone, dates nothing (W.wording; the review of 21 October 2026)
       - a locked set's legs (two main lines from the read, of two players: since app v127 no rung is a leg) kept at
         their locked prices and fair chances through a republished read that moves their lines: the builder's price the
         locked level's own
       - the parlay card's pull hooks (parlayLegs, legPrice, legFair): inert without window.dkPulledFor; with a stub, the
         leg at the stub's price ('real') and fair chance, the builder's price parlayDec on them, and nothing in S.parlay
     The status lines' words W.wording. */
  { const cw=F('currentWeek')(), pad=String(cw).padStart(2,'0'), PAY0=F('PAY'), said16=[], clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v)), isG=F('isGameLeg');
    const wk=String(cw), iso=t=>new w.Date(t).toISOString(), same=(a,b)=>JSON.stringify(a)===JSON.stringify(b), pp=F('parlayProb');
    const GA={id:`2099_${pad}_AUP_AUQ`,w:cw,a:'AUP',h:'AUQ',d:'2099-01-05',t:'20:15',sp:2.5,tot:44.5,mla:120,mlh:-140,spa:-110,sph:-110,tov:-110,tou:-110};
    const GB={id:`2099_${pad}_AUR_AUS`,w:cw,a:'AUR',h:'AUS',d:'2099-01-06',t:'20:15',sp:-1.5,tot:41.5,mla:-120,mlh:100,spa:-110,sph:-110,tov:-110,tou:-110};
    const PL=[['aud-q16','AUQ','QB','Made-up Signal'],['aud-w16','AUP','WR','Made-up Flanker'],['aud-r16','AUP','RB','Made-up Tailback'],['aud-v16','AUQ','WR','Made-up Slot']];
    const AID={'aud-q16':'99161001','aud-w16':'99161002','aud-r16':'99161003','aud-v16':'99161004'}, EID='99160001';
    const mkP=([id,team,grp,n])=>{ const st=w.eval('GRP_STATS')[grp]||[], pv=s=>{ const v=PAY0.prior&&PAY0.prior[grp]&&PAY0.prior[grp][s]; return v!=null&&isFinite(v)&&v>0?v:1; };
      return {id,n,pos:grp,grp,team,gp:8,base_gp:17,e5:Object.fromEntries(st.map(s=>[s,[pv(s),1]])),e3:Object.fromEntries(st.map(s=>[s,[pv(s),1]])),
        car:Object.fromEntries(st.map(s=>[s,[pv(s)*40,40]])),py:Object.fromEntries(st.map(s=>[s,pv(s)]))}; };
    /* everything M17 stands in or moves, put back in the finally whatever path it leaves by */
    const EV=['ESPN_LIVE','ESPN_GL','ESPN_OUT','ESPN_NAMES','ESPN_IDAT','ESPN_KEPT','ESPN_ASIDE','ESPN_KEEP_GONE','ESPN_KEEP_OFF','ESPN_RUN','ESPN_PUB','ESPN_PUB_IDS','ESPN_PUB_ADDED'];
    const setVar=(n,v)=>w.eval(`(function(v){ ${n}=v; })`)(v), keepE=Object.fromEntries(EV.map(n=>[n,clone(F(n))])), keepSeq=F('ESPN_SEQ'), keepPubDk=F('ESPN_PUB_DK');
    const keepF=w.eval('[pbGames]'), putF=w.eval('(function(a){ pbGames=a; })'), keepU=JSON.stringify(F('pbUi')()), keepDk=PAY0.dk, keepEspn=clone(PAY0.espn), keepIds=PAY0.espn_ids;
    const keepPar=JSON.stringify(S.parlay||{}), keepBP=S.bookPrice, keepFetch=w.fetch, now0=w.Date.now, nodeNow0=Date.now;
    const KK=F('ESPN_KEEP_KEY'), key0=(()=>{ try{ return w.localStorage.getItem(KK); }catch(e){ return null; } })();
    const lsGet=()=>{ try{ return w.localStorage.getItem(KK); }catch(e){ return null; } }, lsSet=v=>{ try{ if(v==null) w.localStorage.removeItem(KK); else w.localStorage.setItem(KK,v); }catch(e){} };
    const K16=['ml','ats','total','over','under'], ticks=(ks,on)=>{ const u=F('pbUi')(); for(const k of K16) u.k[k]=ks.includes(k); u.off=[GA,GB].filter(g=>!on.includes(g)).map(g=>g.id); dropCaches(); };
    const fnv=s=>{ let h=0x811c9dc5; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; } return h.toString(16); };
    /* the audit's own espnPlSig: the paid pull's at and main lines (none here), and the published read of the game's player lines */
    const plSigAud=g=>{ const E=((PAY0.dk||{})[wk]||{})[g.id], P=(PAY0.espn&&PAY0.espn.v===1&&PAY0.espn.games||{})[g.id];
      return fnv(String(E&&E.at||'')+'|'+(P&&String(P.w)===wk?'|espn:'+String(P.pl&&P.pl.at||'')+':'+String(P.out&&P.out.st||'')+':'+String(P.out&&P.out.at||''):'')); };
    /* the read the stub serves: a scoreboard of GA's event with DraftKings' odds (sb), and its player lines (items) */
    let items=[], sbOdds=null, propsCode=200, propsDate=null, nReq=0; const esp=u=>/^https:\/\/(site|sports\.core)\.api\.espn\.com\//.test(u);
    const ans=(code,body,date)=>Promise.resolve({ok:code===200,status:code,headers:{get:h=>date!=null&&/^date$/i.test(String(h))?date:null},json:async()=>clone(body)});
    const oddsBody=L=>{ if(!L) return []; const s=x=>(x>0?'+':'')+x;
      return [{provider:{id:'100'},moneyline:{home:{close:{odds:s(L.mlh),link:{href:'https://sportsbook.draftkings.com/event/99169999?outcomes=0AUD16MH'}}},away:{close:{odds:s(L.mla),link:{href:'https://sportsbook.draftkings.com/event/99169999?outcomes=0AUD16MA'}}}},
        pointSpread:{home:{close:{line:s(-L.sp),odds:s(L.sph)}},away:{close:{line:s(L.sp),odds:s(L.spa)}}},total:{over:{close:{line:'o'+L.tot,odds:s(L.tov)}},under:{close:{line:'u'+L.tot,odds:s(L.tou)}}}}]; };
    const stub=(u,o)=>{ u=String(u); if(!esp(u)) return keepFetch(u,o); nReq++;
      if(/\/scoreboard\?/.test(u)) return ans(200,{events:[{id:EID,date:F('kickoff')(GA).toISOString(),competitions:[{competitors:[{homeAway:'home',team:{abbreviation:GA.h,id:'99162'}},{homeAway:'away',team:{abbreviation:GA.a,id:'99163'}}],odds:oddsBody(sbOdds)}]}]});
      const m=/\/events\/(\d+)\/competitions\/\d+\/odds\/100\/propBets\?(.*)$/.exec(u);
      if(m&&m[1]===EID){ if(propsCode!==200) return ans(propsCode,{error:{code:propsCode}},propsDate); const pg=+new URLSearchParams(m[2]).get('page')||1;
        return ans(200,{count:items.length,pageIndex:pg,pageSize:1000,pageCount:Math.max(1,Math.ceil(items.length/1000)),items:items.slice((pg-1)*1000,pg*1000)}); }
      return ans(404,{error:{code:404}}); };
    const mainT=Object.fromEntries(Object.entries(ESPN.TYPES.main).map(([k,v])=>[v,k])), mileT=Object.fromEntries(Object.entries(ESPN.TYPES.mile).map(([k,v])=>[v,k]));
    const ath=pid=>({$ref:`http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${F('SEASON')}/athletes/${AID[pid]}?lang=en&region=us`});
    const itemsOf=b=>{ const out=[]; for(const pid of b.td||[]) out.push({type:{id:'31'},athlete:ath(pid)});
      for(const [pid,o] of Object.entries(b.lines||{})) for(const [st,L] of Object.entries(o)) out.push({type:{id:mainT[st]},athlete:ath(pid),current:{target:{value:L}}},{type:{id:mainT[st]},athlete:ath(pid),current:{target:{value:L}}});
      for(const [pid,o] of Object.entries(b.rungs||{})) for(const [st,ks] of Object.entries(o)) for(const k of ks) out.push({type:{id:mileT[st]},athlete:ath(pid),current:{target:{value:k}}}); return out; };
    /* a block's lines, rungs and touchdown list in one order, its time aside */
    const blk=b=>b?JSON.stringify([Object.keys(b.lines||{}).sort().map(p=>[p,Object.keys(b.lines[p]).sort().map(s=>[s,b.lines[p][s]])]),Object.keys(b.rungs||{}).sort().map(p=>[p,Object.keys(b.rungs[p]).sort().map(s=>[s,b.rungs[p][s]])]),[...(b.td||[])].sort()]):null;
    const live=()=>(F('ESPN_LIVE')[wk]||{})[GA.id], pubOf=gid=>F('espnPubOf')(gid,cw);
    const setLines=(g,L,t)=>{ for(const k of ['mla','mlh','sp','spa','sph','tot','tov','tou']){ if(L[k]==null) delete g[k]; else g[k]=L[k]; } g.ls='dk'; g.lat=t; g.lsr='espn'; };
    let ran=false;
    try{
      S.sched.push(GA,GB); for(const p of PL) S.players[p[0]]=mkP(p);
      w.__m16G=[GA,GB]; w.eval('pbGames=function(){ return window.__m16G.filter(g=>!gameStarted(g)&&!hasScore(g)); };');
      PAY0.espn_ids=Object.fromEntries(Object.entries(AID).map(([pid,aid])=>[aid,pid]));
      /* a table as the bake writes it now (no paid pull): {}, the page's own (unmarked), the read's ids going into it */
      PAY0.dk={}; setVar('ESPN_PUB_DK',null); w.fetch=stub;
      for(const n of ['ESPN_LIVE','ESPN_GL','ESPN_OUT','ESPN_IDAT','ESPN_KEPT','ESPN_ASIDE','ESPN_KEEP_GONE','ESPN_PUB','ESPN_PUB_IDS','ESPN_PUB_ADDED']) setVar(n,{}); setVar('ESPN_KEEP_OFF',false); lsSet(null);
      const r0=rosterFor(GA,false), xs=[...r0[GA.a].players,...r0[GA.h].players].filter(x=>AID[x.pl.id]), X=pid=>xs.find(x=>x.pl.id===pid);
      chk(xs.length===4,`M17: the made-up players are not on their made-up clubs' rosters for the game (${xs.map(x=>x.pl.id).join(', ')||'none'} of 4)`);
      /* each line where the model makes the over about 60% (the half point nearest it), as M14 sets them */
      const at60=(pid,st)=>{ const x=X(pid), pr=x&&F('project')(x.pl,st,x.opp,x.ctx), mu=pr&&pr.mu; if(!(mu>0)) return null; let b=null;
        for(let L=0.5;L<Math.max(4,mu*3);L+=1){ const p=F('pOver')(x.pl.grp,st,mu,L); if(!b||Math.abs(p-0.6)<Math.abs(b.p-0.6)) b={L,p}; } return b?b.L:null; };
      const Lq=at60('aud-q16','passing_yards'), Lw=at60('aud-w16','receiving_yards'), Lr=at60('aud-r16','rushing_yards'), Lv=at60('aud-v16','receiving_yards'), Lrec=at60('aud-w16','receptions');
      chk([Lq,Lw,Lr,Lv,Lrec].every(L=>L!=null&&L>=1.5),`M17: the made-up players' lines could not be set: ${JSON.stringify([Lq,Lw,Lr,Lv,Lrec])}`);
      const wRungs=(()=>{ const x=X('aud-w16'), l=x&&F('statLines')(x).find(z=>z.stat==='receiving_yards'); return l?l.rungs.map(r=>r.k).filter(k=>Math.abs(k-0.5-Lw)>1e-9).slice(0,4):[]; })();
      const T0=w.Date.now(), tPl=T0-2*3600e3, tNone=T0-3600e3;
      const GL={mla:125,mlh:-145,sp:2.5,spa:-108,sph:-112,tot:45.5,tov:-105,tou:-115};
      const IDS={[`team:${GA.a}|ml`]:'0AUD16P1',[`team:${GA.h}|ml`]:'0AUD16P2',[`team:${GA.a}|ats|${dkPt(GL.sp)}`]:'0AUD16P3',[`team:${GA.h}|ats|${dkPt(-GL.sp)}`]:'0AUD16P4',[`game|total|over|${dkPt(GL.tot)}`]:'0AUD16P5',[`game|total|under|${dkPt(GL.tot)}`]:'0AUD16P6'};
      const PLA={at:iso(tPl),lines:{'aud-q16':{passing_yards:Lq},'aud-w16':{receiving_yards:Lw,receptions:Lrec},'aud-r16':{rushing_yards:Lr},'aud-v16':{receiving_yards:Lv}},rungs:wRungs.length?{'aud-w16':{receiving_yards:wRungs}}:{},td:['aud-q16','aud-r16','aud-v16','aud-w16']};
      const PUB=()=>({v:1,read_at:iso(tPl-60e3),games:{[GA.id]:{w:wk,gl:{at:iso(tPl),lines:{...GL},ids:{...IDS},event:'99169999'},pl:clone(PLA),out:{st:'ok',at:iso(tPl)}},[GB.id]:{w:wk,out:{st:'none',at:iso(tNone)}}}});
      PAY0.espn=PUB(); setLines(GA,GL,iso(tPl));
      /* A. espnPublished installs it, and nothing else */
      const before=JSON.stringify([F('ESPN_GL'),F('ESPN_OUT'),F('ESPN_IDAT'),F('ESPN_KEPT')]), S0=JSON.stringify(S), k0=lsGet();
      const n1=F('espnPublished')(), b1=live(), P1=pubOf(GA.id);
      chk(n1===2&&!!b1&&!!P1&&P1.block===b1&&blk(b1)===blk(PLA)&&b1.at===PLA.at,`M17: espnPublished did not install GA's published block as published (n ${n1}, block ${b1?'there':'none'}, ESPN_PUB's ${P1&&P1.block===b1?'the same':'another'})`);
      chk(JSON.stringify([F('ESPN_GL'),F('ESPN_OUT'),F('ESPN_IDAT'),F('ESPN_KEPT')])===before&&JSON.stringify(S)===S0&&lsGet()===k0,'M17: espnPublished wrote a press\'s state (ESPN_GL, ESPN_OUT, ESPN_IDAT, ESPN_KEPT), S or the kept key');
      chk(!F('espnPressed')(GA.id,cw)&&F('espnWasRead')(GA.id,cw)&&F('espnWasRead')(GB.id,cw)&&!!pubOf(GB.id)&&pubOf(GB.id).st==='none'&&!pubOf(GB.id).block,'M17: the published block reads as pressed, or a game the read found ok or none as not read');
      { const E=(PAY0.dk[wk]||{})[GA.id]; chk(!!E&&Object.keys(IDS).every(k=>E[k]===IDS[k])&&E.event==='99169999'&&!dkEntryCarriesAud(E)&&!F('dkCarries')({week:cw,gid:GA.id})&&Object.keys(IDS).every(k=>F('espnIdAt')(GA.id,k)===tPl)&&isFinite(Date.parse(E.glat)),
        `M17: the published read's game-line ids are not in a PAY.dk entry that never carries the pull's ids, each dated by the read: ${JSON.stringify(E)}`); }
      { const seq=F('ESPN_SEQ'), n2=F('espnPublished')(); chk(n2===n1&&live()===b1&&F('ESPN_SEQ')===seq&&pubOf(GA.id).block===b1,'M17: espnPublished run again is not idempotent (its count, its block or ESPN_SEQ moved)'); }
      /* the legs it gives, with no DraftKings id needed */
      { ticks(['over','under'],[GA]); const pl=F('pricedLegs')([GA]).filter(l=>!isG(l)), dk=pl.filter(l=>l.src==='dkline'), pool=F('pbPool')([GA]), hp=F('gameLegPool')(GA), r=F('getPbTiers')(), top=F('getPbTop')().rows;
        ticks(K16,[GA,GB]); const s=F('spSet')(GA.id), sp=s?s.tiers.flatMap(t=>t.legs||[]):[];
        chk(dk.length>0&&dk.every(l=>l.espn&&l.espn.at===PLA.at)&&[...pool.pref,...pool.thin].some(l=>l.src==='dkline')&&hp.some(l=>l.src==='dkline')&&top.some(l=>l.src==='dkline')
          &&r.tiers.some(t=>t.legs&&t.legs.length)&&r.tiers.every(t=>!t.legs||t.legs.every(l=>l.src==='dkline'))&&sp.some(l=>l.src==='dkline'),
          `M17: the published read's player legs do not reach pricedLegs (${dk.length}), the levels' pool, a level (players only), the hands' pool, the Top 30 lines or GA's set: ${r.tiers.map(t=>t.why||t.legs.map(l=>l.src).join('+')).join(' / ')}`);
        said16.push(`${dk.length} legs from the published read priced, on the pool, a level, the hands' pool, the Top 30 and the set`); }
      /* the status line before a press: the published read, with GB's 'none' counted */
      { const tPub=Math.max(tPl,tNone), wantW=`DraftKings via ESPN, ${etAud(tPub)} · player prices est. · 1 game with no player lines yet.`;
        const wantG=`DraftKings via ESPN, ${etAud(tPl)} · player prices est.`;
        W.wording(F('espnStatus')(null)===wantW&&F('espnStatus')(GA.id)===wantG,`M17: before a press the status lines read "${F('espnStatus')(null)}" and "${F('espnStatus')(GA.id)}", not "${wantW}" and "${wantG}"`);
        W.wording(F('lineSource')(GA)===`DraftKings’, read from ESPN ${etAud(tPl)}`,`M17: GA's lines are said to be "${F('lineSource')(GA)}"`);
        /* the review of 21 October 2026: the time is the latest read of the player lines; GA's game lines read half an hour
           after them, and GB read for its game lines alone an hour after (no player read: every one failed while the
           scoreboard answered), date nothing, and GB alone reads as the publish */
        { const P=PUB(); P.games[GA.id].gl.at=iso(tPl+1800e3); P.games[GB.id]={w:wk,gl:{at:iso(tPl+3600e3),lines:{...GL},ids:{},event:null}}; PAY0.espn=P; F('espnPublished')();
          const want2=`DraftKings via ESPN, ${etAud(tPl)} · player prices est.`, bk=Date.parse(PAY0.baked_at||'');
          const wantB=`Prices as published${isFinite(bk)?' '+etAud(bk):''}.`;
          W.wording(F('espnStatus')(null)===want2&&F('espnStatus')(GA.id)===want2&&F('espnStatus')(GB.id)===wantB,
            `M17: with game lines read after the player lines, the status lines read "${F('espnStatus')(null)}", "${F('espnStatus')(GA.id)}" and "${F('espnStatus')(GB.id)}", not "${want2}" (twice) and "${wantB}": a read of the game lines alone dates no player price`);
          PAY0.espn=PUB(); F('espnPublished')(); } }
      /* B. what is never installed: a block or an out at or after kickoff, another week, another version or shape */
      { const ko=F('kickoff')(GA).getTime();
        const P=PUB(); P.games[GA.id].pl.at=iso(ko); P.games[GA.id].out.at=iso(ko); PAY0.espn=P; F('espnPublished')();
        chk(!live()&&!F('espnGame')(GA.id,cw)&&!!pubOf(GA.id)&&pubOf(GA.id).st==null&&!F('espnWasRead')(GA.id,cw),'M17: a published block or out dated at kickoff is installed, or the block before it left in place');
        const P2=PUB(); P2.games[GA.id].w=String(cw+1); PAY0.espn=P2; F('espnPublished')();
        chk(!live()&&!pubOf(GA.id),'M17: a published entry of another week is installed');
        let threw=null; for(const junk of ['junk',null,{v:2,games:PUB().games},{v:1,games:[]},{v:1,games:{[GA.id]:'x',[GB.id]:{w:wk,pl:{at:'no time',lines:{}}}}}]){
          try{ PAY0.espn=junk; F('espnPublished')(); }catch(e){ threw=e; } }
        chk(!threw&&!live()&&!pubOf(GA.id)&&!pubOf(GB.id),`M17: a published read of another version or not the page's shape is installed, or throws: ${threw}`);
        /* a block of the right shape whose every line the page never writes ("__proto__" among them, as an own key): an empty
           block, an out of no kind the page knows, nothing set on the page's built-ins */
        try{ PAY0.espn={v:1,games:{[GA.id]:{w:wk,pl:{at:iso(tPl),lines:JSON.parse('{"__proto__":{"passing_yards":250.5},"aud-q16":{"passing_yards":-3,"nope":5,"rushing_yards":10.25}}'),rungs:JSON.parse('{"__proto__":{"receiving_yards":[50]}}'),td:'x'},out:{st:'??',at:iso(tPl)}}}}; F('espnPublished')(); }catch(e){ threw=e; }
        chk(!threw&&!!live()&&same(live().lines,{})&&same(live().rungs,{})&&same(live().td,[])&&pubOf(GA.id).st==null&&w.Object.prototype.passing_yards===undefined&&w.Object.prototype.receiving_yards===undefined,
          `M17: a published block of lines the page never writes is not installed empty, its out not ignored, or it set something on the page's built-ins: ${threw||JSON.stringify(live())}`);
        PAY0.espn=PUB(); F('espnPublished')(); chk(!!live()&&pubOf(GA.id).block===live(),'M17: the published read put back is not installed again');
        /* a game's entry taken out: its block and the ids it added go with it */
        const P3=PUB(); delete P3.games[GA.id]; PAY0.espn=P3; F('espnPublished')();
        chk(!live()&&!((PAY0.dk[wk]||{})[GA.id])&&F('espnIdAt')(GA.id,`team:${GA.a}|ml`)==null,`M17: a game taken out of the published read keeps its block or the ids it added: ${JSON.stringify((PAY0.dk[wk]||{})[GA.id]||null)}`);
        PAY0.espn=PUB(); F('espnPublished')(); }
      /* D. a kept read on a reload, against the published one: older set aside, newer stands, the same plsig stands, a 'none' never hides it */
      { const SEA=F('SEASON'), reload=(kept,dk)=>{ lsSet(JSON.stringify({v:1,season:SEA,saved:T0,games:{[GA.id]:kept}}));
          for(const n of ['ESPN_LIVE','ESPN_GL','ESPN_OUT','ESPN_IDAT','ESPN_KEPT','ESPN_ASIDE','ESPN_KEEP_GONE','ESPN_PUB','ESPN_PUB_IDS','ESPN_PUB_ADDED']) setVar(n,{}); setVar('ESPN_KEEP_OFF',false);
          PAY0.dk=dk||{}; setVar('ESPN_PUB_DK',null); PAY0.espn=PUB(); setLines(GA,GL,iso(tPl)); F('espnPublished')(); F('espnRestore')(); dropCaches(); };
        const blkK={at:null,lines:{'aud-w16':{receiving_yards:Lw+10}},rungs:{},td:[]}, okOut=t=>({st:'ok',why:'',sb:false,when:t});
        reload({w:wk,pl:{...blkK,at:iso(T0-5*3600e3)},plsig:'0',out:okOut(T0-5*3600e3)});
        const aside=F('ESPN_ASIDE')[GA.id];
        chk(live()===pubOf(GA.id).block&&!!aside&&aside.pl===T0-5*3600e3&&!F('espnPressed')(GA.id,cw),`M17: a kept read older than the published one is not set aside for it: ${JSON.stringify(live()&&live().lines)} ${JSON.stringify(aside)}`);
        W.wording(/newer prices published since your read(?! of)/.test(F('espnStatus')(GA.id)),`M17: a kept read the published read set aside: the status line reads "${F('espnStatus')(GA.id)}"`);
        reload({w:wk,pl:{...blkK,at:iso(T0-1800e3)},plsig:'0',out:okOut(T0-1800e3)});
        chk(!!live()&&live()!==pubOf(GA.id).block&&live().lines['aud-w16'].receiving_yards===Lw+10&&F('espnPressed')(GA.id,cw)&&!F('ESPN_ASIDE')[GA.id],'M17: a kept read newer than the published one does not stand over it');
        PAY0.espn=PUB(); const sig=plSigAud(GA);
        chk(F('espnPlSig')(GA)===sig,`M17: the page's espnPlSig over the published read is ${F('espnPlSig')(GA)}, the audit's own ${sig}`);
        reload({w:wk,pl:{...blkK,at:iso(T0-5*3600e3)},plsig:sig,out:okOut(T0-5*3600e3)});
        chk(!!live()&&live().lines['aud-w16'].receiving_yards===Lw+10&&!F('ESPN_ASIDE')[GA.id],'M17: a kept read made over this very published read (the same plsig) does not stand, older though it is');
        /* a kept read newer than the published read, with a paid pull published after it (PAY.dk's at), the
           published read older than both: the later of the two is the publish's own time for the
           player half, so the kept read gives way */
        reload({w:wk,pl:{...blkK,at:iso(T0-1800e3)},plsig:'0',out:okOut(T0-1800e3)},{[wk]:{[GA.id]:{at:iso(T0-600e3),[`aud-w16|receiving_yards|over|${dkPt(Lw)}`]:'0AUD16PAID'}}});
        { const A=F('ESPN_ASIDE')[GA.id];
          chk(live()===pubOf(GA.id).block&&!!A&&A.pl===T0-1800e3&&!F('espnPressed')(GA.id,cw),`M17: a kept read newer than the published read and older than a paid pull published since is not set aside: ${JSON.stringify(live()&&live().lines)} ${JSON.stringify(A)}`); }
        reload({w:wk,out:{st:'none',why:'',sb:false,when:T0-1800e3},plsig:'0'});
        chk(live()===pubOf(GA.id).block&&!!F('espnGame')(GA.id,cw)&&(F('ESPN_OUT')[GA.id]||{}).st==='none'&&F('pricedLegs')([GA]).some(l=>l.src==='dkline'),'M17: a kept read that found no player lines hides the published block');
        lsSet(null); for(const n of ['ESPN_LIVE','ESPN_GL','ESPN_OUT','ESPN_IDAT','ESPN_KEPT','ESPN_ASIDE','ESPN_KEEP_GONE','ESPN_PUB','ESPN_PUB_IDS','ESPN_PUB_ADDED']) setVar(n,{});
        PAY0.dk={}; setVar('ESPN_PUB_DK',null); PAY0.espn=PUB(); setLines(GA,GL,iso(tPl)); F('espnPublished')(); dropCaches();
        said16.push('a kept read older than the published one set aside, a newer one and one made over it standing, one older than a paid pull published since set aside, a kept none never hiding it'); }
      /* E. the reader alone, then a press */
      { const PR={at:null,lines:{'aud-q16':{passing_yards:Lq+5},'aud-w16':{receiving_yards:Lw},'aud-r16':{rushing_yards:Lr},'aud-v16':{receiving_yards:Lv+3}},rungs:PLA.rungs,td:['aud-q16','aud-v16']};
        items=itemsOf(PR); sbOdds={mla:140,mlh:-165,sp:3.5,spa:-105,sph:-115,tot:46.5,tov:-110,tou:-110}; propsCode=200;
        const snap=()=>JSON.stringify([F('ESPN_LIVE'),F('ESPN_GL'),F('ESPN_OUT'),F('ESPN_IDAT'),PAY0.dk,lsGet(),[GA.mla,GA.sp,GA.tot,GA.lat]]), s0=snap();
        const r=await F('espnReadWeek')(cw,[GA]);
        chk(snap()===s0,'M17: espnReadWeek changed the page\'s ESPN state, PAY.dk, the kept key or the game\'s lines');
        const o=r&&r.out&&r.out[GA.id], g1=r&&r.gl&&r.gl[GA.id], p1=r&&r.pl&&r.pl[GA.id];
        chk(!!o&&o.st==='ok'&&!!g1&&g1.od.lines.mla===140&&g1.od.lines.sp===3.5&&g1.od.lines.tot===46.5&&!!p1&&blk(p1.block)===blk(PR)&&isFinite(p1.at)&&!!p1.placed&&Object.keys(p1.placed).length===4&&Object.values(p1.placed).every(x=>x.how==='id'&&!!x.aid),
          `M17: espnReadWeek did not return the read as the stub served it: ${JSON.stringify({o,g1:g1&&g1.od.lines,placed:p1&&p1.placed})}`);
        /* a 'none' carries its time; a game not on the scoreboard fails */
        propsCode=404; const rN=await F('espnReadWeek')(cw,[GA,GB]); propsCode=200;
        /* the review of 21 October 2026: a 'none' answered at or after the kickoff (its 404 dated there; the scoreboard
           read before it) is 'kicked', as an 'ok' that late is, and one a second before it is still a 'none' at its time */
        { const koA=F('kickoff')(GA).getTime(); propsCode=404;
          propsDate=new Date(koA).toUTCString(); const rK=await F('espnReadWeek')(cw,[GA]);
          propsDate=new Date(koA-1000).toUTCString(); const rB=await F('espnReadWeek')(cw,[GA]);
          propsDate=null; propsCode=200;
          chk(rK.out[GA.id].st==='kicked'&&rB.out[GA.id].st==='none'&&rB.out[GA.id].at===koA-1000,
            `M17: espnReadWeek's 'none' answered at the kickoff is not 'kicked', or one a second before it not a 'none' at its time: ${JSON.stringify({at:rK.out[GA.id],before:rB.out[GA.id]})}`); }
        chk(rN.out[GA.id].st==='none'&&isFinite(rN.out[GA.id].at)&&rN.out[GA.id].at>0&&rN.out[GB.id].st==='failed'&&rN.out[GB.id].sb===true,`M17: espnReadWeek's 'none' carries no time, or a game not on the scoreboard is not failed: ${JSON.stringify(rN.out)}`);
        /* the press: the same read applied, over the published read's game lines whatever their time says */
        await F('espnRefresh')(GA.id); dropCaches();
        const GLd=(F('ESPN_GL')[GA.id]||{}).d||{};
        chk(F('espnPressed')(GA.id,cw)&&blk(live())===blk(PR)&&GA.mla===140&&GA.sp===3.5&&GA.tot===46.5&&Object.keys(r.gl[GA.id].od.lines).every(k=>Array.isArray(GLd[k])&&GLd[k][0]===r.gl[GA.id].od.lines[k]),
          `M17: the press did not apply what espnReadWeek reads (its block, its game lines over the published read's): ${JSON.stringify({ml:GA.mla,sp:GA.sp,tot:GA.tot,d:GLd})}`);
        W.wording(/^DraftKings via ESPN, read /.test(F('espnStatus')(GA.id))&&/by Refresh odds/.test(F('lineSource')(GA)),`M17: after a press the status line reads "${F('espnStatus')(GA.id)}" and the lines "${F('lineSource')(GA)}"`);
        /* app v125's fix: a press over the bake's dk:{} leaves the game's player legs in every pool */
        { const E=(PAY0.dk[wk]||{})[GA.id]; ticks(['over','under'],[GA]); const pool=F('pbPool')([GA]), hp=F('gameLegPool')(GA), top=F('getPbTop')().rows, r2=F('getPbTiers')();
          ticks(K16,[GA,GB]); const s=F('spSet')(GA.id), sp=s?s.tiers.flatMap(t=>t.legs||[]):[];
          chk(!!E&&!dkEntryCarriesAud(E)&&!F('dkCarries')({week:cw,gid:GA.id})&&[...pool.pref,...pool.thin].some(l=>l.src==='dkline')&&hp.some(l=>l.src==='dkline')&&top.some(l=>l.src==='dkline')&&r2.tiers.some(t=>t.legs&&t.legs.some(l=>l.src==='dkline'))&&sp.some(l=>l.src==='dkline'),
            `M17: after a press over the bake's dk:{}, GA's entry carries ids or its player legs left a pool, a level, the Top 30 or its set: ${JSON.stringify(E)}`); }
        /* the page's clock two days back (as the smoke and PROPS_AUDIT_NOW move it): a press still applies over the published read */
        w.eval('(function(){ for(const id of Object.keys(ESPN_GL)){ const g=S.sched.find(x=>x.id===id); if(!g) continue; for(const k of ESPN_GL_KEYS){ if(ESPN_GL[id].orig[k]===undefined) delete g[k]; else g[k]=ESPN_GL[id].orig[k]; } } ESPN_GL={}; ESPN_LIVE={}; ESPN_OUT={}; ESPN_IDAT={}; })()');
        PAY0.espn=PUB(); setLines(GA,GL,iso(tPl)); F('espnPublished')();
        const off=-2*864e5; w.Date.now=()=>now0.call(w.Date)+off; Date.now=()=>nodeNow0()+off;
        sbOdds={mla:150,mlh:-175,sp:4.5,spa:-110,sph:-110,tot:47.5,tov:-110,tou:-110};
        await F('espnRefresh')(GA.id); w.Date.now=now0; Date.now=nodeNow0; dropCaches();
        chk(GA.mla===150&&GA.sp===4.5&&GA.tot===47.5&&!!F('ESPN_GL')[GA.id],`M17: with the page's clock two days back, a press does not apply its game lines over the published read's: ${GA.mla} ${GA.sp} ${GA.tot}`);
        w.eval('(function(){ for(const id of Object.keys(ESPN_GL)){ const g=S.sched.find(x=>x.id===id); if(!g) continue; for(const k of ESPN_GL_KEYS){ if(ESPN_GL[id].orig[k]===undefined) delete g[k]; else g[k]=ESPN_GL[id].orig[k]; } } ESPN_GL={}; ESPN_LIVE={}; ESPN_OUT={}; ESPN_IDAT={}; ESPN_KEPT={}; })()');
        lsSet(null); PAY0.dk={}; setVar('ESPN_PUB',{}); setVar('ESPN_PUB_IDS',{}); setVar('ESPN_PUB_ADDED',{}); setVar('ESPN_PUB_DK',null); PAY0.espn=PUB(); setLines(GA,GL,iso(tPl)); F('espnPublished')(); dropCaches();
        said16.push('the reader alone touching nothing, a press applying it over the published lines (the clock two days back too), and its player legs kept over dk:{}'); }
      /* G. a locked set's legs keep their locked prices and fair chances through a republished read that moves their lines */
      { const pl=F('pricedLegs')([GA]).filter(l=>l.src==='dkline'&&!isG(l)), mainL=pl.find(l=>l.main&&l.pid==='aud-q16'&&l.stat==='passing_yards'&&l.side==='over'),
          wideL=pl.find(l=>l.main&&l.pid==='aud-w16'&&l.stat==='receiving_yards'&&l.side==='over');
        /* made-up data, so blocking: both main lines are the published read's own (until app v127 the second was a rung) */
        chk(!!mainL&&!!wideL,`M17: the read gives no Over on the made-up passer's passing yards and the flanker's receiving yards to lock: ${pl.map(l=>l.label).join(', ')}`);
        if(mainL&&wideL){ const memo={}, kept=[mainL,wideL].map(l=>F('spLegOut')(l,memo,false)), L0=F('pbOrder')([mainL,wideL]);
          const dec0=F('parlayDec')(L0.map(l=>({leg:l,ml:l.price}))), p0=pp(L0).corr;
          const t2=F('spTierIn')({id:'safe',label:'Safe',n:2,floor:0,legs:kept,p:Math.round(p0*1e4)/1e4,fair:null,fair_est:true,dec:Math.round(dec0*1e3)/1e3,likeliest:false,thin:0,mkt:0},GA);
          chk(!!t2&&t2.legs.every(l=>!!l.kept),'M17: a locked level read back does not mark its legs kept');
          if(t2){ S.parlay={}; S.bookPrice=null; for(const l of t2.legs){ const {key,thin,pe,ev,imp,updated,fc,dec,win,...x}=l; S.parlay[key]=x; }
            const P=PUB(); P.games[GA.id].pl.at=iso(T0-600e3); P.games[GA.id].out.at=iso(T0-600e3); P.games[GA.id].pl.lines['aud-q16'].passing_yards=Lq+6; P.games[GA.id].pl.lines['aud-w16'].receiving_yards=Lw+6;
            PAY0.espn=P; F('espnPublished')(); dropCaches();
            const legs=F('parlayLegs')(), prs=legs.map(l=>F('legPrice')(l)), fr=legs.map(l=>F('legFair')(l)), byKey=new Map(t2.legs.map(l=>[l.key,l]));
            const bookDec=F('parlayDec')(legs.map((l,i)=>({leg:l,ml:prs[i].ml})));
            chk(legs.length===2&&legs.every((l,i)=>{ const k=byKey.get(l.key), kf=kept.find(x=>x.pid===l.pid&&x.stat===l.stat); return !!k&&prs[i].ml===k.price&&prs[i].src==='dkline'&&(kf.fair==null?fr[i]===null:(!!fr[i]&&fr[i].p===kf.fair&&fr[i].est===kf.fair_est)); })&&bookDec===t2.dec,
              `M17: after a republished read moved their lines, the locked legs in the builder are not at their locked prices and fair chances, or the builder's price ${bookDec} is not the locked level's ${t2.dec}: ${prs.map(p=>p.ml+' '+p.src).join(', ')}`);
            /* without the kept mark the same legs would move: the case can tell */
            const loose=legs.map(l=>{ const {kept:_k,...x}=l; return x; }), prL=loose.map(l=>F('legPrice')(l));
            chk(prL.some((p,i)=>p.ml!==prs[i].ml||p.src!==prs[i].src),'M17: the republished read moves no locked leg\'s price without the kept mark, so the case cannot tell');
            S.parlay={}; PAY0.espn=PUB(); F('espnPublished')(); dropCaches();
            said16.push('two locked main lines kept at their prices and fair chances through a republished read that moved both'); } } }
      /* H. the parlay card's pull hooks: inert without it; with a stub, the pulled price and fair chance, nothing in S.parlay */
      { const pl=F('pricedLegs')([GA]).filter(l=>!isG(l)), two=[pl.find(l=>l.pid==='aud-q16'),pl.find(l=>l.pid==='aud-r16')].filter(Boolean);
        W.coverage(two.length===2,'M17: no two legs of the made-up game to put in the builder for the pull hooks');
        if(two.length===2){ S.parlay={}; S.bookPrice=null; for(const l of two){ const {key,thin,...x}=l; S.parlay[key]=x; }
          delete w.dkPulledFor; const L0=F('parlayLegs')(), pr0=L0.map(l=>F('legPrice')(l)), f0=L0.map(l=>F('legFair')(l));
          chk(L0.every(l=>!('pulled' in l))&&L0.every((l,i)=>same(pr0[i],{ml:l.price,src:l.src})),`M17: with no pull, parlayLegs or legPrice is not as before: ${JSON.stringify(pr0)}`);
          const tgt=L0[0].key; w.dkPulledFor=l=>l.key===tgt?{ml:155,sid:'0AUDPULL',at:w.Date.now(),fair:{p:0.37,est:false}}:null;
          const L1=F('parlayLegs')(), pr1=L1.map(l=>F('legPrice')(l)), f1=L1.map(l=>F('legFair')(l)), i0=L1.findIndex(l=>l.key===tgt);
          const dec1=F('parlayDec')(L1.map((l,i)=>({leg:l,ml:pr1[i].ml})));
          chk(i0>=0&&pr1[i0].ml===155&&pr1[i0].src==='real'&&!!f1[i0]&&f1[i0].p===0.37&&f1[i0].est===false&&L1.every((l,i)=>i===i0||same(pr1[i],pr0[i]))
            &&Math.abs(dec1-F('parlayDec')(L1.map((l,i)=>({leg:l,ml:i===i0?155:pr0[i].ml}))))<1e-12,`M17: with a pull stubbed, a leg is not at the pulled price and fair chance, or the others moved: ${JSON.stringify(pr1)} ${JSON.stringify(f1)}`);
          F('renderParlay')(); F('save')();
          chk(!Object.values(S.parlay).some(l=>'pulled' in l)&&!/"pulled"/.test(JSON.stringify(S)),'M17: a pulled price reached S.parlay or the saved state');
          { const rows=[...d.querySelectorAll('#parlayBody tr.legrow')].map(r=>(r.querySelectorAll('td')[4]||{}).textContent||'').map(t=>t.replace(/\s+/g,' ').trim());
            chk(rows.includes('+155 real'),`M17: with a pull stubbed, the builder's row does not show the pulled price as DraftKings' own: ${rows.join(' / ')}`); }
          delete w.dkPulledFor; const L2=F('parlayLegs')();
          chk(L2.every((l,i)=>same(F('legPrice')(l),pr0[i])&&same(F('legFair')(l),f0[i])),'M17: with the pull taken away, the builder is not back on its own prices');
          S.parlay={};
          said16.push('the pull hooks inert without the card, a stub\'s price and fair chance taken and never kept'); } }
      ran=true;
    } catch(e){ chk(false,'M17 threw: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' ')); }
    finally {
      w.fetch=keepFetch; w.Date.now=now0; Date.now=nodeNow0; delete w.dkPulledFor; putF(keepF[0]); delete w.__m16G; for(const p of PL) delete S.players[p[0]];
      for(const g of [GA,GB]){ const i=S.sched.findIndex(x=>x.id===g.id); if(i>=0) S.sched.splice(i,1); }
      if(keepIds===undefined) delete PAY0.espn_ids; else PAY0.espn_ids=keepIds;
      if(keepEspn===undefined) delete PAY0.espn; else PAY0.espn=keepEspn;
      if(keepDk===undefined) delete PAY0.dk; else PAY0.dk=keepDk;
      for(const n of EV) setVar(n,keepE[n]); setVar('ESPN_PUB_DK',keepPubDk); setVar('ESPN_SEQ',keepSeq+1); lsSet(key0);
      S.ui.pb=JSON.parse(keepU); S.parlay=JSON.parse(keepPar); S.bookPrice=keepBP;
      /* the payload's own published read, its blocks the very objects ESPN_PUB records again */
      try{ rebake(); }catch(e){ chk(false,'M17: the published read could not be put back: '+e); }
      dropCaches(); F('save')(); F('renderParlay')(); }
    if(!ran) said16.push('did not run');
    console.log(`M17. the published read, on two made-up games: ${said16.join('; ')}`); }

  /* ---- NL. no ladder bets (app v127) ----
     The owner, 21 October 2026: "general question, is it possible to not do ladders and just include Same Game Parlay
     eligible stuff show up since we are only doing parlay builder stuff", and, offered every place a ladder showed (the
     Top 30 lines, the Suggested Parlays sets, the Elo picks, the builder, the game page's Threshold ladders box), "yes".
     A ladder bet (ladderAud, the audit's own reading, never the page's isLadder) is a player's over off his main line (a
     rung k+, "250+ passing yards") or two or more touchdowns. Held, blocking:
       NL1  on the week as it stands: the audit's list of the stats the page projects is the page's catalogue (MKT less
            the game bets); no ladder in pricedLegs, in any game to come's hands' pool (with every leg, as the ids would
            leave them), in the all-games levels or the Top 30 lines on every bet type (and none left out there as a
            rung's main line, getPbTop().same 0, since no rung reaches them), in every prime-time game's and the Sunday
            slot's live set as built (spSet) and as the tab shows one before its lock (spShown), or in their Elo picks
            where the page builds them; a locked set is the record's, as it locked, and is not held to it
       NL2  on a made-up Monday night game of the audit's own (rule (c): on the schedule for the check, three made-up
            players in S.players, a published read of DraftKings' lines on ESPN in place of the payload's listing
            milestone rungs for each, a paid rung price and a 2+ touchdowns price in S.odds under the game's own id, all
            put back on every path, so it holds in any week, at any hour and in the off-season): pricedLegs and the
            hands' pool give its main lines and touchdowns and no ladder, though the page installed the read's rungs and
            the pull priced one (the case can tell); its page, each player opened with the old box's choice saved on,
            draws no rung row, no box off a main line but the touchdown's one and no 2+ touchdowns, each stat the read
            gave a line its table, and each it gave none the no-line note and no table or box
       NL3  toggleLeg on the same game: the rung the pull priced, another the read lists and 2+ touchdowns refused,
            nothing put in the builder, and 2+ touchdowns over a one-touchdown leg held leaving it as it was; the main line
            and the one touchdown added (the controls)
     NL4, the builder's strip as the page loads a saved state, is in section I, by its reboots. The no-line note's words
     W.wording */
  { const cw=F('currentWeek')(), pad=String(cw).padStart(2,'0'), wk=String(cw), PAY0=F('PAY'), said=[], clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
    const ladTxt=ls=>ls.slice(0,4).map(l=>`${l.name||l.pid} ${l.label||(l.stat+' '+l.k)}`).join(', ');
    /* NL1. the week as it stands */
    { const cat=Object.keys(F('MKT')).filter(k=>!['ml','ats','total'].includes(k)).sort(), own=[...PLAYER_STATS_AUD].sort();
      chk(JSON.stringify(cat)===JSON.stringify(own),`NL1: the audit's list of the stats the page projects (${own.join(', ')}) is not the page's catalogue (${cat.join(', ')})`);
      const keepU=JSON.stringify(F('pbUi')());
      try{ const u=F('pbUi')(); for(const k of ['ml','ats','total','over','under']) u.k[k]=true; u.off=[];
        const open=F('pbGames')(), pl=F('pricedLegs')(), lad1=pl.filter(ladderAud);
        chk(!lad1.length,`NL1: pricedLegs gives a ladder bet on the week as it stands: ${ladTxt(lad1)}`);
        const hp=[]; for(const g of open) hp.push(...F('gameLegPool')(g,true).filter(ladderAud));
        chk(!hp.length,`NL1: a game's hands' pool holds a ladder bet: ${ladTxt(hp)}`);
        const T=F('getPbTiers')(), tl=T.tiers.flatMap(t=>t.legs||[]).filter(ladderAud);
        chk(!tl.length,`NL1: an all-games level holds a ladder bet: ${ladTxt(tl)}`);
        const top=F('getPbTop')(), rl=top.rows.filter(ladderAud);
        chk(!rl.length&&!(top.same>0),`NL1: the Top 30 lines list a ladder bet (${ladTxt(rl)||'none'}) or leave out ${top.same||0} rungs as their main line's bet, where no rung reaches them`);
        const units=[...F('spGames')()], sl=F('spSlotNext')(); if(sl) units.push(sl);
        let nSets=0, nShown=0, nElo=0; const sb=[], now=w.Date.now();
        for(const un of units){ const s=F('spSet')(un.id); if(!s) continue; nSets++;
          for(const t of (s.tiers||[])) for(const l of ((t&&t.legs)||[])) if(ladderAud(l)) sb.push(`${un.id}'s ${t.id}: ${ladTxt([l])}`);
          /* as the tab shows it, only before its lock (from the lock a set is the record's or this browser's own, kept) */
          const lock=F('spLockAt')(un);
          if(lock==null||now<lock){ const v=F('spShown')(un); nShown++;
            for(const t of [...((v&&v.tiers)||[]),...((v&&v.elo)||[])]) for(const l of ((t&&t.legs)||[])) if(ladderAud(l)) sb.push(`${un.id}'s ${t.id} as the tab shows it: ${ladTxt([l])}`); }
          const e=F('spEloSet')(un.id); if(e&&Array.isArray(e.tiers)){ nElo++; for(const t of e.tiers) for(const l of ((t&&t.legs)||[])) if(ladderAud(l)) sb.push(`${un.id}'s ${t.id}: ${ladTxt([l])}`); } }
        chk(!sb.length,`NL1: a Suggested Parlays set holds a ladder bet: ${sb.slice(0,4).join('; ')}`);
        /* what the published read lists for the games to come: rungs it read, none of them a leg */
        let nR=0; const G=pubGamesAud()||{};
        for(const g of open){ const e=G[g.id], R=e&&e.pl&&e.pl.rungs; if(R&&typeof R==='object') for(const p in R) for(const st in (R[p]||{})) nR+=(Array.isArray(R[p][st])?R[p][st].length:0); }
        said.push(`NL1 the week as it stands: ${pl.length} priced legs of ${open.length} games to come, ${T.tiers.filter(t=>t.legs).length} all-games levels, ${top.rows.length} Top 30 rows, ${nSets} sets built (${nShown} as the tab shows them before their lock, ${nElo} with Elo picks), no ladder bet, though the published read lists ${nR} rungs`); }
      finally{ S.ui.pb=JSON.parse(keepU); } }
    /* NL2 and NL3. a made-up Monday night game, its read listing rungs, a rung and 2+ touchdowns priced by the pull */
    const GN={id:`2099_${pad}_AUV_AUW`,w:cw,a:'AUV',h:'AUW',d:'2099-01-05',t:'20:15',sp:-2.5,tot:45.5,mla:120,mlh:-140,spa:-110,sph:-110,tov:-110,tou:-110};
    const PL=[['aud-q26','AUW','QB','Made-up Pocket'],['aud-w26','AUV','WR','Made-up Split End'],['aud-r26','AUV','RB','Made-up Halfback']];
    const mkP=([id,team,grp,n])=>{ const st=w.eval('GRP_STATS')[grp]||[], pv=s=>{ const v=PAY0.prior&&PAY0.prior[grp]&&PAY0.prior[grp][s]; return v!=null&&isFinite(v)&&v>0?v:1; };
      return {id,n,pos:grp,grp,team,gp:8,base_gp:17,e5:Object.fromEntries(st.map(s=>[s,[pv(s),1]])),e3:Object.fromEntries(st.map(s=>[s,[pv(s),1]])),
        car:Object.fromEntries(st.map(s=>[s,[pv(s)*40,40]])),py:Object.fromEntries(st.map(s=>[s,pv(s)]))}; };
    const hadOdds=Object.prototype.hasOwnProperty.call(S.odds||{},GN.id), keepOdds=clone((S.odds||{})[GN.id]), keepPar=JSON.stringify(S.parlay||{}), keepBP=S.bookPrice;
    const keepUi=JSON.stringify({game:S.ui.game,open:S.ui.open,all:S.ui.showAll});
    let ran=false;
    try{
      S.sched.push(GN); for(const p of PL) S.players[p[0]]=mkP(p);
      const r0=rosterFor(GN,false), xs=[...r0[GN.a].players,...r0[GN.h].players].filter(x=>PL.some(p=>p[0]===x.pl.id)), X=pid=>xs.find(x=>x.pl.id===pid);
      chk(xs.length===3,`NL2: the made-up players are not on their made-up clubs' rosters for the game (${xs.map(x=>x.pl.id).join(', ')||'none'} of 3)`);
      /* each line where the model makes the over about 60% (the half point nearest it), as M14 and M17 set theirs */
      const at60=(pid,st)=>{ const x=X(pid), pr=x&&F('project')(x.pl,st,x.opp,x.ctx), mu=pr&&pr.mu; if(!(mu>0)) return null; let b=null;
        for(let L=0.5;L<Math.max(4,mu*3);L+=1){ const p=F('pOver')(x.pl.grp,st,mu,L); if(!b||Math.abs(p-0.6)<Math.abs(b.p-0.6)) b={L,p}; } return b?b.L:null; };
      const Lq=at60('aud-q26','passing_yards'), Lw=at60('aud-w26','receiving_yards'), Lr=at60('aud-r26','rushing_yards'), Lrec=at60('aud-w26','receptions');
      chk([Lq,Lw,Lr,Lrec].every(L=>L!=null&&L>=1.5),`NL2: the made-up players' lines could not be set: ${JSON.stringify([Lq,Lw,Lr,Lrec])}`);
      /* the read's milestones: up to four of each line's own rungs, the one at its main Over left out (the page reads that as the main line) */
      const rungsOf=(pid,st,L)=>{ const x=X(pid), l=x&&statLines(x).find(z=>z.stat===st); return l&&L!=null?l.rungs.map(r=>r.k).filter(k=>Math.abs(k-0.5-L)>1e-9).slice(0,4):[]; };
      const LINES={'aud-q26':{passing_yards:Lq},'aud-w26':{receiving_yards:Lw,receptions:Lrec},'aud-r26':{rushing_yards:Lr}};
      const RU={'aud-q26':{passing_yards:rungsOf('aud-q26','passing_yards',Lq)},'aud-w26':{receiving_yards:rungsOf('aud-w26','receiving_yards',Lw)},'aud-r26':{rushing_yards:rungsOf('aud-r26','rushing_yards',Lr)}};
      const tPl=w.Date.now()-2*3600e3, iso=t=>new w.Date(t).toISOString();
      PAY0.espn={v:1,read_at:iso(tPl-60e3),games:{[GN.id]:{w:wk,pl:{at:iso(tPl),lines:clone(LINES),rungs:clone(RU),td:['aud-q26','aud-w26','aud-r26']},out:{st:'ok',at:iso(tPl)}}}};
      F('espnPublished')();
      /* the pull's prices, under the game's own id: a rung of the receiver's the read lists, and the back's touchdown, one and 2+ */
      const rk=RU['aud-w26'].receiving_yards[0], rk2=RU['aud-q26'].passing_yards[0];
      S.odds[GN.id]={'aud-w26':{receiving_yards:{[String(rk)]:150}},'aud-r26':{any_td:{'1':160,'2':400}}};
      pubCaches();
      const live=(F('ESPN_LIVE')[wk]||{})[GN.id], R=live&&live.rungs;
      chk(rk!=null&&rk2!=null&&!!R&&Array.isArray(R['aud-w26']&&R['aud-w26'].receiving_yards)&&R['aud-w26'].receiving_yards.includes(rk)&&Array.isArray(R['aud-q26']&&R['aud-q26'].passing_yards)&&R['aud-q26'].passing_yards.includes(rk2),
        `NL2: the page did not install the made-up read's rungs, so the case cannot tell: ${JSON.stringify(R)}`);
      /* NL2. the legs: main lines and touchdowns, no ladder */
      const pl=F('pricedLegs')([GN]), pool=F('gameLegPool')(GN), all=F('gameLegPool')(GN,true), lad=[...pl,...pool,...all].filter(ladderAud);
      chk(!lad.length,`NL2: on a made-up game whose read lists rungs and whose pull priced a rung and 2+ touchdowns, pricedLegs or the hands' pool gives a ladder bet: ${ladTxt(lad)}`);
      const has=(L,pid,st,f)=>L.some(l=>l.pid===pid&&l.stat===st&&f(l));
      chk(has(pl,'aud-q26','passing_yards',l=>l.main&&l.k===Lq&&l.src==='dkline')&&has(pl,'aud-w26','receiving_yards',l=>l.main&&l.k===Lw)&&has(pl,'aud-r26','any_td',l=>+l.k===1&&l.price===160&&l.src==='real')
        &&has(all,'aud-q26','passing_yards',l=>l.main),
        `NL2: the made-up game's main lines and touchdown are not in pricedLegs and the hands' pool, so the case cannot tell: ${ladTxt(pl)}`);
      said.push(`NL2 a made-up Monday night game: ${pl.length} priced legs and ${all.length} in the hands' pool, main lines and touchdowns, no ladder, though its read lists ${Object.values(RU).reduce((a,o)=>a+Object.values(o).reduce((b,v)=>b+v.length,0),0)} rungs and the pull priced a rung and 2+ touchdowns`);
      /* NL2. the game page, each player opened in turn with the old box's choice saved on */
      { const badP=[], badW=[]; let tbl=0, nol=0;
        S.ui.game=GN.id; S.ui.showAll=true; S.ui.showRungs=true;
        for(const [pid] of PL){ const x=X(pid); if(!x) continue; S.ui.open={[pid]:true}; F('renderGame')();
          const V=d.getElementById('gameView'), body=V.querySelector('.plrbody'), txt=body?body.textContent:'';
          if(!body){ badP.push(`${pid}: no player body`); continue; }
          if(body.querySelector('tr.rung')) badP.push(`${pid}: a rung row`);
          const boxes=[...body.querySelectorAll('input[data-leg]')], stOf=b=>String(b.dataset.leg).split('|')[2];
          const off=boxes.filter(b=>b.dataset.main!=='1'&&!(stOf(b)==='any_td'&&b.dataset.k==='1'));
          if(off.length) badP.push(`${pid}: a box off a main line (${off.map(b=>stOf(b)+' '+b.dataset.k).join(', ')})`);
          if(boxes.some(b=>stOf(b)==='any_td'&&+b.dataset.k>=2)||/Scores two or more/.test(txt)) badP.push(`${pid}: a 2+ touchdown box`);
          /* his one touchdown box where the model projects his touchdown (a quarterback's only on a payload with its model, app v102) */
          if(boxes.some(b=>stOf(b)==='any_td'&&b.dataset.k==='1')!==statLines(x).some(l=>l.prob)) badP.push(`${pid}: ${statLines(x).some(l=>l.prob)?'no touchdown box':'a touchdown box with no touchdown projected'}`);
          if(d.getElementById('rungCb')||/Threshold ladders|nothing counts out of sight|even though the ladders are hidden/.test(V.textContent)) badP.push(`${pid}: the ladder box or its note`);
          const blocks=[...body.querySelectorAll('.statblk')].filter(b=>!b.querySelector('input[data-leg$="|any_td"]'));
          const byName=new Map(blocks.map(b=>{ const h=b.querySelector('h4'); return [h&&h.firstChild?h.firstChild.textContent.trim():'',b]; }));
          for(const l of statLines(x)){ if(l.prob) continue; const b=byName.get(l.m.lbl), line=(LINES[pid]||{})[l.stat];
            if(!b){ badP.push(`${pid}: no ${l.stat} block`); continue; }
            const tb=b.querySelectorAll('table'), nl=b.querySelectorAll('[data-noline]'), mains=b.querySelectorAll(`input[data-leg="${GN.id}|${pid}|${l.stat}"][data-main="1"]`), any=b.querySelectorAll('input[data-leg]');
            if(line!=null){ tbl++; if(!(tb.length===1&&!nl.length&&mains.length===2&&any.length===2&&[...mains].every(m=>+m.dataset.k===line))) badP.push(`${pid}'s ${l.stat}: read at ${line}, drawn with ${tb.length} tables, ${mains.length} main-line boxes of ${any.length}, ${nl.length} no-line notes`); }
            else { nol++; if(!(nl.length===1&&!tb.length&&!any.length)) badP.push(`${pid}'s ${l.stat}: no line read, drawn with ${nl.length} no-line notes, ${tb.length} tables, ${any.length} boxes`);
              else if(!(nl[0].tagName==='P'&&nl[0].textContent==='No DraftKings line yet.')) badW.push(`${pid}'s ${l.stat}: "${nl[0].textContent}"`); } }
          if(blocks.length!==statLines(x).filter(l=>!l.prob).length) badP.push(`${pid}: ${blocks.length} stat blocks for ${statLines(x).filter(l=>!l.prob).length} stats`); }
        chk(!badP.length,`NL2: the made-up game's page offers a ladder bet, or draws a stat otherwise than its main line's table or the no-line note: ${badP.slice(0,5).join('; ')}`);
        chk(tbl>0&&nol>0,`NL2: the made-up game's page met ${tbl} stats with a line read and ${nol} with none, so a case went unheld`);
        W.wording(!badW.length,`NL2: a stat with no main line is worded otherwise: ${badW.slice(0,3).join('; ')}`);
        said.push(`its page draws no ladder, ${tbl} stats with their line's table and ${nol} with no line read saying so`); }
      /* NL3. toggleLeg: the ladders refused, the main line and the one touchdown added */
      { const tog=(key,k,side,main)=>F('toggleLeg')(key,k,GN,side,main), kW=`${GN.id}|aud-w26|receiving_yards`, kQ=`${GN.id}|aud-q26|passing_yards`, kT=`${GN.id}|aud-r26|any_td`;
        S.parlay={}; S.bookPrice=null;
        tog(kW,rk,'over',false); tog(kQ,rk2,'over',false); tog(kT,2,'over',false);
        chk(!Object.keys(S.parlay).length,`NL3: toggleLeg put a ladder bet in the builder (the pull's ${rk}+ receiving yards, the read's ${rk2}+ passing yards, or 2+ touchdowns): ${Object.values(S.parlay).map(l=>l.label).join(', ')}`);
        tog(kQ,Lq,'over',true); tog(kT,1,'over',false);
        const Q=S.parlay[kQ], T1=S.parlay[kT], pT=T1&&F('legPrice')(T1);
        chk(!!Q&&Q.main&&Q.k===Lq&&Q.side==='over'&&Q.src==='dkline'&&!!T1&&T1.stat==='any_td'&&T1.k===1&&!!pT&&pT.ml===160&&pT.src==='real',
          `NL3: toggleLeg did not add the made-up passer's main line at ${Lq} from the read and the back's one touchdown at the pull's +160: ${JSON.stringify(Q&&{k:Q.k,src:Q.src})} ${JSON.stringify(T1&&{k:T1.k,pT})}`);
        const was=JSON.stringify(S.parlay[kT]); tog(kT,2,'over',false);
        chk(JSON.stringify(S.parlay[kT])===was,'NL3: toggleLeg moved a one-touchdown leg held to 2+ touchdowns');
        said.push('NL3 toggleLeg refusing a rung the pull priced, one the read lists and 2+ touchdowns, adding the main line and the one touchdown'); }
      ran=true;
    } catch(e){ chk(false,'NL threw: '+String(e&&e.stack||e).split('\n').slice(0,3).join(' ')); }
    finally {
      { const k=JSON.parse(keepUi); S.ui.game=k.game; S.ui.open=k.open||{}; S.ui.showAll=k.all; delete S.ui.showRungs; }
      if(hadOdds) S.odds[GN.id]=keepOdds; else delete S.odds[GN.id];
      /* the payload's own read back while the made-up game is still on the schedule, so the page takes its block out */
      try{ rebake(); }catch(e){ chk(false,'NL: the published read could not be put back: '+e); }
      for(const p of PL) delete S.players[p[0]];
      { const i=S.sched.findIndex(g=>g.id===GN.id); if(i>=0) S.sched.splice(i,1); }
      chk(!(F('ESPN_LIVE')[wk]||{})[GN.id],'NL: the made-up game\'s published block was left installed');
      S.parlay=JSON.parse(keepPar); S.bookPrice=keepBP; dropCaches(); F('save')(); try{ F('closeGameModal')(); }catch(e){} F('renderParlay')(); }
    if(!ran) said.push('NL2 and NL3 did not run');
    console.log(`NL. no ladder bets: ${said.join('; ')}`); }

  /* ---- P. the amount bet: the Bet amount box at the top of the Parlay Builder's controls and the
     builder's own stake are one amount, S.stake, kept with the visitor's state. Every level of every
     Suggested Parlays set pays that amount times its own decimal price, as it is typed and once it is
     settled; a set's Add to builder leaves it in the builder; the builder's box and its one-tap amounts
     set the same number; a bad entry (blank, a word, 0, a minus) leaves the amount as it was and the box
     goes back to it; a saved amount that is not one reads as $20; nothing drawn from it is ever NaN. The
     set here is a fixed one on a made-up Sunday night game (spGames and spSet stood in for), its levels on
     this week's games still to come, so this holds on any week, lean or not, and with no prime-time game
     of its own; the week's own sets are held to the amount in M ---- */
  { d.querySelector('#tabs button[data-tab="parlay"]').click();
    const panel=d.getElementById('pbPanel'), spp=d.getElementById('spPanel'), was=S.stake, keepPar=JSON.stringify(S.parlay||{}), keepBP=S.bookPrice;
    const read=w.eval('typeof stakeRead')==='function'?F('stakeRead'):null;
    chk(!!read,'the page has no reading of a typed amount (stakeRead)');
    chk(!d.getElementById('suggStake')&&!d.querySelector('#pbPanel [data-stake-chip],#spPanel [data-stake-chip],#spPanel #pbStake')&&d.querySelectorAll('#pbStake').length<=1,'the suggestions carry amount buttons of their own, or more than one Bet amount box');
    /* a typed amount, read on its own: dollars to the cent, $1 to $100,000, and no amount at all for anything that is not a positive number */
    if(read){ const cases=[['25',25],[' 40 ',40],['7.5',7.5],['12.346',12.35],['$1,250',1250],['0.4',1],['100001',100000],['1e3',1000],[60,60],
        ['',null],['  ',null],['abc',null],['-5',null],['0',null],['NaN',null],['Infinity',null],[NaN,null],[Infinity,null],[-3,null],[0,null],[null,null],[undefined,null],[true,null],[{},null]];
      for(const [v,want] of cases){ const got=read(v); chk(got===want,`a typed amount ${typeof v==='string'?JSON.stringify(v):String(v)} reads as ${got}, not ${want}`); } }
    const games=F('pbGames')();
    if(!games.length) chk(!d.getElementById('pbStake'),'with no game to come the panel still offers a Bet amount box');
    else {
      /* a fixed set: Safe a money line on each of the first two games still to come (one if one is left),
         in the builder's order and at the builder's own price; a Medium on another price; and two that say
         why. Suggested Parlays is shown beside the Parlay Builder while this runs, so its sets are drawn */
      const L=F('pbOrder')(games.slice(0,2).map((g,i)=>({key:`${g.id}|team:${g.h}|ml`,gid:g.id,pid:'team:'+g.h,stat:'ml',k:0,side:'over',main:false,p:0.6,price:i?105:-135,src:'real',mu:null,
        name:'Fixed '+g.h,pos:'Game',grp:'TEAM',team:g.h,opp:g.a,week:g.w,label:'To win',thin:false})));
      const dec=F('parlayDec')(L.map(l=>({leg:l,ml:l.price}))), why='Only 2 legs in this game.';
      const G0={id:`2099_${String(F('currentWeek')()).padStart(2,'0')}_PAA_PHH`,w:F('currentWeek')(),a:'PAA',h:'PHH',d:'2099-01-04',t:'20:20'};
      w.__pG=G0; w.__pFix={gid:G0.id,tiers:[
        {id:'safe',label:'Safe',n:L.length,floor:0,legs:L,corr:0.4,indep:0.4,dec,thin:0},
        {id:'med',label:'Medium',n:3,floor:0.25,legs:L,corr:0.3,indep:0.3,dec:13.7,thin:0},
        {id:'aggr',label:'Aggressive',n:4,floor:0.12,why},{id:'xtrm',label:'Extreme',n:5,floor:0.05,why}]};
      /* (app v112) spOn, the one place the tab asks which games it sets out (one night at a time), stood in too:
         the made-up game is the night shown, whatever the real schedule's nights say */
      w.__pKeep=w.eval('[spGames, spSet, spOn]');
      const stab=d.getElementById('tab-suggest'), keepH=stab.hidden;
      try{ w.eval('spGames=function(){ return [window.__pG]; }; spSet=function(gid){ return gid===window.__pG.id?window.__pFix:null; }; spOn=function(){ return [window.__pG]; };'); stab.hidden=false;
      S.parlay={}; S.bookPrice=null; S.stake=20; F('renderParlay')();
      const box=()=>d.getElementById('pbStake'), FIX=w.__pFix.tiers.filter(t=>t.legs), txt=v=>v%1?v.toFixed(2):String(v), fid=`${G0.id}:safe`;
      const type=(el,v,commit)=>{ el.value=v; el.dispatchEvent(new w.Event('input')); if(commit) el.dispatchEvent(new w.Event('change')); };
      const noNaN=()=>!/NaN|Infinity|undefined/.test(panel.textContent+spp.textContent+d.getElementById('parlayBody').textContent);
      /* every level of the set pays this amount times its own price */
      const paysAll=s=>FIX.every(t=>payOk(d.querySelector(`#spPanel [data-sp-game="${G0.id}"] [data-pb-tier="${t.id}"] [data-pb-pay]`),s,t.dec));
      const paysTxt=()=>[...spp.querySelectorAll('.pb-nums div:last-child')].map(x=>[...x.children].map(c=>c.textContent).join(' ')).join(' / ');
      const b0=box();
      chk(!!b0&&b0.type==='number'&&b0.getAttribute('inputmode')==='decimal'&&b0.min==='1'&&b0.step==='1'&&+b0.max===100000&&b0.value==='20',
        'the Bet amount box is not a dollar box (a number, the decimal keypad, $1 up in steps of $1) showing the amount: '+(b0?b0.outerHTML:'none'));
      chk(!!b0&&b0.closest('.pb-row')===panel.querySelector('.pb-ctl > .pb-row')&&((panel.querySelector('label[for="pbStake"]')||{}).textContent||'')==='Bet amount',
        'the Bet amount box is not the first of the Parlay Builder\'s controls, labelled Bet amount');
      /* (app v112 to v129) a hint beside the box said the builder and every Suggested Parlays parlay use it; since app v130
         (the owner's call of 22 October 2026: no descriptions) none, and the box names no hint */
      W.wording(!d.getElementById('pbStakeHint')&&!!b0&&!b0.hasAttribute('aria-describedby')&&!/every parlay on Suggested Parlays pays on it|The builder below uses this amount/.test(panel.textContent),'the Bet amount box still draws its hint, or names one');
      chk(paysAll(20),'on the $20 to start, a level does not pay $20 times its price: '+paysTxt());
      if(b0){
        /* typed in the box: each entry as it is typed, then settled */
        let cur=20;
        for(const [v,want] of [['25',25],['7.5',7.5],['0.4',1],['100001',100000],['',null],['-5',null],['0',null],['abc',null],['12.346',12.35],['30',30]]){
          const b=box(); type(b,v,false);
          const live=want==null?cur:want;
          chk(S.stake===live&&paysAll(live)&&noNaN(),`"${v}" typed in the Bet amount box: the amount is ${S.stake} and the levels say ${paysTxt()}, not on ${amtTxt(live)}`);
          b.dispatchEvent(new w.Event('change')); cur=live;
          chk(S.stake===cur&&box().value===txt(cur)&&paysAll(cur)&&noNaN(),`"${v}" settled in the Bet amount box: the box shows "${box().value}", the amount is ${S.stake} and the levels say ${paysTxt()}, not on ${amtTxt(cur)}`); }
        w.eval('store.set(S)'); chk(JSON.parse(mem).stake===30,'the Bet amount is not kept with the visitor\'s own state');
        /* Add to builder: the level's legs, on the amount, paying what the level said */
        d.querySelector(`#spPanel [data-sp-add="${fid}"]`).click();
        const po=()=>d.querySelector('#parlayBody .payout'), pS=()=>d.getElementById('pStake');
        chk(Object.keys(S.parlay).length===L.length&&!!pS()&&pS().value==='30'&&!!po()&&po().textContent==='$'+(30*dec).toFixed(2),
          `Add to builder did not carry the Bet amount: the builder is on ${pS()?pS().value:'no stake'} and pays ${po()?po().textContent:'nothing'}, the level ${money(30*dec)} on $30`);
        if(pS()&&po()){
          /* typed again with the level in the builder: the levels at once, the builder a moment later,
             and settling it leaves the sets (and an Add to builder or Finish about to be pressed) as they are */
          { const addNode=d.querySelector(`#spPanel [data-sp-add="${fid}"]`), b=box();
            type(b,'45.5',false);
            chk(paysAll(45.5)&&pS().value==='30','typed in the Bet amount box, the levels did not follow at once, or the builder was redrawn under the pointer');
            await sleep(400);
            chk(pS().value==='45.50'&&po().textContent==='$'+(45.5*dec).toFixed(2),`a moment after typing $45.50, the builder is on ${pS().value} and pays ${po().textContent}, not $${(45.5*dec).toFixed(2)}`);
            b.dispatchEvent(new w.Event('change'));
            chk(d.querySelector(`#spPanel [data-sp-add="${fid}"]`)===addNode&&box()===b&&b.value==='45.50'&&S.stake===45.5,'settling the amount redrew the sets, so an Add to builder or Finish pressed straight after typing would be lost'); }
          /* the builder's own box is the same amount: the levels follow it as it is typed, and on leaving it */
          { type(pS(),'60',false);
            chk(box().value==='60'&&paysAll(60),'typed in the builder\'s stake, the Bet amount box or the levels did not follow');
            pS().dispatchEvent(new w.Event('change'));
            chk(S.stake===60&&box().value==='60'&&paysAll(60)&&po().textContent==='$'+(60*dec).toFixed(2),'the builder\'s stake, settled, is not the Bet amount');
            for(const v of ['','-1','0','abc']){ type(pS(),v,true);
              chk(S.stake===60&&pS().value==='60'&&box().value==='60'&&paysAll(60)&&noNaN(),`"${v}" in the builder's stake did not leave the amount at $60 everywhere: the amount ${S.stake}, the builder ${pS().value}, the box ${box().value}`); } }
          /* a saved amount that is not one reads as $20, and nothing reads NaN */
          for(const bad of ['abc',-4,0,NaN,null,'<b>',{}]){ S.stake=bad; F('renderParlay')();
            chk(w.eval('pbStake()')===20&&box().value==='20'&&paysAll(20)&&pS().value==='20'&&po().textContent==='$'+(20*dec).toFixed(2)&&noNaN(),`a saved amount ${typeof bad==='string'?JSON.stringify(bad):String(bad)} does not read as $20 everywhere: `+paysTxt()); } } }
      /* the Top 50 lines are on $1 and never move with the amount */
      { const t1=[...panel.querySelectorAll('[data-pb-win],[data-pb-ev]')].map(x=>x.textContent).join(); S.stake=77; F('renderParlay')();
        chk([...panel.querySelectorAll('[data-pb-win],[data-pb-ev]')].map(x=>x.textContent).join()===t1,'the Top 30 lines\' figures on $1 moved with the Bet amount'); }
      } finally {
        stab.hidden=keepH; w.eval('spGames=window.__pKeep[0]; spSet=window.__pKeep[1]; spOn=window.__pKeep[2];'); delete w.__pKeep; delete w.__pFix; delete w.__pG; }
      S.parlay={}; S.stake=20; F('renderParlay')(); }
    /* the builder's one-tap amounts set the same amount, with a leg in the builder so What it pays is drawn */
    /* from an empty builder, so the box ticked is a new leg: one an earlier section left on would be
       unticked by the click and leave no builder (the off-season, where no Bet amount block ran) */
    { S.parlay={}; F('renderParlay')(); openUpcoming();
      const tick=d.querySelector('#gameView input[data-leg]:not(:checked)');
      chk(!!tick,'no leg to tick on the coming game');
      if(tick){ tick.click(); d.querySelector('#tabs button[data-tab="parlay"]').click();
        const chip5=d.querySelector('#parlayBody [data-stake-chip="5"]');
        chk(!!chip5,'no amount buttons beside the stake in What it pays');
        if(chip5){ chip5.click();
          chk(S.stake===5&&+d.getElementById('pStake').value===5,'tapping $5 in the builder did not set the stake');
          chk(!F('pbGames')().length||(!!d.getElementById('pbStake')&&d.getElementById('pbStake').value==='5'),'tapping $5 in the builder did not set the Bet amount box over the suggested parlays');
          chk(d.querySelector('#parlayBody [data-stake-chip="5"]').classList.contains('on')&&d.querySelectorAll('#parlayBody [data-stake-chip].on').length===1,'the builder does not show $5 pressed, and only $5');
          chk(/\$\d+\.\d\d/.test(d.querySelector('#parlayBody .payout').textContent)&&+d.querySelector('#parlayBody .payout').textContent.replace(/[^\d.]/g,'')>5,'the builder payout did not redraw from the $5 stake'); }
        /* a typed amount that is none of them presses none */
        const pS=d.getElementById('pStake'); chk(!!pS,'no stake box in the builder with a leg in it');
        if(pS){ pS.value='7'; pS.dispatchEvent(new w.Event('change'));
          chk(S.stake===7&&!d.querySelector('#parlayBody [data-stake-chip].on'),'a typed $7 left a chip pressed'); }
        /* the builder has a Refresh odds of its own, with its status line, beside its legs (app v111) */
        W.wording(!!d.querySelector('#parlayBody [data-espn-refresh="week"]')&&!!d.querySelector('#parlayBody [data-espn-status="week"][aria-live="polite"]'),'the builder has no Refresh odds of its own with its status line'); } }
    S.parlay=JSON.parse(keepPar); S.bookPrice=keepBP; S.stake=was; F('save')(); F('renderParlay')();
    chk(S.stake===was,'the stake did not go back after the amount checks');
    console.log(`P. the amount bet: one Bet amount box over the Parlay Builder and the builder's stake, ${F('pbGames')().length?'every level of a set paying it times its price as typed and settled, carried by Add to builder, bad entries and saved amounts cleaned, the Top 30 lines on $1 unmoved':'no game to come, so no box'}; the builder's one-tap amounts set it`); }

  /* ---- P2. the suggestions record on Suggested Parlays (app v111; app v118: a section at a time, with the backtest):
     props/data/suggest_ledger.json, the props job's record, and props/data/suggest_backtest.json, the weeks before the
     record took them rebuilt and graded once (suggest_backtest.js), each read beside the payload once a load with no-store
     and kept outside S. Since app v118 (the owner's calls of 19 October 2026: "i noticed that the elo picks section in the
     suggest parlays tab does not have a record anymore", "can we retroactively look back and find what we would have
     suggested and count it to the record?", "do a separate section for night games and then the sunday slot of games")
     the tab was two sections, Night games (the files' prime map) and the Sunday slot (their slot map), each headed by its
     own record; since app v129 (the owner's calls of 22 October 2026: "get rid of the Sunday slot record section -> all
     should be a part of 'Night Games'", and "get rid of button (incl backteest wk 3-6), just include the record") one,
     Night games, its record both maps together, the backtest counted in it and no chip naming its weeks. The record is
     a row for the model's parlays (an entry's tiers, safe to xtrm) and one for the Elo picks (its elo, elo-safe
     to elo-xtrm), a pill a level, as the ELO Ratings tab's record bar: won-lost and units on $1, a push and a pending level
     counted apart, each season's unit and level once. A level is taken from the backtest and then from the record over
     it, each file in key order, so the record's grade for a level wins over the backtest's and, within a file, the last
     key holding the level's grade (a kickoff the league moved makes a new key); only a level with legs and a grade
     counts. Each pill's title gives the levels graded and won, the wins expected by the book's fair chance (on how many
     had one) and by the level's own chance (the model's, or the Elo's), the pushes and how many came from the backtest,
     and no chip says which weeks (one did until app v129). All worked here on the audit's own (recAud), on hand for the
     made-up files, then held on the page: on the real files read from disk, on a made-up record and backtest (a level only
     in the backtest, one in both with other results, a push, a pending level, a push-shortened win, a level with no
     parlay, another season's game, an entry still to come, Elo levels), on the backtest alone, on a backtest that is junk
     or missing (the record drawn as with none), on a record with nothing graded and on files that are not records
     (nothing drawn). The numbers are blocking (the pills' won-lost and units, each title's counts, the pending and none
     pills, no chip), the words W.wording. The all-games record (`entries`) stays in the file and is drawn
     nowhere. Nothing drawn while there is neither file (this audit's page has none) ---- */
  { d.querySelector('#tabs button[data-tab="suggest"]').click();
    const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'', recBox=sec=>d.querySelector(`#spSets [data-sp-sec="${sec}"] > .sp-rec[data-sp-recsec="${sec}"]`);
    const SECS=['all'], SEC_MAP={all:['prime','slot']}, KINDS_R={model:{pre:'',f:'tiers',by:'the model',name:'Model parlays'},elo:{pre:'elo-',f:'elo',by:'the Elo chance',name:'Elo picks'}};
    /* the two files, each asked for once as the page loaded, beside its payload, with no-store; the backtest, which never
       changes once written, never again (a set reaching its lock has the record read again alone) */
    { const askL=BOOT_CALLS.filter(c=>/suggest_ledger\.json/.test(c.url)), askB=BOOT_CALLS.filter(c=>/suggest_backtest\.json/.test(c.url));
      const later=calls.filter(c=>/suggest_(ledger|backtest)\.json/.test(c.url));
      chk(askL.length===1&&/^\.\.\/data\/suggest_ledger\.json\?t=\d+$/.test(askL[0].url)&&askL[0].cache==='no-store'&&askB.length===1&&/^\.\.\/data\/suggest_backtest\.json\?t=\d+$/.test(askB[0].url)&&askB[0].cache==='no-store'&&later.every(c=>c.cache==='no-store'),
        'the page did not ask for the suggestions record and its backtest beside its payload, each once as it loaded, with no-store: '+JSON.stringify([...askL,...askB])); }
    F('renderSp')();
    chk(SECS.every(sec=>{ const b=recBox(sec); return !!b&&b.hidden&&!txt(b); }),'with no record file and no backtest Suggested Parlays draws a record anyway: '+SECS.map(s=>txt(recBox(s))).join(' / '));
    chk(!d.getElementById('pbRec')&&!d.getElementById('spRec')&&!d.querySelector('#spHead .sp-rec,#spHead [data-sp-rec]')&&SECS.every(sec=>{ const b=recBox(sec); return !!b&&b.previousElementSibling&&b.previousElementSibling.matches('h3.sp-sech'); }),
      'the all-games record is still drawn, the record is still at the head of Suggested Parlays, or a section\'s record is not right under its heading');
    /* (app v129) one record, Night games': no record of the Sunday slot's own, wherever it would be drawn */
    /* (app v131) two records, one a section: Night games' (the prime map) and Day games' (the slot map) */
    /* (app v132) one record, a section of its own (Record), both maps */
    const noSlotRec=()=>d.querySelectorAll('#spPanel .sp-rec').length===1&&!!recBox('all');
    chk(noSlotRec(),'Suggested Parlays does not draw exactly one record, in its Record section');
    /* each file answered by its own name (the record or the backtest; 404 where none is given) */
    const fetch0=w.fetch, ans=b=>b===404||b===undefined?{ok:false,status:404,json:async()=>{throw new Error('404');}}:{ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(b))};
    const load=async (body,bt)=>{ w.fetch=u=>Promise.resolve(/suggest_backtest/.test(String(u))?ans(bt):ans(body));
      try{ await w.pbRecLoad(); } finally { w.fetch=fetch0; } F('renderSp')(); };
    const LAB={safe:'Safe',med:'Medium',aggr:'Aggressive'};
    const isMapA=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
    /* which files are a record and a backtest, by the audit's own reading: a record with an entries, prime or slot map,
       a backtest with a prime or slot map */
    const recOkA=v=>isMapA(v)&&(isMapA(v.entries)||isMapA(v.prime)||isMapA(v.slot)), btOkA=v=>isMapA(v)&&(isMapA(v.prime)||isMapA(v.slot));
    /* the record of one section's one kind, worked here: the backtest first and the record over it, each in key order, a
       map at a time (Night games' prime and then slot, since app v129),
       each season's unit and level once (the last that holds a grade for it), a unit the record holds levels of this kind
       for taken from the record whole (the backtest's of it left out); a level with legs and a grade counted, a
       pending one apart, a push apart, the units on $1 (a win at what it was graded to pay), the wins expected by the
       book's fair chance (on how many had one) and by the level's own chance, how many came from the backtest and from
       which weeks */
    const recAud=(L0,B0,sec,kind)=>{ const K=KINDS_R[kind], maps=SEC_MAP[sec], ids=Object.keys(LAB).map(id=>K.pre+id), last=new Map();
      const held=new Set(maps.flatMap(map=>Object.values(isMapA(L0)&&isMapA(L0[map])?L0[map]:{})).filter(e=>isMapA(e)&&Array.isArray(e[K.f])).map(e=>`${e.season}|${e.gid}`));
      for(const [src,bt] of [[B0,true],[L0,false]]) for(const map of maps){ const P0=isMapA(src)&&isMapA(src[map])?src[map]:{};
        for(const k of Object.keys(P0).sort()){ const e=P0[k]; if(!isMapA(e)||!Array.isArray(e[K.f])||(bt&&held.has(`${e.season}|${e.gid}`))) continue;
          for(const t of e[K.f]){ const g=t&&isMapA(e.grade)?e.grade[t.id]:null; if(!g||!ids.includes(t.id)||!Array.isArray(t.legs)) continue;
            last.set(`${e.season}|${e.gid}|${t.id}`,{t,g,bt,wk:+e.week}); } } }
      const o=Object.fromEntries(Object.keys(LAB).map(id=>[id,{won:0,lost:0,push:0,units:0,fair:0,fairN:0,model:0,bt:0}])); let pending=0; const weeks=new Set();
      for(const {t,g,bt,wk} of last.values()){ const s=o[t.id.slice(K.pre.length)];
        if(g.result==='pending'){ pending++; continue; }
        if(g.result!=='won'&&g.result!=='lost'&&g.result!=='push') continue;
        if(bt){ s.bt++; if(wk) weeks.add(wk); }
        if(g.result==='push'){ s.push++; continue; }
        if(g.result==='won'){ s.won++; s.units+=(isFinite(+g.payout)?+g.payout:0)-1; } else { s.lost++; s.units-=1; }
        s.model+=isFinite(+t.p)?+t.p:0; if(t.fair!=null&&isFinite(+t.fair)){ s.fair+=+t.fair; s.fairN++; } }
      return {o,pending,weeks:[...weeks].sort((a,b)=>a-b)}; };
    /* the numbers each level's pill states in its title: graded and won, the wins expected by the book's fair chance (on
       how many had one) and by the level's own chance, the pushes, how many from the backtest; read from the title and held
       to the record worked here (blocking: they are numbers the page states, whatever the words around them) */
    const titleNums=p=>{ const t=p&&p.title||'', m=/: (\d+) graded, (\d+) won/.exec(t), f=/wins expected (\d+\.\d) by the book’s fair chance(?: \(on the (\d+) with one\))?/.exec(t),
        mo=/(?:wins expected |, )(\d+\.\d) by (?:the model|the Elo chance)/.exec(t), pu=/; (\d+) push(?:es)?, the stake back/.exec(t), bt=/; (\d+) of them from the backtest/.exec(t);
      return {graded:m?+m[1]:null,won:m?+m[2]:null,fair:f?f[1]:null,fairOn:f&&f[2]?+f[2]:null,model:mo?mo[1]:null,push:pu?+pu[1]:0,bt:bt?+bt[1]:0}; };
    const titleWant=s=>{ const graded=s.won+s.lost; return {graded,won:s.won,fair:graded&&s.fairN?s.fair.toFixed(1):null,fairOn:graded&&s.fairN&&s.fairN<graded?s.fairN:null,model:graded?s.model.toFixed(1):null,push:s.push,bt:s.bt}; };
    const un=v=>(v>0.0005?'+':v<-0.0005?'−':'')+Math.abs(v).toFixed(2);
    const pillOf=(id,s)=>`${LAB[id]} ${s.won}–${s.lost}${s.won+s.lost+s.push?' '+un(s.units)+' units':''}`;
    /* a pill as drawn against the record worked here: its level, won-lost, and units (where any is graded or pushed) to the
       cent, the half cent either way where the sum sits on one (the page adds the same figures, and the order of a sum can
       move its last bit there); and a title's counts exactly, its expected wins to the tenth the same way */
    const pillOk=(p,id,s)=>{ const m=/^(\S+) (\d+)–(\d+)(?: ([+−]?)(\d+\.\d\d) units)?$/.exec(txt(p)); if(!m||m[1]!==LAB[id]||+m[2]!==s.won||+m[3]!==s.lost) return false;
      if(!(s.won+s.lost+s.push)) return m[5]===undefined;
      if(m[5]===undefined) return false; const v=(m[4]==='−'?-1:1)*+m[5]; return Math.abs(v-s.units)<=0.005+1e-9&&(m[4]==='+'?s.units>0.0005:m[4]==='−'?s.units<-0.0005:Math.abs(s.units)<=0.0005); };
    const titleOk=(got,s)=>{ const want=titleWant(s), near=(a,b,v)=>a===b||(a!=null&&v!=null&&Math.abs(+a-v)<=0.05+1e-9), graded=s.won+s.lost;
      return got.graded===want.graded&&got.won===want.won&&got.fairOn===want.fairOn&&got.push===want.push&&got.bt===want.bt
        &&(want.fair==null?got.fair==null:near(got.fair,want.fair,s.fair))&&(want.model==null?got.model==null:near(got.model,want.model,s.model)); };
    /* the record as drawn, held to the record worked here: each section, each kind's row, each level's pill and title, the
       pending and none pills, and (app v129, the owner's "get rid of button (incl backteest wk 3-6)") no chip naming the
       backtest's weeks, whatever it counts from it, and no record of the Sunday slot's own */
    let recHeld=0;
    const holdRec=(lab,L0,B0)=>{ const Lv=recOkA(L0)?L0:null, Bv=btOkA(B0)?B0:null, said=[];
      for(const sec of SECS){ const box=recBox(sec);
        if(!Lv&&!Bv){ chk(!!box&&box.hidden&&!txt(box),`${lab}: with neither a record nor a backtest the ${sec} section draws a record: `+txt(box)); continue; }
        chk(!!box&&!box.hidden,`${lab}: the ${sec} section draws no record`); if(!box) continue;
        const wk=new Set();
        for(const kind of Object.keys(KINDS_R)){ const K=KINDS_R[kind], R=recAud(Lv,Bv,sec,kind), row=box.querySelector(`.bar[data-sp-reckind="${kind}"]`), any=Object.values(R.o).some(s=>s.won+s.lost+s.push>0);
          R.weeks.forEach(x=>wk.add(x));
          chk(!!row,`${lab}: the ${sec} record has no row for the ${K.name}`); if(!row) continue;
          W.wording(txt(row.querySelector('.sp-reck'))===K.name,`${lab}: the ${sec} record's ${kind} row is headed "${txt(row.querySelector('.sp-reck'))}", not "${K.name}"`);
          if(any){ for(const id of Object.keys(LAB)){ const p=box.querySelector(`[data-sp-rec="${sec}:${K.pre}${id}"]`); recHeld++;
              chk(!!p&&p.closest('.bar')===row&&pillOk(p,id,R.o[id]),`${lab}: the ${sec} record's ${K.name} ${LAB[id]} pill reads "${txt(p)}", not "${pillOf(id,R.o[id])}"`);
              chk(titleOk(titleNums(p),R.o[id]),`${lab}: the ${sec} record's ${K.name} ${LAB[id]} pill's title states ${JSON.stringify(titleNums(p))}, where the grades give ${JSON.stringify(titleWant(R.o[id]))}: "${p?p.title:''}"`);
              W.wording(!!p&&p.title.startsWith(`${K.name}, ${LAB[id]}: `)&&(!(R.o[id].won+R.o[id].lost)||p.title.includes(` by ${K.by}`)),`${lab}: the ${sec} record's ${K.name} ${LAB[id]} pill's title does not name its kind and level, or the chance it expects by: "${p?p.title:''}"`); }
            chk(!row.querySelector(`[data-sp-rec="${sec}:${kind}:none"]`),`${lab}: the ${sec} record's ${K.name} row says none is graded, and some are`); }
          else { const nn=row.querySelector(`[data-sp-rec="${sec}:${kind}:none"]`);
            chk(!!nn&&![...row.querySelectorAll('[data-sp-rec]')].some(x=>Object.keys(LAB).some(id=>x.dataset.spRec===`${sec}:${K.pre}${id}`)),`${lab}: the ${sec} record's ${K.name} row, with nothing graded, does not say so, or counts a level: ${txt(row)}`);
            W.wording(txt(nn)==='None graded yet',`${lab}: the ${sec} record's ${K.name} row with nothing graded reads "${txt(nn)}", not "None graded yet"`); }
          { const pe=row.querySelector(`[data-sp-rec="${sec}:${kind}:pending"]`);
            chk(R.pending?txt(pe)===`Pending ${R.pending}`:!pe,`${lab}: the ${sec} record's ${K.name} row does not count its ${R.pending} pending level${R.pending===1?'':'s'} apart: "${txt(pe)}"`); }
          said.push(`${sec} ${kind} ${Object.keys(LAB).map(id=>`${R.o[id].won}-${R.o[id].lost}`).join(' ')}${R.pending?` (${R.pending} pending)`:''}`); }
        { const W0=[...wk].sort((a,b)=>a-b), chip=box.querySelector(`[data-sp-rec="${sec}:bt"],[data-sp-rec$=":bt"],.sp-recbt,.sp-recbtbar`);
          chk(!chip&&!/Incl\. backtest/.test(txt(box))&&noSlotRec(),`${lab}: the ${sec} record still draws a chip naming the backtest's weeks (${chip?`"${txt(chip)}"`:'its words'}), or the two sections' records are not one each`);
          if(W0.length) said.push(`${sec} counting the backtest's weeks ${W0.join(',')}`); }
        /* (app v113) the record is its pills alone: no sentence under them */
        W.wording(!box.querySelector('p,.sp-rec-line')&&!/The record starts with this change|Refresh odds never changes it/.test(txt(box)),`${lab}: the ${sec} record still draws a sentence beside its pills: `+txt(box)); }
      return said; };
    /* the made-up files: the levels, their chances, prices and grades named in each entry */
    const T=(id,n,p,fair,dec,tag,elo)=>({id:(elo?'elo-':'')+id,label:LAB[id],n,floor:0,legs:Array.from({length:n},(_,i)=>({gid:'g'+tag,week:6,pid:'p'+tag+id+i,stat:'receptions',k:3.5,side:'over',main:true,price:-110,src:'real',name:'P'+i,label:'Over 3.5 receptions',p:0.6,...(elo?{pe:0.55}:{})})),p,fair,dec});
    const TE=(id,n,p,fair,dec,tag)=>T(id,n,p,fair,dec,tag,true);
    const G=(result,n,payout)=>({result,legs:Array.from({length:n},()=>result==='lost'?'loss':result==='push'?'void':result==='pending'?null:'win'),...(payout!=null?{payout}:{})});
    const E=(season,week,kick,gid,tiers,grade,elo,o)=>({season,week,gid,away:'A',home:'H',kickoff:kick,lock:new Date(Date.parse(kick)-7200e3).toISOString().replace(/\.000Z$/,'Z'),taken_at:'2026-10-01T00:00:00Z',tiers,...(elo?{elo}:{}),...(grade?{grade}:{}),...(o||{})});
    const L={how:'made up',since:'2026-10-12',entries:{'2026|05|2026-10-11T17:00:00Z':{kickoff:'2026-10-11T17:00:00Z',tiers:[T('safe',2,0.4,0.3,3,'o')],grade:{safe:G('won',2,3)}}},prime_since:'2026-10-16',prime:{
      /* another season's game: counted, as each season's unit and level is once */
      '2025|18|2026-01-05T01:20:00Z|2025_18_XA_XB':E(2025,18,'2026-01-05T01:20:00Z','2025_18_XA_XB',[T('safe',2,0.5,0.4,2.5,'x')],{safe:G('won',2,2.5)}),
      /* a kickoff the league moved: the older key's grades give way to the newer key's, level by level */
      '2026|06|2026-10-16T00:10:00Z|2026_06_PIT_CIN':E(2026,6,'2026-10-16T00:10:00Z','2026_06_PIT_CIN',[T('safe',2,0.5,0.4,9,'b'),T('med',3,0.3,0.2,5,'b')],{safe:G('won',2,9),med:G('won',3,5)}),
      '2026|06|2026-10-16T00:15:00Z|2026_06_PIT_CIN':E(2026,6,'2026-10-16T00:15:00Z','2026_06_PIT_CIN',[T('safe',2,0.52,0.44,3.1,'c'),T('med',3,0.3,0.21,5.1,'c'),T('aggr',4,0.15,0.1,9,'c'),T('xtrm',5,0.07,0.05,20,'c')],
        {safe:G('won',2,3.1),med:G('lost',3,0),aggr:G('push',4,1),xtrm:G('pending',5),'elo-safe':G('won',2,2.8),'elo-med':G('lost',3,0)},[TE('safe',2,0.45,0.4,2.8,'c'),TE('med',3,0.3,0.25,5,'c')]),
      /* a Medium a push shortened: won at what it was graded to pay, not its price; an Extreme with no parlay never counted;
         an Elo Safe pushed and an Elo Aggressive pending. In the backtest too, where each of its levels is graded otherwise:
         the record's grades stand */
      '2026|06|2026-10-19T00:20:00Z|2026_06_DAL_GB':E(2026,6,'2026-10-19T00:20:00Z','2026_06_DAL_GB',[T('safe',2,0.55,0.47,2.6,'d'),T('med',3,0.28,null,6.2,'d'),T('aggr',4,0.13,0.09,12,'d'),{id:'xtrm',label:'Extreme',n:5,floor:0.05,why:'made up'}],
        {safe:G('lost',2,0),med:{result:'won',legs:['win','push','win'],payout:3.7},aggr:G('won',4,12),xtrm:G('won',5,30),'elo-safe':G('push',2,1),'elo-aggr':G('pending',4)},[TE('safe',2,0.5,0.42,2.4,'d'),TE('aggr',4,0.14,0.1,11,'d')]),
      /* an entry still to come: no grade, nothing counted */
      '2026|07|2026-10-23T00:15:00Z|2026_07_XC_XD':E(2026,7,'2026-10-23T00:15:00Z','2026_07_XC_XD',[T('safe',2,0.5,0.4,3,'e')])},
      slot_since:'2026-10-19',slot:{
      '2026|06|2026-10-18T13:30:00Z|2026_06_SUN':E(2026,6,'2026-10-18T13:30:00Z','2026_06_SUN',[T('safe',2,0.5,0.4,3,'f'),T('med',3,0.3,0.25,6,'f')],{safe:G('won',2,3),med:G('lost',3,0),'elo-safe':G('won',2,3)},[TE('safe',2,0.4,0.35,3,'f')],{games:['2026_06_A_B','2026_06_C_D']})}};
    const BT={how:'made up',from_week:3,prime:{
      /* a game only in the backtest (week 3) */
      '2026|03|2026-09-25T00:15:00Z|2026_03_AUX_BUX':E(2026,3,'2026-09-25T00:15:00Z','2026_03_AUX_BUX',[T('safe',2,0.5,0.45,2.8,'g'),T('med',3,0.3,0.25,5.5,'g')],
        {safe:G('lost',2,0),med:G('won',3,5.5),'elo-safe':G('won',2,2.5),'elo-xtrm':G('lost',5,0)},[TE('safe',2,0.45,0.4,2.5,'g'),TE('xtrm',5,0.06,0.04,25,'g')],{src:'backtest'}),
      /* the record's game too, every level graded otherwise, and its Elo Medium in the backtest alone: a unit the record
         holds levels of a kind for is the record's whole, so none of these counts (the Elo Medium neither) */
      '2026|06|2026-10-19T00:20:00Z|2026_06_DAL_GB':E(2026,6,'2026-10-19T00:20:00Z','2026_06_DAL_GB',[T('safe',2,0.55,0.47,2.6,'h'),T('med',3,0.28,0.2,6.2,'h'),T('aggr',4,0.13,0.09,12,'h'),{id:'xtrm',label:'Extreme',n:5,floor:0.05,why:'made up'}],
        {safe:G('won',2,2.6),med:G('lost',3,0),aggr:G('lost',4,0),'elo-safe':G('lost',2,0),'elo-med':G('won',3,4.5)},[TE('safe',2,0.5,0.42,2.4,'h'),TE('med',3,0.36,0.32,4.5,'h')],{src:'backtest'}),
      /* week 5: a push, every leg void, and a win */
      '2026|05|2026-10-09T00:15:00Z|2026_05_TB_DAL':E(2026,5,'2026-10-09T00:15:00Z','2026_05_TB_DAL',[T('safe',2,0.5,0.45,2.7,'i'),T('aggr',4,0.14,0.08,10,'i')],{safe:G('push',2,1),aggr:G('won',4,10)},null,{src:'backtest'})},
      slot:{
      '2026|04|2026-10-04T13:30:00Z|2026_04_SUN':E(2026,4,'2026-10-04T13:30:00Z','2026_04_SUN',[T('safe',2,0.56,0.46,2.9,'j'),T('med',3,0.3,0.22,7,'j')],{safe:G('won',2,2.9),med:G('lost',3,0),'elo-safe':G('lost',2,0)},[TE('safe',2,0.42,0.38,2.6,'j')],{src:'backtest'}),
      /* the record's slot too: its Aggressive, which the record's entry has no parlay for, is left out with the rest */
      '2026|06|2026-10-18T13:30:00Z|2026_06_SUN':E(2026,6,'2026-10-18T13:30:00Z','2026_06_SUN',[T('safe',2,0.5,0.4,3,'k'),T('med',3,0.3,0.25,6,'k'),T('aggr',4,0.13,0.1,11,'k')],{safe:G('lost',2,0),med:G('won',3,6),aggr:G('won',4,11)},null,{src:'backtest'})}};
    /* the record worked by hand from the files above, against which the audit's own working is held first. Since app v129
       Night games counts both maps: each level the prime map's and the slot map's together (the prime map alone, as the
       section counted it until then: model Safe 2-2 +1.60, Medium 2-1 +6.20, Aggressive 2-0 +20.00, Extreme 0-0, Elo Safe
       2-0 +3.30, Medium 0-1, Extreme 0-1; the slot map alone: model Safe 2-0 +3.90, Medium 0-2, Elo Safe 1-1 +1.00) */
    /* (app v131) two sections again: Night games the prime map, Day games the slot map (the hand record of app v128) */
    /* (app v132) one record over both maps (app v129's hand record), Extreme off the tab */
    const HAND={all:{model:{pills:{safe:'Safe 4–2 +5.50 units',med:'Medium 2–3 +4.20 units',aggr:'Aggressive 2–0 +20.00 units'},pending:0,
        titles:{safe:{graded:6,won:4,fair:'2.6',fairOn:null,model:'3.1',push:1,bt:3},med:{graded:5,won:2,fair:'0.9',fairOn:4,model:'1.5',push:0,bt:2},aggr:{graded:2,won:2,fair:'0.2',fairOn:null,model:'0.3',push:1,bt:1}}},
      elo:{pills:{safe:'Safe 3–1 +4.30 units',med:'Medium 0–1 −1.00 units',aggr:'Aggressive 0–0'},pending:1,
        titles:{safe:{graded:4,won:3,fair:'1.5',fairOn:null,model:'1.7',push:1,bt:2},med:{graded:1,won:0,fair:'0.3',fairOn:null,model:'0.3',push:0,bt:0},aggr:{graded:0,won:0,fair:null,fairOn:null,model:null,push:0,bt:0}}},weeks:[3,4,5]}};
    { const bad=[];
      for(const sec of SECS){ const wk=new Set(); for(const kind of Object.keys(KINDS_R)){ const R=recAud(L,BT,sec,kind), H=HAND[sec][kind]; R.weeks.forEach(x=>wk.add(x));
          for(const id of Object.keys(LAB)){ if(pillOf(id,R.o[id])!==H.pills[id]) bad.push(`${sec} ${kind} ${id} pill ${pillOf(id,R.o[id])}`);
            if(JSON.stringify(titleWant(R.o[id]))!==JSON.stringify(H.titles[id])) bad.push(`${sec} ${kind} ${id} title ${JSON.stringify(titleWant(R.o[id]))}`); }
          if(R.pending!==H.pending) bad.push(`${sec} ${kind} pending ${R.pending}`); }
        if([...wk].sort((a,b)=>a-b).join()!==HAND[sec].weeks.join()) bad.push(`${sec} weeks ${[...wk].join()}`); }
      chk(!bad.length,'the audit\'s own working of the made-up record and backtest is not the record worked by hand: '+bad.join('; ')); }
    const saidP2=[];
    /* the real files, as the props job and suggest_backtest.js wrote them, read from disk */
    { const rd=f=>{ try{ return JSON.parse(fs.readFileSync(f,'utf8')); }catch(e){ return 404; } }, RL=rd('../data/suggest_ledger.json'), RB=rd('../data/suggest_backtest.json');
      await load(RL,RB); saidP2.push('the real files: '+holdRec('the real record and backtest',RL,RB).join(', ')); }
    /* the made-up record and backtest together */
    await load(L,BT); holdRec('a made-up record and backtest',L,BT);
    w.eval('store.set(S)'); chk(!/made up|suggest_ledger|suggest_backtest|2026_06_PIT_CIN|2026_03_AUX_BUX/.test(String(mem))&&!('rec' in S),'the record or its backtest was saved with the visitor\'s state');
    /* the backtest alone, and a smaller one whose weeks run on (3 and 4: "weeks 3–4") or are one ("week 4") */
    await load(404,BT); holdRec('the made-up backtest alone',null,BT);
    { const B2={how:'made up',prime:{'2026|04|2026-10-02T00:15:00Z|2026_04_X_Y':E(2026,4,'2026-10-02T00:15:00Z','2026_04_X_Y',[T('safe',2,0.5,0.4,2.5,'m')],{safe:G('won',2,2.5)})},
        slot:{'2026|03|2026-09-27T17:00:00Z|2026_03_SUN':E(2026,3,'2026-09-27T17:00:00Z','2026_03_SUN',[T('safe',2,0.5,0.4,2.5,'n')],{safe:G('lost',2,0)}),
          '2026|04|2026-10-04T13:30:00Z|2026_04_SUN':E(2026,4,'2026-10-04T13:30:00Z','2026_04_SUN',[T('med',3,0.3,0.25,6,'n')],{med:G('won',3,6)})}};
      await load({how:'made up',prime:{}},B2); holdRec('a record with nothing graded and a backtest of weeks 3 and 4',{how:'made up',prime:{}},B2);
      /* by hand: the prime map's week-4 Safe won at 2.5 and the slot map's week-3 Safe lost, its week-4 Medium won at 6, all
         in the one Night games record (app v129), with no chip naming the weeks */
      chk(txt(d.querySelector('#spSets [data-sp-rec="all:safe"]'))==='Safe 1–1 +0.50 units'&&txt(d.querySelector('#spSets [data-sp-rec="all:med"]'))==='Medium 1–0 +5.00 units'&&!d.querySelector('#spSets [data-sp-rec$=":bt"],#spSets .sp-recbt'),
        'a backtest of a prime-time Safe won in week 4, and a Sunday slot\'s Safe lost in week 3 and Medium won in week 4, does not read "Safe 1–1 +0.50 units" and "Medium 1–0 +5.00 units" in the one record, with no chip: '+txt(recBox('all'))); }
    /* a backtest that is junk or missing: the record drawn as it is with none, no chip */
    for(const bt of [404,'junk',[],{prime:[]},{entries:{}},{how:'x'}]){ await load(L,bt); holdRec(`the made-up record with a backtest file that is not one (${JSON.stringify(bt)})`,L,bt);
      chk(!d.querySelector('#spSets .sp-recbt,#spSets [data-sp-rec$=":bt"]'),`with a backtest file that is not one (${JSON.stringify(bt)}) the record still says some of it is the backtest`); }
    saidP2.push('a made-up record and backtest, the backtest alone, a backtest of weeks 3 and 4, and six backtests that are not one');
    /* nothing graded yet, and a file with only the all-games record: each row says so, and the old record draws nothing */
    for(const [lab,body] of [['an empty prime map',{how:'made up',prime:{}}],['only the all-games record',{how:'made up',entries:L.entries}]]){ await load(body);
      holdRec(`a record with ${lab}`,body,null);
      chk(SECS.every(sec=>!!d.querySelector(`#spSets [data-sp-rec="${sec}:model:none"]`)&&!!d.querySelector(`#spSets [data-sp-rec="${sec}:elo:none"]`)&&!d.querySelector(`#spSets [data-sp-rec="${sec}:safe"]`)),`a record with ${lab} does not say none is graded in each section and kind, or counts something: `+SECS.map(s=>txt(recBox(s))).join(' / ')); }
    /* files that are not a record and no backtest: nothing drawn, nothing thrown */
    for(const bad of [404,[],{how:'x'},{entries:[]},{prime:[]},'junk']){ await load(bad);
      chk(SECS.every(sec=>{ const b=recBox(sec); return !!b&&b.hidden&&!txt(b); }),`a record file that is not one (${JSON.stringify(bad)}), with no backtest, drew something: `+SECS.map(s=>txt(recBox(s))).join(' / ')); }
    /* a record file that is not one beside the backtest: the backtest alone */
    await load('junk',BT); holdRec('a record file that is not one beside the made-up backtest','junk',BT);
    await load(404);
    d.querySelector('#tabs button[data-tab="parlay"]').click();
    console.log(`P2. the suggestions record, one section (Night games, the prime and slot maps together, no chip naming the backtest's weeks) and a kind at a time (the model's parlays, the Elo picks), the backtest under the record: both files asked for once with no-store, nothing drawn without them; ${recHeld} pills held to the audit's own working; ${saidP2.join('; ')}; an empty record and the all-games record alone say none is graded; a junk one draws nothing`); }

  /* ---- L. record chips beside the week dropdown ---- */
  { const main=F('trackRecord')().filter(r=>r.kind==='main'); const wkx=main.length?main[0].w:1;
    const ws=d.getElementById('weekSel'); const was=ws.value; ws.value=String(wkx); ws.dispatchEvent(new w.Event('change'));
    const want=rows=>`${rows.filter(r=>r.hit).length}\u2013${rows.filter(r=>!r.hit).length}`;
    chk(d.getElementById('weekRec').textContent===`Week ${wkx} ${want(main.filter(r=>+r.w===+wkx))}`,'week record chip does not match graded main lines');
    chk(d.getElementById('seasonRec').textContent===`Season ${want(main)}`,'season record chip does not match graded main lines');
    ws.value=was; ws.dispatchEvent(new w.Event('change'));
    console.log(`L. record chips: week ${wkx} ${want(main.filter(r=>+r.w===+wkx))}, season ${want(main)}`); }


  /* ---- S. no ladder bet on a game page (app v127) ----
     The Threshold ladders box went with the ladders (the owner's call of 21 October 2026: "is it possible to not do
     ladders and just include Same Game Parlay eligible stuff"). On the first game to come, every player opened with the
     backups shown and the old box's saved choice planted on (S.ui.showRungs, which nothing reads now): no box to show
     the ladders, no rung row, no player's box off his main line but the touchdown's one, no 2+ touchdowns and none of
     the old notes; and every stat block is either its main line's table (a line in its heading, both sides' boxes) or,
     with no main line, the one line saying so and no table or box (the words W.wording). The model still builds every
     rung: the Track Record grades the frozen rung chances, so statLines keeps them, projected and never offered.
     Blocking */
  { const keepP=JSON.stringify(S.parlay||{}), gS=openUpcoming(), keepU=JSON.stringify({game:S.ui.game,open:S.ui.open,all:S.ui.showAll});
    let said='did not run';
    try{ const R=rosterFor(gS,true); S.ui.open={}; for(const t in R) for(const x of R[t].players) S.ui.open[x.pl.id]=true;
      S.ui.showAll=true; S.ui.showRungs=true; S.ui.game=gS.id; F('renderGame')();
      const V=d.getElementById('gameView'), txt=V.textContent, isG=st=>['ml','ats','total'].includes(st);
      chk(!d.getElementById('rungCb')&&!/Threshold ladders/.test(txt),`${gS.id}'s page still draws the Threshold ladders box`);
      chk(!V.querySelector('tr.rung'),`${gS.id}'s page draws ${V.querySelectorAll('tr.rung').length} ladder rows with the old box's choice saved on`);
      const boxes=[...V.querySelectorAll('input[data-leg]')], stOf=b=>String(b.dataset.leg).split('|')[2];
      const off=boxes.filter(b=>!isG(stOf(b))&&b.dataset.main!=='1'&&!(stOf(b)==='any_td'&&b.dataset.k==='1'));
      chk(!off.length,`${gS.id}'s page draws a player's box off his main line: ${off.slice(0,4).map(b=>b.dataset.leg+' '+b.dataset.k).join(', ')}`);
      chk(!boxes.some(b=>stOf(b)==='any_td'&&+b.dataset.k>=2)&&!/Scores two or more/.test(txt),`${gS.id}'s page draws a 2+ touchdown box`);
      chk(!/nothing counts out of sight|even though the ladders are hidden/.test(txt),`${gS.id}'s page still draws the note about a threshold leg shown while the ladders are hidden`);
      /* each stat block: a main line's table, or one line saying there is none */
      let tables=0, nolines=0; const badB=[], badW=[];
      for(const blk of V.querySelectorAll('.plrbody .statblk')){ const h=blk.querySelector('h4'), name=h&&h.firstChild?h.firstChild.textContent.trim():'';
        if(blk.querySelector('input[data-leg$="|any_td"]')) continue;
        const ml=!!(h&&h.querySelector('em.mline')), tb=blk.querySelectorAll('table'), nl=blk.querySelectorAll('[data-noline]'), mains=blk.querySelectorAll('input[data-leg][data-main="1"]'), all=blk.querySelectorAll('input[data-leg]');
        if(ml){ tables++; if(!(tb.length===1&&!nl.length&&mains.length===2&&all.length===2)) badB.push(`${name} (a line in its heading, ${tb.length} tables, ${mains.length} main-line boxes of ${all.length})`); }
        else { nolines++; if(!(nl.length===1&&!tb.length&&!all.length)) badB.push(`${name} (no line in its heading, ${nl.length} no-line notes, ${tb.length} tables, ${all.length} boxes)`);
          else if(!(nl[0].tagName==='P'&&nl[0].textContent==='No DraftKings line yet.')) badW.push(`${name}: "${nl[0].textContent}"`); } }
      chk(!badB.length,`${gS.id}'s page draws a stat block that is neither its main line's table nor the line saying it has none: ${badB.slice(0,4).join('; ')}`);
      W.wording(!badW.length,`${gS.id}'s page words a stat with no main line otherwise: ${badW.slice(0,3).join('; ')}`);
      said=`${gS.id} with every player open and the old box's choice saved on: no ladder box, rung row, box off a main line or 2+ touchdowns, no old note; ${tables} stat blocks with their main line's table, ${nolines} with no main line saying so`;
    } finally { const k=JSON.parse(keepU); S.ui.game=k.game; S.ui.open=k.open||{}; delete S.ui.showRungs; S.ui.showAll=k.all; S.parlay=JSON.parse(keepP); F('closeGameModal')(); F('renderParlay')(); }
    /* the model still builds every rung: projected, never offered (the Track Record grades them) */
    const roster=rosterFor(gS,false); let built=0;
    for(const tm in roster) for(const x of roster[tm].players) for(const l of statLines(x)) built+=(l.rungs||[]).length;
    chk(built>0,'statLines stopped building rungs: the Track Record grades the frozen rung chances, so the model keeps projecting them');
    console.log(`S. no ladder on a game page: ${said}; ${built} rungs still projected`); }

  /* ---- R. baked prices follow the build, and the levels price like a book: the engine's on the ticks, and
     each prime-time set's (app v111), one game's legs priced together ---- */
  { const s={tiers:[...F('getPbTiers')().tiers,...F('spGames')().flatMap(g=>{ const x=F('spSet')(g.id); return x?x.tiers.map(t=>({...t,label:`${g.a} at ${g.h} ${t.label}`})):[]; })].filter(t=>t.legs)};
    if(s.tiers.length){
      const pd=F('parlayDec');
      for(const t of s.tiers){
        const mult=t.legs.reduce((a,l)=>a*F('mlToDec')(l.price),1);
        chk(Math.abs(t.dec-pd(t.legs.map(l=>({leg:l,ml:l.price}))))<1e-6,`${t.label} tier's price is not what parlayDec says`);
        /* same-game legs are priced together and a book never pays above multiplying, so
           the tier lands at or below it: strictly below when the legs overlap, and equal
           when they pull against each other and parlayDec clamps. Section Q proves the
           strict case on known legs; here the point is that it never exceeds. */
        if(F('sameGame')(t.legs)) chk(t.dec<=mult+1e-9,`${t.label} tier priced above multiplying legs that share a game`);
        else chk(Math.abs(t.dec-mult)<1e-9,`${t.label} tier does not multiply legs from different games`);
      }
    }
    /* a browser holding last build's prices must take this build's */
    const wk=Object.keys(PAY.prices||{})[0];
    if(wk){
      const gid=F('gamesIn')(+wk).map(g=>g.id).find(id=>S.odds[id]&&Object.keys(S.odds[id]).length);
      if(gid){
        const pid=Object.keys(S.odds[gid])[0], st=Object.keys(S.odds[gid][pid])[0], k=Object.keys(S.odds[gid][pid][st])[0];
        const real=S.odds[gid][pid][st][k];
        S.odds[gid][pid][st][k]=real+1000; S.pricesFrom='some-older-build';
        const r=F('applyBaked')();
        chk(r.prices>0,'a new build did not reload prices over a browser that had old ones');
        chk(S.odds[gid][pid][st][k]===real,'the stale price survived the new build');
        const again=F('applyBaked')();
        chk(again.prices===0,'the same build reloaded prices a second time');
      }
    }
    console.log(`R. tiers priced like a book; baked prices follow the build`); }

  /* ---- Q. same-game parlays are priced together, not multiplied ---- */
  { const pd=F('parlayDec');
    /* two legs with known prices, so the check does not depend on what earlier
       sections left in S.odds */
    const L=[{leg:{gid:'g1',pid:'p1',stat:'receiving_yards',grp:'WR',k:25,side:'over',p:0.47},ml:250},
             {leg:{gid:'g1',pid:'p2',stat:'passing_yards',grp:'QB',k:220,side:'over',p:0.75},ml:-261}];
    const mult=L.reduce((a,x)=>a*F('mlToDec')(x.ml),1);
    const sgp=pd(L);
    chk(sgp>1,'a same-game parlay priced at or below the stake');
    chk(sgp<mult,`legs in one game were multiplied anyway: ${sgp.toFixed(3)} vs ${mult.toFixed(3)}`);
    /* the identical legs in two different games must multiply exactly */
    const apart=[L[0],{leg:{...L[1].leg,gid:'g2'},ml:L[1].ml}];
    chk(Math.abs(pd(apart)-mult)<1e-9,'legs in different games are not multiplied');
    /* one leg is its own price, whatever game it is in */
    chk(Math.abs(pd([L[0]])-F('mlToDec')(250))<1e-9,'a single leg is not its own price');
    /* a third leg in the same game must shorten it further, never lengthen past multiplying */
    const three=[...L,{leg:{gid:'g1',pid:'p3',stat:'rushing_yards',grp:'RB',k:60,side:'over',p:0.45},ml:-110}];
    const mult3=three.reduce((a,x)=>a*F('mlToDec')(x.ml),1);
    chk(pd(three)<mult3,'a third same-game leg was multiplied anyway');
    chk(pd(three)>sgp,'adding a leg did not increase the price');
    chk(F('sameGame')([{gid:'a'},{gid:'a'}])===true&&F('sameGame')([{gid:'a'},{gid:'b'}])===false,'sameGame does not spot a shared game');
    console.log(`Q. same-game pricing: 2 legs multiply to ${mult.toFixed(2)}, priced together ${sgp.toFixed(2)} (${(100*(1-sgp/mult)).toFixed(0)}% shorter)`); }

  /* ---- O. the game page (app v124): no suggested parlays, and its Matchup, Mismatches and Team Stats buttons drawn
     only where the hub's window is (app v128 added a fourth, Game snapshot, and app v129 took it off again: the owner's
     call of 22 October 2026, "i dont want that game snapshot buttons"); then the hands' engine, drawn nowhere since, as
     it stands ---- */
  { const g=openUpcoming();
    /* blocking: the card, its side switch and its Add all are gone (the owner's call of 20 October 2026), and on this
       page, which has no hub window (window.gameWindow, the Game snapshot's), so do the three buttons */
    chk(!d.querySelector('#gameView .gsugg, #gameView [data-gsugg-side], #gameView [data-gtier-add], #gameView .gsugg-tier'),'the game page still draws its suggested parlays, their side switch or an Add all');
    chk(typeof w.gameWindow!=='function'&&!d.querySelector('#gameView [data-gp-pop], #gameView .gwin'),'the prop model\'s own page draws a game\'s Matchup, Mismatches or Team Stats buttons, with no window for them');
    /* with a window planted (a stand-in recording its calls), the page draws the three buttons under the head and over
       the Game bets card, in order, each 44px by its own rule, three to a row with no narrower layout (app v128's two by
       two at 680px and under went with its fourth button), and each press hands the window its card, the game and the
       button; no Game snapshot button (data-gp-pop "snap", app v128's) anywhere on the page; taken away, the buttons go
       with it */
    { const calls=[]; w.gameWindow=(k,gid,b)=>{ calls.push([k,gid,b]); return true; };
      try{
        d.querySelector('[data-game="'+g.id+'"]').click();
        const bs=[...d.querySelectorAll('#gameView .gwin [data-gp-pop]')], head=d.querySelector('#gameView .ghead'), gb=d.querySelector('#gameView .gbets'), row=d.querySelector('#gameView .gwin');
        chk(bs.map(b=>b.dataset.gpPop+':'+b.textContent.trim()).join()==='units:Matchup,mism:Mismatches,stats:Team Stats'&&bs.every(b=>b.dataset.gpGame===g.id&&b.getAttribute('aria-haspopup')==='dialog'&&b.type==='button'),
          'with the hub window there, the game page does not draw Matchup, Mismatches and Team Stats, in that order, as dialog buttons for its game: '+bs.map(b=>b.outerHTML.slice(0,90)).join(' | '));
        chk(!d.querySelector('[data-gp-pop="snap"]')&&![...d.querySelectorAll('#gameView button')].some(b=>/^\s*Game snapshot\s*$/.test(b.textContent)),'the game page still draws a Game snapshot button (app v128\'s, taken off by app v129)');
        chk(!!head&&!!row&&!!gb&&d.querySelectorAll('#gameView .gwin').length===1&&!!(head.compareDocumentPosition(row)&4)&&!!(row.compareDocumentPosition(gb)&4)&&d.querySelectorAll('#gameView .gbets').length===1,
          'the game page does not carry its buttons once, under its head and over its Game bets card, and the Game bets card once');
        const tall=[...d.styleSheets].flatMap(sh=>{ try{ return [...sh.cssRules]; }catch(e){ return []; } }).some(r=>r.selectorText==='.gwin .gwin-btn'&&r.style.getPropertyValue('min-height')==='44px');
        chk(tall,'the game page\'s window buttons have no rule making them 44px tall');
        { const rules=[...d.styleSheets].flatMap(sh=>{ try{ return [...sh.cssRules]; }catch(e){ return []; } }), cols=r=>r.style.getPropertyValue('grid-template-columns').replace(/\s+/g,'');
          const wide=rules.some(r=>r.selectorText==='.gwin'&&cols(r)==='repeat(3,minmax(0,1fr))');
          const narrow=rules.some(r=>r.media&&[...r.cssRules].some(c=>/^\.gwin$/.test(c.selectorText||'')&&cols(c)));
          chk(wide&&!narrow,'the game page\'s three window buttons are not laid out three to a row with no narrower layout: '+rules.filter(r=>/\.gwin\b/.test(r.cssText||'')&&!/gwin-btn/.test(r.cssText||'')).map(r=>r.cssText).join(' | ')); }
        for(const b of bs) b.click();
        chk(calls.length===3&&calls.every(([k,gid,b],i)=>k===bs[i].dataset.gpPop&&gid===g.id&&b===bs[i]),'a press on a game page\'s button does not hand the window its card, its game and itself: '+JSON.stringify(calls.map(c=>c.slice(0,2))));
      }finally{ try{ delete w.gameWindow; }catch(e){ w.gameWindow=undefined; } d.querySelector('[data-game="'+g.id+'"]').click(); }
      chk(!d.querySelector('#gameView [data-gp-pop]'),'the game page\'s buttons stay once the window is taken away'); }
    w.eval('GAME_TIER_CACHE={}');
    const T=F('gameTiers')(g), MIN=w.eval('GAME_LEG_MIN'), spec=w.eval('GAME_TIERS');
    /* always there while the game has lines, the right size, and to the rules. A hand takes one team leg
       and two lines a player at most, so the lines it can stand on are counted so: where the payload
       carries DraftKings' ids (app v109) a game whose player prices are not pulled yet, or never are
       (Sunday's early games), has its team legs alone, and no hand */
    { const P0=F('gameLegPool')(g), byP={}; for(const c of P0) if(c.grp!=='TEAM') byP[c.pid]=(byP[c.pid]||0)+1;
      const eff=Object.values(byP).reduce((a,n)=>a+Math.min(2,n),0)+(P0.some(c=>c.grp==='TEAM')?1:0);
      W.compose(eff>=4?spec.every(([id])=>!!T[id]):true,`a game with ${T.pool} lines (${eff} a hand can stand on) left a tier empty`);
      /* blocking: every leg a hand may take, and every leg on one, has DraftKings' id at its line where the
         payload carries ids, by the audit's own rule */
      const bad=[...P0,...spec.flatMap(([id])=>T[id]?T[id].legs:[])].filter(l=>!dkOk(l));
      chk(!bad.length,`${g.id}'s hands take ${bad.length} legs DraftKings has no id for at their line: ${bad.slice(0,4).map(l=>`${l.name} ${l.label} (${l.src})`).join(', ')}`); }
    /* the card states the floors (every leg 40%+ and no shorter than GAME_LEG_MIN; High +100 and 35%,
       Medium +250 and 20%, Low +500 and 10%, unless it says the lines cannot reach them): numbers on the
       page, so those are blocking; which hand is chosen, and its size, are warnings */
    for(const [id,,n,floor,minP] of spec){ const t=T[id]; if(!t) continue;
      chk(t.relaxed||t.corr>=minP-0.03,`the ${id} tier lands ${(t.corr*100).toFixed(0)}%, under its ${minP*100}% floor, without saying so`);
      chk(t.legs.every(l=>l.p>=0.40),`the ${id} tier has a leg under a 40% chance`);
      W.compose(t.legs.length===n,`the ${id} tier has ${t.legs.length} legs, not ${n}`);
      chk(t.legs.every(l=>l.gid===g.id)&&t.legs.filter(l=>l.grp==='TEAM').length<=1&&t.legs.every(l=>t.legs.filter(x=>x.pid===l.pid).length<=2)&&new Set(t.legs.map(l=>l.key)).size===n,`the ${id} tier breaks the leg rules`);
      /* (app v121) and no pair DraftKings will not take on one slip, by the audit's own copy of the rule (clashAud) */
      chk(!clashPairsAud(t.legs).length,`the ${id} hand of ${g.id} holds a pair DraftKings will not take on one slip: ${clashTxt(t.legs)}`);
      chk(t.legs.every(l=>isFinite(l.price)&&l.price!==0),`the ${id} tier has a leg with no price`);
      chk(t.legs.every(l=>l.price>=MIN),`the ${id} tier has a leg shorter than ${MIN}`);
      chk(t.corr>0&&t.corr<1&&t.dec>1,`the ${id} tier has a nonsense chance or price`);
      chk(t.relaxed||t.dec>=1+floor/100-0.02,`the ${id} tier pays ${t.dec.toFixed(2)}, under its +${floor} floor, without saying so`); }
    /* (app v121) every game of the week still to come: no hand holds a pair DraftKings will not take on one slip */
    { const bad=[]; for(const x of F('pbGames')()){ const H=F('gameTiers')(x); for(const [id] of spec) if(H&&H[id]&&clashPairsAud(H[id].legs).length) bad.push(`${x.id}'s ${id} hand: ${clashTxt(H[id].legs)}`); }
      chk(!bad.length,`a game page's hand holds a pair DraftKings will not take on one slip: ${bad.slice(0,4).join('; ')}`); }
    /* each tier grows the one before */
    if(T.high&&T.med) W.compose(T.high.legs.every(l=>T.med.legs.some(x=>x.key===l.key&&x.k===l.k)),'Medium does not grow High');
    if(T.med&&T.low) W.compose(T.med.legs.every(l=>T.low.legs.some(x=>x.key===l.key&&x.k===l.k)),'Low does not grow Medium');
    /* the pool: book prices where they exist, the model's estimate on the rest, and (app v127) no ladder bet: until then
       its rungs were in it, and a warning said so where none was; since, the hands' engine takes none, with every leg
       as the ids leave them too (gameLegPool's all), by the audit's own reading of a ladder (ladderAud) */
    { const pool=F('gameLegPool')(g), all=F('gameLegPool')(g,true);
      chk(pool.every(c=>c.gid===g.id&&c.price>=MIN&&(c.src==='real'||c.src==='est'||c.src==='dkline')),'the leg pool has a line from another game, too short a price or no source');
      const lad=[...pool,...all].filter(ladderAud);
      chk(!lad.length,`${g.id}'s hands' leg pool holds a ladder bet (a rung or 2+ touchdowns): ${lad.slice(0,4).map(l=>l.name+' '+l.label).join(', ')}`); }
    /* the high pair is the best payout for its chance among its seeds, not a safe nothing */
    if(T.high){ const one=c=>c.p*F('mlToDec')(c.price), pool=F('gameLegPool')(g).sort((a,b)=>one(b)-one(a));
      /* (app v121) a pair a hand can take: not a pair DraftKings will not take on one slip (clashAud, the audit's own copy) */
      const a=pool[0], b=pool.find(c=>c.key!==a.key&&!(c.grp==='TEAM'&&a.grp==='TEAM')&&!clashAud(a,c));
      if(a&&b){ const pd=F('parlayDec')([{leg:a,ml:a.price},{leg:b,ml:b.price}]), pr=F('parlayProb')([a,b],20000).corr;
        const [,,,hf,hp]=spec[0];
        /* only a pair High could take: the tier's own payout and chance floors, with room for simulation noise */
        W.compose(pd<1+hf/100||pr<hp+0.03||T.high.corr*T.high.dec>=pr*pd-0.06,'the High pair returns less than the two best single legs together'); } }
    chk(F('gameTiers')(g)===T,'the tiers are not cached between renders');
    /* the game bets are on the game's page (app v105), after its head */
    { const gh=d.querySelector('#gameView .ghead'), gb=d.querySelector('#gameView .gbets');
      chk(!!gh&&!!gb&&d.querySelectorAll('#gameView .gbets').length===1&&!!(gh.compareDocumentPosition(gb)&4),'the game page does not carry the Game bets card once, after its head'); }
    /* the parlay card prints a leg's fields as text: markup planted in the shared store never becomes an element */
    if(T.med&&T.med.legs.length){ const keepP=JSON.parse(JSON.stringify(S.parlay||{})), keepB=S.bookPrice, bad='<img src=x data-planted=1>';
      const l0=T.med.legs[0]; S.parlay={}; S.parlay[l0.key]=Object.assign({},l0,{pos:bad,team:bad,opp:bad,week:bad});
      S.bookPrice='"><img src=x data-planted=1>';
      try{ F('renderParlay')(); const body=d.getElementById('parlayBody');
        chk(!!body&&!body.querySelector('[data-planted]')&&/<img src=x data-planted=1>/.test(body.textContent),'markup in a parlay leg or the book price became an element on the parlay card'); }
      finally{ S.parlay=keepP; S.bookPrice=keepB; F('renderParlay')(); } }
    console.log(`O. the game page: no suggested parlays, its three window buttons (no Game snapshot) only with a window; the hands' engine, drawn nowhere: ${spec.map(([id,,n])=>T[id]?`${id} ${n} legs ${(T[id].corr*100).toFixed(0)}% at ${(T[id].dec).toFixed(2)}${T[id].relaxed?' (under floor)':''}`:`${id} none`).join(', ')} from ${T.pool} lines`); }
  /* ---- N. the credit-pull panel, in place of the old price sheet ---- */
  { const box=d.getElementById('pricePull');
    chk(!!box,'the Weekly Update tab has no credit-pull panel');
    for(const id of ['oddsLegs','oddsTemplate','oddsUpload','oddsClear','oddsWeekSel','oddsFile','oddsStatus'])
      chk(d.getElementById(id)===null,`price sheet control still on the page: ${id}`);
    for(const id of ['fetchGames','statsLink','rosLink','injLink','dcLink','upAll','allFiles'])
      chk(d.getElementById(id)!==null,`free download/upload control went missing: ${id}`);
    const keep=PAY.price_pull;
    /* what this build actually carries: a recorded pull, with a time */
    W.panel(keep&&keep.at,'no credit pull recorded in the payload');
    F('renderPricePull')();
    W.panel(/Last credit pull/.test(box.textContent),'panel does not say when credits were last spent');
    W.panel(/\d{1,2}:\d\d/.test(box.textContent),'panel shows no time of day for the pull');
    for(const wk of Object.keys(PAY.prices||{}))
      W.panel(box.textContent.includes(`week ${wk}: ${PAY.prices[wk].length.toLocaleString()}`),`panel does not count week ${wk}'s prices`);
    /* no record at all: falls back to the date the main lines were priced */
    const meta=PAY.mkt_meta||{}; const lastW=Object.keys(meta).sort((a,b)=>b-a)[0];
    PAY.price_pull=null; F('renderPricePull')();
    if(lastW&&meta[lastW].asof) chk(box.textContent.includes(meta[lastW].asof),'fallback does not carry the priced-on date');
    chk(/date only/.test(box.textContent),'fallback does not say it has the date alone');
    PAY.price_pull={at:'2026-09-17T14:03',week:2,credits_left:389};
    F('renderPricePull')();
    chk(/for week 2\./.test(box.textContent),'panel ignores the recorded pull week');
    chk(!/date only/.test(box.textContent),'panel still claims it only has a date');
    PAY.price_pull={at:'2026-09-17T14:03',week:2,credits_left:389,credits_spent:112};
    F('renderPricePull')();
    chk(box.textContent.includes('112 credits spent'),'panel does not say what the pull cost');
    PAY.price_pull=keep;
    /* the balance, read free on every build */
    const kc=PAY.credits;
    PAY.credits={at:'2026-09-17T14:05',used:131,left:369}; F('renderPricePull')();
    chk(/369 credits left of 500 this month, 131 used/.test(box.textContent.replace(/\s+/g,' ')),'panel does not report the balance');
    chk(!/class="warn"/.test(box.innerHTML),'a comfortable balance should not be flagged');
    PAY.credits={at:'2026-09-17T14:05',used:451,left:49}; F('renderPricePull')();
    chk(/class="warn"/.test(box.innerHTML),'a balance under a fifth of the month is not flagged');
    PAY.credits={at:'2026-09-17T14:05',used:499,left:1}; F('renderPricePull')();
    chk(/1 credit left/.test(box.textContent),'credits left is not singular at one');
    PAY.credits=null; F('renderPricePull')();
    chk(!/credits left/.test(box.textContent),'panel invents a balance when none was read');
    PAY.credits=kc; F('renderPricePull')();
    const cb=d.getElementById('checkCredits');
    chk(!!cb&&/Check Credits/.test(cb.textContent),'no Check Credits button');
    chk(cb&&cb.classList.contains('danger'),'the Check Credits button is not the red one');
    chk(!!d.getElementById('creditsStatus'),'the Check Credits button has nowhere to report');
    console.log(`N. credit pull: ${keep&&keep.at} for week ${keep&&keep.week}, ${Object.keys(PAY.prices||{}).length} week(s) of prices counted, sheet controls gone`); }

  /* ---- H. week-2 projections still sane after update ---- */
  let bad2=0,n2=0;
  for(const g of S.sched.filter(x=>x.w===2)){ const rr=rosterFor(g,false);
    for(const team in rr) for(const x of rr[team].players) for(const l of statLines(x)){ n2++;
      if(!l.prob&&!(isFinite(l.mu)&&l.mu>=0)) bad2++; for(const rg of (l.rungs||[])) if(!(rg.p>0&&rg.p<1)) bad2++; } }
  chk(bad2===0,`post-update projections bad: ${bad2}`);
  console.log(`H. week 2 after update: ${n2} stat blocks, ${bad2} bad`);

  /* ---- I. built-in data: same path as an upload, replayable, user state survives a rebuild ---- */
  (async()=>{
    /* ---- N2. Check Credits reads the published balance ---- */
    { const box=d.getElementById('pricePull'), btn=d.getElementById('checkCredits'), st=d.getElementById('creditsStatus');
      const keep=PAY.credits, realFetch=w.fetch; let asked=null;
      w.fetch=u=>{ asked=u; return Promise.resolve({ok:true,status:200,json:async()=>({at:'2026-09-17T14:05',used:131,left:369})}); };
      btn.click(); await new Promise(r=>setTimeout(r,120));
      chk(/credits\.json\?t=\d+/.test(asked||''),'Check Credits does not cache-bust the published balance');
      chk(/369 credits left of 500 this month, 131 used/.test(box.textContent.replace(/\s+/g,' ')),'Check Credits did not update the panel');
      chk(!btn.disabled&&/Check Credits/.test(btn.textContent),'the button did not come back after a check');
      w.fetch=()=>Promise.resolve({ok:false,status:404});
      btn.click(); await new Promise(r=>setTimeout(r,120));
      chk(/HTTP 404/.test(st.textContent),'a failed check says nothing');
      chk(/369/.test(box.textContent),'a failed check wiped the balance already on the page');
      chk(!btn.disabled,'the button stayed disabled after a failed check');
      w.fetch=realFetch; PAY.credits=keep; F('renderPricePull')();
      console.log('N2. Check Credits: updates the panel, survives a 404'); }
    const applyBaked=F('applyBaked');
    w.eval('S=freshState(); NORM=null'); let SI=w.eval('S');   /* exactly the state boot has when it applies baked data */
    let b1; try{ b1=w.eval('applyBaked()'); }catch(e){ chk(false,'applyBaked threw on a fresh state: '+e.message); b1={sched:0,inj:0,prices:0,stats:[]}; }
    const b1again=b1; chk(!!b1again,'applyBaked returned nothing');
    const bakedWeeks=Object.keys(PAY.stats||{});
    if(bakedWeeks.length){
      const ids=[].concat(...bakedWeeks.map(wk=>[...new Set(PAY.stats[wk].map(r=>{const g=SI.sched.find(x=>+x.w===+r.week&&(x.h===r.team||x.a===r.team)); return g?g.id:null;}))])).filter(Boolean);
      chk(ids.every(id=>SI.processedGames[id]),'baked stats did not mark their games processed');
      chk(b1.stats.length===ids.length,`baked stats applied ${b1.stats.length} games, expected ${ids.length}`);
      chk(Object.keys(SI.projections).length>0,'baked stats did not freeze projections before applying');
      const b2=applyBaked(); chk(b2.stats.length===0,'baked stats re-applied on a second pass');
    }
    if(PAY.prices&&Object.keys(PAY.prices).length){
      chk(b1.prices>0,'baked prices loaded nothing');
      const anyGame=Object.keys(SI.odds).find(g=>Object.keys(SI.odds[g]).length); chk(!!anyGame,'baked prices not in S.odds');
      const b2=applyBaked(); chk(b2.prices===0,'baked prices reloaded over an existing week');
    }
    chk(b1.sched>=0&&SI.sched.every(g=>g.sp==null||isFinite(g.sp)),'baked schedule merge produced bad lines');
    /* a rebuild with a different data build keeps the user's parlays, stake and prices */
    mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:'old-build',parlay:{'g|p|s':{p:0.5}},saved:[{id:'sp1',saved:'2026-09-13T00:00:00.000Z',week:1,stake:20,payout:50,dec:2.5,ml:150,legs:[]}],stake:55,odds:{gX:{pX:{passing_yards:{'250':-110}}}}});
    await F('boot')(); SI=w.eval('S');
    chk(SI.dataBuild===F('DATA_BUILD'),'rebuild did not adopt the new data build');
    chk(SI.stake===55&&SI.parlay['g|p|s']&&SI.saved.length===1&&SI.odds.gX,'user state lost across a data rebuild');
    chk(Object.keys(SI.processedGames).length===0,'rebuild replayed data despite NO_BAKED');
    /* I3. the suggested parlays' choices are the reader's, kept in S.ui.pb across a reload; a
       damaged one reads as everything ticked */
    { const pb={k:{ml:true,ats:false,total:true,over:false,under:true},off:['2099_01_XX_YY'],gx:true};
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),stake:20,ui:{pb,suggestSide:'over',showRungs:true}});
      await F('boot')(); let SP=w.eval('S');
      chk(JSON.stringify(SP.ui.pb)===JSON.stringify(pb),'the suggested parlays\' choices did not survive a reload: '+JSON.stringify(SP.ui.pb));
      /* (app v124) the game page's side switch went with its suggested parlays: a choice saved before is not read */
      chk(!('suggestSide' in SP.ui),'a game page\'s side switch saved before app v124 is still read into the view: '+JSON.stringify(SP.ui.suggestSide));
      /* (app v127) and the Threshold ladders box went with the ladders: a choice saved before is not read either */
      chk(!('showRungs' in SP.ui),'the Threshold ladders box\'s choice saved before app v127 is still read into the view: '+JSON.stringify(SP.ui.showRungs));
      { const kb=d.querySelector('#pbPanel [data-pb-kind="ats"]');
        const P=d.getElementById('pbPanel');
        chk(!F('pbGames')().length||(!P.querySelector('[data-pb-mix].on')&&!P.querySelector('.pb-custom')&&!/\bCustom\b/.test(P.textContent)&&!!kb&&!kb.checked),'the panel did not draw the choices it was reloaded with (no mix lit, no Custom tag, Spread unticked)'); }
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),ui:{pb:{k:'bad',off:'<x>',gx:3}}});
      await F('boot')(); SP=w.eval('S');
      chk(Object.values(SP.ui.pb.k).every(v=>v===true)&&Array.isArray(SP.ui.pb.off)&&!SP.ui.pb.off.length&&SP.ui.pb.gx===null,'a damaged saved choice did not read as everything ticked');
      console.log('I3. suggested parlays: the bet types, the games and the open list come back after a reload; a damaged save reads as all ticked'); }
    /* I4. the amount bet comes back with the page, and a saved one that is not an amount (an old or
       hand-edited state, on the same bake or across a rebuild) reads as $20 in the state, the Bet
       amount box and the builder alike */
    { const box=()=>d.getElementById('pbStake'), cases=[[12.5,12.5],['abc',20],[-4,20],[0,20],[null,20],['<b>',20],[{},20],[250000,100000]];
      for(const [saved,want] of cases) for(const same of [true,false]){
        mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:same?F('DATA_BUILD'):'old-build',dataStamp:F('DATA_STAMP'),stake:saved,ui:{}});
        await F('boot')(); const SP=w.eval('S'); d.querySelector('#tabs button[data-tab="parlay"]').click(); w.eval('renderParlay()');
        const shown=box()?box().value:null, txt=want%1?want.toFixed(2):String(want);
        chk(SP.stake===want&&(!F('pbGames')().length||shown===txt)&&!/NaN|Infinity/.test(d.getElementById('pbPanel').textContent),
          `a saved amount ${JSON.stringify(saved)} ${same?'on the same bake':'across a rebuild'} came back as ${JSON.stringify(SP.stake)} (the box ${JSON.stringify(shown)}), not ${want}`); }
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),ui:{}}); await F('boot')();
      chk(w.eval('S').stake===20,'with no amount saved the page does not start on $20');
      console.log(`I4. the amount bet: kept across a reload; ${cases.length-2} saved values that are not an amount read as $20 and one over the most as $100,000, on the same bake and across a rebuild`); }
    /* NL4. (app v127) a ladder bet kept in the builder from before leaves it as the page loads it (pbDropLadders, at boot),
       said once on the builder until the builder next changes. A saved parlay on a made-up game, not on the schedule
       (so no kickoff takes a leg out, in any week and the off-season), holding a rung (60+ receiving yards), 2+
       touchdowns, a main line, a one-touchdown leg, a money line and a rung of a Suggested Parlays set locked before
       the change (kept: the record grades that set as it locked): after the boot exactly the rung and 2+ touchdowns are
       gone, the retired saved list untouched, the store no longer carrying them, and the builder drawing one line saying
       2 legs were removed (its count blocking, its words W.wording), still there after another draw and gone once a leg
       is taken off; a saved parlay of the visitor's own that the page cannot read (section I's 'g|p|s', no stat) left
       where two ladders beside it go; and a saved parlay with no ladder kept whole with no line. The audit's own reading
       of a ladder (ladderAud) says which legs are ladders, never the page's isLadder */
    { const clone=v=>JSON.parse(JSON.stringify(v)), G0='2099_01_AUX_AUY', wk0=F('currentWeek')(), base=(pid,o)=>({gid:G0,pid,side:'over',main:false,src:'est',mu:null,pos:'WR',grp:'WR',team:'AUX',opp:'AUY',week:wk0,...o});
      const LEGS={
        [`${G0}|aud-n1|receiving_yards`]:base('aud-n1',{stat:'receiving_yards',k:60,p:0.4,price:150,mu:52,name:'Made-up Rung',label:'60+ receiving yards'}),
        [`${G0}|aud-n2|any_td`]:base('aud-n2',{stat:'any_td',k:2,p:0.08,price:900,name:'Made-up Twice',label:'Scores 2+ touchdowns'}),
        [`${G0}|aud-n3|rushing_yards`]:base('aud-n3',{stat:'rushing_yards',k:54.5,main:true,p:0.53,price:-110,mu:57,name:'Made-up Main',pos:'RB',grp:'RB',label:'Over 54.5 rushing yards'}),
        [`${G0}|aud-n4|any_td`]:base('aud-n4',{stat:'any_td',k:1,p:0.36,price:170,name:'Made-up Once',pos:'RB',grp:'RB',label:'Scores a touchdown'}),
        [`${G0}|team:AUX|ml`]:base('team:AUX',{stat:'ml',k:0,p:0.55,price:-125,name:'Made-up Club',pos:'Game',grp:'TEAM',label:'To win'}),
        [`${G0}|aud-n5|passing_yards`]:base('aud-n5',{stat:'passing_yards',k:250,p:0.42,price:140,src:'dkline',mu:241,name:'Made-up Kept',pos:'QB',grp:'QB',label:'250+ passing yards',kept:{fair:0.39,est:true}})};
      const SAVED=[{id:'nl4',saved:'2026-09-13T00:00:00.000Z',week:1,stake:20,payout:50,dec:2.5,ml:150,legs:[{...LEGS[`${G0}|aud-n1|receiving_yards`]}]}];
      const want=Object.keys(LEGS).filter(k=>!(ladderAud(LEGS[k])&&!LEGS[k].kept)).sort(), gone=Object.keys(LEGS).filter(k=>!want.includes(k));
      const note=()=>[...d.querySelectorAll('#parlayBody [data-pb-noladder]')];
      /* (app v130, the owner's call of 22 October 2026: no descriptions) the count alone */
      const words='2 ladder legs removed.';
      const memParlay=()=>{ try{ return Object.keys(JSON.parse(mem).parlay||{}).sort(); }catch(e){ return null; } };
      chk(gone.length===2&&gone.every(k=>/aud-n1|aud-n2/.test(k))&&ladderAud(LEGS[`${G0}|aud-n5|passing_yards`])&&!ladderAud({p:0.5}),'NL4: the audit\'s own reading of a ladder does not pick out the made-up rung and 2+ touchdowns alone (a kept rung, a main line, one touchdown, a money line and a leg with no stat not)');
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),stake:20,parlay:clone(LEGS),saved:clone(SAVED),ui:{}});
      await F('boot')(); let SL=w.eval('S'); await sleep(450);
      chk(JSON.stringify(Object.keys(SL.parlay).sort())===JSON.stringify(want),`NL4: after a boot the builder holds ${Object.keys(SL.parlay).sort().join(', ')}, not ${want.join(', ')}: a ladder bet kept from before was not taken out, or another leg was`);
      chk(JSON.stringify(SL.saved)===JSON.stringify(SAVED),'NL4: the boot\'s strip touched the retired saved list');
      chk(JSON.stringify(memParlay())===JSON.stringify(want),`NL4: the store still carries the ladder bets the boot took out: ${JSON.stringify(memParlay())}`);
      d.querySelector('#tabs button[data-tab="parlay"]').click();
      { const n1=note(); chk(n1.length===1&&n1[0].dataset.pbNoladder==='2',`NL4: the builder draws ${n1.length} lines saying ladder bets were removed (${n1.map(e=>e.dataset.pbNoladder).join(', ')}), not one saying 2`);
        W.wording(n1.length===1&&n1[0].textContent===words,`NL4: the builder's line on the removed ladder bets reads "${n1[0]?n1[0].textContent:''}"`); }
      F('renderParlay')();
      chk(note().length===1&&note()[0].dataset.pbNoladder==='2','NL4: the line on the removed ladder bets went with the next draw of the builder, which had not changed');
      F('toggleLeg')(`${G0}|team:AUX|ml`,0,null,'over',false);
      chk(!w.eval('S').parlay[`${G0}|team:AUX|ml`]&&!note().length,'NL4: the line on the removed ladder bets outstayed a change to the builder (the money line taken off)');
      F('renderParlay')(); chk(!note().length,'NL4: the line on the removed ladder bets came back on a later draw');
      /* a ladder beside a leg of a game played since: the builder's own drop of that leg, on the draw after the strip
         (pbDropLadders, then renderParlay, in the order the boot and an import call them), does not end the line, so both
         are said, the ladder's first, and it stays through the next draw (the review of 21 October 2026: the line went
         before anyone saw it). A made-up game kicked off in 2000 is on the schedule for the case alone, put back after */
      { const GS='2000_01_AUZ_AUV', sch=w.eval('S').sched, row={id:GS,w:wk0,d:'2000-01-03',t:'13:00',a:'AUZ',h:'AUV'};
        sch.push(row);
        try{ const P=w.eval('S').parlay; for(const k of Object.keys(P)) delete P[k];
          P[`${G0}|aud-n1|receiving_yards`]=clone(LEGS[`${G0}|aud-n1|receiving_yards`]);
          P[`${GS}|aud-n6|receptions`]=base('aud-n6',{gid:GS,stat:'receptions',k:4.5,main:true,p:0.5,price:-110,mu:4.4,name:'Made-up Played',team:'AUZ',opp:'AUV',label:'Over 4.5 receptions'});
          const n=F('pbDropLadders')(); F('renderParlay')();
          const ps=[...d.querySelectorAll('#parlayBody > p')], la=note(), ko=ps.filter(p=>/^1 leg removed: its game kicked off\.$/.test(p.textContent)), left=Object.keys(w.eval('S').parlay);
          chk(n===1&&!left.length&&la.length===1&&la[0].dataset.pbNoladder==='1'&&ko.length===1&&ps.indexOf(la[0])>=0&&ps.indexOf(la[0])<ps.indexOf(ko[0]),
            `NL4: a ladder saved beside a leg of a game played since: the strip took ${n}, the builder holds ${left.join(', ')||'nothing'}, and draws ${la.length} line(s) on the removed ladder bet and ${ko.length} on the game kicked off (the ladder's first): the builder's own drop ended the line before anyone saw it`);
          W.wording(la.length===1&&la[0].textContent==='1 ladder leg removed.',`NL4: the builder's line on one removed ladder bet reads "${la[0]?la[0].textContent:''}"`);
          F('renderParlay')(); chk(note().length===1,'NL4: the line on the removed ladder bet went with the draw after the builder dropped a leg of a game kicked off itself');
        } finally { const i=sch.indexOf(row); if(i>=0) sch.splice(i,1); const P=w.eval('S').parlay; for(const k of Object.keys(P)) delete P[k]; w.eval('PB_NOLADDER=null'); F('renderParlay')(); } }
      /* a leg the page cannot read stays where the ladders beside it go */
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),stake:20,ui:{},
        parlay:{'g|p|s':{p:0.5},[`${G0}|aud-n1|receiving_yards`]:clone(LEGS[`${G0}|aud-n1|receiving_yards`]),[`${G0}|aud-n2|any_td`]:clone(LEGS[`${G0}|aud-n2|any_td`])}});
      await F('boot')(); SL=w.eval('S'); await sleep(450);
      chk(JSON.stringify(Object.keys(SL.parlay))==='["g|p|s"]'&&JSON.stringify(SL.parlay['g|p|s'])==='{"p":0.5}'&&note().length===1&&note()[0].dataset.pbNoladder==='2',
        `NL4: with a leg the page cannot read beside two ladder bets, the boot left ${Object.keys(SL.parlay).join(', ')} and ${note().length} lines (${note().map(e=>e.dataset.pbNoladder).join(', ')})`);
      /* no ladder saved: nothing taken out, no line */
      const NONE=Object.fromEntries(want.map(k=>[k,clone(LEGS[k])]));
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),stake:20,ui:{},parlay:NONE});
      await F('boot')(); SL=w.eval('S'); await sleep(450);
      chk(JSON.stringify(Object.keys(SL.parlay).sort())===JSON.stringify(want)&&!note().length,`NL4: a saved builder with no ladder bet came back as ${Object.keys(SL.parlay).sort().join(', ')} with ${note().length} lines about removed ladder bets`);
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:F('DATA_STAMP'),ui:{}}); await F('boot')(); await sleep(450);
      console.log(`NL4. no ladder bets kept: a saved builder's rung and 2+ touchdowns taken out as the page loads it (a locked set's kept rung, a main line, one touchdown and a money line kept), the store rewritten, one line saying 2 were removed until the builder changed, said beside a leg of a game played since; a leg the page cannot read kept; a builder with no ladder untouched`); }
    /* I2. a new bake of the same model rebuilds the season and says nothing about it: the job
       publishes several times a week, and every one of those has to reach every device */
    { const stamp=F('DATA_STAMP');
      chk(!!stamp&&stamp!=='baseline','the payload carries no bake time to key freshness on');
      chk(stamp===(PAY.baked_at||F('DATA_BUILD')),'the freshness key is not the bake time');
      /* saved under the same model and rosters, but an older bake */
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:'2000-01-01T00:00',
        stake:41,parlay:{'g|p|s':{p:0.5}},processedGames:{'stale-game':true},actuals:{'1':{x:1}},
        projections:{'stale':1},processed:{'1':true}});
      await F('boot')(); let SN=w.eval('S');
      chk(SN.dataStamp===stamp,'a stale bake was not adopted');
      chk(!SN.processedGames['stale-game'],'a stale bake kept the browser\'s old graded games');
      chk(!SN.projections.stale,'a stale bake kept the browser\'s old projections');
      chk(SN.stake===41&&SN.parlay['g|p|s'],'a stale bake lost what the visitor made');
      chk(d.getElementById('rebuildNote').hidden,'a routine re-bake shouted about itself');
      /* the same bake is reused rather than rebuilt: the fast path still exists */
      mem=JSON.stringify({build:F('MODEL_BUILD'),dataBuild:F('DATA_BUILD'),dataStamp:stamp,
        stake:42,processedGames:{'kept-game':true}});
      await F('boot')(); SN=w.eval('S');
      chk(SN.processedGames['kept-game']&&SN.stake===42,'an unchanged bake was rebuilt anyway');
      chk(d.getElementById('rebuildNote').hidden,'an unchanged bake showed a note');
    }
    console.log(`I. built-in data: ${bakedWeeks.length} week(s) of stats (${b1.stats.length} games), ${b1.prices} prices, ${b1.inj} inactives, ${b1.sched} schedule fields; replay is a no-op; parlays/stake/prices survive a rebuild`);
    /* ---- T. live tracking: every bit of it pure, so none of it needs a network ---- */
    { const nameKey=F('nameKey'), espnStats=F('espnStats'), liveLeg=F('liveLeg'),
            liveGameLeg=F('liveGameLeg'), espnGames=F('espnGames');
      chk(nameKey('A.J. Brown')===nameKey('AJ Brown'),'A.J. and AJ do not match');
      chk(nameKey('Marvin Harrison Jr.')===nameKey('Marvin Harrison'),'a suffix breaks the match');
      chk(nameKey('Amon-Ra St. Brown')===nameKey('Amon-Ra St Brown'),'punctuation breaks the match');
      chk(nameKey('Josh Allen')!==nameKey('Keenan Allen'),'two Allens collide');
      const SUM={boxscore:{players:[
        {team:{abbreviation:'ATL'},statistics:[
          {name:'passing',labels:['C/ATT','YDS','AVG','TD','INT'],athletes:[{athlete:{displayName:'Michael Penix Jr.'},stats:['18/27','241','8.9','2','1']}]},
          {name:'rushing',labels:['CAR','YDS','AVG','TD','LONG'],athletes:[{athlete:{displayName:'Bijan Robinson'},stats:['17','86','5.1','1','22']}]},
          {name:'receiving',labels:['REC','YDS','AVG','TD','LONG','TGTS'],athletes:[{athlete:{displayName:'Bijan Robinson'},stats:['4','31','7.8','0','12','5']}]}]},
        {team:{abbreviation:'WSH'},statistics:[
          {name:'kicking',labels:['FG','PCT','LONG','XP','PTS'],athletes:[{athlete:{displayName:'Matt Gay'},stats:['2/3','66.7','48','3/3','9']}]}]}]}};
      const bij=espnStats(SUM,'ATL','Bijan Robinson');
      chk(bij&&bij.carries===17&&bij.rushing_yards===86,'the rushing line was misread');
      chk(bij&&bij.receptions===4&&bij.receiving_yards===31&&bij.targets===5,'the receiving line was misread');
      chk(bij&&bij.scrim_yards===117,'scrimmage yards were not added up');
      chk(bij&&bij.any_td===1,'a touchdown was not counted');
      const pen=espnStats(SUM,'ATL','Michael Penix');
      chk(pen&&pen.completions===18&&pen.attempts===27,'C/ATT was not split');
      chk(pen&&pen.passing_yards===241&&pen.passing_tds===2&&pen.passing_interceptions===1,'the passing line was misread');
      chk(pen&&pen.any_td===0,'a quarterback\'s touchdown passes were counted as touchdowns he scored: '+(pen&&pen.any_td));
      const gay=espnStats(SUM,'WAS','Matt Gay');     /* our WAS against ESPN's WSH */
      chk(gay&&gay.fg_made===2&&gay.fg_att===3&&gay.kick_pts===9,'the kicking line was misread, or the team alias missed');
      chk(espnStats(SUM,'ATL','Nobody Here')===null,'a player with no line should read null, never zeroes');
      const SHUF=JSON.parse(JSON.stringify(SUM)), grp=SHUF.boxscore.players[0].statistics[1];
      grp.labels=['YDS','CAR','TD','AVG','LONG']; grp.athletes[0].stats=['86','17','1','5.1','22'];
      chk(espnStats(SHUF,'ATL','Bijan Robinson').rushing_yards===86,'the box score is read by position rather than by label');
      const over={k:43.5,side:'over',main:true,stat:'receiving_yards'},
            under={k:54.5,side:'under',main:true,stat:'rushing_yards'},
            rung={k:3,side:'over',main:false,stat:'receptions'};
      chk(liveLeg(over,50,'live').state==='hit','an over that has cleared is not called early');
      chk(liveLeg(over,20,'live').state==='live'&&liveLeg(over,20,'live').need===23.5,'an over in progress miscounts what is left');
      chk(liveLeg(over,20,'post').state==='missed','an over that never cleared is not a miss at the final');
      chk(liveLeg(under,60,'live').state==='missed','a busted under is not called the moment it busts');
      chk(liveLeg(under,30,'live').state==='live','a live under is decided too soon');
      chk(liveLeg(under,30,'post').state==='hit','an under that held is not a hit');
      chk(liveLeg(rung,3,'live').state==='hit','a rung needs k or more, not more than k');
      chk(liveLeg(rung,2,'live').need===1,'a rung miscounts what is left');
      chk(liveLeg(over,null,'live').state==='unknown','a missing number is not flagged unknown');
      chk(liveLeg(over,5,'pre').state==='pending','a game that has not started is not pending');
      const sc={home:'ATL',away:'CAR',hs:20,as:17,state:'live'}, fin={...sc,state:'post'};
      chk(liveGameLeg({stat:'ml',team:'ATL',k:0},sc).state==='live','a team leg is decided before the final');
      chk(liveGameLeg({stat:'ml',team:'ATL',k:0},fin).state==='hit','the winner is not called at the final');
      chk(liveGameLeg({stat:'ml',team:'CAR',k:0},fin).state==='missed','the loser is not called at the final');
      chk(liveGameLeg({stat:'ats',team:'CAR',k:6.5},fin).state==='hit','a cover from the dog side is misread');
      chk(liveGameLeg({stat:'ats',team:'ATL',k:-6.5},fin).state==='missed','a failed cover from the favourite side is misread');
      chk(liveGameLeg({stat:'ml',team:'ATL',k:0},{...sc,state:'pre'}).state==='pending','a game that has not kicked off is not pending');
      const SB={events:[{id:'401',competitions:[{status:{type:{state:'in',shortDetail:'Q3 7:12'}},competitors:[
        {homeAway:'home',team:{abbreviation:'ATL'},score:'20'},{homeAway:'away',team:{abbreviation:'CAR'},score:'17'}]}]}]};
      const mp=espnGames(SB,[{id:'2026_02_CAR_ATL',h:'ATL',a:'CAR',w:2}]);
      chk(!!mp['2026_02_CAR_ATL'],'the scoreboard did not map onto our schedule');
      chk(mp['2026_02_CAR_ATL'].hs===20&&mp['2026_02_CAR_ATL'].as===17,'the score came through wrong');
      chk(mp['2026_02_CAR_ATL'].state==='live'&&mp['2026_02_CAR_ATL'].eid==='401','the state or the event id is wrong');
      chk(mp['2026_02_CAR_ATL'].kick===null,'a scoreboard with no date should leave the kickoff null, not NaN');
      { const SBD=JSON.parse(JSON.stringify(SB)); SBD.events[0].date='2026-09-20T17:00Z';
        const k=espnGames(SBD,[{id:'2026_02_CAR_ATL',h:'ATL',a:'CAR',w:2}])['2026_02_CAR_ATL'].kick;
        chk(k===Date.parse('2026-09-20T17:00Z'),'the kickoff time did not come through'); }
      chk(Object.keys(espnGames(SB,[{id:'x',h:'KC',a:'BUF',w:2}])).length===0,'an unrelated game was matched anyway');
      /* every code our schedule uses has to survive the map, or that team's games never
         appear on any of the three sites. The Rams did not: ESPN_AB turned our own LA into
         LAR, which matches nothing, so no Rams game was ever mapped. */
      { const espnAb=F('espnAb'), ours=new Set();
        for(const g2 of S.sched){ ours.add(g2.h); ours.add(g2.a); }
        const lost=[...ours].filter(t=>espnAb(t)!==t&&!ours.has(espnAb(t)));
        chk(lost.length===0,'the abbreviation map sends our own code somewhere we do not use: '+lost.join(', '));
        /* and the codes ESPN is known to differ on land on one of ours */
        for(const [from,to] of [['WSH','WAS'],['LAR','LA'],['JAC','JAX']])
          chk(ours.has(espnAb(from))&&espnAb(from)===to,
            'ESPN\u2019s '+from+' does not map onto a team we have (got '+espnAb(from)+')');
        /* a whole week must map, not most of it */
        const wk=S.sched.filter(g2=>+g2.w===2);
        const SBW={events:wk.map((g2,i)=>({id:'5'+i,competitions:[{status:{type:{state:'in',shortDetail:'Q1'}},
          competitors:[{homeAway:'home',team:{abbreviation:g2.h},score:'7'},
                       {homeAway:'away',team:{abbreviation:g2.a},score:'3'}]}]}))};
        chk(Object.keys(espnGames(SBW,wk)).length===wk.length,
          'only '+Object.keys(espnGames(SBW,wk)).length+' of '+wk.length+' games in a week mapped'); }
      /* the scoreboard is someone else's: it must never reach what we save */
      chk(!/"state":"(live|post|pre)"/.test(JSON.stringify(S.saved||[])),'live data reached a saved parlay');
      console.log('T. live tracking: box score, name matching, leg states and scoreboard mapping all parse'); }

    /* ---- T2. the Games tab reads the scoreboard when asked, and not before ---- */
    { const LIVE=F('LIVE');
      chk(!!d.getElementById('slateNow')&&!!d.getElementById('slateStamp'),'the Games tab has no Refresh scores button');
      chk(!d.getElementById('slateEvery')&&!d.getElementById('slateDot'),'the Games tab still has the timed scores picker');
      chk(LIVE.slate===false,'the Games tab starts with the scoreboard off');
      { const st0=d.getElementById('slateStamp').textContent;
        chk(st0===''||st0==='scores off','the stamp claims a scoreboard read before one was asked for: '+st0); }
      /* with it off, a started game reads exactly as it did before there was a scoreboard */
      const started=S.sched.filter(g=>F('gameStarted')(g)&&!F('gameFinal')(g));
      const wk=started.length?started[0].w:null;
      /* the fetch the page would make: serve a scoreboard for whichever week is on screen,
         and fail any box-score call, since the slate must never ask for one */
      let sbCalls=0, sumCalls=0;
      const realFetch=w.fetch;
      w.fetch=u=>{ const s2=String(u);
        if(s2.indexOf('/summary?')>=0){ sumCalls++; return Promise.reject(new Error('no box score for a slate')); }
        if(s2.indexOf('scoreboard')>=0){ sbCalls++;
          const shown=F('slateWeek')();
          /* the scoreboard says what is happening, which is not always what our schedule
             thinks: a game we call final by the clock is reported post, one still running
             is reported in, and the card must follow ESPN rather than the clock */
          return Promise.resolve({ok:true,status:200,json:async()=>({events:F('gamesIn')(shown).map((g,i)=>{
            const over=F('gameFinal')(g);
            return {id:'9'+i, date:'2026-09-20T17:00Z',
              competitions:[{status:{type:{state:over?'post':'in',shortDetail:over?'Final':'Q2 4:01'}},competitors:[
                {homeAway:'home',team:{abbreviation:g.h},score:'21'},
                {homeAway:'away',team:{abbreviation:g.a},score:'13'}]}]};})})});
        }
        return realFetch(u); };
      if(wk!=null){
        const ws=d.getElementById('weekSel');
        if(ws.value!==String(wk)){ ws.value=String(wk); ws.dispatchEvent(new w.Event('change')); }
        const shownWk=wk;
        /* (app v122) the row's final-score cell, in the Matchups board's column, carries the live score and clock */
        const before=d.querySelector('[data-game="'+started[0].id+'"] .sl-result').textContent;
        chk(/LIVE/.test(before),'a started game should read LIVE until the scoreboard is read: '+before);
        d.getElementById('slateNow').click();
        await new Promise(r=>setTimeout(r,120));
        const after=d.querySelector('[data-game="'+started[0].id+'"] .sl-result').textContent;
        chk(/13.21/.test(after),'the score did not reach the card: '+after);
        chk(/Q2 4:01/.test(after),'the clock did not reach the card: '+after);
        chk(sbCalls===1,'the slate asked for the scoreboard '+sbCalls+' times, not once');
        chk(sumCalls===0,'the slate fetched '+sumCalls+' box score(s); a game card needs none');
        chk(/^scores \d/.test(d.getElementById('slateStamp').textContent),
          'the stamp does not say when the scores were read: '+d.getElementById('slateStamp').textContent);
        /* someone else's scoreboard must not reach what we save */
        chk(!/"clock"/.test(JSON.stringify(S)),'the scoreboard reached the saved state');
        /* a finished game is not a live one: ESPN carries the final score for hours before
           nflverse posts the stats that settle it, and it must not be labelled live */
        { const done=S.sched.filter(g2=>+g2.w===+shownWk&&F('gameFinal')(g2));
          for(const g2 of done){
            const card=d.querySelector('[data-game="'+g2.id+'"]'); if(!card) continue;
            const res=card.querySelector('.sl-result').textContent;
            chk(!/\bLIVE\b/.test(res),'a finished game still reads LIVE: '+g2.id);
            chk(!/leading|Tied /.test(res)&&/ won |^Tie |^Final/.test(res.trim()),
              'a finished game calls its score live: '+g2.id+' '+res); } }
      }
      /* a week is graded a game at a time: one game's stats must never speak for another */
      { const wks=Object.keys(S.actuals||{});
        for(const wname of wks){
          const inWeek=F('gamesIn')(+wname);
          const graded=inWeek.filter(g2=>S.processedGames&&S.processedGames[g2.id]);
          chk(graded.length>0,'week '+wname+' has actuals but no game marked graded');
          if(graded.length<inWeek.length){
            /* the mixed case, which is every Sunday: opening an ungraded game must not
               show it as played */
            const nope=inWeek.find(g2=>!(S.processedGames&&S.processedGames[g2.id]));
            chk(!!nope,'expected an ungraded game in week '+wname);
          }
        }
        console.log(`S2. grading is per game: ${Object.keys(S.processedGames||{}).length} game(s) graded across ${wks.length} week(s) with actuals`); }

      /* ---- T3. a game in progress reads its box score on the button ---- */
      if(wk!=null){
        const live=S.sched.filter(g2=>+g2.w===+wk&&F('gameStarted')(g2)&&!F('gameFinal')(g2));
        const g3=live[0];
        if(g3){
          /* the box score ESPN would serve for this game: one real player off our own roster,
             so the name matching is exercised rather than stubbed around */
          const ros=F('rosterFor')(g3,false);
          const team=Object.keys(ros).find(t=>ros[t].players.length);
          const who=team&&ros[team].players[0];
          let boxCalls=0;
          w.fetch=u=>{ const s2=String(u);
            if(s2.indexOf('/summary?')>=0){ boxCalls++;
              /* every group, because the first man on the roster may be any position and the
                 row shows the headline stats for his: a passer must get a passing line */
              return Promise.resolve({ok:true,status:200,json:async()=>({boxscore:{players:[
                {team:{abbreviation:team},statistics:[
                  {name:'passing',labels:['C/ATT','YDS','AVG','TD','INT'],
                   athletes:[{athlete:{displayName:who.pl.n},stats:['18/27','241','8.9','2','1']}]},
                  {name:'rushing',labels:['CAR','YDS','AVG','TD','LONG'],
                   athletes:[{athlete:{displayName:who.pl.n},stats:['12','78','6.5','1','21']}]},
                  {name:'receiving',labels:['REC','YDS','AVG','TD','LONG','TGTS'],
                   athletes:[{athlete:{displayName:who.pl.n},stats:['3','29','9.7','0','14','5']}]},
                  {name:'kicking',labels:['FG','PCT','LONG','XP','PTS'],
                   athletes:[{athlete:{displayName:who.pl.n},stats:['2/3','66.7','48','3/3','9']}]}]}]}})});
            }
            if(s2.indexOf('scoreboard')>=0){
              return Promise.resolve({ok:true,status:200,json:async()=>({events:[{id:'777',date:'2026-09-20T17:00Z',
                competitions:[{status:{type:{state:'in',shortDetail:'Q3 2:15'}},competitors:[
                  {homeAway:'home',team:{abbreviation:g3.h},score:'19'},
                  {homeAway:'away',team:{abbreviation:g3.a},score:'12'}]}]}]})});
            }
            return realFetch(u); };
          d.querySelector('[data-game="'+g3.id+'"]').click();
          chk(!!d.getElementById('gameStatsNow'),'a game in progress has no Refresh stats button');
          const before=d.querySelector('[data-open="'+who.pl.id+'"] .sum').textContent;
          chk(/projected/.test(before),'a player should read projected until the box score is read: '+before);
          d.getElementById('gameStatsNow').click();
          await new Promise(r=>setTimeout(r,150));
          const after=d.querySelector('[data-open="'+who.pl.id+'"] .sum').textContent;
          chk(/241|78|29|9/.test(after.replace(/proj[^)]*\)/g,'')),
            'no live number reached the row: '+after);
          chk(/proj/.test(after),'the live line dropped the projection it is read against: '+after);
          chk(!/projected$/.test(after.trim()),'the row still says only projected');
          chk(boxCalls===1,'the modal fetched '+boxCalls+' box scores for one game, not 1');
          chk(/12, /.test(d.querySelector('#gameView .card').textContent)
              ||/19/.test(d.querySelector('#gameView .card').textContent),
            'the live score did not reach the status card');
          /* and none of it settles anything */
          chk(!(S.actuals&&S.actuals[String(g3.w)]&&S.actuals[String(g3.w)][who.pl.id]),
            'a live box score was written into S.actuals');
          chk(!/"clock"/.test(JSON.stringify(S)),'the scoreboard reached the saved state');
          /* an ungraded game must not claim stats its week happens to hold for another game */
          chk(!/did not play/.test(d.getElementById('gameView').textContent),
            'a game still being played says a player did not play');
          d.getElementById('backBtn').click();
        }
        console.log('T3. game modal: '+(g3?'live box score on the button, one call, nothing settled':'no game in progress to drive'));
      }
      w.fetch=realFetch;
      console.log(`T2. games tab scores: button present, no timed picker, off, ${wk==null?'no live game this week to drive':'score and clock on the card, one scoreboard call, no box scores'}`); }

    /* ---- U. the betting model's parlays, read across from its key ---- */
    { const bp=F('bettingParlays');
      const blob=JSON.stringify({bank:{build:[
        {id:'b1',week:2,type:'parlay',stake:25,legs:[
          {game_id:'2026_02_CAR_ATL',away:'CAR',home:'ATL',pick:'ATL',ml:-150,conf:'MED'},
          {game_id:'2026_02_KC_BUF',away:'KC',home:'BUF',pick:'KC',ml:120,conf:'HIGH'}]},
        {id:'b2',week:2,type:'single',stake:10,legs:[{game_id:'2026_02_KC_BUF',away:'KC',home:'BUF',pick:'BUF',ml:-110}]},
        {id:'b3',week:2,type:'parlay',stake:5,legs:[{game_id:'2026_02_KC_BUF',away:'KC',home:'BUF',pick:'BUF',ml:-110}]},
        {id:'b4',week:2,type:'parlay',stake:5,legs:[{pick:'ATL'},{game_id:'2026_02_KC_BUF',pick:'BUF',ml:-110}]}]}});
      const got=bp(blob);
      chk(got.length===1&&got[0].id==='b1','the betting parlay reader did not pick out exactly the one good parlay');
      chk(got[0].legs.length===2&&got[0].legs[0].gid==='2026_02_CAR_ATL','a betting leg lost its game id');
      chk(got[0].legs.every(l=>l.stat==='ml'&&l.grp==='TEAM'&&l.label==='To win'),'a betting leg is not shaped like a team leg');
      chk(got[0].legs[0].team==='ATL'&&got[0].legs[1].team==='KC','the picked side came through wrong');
      chk(got[0].stake===25&&got[0].priced,'stake or pricing wrong on a betting parlay');
      chk(Math.abs(got[0].dec-(F('mlToDec')(-150)*F('mlToDec')(120)))<1e-9,'the parlay price is not the legs multiplied');
      chk(Math.abs(got[0].payout-25*got[0].dec)<1e-9,'the payout does not follow the price');
      /* a single, a one-leg "parlay" and a leg with no game are all skipped, not guessed at */
      chk(!got.some(p=>p.id==='b2'||p.id==='b3'),'a single or a one-leg parlay was treated as a parlay');
      chk(bp('not json')  .length===0&&bp('').length===0&&bp(null).length===0,'malformed storage was not survived');
      chk(bp(JSON.stringify({bank:{}})).length===0&&bp(JSON.stringify({bank:{build:'x'}})).length===0,'a missing or wrong-typed build was not survived');
      /* the live poll must ask for those games too */
      chk(/bettingParlays\(\)/.test(String(F('liveWanted'))),'the live poll does not cover betting parlays');
      /* and none of it may reach our own state */
      chk(!(S.saved||[]).some(p=>p.id==='b1'),'a betting parlay was copied into our saved parlays');
      console.log(`U. betting parlays: ${got.length} read from a fixture, singles and malformed entries skipped`); }

    /* ---- V. reality: the page a browser builds from this payload, checked against the files the
       job downloads into raw/ and against rules that hold in any week. None is about this week's
       particulars: a lean week, a bye, week 1, a week whose report is not filed yet or a game
       already played cannot fail one. The raw comparisons run when PROPS_AUDIT_RAW=1, which
       weekly.py sets once it has downloaded raw/ for the payload it just baked (they are the same
       moment, so the two must agree); by hand they are skipped, and the rest still run. ---- */
    try{ await (async()=>{
      const NEED=process.env.PROPS_AUDIT_RAW==='1', path=require('path'), SKILL=new Set(['QB','RB','WR','TE','K','FB','HB']);
      const PAY=w.eval('PAY');   /* the page's own: section I re-booted it, so the one read at the top is an older copy */
      const SEASON=F('SEASON'), skipped=[], notPosted=[];
      /* the two files nflverse has no copy of before the season: weekly.py lists one it found not
         posted yet (a 404, with none of it published this season) in PAY.not_posted, and then it
         is not compared; V0b checks the payload holds none of it and the page says so */
      const NP=new Set(PAY.not_posted||[]), KIND={[`pw_${SEASON}.csv`]:'stats',[`injuries_${SEASON}.csv`]:'injuries'};
      const raw=f=>{ if(!NEED){ skipped.push(f); return null; } const p=path.join(__dirname,'..','raw',f);
        if(KIND[f]&&NP.has(KIND[f])){ notPosted.push(f); chk(!fs.existsSync(p),`raw/${f} is in the payload's not_posted, yet the job downloaded it`); return null; }
        if(!fs.existsSync(p)){ chk(false,`raw/${f} is missing: the job downloads it before the audit runs`); return null; }
        return Papa.parse(fs.readFileSync(p,'utf8'),{header:true,skipEmptyLines:true}).data; };
      const dataCsv=f=>{ const p=path.join(__dirname,'..','data',f); return fs.existsSync(p)?Papa.parse(fs.readFileSync(p,'utf8'),{header:true,skipEmptyLines:true}).data:null; };
      const rRoster=raw(`roster_${SEASON}.csv`), rInj=raw(`injuries_${SEASON}.csv`), rStats=raw(`pw_${SEASON}.csv`), rGames=raw('games.csv');
      /* the page exactly as a browser builds it on a first visit */
      w.eval('S=freshState(); NORM=null; INJ={}; RSTAT={}; GAME_TIER_CACHE={}');
      w.eval('applyBaked()'); const SV=w.eval('S');
      /* a book's name against a player's, the rule build/names.py matches with, closest first: one of
         his printed names (his full name, his football name with his surname: 'exact'), his legal
         form (his first name with his surname: 'first', which the job takes only when no printed
         name in the game is the book's), or one of them with only a short first name (Cam for
         Cameron) or a nickname from build/nicknames.json, the job's own table (Drew for Andrew), or
         a two-word one with its words swapped (James Jordan for Jordan James). alias is another
         printed name, a list of them, or {names, legal} with his legal form apart */
      const nrm=s=>String(s||'').normalize('NFKD').replace(/[^ -~]/g,'').toLowerCase().replace(/[.'`-]/g,'').replace(/\s+/g,' ').trim().replace(/\s+(jr|sr|ii|iii|iv|v)$/,'').trim();
      const NICK={}; for(const [given,nicks] of Object.entries(require('./nicknames.json'))) if(!given.startsWith('_')) for(const n of nicks){ (NICK[given]??=new Set()).add(n); (NICK[n]??=new Set()).add(given); }
      const shortForm=(a,b)=>{ if(!a||!b) return false; const [lo,hi]=a.length<=b.length?[a,b]:[b,a]; let c=0; while(c<a.length&&c<b.length&&a[c]===b[c]) c++; return (lo.length>=3&&hi.startsWith(lo))||c>=4||!!(NICK[a]&&NICK[a].has(b)); };
      const nameRule=(book,full,alias)=>{ const b=nrm(book); if(!b) return null;
        const al=alias&&typeof alias==='object'&&!Array.isArray(alias)?alias:{names:[alias].flat()};
        const pr=[full,...(al.names||[])].filter(Boolean).map(nrm).filter(Boolean), lg=nrm(al.legal);
        if(pr.includes(b)) return 'exact'; if(lg&&b===lg) return 'first';
        const bp=b.split(' '); if(bp.length<2) return null; const sp=[...pr,lg].filter(Boolean).map(f=>f.split(' '));
        if(sp.some(pp=>pp.length>=2&&bp.slice(1).join(' ')===pp.slice(1).join(' ')&&shortForm(bp[0],pp[0]))) return 'short';
        return bp.length===2&&sp.some(pp=>pp.length===2&&pp[0]===bp[1]&&pp[1]===bp[0])?'swapped':null; };
      chk(nameRule('Cam Ward','Cameron Ward')&&nameRule('Kenny Gainwell','Kenneth Gainwell')&&nameRule('A.J. Brown','AJ Brown')==='exact'&&!nameRule('Jalon Daniels','Jayden Daniels')&&!nameRule('Jeremiyah Love','Jordan Love')&&!nameRule('Kevin Coleman Jr.','Keon Coleman')&&!nameRule('Brian Robinson Jr.','Bijan Robinson'),'the name rule lets a different player through, or stops a short name');
      chk(nameRule('Drew Ogletree','Andrew Ogletree')==='short'&&nameRule('Zonovan Knight','Bam Knight',{legal:'Zonovan Knight'})==='first'&&nameRule('Michael Thomas','Mike Thomas',{legal:'Michael Thomas'})==='first'&&nameRule('Mike Thomas','Michael Thomas')==='short'&&nameRule('James Jordan','Jordan James')==='swapped'&&!nameRule('Zonovan Knight','Bam Knight')&&!nameRule('Rick Henry','Derrick Henry')&&!nameRule('Ian Thomas','Brian Thomas')&&!nameRule('Drew Jordan','Andrew James')&&!nameRule('James Jordan Smith','Jordan James Smith')&&!nameRule('Andrew Ogletree','Drew Sample'),'the name rule\'s other names, nicknames or swapped names let a different player through, or stop his own');
      const R=PAY.roster||null, rawRo={}; for(const r of (rRoster||[])) if(r.gsis_id) rawRo[r.gsis_id]=r;
      /* his other names: the downloaded roster's where the job has it (the same rule as names.py's
         names_of), else the ones the payload's roster entry carries after the week (his football
         name with his surname, or null, then his legal form) */
      const fbName=r=>r.football_name&&r.football_name!==r.first_name?`${r.football_name} ${r.last_name}`:null;
      const who=pid=>{ const e=R&&R[pid], r=rawRo[pid], p=SV.players[pid];
        return {name:(e&&e[2])||(r&&r.full_name)||(p&&p.n)||'', alias:{names:r?[fbName(r)].filter(Boolean):(e&&e[4]?[e[4]]:[]),
                legal:r?(r.first_name&&r.last_name?`${r.first_name} ${r.last_name}`:null):((e&&e[5])||null)}}; };
      const rstat=pid=>{ const e=R&&R[pid]; if(e) return {st:e[1],wk:+e[3]}; const r=rawRo[pid]; return r?{st:r.status,wk:+r.week}:null; };
      const cw=F('currentWeek')(), openG=SV.sched.filter(g=>+g.w===cw&&!F('gameStarted')(g));
      const gOf=id=>SV.sched.find(g=>g.id===id), gamesInWeek=wk=>SV.sched.filter(g=>+g.w===+wk).map(g=>g.id);
      /* who will not play by the sources' own word, worked out here from the roster and the report and
         never from the page's reading of them: V1 adds the released and this week's inactive, V5 the
         held out after their club's last report, and V6 holds every suggested leg and candidate to it,
         blocking, while V1's, V4's and V5's checks of who the page lists are warnings */
      const NOPLAY=new Map();

      /* V0. one season, one week: the payload is for the page's SEASON and the schedule's week */
      { chk(PAY.season==null?!NEED:+PAY.season===SEASON,`the payload is for season ${PAY.season}, the page for ${SEASON}`);
        const unplayed=PAY.sched.filter(g=>!(g.hs!=null&&g.as!=null)).map(g=>+g.w);
        const wk=unplayed.length?Math.min(...unplayed):Math.max(...PAY.sched.map(g=>+g.w));
        if(PAY.week!=null) chk(+PAY.week===wk,`the payload was baked for week ${PAY.week}, its schedule says ${wk}`); else chk(!NEED,'the payload does not say which week it was baked for');
        if(PAY.season_over!=null) chk(!!PAY.season_over===!unplayed.length,'season_over does not match the schedule');
        if(rGames){ const gs=rGames.filter(r=>+r.season===SEASON&&r.game_type==='REG');
          chk(gs.length===PAY.sched.length&&gs.every(r=>!!gOf(r.game_id)),`the payload's schedule (${PAY.sched.length} games) is not games.csv's ${SEASON} regular season (${gs.length})`);
          const fin=gs.filter(r=>String(r.home_score).trim()!=='').length, pfin=PAY.sched.filter(g=>g.hs!=null).length;
          chk(pfin===fin,`the payload has ${pfin} final scores, the downloaded schedule ${fin}`); }
        console.log(`V0. season ${PAY.season} for a page built for ${SEASON}; week ${PAY.week} is the schedule's ${wk}${PAY.season_over?'; the season is over':''}`); }

      /* V0b. a file not posted yet: only the stats or the injury report (nflverse has neither
         before the season), the payload then holds none of it, and the slate says it is missing
         rather than show an empty report as a week with nobody hurt */
      { const np=[...NP];
        chk(np.every(k=>k==='stats'||k==='injuries'),`not_posted lists ${np.join(', ')}: only the stats and the injury report can be not posted yet`);
        if(NP.has('stats')) chk(!Object.values(PAY.stats||{}).some(r=>r&&r.length),'the stats are said to be not posted, yet the payload carries some');
        if(NP.has('injuries')) chk(!(PAY.injuries||[]).length,'the injury report is said to be not posted, yet the payload carries rows');
        const keep=PAY.not_posted, txt=()=>d.getElementById('gamesList').textContent, anyFinal=SV.sched.some(g=>F('gameFinal')(g));
        try{ PAY.not_posted=['injuries','stats']; F('renderSlate')();
          /* (app v130) the state alone, a line a file: "No injury report posted yet.", "No player stats posted yet." */
          const said=[...d.querySelectorAll('#gamesList .notposted > div')].map(x=>x.textContent.trim());
          chk(said[0]==='No injury report posted yet.','the slate does not say the injury report is not posted yet: '+JSON.stringify(said));
          chk(said.includes('No player stats posted yet.')===anyFinal&&said.length===(anyFinal?2:1),'the slate says the stats are not posted when no game is final, or does not say it once one is: '+JSON.stringify(said));
          PAY.not_posted=[]; F('renderSlate')();
          chk(!/posted yet/.test(txt())&&!d.querySelector('#gamesList .notposted'),'the slate says a file is not posted when the payload lists none'); }
        finally{ PAY.not_posted=keep; F('renderSlate')(); }
        console.log(`V0b. not posted yet: ${np.length?np.join(' and ')+', none of it in the payload, and the slate says so':'nothing; the slate says so only when the payload lists a file'}`); }

      /* V1. who is listed: nobody on a reserve list, released, retired or inactive this week; a
         practice-squad player starts only with a chart place or a game in the two weeks before */
      { let listed=0; const bad=[], dev=[];
        /* the raw file's latest week, and the clubs with rows in it: a row left behind at an older
           week by a club that has moved on is a released player */
        const LW=Math.max(0,...(rRoster||[]).map(r=>+r.week||0)), filed=new Set((rRoster||[]).filter(r=>+r.week===LW).map(r=>r.team));
        const stale=pid=>{ const r=rawRo[pid]; return !!r&&(r.status==='ACT'||r.status==='DEV')&&+r.week<LW&&filed.has(r.team); };
        for(const g of openG){ const r=F('rosterFor')(g,true);
          for(const t in r) for(const x of r[t].players){ listed++; const s=rstat(x.pl.id);
            if(s&&s.st!=='ACT'&&s.st!=='DEV'&&!(s.st==='INA'&&s.wk!==cw)) bad.push(`${g.id} ${x.pl.n} ${s.st}`);
            if(stale(x.pl.id)) bad.push(`${g.id} ${x.pl.n} released (roster row from week ${rawRo[x.pl.id].week})`);
            if(x.starter&&s&&s.st==='DEV'&&x.rank==null&&![cw-1,cw-2].some(k=>F('actualFor')(k,x.pl.id))) dev.push(`${g.id} ${x.pl.n}`); } }
        W.starters(!bad.length,`players the roster has on a reserve list, released or inactive are on this week's pages: ${bad.length} (${bad.slice(0,5).join('; ')})`);
        /* for V6: released (a row left at an older week, in the download or the payload's table, by a
           club that has rows in the latest), inactive this week, and on no roster in a whole-league table */
        for(const pid in rawRo) if(stale(pid)) NOPLAY.set(pid,`released (roster row from week ${rawRo[pid].week})`);
        if(R){ const LWp=Math.max(0,...Object.values(R).map(e=>+(e&&e[3])||0)), filedP=new Set(Object.values(R).filter(e=>e&&+e[3]===LWp).map(e=>e[0]));
          for(const [id,e] of Object.entries(R)){ if(!e) continue;
            if((e[1]==='ACT'||e[1]==='DEV')&&LWp&&+e[3]<LWp&&filedP.has(e[0])) NOPLAY.set(id,`released (roster row from week ${e[3]})`);
            if(e[1]==='INA'&&+e[3]===cw) NOPLAY.set(id,'inactive this week'); }
          if(Object.keys(R).length>800) for(const id in SV.players) if(!R[id]) NOPLAY.set(id,'on no roster'); }
        W.starters(!dev.length,`practice-squad players with no chart place and no recent game start: ${dev.slice(0,5).join('; ')}`);
        if(rRoster){ let diff=0, n=0;
          for(const r of rRoster){ if(!r.gsis_id||!SKILL.has(String(r.position).toUpperCase())) continue; n++; const e=R&&R[r.gsis_id]; if(!e||e[0]!==r.team||e[1]!==r.status) diff++; }
          chk(diff===0,`${diff} of ${n} skill players' team or status in the payload differ from the downloaded roster`);
          /* the page rules a player out as "on no roster" when the payload's table lacks him, so it
             must hold everyone the page has who is on a roster, whatever position the roster gives */
          const lacks=Object.values(SV.players).filter(p=>rawRo[p.id]&&!(R&&R[p.id])).map(p=>`${p.n} (${rawRo[p.id].position})`);
          chk(!lacks.length,`${lacks.length} players on the page and on the downloaded roster are not in the payload's roster table, so they read "on no roster": ${lacks.slice(0,4).join(', ')}`); }
        /* the rule on any week: a starter put on a reserve list leaves the page, and the same man on
           the practice squad with no chart place and no recent game is no starter */
        const g0=openG[0]||SV.sched[SV.sched.length-1], t0=g0.h, st=F('rosterFor')(g0,false)[t0].players.find(x=>x.starter&&x.pl.grp!=='K');
        if(st){ const id=st.pl.id, fake=Object.assign({},PAY.roster||{});
          fake[id]=[t0,'RES',st.pl.n,cw]; F('applyRoster')(fake);
          const r1=F('rosterFor')(g0,false)[t0];
          chk(!F('rosterFor')(g0,true)[t0].players.some(x=>x.pl.id===id),`a starter put on a reserve list (${st.pl.n}) is still on his game's page`);
          const gap=r1.gaps.find(x=>x.id===id); chk(!gap||/^ruled out \(on a reserve list\)/.test(gap.why),`a starter on a reserve list reads "${gap&&gap.why}"`);
          fake[id]=[t0,'DEV',st.pl.n,cw]; F('applyRoster')(fake);
          const dep=PAY.depth&&PAY.depth[id], a1=SV.actuals[String(cw-1)]&&SV.actuals[String(cw-1)][id], a2=SV.actuals[String(cw-2)]&&SV.actuals[String(cw-2)][id];
          if(dep) delete PAY.depth[id]; if(a1) delete SV.actuals[String(cw-1)][id]; if(a2) delete SV.actuals[String(cw-2)][id];
          try{ chk(!F('rosterFor')(g0,false)[t0].players.some(x=>x.pl.id===id),`a practice-squad player with no chart place and no recent game (${st.pl.n}) starts`); }
          finally{ if(dep) PAY.depth[id]=dep; if(a1) SV.actuals[String(cw-1)][id]=a1; if(a2) SV.actuals[String(cw-2)][id]=a2; F('applyRoster')(PAY.roster); } }
        console.log(`V1. roster status: ${listed} listed on ${openG.length} games still to play, none on a reserve list or released; ${R?Object.keys(R).length:0} statuses${rRoster?', equal to the downloaded roster':''}; a reserve-list starter and an unelevated practice-squad player both leave the starters`); }

      /* V2. every main line on the page is the book's line for that player: its name is his, its
         game is his, and the book's own file agrees */
      { let n=0, named=0; const bad=[];
        for(const wk in (PAY.mkt||{})){ const lines=dataCsv(`wk${wk}_lines.csv`);
          for(const pid in PAY.mkt[wk]) for(const st in PAY.mkt[wk][pid]){ const L=PAY.mkt[wk][pid][st]; n++; const p=who(pid);
            if(L.n!=null||PAY.mkt_v>=2){ named++;
              const g=L.g?gOf(L.g):null, act=SV.actuals[wk]&&SV.actuals[wk][pid];
              const team=act?act.team:(+wk>=cw?((R&&R[pid]&&R[pid][0])||(SV.players[pid]&&SV.players[pid].team)):null);
              if(!L.n||!nameRule(L.n,p.name,p.alias)) bad.push(`wk${wk} ${p.name||pid} ${st} carries ${L.n||'no'} book name`);
              else if(L.g&&(!g||+g.w!==+wk||(team&&g.a!==team&&g.h!==team))) bad.push(`wk${wk} ${p.name} ${st}: ${L.g} is not his game`); }
            if(lines){ const rows=lines.filter(r=>r.stat===st&&+r.line===+L.line&&+r.over===+L.over&&+r.under===+L.under);
              if(rows.length&&!rows.some(r=>nameRule(r.player,p.name,p.alias))) bad.push(`wk${wk} ${p.name||pid} ${st} ${L.line} is ${[...new Set(rows.map(r=>r.player))].join('/')}'s line in wk${wk}_lines.csv`); } } }
        chk(!bad.length,`main lines on the wrong player: ${bad.length} (${bad.slice(0,4).join('; ')})`);
        chk(!NEED||PAY.mkt_v>=2,'the job baked main lines that do not carry the book\'s name and game');
        console.log(`V2. main lines: ${n} checked against the book's own files, ${named} carry the book's name and game, ${bad.length} on the wrong player`); }

      /* V3. prices: every row the job placed on a player reaches the page, under that player, and a
         row on a game still to play that no player took is reported, never dropped quietly */
      { let rows=0, expect=0, landed=0; const bad=[], foreign=[];
        const mk=F('marketKey');
        for(const wk in (PAY.prices||{})) for(const r of PAY.prices[wk]){ rows++; const g=gOf(r.game_id);
          if(!g||+g.w!==+wk) foreign.push(`wk${wk} ${r.player} (${r.game_id})`);
          if(r.pid){ const p=who(r.pid); if(!nameRule(r.player,p.name,p.alias)) bad.push(`${r.player} placed on ${p.name||r.pid}`);
            const o=parseFloat(r.odds), k=parseFloat(r.threshold), m=mk(r.market);
            if(g&&m&&isFinite(o)&&o!==0&&isFinite(k)){ expect++; const v=SV.odds[g.id]&&SV.odds[g.id][r.pid]&&SV.odds[g.id][r.pid][m]; if(v&&v[String(k)]!=null) landed++; } }
          else if(PAY.mkt_v>=2&&g&&!F('gameStarted')(g)&&!/(d\/st|defen[cs]e)$/i.test(String(r.player).trim())&&!(PAY.unmatched||[]).some(u=>u.startsWith(r.player+' (')))
            bad.push(`${r.player} (${r.game_id}) is on no player and not reported`); }
        chk(!bad.length,`price rows: ${bad.length} wrong or unreported (${bad.slice(0,4).join('; ')})`);
        chk(landed===expect,`${expect-landed} of ${expect} price rows placed on a player never reached the page`);
        chk(!foreign.length,`${foreign.length} price rows are for a game not in their week of this season's schedule (${foreign.slice(0,4).join('; ')}): last season's files at a rollover?`);
        /* the rule on any week: a row naming a game the week does not have (last season's game of
           the same week, at a rollover) is dropped, never matched by name onto this week's game */
        const g=openG[0]||SV.sched.find(x=>+x.w===cw), x=g&&Object.values(F('rosterFor')(g,true)).flatMap(t=>t.players).find(x=>x.pl.grp!=='K');
        if(x){ const other=g.id.replace(/^\d{4}/,String(SEASON-1)), wk=+g.w;
          try{ F('ingestOdds')([{game_id:other,player:x.pl.n,market:'receptions',threshold:'3',odds:'-150'},{game_id:other,player:x.pl.n,pid:x.pl.id,market:'receptions',threshold:'4',odds:'+150'}],wk);
            chk(!Object.keys(SV.odds).some(id=>gamesInWeek(wk).includes(id)&&SV.odds[id]&&SV.odds[id][x.pl.id]),`a price row for ${other} was put on this season's ${g.id}`); }
          finally{ F('ingestOdds')((PAY.prices||{})[String(wk)]||[],wk); } }
        console.log(`V3. prices: ${rows} rows, all of this season's games, ${expect} placed on a player and all ${landed} on the page; a row for another season's game is not shown`); }

      /* V4. a ruled-out player is never "not enough games played", and the man the chart moves up
         starts however few games he has */
      { let n=0; const bad=[];
        for(const g of SV.sched.filter(x=>+x.w===cw)){ const r=F('rosterFor')(g,false);
          for(const t in r) for(const gp of r[t].gaps){ n++; const off=gp.id&&SV.inactive[gp.id];
            if(off&&!/^ruled out/.test(gp.why)) bad.push(`${gp.name} (${gp.slot}): ${gp.why}`);
            if(!off&&/^ruled out/.test(gp.why)) bad.push(`${gp.name} is not out but reads "${gp.why}"`); } }
        W.starters(!bad.length,`gap notes that misstate why a player is not shown: ${bad.slice(0,4).join('; ')}`);
        const D=PAY.depth||{}; let tried=0, ok=0, noHist=0;
        for(const team of new Set(Object.values(D).map(d=>d[0]))){
          const q=rk=>Object.keys(D).find(id=>D[id][0]===team&&D[id][1]==='QB'&&D[id][2]===rk&&SV.players[id]&&SV.players[id].team===team&&!SV.inactive[id]);
          const one=q(1), two=q(2), g=SV.sched.find(x=>+x.w===cw&&(x.a===team||x.h===team))||SV.sched.find(x=>x.a===team||x.h===team);
          if(!one||!two||!g) continue;
          tried++; const P2=SV.players[two], keep=[P2.gp,P2.base_gp]; P2.gp=1; P2.base_gp=0;
          SV.inactive[one]={week:cw,status:'Out',inj:'Thumb'};
          try{ const r=F('rosterFor')(g,false)[team], qb=r.players.filter(x=>x.pl.grp==='QB'&&x.starter), gap=r.gaps.find(x=>x.id===one);
            /* a QB2 whose games give the model no workload (Stetson Bennett, LA, week 6 of 2026: one
               relief appearance) used to leave the slot to nobody; since app v104 he starts, with no
               lines (nothingToProject) */
            const use2=F('usage')(P2,g.a===team?g.h:g.a,F('gameCtx')(g,team));
            if(qb.length===1&&qb[0].pl.id===two&&gap&&gap.why==='ruled out, thumb'&&(use2>0||!F('statLines')(qb[0]).length)){ ok++; if(!(use2>0)) noHist++; }
            else W.starters(false,`${team}: QB1 ruled out and a one-game QB2: the starter shown is ${qb.map(x=>x.pl.n).join(', ')||'nobody'}, and QB1 reads "${gap?gap.why:'nothing'}"`);
          } finally { P2.gp=keep[0]; P2.base_gp=keep[1]; delete SV.inactive[one]; }
          if(tried>=4) break; }
        W.coverage(tried>0,'no team on the chart has a QB1 and a QB2 to test the next man up with');
        console.log(`V4. ruled out: ${n} gap notes this week, each giving the real reason; ${ok} of ${tried} teams start a one-game QB2 when QB1 is ruled out${noHist?` (${noHist} of them a QB2 the model projects to no use, started with no lines)`:''}`); }

      /* V5. the injury report: the payload carries the downloaded one, its Outs leave the page, its
         Questionables wear a Q; and the rules, on a made-up report for a real team */
      { let msg='';
        if(rInj){ const isReg=r=>+r.season===SEASON&&String(r.game_type||r.season_type||'REG')==='REG';
          const cur=rInj.filter(r=>isReg(r)&&+r.week===+PAY.week), pc=(PAY.injuries||[]).filter(r=>+r.week===+PAY.week).length;
          chk(pc===cur.length,`the payload has ${pc} injury rows for week ${PAY.week}, the downloaded report ${cur.length}`);
          /* who the roster has inactive for his club's last game (status INA, or an active row with
             nflverse's inactive code I01 or I02): the payload's ina, and every earlier report row of
             theirs is carried beside the earlier Outs, so the page can tell one was on the report */
          const rIna=new Set((rRoster||[]).filter(r=>r.gsis_id&&SKILL.has(String(r.position).toUpperCase())&&(r.status==='INA'||String(r.status_description_abbr||'').startsWith('I'))).map(r=>r.gsis_id));
          if(rRoster){ const pIna=new Set(PAY.ina||[]);
            chk(pIna.size===rIna.size&&[...rIna].every(id=>pIna.has(id)),`the payload's ina (${pIna.size}) is not the downloaded roster's inactive (${rIna.size})`); }
          const past=rInj.filter(r=>isReg(r)&&+r.week<+PAY.week&&SKILL.has(String(r.position).toUpperCase())&&(['Out','Doubtful'].includes(r.report_status)||rIna.has(r.gsis_id))).length;
          const ppast=(PAY.injuries||[]).filter(r=>+r.week<+PAY.week).length;
          chk(ppast===past,`the payload has ${ppast} earlier Outs and rows of the inactive, the downloaded report ${past}`);
          const miss=[], listed=[];
          if(+PAY.week===cw){
            for(const r of cur){ const id=r.gsis_id, st=r.report_status; if(!SV.players[id]) continue;
              if((st==='Out'||st==='Doubtful')&&!SV.inactive[id]) miss.push(`${r.full_name} ${st}`);
              if(st==='Questionable'&&!SV.inactive[id]&&(F('injTag')(id)||{}).k!=='q') miss.push(`${r.full_name} Questionable without a Q`); }
            const out=new Set(cur.filter(r=>r.report_status==='Out'||r.report_status==='Doubtful').map(r=>r.gsis_id));
            for(const g of openG){ const ro=F('rosterFor')(g,true); for(const t in ro) for(const x of ro[t].players) if(out.has(x.pl.id)) listed.push(`${g.id} ${x.pl.n}`); } }
          W.starters(!miss.length,`the report is not on the page: ${miss.slice(0,5).join('; ')}`);
          W.starters(!listed.length,`players ruled out are on this week's pages: ${listed.slice(0,5).join('; ')}`);
          msg=`${pc} rows for week ${PAY.week} and ${ppast} earlier Outs and rows of the ${rIna.size} inactive, as downloaded; every Out off the page, every Questionable tagged; `; }
        /* inactive after being on his club's last report (the Elo build's WHO PLAYS rule, app v104),
           worked out here from the payload alone: on the report of his club's last game in any
           status, with no stat line in it, and his club with no game status filed this week, he is
           held out (pending) until he practises or the club files a report he is not on; and he is
           on no page this week. Caleb Williams, Chicago, week 6 of 2026, was the case */
        { const R=PAY.roster||{}, I=PAY.injuries||[], held=[], wrong=[];
          const lastWk=t=>{ let p=null; for(const g of SV.sched) if((g.a===t||g.h===t)&&+g.w<cw&&(p==null||+g.w>p)) p=+g.w; return p; };
          for(const id of (PAY.ina||[])){ const t=R[id]&&R[id][0]; if(!t||!SV.players[id]) continue; const pw=lastWk(t); if(pw==null) continue;
            const was=I.find(r=>r.gsis_id===id&&+r.week===pw&&r.team===t), mine=I.filter(r=>+r.week===cw&&r.team===t), row=mine.find(r=>r.gsis_id===id);
            if(!was||(SV.actuals[String(pw)]&&SV.actuals[String(pw)][id])) continue;
            if(mine.some(r=>String(r.report_status||'').trim())) continue;             /* his club's statuses are filed: the report rules */
            const out=!mine.length||(row&&/did not/i.test(String(row.practice_status||'')));
            const rec=SV.inactive[id];
            if(out){ held.push(id); NOPLAY.set(id,`inactive in week ${pw} after being on its report, not cleared`); if(!rec) wrong.push(`${SV.players[id].n} (${t}): inactive in week ${pw} after being on its report, and not held out`);
              else if(rec.status==='Pending'&&!['Out','Doubtful'].includes(was.report_status)&&!/\(inactive last game, /.test(F('inactiveWhy')(rec))) wrong.push(`${SV.players[id].n} reads "${F('inactiveWhy')(rec)}"`); }
            else if(rec&&rec.status==='Pending') wrong.push(`${SV.players[id].n} (${t}): cleared by this week's report, yet held out`); }
          const shown=[]; for(const g of openG){ const ro=F('rosterFor')(g,true); for(const t in ro) for(const x of ro[t].players) if(held.includes(x.pl.id)) shown.push(`${g.id} ${x.pl.n}`); }
          W.starters(!wrong.length,`the inactive rule: ${wrong.slice(0,4).join('; ')}`);
          W.starters(!shown.length,`players held out as inactive after their club's last report are on this week's pages: ${shown.slice(0,4).join('; ')}`);
          msg+=`${held.length} held out as inactive after their club's last report (${held.map(id=>SV.players[id].n).slice(0,4).join(', ')||'none this week'}); `; }
        /* the rules: out in his team's last game and no word yet is pending (treated as out); not on
           his team's report once it is filed, or with a final report that gives him no status, he is
           cleared; Questionable wears a Q, practised or not (app v120: until then Questionable with no
           practice was out) and, like a player who did not practise, stays out of the suggestions;
           limited practice is only a tag */
        const g2=SV.sched.find(g=>+g.w>=2&&F('prevTeamWeek')(g.h,+g.w)!=null);
        if(g2){ const T=g2.h, W=+g2.w, PW=F('prevTeamWeek')(T,W), row=(id,wk,st,pr)=>({season:SEASON,week:wk,gsis_id:id,team:T,report_status:st||'',practice_status:pr||'',injury:'Knee'});
          const ii=F('ingestInjuries'), inact=()=>w.eval('S').inactive, tag=id=>(w.eval('INJ')[id]||{}).k||null, sug=F('suggestable');
          /* V11-V15 the roster has inactive for the last game (ina): V11, V14 and V15 were on its report
             (Questionable), V12 was not (a healthy scratch), V13 was and has a stat line in it */
          const keepIna=PAY.ina; PAY.ina=[...(keepIna||[]),'V11','V12','V13','V14','V15'];
          const base=[row('V1',PW,'Out'),row('V2',PW,'Out'),row('V3',PW,'Out'),row('V8',PW,'Doubtful'),row('V10',PW,'Doubtful'),
            row('V11',PW,'Questionable','Limited Participation in Practice'),row('V13',PW,'Questionable'),row('V14',PW,'Questionable'),row('V15',PW,'Questionable')];
          const A=(SV.actuals[String(PW)]??={}); A.V8={team:T,receptions:2}; A.V13={team:T,receptions:1};   /* V8 was listed doubtful, and played; V13 too */
          try{ ii(base,W); }finally{ delete A.V8; delete A.V13; }
          chk(['V11','V14','V15'].every(id=>inact()[id]&&inact()[id].status==='Pending'&&/^ruled out until his status is filed \(inactive last game, /.test(F('inactiveWhy')(inact()[id]))),'inactive last game after being on its report, with no report yet, is not pending, or does not say inactive');
          chk(!inact().V12&&!inact().V13,'an inactive player the last report never named, or one with a stat line in that game, is held out');
          chk(['V1','V2','V3','V10'].every(id=>inact()[id]&&inact()[id].status==='Pending'),'out or doubtful last game with no report yet is not pending');
          chk(!inact().V8,'a player listed doubtful last game who has a stat line in it is held out as pending');
          chk(/^ruled out until his status is filed/.test(F('inactiveWhy')(inact().V1)),'a pending player does not read "ruled out until his status is filed"');
          /* filed, no game statuses yet (a Wednesday or Thursday report) */
          const filed=[...base,row('V2',W,'','Did Not Participate In Practice'),row('V3',W,'','Limited Participation in Practice'),
            row('V7',W,'','Did Not Participate In Practice'),row('V9',W,'','Full Participation in Practice'),
            row('V11',W,'','Limited Participation in Practice'),row('V14',W,'','Did Not Participate In Practice')];
          ii(filed,W);
          chk(!inact().V11&&!inact().V15&&inact().V14&&inact().V14.status==='Pending','inactive after the last report: practising, or off the filed report, does not clear him, or not practising does');
          chk(!inact().V1,'a player off his filed team report is still held out');
          chk(inact().V2&&inact().V2.status==='Pending','out last game and not practising is not pending');
          chk(!inact().V3&&tag('V3')==='lim'&&sug('V3'),'out last game and practising (limited) is held out, untagged or kept from the suggestions');
          chk(!inact().V7&&tag('V7')==='dnp'&&!sug('V7'),'did not practise with no status yet is not tagged, or is suggested');
          /* the final report: game statuses filed */
          const fin=[...filed,row('V4',W,'Questionable','Did Not Participate In Practice'),row('V5',W,'Questionable','Limited Participation in Practice'),row('V6',W,'Out','')];
          ii(fin,W);
          chk(!inact().V4&&tag('V4')==='q'&&!sug('V4')&&inact().V6,'Questionable with no practice is ruled out, untagged or suggested (app v120 lists him with a Q), or Out is not ruled out');
          chk(!inact().V5&&tag('V5')==='q'&&!sug('V5'),'Questionable is not tagged Q, or is suggested');
          chk(!inact().V2&&!tag('V7')&&sug('V7'),'a final report that gives a player no status does not clear him');
          chk(!inact().V14,'a final report that gives an inactive player no status does not clear him');
          ii([],W); chk(!Object.values(inact()).some(r=>r&&r.week!=='season'),'an empty report left someone ruled out for the week');
          /* a reserve list, the PUP list, a suspension: out on the roster's word, whatever the report */
          F('applyRoster')({...(PAY.roster||{}),V16:[T,'RES','V16',W],V17:[T,'PUP','V17',W],V18:[T,'SUS','V18',W]});
          ii(fin,W); chk(['V16','V17','V18'].every(id=>inact()[id]&&inact()[id].week==='season'&&/^ruled out/.test(F('inactiveWhy')(inact()[id]))),'a player on a reserve list, the PUP list or suspended is not held out after the report is read');
          PAY.ina=keepIna; if(keepIna===undefined) delete PAY.ina;
          ii(fin,W,true); chk(inact().V6&&!inact().V2&&!inact().V4,'a past week is not graded on its final report\'s game statuses alone');
          ii(PAY.injuries||[]); F('applyRoster')(PAY.roster); }
        console.log(`V5. injury report: ${msg}pending, cleared, Q, no-practice and limited, inactive after the last report and the roster's reserve, PUP and suspended lists each behave on a made-up report for ${g2?g2.h:'no team'}`); }

      /* V6. nobody out, pending, Questionable or missing practice is in a suggested parlay */
      { const legs=[]; let msgV6=''; for(const t of F('getPbTiers')().tiers) if(t.legs) legs.push(...t.legs);
        /* (app v111) every prime-time set's levels, as the tab shows them, and the Top 50 lines */
        for(const g of F('spGames')()){ const v=F('spShown')(g); for(const t of (v.tiers||[])) if(t&&t.legs) legs.push(...t.legs); }
        legs.push(...F('getPbTop')().rows);
        for(const g of openG){ const T=F('gameTiers')(g); for(const id of ['high','med','low']) if(T[id]) legs.push(...T[id].legs); }
        const pool=[...F('pricedLegs')(undefined,true),...openG.flatMap(g=>F('gameLegPool')(g))];
        const bad=[...new Set([...legs,...pool].filter(l=>l.grp!=='TEAM'&&!F('suggestable')(l.pid)).map(l=>l.name))];
        chk(!bad.length,`suggested legs on players who may not play: ${bad.slice(0,5).join(', ')}`);
        /* and on the sources' own word, not the page's reading of them: whatever the page shows
           (V1, V4 and V5's listing checks are warnings), no suggested leg or candidate is on a player
           this week's report has Out, Doubtful or Questionable, the roster has off its active list,
           released, inactive this week or on no roster, or the inactive rule holds out (NOPLAY, from
           V1 and V5's own working of the sources) */
        { const off=new Map(NOPLAY);
          for(const r of (PAY.injuries||[])) if(+r.week===cw&&['Out','Doubtful','Questionable'].includes(String(r.report_status||'').trim())) off.set(r.gsis_id,r.report_status);
          for(const [id,e] of Object.entries(PAY.roster||{})) if(e&&e[1]&&!['ACT','DEV','INA'].includes(e[1])) off.set(id,e[1]);
          const hit=[...new Set([...legs,...pool].filter(l=>l.grp!=='TEAM'&&off.has(l.pid)).map(l=>`${l.name} (${off.get(l.pid)})`))];
          chk(!hit.length,`suggested legs on players the report or the roster has out: ${hit.slice(0,5).join(', ')}`);
          msgV6=` and none on the ${off.size} the report, the roster or the inactive rule has out (${NOPLAY.size} of them released, inactive or held, worked out from the sources)`; }
        const g=openG.find(x=>F('gameLegPool')(x).some(l=>l.grp!=='TEAM'));
        if(g){ const pid=F('gameLegPool')(g).find(l=>l.grp!=='TEAM').pid, INJ=w.eval('INJ'), keep=INJ[pid];
          INJ[pid]={k:'q',t:'Q',title:'Questionable'}; w.eval('GAME_TIER_CACHE={}');
          chk(!F('gameLegPool')(g).some(l=>l.pid===pid)&&!F('pricedLegs')([g]).some(l=>l.pid===pid),'a Questionable player stayed in a game\'s suggestions');
          if(keep) INJ[pid]=keep; else delete INJ[pid]; w.eval('GAME_TIER_CACHE={}'); }
        console.log(`V6. suggestions: ${legs.length} suggested legs and ${pool.length} candidates, none on a player who may not play${msgV6}; a Questionable tag takes a player out of the pool`); }

      /* V7. every player is on the team the roster says, whatever team his last game was for */
      { const tbl=R||(rRoster?Object.fromEntries(Object.entries(rawRo).map(([k,r])=>[k,[r.team,r.status]])):null);
        if(tbl){ const off=Object.values(SV.players).filter(p=>tbl[p.id]&&tbl[p.id][0]&&tbl[p.id][0]!==p.team).map(p=>`${p.n} ${p.team}, roster ${tbl[p.id][0]}`);
          chk(!off.length,`players on the wrong team: ${off.slice(0,5).join('; ')}`); }
        console.log(`V7. teams: ${tbl?'every player on his roster team':'no roster table to check against'}`); }

      /* V8. kickoffs in US Eastern, by the rule for any year: the page's clock against Intl's */
      { const ny=(d,t)=>{ const guess=Date.parse(`${d}T${t}:00Z`);
          const pt=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(guess)).map(p=>[p.type,p.value]));
          return guess-(Date.UTC(+pt.year,+pt.month-1,+pt.day,+pt.hour,+pt.minute)-guess); };
        const ko=F('kickoff'); const bad=[];
        const tests=[...SV.sched.map(g=>[g.d,g.t||'13:00']),...['2026-10-31','2026-11-01','2027-01-03','2027-03-13','2027-03-14','2027-09-12','2027-11-06','2027-11-07','2028-11-04','2028-11-05'].map(d=>[d,'13:00'])];
        for(const [d,t] of tests){ const k=ko({d,t}); if(!k||k.getTime()!==ny(d,t)) bad.push(`${d} ${t}`); }
        chk(!bad.length,`kickoffs an hour out: ${bad.slice(0,5).join(', ')}`);
        console.log(`V8. kickoffs: ${tests.length} dates, this season's games and 2027-28's clock changes, all on US Eastern`); }

      /* V9. a player with no stat line once his game's stats are in, by who played (PAY.snaps, planted
         here): one who took a snap is graded on zero, as DraftKings graded Tory Horton's receptions
         over 1.5 in week 5 (an over and a rung lose, an under wins); one his club's snaps leave out is
         void; with no snap counts for his club, void if the week's report had him Out, else he waits.
         And a won parlay with a void leg pays on the rest at their own prices */
      { const g=SV.sched.find(x=>SV.processedGames[x.id]&&x.hs!=null&&x.hs!==x.as);
        if(g){ const wk=String(+g.w), keepS=PAY.snaps, keepI=PAY.injuries, st=F('settleLeg');
          try{
            PAY.snaps={...(keepS||{}),[wk]:{...((keepS||{})[wk]||{}),[g.id]:{[g.h]:['00-PLAYED-NO-LINE'],[g.a]:[]}}};
            const ran={week:+g.w,gid:g.id,pid:'00-PLAYED-NO-LINE',team:g.h,stat:'receptions',k:1.5,side:'over',main:true,price:-150};
            chk(!F('actualFor')(+g.w,ran.pid)&&F('tookPart')(ran)===true,'the planted player has a stat line, or the snap counts do not say he played');
            chk(st(ran)==='loss','a player who played with no stat line does not lose his receptions over 1.5 on zero');
            chk(st({...ran,side:'under',price:120})==='win','a player who played with no stat line does not win his under on zero');
            chk(st({...ran,main:false,k:1})==='loss'&&st({...ran,stat:'any_td',main:false,k:1})==='loss'&&st({...ran,stat:'receiving_yards',k:0,side:'over'})==='push','a player who played with no stat line is not graded on zero (a rung, his touchdown, a line of 0)');
            const leg={week:+g.w,gid:g.id,pid:'00-NOT-A-PLAYER',team:g.h,stat:'receptions',k:3,side:'over',main:false,price:-110};
            chk(st(leg)==='void','a player with no snap, his club\'s snaps in, is not void');
            chk(st({...leg,team:undefined})==='void','a leg with no club on a player neither club\'s snaps have is not void');
            chk(st({...leg,gid:'not-graded-yet'})===null,'a leg whose game has no stats yet should wait');
            /* his club's snap counts not in yet */
            PAY.snaps[wk][g.id]={[g.h]:[]};
            const unk={...leg,pid:'00-NO-WORD-YET',team:g.a};
            chk(st(unk)===null&&st({...unk,team:undefined})===null,'a player with no stat line and no snap counts for his club does not wait');
            PAY.injuries=[...(keepI||[]),{season:String(SEASON),week:wk,gsis_id:'00-NO-WORD-YET',team:g.a,report_status:'Doubtful',practice_status:'',injury:''}];
            chk(st(unk)===null,'a player Doubtful, no stat line and no snap counts for his club, does not wait');
            PAY.injuries=[...(keepI||[]),{season:String(SEASON),week:wk,gsis_id:'00-NO-WORD-YET',team:g.a,report_status:'Out',practice_status:'',injury:'Knee'}];
            chk(st(unk)==='void','a player Out on the week\'s report, no stat line and no snap counts for his club, is not void');
            chk(st({...unk,week:+g.w+1})===null,'another week\'s report decided this one');
            PAY.injuries=keepI; delete PAY.snaps[wk][g.id];
            chk(st(unk)===null,'a player with no stat line in a game with no snap counts at all does not wait');
            PAY.snaps[wk][g.id]={[g.h]:['00-PLAYED-NO-LINE'],[g.a]:[]};
            const win={week:+g.w,gid:g.id,team:g.hs>g.as?g.h:g.a,stat:'ml',k:0,price:-150};
            const p={stake:10,payout:10*F('mlToDec')(-110)*F('mlToDec')(-150),legs:[leg,win]}, s=F('settleParlay')(p);
            chk(s.status==='won'&&Math.abs(F('settledReturn')(p,s)-10*F('mlToDec')(-150))<1e-9,'a won parlay with a void leg does not pay the rest at their prices');
            const pv={stake:10,payout:19,legs:[leg]}; chk(F('settleParlay')(pv).status==='void'&&F('settledReturn')(pv)===10,'an all-void parlay does not return the stake');
            chk(F('settleParlay')({stake:10,payout:30,legs:[ran,win]}).status==='lost','a parlay with a leg on a player who played with no stat line is not lost on his over');
          } finally { PAY.snaps=keepS; if(keepS===undefined) delete PAY.snaps; PAY.injuries=keepI; } }
        console.log(`V9. no stat line: ${g?'graded on zero when he took a snap, void when his club\'s snaps leave him out, else void only if Out, waiting otherwise; a void leg drops out of a parlay':'no graded game to test on'}`); }

      /* V10. nothing the job downloaded is missing from what it published: every finished game's
         stats (or, by hand, every game final four days before the bake) */
      { const have=new Set(); for(const wk in (PAY.stats||{})) for(const r of PAY.stats[wk]) have.add(String(+wk)+'|'+r.team);
        let lost=[];
        if(NP.has('stats')){ /* not posted yet: V0b holds the payload to none, and weekly.py reports a stats file still missing two days after the first game */ }
        else if(rStats){ const fin=new Set(PAY.sched.filter(g=>g.hs!=null).map(g=>g.id)), l=new Set();
          for(const r of rStats){ if(+r.season!==SEASON||r.season_type!=='REG'||!fin.has(r.game_id)||!SKILL.has(String(r.position).toUpperCase())) continue;
            if(!have.has(String(+r.week)+'|'+r.team)) l.add(`${r.game_id} ${r.team}`); }
          lost=[...l]; }
        else { const bk=Date.parse(PAY.baked_at||'');
          lost=PAY.sched.filter(g=>{ const k=F('kickoff')(g); return g.hs!=null&&isFinite(bk)&&k&&bk-k.getTime()>4*864e5&&!have.has(g.w+'|'+g.a)&&!have.has(g.w+'|'+g.h); }).map(g=>g.id); }
        chk(!lost.length,`${lost.length} finished team-games have no stats in the payload (${lost.slice(0,4).join(', ')})`);
        console.log(`V10. completeness: ${have.size} team-games of stats, ${NP.has('stats')?'the stats file is not posted yet':'none missing '+(rStats?'against the downloaded file':'among games final four days before the bake')}`); }

      /* V11. the end of the regular season is said, not left on week 18 */
      { const keep=SV.sched.map(g=>[g.hs,g.as]); SV.sched.forEach(g=>{ if(g.hs==null){ g.hs=20; g.as=17; } });
        const ws=d.getElementById('weekSel'); F('renderSlate')();
        /* (app v130) its bold line alone: no word of the model's scope under it */
        const card=[...d.querySelectorAll('#gamesList .card')].find(c=>/regular season is over/.test(c.textContent));
        chk(F('seasonOver')()&&!!card&&card.textContent.trim()===`The ${SEASON} regular season is over.`,`a season with every game final does not say it is over, in its bold line alone: "${card?card.textContent.trim():''}"`);
        SV.sched.forEach((g,i)=>{ g.hs=keep[i][0]; g.as=keep[i][1]; }); F('renderSlate')();
        chk(F('seasonOver')()===/regular season is over/.test(d.getElementById('gamesList').textContent),'the season-over note shows mid-season');
        console.log(`V11. season over: said once every game is final${ws?'':''}`); }

      /* V12. a game's lines are DraftKings' only while the pull is under a day old, and say so */
      { let dk=0, nv=0; const stale=[], bad=[]; const bk=Date.parse(PAY.baked_at||'');
        for(const g of PAY.sched){ if(g.ls==='dk'){ dk++; if(g.lat){ const k=F('kickoff')(g), ref=Math.min(isFinite(bk)?bk:w.Date.now(),k?k.getTime():Infinity);
            if(ref-Date.parse(g.lat)>24*3600e3+60e3) stale.push(g.id); } }
          else if(g.ls==='nflverse') nv++;
          if(g.ls&&!F('lineSource')(g)) bad.push(g.id); }
        const priced=PAY.sched.some(g=>g.tov!=null);      /* a payload baked before the totals carried their prices has none */
        if(rGames) for(const r of rGames){ const g=gOf(r.game_id); if(!g||g.ls!=='nflverse') continue;
          const sp=parseFloat(r.spread_line), tot=parseFloat(r.total_line), ov=parseFloat(r.over_odds), un=parseFloat(r.under_odds);
          if((isFinite(sp)&&g.sp!==sp)||(isFinite(tot)&&g.tot!==tot)) bad.push(`${g.id} says nflverse but carries ${g.sp}/${g.tot}, games.csv ${sp}/${tot}`);
          if(priced&&((isFinite(ov)&&g.tov!==ov)||(isFinite(un)&&g.tou!==un))) bad.push(`${g.id}'s total is priced ${g.tov}/${g.tou}, games.csv ${ov}/${un}`); }
        chk(!stale.length,`DraftKings lines more than a day old are on the page: ${stale.slice(0,4).join(', ')}`);
        chk(!bad.length,`line sources wrong: ${bad.slice(0,4).join('; ')}`);
        console.log(`V12. line sources: DraftKings on ${dk} games, every pull under a day old at the bake (or at its kickoff, if sooner); nflverse on ${nv}`); }

      /* V-ESPN (app v125). The published read (PAY.espn and the schedule's game lines it set), held on the payload file
         itself: every entry a game of this season still to come at the bake, of its own week, every half dated before its
         kickoff; a game's lines marked lsr 'espn' its read's by the press's own set and drop rule (ls 'dk', lat its read's
         time, under a day old at the bake); and none of the read in the paid pull's places: PAY.dk held to its own source
         (every id one a paid pull's file gives that game, so a read's id the bake took has none: dkSrcAud, dkBadAud,
         held to cases of their own), PAY.mkt and PAY.prices free of it. With PROPS_AUDIT_RAW, against this run's read
         (raw/espn/read.json, written by espn_read.js) where the payload carries it (the same read_at): each game the read
         found ok its player block exactly, cleaned by the page's rules (the audit's own copy), a 'none' dropping it (one
         dated at or after the kickoff dropped itself, as apply_espn drops it), the game lines as read, anything else
         carried from an earlier read; and who each line is on: an athlete placed by id on the player the payload's ESPN ids (and the roster's)
         name, one placed by name on a player of one of the game's two clubs whose roster name the audit's own name rule
         passes or whose surname is ESPN's (blocking), a surname alone a warning (W.espnName). */
      { const PD=JSON.parse(fs.readFileSync(PAYLOAD_FILE,'utf8')), E=PD.espn, bk=Date.parse(PD.baked_at||''), bad=[], said=[];
        const gP=id=>(PD.sched||[]).find(g=>g.id===id), ko=g=>{ const k=F('kickoff')(g); return k?k.getTime():NaN; };
        const t=s=>typeof s==='string'?Date.parse(s):NaN, keepLineA=x=>typeof x==='number'&&isFinite(x)&&x>0&&x<=1000&&Number.isInteger(x*2);
        const STATS=new Set([...Object.values(ESPN.TYPES.main),...Object.values(ESPN.TYPES.mile)]), PIDRE=/^(?!__proto__$)[A-Za-z0-9_.:\-]{1,40}$/;
        /* a block as the page cleans one (espnKeptGame's rules), worked here */
        const cleanA=b=>{ const lines={}, rungs={}, td=[];
          for(const pid of Object.keys(b&&b.lines||{})){ const m=b.lines[pid]; if(!PIDRE.test(pid)||!m||typeof m!=='object') continue; const s={}; for(const st of Object.keys(m)) if(STATS.has(st)&&keepLineA(m[st])) s[st]=m[st]; if(Object.keys(s).length) lines[pid]=s; }
          for(const pid of Object.keys(b&&b.rungs||{})){ const m=b.rungs[pid]; if(!PIDRE.test(pid)||!m||typeof m!=='object') continue; const s={}; for(const st of Object.keys(m)) if(STATS.has(st)&&Array.isArray(m[st])){ const r=[...new Set(m[st].filter(keepLineA))].sort((x,y)=>x-y).slice(0,40); if(r.length) s[st]=r; } if(Object.keys(s).length) rungs[pid]=s; }
          for(const pid of (Array.isArray(b&&b.td)?b.td:[])) if(typeof pid==='string'&&PIDRE.test(pid)&&!td.includes(pid)) td.push(pid);
          return {at:b&&b.at,lines,rungs,td:td.sort()}; };
        const canonA=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(j=>[j,x[j]])):x);
        let nE=0, nL=0;
        if(E!=null){
          if(!(E&&typeof E==='object'&&E.v===1&&E.games&&typeof E.games==='object'&&!Array.isArray(E.games))) bad.push(`PAY.espn is not {v:1, games}: ${JSON.stringify(E).slice(0,120)}`);
          else for(const [gid,e] of Object.entries(E.games)){ nE++; const g=gP(gid), k=g?ko(g):NaN;
            if(!g){ bad.push(`${gid} is in PAY.espn and not on the schedule`); continue; }
            if(String(e&&e.w)!==String(g.w)) bad.push(`${gid}'s published read is of week ${e&&e.w}, the game of week ${g.w}`);
            if(g.hs!=null||g.as!=null||(isFinite(bk)&&isFinite(k)&&k<=bk)) bad.push(`${gid} is in PAY.espn though it had kicked off or has a score at the bake`);
            for(const [h,x] of [['gl',e&&e.gl&&e.gl.at],['pl',e&&e.pl&&e.pl.at],['out',e&&e.out&&e.out.at]]) if(x!=null&&!(t(x)<k)) bad.push(`${gid}'s published ${h} is dated ${x}, not before its kickoff`);
            if(e&&e.out&&e.out.st==='none'&&e.pl) bad.push(`${gid}'s published read found no player lines and still publishes a block`); } }
        /* the schedule's game lines the read set */
        for(const g of PD.sched||[]){ if(g.lsr!=='espn') continue; nL++;
          const e=E&&E.games&&E.games[g.id], gl=e&&e.gl, L=gl&&gl.lines||null;
          if(!L){ bad.push(`${g.id}'s lines are marked read from ESPN with no published game-line read`); continue; }
          if(g.ls!=='dk'||g.lat!==gl.at||!(isFinite(bk)&&bk-t(g.lat)<24*3600e3+60e3)) bad.push(`${g.id}'s lines from ESPN are not ls 'dk' at its read's time ${gl.at} (${g.ls} ${g.lat}), or are a day old at the bake`);
          for(const kk of ['mla','mlh','sp','tot']) if(L[kk]!=null&&g[kk]!==L[kk]) bad.push(`${g.id}'s ${kk} is ${g[kk]}, its read's ${L[kk]}`);
          for(const [n,a,b] of [['sp','spa','sph'],['tot','tov','tou']]) if(L[n]!=null&&L[a]!=null&&L[b]!=null&&(g[a]!==L[a]||g[b]!==L[b])) bad.push(`${g.id}'s ${a}/${b} are ${g[a]}/${g[b]}, its read's ${L[a]}/${L[b]}`);
          if(!/read from ESPN/.test(F('lineSource')(g)||'')) bad.push(`${g.id}'s lines from ESPN are said to be "${F('lineSource')(g)}"`); }
        /* none of the read in the paid pull's places. PAY.dk is held to its own source, not to the read: the bake
           (weekly.py's dk_ids) takes every id from a paid pull's file, props/data/dk_links_wk<W>.json, and a paid sid is
           the very DraftKings id ESPN's bet links carry (a pull by hand, or Thursday 22 October's, the last scheduled one,
           gives a game's moneyline, spread and total the ids the read finds), so an id equal to one of the read's is no
           fault (until the review of 21 October 2026 this refused every run while such a pull's game was still to come).
           Each value but at and glat must be one that game's entries in those files carry: under a game line or the event,
           the id its own key gives (`<gid>|game|ml|home|` is team:<home>|ml, `|spread|away|7.5` team:<away>|ats|7.5,
           `|total|Over|43.5` game|total|over|43.5, `<gid>|event` event, each number as the page writes one); under a
           player's key, one of the game's player entries (which player a book name is placed on is the bake's name rule,
           held by test_dk_links.py). A read's id the bake took has no such source, and neither has anything else; each
           entry is filed under its game's week, a game on the schedule */
        { const dkPtA=x=>{ const v=Number(x); return isFinite(v)?String(v):null; };
          const dkSrcAud=dir=>{ const by={}, files=[]; let list=[]; try{ list=fs.readdirSync(dir).filter(f=>/^dk_links_wk\d+\.json$/.test(f)).sort(); }catch(e){}
            for(const f of list){ let L; try{ L=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')); }catch(e){ continue; } if(!L||typeof L!=='object'||Array.isArray(L)) continue; files.push(f);
              for(const [key,v] of Object.entries(L)){ const p=String(key).split('|').map(x=>x.trim()), gid=p[0], sid=v&&typeof v==='object'&&v.sid!=null?String(v.sid).trim():''; if(!gid||!sid) continue;
                const G=by[gid]||(by[gid]={game:{},player:new Set()});
                if(p.length===2&&p[1]==='event') (G.game.event||(G.game.event=new Set())).add(sid);
                else if(p.length===5&&p[1]==='game'){ const [,,st,side,pt]=p, k=st==='ml'&&(side==='away'||side==='home')?`ml|${side}`:st==='spread'&&(side==='away'||side==='home')&&dkPtA(pt)!=null&&pt?`ats|${side}|${dkPtA(pt)}`:st==='total'&&(side==='Over'||side==='Under')&&dkPtA(pt)!=null&&pt?`game|total|${side.toLowerCase()}|${dkPtA(pt)}`:null;
                  if(k) (G.game[k]||(G.game[k]=new Set())).add(sid); }
                else if(p.length===5) G.player.add(sid); } }
            return {by,files}; };
          /* the bad entries of a table dk against the sources by (dkSrcAud's) and the schedule sched */
          const dkBadAud=(dk,sched,by)=>{ const out=[]; if(dk==null) return out; if(typeof dk!=='object'||Array.isArray(dk)) return ['PAY.dk is not an object'];
            for(const [w0,W0] of Object.entries(dk)){ if(!W0||typeof W0!=='object'||Array.isArray(W0)){ out.push(`PAY.dk[${w0}] is not an object`); continue; }
              for(const [gid,D0] of Object.entries(W0)){ const g=(sched||[]).find(x=>x&&x.id===gid);
                if(!g){ out.push(`PAY.dk[${w0}] has ${gid}, a game not on the schedule`); continue; }
                if(String(g.w)!==String(w0)) out.push(`PAY.dk files ${gid} under week ${w0}, the game of week ${g.w}`);
                const G=by[gid];
                for(const [k,v] of Object.entries(D0&&typeof D0==='object'?D0:{})){ if(k==='at'||k==='glat') continue;
                  const m=/^team:([A-Z]{2,4})\|(ml|ats)(?:\|(.+))?$/.exec(k), side=m?(m[1]===g.a?'away':m[1]===g.h?'home':null):null;
                  const want=k==='event'?'event':m?(side&&(m[2]==='ml'?(m[3]==null?`ml|${side}`:null):`ats|${side}|${m[3]}`)):/^game\|total\|(over|under)\|/.test(k)?k:null;
                  const src=want?(G&&G.game[want]):(/^(team:|game\|)/.test(k)?null:(G&&G.player));
                  if(!(src&&src.has(String(v)))) out.push(`PAY.dk's ${gid} ${k} = ${v} has no source in props/data/dk_links_wk*.json${want===null&&/^(team:|game\|)/.test(k)?' (a key the bake never writes)':''}`); } } }
            return out; };
          /* the rule on cases of its own (made-up data: blocking), then on the payload's PAY.dk against the files beside it */
          { const sch=[{id:'2099_07_AUA_AUB',w:7,a:'AUA',h:'AUB'},{id:'2099_07_AUC_AUD',w:7,a:'AUC',h:'AUD'}], G1='2099_07_AUA_AUB', G2='2099_07_AUC_AUD';
            const tmp=fs.mkdtempSync(path.join(require('os').tmpdir(),'vespn-dk-'));
            try{ fs.writeFileSync(path.join(tmp,'dk_links_wk7.json'),JSON.stringify({[`${G1}|event`]:{sid:'34118033'},[`${G1}|game|ml|home|`]:{sid:'0ML1_1'},[`${G1}|game|ml|away|`]:{sid:'0ML1_3'},
                [`${G1}|game|spread|away|3.0`]:{sid:'0HC1P300_3'},[`${G1}|game|total|Over|50.5`]:{sid:'0OU1O5050_1'},[`${G1}|Made-up Passer|passing_yards|Over|248.5`]:{sid:'0QA1#1_13L1'},[`${G2}|game|ml|home|`]:{sid:'0ML2_1'}}));
              fs.writeFileSync(path.join(tmp,'dk_links_wk8.json'),'{not json'); fs.writeFileSync(path.join(tmp,'other.json'),JSON.stringify({[`${G2}|event`]:{sid:'999'}}));
              const {by,files}=dkSrcAud(tmp), read=new Set(['0ML1_1','0ML1_3','0HC1P300_3','0OU1O5050_1','34118033','0ML9_1']);
              const paid={'7':{[G1]:{'team:AUB|ml':'0ML1_1','team:AUA|ml':'0ML1_3','team:AUA|ats|3':'0HC1P300_3','game|total|over|50.5':'0OU1O5050_1',event:'34118033','aud|passing_yards|over|248.5':'0QA1#1_13L1',at:'2099-01-01T10:17Z',glat:'2099-01-01T10:17Z'}}};
              const ok0=dkBadAud(paid,sch,by), ok1=dkBadAud({},sch,by), ok2=dkBadAud(undefined,sch,by);
              chk(files.length===1&&!ok0.length&&!ok1.length&&!ok2.length&&Object.values(paid['7'][G1]).some(v=>read.has(v)),
                `V-ESPN: a paid pull's ids equal to the read's (a pull and ESPN's bet links give the same DraftKings ids) are held as faults, or the files are not read as the bake reads them: ${JSON.stringify({files,ok0,ok1,ok2})}`);
              const cases=[['a read id with no source in the files',{'7':{[G2]:{'team:AUD|ml':'0ML9_1',glat:'x'}}}],
                ['a read id the files give another of its game\'s keys',{'7':{[G1]:{'team:AUA|ml':'0ML1_1'}}}],
                ['an id the files give another game',{'7':{[G2]:{'team:AUC|ml':'0ML1_3'}}}],
                ['a spread at another number',{'7':{[G1]:{'team:AUA|ats|3.5':'0HC1P300_3'}}}],
                ['a game line\'s id under a player\'s key',{'7':{[G1]:{'aud|receptions|over|4.5':'0ML1_1'}}}],
                ['a player\'s id under a game line\'s key',{'7':{[G1]:{'game|total|under|50.5':'0QA1#1_13L1'}}}],
                ['an event no file gives (only a file not named dk_links_wk<W>.json)',{'7':{[G2]:{event:'999'}}}],
                ['an entry under another week',{'8':{[G1]:{event:'34118033'}}}],
                ['a game not on the schedule',{'7':{'2099_07_AUE_AUF':{event:'34118033'}}}]];
              const missed=cases.filter(([,dk])=>!dkBadAud(dk,sch,by).length).map(([n])=>n);
              chk(!missed.length,`V-ESPN: PAY.dk held to its source passes ${missed.join('; ')}`); }
            finally{ try{ fs.rmSync(tmp,{recursive:true,force:true}); }catch(e){} } }
          const {by,files}=dkSrcAud(path.join(__dirname,'..','data')), srcBad=dkBadAud(PD.dk,PD.sched,by);
          for(const x of srcBad) bad.push(x+': the bake takes every id from a paid pull\'s file; a read\'s ids are the page\'s to merge');
          const nDk=Object.values(PD.dk&&typeof PD.dk==='object'?PD.dk:{}).reduce((n,W0)=>n+Object.values(W0||{}).reduce((m,D0)=>m+Object.keys(D0||{}).filter(k=>k!=='at'&&k!=='glat').length,0),0);
          said.push(`PAY.dk's ${nDk} ids held to ${files.length} paid pull file(s)${srcBad.length?`, ${srcBad.length} with no source`:''}`);
          if(/dkline|"espn"/.test(JSON.stringify(PD.mkt||{})+JSON.stringify(PD.prices||[]))) bad.push('PAY.mkt or PAY.prices carries something of the ESPN read'); }
        /* this run's read, with PROPS_AUDIT_RAW */
        const RD=(()=>{ if(!NEED){ skipped.push('espn/read.json'); return null; } const p=path.join(__dirname,'..','raw','espn','read.json'); if(!fs.existsSync(p)) return null; try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){ bad.push('raw/espn/read.json is not JSON'); return null; } })();
        let nOk=0, nNone=0, nCar=0, nId=0, nName=0, nSur=0;
        if(RD&&E&&E.games&&RD.read_at&&RD.read_at===E.read_at&&RD.games&&typeof RD.games==='object'){
          const raT=t(RD.read_at), espnIdOf=pid=>{ const r=rRoster&&rRoster.find(x=>x.gsis_id===pid); return r&&r.espn_id?String(r.espn_id):null; };
          for(const [gid,r] of Object.entries(RD.games)){ const g=gP(gid), e=E.games[gid]; if(!g||!r) continue;
            const live=g.hs==null&&!(isFinite(bk)&&ko(g)<=bk), st=r.out&&r.out.st;
            if(!live){ if(e) bad.push(`${gid} had kicked off and is published`); continue; }
            if(st==='ok'&&r.pl){ nOk++; const want=cleanA(r.pl), got=e&&e.pl;
              if(!got||canonA({...cleanA(got),at:got.at})!==canonA(want)) bad.push(`${gid}'s published player block is not this run's read cleaned by the page's rules`); }
            else if(st==='none'){ const nAt=t(r.out.at);
              /* a 'none' answered at or after the kickoff is dropped, as apply_espn drops every half dated there (the
                 page's reader calls it 'kicked' since the review of 21 October 2026, so a read has none) */
              if(isFinite(nAt)&&nAt>=ko(g)){ if(e&&e.out&&e.out.st==='none'&&e.out.at===r.out.at) bad.push(`${gid}'s read found no player lines at or after its kickoff, and the payload publishes it`); }
              else { nNone++; if(!e||(e.pl)||!e.out||e.out.st!=='none') bad.push(`${gid}'s read found no player lines, and the payload publishes ${e&&e.pl?'a block':'no none'}`); } }
            if(r.gl&&r.gl.lines&&Object.keys(r.gl.lines).length){ if(!e||!e.gl||canonA(e.gl)!==canonA({at:r.gl.at,lines:r.gl.lines,ids:r.gl.ids,event:r.gl.event})) bad.push(`${gid}'s published game lines are not this run's read`); }
            /* who each line is on */
            const pl=r.pl||{}, have=new Set([...Object.keys(pl.lines||{}),...Object.keys(pl.rungs||{}),...(pl.td||[])]), P=r.placed||{};
            for(const pid of have){ const x=P[pid];
              if(!x){ bad.push(`${gid}: ${pid} carries a line with no record of how he was placed`); continue; }
              if(x.how==='id'){ nId++; const ids=PD.espn_ids||{}, rid=espnIdOf(pid);
                if(ids[String(x.aid)]!==pid||(rid!=null&&rid!==String(x.aid))) bad.push(`${gid}: ESPN athlete ${x.aid} is placed on ${pid} by an id the roster gives ${rid?'as '+rid:'to another'}`); continue; }
              if(x.how!=='name'&&x.how!=='nameKey'){ bad.push(`${gid}: ${pid} placed by an unknown rule (${x.how})`); continue; }
              nName++; const team=(PD.roster&&PD.roster[pid]&&PD.roster[pid][0])||((rawRo[pid]||{}).team)||((SV.players[pid]||{}).team)||null, me=who(pid);
              if(team!==g.a&&team!==g.h) bad.push(`${gid}: ESPN's ${x.name} is placed on ${me.name||pid} of ${team}, not one of the game's clubs`);
              const sur=s=>{ const p=nrm(s).split(' '); return p[p.length-1]||''; };
              const byRule=!!nameRule(x.name,me.name,me.alias), bySur=!!x.name&&!!me.name&&sur(x.name)===sur(me.name);
              if(!byRule&&!bySur) bad.push(`${gid}: ESPN's ${x.name||'(no name)'} is placed on ${me.name||pid}, whose name neither the name rule nor the surname matches`);
              else if(!byRule){ nSur++; W.espnName(false,`${gid}: ESPN's ${x.name} is placed on ${me.name} by the surname alone (${x.how})`); } } }
          for(const [gid,e] of Object.entries(E.games)){ const r=RD.games[gid];
            const fresh=r&&((r.out&&(r.out.st==='ok'||r.out.st==='none'))||(r.gl&&r.gl.lines&&Object.keys(r.gl.lines).length));
            if(!fresh){ nCar++; for(const [h,x] of [['gl',e.gl&&e.gl.at],['pl',e.pl&&e.pl.at],['out',e.out&&e.out.at]]) if(x!=null&&!(t(x)<=raT)) bad.push(`${gid}'s carried ${h} is dated ${x}, after this run's read began`); } }
          said.push(`this run's read: ${nOk} games' blocks as read, ${nNone} none, ${nCar} carried; ${nId} players placed by id and ${nName} by name (${nSur} by the surname alone) held`); }
        else if(RD) said.push(`raw/espn/read.json is not the read this payload carries (read_at ${RD.read_at} against ${E&&E.read_at}): not compared`);
        else if(NEED) said.push('no raw/espn/read.json: this run made no read');
        chk(!bad.length,`V-ESPN: ${bad.slice(0,6).join('; ')}`);
        console.log(`V-ESPN. the published read: ${E==null?'none in the payload':`${nE} games`}, ${nL} games' lines marked read from ESPN${said.length?'; '+said.join('; '):''}`); }

      /* V13. depth charts carried forward from an older payload say how old they are */
      { const g=openG[0]||null, keep=PAY.depth_dt; let ok=null;
        if(g&&PAY.baked_at&&keep){ const txt=()=>d.getElementById('gameView').textContent;
          PAY.depth_dt=new Date(Date.parse(PAY.baked_at)-10*864e5).toISOString().slice(0,10); SV.ui.game=g.id; F('renderGame')(); const old=txt().includes(`Depth charts as of ${PAY.depth_dt} (may be out of date).`)&&!/could not be downloaded/.test(txt());
          PAY.depth_dt=keep; F('renderGame')(); const now=/Depth charts as of/.test(txt()); F('closeGame')();
          ok=old&&now===(Date.parse(PAY.baked_at)-Date.parse(keep+'T12:00:00Z')>3*864e5);
          chk(ok,'depth charts ten days old do not say so on the game page, or fresh ones do'); }
        console.log(`V13. depth charts: ${ok==null?'no game to show them on':'a chart carried forward says its date'}`); }

      /* V14. the tags a reader sees: a Q beside a Questionable player's name, and a leg in the
         builder on a player ruled out marked (until app v130 with what a book does with it) */
      { const g=openG[0]||null; let did=false;
        if(g){ const r=F('rosterFor')(g,false), x=Object.values(r).flatMap(t=>t.players).find(x=>x.starter&&x.pl.grp!=='K'&&!F('injTag')(x.pl.id)&&F('statLines')(x).some(l=>l.prob));
          if(x){ const INJ=w.eval('INJ'), keepP=JSON.stringify(SV.parlay||{});
            INJ[x.pl.id]={k:'q',t:'Q',title:'Questionable'}; SV.ui.game=g.id; SV.ui.open={}; F('renderGame')();
            const row=d.querySelector(`#gameView .plrbtn[data-open="${x.pl.id}"] .inj`);
            chk(!!row&&row.textContent==='Q','a Questionable player has no Q beside his name on the game page');
            delete INJ[x.pl.id];
            /* his anytime touchdown (until app v127 a ladder rung of his, which the builder takes no more) */
            SV.parlay={}; const tk=F('legKey')(g.id,x.pl.id,'any_td');
            F('toggleLeg')(tk,1,g,'over',false); chk(!!SV.parlay[tk],`V14: ${x.pl.n}'s anytime touchdown did not go in the builder`);
            SV.inactive[x.pl.id]={week:cw,status:'Out',inj:'Ankle'}; F('renderParlay')();
            const body=d.getElementById('parlayBody');
            chk(/not expected to play/.test(body.textContent)&&!!body.querySelector('.legrow .inj.inj-out'),'a builder leg on a player ruled out is not marked');
            /* (app v130, the owner's call of 22 October 2026: no descriptions) the state alone, "Bo Nix is not expected to
               play (Out).", with no word of what a book does with the leg */
            W.wording([...body.querySelectorAll('p.delta.down')].some(p=>/^.+ is not expected to play \([^)]+\)\.$/.test(p.textContent))&&!/A book voids a leg|take it off to see what the rest pay/.test(body.textContent),
              'V14: the builder\'s line on a player ruled out is not the state alone: '+([...body.querySelectorAll('p.delta.down')].map(p=>p.textContent).find(t=>/not expected to play/.test(t))||'none'));
            delete SV.inactive[x.pl.id]; SV.parlay=JSON.parse(keepP); F('closeGame')(); F('renderParlay')(); did=true; } }
        console.log(`V14. tags: ${did?'Q on the game page, ruled out in the builder':'no game to show them on'}`); }

      /* V15. who played, as the job baked it: PAY.snaps (the players with no stat line who took a snap)
         and the rows of zeros (from_snaps) for those who took one in their role, held to each other and
         to the page, and with PROPS_AUDIT_RAW to the snap counts and stats it read */
      { const SN=PAY.snaps||{}, bad=[]; let nz=0, nl=0, settled=0;
        const gidOf=(wk,team)=>{ const g=SV.sched.find(x=>+x.w===+wk&&(x.h===team||x.a===team)); return g?g.id:null; };
        const listed=(wk,gid,team,pid)=>!!(SN[wk]&&SN[wk][gid]&&(SN[wk][gid][team]||[]).includes(pid));
        for(const wk in SN) for(const gid in SN[wk]){ const g=gOf(gid);
          if(!g||String(+g.w)!==String(+wk)) bad.push(`snaps for ${gid} under week ${wk}`);
          for(const team in SN[wk][gid]){ if(g&&team!==g.h&&team!==g.a) bad.push(`snaps for ${team} in ${gid}`); nl+=(SN[wk][gid][team]||[]).length;
            if(!(PAY.stats[wk]||[]).some(r=>r.team===team&&!r.from_snaps)) bad.push(`snaps for ${gid} ${team}, whose stats are not in`); } }
        for(const wk in (PAY.stats||{})){ const real=new Set(PAY.stats[wk].filter(r=>!r.from_snaps).map(r=>r.player_id));
          for(const r of PAY.stats[wk]){ if(!r.from_snaps) continue; nz++;
            const gid=gidOf(wk,r.team), cols=Object.keys(r).filter(k=>typeof r[k]==='number'&&!['season','week','from_snaps'].includes(k));
            if(!listed(wk,gid,r.team,r.player_id)) bad.push(`a row of zeros for ${r.player_id} (${gid} ${r.team}) who is not in that club's snaps`);
            if(cols.some(k=>r[k]!==0)) bad.push(`the row of zeros for ${r.player_id} in week ${wk} has a stat`);
            if(real.has(r.player_id)) bad.push(`${r.player_id} has a stat row and a row of zeros in week ${wk}`);
            if(!F('posGrp')(r.position)) bad.push(`a row of zeros for ${r.player_id} at ${r.position}, a position the page does not project`);
            const a=F('actualFor')(+wk,r.player_id);
            if(!a||a.receptions!==0||a.passing_yards!==0||a.kick_pts!==0) bad.push(`the page has no zero line for ${r.player_id} in week ${wk}`);
            else if(gid&&settled<40){ settled++; const l={week:+wk,gid,pid:r.player_id,team:r.team,stat:'receptions',k:0.5,side:'over',main:true,price:-110};
              if(F('settleLeg')(l)!=='loss'||F('settleLeg')({...l,side:'under'})!=='win') bad.push(`${r.player_id} in week ${wk}, on the field with no stat line, is not graded on zero`); } } }
        /* a listed player with no row of zeros (a snap on defence or special teams only) is graded on zero too */
        { let one=0; for(const wk in SN) for(const gid in SN[wk]) for(const team in SN[wk][gid]) for(const pid of SN[wk][gid][team]){
            if(one>=20||F('actualFor')(+wk,pid)) continue; one++;
            if(F('settleLeg')({week:+wk,gid,pid,team,stat:'receptions',k:0.5,side:'over',main:true,price:-110})!=='loss') bad.push(`${pid} (${gid}), in the snaps with no stat line, is not graded on zero`); } }
        let rawSaid='';
        if(NEED){ const sp=path.join(__dirname,'..','raw',`snap_counts_${SEASON}.csv`);
          if(!fs.existsSync(sp)) rawSaid='; raw/snap_counts not downloaded this run (it is never required), so not compared';
          else if(rStats&&rRoster){ const snapRows=Papa.parse(fs.readFileSync(sp,'utf8'),{header:true,skipEmptyLines:true}).data;
            const hasLine=new Set(rStats.filter(r=>+r.season===SEASON&&r.season_type==='REG').map(r=>r.game_id+'|'+r.player_id));
            const pfr={}; for(const r of rRoster) if(r.gsis_id&&r.pfr_id&&!pfr[r.pfr_id]) pfr[r.pfr_id]=r.gsis_id;
            const posOf=id=>String((rawRo[id]&&rawRo[id].position)||'').toUpperCase();
            const snapped=new Set(), names={}; let checked=0;
            for(const s of snapRows){ const n=v=>{ const x=parseFloat(v); return isFinite(x)?x:0; }, all=n(s.offense_snaps)+n(s.defense_snaps)+n(s.st_snaps), id=pfr[s.pfr_player_id];
              if(all>0){ snapped.add(s.game_id+'|'+s.team+'|'+(id||'')); (names[s.game_id+'|'+s.team]??=[]).push(s.player); }
              if(!id||!(n(s.offense_snaps)>0)||!SKILL.has(posOf(id))||posOf(id)==='K'||hasLine.has(s.game_id+'|'+id)) continue;
              const g=gOf(s.game_id); if(!g||!SN[String(+g.w)]||!SN[String(+g.w)][s.game_id]||!(s.team in SN[String(+g.w)][s.game_id])) continue;
              checked++;
              if(!listed(String(+g.w),s.game_id,s.team,id)) bad.push(`${s.player} (${s.game_id} ${s.team}) ran ${s.offense_snaps} offensive snaps with no stat line and is not in the snaps`);
              if(!(PAY.stats[String(+g.w)]||[]).some(r=>r.from_snaps&&r.player_id===id)) bad.push(`${s.player} (${s.game_id}) has no row of zeros`); }
            for(const wk in SN) for(const gid in SN[wk]) for(const team in SN[wk][gid]) for(const pid of SN[wk][gid][team]){
              if(hasLine.has(gid+'|'+pid)) bad.push(`${pid} is in the snaps of ${gid} with a stat line in raw/pw`);
              const me=who(pid);
              if(!snapped.has(gid+'|'+team+'|'+pid)&&!(names[gid+'|'+team]||[]).some(n=>nameRule(n,me.name,me.alias))) bad.push(`${pid} is in the snaps of ${gid} ${team} with no snap in raw/snap_counts`); }
            rawSaid=`; against raw/snap_counts, ${checked} players placed by PFR id with an offensive snap and no stat line all listed with their row of zeros`; } }
        chk(!bad.length,`who played: ${bad.length} wrong (${bad.slice(0,4).join('; ')})`);
        console.log(`V15. who played: ${Object.keys(SN).length?`${nl} players with no stat line took a snap, ${nz} rows of zeros, each graded on zero${rawSaid}`:'no snap counts in the payload yet (a payload baked before them): a player with no stat line waits unless Out'}`); }

      if(skipped.length) console.log(`V. raw files not compared (PROPS_AUDIT_RAW is not set; weekly.py sets it): ${skipped.join(', ')}`);
      if(notPosted.length) console.log(`V. raw files not compared because nflverse has not posted them yet: ${notPosted.join(', ')}`);
    })(); }catch(e){ chk(false,'section V threw: '+(e&&e.stack||e)); }

    /* (app v114) the matchup bubble is the hub's (nflbets/build/glance.js, window.hubGlance), and the parts draw a leg's name as
       its button only where it is on the page: this page, the prop model's own, has none, so every name it drew in this run
       (the Top 50, the builder, the sets, the hands, the Elo picks, as they stand now) is plain text */
    chk(typeof w.hubGlance==='undefined'&&typeof w.glanceName==='function'&&!d.querySelector('[data-glance], button.glance-name, #glanceBox'),
      'the prop model\'s own page carries the hub\'s matchup bubble, or draws a name as its button');
    console.log(`\n${checks} checks, ${fails.length} failures, ${warns.length} warnings, ${errs.length} runtime errors`);
    fails.slice(0,15).forEach(f=>console.log('  FAIL:',f));
    errs.slice(0,5).forEach(e=>console.log('  ERROR:',e));
    /* warnings never refuse the publish; weekly.py lists them and the job goes red after its commit */
    warns.slice(0,15).forEach(x=>console.log(`  WARN: ${x.m} [${x.k}]`));
    for(const k of [...new Set(warns.map(x=>x.k))]) console.log(`  (a ${k} warning: ${WARN[k]})`);
    /* the page's own timers (the suggested parlays look for a kickoff every half minute) end
       with its window, so node ends when the audit does */
    w.close();
  })();
},1800);
